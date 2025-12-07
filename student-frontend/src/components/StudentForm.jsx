// src/components/invite/StudentForm.jsx
import React from "react";

export default function StudentForm({
  batches,
  selectedBatch,
  setSelectedBatch,
  rollNo,
  setRollNo,
  course,
  setCourse,
  phone,
  setPhone,
  fatherName,
  setFatherName,
  dateOfBirth,
  setDateOfBirth,
  joiningDate,
  setJoiningDate,
  submitting
}) {
  return (
    <>
      <hr className="my-4" />
      <h6 className="mb-3">Student Profile</h6>

      <div className="row g-3">
        {/* Batch */}
        <div className="col-md-6">
          <label className="form-label">Batch</label>
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

        {/* Roll No */}
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

        {/* Course */}
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

        {/* Father Name */}
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

        {/* DOB */}
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

        {/* Joining Date */}
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
    </>
  );
}
