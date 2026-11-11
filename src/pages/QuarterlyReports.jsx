import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiDownload,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import { getCachedSchoolReportProfile } from "../utils/schoolReport";
import { downloadQuarterlyLearnerReport } from "../utils/quarterlyLearnerReport";
import SchoolPageHeader from "../components/SchoolPageHeader";

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

const emptySubject = () => ({
  name: "",
  score_pct: "",
  grade: "",
  pass_mark_pct: "50",
  teacher_comment: "",
});

const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
const emptyForm = () => ({
  child_id: "",
  academic_year: String(new Date().getFullYear()),
  quarter: String(currentQuarter),
  subjects: [emptySubject()],
  absence_notes: "",
  behavioral_assessment: "",
  extracurricular_activities: "",
  teacher_comments: "",
  recommendations: "",
  status: "draft",
});

const readCache = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    const auth = getAuth();
    let dashboard = null;
    try {
      dashboard = JSON.parse(
        localStorage.getItem(
          `schoolDashboardCache:${auth.user?.id || "current"}`,
        ) || "null",
      )?.data;
    } catch {
      dashboard = null;
    }
    return {
      reports: Array.isArray(value?.reports) ? value.reports : [],
      students: Array.isArray(value?.students)
        ? value.students
        : Array.isArray(dashboard?.students)
          ? dashboard.students
          : [],
      school: value?.school || dashboard?.school || getCachedSchoolReportProfile(),
      loaded: Boolean(value?.timestamp),
    };
  } catch {
    return {
      reports: [],
      students: [],
      school: getCachedSchoolReportProfile(),
      loaded: false,
    };
  }
};

const learnerName = (student) =>
  [student?.name, student?.lastname].filter(Boolean).join(" ") || "Learner";

