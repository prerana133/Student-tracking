from rest_framework import serializers
from students.models import StudentProfile
from users.models import Invitation, AdminProfile, TeacherProfile
from users.models import User
from django.db import transaction
from students.serializers import StudentProfileSerializer
from django.utils import timezone


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "username", "email", "role"]
        read_only_fields = ["email", "role"]


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password_confirm", "role", "first_name", "last_name"]

    def validate(self, data):
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password": "Passwords do not match"})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # Password hashing
        user.save()
        return user 



class InvitationSerializer(serializers.ModelSerializer):
    invited_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = Invitation
        fields = ["id", "email", "role", "invited_by", "batch", "batch_name", "token", "is_used", "created_at"]
        read_only_fields = ["token", "is_used", "created_at"]

    def validate(self, data):
        user = self.context["request"].user
        role = data["role"]

        # Admin can invite anyone
        if user.role == User.Roles.ADMIN or user.is_superuser:
            return data
        
        # Teacher can invite only student
        if user.role == User.Roles.TEACHER and role == Invitation.Roles.STUDENT:
            return data

        # Student cannot invite
        raise serializers.ValidationError("You are not allowed to invite this role.")

class AcceptInvitationSerializer(serializers.Serializer):
    # Required fields
    token = serializers.UUIDField()
    first_name = serializers.CharField(allow_blank=False)
    last_name = serializers.CharField(allow_blank=False)
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    # Student profile fields (optional)
    roll_no = serializers.CharField(required=False, allow_blank=True)
    course = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    father_name = serializers.CharField(required=False, allow_blank=True)
    mother_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    joining_date = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    emergency_phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    pincode = serializers.CharField(required=False, allow_blank=True)

    # Teacher/Admin extra fields (optional)
    subject = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)

    # Batch id (optional — will be taken from invitation if present)
    batch = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        # validate token / invitation
        token = data.get("token")
        try:
            invite = Invitation.objects.get(token=token, is_used=False)
        except Invitation.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid or expired invitation token"})

        data["invite"] = invite

        username = data.get("username")
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "This username is already taken. Choose a different username."})

        # If invite email already exists as user email (optional check)
        if User.objects.filter(email=invite.email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})

        return data

    @transaction.atomic
    def create(self, validated_data):
        invite = validated_data.pop("invite")
        # role may be stored on invite as string or enum — convert to string and normalize
        role_raw = invite.role
        role = (str(role_raw) if role_raw is not None else "").lower()

        username = validated_data.pop("username")
        password = validated_data.pop("password")
        email = invite.email  # enforce invite email

        # create user
        user = User(username=username, email=email)
        user.set_password(password)
        # try to set role field on user if it exists (many projects have this)
        try:
            # some projects store role as string; some use Enum. Use the raw invite.role value when possible.
            if hasattr(User, "role"):
                # If your User.role expects a string, set it. If it's an EnumField, this may require adaptation.
                user.role = invite.role
        except Exception:
            # ignore silently — we don't want this to break user creation
            pass

        user.save()

        # Create profile based on normalized role string
        # Admin
        if role in ("admin", "administrator"):
            if AdminProfile is not None:
                department = validated_data.get("department")
                AdminProfile.objects.create(user=user, department=department)
        # Teacher
        elif role in ("teacher", "lecturer", "instructor"):
            if TeacherProfile is not None:
                subject = validated_data.get("subject")
                TeacherProfile.objects.create(user=user, subject=subject)
        # Student (default path)
        else:
            # Determine batch id preference: invitation batch overrides payload
            batch_id = None
            try:
                if getattr(invite, "batch", None):
                    # invite.batch may be a FK instance — try to read its id
                    batch_obj = invite.batch
                    batch_id = getattr(batch_obj, "id", batch_obj)
            except Exception:
                batch_id = None

            if not batch_id:
                # fallback to provided batch in payload
                batch_id = validated_data.get("batch")

            # Prepare kwargs for StudentProfile.create
            student_kwargs = {
                "user": user,
                "first_name": validated_data.get("first_name"),
                "last_name": validated_data.get("last_name"),
                "roll_no": validated_data.get("roll_no") or None,
                "father_name": validated_data.get("father_name") or "",
                "mother_name": validated_data.get("mother_name") or "",
                "date_of_birth": validated_data.get("date_of_birth") or None,
                "gender": validated_data.get("gender") or "",
                "phone": validated_data.get("phone") or "",
                "emergency_phone": validated_data.get("emergency_phone") or "",
                "address": validated_data.get("address") or "",
                "city": validated_data.get("city") or "",
                "state": validated_data.get("state") or "",
                "pincode": validated_data.get("pincode") or "",
                "course": validated_data.get("course") or "",
                "joining_date": validated_data.get("joining_date") or None,
            }

            # attach batch by id if StudentProfile accepts batch_id OR batch (FK)
            # If your StudentProfile uses 'batch' FK, using 'batch_id' works with .create()
            if batch_id:
                student_kwargs["batch_id"] = batch_id

            # Create the StudentProfile
            StudentProfile.objects.create(**student_kwargs)

        # Mark invite used after successful creation
        invite.is_used = True
        if hasattr(invite, "used_at"):
            invite.used_at = timezone.now()
            invite.save(update_fields=["is_used", "used_at"])
        else:
            invite.save(update_fields=["is_used"])

        return user
    

