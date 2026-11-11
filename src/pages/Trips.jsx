import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiLoader,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  showDeleteConfirmationAlert,
  successMessage,
  showErrorAlert,
} from "../components/sweetAlert.js";
import "../styles/trips.css";
import SchoolPageHeader from "../components/SchoolPageHeader";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const isFreshTracking = (tracking) => {
  const recordedAt = new Date(tracking?.recorded_at || "").getTime();
  const age = Date.now() - recordedAt;
  return Number.isFinite(recordedAt) && age >= 0 && age <= 120_000;
};
const journeyPhaseLabel = (phase) =>
  ({
    outbound: "Outbound",
    at_destination: "At destination · sharing paused",
    returning: "Returning",
    completed: "Vehicle returned",
  })[phase] || "Outbound";

const categories = [
  ["educational", "Educational"],
  ["sports", "Sports"],
  ["cultural", "Cultural"],
  ["competition", "Competition"],
  ["excursion", "Excursion"],
  ["school_camp", "School camp"],
  ["field_trip", "Field trip"],
  ["other", "Other"],
];
const statuses = [
  "draft",
  "registration_open",
  "confirmed",
  "preparing",
  "in_progress",
  "completed",
  "cancelled",
  "missed",
];
const tripStatusTransitions = {
  draft: ["draft", "registration_open", "cancelled"],
  registration_open: [
    "registration_open",
    "confirmed",
    "cancelled",
  ],
  confirmed: ["confirmed", "preparing", "cancelled"],
  preparing: ["preparing", "cancelled"],
  in_progress: ["in_progress"],
  completed: ["completed"],
  cancelled: ["cancelled"],
  missed: ["missed"],
};
const availableTripStatuses = (status) =>
  tripStatusTransitions[status] || [status];
const pageSize = 6;
const emptyTrip = {
  name: "",
  description: "",
  category: "educational",
  destination: "",
  destination_address: "",
  destination_latitude: "",
  destination_longitude: "",
  departure_at: "",
  return_at: "",
  registration_closes_at: "",
  target_grade: "all",
  status: "draft",
  is_free: false,
  price: "",
  deposit: "",
  currency: "ZAR",
  payment_deadline: "",
  payment_notes: "",
  minimum_learners: "1",
  maximum_learners: "",
  emergency_contact: "",
  emergency_notes: "",
};
const emptyVehicle = {
  registration_number: "",
  name: "",
  vehicle_type: "bus",
  make: "",
  model: "",
  year: "",
  colour: "",
  passenger_capacity: "50",
  vin: "",
  license_expiry: "",
  roadworthy_expiry: "",
  insurance_expiry: "",
  preparing: ["draft", "preparing", "confirmed", "cancelled"],
};
const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};
const readTripsCache = (cacheKey) => {
  try {
    const data = JSON.parse(localStorage.getItem(cacheKey) || "null")?.data;
    return Array.isArray(data?.trips) && data?.resources ? data : null;
  } catch {
    return null;
  }
};
const readAssignedTripsCache = (cacheKey) => {
  try {
    const data = JSON.parse(localStorage.getItem(cacheKey) || "null")?.data;
    return Array.isArray(data?.trips) ? data.trips : null;
  } catch {
    return null;
  }
};
const localDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const displayDate = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not set";
const fullName = (member) =>
  [member?.first_name, member?.last_name].filter(Boolean).join(" ") ||
  "Not assigned";
const tripEditSignature = (form, vehicleIds, assignments) =>
  JSON.stringify({
    form: Object.fromEntries(
      Object.entries(form)
        .filter(
          ([key]) =>
            ![
              "id",
              "school_id",
              "created_by",
              "created_at",
              "updated_at",
              "published_at",
              "vehicles",
              "learners",
              "registered_count",
            ].includes(key),
        )
        .sort(([first], [second]) => first.localeCompare(second)),
    ),
    vehicleIds: [...vehicleIds].sort(),
    assignments: Object.fromEntries(
      Object.entries(assignments).sort(([first], [second]) =>
        first.localeCompare(second),
      ),
    ),
  });
const money = (trip) =>
  trip.is_free
    ? "Free"
    : `${trip.currency || "ZAR"} ${Number(trip.price || 0).toFixed(2)}`;
const cashRequestLabel = (trip, learner) => {
  const requestType =
    learner.cash_payment_request === "deposit"
      ? "deposit"
      : learner.payment_status === "deposit_paid"
        ? "balance"
        : "full amount";
  const amount =
    learner.cash_payment_amount != null
      ? Number(learner.cash_payment_amount)
      : requestType === "deposit"
        ? Number(trip.deposit || 0)
        : requestType === "balance"
          ? Math.max(0, Number(trip.price || 0) - Number(trip.deposit || 0))
          : Number(trip.price || 0);
  return `${requestType} ${trip.currency || "ZAR"} ${amount.toFixed(2)}`;
};
const tripSeatCapacity = (trip) =>
  (trip.vehicles || []).reduce(
    (total, assignment) =>
      total + Number(assignment.vehicle?.passenger_capacity || 0),
    0,
  );
const tripSeatRequirement = (trip) =>
  Number(trip.minimum_learners || 0);

const tripNeedsMoreVehicles = (trip) =>
  tripSeatRequirement(trip) > tripSeatCapacity(trip);
const registrationDeadlinePassed = (trip, now = Date.now()) => {
  if (
    trip.status !== "registration_open" ||
    !trip.registration_closes_at
  ) {
    return false;
  }
  const deadline = new Date(trip.registration_closes_at).getTime();
  return Number.isFinite(deadline) && deadline <= now;
};
const registrationState = (trip, now = Date.now()) => {
  if (trip.status === "draft") return "Not published";
  if (trip.status !== "registration_open") return "Closed";
  if (registrationDeadlinePassed(trip, now)) return "Closed";
  return "Open";
};

function TripPlaceNameField({
  tripForm,
  setTripForm,
  onPlaceSelected,
  onPlaceSearchChanged,
}) {
  const inputRef = useRef(null);
  const placesLibrary = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLibrary || !inputRef.current) return undefined;

    const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
      fields: ["name", "formatted_address", "geometry"],
      componentRestrictions: { country: "za" },
    });
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) return;

      const name = place.name || place.formatted_address || "";
      setTripForm((current) => ({
        ...current,
        name,
        destination: name,
        destination_address: place.formatted_address || name,
        destination_latitude: location.lat(),
        destination_longitude: location.lng(),
      }));
      onPlaceSelected();
    });

    return () => listener.remove();
  }, [onPlaceSelected, placesLibrary, setTripForm]);

  return (
    <label>
      Trip name
      <input
        ref={inputRef}
        required
        value={tripForm.name}
        onChange={(event) => {
          onPlaceSearchChanged();
          setTripForm((current) => ({ ...current, name: event.target.value }));
        }}
        placeholder="Search for a trip destination"
        autoComplete="off"
      />
      <small className="trip-field-hint">
        Search Google Places and select a result to fill in the destination.
      </small>
    </label>
  );
}

function TripPlaceNameInput({
  tripForm,
  setTripForm,
  onPlaceSelected,
  onPlaceSearchChanged,
}) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <label>
        Trip name
        <input
          required
          value={tripForm.name}
          onChange={(event) => {
            onPlaceSearchChanged();
            setTripForm((current) => ({
              ...current,
              name: event.target.value,
            }));
          }}
          placeholder="Trip name"
        />
      </label>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <TripPlaceNameField
        tripForm={tripForm}
        setTripForm={setTripForm}
        onPlaceSelected={onPlaceSelected}
        onPlaceSearchChanged={onPlaceSearchChanged}
      />
    </APIProvider>
  );
}

