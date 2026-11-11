import { useEffect, useRef } from "react";
import { usePresence } from "./PresenceContext";

const formatLastSeen = (timestamp) => {
  if (!timestamp) return "Last seen unavailable";
  const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
};

export const PresenceDot = ({ userId }) => {
  const { ready, onlineUserIds } = usePresence();
  if (!ready || !userId || !onlineUserIds.has(String(userId))) return null;
  return <i className="presence-online-dot" aria-label="Online" title="Online" />;
};

export const PresenceStatus = ({ userId }) => {
  const {
    ready,
    onlineUserIds,
    lastSeenByUserId,
    refreshLastSeen,
  } = usePresence();
  const isOnline = Boolean(userId && onlineUserIds.has(String(userId)));
  const wasOnline = useRef(false);
  const wasReady = useRef(false);
  useEffect(() => {
    if (ready && userId && !isOnline) {
      void refreshLastSeen(
        [String(userId)],
        wasOnline.current || !wasReady.current,
      );
    }
    wasOnline.current = isOnline;
    wasReady.current = ready;
  }, [isOnline, ready, refreshLastSeen, userId]);
  if (!userId) return null;
  if (!ready) return <span className="presence-status">Connecting...</span>;
  return isOnline ? (
    <span className="presence-status online">Online</span>
  ) : (
    <span className="presence-status">
      {formatLastSeen(lastSeenByUserId[String(userId)])}
    </span>
  );
};
