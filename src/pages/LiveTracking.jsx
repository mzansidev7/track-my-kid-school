import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiChevronDown,
  FiClock,
  FiCrosshair,
  FiLayers,
  FiMapPin,
  FiPhone,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import "../styles/liveTracking.css";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

function LiveTracking() {
  const auth = getAuth();
  const cacheKey = `schoolTrackingCache:${auth.user?.id || "current"}`;
  const [tracking, setTracking] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data || null;
    } catch {
      return null;
    }
  });
  const [selectedId, setSelectedId] = useState(null);
  const loadTracking = useCallback(async () => {
    const data = await apiRequest("/school/tracking", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    });
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
    setTracking(data);
  }, [auth.token, cacheKey]);

  useEffect(() => {
    apiRequest("/school/tracking", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((data) => {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data, timestamp: Date.now() }),
        );
        setTracking(data);
      })
      .catch(() => undefined);
  }, [auth.token, cacheKey]);

  useEffect(() => {
    if (!supabaseClient) return undefined;
    const channel = supabaseClient
      .channel(`school-tracking:${auth.user?.id || "current"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        loadTracking,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking_sessions" },
        loadTracking,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        loadTracking,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        loadTracking,
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadTracking]);

  const trips = useMemo(() => tracking?.trips || [], [tracking?.trips]);
  const mapTrips = useMemo(
    () =>
      trips.filter((trip) => trip.is_active_route && trip.is_in_time_window),
    [trips],
  );
  const selectedTrip =
    trips.find((trip) => trip.id === selectedId) || trips[0] || null;
  const selectedMapTrip =
    mapTrips.find((trip) => trip.id === selectedId) ||
    (selectedId ? null : mapTrips[0]) ||
    null;
  const parseCoordinate = (latitude, longitude, fallback) => {
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
      return { latitude: parsedLatitude, longitude: parsedLongitude };
    }
    const values = String(fallback || "")
      .split(",")
      .map((value) => Number(value.trim()));
    return Number.isFinite(values[0]) && Number.isFinite(values[1])
      ? { latitude: values[0], longitude: values[1] }
      : null;
  };
  const selectedRoutePoints = useMemo(() => {
    if (!selectedMapTrip) return [];
    return [
      parseCoordinate(
        selectedMapTrip.start_latitude,
        selectedMapTrip.start_longitude,
        selectedMapTrip.start_location,
      ),
      ...(selectedMapTrip.stops || []).map((stop) =>
        parseCoordinate(stop.latitude, stop.longitude, stop.address),
      ),
      parseCoordinate(
        selectedMapTrip.end_latitude,
        selectedMapTrip.end_longitude,
        selectedMapTrip.end_location,
      ),
    ].filter(Boolean);
  }, [selectedMapTrip]);
  const mapBounds = useMemo(() => {
    if (!selectedRoutePoints.length) return null;
    const latitudes = selectedRoutePoints.map((point) => point.latitude);
    const longitudes = selectedRoutePoints.map((point) => point.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    return { minLatitude, maxLatitude, minLongitude, maxLongitude };
  }, [selectedRoutePoints]);
  const getMapPoint = (point) => {
    if (!mapBounds) return null;
    const latitudeRange =
      mapBounds.maxLatitude - mapBounds.minLatitude || 0.001;
    const longitudeRange =
      mapBounds.maxLongitude - mapBounds.minLongitude || 0.001;
    return {
      x:
        10 + ((point.longitude - mapBounds.minLongitude) / longitudeRange) * 80,
      y:
        10 +
        (1 - (point.latitude - mapBounds.minLatitude) / latitudeRange) * 80,
    };
  };
  const metrics = tracking?.metrics || {};
  const formatTime = (value) =>
    value
      ? new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Not available";
  const formatScheduleTime = (value) => {
    if (!value) return "Not set";
    const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "Not set";
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatTripStartTime = (trip) =>
    trip?.session?.started_at
      ? formatTime(trip.session.started_at)
      : formatScheduleTime(trip?.departure_time);
  const activeCount = metrics.activeVehicles || 0;
  const totalStudents = metrics.students || 0;
  const onlineStudents = useMemo(
    () =>
      trips
        .filter((trip) => trip.is_online)
        .reduce((total, trip) => total + trip.students, 0),
    [trips],
  );

  return (
    <div className="portal-content tracking-content">
      <section className="tracking-heading">
        <div>
          <p className="page-kicker">REAL-TIME MONITORING</p>
          <h1>Live Tracking</h1>
          <p>Track vehicles and students in real-time.</p>
        </div>
        <div className="tracking-controls">
          <button>
            All Routes <FiChevronDown />
          </button>
          <button>
            <FiAlertCircle /> Live data
          </button>
          <button aria-label="Full screen">⛶</button>
        </div>
      </section>
      <section className="tracking-metrics">
        <article>
          <span className="tracking-metric green">
            <FaBus />
          </span>
          <div>
            <small>Active vehicles</small>
            <strong>{activeCount}</strong>
            <em>Online now</em>
          </div>
        </article>
        <article>
          <span className="tracking-metric green">
            <FiClock />
          </span>
          <div>
            <small>Students in transport</small>
            <strong>{onlineStudents}</strong>
            <em>Live assignments</em>
          </div>
        </article>
        <article>
          <span className="tracking-metric orange">
            <FiClock />
          </span>
          <div>
            <small>Offline vehicles</small>
            <strong>{trips.filter((trip) => !trip.is_online).length}</strong>
            <em>Awaiting location</em>
          </div>
        </article>
        <article>
          <span className="tracking-metric purple">
            <FiCrosshair />
          </span>
          <div>
            <small>Routes tracked</small>
            <strong>{new Set(trips.map((trip) => trip.route_id)).size}</strong>
            <em>Current assignments</em>
          </div>
        </article>
        <article>
          <span className="tracking-metric blue">
            <FiUsers />
          </span>
          <div>
            <small>Total students</small>
            <strong>{totalStudents}</strong>
            <em>School records</em>
          </div>
        </article>
      </section>
      <section className="tracking-layout">
        <div className="tracking-main">
          <div className="tracking-map">
            <div className="map-switch">
              <button className="selected">Map</button>
              <button>Satellite</button>
            </div>
            <div className="map-controls">
              <button>+</button>
              <button>-</button>
              <button>
                <FiCrosshair />
              </button>
              <button>
                <FiLayers />
              </button>
            </div>
            <div className="map-roads" />
            {selectedRoutePoints.length > 1 && (
              <svg
                className="map-route-line"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  points={selectedRoutePoints
                    .map((point) => {
                      const position = getMapPoint(point);
                      return `${position.x},${position.y}`;
                    })
                    .join(" ")}
                />
              </svg>
            )}
            {selectedMapTrip?.stops?.map((stop) => {
              const position = getMapPoint(stop);
              if (!position) return null;
              return (
                <span
                  className="map-stop"
                  key={stop.id}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  title={`${stop.stop_type || "Stop"}: ${stop.address || "Location"}`}
                >
                  {stop.stop_order}
                </span>
              );
            })}
            {(selectedMapTrip || !selectedId ? mapTrips : [])
              .slice(0, 3)
              .map((trip, index) => (
                <button
                  key={trip.id}
                  className={`map-route route-${["one", "two", "three"][index]}`}
                  onClick={() => setSelectedId(trip.id)}
                  aria-label={`Select ${trip.route_name}`}
                >
                  <i />
                  <i />
                  <i />
                  <b>
                    <FaBus />
                  </b>
                </button>
              ))}
            {!selectedMapTrip && (
              <div className="tracking-map-empty">
                This vehicle is offline or outside its tracking window.
              </div>
            )}
            {selectedMapTrip && (
              <div className="vehicle-popover">
                <strong>
                  {selectedMapTrip.vehicle?.license_plate ||
                    selectedMapTrip.vehicle?.name ||
                    "Vehicle"}
                </strong>
                <span>{selectedMapTrip.status}</span>
                <small>
                  <FiUsers /> {selectedMapTrip.students} students
                </small>
                <small>
                  <FiMapPin /> {selectedMapTrip.route_name}
                </small>
              </div>
            )}
            <div className="map-legend">
              <strong>Vehicle Status</strong>
              <span>
                <i className="legend-green" /> On Route
              </span>
              <span>
                <i className="legend-orange" /> Stopped
              </span>
              <span>
                <i className="legend-gray" /> Offline
              </span>
            </div>
          </div>
          <div className="active-trips">
            <div className="active-trips-head">
              <h2>Active Trips</h2>
              <span>Updated live</span>
            </div>
            <div className="active-trips-table">
              <div className="active-trip-row active-trip-header">
                <span>Vehicle</span>
                <span>Driver</span>
                <span>Route</span>
                <span>Status</span>
                <span>Window</span>
                <span>Location</span>
                <span>Students</span>
                <span>Updated</span>
                <span />
              </div>
              {trips.map((trip) => (
                <button
                  className={`active-trip-row ${selectedTrip?.id === trip.id ? "selected" : ""}`}
                  key={trip.id}
                  onClick={() => setSelectedId(trip.id)}
                >
                  <span>
                    <b className="mini-vehicle green">
                      <FaBus />
                    </b>
                    {trip.vehicle?.license_plate ||
                      trip.vehicle?.name ||
                      "Vehicle"}
                    <small>{trip.vehicle?.model || "Model unavailable"}</small>
                  </span>
                  <span>
                    {trip.driver?.users?.name || "Driver not assigned"}
                    <small>
                      {trip.driver?.users?.phone || "No phone number"}
                    </small>
                  </span>
                  <span>
                    {trip.route_name}
                    <small>
                      {trip.start_location || "Start pending"} →{" "}
                      {trip.end_location || "Destination pending"}
                    </small>
                  </span>
                  <span>
                    <em
                      className={`tracking-status ${trip.status.toLowerCase().replace(" ", "-")}`}
                    >
                      {trip.status}
                    </em>
                  </span>
                  <span>
                    <strong className="trip-window-period">
                      Morning window
                    </strong>
                    <small>
                      {formatScheduleTime(trip.pickup_start_time)} -{" "}
                      {formatScheduleTime(trip.pickup_end_time)}
                    </small>
                    <strong className="trip-window-period afternoon">
                      Afternoon window
                    </strong>
                    <small>
                      {formatScheduleTime(trip.dropoff_start_time)} -{" "}
                      {formatScheduleTime(trip.dropoff_end_time)}
                    </small>
                  </span>
                  <span
                    className="trip-location"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(trip.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedId(trip.id);
                      }
                    }}
                    title="Show route and stops on map"
                  >
                    {trip.location ? "View on map" : "No live location"}
                  </span>
                  <span>{trip.students}</span>
                  <span>{formatTime(trip.location?.recorded_at)}</span>
                  <span>
                    <FiMapPin />
                  </span>
                </button>
              ))}
            </div>
            {!trips.length && (
              <div className="empty-students">
                No transport assignments found.
              </div>
            )}
          </div>
        </div>
        <aside className="selected-vehicle">
          <div className="selected-vehicle-head">
            <h2>Selected Vehicle</h2>
            <button aria-label="Close" onClick={() => setSelectedId(null)}>
              ×
            </button>
          </div>
          {selectedTrip ? (
            <>
              <div className="vehicle-profile">
                <span className="vehicle-large">
                  <FaBus />
                </span>
                <div>
                  <strong>
                    {selectedTrip.vehicle?.license_plate ||
                      selectedTrip.vehicle?.name ||
                      "Vehicle"}
                  </strong>
                  <small>
                    {selectedTrip.vehicle?.model || "Model unavailable"}
                  </small>
                  <small>
                    Driver: {selectedTrip.driver?.users?.name || "Not assigned"}
                  </small>
                </div>
                <span className="on-route">{selectedTrip.status}</span>
                <button aria-label="Call driver">
                  <FiPhone />
                </button>
              </div>
              <div className="route-summary">
                <div>
                  <strong>{selectedTrip.route_name}</strong>
                  <small>{selectedTrip.students} students assigned</small>
                </div>
                <dl>
                  <dt>Start Time</dt>
                  <dd>{formatTripStartTime(selectedTrip)}</dd>
                  <dt>Last update</dt>
                  <dd>{formatTime(selectedTrip.location?.recorded_at)}</dd>
                  <dt>Status</dt>
                  <dd>{selectedTrip.status}</dd>
                </dl>
                <i className="detail-progress" />
              </div>
              <div className="next-stop">
                <div>
                  <h3>Location</h3>
                  <strong>
                    <FiMapPin />{" "}
                    {selectedTrip.location
                      ? `${selectedTrip.location.latitude}, ${selectedTrip.location.longitude}`
                      : "Unavailable"}
                  </strong>
                  <small>
                    {selectedTrip.is_online
                      ? "Live location"
                      : "Waiting for driver location"}
                  </small>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-students">
              Select a vehicle to see details.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default LiveTracking;