from rest_framework import serializers
from django.contrib.auth import get_user_model
from students.models import StudentProfile, Batch
from .models import AdminProfile, TeacherProfile  # adjust import if paths differ

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    # Base user fields
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(read_only=True)
    avatar = serializers.ImageField(read_only=True, allow_null=True)

    # Common editable fields
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # Student-specific
    batch_id = serializers.IntegerField(read_only=True)
    batch_name = serializers.CharField(read_only=True)

    # Teacher / Admin specific
    subject = serializers.CharField(read_only=True, allow_blank=True)
    department = serializers.CharField(read_only=True, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "role", "first_name", "last_name", "phone",
            "batch_id", "batch_name", "subject", "department", "avatar"
        ]

    def to_representation(self, instance):
        """
        Build a unified profile shape based on user.role
        """
        user = instance
        data = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "phone": None,
            "batch_id": None,
            "batch_name": "",
            "subject": "",
            "department": "",
            "avatar": user.avatar.url if user.avatar else None,
        }

        # Student
        if user.is_student() and hasattr(user, "student_profile"):
            sp: StudentProfile = user.student_profile
            # Prefer StudentProfile name if present
            data["first_name"] = sp.first_name or data["first_name"]
            data["last_name"] = sp.last_name or data["last_name"]
            data["phone"] = sp.phone
            if sp.batch:
                data["batch_id"] = sp.batch.id
                data["batch_name"] = sp.batch.name

        # Teacher
        if user.is_teacher() and hasattr(user, "teacher_profile"):
            tp: TeacherProfile = user.teacher_profile
            data["subject"] = tp.subject or ""

        # Admin
        if user.is_admin() and hasattr(user, "admin_profile"):
            ap: AdminProfile = user.admin_profile
            data["department"] = ap.department or ""

        return data

    def update(self, instance, validated_data):
        """
        Update common fields:
        - first_name, last_name (User + possibly StudentProfile)
        - phone (StudentProfile only)
        - Optionally admin.department / teacher.subject if you decide to allow it.
        """
        user = instance

        first_name = validated_data.get("first_name", None)
        last_name = validated_data.get("last_name", None)
        phone = validated_data.get("phone", None)

        # Update names on User
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save()

        # Student: keep StudentProfile in sync
        if user.is_student() and hasattr(user, "student_profile"):
            sp: StudentProfile = user.student_profile
            if first_name is not None:
                sp.first_name = first_name
            if last_name is not None:
                sp.last_name = last_name
            if phone is not None:
                sp.phone = phone
            sp.save()

        # OPTIONAL: You can allow teachers/admins to update subject/department
        # subject = validated_data.get("subject", None)
        # if user.is_teacher() and hasattr(user, "teacher_profile") and subject is not None:
        #     tp = user.teacher_profile
        #     tp.subject = subject
        #     tp.save()

        # department = validated_data.get("department", None)
        # if user.is_admin() and hasattr(user, "admin_profile") and department is not None:
        #     ap = user.admin_profile
        #     ap.department = department
        #     ap.save()

        return user

    def create(self, validated_data):
        # Not used here (we're not creating users from this serializer)
        raise NotImplementedError("Use this serializer only for existing users.")
