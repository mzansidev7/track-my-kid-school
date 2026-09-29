import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiMail,
  FiSearch,
  FiTruck,
  FiUser,
  FiUsers,
  FiShare2,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import "../styles/notifications.css";

const tabs = [
  "All",
  "Unread",
  "Important",
  "Trips",
  "Students",
  "Drivers",
  "System",
  "Parents",
];

const notificationPresentation = (type) => {
  if (type === "emergency")
    return { tag: "Emergency", tone: "red", icon: FiAlertCircle };
  if (type === "absence_report")
    return { tag: "Attendance", tone: "orange", icon: FiCalendar };
  if (
    [
      "route_started",
      "driver_arriving",
      "child_picked_up",
      "child_dropped_off",
    ].includes(type)
  ) {
    return { tag: "Trips", tone: "purple", icon: FiTruck };
  }
  if (["vehicle_delayed", "delay_warning", "missed_stop"].includes(type)) {
    return { tag: "Important", tone: "orange", icon: FiAlertCircle };
  }
  if (type === "message") return { tag: "Parents", tone: "blue", icon: FiMail };
  return { tag: "System", tone: "blue", icon: FiBell };
};

const toViewModel = (notification) => ({
  ...notification,
  text: notification.message,
  unread: notification.is_read !== true,
  time: notification.created_at
    ? new Date(notification.created_at).toLocaleString()
    : "Just now",
  ...notificationPresentation(notification.type),
});

