import {
  FiActivity,
  FiArrowRight,
  FiBell,
  FiCalendar,
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
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";
import { useNavigate } from "react-router-dom";

const trips = [
  ["Route 1 - Morning", "06:30 AM - 08:00 AM", "35 Students", "1h 12m"],
  ["Route 2 - Morning", "06:45 AM - 08:10 AM", "28 Students", "1h 05m"],
  ["Route 3 - Morning", "07:00 AM - 08:20 AM", "32 Students", "1h 20m"],
  ["Route 4 - Morning", "07:15 AM - 08:30 AM", "31 Students", "1h 15m"],
];



function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}) {
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
function PanelHeading({ title, action }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      <a href="#panel">
        {action} <FiArrowRight />
      </a>
    </div>
  );
}
function Announcement({
  icon,
  title,
  tag,
  text,
  time,
}) {
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
  const navigate = useNavigate();
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
      return cached?.data?.admin_profile || auth.user?.admin_profile || auth.admin_profile || null;
    } catch {
      return null;
    }
  });

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
        localStorage.setItem(cacheKey, JSON.stringify({ data: freshSchool, timestamp: Date.now() }));
        if (active) {
          setSchool(freshSchool);
          setAdmin(freshSchool.admin_profile || null);
        }
      } catch {
        // Keep stale cached school information visible when the API is unavailable.
      }
    };

    loadSchool();
    return () => { active = false; };
  }, [auth.token, cacheKey]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
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

  const logout = () => {
    localStorage.removeItem("schoolAuth");
    localStorage.removeItem(cacheKey);
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  const schoolName = school?.name || "ABC Primary School";
  const schoolAddress = school?.address || "School address not available";
  const schoolPhone = school?.phone || "Phone not available";
  const schoolEmail = school?.email || "Email not available";
  const schoolProvince = school?.province || "Province not available";
  const schoolCode = school?.emis_number || "—";
  const principalName = school?.principal_name || school?.contact_person || "Not available";
  const schoolStatus = school?.status === "active" ? "Active" : "Pending approval";

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
              <strong>{admin?.first_name || "School"} {admin?.last_name || "Admin"}</strong>
              <small>{admin?.job_title || admin?.role || "School Admin"}</small>
              </span>
              <b>⌄</b>
            </button>
            {profileOpen && (
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-heading">Signed in as <strong>{admin?.role || "School Admin"}</strong></div>
                <button type="button" className="profile-logout" onClick={logout} role="menuitem"><FiLogOut /> Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="portal-content">
        <section className="school-hero">
          <div className="school-identity">
            {school?.logo ? <img className="school-logo-image" src={school.logo} alt={`${schoolName} logo`} /> : <div className="school-logo">{schoolName.slice(0, 3).toUpperCase()}<span>◆</span></div>}
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
                  <FiUsers /> Student count unavailable
                </span>
              </div>
            </div>
          </div>
          <div className="school-actions">
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
            value="—"
            detail="Student data unavailable"
            tone="green"
          />
          <MetricCard
            icon={<FaBus />}
            label="Active Vehicles"
            value="—"
            detail="Vehicle data unavailable"
            tone="blue"
          />
          <MetricCard
            icon={<FiUserCheck />}
            label="Active Drivers"
            value="—"
            detail="Driver data unavailable"
            tone="amber"
          />
          <MetricCard
            icon={<FiNavigation />}
            label="Active Routes"
            value="—"
            detail="Route data unavailable"
            tone="purple"
          />
        </section>
        <section className="dashboard-grid">
          <article className="dashboard-panel trips-panel">
            <PanelHeading title="Today's Trips" action="View all trips" />
            <div className="trip-list">
              {trips.map(([name, time, students, duration], index) => (
                <div className="trip-row" key={name}>
                  <div className={`van-thumb van-${index + 1}`}>
                    <FaBus />
                  </div>
                  <div className="trip-name">
                    <strong>{name}</strong>
                    <small>{time}</small>
                  </div>
                  <span className="on-trip">ON TRIP</span>
                  <span>
                    <FiUsers /> {students}
                  </span>
                  <span>
                    <FiClock /> {duration}
                  </span>
                  <b>›</b>
                </div>
              ))}
            </div>
            <button className="panel-wide-link">View all trips</button>
          </article>
          <article className="dashboard-panel">
            <PanelHeading
              title="Recent Announcements"
              action="View all announcements"
            />
            <div className="announcement-list">
              <Announcement
                icon={<FiVolume2 />}
                title="School closes at 12:00 PM on Friday"
                tag="Important"
                text="School will close at 12:00 PM on Friday, 28 August."
                time="2 hours ago"
              />
              <Announcement
                icon={<FiCalendar />}
                title="Sports Day - 25 August"
                tag="Event"
                text="Annual sports day will be held on 25 August from 08:00 AM."
                time="1 day ago"
              />
              <Announcement
                icon={<FiActivity />}
                title="Parent Meeting"
                tag="Reminder"
                text="Parent meeting on 02 September at 05:30 PM."
                time="2 days ago"
              />
            </div>
          </article>
        </section>
        <section className="dashboard-grid bottom-grid">
          <article className="dashboard-panel attendance-panel">
            <PanelHeading
              title="Attendance Overview"
              action="11 - 17 Aug 2026 ▾"
            />
            <div className="attendance-stats">
              <div>
                <span>Present</span>
                <strong>89%</strong>
                <small className="up">↑ +5% from last week</small>
              </div>
              <div>
                <span>Absent</span>
                <strong>8%</strong>
                <small className="down">↓ -2% from last week</small>
              </div>
              <div>
                <span>Late</span>
                <strong>3%</strong>
                <small className="warn">↓ -1% from last week</small>
              </div>
            </div>
          </article>
          <article className="dashboard-panel school-info">
            <PanelHeading title="School Information" action="Edit" />
            <div className="info-grid">
              <div>
                <span>School Code</span>
                <strong>{schoolCode}</strong>
              </div>
              <div>
                <span>School Type</span>
                <strong>{schoolProvince}</strong>
              </div>
              <div>
                <span>Established</span>
                <strong>{school?.created_at ? new Date(school.created_at).getFullYear() : "—"}</strong>
              </div>
              <div>
                <span>Grades</span>
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
