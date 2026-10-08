import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiChevronRight,
  FiLifeBuoy,
  FiMessageCircle,
  FiPlus,
  FiRefreshCw,
  FiSend,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import { useSearchParams } from "react-router-dom";
import "../styles/support-tickets.css";

const categories = [
  ["technical", "Technical issue"],
  ["account", "Account access"],
  ["registration", "School registration"],
  ["child", "Student records"],
  ["driver", "Driver or vehicle"],
  ["route", "Routes and trips"],
  ["safety", "Safety concern"],
  ["payment", "Payments"],
  ["other", "Other"],
];
const priorities = [
  ["low", "Low"],
  ["medium", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"],
];
const filters = ["All", "Open", "In progress", "Resolved"];
const resolvedStatuses = ["resolved", "closed"];

const statusLabel = (status) =>
  status === "in_progress"
    ? "In progress"
    : status.charAt(0).toUpperCase() + status.slice(1);

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getCachedTickets = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null")?.data;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function SupportTickets() {
  const [searchParams] = useSearchParams();
  const requestedTicketId = searchParams.get("ticket") || "";
  let session = {};
  try {
    session = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    session = {};
  }
  const userId = session.user?.id;
  const cacheKey = `schoolSupportTickets:${userId || "current"}`;
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session.token || ""}` }),
    [session.token],
  );
  const [tickets, setTickets] = useState(() => getCachedTickets(cacheKey));
  const [selectedId, setSelectedId] = useState(
    () => requestedTicketId || getCachedTickets(cacheKey)[0]?.id || "",
  );
  const [replies, setReplies] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(() => getCachedTickets(cacheKey).length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    subject: "",
    category: "technical",
    priority: "medium",
    message: "",
  });
  const [replyBody, setReplyBody] = useState("");

  const selected = tickets.find((ticket) => ticket.id === selectedId) || null;
  const filteredTickets = useMemo(() => {
    if (filter === "All") return tickets;
    if (filter === "Resolved") {
      return tickets.filter((ticket) => resolvedStatuses.includes(ticket.status));
    }
    const status = filter === "In progress" ? "in_progress" : "open";
    return tickets.filter((ticket) => ticket.status === status);
  }, [filter, tickets]);

  const loadTickets = useCallback(async () => {
    try {
      const data = await apiRequest("/school/support-tickets", { headers });
      const next = Array.isArray(data) ? data : [];
      localStorage.setItem(cacheKey, JSON.stringify({ data: next, timestamp: Date.now() }));
      setTickets(next);
      setSelectedId((current) =>
        next.some((ticket) => ticket.id === current)
          ? current
          : next[0]?.id || "",
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, headers]);

  const loadReplies = useCallback(async (ticketId) => {
    if (!ticketId) {
      setReplies([]);
      return;
    }
    try {
      const data = await apiRequest(
        `/school/support-tickets/${encodeURIComponent(ticketId)}/replies`,
        { headers },
      );
      setReplies(Array.isArray(data) ? data : []);
      setError("");
    } catch (requestError) {
      setReplies([]);
      setError(requestError.message || "Unable to load this conversation.");
    }
  }, [headers]);

  useEffect(() => {
    // Sync the ticket list with the server when this page is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTickets();
    const interval = window.setInterval(loadTickets, 30000);
    const onFocus = () => loadTickets();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadTickets]);

  useEffect(() => {
    // Load the conversation for the currently selected ticket.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReplies(selectedId);
  }, [loadReplies, selectedId]);

  useEffect(() => {
    if (!supabaseClient || !userId) return undefined;
    const channel = supabaseClient
      .channel(`school-support-ticket-updates:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_dashboard_events" },
        () => {
          loadTickets();
          if (selectedId) loadReplies(selectedId);
        },
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [loadReplies, loadTickets, selectedId, userId]);

  const createTicket = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const ticket = await apiRequest("/school/support-tickets", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const next = [ticket, ...tickets.filter((item) => item.id !== ticket.id)];
      setTickets(next);
      localStorage.setItem(cacheKey, JSON.stringify({ data: next, timestamp: Date.now() }));
      setSelectedId(ticket.id);
      setReplies([]);
      setForm({ subject: "", category: "technical", priority: "medium", message: "" });
      setShowForm(false);
      setNotice("Your request has been sent. Support will respond here.");
    } catch (requestError) {
      setError(requestError.message || "Unable to submit your support request.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selected || !replyBody.trim()) return;
    setReplying(true);
    setError("");
    try {
      await apiRequest(
        `/school/support-tickets/${encodeURIComponent(selected.id)}/replies`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ body: replyBody.trim() }),
        },
      );
      setReplyBody("");
      await loadReplies(selected.id);
      await loadTickets();
    } catch (requestError) {
      setError(requestError.message || "Unable to send your reply.");
    } finally {
      setReplying(false);
    }
  };

  return (
    <main className="school-support-page">
      <header className="school-support-header">
        <div>
          <div className="school-support-eyebrow">HELP CENTRE</div>
          <h1>Support</h1>
          <p>Get help from our team and follow every request in one place.</p>
        </div>
        <button
          className="school-support-primary"
          onClick={() => {
            setShowForm((value) => !value);
            setNotice("");
            setError("");
          }}
          type="button"
        >
          {showForm ? <FiArrowLeft /> : <FiPlus />}
          {showForm ? "Back to tickets" : "New request"}
        </button>
      </header>

      {error && <div className="school-support-alert error">{error}</div>}
      {notice && <div className="school-support-alert success">{notice}</div>}

      {showForm ? (
        <form className="school-support-form" onSubmit={createTicket}>
          <div className="school-support-form-heading">
            <span className="school-support-icon"><FiLifeBuoy /></span>
            <div>
              <h2>Tell us how we can help</h2>
              <p>Include enough detail for our team to investigate your request.</p>
            </div>
          </div>
          <label>
            Subject
            <input
              maxLength={200}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              placeholder="Briefly describe the issue"
              required
              value={form.subject}
            />
          </label>
          <div className="school-support-form-row">
            <label>
              Category
              <select
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                value={form.category}
              >
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                value={form.priority}
              >
                {priorities.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Message
            <textarea
              maxLength={10000}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              placeholder="Describe what happened and what you need help with"
              required
              rows={6}
              value={form.message}
            />
          </label>
          <button className="school-support-primary" disabled={submitting} type="submit">
            <FiSend /> {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
      ) : (
        <section className="school-support-layout">
          <aside className={`school-support-list ${selected ? "has-selection" : ""}`}>
            <div className="school-support-list-header">
              <div>
                <h2>Your requests</h2>
                <span>{tickets.length} total</span>
              </div>
              <button
                aria-label="Refresh support requests"
                className="school-support-icon-button"
                onClick={loadTickets}
                type="button"
              >
                <FiRefreshCw />
              </button>
            </div>
            <div className="school-support-filters">
              {filters.map((item) => (
                <button
                  className={filter === item ? "active" : ""}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="school-support-ticket-list">
              {loading && tickets.length === 0 ? (
                <div className="school-support-empty">Loading requests…</div>
              ) : filteredTickets.length === 0 ? (
                <div className="school-support-empty">
                  <FiMessageCircle />
                  <strong>No requests here</strong>
                  <span>Your support requests will appear here.</span>
                </div>
              ) : filteredTickets.map((ticket) => (
                <button
                  className={`school-support-ticket ${ticket.id === selectedId ? "selected" : ""}`}
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  type="button"
                >
                  <span className={`school-support-status ${ticket.status}`}>
                    {statusLabel(ticket.status)}
                  </span>
                  <strong>{ticket.subject}</strong>
                  <span className="school-support-ticket-preview">{ticket.message}</span>
                  <span className="school-support-ticket-meta">
                    {ticket.category} <span>·</span> {formatDate(ticket.updated_at || ticket.created_at)}
                    <FiChevronRight />
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="school-support-conversation">
            {selected ? (
              <>
                <div className="school-support-conversation-heading">
                  <div>
                    <span className={`school-support-status ${selected.status}`}>
                      {statusLabel(selected.status)}
                    </span>
                    <h2>{selected.subject}</h2>
                    <p>Created {formatDate(selected.created_at)} · {selected.category}</p>
                  </div>
                  <span className={`school-support-priority ${selected.priority}`}>
                    {selected.priority} priority
                  </span>
                </div>
                <div className="school-support-messages">
                  <article className="school-support-message requester">
                    <div className="school-support-message-author">You <time>{formatDate(selected.created_at)}</time></div>
                    <p>{selected.message}</p>
                  </article>
                  {replies.map((reply) => {
                    const isRequester = reply.author_user_id === userId;
                    return (
                      <article
                        className={`school-support-message ${isRequester ? "requester" : "agent"}`}
                        key={reply.id}
                      >
                        <div className="school-support-message-author">
                          {isRequester ? "You" : "Support team"}
                          <time>{formatDate(reply.created_at)}</time>
                        </div>
                        <p>{reply.body}</p>
                      </article>
                    );
                  })}
                  {replies.length === 0 && (
                    <div className="school-support-first-reply">
                      <FiMessageCircle />
                      <span>Replies from our support team will appear here.</span>
                    </div>
                  )}
                </div>
                {resolvedStatuses.includes(selected.status) ? (
                  <div className="school-support-closed">This request is closed. Contact support to open a new request.</div>
                ) : (
                  <form className="school-support-reply-form" onSubmit={sendReply}>
                    <textarea
                      aria-label="Write a reply"
                      maxLength={10000}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder="Write a reply…"
                      required
                      rows={2}
                      value={replyBody}
                    />
                    <button
                      aria-label="Send reply"
                      className="school-support-primary"
                      disabled={replying || !replyBody.trim()}
                      type="submit"
                    >
                      <FiSend /> {replying ? "Sending…" : "Reply"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="school-support-no-selection">
                <FiLifeBuoy />
                <h2>Support is here to help</h2>
                <p>Select a request to view the conversation, or create a new request to get started.</p>
                <button className="school-support-primary" onClick={() => setShowForm(true)} type="button">
                  <FiPlus /> New request
                </button>
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
