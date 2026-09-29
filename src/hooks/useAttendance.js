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

const today = () => formatLocalDate(new Date());

const formatLocalDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

const getCurrentOverviewRange = () => {
  const now = new Date();
  const todayDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
  );
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);

  return {
    startDate: formatLocalDate(weekStart < monthStart ? weekStart : monthStart),
    endDate: formatLocalDate(weekEnd > monthEnd ? weekEnd : monthEnd),
  };
};

export function useAttendance(date = today()) {
  const auth = getAuth();
  const overviewRange = getCurrentOverviewRange();
  const overviewCacheKey = `schoolAttendanceOverview:${auth.user?.id || "current"}:${overviewRange.startDate}:${overviewRange.endDate}`;
  const cacheKey = `schoolAttendanceCache:${auth.user?.id || "current"}:${date}`;
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!data);
  const [overviewDays, setOverviewDays] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(overviewCacheKey) || "null")?.data || []
      );
    } catch {
      return [];
    }
  });

  const reload = useCallback(async () => {
    try {
      const next = await apiRequest(`/school/attendance?date=${date}`, {
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: next, timestamp: Date.now() }),
      );
      setData(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey, date]);

  const reloadOverview = useCallback(async () => {
    const response = await apiRequest(
      `/school/attendance/overview?start_date=${overviewRange.startDate}&end_date=${overviewRange.endDate}`,
      { headers: { Authorization: `Bearer ${auth.token || ""}` } },
    );
    const days = Array.isArray(response.days) ? response.days : [];
    localStorage.setItem(
      overviewCacheKey,
      JSON.stringify({ data: days, timestamp: Date.now() }),
    );
    setOverviewDays(days);
    return days;
  }, [
    auth.token,
    overviewCacheKey,
    overviewRange.endDate,
    overviewRange.startDate,
  ]);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    // Fetch period aggregates when the authenticated user or month range changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadOverview().catch(() => undefined);
  }, [reloadOverview]);

  useEffect(() => {
    if (!supabaseClient) return undefined;
    const channel = supabaseClient
      .channel(`school-attendance:${auth.user?.id || "current"}:${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        () => {
          void reload();
          void reloadOverview();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children" },
        () => {
          void reload();
          void reloadOverview();
        },
      )
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [auth.user?.id, date, reload, reloadOverview]);

  const students = useMemo(() => {
    const records = new Map(
      (data?.records || []).map((record) => [record.child_id, record]),
    );
    return (data?.students || []).map((student) => {
      const record = records.get(student.id);
      const guardian = student.clients;
      return {
        ...student,
        rawId: student.id,
        displayId: `STU-${String(student.id).slice(-6).toUpperCase()}`,
        displayName: [student.name, student.lastname].filter(Boolean).join(" "),
        gradeLabel: student.grade || "Not assigned",
        guardianName:
          [guardian?.first_name, guardian?.last_name]
            .filter(Boolean)
            .join(" ") ||
          guardian?.users?.name ||
          "No guardian linked",
        status: record?.status || "not_recorded",
        arrivalTime: record?.arrival_time || null,
        attendanceRecord: record || null,
      };
    });
  }, [data]);

  const setStatus = useCallback(
    async (childId, status) => {
      const nextRecord = await apiRequest(`/school/attendance/${childId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date, status }),
      });
      setData((current) => ({
        ...(current || { date, students: [] }),
        records: [
          ...(current?.records || []).filter(
            (record) => record.child_id !== childId,
          ),
          nextRecord,
        ],
      }));
      setOverviewDays((current) =>
        current.map((day) => {
          if (day.date !== date) return day;
          const previousRecord = data?.records?.find(
            (record) => record.child_id === childId,
          );
          const previousStatus = previousRecord?.status;
          const nextDay = { ...day };
          if (
            previousStatus &&
            Object.prototype.hasOwnProperty.call(nextDay, previousStatus)
          ) {
            nextDay[previousStatus] = Math.max(0, nextDay[previousStatus] - 1);
          }
          nextDay[status] = (nextDay[status] || 0) + 1;
          nextDay.recorded = nextDay.present + nextDay.late + nextDay.absent;
          nextDay.percentage = nextDay.total
            ? Math.round(
                ((nextDay.present + nextDay.late) / nextDay.total) * 100,
              )
            : 0;
          return nextDay;
        }),
      );
      return nextRecord;
    },
    [auth.token, data?.records, date],
  );

  return {
    date,
    students,
    loading,
    overviewDays,
    setStatus,
    reload,
  };
}
