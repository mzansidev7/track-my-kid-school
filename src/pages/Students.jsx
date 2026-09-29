import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  FiAlertCircle,
  FiArrowDown,
  FiDownload,
  FiEdit2,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSliders,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import {
  showErrorAlert,
  successMessage,
  showConfirmationAlert,
  showDeleteConfirmationAlert,
} from "../components/sweetAlert.js";
import "../styles/students.css";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
}

function Students() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [grade, setGrade] = useState("All grades");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [openOptions, setOpenOptions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", lastname: "", grade: "" });
  const auth = getAuth();
  const cacheKey = `schoolDashboardCache:${auth.user?.id || "current"}`;
  const [dashboard, setDashboard] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data || null;
    } catch {
      return null;
    }
  });

  const loadDashboard = useCallback(async () => {
    const data = await apiRequest("/school/dashboard", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    });
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
    setDashboard(data);
  }, [auth.token, cacheKey]);

  const addStudent = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const normalizeName = (value) =>
        String(value || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");
      const newStudentName = normalizeName(`${form.name} ${form.lastname}`);
      const duplicate = (dashboard?.students || []).find(
        (student) =>
          student.id !== editingStudent?.id &&
          normalizeName(`${student.name} ${student.lastname}`) ===
            newStudentName,
      );

      if (duplicate) {
        const duplicateName = [duplicate.name, duplicate.lastname]
          .filter(Boolean)
          .join(" ");
        const confirmation = await showConfirmationAlert({
          title: "Possible duplicate student",
          text: `${duplicateName} already exists. Choose Keep both to add another student, or Same child to cancel.`,
          confirmButtonText: "Keep both",
          denyButtonText: "Same child",
        });
        if (!confirmation.isConfirmed) {
          showErrorAlert(
            "Student was not added because the name already exists.",
          );
          return;
        }
      }

      const data = await apiRequest(
        editingStudent
          ? `/school/students/${editingStudent.id}`
          : "/school/students",
        {
          method: editingStudent ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify(form),
        },
      );
      successMessage({
        title: editingStudent
          ? `${data.name} was updated successfully.`
          : `${data.name} was added successfully.`,
      });
      closeStudentModal();
      await loadDashboard();
    } catch (error) {
      showErrorAlert(error.message || "Unable to add student.");
    } finally {
      setSaving(false);
    }
  };

  const editStudent = (student) => {
    setEditingStudent(student);
    setForm({
      name: student.name || "",
      lastname: student.lastname || "",
      grade: student.grade || "",
    });
    setFormOpen(true);
    setOpenOptions(null);
  };

  const closeStudentModal = () => {
    setFormOpen(false);
    setEditingStudent(null);
    setForm({ name: "", lastname: "", grade: "" });
  };

  const deleteStudent = async (student) => {
    const confirmation = await showDeleteConfirmationAlert({
      title: `Delete ${student.displayName}?`,
      text: "This student will be permanently deleted.",
    });
    if (!confirmation.isConfirmed) {
      return;
    }
    setOpenOptions(null);
    try {
      await apiRequest(`/school/students/${student.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
      });
      successMessage({ title: `${student.displayName} was deleted.` });
      await loadDashboard();
    } catch (error) {
      showErrorAlert(error.message || "Unable to delete student.");
    }
  };

  useEffect(() => {
    apiRequest("/school/dashboard", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((data) => {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data, timestamp: Date.now() }),
        );
        setDashboard(data);
      })
      .catch(() => undefined);
  }, [auth.token, cacheKey]);

  useEffect(() => {
    const schoolId = dashboard?.school?.id;
    if (!supabaseClient || !schoolId) return undefined;

    const channel = supabaseClient
      .channel(`school-students:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "children",
          filter: `school_id=eq.${schoolId}`,
        },
        loadDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_children" },
        loadDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        loadDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        loadDashboard,
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [dashboard?.school?.id, loadDashboard]);

  const students = useMemo(
    () =>
      (dashboard?.students || []).map((student) => {
        const parent = (dashboard?.parents || []).find(
          (item) => item.id === student.client_id,
        );
        return {
          ...student,
          displayName: [student.name, student.lastname]
            .filter(Boolean)
            .join(" "),
          displayId: `STU-${String(student.id).slice(-4).toUpperCase()}`,
          parentName:
            [parent?.first_name, parent?.last_name].filter(Boolean).join(" ") ||
            parent?.users?.name ||
            "No guardian linked",
          parentPhone:
            parent?.phone || parent?.users?.phone || "No phone number",
          displayStatus: student.is_active === false ? "Inactive" : "Active",
          transport: student.route_name || "Not assigned",
        };
      }),
    [dashboard],
  );

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery =
          `${student.displayName} ${student.displayId} ${student.parentName}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return (
          matchesQuery &&
          (status === "All statuses" || student.displayStatus === status) &&
          (grade === "All grades" || student.grade === grade)
        );
      }),
    [grade, query, status, students],
  );
  const grades = useMemo(
    () =>
      [
        ...new Set(students.map((student) => student.grade).filter(Boolean)),
      ].sort(),
    [students],
  );
  const hasFilters = Boolean(
    query ||
    status !== "All statuses" ||
    grade !== "All grades" ||
    sort !== "name-asc",
  );
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents];
    sorted.sort((first, second) => {
      if (sort === "newest" || sort === "oldest") {
        const firstDate = new Date(first.created_at || 0).getTime();
        const secondDate = new Date(second.created_at || 0).getTime();
        return sort === "newest"
          ? secondDate - firstDate
          : firstDate - secondDate;
      }
      const nameOrder = first.displayName.localeCompare(
        second.displayName,
        undefined,
        { sensitivity: "base" },
      );
      return sort === "name-desc" ? -nameOrder : nameOrder;
    });
    return sorted;
  }, [filteredStudents, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleStudents = sortedStudents.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const exportRows = sortedStudents.map((student) => ({
    Student: student.displayName || "Unnamed student",
    ID: student.displayId,
    Grade: student.grade || "Grade not assigned",
    Guardian: student.parentName,
    Phone: student.parentPhone,
    Transport: student.transport,
    Status: student.displayStatus,
  }));
  const exportSchool = dashboard?.school || {};
  const exportSummary = {
    total: students.length,
    active: students.filter((student) => student.displayStatus === "Active")
      .length,
    withoutTransport: students.filter(
      (student) => student.transport === "Not assigned",
    ).length,
  };
  const exportColumns = [
    "Student",
    "ID",
    "Grade",
    "Guardian",
    "Phone",
    "Transport",
    "Status",
  ];

  const exportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      [exportSchool.name || "School students"],
      ["EMIS number", exportSchool.emis_number || "Not available"],
      ["Address", exportSchool.address || "Not available"],
      ["Phone", exportSchool.phone || "Not available"],
      ["Email", exportSchool.school_email || "Not available"],
      ["Principal", exportSchool.principal_name || "Not available"],
      [],
      ["Total students", exportSummary.total],
      ["Active students", exportSummary.active],
      ["Without transport", exportSummary.withoutTransport],
      [],
      exportColumns,
      ...exportRows.map((row) => exportColumns.map((column) => row[column])),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "students.xlsx");
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: "landscape" });
    document.setFontSize(16);
    document.text(exportSchool.name || "School students", 14, 16);
    document.setFontSize(9);
    document.text(
      `EMIS number: ${exportSchool.emis_number || "Not available"}`,
      14,
      23,
    );
    document.text(
      `Address: ${exportSchool.address || "Not available"}`,
      14,
      29,
    );
    document.text(`Phone: ${exportSchool.phone || "Not available"}`, 14, 35);
    document.text(
      `Email: ${exportSchool.school_email || "Not available"}`,
      14,
      41,
    );
    document.text(
      `Principal: ${exportSchool.principal_name || "Not available"}`,
      14,
      47,
    );
    document.text(`Total students: ${exportSummary.total}`, 14, 53);
    document.text(`Active students: ${exportSummary.active}`, 14, 59);
    document.text(
      `Without transport: ${exportSummary.withoutTransport}`,
      14,
      65,
    );
    document.text(`Exported ${new Date().toLocaleString()}`, 14, 71);

    const columns = exportColumns;
    const columnWidths = [42, 25, 28, 42, 32, 42, 25];
    let y = 82;
    const rowHeight = 7;

    const drawRow = (values, header = false) => {
      let x = 14;
      document.setFillColor(
        header ? 15 : 255,
        header ? 118 : 255,
        header ? 110 : 255,
      );
      document.setTextColor(
        header ? 255 : 30,
        header ? 255 : 41,
        header ? 255 : 59,
      );
      values.forEach((value, index) => {
        document.rect(
          x,
          y - 5,
          columnWidths[index],
          rowHeight,
          header ? "F" : "S",
        );
        document.text(String(value || "").slice(0, 28), x + 2, y);
        x += columnWidths[index];
      });
      document.setTextColor(30, 41, 59);
      y += rowHeight;
    };

    drawRow(columns, true);
    exportRows.forEach((row) => {
      if (y > 190) {
        document.addPage();
        y = 16;
        drawRow(columns, true);
      }
      drawRow(columns.map((column) => row[column]));
    });
    document.save("students.pdf");
  };

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Students</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search students..."
            />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiAlertCircle />
            <b>5</b>
          </button>
          <div className="top-profile">
            <img src="https://i.pravatar.cc/100?img=5" alt="School admin" />
            <span>
              <strong>School Admin</strong>
              <small>Administrator</small>
            </span>
            <b>⌄</b>
          </div>
        </div>
      </header>

      <div className="portal-content students-content">
        <section className="students-heading">
          <div>
            <p className="page-kicker">SCHOOL DIRECTORY</p>
            <h1>Students</h1>
            <p>
              Manage student profiles, guardians, and transport assignments.
            </p>
          </div>
          <div className="students-actions">
            <button className="secondary-button" onClick={exportExcel}>
              <FiDownload /> Excel
            </button>
            <button className="secondary-button" onClick={exportPdf}>
              <FiDownload /> PDF
            </button>
            <button
              className="student-primary"
              onClick={() => {
                setEditingStudent(null);
                setForm({ name: "", lastname: "", grade: "" });
                setFormOpen(true);
              }}
            >
              <FiPlus /> Add student
            </button>
          </div>
        </section>
        <section className="student-metrics">
          <article>
            <span className="metric-circle green-circle">
              <FiUsers />
            </span>
            <div>
              <small>Total students</small>
              <strong>{students.length}</strong>
              <em>From school records</em>
            </div>
          </article>
          <article>
            <span className="metric-circle blue-circle">
              <FiUser />
            </span>
            <div>
              <small>Active students</small>
              <strong>
                {
                  students.filter(
                    (student) => student.displayStatus === "Active",
                  ).length
                }
              </strong>
              <em>Currently enrolled</em>
            </div>
          </article>
          <article>
            <span className="metric-circle amber-circle">
              <FiAlertCircle />
            </span>
            <div>
              <small>Without transport</small>
              <strong>
                {
                  students.filter(
                    (student) => student.transport === "Not assigned",
                  ).length
                }
              </strong>
              <em className="metric-warning">Needs attention</em>
            </div>
          </article>
        </section>

        <section className="students-panel">
          <div className="students-panel-head">
            <div>
              <h2>All students</h2>
              <span>
                {filteredStudents.length} of {students.length} shown
              </span>
            </div>
            <button
              className="filter-button"
              onClick={() => {
                setQuery("");
                setStatus("All statuses");
                setGrade("All grades");
                setSort("name-asc");
                setPage(1);
              }}
            >
              <FiSliders /> {hasFilters ? "Clear filters" : "Filters"}
            </button>
          </div>
          <div className="students-toolbar">
            <label className="students-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, ID, or guardian"
              />
            </label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option>All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select
              value={grade}
              onChange={(event) => {
                setGrade(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by grade"
            >
              <option>All grades</option>
              {grades.map((studentGrade) => (
                <option key={studentGrade}>{studentGrade}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              aria-label="Sort students"
            >
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="students-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Student <FiArrowDown />
                  </th>
                  <th>Grade / class</th>
                  <th>Guardian</th>
                  <th>Transport</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-name">
                        <span>
                          {student.avatar ? (
                            <img
                              src={student.avatar}
                              alt={`${student.displayName} profile`}
                            />
                          ) : (
                            student.displayName
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                          )}
                        </span>
                        <div>
                          <strong>
                            {student.displayName || "Unnamed student"}
                          </strong>
                          <small>{student.displayId}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {student.grade || "Grade not assigned"}
                      <small>{student.className}</small>
                    </td>
                    <td>
                      <strong>{student.parentName}</strong>
                      <small>{student.parentPhone}</small>
                    </td>
                    <td>
                      <span
                        className={
                          student.transport === "Not assigned"
                            ? "unassigned"
                            : "route-tag"
                        }
                      >
                        {student.transport}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${student.displayStatus.toLowerCase()}`}
                      >
                        {student.displayStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className="row-action"
                        aria-label={`Edit ${student.displayName}`}
                        onClick={() => editStudent(student)}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="row-action"
                        aria-label={`More options for ${student.displayName}`}
                        onClick={() =>
                          setOpenOptions(
                            openOptions === student.id ? null : student.id,
                          )
                        }
                      >
                        <FiMoreHorizontal />
                      </button>
                      {openOptions === student.id && (
                        <div className="student-options" role="menu">
                          <button onClick={() => editStudent(student)}>
                            <FiEdit2 /> Edit
                          </button>
                          <button onClick={() => deleteStudent(student)}>
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="empty-students">No students match your search.</div>
          )}
          <div className="students-footer">
            <span>
              Showing{" "}
              {filteredStudents.length
                ? `${(safePage - 1) * pageSize + 1} to ${Math.min(
                    safePage * pageSize,
                    filteredStudents.length,
                  )}`
                : "0"}{" "}
              of {filteredStudents.length} students
            </span>
            <div>
              <button
                disabled={safePage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ‹
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    className={safePage === pageNumber ? "current-page" : ""}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                disabled={safePage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                ›
              </button>
            </div>
          </div>
        </section>
        {formOpen && (
          <div
            className="student-modal"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeStudentModal();
            }}
          >
            <form className="student-form" onSubmit={addStudent}>
              <div className="student-form-head">
                <h2>{editingStudent ? "Edit student" : "Add student"}</h2>
                <button
                  type="button"
                  onClick={closeStudentModal}
                  aria-label="Close"
                >
                  <FiX />
                </button>
              </div>
              <input
                required
                placeholder="First name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              <input
                placeholder="Last name"
                value={form.lastname}
                onChange={(event) =>
                  setForm({ ...form, lastname: event.target.value })
                }
              />
              <input
                placeholder="Grade"
                value={form.grade}
                onChange={(event) =>
                  setForm({ ...form, grade: event.target.value })
                }
              />
              <button className="student-submit" disabled={saving}>
                {saving
                  ? editingStudent
                    ? "Saving..."
                    : "Adding..."
                  : editingStudent
                    ? "Save changes"
                    : "Add student"}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default Students;
