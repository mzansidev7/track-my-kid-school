import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { useSchoolReports } from "../hooks/useSchoolReports";
import { downloadSchoolReport } from "../utils/schoolReport";
import "../styles/reports.css";

const tabs = [
  "Overview",
  "Routes",
  "Attendance",
  "Students",
  "Drivers",
  "Vehicles",
];
const EMPTY_REPORT = {
  school: null,
  routes: [],
  students: [],
  drivers: [],
  vehicles: [],
  attendance: [],
  summary: {
    present: 0,
    late: 0,
    absent: 0,
    possibleAttendance: 0,
    recordedAttendance: 0,
    attendanceRate: null,
    onlineRoutes: 0,
    assignedDrivers: 0,
  },
  updatedAt: null,
};

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() ||
  person?.users?.name ||
  "Unassigned";

const dateLabel = (date) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString([], {
        day: "numeric",
        month: "short",
      })
    : "—";

function Reports() {
  const { reportData, loading, error, refresh } = useSchoolReports();
  const [activeTab, setActiveTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  const data = useMemo(() => {
    if (!reportData) return EMPTY_REPORT;
    const dashboard = reportData.dashboard || {};
    const trackingTrips = reportData.tracking?.trips || [];
    const students = dashboard.students || [];
    const drivers = dashboard.drivers || [];
    const trackingByRoute = new Map(
      trackingTrips.map((trip) => [String(trip.route_id), trip]),
    );
    const routes = (dashboard.routes || []).map((route) => {
      const trackingTrip = trackingByRoute.get(String(route.id));
      const assignment =
        route.assignments?.find((item) => item.is_active !== false) ||
        route.assignments?.[0];
      const driver = trackingTrip?.driver || assignment?.drivers;
      const vehicle = trackingTrip?.vehicle;
      return {
        id: route.id,
        name: route.route_name || "Unnamed route",
        path:
          [route.start_location, route.end_location]
            .filter(Boolean)
            .join(" → ") || "Path not set",
        students: route.students || 0,
        driver: driver?.users?.name || "Unassigned",
        driverId: driver?.id || assignment?.driver_id || "",
        vehicle: vehicle?.name || vehicle?.license_plate || "Not assigned",
        vehicleId: vehicle?.id || assignment?.vehicle_id || "",
        status: trackingTrip?.is_online
          ? "Online"
          : assignment?.is_active === false || !assignment
            ? "Unassigned"
            : "Assigned",
        pickup: route.pickup_start_time || route.departure_time || "—",
      };
    });
    const attendance = reportData.attendanceDays || [];
    const activeDrivers = new Map();
    trackingTrips.forEach((trip) => {
      if (trip.driver?.id)
        activeDrivers.set(String(trip.driver.id), trip.driver);
    });
    const driverRows = drivers.map((driver) => {
      const assignedRoutes = routes.filter(
        (route) => String(route.driverId) === String(driver.id),
      );
      return {
        id: driver.id,
        name: driver.users?.name || fullName(driver),
        routes:
          assignedRoutes.map((route) => route.name).join(", ") ||
          "No assigned route",
        vehicleCount: new Set(
          assignedRoutes.map((route) => route.vehicleId).filter(Boolean),
        ).size,
        status:
          driver.status ||
          (activeDrivers.has(String(driver.id)) ? "Active" : "Assigned"),
      };
    });
    const vehiclesById = new Map();
    trackingTrips.forEach((trip) => {
      if (!trip.vehicle?.id) return;
      vehiclesById.set(String(trip.vehicle.id), {
        id: trip.vehicle.id,
        name: trip.vehicle.name || trip.vehicle.license_plate || "Vehicle",
        route: trip.route_name || "Unassigned route",
        driver: trip.driver?.users?.name || "Unassigned",
        status: trip.vehicle.status || trip.status || "Unknown",
      });
    });
    const present = attendance.reduce(
      (total, day) => total + (day.present || 0),
      0,
    );
    const late = attendance.reduce((total, day) => total + (day.late || 0), 0);
    const absent = attendance.reduce(
      (total, day) => total + (day.absent || 0),
      0,
    );
    const possibleAttendance = attendance.reduce(
      (total, day) => total + (day.total || 0),
      0,
    );
    const recordedAttendance = present + late + absent;

    return {
      school: dashboard.school || null,
      routes,
      students: students.map((student) => ({
        id: student.id,
        name:
          [student.name, student.lastname].filter(Boolean).join(" ") ||
          "Student",
        grade: student.grade || "Not assigned",
        route: student.route_name || "No route assigned",
      })),
      drivers: driverRows,
      vehicles: Array.from(vehiclesById.values()),
      attendance,
      summary: {
        present,
        late,
        absent,
        possibleAttendance,
        recordedAttendance,
        attendanceRate: possibleAttendance
          ? Math.round(((present + late) / possibleAttendance) * 100)
          : null,
        onlineRoutes: routes.filter((route) => route.status === "Online")
          .length,
        assignedDrivers: new Set(
          routes.map((route) => route.driverId).filter(Boolean),
        ).size,
      },
      updatedAt: reportData.updatedAt,
    };
  }, [reportData]);

  const tableConfig = useMemo(() => {
    switch (activeTab) {
      case "Attendance":
        return {
          title: "Attendance by day",
          rows: data.attendance.map((day) => ({
            id: day.date,
            date: dateLabel(day.date),
            present: day.present || 0,
            late: day.late || 0,
            absent: day.absent || 0,
            rate: day.total ? `${day.percentage || 0}%` : "No students",
          })),
          columns: [
            ["date", "Date"],
            ["present", "Present"],
            ["late", "Late"],
            ["absent", "Absent"],
            ["rate", "Attendance rate"],
          ],
        };
      case "Students":
        return {
          title: "Student records",
          rows: data.students,
          columns: [
            ["name", "Student"],
            ["grade", "Grade"],
            ["route", "Route"],
          ],
        };
      case "Drivers":
        return {
          title: "Driver assignments",
          rows: data.drivers,
          columns: [
            ["name", "Driver"],
            ["routes", "Assigned routes"],
            ["vehicleCount", "Vehicles"],
            ["status", "Status"],
          ],
        };
      case "Vehicles":
        return {
          title: "Assigned vehicles",
          rows: data.vehicles,
          columns: [
            ["name", "Vehicle"],
            ["route", "Route"],
            ["driver", "Driver"],
            ["status", "Status"],
          ],
        };
      case "Routes":
      case "Overview":
      default:
        return {
          title: "Route assignments",
          rows: data.routes,
          columns: [
            ["name", "Route"],
            ["path", "Path"],
            ["students", "Students"],
            ["driver", "Driver"],
            ["vehicle", "Vehicle"],
            ["status", "Status"],
          ],
        };
    }
  }, [activeTab, data]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tableConfig.rows.filter((row) => {
      const textMatches =
        !needle || Object.values(row).join(" ").toLowerCase().includes(needle);
      const routeMatches =
        !routeFilter ||
        row.name === routeFilter ||
        row.route === routeFilter ||
        row.routes?.includes(routeFilter);
      const driverMatches =
        !driverFilter ||
        row.driver === driverFilter ||
        row.name === driverFilter;
      const vehicleMatches =
        !vehicleFilter ||
        row.vehicle === vehicleFilter ||
        row.name === vehicleFilter;
      return textMatches && routeMatches && driverMatches && vehicleMatches;
    });
  }, [driverFilter, query, routeFilter, tableConfig, vehicleFilter]);

  const statusTotal = data.routes.length || 0;
  const attendanceDaysWithRecords = data.attendance.filter(
    (day) => day.recorded > 0,
  );
  const attendanceTrend = attendanceDaysWithRecords.map((day) => ({
    ...day,
    label: dateLabel(day.date),
  }));
  const schoolName = data.school?.name || "School report";

  const exportReport = async () => {
    if (exporting || !tableConfig.columns.length) return;
    setExporting(true);
    try {
      await downloadSchoolReport({
        records: visibleRows,
        columns: tableConfig.columns.map(([key, title]) => ({
          key,
          title,
          width: 2,
        })),
        title: `${activeTab} report`,
        schoolName,
        fileName: `school-${activeTab.toLowerCase()}-report.pdf`,
        subject: `School ${activeTab.toLowerCase()} report`,
        metadata: [
          { label: "Records", value: visibleRows.length },
          {
            label: "Attendance",
            value:
              data.summary.attendanceRate == null
                ? "No records"
                : `${data.summary.attendanceRate}%`,
          },
        ],
      });
    } catch (exportError) {
      console.error("Could not export report:", exportError);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Reports</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiFileText />
            <input
              aria-label="Search report records"
              placeholder="Search report data..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="top-profile">
            <span>
              <strong>{schoolName}</strong>
              <small>School report</small>
            </span>
          </div>
        </div>
      </header>
      <div className="portal-content reports-content">
        <section className="reports-heading">
          <div>
            <p className="page-kicker">DATA & INSIGHTS</p>
            <h1>Reports</h1>
            <p>
              Live summaries from school routes, attendance and fleet
              assignments.
            </p>
          </div>
          <div className="reports-actions">
            <span className="report-date">
              <FiCalendar /> This week: {dateLabel(data.attendance[0]?.date)} –{" "}
              {dateLabel(data.attendance.at(-1)?.date)}
            </span>
            <button
              className="report-secondary"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "report-refreshing" : ""} />{" "}
              Refresh
            </button>
            <button
              className="report-primary"
              type="button"
              onClick={() => void exportReport()}
              disabled={exporting || loading || !visibleRows.length}
            >
              <FiDownload /> {exporting ? "Preparing..." : "Download report"}
            </button>
          </div>
        </section>

        {error && (
          <div className="reports-error" role="alert">
            <span>
              {error}
              {reportData ? " Showing the most recently cached data." : ""}
            </span>
            <button type="button" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        )}
        {loading && !reportData && (
          <div className="reports-loading">Loading school reports…</div>
        )}

        <section className="report-metrics">
          <article>
            <span className="report-metric purple">
              <FiTruck />
            </span>
            <div>
              <small>Routes</small>
              <strong>{data.routes.length}</strong>
              <em className="neutral">Linked to school students</em>
            </div>
          </article>
          <article>
            <span className="report-metric green">
              <FiCheck />
            </span>
            <div>
              <small>Attendance rate</small>
              <strong>
                {data.summary.attendanceRate == null
                  ? "—"
                  : `${data.summary.attendanceRate}%`}
              </strong>
              <em className="neutral">Present or late this week</em>
            </div>
          </article>
          <article>
            <span className="report-metric blue">
              <FiUsers />
            </span>
            <div>
              <small>Students</small>
              <strong>{data.students.length}</strong>
              <em className="neutral">Enrolled at this school</em>
            </div>
          </article>
          <article>
            <span className="report-metric orange">
              <FiUsers />
            </span>
            <div>
              <small>Assigned drivers</small>
              <strong>{data.summary.assignedDrivers}</strong>
              <em className="neutral">On school routes</em>
            </div>
          </article>
          <article>
            <span className="report-metric red">
              <FiTruck />
            </span>
            <div>
              <small>Vehicles online</small>
              <strong>
                {reportData?.tracking?.metrics?.activeVehicles || 0}
              </strong>
              <em className="neutral">Currently reporting location</em>
            </div>
          </article>
        </section>

        <section className="reports-layout">
          <div className="reports-main">
            <nav className="report-tabs" aria-label="Report categories">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "active" : ""}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className="report-filters">
              <select
                aria-label="Filter by route"
                value={routeFilter}
                onChange={(event) => setRouteFilter(event.target.value)}
              >
                <option value="">All routes</option>
                {data.routes.map((route) => (
                  <option key={route.id} value={route.name}>
                    {route.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by driver"
                value={driverFilter}
                onChange={(event) => setDriverFilter(event.target.value)}
              >
                <option value="">All drivers</option>
                {data.drivers.map((driver) => (
                  <option key={driver.id} value={driver.name}>
                    {driver.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by vehicle"
                value={vehicleFilter}
                onChange={(event) => setVehicleFilter(event.target.value)}
              >
                <option value="">All vehicles</option>
                {data.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.name}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setRouteFilter("");
                  setDriverFilter("");
                  setVehicleFilter("");
                  setQuery("");
                }}
              >
                <FiAlertCircle /> Clear filters
              </button>
            </div>
            <div className="reports-charts">
              <article className="trend-chart">
                <h2>
                  Attendance trend <FiBarChart2 />
                </h2>
                {attendanceTrend.length ? (
                  <div
                    className="report-trend-bars"
                    role="img"
                    aria-label="Daily school attendance rate for this week"
                  >
                    {attendanceTrend.map((day) => (
                      <div
                        className="report-trend-day"
                        key={day.date}
                        title={`${dateLabel(day.date)}: ${day.percentage}%`}
                      >
                        <strong>{day.percentage}%</strong>
                        <span className="report-trend-track">
                          <i
                            style={{
                              height: `${Math.max(day.percentage, 3)}%`,
                            }}
                          />
                        </span>
                        <small>{day.label}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="report-no-data">
                    No attendance has been recorded this week.
                  </p>
                )}
              </article>
              <article className="status-chart">
                <h2>
                  Route assignment status <FiTruck />
                </h2>
                {statusTotal ? (
                  <>
                    <div
                      className="donut"
                      style={{
                        "--online-share": `${(data.summary.onlineRoutes / statusTotal) * 100}%`,
                        "--assigned-end": `${((data.summary.onlineRoutes + data.routes.filter((route) => route.status === "Assigned").length) / statusTotal) * 100}%`,
                      }}
                    >
                      <strong>
                        {statusTotal}
                        <small>School routes</small>
                      </strong>
                    </div>
                    <div className="donut-legend">
                      <p>
                        <i className="green-dot" /> Online{" "}
                        <b>{data.summary.onlineRoutes}</b>
                      </p>
                      <p>
                        <i className="blue-dot" /> Assigned{" "}
                        <b>
                          {
                            data.routes.filter(
                              (route) => route.status === "Assigned",
                            ).length
                          }
                        </b>
                      </p>
                      <p>
                        <i className="orange-dot" /> Unassigned{" "}
                        <b>
                          {
                            data.routes.filter(
                              (route) => route.status === "Unassigned",
                            ).length
                          }
                        </b>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="report-no-data">
                    No routes are linked to this school yet.
                  </p>
                )}
              </article>
            </div>
            <div className="route-performance">
              <h2>
                {tableConfig.title} <FiAlertCircle />
              </h2>
              <div className="report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {tableConfig.columns.map(([, title]) => (
                        <th key={title}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        {tableConfig.columns.map(([key]) => (
                          <td key={`${row.id}-${key}`}>{row[key] ?? "—"}</td>
                        ))}
                      </tr>
                    ))}
                    {!loading && !visibleRows.length && (
                      <tr>
                        <td
                          colSpan={tableConfig.columns.length}
                          className="report-empty-row"
                        >
                          No matching report data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <aside className="reports-side">
            <div className="insights">
              <h2>
                Data summary <FiBarChart2 />
              </h2>
              <div className="insight">
                <span className="green">
                  <FiCheck />
                </span>
                <p>
                  <strong>Attendance recorded</strong>
                  <small>
                    {data.summary.recordedAttendance} student attendance records
                    this week.
                  </small>
                </p>
              </div>
              <div className="insight">
                <span className="blue">
                  <FiUsers />
                </span>
                <p>
                  <strong>School population</strong>
                  <small>
                    {data.students.length} students across {data.routes.length}{" "}
                    linked routes.
                  </small>
                </p>
              </div>
              <div className="insight">
                <span className="orange">
                  <FiTruck />
                </span>
                <p>
                  <strong>Fleet activity</strong>
                  <small>
                    {data.summary.onlineRoutes} of {data.routes.length} routes
                    currently have an online vehicle.
                  </small>
                </p>
              </div>
              <div className="report-data-updated">
                Updated{" "}
                {reportData?.updatedAt
                  ? new Date(reportData.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "when data loads"}
                ; live updates.
              </div>
            </div>
            <div className="report-shortcuts">
              <h2>
                Report views <FiFileText />
              </h2>
              {tabs.slice(1).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  <FiFileText />
                  <span>
                    <strong>{tab}</strong>
                    <small>View live {tab.toLowerCase()} data</small>
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

export default Reports;
