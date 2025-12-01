import numpy as np
from sklearn.linear_model import LogisticRegression
from students.models import StudentProfile
from students.services.assessment_service import get_avg_score, get_total_submissions
from students.services.attendance_service import get_attendance_percentage


def build_student_feature_vector(student):
    attendance_pct = get_attendance_percentage(student)
    avg_score = get_avg_score(student)
    submissions_count = get_total_submissions(student)

    return np.array([attendance_pct, avg_score, submissions_count])

def predict_low_performing(student):
    model = LogisticRegression()
    # train using historical data
    X_train = []
    y_train = []
    
    for s in StudentProfile.objects.all():
        X_train.append(build_student_feature_vector(s))
        y_train.append(1 if get_avg_score(s) < 40 else 0)

    model.fit(X_train, y_train)

    return model.predict([build_student_feature_vector(student)])[0]