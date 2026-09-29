import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiMoreVertical,
  FiPaperclip,
  FiPhone,
  FiSearch,
  FiSend,
  FiVideo,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import {
  showDeleteConfirmationAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../components/sweetAlert.js";
import "../styles/messages.css";

const tabs = ["All", "Parents", "Drivers", "Staff"];
const roleByTab = {
  Parents: "Parent",
  Drivers: "Driver",
  Staff: "Staff",
};

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRoleLabel(role) {
  if (role === "client") return "Parent";
  if (role === "driver") return "Driver";
  if (role === "owner") return "Fleet owner";
  return "Staff";
}

function readCache(key, fallback) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    return cached?.data ?? fallback;
  } catch {
    return fallback;
  }
}

function getPersonId(person) {
  return person?.user_id || person?.users?.id || person?.id;
}

function getStaffUserId(member) {
  return member?.user_id || member?.users?.id || null;
}

function getPersonName(person) {
  const linkedUser = person?.users || person?.user || {};
  const primaryAdmin = person?.primary_admin || {};
  const personalName = (source) =>
    [source?.first_name, source?.last_name].filter(Boolean).join(" ").trim();

  return (
    primaryAdmin.name ||
    personalName(primaryAdmin) ||
    personalName(person) ||
    personalName(linkedUser) ||
    person?.full_name ||
    linkedUser?.full_name ||
    person?.display_name ||
    linkedUser?.display_name ||
    person?.email ||
    linkedUser?.email ||
    person?.name ||
    "Staff member"
  );
}

function isCurrentUserParticipant(person, userId) {
  if (!userId) return false;

  const ids = [
    person?.user_id,
    person?.users?.id,
    person?.id,
    person?.primary_admin?.id,
    person?.profile?.primary_admin?.id,
  ];

  return ids.some((id) => id && String(id) === String(userId));
}

