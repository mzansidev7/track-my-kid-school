import { useLocation, useNavigate } from "react-router-dom";
import { FiLogOut, FiBell } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import { clearSupabaseSession } from "../supabaseClient";

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
  "/support": "Support Tickets",
  "/reports": "Reports",
  "/incidents": "Incidents",
  "/settings": "Settings",
  "/billing": "Subscription & Billing",
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
  const navigate = useNavigate();
  const pageName = pageNames[pathname] || "Dashboard";
  const profileMenuRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const session = readSession();

  const [admin, setAdmin] = useState(() => readCachedAdmin(session));
  const [unreadNotifications, setUnreadNotifications] = useState(() => {
    try {
      return (
        Number(
          localStorage.getItem(
            `schoolUnreadNotifications:${session.user?.id || "current"}`,
          ),
        ) || 0
      );
    } catch {
      return 0;
    }
  });
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
    const handleUnreadCountUpdate = (event) => {
      const count = Number(event.detail?.count);
      if (Number.isFinite(count)) setUnreadNotifications(Math.max(0, count));
    };
    window.addEventListener(
      "school-unread-notifications-updated",
      handleUnreadCountUpdate,
    );

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("school-profile-updated", handleProfileUpdate);
      window.removeEventListener(
        "school-unread-notifications-updated",
        handleUnreadCountUpdate,
      );
    };
  }, []);

  const logout = async () => {
    let auth = {};
    try {
      auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
    } catch {
      // Clear the session even if stored auth is malformed.
    }

    localStorage.removeItem("schoolAuth");
    localStorage.removeItem(`schoolProfileCache:${auth.user?.id || "current"}`);
    sessionStorage.removeItem("schoolAuth");
    window.dispatchEvent(new Event("school-auth-changed"));
    try {
      await clearSupabaseSession();
    } catch (error) {
      console.error("Could not clear Supabase Auth session:", error);
    }
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
        <button
          className="icon-button notification-count-button"
          type="button"
          aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`}
          title={`${unreadNotifications} unread notifications`}
          onClick={() => navigate("/notifications")}
        >
          <FiBell />
          {unreadNotifications > 0 && (
            <b className="notification-count-badge">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </b>
          )}
        </button>
        <div className="top-profile profile-menu" ref={profileMenuRef}>
          <div className="portal-admin-avatar">
            {admin?.avatar ? (
              <img src={admin.avatar} alt="School admin" />
            ) : (
              <span aria-label="School admin initials">{initials || "SA"}</span>
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