function TripDestinationPicker({ tripForm, setTripForm, locked }) {
  const latitude = Number(tripForm.destination_latitude);
  const longitude = Number(tripForm.destination_longitude);
  const selectedLocation =
    tripForm.destination_latitude !== "" &&
    tripForm.destination_longitude !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
      ? { lat: latitude, lng: longitude }
      : null;
  const setLocation = async (coordinates) => {
    if (locked) return;
    setTripForm((current) => ({
      ...current,
      destination_latitude: coordinates.lat,
      destination_longitude: coordinates.lng,
    }));
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coordinates.lat}&longitude=${coordinates.lng}&localityLanguage=en`,
      );
      const data = await response.json();
      const address =
        data.localityInfo?.administrative?.[2]?.name ||
        data.city ||
        data.locality ||
        `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
      setTripForm((current) => ({
        ...current,
        destination_address: address,
      }));
    } catch {
      // Keep the selected coordinates even if reverse geocoding is unavailable.
    }
  };

  if (!GOOGLE_MAPS_API_KEY) return null;

  return (
    <div
      className={`trip-form-full trip-destination-map-wrap${locked ? " is-locked" : ""}`}
    >
      <div className="trip-destination-map-heading">
        <strong>{tripForm.destination || "Choose destination on map"}</strong>
        <span>
          {selectedLocation ? "Location selected" : "Select a map point"}
        </span>
      </div>
      <div className="trip-destination-map">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
          <GoogleMap
            center={selectedLocation || { lat: -25.7479, lng: 28.2293 }}
            zoom={selectedLocation ? 14 : 6}
            gestureHandling={locked ? "none" : "auto"}
            keyboardShortcuts={!locked}
            disableDefaultUI={locked}
            mapId="school-trip-destination-map"
            onClick={(event) => {
              const location = event.detail?.latLng;
              if (location && !locked) {
                void setLocation({ lat: location.lat, lng: location.lng });
              }
            }}
          >
            {selectedLocation && (
              <AdvancedMarker
                position={selectedLocation}
                title={tripForm.destination || "Trip destination"}
              />
            )}
          </GoogleMap>
        </APIProvider>
      </div>
      <small>
        {locked
          ? "Destination locked from the selected Google Places result. Change the trip name search to choose a different place."
          : tripForm.destination_address ||
            "Click the map to set the destination address and coordinates."}
        {selectedLocation &&
          ` · ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
      </small>
    </div>
  );
}

function TripLiveMap({ trip }) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const livePoints = (trip.vehicles || [])
    .filter(
      (assignment) =>
        ["outbound", "returning"].includes(assignment.journey_phase) &&
        isFreshTracking(assignment.tracking) &&
        Number.isFinite(Number(assignment.tracking?.latitude)) &&
        Number.isFinite(Number(assignment.tracking?.longitude)),
    )
    .map((assignment) => ({
      id: assignment.id,
      position: {
        lat: Number(assignment.tracking.latitude),
        lng: Number(assignment.tracking.longitude),
      },
      title: assignment.vehicle?.name || "School trip vehicle",
    }));
  const destination =
    trip.destination_latitude != null && trip.destination_longitude != null
      ? {
          lat: Number(trip.destination_latitude),
          lng: Number(trip.destination_longitude),
        }
      : null;
  if (!livePoints.length && !destination) return null;
  const center = livePoints[0]?.position || destination;

  return (
    <div className="trip-live-map-wrap">
      <h3>Live vehicle locations</h3>
      <div className="trip-live-map">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
          <GoogleMap
            center={center}
            defaultZoom={11}
            mapId="school-trip-live-map"
          >
            {livePoints.map((point) => (
              <AdvancedMarker
                key={point.id}
                position={point.position}
                title={point.title}
              />
            ))}
            {destination && (
              <AdvancedMarker position={destination} title={trip.destination} />
            )}
          </GoogleMap>
        </APIProvider>
      </div>
      {!livePoints.length && (
        <p className="trip-live-map-note">
          No current GPS location is available. Showing the destination only.
        </p>
      )}
    </div>
  );
}

function SchoolVehicleCard({ vehicle, onEdit }) {
  const photos = Array.isArray(vehicle.photos)
    ? vehicle.photos
        .map((photo) => (typeof photo === "string" ? photo : photo?.url))
        .filter(Boolean)
    : [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const changePhoto = (direction) => {
    setPhotoIndex(
      (current) => (current + direction + photos.length) % photos.length,
    );
    setImageFailed(false);
  };

  return (
    <article className="school-vehicle-card">
      <div className="school-vehicle-photo">
        {photos.length > 0 && !imageFailed ? (
          <img
            src={photos[photoIndex]}
            alt={`${vehicle.name} photo ${photoIndex + 1}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="school-vehicle-photo-placeholder" aria-hidden="true">
            <FiTruck />
            <span>No vehicle photo</span>
          </div>
        )}
        <span className={`trip-status trip-status-${vehicle.status}`}>
          {vehicle.status}
        </span>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="school-vehicle-photo-nav previous"
              aria-label={`Previous photo of ${vehicle.name}`}
              onClick={() => changePhoto(-1)}
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="school-vehicle-photo-nav next"
              aria-label={`Next photo of ${vehicle.name}`}
              onClick={() => changePhoto(1)}
            >
              <FiChevronRight />
            </button>
            <span className="school-vehicle-photo-count">
              {photoIndex + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      <div className="school-vehicle-card-content">
        <div className="school-vehicle-card-heading">
          <div>
            <strong>{vehicle.name}</strong>
            <small>{vehicle.registration_number}</small>
          </div>
          <span className="school-vehicle-type">{vehicle.vehicle_type}</span>
        </div>
        <div className="school-vehicle-card-footer">
          <span>
            <FiUsers aria-hidden="true" /> {vehicle.passenger_capacity} seats
          </span>
          <button type="button" className="trip-secondary" onClick={onEdit}>
            <FiEdit2 /> Edit vehicle
          </button>
        </div>
      </div>
    </article>
  );
}

