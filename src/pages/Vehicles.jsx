import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowDown,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiPlus,
  FiSearch,
  FiTool,
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import SchoolPageHeader from "../components/SchoolPageHeader";
import "../styles/vehicles.css";

const tabs = ["All Vehicles", "Active", "Under Maintenance", "Out of Service"];
const vehicleTypes = ["bus", "minibus", "taxi", "van", "car", "other"];
const PAGE_SIZE = 6;
const emptyVehicle = {
  name: "",
  registration_number: "",
  vehicle_type: "bus",
  make: "",
  model: "",
  passenger_capacity: "",
  status: "available",
};

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

const readVehicleCache = (cacheKey) => {
  try {
    const data = JSON.parse(localStorage.getItem(cacheKey) || "null")?.data;
    return Array.isArray(data?.vehicles) && Array.isArray(data?.trips)
      ? {
          ...data,
          ownerVehicles: Array.isArray(data.ownerVehicles)
            ? data.ownerVehicles
            : [],
          school: data.school || null,
        }
      : null;
  } catch {
    return null;
  }
};

const getStaffName = (staff) =>
  [staff?.first_name, staff?.last_name].filter(Boolean).join(" ") ||
  staff?.name ||
  "";

const formatStatus = (status) => {
  if (status === "available" || status === "assigned" || status === "active")
    return "Active";
  if (status === "maintenance") return "Under Maintenance";
  if (status === "inactive") return "Out of Service";
  return status || "Unknown";
};

const getImageUrl = (image) =>
  typeof image === "string" ? image : image?.url || image?.publicUrl || "";

const getVehiclePhotos = (vehicle) =>
  [
    ...(Array.isArray(vehicle.photos) ? vehicle.photos : []),
    ...(Array.isArray(vehicle.vehicle_images) ? vehicle.vehicle_images : []),
  ]
    .map(getImageUrl)
    .filter(Boolean);

const formatDetailDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
};

