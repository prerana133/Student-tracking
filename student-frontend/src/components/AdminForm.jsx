// src/components/invite/AdminForm.jsx
import React from "react";

export default function AdminForm({ phone, setPhone, department, setDepartment, submitting }) {
  return (
    <>
      <hr className="my-4" />
      <h6 className="mb-3">Admin Profile (Optional Fields)</h6>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Phone (optional)</label>
          <input
            type="tel"
            className="form-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Department (optional)</label>
          <input
            className="form-control"
            value={department}
            onChange={(e) => setDepartment && setDepartment(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
    </>
  );
}
