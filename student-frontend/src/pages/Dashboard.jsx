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
  BarChart,
  Bar,
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

  const isStudent =
    user &&
    (user.role === "student" ||
      user?.is_student === true ||
      user?.role === "STUDENT");

  const isStaff =
    user &&
    (user.role === "teacher" ||
      user.role === "admin" ||
      user?.is_teacher === true ||
      user?.is_admin === true);

  // ---- Common error state ----
  const [error, setError] = useState(null);

  // ==============================
  // STAFF (Teacher/Admin) STATE
  // ==============================
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // Attendance graph + stats for the selected batch (current month)
  const [batchAttendanceChart, setBatchAttendanceChart] = useState([]);
  const [batchAttendanceStats, setBatchAttendanceStats] = useState(null);

  // ==============================
  // STUDENT STATE
  // ==============================
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [studentAttendanceTrend, setStudentAttendanceTrend] = useState([]);
  const [studentScoreTrend, setStudentScoreTrend] = useState([]);
  const [studentPrediction, setStudentPrediction] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // ==============================
  // STAFF HELPERS
  // ==============================
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

  async function loadBatchAnalytics(batchId) {
      if (!batchId) {
        setAnalytics(null);
        setBatchAttendanceChart([]);
        setBatchAttendanceStats(null);
        return;
      }
      try {
        setLoadingAnalytics(true);
        setError(null);

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // JS month is 0-based

        const [summaryRes, monthlyRes] = await Promise.all([
          API.get(`/students/analytics/batch-summary/${batchId}/`),
          API.get(
            `/students/analytics/monthly-attendance/?batch_id=${batchId}&year=${year}&month=${month}`
          ),
        ]);

        const summaryPayload = summaryRes.data?.data
          ? summaryRes.data.data
          : summaryRes.data;
        setAnalytics(summaryPayload);

        // 🔧 use helper here
        const monthlyData = extractListFromResponse(monthlyRes);

        const chartData = monthlyData.map((row) => ({
          name: row.roll_no || row.student_name,
          label: row.student_name,
          attendance: row.attendance_percentage,
        }));
        setBatchAttendanceChart(chartData);

        if (monthlyData.length > 0) {
          const totalPct = monthlyData.reduce(
            (sum, r) => sum + (r.attendance_percentage || 0),
            0
          );
          const avgMonthly = totalPct / monthlyData.length;

          let best = monthlyData[0];
          let worst = monthlyData[0];

          monthlyData.forEach((r) => {
            if (r.attendance_percentage > best.attendance_percentage) best = r;
            if (r.attendance_percentage < worst.attendance_percentage)
              worst = r;
          });

          setBatchAttendanceStats({
            year,
            month,
            avg: avgMonthly,
            best,
            worst,
          });
        } else {
          setBatchAttendanceStats({
            year,
            month,
            avg: 0,
            best: null,
            worst: null,
          });
        }
      } catch (e) {
        console.error("Analytics fetch error:", e);
        setError("Failed to load batch analytics. See console for details.");
        setAnalytics(null);
        setBatchAttendanceChart([]);
        setBatchAttendanceStats(null);
      } finally {
        setLoadingAnalytics(false);
      }
    }


  // ==============================
  // STUDENT HELPERS
  // ==============================
  async function loadStudentDashboard() {
    try {
      setLoadingStudent(true);
      setError(null);

      // 1) Get student profile to know student_id
      const profileRes = await API.get("students/profile/");
      const profileList = extractListFromResponse(profileRes);
      const profile = profileList[0];
      if (!profile) {
        throw new Error("Could not load student profile");
      }
      setStudentProfile(profile);

      const studentId = profile.id;

      // 2) Parallel calls: stats, attendance trend, score trend, prediction
      const [statsRes, attendanceRes, scoreRes, predRes] = await Promise.all([
        API.get("students/analytics/student-dashboard/"),
        API.get(`students/analytics/attendance-trend/${studentId}/`),
        API.get(`students/analytics/score-trend/${studentId}/`),
        API.get(`students/analytics/predict/${studentId}/`),
      ]);

      // Student stats
      setStudentStats(statsRes.data?.data || statsRes.data);

      // Attendance trend -> chart data: ["MM/YY", percentage]
      const attendanceRaw = attendanceRes.data || [];
      const attendanceChartData = attendanceRaw.map((item) => ({
        name: `${item.month}/${String(item.year).slice(-2)}`,
        attendance: item.attendance_percentage,
      }));
      setStudentAttendanceTrend(attendanceChartData);

      // Score trend -> chart data: [assessment title, score]
      const scoreRaw = scoreRes.data || [];
      const scoreChartData = scoreRaw.map((item, idx) => ({
        name: item.assessment__title || `Test ${idx + 1}`,
        score: item.score,
      }));
      setStudentScoreTrend(scoreChartData);

      // Prediction
      setStudentPrediction(predRes.data || null);
    } catch (e) {
      console.error("Student dashboard load error:", e);
      setError("Failed to load student analytics. See console for details.");
    } finally {
      setLoadingStudent(false);
    }
  }

  // ==============================
  // EFFECTS
  // ==============================

  // On mount / user change → decide which data to load
  useEffect(() => {
    if (!user) return;

    if (isStudent) {
      loadStudentDashboard();
    } else if (isStaff) {
      loadBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When selectedBatchId changes → load analytics (staff only)
  useEffect(() => {
    if (isStaff && selectedBatchId) {
      loadBatchAnalytics(selectedBatchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, isStaff]);
  

  // ==============================
  // DERIVED VALUES FOR STAFF
  // ==============================

  function formatScore(value) {
    if (value === null || value === undefined || value === "-") return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value; // fallback to raw if it's not numeric
    return num.toFixed(2);
  }

  const {
    average_attendance = "-",
    average_score = { avg: "-" },
    top_students = [],
  } = analytics || {};

  const avgScoreDisplay = formatScore(average_score?.avg);

  const top = top_students[0];

  // ==============================
  // RENDER HELPERS
  // ==============================

  function renderStudentDashboard() {
    const attendancePct = studentStats?.attendance_percentage ?? "-";
    const avgScore = studentStats?.average_score ?? "-";
    const totalSubmissions = studentStats?.total_submissions ?? "-";
    const lowPerformer =
      studentPrediction && studentPrediction.low_performer === true;

    return (
      <>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-md-items-center mb-3 gap-2">
          <div>
            <h3 className="mb-0">My Dashboard</h3>
            {studentProfile && (
              <small className="text-muted">
                {studentProfile.roll_no} • {studentProfile.first_name}{" "}
                {studentProfile.last_name}
              </small>
            )}
          </div>
        </div>

        {loadingStudent && (
          <div className="alert alert-secondary">Loading your analytics…</div>
        )}

        {/* Student stat cards */}
        <div className="row g-2 g-md-3 mb-4">
          <div className="col-12 col-sm-6 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-truncate">
                  Attendance Percentage
                </h6>
                <h3 className="mb-0">
                  {attendancePct !== "-"
                    ? `${attendancePct.toFixed
                        ? attendancePct.toFixed(2)
                        : attendancePct}%`
                    : "-"}
                </h3>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-truncate">Average Score</h6>
                <h3 className="mb-0">
                  {typeof avgScore === "number"
                    ? avgScore.toFixed(2)
                    : avgScore}
                </h3>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-truncate">
                  Total Assessments Submitted
                </h6>
                <h3 className="mb-0">{totalSubmissions}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Prediction */}
        {studentPrediction && (
          <div
            className={`alert ${
              lowPerformer ? "alert-warning" : "alert-success"
            }`}
          >
            {lowPerformer ? (
              <>
                <strong>Heads up:</strong> Your current pattern suggests you
                may be at risk of low performance. Focus on improving your
                attendance and assessment scores.
              </>
            ) : (
              <>You're currently on track based on your attendance and scores.</>
            )}
          </div>
        )}

        {/* Charts row */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Score Trend</h5>
                {studentScoreTrend && studentScoreTrend.length > 0 ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={studentScoreTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#8884d8"
                          dot
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted mb-0">
                    No submissions yet to show trend.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Attendance Trend</h5>
                {studentAttendanceTrend &&
                studentAttendanceTrend.length > 0 ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={studentAttendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          stroke="#82ca9d"
                          dot
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted mb-0">
                    Not enough attendance data yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity placeholder – you can wire this later */}
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Recent Activity</h5>
            <p className="text-muted mb-0">
              Recent assessment submissions and attendance highlights can be
              shown here.
            </p>
          </div>
        </div>
      </>
    );
  }

  function renderStaffDashboard() {
    return (
      <>
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

        {/* If no batch is selected */}
        {!selectedBatchId && !loadingBatches && (
          <div className="alert alert-info">
            No batch selected. Please select a batch to view analytics.
          </div>
        )}

        {selectedBatchId && (
          <>
            {loadingAnalytics && (
              <div className="alert alert-secondary">
                Loading batch analytics…
              </div>
            )}

            {/* Stats cards */}
            <div className="row g-2 g-md-3 mb-4">
              <div className="col-12 col-sm-6 col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="text-muted text-truncate">
                      Average Attendance (All Time)
                    </h6>
                    <h3 className="mb-0">
                      {average_attendance !== "-"
                        ? `${average_attendance}%`
                        : "-"}
                    </h3>
                    <small className="text-muted">
                      Across all attendance records in this batch
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="text-muted text-truncate">
                      Average Score
                    </h6>
                    <h3 className="mb-0">{avgScoreDisplay}</h3>
                    <small className="text-muted">
                      Average of all assessment submissions
                    </small>
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
                      {top?.avg_score !== undefined ? `${formatScore(top.avg_score)} avg` : "—"}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Top students + Attendance graph */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title mb-2">Top Students</h5>
                    {top_students && top_students.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {top_students.map((s) => (
                          <li
                            key={s.student__id}
                            className="list-group-item d-flex justify-content-between align-items-center px-0"
                          >
                            <div>
                              <div className="fw-semibold">
                                {s.student__roll_no}
                              </div>
                              <small className="text-muted">
                                {s.student__user__first_name}
                              </small>
                            </div>
                            <span className="badge bg-primary rounded-pill">
                              {formatScore(s.avg_score)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted mb-0">
                        Not enough data to compute top students.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance graph + monthly stats */}
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body d-flex flex-column h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="card-title mb-0">
                        Attendance (Current Month)
                      </h5>
                      {batchAttendanceStats && (
                        <small className="text-muted">
                          {batchAttendanceStats.month}/{batchAttendanceStats.year}
                        </small>
                      )}
                    </div>

                    {batchAttendanceChart &&
                    batchAttendanceChart.length > 0 ? (
                      <>
                        <div style={{ height: 210 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={batchAttendanceChart}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="attendance" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {batchAttendanceStats && (
                          <div className="mt-3 small">
                            <div>
                              <strong>Monthly Avg:</strong>{" "}
                              {batchAttendanceStats.avg.toFixed
                                ? batchAttendanceStats.avg.toFixed(2)
                                : batchAttendanceStats.avg}
                              %
                            </div>
                            {batchAttendanceStats.best && (
                              <div>
                                <strong>Best:</strong>{" "}
                                {batchAttendanceStats.best.roll_no} (
                                {batchAttendanceStats.best.attendance_percentage}
                                %)
                              </div>
                            )}
                            {batchAttendanceStats.worst && (
                              <div>
                                <strong>Lowest:</strong>{" "}
                                {batchAttendanceStats.worst.roll_no} (
                                {
                                  batchAttendanceStats.worst
                                    .attendance_percentage
                                }
                                %)
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted mb-0">
                        No attendance records for this month yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Card */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Recent Activity</h5>
                <p className="text-muted mb-0">
                  You can show latest assessments, bulk attendance actions, or
                  recent low-performing predictions here.
                </p>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ==============================
  // MAIN RENDER
  // ==============================
  return (
    <div className="container-fluid">
      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {!user && (
        <div className="alert alert-info">
          Please log in to view your dashboard.
        </div>
      )}

      {user && isStudent && renderStudentDashboard()}

      {user && !isStudent && isStaff && renderStaffDashboard()}

      {user && !isStudent && !isStaff && (
        <div className="alert alert-info">
          Your role does not have a specific dashboard yet.
        </div>
      )}
    </div>
  );
}
