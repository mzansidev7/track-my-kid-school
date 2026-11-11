import {
  FiArrowRight,
  FiActivity,
  FiBell,
  FiClock,
  FiMapPin,
  FiMoreHorizontal,
  FiLogOut,
  FiSearch,
  FiUserCheck,
  FiUsers,
  FiNavigation,
  FiVolume2,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import "../styles/dashboard.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { canAccessPath } from "../accessControl";
import { clearSupabaseSession, supabaseClient } from "../supabaseClient";
import DocsButton from "../components/DocsButton";

const readCachedAnnouncements = (key) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(cached?.data) ? cached.data : [];
  } catch {
    return [];
  }
};

const announcementTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

function MetricCard({ icon, label, value, detail, tone }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <a href="#details">
        View {label.toLowerCase()} <FiArrowRight />
      </a>
    </article>
  );
}
function PanelHeading({ title, action, to }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      {to ? (
        <Link to={to}>
          {action} <FiArrowRight />
        </Link>
      ) : (
        <a href="#panel">
          {action} <FiArrowRight />
        </a>
      )}
    </div>
  );
}
function Announcement({ icon, title, tag, text, time }) {
  return (
    <div className="announcement-row">
      <div className="announcement-icon">{icon}</div>
      <div>
        <strong>
          {title} <em>{tag}</em>
        </strong>
        <p>{text}</p>
        <small>{time}</small>
      </div>
      <FiMoreHorizontal />
    </div>
  );
}

