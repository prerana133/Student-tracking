// src/pages/AssessmentTake.jsx
import React, { useEffect, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import API from "../api";
import { useAuth } from "../hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";

export default function AssessmentTake() {
  const { id } = useParams(); // route: /assessments/:id/take
  const [assessment, setAssessment] = useState(null);
  const [model, setModel] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [questionnaireRaw, setQuestionnaireRaw] = useState("");
  const nav = useNavigate();

  const { user } = useAuth();
  const isTeacherOrAdmin = user && (user.role === "teacher" || user.role === "admin");

  // Load assessment detail
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await API.get(`students/assessments/${id}/`);
        const payload = res.data?.data ?? res.data ?? res;

        const questionnaire = payload.questionnaire || {};

        if (!mounted) return;

        const m = new Model(questionnaire);

        // For students: pre-fill answers & make read-only
        if (payload.is_submitted && payload.student_submission) {
          const submittedAnswers = payload.student_submission.answers || {};
          m.data = submittedAnswers;
          m.mode = "display";
          setViewingSubmission(payload.student_submission);
        }

        // For teachers/admins: backend may include a `submissions` list
        if (payload.submissions && Array.isArray(payload.submissions)) {
          setSubmissions(payload.submissions);
        }

        setAssessment(payload);
        setModel(m);
        setQuestionnaireRaw(JSON.stringify(questionnaire, null, 2));
      } catch (err) {
        console.error("Failed to load assessment", err);
        if (mounted) {
          setError("Failed to load assessment. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Build new-style answer key from current survey data
  function buildAnswerKeyFromModel(m) {
    const data = m?.data || {};
    const answerKey = {};

    Object.keys(data).forEach((k) => {
      const v = data[k];
      if (v === undefined || v === null || v === "") return;

      // Default score per question; teacher can later extend to custom per-question scoring if needed
      const score = 1;
      if (Array.isArray(v)) {
        answerKey[k] = { correctAnswers: v, score };
      } else {
        answerKey[k] = { correctAnswer: v, score };
      }
    });

    return answerKey;
  }

  // Teacher: save current selections as answer key
  async function saveAsAnswerKey() {
    if (!model) return;
    try {
      const ak = buildAnswerKeyFromModel(model);
      const res = await API.put(`students/assessments/${id}/`, { answer_key: ak });
      const updated = res.data?.data || res.data || res;
      setAssessment(updated);
      alert("Saved current selections as correct answers.");
    } catch (err) {
      console.error("Failed to save answer key", err);
      alert("Failed to save answer key: " + (err?.response?.data || err.message));
    }
  }

  // Teacher: populate survey model with saved answer key (for verification)
  function populateWithAnswerKey() {
    if (!assessment || !assessment.answer_key) return;
    try {
      const ak = assessment.answer_key;
      const data = {};
      Object.keys(ak).forEach((q) => {
        const meta = ak[q] || {};
        if (meta.correctAnswers) data[q] = meta.correctAnswers;
        else if (meta.correctAnswer !== undefined) data[q] = meta.correctAnswer;
      });

      const m = new Model(assessment.questionnaire || {});
      m.data = data;
      m.mode = "display";
      setModel(m);
      setViewingSubmission(null);
    } catch (err) {
      console.error("Failed to populate with answer key", err);
    }
  }

  // Teacher: view a particular student submission in read-only mode
  function viewSubmission(sub) {
    if (!sub || !assessment) return;
    try {
      const questionnaire = assessment.questionnaire || {};
      const m = new Model(questionnaire);
      m.data = sub.answers || {};
      m.mode = "display";
      setModel(m);
      setViewingSubmission(sub);
    } catch (err) {
      console.error("Failed to build view for submission", err);
    }
  }

  // Student: submit answers
  async function submitAnswers() {
    if (!model) return;
    setSubmitting(true);
    try {
      const answers = model.data; // { questionName: value }
      const res = await API.post(`students/assessments/${id}/submit/`, {
        answers,
      });

      const submission = res.data;
      const score = submission.score ?? "N/A";

      alert("Submitted — score: " + score);
      nav("/dashboard");
    } catch (err) {
      console.error("submit failed", err);
      const msg =
        err?.response?.data?.message ||
        JSON.stringify(err?.response?.data || err.message);
      alert("Submit failed: " + msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Teacher: save updated questionnaire JSON
  async function saveQuestions() {
    try {
      const [parsed, parseErr] = (() => {
        try {
          return [JSON.parse(questionnaireRaw), null];
        } catch (e) {
          return [null, e.message];
        }
      })();

      if (parseErr) {
        alert("Invalid JSON: " + parseErr);
        return;
      }

      const res = await API.put(`students/assessments/${id}/`, {
        questionnaire: parsed,
      });
      const updated = res.data?.data || res.data || res;

      alert("Questions updated");

      const m = new Model(parsed);
      // If student had already submitted, keep them in display mode with their answers
      if (updated.is_submitted && updated.student_submission) {
        m.data = updated.student_submission.answers || {};
        m.mode = "display";
        setViewingSubmission(updated.student_submission);
      }

      setModel(m);
      setAssessment(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save questions", err);
      alert("Failed to save questions: " + (err?.response?.data || err.message));
    }
  }

  if (loading) {
    return (
      <div className="container my-4">
        <div className="alert alert-secondary d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" />
          Loading assessment…
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="container my-4">
        <div className="alert alert-danger">
          {error || "Assessment not found."}
        </div>
      </div>
    );
  }

  const alreadySubmitted =
    assessment.is_submitted && !!assessment.student_submission;

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

      {/* Student: submission status + score */}
      {alreadySubmitted && (
        <div className="alert alert-success" role="alert">
          <strong>Already submitted.</strong>
          <br />
          Your score:{" "}
          <span className="fw-bold">
            {assessment.student_submission.score}
            {typeof assessment.total_marks === "number" &&
              ` / ${assessment.total_marks}`}
          </span>
        </div>
      )}

      {/* Main card */}
      <div className="card shadow-sm mb-3">
        <div className="card-header">
          <h5 className="mb-0">
            {alreadySubmitted ? "Your Responses" : "Assessment Questions"}
          </h5>
        </div>
        <div className="card-body">
          {/* Teacher/Admin: submissions list */}
          {isTeacherOrAdmin && submissions.length > 0 && (
            <div className="mb-3">
              <h6 className="mb-2">Student Submissions</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-2">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll</th>
                      <th>Score</th>
                      <th>Submitted At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.student_name || "—"}</td>
                        <td>{s.student_roll_no || "—"}</td>
                        <td>{s.score ?? "—"}</td>
                        <td>
                          {s.submitted_at
                            ? new Date(s.submitted_at).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => viewSubmission(s)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Currently viewing a submission (teacher) */}
          {viewingSubmission && (
            <div className="alert alert-info d-flex justify-content-between align-items-center">
              <div>
                Viewing submission by{" "}
                <strong>{viewingSubmission.student_name || "—"}</strong>
                {" — Score: "}
                <strong>{viewingSubmission.score ?? "—"}</strong>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    try {
                      const q = assessment.questionnaire || {};
                      const m = new Model(q);

                      // If this is the logged-in student's own submission
                      if (
                        assessment.is_submitted &&
                        assessment.student_submission &&
                        assessment.student_submission.id === viewingSubmission.id
                      ) {
                        m.data = assessment.student_submission.answers || {};
                        m.mode = "display";
                      } else if (isTeacherOrAdmin) {
                        // Teacher resets back to empty editable questionnaire
                        m.mode = "edit";
                      }

                      setModel(m);
                    } catch (e) {
                      console.error(e);
                    }
                    setViewingSubmission(null);
                  }}
                >
                  Close View
                </button>
              </div>
            </div>
          )}

          {/* Teacher/Admin tools: answer key buttons */}
          {isTeacherOrAdmin && (
            <div className="mb-2 d-flex flex-wrap gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={populateWithAnswerKey}
                disabled={!assessment?.answer_key}
              >
                Populate with Answer Key
              </button>
              <button
                className="btn btn-sm btn-outline-info"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    JSON.stringify(assessment?.answer_key || {}, null, 2)
                  );
                  alert("Answer key copied to clipboard");
                }}
                disabled={!assessment?.answer_key}
              >
                Copy Answer Key
              </button>
            </div>
          )}

          {/* Questionnaire editor (teacher) vs Survey (everyone) */}
          {isEditing && isTeacherOrAdmin ? (
            <>
              <label className="form-label">Questionnaire JSON</label>
              <textarea
                className="form-control mb-2"
                rows={10}
                value={questionnaireRaw}
                onChange={(e) => setQuestionnaireRaw(e.target.value)}
              />
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={saveQuestions}
                >
                  Save Questions
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : model ? (
            <Survey model={model} />
          ) : (
            <div className="alert alert-warning mb-0">
              Invalid questionnaire.
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="d-flex flex-wrap justify-content-end gap-2">
        {/* Students: submit answers if not already submitted */}
        {!alreadySubmitted && !isTeacherOrAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={submitAnswers}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
        )}

        {/* Teachers/Admins: save current selections as answer key */}
        {isTeacherOrAdmin && (
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={saveAsAnswerKey}
            disabled={!model}
          >
            Save current selections as correct answers
          </button>
        )}

        {/* Teachers/Admins: toggle questionnaire editor */}
        {isTeacherOrAdmin && (
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setIsEditing((s) => !s)}
          >
            {isEditing ? "Close editor" : "Edit Questions"}
          </button>
        )}
      </div>
    </div>
  );
}
