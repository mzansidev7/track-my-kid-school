import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

const formatLocalDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

const getWeekRange = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
};

function readCache(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    return cached?.data || null;
  } catch {
    return null;
  }
}

export function useSchoolReports() {
  const auth = getAuth();
  const userId = auth.user?.id || "current";
  const cacheKey = `schoolReportsCache:${userId}`;
  const [reportData, setReportData] = useState(() => readCache(cacheKey));
  const [loading, setLoading] = useState(() => !readCache(cacheKey));
  const [error, setError] = useState("");
  const refreshTimerRef = useRef(null);
  const { startDate, endDate } = getWeekRange();

  const refresh = useCallback(async () => {
    if (!auth.token) {
      setLoading(false);
      return null;
    }

    setError("");
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const [dashboard, tracking, attendanceResponse] = await Promise.all([
        apiRequest("/school/dashboard", { headers }),
        apiRequest("/school/tracking", { headers }),
        apiRequest(
          `/school/attendance/overview?start_date=${startDate}&end_date=${endDate}`,
          { headers },
        ),
      ]);
      const next = {
        dashboard: dashboard || null,
        tracking: tracking || null,
        attendanceDays: Array.isArray(attendanceResponse?.days)
          ? attendanceResponse.days
          : [],
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      setReportData(next);
      return next;
    } catch (requestError) {
      setError(requestError?.message || "Could not load school reports.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey, endDate, startDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const schoolId = reportData?.dashboard?.school?.id;
  useEffect(() => {
    if (!supabaseClient || !schoolId) return undefined;

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        void refresh();
      }, 250);
    };
    const channel = supabaseClient
      .channel(`school-reports:${schoolId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "children",
          filter: `school_id=eq.${schoolId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `school_id=eq.${schoolId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_stops" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("School reports realtime unavailable:", status);
        }
      });

    return () => {
      window.clearTimeout(refreshTimerRef.current);
      void supabaseClient.removeChannel(channel);
    };
  }, [refresh, schoolId, userId]);

  return { reportData, loading, error, refresh };
}
