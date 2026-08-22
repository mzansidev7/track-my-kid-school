import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiDownload,
  FiEdit2,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSliders,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import "../styles/students.css";

const students = [
  {
    name: "Liam Anderson",
    id: "STU-1024",
    grade: "Grade 5",
    className: "5A",
    parent: "Sarah Anderson",
    phone: "071 234 5678",
    status: "Active",
    transport: "Route 1",
  },
  {
    name: "Mia Williams",
    id: "STU-1023",
    grade: "Grade 4",
    className: "4B",
    parent: "James Williams",
    phone: "072 845 1120",
    status: "Active",
    transport: "Route 2",
  },
  {
    name: "Noah Jacobs",
    id: "STU-1022",
    grade: "Grade 6",
    className: "6A",
    parent: "Thandi Jacobs",
    phone: "083 410 9021",
    status: "Inactive",
    transport: "Not assigned",
  },
  {
    name: "Emma Smith",
    id: "STU-1021",
    grade: "Grade 3",
    className: "3C",
    parent: "David Smith",
    phone: "076 333 7812",
    status: "Active",
    transport: "Route 1",
  },
  {
    name: "Ethan Molefe",
    id: "STU-1020",
    grade: "Grade 7",
    className: "7B",
    parent: "Lerato Molefe",
    phone: "079 562 4419",
    status: "Active",
    transport: "Route 3",
  },
  {
    name: "Olivia Naidoo",
    id: "STU-1019",
    grade: "Grade 2",
    className: "2A",
    parent: "Priya Naidoo",
    phone: "082 198 6400",
    status: "Active",
    transport: "Route 2",
  },
];

function Students() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery = `${student.name} ${student.id} ${student.parent}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return (
          matchesQuery &&
          (status === "All statuses" || student.status === status)
        );
      }),
    [query, status],
  );

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
            <input placeholder="Search students..." />
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
            <button className="secondary-button">
              <FiDownload /> Export
            </button>
            <button className="student-primary">
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
              <strong>248</strong>
              <em>
                <FiArrowUp /> 8.2% this term
              </em>
            </div>
          </article>
          <article>
            <span className="metric-circle blue-circle">
              <FiUser />
            </span>
            <div>
              <small>Active students</small>
              <strong>231</strong>
              <em>
                <FiArrowUp /> 4.6% this month
              </em>
            </div>
          </article>
          <article>
            <span className="metric-circle amber-circle">
              <FiAlertCircle />
            </span>
            <div>
              <small>Without transport</small>
              <strong>17</strong>
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
            <button className="filter-button">
              <FiSliders /> Filters
            </button>
          </div>
          <div className="students-toolbar">
            <label className="students-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, ID, or guardian"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
            >
              <option>All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select aria-label="Filter by grade">
              <option>All grades</option>
              <option>Grade 1</option>
              <option>Grade 2</option>
              <option>Grade 3</option>
              <option>Grade 4</option>
              <option>Grade 5</option>
              <option>Grade 6</option>
              <option>Grade 7</option>
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
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-name">
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
                      <strong>{student.parent}</strong>
                      <small>{student.phone}</small>
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
                        className={`status-pill ${student.status.toLowerCase()}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="row-action"
                        aria-label={`Edit ${student.name}`}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="row-action"
                        aria-label={`More options for ${student.name}`}
                      >
                        <FiMoreHorizontal />
                      </button>
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
            <span>Showing 1 to {filteredStudents.length} of 248 students</span>
            <div>
              <button disabled>‹</button>
              <button className="current-page">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Students;
