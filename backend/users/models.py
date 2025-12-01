from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
import uuid


GENDER_IDENTITY = [
    ('male', 'Male'), 
    ('female', 'Female'), 
    ('other', 'Other')
]

class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        TEACHER = 'teacher', 'Teacher'
        STUDENT = 'student', 'Student'


    role = models.CharField(max_length=10, choices=Roles.choices, default=Roles.STUDENT)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    def is_admin(self):
        return self.role == self.Roles.ADMIN or self.is_superuser

    def is_teacher(self):
        return self.role == self.Roles.TEACHER

    def is_student(self):
        return self.role == self.Roles.STUDENT
    

class Invitation(models.Model):
    class Roles(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        TEACHER = 'teacher', 'Teacher'
        STUDENT = 'student', 'Student'

    email = models.EmailField()
    role = models.CharField(max_length=10, choices=Roles.choices)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_invitations"
    )
    batch = models.ForeignKey(
        'students.Batch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invitations"
    )

    token = models.UUIDField(default=uuid.uuid4, unique=True)

    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invite {self.email} - {self.role}"


class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    department = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.user.username


class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    subject = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.user.username


