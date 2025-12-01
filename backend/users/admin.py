from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, Invitation, AdminProfile, TeacherProfile


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		("Custom", {"fields": ("role", "avatar")} ),
	)
	list_display = ("username", "email", "first_name", "last_name", "role", "is_active", "is_staff")
	list_filter = ("role", "is_staff", "is_superuser", "is_active")
	search_fields = ("username", "email", "first_name", "last_name")


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
	list_display = ("email", "role", "invited_by", "batch", "is_used", "created_at")
	search_fields = ("email", "invited_by__username")
	list_filter = ("role", "is_used", "batch")
	readonly_fields = ("token", "created_at")


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
	list_display = ("user", "department")
	search_fields = ("user__username", "department")
	raw_id_fields = ("user",)


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
	list_display = ("user", "subject")
	search_fields = ("user__username", "subject")
	raw_id_fields = ("user",)
