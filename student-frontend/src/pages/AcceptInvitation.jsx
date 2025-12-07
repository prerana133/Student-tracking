// src/pages/AcceptInvitation.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import API from "../api";
import StudentForm from "../components/StudentForm";
import TeacherForm from "../components/TeacherForm";
import AdminForm from "../components/AdminForm";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const preUsername = searchParams.get("username") || "";
  const preFirst = searchParams.get("first_name") || "";
  const preLast = searchParams.get("last_name") || "";
  const role = searchParams.get("role") || "";
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
  // Teacher / Admin additional profile fields
  const [teacherSubject, setTeacherSubject] = useState("");
  const [adminDepartment, setAdminDepartment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Build payload for API
  function buildPayload() {
    const base = {
      token,
      username,
      first_name: firstName,
      last_name: lastName,
      password,
      batch: selectedBatch,
    };

    if (role === "student") {
      const payload = {
        ...base,
        // Student profile fields
        roll_no: rollNo,
        course,
        phone,
        father_name: fatherName,
        date_of_birth: dateOfBirth,
        joining_date: joiningDate,
      };

      // Clean payload: remove empty-string fields and convert empty dates/batch to null
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });

      if (payload.date_of_birth === "") payload.date_of_birth = null;
      if (payload.joining_date === "") payload.joining_date = null;
      if (payload.batch === "") payload.batch = null;

      return payload;
    }

    if (role === "teacher") {
      const payload = {
        ...base,
        // Teacher profile fields
        phone,
        subject: teacherSubject,
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      if (payload.batch === "") payload.batch = null;
      return payload;
    }

    if (role === "admin") {
      const payload = {
        ...base,
        // Admin profile fields
        phone,
        department: adminDepartment,
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      if (payload.batch === "") payload.batch = null;
      return payload;
    }

    return base;
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

              <h4 className="card-title mb-2">Accept Invitation ({role})</h4>

              <form onSubmit={onSubmit}>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {typeof error === 'string' ? error : JSON.stringify(error)}
                  </div>
                )}

                {/* Common user fields */}
                <hr className="my-4" />
                <h6 className="mb-3">Account Details</h6>
                <div className="row g-3 mb-3">
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
                      required
                      disabled={submitting}
                    />
                  </div>

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
                </div>
                {role === "student" && (
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
                    submitting={submitting}
                  />
                )}

                {role === "teacher" && (
                  <TeacherForm
                    phone={phone}
                    setPhone={setPhone}
                    subject={teacherSubject}
                    setSubject={setTeacherSubject}
                    submitting={submitting}
                  />
                )}

                {role === "admin" && (
                  <AdminForm
                    phone={phone}
                    setPhone={setPhone}
                    department={adminDepartment}
                    setDepartment={setAdminDepartment}
                    submitting={submitting}
                  />
                )}

                {/* Common Submit Button */}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : "Accept Invitation"}
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
