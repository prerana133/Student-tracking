import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function SideNav() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const isMobile = windowWidth < 992;

  useEffect(() => {
    function onResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function applySidenavWidth(coll) {
    const expanded = "250px";
    const small = "72px";
    const w = coll ? small : expanded;
    try {
      document.documentElement.style.setProperty("--sidenav-width", w);
    } catch (e) {
      console.log("Failed to set --sidenav-width:", e);
      try {
        document.body.style.setProperty("--sidenav-width", w);
      } catch {
        console.log("Failed to set --sidenav-width on body:", e);
      }
    }
  }

  useEffect(() => {
    applySidenavWidth(collapsed);
    try {
      localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      console.warn("Failed to persist sidebar_collapsed state");
    }
  }, [collapsed]);

  useEffect(() => {
    // init
    applySidenavWidth(collapsed);
    // eslint-disable-next-line
  }, []);

  // ---- helper to close offcanvas on mobile ----
  function closeOffcanvas() {
    const el = document.getElementById("sidenavOffcanvas");
    if (!el) return;

    // If bootstrap JS is loaded globally
    const bs = window.bootstrap;
    if (bs?.Offcanvas) {
      const instance =
        bs.Offcanvas.getInstance(el) || new bs.Offcanvas(el);
      instance.hide();
    } else {
      // Fallback: just remove "show" class
      el.classList.remove("show");
      el.style.visibility = "hidden";
    }
  }

  function onLogout() {
    logout?.();
    navigate("/login");
    if (isMobile) closeOffcanvas();
  }

  const isAdminOrTeacher =
    user && (user.role === "admin" || user.role === "teacher");

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: "bi-speedometer2", visible: true },
    { to: "/student-list", label: "Students", icon: "bi-people", visible: true },
    { to: "/assessments", label: "Assessments", icon: "bi-journal-check", visible: true },
    {
      to: "/assessments-create",
      label: "Create Assessment",
      icon: "bi-journal-plus",
      visible: isAdminOrTeacher,
    },
    { to: "/batches", label: "Batches", icon: "bi-folder2-open", visible: isAdminOrTeacher },
    {
      to: "/attendance-bulk",
      label: "Attendance",
      icon: "bi-list-check",
      visible: isAdminOrTeacher,
    },
    { to: "/analytics", label: "Analytics", icon: "bi-graph-up", visible: isAdminOrTeacher },
    { to: "/invite", label: "Invite", icon: "bi-person-plus", visible: isAdminOrTeacher },
    { to: "/profile", label: "Profile", icon: "bi-person-circle", visible: true },
  ];

  // ---- Nav item renderer ----
  const renderNavItem = (it, inMobile = false) => {
    // On mobile: always show label
    const hideLabel = collapsed && !inMobile;

    return (
      <NavLink
        key={it.to}
        to={it.to}
        className={({ isActive }) =>
          `list-group-item list-group-item-action d-flex align-items-center ${
            isActive ? "active" : ""
          }`
        }
        title={hideLabel ? it.label : undefined}
        onClick={inMobile ? closeOffcanvas : undefined}
      >
        <i className={`${it.icon} fs-5`} aria-hidden="true" />
        {!hideLabel && <span className="ms-2 nav-label">{it.label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Topbar */}
      {isMobile && (
        <div className="app-topbar d-flex align-items-center justify-content-between px-2 py-2">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#sidenavOffcanvas"
              aria-controls="sidenavOffcanvas"
            >
              <i className="bi bi-list" />
            </button>
            <div className="sidenav-logo">StudentTracker</div>
          </div>
          <div className="text-end">
            <div className="fw-semibold small">{user?.username ?? "Guest"}</div>
            <div className="small text-muted">{user?.role ?? ""}</div>
          </div>
        </div>
      )}

      {/* Mobile Offcanvas */}
      <div
        className="offcanvas offcanvas-start"
        tabIndex="-1"
        id="sidenavOffcanvas"
        aria-labelledby="sidenavOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="sidenavOffcanvasLabel">
            StudentTracker
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body d-flex flex-column p-0">
          <div className="list-group list-group-flush">
            {items.filter((i) => i.visible).map((it) => renderNavItem(it, true))}
          </div>

          <div className="mt-auto p-3">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm w-100 mb-2"
              onClick={() => {
                navigate("/student-list");
                closeOffcanvas();
              }}
            >
              <i className="bi bi-plus-lg me-1" /> Add student
            </button>
            <div className="small text-muted">Signed in as</div>
            <div className="fw-semibold">{user?.username ?? "Guest"}</div>
            <button
              className="btn btn-danger w-100 mt-2"
              onClick={onLogout}
            >
              <i className="bi bi-box-arrow-right me-1" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={`d-flex flex-column bg-white border-end ${
            collapsed ? "sidenav-compact" : ""
          }`}
          style={{
            width: collapsed ? "72px" : "250px",
            minHeight: "100vh",
            transition: "width 140ms ease",
          }}
        >
          <div className="p-3 d-flex align-items-center">
            <div className="d-flex align-items-center gap-2">
              <div
                className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44, fontWeight: 700 }}
              >
                {(user?.username || "G").slice(0, 2).toUpperCase()}
              </div>
            </div>

            {!collapsed && (
              <div className="ms-2 d-flex flex-column">
                <div className="sidenav-logo">StudentTracker</div>
                <div className="small text-muted">{user?.role ?? ""}</div>
              </div>
            )}

            <div className="ms-auto">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? "Expand" : "Collapse"}
              >
                <i
                  className={`bi ${
                    collapsed ? "bi-chevron-double-right" : "bi-chevron-double-left"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex-grow-1 px-2" style={{ overflowY: "auto" }}>
            <div className="list-group list-group-flush">
              {items.filter((i) => i.visible).map((it) => renderNavItem(it, false))}
            </div>
          </div>

          <div className="p-3">
            {!collapsed && (
              <>
                <Link
                  to="/student-list"
                  className="btn btn-outline-primary btn-sm w-100 mb-2"
                >
                  <i className="bi bi-plus-lg me-1" /> Add student
                </Link>
                <div className="small text-muted">Signed in as</div>
                <div className="fw-semibold">{user?.username ?? "Guest"}</div>
              </>
            )}

            <div className="mt-2">
              <button className="btn btn-danger w-100" onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-1" />{" "}
                {!collapsed && "Logout"}
              </button>
              <div className="small text-muted mt-2 text-center">v1.0</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
