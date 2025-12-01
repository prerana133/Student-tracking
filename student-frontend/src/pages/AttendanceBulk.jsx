// src/pages/AttendanceBulk.jsx
import React, { useEffect, useState } from "react";
import API from "../api"; // your axios wrapper
import { format } from "date-fns";

export default function AttendanceBulk() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [students, setStudents] = useState([]);
  const [presentSet, setPresentSet] = useState(new Set());
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("info"); // "success" | "danger" | "info"

  // Helper: normalize list responses from different API shapes
  function extractListFromResponse(resp) {
    const d = resp?.data ?? resp;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.results)) return d.results;
    if (d.data && Array.isArray(d.data.results)) return d.data.results;
    if (d.data && Array.isArray(d.data)) return d.data;
    // single object → wrap
    if (d.data && typeof d.data === "object") return [d.data];
    if (!Array.isArray(d) && typeof d === "object") return [d];
    return [];
  }

  // load batches (used on mount and after create/delete)
  async function loadBatches() {
    try {
      setLoadingBatches(true);
      const response = await API.get("students/batches/");
      const list = extractListFromResponse(response);
      setBatches(list);
    } catch (err) {
      console.error("Error fetching batches:", err);
      setMessage("Failed to load batches");
      setMessageType("danger");
    } finally {
      setLoadingBatches(false);
    }
  }

  // safe mount pattern: call loadBatches inside effect
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadBatches();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load students and existing attendance when selectedBatch or date changes
  useEffect(() => {
    let mounted = true;

    if (!selectedBatch) {
      if (mounted) {
        setStudents([]);
        setPresentSet(new Set());
      }
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setLoadingStudents(true);
      setMessage(null);
      try {
        // 1) fetch students in batch
          const studentsResp = await API.get("students/profile/", {
          params: { batch_id: selectedBatch },
        });
        const studentsList = extractListFromResponse(studentsResp);

        // 2) fetch existing attendance for batch+date
        let attendanceRecords = [];
        try {
          const attendanceResp = await API.get("students/attendance/", {
            params: { batch_id: selectedBatch, date },
          });
          attendanceRecords = extractListFromResponse(attendanceResp);
        } catch (aerr) {
          console.warn(
            "No attendance records found (or attendance endpoint unavailable):",
            aerr
          );
          attendanceRecords = [];
        }

        const presentIdsFromServer = new Set(
          attendanceRecords
            .filter((rec) => rec?.status === "present")
            .map((rec) => {
              if (rec?.student?.id) return rec.student.id;
              if (rec?.student_id) return rec.student_id;
              return rec?.student ?? null;
            })
            .filter(Boolean)
        );

        if (mounted) {
          setStudents(studentsList);
          setPresentSet(new Set(presentIdsFromServer));
        }
      } catch (err) {
        console.error("Error loading students/attendance:", err);
        if (mounted) {
          setMessage("Failed to load students or attendance");
          setMessageType("danger");
        }
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedBatch, date]);

  function togglePresent(studentId) {
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function submitAttendance() {
    if (!selectedBatch) {
      setMessage("Please select a batch.");
      setMessageType("warning");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        batch_id: selectedBatch,
        date,
        present_student_ids: Array.from(presentSet),
      };
      const res = await API.post("/students/attendance/bulk/", payload);
      console.log("Attendance save response:", res.data);
      setMessage("Attendance saved successfully.");
      setMessageType("success");

      // Refresh attendance for this batch/date
      try {
        const attendanceResp = await API.get("students/attendance/", {
          params: { batch_id: selectedBatch, date },
        });
        const attendanceRecords = extractListFromResponse(attendanceResp);
        const presentIdsFromServer = new Set(
          attendanceRecords
            .filter((r) => r?.status === "present")
            .map((r) => r?.student?.id ?? r?.student_id ?? r?.student)
            .filter(Boolean)
        );
        setPresentSet(new Set(presentIdsFromServer));
      } catch (e) {
        console.warn("Failed to refresh attendance after save:", e);
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      setMessage(
        err?.response?.data?.message ||
          err?.response?.data ||
          err.message ||
          "Failed to save"
      );
      setMessageType("danger");
    } finally {
      setSubmitting(false);
    }
  }

  const presentCount = presentSet.size;
  const totalStudents = students.length;

  return (
    <div className="container-fluid">
      <div className="mb-3">
        <h2 className="mb-0">Mark Attendance (Batch)</h2>
      </div>

      {message && (
        <div className={`alert alert-${messageType} mb-3`} role="alert">
          {message}
        </div>
      )}

      {/* Filters row - Responsive */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row g-2 g-md-3 align-items-end">
            <div className="col-12 col-sm-6 col-md-4">
              <label className="form-label">Batch</label>
              <select
                className="form-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={loadingBatches}
              >
                <option value="">Select batch</option>
                {Array.isArray(batches) &&
                  batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name || `Batch #${batch.id}`}
                    </option>
                  ))}
              </select>
              {loadingBatches && (
                <div className="form-text">Loading batches…</div>
              )}
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label d-block">Total</label>
              <div className="text-sm">
                <span className="text-muted">
                  {totalStudents}
                </span>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label d-block">Present</label>
              <div className="text-sm">
                <strong>{presentCount}</strong>
              </div>
            </div>

            <div className="col-12 col-md-1 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={submitAttendance}
                disabled={submitting || !selectedBatch}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Students list */}
      {loadingStudents && (
        <div className="alert alert-secondary">Loading students…</div>
      )}

      {!loadingStudents && selectedBatch && students.length === 0 && (
        <div className="alert alert-info">No students found for this batch.</div>
      )}

      {!loadingStudents && students.length > 0 && (
        <>
          {/* Desktop table view */}
          <div className="card shadow-sm d-none d-md-block">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" style={{ width: "8%" }}>#</th>
                      <th scope="col" style={{ width: "45%" }}>Student Name</th>
                      <th scope="col" style={{ width: "22%" }}>Roll No</th>
                      <th scope="col" style={{ width: "25%" }} className="text-center">
                        Present
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const studentId =
                        student.id ??
                        student.pk ??
                        student.student_id ??
                        student.user_id;
                      const isChecked = presentSet.has(studentId);
                      const firstName =
                        student.first_name ?? student.firstName ?? "";
                      const lastName =
                        student.last_name ?? student.lastName ?? "";
                      const fullName =
                        (firstName + " " + lastName).trim() || "Unnamed";

                      return (
                        <tr key={studentId ?? index}>
                          <td>{index + 1}</td>
                          <td className="text-truncate">{fullName}</td>
                          <td>{student.roll_no ?? student.rollNumber ?? "-"}</td>
                          <td className="text-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={!!isChecked}
                              onChange={() => togglePresent(studentId)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer text-muted small">
              Tip: click the checkbox to toggle present/absent for each student.
            </div>
          </div>

          {/* Mobile card view */}
          <div className="d-md-none">
            {students.map((student, index) => {
              const studentId =
                student.id ??
                student.pk ??
                student.student_id ??
                student.user_id;
              const isChecked = presentSet.has(studentId);
              const firstName =
                student.first_name ?? student.firstName ?? "";
              const lastName =
                student.last_name ?? student.lastName ?? "";
              const fullName =
                (firstName + " " + lastName).trim() || "Unnamed";

              return (
                <div className="card shadow-sm mb-2" key={studentId ?? index}>
                  <div className="card-body d-flex align-items-center justify-content-between p-3">
                    <div className="flex-grow-1 min-width-0">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-light text-dark">#{index + 1}</span>
                        <h6 className="card-title mb-0 text-truncate">{fullName}</h6>
                      </div>
                      <small className="text-muted d-block text-truncate">
                        Roll No: {student.roll_no ?? student.rollNumber ?? "-"}
                      </small>
                    </div>
                    <div className="ms-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!!isChecked}
                        onChange={() => togglePresent(studentId)}
                        style={{ width: "1.5rem", height: "1.5rem", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="alert alert-info mt-3">
              <small>Tap the checkbox to toggle present/absent for each student.</small>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
