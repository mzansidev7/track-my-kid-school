import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiArrowUp,
  FiCheck,
  FiClock,
  FiEdit2,
  FiMapPin,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import {
  showDeleteConfirmationAlert,
  showErrorAlert,
  successMessage,
} from "../components/sweetAlert.js";
import "../styles/routes.css";
import SchoolPageHeader from "../components/SchoolPageHeader";

const tabs = ["All routes", "Active", "Inactive", "Draft"];
const cacheTtl = 5 * 60 * 1000;
const pageSize = 6;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DEFAULT_MAP_CENTER = { lat: -25.7479, lng: 28.2293 };

const parseCoordinate = (latitude, longitude, address) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }

  const match = String(address || "")
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const parsedLat = Number(match[1]);
  const parsedLng = Number(match[2]);
  return parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180
    ? { lat: parsedLat, lng: parsedLng }
    : null;
};

const getRelatedRecord = (record) =>
  Array.isArray(record) ? record[0] || null : record || null;

function RouteCreateMaps({ children }) {
  if (!GOOGLE_MAPS_API_KEY) return children;

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places", "routes"]}>
      {children}
    </APIProvider>
  );
}

function RouteStartLocationField({ value, onChange, onPlaceSelected }) {
  const inputRef = useRef(null);
  const placesLibrary = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLibrary || !inputRef.current) return undefined;
    const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
      componentRestrictions: { country: "za" },
    });
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) return;
      onPlaceSelected({
        address: place.formatted_address || place.name || "",
        latitude: location.lat(),
        longitude: location.lng(),
      });
    });
    return () => listener.remove();
  }, [onPlaceSelected, placesLibrary]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search and select a starting location"
      autoComplete="off"
      required
    />
  );
}

const formatRouteDuration = (seconds) => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

const createEmptyRouteForm = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  return {
    route_name: "",
    start_location: "",
    start_latitude: null,
    start_longitude: null,
    departure_date: localDate,
    departure_clock: "06:30",
    pickup_start_time: "06:45",
    pickup_end_time: "07:30",
    dropoff_start_time: "14:00",
    dropoff_end_time: "15:00",
    children_ids: [],
    school_vehicle_id: "",
  };
};

