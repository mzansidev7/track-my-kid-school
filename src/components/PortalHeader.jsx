import { useLocation } from "react-router-dom";
// import { FiBell, FiSearch } from "react-icons/fi";
import { FiLogOut } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";

const pageNames = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/drivers": "Drivers",
  "/vehicles": "Vehicles",
  "/routes": "Routes",
  "/messages": "Messages",
  "/trips": "Trips",
  "/tracking": "Live Tracking",
  "/attendance": "Attendance",
  "/parents": "Parents",
  "/members": "Staff Members",
  "/announcements": "Announcements",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/incidents": "Incidents",
  "/settings": "Settings",
};

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

export default function PortalHeader() {
  const { pathname } = useLocation();
  const pageName = pageNames[pathname] || "Dashboard";
  // const searchName = pageName.toLowerCase();
  const profileMenuRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const session = readSession();

  const [admin, setAdmin] = useState(() => readCachedAdmin(session));
  const displayName =
    [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") ||
    session.user?.name ||
    session.user?.email?.split("@")[0] ||
    "School administrator";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const jobTitle =
    admin?.job_title === "super_admin"
      ? "Administrator"
      : admin?.job_title || "Complete your profile";
  const role = admin?.role || session.user?.role || "School administrator";

  useEffect(() => {
    const closeMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    const handleProfileUpdate = (event) => {
      const nextAdmin = event.detail?.admin_profile;
      if (nextAdmin) {
        setAdmin((current) => ({ ...(current || {}), ...nextAdmin }));
      }
    };
    window.addEventListener("school-profile-updated", handleProfileUpdate);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("school-profile-updated", handleProfileUpdate);
    };
  }, []);

  const logout = () => {
    let auth = {};
    try {
      auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
    } catch {
      // Clear the session even if stored auth is malformed.
    }

    localStorage.removeItem("schoolAuth");
    localStorage.removeItem(`schoolProfileCache:${auth.user?.id || "current"}`);
    sessionStorage.removeItem("schoolAuth");
    window.location.replace("/login");
  };

  return (
    <header className="portal-topbar portal-shared-header">
      <div className="portal-breadcrumb">
        <span>Schools</span>
        <b>›</b>
        <strong>{pageName}</strong>
      </div>
      <div className="portal-top-actions">
        {/* <label className="portal-search">
          <FiSearch />
          <input placeholder={`Search ${searchName}...`} />
        </label>
        <button className="icon-button" aria-label="Notifications">
          <FiBell />
          <b>5</b>
        </button> */}
        <div className="top-profile profile-menu" ref={profileMenuRef}>
          <div
            style={{
              border: "1px solid grey",
              borderRadius: "50%",
              padding: "5px",
            }}
          >
            {admin?.avatar ? (
              <img src={admin.avatar} alt="School admin" />
            ) : (
              <p>{initials || "SA"}</p>
            )}
          </div>
          <button
            type="button"
            className="profile-trigger"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span>
              <strong>{displayName}</strong>
              <small>{jobTitle}</small>
            </span>
            <b>⌄</b>
          </button>
          {profileOpen && (
            <div className="profile-dropdown" role="menu">
              <div className="profile-dropdown-heading">
                Signed in as <strong>Name: {displayName}</strong>
                <strong>Title: {jobTitle}</strong>
                <strong>Role: {role}</strong>
              </div>
              <button
                type="button"
                className="profile-logout"
                onClick={logout}
                role="menuitem"
              >
                <FiLogOut /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
