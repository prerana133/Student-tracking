// src/pages/AssessmentTake.jsx
import React, { useEffect, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import API from "../api";
import { useParams, useNavigate } from "react-router-dom";

export default function AssessmentTake() {
  const { id } = useParams(); // route: /assessments/:id/take
  const [assessment, setAssessment] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
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
          {model ? (
            <Survey model={model} />
          ) : (
            <div className="alert alert-warning mb-0">
              Invalid questionnaire.
            </div>
          )}
        </div>
      </div>

      {!alreadySubmitted && (
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={submitAnswers}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
        </div>
      )}
    </div>
  );
}
