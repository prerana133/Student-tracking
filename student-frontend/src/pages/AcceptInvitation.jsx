// src/pages/AcceptInvitation.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import API from "../api";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const preUsername = searchParams.get("username") || "";
  const preFirst = searchParams.get("first_name") || "";
  const preLast = searchParams.get("last_name") || "";
  const { acceptInvitation } = useAuth();
  const nav = useNavigate();

  // ---------------------- Batches ----------------------
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");

  function extractListFromResponse(resp) {
    const d = resp?.data ?? resp;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.results)) return d.results;
    if (d.data && Array.isArray(d.data)) return d.data;
    if (d.data && Array.isArray(d.data.results)) return d.data.results;
    return [];
  }

  async function loadBatches() {
    try {
      const res = await API.get("students/batches/");
      const list = extractListFromResponse(res);
      setBatches(list);
    } catch (err) {
      console.error("Error loading batches:", err);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  // ---------------------- Required user fields ----------------------
  const [username, setUsername] = useState(preUsername);
  const [firstName, setFirstName] = useState(preFirst);
  const [lastName, setLastName] = useState(preLast);
  const [password, setPassword] = useState("");

  // ---------------------- Required student fields ----------------------
  const [rollNo, setRollNo] = useState("");
  const [course, setCourse] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Build payload for API
  function buildPayload() {
    return {
      token,
      username,
      first_name: firstName,
      last_name: lastName,
      password,

      // Student profile fields (all required now)
      roll_no: rollNo,
      course,
      phone,
      father_name: fatherName,
      date_of_birth: dateOfBirth,
      joining_date: joiningDate,

      batch: selectedBatch,
    };
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!token) {
        throw new Error("Invalid or missing invitation token.");
      }

      const payload = buildPayload();
      await acceptInvitation(payload);
      nav("/login");
    } catch (err) {
      setError(err?.response?.data || err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-2">Accept Invitation</h4>
              <p className="text-muted mb-3">
                Please complete your details to create your account.
              </p>

              {!token && (
                <div className="alert alert-danger">
                  Invitation token is missing or invalid. Please check your link
                  or request a new invitation.
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  <strong>Error:</strong>
                  <pre className="mb-0 mt-1 small">
                    {typeof error === "string"
                      ? error
                      : JSON.stringify(error, null, 2)}
                  </pre>
                </div>
              )}

              <form onSubmit={onSubmit}>
                {/* --------- User Info --------- */}
                <h6 className="mb-3">Account Information</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">First Name</label>
                    <input
                      className="form-control"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Last Name</label>
                    <input
                      className="form-control"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Username</label>
                    <input
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* --------- Batch --------- */}
                <hr className="my-4" />
                <h6 className="mb-3">Batch Details</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Batch <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      required
                      disabled={submitting}
                    >
                      <option value="">Select batch</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --------- Student Profile --------- */}
                <hr className="my-4" />
                <h6 className="mb-3">Student Profile</h6>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Roll No</label>
                    <input
                      className="form-control"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Course</label>
                    <input
                      className="form-control"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Father's Name</label>
                    <input
                      className="form-control"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Joining Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* --------- Actions --------- */}
                <div className="mt-4 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => nav("/login")}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !token}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Creating account...
                      </>
                    ) : (
                      "Accept Invitation"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <p className="text-center text-muted small mt-3">
            Invitation will be verified using the token in your link.
          </p>
        </div>
      </div>
    </div>
  );
}