function Vehicles() {
  const auth = getAuth();
  const cacheKey = `schoolVehiclesCache:${auth.user?.id || "current"}`;
  const initialCache = readVehicleCache(cacheKey);
  const [vehicles, setVehicles] = useState(initialCache?.vehicles || []);
  const [ownerVehicles, setOwnerVehicles] = useState(
    initialCache?.ownerVehicles || [],
  );
  const [school, setSchool] = useState(initialCache?.school || null);
  const [trips, setTrips] = useState(initialCache?.trips || []);
  const [loading, setLoading] = useState(!initialCache);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Vehicles");
  const [typeFilter, setTypeFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [page, setPage] = useState(1);
  const selectedVehiclePhotos = selectedVehicle
    ? getVehiclePhotos(selectedVehicle)
    : [];

  useEffect(() => {
    if (selectedPhotoIndex === null) return undefined;
    const handlePhotoKeyDown = (event) => {
      if (event.key === "Escape") setSelectedPhotoIndex(null);
      if (event.key === "ArrowLeft" && selectedVehiclePhotos.length > 1) {
        setSelectedPhotoIndex(
          (index) =>
            (index - 1 + selectedVehiclePhotos.length) %
            selectedVehiclePhotos.length,
        );
      }
      if (event.key === "ArrowRight" && selectedVehiclePhotos.length > 1) {
        setSelectedPhotoIndex(
          (index) => (index + 1) % selectedVehiclePhotos.length,
        );
      }
    };
    window.addEventListener("keydown", handlePhotoKeyDown);
    return () => window.removeEventListener("keydown", handlePhotoKeyDown);
  }, [selectedPhotoIndex, selectedVehiclePhotos.length]);

  const loadVehicles = useCallback(async () => {
    setError("");
    try {
      const headers = { Authorization: `Bearer ${auth.token || ""}` };
      const [resourceData, tripData] = await Promise.all([
        apiRequest("/school/trips/resources", { headers }),
        apiRequest("/school/trips", { headers }),
      ]);
      setVehicles(
        Array.isArray(resourceData.vehicles) ? resourceData.vehicles : [],
      );
      setOwnerVehicles(
        Array.isArray(resourceData.owner_vehicles)
          ? resourceData.owner_vehicles
          : [],
      );
      setSchool(resourceData.school || null);
      setTrips(Array.isArray(tripData) ? tripData : []);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: {
            vehicles: Array.isArray(resourceData.vehicles)
              ? resourceData.vehicles
              : [],
            ownerVehicles: Array.isArray(resourceData.owner_vehicles)
              ? resourceData.owner_vehicles
              : [],
            school: resourceData.school || null,
            trips: Array.isArray(tripData) ? tripData : [],
          },
          timestamp: Date.now(),
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to load fleet vehicles.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadVehicles(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadVehicles]);

  useEffect(() => {
    if (!supabaseClient || !auth.user?.id) return undefined;
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => void loadVehicles(), 200);
    };
    const channel = supabaseClient
      .channel(`school-vehicles:${auth.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "school_vehicles" },
        scheduleRefresh,
      )
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
        { event: "*", schema: "public", table: "route_assignments" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("School vehicles realtime unavailable:", status);
        }
      });

    return () => {
      window.clearTimeout(refreshTimeout);
      void supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadVehicles]);

  const assignmentsByVehicle = useMemo(() => {
    const assignments = new Map();
    trips.forEach((trip) => {
      (trip.vehicles || []).forEach((assignment) => {
        if (!assignment.vehicle_id) return;
        const current = assignments.get(assignment.vehicle_id) || [];
        current.push({
          tripId: trip.id,
          tripName: trip.name,
          destination: trip.destination,
          driverId: assignment.driver_admin_id,
          driverName: getStaffName(assignment.driver),
        });
        assignments.set(assignment.vehicle_id, current);
      });
    });
    return assignments;
  }, [trips]);

  const vehicleRows = useMemo(
    () =>
      [
        ...vehicles.map((vehicle) => ({
          ...vehicle,
          school_id: school?.id || "",
          school_name: school?.name || "Your school",
          owner_name: "School fleet",
          vehicle_source: "school",
          assignments: assignmentsByVehicle.get(vehicle.id) || [],
        })),
        ...ownerVehicles,
      ],
    [assignmentsByVehicle, ownerVehicles, school, vehicles],
  );

  const drivers = useMemo(() => {
    const entries = new Map();
    vehicleRows.forEach((vehicle) =>
      vehicle.assignments.forEach((assignment) => {
        if (assignment.driverId && assignment.driverName) {
          entries.set(assignment.driverId, assignment.driverName);
        }
      }),
    );
    return [...entries].map(([id, name]) => ({ id, name }));
  }, [vehicleRows]);

  const destinations = useMemo(
    () =>
      [
        ...new Set(
          vehicleRows.flatMap((vehicle) =>
            vehicle.assignments
              .map((assignment) => assignment.destination)
              .filter(Boolean),
          ),
        ),
      ].sort((first, second) => first.localeCompare(second)),
    [vehicleRows],
  );

  const schools = useMemo(
    () =>
      [
        ...new Map(
          vehicleRows
            .filter((vehicle) => vehicle.school_id)
            .map((vehicle) => [
              vehicle.school_id,
              { id: vehicle.school_id, name: vehicle.school_name },
            ]),
        ).values(),
      ].sort((first, second) => first.name.localeCompare(second.name)),
    [vehicleRows],
  );
  const owners = useMemo(
    () =>
      [
        ...new Map(
          ownerVehicles
            .filter((vehicle) => vehicle.owner_id)
            .map((vehicle) => [
              vehicle.owner_id,
              { id: vehicle.owner_id, name: vehicle.owner_name },
            ]),
        ).values(),
      ].sort((first, second) => first.name.localeCompare(second.name)),
    [ownerVehicles],
  );

  const filteredVehicles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicleRows.filter((vehicle) => {
      const searchable = [
        vehicle.name,
        vehicle.id,
        vehicle.registration_number,
        vehicle.vehicle_type,
        vehicle.make,
        vehicle.model,
        vehicle.school_name,
        vehicle.owner_name,
        ...vehicle.assignments.flatMap((assignment) => [
          assignment.driverName,
          assignment.tripName,
          assignment.destination,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const statusMatches =
        activeTab === "All Vehicles" ||
        (activeTab === "Active" &&
          ["available", "assigned", "active"].includes(vehicle.status)) ||
        (activeTab === "Under Maintenance" &&
          vehicle.status === "maintenance") ||
        (activeTab === "Out of Service" && vehicle.status === "inactive");
      const typeMatches =
        typeFilter === "all" || vehicle.vehicle_type === typeFilter;
      const driverMatches =
        driverFilter === "all" ||
        vehicle.assignments.some(
          (assignment) => assignment.driverId === driverFilter,
        );
      const routeMatches =
        routeFilter === "all" ||
        vehicle.assignments.some(
          (assignment) => assignment.destination === routeFilter,
        );
      const schoolMatches =
        schoolFilter === "all" || vehicle.school_id === schoolFilter;
      const ownerMatches =
        ownerFilter === "all" ||
        (ownerFilter === "school"
          ? vehicle.vehicle_source === "school"
          : vehicle.owner_id === ownerFilter);
      return (
        statusMatches &&
        typeMatches &&
        driverMatches &&
        routeMatches &&
        schoolMatches &&
        ownerMatches &&
        (!needle || searchable.includes(needle))
      );
    });
  }, [
    activeTab,
    driverFilter,
    ownerFilter,
    query,
    routeFilter,
    schoolFilter,
    typeFilter,
    vehicleRows,
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pageVehicles = filteredVehicles.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  );
  const paginationItems =
    pageCount <= 5
      ? Array.from({ length: pageCount }, (_, index) => index + 1)
      : [
          1,
          ...(visiblePage > 3 ? ["start-gap"] : []),
          ...Array.from(
            { length: Math.min(3, pageCount - 2) },
            (_, index) =>
              Math.max(2, Math.min(visiblePage - 1, pageCount - 3)) + index,
          ),
          ...(visiblePage < pageCount - 2 ? ["end-gap"] : []),
          pageCount,
        ];

  const totalCapacity = vehicleRows.reduce(
    (total, vehicle) => total + (Number(vehicle.passenger_capacity) || 0),
    0,
  );
  const activeCount = vehicleRows.filter((vehicle) =>
    ["available", "assigned", "active"].includes(vehicle.status),
  ).length;
  const maintenanceCount = vehicleRows.filter(
    (vehicle) => vehicle.status === "maintenance",
  ).length;
  const outOfServiceCount = vehicleRows.filter(
    (vehicle) => vehicle.status === "inactive",
  ).length;

  const openAddVehicle = () => {
    setVehicleForm(emptyVehicle);
    setError("");
    setModalOpen(true);
  };

  const setVehicleField = (field) => (event) => {
    setVehicleForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const submitVehicle = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const savedVehicle = await apiRequest("/school/vehicles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...vehicleForm,
          registration_number: vehicleForm.registration_number
            .trim()
            .toUpperCase(),
          passenger_capacity: Number(vehicleForm.passenger_capacity),
          make: vehicleForm.make.trim() || null,
          model: vehicleForm.model.trim() || null,
        }),
      });
      const nextVehicles = [...vehicles, savedVehicle];
      setVehicles(nextVehicles);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: { vehicles: nextVehicles, ownerVehicles, school, trips },
          timestamp: Date.now(),
        }),
      );
      setPage(1);
      setModalOpen(false);
      setVehicleForm(emptyVehicle);
    } catch (requestError) {
      setError(requestError.message || "Unable to add school vehicle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-content vehicles-content">
      <SchoolPageHeader
        className="vehicles-heading"
        actionsClassName="vehicles-actions"
        eyebrow="FLEET MANAGEMENT"
        titleIcon={<span className="school-page-heading-icon"><FiTruck /></span>}
        title="Vehicles"
        description="View school-owned vehicles and transport-owner vehicles assigned to school routes."
        // actions={
        //   <button
        //     className="vehicle-primary"
        //     type="button"
        //     onClick={openAddVehicle}
        //   >
        //     <FiPlus /> Add vehicle
        //   </button>
        // }
      />

      {error && (
        <div className="vehicles-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          {!loading && (
            <button type="button" onClick={() => void loadVehicles()}>
              Retry
            </button>
          )}
        </div>
      )}

      <section className="vehicle-metrics">
        <article>
          <span className="vehicle-metric-icon purple">
            <FiTruck />
          </span>
          <div>
            <small>Total vehicles</small>
            <strong>{vehicleRows.length}</strong>
            <em className="neutral">School and transport-owner fleet</em>
          </div>
        </article>
        <article>
          <span className="vehicle-metric-icon green">
            <FaBus />
          </span>
          <div>
            <small>Active</small>
            <strong>{activeCount}</strong>
            <em className="neutral">Available or assigned</em>
          </div>
        </article>
        <article>
          <span className="vehicle-metric-icon orange">
            <FiTool />
          </span>
          <div>
            <small>Under maintenance</small>
            <strong>{maintenanceCount}</strong>
            <em className="neutral">Unavailable for trips</em>
          </div>
        </article>
        <article>
          <span className="vehicle-metric-icon red">
            <FiAlertCircle />
          </span>
          <div>
            <small>Out of service</small>
            <strong>{outOfServiceCount}</strong>
            <em className="neutral">Inactive vehicles</em>
          </div>
        </article>
        <article>
          <span className="vehicle-metric-icon blue">
            <FiUsers />
          </span>
          <div>
            <small>Total capacity</small>
            <strong>{totalCapacity}</strong>
            <em className="neutral">Passenger seats</em>
          </div>
        </article>
      </section>

      <section className="vehicles-panel">
        <div
          className="vehicle-tabs"
          role="tablist"
          aria-label="Vehicle status"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="vehicles-toolbar">
          <label className="vehicles-search">
            <FiSearch aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search vehicles..."
              aria-label="Search vehicles"
            />
          </label>
          <select
            className="vehicle-filter"
            aria-label="Filter by school"
            value={schoolFilter}
            onChange={(event) => {
              setSchoolFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All schools</option>
            {schools.map((schoolOption) => (
              <option key={schoolOption.id} value={schoolOption.id}>
                {schoolOption.name}
              </option>
            ))}
          </select>
          <select
            className="vehicle-filter"
            aria-label="Filter by owner"
            value={ownerFilter}
            onChange={(event) => {
              setOwnerFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All owners</option>
            <option value="school">School fleet</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <select
            className="vehicle-filter"
            aria-label="Filter by vehicle type"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <select
            className="vehicle-filter"
            aria-label="Filter by assigned driver"
            value={driverFilter}
            onChange={(event) => {
              setDriverFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
          <select
            className="vehicle-filter"
            aria-label="Filter by trip destination"
            value={routeFilter}
            onChange={(event) => {
              setRouteFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All trip destinations</option>
            {destinations.map((destination) => (
              <option key={destination} value={destination}>
                {destination}
              </option>
            ))}
          </select>
        </div>
        <div className="vehicles-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  Vehicle <FiArrowDown />
                </th>
                <th>School</th>
                <th>Owner</th>
                <th>Type / Model</th>
                <th>Registration No.</th>
                <th>Capacity</th>
                <th>Assigned driver</th>
                <th>Trip destination</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageVehicles.map((vehicle) => {
                const driverNames = [
                  ...new Set(
                    vehicle.assignments
                      .map((assignment) => assignment.driverName)
                      .filter(Boolean),
                  ),
                ];
                const tripNames = [
                  ...new Set(
                    vehicle.assignments
                      .map((assignment) => assignment.destination)
                      .filter(Boolean),
                  ),
                ];
                const thumbnail = getVehiclePhotos(vehicle)[0];
                return (
                  <tr key={`${vehicle.vehicle_source}-${vehicle.id}`}>
                    <td>
                      <div className="vehicle-name">
                        <span className="vehicle-thumb">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" loading="lazy" />
                          ) : (
                            <FaBus aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <strong>{vehicle.name}</strong>
                          <small>ID: {vehicle.id.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>
                    <td>{vehicle.school_name || "—"}</td>
                    <td>{vehicle.owner_name || "School fleet"}</td>
                    <td>
                      {[vehicle.make, vehicle.model, vehicle.vehicle_type]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td>{vehicle.registration_number}</td>
                    <td>{vehicle.passenger_capacity} seats</td>
                    <td>{driverNames.join(", ") || "Assigned per trip"}</td>
                    <td>{tripNames.join(", ") || "Not assigned"}</td>
                    <td>
                      <span
                        className={`vehicle-status ${vehicle.status}`}
                        title={vehicle.status}
                      >
                        {formatStatus(vehicle.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="vehicle-view-action"
                        onClick={() => {
                          setSelectedPhotoIndex(null);
                          setSelectedVehicle(vehicle);
                        }}
                      >
                        <FiEye aria-hidden="true" />
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading ? (
            <div className="empty-vehicles">Loading school vehicles...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="empty-vehicles">
              <FiTruck aria-hidden="true" />
              <strong>
                {vehicleRows.length
                  ? "No vehicles match these filters."
                  : "No vehicles yet."}
              </strong>
              {!vehicleRows.length && (
                <button type="button" onClick={openAddVehicle}>
                  <FiPlus /> Add your first vehicle
                </button>
              )}
            </div>
          ) : null}
        </div>
        <div className="vehicles-footer">
          <span className="vehicles-page-summary">
            Showing{" "}
            {filteredVehicles.length ? (visiblePage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(visiblePage * PAGE_SIZE, filteredVehicles.length)} of{" "}
            {filteredVehicles.length} vehicles
          </span>
          <nav className="vehicles-pagination" aria-label="Vehicle pages">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setPage(visiblePage - 1)}
              disabled={visiblePage === 1}
            >
              ‹
            </button>
            {paginationItems.map((item) =>
              typeof item === "number" ? (
                <button
                  type="button"
                  key={item}
                  className={visiblePage === item ? "current-page" : ""}
                  aria-label={`Page ${item}`}
                  aria-current={visiblePage === item ? "page" : undefined}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ) : (
                <span className="vehicles-pagination-ellipsis" key={item}>
                  …
                </span>
              ),
            )}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setPage(visiblePage + 1)}
              disabled={visiblePage === pageCount}
            >
              ›
            </button>
          </nav>
          <span className="vehicles-page-size">6 vehicles per page</span>
        </div>
      </section>

      {modalOpen && (
        <div
          className="vehicle-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
              setError("");
            }
          }}
        >
          <section
            className="vehicle-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-modal-title"
          >
            <header className="vehicle-modal-header">
              <div>
                <p>School fleet</p>
                <h2 id="vehicle-modal-title">Add school vehicle</h2>
                <span>
                  Add the vehicle details. Driver and trip destination are
                  assigned per trip.
                </span>
              </div>
              <button
                type="button"
                aria-label="Close add vehicle form"
                disabled={saving}
                onClick={() => {
                  setModalOpen(false);
                  setError("");
                }}
              >
                <FiX />
              </button>
            </header>
            <form onSubmit={submitVehicle}>
              <div className="vehicle-form-grid">
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
                    required
                    value={vehicleForm.vehicle_type}
                    onChange={setVehicleField("vehicle_type")}
                  >
                    {vehicleTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Passenger capacity
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={vehicleForm.passenger_capacity}
                    onChange={setVehicleField("passenger_capacity")}
                    placeholder="Number of seats"
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
                  Status
                  <select
                    required
                    value={vehicleForm.status}
                    onChange={setVehicleField("status")}
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Under maintenance</option>
                    <option value="inactive">Out of service</option>
                  </select>
                </label>
              </div>
              {error && (
                <div className="vehicles-error" role="alert">
                  <FiAlertCircle />
                  <span>{error}</span>
                </div>
              )}
              <footer className="vehicle-modal-footer">
                <button
                  type="button"
                  className="vehicle-secondary"
                  disabled={saving}
                  onClick={() => {
                    setModalOpen(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vehicle-primary"
                  disabled={saving}
                >
                  <FiPlus /> {saving ? "Adding vehicle..." : "Add vehicle"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {selectedVehicle && (
        <div
          className="vehicle-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPhotoIndex(null);
              setSelectedVehicle(null);
            }
          }}
        >
          <section
            className="vehicle-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-details-title"
          >
            <header className="vehicle-modal-header">
              <div>
                <p>
                  {selectedVehicle.vehicle_source === "owner"
                    ? "Transport-owner vehicle"
                    : "School fleet"}
                </p>
                <h2 id="vehicle-details-title">
                  {selectedVehicle.name || "Vehicle details"}
                </h2>
                <span>
                  {selectedVehicle.registration_number || "Registration not provided"}
                </span>
              </div>
              <button
                type="button"
                aria-label="Close vehicle details"
                onClick={() => {
                  setSelectedPhotoIndex(null);
                  setSelectedVehicle(null);
                }}
              >
                <FiX />
              </button>
            </header>
            <div className="vehicle-details-content">
              {getVehiclePhotos(selectedVehicle).length > 0 && (
                <div className="vehicle-details-photos">
                  {getVehiclePhotos(selectedVehicle).map((photo, index) => (
                    <button
                      type="button"
                      key={`${photo}-${index}`}
                      aria-label={`View ${selectedVehicle.name || "vehicle"} photo ${index + 1}`}
                      onClick={() => setSelectedPhotoIndex(index)}
                    >
                      <img
                        src={photo}
                        alt={`${selectedVehicle.name || "Vehicle"} photo ${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
              <dl className="vehicle-details-grid">
                {[
                  ["School", selectedVehicle.school_name],
                  ["Owner", selectedVehicle.owner_name],
                  ["Vehicle type", selectedVehicle.vehicle_type],
                  ["Make", selectedVehicle.make],
                  ["Model", selectedVehicle.model],
                  ["Year", selectedVehicle.year],
                  ["Colour", selectedVehicle.colour || selectedVehicle.color],
                  ["Registration number", selectedVehicle.registration_number],
                  ["VIN", selectedVehicle.vin],
                  ["Passenger capacity", selectedVehicle.passenger_capacity],
                  ["Status", formatStatus(selectedVehicle.status)],
                  [
                    "Assigned drivers",
                    [
                      ...new Set(
                        selectedVehicle.assignments
                          .map((assignment) => assignment.driverName)
                          .filter(Boolean),
                      ),
                    ].join(", "),
                  ],
                  [
                    "Routes / destinations",
                    [
                      ...new Set(
                        selectedVehicle.assignments
                          .map(
                            (assignment) =>
                              assignment.tripName || assignment.destination,
                          )
                          .filter(Boolean),
                      ),
                    ].join(", "),
                  ],
                  ["License expiry", formatDetailDate(selectedVehicle.license_expiry)],
                  [
                    "Roadworthy expiry",
                    formatDetailDate(selectedVehicle.roadworthy_expiry),
                  ],
                  [
                    "Insurance expiry",
                    formatDetailDate(selectedVehicle.insurance_expiry),
                  ],
                  ["Added", formatDetailDate(selectedVehicle.created_at)],
                  ["Vehicle ID", selectedVehicle.id],
                ]
                  .filter(([, value]) => value !== null && value !== undefined && value !== "")
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              {Array.isArray(selectedVehicle.documents) &&
                selectedVehicle.documents.length > 0 && (
                  <section className="vehicle-details-documents">
                    <h3>Documents</h3>
                    <ul>
                      {selectedVehicle.documents.map((document, index) => {
                        const url = getImageUrl(document);
                        const label =
                          typeof document === "string"
                            ? `Document ${index + 1}`
                            : document?.fileName ||
                              document?.name ||
                              `Document ${index + 1}`;
                        return (
                          <li key={`${url || label}-${index}`}>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer">
                                {label}
                              </a>
                            ) : (
                              label
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
            </div>
          </section>
        </div>
      )}
      {selectedPhotoIndex !== null &&
        selectedVehiclePhotos[selectedPhotoIndex] && (
          <div
            className="vehicle-photo-viewer"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setSelectedPhotoIndex(null);
            }}
          >
            <section
              className="vehicle-photo-viewer-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedVehicle?.name || "Vehicle"} photo viewer`}
            >
              <button
                type="button"
                className="vehicle-photo-viewer-close"
                aria-label="Close photo viewer"
                onClick={() => setSelectedPhotoIndex(null)}
              >
                <FiX />
              </button>
              {selectedVehiclePhotos.length > 1 && (
                <button
                  type="button"
                  className="vehicle-photo-viewer-nav previous"
                  aria-label="Previous photo"
                  onClick={() =>
                    setSelectedPhotoIndex(
                      (index) =>
                        (index - 1 + selectedVehiclePhotos.length) %
                        selectedVehiclePhotos.length,
                    )
                  }
                >
                  <FiChevronLeft />
                </button>
              )}
              <img
                src={selectedVehiclePhotos[selectedPhotoIndex]}
                alt={`${selectedVehicle?.name || "Vehicle"} photo ${selectedPhotoIndex + 1}`}
              />
              {selectedVehiclePhotos.length > 1 && (
                <button
                  type="button"
                  className="vehicle-photo-viewer-nav next"
                  aria-label="Next photo"
                  onClick={() =>
                    setSelectedPhotoIndex(
                      (index) => (index + 1) % selectedVehiclePhotos.length,
                    )
                  }
                >
                  <FiChevronRight />
                </button>
              )}
              {selectedVehiclePhotos.length > 1 && (
                <div className="vehicle-photo-viewer-count" aria-live="polite">
                  {selectedPhotoIndex + 1} / {selectedVehiclePhotos.length}
                </div>
              )}
            </section>
          </div>
        )}
    </div>
  );
}

export default Vehicles;
