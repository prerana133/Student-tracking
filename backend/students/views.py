from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from students.models import Batch, StudentProfile, Attendance, Assessment, AssessmentSubmission
from students.serializers import (
    BatchSerializer, StudentProfileSerializer, AttendanceSerializer,
    AssessmentSerializer, AssessmentSubmissionSerializer
)
from django.shortcuts import get_object_or_404
from users.models import User
from django.db import transaction
from students.services.assessment_service import calculate_score, get_score_trend, batch_average_score, top_students, get_avg_score, get_total_submissions
from students.services.attendance_service import get_attendance_trend, batch_attendance_summary, get_attendance_percentage
from students.services.analytics.predictor import predict_low_performing
from datetime import datetime
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied

# Create your views here.

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class BatchView(APIView):
    pagination_class = StandardPagination
    permission_classes = [AllowAny]

    def get(self, request):

        if request.user.is_anonymous:
            queryset = Batch.objects.all()
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            serializer = BatchSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        if request.user.is_teacher() or request.user.is_admin():
            queryset = Batch.objects.all()
            
            # Pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            serializer = BatchSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        elif request.user.is_student():
            # Return only the student's batch
            if hasattr(request.user, "student_profile") and request.user.student_profile.batch:
                batch = request.user.student_profile.batch
                serializer = BatchSerializer(batch)
                return Response(serializer.data)
            return Response({"message": "No batch assigned."})


        return Response(
            {"message": "Permission denied."},
            status=status.HTTP_403_FORBIDDEN
        )

    def post(self, request):
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response(
                {"message": "Only teachers/admins can create batches."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request, batch_id):
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response(
                {"message": "Only teachers/admins can update batches."},
                status=status.HTTP_403_FORBIDDEN
            )

        batch = get_object_or_404(Batch, id=batch_id)
        serializer = BatchSerializer(batch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, batch_id):
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response(
                {"message": "Only teachers/admins can delete batches."},
                status=status.HTTP_403_FORBIDDEN
            )

        batch = get_object_or_404(Batch, id=batch_id)
        batch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class StudentsProfileView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        if request.user.is_teacher() or request.user.is_admin():
            queryset = StudentProfile.objects.all()
            
            # Filtering
            batch_id = request.GET.get('batch_id')
            course = request.GET.get('course')
            search = request.GET.get('search')
            
            if batch_id:
                queryset = queryset.filter(batch_id=batch_id)
            if course:
                queryset = queryset.filter(course__icontains=course)
            if search:
                queryset = queryset.filter(
                    first_name__icontains=search
                ) | queryset.filter(
                    last_name__icontains=search
                ) | queryset.filter(
                    roll_no__icontains=search
                )
            
            # Pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            serializer = StudentProfileSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
            
        elif request.user.is_student():
            profile = get_object_or_404(StudentProfile, user=request.user)
            serializer = StudentProfileSerializer(profile)
            return Response(serializer.data)
        return Response(
            {"message": "Permission denied"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    def post(self, request):
        """Create new student (Admin/Teacher only)"""
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'roll_no']
        missing_fields = [field for field in required_fields if not request.data.get(field)]
        
        if missing_fields:
            return Response(
                {"message": f"Missing required fields: {', '.join(missing_fields)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user first
        user_data = {
            'username': request.data.get('username'),
            'email': request.data.get('email'),
            'password': request.data.get('password'),
            'role': User.Roles.STUDENT,
            'first_name': request.data.get('first_name', ''),
            'last_name': request.data.get('last_name', ''),
        }
        
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=user_data['username'],
                    email=user_data['email'],
                    password=user_data['password'],
                    role=User.Roles.STUDENT,
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                )
                
                # Create student profile
                profile_data = request.data.copy()
                profile_data.pop('username', None)
                profile_data.pop('email', None)
                profile_data.pop('password', None)
                profile_data.pop('password_confirm', None)
                
                serializer = StudentProfileSerializer(data=profile_data)
                serializer.is_valid(raise_exception=True)
                serializer.save(user=user)
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"message": f"Error creating student: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def put(self, request, student_id=None):
        """Update student profile"""
        if request.user.is_student():
            profile = get_object_or_404(StudentProfile, user=request.user)
        elif request.user.is_teacher() or request.user.is_admin():
            if not student_id:
                return Response(
                    {"message": "student_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            profile = get_object_or_404(StudentProfile, id=student_id)
        else:
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = StudentProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, student_id):
        """Delete student (Admin/Teacher only)"""
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        profile = get_object_or_404(StudentProfile, id=student_id)
        profile.user.delete()  # This will cascade delete the profile
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class AttendanceView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        """Teachers/Admin → all attendance
           Student → only own attendance
           Supports filtering: ?batch_id=&year=&month=&date=
        """

        if request.user.is_teacher() or request.user.is_admin():
            queryset = Attendance.objects.all()

            batch_id = request.GET.get("batch_id")
            year = request.GET.get("year")
            month = request.GET.get("month")
            date = request.GET.get("date")
            student_id = request.GET.get("student_id")

            if batch_id:
                queryset = queryset.filter(student__batch_id=batch_id)
            if student_id:
                queryset = queryset.filter(student_id=student_id)
            if year:
                queryset = queryset.filter(date__year=year)
            if month:
                queryset = queryset.filter(date__month=month)
            if date:
                queryset = queryset.filter(date=date)

            # Pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            serializer = AttendanceSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # Student view — only own attendance
        if request.user.is_student():
            profile = get_object_or_404(StudentProfile, user=request.user)
            queryset = Attendance.objects.filter(student=profile)
            
            # Filtering for students
            year = request.GET.get("year")
            month = request.GET.get("month")
            if year:
                queryset = queryset.filter(date__year=year)
            if month:
                queryset = queryset.filter(date__month=month)
            
            # Pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            serializer = AttendanceSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        return Response({"message": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        """Teacher/Admin can mark attendance"""

        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response(
                {"message": "Only teachers/admins can mark attendance."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentView(APIView):
    pagination_class = StandardPagination
    
    def post(self, request):
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response({"message": "Permission denied."}, status=403)

        serializer = AssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=201)

    def get(self, request):
        queryset = Assessment.objects.all()

        # If student → only their batch assessments
        if request.user.is_student():
            profile = getattr(request.user, "student_profile", None)
            if profile and profile.batch_id:
                queryset = queryset.filter(batch_id=profile.batch_id)
            else:
                queryset = Assessment.objects.none()
        else:
            # Teacher/Admin filters
            batch_id = request.GET.get("batch_id")
            test_type = request.GET.get("test_type")

            if batch_id:
                queryset = queryset.filter(batch_id=batch_id)
            if test_type:
                queryset = queryset.filter(test_type=test_type)

        # Pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AssessmentSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)
    
class AssessmentSubmissionView(APIView):

    def post(self, request, assessment_id):

        if not request.user.is_student():
            return Response({"message": "Students only"}, status=403)

        assessment = get_object_or_404(Assessment, id=assessment_id)
        student = request.user.student_profile

        submission_data = {
            "assessment": assessment.id,
            "student": student.id,
            "answers": request.data.get("answers")
        }

        serializer = AssessmentSubmissionSerializer(data=submission_data)
        serializer.is_valid(raise_exception=True)

        # Calculate score
        score = calculate_score(
            assessment.answer_key,  # use stored answer key
            serializer.validated_data["answers"],
        )


        submission = serializer.save(score=score)

        return Response(AssessmentSubmissionSerializer(submission).data, status=201)
    

class StudentScoreHistoryView(APIView):

    def get(self, request):
        if not request.user.is_student():
            return Response({"message": "Students only"}, status=403)

        queryset = AssessmentSubmission.objects.filter(student=request.user.student_profile)
        
        # Filtering
        assessment_id = request.GET.get('assessment_id')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        
        # Pagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AssessmentSubmissionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class BatchScoreView(APIView):

    def get(self, request, batch_id):
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response({"message": "Permission denied"}, status=403)

        queryset = AssessmentSubmission.objects.filter(
            student__batch_id=batch_id
        )
        
        # Filtering
        assessment_id = request.GET.get('assessment_id')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        
        # Pagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AssessmentSubmissionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AttendanceTrendView(APIView):

    def get(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        trend = get_attendance_trend(student)
        return Response(trend)


class MonthlyAttendanceReportView(APIView):
    """Monthly attendance report for batch or student"""

    def get(self, request):
        batch_id = request.GET.get('batch_id')
        student_id = request.GET.get('student_id')
        year = request.GET.get('year', datetime.now().year)
        month = request.GET.get('month', datetime.now().month)

        if batch_id:
            if not (request.user.is_teacher() or request.user.is_admin()):
                return Response(
                    {"message": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )
            batch = get_object_or_404(Batch, id=batch_id)
            students = StudentProfile.objects.filter(batch=batch)
        elif student_id:
            student = get_object_or_404(StudentProfile, id=student_id)
            if request.user.is_student() and request.user.student_profile.id != student.id:
                return Response(
                    {"message": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )
            students = [student]
        else:
            if request.user.is_student():
                students = [request.user.student_profile]
            else:
                return Response(
                    {"message": "batch_id or student_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        report = []
        for student in students:
            attendance_records = Attendance.objects.filter(
                student=student,
                date__year=year,
                date__month=month
            )
            total_days = attendance_records.count()
            present_days = attendance_records.filter(status='present').count()
            absent_days = total_days - present_days
            percentage = (present_days / total_days * 100) if total_days > 0 else 0

            report.append({
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "roll_no": student.roll_no,
                "year": int(year),
                "month": int(month),
                "total_days": total_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "attendance_percentage": round(percentage, 2)
            })

        return Response(report)


class ScoreTrendView(APIView):

    def get(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        trend = get_score_trend(student)
        return Response(trend)


class BatchAnalyticsView(APIView):

    def get(self, request, batch_id):
        batch = get_object_or_404(Batch, id=batch_id)

        data = {
            "average_attendance": batch_attendance_summary(batch),
            "average_score": batch_average_score(batch),
            "top_students": list(top_students(batch))
        }
        return Response(data)


class LowPerformingPredictionView(APIView):

    def get(self, request, student_id):
        student = get_object_or_404(StudentProfile, id=student_id)
        prediction = predict_low_performing(student)

        return Response({
            "student": student.user.username,
            "low_performer": True if prediction == 1 else False
        })


class StudentDashboardView(APIView):

    def get(self, request):
        student = request.user.student_profile

        data = {
            "attendance_percentage": get_attendance_percentage(student),
            "average_score": get_avg_score(student),
            "total_submissions": get_total_submissions(student),
        }

        return Response(data)
    

# students/views.py — add near AttendanceView (imports at top)
from django.utils.dateparse import parse_date

class BulkAttendanceView(APIView):
    """
    POST:
      {
        "batch_id": 1,
        "date": "2025-11-30",
        "present_student_ids": [3,4,5]   # optional; if omitted marks all absent
      }

    Only teachers/admins allowed.
    """
    def post(self, request):
        if not (request.user.is_teacher() or request.user.is_admin()):
            return Response({"message": "Only teachers/admins can mark attendance."}, status=403)

        batch_id = request.data.get("batch_id")
        date_str = request.data.get("date")
        present_ids = request.data.get("present_student_ids", []) or []

        if not batch_id or not date_str:
            return Response({"message": "batch_id and date are required"}, status=400)

        date_obj = parse_date(date_str)
        if date_obj is None:
            return Response({"message": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        # Fetch students in the batch
        students = StudentProfile.objects.filter(batch_id=batch_id)
        if not students.exists():
            return Response({"message": "No students found for this batch."}, status=404)

        created_or_updated = []
        errors = []

        for student in students:
            status_val = "present" if student.id in present_ids else "absent"
            try:
                obj, created = Attendance.objects.update_or_create(
                    student=student,
                    date=date_obj,
                    defaults={"status": status_val}
                )
                created_or_updated.append({
                    "student_id": student.id,
                    "roll_no": student.roll_no,
                    "status": obj.status,
                    "created": created
                })
            except Exception as e:
                errors.append({"student_id": student.id, "error": str(e)})

        return Response({
            "batch_id": batch_id,
            "date": date_obj,
            "results": created_or_updated,
            "errors": errors
        }, status=200)


class AssessmentListCreateView(APIView):
    """
    GET: list assessments (teachers/admins see all; students see PENDING assessments for their batch)
    POST: create an assessment (teacher/admin only)
    """
    pagination_class = StandardPagination

    def get(self, request):
        queryset = Assessment.objects.all()

        # If student → only their batch assessments
        if request.user.is_student():
            profile = getattr(request.user, "student_profile", None)
            if profile and profile.batch_id:
                queryset = queryset.filter(batch_id=profile.batch_id)
            else:
                queryset = Assessment.objects.none()
        else:
            # Teacher/Admin filters
            batch_id = request.GET.get("batch_id")
            test_type = request.GET.get("test_type")

            if batch_id:
                queryset = queryset.filter(batch_id=batch_id)
            if test_type:
                queryset = queryset.filter(test_type=test_type)

        # Pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AssessmentSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if not (request.user.is_teacher() or request.user.is_admin()):
            raise PermissionDenied("Only teachers/admins can create assessments.")
        serializer = AssessmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        # if you track creator, add created_by in model & serializer
        serializer.save()  # created_by=request.user
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentDetailView(APIView):
    """
    GET /assessments/<id>/          -> anyone (students only if assessment.batch matches)
    PUT /assessments/<id>/          -> teacher/admin only
    DELETE /assessments/<id>/       -> teacher/admin only
    """
    def get_object(self, assessment_id):
        return get_object_or_404(Assessment, id=assessment_id)

    def get(self, request, assessment_id):
        assessment = self.get_object(assessment_id)
        # students should only fetch if it's their batch
        if request.user.is_student():
            profile = getattr(request.user, "student_profile", None)
            if not profile or assessment.batch_id != profile.batch_id:
                return Response({"message": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        serializer = AssessmentSerializer(assessment, context={"request": request})
        return Response(serializer.data)

    def put(self, request, assessment_id):
        if not (request.user.is_teacher() or request.user.is_admin()):
            raise PermissionDenied("Only teachers/admins can update assessments.")
        assessment = self.get_object(assessment_id)
        serializer = AssessmentSerializer(
            assessment, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, assessment_id):
        if not (request.user.is_teacher() or request.user.is_admin()):
            raise PermissionDenied("Only teachers/admins can delete assessments.")
        assessment = self.get_object(assessment_id)
        assessment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class AssessmentSubmitView(APIView):
    """
    POST /assessments/<id>/submit/
    Payload: { answers: { question_name: value, ... } }
    Only students allowed.
    """
    def post(self, request, assessment_id):
        if not request.user.is_student():
            return Response({"message": "Students only"}, status=status.HTTP_403_FORBIDDEN)

        assessment = get_object_or_404(Assessment, id=assessment_id)
        student = request.user.student_profile

        # ensure student belongs to the assessment batch (if assessment is batch-scoped)
        if assessment.batch_id and student.batch_id != assessment.batch_id:
            return Response(
                {"message": "Assessment not available for your batch"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # prevent multiple submissions
        existing = AssessmentSubmission.objects.filter(
            assessment=assessment, student=student
        ).first()
        if existing:
            return Response(
                {
                    "message": "You have already submitted this assessment.",
                    "data": AssessmentSubmissionSerializer(existing).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission_payload = {
            "assessment": assessment.id,
            "student": student.id,
            "answers": request.data.get("answers", {}),
        }

        serializer = AssessmentSubmissionSerializer(data=submission_payload)
        serializer.is_valid(raise_exception=True)

        # ---- IMPORTANT: calculate and store score ----
        score = calculate_score(
        assessment.answer_key,  # use stored answer key
        serializer.validated_data["answers"],
    )



        submission = serializer.save(score=score)
        return Response(
            AssessmentSubmissionSerializer(submission).data,
            status=status.HTTP_201_CREATED,
        )
