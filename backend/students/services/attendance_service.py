from django.db.models import Count, Q
from datetime import datetime
from students.models import Attendance


def get_attendance_trend(student):
    records = (
        Attendance.objects
        .filter(student=student)
        .values('date__year', 'date__month')
        .annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status="present"))
        )
        .order_by('date__year', 'date__month')
    )

    trend = []
    for r in records:
        percentage = (r['present'] / r['total']) * 100
        trend.append({
            "year": r['date__year'],
            "month": r['date__month'],
            "attendance_percentage": round(percentage, 2)
        })
    return trend


def batch_attendance_summary(batch):
    stats = (
        Attendance.objects.filter(student__batch=batch)
        .aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present'))
        )
    )
    if stats['total'] == 0:
        return 0
    return round((stats['present'] / stats['total']) * 100, 2)


def get_attendance_percentage(student):
    total_classes = Attendance.objects.filter(student=student).count()
    attended_classes = Attendance.objects.filter(student=student, status='present').count()

    if total_classes == 0:
        return 0  # No classes yet

    return round((attended_classes / total_classes) * 100, 2)