function QuarterlyReports() {
  const auth = getAuth();
  const userId = auth.user?.id || "current";
  const cacheKey = `quarterlyLearnerReportsCache:${userId}`;
  const initialCache = useMemo(() => readCache(cacheKey), [cacheKey]);
  const [reports, setReports] = useState(initialCache.reports);
  const [students, setStudents] = useState(initialCache.students);
  const [school, setSchool] = useState(initialCache.school);
  const [loading, setLoading] = useState(!initialCache.loaded);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingReport, setEditingReport] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!auth.token) return;
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const [reportRows, dashboard] = await Promise.all([
        apiRequest("/school/learner-reports", { headers }),
        apiRequest("/school/dashboard", { headers }),
      ]);
      const nextReports = Array.isArray(reportRows) ? reportRows : [];
      const nextStudents = Array.isArray(dashboard?.students)
        ? dashboard.students
        : [];
      const nextSchool = dashboard?.school || getCachedSchoolReportProfile();
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          reports: nextReports,
          students: nextStudents,
          school: nextSchool,
          timestamp: Date.now(),
        }),
      );
      setReports(nextReports);
      setStudents(nextStudents);
      setSchool(nextSchool);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load quarterly reports.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, cacheKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const schoolId = school?.id;
  useEffect(() => {
    if (!supabaseClient || !schoolId) return undefined;
    const channel = supabaseClient
      .channel(`quarterly-learner-reports:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
          filter: "resource_type=eq.school_learner_reports",
        },
        () => void load(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Quarterly learner report realtime unavailable:", status);
        }
      });
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [load, schoolId]);

  const openCreate = useCallback(() => {
    setEditingReport(null);
    setForm({
      ...emptyForm(),
      child_id: students[0]?.id || "",
    });
    setError("");
    setModalOpen(true);
  }, [students]);

  useEffect(() => {
    const openFromPageHeader = () => openCreate();
    window.addEventListener(
      "school:create-learner-report",
      openFromPageHeader,
    );
    return () =>
      window.removeEventListener(
        "school:create-learner-report",
        openFromPageHeader,
      );
  }, [openCreate]);

  const openEdit = (report) => {
    setEditingReport(report);
    setForm({
      child_id: report.child_id,
      academic_year: String(report.academic_year),
      quarter: String(report.quarter),
      subjects: (report.subjects || []).map((subject) => ({
        ...subject,
        score_pct: String(subject.score_pct),
        pass_mark_pct: String(subject.pass_mark_pct ?? 50),
      })),
      absence_notes: report.absence_notes || "",
      behavioral_assessment: report.behavioral_assessment || "",
      extracurricular_activities: report.extracurricular_activities || "",
      teacher_comments: report.teacher_comments || "",
      recommendations: report.recommendations || "",
      status: report.status || "draft",
    });
    setError("");
    setModalOpen(true);
  };

  const updateSubject = (index, field, value) => {
    setForm((current) => ({
      ...current,
      subjects: current.subjects.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, [field]: value } : subject,
      ),
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.child_id) {
      setError("Select a student before saving the report.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        academic_year: Number(form.academic_year),
        quarter: Number(form.quarter),
        subjects: form.subjects.map((subject) => ({
          ...subject,
          score_pct: Number(subject.score_pct),
          pass_mark_pct: Number(subject.pass_mark_pct || 50),
        })),
      };
      await apiRequest(
        editingReport
          ? `/school/learner-reports/${editingReport.id}`
          : "/school/learner-reports",
        {
          method: editingReport ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify(payload),
        },
      );
      setModalOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || "Unable to save quarterly report.");
    } finally {
      setSaving(false);
    }
  };

  const download = async (report) => {
    try {
      await downloadQuarterlyLearnerReport(report, school);
    } catch (downloadError) {
      console.error("Could not download quarterly learner report:", downloadError);
      setError(downloadError.message || "Unable to download report PDF.");
    }
  };

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (first, second) =>
          second.academic_year - first.academic_year ||
          second.quarter - first.quarter ||
          new Date(second.updated_at) - new Date(first.updated_at),
      ),
    [reports],
  );

  return (
    <section className="quarterly-reports-panel">
      <SchoolPageHeader
        className="quarterly-reports-heading"
        eyebrow="LEARNER PROGRESS"
        titleIcon={<span className="school-page-heading-icon"><FiFileText /></span>}
        titleAs="h2"
        title="Quarterly learner reports"
        description="Create, save, and download term reports for families."
        actions={
          <button
            className="report-primary"
            type="button"
            onClick={openCreate}
            disabled={!students.length}
          >
            <FiPlus /> Create learner report
          </button>
        }
      />
      {error && <p className="reports-error" role="alert">{error}</p>}
      {!students.length && !loading ? (
        <p className="quarterly-reports-empty">
          Add students to the school before creating learner reports.
        </p>
      ) : loading ? (
        <p className="quarterly-reports-empty">Loading saved reports…</p>
      ) : sortedReports.length ? (
        <div className="quarterly-reports-list">
          {sortedReports.map((report) => (
            <article className="quarterly-report-card" key={report.id}>
              <div>
                <strong>{learnerName(report.child)}</strong>
                <span>
                  {report.child?.grade || "Grade not assigned"} · Q
                  {report.quarter} {report.academic_year}
                </span>
                <small>
                  {report.average_mark_pct}% average · {report.pass_rate_pct}%
                  subject pass rate · {report.status}
                </small>
              </div>
              <div className="quarterly-report-actions">
                <button type="button" onClick={() => void download(report)}>
                  <FiDownload /> PDF
                </button>
                <button type="button" onClick={() => openEdit(report)}>
                  <FiEdit2 /> Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="quarterly-reports-empty">
          No quarterly reports yet. Create a report to get started.
        </p>
      )}

      {modalOpen && (
        <div
          className="quarterly-report-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <form className="quarterly-report-modal" onSubmit={save}>
            <header>
              <div>
                <p className="page-kicker">QUARTERLY REPORT</p>
                <h2>{editingReport ? "Edit learner report" : "Create learner report"}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="quarterly-report-form-grid">
              <label>
                Student
                <select
                  required
                  disabled={Boolean(editingReport)}
                  value={form.child_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, child_id: event.target.value }))
                  }
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option value={student.id} key={student.id}>
                      {learnerName(student)} · {student.grade || "Grade not assigned"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Academic year
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  required
                  value={form.academic_year}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, academic_year: event.target.value }))
                  }
                />
              </label>
              <label>
                Quarter
                <select
                  value={form.quarter}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quarter: event.target.value }))
                  }
                >
                  {[1, 2, 3, 4].map((quarter) => (
                    <option value={quarter} key={quarter}>Quarter {quarter}</option>
                  ))}
                </select>
              </label>
              <label>
                Report status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>
            <div className="quarterly-subjects-heading">
              <h3>Subjects and marks</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    subjects: [...current.subjects, emptySubject()],
                  }))
                }
              >
                <FiPlus /> Add subject
              </button>
            </div>
            {form.subjects.map((subject, index) => (
              <div className="quarterly-subject-row" key={index}>
                <input
                  required
                  aria-label="Subject name"
                  placeholder="Subject"
                  value={subject.name}
                  onChange={(event) => updateSubject(index, "name", event.target.value)}
                />
                <input
                  required
                  aria-label="Mark percentage"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Mark %"
                  value={subject.score_pct}
                  onChange={(event) => updateSubject(index, "score_pct", event.target.value)}
                />
                <input
                  aria-label="Grade"
                  placeholder="Grade"
                  value={subject.grade}
                  onChange={(event) => updateSubject(index, "grade", event.target.value)}
                />
                <input
                  aria-label="Pass mark percentage"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Pass %"
                  value={subject.pass_mark_pct}
                  onChange={(event) => updateSubject(index, "pass_mark_pct", event.target.value)}
                />
                <input
                  aria-label="Subject teacher comment"
                  placeholder="Teacher comment"
                  value={subject.teacher_comment}
                  onChange={(event) => updateSubject(index, "teacher_comment", event.target.value)}
                />
                <button
                  type="button"
                  aria-label="Remove subject"
                  disabled={form.subjects.length === 1}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      subjects: current.subjects.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <div className="quarterly-report-form-grid">
              {[
                ["absence_notes", "Absence reasons / notes"],
                ["behavioral_assessment", "Behavior and participation"],
                ["extracurricular_activities", "Extracurricular activities and achievements"],
                ["teacher_comments", "Teacher’s overall comments"],
                ["recommendations", "Areas to improve and next steps"],
              ].map(([field, label]) => (
                <label className="quarterly-report-wide" key={field}>
                  {label}
                  <textarea
                    rows={field === "teacher_comments" ? 3 : 2}
                    value={form[field]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field]: event.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            {error && <p className="reports-error" role="alert">{error}</p>}
            <footer>
              <p>Attendance totals are calculated from the school register for the selected quarter.</p>
              <button className="report-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save report"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

export default QuarterlyReports;
