# users/views.py
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate

from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from users.permissions import IsAdmin, IsTeacher
from users.models import User, Invitation
from users.serializers import (
    UserProfileSerializer,
    UserSerializer,
    InvitationSerializer,
    AcceptInvitationSerializer,
    SignupSerializer,
)
from users.services import send_invitation_email


class AuthViewSet(viewsets.ViewSet):
    """
    /auth/signup/             -> POST (AllowAny)
    /auth/login/              -> POST (AllowAny)
    /auth/accept-invitation/  -> POST (AllowAny)
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="signup")
    def signup(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "User created successfully",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"message": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"message": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Login successful",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="accept-invitation")
    def accept_invitation(self, request):
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "Invitation accepted and account created successfully!"},
            status=status.HTTP_201_CREATED,
        )
    
class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view that returns tokens in a consistent format"""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # TokenRefreshView returns access token directly
        # SimpleJWT by default returns: {"access": "new_token"}
        # We're keeping this format as is for compatibility
        return response


class InvitationViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    /invitations/          -> GET (list), POST (create)
    /invitations/{id}/resend/ -> POST
    """
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer
    permission_classes = [IsAdmin | IsTeacher]

    def get_serializer_context(self):
        # So InvitationSerializer still sees request.user
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        self.invitation = serializer.save()

    def create(self, request, *args, **kwargs):
        frontend_url_override = request.data.get("frontend_url")
        frontend_base_url = (
            frontend_url_override
            or getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        email_sent, invitation_url = send_invitation_email(
            self.invitation, frontend_url=frontend_base_url
        )

        response_data = serializer.data
        response_data["invitation_url"] = invitation_url
        response_data["email_enabled"] = getattr(
            settings, "INVITATION_EMAIL_ENABLED", False
        )
        response_data["email_sent"] = email_sent

        if response_data["email_enabled"] and not email_sent:
            response_data[
                "email_error"
            ] = "Failed to send invitation email. Please check email configuration."

        headers = self.get_success_headers(serializer.data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"], url_path="resend")
    def resend(self, request, pk=None):
        invite = self.get_object()
        frontend_url = request.data.get("frontend_url")
        success, invitation_url = send_invitation_email(invite, frontend_url=frontend_url)
        if success:
            return Response(
                {"message": "Invitation resent", "invitation_url": invitation_url},
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "message": "Failed to resend invitation",
                "invitation_url": invitation_url,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class UserViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    /users/me/        -> GET, PATCH (UserProfileSerializer)
    /users/current/   -> GET (simple User + attached profile info)
    /users/avatar/    -> POST (upload avatar)

    Optionally, /users/{id}/ -> GET/PATCH if you want admins to manage users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "me":
            return UserProfileSerializer
        return self.serializer_class

    # /users/me/
    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        user = request.user
        if request.method.lower() == "get":
            serializer = self.get_serializer(user, context={"request": request})
            return Response(serializer.data)

        # PATCH
        serializer = self.get_serializer(
            user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # /users/current/
    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        """
        Mirror your CurrentUserView logic.
        """
        user = request.user
        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": getattr(user, "role", None),
        }

        if hasattr(user, "student_profile"):
            data["student_profile"] = {
                "id": user.student_profile.id,
                "batch": user.student_profile.batch_id,
                "roll_no": user.student_profile.roll_no,
            }

        if hasattr(user, "teacher_profile"):
            data["teacher_profile"] = {
                "id": user.teacher_profile.id,
            }

        return Response({"data": data})

    # /users/avatar/
    @action(
        detail=False,
        methods=["post"],
        url_path="avatar",
        parser_classes=[MultiPartParser, FormParser],
    )
    def avatar(self, request):
        user = request.user
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response(
                {"detail": "No avatar file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.avatar = avatar
        user.save()
        return Response({"avatar": user.avatar.url}, status=status.HTTP_200_OK)
