import {
  FiActivity,
  FiAlertTriangle,
  FiBell,
  FiFileText,
  FiHome,
  FiLifeBuoy,
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
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api";
import { supabaseClient } from "../../supabaseClient";
import {
  canAccessDuringExpiredTrial,
  canAccessPath,
  isSchoolTrialExpiredWithoutPaidSubscription,
} from "../../accessControl";
import logo from "../../assets/images/logo.png";
import "../../styles/sidebar.css";

const menuItems = [
  { title: "Dashboard", icon: <FiHome />, path: "/dashboard" },
  { title: "Announcements", icon: <FiMessageSquare />, path: "/announcements" },
  { title: "Attendance", icon: <FiActivity />, path: "/attendance" },
  { title: "Drivers", icon: <FiUserCheck />, path: "/drivers" },
  { title: "Incidents", icon: <FiAlertTriangle />, path: "/incidents" },
  { title: "Live Tracking", icon: <FiNavigation />, path: "/tracking" },
  { title: "Messages", icon: <FiMessageSquare />, path: "/messages" },
  { title: "Notifications", icon: <FiBell />, path: "/notifications" },
  { title: "Parents", icon: <FiUsers />, path: "/parents" },
  { title: "Reports", icon: <FiFileText />, path: "/reports" },
  { title: "Routes", icon: <FiMap />, path: "/routes" },
  { title: "Staff Members", icon: <FiUserPlus />, path: "/members" },
  { title: "Students", icon: <FiUsers />, path: "/students" },
  { title: "Support Tickets", icon: <FiLifeBuoy />, path: "/support" },
  { title: "Trips", icon: <FiTruck />, path: "/trips" },
  { title: "Vehicles", icon: <FaBus />, path: "/vehicles" },
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
    const admin =
      JSON.parse(localStorage.getItem(cacheKey) || "null")?.data
        ?.admin_profile ||
      session.user?.admin_profile ||
      session.admin_profile ||
      null;
    return admin
      ? {
          ...admin,
          email: admin.email || session.user?.email || "",
          phone: admin.phone || session.user?.phone || "",
        }
      : null;
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
  "school_email",
  "phone",
  "address",
  "province",
  "emis_number",
  "principal_name",
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

function hasCompleteAdminData(admin) {
  return Boolean(
    admin &&
    requiredAdminFields.every((field) => {
      const value = admin[field];
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
  const [billingAccessLoading, setBillingAccessLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const userId = session.user?.id;
  const notificationCacheKey = `schoolUnreadNotifications:${userId || "current"}`;
  const messageCacheKey = `schoolUnreadMessages:${userId || "current"}`;
  const [unreadNotifications, setUnreadNotifications] = useState(() => {
    try {
      return Number(localStorage.getItem(notificationCacheKey)) || 0;
    } catch {
      return 0;
    }
  });
  const [unreadMessages, setUnreadMessages] = useState(() => {
    try {
      return Number(localStorage.getItem(messageCacheKey)) || 0;
    } catch {
      return 0;
    }
  });
  const [pendingAttendance, setPendingAttendance] = useState(0);

  const refreshUnreadCounts = useCallback(async () => {
    if (!session.token || !userId) return;

    const headers = { Authorization: `Bearer ${session.token}` };
    const today = new Date();
    const attendanceDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    const [
      notificationsResult,
      conversationsResult,
      attendanceResult,
    ] = await Promise.allSettled([
      apiRequest("/school/notifications?limit=1000", { headers }),
      apiRequest("/school/conversations", { headers }),
      apiRequest(`/school/attendance?date=${attendanceDate}`, { headers }),
    ]);

    if (notificationsResult.status === "fulfilled") {
      const notifications = Array.isArray(notificationsResult.value)
        ? notificationsResult.value
        : [];
      const count = notifications.filter(
        (notification) =>
          String(notification.user_id) === String(userId) &&
          notification.is_read !== true,
      ).length;
      setUnreadNotifications(count);
      localStorage.setItem(notificationCacheKey, String(count));
      window.dispatchEvent(
        new CustomEvent("school-unread-notifications-updated", {
          detail: { count },
        }),
      );
    }

    if (conversationsResult.status === "fulfilled") {
      const conversations = Array.isArray(conversationsResult.value)
        ? conversationsResult.value
        : [];
      const count = conversations.reduce(
        (total, conversation) =>
          total + (Number(conversation.unread_count) || 0),
        0,
      );
      setUnreadMessages(count);
      localStorage.setItem(messageCacheKey, String(count));
    }

    if (attendanceResult.status === "fulfilled") {
      const { students = [], records = [], absenceReports = [] } =
        attendanceResult.value || {};
      const handledStudentIds = new Set([
        ...records.map((record) => String(record.child_id)),
        ...absenceReports.map((report) => String(report.child_id)),
      ]);
      setPendingAttendance(
        students.filter(
          (student) => !handledStudentIds.has(String(student.id)),
        ).length,
      );
    } else {
      console.error(
        "Could not load pending school attendance:",
        attendanceResult.reason,
      );
    }
  }, [messageCacheKey, notificationCacheKey, session.token, userId]);

  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      void refreshUnreadCounts();
    }, 0);
    if (!supabaseClient || !userId) return undefined;

    let refreshTimer;
    const scheduleCountRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void refreshUnreadCounts();
      }, 250);
    };
    const channel = supabaseClient
      .channel(`school-sidebar-counts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        scheduleCountRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        scheduleCountRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        scheduleCountRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        scheduleCountRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absence_reports" },
        scheduleCountRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children" },
        scheduleCountRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Sidebar unread-count realtime unavailable:", status);
        }
      });

    const handleWindowFocus = () => void refreshUnreadCounts();
    window.addEventListener("focus", handleWindowFocus);
    const refreshInterval = window.setInterval(refreshUnreadCounts, 300000);
    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearTimeout(refreshTimer);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", handleWindowFocus);
      void supabaseClient.removeChannel(channel);
    };
  }, [refreshUnreadCounts, userId]);

  useEffect(() => {
    const handleUnreadCountUpdate = (event) => {
      const count = Number(event.detail?.count);
      if (!Number.isFinite(count)) return;
      setUnreadNotifications(Math.max(0, count));
      localStorage.setItem(notificationCacheKey, String(Math.max(0, count)));
    };
    window.addEventListener(
      "school-unread-notifications-updated",
      handleUnreadCountUpdate,
    );
    return () => {
      window.removeEventListener(
        "school-unread-notifications-updated",
        handleUnreadCountUpdate,
      );
    };
  }, [notificationCacheKey]);

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const profile = event.detail;
      if (!profile) return;
      if (profile.admin_profile && !profile.id) {
        setAdmin(profile.admin_profile);
      } else {
        setSchool(profile);
        if (profile.admin_profile) setAdmin(profile.admin_profile);
      }
    };

    window.addEventListener("school-profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("school-profile-updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/school/billing", {
      headers: { Authorization: `Bearer ${session.token || ""}` },
    })
      .then((billing) => {
        if (active) {
          setTrialExpired(isSchoolTrialExpiredWithoutPaidSubscription(billing));
        }
      })
      .catch((billingError) => {
        console.error(
          "Could not check school billing navigation:",
          billingError,
        );
        if (active) setTrialExpired(false);
      })
      .finally(() => {
        if (active) setBillingAccessLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.token]);

  useEffect(() => {
    const auth = readSession();

    const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
    let active = true;

    const updateProfileCache = (schoolPatch = {}, adminPatch = {}) => {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        const current = cached?.data || {};
        const nextSchool = { ...current, ...schoolPatch };
        const nextAdmin = {
          ...(current.admin_profile || {}),
          ...(schoolPatch.admin_profile || {}),
          ...adminPatch,
        };
        if (Object.keys(nextAdmin).length) {
          nextSchool.admin_profile = nextAdmin;
        }
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: nextSchool, timestamp: Date.now() }),
        );
      } catch {
        // Continue showing the server response if local storage is unavailable.
      }
    };

    apiRequest("/school/profile", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((profile) => {
        if (!active) return;
        setSchool(profile);
        updateProfileCache(profile);
      })
      .catch(() => undefined);

    apiRequest("/school/admin/profile", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((profile) => {
        if (!active) return;
        setAdmin(profile);
        setSchool((current) =>
          current
            ? {
                ...current,
                admin_profile: { ...current.admin_profile, ...profile },
              }
            : current,
        );
        updateProfileCache({}, profile);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const adminName =
    [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") ||
    "School Admin";
  const schoolDataComplete = hasCompleteSchoolData(school);
  const adminDataComplete = hasCompleteAdminData(admin);
  const isDriver =
    (admin?.role || session.user?.admin_profile?.role) === "driver";
  const profileIncomplete = isDriver
    ? !adminDataComplete
    : !schoolDataComplete || !adminDataComplete;
  const visibleMenuItems = menuItems.filter(({ path }) => {
    if (isDriver && !["/trips", "/messages", "/notifications", "/settings"].includes(path)) {
      return false;
    }
    if (billingAccessLoading) return canAccessDuringExpiredTrial(path);
    if (trialExpired) return canAccessDuringExpiredTrial(path);
    return profileIncomplete
      ? path === "/settings"
      : canAccessPath(admin?.access_level, path);
  });

  return (
    <aside className="portal-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <img className="sidebar-brand-logo" src={logo} alt="" />
        </div>
        <div>
          <strong>Track My Kid</strong>
          <span>School Portal</span>
        </div>
      </div>
      <nav className="portal-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">Workspace</span>
        {visibleMenuItems.map(({ title, icon, path }) => {
          const badgeCount =
            path === "/messages"
              ? unreadMessages
              : path === "/notifications"
                ? unreadNotifications
                : path === "/attendance"
                  ? pendingAttendance
                : 0;

          return (
            <NavLink
              key={path}
              to={path}
              title={title}
              aria-label={title}
              className={({ isActive }) =>
                `portal-nav-link${isActive ? " active" : ""}`
              }
            >
              <span className="portal-nav-icon">{icon}</span>
              <span>{title}</span>
              {badgeCount > 0 && (
                <b
                  className="portal-nav-badge"
                  aria-label={
                    path === "/attendance"
                      ? `${badgeCount} students still need attendance marked`
                      : `${badgeCount} unread`
                  }
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </b>
              )}
            </NavLink>
          );
        })}
      </nav>
      {schoolDataComplete &&
        adminDataComplete &&
        (!trialExpired || canAccessDuringExpiredTrial("/tracking")) &&
        canAccessPath(admin?.access_level, "/tracking") && (
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
      {/* <div className="sidebar-docs">
        <DocsButton className="sidebar-docs-button" />
      </div> */}
      <div className="sidebar-user">
        {admin?.avatar ? (
          <img src={admin.avatar} alt="Admin profile" />
        ) : (
          <span className="sidebar-user-avatar" aria-hidden="true">
            {[admin?.first_name, admin?.last_name]
              .filter(Boolean)
              .map((part) => part.charAt(0).toUpperCase())
              .join("") || "SA"}
          </span>
        )}
        <div>
          <strong>{adminName}</strong>
          <span>{admin?.job_title || admin?.role || "School Admin"}</span>
        </div>
        <b>⌄</b>
      </div>
    </aside>
  );
}
