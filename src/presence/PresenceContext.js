import { createContext, useContext } from "react";

export const PresenceContext = createContext({
  ready: false,
  onlineUserIds: new Set(),
  lastSeenByUserId: {},
  refreshLastSeen: async () => {},
});

export const usePresence = () => useContext(PresenceContext);
