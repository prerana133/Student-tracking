// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { useAuth } from "../hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Helper for different response shapes (paginated, non-paginated, single object)
function extractListFromResponse(resp) {
  const d = resp?.data ?? resp;
  if (!d) return [];

  // plain array
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.results)) return d.results;

  // wrapped in data
  if (d.data) {
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.data.results)) return d.data.results;
    // single object in data (e.g., student gets just their batch)
    if (!Array.isArray(d.data)) return [d.data];
  }

  // single object
  if (!Array.isArray(d) && typeof d === "object") {
    return [d];
  }

  return [];
}

export default function Dashboard() {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // ---- Load batches (for teacher/admin → list; for student → their batch) ----
  async function loadBatches() {
    try {
      setLoadingBatches(true);
      setError(null);

      const response = await API.get("students/batches/");
      const list = extractListFromResponse(response);

      setBatches(list || []);

      // If nothing selected yet and we have batches, pick the first one
      if (!selectedBatchId && list && list.length > 0) {
        setSelectedBatchId(String(list[0].id));
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
      setError("Failed to load batches");
    } finally {
      setLoadingBatches(false);
    }
  }

  // ---- Load analytics for selected batch ----
  async function loadAnalytics(batchId) {
    if (!batchId) {
      setAnalytics(null);
      return;
    }
    try {
      setLoadingAnalytics(true);
      setError(null);

      const res = await API.get(`/students/analytics/batch-summary/${batchId}/`);
      const payload = res.data?.data ? res.data.data : res.data;
      setAnalytics(payload);
    } catch (e) {
      console.error("Analytics fetch error:", e);
      setError("Failed to load analytics. See console for details.");
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  // On mount → load batches
  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When selectedBatchId changes → load analytics
  useEffect(() => {
    if (selectedBatchId) {
      loadAnalytics(selectedBatchId);
    }
  }, [selectedBatchId]);

  const {
    average_attendance = "-",
    average_score = { avg: "-" },
    top_students = [],
  } = analytics || {};

  const avgScoreRaw = average_score?.avg;
  const avgScoreDisplay =
    avgScoreRaw !== undefined && avgScoreRaw !== null && !isNaN(Number(avgScoreRaw))
      ? Number(avgScoreRaw).toFixed(2)
      : "-";

  const top = top_students[0];

  return (
    <div className="container-fluid">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-md-items-center mb-3 gap-2">
        <h3 className="mb-0">Dashboard</h3>

        {/* Batch selector - Responsive */}
        <div className="d-flex flex-column flex-sm-row align-items-start align-sm-items-center gap-2 w-100 w-sm-auto">
          <label className="mb-0 fw-semibold text-nowrap">Batch:</label>
          <select
            className="form-select"
            style={{ minWidth: "150px", maxWidth: "100%" }}
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            disabled={loadingBatches || batches.length === 0}
          >
            <option value="">
              {loadingBatches ? "Loading batches..." : "Select batch"}
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || `Batch #${b.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* If no batch is selected */}
      {!selectedBatchId && !loadingBatches && (
        <div className="alert alert-info">
          No batch selected. Please select a batch to view analytics.
        </div>
      )}

      {/* Stats cards */}
      {selectedBatchId && (
        <>
          {loadingAnalytics && (
            <div className="alert alert-secondary">Loading analytics…</div>
          )}

          <div className="row g-2 g-md-3 mb-4">
            <div className="col-12 col-sm-6 col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted text-truncate">Average Attendance</h6>
                  <h3 className="mb-0">
                    {average_attendance !== "-" ? `${average_attendance}%` : "-"}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted text-truncate">Average Score</h6>
                  <h3 className="mb-0">{avgScoreDisplay}</h3>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-muted text-truncate">Top Student</h6>
                  <h5 className="mb-0 text-truncate">
                    {top?.student__roll_no || "—"}
                  </h5>
                  <small className="text-muted">
                    {top?.avg_score !== undefined ? `${top.avg_score} avg` : "—"}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Activity Card */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Recent Activity</h5>
          <p className="text-muted mb-0">No activity yet</p>
        </div>
      </div>
    </div>
  );
}