function DriverTrips() {
  const auth = getAuth();
  const userId = auth.user?.id || "";
  const cacheKey = `schoolAssignedTripsCache:${userId || "current"}`;
  const initialTrips = readAssignedTripsCache(cacheKey);
  const [trips, setTrips] = useState(initialTrips || []);
  const [loading, setLoading] = useState(!initialTrips);
  const [error, setError] = useState("");

  const loadTrips = useCallback(
    async (isActive = () => true) => {
      if (!auth.token) {
        if (isActive()) setLoading(false);
        return;
      }
      try {
        const data = await apiRequest("/school/trips", {
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        });
        if (!isActive()) return;
        const nextTrips = Array.isArray(data) ? data : [];
        setTrips(nextTrips);
        setError("");
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: { trips: nextTrips },
              timestamp: Date.now(),
            }),
          );
        } catch (cacheError) {
          console.error("Could not cache assigned school trips:", cacheError);
        }
      } catch (requestError) {
        if (isActive()) {
          setError(requestError.message || "Could not load assigned trips.");
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [auth.token, cacheKey],
  );

  useEffect(() => {
    let active = true;
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(
        () => void loadTrips(() => active),
        250,
      );
    };
    const initialLoadTimeout = window.setTimeout(
      () => void loadTrips(() => active),
      0,
    );
    const channel =
      supabaseClient && userId
        ? supabaseClient
            .channel(`school-assigned-trips:${userId}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "school_trips" },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "school_trip_vehicles" },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "school_trip_tracking" },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "school_trip_learners" },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "school_vehicles" },
              scheduleRefresh,
            )
            .subscribe((status) => {
              if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.warn(
                  "Assigned school trips realtime unavailable:",
                  status,
                );
              }
            })
        : null;
    return () => {
      active = false;
      window.clearTimeout(initialLoadTimeout);
      window.clearTimeout(refreshTimeout);
      if (channel) void supabaseClient.removeChannel(channel);
    };
  }, [loadTrips, userId]);

  return (
    <div className="portal-content">
      <SchoolPageHeader
        eyebrow="TRANSPORT"
        titleIcon={<span className="school-page-heading-icon"><FiTruck /></span>}
        title="My assigned trips"
        description="Your trip schedule, assigned vehicle and journey status."
      />
      {loading ? (
        <div className="driver-trips-loading" role="status">
          <FiLoader aria-hidden="true" />
          <span>Loading your assigned trips...</span>
        </div>
      ) : null}
      {error ? (
        <div className="driver-trips-message driver-trips-error" role="alert">
          <FiAlertCircle aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      {!loading && !error && trips.length === 0 ? (
        <section className="driver-trips-empty">
          <span className="driver-trips-empty-icon">
            <FiTruck aria-hidden="true" />
          </span>
          <h2>No trips assigned yet</h2>
          <p>
            Trips assigned to you by your school will appear here with their
            schedule and vehicle details.
          </p>
        </section>
      ) : null}
      <div className="driver-trips-list">
        {trips.map((trip) => {
          const assignment =
            (trip.vehicles || []).find(
              (item) =>
                item.driver_admin_id === auth.user?.admin_profile?.id ||
                item.driver?.user_id === auth.user?.id,
            ) || (trip.vehicles || [])[0];
          const status = (trip.status || "scheduled").replaceAll("_", " ");
          const phase = assignment?.journey_phase;
          const vehicle = assignment?.vehicle;
          return (
            <article
              key={trip.id}
              className={`driver-trip-card${trip.status === "in_progress" ? " is-live" : ""}`}
            >
              <header className="driver-trip-card-header">
                <div className="driver-trip-card-title">
                  <span className="driver-trip-card-icon">
                    <FiTruck aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{trip.name || "School trip"}</h2>
                    <p>
                      {trip.category?.replaceAll("_", " ") || "School trip"}
                    </p>
                  </div>
                </div>
                <div className="driver-trip-badges">
                  <span
                    className={`driver-trip-status status-${(trip.status || "scheduled").replaceAll("_", "-")}`}
                  >
                    {trip.status === "in_progress" ? (
                      <span
                        className="driver-trip-live-dot"
                        aria-hidden="true"
                      />
                    ) : null}
                    {status}
                  </span>
                  {phase ? (
                    <span className={`driver-trip-phase phase-${phase}`}>
                      {journeyPhaseLabel(phase)}
                    </span>
                  ) : null}
                </div>
              </header>
              <div className="driver-trip-destination">
                <FiMapPin aria-hidden="true" />
                <div>
                  <small>Destination</small>
                  <strong>
                    {trip.destination_address || trip.destination || "Not set"}
                  </strong>
                </div>
              </div>
              <div className="driver-trip-details">
                <div className="driver-trip-detail">
                  <FiCalendar aria-hidden="true" />
                  <div>
                    <small>Departure</small>
                    <strong>{displayDate(trip.departure_at)}</strong>
                  </div>
                </div>
                <div className="driver-trip-detail">
                  <FiCalendar aria-hidden="true" />
                  <div>
                    <small>Return</small>
                    <strong>{displayDate(trip.return_at)}</strong>
                  </div>
                </div>
              </div>
              <footer className="driver-trip-vehicle">
                <span className="driver-trip-vehicle-icon">
                  <FiTruck aria-hidden="true" />
                </span>
                <div>
                  <small>Assigned vehicle</small>
                  <strong>
                    {vehicle?.name ||
                      vehicle?.registration_number ||
                      "Vehicle not assigned"}
                  </strong>
                  {vehicle?.registration_number && vehicle.name ? (
                    <span>{vehicle.registration_number}</span>
                  ) : null}
                </div>
                {vehicle?.passenger_capacity ? (
                  <span className="driver-trip-capacity">
                    <FiUsers aria-hidden="true" />
                    {vehicle.passenger_capacity} seats
                  </span>
                ) : null}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function Trips() {
  const auth = getAuth();
  const cachedAdmin = (() => {
    try {
      const key = `schoolProfileCache:${auth.user?.id || "current"}`;
      return JSON.parse(localStorage.getItem(key) || "null")?.data
        ?.admin_profile;
    } catch {
      return null;
    }
  })();
  const role =
    auth.user?.admin_profile?.role ||
    auth.admin_profile?.role ||
    cachedAdmin?.role;
  if (role === "driver") return <DriverTrips />;
  return <AdminTrips />;
}

function AdminTrips() {
  const auth = getAuth();
  const canDeleteTrips = ["full", "management"].includes(
    auth.user?.admin_profile?.access_level || auth.admin_profile?.access_level,
  );
  const cacheKey = `schoolTripsCache:${auth.user?.id || "current"}`;
  const initialCache = readTripsCache(cacheKey);
  const [trips, setTrips] = useState(initialCache?.trips || []);
  const [resources, setResources] = useState(
    initialCache?.resources || { vehicles: [], learners: [], staff: [] },
  );
  const [loading, setLoading] = useState(!initialCache);
  const [currentTime, setCurrentTime] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState(null);
  const [updatingTripStatuses, setUpdatingTripStatuses] = useState({});
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [tripForm, setTripForm] = useState(emptyTrip);
  const [tripEditBaseline, setTripEditBaseline] = useState(null);
  const [destinationLocked, setDestinationLocked] = useState(false);
  const handlePlaceSelected = useCallback(() => {
    setDestinationLocked(true);
  }, []);
  const handlePlaceSearchChanged = useCallback(() => {
    if (!destinationLocked || editingTrip) return;
    setDestinationLocked(false);
    setTripForm((current) => ({
      ...current,
      destination: "",
      destination_address: "",
      destination_latitude: "",
      destination_longitude: "",
    }));
  }, [destinationLocked, editingTrip]);
  const [learnerAssignments, setLearnerAssignments] = useState({});
  const [learnerVehicleChoice, setLearnerVehicleChoice] = useState([]);
  const hasTripEdits =
    Boolean(editingTrip) &&
    tripEditSignature(tripForm, learnerVehicleChoice, learnerAssignments) !==
      tripEditBaseline;
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleAssets, setVehicleAssets] = useState({
    photos: [],
    documents: [],
  });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [sharingAssignment, setSharingAssignment] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const locationWatchRef = useRef(null);
  const trackingIntervalRef = useRef(null);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const headers = { Authorization: `Bearer ${auth.token || ""}` };
      const [tripData, resourceData] = await Promise.all([
        apiRequest("/school/trips", { headers }),
        apiRequest("/school/trips/resources", { headers }),
      ]);
      const nextTrips = Array.isArray(tripData) ? tripData : [];
      const nextResources = {
        vehicles: Array.isArray(resourceData.vehicles)
          ? resourceData.vehicles
          : [],
        learners: Array.isArray(resourceData.learners)
          ? resourceData.learners
          : [],
        staff: Array.isArray(resourceData.staff) ? resourceData.staff : [],
      };
      setTrips(nextTrips);
      setResources(nextResources);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: { trips: nextTrips, resources: nextResources },
          timestamp: Date.now(),
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to load school trips.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (!supabaseClient || !auth.user?.id) return undefined;
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => void loadData(), 200);
    };
    const channel = supabaseClient
      .channel(`school-trips:${auth.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_trips" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_trip_vehicles" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_trip_learners" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_vehicles" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_trip_tracking" },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("School trips realtime unavailable:", status);
        }
      });

    return () => {
      window.clearTimeout(refreshTimeout);
      void supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadData]);

  useEffect(() => {
    const initialTimeTimeout = window.setTimeout(
      () => setCurrentTime(Date.now()),
      0,
    );
    const clockInterval = window.setInterval(
      () => setCurrentTime(Date.now()),
      60_000,
    );
    return () => {
      window.clearTimeout(initialTimeTimeout);
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(
    () => () => {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
      if (trackingIntervalRef.current !== null) {
        window.clearInterval(trackingIntervalRef.current);
      }
    },
    [],
  );

  const startTrip = (trip = null) => {
    setError("");
    if (!trip && resources.learners.length === 0) {
      showErrorAlert(
        "Add at least one student to your school before creating a trip.",
      );
      return;
    }
    setDestinationLocked(Boolean(trip));
    setEditingTrip(trip);
    if (!trip) {
      setTripForm(emptyTrip);
      setLearnerAssignments({});
      setLearnerVehicleChoice([]);
      setTripEditBaseline(null);
      setModal("trip");
      return;
    }
    const nextTripForm = {
      ...emptyTrip,
      ...trip,
      target_grade: trip.target_grade || "all",
      departure_at: localDateTime(trip.departure_at),
      return_at: localDateTime(trip.return_at),
      registration_closes_at: localDateTime(trip.registration_closes_at),
      destination_latitude: trip.destination_latitude ?? "",
      destination_longitude: trip.destination_longitude ?? "",
      price: trip.price ?? "",
      deposit: trip.deposit ?? "",
      maximum_learners: trip.maximum_learners ?? "",
    };
    const learnerVehicles = {};
    (trip.vehicles || []).forEach((assignment) => {
      learnerVehicles[`__driver_${assignment.vehicle_id}`] =
        assignment.driver_admin_id || "";
      learnerVehicles[`__coordinator_${assignment.vehicle_id}`] =
        assignment.coordinator_admin_id || "";
    });
    setLearnerAssignments(learnerVehicles);
    const existingVehicleIds = (trip.vehicles || []).map(
      (assignment) => assignment.vehicle_id,
    );
    setTripForm(nextTripForm);
    setLearnerVehicleChoice(existingVehicleIds);
    setTripEditBaseline(
      tripEditSignature(nextTripForm, existingVehicleIds, learnerVehicles),
    );
    setModal("trip");
  };

  const grades = useMemo(
    () =>
      [
        ...new Set(
          resources.learners.map((item) => item.grade).filter(Boolean),
        ),
      ].sort(),
    [resources.learners],
  );

  const filteredTrips = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const destinationNeedle = destinationFilter.trim().toLowerCase();
    return trips.filter((trip) => {
      const assignments = trip.vehicles || [];
      const searchable = [
        trip.name,
        trip.destination,
        trip.destination_address,
        trip.status,
        trip.category,
        ...assignments.flatMap((assignment) => [
          assignment.vehicle?.name,
          assignment.vehicle?.registration_number,
          fullName(assignment.driver),
          fullName(assignment.coordinator),
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const tripDate = trip.departure_at ? new Date(trip.departure_at) : null;
      const matchesDate =
        !dateFilter ||
        (tripDate &&
          !Number.isNaN(tripDate.getTime()) &&
          [
            tripDate.getFullYear(),
            String(tripDate.getMonth() + 1).padStart(2, "0"),
            String(tripDate.getDate()).padStart(2, "0"),
          ].join("-") === dateFilter);
      return (
        (!needle || searchable.includes(needle)) &&
        (statusFilter === "all" || trip.status === statusFilter) &&
        (typeFilter === "all" || trip.category === typeFilter) &&
        matchesDate &&
        (vehicleFilter === "all" ||
          assignments.some(
            (assignment) => assignment.vehicle_id === vehicleFilter,
          )) &&
        (staffFilter === "all" ||
          assignments.some(
            (assignment) =>
              assignment.driver_admin_id === staffFilter ||
              assignment.coordinator_admin_id === staffFilter,
          )) &&
        (!destinationNeedle ||
          String(trip.destination || "")
            .toLowerCase()
            .includes(destinationNeedle))
      );
    });
  }, [
    dateFilter,
    destinationFilter,
    query,
    staffFilter,
    statusFilter,
    trips,
    typeFilter,
    vehicleFilter,
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTrips = filteredTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const upcomingTripCount = trips.filter((trip) => {
    const departure = new Date(trip.departure_at);
    return (
      ["registration_open", "confirmed", "preparing"].includes(trip.status) &&
      !Number.isNaN(departure.getTime()) &&
      currentTime !== null &&
      departure.getTime() > currentTime
    );
  }).length;
  const eligibleRegistrationCount = trips.reduce(
    (sum, trip) => sum + (Number(trip.registered_count) || 0),
    0,
  );
  const selectedCount = resources.learners.filter(
    (student) =>
      tripForm.target_grade === "all" ||
      student.grade === tripForm.target_grade,
  ).length;
  const selectedVehicleIds = learnerVehicleChoice;
  const selectedCapacity = selectedVehicleIds.reduce(
    (sum, vehicleId) =>
      sum +
      Number(
        resources.vehicles.find((vehicle) => vehicle.id === vehicleId)
          ?.passenger_capacity || 0,
      ),
    0,
  );
  const minimumSeatShortfall = Math.max(
    0,
    Number(tripForm.minimum_learners || 0) - selectedCapacity,
  );
  const submitTrip = async (event) => {
    event.preventDefault();
    setError("");
    if (!editingTrip && resources.learners.length === 0) {
      setError(
        "Add at least one student to your school before creating a trip.",
      );
      return;
    }
    if (!tripForm.departure_at || !tripForm.return_at) {
      setError("Enter both the departure and return date and time.");
      return;
    }
    const departureTime = new Date(tripForm.departure_at).getTime();
    const returnTime = new Date(tripForm.return_at).getTime();
    const registrationClosesTime = tripForm.registration_closes_at
      ? new Date(tripForm.registration_closes_at).getTime()
      : null;
    if (!Number.isFinite(departureTime) || !Number.isFinite(returnTime)) {
      setError("Enter valid departure and return dates and times.");
      return;
    }
    if (returnTime <= departureTime) {
      setError("Return date and time must be after departure.");
      return;
    }
    if (
      registrationClosesTime !== null &&
      (!Number.isFinite(registrationClosesTime) ||
        registrationClosesTime >= departureTime)
    ) {
      setError("Registration must close before the departure date and time.");
      return;
    }
    if (
      tripForm.status === "registration_open" &&
      (registrationClosesTime === null || registrationClosesTime <= Date.now())
    ) {
      setError(
        "Choose a future registration closing time before opening registration.",
      );
      return;
    }
    if (!tripForm.is_free && Number(tripForm.price) < 0) {
      setError("Trip price cannot be negative.");
      return;
    }
    const vehiclePayload = learnerVehicleChoice.map((vehicleId) => {
      const prior = editingTrip?.vehicles?.find(
        (item) => item.vehicle_id === vehicleId,
      );
      return {
        vehicle_id: vehicleId,
        driver_admin_id:
          learnerAssignments[`__driver_${vehicleId}`] ??
          prior?.driver_admin_id ??
          "",
        coordinator_admin_id:
          learnerAssignments[`__coordinator_${vehicleId}`] ??
          prior?.coordinator_admin_id ??
          "",
      };
    });
    const status = tripForm.status;
    if (status === "registration_open" && vehiclePayload.length === 0) {
      setError("Assign at least one staffed vehicle before opening registration.");
      return;
    }
    const unstaffedVehicle = vehiclePayload.find(
      (assignment) => !assignment.driver_admin_id,
    );
    if (unstaffedVehicle) {
      setError("Assign a driver to every selected vehicle.");
      return;
    }
    if (
      vehiclePayload.length &&
      Number(tripForm.minimum_learners || 0) > selectedCapacity
    ) {
      setError(
        "Assigned vehicle capacity must fit the minimum learner count.",
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...tripForm,
        status,
        target_grade: tripForm.target_grade || "all",
        destination_latitude:
          tripForm.destination_latitude === ""
            ? null
            : Number(tripForm.destination_latitude),
        destination_longitude:
          tripForm.destination_longitude === ""
            ? null
            : Number(tripForm.destination_longitude),
        maximum_learners:
          tripForm.maximum_learners === ""
            ? null
            : Number(tripForm.maximum_learners),
        minimum_learners: Number(tripForm.minimum_learners || 0),
        price: Number(tripForm.price || 0),
        deposit: Number(tripForm.deposit || 0),
        departure_at: new Date(tripForm.departure_at).toISOString(),
        return_at: new Date(tripForm.return_at).toISOString(),
        registration_closes_at: tripForm.registration_closes_at
          ? new Date(tripForm.registration_closes_at).toISOString()
          : null,
        vehicles: vehiclePayload,
      };
      const savedTrip = await apiRequest(
        editingTrip ? `/school/trips/${editingTrip.id}` : "/school/trips",
        {
          method: editingTrip ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify(payload),
        },
      );
      await loadData();
      setModal(null);
      setSelectedTrip(savedTrip);
      successMessage({
        title: editingTrip
            ? "Trip updated"
            : "Trip created",
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to save trip.");
    } finally {
      setSaving(false);
    }
  };

  const submitVehicle = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      let vehicle = await apiRequest(
        editingVehicle
          ? `/school/vehicles/${editingVehicle.id}`
          : "/school/vehicles",
        {
          method: editingVehicle ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify({
            ...vehicleForm,
            year: vehicleForm.year ? Number(vehicleForm.year) : null,
            passenger_capacity: Number(vehicleForm.passenger_capacity),
          }),
        },
      );
      const updateVehicleInResources = (savedVehicle) =>
        setResources((current) => ({
          ...current,
          vehicles: editingVehicle
            ? current.vehicles.map((item) =>
                item.id === savedVehicle.id ? savedVehicle : item,
              )
            : current.vehicles.some((item) => item.id === savedVehicle.id)
              ? current.vehicles.map((item) =>
                  item.id === savedVehicle.id ? savedVehicle : item,
                )
              : [...current.vehicles, savedVehicle],
        }));
      updateVehicleInResources(vehicle);
      if (vehicleAssets.photos.length || vehicleAssets.documents.length) {
        const assets = new FormData();
        vehicleAssets.photos.forEach((file) => assets.append("photos", file));
        vehicleAssets.documents.forEach((file) =>
          assets.append("documents", file),
        );
        try {
          vehicle = await apiRequest(`/school/vehicles/${vehicle.id}/assets`, {
            method: "POST",
            headers: { Authorization: `Bearer ${auth.token || ""}` },
            body: assets,
          });
        } catch (assetError) {
          setEditingVehicle(vehicle);
          throw new Error(
            `Vehicle saved, but its assets could not be uploaded. You can retry from Edit vehicle. ${assetError.message || ""}`,
            { cause: assetError },
          );
        }
        updateVehicleInResources(vehicle);
      }
      setVehicleForm(emptyVehicle);
      setVehicleAssets({ photos: [], documents: [] });
      setEditingVehicle(null);
      setModal(null);
      successMessage({
        title: editingVehicle
          ? "School vehicle updated"
          : "School vehicle added",
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to add school vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (trip, status) => {
    setUpdatingTripStatuses((current) => ({ ...current, [trip.id]: true }));
    try {
      const updated = await apiRequest(`/school/trips/${trip.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
        body: JSON.stringify({ status }),
      });
      setTrips((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedTrip((current) =>
        current?.id === updated.id ? updated : current,
      );
    } catch (requestError) {
      showErrorAlert(requestError.message || "Unable to update trip status.");
    } finally {
      setUpdatingTripStatuses((current) => {
        const next = { ...current };
        delete next[trip.id];
        return next;
      });
    }
  };

  const deleteTrip = async (trip) => {
    if (deletingTripId) return;
    const confirmation = await showDeleteConfirmationAlert({
      title: `Delete "${trip.name}"?`,
      text: "This permanently removes the trip, learner registrations, vehicle assignments and tracking history. A trip currently in progress cannot be deleted.",
    });
    if (!confirmation.isConfirmed) return;

    setDeletingTripId(trip.id);
    try {
      await apiRequest(`/school/trips/${trip.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      setSelectedTrip((current) => (current?.id === trip.id ? null : current));
      await loadData();
      successMessage({ title: "School trip deleted" });
    } catch (requestError) {
      showErrorAlert(requestError.message || "Unable to delete school trip.");
    } finally {
      setDeletingTripId(null);
    }
  };

  const updateTripLearner = async (trip, learner, changes) => {
    try {
      const updatedLearner = await apiRequest(
        `/school/trips/${trip.id}/learners/${learner.child_id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify(changes),
        },
      );
      const applyLearnerUpdate = (currentTrip) => {
        if (!currentTrip || currentTrip.id !== trip.id) return currentTrip;
        const applyToLearner = (item) =>
          item.child_id === learner.child_id
            ? { ...item, ...updatedLearner }
            : item;
        return {
          ...currentTrip,
          learners: (currentTrip.learners || []).map(applyToLearner),
          vehicles: (currentTrip.vehicles || []).map((assignment) => ({
            ...assignment,
            learners: (assignment.learners || []).map(applyToLearner),
          })),
        };
      };
      setTrips((current) => current.map(applyLearnerUpdate));
      setSelectedTrip(applyLearnerUpdate);
    } catch (requestError) {
      showErrorAlert(
        requestError.message || "Unable to update learner status.",
      );
    }
  };

  const startLocationSharing = (assignment) => {
    if (!navigator.geolocation) {
      showErrorAlert("Location sharing is not available in this browser.");
      return;
    }
    if (!selectedTrip || selectedTrip.status !== "in_progress") {
      showErrorAlert("Start the trip before sharing live location.");
      return;
    }
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (trackingIntervalRef.current !== null) {
      window.clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setTrackingError("");
    setSharingAssignment(assignment.id);
    const sendLocation = (position) => {
      const coords = position.coords;
      void apiRequest(
        `/school/trips/${selectedTrip.id}/vehicles/${assignment.id}/location`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
          }),
        },
      )
        .then((tracking) => {
          setTrips((current) =>
            current.map((trip) =>
              trip.id !== selectedTrip.id
                ? trip
                : {
                    ...trip,
                    vehicles: (trip.vehicles || []).map((item) =>
                      item.id === assignment.id ? { ...item, tracking } : item,
                    ),
                  },
            ),
          );
          setSelectedTrip((current) =>
            current?.id !== selectedTrip.id
              ? current
              : {
                  ...current,
                  vehicles: (current.vehicles || []).map((item) =>
                    item.id === assignment.id ? { ...item, tracking } : item,
                  ),
                },
          );
          setTrackingError("");
          setSharingAssignment(assignment.id);
        })
        .catch((requestError) => {
          setTrackingError(requestError.message || "Unable to share location.");
          setSharingAssignment(null);
        });
    };

    locationWatchRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      async (position) => {
        setTrackingError(
          position.message || "Unable to access device location.",
        );
        if (locationWatchRef.current !== null) {
          navigator.geolocation.clearWatch(locationWatchRef.current);
          setSharingAssignment(null);
          locationWatchRef.current = null;
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
    trackingIntervalRef.current = window.setInterval(() => {
      if (
        !navigator.geolocation ||
        !selectedTrip ||
        !locationWatchRef.current
      ) {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (locationError) => setTrackingError(locationError.message),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
      );
    }, 15000);
  };

  const stopLocationSharing = () => {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (trackingIntervalRef.current !== null) {
      window.clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setSharingAssignment(null);
  };

  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      if (trackingIntervalRef.current !== null) {
        window.clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [selectedTrip?.id, selectedTrip?.status]);

  const detailTrip =
    (selectedTrip && trips.find((item) => item.id === selectedTrip.id)) ||
    selectedTrip;
  const detailHasAssignedVehicle = (detailTrip?.vehicles || []).length > 0;

  useEffect(() => {
    if (!sharingAssignment) return;
    const assignment = detailTrip?.vehicles?.find(
      (item) => item.id === sharingAssignment,
    );
    if (
      !assignment ||
      detailTrip?.status !== "in_progress" ||
      !["outbound", "returning"].includes(assignment.journey_phase)
    ) {
      const timeout = window.setTimeout(stopLocationSharing, 0);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [detailTrip, sharingAssignment]);

  const dateInput = (field, label, required = false) => (
    <label>
      {label}
      <input
        type="datetime-local"
        required={required}
        min={
          field === "return_at" ? tripForm.departure_at || undefined : undefined
        }
        max={
          field === "registration_closes_at"
            ? tripForm.departure_at || undefined
            : undefined
        }
        value={tripForm[field] || ""}
        onChange={(event) =>
          setTripForm((current) => ({
            ...current,
            [field]: event.target.value,
          }))
        }
      />
    </label>
  );
  const setTripField = (field) => (event) =>
    setTripForm((current) => ({ ...current, [field]: event.target.value }));
  const setVehicleField = (field) => (event) =>
    setVehicleForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Trips</strong>
        </div>
        <div className="portal-top-actions">
          <div className="trips-header-note">
            <FiTruck /> School trips & excursions
          </div>
        </div>
      </header>
      <div className="portal-content trips-content">
        <SchoolPageHeader
          className="trips-heading"
          actionsClassName="trip-heading-actions"
          eyebrow="TRANSPORT OPERATIONS"
          titleIcon={<span className="school-page-heading-icon"><FiMapPin /></span>}
          title="School Trips"
          description="Plan excursions, assign school vehicles and notify participating families."
          actions={
            <>
              <button
                type="button"
                className="trip-secondary"
                onClick={() => setModal("trip-docs")}
                aria-haspopup="dialog"
              >
                <FiBookOpen /> Docs
              </button>
              <button
                type="button"
                className="trip-secondary"
                onClick={() => setModal("vehicles")}
              >
                <FiTruck /> School vehicles
              </button>
              <button
                type="button"
                className="trip-primary"
                onClick={() => startTrip()}
              >
                <FiPlus /> Add trip
              </button>
            </>
          }
        />
        {modal === "trip-docs" && (
          <div
            className="trip-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setModal(null);
            }}
          >
            <section
              className="trip-modal trip-docs-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="trip-docs-title"
            >
              <header>
                <div>
                  <p className="page-kicker">QUICK GUIDE</p>
                  <h2 id="trip-docs-title">How School Trips work</h2>
                  <p>
                    Set up the trip, choose learners and vehicles, then keep
                    families informed as plans progress.
                  </p>
                </div>
                <button
                  type="button"
                  className="trip-modal-close"
                  onClick={() => setModal(null)}
                  aria-label="Close trip guide"
                >
                  <FiX />
                </button>
              </header>
              <div className="trip-docs-content">
                <section>
                  <h3>Creating and running a trip</h3>
                  <ol>
                    <li>
                      Select <strong>Add trip</strong> and enter the trip
                      details, destination, times, price and registration
                      limits.
                    </li>
                    <li>
                      Select the participating learners. Add one or more school
                      vehicles and assign learners within the available seat
                      capacity.
                    </li>
                    <li>
                      Save as a <strong>Draft</strong> while details are still
                      being prepared, or open registration when families can
                      sign up.
                    </li>
                    <li>
                      Update the status as arrangements progress. Status changes
                      are sent to participating families; a vehicle is required
                      to confirm or start a trip.
                    </li>
                  </ol>
                </section>
                <section>
                  <h3>Trip statuses</h3>
                  <dl className="trip-docs-status-list">
                    <div>
                      <dt>Draft</dt>
                      <dd>
                        Saved for school staff to finish. It is unpublished and
                        families cannot respond.
                      </dd>
                    </div>
                    <div>
                      <dt>Missed</dt>
                      <dd>
                        The trip did not begin: no vehicle location was shared
                        within 15 minutes of scheduled departure. Guardians and
                        school staff are notified.
                      </dd>
                    </div>
                    <div>
                      <dt>Registration open</dt>
                      <dd>
                        Published and accepting parent responses until the
                        registration deadline or capacity is reached.
                      </dd>
                    </div>
                    <div>
                      <dt>Confirmed</dt>
                      <dd>
                        Registration has closed and the school has confirmed
                        the trip. Parent responses are no longer accepted.
                        Payment is tracked separately.
                      </dd>
                    </div>
                    <div>
                      <dt>Preparing</dt>
                      <dd>
                        Registration has closed and the school is finalising
                        arrangements. The minimum number of accepted learners
                        and staffed vehicle assignments must be in place.
                      </dd>
                    </div>
                    <div>
                      <dt>In progress</dt>
                      <dd>
                        The trip remains active while each assigned vehicle
                        travels outbound, pauses at the destination, and
                        returns. Assigned staff update those journey phases in
                        the mobile app; the trip completes when every assigned
                        vehicle has returned. Live tracking is shown only for
                        recent GPS updates.
                      </dd>
                    </div>
                    <div>
                      <dt>Completed</dt>
                      <dd>The trip has finished. This is a final status.</dd>
                    </div>
                    <div>
                      <dt>Cancelled</dt>
                      <dd>
                        The trip will not go ahead. This is a final status and
                        families are notified.
                      </dd>
                    </div>
                  </dl>
                </section>
                <section>
                  <h3>School vehicle statuses</h3>
                  <dl className="trip-docs-status-list">
                    <div>
                      <dt>Available</dt>
                      <dd>Ready to be assigned to a trip.</dd>
                    </div>
                    <div>
                      <dt>Assigned</dt>
                      <dd>Currently allocated to a trip.</dd>
                    </div>
                    <div>
                      <dt>Maintenance</dt>
                      <dd>
                        Under maintenance and not available for new assignments.
                      </dd>
                    </div>
                    <div>
                      <dt>Inactive</dt>
                      <dd>
                        Not currently in service and unavailable for
                        assignments.
                      </dd>
                    </div>
                  </dl>
                </section>
                <p className="trip-docs-note">
                  Trips without a vehicle can remain drafts but cannot open
                  registration. Vehicle capacity is applied to accepted
                  learners, not the full invited cohort.
                </p>
              </div>
            </section>
          </div>
        )}
        <section className="trip-metrics">
          <article>
            <span className="trip-metric-icon purple">
              <FiCalendar />
            </span>
            <div>
              <small>Total trips</small>
              <strong>{trips.length}</strong>
              <em>School activities</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon green">
              <FiCheckCircle />
            </span>
            <div>
              <small>Upcoming</small>
              <strong>{upcomingTripCount}</strong>
              <em>Scheduled in the future</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon blue">
              <FiUsers />
            </span>
            <div>
              <small>Parent acceptances</small>
              <strong>{eligibleRegistrationCount}</strong>
              <em>Across all school trips</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon orange">
              <FiTruck />
            </span>
            <div>
              <small>School vehicles</small>
              <strong>{resources.vehicles.length}</strong>
              <em>Separate school fleet</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon red">
              <FiMapPin />
            </span>
            <div>
              <small>In progress</small>
              <strong>
                {trips.filter((item) => item.status === "in_progress").length}
              </strong>
              <em>Live trip status</em>
            </div>
          </article>
        </section>
        {error && !modal && (
          <div className="trip-error" role="alert">
            <FiAlertCircle />
            {error}
            <button onClick={() => void loadData()}>Retry</button>
          </div>
        )}
        <section className="trips-list-panel">
          <div className="trips-toolbar">
            <label className="trips-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, destination, vehicle or staff"
              />
            </label>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by trip type"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              aria-label="Filter destination"
              value={destinationFilter}
              onChange={(event) => {
                setDestinationFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Destination"
            />
            <input
              aria-label="Filter by departure date"
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Filter by school vehicle"
              value={vehicleFilter}
              onChange={(event) => {
                setVehicleFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All vehicles</option>
              {resources.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.registration_number}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by driver or coordinator"
              value={staffFilter}
              onChange={(event) => {
                setStaffFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All staff</option>
              {resources.staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {fullName(person)} · {person.job_title || person.role}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="trip-loading">
              Loading trips, school vehicles and learners…
            </div>
          ) : trips.length === 0 ? (
            <div className="trip-empty">
              <span>
                <FiCalendar />
              </span>
              <h2>No trips yet</h2>
              <p>
                Create your first school trip to manage an excursion and its
                transportation.
              </p>
              <button
                type="button"
                className="trip-primary"
                onClick={() => startTrip()}
              >
                <FiPlus /> Add your first trip
              </button>
            </div>
          ) : (
            <>
              <div className="trips-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trip</th>
                      <th>Destination</th>
                      <th>Departure</th>
                      <th>Return</th>
                      <th>Eligible learners</th>
                      <th>Vehicle & staff</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Registration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td>
                          <strong>{trip.name}</strong>
                          <small>
                            {categories.find(
                              ([value]) => value === trip.category,
                            )?.[1] || "Trip"}
                          </small>
                        </td>
                        <td>
                          <strong>{trip.destination}</strong>
                          <small>{trip.destination_address}</small>
                        </td>
                        <td>
                          <strong>{displayDate(trip.departure_at)}</strong>
                        </td>
                        <td>
                          <strong>{displayDate(trip.return_at)}</strong>
                        </td>
                        <td>
                          <strong>
                            {trip.registered_count || 0}
                            {trip.maximum_learners
                              ? ` / ${trip.maximum_learners}`
                              : ""}
                          </strong>
                          <small>parent accepted</small>
                        </td>
                        <td>
                          {(trip.vehicles || []).map((assignment) => (
                            <small key={assignment.id}>
                              {assignment.vehicle?.name ||
                                assignment.vehicle?.registration_number ||
                                "Vehicle"}{" "}
                              ·{" "}
                              {fullName(
                                assignment.driver || assignment.coordinator,
                              )}
                            </small>
                          ))}
                          <small className="trip-table-seat-capacity">
                            {tripSeatCapacity(trip)} seats · target{" "}
                            {tripSeatRequirement(trip) || "Not set"}
                          </small>
                          {tripNeedsMoreVehicles(trip) && (
                            <span className="trip-capacity-warning">
                              <FiAlertCircle aria-hidden="true" /> Needs another
                              vehicle
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>{money(trip)}</strong>
                          <small>
                            {trip.deposit
                              ? `Deposit ${trip.currency} ${Number(trip.deposit).toFixed(2)}`
                              : ""}
                          </small>
                        </td>
                        <td>
                          <span className="trip-table-status-control">
                            <select
                              className={`trip-table-status-select trip-status trip-status-${trip.status}`}
                              aria-label={`Change status for ${trip.name}`}
                              aria-busy={Boolean(updatingTripStatuses[trip.id])}
                              value={trip.status}
                              disabled={Boolean(updatingTripStatuses[trip.id])}
                              onChange={(event) =>
                                void updateStatus(trip, event.target.value)
                              }
                            >
                              {availableTripStatuses(
                                trip.status,
                              ).map((status) => (
                                <option key={status} value={status}>
                                  {status.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                            {updatingTripStatuses[trip.id] && (
                              <span
                                className="trip-table-status-loading"
                                role="status"
                              >
                                <FiLoader aria-hidden="true" /> Updating
                              </span>
                            )}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`trip-registration trip-registration-${registrationState(trip, currentTime ?? 0).toLowerCase().replaceAll(" ", "-")}`}
                          >
                            {registrationState(trip, currentTime ?? 0)}
                          </span>
                        </td>
                        <td>
                          <div className="trip-row-actions">
                            <button
                              type="button"
                              className="trip-row-action"
                              aria-label={`View details for ${trip.name}`}
                              title="View trip details"
                              onClick={() => setSelectedTrip(trip)}
                            >
                              <FiEye color="#17204d" aria-hidden="true" />
                            </button>
                            {canDeleteTrips && (
                              <button
                                type="button"
                                className="trip-row-action trip-row-action-delete"
                                aria-label={`Delete ${trip.name}`}
                                title={
                                  trip.status === "in_progress"
                                    ? "An active trip cannot be deleted"
                                    : "Delete trip"
                                }
                                disabled={
                                  trip.status === "in_progress" ||
                                  deletingTripId === trip.id
                                }
                                onClick={() => void deleteTrip(trip)}
                              >
                                <FiTrash2 aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pageTrips.length === 0 && (
                  <div className="empty-trips">
                    No trips match the selected filters.
                  </div>
                )}
              </div>
              <div className="trips-footer">
                <span>
                  Showing{" "}
                  {filteredTrips.length ? (currentPage - 1) * pageSize + 1 : 0}–
                  {Math.min(currentPage * pageSize, filteredTrips.length)} of{" "}
                  {filteredTrips.length}
                </span>
                <div className="trip-pagination">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ‹
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    ›
                  </button>
                </div>
                <label>
                  Rows per page <span>6</span>
                </label>
              </div>
            </>
          )}
        </section>
      </div>

      {modal === "trip" && (
        <div
          className="trip-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            className="trip-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-form-title"
          >
            <header>
              <div>
                <p className="page-kicker">SCHOOL TRANSPORT</p>
                <h2 id="trip-form-title">
                  {editingTrip ? "Edit school trip" : "Create a school trip"}
                </h2>
                <p>
                  Set event details, choose a grade or all learners, and assign
                  the selected group to school vehicles.
                </p>
              </div>
              <button
                type="button"
                className="trip-modal-close"
                onClick={() => setModal(null)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </header>
            <form onSubmit={submitTrip}>
              {error && (
                <div className="trip-error" role="alert">
                  {error}
                </div>
              )}
              <section className="trip-form-section">
                <h3>Trip information</h3>
                <div className="trip-form-grid">
                  <TripPlaceNameInput
                    tripForm={tripForm}
                    setTripForm={setTripForm}
                    onPlaceSelected={handlePlaceSelected}
                    onPlaceSearchChanged={handlePlaceSearchChanged}
                  />
                  <label>
                    Category
                    <select
                      value={tripForm.category}
                      onChange={setTripField("category")}
                    >
                      {categories.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <small className="trip-field-hint">
                      Trip category is used to group trips in the list and
                    </small>
                  </label>
                  <label className="trip-form-full">
                    Description
                    <textarea
                      value={tripForm.description}
                      onChange={setTripField("description")}
                      rows="2"
                      placeholder="Purpose and activity details"
                    />
                  </label>
                  <label>
                    Destination name
                    <input
                      required
                      disabled={destinationLocked}
                      value={tripForm.destination}
                      onChange={setTripField("destination")}
                    />
                  </label>
                  <label>
                    Destination address
                    <input
                      required
                      disabled={destinationLocked}
                      value={tripForm.destination_address}
                      onChange={setTripField("destination_address")}
                    />
                  </label>
                  <label>
                    Destination latitude
                    <input
                      type="number"
                      step="any"
                      disabled={destinationLocked}
                      value={tripForm.destination_latitude}
                      onChange={setTripField("destination_latitude")}
                      placeholder="Optional"
                    />
                  </label>
                  <label>
                    Destination longitude
                    <input
                      type="number"
                      step="any"
                      disabled={destinationLocked}
                      value={tripForm.destination_longitude}
                      onChange={setTripField("destination_longitude")}
                      placeholder="Optional"
                    />
                  </label>
                  <TripDestinationPicker
                    tripForm={tripForm}
                    setTripForm={setTripForm}
                    locked={destinationLocked}
                  />
                  {dateInput("departure_at", "Departure date & time", true)}
                  {dateInput("return_at", "Return date & time", true)}
                  {dateInput("registration_closes_at", "Registration closes")}
                </div>
              </section>
              <section className="trip-form-section">
                <h3>Pricing & capacity</h3>
                <div className="trip-form-grid">
                  <label className="trip-free-toggle">
                    Free trip
                    <input
                      type="checkbox"
                      checked={tripForm.is_free}
                      onChange={(event) =>
                        setTripForm((current) => ({
                          ...current,
                          is_free: event.target.checked,
                          price: event.target.checked ? "0" : current.price,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Trip price (ZAR)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={tripForm.is_free}
                      value={tripForm.price}
                      onChange={setTripField("price")}
                    />
                  </label>
                  <label>
                    Optional deposit (ZAR)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={tripForm.is_free}
                      value={tripForm.deposit}
                      onChange={setTripField("deposit")}
                    />
                  </label>
                  <label>
                    Payment deadline
                    <input
                      type="date"
                      disabled={tripForm.is_free}
                      value={tripForm.payment_deadline || ""}
                      onChange={setTripField("payment_deadline")}
                    />
                    <small
                      className="trip-field-hint trip-free-payment-hint"
                      aria-hidden={!tripForm.is_free}
                    >
                      Not applicable for free trips.
                    </small>
                  </label>
                  <label>
                    Minimum learners
                    <input
                      type="number"
                      min="0"
                      value={tripForm.minimum_learners}
                      onChange={setTripField("minimum_learners")}
                    />
                  </label>
                  <label>
                    Maximum registrations
                    <input
                      type="number"
                      min="1"
                      value={tripForm.maximum_learners}
                      onChange={setTripField("maximum_learners")}
                      placeholder="No overall limit"
                    />
                    <small className="trip-field-hint">
                      Limits accepted learners; it does not limit how many
                      families are invited.
                    </small>
                  </label>
                  <label className="trip-form-full">
                    Payment notes
                    <textarea
                      rows="2"
                      disabled={tripForm.is_free}
                      value={tripForm.payment_notes}
                      onChange={setTripField("payment_notes")}
                      placeholder="Payment instructions for families"
                    />
                    <small
                      className="trip-field-hint trip-free-payment-hint"
                      aria-hidden={!tripForm.is_free}
                    >
                      Not applicable for free trips.
                    </small>
                  </label>
                </div>
                {minimumSeatShortfall > 0 && (
                  <div className="trip-capacity-warning-panel" role="status">
                    <FiAlertCircle aria-hidden="true" />
                    <div>
                    <strong>Vehicle capacity is below the minimum learner count</strong>
                    <p>
                      Add at least {minimumSeatShortfall} seat(s) to meet the
                      minimum. Vehicle capacity limits accepted registrations,
                      not the number of families invited. Select another
                      vehicle in the participating learners section.
                    </p>
                  </div>
                </div>
                )}
              </section>
              <section className="trip-form-section">
                <div className="trip-section-title">
                  <div>
                    <h3>Participating learners</h3>
                    <p>
                      {selectedCount} learners will be invited ·{" "}
                      {selectedCapacity} vehicle seat(s) available for accepted
                      learners
                    </p>
                  </div>
                  <span>{resources.learners.length} school learners</span>
                </div>
                <div className="trip-learner-selectors">
                  <label>
                    <strong>Who should be invited?</strong>
                    <small>
                      Parents of learners in this group will receive an
                      invitation to accept or decline.
                    </small>
                    <select
                      disabled={
                        Boolean(editingTrip) && editingTrip.status !== "draft"
                      }
                      value={tripForm.target_grade}
                      onChange={(event) =>
                        setTripForm((current) => ({
                          ...current,
                          target_grade: event.target.value,
                        }))
                      }
                    >
                      <option value="all">All learners</option>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      ))}
                    </select>
                    {editingTrip && editingTrip.status !== "draft" && (
                      <small>
                        The invited group is locked after publishing to preserve
                        parent responses and payment records.
                      </small>
                    )}
                  </label>
                  <div
                    className="trip-vehicle-multi-select"
                    role="group"
                    aria-label="Vehicles for invited learners"
                  >
                    <strong>Vehicles for invited learners</strong>
                    <small>
                      Select vehicles. Learners who accept will be assigned
                      automatically up to each vehicle’s capacity.
                    </small>
                    {resources.vehicles.filter(
                      (vehicle) =>
                        ["available", "assigned"].includes(vehicle.status) ||
                        learnerVehicleChoice.includes(vehicle.id),
                    ).length ? (
                      <div className="trip-vehicle-choice-list">
                        {resources.vehicles
                          .filter(
                            (vehicle) =>
                              ["available", "assigned"].includes(
                                vehicle.status,
                              ) || learnerVehicleChoice.includes(vehicle.id),
                          )
                          .map((vehicle) => (
                            <label key={vehicle.id}>
                              <input
                                type="checkbox"
                                checked={learnerVehicleChoice.includes(
                                  vehicle.id,
                                )}
                                onChange={(event) => {
                                  const nextVehicleIds = event.target.checked
                                    ? [...learnerVehicleChoice, vehicle.id]
                                    : learnerVehicleChoice.filter(
                                        (id) => id !== vehicle.id,
                                      );
                                  setLearnerVehicleChoice(nextVehicleIds);
                                }}
                              />
                              <span>
                                <strong>{vehicle.name}</strong>
                                <small>
                                  {vehicle.registration_number} ·{" "}
                                  {vehicle.passenger_capacity} seats ·{" "}
                                  {vehicle.status}
                                </small>
                              </span>
                            </label>
                          ))}
                      </div>
                    ) : (
                      <p className="trip-vehicle-choice-empty">
                        Add a school vehicle before assigning learners.
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <section className="trip-form-section">
                <div className="trip-section-title">
                  <div>
                    <h3>School vehicles, drivers & coordinators</h3>
                    <p>
                      Vehicles are owned by this school, separate from
                      transport-owner fleets.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="trip-secondary"
                    onClick={() => setModal("vehicle")}
                  >
                    <FiPlus /> Add school vehicle
                  </button>
                </div>
                {selectedVehicleIds.length ? (
                  selectedVehicleIds.map((vehicleId) => {
                    const vehicle = resources.vehicles.find(
                      (item) => item.id === vehicleId,
                    );
                    const assignment = editingTrip?.vehicles?.find(
                      (item) => item.vehicle_id === vehicleId,
                    );
                    const selectedDriverId =
                      learnerAssignments[`__driver_${vehicleId}`] ??
                      assignment?.driver_admin_id ??
                      "";
                    const driversAssignedElsewhere = new Set(
                      selectedVehicleIds
                        .filter(
                          (otherVehicleId) => otherVehicleId !== vehicleId,
                        )
                        .map((otherVehicleId) => {
                          const otherAssignment = editingTrip?.vehicles?.find(
                            (item) => item.vehicle_id === otherVehicleId,
                          );
                          return (
                            learnerAssignments[`__driver_${otherVehicleId}`] ??
                            otherAssignment?.driver_admin_id ??
                            ""
                          );
                        })
                        .filter(Boolean),
                    );
                    return (
                      <div className="trip-assignment-card" key={vehicleId}>
                        <div>
                          <strong>{vehicle?.name}</strong>
                          <small>
                            {vehicle?.registration_number} · Capacity{" "}
                            {vehicle?.passenger_capacity}
                          </small>
                        </div>
                        <label>
                          Driver
                          <select
                            value={selectedDriverId}
                            onChange={(event) => {
                              const selectedId = event.target.value;
                              setLearnerAssignments((current) => ({
                                ...current,
                                [`__driver_${vehicleId}`]: selectedId,
                              }));
                            }}
                          >
                            <option value="">Select school staff</option>
                            {resources.staff.map((person) => (
                              <option
                                key={person.id}
                                value={person.id}
                                disabled={
                                  driversAssignedElsewhere.has(person.id) &&
                                  person.id !== selectedDriverId
                                }
                              >
                                {fullName(person)} ·{" "}
                                {person.job_title || person.role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Trip coordinator (school staff)
                          <select
                            value={
                              learnerAssignments[
                                `__coordinator_${vehicleId}`
                              ] ??
                              assignment?.coordinator_admin_id ??
                              ""
                            }
                            onChange={(event) =>
                              setLearnerAssignments((current) => ({
                                ...current,
                                [`__coordinator_${vehicleId}`]:
                                  event.target.value,
                              }))
                            }
                          >
                            <option value="">
                              Select school staff coordinator
                            </option>
                            {resources.staff.map((person) => (
                              <option key={person.id} value={person.id}>
                                {fullName(person)} ·{" "}
                                {person.job_title || person.role}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );
                  })
                ) : (
                  <div className="trip-no-vehicles">
                    {!editingTrip && (
                      <span>
                        Assign a staffed vehicle before opening registration. A
                        trip without a vehicle can only be saved as a draft.{" "}
                      </span>
                    )}
                    Select learners and assign them to vehicles to allocate a
                    driver or trip coordinator.{" "}
                  </div>
                )}
              </section>
              <section className="trip-form-section">
                <h3>Safety & publication</h3>
                <div className="trip-form-grid">
                  <label>
                    Emergency contact
                    <input
                      value={tripForm.emergency_contact}
                      onChange={setTripField("emergency_contact")}
                      placeholder="School / coordinator phone"
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={tripForm.status}
                      onChange={setTripField("status")}
                    >
                      {(editingTrip
                        ? availableTripStatuses(editingTrip.status)
                        : ["draft", "registration_open"]
                      ).map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="trip-form-full">
                    Emergency / safety notes
                    <textarea
                      value={tripForm.emergency_notes}
                      onChange={setTripField("emergency_notes")}
                      rows="2"
                    />
                  </label>
                </div>
                <p className="trip-notify-note">
                  <FiCheckCircle /> Saving a non-draft trip notifies guardians
                  linked to participating learners.
                </p>
              </section>
              <footer className="trip-modal-footer">
                <button
                  type="button"
                  className="trip-secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="trip-primary"
                  disabled={saving || (Boolean(editingTrip) && !hasTripEdits)}
                >
                  {saving
                    ? "Saving…"
                    : editingTrip
                      ? "Save changes"
                      : "Create trip"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {modal === "vehicle" && (
        <div
          className="trip-modal-backdrop trip-vehicle-backdrop"
          role="presentation"
        >
          <section
            className="trip-modal trip-vehicle-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-vehicle-title"
          >
            <header className="trip-vehicle-modal-header">
              <div>
                <p className="page-kicker">SCHOOL FLEET</p>
                <h2 id="school-vehicle-title">
                  {editingVehicle
                    ? "Edit school vehicle"
                    : "Add school vehicle"}
                </h2>
                <p>
                  Keep your school fleet details, capacity and compliance
                  information together.
                </p>
              </div>
              <button
                type="button"
                className="trip-modal-close"
                onClick={() => setModal(editingTrip ? "trip" : "vehicles")}
                aria-label="Close"
              >
                <FiX />
              </button>
            </header>
            <form className="trip-vehicle-modal-form" onSubmit={submitVehicle}>
              <div className="trip-vehicle-form-body">
                <section className="trip-vehicle-form-section">
                  <div className="trip-vehicle-form-section-heading">
                    <span className="trip-vehicle-form-icon">
                      <FiTruck />
                    </span>
                    <div>
                      <h3>Vehicle identity</h3>
                      <p>
                        Names and registration used to identify this vehicle.
                      </p>
                    </div>
                  </div>
                  <div className="trip-form-grid">
                    <label>
                      Vehicle name
                      <input
                        required
                        value={vehicleForm.name}
                        onChange={setVehicleField("name")}
                        placeholder="e.g. School Bus 01"
                      />
                    </label>
                    <label>
                      Registration number
                      <input
                        required
                        value={vehicleForm.registration_number}
                        onChange={setVehicleField("registration_number")}
                        placeholder="e.g. ABC 123 GP"
                      />
                    </label>
                    <label>
                      Vehicle type
                      <select
                        value={vehicleForm.vehicle_type}
                        onChange={setVehicleField("vehicle_type")}
                      >
                        {["bus", "minibus", "taxi", "van", "car", "other"].map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Status
                      <select
                        value={vehicleForm.status}
                        onChange={setVehicleField("status")}
                      >
                        {["available", "maintenance", "inactive"].map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </section>
                <section className="trip-vehicle-form-section">
                  <div className="trip-vehicle-form-section-heading">
                    <span className="trip-vehicle-form-icon capacity">
                      <FiUsers />
                    </span>
                    <div>
                      <h3>Specifications & capacity</h3>
                      <p>Passenger seats are used to check trip allocations.</p>
                    </div>
                  </div>
                  <div className="trip-form-grid">
                    <label>
                      Passenger capacity
                      <input
                        required
                        type="number"
                        min="1"
                        value={vehicleForm.passenger_capacity}
                        onChange={setVehicleField("passenger_capacity")}
                      />
                    </label>
                    <label>
                      Make
                      <input
                        value={vehicleForm.make}
                        onChange={setVehicleField("make")}
                        placeholder="Manufacturer"
                      />
                    </label>
                    <label>
                      Model
                      <input
                        value={vehicleForm.model}
                        onChange={setVehicleField("model")}
                        placeholder="Model name"
                      />
                    </label>
                    <label>
                      Year
                      <input
                        type="number"
                        min="1950"
                        max="2100"
                        value={vehicleForm.year}
                        onChange={setVehicleField("year")}
                        placeholder="e.g. 2022"
                      />
                    </label>
                    <label>
                      Colour
                      <input
                        value={vehicleForm.colour}
                        onChange={setVehicleField("colour")}
                        placeholder="Vehicle colour"
                      />
                    </label>
                    <label>
                      VIN / chassis number (optional)
                      <input
                        value={vehicleForm.vin}
                        onChange={setVehicleField("vin")}
                        placeholder="Enter if available"
                      />
                    </label>
                  </div>
                </section>
                <section className="trip-vehicle-form-section">
                  <div className="trip-vehicle-form-section-heading">
                    <span className="trip-vehicle-form-icon compliance">
                      <FiCheckCircle />
                    </span>
                    <div>
                      <h3>Compliance dates</h3>
                      <p>Keep expiry dates visible for fleet readiness.</p>
                    </div>
                  </div>
                  <div className="trip-form-grid">
                    <label>
                      License expiry
                      <input
                        type="date"
                        value={vehicleForm.license_expiry}
                        onChange={setVehicleField("license_expiry")}
                      />
                    </label>
                    <label>
                      Roadworthy expiry
                      <input
                        type="date"
                        value={vehicleForm.roadworthy_expiry}
                        onChange={setVehicleField("roadworthy_expiry")}
                      />
                    </label>
                    <label>
                      Insurance expiry
                      <input
                        type="date"
                        value={vehicleForm.insurance_expiry}
                        onChange={setVehicleField("insurance_expiry")}
                      />
                    </label>
                  </div>
                </section>
                <section className="trip-vehicle-form-section">
                  <div className="trip-vehicle-form-section-heading">
                    <span className="trip-vehicle-form-icon media">
                      <FiEye />
                    </span>
                    <div>
                      <h3>Photos & documents</h3>
                      <p>
                        Add images and compliance documents for quick reference.
                      </p>
                    </div>
                  </div>
                  <div className="trip-vehicle-upload-grid">
                    <label className="trip-vehicle-upload-card">
                      <strong>Vehicle photos</strong>
                      <small>JPG, PNG, WebP or GIF · multiple allowed</small>
                      {editingVehicle?.photos?.length > 0 && (
                        <span className="trip-vehicle-assets-current">
                          {editingVehicle.photos.map((photo, index) => (
                            <a
                              key={photo.fileName || photo.url || index}
                              href={photo.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Photo {index + 1}
                            </a>
                          ))}
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(event) =>
                          setVehicleAssets((current) => ({
                            ...current,
                            photos: Array.from(event.target.files || []),
                          }))
                        }
                      />
                      {vehicleAssets.photos.length > 0 && (
                        <small className="trip-vehicle-selected-files">
                          {vehicleAssets.photos.length} photo(s) selected
                        </small>
                      )}
                    </label>
                    <label className="trip-vehicle-upload-card">
                      <strong>Vehicle documents</strong>
                      <small>PDF or image · multiple allowed</small>
                      {editingVehicle?.documents?.length > 0 && (
                        <span className="trip-vehicle-assets-current">
                          {editingVehicle.documents.map((document, index) => (
                            <a
                              key={document.fileName || document.url || index}
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Document {index + 1}
                            </a>
                          ))}
                        </span>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(event) =>
                          setVehicleAssets((current) => ({
                            ...current,
                            documents: Array.from(event.target.files || []),
                          }))
                        }
                      />
                      {vehicleAssets.documents.length > 0 && (
                        <small className="trip-vehicle-selected-files">
                          {vehicleAssets.documents.length} document(s) selected
                        </small>
                      )}
                    </label>
                  </div>
                </section>
              </div>
              {error && (
                <div className="trip-error" role="alert">
                  {error}
                </div>
              )}
              <footer className="trip-modal-footer">
                <button
                  type="button"
                  className="trip-secondary"
                  onClick={() => {
                    setEditingVehicle(null);
                    setModal(editingTrip ? "trip" : "vehicles");
                    setVehicleAssets({ photos: [], documents: [] });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="trip-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : editingVehicle
                      ? "Save vehicle"
                      : "Add school vehicle"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {modal === "vehicles" && (
        <div
          className="trip-modal-backdrop trip-vehicles-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            className="trip-modal trip-vehicles-list"
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-vehicles-title"
          >
            <header className="trip-vehicles-header">
              <div>
                <p className="page-kicker">SCHOOL FLEET</p>
                <h2 id="school-vehicles-title">School vehicles</h2>
                <p>
                  Vehicles belonging to this school and available for
                  school-organized trips.
                </p>
              </div>
              <div className="trip-vehicles-header-actions">
                <button
                  type="button"
                  className="trip-primary"
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleForm(emptyVehicle);
                    setVehicleAssets({ photos: [], documents: [] });
                    setModal("vehicle");
                  }}
                >
                  <FiPlus /> Add vehicle
                </button>
                <button
                  type="button"
                  className="trip-modal-close"
                  onClick={() => setModal(null)}
                  aria-label="Close school vehicles"
                >
                  <FiX />
                </button>
              </div>
            </header>
            {resources.vehicles.length ? (
              <div className="school-vehicle-grid">
                {resources.vehicles.map((vehicle) => (
                  <SchoolVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onEdit={() => {
                      setEditingVehicle(vehicle);
                      setVehicleAssets({ photos: [], documents: [] });
                      setVehicleForm({
                        ...emptyVehicle,
                        ...vehicle,
                        year: vehicle.year || "",
                      });
                      setModal("vehicle");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="trip-empty">
                <h2>No school vehicles yet</h2>
                <p>Add a vehicle owned or managed directly by your school.</p>
                <button
                  type="button"
                  className="trip-primary"
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleForm(emptyVehicle);
                    setVehicleAssets({ photos: [], documents: [] });
                    setModal("vehicle");
                  }}
                >
                  <FiPlus /> Add school vehicle
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {detailTrip && !modal && (
        <div
          className="trip-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTrip(null);
          }}
        >
          <section
            className="trip-modal trip-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-detail-title"
          >
            <header>
              <div className="trip-detail-header-copy">
                <p className="page-kicker">TRIP OVERVIEW</p>
                <h2 id="trip-detail-title">{detailTrip.name}</h2>
                <p className="trip-detail-header-summary">
                  <FiMapPin /> {detailTrip.destination}
                  <span aria-hidden="true">·</span>
                  <FiCalendar /> {displayDate(detailTrip.departure_at)}
                </p>
              </div>
              <button
                type="button"
                className="trip-modal-close"
                onClick={() => setSelectedTrip(null)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </header>
            <div className="trip-detail-body">
              <div className="trip-detail-toolbar">
                <span
                  className={`trip-status trip-status-${detailTrip.status}`}
                >
                  {detailTrip.status.replaceAll("_", " ")}
                </span>
                {detailTrip.status === "missed" && (
                  <small className="trip-detail-status-note">
                    No vehicle location was shared within 15 minutes of
                    departure. Guardians and school staff were notified.
                  </small>
                )}
                <button
                  type="button"
                  className="trip-secondary"
                  onClick={() => startTrip(detailTrip)}
                >
                  <FiEdit2 /> Edit trip
                </button>
                {!detailHasAssignedVehicle && (
                  <small className="trip-detail-status-note">
                    Assign a staffed vehicle before opening registration.
                  </small>
                )}
              </div>
              <section className="trip-detail-overview trip-detail-schedule">
                <div className="trip-detail-section-heading">
                  <div>
                    <h3>Schedule & pricing</h3>
                    <p>Key details for this school trip</p>
                  </div>
                  <span className="trip-detail-category">
                    {categories.find(
                      ([value]) => value === detailTrip.category,
                    )?.[1] || "School trip"}
                  </span>
                </div>
                <dl className="trip-detail-facts">
                  <div className="trip-detail-fact trip-detail-fact-wide">
                    <dt>Destination address</dt>
                    <dd>{detailTrip.destination_address || "Not provided"}</dd>
                  </div>
                  <div className="trip-detail-fact">
                    <dt>Departure</dt>
                    <dd>{displayDate(detailTrip.departure_at)}</dd>
                  </div>
                  <div className="trip-detail-fact">
                    <dt>Return</dt>
                    <dd>{displayDate(detailTrip.return_at)}</dd>
                  </div>
                  <div className="trip-detail-fact">
                    <dt>Trip price</dt>
                    <dd>{money(detailTrip)}</dd>
                  </div>
                  <div className="trip-detail-fact">
                    <dt>Invited group</dt>
                    <dd>
                      {detailTrip.target_grade === "all"
                        ? "All learners"
                        : `Grade ${detailTrip.target_grade}`}
                    </dd>
                  </div>
                  <div className="trip-detail-fact">
                    <dt>Accepted learners</dt>
                    <dd>
                      {detailTrip.registered_count || 0}
                      {detailTrip.maximum_learners
                        ? ` / ${detailTrip.maximum_learners}`
                        : ""}{" "}
                      learners
                    </dd>
                  </div>
                </dl>
                {detailTrip.description && (
                  <p className="trip-detail-description">
                    {detailTrip.description}
                  </p>
                )}
              </section>
              <section className="trip-detail-overview trip-detail-transport">
                <div className="trip-detail-section-heading">
                  <div>
                    <h3>Vehicles & participating learners</h3>
                    <p>Parent response, payment confirmation and attendance</p>
                  </div>
                  <span className="trip-detail-count">
                    {(detailTrip.vehicles || []).length} vehicles
                  </span>
                </div>
                {detailTrip.status === "in_progress" && (
                  <TripLiveMap trip={detailTrip} />
                )}
                {(detailTrip.vehicles || []).map((assignment) => (
                  <article
                    className="trip-detail-assignment"
                    key={assignment.id}
                  >
                    <div className="trip-detail-vehicle-header">
                      <strong>
                        {assignment.vehicle?.name} ·{" "}
                        {assignment.vehicle?.registration_number}
                      </strong>
                      <small>
                        {fullName(assignment.driver)}{" "}
                        {assignment.coordinator
                          ? ` · Coordinator ${fullName(assignment.coordinator)}`
                          : ""}
                      </small>
                      {["in_progress", "completed"].includes(
                        detailTrip.status,
                      ) && (
                        <span className="trip-journey-phase">
                          {journeyPhaseLabel(assignment.journey_phase)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="trip-secondary trip-detail-share"
                      disabled={
                        detailTrip.status !== "in_progress" ||
                        (["at_destination", "completed"].includes(
                          assignment.journey_phase,
                        ) &&
                          sharingAssignment !== assignment.id)
                      }
                      onClick={() =>
                        sharingAssignment === assignment.id
                          ? stopLocationSharing()
                          : startLocationSharing(assignment)
                      }
                    >
                      {sharingAssignment === assignment.id
                        ? "Stop sharing"
                        : assignment.journey_phase === "at_destination"
                          ? "Sharing paused at destination"
                          : assignment.journey_phase === "completed"
                            ? "Vehicle returned"
                            : "Share my location"}
                    </button>
                    {trackingError && sharingAssignment === null && (
                      <small
                        role="alert"
                        className="trip-location-error trip-detail-tracking"
                      >
                        {trackingError}
                      </small>
                    )}
                    <small className="trip-detail-tracking">
                      {assignment.tracking
                        ? `${
                            isFreshTracking(assignment.tracking) &&
                            ["outbound", "returning"].includes(
                              assignment.journey_phase,
                            )
                              ? "Location updated"
                              : "Last known location"
                          } ${new Date(
                            assignment.tracking.recorded_at,
                          ).toLocaleTimeString()}${
                            assignment.tracking.shared_by
                              ? ` · Shared by ${fullName(
                                  assignment.tracking.shared_by,
                                )}`
                              : ""
                          }`
                        : "Location unavailable · No GPS update"}
                    </small>
                    {(assignment.learners || []).map((learner) => (
                      <div
                        className="trip-detail-learner"
                        key={learner.child_id}
                      >
                        <span>
                          {learner.child?.name} {learner.child?.lastname} ·{" "}
                          {learner.child?.grade || "Grade unset"}
                        </span>
                        <span
                          className={`trip-parent-response trip-parent-response-${learner.parent_response || "pending"}`}
                        >
                          {learner.parent_response === "accepted"
                            ? "Attending"
                            : learner.parent_response === "declined"
                              ? "Not attending"
                              : "Awaiting parent"}
                        </span>
                        {!detailTrip.is_free && (
                          <span className="trip-payment-state">
                            Payment:{" "}
                            {(learner.payment_status || "unpaid").replaceAll(
                              "_",
                              " ",
                            )}
                            {learner.payment_method === "cash" &&
                            learner.cash_payment_status === "pending"
                              ? ` · cash requested (${cashRequestLabel(detailTrip, learner)})`
                              : ""}
                          </span>
                        )}
                        {learner.cash_payment_status === "pending" && (
                          <div className="trip-cash-confirm-actions">
                            <button
                              type="button"
                              className="trip-primary"
                              onClick={() =>
                                void updateTripLearner(detailTrip, learner, {
                                  cash_payment_action: "confirm",
                                })
                              }
                            >
                              Confirm cash received
                            </button>
                            <button
                              type="button"
                              className="trip-secondary"
                              onClick={() =>
                                void updateTripLearner(detailTrip, learner, {
                                  cash_payment_action: "reject",
                                })
                              }
                            >
                              Reject request
                            </button>
                          </div>
                        )}
                        <select
                          aria-label={`Attendance for ${learner.child?.name}`}
                          value={learner.attendance_status}
                          onChange={(event) =>
                            void updateTripLearner(detailTrip, learner, {
                              attendance_status: event.target.value,
                            })
                          }
                        >
                          <option value="not_checked">Not checked</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>
                    ))}
                  </article>
                ))}
                {!(detailTrip.vehicles || []).length && (
                  <p className="trip-detail-empty">
                    No school vehicles are assigned to this trip yet.
                  </p>
                )}
              </section>
              <section className="trip-detail-overview trip-detail-emergency">
                <div className="trip-detail-section-heading">
                  <div>
                    <h3>Emergency & safety</h3>
                    <p>Important contact information for the trip</p>
                  </div>
                </div>
                <div className="trip-detail-emergency-grid">
                  <div>
                    <span>Emergency contact</span>
                    <strong>
                      {detailTrip.emergency_contact || "Not provided"}
                    </strong>
                  </div>
                  <div>
                    <span>Safety notes</span>
                    <p>
                      {detailTrip.emergency_notes ||
                        "No emergency notes provided."}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
