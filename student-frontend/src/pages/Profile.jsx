// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { useAuth } from "../hooks/useAuth";

import defaultAvatar from "../assets/default-avatar.png";

// Helper to get full media URL
function getFullMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  // Use VITE_API_BASE or fallback to localhost:8000
  const base = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/";
  // Remove trailing /api/ if present
  const apiRoot = base.replace(/\/api\/?$/, "/");
  // Remove leading slash from path if present
  const rel = path.startsWith("/") ? path.slice(1) : path;
  return apiRoot + rel;
}

export default function Profile() {
  const { user: authUser, setUser: setAuthUser, logout } = useAuth();

  const [profile, setProfile] = useState({
    id: null,
    email: "",
    role: "",
    first_name: "",
    last_name: "",
    phone: "",
    batch_id: null,
    batch_name: "",
    subject: "",
    department: "",
    avatar: authUser?.avatar || null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ---- Load profile from unified endpoint ----
  async function fetchProfile() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const resp = await API.get("users/my-profile/");
      const data = resp.data?.data ?? resp.data;


      const normalized = {
        id: data.id ?? null,
        email: data.email ?? "",
        role: data.role ?? authUser?.role ?? "",
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        phone: data.phone ?? "",
        batch_id: data.batch_id ?? null,
        batch_name: data.batch_name ?? "",
        subject: data.subject ?? "",
        department: data.department ?? "",
        avatar: getFullMediaUrl(data.avatar) || null,
      };

      setProfile(normalized);
      if (authUser) {
        setAuthUser?.({ ...authUser, ...normalized });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Handlers ----
  function handleChange(e) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
      };

      const resp = await API.patch("/users/my-profile/", payload);
      const saved = resp.data?.data ?? resp.data;

      setMessage("Profile saved successfully.");
      if (saved) {
        setProfile((prev) => ({ ...prev, ...saved }));
        setAuthUser?.({ ...authUser, ...saved });
      }
    } catch (err) {
      console.error("Save profile error:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data ||
        err.message ||
        "Failed to save profile";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setMessage("");
    setError("");

    try {
      const fd = new FormData();
      fd.append("avatar", file);

      // Adjust to your actual avatar endpoint
      const resp = await API.post("/users/me/avatar/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = resp.data?.data ?? resp.data;
      const newAvatar = getFullMediaUrl(data?.avatar || data?.avatar_url || data?.profile_picture || null);

      setProfile((prev) => ({ ...prev, avatar: newAvatar }));
      setAuthUser?.({ ...authUser, avatar: newAvatar });
      setMessage("Avatar updated successfully.");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError("Failed to upload avatar.");
    } finally {
      setAvatarUploading(false);
      e.target.value = ""; // allow same file re-upload
    }
  }

  const avatarSrc = profile.avatar || authUser?.avatar || defaultAvatar;
  const isStudent = profile.role === "student";
  const isTeacher = profile.role === "teacher";
  const isAdmin = profile.role === "admin";

  // ---- Render ----
  if (loading) {
    return (
      <div className="container-fluid">
        <h3>My Profile</h3>
        <div className="alert alert-secondary d-flex align-items-center mt-3">
          <div className="spinner-border spinner-border-sm me-2" />
          Loading profile…
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-sm-items-center mb-3 gap-2">
        <h3 className="mb-0">My Profile</h3>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => logout?.()}
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      <div className="row g-2 g-md-3">
        {/* Left: avatar + basic info */}
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="mb-3">
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="rounded-circle"
                  style={{ width: 100, height: 100, objectFit: "cover" }}
                />
              </div>

              <h5 className="card-title mb-1 text-truncate">
                {profile.first_name || profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.email}
              </h5>
              <p className="text-muted mb-1 text-truncate" style={{ fontSize: "0.9rem" }}>
                {profile.email}
              </p>

              <span className="badge bg-primary mb-3 text-capitalize">
                {profile.role || "user"}
              </span>

              <div className="mb-3">
                <label className="form-label d-block">Change avatar</label>
                <input
                  type="file"
                  className="form-control form-control-sm"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
                {avatarUploading && (
                  <div className="form-text">Uploading avatar…</div>
                )}
              </div>

              {/* Role-specific quick info */}
              {isStudent && profile.batch_name && (
                <div className="mt-2">
                  <h6 className="mb-0 text-truncate">Batch</h6>
                  <p className="text-muted mb-0 text-truncate" style={{ fontSize: "0.9rem" }}>
                    {profile.batch_name}
                  </p>
                </div>
              )}

              {isTeacher && profile.subject && (
                <div className="mt-2">
                  <h6 className="mb-0 text-truncate">Subject</h6>
                  <p className="text-muted mb-0 text-truncate" style={{ fontSize: "0.9rem" }}>
                    {profile.subject}
                  </p>
                </div>
              )}

              {isAdmin && profile.department && (
                <div className="mt-2">
                  <h6 className="mb-0 text-truncate">Department</h6>
                  <p className="text-muted mb-0 text-truncate" style={{ fontSize: "0.9rem" }}>
                    {profile.department}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: editable form */}
        <div className="col-12 col-md-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Edit Details</h5>

              <form onSubmit={handleSave}>
                <div className="row g-2 g-md-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">First name</label>
                    <input
                      type="text"
                      name="first_name"
                      className="form-control"
                      value={profile.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Last name</label>
                    <input
                      type="text"
                      name="last_name"
                      className="form-control"
                      value={profile.last_name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={profile.email}
                      disabled
                    />
                    <div className="form-text">
                      Email changes are managed by the admin.
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-control"
                      value={profile.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label">Role</label>
                    <input
                      type="text"
                      className="form-control text-capitalize"
                      value={profile.role}
                      disabled
                    />
                  </div>

                  {isStudent && (
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Batch</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profile.batch_name || "-"}
                        disabled
                      />
                    </div>
                  )}

                  {isTeacher && (
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Subject</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profile.subject || "-"}
                        disabled
                      />
                    </div>
                  )}

                  {isAdmin && (
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Department</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profile.department || "-"}
                        disabled
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 d-flex flex-column flex-sm-row justify-content-end gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <p className="text-muted small mt-2">
            To change role or batch assignment, please contact your
            administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
