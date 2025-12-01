// src/pages/InviteUser.jsx
import React, { useEffect, useState } from "react";
import API from "../api"; // axios wrapper

export default function InviteUser() {
  const [form, setForm] = useState({
    email: "",
    role: "student",
    batch: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchError, setBatchError] = useState("");

  // Invited users list
  const [invitations, setInvitations] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState("");

  // ---- helpers ----
  function extractListFromResponse(resp) {
    const d = resp?.data ?? resp;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.results)) return d.results;
    if (Array.isArray(d?.data?.results)) return d.data.results;
    if (Array.isArray(d.data)) return d.data;
    if (!Array.isArray(d) && typeof d === "object") return [d];
    return [];
  }

  function extractInviteList(resp) {
    const d = resp?.data ?? resp;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.results)) return d.results;
    if (Array.isArray(d?.data?.results)) return d.data.results;
    const found = Object.values(d).find((v) => Array.isArray(v));
    return Array.isArray(found) ? found : [];
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      // When changing role, optionally clear/auto-set batch
      if (name === "role") {
        if (value !== "student") {
          // non-student → batch optional & cleared
          return {
            ...prev,
            role: value,
            batch: "",
          };
        }
        // switching to student → auto-pick first batch if available
        if (value === "student" && batches.length > 0 && !prev.batch) {
          return {
            ...prev,
            role: value,
            batch: String(batches[0].id),
          };
        }
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  // ---- load batches for dropdown ----
  async function loadBatches() {
    try {
      setLoadingBatches(true);
      setBatchError("");
      const response = await API.get("students/batches/");
      const list = extractListFromResponse(response);
      setBatches(list || []);
    } catch (err) {
      console.error("Failed to load batches", err);
      setBatchError("Failed to load batches");
    } finally {
      setLoadingBatches(false);
    }
  }

  // ---- load invitations list ----
  async function loadInvitations() {
    try {
      setInvitesLoading(true);
      setInvitesError("");
      const resp = await API.get("users/invite-user/");
      const list = extractInviteList(resp);
      setInvitations(list || []);
    } catch (err) {
      console.error("Failed to fetch invitations", err);
      setInvitesError("Failed to load invitations");
    } finally {
      setInvitesLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
    loadInvitations();
  }, []);

  // If role is student and batches arrive later, auto-select first batch (once)
  useEffect(() => {
    if (
      form.role === "student" &&
      batches.length > 0 &&
      !form.batch // nothing selected yet
    ) {
      setForm((prev) => ({
        ...prev,
        batch: String(batches[0].id),
      }));
    }
  }, [batches, form.role, form.batch]);

const submit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  try {
    if (form.role === "student" && !form.batch) {
      setMessage("Please select a batch for the student invitation.");
      setLoading(false);
      return;
    }

    const payload = {
      email: form.email,
      role: form.role,
    };

    if (form.batch) {
      payload.batch = form.batch;
    }

    // ---- CALL API AND GET THE RESPONSE ----
    const res = await API.post("/users/invite-user/", payload);

    const invitation = res?.data?.data; // your response structure
    const invitationUrl = invitation?.invitation_url;

    setMessage("Invitation sent successfully!");

    // Reset form
    setForm({ email: "", role: "student", batch: "" });

    // Reload table
    loadInvitations();

    // ---- AUTO REDIRECT USER TO INVITATION ACCEPT PAGE ----
    if (invitationUrl) {
      setMessage(`Redirecting user to: ${invitationUrl}`);

      // redirect after 1 second
      setTimeout(() => {
        window.location.href = invitationUrl;
      }, 1200);
    }
  } catch (err) {
    const apiMsg =
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.response?.data ||
      "Failed to send";
    setMessage(typeof apiMsg === "string" ? apiMsg : JSON.stringify(apiMsg));
  } finally {
    setLoading(false);
  }
};


  const isStudentRole = form.role === "student";

  return (
    <div className="container my-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Invite User</h3>
          <small className="text-muted">
            Send invitation links to students, teachers, and admins
          </small>
        </div>
        <div className="text-end small text-muted">
          Total invitations: <strong>{invitations.length}</strong>
        </div>
      </div>

      {message && (
        <div className="alert alert-info py-2" role="alert">
          {message}
        </div>
      )}

      {batchError && (
        <div className="alert alert-warning py-2" role="alert">
          {batchError}
        </div>
      )}

      {/* Send Invitation form (Bootstrap card) */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Send Invitation</h5>
          <form onSubmit={submit}>
            <div className="row g-2 g-md-3 align-items-end">
              {/* Email */}
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="user@example.com"
                  required
                />
              </div>

              {/* Role */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Batch select */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">
                  Batch{" "}
                  {isStudentRole && (
                    <span className="text-danger" style={{ fontSize: "0.8rem" }}>
                      * required for students
                    </span>
                  )}
                </label>
                <select
                  name="batch"
                  value={form.batch}
                  onChange={handleChange}
                  className="form-select"
                  disabled={loadingBatches}
                >
                  <option value="">
                    {loadingBatches
                      ? "Loading batches..."
                      : isStudentRole
                      ? "Select batch"
                      : "Optional: select batch"}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || `Batch #${b.id}`}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  For <strong>student</strong> invites, batch is required. For
                  teachers/admins, it’s optional.
                </div>
              </div>

              {/* Submit */}
              <div className="col-12 col-md-2">
                <button
                  className="btn btn-primary w-100"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Invited Users List (embedded) */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Invited Users</h5>
          <span className="badge bg-light text-dark">
            {invitations.length} total
          </span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>

              <tbody>
                {invitesLoading && (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm me-2" />
                      Loading invitations...
                    </td>
                  </tr>
                )}

                {!invitesLoading && invitations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No invitations found. Send your first invite above.
                    </td>
                  </tr>
                )}

                {!invitesLoading &&
                  invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.email}</td>
                      <td className="text-capitalize">{inv.role || "—"}</td>
                      <td>{inv.batch_name || inv.batch || "—"}</td>
                      <td>
                        {inv.is_used ? (
                          <span className="badge bg-success">Used</span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {inv.created_at
                          ? new Date(inv.created_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer text-muted small">
          All invitations sent to users (students, teachers, admins). Invitation
          link will be sent to the email address provided.
        </div>
      </div>

      {invitesError && (
        <div className="alert alert-danger mt-3" role="alert">
          {invitesError}
        </div>
      )}
    </div>
  );
}
