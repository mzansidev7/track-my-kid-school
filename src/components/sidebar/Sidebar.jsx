import {
  FiActivity,
  FiAlertTriangle,
  FiBell,
  FiFileText,
  FiHome,
  FiMap,
  FiMapPin,
  FiMessageSquare,
  FiNavigation,
  FiSettings,
  FiTruck,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import logo from "../../assets/images/logo.png";
import "../../styles/sidebar.css";

const menuItems = [
  { title: "Dashboard", icon: <FiHome />, path: "/dashboard" },
  { title: "Students", icon: <FiUsers />, path: "/students" },
  { title: "Drivers", icon: <FiUserCheck />, path: "/drivers" },
  { title: "Vehicles", icon: <FaBus />, path: "/vehicles" },
  { title: "Routes", icon: <FiMap />, path: "/routes" },
  { title: "Trips", icon: <FiTruck />, path: "/trips" },
  { title: "Live Tracking", icon: <FiNavigation />, path: "/tracking" },
  { title: "Attendance", icon: <FiActivity />, path: "/attendance" },
  { title: "Parents", icon: <FiUsers />, path: "/parents" },
  { title: "Staff Members", icon: <FiUserPlus />, path: "/members" },
  { title: "Announcements", icon: <FiMessageSquare />, path: "/announcements" },
  {
    title: "Notifications",
    icon: <FiBell />,
    path: "/notifications",
    badge: 5,
  },
  { title: "Reports", icon: <FiFileText />, path: "/reports" },
  { title: "Incidents", icon: <FiAlertTriangle />, path: "/incidents" },
  { title: "Settings", icon: <FiSettings />, path: "/settings" },
];

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

function readCachedAdmin(session) {
  try {
    const cacheKey = `schoolProfileCache:${session.user?.id || "current"}`;
    return (
      JSON.parse(localStorage.getItem(cacheKey) || "null")?.data
        ?.admin_profile ||
      session.user?.admin_profile ||
      session.admin_profile ||
      null
    );
  } catch {
    return null;
  }
}

function readCachedSchool(session) {
  try {
    const cacheKey = `schoolProfileCache:${session.user?.id || "current"}`;
    return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data || null;
  } catch {
    return null;
  }
}

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

export default function Sidebar() {
  const session = readSession();
  const [admin, setAdmin] = useState(() => readCachedAdmin(session));
  const [school, setSchool] = useState(() => readCachedSchool(session));

  useEffect(() => {
    const auth = readSession();

    const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.timestamp && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return undefined;
      }
    } catch {
      // Fetch a fresh profile when the cache is invalid.
    }

    apiRequest("/school/profile", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((profile) => {
        setSchool(profile);
        setAdmin(profile.admin_profile || null);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: profile, timestamp: Date.now() }),
        );
      })
      .catch(() => undefined);

    return undefined;
  }, []);

  const adminName =
    [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") ||
    "School Admin";
  const schoolDataComplete = hasCompleteSchoolData(school);
  const visibleMenuItems = schoolDataComplete
    ? menuItems
    : menuItems.filter(({ path }) => path === "/settings");

  return (
    <aside className="portal-sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-brand-logo" src={logo} alt="Track My Kid" />
        <div>
          <strong>Track My Kid</strong>
          <span>School Portal</span>
        </div>
      </div>
      <nav className="portal-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">Workspace</span>
        {visibleMenuItems.map(({ title, icon, path, badge }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `portal-nav-link${isActive ? " active" : ""}`
            }
          >
            <span className="portal-nav-icon">{icon}</span>
            <span>{title}</span>
            {badge && <b className="portal-nav-badge">{badge}</b>}
          </NavLink>
        ))}
      </nav>
      {schoolDataComplete && (
        <>
          <span className="sidebar-section-label">Live Tracking</span>
          <NavLink className="sidebar-tracking-card" to="/tracking">
            <div className="tracking-art" aria-hidden="true">
              <span className="tracking-phone">
                <FiMapPin />
              </span>
              <FaBus className="tracking-bus" />
            </div>
            <strong>Live Tracking</strong>
            <span>Monitor all school vehicles in real-time</span>
          </NavLink>
        </>
      )}
      <div className="sidebar-user">
        <img src="https://i.pravatar.cc/100?img=5" alt="Admin profile" />
        <div>
          <strong>{adminName}</strong>
          <span>{admin?.job_title || admin?.role || "School Admin"}</span>
        </div>
        <b>⌄</b>
      </div>
    </aside>
  );
}
