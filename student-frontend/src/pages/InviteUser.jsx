// src/pages/InviteUser.jsx
import React, { useEffect, useState } from "react";
import API from "../api"; // axios wrapper
import { useAuth } from "../hooks/useAuth";

export default function InviteUser() {
  const [form, setForm] = useState({
    email: "",
    role: "",
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
      // When changing role, clear batch unless role is student
      if (name === "role") {
        return { ...prev, role: value, batch: value === "student" ? prev.batch : "" };
      }

      return { ...prev, [name]: value };
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

  // get current user to determine allowed invite roles
  const { user } = useAuth();

  // compute allowed roles for the role select based on current user role
  const allowedRoles = (() => {
    const r = user?.role || user?.roles || null;
    const roleStr = typeof r === "string" ? r.toLowerCase() : null;
    if (roleStr === "admin" || user?.is_superuser) return ["student", "teacher", "admin"];
    if (roleStr === "teacher") return ["student", "teacher"];
    // default fallback: allow only student invite
    return ["student"];
  })();

  // If current selected role is not allowed (e.g., user's role changed), clear it
  useEffect(() => {
    if (form.role && !allowedRoles.includes(form.role)) {
      setForm((prev) => ({ ...prev, role: "", batch: "" }));
    }
  }, [allowedRoles]);

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

    const payload = { email: form.email, role: form.role };
    if (form.role === "student" && form.batch) payload.batch = form.batch;

    // ---- CALL API AND GET THE RESPONSE ----
    const res = await API.post("/users/invite-user/", payload);

    const invitation = res?.data?.data; // your response structure
    const invitationUrl = invitation?.invitation_url;

    setMessage("Invitation sent successfully!");

    // Reset form (no prefill)
    setForm({ email: "", role: "", batch: "" });

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
                <select name="role" value={form.role} onChange={handleChange} className="form-select">
                  <option value="">Select role</option>
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch select: only show when role is student */}
              {isStudentRole && (
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label">
                    Batch <span className="text-danger" style={{ fontSize: "0.8rem" }}>* required</span>
                  </label>
                  <select
                    name="batch"
                    value={form.batch}
                    onChange={handleChange}
                    className="form-select"
                    disabled={loadingBatches}
                    required
                  >
                    <option value="">{loadingBatches ? "Loading batches..." : "Select batch"}</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || `Batch #${b.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
