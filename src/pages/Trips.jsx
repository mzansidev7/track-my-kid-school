import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
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
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { successMessage, showErrorAlert } from "../components/sweetAlert.js";
import "../styles/trips.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
];
const tripStatusTransitions = {
  draft: ["draft", "registration_open", "preparing", "cancelled"],
  registration_open: [
    "draft",
    "registration_open",
    "confirmed",
    "preparing",
    "cancelled",
  ],
  confirmed: ["draft", "confirmed", "preparing", "cancelled"],
  preparing: ["draft", "preparing", "cancelled"],
  in_progress: ["in_progress", "completed"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};
const availableTripStatuses = (status, hasAssignedVehicle) => {
  const validTransitions = tripStatusTransitions[status] || [status];
  return hasAssignedVehicle
    ? validTransitions
    : validTransitions.filter(
        (nextStatus) =>
          nextStatus === status || ["draft", "preparing"].includes(nextStatus),
      );
};
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
const money = (trip) =>
  trip.is_free
    ? "Free"
    : `${trip.currency || "ZAR"} ${Number(trip.price || 0).toFixed(2)}`;
const tripSeatCapacity = (trip) =>
  (trip.vehicles || []).reduce(
    (total, assignment) =>
      total + Number(assignment.vehicle?.passenger_capacity || 0),
    0,
  );
const tripSeatRequirement = (trip) =>
  Number(trip.maximum_learners || trip.minimum_learners || 0);
const tripNeedsMoreVehicles = (trip) =>
  tripSeatRequirement(trip) > tripSeatCapacity(trip);
const registrationState = (trip) => {
  if (trip.status === "draft") return "Not published";
  if (trip.status !== "registration_open") return "Closed";
  if (
    trip.registration_closes_at &&
    new Date(trip.registration_closes_at).getTime() < Date.now()
  )
    return "Closed";
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

export default function Trips() {
  const auth = getAuth();
  const [trips, setTrips] = useState([]);
  const [resources, setResources] = useState({
    vehicles: [],
    learners: [],
    staff: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTripStatuses, setUpdatingTripStatuses] = useState({});
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All trips");
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
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedLearners, setSelectedLearners] = useState({});
  const [learnerAssignments, setLearnerAssignments] = useState({});
  const [learnerVehicleChoice, setLearnerVehicleChoice] = useState([]);
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
      setTrips(Array.isArray(tripData) ? tripData : []);
      setResources({
        vehicles: Array.isArray(resourceData.vehicles)
          ? resourceData.vehicles
          : [],
        learners: Array.isArray(resourceData.learners)
          ? resourceData.learners
          : [],
        staff: Array.isArray(resourceData.staff) ? resourceData.staff : [],
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load school trips.");
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (!trips.some((trip) => trip.status === "in_progress")) {
      return undefined;
    }
    const interval = window.setInterval(() => void loadData(), 10000);
    return () => window.clearInterval(interval);
  }, [loadData, trips]);

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
    setDestinationLocked(Boolean(trip));
    setEditingTrip(trip);
    setGradeFilter("all");
    if (!trip) {
      setTripForm(emptyTrip);
      setSelectedLearners({});
      setLearnerAssignments({});
      setLearnerVehicleChoice([]);
      setModal("trip");
      return;
    }
    setTripForm({
      ...emptyTrip,
      ...trip,
      departure_at: localDateTime(trip.departure_at),
      return_at: localDateTime(trip.return_at),
      registration_closes_at: localDateTime(trip.registration_closes_at),
      destination_latitude: trip.destination_latitude ?? "",
      destination_longitude: trip.destination_longitude ?? "",
      price: trip.price ?? "",
      deposit: trip.deposit ?? "",
      maximum_learners: trip.maximum_learners ?? "",
    });
    const selected = {};
    const learnerVehicles = {};
    const assignmentById = new Map(
      (trip.vehicles || []).map((assignment) => [assignment.id, assignment]),
    );
    (trip.learners || []).forEach((item) => {
      if (item.registration_status === "registered") {
        selected[item.child_id] = true;
        learnerVehicles[item.child_id] =
          assignmentById.get(item.vehicle_assignment_id)?.vehicle_id || "";
      }
    });
    setSelectedLearners(selected);
    setLearnerAssignments(learnerVehicles);
    const existingVehicleIds = [
      ...new Set([
        ...(trip.vehicles || []).map((assignment) => assignment.vehicle_id),
        ...Object.values(learnerVehicles).filter(Boolean),
      ]),
    ];
    setLearnerVehicleChoice(existingVehicleIds);
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

  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const needle = query.toLowerCase().trim();
        const searchable =
          `${trip.name} ${trip.destination} ${trip.status} ${(trip.vehicles || []).map((row) => `${row.vehicle?.name || ""} ${row.vehicle?.registration_number || ""} ${fullName(row.driver)}`).join(" ")}`.toLowerCase();
        const tabMatches =
          activeTab === "All trips" ||
          (activeTab === "Upcoming" &&
            !["completed", "cancelled"].includes(trip.status)) ||
          (activeTab === "Completed" && trip.status === "completed") ||
          trip.category === activeTab.toLowerCase();
        return (
          tabMatches &&
          (!needle || searchable.includes(needle)) &&
          (statusFilter === "all" || trip.status === statusFilter) &&
          (typeFilter === "all" || trip.category === typeFilter) &&
          (!dateFilter || trip.departure_at?.slice(0, 10) === dateFilter) &&
          (vehicleFilter === "all" ||
            (trip.vehicles || []).some(
              (assignment) => assignment.vehicle_id === vehicleFilter,
            )) &&
          (staffFilter === "all" ||
            (trip.vehicles || []).some(
              (assignment) =>
                assignment.driver_admin_id === staffFilter ||
                assignment.coordinator_admin_id === staffFilter,
            )) &&
          (!destinationFilter ||
            trip.destination
              .toLowerCase()
              .includes(destinationFilter.toLowerCase()))
        );
      }),
    [
      activeTab,
      dateFilter,
      destinationFilter,
      query,
      staffFilter,
      statusFilter,
      trips,
      typeFilter,
      vehicleFilter,
    ],
  );
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTrips = filteredTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selectedCount = Object.values(selectedLearners).filter(Boolean).length;
  const assignLearnersToVehicles = (learnerIds, vehicleIds) => {
    const selectedVehicleIds = [...new Set(vehicleIds)];
    setLearnerVehicleChoice(selectedVehicleIds);
    setLearnerAssignments((current) => {
      const next = { ...current };
      learnerIds.forEach((learnerId) => delete next[learnerId]);
      const remainingSeats = new Map(
        selectedVehicleIds.map((vehicleId) => [
          vehicleId,
          Number(
            resources.vehicles.find((vehicle) => vehicle.id === vehicleId)
              ?.passenger_capacity || 0,
          ),
        ]),
      );
      let vehicleIndex = 0;
      learnerIds.forEach((learnerId) => {
        for (
          let attempts = 0;
          attempts < selectedVehicleIds.length;
          attempts += 1
        ) {
          const vehicleId =
            selectedVehicleIds[vehicleIndex % selectedVehicleIds.length];
          vehicleIndex = (vehicleIndex + 1) % selectedVehicleIds.length;
          const seats = remainingSeats.get(vehicleId) || 0;
          if (seats <= 0) continue;
          next[learnerId] = vehicleId;
          remainingSeats.set(vehicleId, seats - 1);
          break;
        }
      });
      return next;
    });
  };
  const selectLearnerGrade = (grade) => {
    setGradeFilter(grade);
    const selectedIds = resources.learners
      .filter((student) => grade === "all" || student.grade === grade)
      .map((student) => student.id);
    setSelectedLearners(
      Object.fromEntries(selectedIds.map((learnerId) => [learnerId, true])),
    );
    assignLearnersToVehicles(selectedIds, learnerVehicleChoice);
  };
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
  const maximumSeatShortfall = tripForm.maximum_learners
    ? Math.max(Number(tripForm.maximum_learners) - selectedCapacity, 0)
    : 0;

  const submitTrip = async (event) => {
    event.preventDefault();
    setError("");
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
    if (!tripForm.is_free && Number(tripForm.price) < 0) {
      setError("Trip price cannot be negative.");
      return;
    }
    if (
      tripForm.maximum_learners &&
      selectedCount > Number(tripForm.maximum_learners)
    ) {
      setError("Selected learners exceed the trip registration capacity.");
      return;
    }
    const assignmentsByVehicle = new Map();
    const selectedLearnerIds = Object.keys(selectedLearners).filter(
      (id) => selectedLearners[id],
    );
    const unassignedLearnerIds = [];
    for (const learner of resources.learners) {
      if (!selectedLearners[learner.id]) continue;
      const vehicleId = learnerAssignments[learner.id];
      if (!vehicleId) {
        unassignedLearnerIds.push(learner.id);
        continue;
      }
      if (!assignmentsByVehicle.has(vehicleId))
        assignmentsByVehicle.set(vehicleId, []);
      assignmentsByVehicle.get(vehicleId).push(learner.id);
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
        child_ids: assignmentsByVehicle.get(vehicleId) || [],
      };
    });
    const saveAsDraft = !editingTrip && vehiclePayload.length === 0;
    const status = saveAsDraft ? "draft" : tripForm.status;
    const canKeepUnassignedLearners =
      status === "draft" && vehiclePayload.length === 0;
    if (unassignedLearnerIds.length && !canKeepUnassignedLearners) {
      const learner = resources.learners.find(
        (item) => item.id === unassignedLearnerIds[0],
      );
      setError(
        `Assign ${learner?.name || "each selected learner"} to a school vehicle.`,
      );
      return;
    }
    const unstaffedVehicle = vehiclePayload.find(
      (assignment) => !assignment.driver_admin_id,
    );
    if (unstaffedVehicle) {
      setError("Assign a driver to every selected vehicle.");
      return;
    }
    if (vehiclePayload.length && selectedCount > selectedCapacity) {
      setError(
        "Learners exceed the passenger capacity of the assigned vehicles.",
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...tripForm,
        status,
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
        child_ids: selectedLearnerIds,
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
        title: saveAsDraft
          ? "Trip saved as draft — assign a vehicle to publish"
          : editingTrip
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

  const tabs = [
    "All trips",
    "Upcoming",
    "Completed",
    ...categories.map((item) => item[1]),
  ];
  const detailTrip =
    (selectedTrip && trips.find((item) => item.id === selectedTrip.id)) ||
    selectedTrip;
  const detailHasAssignedVehicle = (detailTrip?.vehicles || []).length > 0;
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
        <section className="trips-heading">
          <div>
            <p className="page-kicker">TRANSPORT OPERATIONS</p>
            <h1>School Trips</h1>
            <p>
              Plan excursions, assign school vehicles and notify participating
              families.
            </p>
          </div>
          <div
            className="trip-heading-actions"
            style={{ display: "flex", gap: "0.5rem" }}
          >
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
          </div>
        </section>
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
              <strong>
                {
                  trips.filter((item) =>
                    ["registration_open", "confirmed", "preparing"].includes(
                      item.status,
                    ),
                  ).length
                }
              </strong>
              <em>Registration / preparation</em>
            </div>
          </article>
          <article>
            <span className="trip-metric-icon blue">
              <FiUsers />
            </span>
            <div>
              <small>Eligible learners</small>
              <strong>
                {trips.reduce(
                  (sum, item) => sum + (item.registered_count || 0),
                  0,
                )}
              </strong>
              <em>Paid on paid trips; registered on free trips</em>
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
          <nav className="trip-tabs" aria-label="Trip categories">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
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
                      <th>View</th>
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
                          <small>registered</small>
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
                                (trip.vehicles || []).length > 0,
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
                            className={`trip-registration trip-registration-${registrationState(trip).toLowerCase().replaceAll(" ", "-")}`}
                          >
                            {registrationState(trip)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="trip-row-action"
                            aria-label={`View details for ${trip.name}`}
                            title="View trip details"
                            onClick={() => setSelectedTrip(trip)}
                          >
                            <FiEye color="#17204d" aria-hidden="true" />
                          </button>
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
                    onClick={() => setPage((value) => value - 1)}
                  >
                    ‹
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
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
                  Set event details, choose participating learners and allocate
                  each group to a school vehicle.
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
                {(minimumSeatShortfall > 0 || maximumSeatShortfall > 0) && (
                  <div className="trip-capacity-warning-panel" role="status">
                    <FiAlertCircle aria-hidden="true" />
                    <div>
                      <strong>Vehicle capacity is below the trip target</strong>
                      <p>
                        {minimumSeatShortfall > 0 && (
                          <>
                            Add at least {minimumSeatShortfall} seat(s) to meet
                            the minimum learner count.{" "}
                          </>
                        )}
                        {maximumSeatShortfall > 0 && (
                          <>
                            Add at least {maximumSeatShortfall} seat(s) to cover
                            maximum registrations.
                          </>
                        )}{" "}
                        Select another vehicle in the participating learners
                        section.
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
                      {selectedCount} learners selected ·{" "}
                      {selectedCapacity >= selectedCount
                        ? `${selectedCapacity - selectedCount} assigned vehicle spaces remaining`
                        : `${selectedCount - selectedCapacity} learner(s) over assigned vehicle capacity`}
                    </p>
                  </div>
                  <span>{resources.learners.length} school learners</span>
                </div>
                <div className="trip-learner-selectors">
                  <label>
                    <strong> Select which students</strong>

                    <small>
                      {selectedCount
                        ? `${selectedCount} learner${selectedCount === 1 ? "" : "s"} selected`
                        : "Choose a grade to select its learners."}
                    </small>
                    <select
                      value={gradeFilter}
                      onChange={(event) =>
                        selectLearnerGrade(event.target.value)
                      }
                    >
                      <option value="all">All grades</option>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div
                    className="trip-vehicle-multi-select"
                    role="group"
                    aria-label="Vehicles for selected students"
                  >
                    <strong>Vehicles for selected students</strong>
                    <small>
                      Select one or more vehicles. Selected learners are
                      distributed across them up to each vehicle’s capacity.
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
                                  assignLearnersToVehicles(
                                    Object.keys(selectedLearners).filter(
                                      (learnerId) =>
                                        selectedLearners[learnerId],
                                    ),
                                    nextVehicleIds,
                                  );
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
                        No vehicle is assigned. This trip will be saved as a
                        draft until you assign a school vehicle.{" "}
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
                        ? availableTripStatuses(
                            editingTrip.status,
                            (editingTrip.vehicles || []).length > 0,
                          )
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
                  disabled={saving}
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
                      VIN / chassis number
                      <input
                        value={vehicleForm.vin}
                        onChange={setVehicleField("vin")}
                        placeholder="Optional"
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
                <button
                  type="button"
                  className="trip-secondary"
                  onClick={() => startTrip(detailTrip)}
                >
                  <FiEdit2 /> Edit trip
                </button>
                {!detailHasAssignedVehicle && (
                  <small className="trip-detail-status-note">
                    Without a vehicle, only draft or preparing is available.
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
                    <dt>
                      {detailTrip.is_free
                        ? "Registered learners"
                        : "Paid learners"}
                    </dt>
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
                    <h3>Vehicles & assigned learners</h3>
                    <p>Transport and attendance for this trip</p>
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
                    </div>
                    <button
                      type="button"
                      className="trip-secondary trip-detail-share"
                      disabled={detailTrip.status !== "in_progress"}
                      onClick={() =>
                        sharingAssignment === assignment.id
                          ? stopLocationSharing()
                          : startLocationSharing(assignment)
                      }
                    >
                      {sharingAssignment === assignment.id
                        ? "Stop sharing"
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
                        ? `Last location ${new Date(assignment.tracking.recorded_at).toLocaleTimeString()}`
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
                        {detailTrip.is_free ? (
                          <label className="trip-detail-registration-toggle">
                            <input
                              type="checkbox"
                              checked={
                                learner.registration_status === "registered" ||
                                !learner.registration_status
                              }
                              onChange={(event) =>
                                void updateTripLearner(detailTrip, learner, {
                                  registration_status: event.target.checked
                                    ? "registered"
                                    : "cancelled",
                                })
                              }
                            />
                            <span>Registered</span>
                          </label>
                        ) : (
                          <label className="trip-detail-payment-control">
                            <span>Payment</span>
                            <select
                              aria-label={`Payment status for ${learner.child?.name}`}
                              value={learner.payment_status || "unpaid"}
                              onChange={(event) =>
                                void updateTripLearner(detailTrip, learner, {
                                  payment_status: event.target.value,
                                })
                              }
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="deposit_paid">Deposit paid</option>
                              <option value="paid">Paid</option>
                              <option value="waived">Waived</option>
                            </select>
                          </label>
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
