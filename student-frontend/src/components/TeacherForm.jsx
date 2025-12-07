// src/components/invite/TeacherForm.jsx
import React from "react";

export default function TeacherForm({
  phone,
  setPhone,
  subject,
  setSubject,
  submitting
}) {
  return (
    <>
      <hr className="my-4" />
      <h6 className="mb-3">Teacher Profile</h6>

      <div className="row g-3">
        {/* Phone */}
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

        {/* Subject */}
        <div className="col-md-6">
          <label className="form-label">Subject (optional)</label>
          <input
            className="form-control"
            value={subject}
            onChange={(e) => setSubject && setSubject(e.target.value)}
            disabled={submitting}
          />
        </div>

      </div>
    </>
  );
}
