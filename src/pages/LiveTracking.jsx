import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiChevronDown,
  FiClock,
  FiCrosshair,
  FiMapPin,
  FiPhone,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import {
  APIProvider,
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  Map as GoogleMap,
  useMap,
} from "@vis.gl/react-google-maps";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import "../styles/liveTracking.css";
import SchoolPageHeader from "../components/SchoolPageHeader";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

const getRelatedRecord = (record) =>
  Array.isArray(record) ? record[0] || null : record || null;

const getVehicleImage = (vehicle) => {
  const image = Array.isArray(vehicle?.vehicle_images)
    ? vehicle.vehicle_images[0]
    : null;
  return typeof image === "string" ? image : image?.url || image?.publicUrl || "";
};

const getSchoolRouteStops = (stops = []) => {
  const pickupStops = [];
  const schoolStops = new Map();

  for (const stop of stops) {
    const child = getRelatedRecord(stop.children);
    if (stop.stop_type === "pickup") {
      pickupStops.push({
        ...stop,
        marker_type: "pickup",
        marker_label:
          [child?.name, child?.lastname].filter(Boolean).join(" ") ||
          stop.address ||
          "Student pickup",
      });
      continue;
    }

    if (stop.stop_type !== "dropoff") continue;
    const school = getRelatedRecord(child?.schools || child?.school);
    const schoolName = school?.name || "School";
    const position =
      parseCoordinate(
        school?.latitude,
        school?.longitude,
        school?.address || schoolName,
      ) || parseCoordinate(stop.latitude, stop.longitude, stop.address);
    if (!position) continue;

    const key =
      child?.school_id ||
      school?.id ||
      `${schoolName}:${school?.address || stop.address || `${position.latitude},${position.longitude}`}`;
    const existing = schoolStops.get(String(key));
    if (!existing || stop.stop_order < existing.stop_order) {
      schoolStops.set(String(key), {
        ...stop,
        id: `school-${key}`,
        latitude: position.latitude,
        longitude: position.longitude,
        marker_type: "school",
        marker_label: schoolName,
        stop_order: stop.stop_order,
      });
    }
  }

  return [...pickupStops, ...schoolStops.values()].sort(
    (first, second) => (first.stop_order || 0) - (second.stop_order || 0),
  );
};

