import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import RoutesPage from "./pages/Routes";
import Trips from "./pages/Trips";
import Attendance from "./pages/Attendance";
import Parents from "./pages/Parents";
import Announcements from "./pages/Announcements";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import LiveTracking from "./pages/LiveTracking.jsx";
import "./styles/liveTracking.css";
import Incidents from "./pages/Incidents";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Members from "./pages/Members";
import PortalLayout from "./components/PortalLayout";
import { apiRequest } from "./api";

const requiredSchoolFields = [
  "name",
  "email",
  "phone",
  "address",
  "province",
  "emis_number",
  "principal_name",
];

function hasCompleteSchoolData(school) {
  return Boolean(
    school &&
    requiredSchoolFields.every((field) => {
      const value = school[field];
      return (
        value !== null && value !== undefined && String(value).trim() !== ""
      );
    }),
  );
}

function readCachedSchool(auth) {
  try {
    const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
    return JSON.parse(localStorage.getItem(cacheKey) || "null");
  } catch {
    return null;
  }
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  let auth = null;

  try {
    auth = JSON.parse(localStorage.getItem("schoolAuth") || "null");
  } catch {
    localStorage.removeItem("schoolAuth");
  }

  const isSchoolSession = Boolean(auth?.token) && auth?.user?.role === "school";
  const [initialProfile] = useState(() => {
    const cachedProfile = readCachedSchool(auth);
    const cacheIsFresh =
      cachedProfile?.data &&
      cachedProfile?.timestamp &&
      Date.now() - cachedProfile.timestamp < 5 * 60 * 1000;
    return {
      data: cacheIsFresh ? cachedProfile.data : null,
      cachedData: cachedProfile?.data || null,
      isFresh: Boolean(cacheIsFresh),
    };
  });
  const [school, setSchool] = useState(initialProfile.data);
  const [profileLoading, setProfileLoading] = useState(!initialProfile.isFresh);

  useEffect(() => {
    if (!isSchoolSession || initialProfile.isFresh) return undefined;

    const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
    apiRequest("/school/profile", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((profile) => {
        setSchool(profile);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: profile, timestamp: Date.now() }),
        );
      })
      .catch(() => setSchool(initialProfile.cachedData))
      .finally(() => setProfileLoading(false));

    return undefined;
  }, [auth.token, auth.user?.id, initialProfile, isSchoolSession]);

  if (!isSchoolSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profileLoading) return null;

  if (location.pathname !== "/settings" && !hasCompleteSchoolData(school)) {
    return <Navigate to="/settings" replace />;
  }

  return <PortalLayout>{children}</PortalLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <Students />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <Drivers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute>
            <Vehicles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes"
        element={
          <ProtectedRoute>
            <RoutesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <Trips />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking"
        element={
          <ProtectedRoute>
            <LiveTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parents"
        element={
          <ProtectedRoute>
            <Parents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <Incidents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