function Messages() {
  const auth = getAuth();
  const conversationsCacheKey = `schoolConversationsCache:${auth.user?.id || "current"}`;
  const messagesCachePrefix = `schoolMessagesCache:${auth.user?.id || "current"}`;
  const [conversations, setConversations] = useState(() =>
    readCache(conversationsCacheKey, []),
  );

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(
    () => !Array.isArray(readCache(conversationsCacheKey, null)),
  );
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiRequest("/school/conversations", {
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      const next = Array.isArray(data) ? data : [];
      localStorage.setItem(
        conversationsCacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      setConversations(next);
      return next;
    } catch {
      // Keep cached conversations visible when the server is unavailable.
      return null;
    } finally {
      setLoading(false);
    }
  }, [auth.token, conversationsCacheKey]);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      const cacheKey = `${messagesCachePrefix}:${conversationId}`;
      const cachedMessages = readCache(cacheKey, null);
      if (Array.isArray(cachedMessages)) setMessages(cachedMessages);
      const data = await apiRequest(
        `/school/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${auth.token || ""}` } },
      );
      const next = Array.isArray(data) ? data : [];
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      setMessages(next);
    },
    [auth.token, messagesCachePrefix],
  );

  const openConversation = useCallback(
    async (conversation) => {
      setSelectedConversation(conversation);
      const cacheKey = `${messagesCachePrefix}:${conversation.id}`;
      const cachedMessages = readCache(cacheKey, null);
      if (Array.isArray(cachedMessages)) {
        setMessages(cachedMessages);
        setLoadingMessages(false);
      } else {
        setMessages([]);
        setLoadingMessages(true);
      }
      try {
        await loadMessages(conversation.id);
        await apiRequest(`/school/conversations/${conversation.id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
        });
        await loadConversations();
      } catch {
        // Keep cached messages visible when the database is unavailable.
      } finally {
        setLoadingMessages(false);
      }
    },
    [auth.token, loadConversations, loadMessages, messagesCachePrefix],
  );

  const deleteConversation = async () => {
    if (!selectedConversation || deletingConversation) return;

    const conversation = selectedConversation;
    const confirmation = await showDeleteConfirmationAlert({
      title: "Delete conversation?",
      text: "This conversation and its messages will be permanently deleted.",
    });

    if (!confirmation.isConfirmed) {
      setConversationMenuOpen(false);
      return;
    }

    setDeletingConversation(true);
    setConversationError("");

    try {
      await apiRequest(`/school/conversations/${conversation.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });

      const next = conversations.filter((item) => item.id !== conversation.id);
      setConversations(next);
      localStorage.setItem(
        conversationsCacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      localStorage.removeItem(`${messagesCachePrefix}:${conversation.id}`);
      setSelectedConversation(null);
      setMessages([]);
      setConversationMenuOpen(false);
      showSuccessAlert({ title: "Conversation deleted" });
    } catch (error) {
      showErrorAlert(
        error?.message ||
          "Could not delete the conversation. Please try again.",
      );
    } finally {
      setDeletingConversation(false);
    }
  };

  useEffect(() => {
    // Load the server-backed conversation list when the page opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!supabaseClient || !userId) return undefined;

    let active = true;
    const refreshMessages = (payload) => {
      if (!active) return;
      void loadConversations();
      const conversationId =
        payload?.new?.conversation_id || payload?.old?.conversation_id;
      if (conversationId && conversationId === selectedConversation?.id) {
        void loadMessages(conversationId);
      }
    };

    const channel = supabaseClient
      .channel(
        `school-messages:${userId}:${selectedConversation?.id || "all"}:${Date.now()}`,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        refreshMessages,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        refreshMessages,
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("School messages realtime unavailable:", status);
      }
    });

    return () => {
      active = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [
    auth.user?.id,
    loadConversations,
    loadMessages,
    selectedConversation?.id,
  ]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const participant = conversation.other_participant || {};

      if (isCurrentUserParticipant(participant, auth.user?.id)) return false;

      const role = getRoleLabel(participant.role);
      const matchesTab = activeTab === "All" || role === roleByTab[activeTab];
      const matchesSearch =
        !query || getPersonName(participant).toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, auth.user?.id, conversations, search]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      await apiRequest("/school/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: draft.trim(),
        }),
      });
      setDraft("");
      await openConversation(selectedConversation);
    } finally {
      setSending(false);
    }
  };

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const data = await apiRequest("/school/members", {
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [auth.token]);

  const startStaffConversation = async (member) => {
    const participantId = getStaffUserId(member);
    if (!participantId || String(participantId) === String(auth.user?.id)) {
      return;
    }

    setConversationError("");
    try {
      const result = await apiRequest("/school/conversations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otherUserId: participantId,
          conversationType: "school_staff",
        }),
      });

      const created =
        result?.conversation || result?.data?.conversation || result;
      const refreshed = await loadConversations();
      const conversation = created?.id
        ? created
        : refreshed?.find(
            (item) =>
              String(getPersonId(item.other_participant)) ===
              String(participantId),
          );

      if (!conversation?.id) {
        setConversationError(
          "The conversation was not created. Check that the server supports POST /school/conversations for staff.",
        );
        return;
      }

      await openConversation(conversation);
    } catch (error) {
      setConversationError(
        error?.message || "Could not start the conversation. Please try again.",
      );
    }
  };

  const staffWithoutConversation = useMemo(() => {
    const currentUserId = auth.user?.id;
    const conversationParticipantIds = new Set(
      conversations.map((item) => String(getPersonId(item.other_participant))),
    );

    return staff.filter((member) => {
      const id = getStaffUserId(member);

      return (
        id &&
        !isCurrentUserParticipant(member, currentUserId) &&
        !isCurrentUserParticipant(member.primary_admin, currentUserId) &&
        !conversationParticipantIds.has(String(id))
      );
    });
  }, [auth.user?.id, conversations, staff]);

  return (
    <div className="messages-page">
      <header className="messages-heading">
        <div className="messages-title-wrap">
          <span className="messages-title-icon">✉</span>
          <div>
            <h1>Messages</h1>
            <p>Communicate with parents, drivers, and school staff.</p>
          </div>
        </div>
        {/* <button
          className="messages-new-button"
          type="button"
          onClick={() => {
            setSelectedConversation(null);
            setActiveTab("Staff");
            void loadStaff();
          }}
        >
          <FiPlus /> Message staff
        </button> */}
      </header>

      <div
        className={`messages-workspace ${selectedConversation ? "chat-open" : ""}`}
      >
        <section className="conversation-panel">
          <div className="messages-tabs">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab ? "active" : ""}
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "Staff") void loadStaff();
                }}
              >
                {tab}
                {tab === "All" && <b>{conversations.length}</b>}
              </button>
            ))}
          </div>
          <label className="conversation-search">
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations..."
            />
          </label>
          <div className="conversation-list">
            {conversationError && (
              <p className="messages-empty" role="alert">
                {conversationError}
              </p>
            )}
            {loading ? (
              <p className="messages-empty">Loading conversations...</p>
            ) : (
              <>
                {filteredConversations.map((conversation) => {
                  const participant = conversation.other_participant || {};
                  const participantName = getPersonName(participant);
                  const lastMessage = conversation.last_message || {};
                  const unreadCount = conversation.unread_count || 0;
                  return (
                    <button
                      className={`conversation-item ${selectedConversation?.id === conversation.id ? "selected" : ""}`}
                      key={conversation.id}
                      onClick={() => openConversation(conversation)}
                    >
                      <span
                        className={`conversation-avatar ${participant.role || "staff"}`}
                      >
                        {getInitials(participantName)}
                      </span>
                      <span className="conversation-copy">
                        <span className="conversation-topline">
                          <strong>{participantName}</strong>
                          <time>
                            {formatTime(conversation.last_message_at)}
                          </time>
                        </span>
                        <span className="conversation-preview">
                          {lastMessage.content || "Start a conversation"}
                        </span>
                        <span className="conversation-role">
                          {getRoleLabel(participant.role)}
                        </span>
                      </span>
                      {unreadCount > 0 && (
                        <b className="unread-dot">{unreadCount}</b>
                      )}
                    </button>
                  );
                })}

                {activeTab === "Staff" && (
                  <>
                    {loadingStaff && (
                      <p className="messages-empty">Loading staff...</p>
                    )}
                    {staffWithoutConversation.map((member) => {
                      const name = getPersonName(member);

                      return (
                        <button
                          className="conversation-item"
                          key={getPersonId(member)}
                          onClick={() => void startStaffConversation(member)}
                        >
                          <span className="conversation-avatar staff">
                            {getInitials(name)}
                          </span>
                          <span className="conversation-copy">
                            <strong>{name}</strong>
                            <span className="conversation-preview">
                              Start a conversation
                            </span>
                            <span className="conversation-role">Staff</span>
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </section>

        <section className="chat-panel">
          {selectedConversation ? (
            <>
              <header className="chat-panel-header">
                <button
                  className="mobile-chat-back"
                  onClick={() => setSelectedConversation(null)}
                >
                  <FiArrowLeft />
                </button>
                <span className="chat-avatar">
                  {getInitials(
                    getPersonName(selectedConversation.other_participant),
                  )}
                </span>
                <div>
                  <h2>
                    {getPersonName(selectedConversation.other_participant)}
                  </h2>
                  <p>
                    {getRoleLabel(selectedConversation.other_participant?.role)}
                  </p>
                </div>
                <div className="chat-actions">
                  <button aria-label="Call">
                    <FiPhone />
                  </button>
                  <button aria-label="Video call">
                    <FiVideo />
                  </button>
                  <div className="conversation-menu">
                    <button
                      type="button"
                      aria-label="Conversation options"
                      aria-haspopup="menu"
                      aria-expanded={conversationMenuOpen}
                      onClick={() =>
                        setConversationMenuOpen((isOpen) => !isOpen)
                      }
                    >
                      <FiMoreVertical />
                    </button>
                    {conversationMenuOpen && (
                      <div className="conversation-menu-dropdown" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          disabled={deletingConversation}
                          onClick={() => void deleteConversation()}
                        >
                          {deletingConversation
                            ? "Deleting..."
                            : "Delete conversation"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>
              <div className="chat-messages">
                {loadingMessages ? (
                  <p className="messages-empty">Loading messages...</p>
                ) : messages.length ? (
                  messages.map((message) => {
                    const own = message.sender_id === auth.user?.id;
                    return (
                      <div
                        className={`message-bubble-row ${own ? "own" : ""}`}
                        key={message.id}
                      >
                        <div className={`message-bubble ${own ? "own" : ""}`}>
                          <p>{message.content}</p>
                          <time>
                            {formatTime(message.sent_at)}
                            {message.sender_id === auth.user?.id
                              ? message.is_read
                                ? "  ✓✓"
                                : "  ✓"
                              : ""}
                          </time>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="messages-empty">
                    No messages yet. Start the conversation.
                  </p>
                )}
              </div>
              <form className="message-composer" onSubmit={sendMessage}>
                <button type="button" aria-label="Attach file">
                  <FiPaperclip />
                </button>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your message..."
                />
                <button
                  className="send-message"
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                >
                  <FiSend />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-placeholder">
              <span>✉</span>
              <h2>Select a conversation</h2>
              <p>Choose a parent, driver, or staff member to view messages.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Messages;
