import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiDownload,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiTool,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import "../styles/vehicles.css";

const vehicles = [
  {
    name: "Toyota Quantum",
    id: "VEH001",
    registration: "GP 45 CD GP",
    model: "Toyota Quantum 2021",
    capacity: 16,
    occupied: 12,
    driver: "John Mokoena",
    route: "Route 5",
    status: "Active",
    service: "12 May 2026",
    nextService: "12 Aug 2026",
  },
  {
    name: "Toyota Quantum",
    id: "VEH002",
    registration: "GP 78 EF GP",
    model: "Toyota Quantum 2020",
    capacity: 16,
    occupied: 14,
    driver: "Sarah Jacobs",
    route: "Route 8",
    status: "Active",
    service: "08 May 2026",
    nextService: "08 Aug 2026",
  },
  {
    name: "Toyota Quantum",
    id: "VEH003",
    registration: "GP 12 AB GP",
    model: "Toyota Quantum 2022",
    capacity: 16,
    occupied: 10,
    driver: "Michael Williams",
    route: "Route 1",
    status: "Active",
    service: "15 May 2026",
    nextService: "15 Aug 2026",
  },
  {
    name: "Isuzu Bus",
    id: "VEH004",
    registration: "GP 91 GH GP",
    model: "Isuzu NQR 500 2019",
    capacity: 32,
    occupied: 25,
    driver: "Thabo Nkosi",
    route: "Route 12",
    status: "Active",
    service: "20 Apr 2026",
    nextService: "20 Jul 2026",
  },
  {
    name: "Toyota Quantum",
    id: "VEH005",
    registration: "GP 63 IJ GP",
    model: "Toyota Quantum 2021",
    capacity: 16,
    occupied: 0,
    driver: "James Dlamini",
    route: "Route 14",
    status: "Maintenance",
    service: "18 May 2026",
    nextService: "18 Jul 2026",
  },
  {
    name: "Toyota Quantum",
    id: "VEH006",
    registration: "GP 27 KL GP",
    model: "Toyota Quantum 2018",
    capacity: 16,
    occupied: 0,
    driver: "Not assigned",
    route: "Not assigned",
    status: "Out of Service",
    service: "10 Mar 2026",
    nextService: "-",
  },
];

const tabs = ["All Vehicles", "Active", "Under Maintenance", "Out of Service"];

function Vehicles() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Vehicles");
  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const matchesQuery =
          `${vehicle.name} ${vehicle.id} ${vehicle.registration} ${vehicle.driver}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesTab =
          activeTab === "All Vehicles" ||
          (activeTab === "Under Maintenance"
            ? vehicle.status === "Maintenance"
            : vehicle.status === activeTab);
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
          <strong>Vehicles</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search vehicles..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiAlertTriangle />
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

      <div className="portal-content vehicles-content">
        <section className="vehicles-heading">
          <div>
            <p className="page-kicker">FLEET MANAGEMENT</p>
            <h1>Vehicles</h1>
            <p>Manage all school transport vehicles.</p>
          </div>
          <div className="vehicles-actions">
            <button className="vehicle-secondary">
              <FiDownload /> Export
            </button>
            <button className="vehicle-primary">
              <FiPlus /> Add vehicle
            </button>
          </div>
        </section>

        <section className="vehicle-metrics">
          <article>
            <span className="vehicle-metric-icon purple">
              <FiTruck />
            </span>
            <div>
              <small>Total vehicles</small>
              <strong>14</strong>
              <em>
                <FiArrowUp /> 2 this month
              </em>
            </div>
          </article>
          <article>
            <span className="vehicle-metric-icon green">
              <FaBus />
            </span>
            <div>
              <small>Active vehicles</small>
              <strong>12</strong>
              <em className="neutral">85.7%</em>
            </div>
          </article>
          <article>
            <span className="vehicle-metric-icon orange">
              <FiTool />
            </span>
            <div>
              <small>Under maintenance</small>
              <strong>1</strong>
              <em className="neutral">7.1%</em>
            </div>
          </article>
          <article>
            <span className="vehicle-metric-icon red">
              <FiAlertTriangle />
            </span>
            <div>
              <small>Out of service</small>
              <strong>1</strong>
              <em className="neutral">7.1%</em>
            </div>
          </article>
          <article>
            <span className="vehicle-metric-icon blue">
              <FiUsers />
            </span>
            <div>
              <small>Total capacity</small>
              <strong>182</strong>
              <em className="neutral">Seats available: 68</em>
            </div>
          </article>
        </section>

        <section className="vehicles-panel">
          <div className="vehicle-tabs">
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
          <div className="vehicles-toolbar">
            <label className="vehicles-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search vehicles..."
              />
            </label>
            <button className="vehicle-filter">
              <FiTool /> Filter
            </button>
            <button className="vehicle-export">
              <FiDownload /> Export
            </button>
          </div>
          <div className="vehicles-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Vehicle <FiArrowDown />
                  </th>
                  <th>Registration No.</th>
                  <th>Type / Model</th>
                  <th>Capacity</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Last service</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <div className="vehicle-name">
                        <span className="vehicle-thumb">
                          <FaBus />
                        </span>
                        <div>
                          <strong>{vehicle.name}</strong>
                          <small>ID: {vehicle.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{vehicle.registration}</td>
                    <td>{vehicle.model}</td>
                    <td>
                      {vehicle.capacity} Seats
                      <small
                        className={vehicle.occupied ? "occupied" : "available"}
                      >
                        {vehicle.occupied} Occupied
                      </small>
                    </td>
                    <td>
                      <strong>{vehicle.driver}</strong>
                      <small>
                        {vehicle.driver === "Not assigned"
                          ? "Not Assigned"
                          : "★ 4.8"}
                      </small>
                    </td>
                    <td>
                      <span className="route-dot" />
                      {vehicle.route}
                      <small>
                        {vehicle.route === "Not assigned"
                          ? "Not Assigned"
                          : "Morning / Afternoon"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`vehicle-status ${vehicle.status.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {vehicle.status}
                      </span>
                    </td>
                    <td>
                      <strong>{vehicle.service}</strong>
                      <small>Next: {vehicle.nextService}</small>
                    </td>
                    <td>
                      <button
                        className="vehicle-row-action"
                        aria-label={`Edit ${vehicle.name}`}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="vehicle-row-action"
                        aria-label={`More options for ${vehicle.name}`}
                      >
                        <FiMoreHorizontal />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredVehicles.length === 0 && (
              <div className="empty-vehicles">
                No vehicles match your search.
              </div>
            )}
          </div>
          <div className="vehicles-footer">
            <span>Showing 1 to {filteredVehicles.length} of 14 vehicles</span>
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
        </section>
      </div>
    </>
  );
}

export default Vehicles;
