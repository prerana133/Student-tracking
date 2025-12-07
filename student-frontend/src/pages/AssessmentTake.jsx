import React, { useEffect, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import API from "../api";
import { useAuth } from "../hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";


// ------------------ Helper Functions ------------------

// Build question title map from SurveyJS structure
function buildQuestionTitleMap(questionnaire) {
  const map = {};

  if (!questionnaire || typeof questionnaire !== "object") return map;

  const pages = questionnaire.pages || [];
  pages.forEach((page) => {
    const elements = page.elements || [];
    elements.forEach((el) => {
      if (el?.name) {
        map[el.name] = el.title || el.name;
      }
    });
  });

  return map;
}

// Normalize student / correct answer for display
function normalizeAnswer(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === "" || value === null || value === undefined) return "—";
  return String(value);
}

// Build table rows comparing student answers with correct answers
function buildAnswerComparison(questionnaire, answerKey, answers) {
  const rows = [];
  if (!answerKey || typeof answerKey !== "object") return rows;

  const titleMap = buildQuestionTitleMap(questionnaire);
  const ansObj = answers || {};

  Object.keys(answerKey).forEach((qname, index) => {
    const meta = answerKey[qname] || {};

    // Support both formats
    const correct =
      meta.correctAnswers !== undefined ? meta.correctAnswers : meta.correctAnswer;

    const your = ansObj[qname];

    const normCorrect = normalizeAnswer(correct);
    const normYour = normalizeAnswer(your);

    const isCorrect = normCorrect !== "—" && normCorrect === normYour;

    rows.push({
      id: qname,
      no: index + 1,
      title: titleMap[qname] || qname,
      your: normYour,
      correct: normCorrect,
      isCorrect,
    });
  });

  return rows;
}


// ------------------ Component ------------------

export default function AssessmentTake() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [model, setModel] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  const { user } = useAuth();
  const isTeacherOrAdmin =
    user && (user.role === "teacher" || user.role === "admin");

  // ------------- Load assessment data -------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await API.get(`students/assessments/${id}/`);
        const payload = res.data?.data ?? res.data ?? res;

        if (!mounted) return;

        const questionnaire = payload.questionnaire || {};
        const m = new Model(questionnaire);

        if (payload.is_submitted && payload.student_submission) {
          m.data = payload.student_submission.answers || {};
          m.mode = "display";
          setViewingSubmission(payload.student_submission);
        }

        if (payload.submissions?.length) {
          setSubmissions(payload.submissions);
        }

        setAssessment(payload);
        setModel(m);
      } catch (err) {
        setError("Failed to load assessment. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ------------- Student Submit -------------
  async function submitAnswers() {
    if (!model) return;
    setSubmitting(true);

    try {
      const answers = model.data;

      const res = await API.post(`students/assessments/${id}/submit/`, {
        answers,
      });

      const submission = res.data.data;

      alert("Submitted — Score: " + (submission.score ?? "N/A"));

      setAssessment((prev) =>
        prev
          ? {
              ...prev,
              is_submitted: true,
              student_submission: submission,
            }
          : prev
      );

      const m = new Model(assessment.questionnaire);
      m.data = submission.answers;
      m.mode = "display";
      setModel(m);

      setViewingSubmission(submission);
    } catch (err) {
      alert("Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Teacher: view a student's submission
  function viewSubmission(sub) {
    if (!sub || !assessment) return;

    const m = new Model(assessment.questionnaire);
    m.data = sub.answers || {};
    m.mode = "display";

    setModel(m);
    setViewingSubmission(sub);
  }

  if (loading) {
    return (
      <div className="container my-4">
        <div className="alert alert-secondary">Loading assessment…</div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="container my-4">
        <div className="alert alert-danger">{error || "Assessment not found."}</div>
      </div>
    );
  }

  const alreadySubmitted =
    assessment.is_submitted && !!assessment.student_submission;

  // Build comparison table rows
  const comparisonRows =
    alreadySubmitted && assessment.answer_key
      ? buildAnswerComparison(
          assessment.questionnaire,
          assessment.answer_key,
          assessment.student_submission?.answers
        )
      : [];


  // ------------------ UI Rendering ------------------
  return (
    <div className="container my-4">
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">{assessment.title}</h3>
          {assessment.description && (
            <p className="text-muted mb-0">{assessment.description}</p>
          )}
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => nav(-1)}
        >
          ← Back
        </button>
      </div>


      {/* ----------- Submitted Status ----------- */}
      {alreadySubmitted && (
        <div className="alert alert-success">
          <strong>Submitted</strong><br />
          Your Score:{" "}
          <span className="fw-bold">
            {assessment.student_submission.score}
            {assessment.total_marks ? ` / ${assessment.total_marks}` : ""}
          </span>
        </div>
      )}


      {/* ----------- Student Comparison Table ----------- */}
      {alreadySubmitted &&
        assessment.answer_key &&
        comparisonRows.length > 0 && (
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h5 className="mb-0">Correct Answers Review</h5>
            </div>
            <div className="card-body table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Your Answer</th>
                    <th>Correct Answer</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.no}</td>
                      <td>{row.title}</td>
                      <td>{row.your}</td>
                      <td><strong>{row.correct}</strong></td>
                      <td>
                        {row.isCorrect ? (
                          <span className="badge bg-success">✔</span>
                        ) : (
                          <span className="badge bg-danger">✖</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}



      {/* ----------- Survey Viewer ----------- */}
      <div className="card shadow-sm mb-3">
        <div className="card-header">
          <h5 className="mb-0">
            {alreadySubmitted ? "Your Responses" : "Assessment Questions"}
          </h5>
        </div>
        <div className="card-body">
          {model ? <Survey model={model} /> : "Invalid questionnaire"}
        </div>
      </div>


      {/* ----------- Submit Button ----------- */}
      <div className="d-flex justify-content-end">
        {!alreadySubmitted && !isTeacherOrAdmin && (
          <button
            className="btn btn-primary"
            onClick={submitAnswers}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Answers"}
          </button>
        )}
      </div>
    </div>
  );
}
