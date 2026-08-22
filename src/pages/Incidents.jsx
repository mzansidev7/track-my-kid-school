import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowUp,
  FiCalendar,
  FiClock,
  FiEye,
  FiFileText,
  FiMapPin,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSettings,
  FiShield,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import "../styles/incidents.css";

const incidents = [
  {
    id: "INC-2026-0018",
    title: "Vehicle breakdown",
    reporter: "John Mokoena",
    role: "Driver",
    related: "GP 45 CD GP",
    location: "Lynnwood Rd, Pretoria",
    severity: "High",
    status: "Open",
    date: "21 May 2026",
    time: "08:15 AM",
    icon: FiTruck,
    tone: "red",
  },
  {
    id: "INC-2026-0017",
    title: "Student behavior",
    reporter: "Sarah Jacobs",
    role: "Driver",
    related: "Sipho Lukanyo",
    location: "Inside Vehicle, Route 2",
    severity: "Medium",
    status: "In Progress",
    date: "21 May 2026",
    time: "07:50 AM",
    icon: FiUser,
    tone: "orange",
  },
  {
    id: "INC-2026-0016",
    title: "Safety concern",
    reporter: "Thabo Nkosi",
    role: "Driver",
    related: "GP 12 AB GP",
    location: "Brooklyn, Pretoria",
    severity: "Critical",
    status: "In Progress",
    date: "20 May 2026",
    time: "04:20 PM",
    icon: FiShield,
    tone: "red",
  },
  {
    id: "INC-2026-0015",
    title: "Late arrival",
    reporter: "Parent",
    role: "Parent",
    related: "Naledi Z.",
    location: "Hatfield, Pretoria",
    severity: "Low",
    status: "Resolved",
    date: "20 May 2026",
    time: "08:05 AM",
    icon: FiClock,
    tone: "orange",
  },
  {
    id: "INC-2026-0014",
    title: "Route deviation",
    reporter: "John Mokoena",
    role: "Driver",
    related: "Route 1",
    location: "Muckleneuk, Pretoria",
    severity: "Medium",
    status: "Resolved",
    date: "19 May 2026",
    time: "02:30 PM",
    icon: FiMapPin,
    tone: "blue",
  },
  {
    id: "INC-2026-0013",
    title: "Delay due to traffic",
    reporter: "Sarah Jacobs",
    role: "Driver",
    related: "Route 2",
    location: "N1 North, Pretoria",
    severity: "Low",
    status: "Closed",
    date: "19 May 2026",
    time: "07:45 AM",
    icon: FiClock,
    tone: "orange",
  },
  {
    id: "INC-2026-0012",
    title: "Tyre puncture",
    reporter: "Thabo Nkosi",
    role: "Driver",
    related: "GP 78 XY GP",
    location: "Arcadia, Pretoria",
    severity: "High",
    status: "Resolved",
    date: "18 May 2026",
    time: "03:10 PM",
    icon: FiAlertTriangle,
    tone: "red",
  },
  {
    id: "INC-2026-0011",
    title: "Medical concern",
    reporter: "School Nurse",
    role: "Staff",
    related: "Amahle Dlamini",
    location: "Inside Vehicle, Route 3",
    severity: "High",
    status: "In Progress",
    date: "18 May 2026",
    time: "09:25 AM",
    icon: FiShield,
    tone: "purple",
  },
];

const tabs = ["All Incidents", "Open", "In Progress", "Resolved", "Closed"];

