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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [questionnaireRaw, setQuestionnaireRaw] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await API.get(`students/assessments/${id}/`);
        const payload = res.data?.data ?? res.data ?? res;

        const questionnaire = payload.questionnaire;

        if (mounted) {
          const m = new Model(questionnaire);

          // View response mode: pre-fill answers & make read-only
          if (payload.is_submitted && payload.student_submission) {
            const submittedAnswers = payload.student_submission.answers || {};
            m.data = submittedAnswers;
            m.mode = "display";
          }

          setAssessment(payload);
          setModel(m);
          setQuestionnaireRaw(JSON.stringify(questionnaire, null, 2));
        }
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

  const { user } = useAuth();

  function buildAnswerKeyFromModel(m) {
    const data = m?.data || {};
    const answerKey = {};
    Object.keys(data).forEach((k) => {
      const v = data[k];
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) answerKey[k] = { correctAnswers: v };
      else answerKey[k] = { correctAnswer: v };
    });
    return answerKey;
  }

  async function saveAsAnswerKey() {
    if (!model) return;
    try {
      const ak = buildAnswerKeyFromModel(model);
      await API.put(`students/assessments/${id}/`, { answer_key: ak });
      alert("Saved current selections as correct answers.");
    } catch (err) {
      console.error("Failed to save answer key", err);
      alert("Failed to save answer key: " + (err?.response?.data || err.message));
    }
  }

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

  async function saveQuestions() {
    try {
      const [parsed, err] = (() => {
        try { return [JSON.parse(questionnaireRaw), null]; } catch (e) { return [null, e.message]; }
      })();
      if (err) {
        alert("Invalid JSON: " + err);
        return;
      }
      const res = await API.put(`students/assessments/${id}/`, { questionnaire: parsed });
      const updated = res.data?.data || res.data || res;
      alert("Questions updated");
      const m = new Model(parsed);
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

      {alreadySubmitted && (
        <div className="alert alert-success" role="alert">
          <strong>Already submitted.</strong>
          <br />
          Your score:{" "}
          <span className="fw-bold">
            {assessment.student_submission.score}
          </span>
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-header">
          <h5 className="mb-0">
            {alreadySubmitted ? "Your Responses" : "Assessment Questions"}
          </h5>
        </div>
        <div className="card-body">
          {isEditing ? (
            <>
              <label className="form-label">Questionnaire JSON</label>
              <textarea
                className="form-control mb-2"
                rows={10}
                value={questionnaireRaw}
                onChange={(e) => setQuestionnaireRaw(e.target.value)}
              />
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-primary" onClick={saveQuestions}>Save Questions</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </>
          ) : model ? (
            <Survey model={model} />
          ) : (
            <div className="alert alert-warning mb-0">Invalid questionnaire.</div>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2">
        {!alreadySubmitted && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={submitAnswers}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
        )}

        {/* Teachers/Admins can mark the current selections as the correct answers */}
        {user && (user.role === "teacher" || user.role === "admin") && (
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={saveAsAnswerKey}
            disabled={!model}
          >
            Save current selections as correct answers
          </button>
        )}
        {user && (user.role === "teacher" || user.role === "admin") && (
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
