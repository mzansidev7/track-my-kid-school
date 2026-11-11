import { useMemo, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiLoader,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "../styles/attendance.css";
import SchoolPageHeader from "../components/SchoolPageHeader";
import { useAttendance } from "../hooks/useAttendance";
import {
  downloadSchoolReport,
  getCachedSchoolReportProfile,
} from "../utils/schoolReport";

const overviewPeriods = ["Today", "This week", "This month"];
const PAGE_SIZE = 8;
const formatLocalDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

function Attendance() {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [overviewPeriod, setOverviewPeriod] = useState("This week");
  const [selectedDate, setSelectedDate] = useState(() =>
    formatLocalDate(new Date()),
  );
  const [selectedGrade, setSelectedGrade] = useState("All grades");
  const [attendanceNotice, setAttendanceNotice] = useState("");
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const {
    students: attendanceStudents,
    loading,
    overviewDays,
    overviewLoading,
    overviewError,
    setStatus: saveStatus,
    reload,
  } = useAttendance(selectedDate);
  const students = useMemo(
    () =>
      attendanceStudents.map((student) => ({
        ...student,
        name: student.displayName,
        id: `STU: ${student.rawId.slice(0, 8)}`,
        grade: student.gradeLabel,
        className: "",
        guardian: student.guardianName,
        time: student.arrivalTime
          ? new Date(student.arrivalTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
        status:
          student.status === "not_recorded"
            ? "Not recorded"
            : student.status.charAt(0).toUpperCase() + student.status.slice(1),
      })),
    [attendanceStudents],
  );
  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        console.log({ student });
        const matchesQuery = `${student.name} ${student.id} ${student.guardian}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesGrade =
          selectedGrade === "All grades" || student.grade === selectedGrade;
        return matchesQuery && matchesGrade;
      }),
    [query, selectedGrade, students],
  );
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStudents = useMemo(
    () =>
      filteredStudents.slice(
        (visiblePage - 1) * PAGE_SIZE,
        visiblePage * PAGE_SIZE,
      ),
    [filteredStudents, visiblePage],
  );
  const paginationItems = useMemo(() => {
    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const firstVisible = Math.max(2, visiblePage - 1);
    const lastVisible = Math.min(pageCount - 1, visiblePage + 1);
    return [
      1,
      ...(firstVisible > 2 ? ["start-gap"] : []),
      ...Array.from(
        { length: lastVisible - firstVisible + 1 },
        (_, index) => firstVisible + index,
      ),
      ...(lastVisible < pageCount - 1 ? ["end-gap"] : []),
      pageCount,
    ];
  }, [pageCount, visiblePage]);
  const gradeOptions = useMemo(
    () => [
      "All grades",
      ...new Set(students.map((student) => student.grade).filter(Boolean)),
    ],
    [students],
  );
  const unmarkedCount = useMemo(
    () =>
      students.filter((student) => student.status === "Not recorded").length,
    [students],
  );
  const filteredUnmarkedCount = useMemo(
    () =>
      filteredStudents.filter((student) => student.status === "Not recorded")
        .length,
    [filteredStudents],
  );
  const pendingWeekdays = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayDate = formatLocalDate(today);
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return formatLocalDate(date);
    })
      .filter((date) => date <= todayDate)
      .map((date) => {
        const day = overviewDays.find(
          (overviewDay) => overviewDay.date === date,
        );
        return day && day.total > 0 && day.recorded < day.total
          ? { ...day, unmarked: day.total - day.recorded }
          : null;
      })
      .filter(Boolean);
  }, [overviewDays]);
  const attendanceSummary = useMemo(() => {
    const present = filteredStudents.filter(
      (student) => student.status === "Present",
    ).length;
    const late = filteredStudents.filter(
      (student) => student.status === "Late",
    ).length;
    const absent = filteredStudents.filter(
      (student) => student.status === "Absent",
    ).length;
    const total = filteredStudents.length;
    const attended = present + late;
    return {
      present,
      late,
      absent,
      total,
      attendanceRate: total ? Math.round((attended / total) * 100) : 0,
      absentRate: total ? Math.round((absent / total) * 100) : 0,
    };
  }, [filteredStudents]);
  const setStatus = async (student, status) => {
    await saveStatus(student.rawId || student.id, status.toLowerCase());
  };
  const selectedOverviewDays = useMemo(() => {
    const now = new Date();
    const todayDate = formatLocalDate(now);
    if (overviewPeriod === "Today") {
      return overviewDays
        .filter((day) => day.date === todayDate)
        .map((day) => ({ ...day, label: "Today", highlight: true }));
    }

    if (overviewPeriod === "This week") {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startDate = formatLocalDate(weekStart);
      const endDate = formatLocalDate(weekEnd);
      return overviewDays
        .filter(
          (day) =>
            day.date >= startDate &&
            day.date <= endDate &&
            day.date <= todayDate,
        )
        .map((day) => ({
          ...day,
          label: new Date(`${day.date}T12:00:00`).toLocaleDateString([], {
            weekday: "short",
          }),
          highlight: day.date === todayDate,
        }));
    }

    const monthDays = overviewDays.filter(
      (day) =>
        day.date.slice(0, 7) === todayDate.slice(0, 7) && day.date <= todayDate,
    );
    const weeks = new Map();
    monthDays.forEach((day) => {
      const dayDate = new Date(`${day.date}T12:00:00`);
      const monthDay = dayDate.getDate();
      const firstDay = new Date(`${todayDate.slice(0, 7)}-01T12:00:00`);
      const firstMondayOffset = (firstDay.getDay() + 6) % 7;
      const weekIndex = Math.floor((monthDay + firstMondayOffset - 1) / 7);
      const current = weeks.get(weekIndex) || {
        date: day.date,
        label: `Week ${weekIndex + 1}`,
        present: 0,
        late: 0,
        absent: 0,
        recorded: 0,
        total: 0,
        highlight: false,
      };
      current.present += day.present;
      current.late += day.late;
      current.absent += day.absent;
      current.recorded += day.recorded;
      current.total += day.total;
      current.highlight ||= day.date === todayDate;
      weeks.set(weekIndex, current);
    });

    return Array.from(weeks.values()).map((week) => ({
      ...week,
      percentage: week.total
        ? Math.round(((week.present + week.late) / week.total) * 100)
        : 0,
    }));
  }, [overviewDays, overviewPeriod]);

  const overviewSummary = useMemo(() => {
    const totals = selectedOverviewDays.reduce(
      (summary, day) => ({
        present: summary.present + day.present,
        late: summary.late + day.late,
        absent: summary.absent + day.absent,
        recorded: summary.recorded + day.recorded,
        total: summary.total + day.total,
      }),
      { present: 0, late: 0, absent: 0, recorded: 0, total: 0 },
    );
    return {
      ...totals,
      percentage: totals.total
        ? Math.round(((totals.present + totals.late) / totals.total) * 100)
        : 0,
    };
  }, [selectedOverviewDays]);

  const markFilteredAttendance = async () => {
    if (markingAttendance || loading || filteredUnmarkedCount === 0) return;
    const unmarkedStudents = filteredStudents.filter(
      (student) => student.status === "Not recorded",
    );
    setMarkingAttendance(true);
    setAttendanceNotice("");
    try {
      const results = await Promise.allSettled(
        unmarkedStudents.map((student) => setStatus(student, "Present")),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;
      await reload();
      setCurrentPage(1);
      setAttendanceNotice(
        failedCount
          ? `Could not mark attendance for ${failedCount} student${failedCount === 1 ? "" : "s"}. Please review the register and try again.`
          : `${unmarkedStudents.length} student${unmarkedStudents.length === 1 ? "" : "s"} marked present for ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString()}.`,
      );
    } catch (error) {
      console.error("Could not mark filtered attendance:", error);
      setAttendanceNotice(
        "Could not mark attendance. Please review the register and try again.",
      );
    } finally {
      setMarkingAttendance(false);
      window.setTimeout(() => setAttendanceNotice(""), 5000);
    }
  };

  const reviewUnmarkedAttendance = (date = selectedDate) => {
    setQuery("");
    setSelectedGrade("All grades");
    setCurrentPage(1);
    setSelectedDate(date);
  };

  const exportReport = () => {
    const schoolProfile = getCachedSchoolReportProfile();
    void downloadSchoolReport({
      records: filteredStudents,
      columns: [
        { title: "STUDENT", key: "name", width: 48, emphasize: true },
        { title: "GRADE", key: "grade", width: 23 },
        { title: "PARENT / GUARDIAN", key: "guardian", width: 51 },
        { title: "ARRIVAL", key: "time", width: 25 },
        {
          title: "ATTENDANCE STATUS",
          key: "status",
          width: 35,
          type: "status",
        },
      ],
      title: "Attendance report",
      schoolName: schoolProfile.name || "School attendance register",
      schoolLogo: schoolProfile.logo,
      badgeLabel: "OFFICIAL REGISTER",
      metadata: [
        {
          label: "Reporting date",
          value: new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], {
            dateStyle: "long",
          }),
        },
        { label: "Grade / cohort", value: selectedGrade },
        {
          label: "Records included",
          value: `${filteredStudents.length} students`,
        },
      ],
      summaryCards: [
        {
          label: "Enrolled",
          value: filteredStudents.length,
          color: [47, 96, 187],
          tint: [235, 243, 255],
        },
        {
          label: "Present",
          value: attendanceSummary.present,
          color: [23, 135, 82],
          tint: [233, 248, 240],
        },
        {
          label: "Late",
          value: attendanceSummary.late,
          color: [189, 111, 22],
          tint: [255, 247, 232],
        },
        {
          label: "Absent",
          value: attendanceSummary.absent,
          color: [190, 53, 73],
          tint: [255, 239, 241],
        },
        {
          label: "Unmarked",
          value: unmarkedCount,
          color: [94, 108, 128],
          tint: [241, 244, 248],
        },
      ],
      fileName: `attendance-${selectedDate}.pdf`,
      subject: "School attendance register",
    });
  };

  return (
    <>
      <div className="portal-content attendance-content">
        <SchoolPageHeader
          className="attendance-heading"
          actionsClassName="attendance-actions"
          eyebrow="DAILY REGISTER"
          titleIcon={<span className="school-page-heading-icon"><FiCalendar /></span>}
          title="Attendance"
          description="Track student attendance and keep your school register up to date."
          actions={
            <>
            <button className="attendance-secondary" onClick={exportReport}>
              <FiDownload /> Export report
            </button>
            <button
              className="attendance-primary"
              onClick={markFilteredAttendance}
              disabled={
                loading ||
                markingAttendance ||
                unmarkedCount === 0 ||
                filteredUnmarkedCount === 0
              }
            >
              {markingAttendance ? (
                <>
                  <FiLoader className="attendance-button-spinner" />
                  Marking...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Mark attendance
                </>
              )}
            </button>
            </>
          }
        />
        {!overviewLoading && pendingWeekdays.length > 0 && (
          <section className="attendance-reminder" role="status">
            <FiAlertCircle aria-hidden="true" />
            <div>
              <strong>Reminder: mark attendance for this week</strong>
              <p>
                {pendingWeekdays
                  .map((day) => {
                    const label = new Date(
                      `${day.date}T12:00:00`,
                    ).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    return `${label}: ${day.unmarked} unmarked`;
                  })
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => reviewUnmarkedAttendance(pendingWeekdays[0].date)}
            >
              Review earliest
            </button>
          </section>
        )}
        {overviewError && (
          <div className="attendance-overview-error" role="status">
            {overviewError}
          </div>
        )}
        {attendanceNotice && (
          <div className="attendance-notice" role="status">
            <FiCheckCircle />
            <span>{attendanceNotice}</span>
          </div>
        )}
        <section className="attendance-summary">
          <article>
            <span className="attendance-icon green">
              <FiCheck />
            </span>
            <div>
              <small>Present</small>
              <strong>{attendanceSummary.present}</strong>
              <em>
                <FiArrowUp /> {attendanceSummary.attendanceRate}% attendance
              </em>
            </div>
          </article>
          <article>
            <span className="attendance-icon red">
              <FiX />
            </span>
            <div>
              <small>Absent</small>
              <strong>{attendanceSummary.absent}</strong>
              <em className="red-text">
                {attendanceSummary.absentRate}% of students
              </em>
            </div>
          </article>
          <article>
            <span className="attendance-icon orange">
              <FiClock />
            </span>
            <div>
              <small>Late arrivals</small>
              <strong>{attendanceSummary.late}</strong>
              <em className="orange-text">Needs follow-up</em>
            </div>
          </article>
          <article>
            <span className="attendance-icon blue">
              <FiUsers />
            </span>
            <div>
              <small>Total students</small>
              <strong>{attendanceSummary.total}</strong>
              <em className="neutral-text">Registered students</em>
            </div>
          </article>
        </section>
        <section className="attendance-layout">
          <div className="attendance-register" id="attendance-register">
            <div className="attendance-register-head">
              <div>
                <h2>Attendance register</h2>
                <span>
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="attendance-toolbar">
              <label className="attendance-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search student or guardian"
                />
              </label>
              <select
                aria-label="Filter by grade"
                value={selectedGrade}
                onChange={(event) => {
                  setSelectedGrade(event.target.value);
                  setCurrentPage(1);
                }}
              >
                {gradeOptions.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
              <label className="attendance-date-filter">
                <FiCalendar />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by date"
                />
              </label>
            </div>
            <div className="attendance-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Student <FiArrowDown />
                    </th>
                    <th>Grade / class</th>
                    <th>Guardian</th>
                    <th>Arrival time</th>
                    <th>Status</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="attendance-loading">
                        Loading attendance...
                      </td>
                    </tr>
                  ) : (
                    pageStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className="attendance-student">
                            <span>
                              {student.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")}
                            </span>
                            <div>
                              <strong>{student.name}</strong>
                              <small>{student.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {student.grade}
                          <small>{student.className}</small>
                        </td>
                        <td>
                          <strong>{student.guardian}</strong>
                        </td>
                        <td>{student.time}</td>
                        <td
                          style={{
                            cursor: student.parentReportedAbsence
                              ? "pointer"
                              : "default",
                          }}
                        >
                          <span
                            className={`attendance-status ${student.status.toLowerCase()}`}
                            title={
                              student.parentReportedAbsence
                                ? `${student.absenceReason || "No reason provided"}`
                                : undefined
                            }
                            aria-label={
                              student.parentReportedAbsence
                                ? `Absent. Parent reported: ${student.absenceReason || "No reason provided"}`
                                : student.status
                            }
                          >
                            {student.status}
                          </span>
                          {student.parentReportedAbsence && (
                            <small>
                              Parent reported for{" "}
                              {new Date(
                                `${selectedDate}T00:00:00`,
                              ).toLocaleDateString()}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="attendance-update">
                            <button
                              className={
                                student.status === "Present"
                                  ? "selected present"
                                  : ""
                              }
                              onClick={() => setStatus(student, "Present")}
                              aria-label={`Mark ${student.name} present`}
                              disabled={student.parentReportedAbsence}
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={
                                student.status === "Absent"
                                  ? "selected absent"
                                  : ""
                              }
                              onClick={() => setStatus(student, "Absent")}
                              aria-label={`Mark ${student.name} absent`}
                              disabled={student.parentReportedAbsence}
                            >
                              <FiX />
                            </button>
                            <button
                              className={
                                student.status === "Late" ? "selected late" : ""
                              }
                              onClick={() => setStatus(student, "Late")}
                              aria-label={`Mark ${student.name} late`}
                              disabled={student.parentReportedAbsence}
                            >
                              <FiClock />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!loading && filteredStudents.length === 0 && (
                <div className="empty-attendance">
                  No students match your search.
                </div>
              )}
            </div>
            <div className="attendance-footer">
              <span>
                Showing{" "}
                {filteredStudents.length
                  ? (visiblePage - 1) * PAGE_SIZE + 1
                  : 0}
                –{Math.min(visiblePage * PAGE_SIZE, filteredStudents.length)} of{" "}
                {filteredStudents.length} records · {PAGE_SIZE} per page
              </span>
              <nav
                className="attendance-pagination"
                aria-label="Attendance pages"
              >
                <button
                  className="pagination-direction"
                  type="button"
                  onClick={() => setCurrentPage(visiblePage - 1)}
                  disabled={visiblePage === 1}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      className={`pagination-page ${visiblePage === item ? "current-page" : ""}`}
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      aria-label={`Page ${item}`}
                      aria-current={visiblePage === item ? "page" : undefined}
                    >
                      {item}
                    </button>
                  ) : (
                    <span className="pagination-ellipsis" key={item}>
                      …
                    </span>
                  ),
                )}
                <button
                  className="pagination-direction"
                  type="button"
                  onClick={() => setCurrentPage(visiblePage + 1)}
                  disabled={visiblePage === pageCount}
                  aria-label="Next page"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
          <aside className="attendance-side">
            <div className="attendance-side-head">
              <h2>Attendance Overview </h2>
              <div
                className="attendance-overview-tabs"
                aria-label="Overview period"
              >
                {overviewPeriods.map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={overviewPeriod === period ? "active" : ""}
                    aria-pressed={overviewPeriod === period}
                    onClick={() => setOverviewPeriod(period)}
                  >
                    {period === "Today" ? "Today" : period.replace("This ", "")}
                  </button>
                ))}
              </div>
            </div>
            {!overviewLoading && pendingWeekdays.length > 0 && (
              <div className="attendance-side-reminder" role="status">
                <span className="attendance-side-reminder-icon">
                  <FiAlertCircle aria-hidden="true" />
                </span>
                <div className="attendance-side-reminder-copy">
                  <strong>Attendance to mark this week</strong>
                  <p>
                    {pendingWeekdays.length} weekday
                    {pendingWeekdays.length === 1 ? "" : "s"} need attendance
                    recorded.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Review unmarked attendance"
                  title="Review unmarked attendance"
                  onClick={() =>
                    reviewUnmarkedAttendance(pendingWeekdays[0].date)
                  }
                >
                  <FiArrowDown aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="weekly-chart">
              {selectedOverviewDays.map((day) => (
                <div
                  className={day.highlight ? "today" : ""}
                  key={`${day.date}-${day.label}`}
                >
                  <span>{day.label}</span>
                  <i style={{ height: `${Math.max(day.percentage, 4)}%` }} />
                  <b>{day.percentage}%</b>
                </div>
              ))}
            </div>
            <div className="attendance-side-note">
              <FiCheckCircle />
              <div>
                <strong>
                  {overviewSummary.recorded
                    ? `${overviewSummary.percentage}% attendance ${overviewPeriod.toLowerCase()}`
                    : `${overviewPeriod} attendance`}
                </strong>
                <p>
                  {overviewSummary.recorded
                    ? `${overviewSummary.recorded} of ${overviewSummary.total} attendance entries recorded.`
                    : "No attendance has been recorded for this period."}
                </p>
              </div>
            </div>
            <div className="attendance-breakdown">
              <h3>{overviewPeriod} breakdown</h3>
              <p>
                <span>
                  <i className="dot present-dot" />
                  Present
                </span>
                <strong>{overviewSummary.present}</strong>
              </p>
              <p>
                <span>
                  <i className="dot late-dot" />
                  Late
                </span>
                <strong>{overviewSummary.late}</strong>
              </p>
              <p>
                <span>
                  <i className="dot absent-dot" />
                  Absent
                </span>
                <strong>{overviewSummary.absent}</strong>
              </p>
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Attendance;
