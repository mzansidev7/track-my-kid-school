import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowUp,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import "../styles/trips.css";

const trips = [
  {
    id: "TRP-1024",
    type: "Morning",
    route: "Route 1",
    direction: "Brooklyn → School",
    vehicle: "GP 45 CD GP",
    driver: "John Mokoena",
    students: 28,
    time: "07:00 AM",
    status: "On Route",
  },
  {
    id: "TRP-1023",
    type: "Morning",
    route: "Route 3",
    direction: "Arcadia → School",
    vehicle: "GP 78 EF GP",
    driver: "Sarah Jacobs",
    students: 24,
    time: "07:05 AM",
    status: "Completed",
  },
  {
    id: "TRP-1022",
    type: "Morning",
    route: "Route 2",
    direction: "Hatfield → School",
    vehicle: "GP 12 AB GP",
    driver: "Thabo Nkosi",
    students: 32,
    time: "07:10 AM",
    status: "Late",
  },
  {
    id: "TRP-1021",
    type: "Afternoon",
    route: "Route 1",
    direction: "School → Brooklyn",
    vehicle: "GP 45 CD GP",
    driver: "John Mokoena",
    students: 28,
    time: "02:30 PM",
    status: "Scheduled",
  },
  {
    id: "TRP-1020",
    type: "Afternoon",
    route: "Route 2",
    direction: "School → Hatfield",
    vehicle: "GP 12 AB GP",
    driver: "Thabo Nkosi",
    students: 32,
    time: "02:35 PM",
    status: "Scheduled",
  },
  {
    id: "TRP-1019",
    type: "Afternoon",
    route: "Route 3",
    direction: "School → Arcadia",
    vehicle: "GP 78 EF GP",
    driver: "Sarah Jacobs",
    students: 24,
    time: "02:40 PM",
    status: "Scheduled",
  },
];

const tabs = ["All Trips", "Morning", "Afternoon", "Completed", "Upcoming"];

function Trips() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Trips");
  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const matchesQuery =
          `${trip.id} ${trip.route} ${trip.driver} ${trip.vehicle}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesTab =
          activeTab === "All Trips" ||
          trip.type === activeTab ||
          (activeTab === "Completed"
            ? trip.status === "Completed"
            : activeTab === "Upcoming"
              ? trip.status === "Scheduled"
              : true);
        return matchesQuery && matchesTab;
      }),
    [activeTab, query],
  );

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Trips</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search trips..." />
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
      <div className="portal-content trips-content">
        <section className="trips-heading">
          <div>
            <p className="page-kicker">TRANSPORT OPERATIONS</p>
            <h1>Trips</h1>
            <p>
              Manage daily transport trips and monitor progress in real-time.
            </p>
          </div>
          <div className="trips-date">
            <FiCalendar /> 21 May 2026 <b>⌄</b>
          </div>
        </section>
        <section className="trip-metrics">
          <article>
            <span className="trip-metric-icon purple">
              <FaBus />
            </span>
            <div>
              <small>Total trips</small>
              <strong>16</strong>
              <em>Today</em>
              <em className="up">
                <FiArrowUp /> 3 vs yesterday
              </em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon green">
              <FiCheckCircle />
            </span>
            <div>
              <small>Completed trips</small>
              <strong>9</strong>
              <em>56% of trips</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon blue">
              <FiMapPin />
            </span>
            <div>
              <small>On going trips</small>
              <strong>4</strong>
              <em>25% of trips</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon red">
              <FiClock />
            </span>
            <div>
              <small>Late trips</small>
              <strong>2</strong>
              <em>12% of trips</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon orange">
              <FiCalendar />
            </span>
            <div>
              <small>Upcoming trips</small>
              <strong>1</strong>
              <em>Next 24h</em>
            </div>
          </article>
        </section>
        <section className="trips-workspace">
          <div className="trips-list-panel">
            <div className="trip-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "active" : ""}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="trips-toolbar">
              <label className="trips-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search trips..."
                />
              </label>
              <button>
                <FiAlertCircle /> Filter
              </button>
              <button>
                <FiCalendar /> Date
              </button>
              <button className="trip-primary">
                <FiPlus /> Add Trip
              </button>
            </div>
            <div className="trips-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Type</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Students</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id}>
                      <td>
                        <strong>{trip.id}</strong>
                      </td>
                      <td>
                        <span className="trip-type">{trip.type}</span>
                      </td>
                      <td>
                        <strong>{trip.route}</strong>
                        <small>{trip.direction}</small>
                      </td>
                      <td>
                        <span className="trip-vehicle">
                          <FaBus />
                        </span>
                        <strong>{trip.vehicle}</strong>
                        <small>Toyota Quantum</small>
                      </td>
                      <td>
                        <strong>{trip.driver}</strong>
                        <small>★ 4.8</small>
                      </td>
                      <td>{trip.students}</td>
                      <td>
                        <strong>{trip.time}</strong>
                        <small>
                          {trip.status === "Late"
                            ? "(5 min Late)"
                            : "(On Time)"}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`trip-status ${trip.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {trip.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="trip-row-action"
                          aria-label={`More options for ${trip.id}`}
                        >
                          <FiMoreHorizontal />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTrips.length === 0 && (
                <div className="empty-trips">No trips match your search.</div>
              )}
            </div>
            <div className="trips-footer">
              <span>Showing 1 to {filteredTrips.length} of 16 trips</span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>...</button>
                <button>4</button>
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
          <aside className="trip-detail">
            <div className="trip-detail-head">
              <div>
                <strong>Trip TRP-1024</strong>
                <small>Morning Trip - 21 May 2026</small>
              </div>
              <span>On Route</span>
              <b>•••</b>
            </div>
            <div className="trip-map">
              <FiMapPin />
              <span className="map-line" />
              <strong>2</strong>
              <strong>3</strong>
              <strong>4</strong>
              <FaBus />
            </div>
            <div className="trip-detail-info">
              <h3>Route 1 - Brooklyn → School</h3>
              <dl>
                <dt>Stops</dt>
                <dd>6</dd>
                <dt>Students</dt>
                <dd>28</dd>
                <dt>Distance</dt>
                <dd>12.4 km</dd>
                <dt>ETA</dt>
                <dd>07:25 AM</dd>
                <dt>Driver</dt>
                <dd>John Mokoena</dd>
                <dt>Vehicle</dt>
                <dd>GP 45 CD GP</dd>
              </dl>
            </div>
            <div className="trip-progress">
              <h3>Trip Progress</h3>
              <p>
                <FiCheckCircle /> 07:00 - Trip Started
              </p>
              <p>
                <FiCheckCircle /> 07:10 - Picked Up Stop 1
              </p>
              <p>
                <FiCheckCircle /> 07:18 - Picked Up Stop 3
              </p>
              <p className="current">
                <FiMapPin /> 07:22 - On Route
              </p>
              <p className="pending">
                <FiClock /> 07:30 - Arrive at School
              </p>
            </div>
          </aside>
        </section>
        <footer className="trips-copyright">
          © 2026 Track My Kid. All rights reserved.
        </footer>
      </div>
    </>
  );
}

export default Trips;