function LiveTrackingMap({ trips, selectedId }) {
  const map = useMap();
  const lastFittedRoutes = useRef("");

  useEffect(() => {
    if (!map || !trips.length) return;

    const routeSignature = trips
      .map((trip) =>
        [
          trip.id,
          ...trip.routePoints.map(
            ({ latitude, longitude }) => `${latitude},${longitude}`,
          ),
        ].join(":"),
      )
      .join("|");
    const selectionSignature = `${selectedId || ""}:${routeSignature}`;
    if (lastFittedRoutes.current === selectionSignature) {
      const selectedTrip =
        trips.find((trip) => trip.id === selectedId) || trips[0];
      map.panTo({
        lat: selectedTrip.location.latitude,
        lng: selectedTrip.location.longitude,
      });
      return;
    }

    lastFittedRoutes.current = selectionSignature;
    const points = trips.flatMap((trip) => [
      ...trip.routePoints,
      trip.location,
    ]);
    if (points.length === 1) {
      map.setCenter({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(15);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach(({ latitude, longitude }) =>
      bounds.extend({ lat: latitude, lng: longitude }),
    );
    map.fitBounds(bounds, { top: 56, right: 48, bottom: 56, left: 48 });
  }, [map, selectedId, trips]);

  return (
    <>
      {trips.flatMap((trip) =>
        trip.stops.map((stop) => {
          const position = parseCoordinate(
            stop.latitude,
            stop.longitude,
            stop.address,
          );
          if (!position) return null;
          return (
            <AdvancedMarker
              key={`${trip.id}-${stop.id}-${stop.marker_type || stop.stop_type}`}
              position={{ lat: position.latitude, lng: position.longitude }}
              title={`${stop.marker_type === "school" ? "School" : "Pickup"}: ${stop.marker_label} · ${trip.vehicleLabel}`}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            >
              <span className={`google-tracking-stop ${stop.marker_type}`}>
                {stop.marker_label}
              </span>
            </AdvancedMarker>
          );
        }),
      )}
      {trips.map((trip) => (
        <AdvancedMarker
          key={trip.id}
          position={{
            lat: trip.location.latitude,
            lng: trip.location.longitude,
          }}
          title={`${trip.vehicleLabel} · ${trip.route_name} · Live location`}
          anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
          zIndex={trip.id === selectedId ? 10 : 9}
        >
          <span className="google-tracking-vehicle is-live">
            <FaBus />
            <span>{trip.vehicleLabel}</span>
          </span>
        </AdvancedMarker>
      ))}
    </>
  );
}

function parseCoordinate(latitude, longitude, fallback) {
  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "";
  const parsedLatitude = hasCoordinates ? Number(latitude) : NaN;
  const parsedLongitude = hasCoordinates ? Number(longitude) : NaN;
  if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
    return { latitude: parsedLatitude, longitude: parsedLongitude };
  }
  const values = String(fallback || "")
    .split(",")
    .map((value) => Number(value.trim()));
  return Number.isFinite(values[0]) && Number.isFinite(values[1])
    ? { latitude: values[0], longitude: values[1] }
    : null;
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

  const schoolStudentIds = useMemo(
    () =>
      new Set((tracking?.students || []).map((student) => String(student.id))),
    [tracking?.students],
  );
  const trips = useMemo(
    () =>
      (tracking?.trips || []).map((trip) => ({
        ...trip,
        stops: getSchoolRouteStops(
          (trip.stops || []).filter((stop) =>
            schoolStudentIds.has(String(stop.child_id)),
          ),
        ),
      })),
    [schoolStudentIds, tracking?.trips],
  );
  const mapTrips = useMemo(
    () =>
      trips.filter((trip) => trip.is_active_route && trip.is_in_time_window),
    [trips],
  );
  const mapLiveTrips = useMemo(
    () =>
      mapTrips.flatMap((trip) => {
        if (!trip.is_online) return [];
        const location = parseCoordinate(
          trip.location?.latitude,
          trip.location?.longitude,
        );
        if (!location) return [];
        const routePoints = [
          parseCoordinate(
            trip.start_latitude,
            trip.start_longitude,
            trip.start_location,
          ),
          ...trip.stops.map((stop) =>
            parseCoordinate(stop.latitude, stop.longitude, stop.address),
          ),
          parseCoordinate(
            trip.end_latitude,
            trip.end_longitude,
            trip.end_location,
          ),
        ].filter(Boolean);
        return [
          {
            ...trip,
            location,
            routePoints,
            vehicleLabel:
              trip.vehicle?.license_plate || trip.vehicle?.name || "Vehicle",
          },
        ];
      }),
    [mapTrips],
  );
  const selectedTrip =
    trips.find((trip) => trip.id === selectedId) ||
    mapLiveTrips[0] ||
    mapTrips[0] ||
    trips[0] ||
    null;
  const mapCanShowLocation = mapLiveTrips.length > 0;
  const hideTrackingPlaceholder =
    trips.length > 0 && !trips.some((trip) => trip.is_in_time_window);
  const mapPlaceholderMessage = !trips.length
    ? "No school routes are available to track."
    : !trips.some((trip) => trip.is_in_time_window)
      ? "No vehicles are currently within their scheduled tracking windows."
      : "No vehicles within their tracking windows are currently sharing a live GPS location.";
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
      <SchoolPageHeader
        className="tracking-heading"
        actionsClassName="tracking-controls"
        eyebrow="REAL-TIME MONITORING"
        titleIcon={<span className="school-page-heading-icon"><FiCrosshair /></span>}
        title="Live Tracking"
        description="Track vehicles and students in real-time."
        actions={
          <>
            <button>
              All Routes <FiChevronDown />
            </button>
            <button>
              <FiAlertCircle /> Live data
            </button>
            <button aria-label="Full screen">⛶</button>
          </>
        }
      />
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
            {GOOGLE_MAPS_API_KEY && mapCanShowLocation ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  className="tracking-google-map"
                  style={{ width: "100%", height: "100%" }}
                  defaultCenter={{
                    lat: mapLiveTrips[0].location.latitude,
                    lng: mapLiveTrips[0].location.longitude,
                  }}
                  defaultZoom={12}
                  mapId="school-live-tracking-map"
                  clickableIcons={false}
                  gestureHandling="greedy"
                  mapTypeControl
                  zoomControl
                  fullscreenControl
                  streetViewControl={false}
                >
                  <LiveTrackingMap
                    trips={mapLiveTrips}
                    selectedId={selectedId}
                  />
                </GoogleMap>
              </APIProvider>
            ) : hideTrackingPlaceholder ? null : (
              <div
                className={`tracking-map-empty-placeholder ${
                  !GOOGLE_MAPS_API_KEY ? "has-error" : ""
                }`}
              >
                <span className="tracking-placeholder-icon">
                  {!GOOGLE_MAPS_API_KEY ? (
                    <FiAlertCircle />
                  ) : !selectedTrip ? (
                    <FiMapPin />
                  ) : !selectedTrip?.is_in_time_window ? (
                    <FiClock />
                  ) : (
                    <FaBus />
                  )}
                </span>
                <strong>
                  {!GOOGLE_MAPS_API_KEY
                    ? "Map unavailable"
                    : !trips.length
                      ? "No routes to track"
                      : !mapTrips.length
                        ? "Outside tracking windows"
                        : "No live vehicle locations"}
                </strong>
                <span>
                  {!GOOGLE_MAPS_API_KEY
                    ? "Google Maps is unavailable because VITE_GOOGLE_MAPS_API_KEY is not configured."
                    : mapPlaceholderMessage}
                </span>
                {selectedTrip?.route_name && trips.length === 1 ? (
                  <small>
                    {selectedTrip.route_name} ·{" "}
                    {selectedTrip.vehicle?.license_plate ||
                      selectedTrip.vehicle?.name ||
                      "Vehicle"}
                  </small>
                ) : null}
              </div>
            )}
            {mapCanShowLocation ? (
              <div className="vehicle-popover">
                <strong>
                  {mapLiveTrips.length} live vehicle
                  {mapLiveTrips.length === 1 ? "" : "s"}
                </strong>
                {mapLiveTrips.map((trip) => (
                  <small key={trip.id}>
                    <FaBus /> {trip.vehicleLabel} · {trip.route_name}
                  </small>
                ))}
              </div>
            ) : null}
            {mapCanShowLocation ? (
              <div className="map-legend">
                <strong>Live tracking</strong>
                <span>
                  <i className="legend-green" /> On Route
                </span>
              </div>
            ) : null}
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
                      {getVehicleImage(trip.vehicle) && (
                        <img
                          src={getVehicleImage(trip.vehicle)}
                          alt=""
                          loading="lazy"
                        />
                      )}
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
                  {getVehicleImage(selectedTrip.vehicle) && (
                    <img
                      src={getVehicleImage(selectedTrip.vehicle)}
                      alt=""
                      loading="lazy"
                    />
                  )}
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
