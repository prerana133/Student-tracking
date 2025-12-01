import React from "react";
import SideNav from "../components/SideNav";

/**
 * Layout:
 * - uses CSS variable --sidenav-width (set by SideNav) for the left offset
 * - responsive: mobile uses offcanvas (SideNav handles showing)
 * - main content uses padding + transition so the background/main area resizes smoothly
 *
 * Make sure you have a global CSS import (see instructions below).
 */

export default function Layout({ children }) {
  return (
    <>
      <style>{`
        :root {
          /* default width - matches SideNav default expanded width */
          --sidenav-width: 250px;
          --sidenav-min-width: 72px;
        }

        /* layout container */
        .app-layout {
          min-height: 100vh;
          display: block;
          background-color: #f8f9fa;
        }

        /* main area shifts right by the current sidebar width on desktop */
        @media (min-width: 992px) {
          main.app-main {
            margin-left: var(--sidenav-width);
            transition: margin-left 0.12s ease, padding 0.12s ease;
            padding: 1.25rem;
          }

          /* ensure sidebar sits above page without affecting document flow */
          aside.app-sidenav {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 1030; /* above main but below modals */
          }
        }

        /* mobile: sidebar is offcanvas so main is full width */
        @media (max-width: 991.98px) {
          main.app-main {
            margin-left: 0;
            padding: 0.75rem;
            transition: padding 0.12s ease;
          }

          aside.app-sidenav {
            position: static;
            width: 100%;
          }
        }

        /* small niceties */
        .app-main .card { border-radius: .6rem; }
      `}</style>

      <div className="app-layout">
        {/* SideNav renders both the fixed desktop sidebar and the mobile offcanvas */}
        <aside className="app-sidenav">
          <SideNav />
        </aside>

        {/* Main content area */}
        <main className="app-main">
          {children}
        </main>
      </div>
    </>
  );
}
