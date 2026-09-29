import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowUp,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiTruck,
  FiClock,
  FiEdit2,
  FiEye,
  FiFileText,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSend,
  FiTag,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import {
  showConfirmationAlert,
  showDeleteConfirmationAlert,
} from "../components/sweetAlert.js";
import "../styles/announcements.css";

const tabs = [
  "All Announcements",
  "Published",
  "Scheduled",
  "Drafts",
  "Expired",
];

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

const inferCategory = (item) => {
  const text =
    `${item.title || ""} ${item.message || item.text || ""}`.toLowerCase();
  if (
    text.includes("route") ||
    text.includes("vehicle") ||
    text.includes("transport")
  ) {
    return "Transport Updates";
  }
  if (text.includes("safety") || text.includes("first aid")) return "Safety";
  if (
    text.includes("grade") ||
    text.includes("academic") ||
    text.includes("conference")
  ) {
    return "Academic";
  }
  if (
    text.includes("day") ||
    text.includes("event") ||
    text.includes("holiday")
  ) {
    return "Events";
  }
  return "General Notices";
};

const normalizeAnnouncement = (item) => {
  const rawStatus = String(item.status || "").toLowerCase();
  const displayDate =
    rawStatus === "sent" && item.updated_at
      ? item.updated_at
      : item.scheduled_for || item.created_at || item.date;
  return {
    ...item,
    publisher: item.publisher || item.creator?.name || "School Admin",
    role: item.role || "School Admin",
    text: item.text || item.message || "",
    audience:
      item.audience ||
      (item.audience_type === "all"
        ? "All Parents"
        : item.audience_type === "grade"
          ? `Grade ${item.grade} Parents`
          : "Specific Student Parent"),
    status:
      rawStatus === "sent"
        ? "Published"
        : rawStatus === "scheduled"
          ? "Scheduled"
          : rawStatus === "cancelled"
            ? "Cancelled"
            : rawStatus === "draft"
              ? "Draft"
              : rawStatus === "expired"
                ? "Expired"
                : item.status,
    date:
      rawStatus === "sent" && item.updated_at
        ? new Date(item.updated_at).toLocaleDateString()
        : item.date || new Date(displayDate).toLocaleDateString(),
    time:
      rawStatus === "sent" && item.updated_at
        ? new Date(item.updated_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : item.time ||
          new Date(displayDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
    icon: FiSend,
    tone: rawStatus === "scheduled" ? "purple" : "green",
    category: item.category || inferCategory(item),
    targetParent:
      item.targetParent ||
      item.child?.client?.users?.name ||
      [item.child?.client?.first_name, item.child?.client?.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Parent not available",
    targetStudent:
      item.targetStudent ||
      [item.child?.name, item.child?.lastname].filter(Boolean).join(" ") ||
      "Student not available",
  };
};

function Announcements() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All Announcements");
  const [audienceFilter, setAudienceFilter] = useState("All audiences");
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [announcementAction, setAnnouncementAction] = useState(null);
  const [openAnnouncementMenu, setOpenAnnouncementMenu] = useState(null);
  const [announcementMenuPosition, setAnnouncementMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [viewAnnouncement, setViewAnnouncement] = useState(null);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    text: "",
    audienceType: "all",
    grade: "",
    studentId: "",
    sendMode: "now",
    scheduledFor: "",
  });
  const [minimumScheduleTime] = useState(() =>
    new Date(Date.now() + 60000).toISOString().slice(0, 16),
  );
  const [todayLabel] = useState(() => new Date().toLocaleDateString());
  const auth = getAuth();
  const cacheKey = `schoolAnnouncementsCache:${auth.user?.id || "current"}`;
  const [dashboard, setDashboard] = useState(null);
  const [announcementItems, setAnnouncementItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data?.map(
        normalizeAnnouncement,
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;

    apiRequest("/school/dashboard", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((data) => {
        if (active) {
          setStudents(data.students || []);
          setDashboard(data);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [auth.token]);

  useEffect(() => {
    let active = true;
    const loadAnnouncements = async () => {
      try {
        const data = await apiRequest("/school/announcements", {
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        });
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data, timestamp: Date.now() }),
        );
        if (active) setAnnouncementItems(data.map(normalizeAnnouncement));
      } catch {
        // Keep cached announcements visible when the API is unavailable.
      }
    };
    loadAnnouncements();
    return () => {
      active = false;
    };
  }, [auth.token, cacheKey]);

  useEffect(() => {
    const schoolId = dashboard?.school?.id;
    if (!supabaseClient || !schoolId) return undefined;
    const channel = supabaseClient
      .channel(`school-announcements:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_announcements",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          apiRequest("/school/announcements", {
            headers: { Authorization: `Bearer ${auth.token || ""}` },
          })
            .then((data) => {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({ data, timestamp: Date.now() }),
              );
              setAnnouncementItems(data.map(normalizeAnnouncement));
            })
            .catch(() => undefined);
        },
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [auth.token, cacheKey, dashboard?.school?.id]);

  const gradeOptions = useMemo(
    () =>
      [
        ...new Set(
          students
            .map((student) => student.grade || student.grade_level)
            .filter(Boolean),
        ),
      ].sort(),
    [students],
  );

  const studentName = (student) =>
    [student?.name, student?.lastname, student?.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed student";

  const audienceOptions = useMemo(
    () => [
      "All audiences",
      ...new Set(
        announcementItems.map((item) => item.audience).filter(Boolean),
      ),
    ],
    [announcementItems],
  );

  const filteredAnnouncements = useMemo(() => {
    const filtered = announcementItems.filter((announcement) => {
      const searchable =
        `${announcement.title} ${announcement.text} ${announcement.audience} ${announcement.publisher} ${announcement.category}`.toLowerCase();
      const matchesSearch = searchable.includes(query.toLowerCase());
      const matchesTab =
        tab === "All Announcements" ||
        announcement.status === tab.replace(/s$/, "");
      const matchesAudience =
        audienceFilter === "All audiences" ||
        announcement.audience === audienceFilter;
      return matchesSearch && matchesTab && matchesAudience;
    });

    return [...filtered].sort((first, second) => {
      const firstDate = new Date(
        first.created_at || first.scheduled_for || first.date,
      ).getTime();
      const secondDate = new Date(
        second.created_at || second.scheduled_for || second.date,
      ).getTime();
      return sortOrder === "newest"
        ? secondDate - firstDate
        : firstDate - secondDate;
    });
  }, [announcementItems, audienceFilter, query, sortOrder, tab]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleAnnouncements = filteredAnnouncements.slice(
    startIndex,
    startIndex + pageSize,
  );
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  );

  const announcementCounts = useMemo(
    () => ({
      total: announcementItems.length,
      published: announcementItems.filter((item) => item.status === "Published")
        .length,
      scheduled: announcementItems.filter((item) => item.status === "Scheduled")
        .length,
      drafts: announcementItems.filter((item) => item.status === "Draft")
        .length,
      expired: announcementItems.filter((item) => item.status === "Expired")
        .length,
    }),
    [announcementItems],
  );

  const announcementsThisMonth = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return announcementItems.filter((item) => {
      const date = new Date(item.created_at || item.scheduled_for || item.date);
      return !Number.isNaN(date.getTime()) && date >= start;
    }).length;
  }, [announcementItems]);

  const percentage = (value) =>
    announcementCounts.total
      ? `${Math.round((value / announcementCounts.total) * 100)}% of total`
      : "0% of total";

  const categoryCounts = useMemo(() => {
    const counts = announcementItems.reduce((result, announcement) => {
      const category = announcement.category || "General Notices";
      result[category] = (result[category] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .sort(([, first], [, second]) => second - first)
      .slice(0, 5);
  }, [announcementItems]);

  const submitAnnouncement = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.text.trim() || isSending) return;
    setIsSending(true);
    try {
      const data = await apiRequest(
        editingAnnouncement
          ? `/school/announcements/${editingAnnouncement.id}`
          : "/school/announcements",
        {
          method: editingAnnouncement ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify({
            title: form.title,
            message: form.text,
            audienceType: form.audienceType,
            grade: form.audienceType === "grade" ? form.grade : undefined,
            childId:
              form.audienceType === "student" ? form.studentId : undefined,
            scheduledFor:
              editingAnnouncement || form.sendMode === "schedule"
                ? new Date(form.scheduledFor).toISOString()
                : new Date().toISOString(),
            status: form.sendMode === "draft" ? "draft" : undefined,
          }),
        },
      );
      const normalized = normalizeAnnouncement(data);
      const nextItems = editingAnnouncement
        ? announcementItems.map((item) =>
            item.id === editingAnnouncement.id ? normalized : item,
          )
        : [normalized, ...announcementItems];
      setAnnouncementItems(nextItems);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: nextItems, timestamp: Date.now() }),
      );
      setForm({
        title: "",
        text: "",
        audienceType: "all",
        grade: "",
        studentId: "",
        sendMode: "now",
        scheduledFor: "",
      });
      setComposeOpen(false);
      setEditingAnnouncement(null);
      setTab("All Announcements");
    } finally {
      setIsSending(false);
    }
  };

  const clearAnnouncementForm = () => {
    setForm({
      title: "",
      text: "",
      audienceType: "all",
      grade: "",
      studentId: "",
      sendMode: "now",
      scheduledFor: "",
    });
    setEditingAnnouncement(null);
    setComposeOpen(false);
  };

  const editScheduledAnnouncement = (announcement) => {
    if (announcement.status !== "Scheduled") return;
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      text: announcement.text,
      audienceType: announcement.audience_type || "all",
      grade: announcement.grade || "",
      studentId: announcement.child_id || "",
      sendMode: "schedule",
      scheduledFor: new Date(announcement.scheduled_for)
        .toISOString()
        .slice(0, 16),
    });
    setComposeOpen(true);
  };

  const updateAnnouncementList = (updated) => {
    const normalized = normalizeAnnouncement(updated);
    const nextItems = announcementItems.map((item) =>
      item.id === normalized.id ? normalized : item,
    );
    setAnnouncementItems(nextItems);
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data: nextItems, timestamp: Date.now() }),
    );
    setOpenAnnouncementMenu(null);
    setViewAnnouncement(null);
  };

  const cancelAnnouncement = async (announcement) => {
    if (announcement.status !== "Scheduled" || announcementAction) return;
    const confirmation = await showConfirmationAlert({
      title: "Cancel scheduled announcement?",
      text: "Parents will be notified that this announcement was cancelled.",
      confirmButtonText: "Yes, cancel it",
      denyButtonText: "Keep scheduled",
    });
    if (!confirmation.isConfirmed) return;
    setAnnouncementAction({ id: announcement.id, type: "cancel" });
    try {
      const updated = await apiRequest(
        `/school/announcements/${announcement.id}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        },
      );
      updateAnnouncementList({ ...updated, status: "cancelled" });
    } finally {
      setAnnouncementAction(null);
    }
  };

  const deleteAnnouncement = async (announcement) => {
    if (
      !["Draft", "Cancelled", "Expired"].includes(announcement.status) ||
      announcementAction
    )
      return;
    const confirmation = await showDeleteConfirmationAlert({
      title: "Delete announcement permanently?",
      text:
        announcement.status === "Draft"
          ? "This draft will be permanently deleted."
          : "This action cannot be undone. Parents will be notified.",
    });
    if (!confirmation.isConfirmed) return;
    setAnnouncementAction({ id: announcement.id, type: "delete" });
    try {
      await apiRequest(`/school/announcements/${announcement.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      const nextItems = announcementItems.filter(
        (item) => item.id !== announcement.id,
      );
      setAnnouncementItems(nextItems);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: nextItems, timestamp: Date.now() }),
      );
      setOpenAnnouncementMenu(null);
    } finally {
      setAnnouncementAction(null);
    }
  };

  const sendDraftAnnouncement = async (announcement) => {
    if (announcement.status !== "Draft" || announcementAction) return;
    const confirmation = await showConfirmationAlert({
      title: "Send this draft announcement?",
      text: "The announcement will be sent to its selected parents.",
      confirmButtonText: "Yes, send it",
      denyButtonText: "Keep as draft",
    });
    if (!confirmation.isConfirmed) return;
    setAnnouncementAction({ id: announcement.id, type: "send" });
    try {
      const updated = await apiRequest(
        `/school/announcements/${announcement.id}/send`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        },
      );
      updateAnnouncementList(updated);
    } finally {
      setAnnouncementAction(null);
    }
  };
  return (
    <>
      <div className="portal-content announcements-content">
        <section className="announcements-heading">
          <div>
            <p className="page-kicker">SCHOOL COMMUNICATIONS</p>
            <h1>Announcements</h1>
            <p>
              Create and manage announcements for parents, students and staff.
            </p>
          </div>
          <div className="announcements-date">
            <FiCalendar /> {todayLabel}
          </div>
          <button
            className="announcement-primary"
            onClick={() => setComposeOpen(true)}
          >
            <FiPlus /> New announcement
          </button>
        </section>
        <section className="announcement-metrics">
          <article>
            <span className="announcement-metric purple">
              <FiBell />
            </span>
            <div>
              <small>Total announcements</small>
              <strong>{announcementCounts.total}</strong>
              <em>
                <FiArrowUp /> {announcementsThisMonth} this month
              </em>
            </div>
          </article>
          <article>
            <span className="announcement-metric green">
              <FiSend />
            </span>
            <div>
              <small>Published</small>
              <strong>{announcementCounts.published}</strong>
              <em className="neutral">
                {percentage(announcementCounts.published)}
              </em>
            </div>
          </article>
          <article>
            <span className="announcement-metric orange">
              <FiClock />
            </span>
            <div>
              <small>Scheduled</small>
              <strong>{announcementCounts.scheduled}</strong>
              <em className="neutral">
                {percentage(announcementCounts.scheduled)}
              </em>
            </div>
          </article>
          <article>
            <span className="announcement-metric red">
              <FiFileText />
            </span>
            <div>
              <small>Drafts</small>
              <strong>{announcementCounts.drafts}</strong>
              <em className="neutral">
                {percentage(announcementCounts.drafts)}
              </em>
            </div>
          </article>
        </section>
        <section className="announcements-layout">
          <div className="announcements-panel">
            <div className="announcement-tabs">
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
            <div className="announcements-toolbar">
              <label className="announcements-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search announcements..."
                />
              </label>
              <div className="announcement-filter-wrap">
                <button onClick={() => setShowFilters((current) => !current)}>
                  <FiTag /> Filter
                </button>
                {showFilters && (
                  <div className="announcement-filter-panel">
                    <label>
                      Audience
                      <select
                        value={audienceFilter}
                        onChange={(event) => {
                          setAudienceFilter(event.target.value);
                          setPage(1);
                        }}
                      >
                        {audienceOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            <div className="announcement-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Announcement</th>
                    <th>Audience</th>
                    <th>Published by</th>
                    <th>Status</th>
                    <th>Published on</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAnnouncements.map((announcement) => {
                    const Icon = announcement.icon;
                    return (
                      <tr
                        key={
                          announcement.id ||
                          `${announcement.title}-${announcement.date}`
                        }
                      >
                        <td>
                          <div className="announcement-title">
                            <span
                              className={`announcement-row-icon ${announcement.tone}`}
                            >
                              <Icon />
                            </span>
                            <div>
                              <strong>{announcement.title}</strong>
                              <small>{announcement.text}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <FiUsers /> {announcement.audience}
                        </td>
                        <td>
                          <strong>{announcement.publisher}</strong>
                          <small>{announcement.role}</small>
                        </td>
                        <td>
                          <span
                            className={`announcement-status ${announcement.status.toLowerCase()}`}
                          >
                            {announcement.status}
                          </span>
                        </td>
                        <td>
                          <strong>{announcement.date}</strong>
                          <small>{announcement.time}</small>
                        </td>
                        <td>
                          <button
                            className="announcement-action"
                            disabled={announcement.status !== "Scheduled"}
                            onClick={() =>
                              editScheduledAnnouncement(announcement)
                            }
                            aria-label={`Edit ${announcement.title}`}
                          >
                            <FiEdit2 />
                          </button>
                          <div className="announcement-menu-wrap">
                            <button
                              className="announcement-action"
                              aria-label={`More options for ${announcement.title}`}
                              disabled={Boolean(announcementAction)}
                              onClick={(event) => {
                                const rect =
                                  event.currentTarget.getBoundingClientRect();
                                setAnnouncementMenuPosition({
                                  top: rect.bottom + 6,
                                  left: Math.max(8, rect.right - 185),
                                });
                                setOpenAnnouncementMenu(
                                  openAnnouncementMenu === announcement.id
                                    ? null
                                    : announcement.id,
                                );
                              }}
                            >
                              <FiMoreHorizontal />
                            </button>
                            {openAnnouncementMenu === announcement.id && (
                              <div
                                className="announcement-menu"
                                style={{
                                  top: `${announcementMenuPosition.top}px`,
                                  left: `${announcementMenuPosition.left}px`,
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setViewAnnouncement(announcement);
                                    setOpenAnnouncementMenu(null);
                                  }}
                                >
                                  <FiEye /> View announcement
                                </button>
                                {announcement.status === "Scheduled" && (
                                  <button
                                    disabled={Boolean(announcementAction)}
                                    onClick={() =>
                                      cancelAnnouncement(announcement)
                                    }
                                  >
                                    {announcementAction?.id ===
                                      announcement.id &&
                                    announcementAction.type === "cancel" ? (
                                      <span
                                        className="announcement-spinner"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <FiX />
                                    )}
                                    {announcementAction?.id ===
                                      announcement.id &&
                                    announcementAction.type === "cancel"
                                      ? "Cancelling..."
                                      : "Cancel announcement"}
                                  </button>
                                )}
                                {announcement.status === "Draft" && (
                                  <button
                                    disabled={Boolean(announcementAction)}
                                    onClick={() =>
                                      sendDraftAnnouncement(announcement)
                                    }
                                  >
                                    {announcementAction?.id ===
                                      announcement.id &&
                                    announcementAction.type === "send" ? (
                                      <span
                                        className="announcement-spinner"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <FiSend />
                                    )}
                                    {announcementAction?.id ===
                                      announcement.id &&
                                    announcementAction.type === "send"
                                      ? "Sending..."
                                      : "Send announcement"}
                                  </button>
                                )}
                                <button
                                  disabled={
                                    Boolean(announcementAction) ||
                                    !["Draft", "Cancelled", "Expired"].includes(
                                      announcement.status,
                                    )
                                  }
                                  onClick={() =>
                                    deleteAnnouncement(announcement)
                                  }
                                >
                                  {announcementAction?.id === announcement.id &&
                                  announcementAction.type === "delete" ? (
                                    <span
                                      className="announcement-spinner"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <FiTrash2 />
                                  )}
                                  {announcementAction?.id === announcement.id &&
                                  announcementAction.type === "delete"
                                    ? "Deleting..."
                                    : "Delete announcement"}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAnnouncements.length === 0 && (
                <div className="empty-announcements">
                  No announcements match your search.
                </div>
              )}
            </div>
            <div className="announcements-footer">
              <span>
                Showing {filteredAnnouncements.length ? startIndex + 1 : 0} to{" "}
                {Math.min(startIndex + pageSize, filteredAnnouncements.length)}{" "}
                of {filteredAnnouncements.length} announcements
              </span>
              <div>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={pageNumber === currentPage ? "current-page" : ""}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </button>
              </div>
              <label>10 rows per page</label>
            </div>
          </div>
          <aside className="announcements-side">
            <div className="announcement-overview">
              <h2>Announcement overview</h2>
              <div className="announcement-donut">
                <strong>
                  {announcementCounts.total}
                  <small>Total</small>
                </strong>
              </div>
              <div className="overview-legend">
                <p>
                  <i className="published-dot" />
                  Published <b>{announcementCounts.published}</b>
                </p>
                <p>
                  <i className="scheduled-dot" />
                  Scheduled <b>{announcementCounts.scheduled}</b>
                </p>
                <p>
                  <i className="draft-dot" />
                  Drafts <b>{announcementCounts.drafts}</b>
                </p>
                <p>
                  <i className="expired-dot" />
                  Expired <b>{announcementCounts.expired}</b>
                </p>
              </div>
            </div>
            <div className="announcement-categories">
              <h2>Top announcement categories</h2>
              {categoryCounts.length ? (
                categoryCounts.map(([category, count]) => {
                  const CategoryIcon =
                    category === "Events"
                      ? FiCalendar
                      : category === "Transport Updates"
                        ? FiTruck
                        : category === "Academic"
                          ? FiBookOpen
                          : FiAlertTriangle;
                  return (
                    <p key={category}>
                      <span>
                        <CategoryIcon /> {category}
                      </span>
                      <b>{count}</b>
                    </p>
                  );
                })
              ) : (
                <p className="empty-category-list">No category data</p>
              )}
            </div>
          </aside>
        </section>
      </div>
      {viewAnnouncement && (
        <div
          className="announcement-modal-backdrop"
          onClick={() => setViewAnnouncement(null)}
        >
          <article
            className="announcement-view-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="page-kicker">ANNOUNCEMENT</p>
                <h2>{viewAnnouncement.title}</h2>
              </div>
              <button
                type="button"
                className="announcement-compose-close"
                onClick={() => setViewAnnouncement(null)}
                aria-label="Close announcement details"
              >
                <FiX />
              </button>
            </header>
            <div className="announcement-view-status-row">
              <span
                className={`announcement-status ${viewAnnouncement.status.toLowerCase()}`}
              >
                {viewAnnouncement.status}
              </span>
              <span>{viewAnnouncement.audience}</span>
              <span>
                {viewAnnouncement.date} {viewAnnouncement.time}
              </span>
            </div>
            <p className="announcement-view-message">{viewAnnouncement.text}</p>
            <dl className="announcement-view-meta">
              <div>
                <dt>Published by</dt>
                <dd>{viewAnnouncement.publisher}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{viewAnnouncement.category}</dd>
              </div>
              {viewAnnouncement.audience_type === "student" && (
                <>
                  <div>
                    <dt>Student</dt>
                    <dd>{viewAnnouncement.targetStudent}</dd>
                  </div>
                  <div>
                    <dt>Parent recipient</dt>
                    <dd>{viewAnnouncement.targetParent}</dd>
                  </div>
                </>
              )}
            </dl>
          </article>
        </div>
      )}
      {composeOpen && (
        <div
          className="announcement-modal-backdrop"
          onClick={() => setComposeOpen(false)}
        >
          <form
            className="announcement-compose"
            onSubmit={submitAnnouncement}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="announcement-compose-header">
              <div>
                <p className="page-kicker">SCHOOL COMMUNICATIONS</p>
                <h2>New announcement</h2>
                <p>Choose exactly who should receive this message.</p>
              </div>
              <button
                type="button"
                className="announcement-compose-close"
                onClick={() => setComposeOpen(false)}
                aria-label="Close announcement form"
              >
                <FiX />
              </button>
            </div>
            <label className="announcement-field">
              <span>Announcement title</span>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. School sports day"
              />
            </label>
            <label className="announcement-field">
              <span>Message</span>
              <textarea
                required
                rows="5"
                value={form.text}
                onChange={(event) =>
                  setForm({ ...form, text: event.target.value })
                }
                placeholder="Write the message parents should receive..."
              />
            </label>
            <div className="announcement-delivery-mode">
              <span>Delivery</span>
              <label>
                <input
                  type="radio"
                  name="sendMode"
                  checked={form.sendMode === "now"}
                  onChange={() => setForm({ ...form, sendMode: "now" })}
                />
                Send immediately
              </label>
              <label>
                <input
                  type="radio"
                  name="sendMode"
                  checked={form.sendMode === "schedule"}
                  onChange={() => setForm({ ...form, sendMode: "schedule" })}
                />
                Schedule
              </label>
              <label>
                <input
                  type="radio"
                  name="sendMode"
                  checked={form.sendMode === "draft"}
                  onChange={() => setForm({ ...form, sendMode: "draft" })}
                />
                Save as draft
              </label>
              {form.sendMode === "schedule" && (
                <input
                  className="announcement-schedule-input"
                  type="datetime-local"
                  required
                  min={minimumScheduleTime}
                  value={form.scheduledFor}
                  onChange={(event) =>
                    setForm({ ...form, scheduledFor: event.target.value })
                  }
                />
              )}
            </div>
            <fieldset className="announcement-audience">
              <legend>Send to</legend>
              <label>
                <input
                  type="radio"
                  name="audienceType"
                  checked={form.audienceType === "all"}
                  onChange={() => setForm({ ...form, audienceType: "all" })}
                />
                <span>
                  <strong>All parents</strong>
                  <small>Send to every registered parent</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="audienceType"
                  checked={form.audienceType === "grade"}
                  onChange={() => setForm({ ...form, audienceType: "grade" })}
                />
                <span>
                  <strong>Specific grade</strong>
                  <small>Target parents linked to one grade</small>
                </span>
              </label>
              {form.audienceType === "grade" && (
                <select
                  required
                  value={form.grade}
                  onChange={(event) =>
                    setForm({ ...form, grade: event.target.value })
                  }
                >
                  <option value="">Choose a grade</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              )}
              <label>
                <input
                  type="radio"
                  name="audienceType"
                  checked={form.audienceType === "student"}
                  onChange={() => setForm({ ...form, audienceType: "student" })}
                />
                <span>
                  <strong>Specific student</strong>
                  <small>Send only to the selected student's parent</small>
                </span>
              </label>
              {form.audienceType === "student" && (
                <select
                  required
                  value={form.studentId}
                  onChange={(event) =>
                    setForm({ ...form, studentId: event.target.value })
                  }
                >
                  <option value="">Choose a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentName(student)}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>
            <div className="announcement-compose-actions">
              <button
                type="button"
                className="announcement-cancel"
                onClick={clearAnnouncementForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="announcement-send"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <span className="announcement-spinner" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSend />
                    {form.sendMode === "draft"
                      ? "Save draft"
                      : editingAnnouncement
                        ? "Update schedule"
                        : "Send announcement"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default Announcements;