function Notifications() {
  const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  const cacheKey = `schoolNotificationsCache:${auth.user?.id || "current"}`;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const [notifications, setNotifications] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return Array.isArray(cached?.data) ? cached.data.map(toViewModel) : [];
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      const first = Array.isArray(cached?.data) ? cached.data[0] : null;
      return first ? toViewModel(first) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !Array.isArray(
        JSON.parse(localStorage.getItem(cacheKey) || "null")?.data,
      );
    } catch {
      return true;
    }
  });
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [now] = useState(() => Date.now());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const loadNotifications = useCallback(async () => {
    setError("");
    try {
      const data = await apiRequest("/school/notifications?limit=100", {
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
        },
      });
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data, timestamp: Date.now() }),
      );
      const next = (Array.isArray(data) ? data : []).map(toViewModel);
      setNotifications(next);
      setSelected((current) =>
        current
          ? next.find((notification) => notification.id === current.id) || null
          : next[0] || null,
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey]);

  useEffect(() => {
    // Load the server-backed notification feed when the page opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!supabaseClient || !userId) return undefined;

    let active = true;
    const channel = supabaseClient
      .channel(`school-notifications:${userId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (active) void loadNotifications();
        },
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("School notifications realtime unavailable:", status);
      }
    });

    return () => {
      active = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadNotifications]);

  const unreadCount = notifications.filter((item) => item.unread).length;
  const alertCount = notifications.filter((item) =>
    ["emergency", "vehicle_delayed", "delay_warning", "missed_stop"].includes(
      item.type,
    ),
  ).length;
  const filtered = useMemo(
    () =>
      notifications.filter(
        (item) =>
          `${item.title} ${item.text} ${item.tag}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (tab === "All" ||
            (tab === "Unread" ? item.unread : item.tag === tab)),
      ),
    [notifications, query, tab],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedNotifications = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    // Return to the first page when the active filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [query, tab]);

  const thisWeekCount = notifications.filter(
    (item) =>
      item.created_at &&
      now - new Date(item.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  const markAsRead = async (item) => {
    if (!item?.unread) return;
    try {
      const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
      await apiRequest(`/school/notifications/${item.id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, unread: false, is_read: true }
            : notification,
        ),
      );
      setSelected((current) =>
        current?.id === item.id
          ? { ...current, unread: false, is_read: true }
          : current,
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to mark notification as read.");
    }
  };

  const selectNotification = (item) => {
    setSelected(item);
    markAsRead(item);
  };

  const markAllAsRead = async () => {
    if (markingAll || !unreadCount) return;
    setMarkingAll(true);
    try {
      await Promise.all(
        notifications.filter((item) => item.unread).map(markAsRead),
      );
    } finally {
      setMarkingAll(false);
    }
  };
  return (
    <>
      {/* <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Notifications</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search notifications..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiBell />
            <b>5</b>
          </button>
          <div className="top-profile">
            <img src="https://i.pravatar.cc/100?img=5" alt="School admin" />
            <span>
              <strong>School Admin</strong>
              <small>Administrator</small>
            </span>
            <b>⌄</b>
          </div>
        </div>
      </header> */}
      <div className="portal-content notifications-content">
        <section className="notifications-heading">
          <div>
            <p className="page-kicker">SCHOOL ALERTS</p>
            <h1>Notifications</h1>
            <p>Stay updated with all important activities and alerts.</p>
          </div>
          <div className="notifications-actions">
            <button
              className="mark-read"
              type="button"
              onClick={markAllAsRead}
              disabled={!unreadCount || markingAll}
            >
              {markingAll ? (
                <>
                  <span className="notification-spinner" aria-hidden="true" />
                  Marking as read...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Mark all as read
                </>
              )}
            </button>
          </div>
        </section>
        <section className="notification-metrics">
          <article>
            <span className="notification-metric purple">
              <FiBell />
            </span>
            <div>
              <small>Total notifications</small>
              <strong>{notifications.length}</strong>
              <em className="neutral">Live from school alerts</em>
            </div>
          </article>
          <article>
            <span className="notification-metric green">
              <FiCheckCircle />
            </span>
            <div>
              <small>Unread</small>
              <strong>{unreadCount}</strong>
              <em className="neutral">Needs review</em>
            </div>
          </article>
          <article>
            <span className="notification-metric orange">
              <FiAlertCircle />
            </span>
            <div>
              <small>Important</small>
              <strong>{alertCount}</strong>
              <em className="neutral">Safety and delay alerts</em>
            </div>
          </article>
          <article>
            <span className="notification-metric blue">
              <FiAlertCircle />
            </span>
            <div>
              <small>This week</small>
              <strong>{thisWeekCount}</strong>
              <em className="neutral">Last 7 days</em>
            </div>
          </article>
          <article>
            <span className="notification-metric red">
              <FiShare2 />
            </span>
            <div>
              <small>Alerts</small>
              <strong>{alertCount}</strong>
              <em className="neutral">Require attention</em>
            </div>
          </article>
        </section>
        <section className="notifications-layout">
          <div className="notifications-panel">
            <div className="notification-tabs">
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
            <div className="notifications-search-row">
              <label>
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search notifications..."
                />
              </label>
            </div>
            <div className="notification-list">
              {loading && (
                <div className="empty-notifications">
                  Loading notifications...
                </div>
              )}
              {!loading && error && (
                <div className="empty-notifications">
                  {error}{" "}
                  <button type="button" onClick={loadNotifications}>
                    Try again
                  </button>
                </div>
              )}
              {!loading &&
                !error &&
                paginatedNotifications.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className={`notification-row ${selected?.id === item.id ? "selected" : ""} ${item.unread ? "unread" : "read"}`}
                      key={item.id || `${item.title}-${item.created_at}`}
                      onClick={() => selectNotification(item)}
                    >
                      <i className="unread-dot" />
                      <span className={`notification-row-icon ${item.tone}`}>
                        <Icon />
                      </span>
                      <span className="notification-row-copy">
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                        <em className={item.tone}>{item.tag}</em>
                      </span>
                      <time>{item.time}</time>
                      <b>•••</b>
                    </button>
                  );
                })}
            </div>
            {!loading && !error && filtered.length === 0 && (
              <div className="empty-notifications">
                No notifications yet. Emergency and transport updates will
                appear here.
              </div>
            )}
            <div className="notifications-footer">
              <span>
                Showing{" "}
                {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}{" "}
                to {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                {filtered.length} notifications
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={
                        currentPage === pageNumber ? "current-page" : ""
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  disabled={currentPage === pageCount}
                >
                  ›
                </button>
              </div>
              <label>
                Rows per page{" "}
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option>5</option>
                  <option>10</option>
                  <option>25</option>
                </select>
              </label>
            </div>
          </div>
          <aside className="notification-detail">
            {!selected ? (
              <div className="empty-notifications">
                Select a notification to view its details.
              </div>
            ) : (
              <>
                <div className="notification-detail-head">
                  <h2>Notification Details</h2>
                  <button
                    type="button"
                    aria-label="Close notification details"
                    onClick={() => setSelected(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="detail-body">
                  <span className="detail-label">
                    <selected.icon /> {selected.tag} Notification
                  </span>
                  <span className="detail-live">
                    {selected.unread ? "Unread" : "Read"}
                  </span>
                  <h3>{selected.title}</h3>
                  <p>{selected.text}</p>
                  <div className="detail-box">
                    <p>
                      <FiMapPin /> Related route{" "}
                      <strong>
                        {selected.route_name ||
                          selected.related_route?.route_name ||
                          selected.related_route_id ||
                          "Not associated"}
                      </strong>
                    </p>
                    <p>
                      <FiUser /> From{" "}
                      <strong>{selected.sender_name || "System"}</strong>
                    </p>
                    {selected.recipient_name ? (
                      <p>
                        <FiUsers /> To{" "}
                        <strong>{selected.recipient_name}</strong>
                      </p>
                    ) : null}
                    <p>
                      <FiTruck /> Child{" "}
                      <strong>
                        {selected.child_name ||
                          selected.related_child?.name ||
                          selected.children?.name ||
                          selected.related_child_id ||
                          "Not associated"}
                      </strong>
                    </p>
                    <p>
                      <FiClock /> Status{" "}
                      <strong>{selected.unread ? "Unread" : "Read"}</strong>
                    </p>
                    <p>
                      <FiMapPin /> Type{" "}
                      <strong>{selected.type || "general"}</strong>
                    </p>
                    {selected.stop_address || selected.related_stop?.address ? (
                      <p>
                        <FiMapPin /> Stop{" "}
                        <strong>
                          {selected.stop_address ||
                            selected.related_stop.address}
                        </strong>
                      </p>
                    ) : null}
                    <p>
                      <FiUsers /> Received <strong>{selected.time}</strong>
                    </p>
                  </div>
                  <small className="detail-time">{selected.time}</small>
                </div>
              </>
            )}
          </aside>
        </section>
      </div>
    </>
  );
}

export default Notifications;
