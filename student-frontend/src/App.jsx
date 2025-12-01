// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AcceptInvitation from "./pages/AcceptInvitation";
import Dashboard from "./pages/Dashboard";
import InviteUser from "./pages/InviteUser";
import BatchesPage from "./pages/BatchesPage";
import AttendanceBulk from "./pages/AttendanceBulk";
import InvitationList from "./pages/InvitationList";
import Profile from "./pages/Profile";

import { useAuth } from "./hooks/useAuth";
import Layout from "./layout/Layout";
import AnalyticsPage from "./pages/Analytics";
import AssessmentCreate from "./pages/AssessmentCreate";
import AssessmentTake from "./pages/AssessmentTake";
import AssessmentList from "./pages/AssessmentList";
import StudentsList from "./pages/StudentsList";

function PrivateRoute({ children, allowedRoles }) {
  // useAuth should ideally expose `user` and `loading` (boolean)
  const { user, loading } = useAuth();

  // If auth is still initializing, show nothing (or a spinner).
  // We avoid redirecting during initialization to prevent immediate navigation to /login.
  if (loading === true || typeof user === "undefined") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ opacity: 0.8 }}>Checking authentication…</div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is provided, check role membership
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div style={{ padding: 20 }}>Unauthorized</div>;
  }

  return children;
}


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Accept invitation should be accessible without auth (user arrives via email link) */}
      <Route
        path="/accept-invitation"
        element={
          <Layout>
            <AcceptInvitation />
          </Layout>
        }
      />

      <Route path="/assessments-create" element={
        <PrivateRoute allowedRoles={["admin","teacher"]}><Layout><AssessmentCreate/></Layout></PrivateRoute>
      } />

      
      <Route path="/assessments/:id/take" element={
        <PrivateRoute allowedRoles={["student","teacher","admin"]}><Layout><AssessmentTake/></Layout></PrivateRoute>
      } />

      <Route
          path="/assessments"
          element={
            <PrivateRoute allowedRoles={["admin","teacher","student"]}>
              <Layout><AssessmentList /></Layout>
            </PrivateRoute>
          }
        />

      {/* Protected routes (show Layout with SideNav + NavBar) */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/student-list"
        element={
          <PrivateRoute>
            <Layout>
              <StudentsList />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/invite"
        element={
          <PrivateRoute allowedRoles={["admin", "teacher"]}>
            <Layout>
              <InviteUser />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/batches"
        element={
          <PrivateRoute allowedRoles={["admin", "teacher"]}>
            <Layout>
              <BatchesPage />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/attendance-bulk"
        element={
          <PrivateRoute allowedRoles={["admin", "teacher"]}>
            <Layout>
              <AttendanceBulk />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/invitation-list"
        element={
          <PrivateRoute allowedRoles={["admin", "teacher"]}>
            <Layout>
              <InvitationList />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <PrivateRoute allowedRoles={["admin", "teacher", "student"]}>
            <Layout>
              <AnalyticsPage />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Layout>
              <Profile />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
