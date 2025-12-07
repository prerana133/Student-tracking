import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import StudentForm from "../components/StudentForm";
import { useAuth } from "../hooks/useAuth";

export default function StudentEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const isTeacherOrAdmin = user && (user.role === "teacher" || user.role === "admin");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // student fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  // profile fields used by StudentForm
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [course, setCourse] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // load batches
        const b = await API.get("students/batches/");
        const list = b?.data?.data || b?.data || b;
        setBatches(Array.isArray(list) ? list : (Array.isArray(list?.results) ? list.results : []));

        // load student profile
        const res = await API.get(`students/profile/${id}/`);
        const payload = res?.data?.data ?? res?.data ?? res;

        setFirstName(payload.first_name || payload.firstName || "");
        setLastName(payload.last_name || payload.lastName || "");
        setEmail(payload.email || "");
        setUsername(payload.username || payload.user?.username || "");

        setSelectedBatch(payload.batch || payload.batch_id || (payload.batch?.id ?? ""));
        setRollNo(payload.roll_no || "");
        setCourse(payload.course || "");
        setPhone(payload.phone || "");
        setFatherName(payload.father_name || payload.fatherName || "");
        setDateOfBirth(payload.date_of_birth ? payload.date_of_birth.split("T")[0] : (payload.dateOfBirth || ""));
        setJoiningDate(payload.joining_date ? payload.joining_date.split("T")[0] : (payload.joiningDate || ""));
      } catch (err) {
        console.error("Failed to load student", err);
        setError("Failed to load student profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    if (!isTeacherOrAdmin) {
      setError("Unauthorized");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        roll_no: rollNo,
        batch: selectedBatch || null,
        course,
        phone,
        father_name: fatherName,
        date_of_birth: dateOfBirth || null,
        joining_date: joiningDate || null,
      };

      // backend expects PUT to update profile
      const res = await API.put(`students/profile/${id}/`, payload);
      alert("Student profile updated");
      nav("/student-list");
    } catch (err) {
      console.error("Failed to save student", err);
      const msg = err?.response?.data?.message || err?.response?.data || err.message || "Failed to save";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container my-4">Loading student profile…</div>;

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Edit Student</h3>
          <small className="text-muted">Update student profile (Admin/Teacher)</small>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">First name</label>
                <input className="form-control" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Last name</label>
                <input className="form-control" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
              </div>
              <div className="col-md-6">
                <label className="form-label">Username</label>
                <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} disabled />
              </div>
            </div>

            {/* Reuse StudentForm for profile fields */}
            <StudentForm
              batches={batches}
              selectedBatch={selectedBatch}
              setSelectedBatch={setSelectedBatch}
              rollNo={rollNo}
              setRollNo={setRollNo}
              course={course}
              setCourse={setCourse}
              phone={phone}
              setPhone={setPhone}
              fatherName={fatherName}
              setFatherName={setFatherName}
              dateOfBirth={dateOfBirth}
              setDateOfBirth={setDateOfBirth}
              joiningDate={joiningDate}
              setJoiningDate={setJoiningDate}
              submitting={saving}
            />

            <div className="mt-3 text-end">
              <button className="btn btn-secondary me-2" type="button" onClick={() => nav(-1)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
