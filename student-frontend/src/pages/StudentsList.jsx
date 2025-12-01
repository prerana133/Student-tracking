// src/pages/StudentsList.jsx
import React, { useEffect, useState, useRef } from "react";
import API from "../api";

/**
 * Helper to normalize paginated + non-paginated + wrapped responses
 */
function extractListAndMeta(resp) {
  const root = resp?.data ?? resp;
  const data = root?.data ?? root;

  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return {
      results: data.results,
      count: data.count ?? data.results.length,
      next: data.next ?? null,
      previous: data.previous ?? null,
    };
  }

  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }

  if (data && typeof data === "object") {
    return { results: [data], count: 1, next: null, previous: null };
  }

  return { results: [], count: 0, next: null, previous: null };
}

/** Small utility: render initials circle if no avatar */
function InitialsAvatar({ name = "", size = 36 }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#E9ECEF",
    color: "#212529",
    fontWeight: 600,
    fontSize: Math.max(12, Math.floor(size / 2.4)),
    userSelect: "none",
  };

  return (
    <div style={style} aria-hidden="true">
      {initials || "—"}
    </div>
  );
}

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [page, setPage] = useState(1);

  const searchTimer = useRef(null);

  // ---- Load batches for filter dropdown ----
  async function loadBatches() {
    try {
      setLoadingBatches(true);
      const res = await API.get("students/batches/");
      const root = res?.data ?? res;
      const data = root?.data ?? root;

      let list = [];
      if (Array.isArray(data?.results)) list = data.results;
      else if (Array.isArray(data)) list = data;
      else if (data && typeof data === "object") list = [data];

      setBatches(list || []);
    } catch (err) {
      console.error("Failed to load batches", err);
    } finally {
      setLoadingBatches(false);
    }
  }

  // ---- Load students list ----
  async function load(url = null, opts = {}) {
    setLoading(true);
    setError("");

    try {
      // Build request url with filters & page
      const base = "/students/profile/";
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (batchId) params.append("batch_id", batchId);
      if (opts.page) params.append("page", opts.page);

      const finalUrl = url || (params.toString() ? `${base}?${params.toString()}` : base);

      const res = await API.get(finalUrl);
      const { results, count, next, previous } = extractListAndMeta(res);

      setStudents(results || []);
      setCount(count || 0);
      setNext(next);
      setPrev(previous);

      // If backend supports page number parsing, sync page state
      if (opts.page) setPage(opts.page);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Failed to load students";
      setError(msg);
      setStudents([]);
      setCount(0);
      setNext(null);
      setPrev(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    load(null, { page: 1 });
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input (400ms) + batch filter
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      // reset to first page when search or batch changes
      setPage(1);
      load(null, { page: 1 });
    }, 400);

    return () => clearTimeout(searchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, batchId]);

  // Build URL with filters & page (used for manual submit/reset)
  function buildFilteredUrl(base = "/students/profile/", pageNum = 1) {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (batchId) params.append("batch_id", batchId);
    if (pageNum && pageNum > 1) params.append("page", pageNum);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  function handleFilterSubmit(e) {
    e.preventDefault();
    setPage(1);
    load(buildFilteredUrl("/students/profile/", 1));
  }

  function handleResetFilters() {
    setSearch("");
    setBatchId("");
    setPage(1);
    setDebouncedSearch("");
    load("/students/profile/", { page: 1 });
  }

  function handlePrev() {
    if (prev) {
      load(prev);
    } else if (page > 1) {
      const p = page - 1;
      setPage(p);
      load(buildFilteredUrl("/students/profile/", p), { page: p });
    }
  }

  function handleNext() {
    if (next) {
      load(next);
    } else {
      const p = page + 1;
      setPage(p);
      load(buildFilteredUrl("/students/profile/", p), { page: p });
    }
  }

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Students</h3>
          <small className="text-muted">Manage student profiles and attendance</small>
        </div>

        <div className="text-end">
          <span className="text-muted small">
            Total: <strong>{count}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      {/* Filters – same style as Analytics filter form */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title mb-3">Filter</h5>
          <form onSubmit={handleFilterSubmit}>
            <div className="row g-3 align-items-end">
              {/* Search */}
              <div className="col-12 col-md-6">
                <label className="form-label">Search</label>
                <div className="input-group">
                  <input
                    id="studentSearch"
                    type="search"
                    className="form-control"
                    placeholder="Search name or roll no"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search students"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    aria-label="Apply search"
                    disabled={loading}
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Batch */}
              <div className="col-12 col-md-4">
                <label className="form-label">Batch</label>
                <select
                  id="batchSelect"
                  className="form-select"
                  value={batchId}
                  onChange={(e) => {
                    setBatchId(e.target.value);
                    setPage(1);
                  }}
                  disabled={loadingBatches}
                >
                  <option value="">
                    {loadingBatches ? "Loading batches..." : "All batches"}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || `Batch #${b.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="col-12 col-md-2 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-grow-1"
                  onClick={handleResetFilters}
                  disabled={loading}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    load(buildFilteredUrl("/students/profile/", page));
                  }}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Students table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Name</th>
                  <th style={{ width: 150 }}>Roll No</th>
                  <th style={{ width: 160 }}>Batch</th>
                  <th style={{ width: 160 }}>Course</th>
                  <th style={{ width: 160 }}>Username</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-4">
                      <div className="d-flex align-items-center justify-content-center">
                        <div
                          className="spinner-border me-2"
                          role="status"
                          aria-hidden="true"
                        ></div>
                        <span className="text-muted">Loading students…</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-muted">
                      <div style={{ fontSize: 18, marginBottom: 6 }}>
                        No students found
                      </div>
                      <div className="small">Try clearing filters or click Refresh.</div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  students.map((s, idx) => {
                    const firstName = s.first_name ?? s.firstName ?? "";
                    const lastName = s.last_name ?? s.lastName ?? "";
                    const fullName =
                      `${firstName} ${lastName}`.trim() || s.username || "—";

                    return (
                      <tr
                        key={s.id ?? s.user_id ?? idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          console.log("open student", s.id ?? s.user_id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            console.log("open student", s.id ?? s.user_id);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                        title={`Open ${fullName}`}
                      >
                        <td>{(page - 1) * (students.length || 1) + idx + 1}</td>

                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <InitialsAvatar name={fullName} size={36} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{fullName}</div>
                              <div className="small text-muted">
                                {s.email || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>{s.roll_no ?? "—"}</td>
                        <td>{s.batch_name ?? s.batch?.name ?? "—"}</td>
                        <td>{s.course ?? "—"}</td>
                        <td>{s.username ?? "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination footer */}
        <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
          <div className="small text-muted">
            Showing <strong>{students.length}</strong> of{" "}
            <strong>{count}</strong>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="btn-group" role="group" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={(!prev && page <= 1) || loading}
                onClick={handlePrev}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={(!next && students.length === 0) || loading}
                onClick={handleNext}
              >
                Next
              </button>
            </div>

            <div className="d-none d-md-flex align-items-center gap-2 small text-muted">
              <span>Page</span>
              <span className="px-2">{page}</span>
              <span aria-hidden="true">•</span>
              <span>Items per page</span>
              <span className="px-2">{students.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
