import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import { PresenceContext } from "./PresenceContext";

const EMPTY_USER_IDS = new Set();

const readSession = () => {
  try {
    const auth = JSON.parse(localStorage.getItem("schoolAuth") || "null");
    return { userId: auth?.user?.id || "", token: auth?.token || "" };
  } catch (error) {
    console.error("Could not read school presence session:", error);
    return { userId: "", token: "" };
  }
};

export const PresenceProvider = ({ children }) => {
  const [session, setSession] = useState(readSession);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [presenceState, setPresenceState] = useState({
    sessionKey: "",
    ready: false,
    onlineUserIds: EMPTY_USER_IDS,
  });
  const [lastSeenByUserId, setLastSeenByUserId] = useState({});
  const requestedLastSeenAt = useRef(new Map());
  const sessionId = useRef("");
  const sessionKey = `${session.userId}:${sessionVersion}`;
  const ready =
    Boolean(session.userId && session.token) &&
    presenceState.sessionKey === sessionKey &&
    presenceState.ready;
  const onlineUserIds =
    presenceState.sessionKey === sessionKey
      ? presenceState.onlineUserIds
      : EMPTY_USER_IDS;

  useEffect(() => {
    sessionId.current = globalThis.crypto.randomUUID();
  }, []);

  useEffect(() => {
    const refreshSession = () => {
      setSession(readSession());
      setSessionVersion((version) => version + 1);
    };
    window.addEventListener("storage", refreshSession);
    window.addEventListener("school-auth-changed", refreshSession);
    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener("school-auth-changed", refreshSession);
    };
  }, []);

  const refreshLastSeen = useCallback(async (userIds, force = false) => {
    const ids = [...new Set(userIds.filter(Boolean))]
      .filter(
        (id) =>
          Date.now() -
            (requestedLastSeenAt.current.get(String(id)) || 0) >=
          (force ? 2_000 : 60_000),
      )
      .slice(0, 100)
      .map(String);
    if (!ids.length) return;
    ids.forEach((id) => requestedLastSeenAt.current.set(id, Date.now()));
    try {
      const rows = await apiRequest(
        `/presence/last-seen?userIds=${encodeURIComponent(ids.join(","))}`,
      );
      setLastSeenByUserId((current) => ({
        ...current,
        ...Object.fromEntries(
          (rows || []).map((row) => [String(row.user_id), row.last_seen_at]),
        ),
      }));
    } catch (error) {
      ids.forEach((id) => requestedLastSeenAt.current.delete(id));
      console.error("Could not load school user last-seen data:", error);
    }
  }, []);

  useEffect(() => {
    if (!session.userId || !session.token || !supabaseClient) return undefined;
    let active = true;
    let visible = document.visibilityState === "visible";
    const activeSessionKey = sessionKey;
    const channel = supabaseClient.channel("global-presence", {
      config: { private: true, presence: { key: String(session.userId) } },
    });
    const syncPresence = () => {
      if (active) {
        setPresenceState({
          sessionKey: activeSessionKey,
          onlineUserIds: new Set(
            Object.keys(channel.presenceState()).map(String),
          ),
          ready: true,
        });
      }
    };
    const heartbeat = async (path) => {
      try {
        await apiRequest(path, { method: "POST" });
      } catch (error) {
        console.error("Could not update school presence:", error);
      }
    };
    const track = async () => {
      if (!active || !visible) return;
      const result = await channel.track({ sessionId });
      if (result !== "ok") console.error("Could not track school presence:", result);
      await heartbeat("/presence/heartbeat");
    };
    const untrack = async () => {
      const result = await channel.untrack();
      if (result !== "ok") console.error("Could not untrack school presence:", result);
      await heartbeat("/presence/offline");
    };
    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          void track();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          setPresenceState((current) =>
            current.sessionKey === activeSessionKey
              ? { ...current, ready: false }
              : current,
          );
          if (error) console.error("School presence channel failed:", error);
        }
      });
    const onVisibilityChange = () => {
      const nextVisible = document.visibilityState === "visible";
      if (visible === nextVisible) return;
      visible = nextVisible;
      if (visible) void track();
      else void untrack();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(() => {
      if (visible) void heartbeat("/presence/heartbeat");
    }, 60_000);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
      void untrack();
      void supabaseClient.removeChannel(channel);
    };
  }, [session, sessionKey]);

  const value = useMemo(
    () => ({ ready, onlineUserIds, lastSeenByUserId, refreshLastSeen }),
    [ready, onlineUserIds, lastSeenByUserId, refreshLastSeen],
  );
  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
};
