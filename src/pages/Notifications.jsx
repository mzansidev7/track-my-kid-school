import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMap,
  FiMapPin,
  FiMail,
  FiPhone,
  FiSearch,
  FiSettings,
  FiShare2,
  FiTruck,
  FiArrowUp,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import "../styles/notifications.css";

const notifications = [
  {
    title: "Trip Started - Route 1",
    text: "The morning trip for Route 1 has started. Driver John Mokoena has departed from Stop 1.",
    time: "2 min ago",
    tag: "Trips",
    tone: "purple",
    icon: FiTruck,
    unread: true,
  },
  {
    title: "Important: Safety Reminder",
    text: "Please ensure all students wear seatbelts while travelling.",
    time: "15 min ago",
    tag: "Important",
    tone: "orange",
    icon: FiAlertCircle,
    unread: true,
  },
  {
    title: "New Student Added",
    text: "Lethabo Dlamini has been added to Grade 4B.",
    time: "1 hour ago",
    tag: "Students",
    tone: "green",
    icon: FiUser,
  },
  {
    title: "Parent-Teacher Meeting",
    text: "A meeting has been scheduled for Friday, 23 May 2026.",
    time: "2 hours ago",
    tag: "General",
    tone: "blue",
    icon: FiCalendar,
  },
  {
    title: "Vehicle Maintenance Due",
    text: "Toyota Quantum (GP 45 CD GP) is due for maintenance.",
    time: "3 hours ago",
    tag: "Vehicles",
    tone: "green",
    icon: FiTruck,
  },
  {
    title: "Route Update",
    text: "Route 3 stop times have been updated.",
    time: "Yesterday, 18:20",
    tag: "Routes",
    tone: "purple",
    icon: FiMapPin,
  },
  {
    title: "Incident Reported",
    text: "Minor incident reported on Route 2 at Stop 4.",
    time: "Yesterday, 16:45",
    tag: "Incidents",
    tone: "red",
    icon: FiAlertCircle,
  },
  {
    title: "Announcement Published",
    text: "New announcement: School will be closed on 28 June 2026.",
    time: "Yesterday, 14:10",
    tag: "Announcements",
    tone: "orange",
    icon: FiMail,
  },
];
const tabs = [
  "All",
  "Unread (5)",
  "Important",
  "Trips",
  "Students",
  "Drivers",
  "System",
  "Parents",
];

function Notifications() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const [selected, setSelected] = useState(notifications[0]);
  const filtered = useMemo(
    () =>
      notifications.filter(
        (item) =>
          `${item.title} ${item.text} ${item.tag}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (tab === "All" ||
            (tab.startsWith("Unread") ? item.unread : item.tag === tab)),
      ),
    [query, tab],
  );
  return (
    <>
      {/* <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Notifications</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search notifications..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiBell />
            <b>5</b>
          </button>
          <div className="top-profile">
            <img src="https://i.pravatar.cc/100?img=5" alt="School admin" />
            <span>
              <strong>School Admin</strong>
              <small>Administrator</small>
            </span>
            <b>⌄</b>
          </div>
        </div>
      </header> */}
      <div className="portal-content notifications-content">
        <section className="notifications-heading">
          <div>
            <p className="page-kicker">SCHOOL ALERTS</p>
            <h1>Notifications</h1>
            <p>Stay updated with all important activities and alerts.</p>
          </div>
          <div className="notifications-actions">
            <button className="mark-read">
              <FiCheckCircle /> Mark all as read
            </button>
            <button className="notification-primary">
              <FiSettings /> Notification settings
            </button>
          </div>
        </section>
        <section className="notification-metrics">
          <article>
            <span className="notification-metric purple">
              <FiBell />
            </span>
            <div>
              <small>Total notifications</small>
              <strong>128</strong>
              <em>
                <FiArrowUp /> 18 today
              </em>
            </div>
          </article>
          <article>
            <span className="notification-metric green">
              <FiCheckCircle />
            </span>
            <div>
              <small>Unread</small>
              <strong>5</strong>
              <em className="neutral">3.9% of total</em>
            </div>
          </article>
          <article>
            <span className="notification-metric orange">
              <FiAlertCircle />
            </span>
            <div>
              <small>Important</small>
              <strong>12</strong>
              <em className="neutral">9.4% of total</em>
            </div>
          </article>
          <article>
            <span className="notification-metric blue">
              <FiAlertCircle />
            </span>
            <div>
              <small>This week</small>
              <strong>42</strong>
              <em>
                <FiArrowUp /> 12 vs last week
              </em>
            </div>
          </article>
          <article>
            <span className="notification-metric red">
              <FiShare2 />
            </span>
            <div>
              <small>Alerts</small>
              <strong>7</strong>
              <em className="neutral">Require attention</em>
            </div>
          </article>
        </section>
        <section className="notifications-layout">
          <div className="notifications-panel">
            <div className="notification-tabs">
              {tabs.map((item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="notifications-search-row">
              <label>
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search notifications..."
                />
              </label>
            </div>
            <div className="notification-list">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={`notification-row ${selected.title === item.title ? "selected" : ""} ${item.unread ? "unread" : ""}`}
                    key={item.title}
                    onClick={() => setSelected(item)}
                  >
                    <i className="unread-dot" />
                    <span className={`notification-row-icon ${item.tone}`}>
                      <Icon />
                    </span>
                    <span className="notification-row-copy">
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                      <em className={item.tone}>{item.tag}</em>
                    </span>
                    <time>{item.time}</time>
                    <b>•••</b>
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="empty-notifications">
                No notifications match your search.
              </div>
            )}
            <div className="notifications-footer">
              <span>Showing 1 to {filtered.length} of 128 notifications</span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>...</button>
                <button>16</button>
                <button>›</button>
              </div>
              <label>
                Rows per page{" "}
                <select defaultValue="10">
                  <option>10</option>
                  <option>25</option>
                </select>
              </label>
            </div>
          </div>
          <aside className="notification-detail">
            <div className="notification-detail-head">
              <h2>Notification Details</h2>
              <button aria-label="Close">×</button>
            </div>
            <div className="detail-map">
              <FiTruck />
              <span />
              <i />
              <i />
              <i />
            </div>
            <div className="detail-body">
              <span className="detail-label">
                <FiTruck /> Trip Notification
              </span>
              <span className="detail-live">Live</span>
              <h3>{selected.title}</h3>
              <p>{selected.text}</p>
              <div className="detail-box">
                <p>
                  <FiMap /> Route <strong>Route 1 - Brooklyn → School</strong>
                </p>
                <p>
                  <FiUser /> Driver <strong>John Mokoena</strong>
                </p>
                <p>
                  <FiTruck /> Vehicle{" "}
                  <strong>
                    Toyota Quantum
                    <br />
                    GP 45 CD GP
                  </strong>
                </p>
                <p>
                  <FiClock /> Start Time <strong>07:00 AM</strong>
                </p>
                <p>
                  <FiMapPin /> Stopped At <strong>Stop 1 - Lynwood St</strong>
                </p>
                <p>
                  <FiUsers /> Students On Board <strong>28</strong>
                </p>
              </div>
              <small className="detail-time">
                2 minutes ago • 21 May 2026, 07:02 AM
              </small>
            </div>
            <div className="notification-quick">
              <h2>Quick Actions</h2>
              <div>
                <button>
                  <FiTruck />
                  <span>View Trip</span>
                </button>
                <button>
                  <FiPhone />
                  <span>Contact Driver</span>
                </button>
                <button>
                  <FiMap />
                  <span>View Route</span>
                </button>
                <button>
                  <FiShare2 />
                  <span>Share Update</span>
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Notifications;
