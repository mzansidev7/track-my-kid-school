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
import Messages from "./pages/Messages";
import PortalLayout from "./components/PortalLayout";
import { apiRequest } from "./api";
import { canAccessPath } from "./accessControl";

const requiredSchoolFields = [
  "name",
  "emis_number",
  "school_email",
  "phone",
  "principal_name",
  "address",
  "province",
  "district",
  "logo",
  "latitude",
  "longitude",
  "start_time",
  "end_time",
];

const requiredAdminFields = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "job_title",
  "role",
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

function hasCompleteAdminData(school, auth) {
  const admin =
    school?.admin_profile || auth?.user?.admin_profile || auth?.admin_profile;
  if (!admin) return false;

  return requiredAdminFields.every((field) => {
    const value =
      field === "email"
        ? admin.email || auth?.user?.email
        : field === "phone"
          ? admin.phone || auth?.user?.phone
          : admin[field];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
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
    const handleProfileUpdate = (event) => {
      const updated = event.detail;
      if (!updated) return;

      setSchool((current) => {
        if (updated.admin_profile && !updated.id) {
          return {
            ...(current || {}),
            admin_profile: {
              ...(current?.admin_profile || {}),
              ...updated.admin_profile,
            },
          };
        }

        return {
          ...(current || {}),
          ...updated,
          admin_profile: updated.admin_profile || current?.admin_profile,
        };
      });
    };

    window.addEventListener("school-profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("school-profile-updated", handleProfileUpdate);
  }, []);

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

  if (profileLoading) {
    return (
      <main
        role="status"
        aria-live="polite"
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        Loading your school profile…
      </main>
    );
  }

  const accessLevel =
    school?.admin_profile?.access_level ||
    auth?.user?.admin_profile?.access_level ||
    auth?.admin_profile?.access_level;
  if (!canAccessPath(accessLevel, location.pathname)) {
    return <Navigate to="/settings" replace />;
  }

  if (
    location.pathname !== "/settings" &&
    (!hasCompleteSchoolData(school) || !hasCompleteAdminData(school, auth))
  ) {
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
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
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
