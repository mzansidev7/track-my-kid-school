import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  // FiEdit2,
  FiDownload,
  // FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiTool,
  FiTruck,
  FiUsers,
  FiPlay,
  FiStopCircle,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import "../styles/vehicles.css";

const tabs = ["All Vehicles", "Active", "Under Maintenance", "Out of Service"];

function Vehicles() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Vehicles");

  const auth = (() => {
    try {
      return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
    } catch {
      return {};
    }
  })();
  const cacheKey = `schoolTrackingCache:${auth.user?.id || "current"}`;

  const [vehiclesIformation] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return cached?.data?.trips || null;
    } catch {
      return null;
    }
  });
  const getVehicles = vehiclesIformation.map((v) => v.vehicle);
  const getVehicleCount = vehiclesIformation.length;
  const getTotalActiveVehicles = vehiclesIformation.filter(
    (v) => v.vehicle.status === "active",
  ).length;

  console.log({ getTotalActiveVehicles });

  const mappedVehicles = vehiclesIformation.map((route) => {
    const vehicleDetails = getVehicles.find(
      (vehicle) => vehicle.id === route.vehicle.id,
    );
    return {
      ...route,
      vehicle: {
        ...route.vehicle,
        ...vehicleDetails,
      },
    };
  });

  const filteredVehicles = useMemo(
    () =>
      mappedVehicles.filter((vehicle) => {
        const matchesQuery =
          `${vehicle.name} ${vehicle.id} ${vehicle.license_plate} ${vehicle.driver}`
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
              <strong>{getVehicleCount}</strong>
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
              <strong>{getTotalActiveVehicles}</strong>
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
                  <th>Type / Model</th>
                  <th>Registration No.</th>
                  <th>Capacity</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Start/End Location</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <div className="vehicle-name">
                        <span className="vehicle-thumb">
                          {/* {vehicle.vehicle.vehicle_images ? */}
                          //
                          <FaBus />
                          //
                        </span>
                        <div>
                          <strong>{vehicle.vehicle.name}</strong>
                          <small>ID: {vehicle.vehicle.id.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>
                    <td>{vehicle.vehicle.model}</td>
                    <td>{vehicle.vehicle.license_plate}</td>
                    <td>
                      {vehicle.capacity} Seats
                      <small
                        className={vehicle.occupied ? "occupied" : "available"}
                      >
                        {vehicle.occupied} Occupied {vehicle.students}
                      </small>
                    </td>
                    <td>
                      <strong>{vehicle.driver.users.name}</strong>
                      <small style={{ color: "orange" }}>
                        {vehicle.driver.status === "inactive"
                          ? "Not Assigned"
                          : "★ 4.8"}
                      </small>
                    </td>
                    <td>
                      <span className="route-dot" />
                      {vehicle.route_name}
                      <small>
                        {!vehicle.route_id
                          ? "Not Assigned"
                          : "Morning / Afternoon"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`vehicle-status ${vehicle.vehicle.status.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {vehicle.vehicle.status}
                      </span>
                    </td>
                    <td>
                      <strong
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Start: <FiPlay color="green" /> {vehicle.start_location}
                      </strong>
                      <strong
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        End: <FiStopCircle color="red" /> {vehicle.end_location}
                      </strong>
                    </td>
                    {/* 
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
                    </td> */}
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
        {JSON.stringify(filteredVehicles)}
      </div>
    </>
  );
}

export default Vehicles;
