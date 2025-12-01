from django.contrib import admin
from .models import (
	Batch,
	StudentProfile,
	Attendance,
	Assessment,
	AssessmentSubmission,
)


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
	list_display = ("name", "start_date", "end_date")
	search_fields = ("name", "description")
	ordering = ("name",)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
	list_display = (
		"roll_no",
		"first_name",
		"last_name",
		"user",
		"batch",
		"phone",
	)
	search_fields = ("roll_no", "first_name", "last_name", "phone")
	list_filter = ("batch", "gender", "course")
	raw_id_fields = ("user",)
	list_select_related = ("user", "batch")


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
	list_display = ("student", "date", "status")
	list_filter = ("status", "date", "student__batch")
	search_fields = (
		"student__roll_no",
		"student__first_name",
		"student__last_name",
	)
	date_hierarchy = "date"


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
	list_display = ("title", "test_type", "batch", "total_marks", "created_at")
	search_fields = ("title", "description")
	list_filter = ("test_type", "batch")
	readonly_fields = ("created_at",)


@admin.register(AssessmentSubmission)
class AssessmentSubmissionAdmin(admin.ModelAdmin):
	list_display = ("assessment", "student", "score", "submitted_at")
	search_fields = (
		"assessment__title",
		"student__roll_no",
		"student__first_name",
		"student__last_name",
	)
	readonly_fields = ("submitted_at",)
