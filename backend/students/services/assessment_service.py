from django.db import models
from students.models import AssessmentSubmission


def calculate_score(key_or_questionnaire, answers: dict) -> float:
    """
    Flexible scorer.

    If `key_or_questionnaire` is:
      - new style `answer_key` dict:
          {
            "q1": {"correctAnswer": "4", "score": 1},
            "q2": {"correctAnswers": ["a","b"], "score": 2},
            ...
          }

      - OR old SurveyJS questionnaire with pages/elements containing
        correctAnswer / correctAnswers / score

    It will handle both.
    """
    if not key_or_questionnaire:
        return 0.0

    # ---------- Case 1: new answer_key dict ----------
    # No "pages" key → treat as flat mapping
    if isinstance(key_or_questionnaire, dict) and "pages" not in key_or_questionnaire:
        answer_key = key_or_questionnaire
        total = 0.0

        for qname, meta in answer_key.items():
            if not isinstance(meta, dict):
                continue

            expected_single = meta.get("correctAnswer")
            expected_multi = meta.get("correctAnswers")
            question_score = float(meta.get("score") or 0)
            user_answer = answers.get(qname)

            # Multi-select
            if expected_multi is not None:
                if isinstance(user_answer, list) and set(user_answer) == set(expected_multi):
                    total += question_score

            # Single-select / text
            elif expected_single is not None:
                if user_answer == expected_single:
                    total += question_score

        return total

def get_score_trend(student):
    submissions = (
        AssessmentSubmission.objects.filter(student=student)
        .order_by('submitted_at')
        .values('submitted_at', 'score', 'assessment__title')
    )
    return list(submissions)


def batch_average_score(batch):
    return AssessmentSubmission.objects.filter(
        student__batch=batch
    ).aggregate(avg=models.Avg('score'))


def top_students(batch):
    return (
        AssessmentSubmission.objects
        .filter(student__batch=batch)
        .values('student__roll_no')
        .annotate(avg_score=models.Avg('score'))
        .order_by('-avg_score')[:5]
    )


def get_avg_score(student):
    submissions = AssessmentSubmission.objects.filter(student=student)

    if not submissions.exists():
        return 0  # No tests submitted yet

    total_score = submissions.aggregate(total=models.Sum("score"))["total"]
    count = submissions.count()

    return round(total_score / count, 2)


def get_total_submissions(student):
    return AssessmentSubmission.objects.filter(student=student).count()
