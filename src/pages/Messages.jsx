import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFile,
  FiHeart,
  FiMic,
  FiMoreVertical,
  FiPaperclip,
  FiPhone,
  FiSearch,
  FiSend,
  FiSmile,
  FiSquare,
  FiVideo,
  FiX,
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
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 20;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/3gpp",
]);
const EMOJI_CATEGORIES = [
  { name: "Smileys", icon: "😀", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤔 😎 🥳 😕 🙁 😮 😳 🥺 🥹 😢 😭 😱 😤 😡 🤬 😴 🤒 🤢 🤧 🥶 🥵 🤯 👻 💩".split(" ") },
  { name: "People", icon: "👋", emojis: "👋 🤚 ✋ 🖐️ 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 👍 👎 👏 🙌 🫶 🙏 💪 🦾 🦵 👂 👃 👀 👶 🧒 🧑 👨 👩 🧓 🙋 🙆 🙅 🤷 🤦 💃 🕺 🏃 🚶".split(" ") },
  { name: "Animals", icon: "🐻", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐞 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐘 🦒 🐕 🐈 🦜 🦢".split(" ") },
  { name: "Food", icon: "🍕", emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥝 🍅 🥑 🥦 🥕 🌽 🥐 🍞 🧀 🥚 🍳 🥞 🥓 🍔 🍟 🍕 🌮 🌯 🥗 🍝 🍜 🍣 🍱 🍰 🎂 🍪 🍩 🍫 🍿 ☕ 🧃 🥤 🍺 🍷".split(" ") },
  { name: "Travel", icon: "🚗", emojis: "🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚜 🛵 🏍️ 🚲 🛴 🚦 ⚓ ⛵ 🚤 🚢 ✈️ 🛫 🛬 🚁 🚀 🛸 🌍 🗺️ 🧭 🏔️ 🏕️ 🏖️ 🏝️ 🏠 🏢 🏥 🏫 🏰 🗼 🌅 🌆 🌉".split(" ") },
  { name: "Activities", icon: "⚽", emojis: "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🛹 🛼 ⛸️ 🎿 🏂 🏋️ 🤼 🤸 🏇 🧘 🏄 🏊 🏆 🥇 🥈 🥉 🎖️ 🎨 🎬 🎤 🎧 🎹 🥁 🎷 🎸 🎻 🎲 🎯 🎳 🎮 🧩 🎉 🎊".split(" ") },
  { name: "Objects", icon: "💡", emojis: "💌 💝 💖 💗 💓 💞 💕 💔 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 💢 💥 💫 💦 💬 💭 💤 💻 📱 ☎️ 📷 🎥 💡 🔦 📚 📝 📌 ✂️ 🔒 🔑 🔨 🔧 🧰 💉 💊 🛏️ 🚿 🛒 🎁 🏷️".split(" ") },
  { name: "Symbols", icon: "✅", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ✅ ❎ ❌ ⭕ 🚫 ❗ ❓ ‼️ ⁉️ ⚠️ ➕ ➖ ➗ ✖️ ♾️ ✔️ ☑️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ⭐ 🌟 ✨ ⚡ 🔥 💧 🌈 ☀️ 🌙".split(" ") },
  "📦",
  "🛠️",
];
const QUICK_MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/3gpp",
];

function getAttachmentMediaType(mimeType) {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized === "application/pdf") return "pdf";
  if (normalized.startsWith("audio/")) return "audio";
  return null;
}

function formatRecordingTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

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

function sortByLastMessage(conversations) {
  return [...conversations].sort((first, second) => {
    const getTimestamp = (conversation) => {
      const value =
        conversation?.last_message?.sent_at ||
        conversation?.last_message_at ||
        conversation?.created_at;
      const timestamp = value ? new Date(value).getTime() : 0;
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    return getTimestamp(second) - getTimestamp(first);
  });
}

function isSupportParticipant(person) {
  return person?.is_support === true || person?.name === "Support team";
}

function getRoleLabel(person) {
  if (isSupportParticipant(person)) return "Support team";
  if (person?.role === "group") return "Group chat";
  if (person?.role === "client") return "Parent";
  if (person?.role === "driver") return "Driver";
  if (person?.role === "owner") return "Fleet owner";
  return "Staff";
}

function parseMessageAttachment(content) {
  try {
    const value = JSON.parse(content);
    const normalizeAttachment = (item) => {
      if (!item || typeof item.url !== "string") return null;
      const url = new URL(item.url);
      const isRemoteUrl = ["http:", "https:"].includes(url.protocol);
      const isLocalPreviewUrl =
        url.protocol === "blob:" && url.origin === window.location.origin;
      if (!isRemoteUrl && !isLocalPreviewUrl) return null;
      const mimeType = String(
        item.mimeType || item.mime_type || "",
      ).toLowerCase();
      const mediaType =
        item.mediaType ||
        item.media_type ||
        (mimeType.startsWith("image/")
          ? "image"
          : mimeType.startsWith("audio/")
            ? "audio"
            : mimeType === "application/pdf"
              ? "pdf"
              : "");
      if (!["image", "audio", "pdf"].includes(mediaType)) return null;
      return {
        mediaType,
        url: url.href,
        name: typeof item.name === "string" ? item.name : "Attachment",
      };
    };
    const attachments =
      value?.type === "attachment" && value.url
        ? [normalizeAttachment(value)].filter(Boolean)
        : value?.type === "attachment_group" && Array.isArray(value.attachments)
          ? value.attachments.map(normalizeAttachment).filter(Boolean)
          : [];
    if (!attachments.length) return null;
    return {
      attachments,
      caption: typeof value.caption === "string" ? value.caption : "",
    };
  } catch {
    return null;
  }
}

function getMessagePreview(content) {
  if (!content) return "Start a conversation";
  const attachment = parseMessageAttachment(content);
  if (!attachment) return content;
  const label =
    attachment.attachments.length > 1
      ? `${attachment.attachments.length} attachments`
      : attachment.attachments[0].mediaType === "image"
        ? "Photo"
        : attachment.attachments[0].mediaType === "audio"
          ? "Voice message"
          : "File attachment";
  return attachment.caption ? `${label}: ${attachment.caption}` : label;
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
  if (isSupportParticipant(person)) return "Support team";
  const linkedUser = person?.users || person?.user || {};
  const primaryAdmin = person?.primary_admin || {};
  const personalName = (source) =>
    [source?.first_name, source?.last_name].filter(Boolean).join(" ").trim();

  return (
    primaryAdmin.name ||
    personalName(primaryAdmin) ||
    person?.name ||
    personalName(person) ||
    personalName(linkedUser) ||
    person?.full_name ||
    linkedUser?.full_name ||
    person?.display_name ||
    linkedUser?.display_name ||
    person?.email ||
    linkedUser?.email ||
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
    sortByLastMessage(readCache(conversationsCacheKey, [])),
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
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState(null);
  const [downloadingPreview, setDownloadingPreview] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const [emojiPopupPosition, setEmojiPopupPosition] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [composerError, setComposerError] = useState("");
  const fileInputRef = useRef(null);
  const draftInputRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const stagedObjectUrlsRef = useRef([]);
  const attachmentPreviewUrls = useMemo(
    () => selectedAttachments.map((entry) => entry.previewUrl),
    [selectedAttachments],
  );

  const activePreviewAttachment =
    attachmentPreview?.items?.[attachmentPreview.index];
  const activeEmojiCategory = EMOJI_CATEGORIES[emojiCategory];
  const visibleEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((category) => category.emojis).filter((emoji) =>
        emoji.includes(emojiSearch.trim()),
      )
    : activeEmojiCategory.emojis;

  useEffect(() => {
    if (!emojiPickerOpen) return undefined;
    const updatePosition = () => {
      const button = emojiButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(430, window.innerWidth - 24);
      setEmojiPopupPosition({
        left: Math.max(
          12,
          Math.min(rect.left, window.innerWidth - width - 12),
        ),
        bottom: Math.max(12, window.innerHeight - rect.top + 8),
        width,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [emojiPickerOpen]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      stagedObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(
      () => setRecordingSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recording]);

  const stageAttachments = (files) => {
    const availableSlots =
      MAX_ATTACHMENTS_PER_MESSAGE - selectedAttachments.length;
    if (files.length > availableSlots) {
      setComposerError(
        `You can send up to ${MAX_ATTACHMENTS_PER_MESSAGE} attachments in one message.`,
      );
      return;
    }
    const invalidFile = files.find((file) => {
      const mimeType = file.type.split(";")[0].trim().toLowerCase();
      return (
        !ALLOWED_ATTACHMENT_TYPES.has(mimeType) ||
        file.size > MAX_ATTACHMENT_SIZE
      );
    });
    if (invalidFile) {
      setComposerError(
        invalidFile.size > MAX_ATTACHMENT_SIZE
          ? `${invalidFile.name} is over the 20 MB attachment limit.`
          : `${invalidFile.name} is not a supported attachment type.`,
      );
      return;
    }
    setComposerError("");
    const stagedFiles = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      stagedObjectUrlsRef.current.push(previewUrl);
      return { file, previewUrl };
    });
    setSelectedAttachments((current) => [...current, ...stagedFiles]);
  };

  const removeStagedAttachment = (index) => {
    const removed = selectedAttachments[index];
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
      stagedObjectUrlsRef.current = stagedObjectUrlsRef.current.filter(
        (url) => url !== removed.previewUrl,
      );
    }
    setSelectedAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const toggleVoiceRecording = async () => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setComposerError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const mimeType = RECORDING_MIME_TYPES.find((type) =>
        window.MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType) {
        setComposerError("Voice recording is not supported by this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const recorder = new window.MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setComposerError("Voice recording failed. Please try again.");
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (!chunks.length) return;
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        const extension = blob.type.includes("mp4")
          ? "m4a"
          : blob.type.includes("3gpp")
            ? "3gp"
            : "webm";
        const file = new File([blob], `voice-note-${Date.now()}.${extension}`, {
          type: blob.type,
        });
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setComposerError(
            "This recording is over the 20 MB attachment limit.",
          );
          return;
        }
        stageAttachments([file]);
        setRecordingSeconds(0);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
      setComposerError("");
      setRecording(true);
    } catch (error) {
      console.error("Could not start school voice recording:", error);
      setComposerError(
        error.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Voice recording could not be started on this device.",
      );
    }
  };

  useEffect(() => {
    if (!activePreviewAttachment) {
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = "";
    fetch(activePreviewAttachment.url, {
      signal: controller.signal,
      referrerPolicy: "no-referrer",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Preview could not be loaded.");
        return response.blob();
      })
      .then((blob) => {
        const type =
          activePreviewAttachment.mediaType === "pdf"
            ? "application/pdf"
            : blob.type;
        objectUrl = URL.createObjectURL(new Blob([blob], { type }));
        setPreviewUrl({
          sourceUrl: activePreviewAttachment.url,
          objectUrl,
        });
        setPreviewError(null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load attachment preview:", error);
          setPreviewError({
            sourceUrl: activePreviewAttachment.url,
            message: "Preview could not be loaded. Try downloading it.",
          });
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activePreviewAttachment]);

  useEffect(() => {
    if (!attachmentPreview || attachmentPreview.items.length < 2) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        setAttachmentPreview((current) => ({
          ...current,
          index:
            (current.index - 1 + current.items.length) % current.items.length,
        }));
      } else if (event.key === "ArrowRight") {
        setAttachmentPreview((current) => ({
          ...current,
          index: (current.index + 1) % current.items.length,
        }));
      } else if (event.key === "Escape") {
        setAttachmentPreview(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attachmentPreview]);

  const downloadPreviewAttachment = async () => {
    if (!activePreviewAttachment) return;
    setDownloadingPreview(true);
    setPreviewError(null);
    try {
      const response = await fetch(activePreviewAttachment.url, {
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("Attachment could not be downloaded.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = activePreviewAttachment.name || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Could not download attachment:", error);
      setPreviewError({
        sourceUrl: activePreviewAttachment.url,
        message: "Download failed. Please try again.",
      });
    } finally {
      setDownloadingPreview(false);
    }
  };

  const activePreviewUrl =
    activePreviewAttachment &&
    previewUrl?.sourceUrl === activePreviewAttachment.url
      ? previewUrl.objectUrl
      : "";
  const activePreviewError =
    activePreviewAttachment &&
    previewError?.sourceUrl === activePreviewAttachment.url
      ? previewError.message
      : "";

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiRequest("/school/conversations", {
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      const next = sortByLastMessage(Array.isArray(data) ? data : []);
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
      if (
        Array.isArray(cachedMessages) &&
        String(selectedConversationIdRef.current) === String(conversationId)
      ) {
        setMessages(cachedMessages);
      }
      const data = await apiRequest(
        `/school/conversations/${conversationId}/messages`,
        { headers: { Authorization: `Bearer ${auth.token || ""}` } },
      );
      const next = Array.isArray(data) ? data : [];
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      if (
        String(selectedConversationIdRef.current) !== String(conversationId)
      ) {
        return;
      }
      setMessages(next);
    },
    [auth.token, messagesCachePrefix],
  );

  const openConversation = useCallback(
    async (conversation) => {
      selectedConversationIdRef.current = conversation.id;
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

      const next = sortByLastMessage(
        conversations.filter((item) => item.id !== conversation.id),
      );
      setConversations(next);
      localStorage.setItem(
        conversationsCacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      localStorage.removeItem(`${messagesCachePrefix}:${conversation.id}`);
      selectedConversationIdRef.current = null;
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
      } else if (
        payload?.table === "message_reactions" &&
        selectedConversation?.id
      ) {
        void loadMessages(selectedConversation.id);
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
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
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

    return sortByLastMessage(conversations).filter((conversation) => {
      const participant = conversation.other_participant || {};

      if (isCurrentUserParticipant(participant, auth.user?.id)) return false;

      const role = isSupportParticipant(participant)
        ? "Staff"
        : getRoleLabel(participant);
      const matchesTab = activeTab === "All" || role === roleByTab[activeTab];
      const matchesSearch =
        !query || getPersonName(participant).toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, auth.user?.id, conversations, search]);

  const toggleMessageReaction = async (message, emoji) => {
    if (!selectedConversation || String(message.id).startsWith("optimistic-")) return;
    const previousReactions = message.reactions || [];
    const selected = previousReactions.find((reaction) => reaction.emoji === emoji);
    const userAlreadyReacted =
      selected?.userIds?.includes(auth.user?.id) || selected?.reactedByMe;
    const optimisticReactions = userAlreadyReacted
      ? previousReactions
          .map((reaction) =>
            reaction.emoji === emoji
              ? {
                  ...reaction,
                  count: reaction.count - 1,
                  userIds: reaction.userIds?.filter(
                    (id) => id !== auth.user?.id,
                  ),
                  reactedByMe: false,
                }
              : reaction,
          )
          .filter((reaction) => reaction.count > 0)
      : selected
        ? previousReactions.map((reaction) =>
            reaction.emoji === emoji
              ? {
                  ...reaction,
                  count: reaction.count + 1,
                  userIds: [...(reaction.userIds || []), auth.user?.id],
                  reactedByMe: true,
                }
              : reaction,
          )
        : [
            ...previousReactions,
            {
              emoji,
              count: 1,
              userIds: [auth.user?.id],
              reactedByMe: true,
            },
          ];
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, reactions: optimisticReactions }
          : item,
      ),
    );
    setReactionPickerMessageId(null);
    setReactionPickerPosition(null);
    try {
      const result = await apiRequest(
        `/school/conversations/${selectedConversation.id}/messages/${message.id}/reactions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify({ emoji }),
        },
      );
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, reactions: result.reactions || [] }
            : item,
        ),
      );
    } catch (error) {
      console.error("Could not update school message reaction:", error);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, reactions: previousReactions }
            : item,
        ),
      );
      setComposerError(error.message || "Reaction could not be saved.");
    }
  };

  const toggleReactionPicker = (messageId, event) => {
    if (reactionPickerMessageId === messageId) {
      setReactionPickerMessageId(null);
      setReactionPickerPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 212;
    const popupHeight = 44;
    setReactionPickerPosition({
      left: Math.max(8, Math.min(rect.right - popupWidth, window.innerWidth - popupWidth - 8)),
      top:
        rect.top >= popupHeight + 8
          ? rect.top - popupHeight - 8
          : Math.min(rect.bottom + 8, window.innerHeight - popupHeight - 8),
    });
    setReactionPickerMessageId(messageId);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (
      (!content && selectedAttachments.length === 0) ||
      !selectedConversation ||
      sending ||
      recording
    ) {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const localAttachments = selectedAttachments.map(
      ({ file, previewUrl }) => ({
        url: previewUrl,
        name: file.name,
        mimeType: file.type,
        mediaType: getAttachmentMediaType(file.type),
      }),
    );
    const optimisticContent = localAttachments.length
      ? JSON.stringify(
          localAttachments.length === 1
            ? {
                type: "attachment",
                ...localAttachments[0],
                caption: content,
              }
            : {
                type: "attachment_group",
                attachments: localAttachments,
                caption: content,
              },
        )
      : content;
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        content: optimisticContent,
        sender_id: auth.user?.id,
        sent_at: new Date().toISOString(),
        is_read: false,
      },
    ]);
    setDraft("");
    setSending(true);
    setComposerError("");

    try {
      const uploadedAttachments = [];
      for (const { file } of selectedAttachments) {
        const formData = new FormData();
        formData.append("file", file);
        const uploaded = await apiRequest(
          `/school/conversations/${selectedConversation.id}/attachments`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${auth.token || ""}` },
            body: formData,
          },
        );
        uploadedAttachments.push({
          url: uploaded.url,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          mediaType: uploaded.mediaType,
        });
      }

      const messageContent = uploadedAttachments.length
        ? JSON.stringify(
            uploadedAttachments.length === 1
              ? {
                  type: "attachment",
                  ...uploadedAttachments[0],
                  caption: content,
                }
              : {
                  type: "attachment_group",
                  attachments: uploadedAttachments,
                  caption: content,
                },
          )
        : content;
      const sentMessage = await apiRequest("/school/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: messageContent,
        }),
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId ? sentMessage : message,
        ),
      );
      setSelectedAttachments([]);
      stagedObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      stagedObjectUrlsRef.current = [];
      setEmojiPickerOpen(false);
      void loadConversations();
    } catch (error) {
      console.error("Could not send school message:", error);
      setComposerError(error.message || "Message could not be sent.");
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
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
            selectedConversationIdRef.current = null;
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
                          {getMessagePreview(lastMessage.content)}
                        </span>
                        <span className="conversation-role">
                          {getRoleLabel(participant)}
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
                  onClick={() => {
                    selectedConversationIdRef.current = null;
                    setSelectedConversation(null);
                  }}
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
                  <p>{getRoleLabel(selectedConversation.other_participant)}</p>
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
                          {(() => {
                            const attachment = parseMessageAttachment(
                              message.content,
                            );
                            if (!attachment) {
                              return <p>{message.content}</p>;
                            }
                            return (
                              <div className="message-attachment">
                                <div className="message-attachment-group">
                                  {attachment.attachments.map((item, index) => {
                                    if (item.mediaType === "image") {
                                      const imageItems =
                                        attachment.attachments.filter(
                                          (entry) =>
                                            entry.mediaType === "image",
                                        );
                                      const imageIndex =
                                        imageItems.indexOf(item);
                                      return (
                                        <button
                                          type="button"
                                          className="message-attachment-preview-trigger"
                                          aria-label={`Preview image ${item.name}`}
                                          onClick={() =>
                                            setAttachmentPreview({
                                              items: imageItems,
                                              index: imageIndex,
                                            })
                                          }
                                          key={`${item.url}-${index}`}
                                        >
                                          <img
                                            className="message-attachment-image"
                                            src={item.url}
                                            alt={item.name}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                          />
                                        </button>
                                      );
                                    }
                                    if (item.mediaType === "audio") {
                                      return (
                                        <audio
                                          className="message-attachment-audio"
                                          controls
                                          preload="metadata"
                                          src={item.url}
                                          aria-label={item.name}
                                          key={`${item.url}-${index}`}
                                        />
                                      );
                                    }
                                    return (
                                      <button
                                        type="button"
                                        className="message-attachment-file"
                                        onClick={() =>
                                          setAttachmentPreview({
                                            items: [item],
                                            index: 0,
                                          })
                                        }
                                        key={`${item.url}-${index}`}
                                      >
                                        <FiPaperclip />
                                        <span>{item.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {attachment.caption && (
                                  <p className="message-attachment-caption">
                                    {attachment.caption}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                          <div className={`message-footer${own ? " own" : ""}`}>
                            {/* Show reaction badges for both own and other messages next to the timestamp */}
                            {message.reactions?.length > 0 && (
                              <span
                                className="message-reaction-badges"
                                aria-label={own ? "Reactions to your message" : "Reactions to message"}
                              >
                                {message.reactions.map((reaction) => (
                                  <span key={reaction.emoji}>
                                    {reaction.emoji}
                                  </span>
                                ))}
                              </span>
                            )}
                            <time>
                              {formatTime(message.sent_at)}
                              {own && !message.deliveryError && (
                                <span
                                  className={`message-read-tick${message.is_read ? " is-read" : ""}`}
                                  aria-label={message.is_read ? "Read" : "Sent"}
                                  title={message.is_read ? "Read" : "Sent"}
                                >
                                  {message.is_read ? "✓✓" : "✓"}
                                </span>
                              )}
                            </time>
                            {!own && (
                              <div className="message-reactions">
                                {message.reactions?.map((reaction) => {
                                  const selected =
                                    reaction.userIds?.includes(auth.user?.id) ||
                                    reaction.reactedByMe;
                                  return (
                                    <button
                                      type="button"
                                      key={reaction.emoji}
                                      className={`message-reaction-chip${selected ? " selected" : ""}`}
                                      onClick={() =>
                                        void toggleMessageReaction(
                                          message,
                                          reaction.emoji,
                                        )
                                      }
                                      aria-label={`${reaction.emoji} reaction`}
                                      aria-pressed={Boolean(selected)}
                                    >
                                      <span>{reaction.emoji}</span>
                                    </button>
                                  );
                                })}
                                {reactionPickerMessageId === message.id && (
                                  createPortal(
                                    <div
                                      className="message-reaction-picker"
                                      style={reactionPickerPosition}
                                    >
                                      {QUICK_MESSAGE_REACTIONS.map((emoji) => (
                                        <button
                                          type="button"
                                          key={emoji}
                                          onClick={() =>
                                            void toggleMessageReaction(message, emoji)
                                          }
                                          aria-label={`React with ${emoji}`}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>,
                                    document.body,
                                  )
                                )}
                                {!String(message.id).startsWith("optimistic-") && (
                                  <>
                                    <button
                                      type="button"
                                      className={`message-reaction-like${message.reactions?.some((reaction) => reaction.emoji === "❤️" && (reaction.userIds?.includes(auth.user?.id) || reaction.reactedByMe)) ? " selected" : ""}`}
                                      onClick={() =>
                                        void toggleMessageReaction(message, "❤️")
                                      }
                                      aria-label="Like message"
                                    >
                                      <FiHeart />
                                    </button>
                                    <button
                                      type="button"
                                      className="message-reaction-add"
                                      onClick={(event) =>
                                        toggleReactionPicker(message.id, event)
                                      }
                                      aria-label="Add reaction"
                                      aria-expanded={
                                        reactionPickerMessageId === message.id
                                      }
                                    >
                                      <FiSmile />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {message.deliveryError && (
                            <span className="message-delivery-error">
                              Message not sent
                            </span>
                          )}
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
                <input
                  ref={fileInputRef}
                  className="message-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/mp4,audio/m4a,audio/mpeg,audio/aac,audio/wav,audio/x-wav,audio/webm,audio/3gpp"
                  multiple
                  onChange={(event) => {
                    stageAttachments(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                  aria-label="Choose message attachments"
                />
                {selectedAttachments.length > 0 && (
                  <div className="message-composer-attachments">
                    {selectedAttachments.map(({ file }, index) => {
                      const mediaType = getAttachmentMediaType(file.type);
                      return (
                        <div
                          className="message-composer-attachment"
                          key={`${file.name}-${file.lastModified}-${index}`}
                        >
                          {mediaType === "image" ? (
                            <img
                              src={attachmentPreviewUrls[index]}
                              alt=""
                              className="message-composer-attachment-image"
                            />
                          ) : (
                            <span className="message-composer-attachment-icon">
                              {mediaType === "audio" ? <FiMic /> : <FiFile />}
                            </span>
                          )}
                          <span className="message-composer-attachment-name">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            className="message-composer-attachment-remove"
                            onClick={() => removeStagedAttachment(index)}
                            aria-label={`Remove ${file.name}`}
                            disabled={sending}
                          >
                            <FiX />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {emojiPickerOpen &&
                  !recording &&
                  emojiPopupPosition &&
                  createPortal(
                    <div
                      className="message-emoji-overlay"
                      onClick={() => setEmojiPickerOpen(false)}
                    >
                      <div
                        className="message-emoji-picker"
                        style={{
                          position: "fixed",
                          left: emojiPopupPosition.left,
                          bottom: emojiPopupPosition.bottom,
                          width: emojiPopupPosition.width,
                        }}
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Choose emoji"
                      >
                        <div className="message-emoji-header">
                          <strong>Choose an emoji</strong>
                          <button
                            type="button"
                            onClick={() => setEmojiPickerOpen(false)}
                            aria-label="Close emoji picker"
                          >
                            <FiX />
                          </button>
                        </div>
                        <input
                          className="message-emoji-search"
                          value={emojiSearch}
                          onChange={(event) =>
                            setEmojiSearch(event.target.value)
                          }
                          placeholder="Search emojis"
                          aria-label="Search emojis"
                        />
                        {!emojiSearch.trim() && (
                          <div className="message-emoji-categories">
                            {EMOJI_CATEGORIES.map((category, index) => (
                              <button
                                type="button"
                                key={category.name}
                                className={
                                  emojiCategory === index ? "active" : undefined
                                }
                                onClick={() => setEmojiCategory(index)}
                                aria-label={`${category.name} emoji`}
                                aria-pressed={emojiCategory === index}
                              >
                                <span>{category.icon}</span>
                                <small>{category.name}</small>
                              </button>
                            ))}
                          </div>
                        )}
                        <strong className="message-emoji-category-title">
                          {emojiSearch.trim()
                            ? "Search results"
                            : activeEmojiCategory.name}
                        </strong>
                        <div className="message-emoji-grid">
                          {visibleEmojis.length ? (
                            visibleEmojis.map((emoji, index) => (
                              <button
                                type="button"
                                key={`${emoji}-${index}`}
                                onClick={() => {
                                  const input = draftInputRef.current;
                                  const cursor =
                                    input?.selectionStart ?? draft.length;
                                  const nextDraft = `${draft.slice(0, cursor)}${emoji}${draft.slice(cursor)}`;
                                  setDraft(nextDraft);
                                  requestAnimationFrame(() => {
                                    input?.focus();
                                    input?.setSelectionRange(
                                      cursor + emoji.length,
                                      cursor + emoji.length,
                                    );
                                  });
                                }}
                                aria-label={`Insert ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))
                          ) : (
                            <span className="message-emoji-no-results">
                              No matching emojis
                            </span>
                          )}
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )}
                <div className="message-composer-row">
                  <button
                    type="button"
                    aria-label="Attach files"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || recording}
                  >
                    <FiPaperclip />
                  </button>
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    aria-label="Choose emoji"
                    aria-expanded={emojiPickerOpen}
                    onClick={() => setEmojiPickerOpen((open) => !open)}
                    disabled={sending || recording}
                  >
                    <FiSmile />
                  </button>
                  {recording ? (
                    <div className="message-recording-status" role="status">
                      <span className="message-recording-dot" />
                      <span>Recording voice message</span>
                      <span className="message-recording-time">
                        {formatRecordingTime(recordingSeconds)}
                      </span>
                      <span className="message-recording-progress" />
                    </div>
                  ) : (
                    <input
                      ref={draftInputRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Type your message..."
                      aria-label="Type your message"
                      disabled={sending}
                    />
                  )}
                  <button
                    type="button"
                    aria-label={
                      recording ? "Stop recording" : "Record voice message"
                    }
                    onClick={toggleVoiceRecording}
                    disabled={sending}
                  >
                    {recording ? <FiSquare /> : <FiMic />}
                  </button>
                  <button
                    className="send-message"
                    type="submit"
                    disabled={
                      (!draft.trim() && selectedAttachments.length === 0) ||
                      sending ||
                      recording
                    }
                    aria-label="Send message"
                  >
                    <FiSend />
                  </button>
                </div>
                {composerError && (
                  <p className="message-composer-error" role="alert">
                    {composerError}
                  </p>
                )}
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
      {attachmentPreview && activePreviewAttachment && (
        <div
          className="school-attachment-modal-backdrop"
          role="presentation"
          onClick={() => setAttachmentPreview(null)}
        >
          <section
            className="school-attachment-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activePreviewAttachment.mediaType === "pdf" ? "PDF" : "Image"} preview`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="school-attachment-modal-download"
              type="button"
              onClick={() => void downloadPreviewAttachment()}
              disabled={downloadingPreview}
              aria-label="Download attachment"
              title="Download attachment"
            >
              <FiDownload />
            </button>
            <button
              className="school-attachment-modal-close"
              type="button"
              onClick={() => setAttachmentPreview(null)}
              aria-label="Close preview"
            >
              <FiX />
            </button>
            {activePreviewUrl ? (
              activePreviewAttachment.mediaType === "pdf" ? (
                <iframe
                  className="school-attachment-modal-pdf"
                  src={activePreviewUrl}
                  title={activePreviewAttachment.name}
                />
              ) : (
                <img
                  className="school-attachment-modal-image"
                  src={activePreviewUrl}
                  alt={activePreviewAttachment.name}
                />
              )
            ) : (
              <p className="school-attachment-modal-status">
                {activePreviewError || "Loading preview..."}
              </p>
            )}
            {activePreviewError && activePreviewUrl ? (
              <p className="school-attachment-modal-error">
                {activePreviewError}
              </p>
            ) : null}
            {attachmentPreview.items.length > 1 && (
              <>
                <button
                  className="school-attachment-modal-nav previous"
                  type="button"
                  aria-label="Previous attachment"
                  onClick={() =>
                    setAttachmentPreview((current) => ({
                      ...current,
                      index:
                        (current.index - 1 + current.items.length) %
                        current.items.length,
                    }))
                  }
                >
                  <FiChevronLeft />
                </button>
                <button
                  className="school-attachment-modal-nav next"
                  type="button"
                  aria-label="Next attachment"
                  onClick={() =>
                    setAttachmentPreview((current) => ({
                      ...current,
                      index: (current.index + 1) % current.items.length,
                    }))
                  }
                >
                  <FiChevronRight />
                </button>
                <span className="school-attachment-modal-counter">
                  {attachmentPreview.index + 1} /{" "}
                  {attachmentPreview.items.length}
                </span>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Messages;
