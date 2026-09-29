import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import {
  downloadSchoolReport,
  getCachedSchoolReportProfile,
} from "../utils/schoolReport";
import "../styles/incidents.css";

const tabs = ["All Incidents", "Open", "In Progress", "Resolved"];
const localDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
const dateOffset = (date, offset) => {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
};
const readAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};
const categoryIcon = (category) => {
  if (category === "Emergency") return FiAlertTriangle;
  if (category === "Attendance") return FiUser;
  return FiAlertCircle;
};
const categoryTone = (category) =>
  category === "Emergency"
    ? "red"
    : category === "Attendance"
      ? "orange"
      : "blue";
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
const percent = (part, total) =>
  total ? `${Math.round((part / total) * 100)}%` : "0%";

function Incidents() {
  const auth = readAuth();
  const userId = auth.user?.id || "current";
  const cacheKey = `schoolIncidentsCache:${userId}`;
  const [incidents, setIncidents] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return Array.isArray(cached?.data) ? cached.data : [];
    } catch {
      return [];
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
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All Incidents");
  const [severityFilter, setSeverityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [dateFrom, setDateFrom] = useState(() =>
    localDate(dateOffset(new Date(), -6)),
  );
  const [dateTo, setDateTo] = useState(() => localDate(new Date()));

  const loadIncidents = useCallback(
    async (showRefreshing = false) => {
      if (!auth.token) {
        setLoading(false);
        return;
      }
      if (showRefreshing) setRefreshing(true);
      setError("");
      try {
        const data = await apiRequest("/school/incidents", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const next = Array.isArray(data) ? data : [];
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: next, timestamp: Date.now() }),
        );
        setIncidents(next);
      } catch (requestError) {
        setError(requestError?.message || "Unable to load incident reports.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auth.token, cacheKey],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadIncidents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadIncidents]);

  useEffect(() => {
    if (!supabaseClient || !auth.user?.id) return undefined;
    let refreshTimer;
    const queueRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void loadIncidents(true), 300);
    };
    const channel = supabaseClient
      .channel(`school-incidents:${auth.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absence_reports" },
        queueRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_alerts" },
        queueRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incident_reports" },
        queueRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children" },
        queueRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("School incident realtime unavailable:", status);
        }
      });
    return () => {
      window.clearTimeout(refreshTimer);
      void supabaseClient.removeChannel(channel);
    };
  }, [auth.user?.id, loadIncidents]);

  const periodIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        const reportDate = incident.reported_at
          ? new Date(incident.reported_at).toISOString().slice(0, 10)
          : "";
        return (
          (!dateFrom || (reportDate && reportDate >= dateFrom)) &&
          (!dateTo || (reportDate && reportDate <= dateTo))
        );
      }),
    [dateFrom, dateTo, incidents],
  );

  const counts = useMemo(() => {
    const result = {
      total: periodIncidents.length,
      open: 0,
      progress: 0,
      resolved: 0,
      critical: 0,
      byCategory: new Map(),
    };
    periodIncidents.forEach((incident) => {
      if (incident.status === "Open") result.open += 1;
      if (incident.status === "In Progress") result.progress += 1;
      if (incident.status === "Resolved") result.resolved += 1;
      if (incident.severity === "Critical") result.critical += 1;
      result.byCategory.set(
        incident.category,
        (result.byCategory.get(incident.category) || 0) + 1,
      );
    });
    return result;
  }, [periodIncidents]);

  const filteredIncidents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return periodIncidents.filter((incident) => {
      const searchable = [
        incident.id,
        incident.title,
        incident.description,
        incident.reporter,
        incident.reporter_role,
        incident.child_name,
        incident.route_name,
        incident.location,
        incident.category,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (tab === "All Incidents" || incident.status === tab) &&
        (!severityFilter || incident.severity === severityFilter)
      );
    });
  }, [periodIncidents, query, severityFilter, tab]);

  const pageCount = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageIncidents = filteredIncidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const updateFilters = (callback) => {
    callback();
    setPage(1);
  };

  const exportIncidents = async () => {
    if (exporting || !filteredIncidents.length) return;
    setExporting(true);
    try {
      const school = getCachedSchoolReportProfile();
      await downloadSchoolReport({
        records: filteredIncidents.map((incident) => ({
          id: incident.id,
          title: incident.title,
          category: incident.category,
          reporter: incident.reporter,
          related:
            [incident.child_name, incident.route_name]
              .filter(Boolean)
              .join(" / ") || "—",
          location: incident.location,
          severity: incident.severity,
          status: incident.status,
          date: formatDate(incident.reported_at),
        })),
        columns: [
          { key: "id", title: "Report ID", width: 1.5 },
          { key: "title", title: "Report", width: 2.2, emphasize: true },
          { key: "category", title: "Category", width: 1.3 },
          { key: "reporter", title: "Reported by", width: 1.8 },
          { key: "related", title: "Student / route", width: 2 },
          { key: "severity", title: "Severity", width: 1 },
          { key: "status", title: "Status", width: 1.1 },
          { key: "date", title: "Reported on", width: 1.4 },
        ],
        title: "Incident reports",
        schoolName: school.name || "School report",
        fileName: "school-incident-reports.pdf",
        subject: "School incident and absence reports",
        metadata: [{ label: "Reports", value: filteredIncidents.length }],
      });
    } catch (exportError) {
      setError(exportError?.message || "Could not export incident reports.");
    } finally {
      setExporting(false);
    }
  };

  const statusPercent = (value) => percent(value, counts.total);
  return (
    <div className="portal-content incidents-content">
      <section className="incidents-heading">
        <div>
          <p className="page-kicker">SAFETY & OPERATIONS</p>
          <h1>Incidents & reports</h1>
          <p>
            Emergency alerts and student absence reports linked to this school.
          </p>
        </div>
        <div className="incidents-actions">
          <label className="incident-date-filter">
            <FiCalendar />
            <input
              aria-label="From date"
              type="date"
              value={dateFrom}
              onChange={(event) =>
                updateFilters(() => setDateFrom(event.target.value))
              }
            />
            <span>to</span>
            <input
              aria-label="To date"
              type="date"
              value={dateTo}
              onChange={(event) =>
                updateFilters(() => setDateTo(event.target.value))
              }
            />
          </label>
          <button
            className="incident-primary"
            type="button"
            disabled={refreshing}
            onClick={() => void loadIncidents(true)}
          >
            <FiRefreshCw className={refreshing ? "incident-refreshing" : ""} />{" "}
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </section>

      {error && (
        <div className="incident-error" role="alert">
          <span>
            {error}
            {incidents.length ? " Showing cached reports." : ""}
          </span>
          <button type="button" onClick={() => void loadIncidents(true)}>
            Try again
          </button>
        </div>
      )}
      {loading && incidents.length === 0 && (
        <div className="incident-loading">Loading incident reports…</div>
      )}

      <section className="incident-metrics">
        <article>
          <span className="incident-metric red">
            <FiAlertTriangle />
          </span>
          <div>
            <small>Total reports</small>
            <strong>{counts.total}</strong>
            <em className="neutral">Emergency and absence reports</em>
          </div>
        </article>
        <article>
          <span className="incident-metric orange">
            <FiClock />
          </span>
          <div>
            <small>Open</small>
            <strong>{counts.open}</strong>
            <em className="neutral">{statusPercent(counts.open)} of reports</em>
          </div>
        </article>
        <article>
          <span className="incident-metric blue">
            <FiClock />
          </span>
          <div>
            <small>In progress</small>
            <strong>{counts.progress}</strong>
            <em className="neutral">
              {statusPercent(counts.progress)} of reports
            </em>
          </div>
        </article>
        <article>
          <span className="incident-metric green">
            <FiCheckCircle />
          </span>
          <div>
            <small>Resolved</small>
            <strong>{counts.resolved}</strong>
            <em className="neutral">
              {statusPercent(counts.resolved)} of reports
            </em>
          </div>
        </article>
        <article>
          <span className="incident-metric purple">
            <FiShield />
          </span>
          <div>
            <small>Critical</small>
            <strong>{counts.critical}</strong>
            <em className="neutral">
              {statusPercent(counts.critical)} of reports
            </em>
          </div>
        </article>
      </section>

      <section className="incidents-layout">
        <div className="incidents-panel">
          <div className="incident-tabs">
            {tabs.map((item) => (
              <button
                type="button"
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => updateFilters(() => setTab(item))}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="incidents-toolbar">
            <label className="incidents-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) =>
                  updateFilters(() => setQuery(event.target.value))
                }
                placeholder="Search reports..."
              />
            </label>
            <label className="incident-severity-filter">
              <FiAlertTriangle />
              <select
                aria-label="Filter by severity"
                value={severityFilter}
                onChange={(event) =>
                  updateFilters(() => setSeverityFilter(event.target.value))
                }
              >
                <option value="">All severity</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <button
              type="button"
              disabled={exporting || !filteredIncidents.length}
              onClick={() => void exportIncidents()}
            >
              <FiFileText /> {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
          <div className="incident-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Type</th>
                  <th>Reported by</th>
                  <th>Related to</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported on</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageIncidents.map((incident) => {
                  const Icon = categoryIcon(incident.category);
                  return (
                    <tr key={incident.id}>
                      <td>
                        <strong>{incident.id.slice(0, 13)}</strong>
                        <small>{incident.title}</small>
                      </td>
                      <td>
                        <span
                          className={`incident-type-icon ${categoryTone(incident.category)}`}
                        >
                          <Icon />
                        </span>
                        <small>{incident.category}</small>
                      </td>
                      <td>
                        <strong>{incident.reporter}</strong>
                        <small>{incident.reporter_role}</small>
                      </td>
                      <td>
                        <strong>{incident.child_name || "—"}</strong>
                        <small>
                          {incident.route_name || "No linked route"}
                        </small>
                      </td>
                      <td>{incident.location || "Not specified"}</td>
                      <td>
                        <span
                          className={`severity ${String(incident.severity || "low").toLowerCase()}`}
                        >
                          {incident.severity || "Unspecified"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`incident-status ${String(
                            incident.status || "open",
                          )
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {incident.status || "Open"}
                        </span>
                      </td>
                      <td>
                        <strong>{formatDate(incident.reported_at)}</strong>
                        <small>{formatTime(incident.reported_at)}</small>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="incident-action"
                          aria-label={`View ${incident.title}`}
                          onClick={() => setSelectedIncident(incident)}
                        >
                          <FiEye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filteredIncidents.length === 0 && (
              <div className="empty-incidents">
                {incidents.length
                  ? "No reports match the selected filters."
                  : "No incident or absence reports have been recorded for this school."}
              </div>
            )}
          </div>
          <div className="incidents-footer">
            <span>
              Showing{" "}
              {filteredIncidents.length ? (currentPage - 1) * pageSize + 1 : 0}{" "}
              to {Math.min(currentPage * pageSize, filteredIncidents.length)} of{" "}
              {filteredIncidents.length} reports
            </span>
            <div>
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              <button type="button" className="current-page">
                {currentPage}
              </button>
              <button
                type="button"
                aria-label="Next page"
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
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
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </div>

        <aside className="incidents-side">
          <div className="incident-overview">
            <h2>Report overview</h2>
            <div
              className="incident-donut"
              style={{
                "--open-share": statusPercent(counts.open),
                "--progress-end": `${counts.open + counts.progress ? ((counts.open + counts.progress) / (counts.total || 1)) * 100 : 0}%`,
                "--resolved-end": `${counts.total ? ((counts.open + counts.progress + counts.resolved) / counts.total) * 100 : 0}%`,
              }}
            >
              <strong>
                {counts.total}
                <small>Total</small>
              </strong>
            </div>
            <div className="incident-legend">
              <p>
                <i className="open-dot" />
                Open{" "}
                <b>
                  {counts.open} ({statusPercent(counts.open)})
                </b>
              </p>
              <p>
                <i className="progress-dot" />
                In Progress{" "}
                <b>
                  {counts.progress} ({statusPercent(counts.progress)})
                </b>
              </p>
              <p>
                <i className="resolved-dot" />
                Resolved{" "}
                <b>
                  {counts.resolved} ({statusPercent(counts.resolved)})
                </b>
              </p>
            </div>
          </div>
          <div className="incident-categories">
            <h2>Reports by type</h2>
            {Array.from(counts.byCategory.entries()).map(
              ([category, count]) => {
                const Icon = categoryIcon(category);
                return (
                  <p key={category}>
                    <span>
                      <Icon /> {category}
                    </span>
                    <b>{count}</b>
                  </p>
                );
              },
            )}
            {counts.byCategory.size === 0 && (
              <p className="incident-no-categories">
                No report categories yet.
              </p>
            )}
          </div>
          <div className="incident-quick">
            <h2>Data sources</h2>
            <p className="incident-source-copy">
              <FiAlertTriangle /> Emergency alerts submitted for students at
              this school.
            </p>
            <p className="incident-source-copy">
              <FiCalendar /> Parent-submitted absence reports for school
              students.
            </p>
            <p className="incident-realtime">
              Updates automatically when Supabase receives new reports.
            </p>
          </div>
        </aside>
      </section>

      {selectedIncident && (
        <div
          className="incident-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedIncident(null);
          }}
        >
          <section
            className="incident-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-detail-title"
          >
            <header>
              <div>
                <p>{selectedIncident.category}</p>
                <h2 id="incident-detail-title">{selectedIncident.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close report details"
                onClick={() => setSelectedIncident(null)}
              >
                <FiX />
              </button>
            </header>
            <p className="incident-modal-description">
              {selectedIncident.description ||
                "No additional details were provided."}
            </p>
            <dl>
              <div>
                <dt>Reported by</dt>
                <dd>
                  {selectedIncident.reporter} · {selectedIncident.reporter_role}
                </dd>
              </div>
              <div>
                <dt>Student</dt>
                <dd>{selectedIncident.child_name || "Not associated"}</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>{selectedIncident.route_name || "Not associated"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selectedIncident.location || "Not specified"}</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd>{selectedIncident.severity}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedIncident.status}</dd>
              </div>
              <div>
                <dt>Reported</dt>
                <dd>
                  {formatDate(selectedIncident.reported_at)}{" "}
                  {formatTime(selectedIncident.reported_at)}
                </dd>
              </div>
              {selectedIncident.absence_date && (
                <div>
                  <dt>Absence date</dt>
                  <dd>{formatDate(selectedIncident.absence_date)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}

export default Incidents;
