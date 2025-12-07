from typing import Dict, List, Optional, Union, Any
from django.db import models
from django.db.models import Avg, Sum, QuerySet
from django.core.exceptions import ValidationError

from students.models import AssessmentSubmission, StudentProfile, Batch


def calculate_score(answer_key: dict, answers: dict) -> float:
    """
    answer_key format (new style):
    {
      "q1": { "correctAnswer": "2", "score": 1 },
      "q2": { "correctAnswers": ["a", "b"], "score": 2 },
      ...
    }

    answers format (SurveyJS result):
    {
      "q1": "2",
      "q2": ["a", "b"],
      ...
    }

    Also supports legacy simple format:
    { "q1": "2", "q2": "def" }  -> each worth 1 mark
    """
    if not answer_key or not isinstance(answer_key, dict):
        return 0.0

    if not answers or not isinstance(answers, dict):
        return 0.0

    total = 0.0

    for qname, meta in answer_key.items():
        user_answer = answers.get(qname, None)

        # Nothing answered for this question
        if user_answer is None:
            continue

        # -------- Legacy format: answer_key["q1"] = "2" ----------
        if not isinstance(meta, dict):
            correct = meta
            # compare as strings so 2 == "2"
            if str(user_answer) == str(correct):
                total += 1.0
            continue

        # -------- New format with meta dict ----------
        score_q = float(meta.get("score", 0) or 0)

        correct_single = meta.get("correctAnswer", None)
        correct_multi = meta.get("correctAnswers", None)

        # Multi-choice / multi-select question
        if correct_multi is not None:
            # Normalize both to list of strings and compare as sets
            if not isinstance(correct_multi, (list, tuple)):
                correct_multi = [correct_multi]

            # User must have answered a list
            if isinstance(user_answer, (list, tuple)):
                correct_set = {str(v) for v in correct_multi}
                user_set = {str(v) for v in user_answer}
                if correct_set == user_set:
                    total += score_q
            # if user_answer is not list, can't be correct here
            continue

        # Single-answer question
        if correct_single is not None:
            if str(user_answer) == str(correct_single):
                total += score_q
            continue

        # If neither correctAnswer nor correctAnswers is set,
        # treat as legacy simple equal comparison but with custom score
        if str(user_answer) == str(meta):
            total += score_q

    return total


def get_score_trend(student: StudentProfile) -> List[Dict[str, Any]]:
    """
    Get score trend data for a student's assessment submissions.
    
    Args:
        student: The student instance
        
    Returns:
        List of dictionaries containing submission data
    """
    return list(
        AssessmentSubmission.objects
        .filter(student=student)
        .select_related('assessment')
        .order_by('submitted_at')
        .values('submitted_at', 'score', 'assessment__title')
    )


def batch_average_score(batch: Batch) -> Dict[str, Optional[float]]:
    """
    Calculate the average score for all students in a batch.
    
    Args:
        batch: The batch instance
        
    Returns:
        Dictionary with 'avg' key containing the average score
    """
    return AssessmentSubmission.objects.filter(
        student__batch=batch
    ).aggregate(avg=Avg('score'))


def top_students(batch: Batch, limit: int = 5) -> QuerySet:
    """
    Get top performing students in a batch.
    
    Args:
        batch: The batch instance
        limit: Maximum number of top students to return
        
    Returns:
        QuerySet of top students with their average scores
    """
    return (
        AssessmentSubmission.objects
        .filter(student__batch=batch)
        .values('student__id', 'student__roll_no', 'student__user__first_name')
        .annotate(avg_score=Avg('score'))
        .order_by('-avg_score')[:limit]
    )


def get_avg_score(student: StudentProfile) -> float:
    """
    Calculate the average score for a student across all submissions.
    
    Args:
        student: The student instance
        
    Returns:
        float: Average score rounded to 2 decimal places, or 0 if no submissions
    """
    result = AssessmentSubmission.objects.filter(
        student=student
    ).aggregate(avg_score=Avg('score'))
    
    return round(result['avg_score'] or 0, 2)


def get_total_submissions(student: StudentProfile) -> int:
    """
    Get the total number of submissions for a student.
    
    Args:
        student: The student instance
        
    Returns:
        int: Total number of submissions
    """
    return AssessmentSubmission.objects.filter(student=student).count()