export default function Dashboard() {
  const profileMenuRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = (() => {
    try {
      return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
    } catch {
      return {};
    }
  })();
  const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
  const dashboardCacheKey = `schoolDashboardCache:${auth.user?.id || "current"}`;
  const [school, setSchool] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return cached?.data || null;
    } catch {
      return null;
    }
  });
  const [admin, setAdmin] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return (
        cached?.data?.admin_profile ||
        auth.user?.admin_profile ||
        auth.admin_profile ||
        null
      );
    } catch {
      return null;
    }
  });
  const [dashboard, setDashboard] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(dashboardCacheKey) || "null")?.data ||
        null
      );
    } catch {
      return null;
    }
  });
  const [schoolTrips, setSchoolTrips] = useState([]);
  const [schoolTripsLoading, setSchoolTripsLoading] = useState(true);
  const [attendanceDays, setAttendanceDays] = useState([]);
  const [pendingAttendance, setPendingAttendance] = useState(0);
  const announcementsCacheKey = `schoolAnnouncementsCache:${auth.user?.id || "current"}`;
  const [announcements, setAnnouncements] = useState(() =>
    readCachedAnnouncements(announcementsCacheKey),
  );

  useEffect(() => {
    let active = true;
    const cacheTtl = 5 * 60 * 1000;

    const loadSchool = async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (cached?.data && Date.now() - cached.timestamp < cacheTtl) {
          if (active) setSchool(cached.data);
          return;
        }

        const freshSchool = await apiRequest("/school/profile", {
          headers: {
            Authorization: `Bearer ${auth.token || ""}`,
          },
        });
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: freshSchool, timestamp: Date.now() }),
        );
        if (active) {
          setSchool(freshSchool);
          setAdmin(freshSchool.admin_profile || null);
        }
      } catch {
        // Keep stale cached school information visible when the API is unavailable.
      }
    };

    loadSchool();
    return () => {
      active = false;
    };
  }, [auth.token, cacheKey]);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        const freshDashboard = await apiRequest("/school/dashboard", {
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        });
        localStorage.setItem(
          dashboardCacheKey,
          JSON.stringify({ data: freshDashboard, timestamp: Date.now() }),
        );
        if (active) {
          setDashboard(freshDashboard);
          setSchool(freshDashboard.school);
        }
      } catch {
        // Keep cached dashboard data visible when the API is unavailable.
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [auth.token, dashboardCacheKey]);

  useEffect(() => {
    let active = true;
    const loadAnnouncements = async () => {
      try {
        const data = await apiRequest("/school/announcements", {
          headers: {
            Authorization: `Bearer ${auth.token || ""}`,
          },
        });
        const nextAnnouncements = Array.isArray(data) ? data : [];
        localStorage.setItem(
          announcementsCacheKey,
          JSON.stringify({ data: nextAnnouncements, timestamp: Date.now() }),
        );
        if (active) setAnnouncements(nextAnnouncements);
      } catch (requestError) {
        console.error(
          "Could not load recent school announcements:",
          requestError,
        );
      }
    };
    void loadAnnouncements();
    return () => {
      active = false;
    };
  }, [announcementsCacheKey, auth.token]);

  const schoolId = dashboard?.school?.id || school?.id;
  useEffect(() => {
    if (!supabaseClient || !schoolId) return undefined;

    let refreshTimer;
    const refreshAnnouncements = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          const data = await apiRequest("/school/announcements", {
            headers: {
              Authorization: `Bearer ${auth.token || ""}`,
            },
          });
          const nextAnnouncements = Array.isArray(data) ? data : [];
          localStorage.setItem(
            announcementsCacheKey,
            JSON.stringify({ data: nextAnnouncements, timestamp: Date.now() }),
          );
          setAnnouncements(nextAnnouncements);
        } catch (requestError) {
          console.error(
            "Could not refresh recent school announcements:",
            requestError,
          );
        }
      }, 250);
    };
    const channel = supabaseClient
      .channel(`school-dashboard-announcements:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_announcements",
          filter: `school_id=eq.${schoolId}`,
        },
        refreshAnnouncements,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Dashboard announcements realtime unavailable:", status);
        }
      });

    return () => {
      window.clearTimeout(refreshTimer);
      void supabaseClient.removeChannel(channel);
    };
  }, [announcementsCacheKey, auth.token, schoolId]);

  useEffect(() => {
    let active = true;
    const loadSchoolTrips = async () => {
      try {
        const data = await apiRequest("/school/trips", {
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        });
        if (active) setSchoolTrips(Array.isArray(data) ? data : []);
      } catch {
        // Keep trip monitoring available even if the trip endpoint is offline.
      } finally {
        if (active) setSchoolTripsLoading(false);
      }
    };
    const timeout = window.setTimeout(() => void loadSchoolTrips(), 0);
    const interval = window.setInterval(loadSchoolTrips, 30000);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [auth.token]);

  const loadAttendance = useCallback(async () => {
    if (!auth.token) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const toDate = (date) =>
      [date.getFullYear(), date.getMonth() + 1, date.getDate()]
        .map((part) => String(part).padStart(2, "0"))
        .join("-");
    try {
      const result = await apiRequest(
        `/school/attendance/overview?start_date=${toDate(start)}&end_date=${toDate(today)}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );
      setAttendanceDays(Array.isArray(result?.days) ? result.days : []);
    } catch (requestError) {
      console.error("Could not load dashboard attendance:", requestError);
    }
    try {
      const result = await apiRequest(
        `/school/attendance?date=${toDate(today)}`,
        { headers: { Authorization: `Bearer ${auth.token}` } },
      );
      const {
        students = [],
        records = [],
        absenceReports = [],
      } = result || {};
      const handledStudentIds = new Set([
        ...records.map((record) => String(record.child_id)),
        ...absenceReports.map((report) => String(report.child_id)),
      ]);
      setPendingAttendance(
        students.filter(
          (student) => !handledStudentIds.has(String(student.id)),
        ).length,
      );
    } catch (requestError) {
      console.error(
        "Could not load pending dashboard attendance:",
        requestError,
      );
    }
  }, [auth.token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAttendance(), 0);
    const interval = window.setInterval(loadAttendance, 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadAttendance]);

  useEffect(() => {
    if (!supabaseClient || !schoolId) return undefined;

    const refreshDashboard = () => {
      apiRequest("/school/dashboard", {
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      })
        .then((freshDashboard) => {
          localStorage.setItem(
            dashboardCacheKey,
            JSON.stringify({ data: freshDashboard, timestamp: Date.now() }),
          );
          setDashboard(freshDashboard);
          setSchool(freshDashboard.school);
        })
        .catch(() => undefined);
    };

    const channel = supabaseClient
      .channel(`school-dashboard:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schools",
          filter: `id=eq.${schoolId}`,
        },
        refreshDashboard,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.schools",
        },
        refreshDashboard,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "children",
          filter: `school_id=eq.${schoolId}`,
        },
        refreshDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        refreshDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        refreshDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        refreshDashboard,
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [auth.token, schoolId, dashboardCacheKey]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target))
        setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const logout = async () => {
    localStorage.removeItem("schoolAuth");
    localStorage.removeItem(cacheKey);
    sessionStorage.removeItem("schoolAuth");
    window.dispatchEvent(new Event("school-auth-changed"));
    setProfileOpen(false);
    try {
      await clearSupabaseSession();
    } catch (error) {
      console.error("Could not clear Supabase Auth session:", error);
    }
    window.location.replace("/login");
  };

  const schoolName = school?.name || "ABC Primary School";
  const schoolAddress = school?.address || "School address not available";
  const schoolPhone = school?.phone || "Phone not available";
  const schoolEmail =
    school?.school_email || school?.email || "Email not available";
  const schoolProvince = school?.province || "Province not available";
  const schoolCode = school?.emis_number || "—";
  const principalName =
    school?.principal_name || school?.contact_person || "Not available";
  const schoolStatus =
    school?.status === "approved" || school?.status === "active"
      ? "Active"
      : school?.status === "rejected"
        ? "Not approved"
        : school?.status === "needs_info"
          ? "Needs information"
          : "Pending approval";
  const students = dashboard?.students || [];
  const routes = dashboard?.routes || [];
  const activeAssignments = routes.flatMap((route) =>
    (route.assignments || []).filter((assignment) => assignment.is_active),
  );
  const activeVehicles = new Set(
    activeAssignments
      .map((assignment) => assignment.vehicle_id)
      .filter(Boolean),
  ).size;
  const activeDrivers = new Set(
    activeAssignments
      .map((assignment) => assignment.drivers)
      .filter((driver) => driver?.status === "active")
      .map((driver) => driver.id),
  ).size;
  const activeRoutes = routes.filter((route) =>
    (route.assignments || []).some((assignment) => assignment.is_active),
  ).length;
  const formatRouteTime = (value) =>
    value
      ? new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Time not scheduled";
  const trips = routes.slice(0, 4);
  const attendanceSummary = useMemo(
    () =>
      attendanceDays.reduce(
        (summary, day) => ({
          present: summary.present + (day.present || 0),
          late: summary.late + (day.late || 0),
          absent: summary.absent + (day.absent || 0),
          recorded: summary.recorded + (day.recorded || 0),
        }),
        { present: 0, late: 0, absent: 0, recorded: 0 },
      ),
    [attendanceDays],
  );
  const attendanceRate = attendanceSummary.recorded
    ? Math.round(
        ((attendanceSummary.present + attendanceSummary.late) /
          attendanceSummary.recorded) *
          100,
      )
    : null;
  const attendancePeriod = attendanceDays.length
    ? `${new Date(`${attendanceDays[0].date}T12:00:00`).toLocaleDateString([], { day: "numeric", month: "short" })} – ${new Date(`${attendanceDays[attendanceDays.length - 1].date}T12:00:00`).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`
    : "This week";

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>{schoolName}</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search schools, students, drivers..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiBell />
            <b>5</b>
          </button>
          <div className="top-profile profile-menu" ref={profileMenuRef}>
            <img src="https://i.pravatar.cc/100?img=5" alt="Tumisang M." />
            <button
              type="button"
              className="profile-trigger"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span>
                <strong>
                  {admin?.first_name || "School"} {admin?.last_name || "Admin"}
                </strong>
                <small>
                  {admin?.job_title || admin?.role || "School Admin"}
                </small>
              </span>
              <b>⌄</b>
            </button>
            {profileOpen && (
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-heading">
                  Signed in as <strong>{admin?.role || "School Admin"}</strong>
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
      <div className="portal-content">
        <section className="school-hero">
          <div className="school-identity">
            {school?.logo ? (
              <img
                className="school-logo-image"
                src={school.logo}
                alt={`${schoolName} logo`}
              />
            ) : (
              <div className="school-logo">
                {schoolName.slice(0, 3).toUpperCase()}
                <span>◆</span>
              </div>
            )}
            <div>
              <h1>
                {schoolName} <em>{schoolStatus}</em>
              </h1>
              <p>
                <FiMapPin /> {schoolAddress}
              </p>
              <div className="school-meta">
                <span>⌕ {schoolPhone}</span>
                <span>✉ {schoolEmail}</span>
                <span>
                  <FiUsers /> {students.length} students
                </span>
              </div>
            </div>
          </div>
          <div className="school-actions">
            <DocsButton />
            <button>View Public Page ↗</button>
            <button className="action-primary">
              Actions <span>⌄</span>
            </button>
          </div>
        </section>
        <section className="metrics-grid">
          <MetricCard
            icon={<FiUsers />}
            label="Total Students"
            value={students.length}
            detail="Students enrolled"
            tone="green"
          />
          <MetricCard
            icon={<FaBus />}
            label="Active Vehicles"
            value={activeVehicles}
            detail={`Vehicles assigned to active routes to ${schoolName}`}
            tone="blue"
          />
          <MetricCard
            icon={<FiUserCheck />}
            label="Active Drivers"
            value={activeDrivers}
            detail="Drivers assigned to active routes"
            tone="amber"
          />
          <MetricCard
            icon={<FiNavigation />}
            label="Active Routes"
            value={activeRoutes}
            detail="Routes with active assignments"
            tone="purple"
          />
        </section>
        <section className="dashboard-grid">
          <article className="dashboard-panel trips-panel">
            <PanelHeading
              title="Today's Trips"
              action="View all trips"
              to="/trips"
            />
            <div className="trip-list">
              {trips.map((trip, index) => (
                <div className="trip-row" key={trip.id}>
                  <div className={`van-thumb van-${index + 1}`}>
                    <FaBus />
                  </div>
                  <div className="trip-name">
                    <strong>{trip.route_name || "Unnamed route"}</strong>
                    <small>{formatRouteTime(trip.departure_time)}</small>
                  </div>
                  <span className="on-trip">
                    {trip.assignments?.some(
                      (assignment) => assignment.is_active,
                    )
                      ? "ACTIVE"
                      : "PLANNED"}
                  </span>
                  <span>
                    <FiUsers /> {trip.students || 0} students
                  </span>
                  <span>
                    <FiClock />{" "}
                    {trip.start_location || "Route locations pending"}
                  </span>
                  <b>›</b>
                </div>
              ))}
            </div>
            <Link className="panel-wide-link" to="/trips">
              View all trips
            </Link>
          </article>
          <article className="dashboard-panel">
            <PanelHeading
              title="Recent Announcements"
              action="View all announcements"
              to="/announcements"
            />
            <div className="announcement-list">
              {announcements.slice(0, 3).map((announcement) => (
                <Announcement
                  key={announcement.id}
                  icon={<FiVolume2 />}
                  title={announcement.title || "School announcement"}
                  tag={String(announcement.status || "sent").replaceAll(
                    "_",
                    " ",
                  )}
                  text={announcement.message || ""}
                  time={announcementTime(
                    announcement.sent_at ||
                      announcement.updated_at ||
                      announcement.created_at,
                  )}
                />
              ))}
              {!announcements.length && (
                <p className="school-trip-dashboard-empty">
                  No announcements yet.
                </p>
              )}
            </div>
          </article>
        </section>
        <section className="dashboard-grid school-trip-dashboard-grid">
          <article className="dashboard-panel school-trip-dashboard-panel">
            <PanelHeading
              title="School-organized trips"
              action="Manage trips"
              to="/trips"
            />
            {schoolTripsLoading ? (
              <p className="school-trip-dashboard-empty">
                Loading school trips…
              </p>
            ) : schoolTrips.length ? (
              <div className="school-trip-dashboard-list">
                {schoolTrips.slice(0, 4).map((trip) => (
                  <a
                    className="school-trip-dashboard-row"
                    href="/trips"
                    key={trip.id}
                  >
                    <span className="school-trip-dashboard-icon">
                      <FaBus />
                    </span>
                    <span className="school-trip-dashboard-copy">
                      <strong>{trip.name}</strong>
                      <small>
                        {trip.destination} ·{" "}
                        {new Date(trip.departure_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>
                      <small>
                        {trip.registered_count || 0} learners ·{" "}
                        {(trip.vehicles || []).length} school vehicle
                        {(trip.vehicles || []).length === 1 ? "" : "s"}
                      </small>
                    </span>
                    <span
                      className={`school-trip-dashboard-status status-${trip.status}`}
                    >
                      {trip.status.replaceAll("_", " ")}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="school-trip-dashboard-empty">
                <p>No school-organized trips yet.</p>
                <Link to="/trips">
                  Create your first trip <FiArrowRight />
                </Link>
              </div>
            )}
          </article>
        </section>
        <section className="dashboard-grid bottom-grid">
          <article className="dashboard-panel attendance-panel">
            <PanelHeading
              title="Attendance Overview"
              action={attendancePeriod}
            />
            {pendingAttendance > 0 &&
              canAccessPath(admin?.access_level, "/attendance") && (
                <Link
                  className="attendance-dashboard-reminder"
                  to="/attendance"
                >
                  <FiActivity aria-hidden="true" />
                  <span>
                    <strong>Attendance still needs to be marked</strong>
                    <small>
                      {pendingAttendance} student
                      {pendingAttendance === 1 ? "" : "s"} need
                      {pendingAttendance === 1 ? "s" : ""} a status today.
                    </small>
                  </span>
                  <FiArrowRight aria-hidden="true" />
                </Link>
              )}
            {students.length === 0 ? (
              <p className="school-trip-dashboard-empty">
                No students are enrolled, so attendance is not available yet.
              </p>
            ) : attendanceSummary.recorded === 0 ? (
              <p className="school-trip-dashboard-empty">
                No attendance has been recorded this week.
              </p>
            ) : (
              <div className="attendance-stats">
                <div>
                  <span>Present</span>
                  <strong>{attendanceSummary.present}</strong>
                  <small>{attendanceRate}% of recorded attendance</small>
                </div>
                <div>
                  <span>Absent</span>
                  <strong>{attendanceSummary.absent}</strong>
                  <small>Recorded this week</small>
                </div>
                <div>
                  <span>Late</span>
                  <strong>{attendanceSummary.late}</strong>
                  <small>{attendanceSummary.recorded} records this week</small>
                </div>
              </div>
            )}
          </article>
          <article className="dashboard-panel school-info">
            <PanelHeading title="School Information" action="Edit" />
            <div className="info-grid">
              <div>
                <span>School Code</span>
                <strong>{schoolCode}</strong>
              </div>
              <div>
                <span>Province</span>
                <strong>{schoolProvince}</strong>
              </div>
              <div>
                <span>Added/Approved</span>
                <strong>
                  {school?.created_at
                    ? new Date(school.created_at).getFullYear()
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{school?.status || "—"}</strong>
              </div>
              <div>
                <span>Principal</span>
                <strong>{principalName}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{schoolEmail}</strong>
              </div>
            </div>
          </article>
        </section>
      </div>
    </>
  );
}
