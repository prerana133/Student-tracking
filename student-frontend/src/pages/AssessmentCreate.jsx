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
  // creation should not capture answers; create only stores questionnaire

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Predefined templates: 2 Python, 2 Java
  const templates = [
    {
      id: "py-basic",
      language: "Python",
      name: "Python - Basics (2 questions)",
      questionnaire: {
        pages: [
          {
            name: "page1",
            elements: [
              {
                type: "radiogroup",
                name: "py_q1",
                title: "What is the output of: print(1 + 1)?",
                choices: ["1", "2", "11"],
              },
              {
                type: "text",
                name: "py_q2",
                title: "Name the keyword used to define a function in Python.",
              },
            ],
          },
        ],
      },
    },
    {
      id: "py-advanced",
      language: "Python",
      name: "Python - Data Structures (2 questions)",
      questionnaire: {
        pages: [
          {
            name: "page1",
            elements: [
              {
                type: "radiogroup",
                name: "py_q3",
                title: "Which data type is immutable?",
                choices: ["list", "tuple", "dict"],
              },
              {
                type: "text",
                name: "py_q4",
                title: "Which built-in function returns the length of a list?",
              },
            ],
          },
        ],
      },
    },
    {
      id: "java-basic",
      language: "Java",
      name: "Java - Basics (2 questions)",
      questionnaire: {
        pages: [
          {
            name: "page1",
            elements: [
              {
                type: "radiogroup",
                name: "java_q1",
                title: "Which keyword is used to create a subclass in Java?",
                choices: ["implements", "extends", "inherits"],
              },
              {
                type: "text",
                name: "java_q2",
                title: "What is the entry point method signature for a Java application?",
              },
            ],
          },
        ],
      },
    },
    {
      id: "java-advanced",
      language: "Java",
      name: "Java - OOP (2 questions)",
      questionnaire: {
        pages: [
          {
            name: "page1",
            elements: [
              {
                type: "radiogroup",
                name: "java_q3",
                title: "Which feature allows a class to have multiple forms?",
                choices: ["Abstraction", "Polymorphism", "Encapsulation"],
              },
              {
                type: "text",
                name: "java_q4",
                title: "Name the keyword used to define an interface in Java.",
              },
            ],
          },
        ],
      },
    },
  ];

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

  // No answer capture in create page

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

    // For create: do not include answer_key. Save questionnaire as-is (teacher should create without answers).
    const cleanQuestionnaire = questionnaireParsed;
    const answerKey = {};
    const totalMarks = 0;

    const payload = {
      title,
      description,
      batch: batchId || null,
      questionnaire: cleanQuestionnaire,
      answer_key: answerKey,
      total_marks: totalMarks,
    };

    try {
      await API.post("students/assessments/", payload);
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
            <label className="form-label">Templates</label>
            <select
              className="form-select"
              value={selectedTemplate}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedTemplate(id);
                const tpl = templates.find((t) => t.id === id);
                if (tpl) {
                  setQuestionnaireRaw(JSON.stringify(tpl.questionnaire, null, 2));
                  // update preview right away
                  try {
                    const parsed = JSON.parse(JSON.stringify(tpl.questionnaire));
                    const model = new Model(parsed);
                    setPreviewModel(model);
                    setError(null);
                  } catch (err) {
                    setError("Failed to load template: " + err.message);
                  }
                }
              }}
            >
              <option value="">Select a template (optional)</option>
              <optgroup label="Python">
                {templates
                  .filter((t) => t.language === "Python")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Java">
                {templates
                  .filter((t) => t.language === "Java")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            </select>
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
