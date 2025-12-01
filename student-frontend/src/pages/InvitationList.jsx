// src/pages/InvitationList.jsx
import React, { useEffect, useState } from "react";
import API from "../api";

export default function InvitationList() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function extractList(resp) {
    const d = resp?.data ?? resp;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.results)) return d.results;
    if (Array.isArray(d?.data?.results)) return d.data.results;
    const found = Object.values(d).find((v) => Array.isArray(v));
    return Array.isArray(found) ? found : [];
  }

  useEffect(() => {
    let mounted = true;

    API.get("users/invite-user/")
      .then((resp) => {
        const list = extractList(resp);
        if (mounted) setInvitations(list);
      })
      .catch((err) => {
        console.error("Failed to fetch invitations", err);
        if (mounted) setError("Failed to load invitations");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Invited Users</h3>
          <small className="text-muted">
            Overview of all invitations sent from the system
          </small>
        </div>
        <div className="text-end small text-muted">
          Total invitations: <strong>{invitations.length}</strong>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="card shadow-sm">
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
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm me-2" />
                      Loading invitations...
                    </td>
                  </tr>
                )}

                {!loading && invitations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No invitations found.
                    </td>
                  </tr>
                )}

                {!loading &&
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
          All invitations sent to users (students, teachers, admins).
        </div>
      </div>
    </div>
  );
}
