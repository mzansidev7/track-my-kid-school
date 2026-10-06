import { useCallback, useEffect, useMemo, useState } from "react";
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
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import "../styles/routes.css";

const tabs = ["All routes", "Active", "Inactive", "Draft"];
const cacheTtl = 5 * 60 * 1000;

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

function Routes() {
  const auth = getAuth();
  const cacheKey = `schoolRoutesCache:${auth.user?.id || "current"}`;

  const normalizeRoute = useCallback((route, index) => {
    const assignments = Array.isArray(route.assignments)
      ? route.assignments
      : [];
    const activeAssignment =
      assignments.find((item) => item.is_active !== false) ||
      assignments[0] ||
      null;
    const driverName =
      activeAssignment?.drivers?.users?.name ||
      activeAssignment?.driver_id ||
      "Not assigned";
    const vehicleName =
      activeAssignment?.vehicles?.registration_number ||
      activeAssignment?.vehicles?.make ||
      (activeAssignment?.vehicle_id ? "Assigned vehicle" : "Not assigned");
    const status =
      assignments.length === 0
        ? "Draft"
        : activeAssignment?.is_active === false
          ? "Inactive"
          : "Active";

    return {
      ...route,
      id: route.id || `route-${index}`,
      code: `Route ${index + 1}`,
      name: route.route_name || `Route ${index + 1}`,
      driver: driverName,
      vehicle: vehicleName,
      students: route.students || 0,
      stops: route.stop_count || 0,
      start: route.start_location || "Route start",
      end: route.end_location || "Route end",
      time: route.departure_time
        ? new Date(route.departure_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not scheduled",
      status,
      tone:
        status === "Draft"
          ? "gray"
          : status === "Inactive"
            ? "orange"
            : "purple",
    };
  }, []);

  const [routeData, setRouteData] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return Array.isArray(cached?.data?.routes)
        ? cached.data.routes.map((route, index) => normalizeRoute(route, index))
        : [];
    } catch {
      return [];
    }
  });
  const [school, setSchool] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return cached?.data?.school || null;
    } catch {
      return null;
    }
  });

  const loadRoutes = useCallback(
    async (forceRefresh = false) => {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (
          !forceRefresh &&
          cached?.data &&
          Date.now() - cached.timestamp < cacheTtl
        ) {
          const nextRoutes = Array.isArray(cached.data.routes)
            ? cached.data.routes.map((route, index) =>
                normalizeRoute(route, index),
              )
            : [];
          setRouteData(nextRoutes);
          setSchool(cached.data.school || null);
          return;
        }

        const dashboard = await apiRequest("/school/dashboard", {
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        });

        const nextRoutes = Array.isArray(dashboard.routes)
          ? dashboard.routes.map((route, index) => normalizeRoute(route, index))
          : [];

        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: dashboard, timestamp: Date.now() }),
        );
        setSchool(dashboard.school || null);
        setRouteData(nextRoutes);
      } catch {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (cached?.data) {
          const nextRoutes = Array.isArray(cached.data.routes)
            ? cached.data.routes.map((route, index) =>
                normalizeRoute(route, index),
              )
            : [];
          setRouteData(nextRoutes);
          setSchool(cached.data.school || null);
        }
      }
    },
    [auth.token, cacheKey, normalizeRoute],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRoutes(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRoutes]);

  useEffect(() => {
    if (!supabaseClient) return undefined;

    const channel = supabaseClient
      .channel(`school-routes-live:${auth.user?.id || "current"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        () => void loadRoutes(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        () => void loadRoutes(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        () => void loadRoutes(true),
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadRoutes]);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All routes");
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const selectedRoute = useMemo(() => {
    if (!routeData.length) return null;
    return (
      routeData.find((route) => route.id === selectedRouteId) ?? routeData[0]
    );
  }, [routeData, selectedRouteId]);

  const filteredRoutes = useMemo(
    () =>
      routeData.filter(
        (route) =>
          `${route.name} ${route.code} ${route.driver} ${route.vehicle}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (tab === "All routes" ||
            route.status.toLowerCase() === tab.toLowerCase()),
      ),
    [query, routeData, tab],
  );

  const totalStudents = routeData.reduce(
    (sum, route) => sum + Number(route.students || 0),
    0,
  );
  const activeRouteCount = routeData.filter(
    (route) => route.status === "Active",
  ).length;

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
              <strong>{school?.name || "School Admin"}</strong>
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
              <strong>{routeData.length}</strong>
              <em>
                <FiArrowUp /> Live from school data
              </em>
            </div>
          </article>
          <article>
            <span className="route-metric green">
              <FiCheck />
            </span>
            <div>
              <small>Active routes</small>
              <strong>{activeRouteCount}</strong>
              <em>
                {routeData.length
                  ? Math.round((activeRouteCount / routeData.length) * 100)
                  : 0}
                % of routes
              </em>
            </div>
          </article>
          <article>
            <span className="route-metric blue">
              <FiUsers />
            </span>
            <div>
              <small>Students covered</small>
              <strong>{totalStudents}</strong>
              <em>Across all routes</em>
            </div>
          </article>
          <article>
            <span className="route-metric orange">
              <FiClock />
            </span>
            <div>
              <small>Average duration</small>
              <strong>Live data</strong>
              <em>
                {routeData.length
                  ? "Updated in real time"
                  : "Waiting for routes"}
              </em>
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
                  className={`route-card ${selectedRoute?.id === route.id ? "selected" : ""}`}
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                >
                  <span className={`route-card-icon ${route.tone}`}>
                    <strong>{route.code.replace("Route ", "R")}</strong>
                  </span>
                  <div className="route-card-main">
                    <strong>{route.code}</strong>
                    <small>{route.name}</small>
                  </div>
                  <div className="route-card-direction">
                    <strong>{route.start}</strong>
                    <small>→ {route.end}</small>
                  </div>
                  <span className="route-stat">
                    <FiUsers /> {route.students}
                  </span>
                  <span className="route-stat">
                    <FiMapPin /> {route.stops}
                  </span>
                  <div className="route-card-assignment">
                    <strong>{route.vehicle}</strong>
                    <small>{route.driver}</small>
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
              <span>
                Showing {filteredRoutes.length ? 1 : 0} to{" "}
                {filteredRoutes.length} of {routeData.length} routes
              </span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          </div>
          {selectedRoute && (
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
                  {selectedRoute.start}
                </span>
                <span className="preview-stop three">
                  <i />
                  {selectedRoute.end}
                </span>
                <span className="preview-stop four">
                  <i />
                  Route
                </span>
                <FaBus />
              </div>
              <div className="route-detail-body">
                <span
                  className={`route-status ${selectedRoute.status.toLowerCase()}`}
                >
                  {selectedRoute.status}
                </span>
                <h3>{selectedRoute.name}</h3>
                <p>{selectedRoute.time} · Monday to Friday</p>
                <dl>
                  <dt>Stops</dt>
                  <dd>{selectedRoute.stops}</dd>
                  <dt>Students</dt>
                  <dd>{selectedRoute.students}</dd>
                  <dt>Duration</dt>
                  <dd>{selectedRoute.time || "Not scheduled"}</dd>
                  <dt>Distance</dt>
                  <dd>
                    {selectedRoute.start && selectedRoute.end
                      ? "Live route"
                      : "Not set"}
                  </dd>
                </dl>
                <div className="assigned-route">
                  <h4>Assigned vehicle</h4>
                  <p>
                    <FaBus /> <strong>{selectedRoute.vehicle}</strong>
                  </p>
                  <small>
                    {selectedRoute.start} → {selectedRoute.end}
                  </small>
                  <h4>Assigned driver</h4>
                  <p>
                    <span className="driver-avatar">
                      {selectedRoute.driver?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                    <strong>{selectedRoute.driver}</strong>
                  </p>
                  <small>
                    {selectedRoute.status === "Active"
                      ? "Route active"
                      : "Awaiting assignment"}
                  </small>
                </div>
                <button className="edit-route">
                  <FiEdit2 /> Edit route
                </button>
              </div>
            </aside>
          )}
        </section>
      </div>
    </>
  );
}

export default Routes;
