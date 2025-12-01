from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser

# Avatar upload view
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from users.permissions import IsAdmin, IsTeacher
from users.models import User, Invitation
from users.serializers import (
    UserProfileSerializer, UserSerializer, InvitationSerializer, AcceptInvitationSerializer, SignupSerializer
)
from users.services import send_invitation_email
from django.conf import settings


# Create your views here.

class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "No avatar file provided."}, status=400)
        user.avatar = avatar
        user.save()
        return Response({"avatar": user.avatar.url}, status=200)

class MyProfileView(APIView):
    """
    GET  /users/my-profile/   -> return unified profile for logged-in user
    PATCH /users/my-profile/  -> update first_name, last_name, phone, etc.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def get(self, request):
        user = self.get_object()
        serializer = self.serializer_class(user, context={"request": request})
        return Response(serializer.data)
    
    def patch(self, request):
        user = self.get_object()
        serializer = self.serializer_class(
            user,
            data=request.data,
            partial=True,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "User created successfully",
            "data": {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {"message": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"message": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Login successful",
            "data": {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }
        })


class InvitationView(APIView):
    permission_classes = [IsAdmin | IsTeacher]

    def get(self, request):
        invites = Invitation.objects.all()
        serializer = InvitationSerializer(invites, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create an invitation and (optionally) send email.

        - Uses settings.FRONTEND_BASE_URL by default
        - Allows optional override via request.data["frontend_url"]
        - Always returns the invitation_url in the response
        """
        frontend_url_override = request.data.get("frontend_url")

        frontend_base_url = frontend_url_override or getattr(
            settings,
            "FRONTEND_BASE_URL",
            "http://localhost:5173",
        )

        serializer = InvitationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()

        # Will respect settings.INVITATION_EMAIL_ENABLED internally
        email_sent, invitation_url = send_invitation_email(
            invitation,
            frontend_url=frontend_base_url,
        )

        response_data = serializer.data
        response_data["invitation_url"] = invitation_url
        response_data["email_enabled"] = getattr(settings, "INVITATION_EMAIL_ENABLED", False)
        response_data["email_sent"] = email_sent

        if response_data["email_enabled"] and not email_sent:
            response_data[
                "email_error"
            ] = "Failed to send invitation email. Please check email configuration."

        return Response(response_data, status=status.HTTP_201_CREATED)
    
class ResendInvitationView(APIView):
    permission_classes = [IsAdmin | IsTeacher]

    def post(self, request, invite_id):
        invite = get_object_or_404(Invitation, id=invite_id)
        # allow overriding frontend_url from request (optional)
        frontend_url = request.data.get("frontend_url")
        success, invitation_url = send_invitation_email(invite, frontend_url=frontend_url)
        if success:
            return Response({"message": "Invitation resent", "invitation_url": invitation_url})
        return Response({"message": "Failed to resend invitation", "invitation_url": invitation_url}, status=500)
    
class AcceptInvitationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": "Invitation accepted and account created successfully!"})
    
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Returns the authenticated user's data.
        """
        user = request.user

        # If you want to include role, username, email:
        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": getattr(user, "role", None),
        }

        # OPTIONAL: attach student_profile or teacher_profile if they exist
        if hasattr(user, "student_profile"):
            data["student_profile"] = {
                "id": user.student_profile.id,
                "batch": user.student_profile.batch_id,
                "roll_no": user.student_profile.roll_no,
            }

        if hasattr(user, "teacher_profile"):
            data["teacher_profile"] = {
                "id": user.teacher_profile.id
            }

        return Response({"data": data})


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view that returns tokens in a consistent format"""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # TokenRefreshView returns access token directly
        # SimpleJWT by default returns: {"access": "new_token"}
        # We're keeping this format as is for compatibility
        return response

