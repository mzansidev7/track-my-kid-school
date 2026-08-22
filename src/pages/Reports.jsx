import { useState } from "react";
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiFileText,
  FiFilter,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import "../styles/reports.css";

const tabs = [
  "Overview",
  "Trips",
  "Attendance",
  "Students",
  "Drivers",
  "Vehicles",
  "Routes",
  "Incidents",
];
const routeRows = [
  [
    "Route 1",
    "Brooklyn → School",
    "24",
    "18",
    "87.5%",
    "4",
    "2",
    "94.6%",
    "42 min",
  ],
  [
    "Route 2",
    "Hatfield → School",
    "22",
    "16",
    "81.8%",
    "4",
    "2",
    "92.1%",
    "38 min",
  ],
  [
    "Route 3",
    "Arcadia → School",
    "21",
    "15",
    "76.2%",
    "5",
    "1",
    "90.3%",
    "45 min",
  ],
  [
    "Route 4",
    "Lynnwood → School",
    "20",
    "14",
    "85.0%",
    "3",
    "3",
    "95.2%",
    "40 min",
  ],
  [
    "Route 5",
    "Pretoria North → School",
    "19",
    "15",
    "88.9%",
    "2",
    "2",
    "93.7%",
    "41 min",
  ],
];

function Reports() {
  const [activeTab, setActiveTab] = useState("Overview");
  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Reports</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiFileText />
            <input placeholder="Search reports..." />
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
      <div className="portal-content reports-content">
        <section className="reports-heading">
          <div>
            <p className="page-kicker">DATA & INSIGHTS</p>
            <h1>Reports</h1>
            <p>Generate and analyze data to make informed decisions.</p>
          </div>
          <div className="reports-actions">
            <button className="report-date">
              <FiCalendar /> 14 May 2026 - 21 May 2026 <b>⌄</b>
            </button>
            <button className="report-primary">
              <FiDownload /> Download report
            </button>
          </div>
        </section>
        <section className="report-metrics">
          <article>
            <span className="report-metric purple">
              <FiTruck />
            </span>
            <div>
              <small>Total trips</small>
              <strong>128</strong>
              <em>
                <FiArrowUp /> 18 (16.4%)
              </em>
              <i>vs last 7 days</i>
            </div>
          </article>
          <article>
            <span className="report-metric green">
              <FiCheck />
            </span>
            <div>
              <small>Attendance rate</small>
              <strong>93.6%</strong>
              <em>
                <FiArrowUp /> 4.3%
              </em>
              <i>vs last 7 days</i>
            </div>
          </article>
          <article>
            <span className="report-metric blue">
              <FiTruck />
            </span>
            <div>
              <small>Active vehicles</small>
              <strong>18</strong>
              <em className="neutral">No change</em>
              <i>vs last 7 days</i>
            </div>
          </article>
          <article>
            <span className="report-metric orange">
              <FiUsers />
            </span>
            <div>
              <small>Active drivers</small>
              <strong>22</strong>
              <em>
                <FiArrowUp /> 2 (10%)
              </em>
              <i>vs last 7 days</i>
            </div>
          </article>
          <article>
            <span className="report-metric red">
              <FiAlertCircle />
            </span>
            <div>
              <small>Incidents reported</small>
              <strong>3</strong>
              <em className="down">
                <FiArrowDown /> 2 (40%)
              </em>
              <i>vs last 7 days</i>
            </div>
          </article>
        </section>
        <section className="reports-layout">
          <div className="reports-main">
            <nav className="report-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "active" : ""}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className="report-filters">
              <select>
                <option>All Routes</option>
                <option>Route 1</option>
                <option>Route 2</option>
              </select>
              <select>
                <option>All Drivers</option>
                <option>John Mokoena</option>
                <option>Sarah Jacobs</option>
              </select>
              <select>
                <option>All Vehicles</option>
                <option>GP 45 CD GP</option>
              </select>
              <button>
                <FiFilter /> Filter
              </button>
            </div>
            <div className="reports-charts">
              <article className="trend-chart">
                <h2>
                  Trips Trend <FiAlertCircle />
                </h2>
                <div className="chart-area">
                  <span className="y-label y40">40</span>
                  <span className="y-label y30">30</span>
                  <span className="y-label y20">20</span>
                  <span className="y-label y10">10</span>
                  <span className="chart-line" />
                  <div className="chart-point p1" />
                  <div className="chart-point p2" />
                  <div className="chart-point p3" />
                  <div className="chart-point p4" />
                  <div className="chart-point p5" />
                  <div className="chart-point p6" />
                  <div className="chart-point p7" />
                  <div className="chart-x">
                    <span>14 May</span>
                    <span>15 May</span>
                    <span>16 May</span>
                    <span>17 May</span>
                    <span>18 May</span>
                    <span>19 May</span>
                    <span>20 May</span>
                    <span>21 May</span>
                  </div>
                </div>
              </article>
              <article className="status-chart">
                <h2>
                  Trips by Status <FiAlertCircle />
                </h2>
                <div className="donut">
                  <strong>
                    128<small>Total Trips</small>
                  </strong>
                </div>
                <div className="donut-legend">
                  <p>
                    <i className="green-dot" />
                    Completed <b>88 (68.8%)</b>
                  </p>
                  <p>
                    <i className="blue-dot" />
                    On Going <b>28 (21.9%)</b>
                  </p>
                  <p>
                    <i className="orange-dot" />
                    Late <b>8 (6.3%)</b>
                  </p>
                  <p>
                    <i className="red-dot" />
                    Cancelled <b>4 (3.1%)</b>
                  </p>
                </div>
              </article>
            </div>
            <div className="route-performance">
              <h2>
                Route Performance <FiAlertCircle />
              </h2>
              <div className="report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Total Trips</th>
                      <th>Completed</th>
                      <th>On Time %</th>
                      <th>Late</th>
                      <th>Cancelled</th>
                      <th>Attendance %</th>
                      <th>Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeRows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, index) => (
                          <td key={`${row[0]}-${cell}`}>
                            {index === 0 ? (
                              <>
                                <strong>{cell}</strong>
                                <small>{row[1]}</small>
                              </>
                            ) : index === 4 || index === 5 ? (
                              <span
                                className={
                                  index === 4 ? "late-value" : "cancel-value"
                                }
                              >
                                {cell}
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="view-route-report">
                View full route report -&gt;
              </button>
            </div>
          </div>
          <aside className="reports-side">
            <div className="insights">
              <h2>
                Key Insights <FiAlertCircle />
              </h2>
              {[
                [
                  FiBarChart2,
                  "Trips increased by 16.4%",
                  "Total trips this week increased by 18 compared to last week.",
                  "green",
                ],
                [
                  FiClock,
                  "On-time performance",
                  "81.7% of trips were completed on time.",
                  "orange",
                ],
                [
                  FiUsers,
                  "Attendance improved",
                  "Student attendance increased by 4.3% compared to last week.",
                  "blue",
                ],
                [
                  FiAlertCircle,
                  "Low incidents",
                  "Incidents decreased by 40% compared to last week.",
                  "red",
                ],
              ].map(([Icon, title, text, tone]) => (
                <div className="insight" key={title}>
                  <span className={tone}>
                    <Icon />
                  </span>
                  <p>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </p>
                </div>
              ))}
            </div>
            <div className="report-shortcuts">
              <h2>
                Report Shortcuts <FiAlertCircle />
              </h2>
              {[
                [
                  FiTruck,
                  "Trips Report",
                  "Detailed trips and route performance",
                ],
                [
                  FiUsers,
                  "Attendance Report",
                  "Student attendance and punctuality",
                ],
                [FiUsers, "Driver Report", "Driver performance and activity"],
                [FiTruck, "Vehicle Report", "Vehicle usage and maintenance"],
                [
                  FiAlertCircle,
                  "Incidents Report",
                  "Safety incidents and resolution",
                ],
              ].map(([Icon, title, text]) => (
                <button key={title}>
                  <Icon />
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <b>›</b>
                </button>
              ))}
            </div>
            <div className="export-data">
              <h2>Export Data</h2>
              <p>Export reports in multiple formats.</p>
              <button>
                <FiFileText /> PDF
              </button>
              <button>
                <FiFileText /> Excel
              </button>
              <button>
                <FiFileText /> CSV
              </button>
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Reports;
