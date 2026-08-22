import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowUp,
  FiCheck,
  FiClock,
  FiEdit2,
  FiMapPin,
  FiMoreHorizontal,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import "../styles/routes.css";

const routes = [
  {
    name: "Brooklyn to School",
    id: "RT-001",
    code: "Route 1",
    stops: 8,
    students: 28,
    vehicle: "GP 45 CD GP",
    driver: "John Mokoena",
    time: "06:30 AM - 08:00 AM",
    status: "Active",
    tone: "purple",
  },
  {
    name: "Arcadia to School",
    id: "RT-002",
    code: "Route 2",
    stops: 6,
    students: 24,
    vehicle: "GP 78 EF GP",
    driver: "Sarah Jacobs",
    time: "06:45 AM - 08:10 AM",
    status: "Active",
    tone: "blue",
  },
  {
    name: "Hatfield to School",
    id: "RT-003",
    code: "Route 3",
    stops: 9,
    students: 32,
    vehicle: "GP 12 AB GP",
    driver: "Thabo Nkosi",
    time: "07:00 AM - 08:20 AM",
    status: "Active",
    tone: "green",
  },
  {
    name: "Sunnyside to School",
    id: "RT-004",
    code: "Route 4",
    stops: 7,
    students: 31,
    vehicle: "GP 91 GH GP",
    driver: "Mike Williams",
    time: "07:15 AM - 08:30 AM",
    status: "Inactive",
    tone: "orange",
  },
  {
    name: "Brooklyn Afternoon",
    id: "RT-005",
    code: "Route 5",
    stops: 8,
    students: 26,
    vehicle: "GP 63 IJ GP",
    driver: "James Dlamini",
    time: "02:30 PM - 04:00 PM",
    status: "Active",
    tone: "pink",
  },
  {
    name: "Menlo Park Route",
    id: "RT-006",
    code: "Route 6",
    stops: 5,
    students: 19,
    vehicle: "Not assigned",
    driver: "Not assigned",
    time: "03:00 PM - 04:20 PM",
    status: "Draft",
    tone: "gray",
  },
];

const tabs = ["All routes", "Active", "Inactive", "Draft"];

function Routes() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All routes");
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);
  const filteredRoutes = useMemo(
    () =>
      routes.filter(
        (route) =>
          `${route.name} ${route.code} ${route.driver} ${route.vehicle}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (tab === "All routes" ||
            route.status.toLowerCase() === tab.toLowerCase()),
      ),
    [query, tab],
  );

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Routes</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search routes..." />
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
      </header>
      <div className="portal-content routes-content">
        <section className="routes-heading">
          <div>
            <p className="page-kicker">TRANSPORT NETWORK</p>
            <h1>Routes</h1>
            <p>Plan, manage, and monitor school transport routes.</p>
          </div>
          <div className="routes-actions">
            <button className="route-secondary">
              <FiNavigation /> View map
            </button>
            <button className="route-primary">
              <FiPlus /> Add route
            </button>
          </div>
        </section>
        <section className="route-metrics">
          <article>
            <span className="route-metric purple">
              <FiNavigation />
            </span>
            <div>
              <small>Total routes</small>
              <strong>14</strong>
              <em>
                <FiArrowUp /> 2 this month
              </em>
            </div>
          </article>
          <article>
            <span className="route-metric green">
              <FiCheck />
            </span>
            <div>
              <small>Active routes</small>
              <strong>11</strong>
              <em>78.6% of routes</em>
            </div>
          </article>
          <article>
            <span className="route-metric blue">
              <FiUsers />
            </span>
            <div>
              <small>Students covered</small>
              <strong>312</strong>
              <em>Across all routes</em>
            </div>
          </article>
          <article>
            <span className="route-metric orange">
              <FiClock />
            </span>
            <div>
              <small>Average duration</small>
              <strong>1h 15m</strong>
              <em>Morning routes</em>
            </div>
          </article>
        </section>
        <section className="routes-layout">
          <div className="routes-panel">
            <div className="route-tabs">
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
            <div className="routes-toolbar">
              <label className="routes-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search routes, drivers, or vehicles"
                />
              </label>
              <button>
                <FiNavigation /> Sort by
              </button>
              <button className="route-filter">Filters</button>
            </div>
            <div className="route-list">
              <div className="route-list-header">
                <span>Route</span>
                <span>Start → End</span>
                <span>Students</span>
                <span>Stops</span>
                <span>Vehicle</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {filteredRoutes.map((route) => (
                <button
                  className={`route-card ${selectedRoute.id === route.id ? "selected" : ""}`}
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                >
                  <span className={`route-card-icon ${route.tone}`}>
                    <strong>{route.code.replace("Route ", "R")}</strong>
                  </span>
                  <div className="route-card-main">
                    <strong>{route.code}</strong>
                    <small>{route.name}</small>
                  </div>
                  <div className="route-card-direction">
                    <strong>{route.name.split(" to ")[0]}</strong>
                    <small>→ ABC Primary School</small>
                  </div>
                  <span className="route-stat">
                    <FiUsers /> {route.students}
                  </span>
                  <span className="route-stat">
                    <FiMapPin /> {route.stops}
                  </span>
                  <div className="route-card-assignment">
                    <strong>{route.vehicle}</strong>
                    <small>Toyota Quantum</small>
                  </div>
                  <span
                    className={`route-status ${route.status.toLowerCase()}`}
                  >
                    <i />
                    {route.status}
                  </span>
                  <FiMoreHorizontal className="route-more" />
                </button>
              ))}
            </div>
            {filteredRoutes.length === 0 && (
              <div className="empty-routes">No routes match your search.</div>
            )}
            <div className="routes-footer">
              <span>Showing 1 to {filteredRoutes.length} of 14 routes</span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          </div>
          <aside className="route-detail">
            <div className="route-detail-head">
              <div>
                <h2>Route overview</h2>
                <small>
                  {selectedRoute.code} · {selectedRoute.id}
                </small>
              </div>
              <button aria-label="More options">•••</button>
            </div>
            <div className="route-preview">
              <div className="route-preview-line" />
              <span className="preview-stop one">
                <i />
                School
              </span>
              <span className="preview-stop two">
                <i />
                Brooklyn
              </span>
              <span className="preview-stop three">
                <i />
                Arcadia
              </span>
              <span className="preview-stop four">
                <i />
                Hatfield
              </span>
              <FaBus />
            </div>
            <div className="route-detail-body">
              <span className="route-status active">
                {selectedRoute.status}
              </span>
              <h3>{selectedRoute.name}</h3>
              <p>Morning route · Monday to Friday</p>
              <dl>
                <dt>Stops</dt>
                <dd>{selectedRoute.stops}</dd>
                <dt>Students</dt>
                <dd>{selectedRoute.students}</dd>
                <dt>Duration</dt>
                <dd>1h 30m</dd>
                <dt>Distance</dt>
                <dd>12.4 km</dd>
              </dl>
              <div className="assigned-route">
                <h4>Assigned vehicle</h4>
                <p>
                  <FaBus /> <strong>{selectedRoute.vehicle}</strong>
                </p>
                <small>Toyota Quantum · 16 seats</small>
                <h4>Assigned driver</h4>
                <p>
                  <span className="driver-avatar">JM</span>
                  <strong>{selectedRoute.driver}</strong>
                </p>
                <small>Driver rating · ★ 4.8</small>
              </div>
              <button className="edit-route">
                <FiEdit2 /> Edit route
              </button>
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Routes;
