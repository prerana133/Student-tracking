// src/pages/Analytics.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { useAuth } from "../hooks/useAuth";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ---------- Helpers ---------- */

function extractListFromResponse(resp) {
  const d = resp?.data ?? resp;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.results)) return d.results;
  if (d.data && Array.isArray(d.data)) return d.data;
  if (d.data && Array.isArray(d.data.results)) return d.data.results;
  return [];
}

function extractObjectFromResponse(resp) {
  const d = resp?.data ?? resp;
  if (!d) return {};
  if (typeof d === "object" && !Array.isArray(d)) {
    if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data;
    return d;
  }
  return {};
}

function monthNumberToName(n) {
  try {
    return format(new Date(2020, n - 1, 1), "MMM");
  } catch {
    return `${n}`;
  }
}

/* ---------- Component ---------- */

export default function AnalyticsPage() {
  const { user } = useAuth();

  // UI state
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  // Data state
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);

  // Meta state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* --- initial load: batches list for dropdown --- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await API.get("students/batches/");
        const list = extractListFromResponse(res);
        if (mounted) setBatches(list);
      } catch (err) {
        console.warn("Could not load batches for analytics:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- API fetchers (batch-wise only) ---------- */

  async function fetchMonthlyAttendanceForBatch({ batchId, y, m }) {
    setError(null);
    setMonthlyReport([]);

    if (!batchId) {
      setError("Please select a batch to fetch monthly attendance.");
      return;
    }

    setLoading(true);
    try {
      const params = {
        batch_id: batchId,
        year: y,
        month: m,
      };

      const res = await API.get("students/analytics/monthly-attendance/", { params });
      const payload = res?.data ?? res;
      const rows = Array.isArray(payload) ? payload : payload?.data ?? payload ?? [];

      const normalized = (Array.isArray(rows) ? rows : []).map((r) => ({
        student_id: r.student_id ?? r.id ?? null,
        student_name:
          r.student_name ??
          r.name ??
          `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        roll_no: r.roll_no ?? r.rollNumber ?? "-",
        year: Number(r.year ?? y),
        month: Number(r.month ?? m),
        total_days: Number(r.total_days ?? 0),
        present_days: Number(r.present_days ?? 0),
        attendance_percentage: Number(r.attendance_percentage ?? 0),
      }));
      setMonthlyReport(normalized);
    } catch (err) {
      console.error("Monthly attendance error:", err);
      setError(
        err?.response?.data || err?.message || "Failed to load monthly attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchBatchSummary(batchId) {
    setError(null);
    setBatchSummary(null);
    if (!batchId) {
      setError("Please pick a batch to fetch summary.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/students/analytics/batch-summary/${batchId}/`);
      const payload = extractObjectFromResponse(res);
      setBatchSummary({
        average_attendance: payload.average_attendance ?? payload.avg_attendance ?? 0,
        average_score: payload.average_score?.avg ?? payload.average_score ?? 0,
        top_students: Array.isArray(payload.top_students)
          ? payload.top_students
          : extractListFromResponse(payload.top_students ?? []),
      });
    } catch (err) {
      console.error("Batch summary error:", err);
      setError(err?.response?.data || err?.message || "Failed to load batch summary.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Render ---------- */
  const canViewAnalytics =
    user && (user.role === "admin" || user.role === "teacher" || user.role === "student");

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0" style={{ color: "#0b48b3" }}>
          Batch Analytics
        </h2>
      </div>

      {!canViewAnalytics && (
        <div className="alert alert-danger" role="alert">
          You do not have permission to view analytics.
        </div>
      )}

      {canViewAnalytics && (
        <>
          {/* Filter Form (Bootstrap) */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-3">Filter</h5>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedBatchId) {
                    setError("Please select a batch first.");
                    return;
                  }
                  fetchMonthlyAttendanceForBatch({
                    batchId: selectedBatchId,
                    y: year,
                    m: month,
                  });
                  fetchBatchSummary(selectedBatchId);
                }}
              >
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Batch</label>
                    <select
                      className="form-select"
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                    >
                      <option value="">Select batch</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label">Year</label>
                    <input
                      type="number"
                      className="form-control"
                      value={year}
                      min={2000}
                      max={2100}
                      onChange={(e) => setYear(Number(e.target.value))}
                    />
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label">Month</label>
                    <select
                      className="form-select"
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }).map((_, i) => {
                        const m = i + 1;
                        return (
                          <option key={m} value={m}>
                            {monthNumberToName(m)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="col-12 col-md-2 d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary flex-grow-1"
                      disabled={loading}
                    >
                      {loading ? "Loading…" : "Load"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setMonthlyReport([]);
                        setBatchSummary(null);
                        setError(null);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {typeof error === "string" ? error : JSON.stringify(error)}
            </div>
          )}

          {/* KPI row (Batch summary) */}
          {batchSummary && (
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="text-muted mb-1">Average Attendance</p>
                    <h4 className="mb-0">
                      {batchSummary.average_attendance ?? 0}%
                    </h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="text-muted mb-1">Average Score</p>
                    <h4 className="mb-0">{batchSummary.average_score ?? 0}</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="text-muted mb-1">Top Students (by avg)</p>
                    <div className="mt-2">
                      {Array.isArray(batchSummary.top_students) &&
                      batchSummary.top_students.length > 0 ? (
                        <ol className="mb-0 ps-3">
                          {batchSummary.top_students.map((s, i) => (
                            <li key={i}>
                              {s.student__roll_no ??
                                s.roll_no ??
                                s.student_id ??
                                "student"}{" "}
                              — {Number(s.avg_score ?? s.avg ?? 0)}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-muted">No data</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly attendance chart + table */}
          {monthlyReport && monthlyReport.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">
                  Monthly attendance ({year}-{String(month).padStart(2, "0")})
                </h5>

                <div style={{ width: "100%", height: 260 }} className="mb-3">
                  <ResponsiveContainer>
                    <BarChart
                      data={monthlyReport.map((r) => ({
                        name: r.student_name,
                        percent: r.attendance_percentage,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="percent" name="Attendance (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="table-responsive">
                  <table className="table table-striped table-hover table-bordered align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Roll</th>
                        <th>Present</th>
                        <th>Total</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReport.map((r) => (
                        <tr key={r.student_id}>
                          <td>{r.student_name}</td>
                          <td>{r.roll_no}</td>
                          <td>{r.present_days}</td>
                          <td>{r.total_days}</td>
                          <td>{r.attendance_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
