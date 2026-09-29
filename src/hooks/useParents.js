import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

function normalizeParent(parent, students) {
  const children = students.filter((child) => child.client_id === parent.id);
  const name =
    [parent.first_name, parent.last_name].filter(Boolean).join(" ") ||
    parent.users?.name ||
    "Unnamed parent";

  return {
    ...parent,
    name,
    displayId: `PAR-${String(parent.id).slice(-6).toUpperCase()}`,
    email: parent.users?.email || "No email",
    phone: parent.phone || parent.users?.phone || "No phone number",
    children,
    relationship: parent.relationship || "Guardian",
    status: parent.is_active === false ? "Inactive" : "Active",
    joined: parent.created_at
      ? new Date(parent.created_at).toLocaleDateString()
      : "Not available",
  };
}

export function useParents() {
  const auth = getAuth();
  const cacheKey = `schoolParentsCache:${auth.user?.id || "current"}`;
  const [dashboard, setDashboard] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!dashboard);

  const reload = useCallback(async () => {
    try {
      const data = await apiRequest("/school/dashboard", {
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data, timestamp: Date.now() }),
      );
      setDashboard(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey]);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    const schoolId = dashboard?.school?.id;
    if (!supabaseClient || !schoolId) return undefined;

    const channel = supabaseClient
      .channel(`school-parents:${schoolId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children" },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        reload,
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [dashboard?.school?.id, reload]);

  const parents = useMemo(
    () =>
      (dashboard?.parents || []).map((parent) =>
        normalizeParent(parent, dashboard?.students || []),
      ),
    [dashboard],
  );

  return { parents, loading, reload };
}
