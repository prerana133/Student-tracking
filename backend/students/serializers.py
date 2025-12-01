from rest_framework import serializers
from students.models import Batch, StudentProfile, Attendance, Assessment, AssessmentSubmission


class BatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = "__all__"

class StudentProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = StudentProfile
        fields = '__all__'
        read_only_fields = ['user']

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.first_name', read_only=True)
    student_roll_no = serializers.CharField(source='student.roll_no', read_only=True)

    class Meta:
        model = Attendance
        fields = "__all__"


class AssessmentSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    # extra fields for students
    is_submitted = serializers.SerializerMethodField()
    student_submission = serializers.SerializerMethodField()

    # answer_key is stored but NEVER returned (write-only)
    answer_key = serializers.JSONField(write_only=True, required=False, default=dict)

    class Meta:
        model = Assessment
        fields = "__all__"

    def _get_student_profile(self):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if not hasattr(request.user, "is_student") or not request.user.is_student():
            return None
        return getattr(request.user, "student_profile", None)

    def get_is_submitted(self, obj):
        profile = self._get_student_profile()
        if not profile:
            return False
        return obj.submissions.filter(student=profile).exists()

    def get_student_submission(self, obj):
        """
        For a logged-in student, return their submission (answers + score)
        if it exists; otherwise null.
        """
        profile = self._get_student_profile()
        if not profile:
            return None
        submission = obj.submissions.filter(student=profile).first()
        if not submission:
            return None
        return AssessmentSubmissionSerializer(submission).data

    def create(self, validated_data):
        """
        Optionally recompute total_marks from answer_key if frontend didn't send it.
        """
        answer_key = validated_data.get("answer_key") or {}
        if not validated_data.get("total_marks"):
            total = 0
            for qname, meta in answer_key.items():
                score = meta.get("score") or 0
                try:
                    total += int(score)
                except Exception:
                    pass
            validated_data["total_marks"] = total
        return super().create(validated_data)

    def update(self, instance, validated_data):
        answer_key = validated_data.get("answer_key") or instance.answer_key or {}
        if "total_marks" not in validated_data:
            total = 0
            for qname, meta in answer_key.items():
                score = meta.get("score") or 0
                try:
                    total += int(score)
                except Exception:
                    pass
            validated_data["total_marks"] = total
        return super().update(instance, validated_data)


class AssessmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.first_name', read_only=True)
    student_roll_no = serializers.CharField(source='student.roll_no', read_only=True)
    assessment_title = serializers.CharField(source='assessment.title', read_only=True)

    class Meta:
        model = AssessmentSubmission
        fields = ['id', 'assessment', 'student', 'answers', 'score', 'submitted_at', 
                  'student_name', 'student_roll_no', 'assessment_title']
        read_only_fields = ['score', 'submitted_at']