function Incidents() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All Incidents");
  const filteredIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          `${incident.id} ${incident.title} ${incident.reporter} ${incident.location}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (tab === "All Incidents" || incident.status === tab),
      ),
    [query, tab],
  );

  return (
    <>
      {/* <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Incidents</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search incidents..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiAlertCircle />
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
      <div className="portal-content incidents-content">
        <section className="incidents-heading">
          <div>
            <p className="page-kicker">SAFETY & OPERATIONS</p>
            <h1>Incidents</h1>
            <p>
              Report, track and resolve incidents quickly to keep everyone safe.
            </p>
          </div>
          <div className="incidents-actions">
            <button className="incident-date">
              <FiCalendar /> 14 May 2026 - 21 May 2026 <b>⌄</b>
            </button>
            <button className="incident-primary">
              <FiPlus /> Report incident
            </button>
          </div>
        </section>
        <section className="incident-metrics">
          <article>
            <span className="incident-metric red">
              <FiAlertTriangle />
            </span>
            <div>
              <small>Total incidents</small>
              <strong>18</strong>
              <em>
                <FiArrowUp /> 5 this week
              </em>
            </div>
          </article>
          <article>
            <span className="incident-metric orange">
              <FiClock />
            </span>
            <div>
              <small>Open</small>
              <strong>7</strong>
              <em className="neutral">38.9% of total</em>
            </div>
          </article>
          <article>
            <span className="incident-metric blue">
              <FiClock />
            </span>
            <div>
              <small>In progress</small>
              <strong>5</strong>
              <em className="neutral">27.8% of total</em>
            </div>
          </article>
          <article>
            <span className="incident-metric green">
              <FiShield />
            </span>
            <div>
              <small>Resolved</small>
              <strong>6</strong>
              <em className="neutral">33.3% of total</em>
            </div>
          </article>
          <article>
            <span className="incident-metric purple">
              <FiShield />
            </span>
            <div>
              <small>Critical</small>
              <strong>3</strong>
              <em className="neutral">16.7% of total</em>
            </div>
          </article>
        </section>
        <section className="incidents-layout">
          <div className="incidents-panel">
            <div className="incident-tabs">
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
            <div className="incidents-toolbar">
              <label className="incidents-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search incidents..."
                />
              </label>
              <button>
                <FiAlertTriangle /> Filter
              </button>
              <button>
                <FiFileText /> Export
              </button>
            </div>
            <div className="incident-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Type</th>
                    <th>Reported by</th>
                    <th>Related to</th>
                    <th>Location</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reported on</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => {
                    const Icon = incident.icon;
                    return (
                      <tr key={incident.id}>
                        <td>
                          <strong>{incident.id}</strong>
                          <small>{incident.title}</small>
                        </td>
                        <td>
                          <span
                            className={`incident-type-icon ${incident.tone}`}
                          >
                            <Icon />
                          </span>
                        </td>
                        <td>
                          <strong>{incident.reporter}</strong>
                          <small>{incident.role}</small>
                        </td>
                        <td>
                          <strong>{incident.related}</strong>
                          <small>
                            {incident.role === "Driver"
                              ? "Route 1"
                              : "Grade 6B"}
                          </small>
                        </td>
                        <td>{incident.location}</td>
                        <td>
                          <span
                            className={`severity ${incident.severity.toLowerCase()}`}
                          >
                            {incident.severity}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`incident-status ${incident.status.toLowerCase().replaceAll(" ", "-")}`}
                          >
                            {incident.status}
                          </span>
                        </td>
                        <td>
                          <strong>{incident.date}</strong>
                          <small>{incident.time}</small>
                        </td>
                        <td>
                          <button
                            className="incident-action"
                            aria-label={`View ${incident.id}`}
                          >
                            <FiEye />
                          </button>
                          <button
                            className="incident-action"
                            aria-label={`More options for ${incident.id}`}
                          >
                            <FiMoreHorizontal />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredIncidents.length === 0 && (
                <div className="empty-incidents">
                  No incidents match your search.
                </div>
              )}
            </div>
            <div className="incidents-footer">
              <span>
                Showing 1 to {filteredIncidents.length} of 18 incidents
              </span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
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
          <aside className="incidents-side">
            <div className="incident-overview">
              <h2>Incident overview</h2>
              <div className="incident-donut">
                <strong>
                  18<small>Total</small>
                </strong>
              </div>
              <div className="incident-legend">
                <p>
                  <i className="open-dot" />
                  Open <b>7 (38.9%)</b>
                </p>
                <p>
                  <i className="progress-dot" />
                  In Progress <b>5 (27.8%)</b>
                </p>
                <p>
                  <i className="resolved-dot" />
                  Resolved <b>6 (33.3%)</b>
                </p>
                <p>
                  <i className="closed-dot" />
                  Closed <b>0 (0%)</b>
                </p>
              </div>
            </div>
            <div className="incident-categories">
              <h2>Incidents by type</h2>
              {[
                [FiTruck, "Vehicle Issues", "7"],
                [FiShield, "Safety Concerns", "4"],
                [FiUser, "Behavioral", "3"],
                [FiClock, "Delays", "2"],
                [FiAlertCircle, "Other", "2"],
              ].map(([Icon, title, count]) => (
                <p key={title}>
                  <span>
                    <Icon /> {title}
                  </span>
                  <b>{count}</b>
                </p>
              ))}
            </div>
            <div className="incident-quick">
              <h2>Quick actions</h2>
              {[
                [FiPlus, "Report New Incident", "Log a new incident"],
                [FiMapPin, "View Incident Map", "See incidents on map"],
                [
                  FiFileText,
                  "Incident Report Summary",
                  "Download summary report",
                ],
                [FiSettings, "Incident Settings", "Manage incident categories"],
              ].map(([Icon, title, text]) => (
                <button key={title}>
                  <Icon />
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <b>›</b>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Incidents;
