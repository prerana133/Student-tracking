// src/pages/BatchesPage.jsx
import React, { useEffect, useState } from "react";
import API from "../api";

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState("info"); // success | danger | warning | info

  function extractListFromResponse(resp) {
    const d = resp?.data ?? resp;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.results)) return d.results;
    if (d.data && Array.isArray(d.data.results)) return d.data.results;
    if (d.data && Array.isArray(d.data)) return d.data;
    if (d.results && Array.isArray(d.results)) return d.results;
    // single object fallback
    if (d.data && typeof d.data === "object") return [d.data];
    if (!Array.isArray(d) && typeof d === "object") return [d];
    return [];
  }

  async function createOrUpdate(e) {
    e.preventDefault();
    try {
      const payload = {
        name,
        description: desc,
        start_date: start,
        end_date: end || null,
      };

      if (editing) {
        await API.put(`/students/batches/${editing}/`, payload);
        setMsg("Batch updated successfully.");
        setMsgType("success");
      } else {
        await API.post("/students/batches/", payload);
        setMsg("Batch created successfully.");
        setMsgType("success");
      }

      setName("");
      setDesc("");
      setStart("");
      setEnd("");
      setEditing(null);
      await loadList();
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data || err.message || "Failed to save batch");
      setMsgType("danger");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete batch?")) return;
    try {
      await API.delete(`/students/batches/${id}/`);
      setMsg("Batch deleted.");
      setMsgType("success");
      await loadList();
    } catch (err) {
      console.error(err);
      setMsg("Failed to delete batch");
      setMsgType("danger");
    }
  }

  function edit(b) {
    setEditing(b.id);
    setName(b.name);
    setDesc(b.description || "");
    setStart(b.start_date || "");
    setEnd(b.end_date || "");
    setMsg(null);
  }

  async function loadList() {
    try {
      const res = await API.get("students/batches/");
      const list = extractListFromResponse(res);
      setBatches(list);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setMsg("Failed to load batches");
      setMsgType("danger");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadList();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditing(null);
    setName("");
    setDesc("");
    setStart("");
    setEnd("");
  }

  return (
    <div className="container-fluid">
      <div className="mb-3">
        <h2 className="mb-0">Batches</h2>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} mb-3`} role="alert">
          {typeof msg === "string" ? msg : JSON.stringify(msg)}
        </div>
      )}

      {/* Form card */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            {editing ? "Edit Batch" : "Create New Batch"}
          </h5>

          <form onSubmit={createOrUpdate}>
            <div className="row g-2 g-md-3">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  placeholder="Batch name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Description</label>
                <input
                  className="form-control"
                  placeholder="Description (optional)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
                <div className="form-text">Leave empty if ongoing</div>
              </div>

              <div className="col-12 col-md-2 d-flex align-items-end">
                <button type="submit" className="btn btn-primary w-100">
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </div>

            {editing && (
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={resetForm}
                >
                  Cancel edit
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* List card */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <h5 className="card-title px-3 pt-3 mb-0">All Batches</h5>

          {/* Desktop table view */}
          <div className="d-none d-md-block mt-2">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: "8%" }}>#</th>
                    <th scope="col" style={{ width: "20%" }}>Name</th>
                    <th scope="col" style={{ width: "25%" }}>Description</th>
                    <th scope="col" style={{ width: "15%" }}>Start Date</th>
                    <th scope="col" style={{ width: "15%" }}>End Date</th>
                    <th scope="col" style={{ width: "17%" }} className="text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(batches) && batches.length > 0 ? (
                    batches.map((b, index) => (
                      <tr key={b.id}>
                        <td>{index + 1}</td>
                        <td className="text-truncate">{b.name}</td>
                        <td className="text-truncate">{b.description || "-"}</td>
                        <td>{b.start_date || "-"}</td>
                        <td>{b.end_date || "Ongoing"}</td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => edit(b)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => remove(b.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        No batches found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="d-md-none p-3">
            {Array.isArray(batches) && batches.length > 0 ? (
              batches.map((b, index) => (
                <div className="card mb-2 border" key={b.id}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="card-title mb-1">{b.name}</h6>
                        {b.description && (
                          <p className="card-text text-muted mb-2" style={{ fontSize: "0.875rem" }}>
                            {b.description}
                          </p>
                        )}
                      </div>
                      <span className="badge bg-light text-dark text-nowrap">#{index + 1}</span>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <small className="text-muted">Start Date</small>
                        <div className="text-sm">{b.start_date || "-"}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">End Date</small>
                        <div className="text-sm">{b.end_date || "Ongoing"}</div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary flex-grow-1"
                        onClick={() => edit(b)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger flex-grow-1"
                        onClick={() => remove(b.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted py-3">
                No batches found.
              </div>
            )}
          </div>
        </div>
        <div className="card-footer text-muted small">
          Manage your training batches here (create, edit, delete).
        </div>
      </div>
    </div>
  );
}
