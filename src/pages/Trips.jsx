import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { successMessage, showErrorAlert } from "../components/sweetAlert.js";
import "../styles/trips.css";

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
  status: "available",
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
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All trips");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [tripForm, setTripForm] = useState(emptyTrip);
  const [learnerQuery, setLearnerQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedLearners, setSelectedLearners] = useState({});
  const [learnerAssignments, setLearnerAssignments] = useState({});
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [sharingAssignment, setSharingAssignment] = useState(null);

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
    void loadData();
  }, [loadData]);

  const startTrip = (trip = null) => {
    setError("");
    setEditingTrip(trip);
    setLearnerQuery("");
    setGradeFilter("all");
    if (!trip) {
      setTripForm(emptyTrip);
      setSelectedLearners({});
      setLearnerAssignments({});
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
    (trip.learners || []).forEach((item) => {
      if (item.registration_status === "registered") {
        selected[item.child_id] = true;
        learnerVehicles[item.child_id] = item.vehicle_assignment_id || "";
      }
    });
    setSelectedLearners(selected);
    setLearnerAssignments(learnerVehicles);
    setModal("trip");
  };

  const filteredLearners = useMemo(() => {
    const needle = learnerQuery.trim().toLowerCase();
    return resources.learners.filter((student) => {
      const name =
        `${student.name || ""} ${student.lastname || ""}`.toLowerCase();
      return (
        (!needle || name.includes(needle)) &&
        (gradeFilter === "all" || student.grade === gradeFilter)
      );
    });
  }, [gradeFilter, learnerQuery, resources.learners]);
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
          (!destinationFilter ||
            trip.destination
              .toLowerCase()
              .includes(destinationFilter.toLowerCase()))
        );
      }),
    [activeTab, destinationFilter, query, statusFilter, trips, typeFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTrips = filteredTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selectedCount = Object.values(selectedLearners).filter(Boolean).length;
  const selectedVehicleIds = [
    ...new Set(
      Object.entries(learnerAssignments)
        .filter(([childId]) => selectedLearners[childId])
        .map(([, vehicleId]) => vehicleId)
        .filter(Boolean),
    ),
  ];
  const selectedCapacity = selectedVehicleIds.reduce(
    (sum, vehicleId) =>
      sum +
      Number(
        resources.vehicles.find((vehicle) => vehicle.id === vehicleId)
          ?.passenger_capacity || 0,
      ),
    0,
  );

  const submitTrip = async (event) => {
    event.preventDefault();
    setError("");
    if (new Date(tripForm.return_at) < new Date(tripForm.departure_at)) {
      setError("Return date and time must be after departure.");
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
    for (const learner of resources.learners) {
      if (!selectedLearners[learner.id]) continue;
      const vehicleId = learnerAssignments[learner.id];
      if (!vehicleId) {
        setError(`Assign ${learner.name} to a school vehicle.`);
        return;
      }
      if (!assignmentsByVehicle.has(vehicleId))
        assignmentsByVehicle.set(vehicleId, []);
      assignmentsByVehicle.get(vehicleId).push(learner.id);
    }
    const vehiclePayload = [...assignmentsByVehicle.entries()].map(
      ([vehicleId, childIds]) => {
        const prior = editingTrip?.vehicles?.find(
          (item) => item.vehicle_id === vehicleId,
        );
        return {
          vehicle_id: vehicleId,
          driver_admin_id:
            learnerAssignments[`__driver_${vehicleId}`] ||
            prior?.driver_admin_id ||
            "",
          coordinator_admin_id:
            learnerAssignments[`__coordinator_${vehicleId}`] ||
            prior?.coordinator_admin_id ||
            "",
          child_ids: childIds,
        };
      },
    );
    if (selectedCount && !vehiclePayload.length) {
      setError("Add a school vehicle and assign learners before saving.");
      return;
    }
    if (selectedCount > selectedCapacity) {
      setError(
        "Learners exceed the passenger capacity of the assigned vehicles.",
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...tripForm,
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
        child_ids: Object.keys(selectedLearners).filter(
          (id) => selectedLearners[id],
        ),
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
      successMessage({ title: editingTrip ? "Trip updated" : "Trip created" });
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
      const vehicle = await apiRequest("/school/vehicles", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
        body: JSON.stringify({
          ...vehicleForm,
          year: vehicleForm.year ? Number(vehicleForm.year) : null,
          passenger_capacity: Number(vehicleForm.passenger_capacity),
        }),
      });
      setResources((current) => ({
        ...current,
        vehicles: [...current.vehicles, vehicle],
      }));
      setVehicleForm(emptyVehicle);
      setModal(null);
      successMessage({ title: "School vehicle added" });
    } catch (requestError) {
      setError(requestError.message || "Unable to add school vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (trip, status) => {
    try {
      const updated = await apiRequest(`/school/trips/${trip.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
        body: JSON.stringify({ status }),
      });
      setTrips((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedTrip(updated);
    } catch (requestError) {
      showErrorAlert(requestError.message || "Unable to update trip status.");
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
    setSharingAssignment(assignment.id);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await apiRequest(
            `/school/trips/${selectedTrip.id}/vehicles/${assignment.id}/location`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${auth.token || ""}` },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              }),
            },
          );
        } catch (requestError) {
          setError(requestError.message || "Unable to share location.");
        } finally {
          setSharingAssignment(null);
        }
      },
      (locationError) => {
        setSharingAssignment(null);
        showErrorAlert(
          locationError.message ||
            "Allow location access to share this trip vehicle.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  };

  const tabs = [
    "All trips",
    "Upcoming",
    "Completed",
    ...categories.map((item) => item[1]),
  ];
  const detailTrip =
    (selectedTrip && trips.find((item) => item.id === selectedTrip.id)) ||
    selectedTrip;
  const dateInput = (field, label, required = false) => (
    <label>
      {label}
      <input
        type="datetime-local"
        required={required}
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
          <div className="trip-heading-actions">
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
              <small>Registered learners</small>
              <strong>
                {trips.reduce(
                  (sum, item) => sum + (item.registered_count || 0),
                  0,
                )}
              </strong>
              <em>Across all trips</em>
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
            <button
              type="button"
              className="trip-primary"
              onClick={() => startTrip()}
            >
              <FiPlus /> Add trip
            </button>
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
                      <th>Learners</th>
                      <th>Vehicle & staff</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        onClick={() => setSelectedTrip(trip)}
                        className="trip-row-clickable"
                      >
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
                          <span
                            className={`trip-status trip-status-${trip.status}`}
                          >
                            {trip.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="trip-open-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedTrip(trip);
                            }}
                          >
                            Details <FiArrowUpRight />
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
                  <label>
                    Trip name
                    <input
                      required
                      value={tripForm.name}
                      onChange={setTripField("name")}
                      placeholder="Pretoria Science Museum"
                    />
                  </label>
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
                      value={tripForm.destination}
                      onChange={setTripField("destination")}
                    />
                  </label>
                  <label>
                    Destination address
                    <input
                      required
                      value={tripForm.destination_address}
                      onChange={setTripField("destination_address")}
                    />
                  </label>
                  <label>
                    Destination latitude
                    <input
                      type="number"
                      step="any"
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
                      value={tripForm.destination_longitude}
                      onChange={setTripField("destination_longitude")}
                      placeholder="Optional"
                    />
                  </label>
                  {dateInput("departure_at", "Departure date & time", true)}
                  {dateInput("return_at", "Return date & time", true)}
                  {dateInput("registration_closes_at", "Registration closes")}
                </div>
              </section>
              <section className="trip-form-section">
                <h3>Pricing & capacity</h3>
                <div className="trip-form-grid">
                  <label className="trip-free-toggle">
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
                    />{" "}
                    Free trip
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
                      value={tripForm.payment_deadline || ""}
                      onChange={setTripField("payment_deadline")}
                    />
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
                      value={tripForm.payment_notes}
                      onChange={setTripField("payment_notes")}
                      placeholder="Payment instructions for families"
                    />
                  </label>
                </div>
              </section>
              <section className="trip-form-section">
                <div className="trip-section-title">
                  <div>
                    <h3>Participating learners</h3>
                    <p>
                      {selectedCount} selected ·{" "}
                      {Math.max(0, selectedCapacity - selectedCount)} assigned
                      vehicle spaces remaining
                    </p>
                  </div>
                  <span>{resources.learners.length} school learners</span>
                </div>
                <div className="trip-learner-tools">
                  <label className="trips-search">
                    <FiSearch />
                    <input
                      value={learnerQuery}
                      onChange={(event) => setLearnerQuery(event.target.value)}
                      placeholder="Search learners"
                    />
                  </label>
                  <select
                    value={gradeFilter}
                    onChange={(event) => setGradeFilter(event.target.value)}
                  >
                    <option value="all">All grades</option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="trip-learner-list">
                  {filteredLearners.map((student) => (
                    <div className="trip-learner-row" key={student.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedLearners[student.id])}
                          onChange={(event) =>
                            setSelectedLearners((current) => ({
                              ...current,
                              [student.id]: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {student.name} {student.lastname}
                        </span>
                        <small>{student.grade || "Grade not set"}</small>
                      </label>
                      {selectedLearners[student.id] && (
                        <select
                          aria-label={`Vehicle for ${student.name}`}
                          value={learnerAssignments[student.id] || ""}
                          onChange={(event) =>
                            setLearnerAssignments((current) => ({
                              ...current,
                              [student.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select vehicle</option>
                          {resources.vehicles
                            .filter((vehicle) =>
                              ["available", "assigned"].includes(
                                vehicle.status,
                              ),
                            )
                            .map((vehicle) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {vehicle.name} · {vehicle.registration_number} ·{" "}
                                {vehicle.passenger_capacity} seats
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  ))}
                  {filteredLearners.length === 0 && (
                    <p className="trip-no-learners">
                      No learners match this search.
                    </p>
                  )}
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
                            defaultValue={assignment?.driver_admin_id || ""}
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
                              <option key={person.id} value={person.id}>
                                {fullName(person)} ·{" "}
                                {person.job_title || person.role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Coordinator
                          <select
                            defaultValue={
                              assignment?.coordinator_admin_id || ""
                            }
                            onChange={(event) =>
                              setLearnerAssignments((current) => ({
                                ...current,
                                [`__coordinator_${vehicleId}`]:
                                  event.target.value,
                              }))
                            }
                          >
                            <option value="">Select staff coordinator</option>
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
                    Select learners and assign them to vehicles to allocate a
                    driver or trip coordinator.{" "}
                    <button
                      type="button"
                      className="trip-secondary"
                      onClick={() => setModal("vehicle")}
                    >
                      <FiPlus /> Add school vehicle
                    </button>
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
                      {statuses.map((status) => (
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
            <header>
              <div>
                <p className="page-kicker">SCHOOL FLEET</p>
                <h2 id="school-vehicle-title">Add school vehicle</h2>
                <p>
                  This vehicle is stored under the current school, never under a
                  transport owner.
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
            <form onSubmit={submitVehicle}>
              <div className="trip-form-grid">
                <label>
                  Registration number
                  <input
                    required
                    value={vehicleForm.registration_number}
                    onChange={setVehicleField("registration_number")}
                  />
                </label>
                <label>
                  Vehicle name
                  <input
                    required
                    value={vehicleForm.name}
                    onChange={setVehicleField("name")}
                    placeholder="School Bus 01"
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
                  />
                </label>
                <label>
                  Model
                  <input
                    value={vehicleForm.model}
                    onChange={setVehicleField("model")}
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
                  />
                </label>
                <label>
                  Colour
                  <input
                    value={vehicleForm.colour}
                    onChange={setVehicleField("colour")}
                  />
                </label>
                <label>
                  VIN / chassis
                  <input
                    value={vehicleForm.vin}
                    onChange={setVehicleField("vin")}
                  />
                </label>
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
                <label>
                  Status
                  <select
                    value={vehicleForm.status}
                    onChange={setVehicleField("status")}
                  >
                    {["available", "maintenance", "inactive"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
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
                  onClick={() => setModal(editingTrip ? "trip" : "vehicles")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="trip-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Add school vehicle"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {modal === "vehicles" && (
        <div
          className="trip-modal-backdrop"
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
            <header>
              <div>
                <p className="page-kicker">SCHOOL FLEET</p>
                <h2 id="school-vehicles-title">School vehicles</h2>
                <p>
                  Vehicles belonging to this school and available for
                  school-organized trips.
                </p>
              </div>
              <button
                type="button"
                className="trip-primary"
                onClick={() => {
                  setVehicleForm(emptyVehicle);
                  setModal("vehicle");
                }}
              >
                <FiPlus /> Add vehicle
              </button>
            </header>
            {resources.vehicles.length ? (
              <div className="school-vehicle-grid">
                {resources.vehicles.map((vehicle) => (
                  <article key={vehicle.id}>
                    <span className="trip-vehicle-icon">
                      <FiTruck />
                    </span>
                    <div>
                      <strong>{vehicle.name}</strong>
                      <small>
                        {vehicle.registration_number} · {vehicle.vehicle_type}
                      </small>
                    </div>
                    <b>{vehicle.passenger_capacity} seats</b>
                    <span
                      className={`trip-status trip-status-${vehicle.status}`}
                    >
                      {vehicle.status}
                    </span>
                  </article>
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
                    setVehicleForm(emptyVehicle);
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
              <div>
                <p className="page-kicker">TRIP OVERVIEW</p>
                <h2 id="trip-detail-title">{detailTrip.name}</h2>
                <p>
                  {detailTrip.destination} ·{" "}
                  {displayDate(detailTrip.departure_at)}
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
                <select
                  aria-label="Update trip lifecycle"
                  value={detailTrip.status}
                  onChange={(event) =>
                    void updateStatus(detailTrip, event.target.value)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <section className="trip-detail-overview">
                <h3>Schedule & pricing</h3>
                <dl>
                  <dt>Destination</dt>
                  <dd>{detailTrip.destination_address}</dd>
                  <dt>Departure</dt>
                  <dd>{displayDate(detailTrip.departure_at)}</dd>
                  <dt>Return</dt>
                  <dd>{displayDate(detailTrip.return_at)}</dd>
                  <dt>Price</dt>
                  <dd>{money(detailTrip)}</dd>
                  <dt>Registration</dt>
                  <dd>
                    {detailTrip.registered_count || 0}
                    {detailTrip.maximum_learners
                      ? ` / ${detailTrip.maximum_learners}`
                      : ""}{" "}
                    learners
                  </dd>
                </dl>
                {detailTrip.description && <p>{detailTrip.description}</p>}
              </section>
              <section className="trip-detail-overview">
                <h3>Vehicles & assigned learners</h3>
                {(detailTrip.vehicles || []).map((assignment) => (
                  <article
                    className="trip-detail-assignment"
                    key={assignment.id}
                  >
                    <div>
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
                      className="trip-secondary"
                      disabled={
                        detailTrip.status !== "in_progress" ||
                        sharingAssignment === assignment.id
                      }
                      onClick={() => startLocationSharing(assignment)}
                    >
                      {sharingAssignment === assignment.id
                        ? "Getting location…"
                        : "Share my location"}
                    </button>
                    <small>
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
                        <select
                          aria-label={`Attendance for ${learner.child?.name}`}
                          value={learner.attendance_status}
                          onChange={async (event) => {
                            try {
                              await apiRequest(
                                `/school/trips/${detailTrip.id}/learners/${learner.child_id}`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    Authorization: `Bearer ${auth.token || ""}`,
                                  },
                                  body: JSON.stringify({
                                    attendance_status: event.target.value,
                                  }),
                                },
                              );
                              await loadData();
                              setSelectedTrip(
                                trips.find(
                                  (item) => item.id === detailTrip.id,
                                ) || detailTrip,
                              );
                            } catch (requestError) {
                              showErrorAlert(requestError.message);
                            }
                          }}
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
                  <p>No school vehicles assigned.</p>
                )}
              </section>
              <section className="trip-detail-overview">
                <h3>Emergency contact</h3>
                <p>{detailTrip.emergency_contact || "Not provided"}</p>
                <p>{detailTrip.emergency_notes || "No emergency notes"}</p>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
