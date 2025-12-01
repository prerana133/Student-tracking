// src/pages/AssessmentCreate.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";

function tryParseJSON(s) {
  try {
    return [JSON.parse(s), null];
  } catch (err) {
    return [null, err.message];
  }
}

function extractAnswerKey(questionnaire) {
  const copy = JSON.parse(JSON.stringify(questionnaire));
  const answerKey = {};
  let totalMarks = 0;

  function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      if (node.name) {
        const qName = node.name;
        const meta = {};

        if (Object.prototype.hasOwnProperty.call(node, "correctAnswer")) {
          meta.correctAnswer = node.correctAnswer;
          delete node.correctAnswer;
        }
        if (Object.prototype.hasOwnProperty.call(node, "correctAnswers")) {
          meta.correctAnswers = node.correctAnswers;
          delete node.correctAnswers;
        }
        if (Object.prototype.hasOwnProperty.call(node, "score")) {
          meta.score = node.score;
          const s = Number(node.score);
          if (!Number.isNaN(s)) {
            totalMarks += s;
          }
          delete node.score;
        }

        if (Object.keys(meta).length > 0) {
          answerKey[qName] = meta;
        }
      }

      Object.keys(node).forEach((k) => walk(node[k]));
    }
  }

  walk(copy);
  return { cleanQuestionnaire: copy, answerKey, totalMarks };
}

export default function AssessmentCreate({ initial }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [batchId, setBatchId] = useState(initial?.batch || "");
  const [questionnaireRaw, setQuestionnaireRaw] = useState(
    initial?.questionnaire
      ? JSON.stringify(initial.questionnaire, null, 2)
      : `{
  "pages": [
    {
      "elements": [
        {
          "type": "radiogroup",
          "name": "q1",
          "title": "2 + 2 = ?",
          "choices": ["3", "4"],
          "correctAnswer": "4",
          "score": 1
        }
      ]
    }
  ]
}`
  );
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewModel, setPreviewModel] = useState(null);

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => {
    async function loadBatches() {
      setLoadingBatches(true);
      try {
        const res = await API.get("students/batches/");
        const data = res.data?.data || res.data;
        const results = data?.results || data;
        setBatches(results || []);
      } catch (err) {
        console.error("Failed to load batches", err);
      } finally {
        setLoadingBatches(false);
      }
    }

    loadBatches();
  }, []);

  function updatePreview() {
    const [q, err] = tryParseJSON(questionnaireRaw);
    if (err) {
      setError("Invalid JSON: " + err);
      setPreviewModel(null);
      return;
    }
    setError(null);
    const model = new Model(q);
    setPreviewModel(model);
  }

  useEffect(() => {
    updatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAssessment() {
    setSaving(true);
    setError(null);

    const [questionnaireParsed, parseErr] = tryParseJSON(questionnaireRaw);
    if (parseErr) {
      setError("Invalid questionnaire JSON: " + parseErr);
      setSaving(false);
      return;
    }

    const { cleanQuestionnaire, answerKey, totalMarks } =
      extractAnswerKey(questionnaireParsed);

    const payload = {
      title,
      description,
      batch: batchId || null,
      questionnaire: cleanQuestionnaire,
      answer_key: answerKey,
      total_marks: totalMarks,
    };

    try {
      const res = await API.post("students/assessments/", payload);
      console.log("Saved assessment", res.data);
      setSaving(false);
      alert("Saved assessment");
    } catch (err) {
      setError(err?.response?.data || err.message);
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-3 assessment-create-page">
      <h2 className="mb-4">Create / Edit Assessment</h2>

      {error && (
        <div className="alert alert-danger" role="alert">
          <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}

      <div className="row">
        {/* Left column: form fields */}
        <div className="col-md-4 mb-4">
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter assessment title"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short description"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Batch</label>
            <select
              className="form-select"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">
                {loadingBatches ? "Loading batches..." : "Select a batch"}
              </option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || `Batch #${b.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveAssessment}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Assessment"}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="col-md-8 mb-4 d-flex flex-column gap-3">
          {/* JSON editor */}
          <div className="card flex-grow-1">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Questionnaire (SurveyJS JSON)</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={updatePreview}
              >
                Update Preview
              </button>
            </div>
            <div className="card-body p-0 assessment-json-body">
              <textarea
                className="form-control border-0 rounded-0 h-100"
                value={questionnaireRaw}
                onChange={(e) => setQuestionnaireRaw(e.target.value)}
                style={{
                  fontFamily: "monospace",
                  resize: "none",
                }}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="card flex-grow-1">
            <div className="card-header">
              <h5 className="card-title mb-0">Teacher Preview</h5>
            </div>
            <div className="card-body assessment-preview-body">
              {previewModel ? (
                <>
                  <div className="fs-5">
                    <Survey model={previewModel} />
                  </div>
                  <p
                    className="mt-3 mb-0 text-muted"
                    style={{ fontSize: "0.9rem" }}
                  >
                    This is the <strong>teacher view</strong>. You can define{" "}
                    <code>correctAnswer</code>, <code>correctAnswers</code> and{" "}
                    <code>score</code> in the JSON above.
                    <br />
                    Before saving, those values are extracted into{" "}
                    <code>answer_key</code> and removed from{" "}
                    <code>questionnaire</code>, so students never see the
                    answers.
                  </p>
                </>
              ) : (
                <div className="text-muted">No preview (invalid JSON)</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
