import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowUp,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiTruck,
  FiClock,
  FiEdit2,
  FiFileText,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSend,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import "../styles/announcements.css";

const announcements = [
  {
    title: "School Sports Day 2026",
    text: "Join us for our annual Sports Day on Friday, 30 May 2026. Parents are welcome!",
    audience: "All Parents",
    publisher: "Nomsa Dlamini",
    role: "School Admin",
    status: "Published",
    date: "19 May 2026",
    time: "10:30 AM",
    icon: FiCalendar,
    tone: "blue",
  },
  {
    title: "Route 3 Schedule Update",
    text: "Please note that Route 3 pickup times will change from Monday, 26 May 2026.",
    audience: "Route 3 Parents",
    publisher: "Thabo Nkosi",
    role: "Transport Manager",
    status: "Published",
    date: "18 May 2026",
    time: "02:15 PM",
    icon: FiSend,
    tone: "green",
  },
  {
    title: "Important: Safety Reminders",
    text: "A quick reminder about student safety while boarding and exiting the vehicles.",
    audience: "All Parents",
    publisher: "Michael Williams",
    role: "School Principal",
    status: "Published",
    date: "16 May 2026",
    time: "09:00 AM",
    icon: FiAlertTriangle,
    tone: "orange",
  },
  {
    title: "Parent-Teacher Conference",
    text: "Parent-Teacher conferences will be held on 5 June 2026. More details to follow.",
    audience: "All Parents",
    publisher: "Nomsa Dlamini",
    role: "School Admin",
    status: "Scheduled",
    date: "22 May 2026",
    time: "08:00 AM",
    icon: FiBookOpen,
    tone: "purple",
  },
  {
    title: "First Aid Training for Students",
    text: "Grade 6 & 7 students will attend first aid training on 2 June 2026.",
    audience: "Grade 6 & 7 Parents",
    publisher: "Sarah Jacobs",
    role: "School Nurse",
    status: "Scheduled",
    date: "23 May 2026",
    time: "11:20 AM",
    icon: FiAlertTriangle,
    tone: "red",
  },
  {
    title: "New Vehicle Added to Fleet",
    text: "We are happy to announce a new vehicle has been added to our fleet.",
    audience: "All Parents",
    publisher: "Thabo Nkosi",
    role: "Transport Manager",
    status: "Draft",
    date: "-",
    time: "",
    icon: FiBell,
    tone: "gray",
  },
  {
    title: "Holiday Notice",
    text: "School will be closed from 28 June 2026 and reopen on 14 July 2026.",
    audience: "All Parents",
    publisher: "Nomsa Dlamini",
    role: "School Admin",
    status: "Draft",
    date: "-",
    time: "",
    icon: FiSend,
    tone: "purple",
  },
  {
    title: "Term 1 Wrap-up",
    text: "Thank you for a wonderful Term 1! See you all in Term 2.",
    audience: "All Parents",
    publisher: "Michael Williams",
    role: "School Principal",
    status: "Expired",
    date: "10 Apr 2026",
    time: "03:45 PM",
    icon: FiClock,
    tone: "gray",
  },
];

const tabs = [
  "All Announcements",
  "Published",
  "Scheduled",
  "Drafts",
  "Expired",
];

