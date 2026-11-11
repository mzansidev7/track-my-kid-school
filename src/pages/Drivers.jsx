import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../supabaseClient";
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiMessageCircle,
  FiPlus,
  FiPhone,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import SchoolPageHeader from "../components/SchoolPageHeader";
import {
  showDeleteConfirmationAlert,
  showErrorAlert,
  successMessage,
} from "../components/sweetAlert.js";
import "../styles/drivers.css";
import { PresenceStatus } from "../presence/PresenceIndicator";

const PAGE_SIZE = 8;

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

function readCachedDrivers(cacheKey) {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey) || "null");
    return Array.isArray(value?.data) ? value.data : null;
  } catch {
    return null;
  }
}

function getUser(person) {
  return person?.users || person?.user || {};
}

function getUserId(person) {
  return person?.user_id || getUser(person).id || null;
}

function getPersonName(person) {
  const user = getUser(person);
  return (
    person?.name ||
    [person?.first_name, person?.last_name].filter(Boolean).join(" ") ||
    user.name ||
    "Unnamed"
  );
}

function getRouteStopName(stop) {
  return stop.name || stop.address || stop.stop_type || "Route stop";
}

function Drivers() {
  const auth = getAuth();
  const userId = auth.user?.id || "current";
  const cacheKey = `schoolDriversCache:${userId}`;
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState(
    () => readCachedDrivers(cacheKey) || [],
  );
  const [loading, setLoading] = useState(
    () => readCachedDrivers(cacheKey) === null,
  );
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [driverTypeFilter, setDriverTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [messagingUserId, setMessagingUserId] = useState("");
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [savingDriver, setSavingDriver] = useState(false);
  const [deletingDriverId, setDeletingDriverId] = useState("");
  const [notice, setNotice] = useState("");
  const [driverForm, setDriverForm] = useState({
    first_name: "",
    last_name: "",
    your_email: "",
    phone: "",
  });

  const loadDrivers = useCallback(async () => {
    setError("");
    try {
      const data = await apiRequest("/school/drivers");
      if (!Array.isArray(data)) {
        throw new Error("The school drivers response was invalid.");
      }
      setDrivers(data);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data, timestamp: Date.now() }),
      );
    } catch (loadError) {
      setError(loadError.message || "Unable to load school drivers.");
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDrivers(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDrivers]);

  useEffect(() => {
    if (!addDriverOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAddDriverOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [addDriverOpen]);

  useEffect(() => {
    if (!supabaseClient || userId === "current") return undefined;
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => void loadDrivers(), 200);
    };
    const channel = supabaseClient
      .channel(`school-drivers:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.drivers",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.children",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.owners",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.routes",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.route_assignments",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.route_children",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "route_stops",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_admins",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_trip_vehicles",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_trips",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_vehicle_links",
        },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("School drivers realtime unavailable:", status);
        }
      });

    return () => {
      window.clearTimeout(refreshTimeout);
      void supabaseClient.removeChannel(channel);
    };
  }, [loadDrivers, userId]);

  const filteredDrivers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return drivers.filter((driver) => {
      const relatedPeople = [
        ...(driver.clients || []).map(getPersonName),
        ...(driver.owners || []).map(
          (owner) => owner.company_name || getPersonName(owner),
        ),
      ];
      const routeDetails = (driver.routes || []).flatMap((route) => [
        route.route_name,
        route.start_location,
        route.end_location,
        route.vehicle?.name,
        route.vehicle?.registration_number,
        ...(route.stops || []).map(getRouteStopName),
      ]);
      const searchable = [
        driver.name,
        driver.email,
        driver.phone,
        driver.vehicle_plate_number,
        driver.status,
        driver.job_title,
        driver.driver_type,
        ...relatedPeople,
        ...routeDetails,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (driverTypeFilter === "all" ||
          driver.driver_type === driverTypeFilter) &&
        (!needle || searchable.includes(needle))
      );
    });
  }, [driverTypeFilter, drivers, query]);
  const pageCount = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageDrivers = filteredDrivers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const schoolDriverCount = drivers.filter(
    (driver) => driver.driver_type === "school",
  ).length;
  const ownerDriverCount = drivers.filter(
    (driver) => driver.driver_type === "owner",
  ).length;

  const submitDriver = async (event) => {
    event.preventDefault();
    setSavingDriver(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/school/drivers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(driverForm),
      });
      setDriverForm({
        first_name: "",
        last_name: "",
        your_email: "",
        phone: "",
      });
      setAddDriverOpen(false);
      setNotice(
        result.message ||
          "School driver added. Temporary login details were sent by email.",
      );
      setTimeout(() => {
        setNotice("");
      }, 5000);
      await loadDrivers();
    } catch (submitError) {
      setError(submitError.message || "Unable to add school driver.");
    } finally {
      setSavingDriver(false);
    }
  };

  const deleteDriver = async (driver) => {
    if (driver.driver_type !== "school") return;
    const confirmation = await showDeleteConfirmationAlert({
      title: `Remove ${getPersonName(driver)}?`,
      text: "This school driver will be removed. Any assigned school trips will be unassigned.",
    });
    if (!confirmation.isConfirmed) {
      return;
    }

    setDeletingDriverId(driver.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(
        `/school/drivers/${encodeURIComponent(driver.id)}`,
        { method: "DELETE" },
      );
      if (selectedDriver?.id === driver.id) setSelectedDriver(null);
      successMessage({
        title: result.message || "School driver removed.",
      });
      await loadDrivers();
    } catch (deleteError) {
      showErrorAlert(
        deleteError.message || "Unable to remove school driver.",
      );
    } finally {
      setDeletingDriverId("");
    }
  };

  const openMessage = async (person, conversationType) => {
    const userId = getUserId(person);
    if (!userId) {
      setError("This person does not have a messaging account.");
      return;
    }
    setMessagingUserId(userId);
    setError("");
    try {
      const conversation = await apiRequest("/school/conversations", {
        method: "POST",
        body: JSON.stringify({ otherUserId: userId, conversationType }),
      });
      const conversationId =
        conversation.conversation_id || conversation.conversationId;
      if (!conversationId) {
        throw new Error("Could not open a conversation with this person.");
      }
      navigate(
        `/messages?conversationId=${encodeURIComponent(conversationId)}`,
      );
    } catch (messageError) {
      setError(messageError.message || "Unable to open this conversation.");
    } finally {
      setMessagingUserId("");
    }
  };

  return (
    <div className="portal-content drivers-content">
      <SchoolPageHeader
        className="drivers-heading"
        eyebrow="PEOPLE & TRANSPORT"
        titleIcon={
          <span className="school-page-heading-icon">
            <FiTruck />
          </span>
        }
        title="Drivers"
        description="View school-employed drivers and transport-owner drivers assigned to your students and routes."
        actions={
          <button
            className="driver-add-button"
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setAddDriverOpen(true);
            }}
          >
            <FiPlus aria-hidden="true" />
            Add school driver
          </button>
        }
      />

      {notice && (
        <div className="drivers-notice" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="drivers-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          {!loading && (
            <button type="button" onClick={() => void loadDrivers()}>
              Retry
            </button>
          )}
        </div>
      )}

      <section className="drivers-metrics" aria-label="Driver overview">
        <article>
          <span className="drivers-metric-icon purple">
            <FiTruck />
          </span>
          <div>
            <small>Total drivers</small>
            <strong>{drivers.length}</strong>
          </div>
        </article>
        <article>
          <span className="drivers-metric-icon blue">
            <FiUsers />
          </span>
          <div>
            <small>School drivers</small>
            <strong>{schoolDriverCount}</strong>
          </div>
        </article>
        <article>
          <span className="drivers-metric-icon green">
            <FiMapPin />
          </span>
          <div>
            <small>Transport-owner drivers</small>
            <strong>{ownerDriverCount}</strong>
          </div>
        </article>
      </section>

      <section className="drivers-panel">
        <div className="drivers-toolbar">
          <div>
            <h2>Driver directory</h2>
            <p>School staff and transport providers serving this school</p>
          </div>
          <select
            className="drivers-type-filter"
            aria-label="Filter drivers by type"
            value={driverTypeFilter}
            onChange={(event) => {
              setDriverTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All drivers</option>
            <option value="school">School drivers</option>
            <option value="owner">Transport-owner drivers</option>
          </select>
          <label className="drivers-search">
            <FiSearch aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search drivers, contacts, routes..."
              aria-label="Search drivers"
            />
          </label>
        </div>
        <div className="drivers-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Families</th>
                <th>Routes / trips</th>
                <th>Employer / owner</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <div className="driver-person">
                      <span className="driver-avatar">
                        {getPersonName(driver)
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span>
                        <strong>{getPersonName(driver)}</strong>
                        <small>{driver.job_title || "Driver"}</small>
                        <PresenceStatus userId={getUserId(driver)} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`driver-type-badge ${driver.driver_type}`}>
                      {driver.driver_type === "school"
                        ? "School driver"
                        : "Owner driver"}
                    </span>
                  </td>
                  <td>
                    <span className="driver-contact">
                      {driver.email || "No email"}
                    </span>
                    <small className="driver-contact-sub">
                      {driver.phone || "No phone"}
                    </small>
                  </td>
                  <td>
                    {driver.driver_type === "school" ? (
                      "—"
                    ) : (
                      <>
                        <strong>{driver.clients?.length || 0} families</strong>
                        <small>
                          {
                            (driver.clients || []).flatMap(
                              (client) => client.children || [],
                            ).length
                          }{" "}
                          linked children
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <strong>
                      {driver.routes?.length || 0}{" "}
                      {driver.driver_type === "school" ? "trips" : "routes"}
                    </strong>
                    <small>
                      {driver.driver_type === "school"
                        ? "Assigned school trips"
                        : `${(driver.routes || []).reduce(
                            (count, route) =>
                              count + (route.stops?.length || 0),
                            0,
                          )} stops`}
                    </small>
                  </td>
                  <td>
                    {driver.driver_type === "school"
                      ? "School"
                      : (driver.owners || []).length
                        ? driver.owners
                            .map(
                              (owner) =>
                                owner.company_name || getPersonName(owner),
                            )
                            .join(", ")
                        : "Not linked"}
                  </td>
                  <td>
                    <span
                      className={`driver-status ${String(driver.status || "unknown").toLowerCase()}`}
                    >
                      {driver.status || "Unknown"}
                    </span>
                  </td>
                  <td>
                    <div className="driver-row-actions">
                      <button
                        className="driver-view-button"
                        type="button"
                        onClick={() => setSelectedDriver(driver)}
                      >
                        View details <FiArrowUpRight />
                      </button>
                      {driver.driver_type === "school" && (
                        <button
                          className="driver-delete-button"
                          type="button"
                          disabled={deletingDriverId === driver.id}
                          aria-label={`Remove ${getPersonName(driver)} from school drivers`}
                          onClick={() => void deleteDriver(driver)}
                        >
                          <FiTrash2 aria-hidden="true" />
                          {deletingDriverId === driver.id && "Removing..."}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && pageDrivers.length === 0 && (
                <tr>
                  <td colSpan="8" className="drivers-empty">
                    {query
                      ? "No drivers match your search."
                      : driverTypeFilter === "school"
                        ? "No school drivers are registered yet."
                        : driverTypeFilter === "owner"
                          ? "No transport-owner drivers are linked to this school yet."
                          : "No drivers are linked to this school yet."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="8" className="drivers-empty">
                    Loading drivers...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="drivers-pagination">
          <span>
            Showing{" "}
            {filteredDrivers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} –
            {Math.min(currentPage * PAGE_SIZE, filteredDrivers.length)} of{" "}
            {filteredDrivers.length}
          </span>
          <div>
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <FiChevronLeft />
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>

      {addDriverOpen && (
        <div
          className="driver-add-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingDriver) {
              setAddDriverOpen(false);
            }
          }}
        >
          <form
            className="driver-add-modal"
            onSubmit={submitDriver}
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-add-title"
          >
            <header className="driver-add-header">
              <span className="driver-add-icon">
                <FiUserPlus aria-hidden="true" />
              </span>
              <div>
                <p>SCHOOL TRANSPORT TEAM</p>
                <h2 id="driver-add-title">Add a school driver</h2>
                <span>
                  This account is created with driver-only transport access.
                </span>
              </div>
              <button
                type="button"
                aria-label="Close add driver form"
                disabled={savingDriver}
                onClick={() => setAddDriverOpen(false)}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>
            <div className="driver-add-fields">
              <label>
                First name
                <input
                  required
                  autoComplete="given-name"
                  value={driverForm.first_name}
                  onChange={(event) =>
                    setDriverForm((form) => ({
                      ...form,
                      first_name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Last name
                <input
                  required
                  autoComplete="family-name"
                  value={driverForm.last_name}
                  onChange={(event) =>
                    setDriverForm((form) => ({
                      ...form,
                      last_name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="driver-add-field-wide">
                Email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={driverForm.your_email}
                  onChange={(event) =>
                    setDriverForm((form) => ({
                      ...form,
                      your_email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="driver-add-field-wide">
                Phone number
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={driverForm.phone}
                  onChange={(event) =>
                    setDriverForm((form) => ({
                      ...form,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {error && (
              <p className="driver-add-error" role="alert">
                <FiAlertCircle aria-hidden="true" />
                {error}
              </p>
            )}
            <p className="driver-add-help">
              The driver will receive temporary sign-in details by email.
            </p>
            <footer className="driver-add-actions">
              <button
                type="button"
                className="driver-add-cancel"
                disabled={savingDriver}
                onClick={() => setAddDriverOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="driver-add-submit"
                disabled={savingDriver}
              >
                <FiUserPlus aria-hidden="true" />
                {savingDriver ? "Adding driver..." : "Add driver"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {selectedDriver && (
        <div
          className="driver-modal-backdrop"
          onClick={() => setSelectedDriver(null)}
        >
          <section
            className="driver-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="driver-details-header">
              <div className="driver-details-heading">
                <span className="driver-avatar large">
                  {getPersonName(selectedDriver)
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div>
                  <p className="driver-details-kicker">
                    {selectedDriver.driver_type === "school"
                      ? "SCHOOL DRIVER"
                      : "TRANSPORT-OWNER DRIVER"}
                  </p>
                  <h2 id="driver-details-title">
                    {getPersonName(selectedDriver)}
                  </h2>
                  <span
                    className={`driver-status ${String(selectedDriver.status || "unknown").toLowerCase()}`}
                  >
                    {selectedDriver.status || "Unknown"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close driver details"
                onClick={() => setSelectedDriver(null)}
              >
                <FiX />
              </button>
            </header>
            <div className="driver-details-body">
              <section className="driver-detail-contact">
                <h3>Contact</h3>
                <p>
                  <FiPhone /> {selectedDriver.phone || "No phone number"}
                </p>
                <p>{selectedDriver.email || "No email address"}</p>
                {selectedDriver.vehicle_plate_number && (
                  <p>
                    <FiTruck /> Vehicle plate:{" "}
                    {selectedDriver.vehicle_plate_number}
                  </p>
                )}
                <button
                  type="button"
                  className="driver-message-button"
                  disabled={messagingUserId === getUserId(selectedDriver)}
                  onClick={() =>
                    void openMessage(selectedDriver, "driver_school")
                  }
                >
                  <FiMessageCircle />
                  {messagingUserId === getUserId(selectedDriver)
                    ? "Opening..."
                    : "Message driver"}
                </button>
              </section>

              {selectedDriver.driver_type !== "school" && (
                <section className="driver-detail-section">
                  <h3>Linked families & children</h3>
                  {selectedDriver.clients?.length ? (
                    selectedDriver.clients.map((client) => (
                      <article className="driver-linked-person" key={client.id}>
                        <div>
                          <div className="driver-linked-identity">
                            <span className="driver-linked-avatar">
                              {client.avatar ? (
                                <img src={client.avatar} alt="" />
                              ) : (
                                getPersonName(client)
                                  .split(/\s+/)
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              )}
                            </span>
                            <strong>{getPersonName(client)}</strong>
                          </div>
                          <small>
                            {client.phone ||
                              client.users?.phone ||
                              "No phone number"}
                            {client.relationship
                              ? ` · ${client.relationship}`
                              : ""}
                          </small>
                          <ul>
                            {(client.children || []).map((child) => (
                              <li key={child.id}>
                                <FiUsers /> {child.name} {child.lastname || ""}
                                {child.grade ? ` · Grade ${child.grade}` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          className="driver-message-button"
                          disabled={messagingUserId === getUserId(client)}
                          onClick={() =>
                            void openMessage(client, "client_school")
                          }
                        >
                          <FiMessageCircle />
                          {messagingUserId === getUserId(client)
                            ? "Opening..."
                            : "Message"}
                        </button>
                      </article>
                    ))
                  ) : (
                    <p className="driver-detail-empty">
                      No linked families found.
                    </p>
                  )}
                </section>
              )}

              {selectedDriver.driver_type !== "school" && (
                <section className="driver-detail-section">
                  <h3>
                    <FiBriefcase /> Transport owners
                  </h3>
                  {selectedDriver.owners?.length ? (
                    selectedDriver.owners.map((owner) => (
                      <article className="driver-linked-person" key={owner.id}>
                        <div>
                          <div className="driver-linked-identity">
                            <span className="driver-linked-avatar">
                              {owner.company_avatar || owner.avatar ? (
                                <img
                                  src={owner.company_avatar || owner.avatar}
                                  alt=""
                                />
                              ) : (
                                (owner.company_name || getPersonName(owner))
                                  .split(/\s+/)
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              )}
                            </span>
                            <strong>
                              {owner.company_name || getPersonName(owner)}
                            </strong>
                          </div>
                          <small>
                            {owner.users?.email || "Transport owner"}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="driver-message-button"
                          disabled={messagingUserId === getUserId(owner)}
                          onClick={() =>
                            void openMessage(owner, "owner_school")
                          }
                        >
                          <FiMessageCircle />
                          {messagingUserId === getUserId(owner)
                            ? "Opening..."
                            : "Message"}
                        </button>
                      </article>
                    ))
                  ) : (
                    <p className="driver-detail-empty">
                      No transport owners are linked to this driver.
                    </p>
                  )}
                </section>
              )}

              <section className="driver-detail-section">
                <h3>
                  <FiMapPin /> Routes & trips
                </h3>
                {selectedDriver.routes?.length ? (
                  selectedDriver.routes.map((route) => (
                    <article
                      className="driver-route-card"
                      key={`${route.id}-${route.vehicle_id || "route"}`}
                    >
                      <div className="driver-route-heading">
                        <div>
                          <strong>{route.route_name || "School route"}</strong>
                          <small>
                            {route.start_location || "Start not set"}{" "}
                            <FiArrowUpRight />{" "}
                            {route.end_location || "End not set"}
                          </small>
                          {route.vehicle && (
                            <small>
                              <FiTruck /> {route.vehicle.name}
                              {route.vehicle.registration_number
                                ? ` · ${route.vehicle.registration_number}`
                                : ""}
                            </small>
                          )}
                        </div>
                        {route.departure_time && (
                          <span>
                            <FiClock />{" "}
                            {new Date(route.departure_time).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        )}
                      </div>
                      {route.stops?.length ? (
                        <ol>
                          {route.stops.map((stop) => (
                            <li key={`${stop.kind}-${stop.id}`}>
                              <span>{stop.stop_order}</span>
                              <div>
                                <strong>{getRouteStopName(stop)}</strong>
                                <small>
                                  {stop.kind === "stop"
                                    ? `${stop.stop_type || "Stop"}${stop.child ? ` · ${stop.child.name} ${stop.child.lastname || ""}` : ""}`
                                    : "Route waypoint"}
                                </small>
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="driver-detail-empty">
                          {selectedDriver.driver_type === "school"
                            ? "Trip assignment details are available above."
                            : "No stops recorded for this route."}
                        </p>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="driver-detail-empty">
                    No routes or trips are assigned.
                  </p>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Drivers;
