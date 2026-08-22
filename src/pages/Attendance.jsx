import { useMemo, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "../styles/attendance.css";

const initialStudents = [
  {
    name: "Lukhanyo Dlamini",
    id: "STU001",
    grade: "Grade 4",
    className: "4A",
    guardian: "Nomsa Dlamini",
    time: "07:42 AM",
    status: "Present",
  },
  {
    name: "Amahle Ndlovu",
    id: "STU002",
    grade: "Grade 1",
    className: "1B",
    guardian: "Thandi Ndlovu",
    time: "07:48 AM",
    status: "Present",
  },
  {
    name: "Mpho Lili",
    id: "STU003",
    grade: "Grade 4",
    className: "4A",
    guardian: "Lerato Lili",
    time: "08:12 AM",
    status: "Late",
  },
  {
    name: "Zanele Mthembu",
    id: "STU004",
    grade: "Grade 3",
    className: "3B",
    guardian: "Sipho Mthembu",
    time: "-",
    status: "Absent",
  },
  {
    name: "Kabelo Motsepe",
    id: "STU005",
    grade: "Grade 2",
    className: "2A",
    guardian: "Tshepo Motsepe",
    time: "07:51 AM",
    status: "Present",
  },
  {
    name: "Naledi Kgosi",
    id: "STU006",
    grade: "Grade 5",
    className: "5A",
    guardian: "Palesa Kgosi",
    time: "08:05 AM",
    status: "Late",
  },
  {
    name: "Rethabile Mokoena",
    id: "STU007",
    grade: "Grade 6",
    className: "6B",
    guardian: "Boitumelo Mokoena",
    time: "07:39 AM",
    status: "Present",
  },
];

const tabs = ["Today", "This week", "This month"];

function Attendance() {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Today");
  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        `${student.name} ${student.id} ${student.guardian}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, students],
  );
  const setStatus = (id, status) =>
    setStudents((current) =>
      current.map((student) =>
        student.id === id
          ? {
              ...student,
              status,
              time:
                status === "Absent"
                  ? "-"
                  : student.time === "-"
                    ? "08:00 AM"
                    : student.time,
            }
          : student,
      ),
    );

  return (
    <>
      <div className="portal-content attendance-content">
        <section className="attendance-heading">
          <div>
            <p className="page-kicker">DAILY REGISTER</p>
            <h1>Attendance</h1>
            <p>
              Track student attendance and keep your school register up to date.
            </p>
          </div>
          <div className="attendance-actions">
            <button className="attendance-secondary">
              <FiDownload /> Export report
            </button>
            <button className="attendance-primary">
              <FiCheckCircle /> Mark attendance
            </button>
          </div>
        </section>
        <section className="attendance-summary">
          <article>
            <span className="attendance-icon green">
              <FiCheck />
            </span>
            <div>
              <small>Present today</small>
              <strong>
                {
                  students.filter((student) => student.status === "Present")
                    .length
                }
              </strong>
              <em>
                <FiArrowUp /> 92.7% attendance
              </em>
            </div>
          </article>
          <article>
            <span className="attendance-icon red">
              <FiX />
            </span>
            <div>
              <small>Absent today</small>
              <strong>
                {
                  students.filter((student) => student.status === "Absent")
                    .length
                }
              </strong>
              <em className="red-text">3.2% of students</em>
            </div>
          </article>
          <article>
            <span className="attendance-icon orange">
              <FiClock />
            </span>
            <div>
              <small>Late arrivals</small>
              <strong>
                {students.filter((student) => student.status === "Late").length}
              </strong>
              <em className="orange-text">Needs follow-up</em>
            </div>
          </article>
          <article>
            <span className="attendance-icon blue">
              <FiUsers />
            </span>
            <div>
              <small>Total students</small>
              <strong>248</strong>
              <em className="neutral-text">Registered students</em>
            </div>
          </article>
        </section>
        <section className="attendance-layout">
          <div className="attendance-register">
            <div className="attendance-register-head">
              <div>
                <h2>Attendance register</h2>
                <span>Wednesday, 21 May 2026</span>
              </div>
              <div className="attendance-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="attendance-toolbar">
              <label className="attendance-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search student or guardian"
                />
              </label>
              <select aria-label="Filter by class">
                <option>All classes</option>
                <option>Grade 1</option>
                <option>Grade 2</option>
                <option>Grade 3</option>
                <option>Grade 4</option>
                <option>Grade 5</option>
                <option>Grade 6</option>
              </select>
              <button>
                <FiCalendar /> 21 May 2026
              </button>
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
                  {filteredStudents.map((student) => (
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
                      <td>
                        <span
                          className={`attendance-status ${student.status.toLowerCase()}`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <div className="attendance-update">
                          <button
                            className={
                              student.status === "Present"
                                ? "selected present"
                                : ""
                            }
                            onClick={() => setStatus(student.id, "Present")}
                            aria-label={`Mark ${student.name} present`}
                          >
                            <FiCheck />
                          </button>
                          <button
                            className={
                              student.status === "Absent"
                                ? "selected absent"
                                : ""
                            }
                            onClick={() => setStatus(student.id, "Absent")}
                            aria-label={`Mark ${student.name} absent`}
                          >
                            <FiX />
                          </button>
                          <button
                            className={
                              student.status === "Late" ? "selected late" : ""
                            }
                            onClick={() => setStatus(student.id, "Late")}
                            aria-label={`Mark ${student.name} late`}
                          >
                            <FiClock />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="empty-attendance">
                  No students match your search.
                </div>
              )}
            </div>
            <div className="attendance-footer">
              <span>
                Showing 1 to {filteredStudents.length} of 248 students
              </span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          </div>
          <aside className="attendance-side">
            <div className="attendance-side-head">
              <h2>Weekly overview</h2>
              <button aria-label="More options">•••</button>
            </div>
            <div className="weekly-chart">
              <div>
                <span>Mon</span>
                <i style={{ height: "72%" }} />
                <b>94%</b>
              </div>
              <div>
                <span>Tue</span>
                <i style={{ height: "80%" }} />
                <b>96%</b>
              </div>
              <div className="today">
                <span>Wed</span>
                <i style={{ height: "88%" }} />
                <b>98%</b>
              </div>
              <div>
                <span>Thu</span>
                <i style={{ height: "66%" }} />
                <b>92%</b>
              </div>
              <div>
                <span>Fri</span>
                <i style={{ height: "76%" }} />
                <b>95%</b>
              </div>
            </div>
            <div className="attendance-side-note">
              <FiCheckCircle />
              <div>
                <strong>Great attendance</strong>
                <p>Attendance is up 4.2% from last week.</p>
              </div>
            </div>
            <div className="attendance-breakdown">
              <h3>Today's breakdown</h3>
              <p>
                <span>
                  <i className="dot present-dot" />
                  Present
                </span>
                <strong>231</strong>
              </p>
              <p>
                <span>
                  <i className="dot late-dot" />
                  Late
                </span>
                <strong>8</strong>
              </p>
              <p>
                <span>
                  <i className="dot absent-dot" />
                  Absent
                </span>
                <strong>9</strong>
              </p>
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Attendance;