function RouteCreateMap({ startPosition, schoolPosition, onEstimate }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");

  useEffect(() => {
    onEstimate(null);
    if (!map || !routesLibrary || !startPosition || !schoolPosition) {
      return undefined;
    }

    const directionsRenderer = new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: "#6132d7",
        strokeOpacity: 0.85,
        strokeWeight: 5,
      },
    });
    const directionsService = new routesLibrary.DirectionsService();
    let active = true;

    directionsService.route(
      {
        origin: startPosition,
        destination: schoolPosition,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (!active) return;
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          const legs = result.routes?.[0]?.legs || [];
          const distanceMeters = legs.reduce(
            (total, leg) => total + (leg.distance?.value || 0),
            0,
          );
          const durationSeconds = legs.reduce(
            (total, leg) => total + (leg.duration?.value || 0),
            0,
          );
          if (
            !legs.length ||
            legs.some(
              (leg) =>
                !Number.isFinite(leg.distance?.value) ||
                !Number.isFinite(leg.duration?.value),
            )
          ) {
            console.error(
              "Google Maps returned directions without route estimates.",
            );
            onEstimate(null);
            return;
          }
          onEstimate({
            estimated_distance_km: Number((distanceMeters / 1000).toFixed(1)),
            estimated_duration: formatRouteDuration(durationSeconds),
          });
          return;
        }
        console.error("Could not load route directions:", status);
        onEstimate(null);
      },
    );

    return () => {
      active = false;
      directionsRenderer.setMap(null);
    };
  }, [map, onEstimate, routesLibrary, startPosition, schoolPosition]);

  useEffect(() => {
    if (!map || !window.google?.maps || (!startPosition && !schoolPosition)) {
      return;
    }
    const mapPoints = [startPosition, schoolPosition].filter(Boolean);
    if (mapPoints.length === 1) {
      map.setCenter(mapPoints[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    mapPoints.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, { top: 35, right: 35, bottom: 35, left: 35 });
  }, [map, startPosition, schoolPosition]);

  return (
    <>
      {startPosition ? (
        <AdvancedMarker
          position={startPosition}
          title="Selected route starting location"
        >
          <span className="route-map-endpoint route-map-start">S</span>
        </AdvancedMarker>
      ) : null}
      {schoolPosition ? (
        <AdvancedMarker position={schoolPosition} title="School destination">
          <span className="route-map-endpoint route-map-school">School</span>
        </AdvancedMarker>
      ) : null}
    </>
  );
}

const getRouteMapStops = (route) => {
  const mapStops = [];
  const schoolStops = new Map();

  for (const stop of route.route_stops || []) {
    const child = getRelatedRecord(stop.children);
    if (stop.stop_type === "pickup") {
      const studentName =
        [child?.name, child?.lastname].filter(Boolean).join(" ") ||
        stop.address ||
        "Student pickup";
      const position = parseCoordinate(
        stop.latitude,
        stop.longitude,
        stop.address,
      );
      if (position) {
        mapStops.push({
          id: stop.id,
          order: stop.stop_order,
          type: "pickup",
          label: studentName,
          position,
        });
      }
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

    const schoolKey =
      child?.school_id ||
      school?.id ||
      `${schoolName}:${school?.address || stop.address || `${position.lat},${position.lng}`}`;
    const existingSchoolStop = schoolStops.get(String(schoolKey));
    if (!existingSchoolStop || stop.stop_order < existingSchoolStop.order) {
      schoolStops.set(String(schoolKey), {
        id: `school-${schoolKey}`,
        order: stop.stop_order,
        type: "school",
        label: schoolName,
        position,
      });
    }
  }

  mapStops.push(...schoolStops.values());
  for (const waypoint of route.route_waypoints || []) {
    const position = parseCoordinate(
      waypoint.latitude,
      waypoint.longitude,
      waypoint.address,
    );
    if (!position) continue;
    mapStops.push({
      id: waypoint.id,
      order: waypoint.stop_order,
      type: "waypoint",
      label: waypoint.name || waypoint.address || "Waypoint",
      position,
    });
  }

  return mapStops.sort(
    (first, second) => (first.order || 0) - (second.order || 0),
  );
};

function RouteOverviewMap({ route }) {
  const map = useMap();
  const mapStops = useMemo(() => getRouteMapStops(route), [route]);
  const endpoints = useMemo(
    () =>
      [
        parseCoordinate(
          route.start_latitude,
          route.start_longitude,
          route.start_location,
        ),
        parseCoordinate(
          route.end_latitude,
          route.end_longitude,
          route.end_location,
        ),
      ].filter(Boolean),
    [
      route.end_latitude,
      route.end_location,
      route.end_longitude,
      route.start_latitude,
      route.start_location,
      route.start_longitude,
    ],
  );
  const mapPoints = useMemo(
    () => [...mapStops.map((stop) => stop.position), ...endpoints],
    [endpoints, mapStops],
  );

  useEffect(() => {
    if (!map || !window.google?.maps || !mapPoints.length) return;
    if (mapPoints.length === 1) {
      map.setCenter(mapPoints[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    mapPoints.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, { top: 28, right: 28, bottom: 28, left: 28 });
  }, [map, mapPoints, route.id]);

  return (
    <>
      {mapStops.map((stop) => (
        <AdvancedMarker
          key={`${stop.id}-${stop.type}`}
          position={stop.position}
          title={`${stop.type === "pickup" ? "Pickup" : stop.type === "school" ? "School" : "Waypoint"}: ${stop.label}`}
        >
          <span className={`route-map-stop ${stop.type}`}>{stop.label}</span>
        </AdvancedMarker>
      ))}
      {endpoints.map((position, index) => (
        <AdvancedMarker
          key={`${route.id}-endpoint-${index}`}
          position={position}
          title={index === 0 ? "Route start" : "Route end"}
        >
          <span className="route-map-endpoint">{index === 0 ? "S" : "E"}</span>
        </AdvancedMarker>
      ))}
    </>
  );
}

const parseDurationMinutes = (duration) => {
  const match = String(duration || "").match(
    /^(?:(\d+)\s*hr(?:s)?\s*)?(\d+)\s*min(?:utes?)?$/i,
  );
  if (!match) return null;
  return Number(match[1] || 0) * 60 + Number(match[2]);
};

const getLocalDateTimeFields = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  return { date: localDate.slice(0, 10), time: localDate.slice(11, 16) };
};

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

function Routes() {
  const auth = getAuth();
  const cacheKey = `schoolRoutesCache:v4:${auth.user?.id || "current"}`;

  const normalizeRoute = useCallback((route, index) => {
    const assignments = Array.isArray(route.assignments)
      ? route.assignments
      : [];
    const activeAssignment =
      assignments.find((item) => item.is_active !== false) ||
      assignments[0] ||
      null;
    const schoolVehicleAssignment = route.school_vehicle_assignment || null;
    const driverName = activeAssignment?.drivers?.users?.name || "Not assigned";
    const vehicleName =
      activeAssignment?.vehicles?.license_plate ||
      activeAssignment?.vehicles?.name ||
      activeAssignment?.vehicles?.model ||
      schoolVehicleAssignment?.vehicle?.name ||
      schoolVehicleAssignment?.vehicle?.registration_number ||
      (activeAssignment?.vehicle_id ? "Assigned vehicle" : "Not assigned");
    const routeIsInactive =
      String(route.status || "active").toLowerCase() === "inactive";
    const status = routeIsInactive
      ? "Inactive"
      : assignments.length === 0 && !schoolVehicleAssignment
        ? "Draft"
        : activeAssignment || schoolVehicleAssignment
          ? "Active"
          : "Inactive";

    return {
      ...route,
      id: route.id || `route-${index}`,
      ownership: route.school_id ? "school" : "owner",
      ownershipLabel: route.school_id ? "School-owned" : "Owner-owned",
      code: `Route ${index + 1}`,
      name: route.route_name || `Route ${index + 1}`,
      driver: driverName,
      vehicle: vehicleName,
      students: Number(route.students || 0),
      student_ids: Array.isArray(route.student_ids) ? route.student_ids : [],
      stops: Number(route.stop_count || 0),
      start: route.start_location || "Route start",
      end: route.end_location || "Route end",
      estimatedDuration: route.estimated_duration || null,
      estimatedDistanceKm:
        route.estimated_distance_km == null
          ? null
          : Number(route.estimated_distance_km),
      route_stops: Array.isArray(route.route_stops) ? route.route_stops : [],
      route_waypoints: Array.isArray(route.route_waypoints)
        ? route.route_waypoints
        : [],
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
  const [students, setStudents] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return Array.isArray(cached?.data?.students) ? cached.data.students : [];
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
  const [schoolVehicles, setSchoolVehicles] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return Array.isArray(cached?.data?.school_vehicles)
        ? cached.data.school_vehicles
        : [];
    } catch {
      return [];
    }
  });
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [trackingStatusLoading, setTrackingStatusLoading] = useState(true);
  const [trackingStatusError, setTrackingStatusError] = useState(false);

  const loadTrackingStatus = useCallback(async () => {
    try {
      const data = await apiRequest("/school/tracking", {
        headers: { Authorization: `****** || ""}` },
      });
      setTrackingStatus(data);
      setTrackingStatusError(false);
      setTrackingStatusLoading(false);
    } catch (error) {
      console.error("Could not load route tracking status:", error);
      setTrackingStatusError(true);
      setTrackingStatusLoading(false);
    }
  }, []);

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
          setStudents(
            Array.isArray(cached.data.students) ? cached.data.students : [],
          );
          setSchoolVehicles(
            Array.isArray(cached.data.school_vehicles)
              ? cached.data.school_vehicles
              : [],
          );
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
        setStudents(
          Array.isArray(dashboard.students) ? dashboard.students : [],
        );
        setSchoolVehicles(
          Array.isArray(dashboard.school_vehicles)
            ? dashboard.school_vehicles
            : [],
        );
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
          setStudents(
            Array.isArray(cached.data.students) ? cached.data.students : [],
          );
          setSchoolVehicles(
            Array.isArray(cached.data.school_vehicles)
              ? cached.data.school_vehicles
              : [],
          );
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
    const timeout = window.setTimeout(() => {
      void loadTrackingStatus();
    }, 0);
    const interval = window.setInterval(() => {
      void loadTrackingStatus();
    }, 30_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadTrackingStatus]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_route_vehicles" },
        () => void loadRoutes(true),
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadRoutes]);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All routes");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [deletingRouteId, setDeletingRouteId] = useState(null);
  const [createRouteError, setCreateRouteError] = useState("");
  const [routeEstimate, setRouteEstimate] = useState(null);
  const [routeForm, setRouteForm] = useState(createEmptyRouteForm);

  const updateRouteForm = (event) => {
    const { name, value } = event.target;
    setRouteForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "start_location"
        ? { start_latitude: null, start_longitude: null }
        : {}),
    }));
  };

  const changeStartLocation = useCallback((value) => {
    setRouteEstimate(null);
    setRouteForm((current) => ({
      ...current,
      start_location: value,
      start_latitude: null,
      start_longitude: null,
    }));
  }, []);

  const selectStartLocation = useCallback(
    ({ address, latitude, longitude }) => {
      setRouteEstimate(null);
      setRouteForm((current) => ({
        ...current,
        start_location: address,
        start_latitude: latitude,
        start_longitude: longitude,
      }));
    },
    [],
  );
  const startPosition = useMemo(
    () => parseCoordinate(routeForm.start_latitude, routeForm.start_longitude),
    [routeForm.start_latitude, routeForm.start_longitude],
  );
  const schoolPosition = useMemo(
    () => parseCoordinate(school?.latitude, school?.longitude),
    [school],
  );
  const handleRouteEstimate = useCallback((estimate) => {
    setRouteEstimate(estimate);
  }, []);
  const availableStudents = useMemo(() => {
    const linkedStudentIds = new Set(
      routeData.flatMap((route) => route.student_ids.map(String)),
    );
    return students.filter(
      (student) =>
        !linkedStudentIds.has(String(student.id)) && !student.route_name,
    );
  }, [routeData, students]);
  const schoolVehicleOptions = useMemo(() => {
    const assignedRouteByVehicle = new Map(
      routeData
        .filter((route) => String(route.id) !== String(editingRoute?.id))
        .map((route) => [
          String(route.school_vehicle_assignment?.vehicle_id || ""),
          route.name,
        ])
        .filter(([vehicleId]) => vehicleId),
    );
    return schoolVehicles.map((vehicle) => {
      const assignedRouteName = assignedRouteByVehicle.get(String(vehicle.id));
      const unavailable = ["maintenance", "inactive"].includes(
        String(vehicle.status || "").toLowerCase(),
      );
      return {
        ...vehicle,
        disabled: unavailable || Boolean(assignedRouteName),
        statusDetail: assignedRouteName
          ? `Assigned to ${assignedRouteName}`
          : unavailable
            ? vehicle.status
            : vehicle.status === "assigned"
              ? "Assigned to a school trip"
              : "Available",
      };
    });
  }, [editingRoute, routeData, schoolVehicles]);

  const toggleRouteStudent = (studentId) => {
    setRouteForm((current) => ({
      ...current,
      children_ids: current.children_ids.includes(studentId)
        ? current.children_ids.filter((id) => id !== studentId)
        : [...current.children_ids, studentId],
    }));
  };

  const submitCreateRoute = async (event) => {
    event.preventDefault();
    setCreateRouteError("");
    if (routeForm.start_latitude == null || routeForm.start_longitude == null) {
      setCreateRouteError(
        "Search for a starting location and select a Google Maps result.",
      );
      return;
    }
    if (!schoolPosition) {
      setCreateRouteError(
        "Add the school's latitude and longitude to its profile before creating a route.",
      );
      return;
    }
    if (!routeEstimate) {
      setCreateRouteError(
        "Wait for Google Maps to calculate the driving distance and duration before creating the route.",
      );
      return;
    }
    setIsCreatingRoute(true);
    try {
      const isEditing = Boolean(editingRoute);
      await apiRequest(
        isEditing ? `/school/routes/${editingRoute.id}` : "/school/routes",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            Authorization: `****** || ""}`,
          },
          body: JSON.stringify({
            route_name: routeForm.route_name,
            start_location: routeForm.start_location,
            start_latitude: routeForm.start_latitude,
            start_longitude: routeForm.start_longitude,
            end_location: schoolPosition
              ? `${schoolPosition.lat}, ${schoolPosition.lng}`
              : "",
            estimated_distance_km: routeEstimate.estimated_distance_km,
            estimated_duration: routeEstimate.estimated_duration,
            departure_time: new Date(
              `${routeForm.departure_date}T${routeForm.departure_clock}`,
            ).toISOString(),
            pickup_start_time: routeForm.pickup_start_time,
            pickup_end_time: routeForm.pickup_end_time,
            dropoff_start_time: routeForm.dropoff_start_time,
            dropoff_end_time: routeForm.dropoff_end_time,
            ...(isEditing
              ? { school_vehicle_id: routeForm.school_vehicle_id || null }
              : { children_ids: routeForm.children_ids }),
          }),
        },
      );
      setIsCreateRouteOpen(false);
      setEditingRoute(null);
      setRouteForm(createEmptyRouteForm());
      setRouteEstimate(null);
      await loadRoutes(true);
      await loadTrackingStatus();
      if (isEditing) successMessage({ title: "School route updated" });
    } catch (error) {
      setCreateRouteError(
        error.message ||
          `Could not ${editingRoute ? "update" : "create"} the school route.`,
      );
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const openRouteEditor = (route) => {
    const departure = getLocalDateTimeFields(route.departure_time);
    setEditingRoute(route);
    setCreateRouteError("");
    setRouteEstimate(
      route.estimated_distance_km != null && route.estimated_duration
        ? {
            estimated_distance_km: Number(route.estimated_distance_km),
            estimated_duration: route.estimated_duration,
          }
        : null,
    );
    setRouteForm((current) => ({
      ...current,
      route_name: route.route_name || route.name || "",
      start_location: route.start_location || "",
      start_latitude: route.start_latitude ?? null,
      start_longitude: route.start_longitude ?? null,
      departure_date: departure.date || current.departure_date,
      departure_clock: departure.time || current.departure_clock,
      pickup_start_time: route.pickup_start_time?.slice(0, 5) || "06:45",
      pickup_end_time: route.pickup_end_time?.slice(0, 5) || "07:30",
      dropoff_start_time: route.dropoff_start_time?.slice(0, 5) || "14:00",
      dropoff_end_time: route.dropoff_end_time?.slice(0, 5) || "15:00",
      school_vehicle_id:
        route.school_vehicle_assignment?.vehicle_id || "",
    }));
    setIsCreateRouteOpen(true);
  };

  const deleteSchoolRoute = async (route) => {
    if (deletingRouteId) return;
    const confirmation = await showDeleteConfirmationAlert({
      title: `Delete "${route.name}"?`,
      text: "This permanently removes the school route, its student links, stops, and vehicle assignments.",
    });
    if (!confirmation.isConfirmed) return;

    setDeletingRouteId(route.id);
    try {
      await apiRequest(`/school/routes/${route.id}`, {
        method: "DELETE",
        headers: { Authorization: `****** || ""}` },
      });
      if (String(selectedRouteId) === String(route.id)) {
        setSelectedRouteId(null);
      }
      await loadRoutes(true);
      await loadTrackingStatus();
      successMessage({ title: "School route deleted" });
    } catch (error) {
      showErrorAlert(error.message || "Unable to delete school route.");
    } finally {
      setDeletingRouteId(null);
    }
  };

  const filteredRoutes = useMemo(
    () =>
      routeData.filter(
        (route) =>
          `${route.name} ${route.code} ${route.driver} ${route.vehicle}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (ownershipFilter === "all" || route.ownership === ownershipFilter) &&
          (tab === "All routes" ||
            route.status.toLowerCase() === tab.toLowerCase()),
      ),
    [ownershipFilter, query, routeData, tab],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRoutes = filteredRoutes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selectedRoute = useMemo(() => {
    if (!filteredRoutes.length) return null;
    return (
      filteredRoutes.find((route) => route.id === selectedRouteId) ??
      visibleRoutes[0]
    );
  }, [filteredRoutes, selectedRouteId, visibleRoutes]);

  const totalStudents =
    routeData.reduce((studentIds, route) => {
      route.student_ids.forEach((studentId) => studentIds.add(studentId));
      return studentIds;
    }, new Set()).size ||
    routeData.reduce((sum, route) => sum + Number(route.students || 0), 0);
  const activeRouteCount = routeData.filter(
    (route) => route.status === "Active",
  ).length;
  const estimatedDurations = routeData
    .map((route) => parseDurationMinutes(route.estimatedDuration))
    .filter((duration) => duration !== null);
  const averageDuration = estimatedDurations.length
    ? `${Math.round(
        estimatedDurations.reduce((sum, duration) => sum + duration, 0) /
          estimatedDurations.length,
      )} min`
    : "Not set";
  const selectedRouteTrips = (trackingStatus?.trips || []).filter(
    (trip) => String(trip.route_id) === String(selectedRoute?.id),
  );
  const selectedRouteLiveTrip =
    selectedRouteTrips.find((trip) => {
      const location = trip.location;
      return (
        trip.is_online &&
        trip.is_active_route &&
        trip.is_in_time_window &&
        parseCoordinate(location?.latitude, location?.longitude)
      );
    }) || null;
  const selectedRouteTrackingTrip =
    selectedRouteLiveTrip || selectedRouteTrips[0] || null;
  const canShowSelectedRouteMap = Boolean(
    GOOGLE_MAPS_API_KEY && selectedRouteLiveTrip,
  );
  const routeMapPlaceholder = trackingStatusLoading
    ? "Checking the route's live tracking status..."
    : trackingStatusError
      ? "Live tracking status is unavailable. Try again shortly."
      : !selectedRouteTrips.length
        ? "The map will appear when this route has an assigned driver who starts an active trip during its scheduled tracking window."
        : !selectedRouteTrackingTrip.is_in_time_window
          ? "This route is outside its scheduled tracking window. The map will be available during the route window."
          : !selectedRouteTrackingTrip.is_online ||
              !selectedRouteTrackingTrip.is_active_route
            ? "The map is hidden while the assigned vehicle or driver is offline."
            : "Waiting for a current GPS location from the assigned vehicle.";
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
        <SchoolPageHeader
          className="routes-heading"
          actionsClassName="routes-actions"
          eyebrow="TRANSPORT NETWORK"
          titleIcon={<span className="school-page-heading-icon"><FiMapPin /></span>}
          title="Routes"
          description="Plan, manage, and monitor school transport routes."
          actions={
            <>
              <button
                className="route-primary"
                onClick={() => {
                  setCreateRouteError("");
                  setEditingRoute(null);
                  setRouteEstimate(null);
                  setRouteForm(createEmptyRouteForm());
                  setIsCreateRouteOpen(true);
                }}
              >
                <FiPlus /> Add route
              </button>
            </>
          }
        />
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
              <strong>{averageDuration}</strong>
              <em>
                {estimatedDurations.length} of {routeData.length} routes
                estimated
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
                  onClick={() => {
                    setTab(item);
                    setPage(1);
                  }}
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
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search routes, drivers, or vehicles"
                />
              </label>
              <button>
                <FiNavigation /> Sort by
              </button>
              <label className="route-filter-select">
                <span>Ownership</span>
                <select
                  aria-label="Filter routes by ownership"
                  value={ownershipFilter}
                  onChange={(event) => {
                    setOwnershipFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All routes</option>
                  <option value="school">School-owned</option>
                  <option value="owner">Owner-owned</option>
                </select>
              </label>
            </div>
            <div className="route-list">
              <div className="route-list-header">
                <span>Route</span>
                <span>Start → End</span>
                <span>Students</span>
                <span>Stops</span>
                <span>Vehicle</span>
                <span>Ownership</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {visibleRoutes.map((route) => (
                <div
                  className={`route-card ${selectedRoute?.id === route.id ? "selected" : ""}`}
                  key={route.id}
                  role="group"
                  tabIndex={0}
                  aria-label={route.name}
                  onClick={() => setSelectedRouteId(route.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRouteId(route.id);
                    }
                  }}
                >
                  <div className="route-card-route">
                    <span className={`route-card-icon ${route.tone}`}>
                      <strong>{route.name.charAt(0)}</strong>
                    </span>
                    <div className="route-card-main">
                      <strong>R - {route.id.slice(0, 8)}</strong>
                      <small>{route.name}</small>
                    </div>
                  </div>
                  <div className="route-card-direction">
                    <strong>{route.start}</strong>
                    <small>
                      →{" "}
                      {route.ownership === "school"
                        ? school?.name || route.end
                        : route.end}
                    </small>
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
                    className={`route-ownership-chip ${route.ownership}`}
                    title={
                      route.ownership === "school"
                        ? `Owned by ${school?.name || "this school"}`
                        : "Owned by a transport owner"
                    }
                  >
                    {route.ownershipLabel}
                  </span>
                  <span
                    className={`route-status ${route.status.toLowerCase()}`}
                    title={
                      route.status === "Draft"
                        ? "This route is in draft because no vehicle or driver has been assigned yet."
                        : undefined
                    }
                  >
                    <i />
                    {route.status}
                  </span>
                  <div className="route-card-actions">
                    {route.ownership === "school" ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Edit ${route.name}`}
                          title="Edit route"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRouteEditor(route);
                          }}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${route.name}`}
                          title="Delete route"
                          disabled={deletingRouteId === route.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteSchoolRoute(route);
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    ) : (
                      <span aria-label="Actions unavailable">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filteredRoutes.length === 0 && (
              <div className="empty-routes">No routes match your search.</div>
            )}
            <div className="routes-footer">
              <span>
                Showing{" "}
                {filteredRoutes.length ? (currentPage - 1) * pageSize + 1 : 0}{" "}
                to {Math.min(currentPage * pageSize, filteredRoutes.length)} of{" "}
                {filteredRoutes.length} routes
              </span>
              <div aria-label="Routes pagination">
                <button
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      className={
                        currentPage === pageNumber ? "current-page" : ""
                      }
                      aria-current={
                        currentPage === pageNumber ? "page" : undefined
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
                <button
                  aria-label="Next page"
                  disabled={currentPage === pageCount}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                >
                  ›
                </button>
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
                {canShowSelectedRouteMap ? (
                  <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      className="route-google-map"
                      style={{ width: "100%", height: "100%" }}
                      defaultCenter={DEFAULT_MAP_CENTER}
                      defaultZoom={12}
                      mapId="school-routes-overview-map"
                      clickableIcons={false}
                      gestureHandling="greedy"
                      zoomControl
                      fullscreenControl
                      mapTypeControl
                      streetViewControl={false}
                    >
                      <RouteOverviewMap route={selectedRoute} />
                    </GoogleMap>
                  </APIProvider>
                ) : (
                  <div className="route-map-message">
                    {!GOOGLE_MAPS_API_KEY
                      ? "Google Maps is unavailable. Configure the Maps API key to view route stops."
                      : routeMapPlaceholder}
                  </div>
                )}
              </div>
              <div className="route-map-summary">
                {canShowSelectedRouteMap ? (
                  <>
                    <strong>
                      {getRouteMapStops(selectedRoute).length} mapped locations
                    </strong>
                    <span>
                      Pickups are named by student; all drop-offs share one
                      school marker.
                    </span>
                  </>
                ) : (
                  <>
                    <strong>Live route map unavailable</strong>
                    <span>{routeMapPlaceholder}</span>
                  </>
                )}
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
                  <dd>{selectedRoute.estimatedDuration || "Not set"}</dd>
                  <dt>Distance</dt>
                  <dd>
                    {selectedRoute.estimatedDistanceKm !== null
                      ? `${selectedRoute.estimatedDistanceKm.toFixed(1)} km`
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
              </div>
            </aside>
          )}
        </section>
      </div>
      {isCreateRouteOpen ? (
        <div className="route-create-backdrop">
          <section
            className="route-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-route-title"
          >
            <header>
              <div>
                <h2 id="create-route-title">
                  {editingRoute ? "Edit school route" : "Add a school route"}
                </h2>
                <p>
                  This route will belong to {school?.name || "your school"}.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={isCreatingRoute}
                onClick={() => {
                  setIsCreateRouteOpen(false);
                  setEditingRoute(null);
                }}
              >
                ×
              </button>
            </header>
            <RouteCreateMaps>
              <form onSubmit={submitCreateRoute}>
                <div className="route-create-fields">
                  <label>
                    Route name
                    <input
                      name="route_name"
                      value={routeForm.route_name}
                      onChange={updateRouteForm}
                      maxLength={120}
                      required
                      autoFocus
                    />
                  </label>
                  <label>
                    Starting location
                    {GOOGLE_MAPS_API_KEY ? (
                      <RouteStartLocationField
                        value={routeForm.start_location}
                        onChange={changeStartLocation}
                        onPlaceSelected={selectStartLocation}
                      />
                    ) : (
                      <input
                        name="start_location"
                        value={routeForm.start_location}
                        onChange={updateRouteForm}
                        required
                      />
                    )}
                  </label>
                  <label>
                    Destination
                    <input
                      value={school?.name || ""}
                      placeholder="School name unavailable"
                      title={
                        schoolPosition
                          ? `${schoolPosition.lat}, ${schoolPosition.lng}`
                          : "School destination"
                      }
                      disabled
                      readOnly
                    />
                  </label>
                  {editingRoute ? (
                    <label>
                      Assign school vehicle (optional)
                      <select
                        name="school_vehicle_id"
                        value={routeForm.school_vehicle_id}
                        onChange={updateRouteForm}
                      >
                        <option value="">No vehicle assigned</option>
                        {schoolVehicleOptions.map((vehicle) => (
                          <option
                            key={vehicle.id}
                            value={vehicle.id}
                            disabled={vehicle.disabled}
                          >
                            {vehicle.name} · {vehicle.registration_number} (
                            {vehicle.statusDetail})
                          </option>
                        ))}
                      </select>
                      {!schoolVehicles.length ? (
                        <small>
                          Add a vehicle under School Trips → School vehicles
                          before assigning one to this route.
                        </small>
                      ) : null}
                    </label>
                  ) : null}
                  <label>
                    Departure date
                    <input
                      name="departure_date"
                      type="date"
                      value={routeForm.departure_date}
                      onChange={updateRouteForm}
                      required
                    />
                  </label>
                  <label>
                    Departure time
                    <input
                      name="departure_clock"
                      type="time"
                      value={routeForm.departure_clock}
                      onChange={updateRouteForm}
                      required
                    />
                  </label>
                  <label>
                    Pickup window starts
                    <input
                      name="pickup_start_time"
                      type="time"
                      value={routeForm.pickup_start_time}
                      onChange={updateRouteForm}
                      required
                    />
                  </label>
                  <label>
                    Pickup window ends
                    <input
                      name="pickup_end_time"
                      type="time"
                      value={routeForm.pickup_end_time}
                      onChange={updateRouteForm}
                      required
                    />
                  </label>
                  <label>
                    Drop-off window starts
                    <input
                      name="dropoff_start_time"
                      type="time"
                      value={routeForm.dropoff_start_time}
                      onChange={updateRouteForm}
                      required
                    />
                  </label>
                  <label>
                    Drop-off window ends
                    <input
                      name="dropoff_end_time"
                      type="time"
                      value={routeForm.dropoff_end_time}
                      onChange={updateRouteForm}
                      required
                    />
                  </label>
                </div>
                {GOOGLE_MAPS_API_KEY ? (
                  <div className="route-create-map">
                    <GoogleMap
                      style={{ width: "100%", height: "100%" }}
                      defaultCenter={schoolPosition || DEFAULT_MAP_CENTER}
                      defaultZoom={schoolPosition ? 12 : 6}
                      mapId="school-route-create-map"
                      clickableIcons={false}
                      gestureHandling="greedy"
                    >
                      <RouteCreateMap
                        startPosition={startPosition}
                        schoolPosition={schoolPosition}
                        onEstimate={handleRouteEstimate}
                      />
                    </GoogleMap>
                  </div>
                ) : (
                  <p className="route-create-map-message" role="status">
                    Google Maps is unavailable. Configure the Maps API key to
                    search for a starting location and preview the route.
                  </p>
                )}
                {GOOGLE_MAPS_API_KEY ? (
                  <p className="route-create-map-message" role="status">
                    {routeEstimate
                      ? `Driving estimate: ${routeEstimate.estimated_distance_km} km · ${routeEstimate.estimated_duration}`
                      : startPosition && schoolPosition
                        ? "Calculating driving distance and duration..."
                        : "Select a starting location to calculate the driving estimate."}
                  </p>
                ) : null}
                {editingRoute ? (
                  <p className="route-create-ownership">
                    Existing student and vehicle assignments will be kept.
                  </p>
                ) : (
                  <fieldset className="route-create-students">
                    <legend>Students on this route (optional)</legend>
                    {availableStudents.length ? (
                      availableStudents.map((student) => (
                        <label key={student.id}>
                          <input
                            type="checkbox"
                            checked={routeForm.children_ids.includes(
                              student.id,
                            )}
                            onChange={() => toggleRouteStudent(student.id)}
                          />
                          <span>
                            {[student.name, student.lastname]
                              .filter(Boolean)
                              .join(" ")}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p>
                        {students.length
                          ? "All students are already linked to a route or vehicle."
                          : "Add students to the school before assigning them to a route."}
                      </p>
                    )}
                  </fieldset>
                )}
                <p className="route-create-ownership">
                  {editingRoute
                    ? "The route will remain owned by the school."
                    : "The route is recorded under the school and is not owned by a transport owner."}
                </p>
                {createRouteError ? (
                  <p className="route-create-error" role="alert">
                    {createRouteError}
                  </p>
                ) : null}
                <footer>
                  <button
                    type="button"
                    className="route-create-cancel"
                    disabled={isCreatingRoute}
                    onClick={() => {
                      setIsCreateRouteOpen(false);
                      setEditingRoute(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="route-create-submit"
                    disabled={isCreatingRoute}
                  >
                    {isCreatingRoute
                      ? editingRoute
                        ? "Saving..."
                        : "Creating..."
                      : editingRoute
                        ? "Save changes"
                        : "Create school route"}
                  </button>
                </footer>
              </form>
            </RouteCreateMaps>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default Routes;
