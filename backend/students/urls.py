from django.urls import path
from students.views import (
    AssessmentDetailView, AssessmentListCreateView, AssessmentSubmitView, BulkAttendanceView, StudentsProfileView, BatchView, AttendanceView, 
    AssessmentView, AssessmentSubmissionView, 
    StudentScoreHistoryView, BatchScoreView,
    AttendanceTrendView, MonthlyAttendanceReportView, ScoreTrendView, 
    BatchAnalyticsView, LowPerformingPredictionView
)

urlpatterns = [
    path('profile/', StudentsProfileView.as_view(), name='student_profile'),
    path('profile/<int:student_id>/', StudentsProfileView.as_view(), name='student_profile_detail'),
    path("batches/", BatchView.as_view(), name="batches"),                 # GET (all), POST
    path("batches/<int:batch_id>/", BatchView.as_view(), name="batch-crud"),  # PUT, DELETE
    path("attendance/", AttendanceView.as_view(), name="attendance"),  # GET, POST
    path("assessments/", AssessmentView.as_view(), name="assessments"),  # GET (all), POST (create)
    path(
        "assessments/<int:assessment_id>/submit/",
        AssessmentSubmissionView.as_view(),
        name="assessment-submit"
    ),
    path(
        "assessments/history/",
        StudentScoreHistoryView.as_view(),
        name="student-score-history"
    ),
    path(
        "batch/<int:batch_id>/scores/",
        BatchScoreView.as_view(),
        name="batch-scores"
    ),
    path('analytics/monthly-attendance/', MonthlyAttendanceReportView.as_view(), name='monthly-attendance'),
    path('analytics/attendance-trend/<int:student_id>/', AttendanceTrendView.as_view(), name='attendance-trend'),
    path('analytics/score-trend/<int:student_id>/', ScoreTrendView.as_view(), name='score-trend'),
    path('analytics/batch-summary/<int:batch_id>/', BatchAnalyticsView.as_view(), name='batch-summary'),
    path('analytics/predict/<int:student_id>/', LowPerformingPredictionView.as_view(), name='predict'),
path("attendance/bulk/", BulkAttendanceView.as_view(), name="attendance-bulk"),
# students/urls.py (add these)
path("assessments/", AssessmentListCreateView.as_view(), name="assessments-list-create"),
path("assessments/<int:assessment_id>/", AssessmentDetailView.as_view(), name="assessment-detail"),
path("assessments/<int:assessment_id>/submit/", AssessmentSubmitView.as_view(), name="assessment-submit"),

]