function Announcements() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All Announcements");
  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter(
        (announcement) =>
          `${announcement.title} ${announcement.audience} ${announcement.publisher}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (tab === "All Announcements" ||
            announcement.status === tab.slice(0, -1) ||
            announcement.status === tab),
      ),
    [query, tab],
  );
  return (
    <>
      <div className="portal-content announcements-content">
        <section className="announcements-heading">
          <div>
            <p className="page-kicker">SCHOOL COMMUNICATIONS</p>
            <h1>Announcements</h1>
            <p>
              Create and manage announcements for parents, students and staff.
            </p>
          </div>
          <div className="announcements-date">
            <FiCalendar /> 21 May 2026 <b>⌄</b>
          </div>
          <button className="announcement-primary">
            <FiPlus /> New announcement
          </button>
        </section>
        <section className="announcement-metrics">
          <article>
            <span className="announcement-metric purple">
              <FiBell />
            </span>
            <div>
              <small>Total announcements</small>
              <strong>24</strong>
              <em>
                <FiArrowUp /> 3 this month
              </em>
            </div>
          </article>
          <article>
            <span className="announcement-metric green">
              <FiSend />
            </span>
            <div>
              <small>Published</small>
              <strong>18</strong>
              <em className="neutral">75% of total</em>
            </div>
          </article>
          <article>
            <span className="announcement-metric orange">
              <FiClock />
            </span>
            <div>
              <small>Scheduled</small>
              <strong>4</strong>
              <em className="neutral">16.7% of total</em>
            </div>
          </article>
          <article>
            <span className="announcement-metric red">
              <FiFileText />
            </span>
            <div>
              <small>Drafts</small>
              <strong>2</strong>
              <em className="neutral">8.3% of total</em>
            </div>
          </article>
        </section>
        <section className="announcements-layout">
          <div className="announcements-panel">
            <div className="announcement-tabs">
              {tabs.map((item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="announcements-toolbar">
              <label className="announcements-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search announcements..."
                />
              </label>
              <button>
                <FiTag /> Filter
              </button>
              <select defaultValue="Newest First">
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </div>
            <div className="announcement-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Announcement</th>
                    <th>Audience</th>
                    <th>Published by</th>
                    <th>Status</th>
                    <th>Published on</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map((announcement) => {
                    const Icon = announcement.icon;
                    return (
                      <tr key={announcement.title}>
                        <td>
                          <div className="announcement-title">
                            <span
                              className={`announcement-row-icon ${announcement.tone}`}
                            >
                              <Icon />
                            </span>
                            <div>
                              <strong>{announcement.title}</strong>
                              <small>{announcement.text}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <FiUsers /> {announcement.audience}
                        </td>
                        <td>
                          <strong>{announcement.publisher}</strong>
                          <small>{announcement.role}</small>
                        </td>
                        <td>
                          <span
                            className={`announcement-status ${announcement.status.toLowerCase()}`}
                          >
                            {announcement.status}
                          </span>
                        </td>
                        <td>
                          <strong>{announcement.date}</strong>
                          <small>{announcement.time}</small>
                        </td>
                        <td>
                          <button
                            className="announcement-action"
                            aria-label={`Edit ${announcement.title}`}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="announcement-action"
                            aria-label={`More options for ${announcement.title}`}
                          >
                            <FiMoreHorizontal />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAnnouncements.length === 0 && (
                <div className="empty-announcements">
                  No announcements match your search.
                </div>
              )}
            </div>
            <div className="announcements-footer">
              <span>
                Showing 1 to {filteredAnnouncements.length} of 24 announcements
              </span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>...</button>
                <button>6</button>
                <button>›</button>
              </div>
              <label>
                Rows per page{" "}
                <select defaultValue="10">
                  <option>10</option>
                  <option>25</option>
                </select>
              </label>
            </div>
          </div>
          <aside className="announcements-side">
            <div className="announcement-overview">
              <h2>Announcement overview</h2>
              <div className="announcement-donut">
                <strong>
                  24<small>Total</small>
                </strong>
              </div>
              <div className="overview-legend">
                <p>
                  <i className="published-dot" />
                  Published <b>18 (75%)</b>
                </p>
                <p>
                  <i className="scheduled-dot" />
                  Scheduled <b>4 (16.7%)</b>
                </p>
                <p>
                  <i className="draft-dot" />
                  Drafts <b>2 (8.3%)</b>
                </p>
                <p>
                  <i className="expired-dot" />
                  Expired <b>1 (4.2%)</b>
                </p>
              </div>
            </div>
            <div className="announcement-categories">
              <h2>Top announcement categories</h2>
              <p>
                <span>
                  <FiCalendar /> Events
                </span>
                <b>8</b>
              </p>
              <p>
                <span>
                  <FiTruck /> Transport Updates
                </span>
                <b>6</b>
              </p>
              <p>
                <span>
                  <FiAlertTriangle /> General Notices
                </span>
                <b>5</b>
              </p>
              <p>
                <span>
                  <FiAlertTriangle /> Safety
                </span>
                <b>3</b>
              </p>
              <p>
                <span>
                  <FiBookOpen /> Academic
                </span>
                <b>2</b>
              </p>
            </div>
            <div className="announcement-quick">
              <h2>Quick actions</h2>
              {[
                [FiPlus, "Create Announcement", "Send a new announcement"],
                [
                  FiFileText,
                  "Announcement Templates",
                  "Use pre-made templates",
                ],
                [
                  FiTag,
                  "Manage Categories",
                  "Organize announcement categories",
                ],
                [
                  FiClock,
                  "Announcement History",
                  "View all sent announcements",
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
          </aside>
        </section>
      </div>
    </>
  );
}

export default Announcements;
