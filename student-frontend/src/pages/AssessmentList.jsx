// src/pages/AssessmentList.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

export default function AssessmentList() {
  const [list, setList] = useState([]);
  const [count, setCount] = useState(null);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function load(url = "/students/assessments/?page_size=4") {
    setLoading(true);
    try {
      const res = await API.get(url);
      const data = res.data?.data || res.data;
      const results = data?.results || data;

      setList(results || []);
      setCount(data?.count || results.length || 0);
      setNext(data?.next || null);
      setPrev(data?.previous || null);
    } catch (err) {
      console.error("Failed to load assessments", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container-fluid">
      <div className="mb-3">
        <h3 className="mb-0">Available Assessments</h3>
      </div>

      {loading && (
        <div className="alert alert-secondary d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" />
          Loading assessments…
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="alert alert-info">No assessments found.</div>
      )}

      {/* Assessment List - Responsive Grid */}
      {!loading && list.length > 0 && (
        <>
          <div className="row g-2 g-md-3">
            {list.map((a) => {
              const isSubmitted = !!a.is_submitted;
              const submission = a.student_submission || null;
              const score = submission?.score;
              const totalMarks = a.total_marks;

              return (
                <div className="col-12 col-sm-6 col-lg-4" key={a.id}>
                  <div className="card shadow-sm h-100">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                        <h6 className="card-title mb-0 text-truncate">
                          {a.title}
                        </h6>
                        {/* Status Badge */}
                        {isSubmitted ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle text-nowrap">
                            ✅ Done
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-nowrap">
                            ⏳ Pending
                          </span>
                        )}
                      </div>

                      <div className="small text-muted mb-2">
                        <div className="text-truncate">
                          <strong>Batch:</strong> {a.batch_name || "—"}
                        </div>
                        <div className="text-truncate">
                          <strong>Type:</strong> {a.test_type}
                        </div>
                        <div className="text-truncate">
                          <strong>Marks:</strong>{" "}
                          {typeof totalMarks === "number" ? totalMarks : "—"}
                        </div>
                        <div className="text-truncate">
                          <strong>Created:</strong>{" "}
                          {a.created_at
                            ? new Date(a.created_at).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>

                      {/* Score */}
                      {isSubmitted && (
                        <div className="mb-2 p-2 bg-light rounded">
                          <small className="text-dark">
                            Score:{" "}
                            <strong>
                              {score}
                              {typeof totalMarks === "number" && ` / ${totalMarks}`}
                            </strong>
                          </small>
                        </div>
                      )}

                      <div className="mt-auto pt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary w-100"
                          onClick={() => navigate(`/assessments/${a.id}/take`)}
                        >
                          {isSubmitted ? "View" : "Take Test"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="d-flex flex-column flex-sm-row align-items-center gap-2 mt-3 justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 w-sm-auto"
              disabled={!prev}
              onClick={() => load(prev)}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 w-sm-auto"
              disabled={!next}
              onClick={() => load(next)}
            >
              Next →
            </button>
            {count !== null && (
              <span className="text-muted small">Total: {count}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
