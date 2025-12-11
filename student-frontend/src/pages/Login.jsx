import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Store credentials in state
  const [credentials] = useState([
    { role: "admin", username: "admin", password: "admin123" },
    { role: "teacher", username: "teacher", password: "teacher123" },
    { role: "student", username: "student_py", password: "student123" },
    { role: "student", username: "student_ja", password: "student123" },
    { role: "student", username: "student_dn", password: "student123" },
    { role: "student", username: "student_html", password: "student123" }
  ]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Auto-fill form from table and submit
  const handleQuickLogin = async (cred) => {
    setForm({ username: cred.username, password: cred.password });
    try {
      await login(cred.username, cred.password);   // direct login
      navigate("/dashboard");                      // go to dashboard
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-2 p-sm-3">
      <div className="card shadow-sm w-100" style={{ maxWidth: "900px" }}>
        <div className="card-body">
          <h3 className="card-title mb-3 text-center">Student Tracker</h3>
          <h5 className="mb-4 text-center text-muted">Sign in</h5>

          <div className="row g-4">

            {/* LEFT SIDE — CREDENTIALS TABLE */}
            <div className="col-md-6 order-2 order-md-1">
              <div className="p-3 border rounded bg-light h-100">
                <h5 className="text-center mb-3">Default Credentials</h5>

                <div className="table-responsive">
                  <table className="table table-striped table-bordered text-center">
                    <thead className="table-secondary">
                      <tr>
                        <th>Role</th>
                        <th>Username</th>
                        <th>Password</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {credentials.map((cred, idx) => (
                        <tr key={idx}>
                          <td>{cred.role}</td>
                          <td>{cred.username}</td>
                          <td>{cred.password}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleQuickLogin(cred)}
                              disabled={loading}
                            >
                              {loading ? "Logging in…" : "Login"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>


              </div>
            </div>

            {/* RIGHT SIDE — LOGIN FORM */}
            <div className="col-md-6 order-1 order-md-2">
              {error && (
                <div className="alert alert-danger text-center">{error}</div>
              )}

              <form onSubmit={submit} className="p-3 border rounded h-100">
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    name="username"
                    className="form-control"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    name="password"
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                  />
                </div>

                <div className="d-grid">
                  <button className="btn btn-primary btn-lg" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>

        <div className="card-footer text-muted text-center small">
          Need help? Contact your administrator
        </div>
      </div>
    </div>
  );
}