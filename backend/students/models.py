from django.db import models
from users.models import User

# Create your models here.

GENDER_IDENTITY = [
    ('male', 'Male'), 
    ('female', 'Female'), 
    ('other', 'Other')
]


class Batch(models.Model):
    name = models.CharField(max_length=100, unique=True)   # e.g., "Batch A", "2024-Python-B1"
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.name
    

class StudentProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )

    # Name moved from User → here
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    # Identification
    roll_no = models.CharField(max_length=20, unique=True)

    # Basic Details
    father_name = models.CharField(max_length=100, null=True, blank=True)
    mother_name = models.CharField(max_length=100, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(
        max_length=10,
        choices=GENDER_IDENTITY,
        blank=True,
        null=True
    )

    # Contact
    phone = models.CharField(max_length=15, blank=True, null=True)
    emergency_phone = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)

    # Academic
    course = models.CharField(max_length=100, blank=True, null=True)
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, related_name="students")
    joining_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"{self.roll_no} - {self.first_name} {self.last_name}"


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
    ]

    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )

    date = models.DateField()

    status = models.CharField(max_length=10, choices=STATUS_CHOICES)

    # To prevent duplicate attendance for same day
    class Meta:
        unique_together = ('student', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.roll_no} - {self.date} - {self.status}"


TEST_TYPES = [
    ("unit", "Unit Test"),
    ("monthly", "Monthly Test"),
    ("mock", "Mock Test"),
    ("custom", "Custom Assessment"),
]


class Assessment(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    test_type = models.CharField(max_length=20, choices=TEST_TYPES, default="unit")

    # e.g. “Python Unit Test 1”, “Math Monthly Test”
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="assessments")

    # Student-facing SurveyJS question structure (NO correctAnswer, NO score)
    questionnaire = models.JSONField()

    # Teacher-facing answer key & scoring schema (never sent to students)
    answer_key = models.JSONField(default=dict, blank=True)

    total_marks = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_test_type_display()})"

    

class AssessmentSubmission(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="assessment_submissions")
    
    answers = models.JSONField()   # student SurveyJS answers
    score = models.FloatField(default=0)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('assessment', 'student')

    def __str__(self):
        return f"{self.student.roll_no} → {self.assessment.title} = {self.score}"
