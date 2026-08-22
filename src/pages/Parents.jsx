import { useMemo, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  // FiBell,
  FiDownload,
  FiMail,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPhone,
  FiPlus,
  FiSearch,
  FiSend,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import "../styles/parents.css";

const parents = [
  {
    name: "Thandiwe Mokoena",
    id: "PAR001",
    phone: "082 123 4567",
    email: "thandiwe.m@gmail.com",
    children: "Lukhanyo, Sipho",
    relationship: "Mother",
    status: "Active",
    joined: "12 Jan 2026",
  },
  {
    name: "Sibusiso Dlamini",
    id: "PAR002",
    phone: "083 234 5678",
    email: "sibusiso.d@example.com",
    children: "Amahle",
    relationship: "Father",
    status: "Active",
    joined: "18 Jan 2026",
  },
  {
    name: "Nomvula Nkosi",
    id: "PAR003",
    phone: "071 345 6789",
    email: "nomvula.nkosi@gmail.com",
    children: "Mpho, Zanele",
    relationship: "Mother",
    status: "Active",
    joined: "21 Jan 2026",
  },
  {
    name: "Jabulani Khumalo",
    id: "PAR004",
    phone: "079 456 7890",
    email: "jabu.khumalo@gmail.com",
    children: "Kabelo",
    relationship: "Father",
    status: "Active",
    joined: "25 Jan 2026",
  },
  {
    name: "Sarah Jacobs",
    id: "PAR005",
    phone: "081 567 8901",
    email: "sarah.jacobs@example.com",
    children: "Naledi, Rethabile",
    relationship: "Mother",
    status: "Active",
    joined: "01 Feb 2026",
  },
  {
    name: "Andile Mthembu",
    id: "PAR006",
    phone: "072 678 9012",
    email: "andile.m@example.com",
    children: "Thandeka",
    relationship: "Father",
    status: "Inactive",
    joined: "10 Dec 2025",
  },
  {
    name: "Palesa Moloi",
    id: "PAR007",
    phone: "076 789 0123",
    email: "palesa.moloi@gmail.com",
    children: "Neo",
    relationship: "Mother",
    status: "Active",
    joined: "05 Feb 2026",
  },
  {
    name: "Bongani Zulu",
    id: "PAR008",
    phone: "078 890 1234",
    email: "bongani.zulu@example.com",
    children: "Lerato, Siya",
    relationship: "Father",
    status: "Unverified",
    joined: "07 Feb 2026",
  },
];

const tabs = ["All Parents", "Active", "Inactive", "Verified", "Unverified"];

function Parents() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Parents");
  const filteredParents = useMemo(
    () =>
      parents.filter((parent) => {
        const matchesQuery =
          `${parent.name} ${parent.id} ${parent.email} ${parent.children}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesTab =
          activeTab === "All Parents" ||
          parent.status === activeTab ||
          (activeTab === "Verified" ? parent.status === "Active" : false);
        return matchesQuery && matchesTab;
      }),
    [activeTab, query],
  );
  const initials = (name) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("");

  return (
    <>
      {/* <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Parents</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search parents..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiBell />
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
      </header> */}
      <div className="portal-content parents-content">
        <section className="parents-heading">
          <div>
            <p className="page-kicker">FAMILY DIRECTORY</p>
            <h1>Parents</h1>
            <p>Manage parents and guardians of registered students.</p>
          </div>
          <div className="parents-actions">
            <button className="parent-secondary">
              <FiDownload /> Export
            </button>
            <button className="parent-primary">
              <FiPlus /> Add parent
            </button>
          </div>
        </section>
        <section className="parent-metrics">
          <article>
            <span className="parent-icon purple">
              <FiUsers />
            </span>
            <div>
              <small>Total parents</small>
              <strong>256</strong>
              <em>
                <FiArrowUp /> 12 this month
              </em>
            </div>
          </article>
          <article>
            <span className="parent-icon green">
              <FiShield />
            </span>
            <div>
              <small>Active parents</small>
              <strong>238</strong>
              <em className="neutral">93.0%</em>
            </div>
          </article>
          <article>
            <span className="parent-icon orange">
              <FiUsers />
            </span>
            <div>
              <small>Linked to students</small>
              <strong>312</strong>
              <em className="neutral">1.2 parents per student</em>
            </div>
          </article>
          <article>
            <span className="parent-icon red">
              <FiPhone />
            </span>
            <div>
              <small>Verified contacts</small>
              <strong>221</strong>
              <em className="neutral">86.3%</em>
            </div>
          </article>
          <article>
            <span className="parent-icon blue">
              <FiMail />
            </span>
            <div>
              <small>Email subscribers</small>
              <strong>198</strong>
              <em className="neutral">77.3%</em>
            </div>
          </article>
        </section>
        <section className="parents-layout">
          <div className="parents-panel">
            <div className="parent-tabs">
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
            <div className="parents-toolbar">
              <label className="parents-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search parents..."
                />
              </label>
              <button>
                <FiUsers /> Filter
              </button>
              <button className="parent-export">
                <FiDownload /> Export
              </button>
            </div>
            <div className="parents-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Parent / Guardian <FiArrowDown />
                    </th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Children</th>
                    <th>Relationship</th>
                    <th>Status</th>
                    <th>Joined on</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.map((parent) => (
                    <tr key={parent.id}>
                      <td>
                        <div className="parent-name">
                          <span>{initials(parent.name)}</span>
                          <div>
                            <strong>{parent.name}</strong>
                            <small>ID: {parent.id}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="contact-line">
                          <FiPhone /> {parent.phone}
                        </span>
                      </td>
                      <td>{parent.email}</td>
                      <td>
                        <span className="children-count">
                          {parent.children.split(",").length}
                        </span>
                        <small>{parent.children}</small>
                      </td>
                      <td>{parent.relationship}</td>
                      <td>
                        <span
                          className={`parent-status ${parent.status.toLowerCase()}`}
                        >
                          {parent.status}
                        </span>
                      </td>
                      <td>{parent.joined}</td>
                      <td>
                        <button
                          className="parent-action"
                          aria-label={`Message ${parent.name}`}
                        >
                          <FiMail />
                        </button>
                        <button
                          className="parent-action"
                          aria-label={`Call ${parent.name}`}
                        >
                          <FiPhone />
                        </button>
                        <button
                          className="parent-action"
                          aria-label={`More options for ${parent.name}`}
                        >
                          <FiMoreHorizontal />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredParents.length === 0 && (
                <div className="empty-parents">
                  No parents match your search.
                </div>
              )}
            </div>
            <div className="parents-footer">
              <span>Showing 1 to {filteredParents.length} of 256 parents</span>
              <div>
                <button disabled>‹</button>
                <button className="current-page">1</button>
                <button>2</button>
                <button>3</button>
                <button>...</button>
                <button>32</button>
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
          <aside className="parent-sidebar">
            <section>
              <div className="parent-side-title">
                <h2>Parent overview</h2>
                <button>•••</button>
              </div>
              <div className="parent-donut">
                <div>
                  <strong>256</strong>
                  <small>Total</small>
                </div>
              </div>
              <div className="parent-legend">
                <p>
                  <i className="dot active-dot" />
                  Active <b>238 (93.0%)</b>
                </p>
                <p>
                  <i className="dot inactive-dot" />
                  Inactive <b>12 (4.7%)</b>
                </p>
                <p>
                  <i className="dot unverified-dot" />
                  Unverified <b>6 (2.3%)</b>
                </p>
              </div>
            </section>
            <section>
              <h2>Top communication channels</h2>
              <p className="channel">
                <FiMessageSquare /> WhatsApp <b>68%</b>
              </p>
              <p className="channel">
                <FiPhone /> Phone Calls <b>22%</b>
              </p>
              <p className="channel">
                <FiMail /> Email <b>10%</b>
              </p>
            </section>
            <section className="quick-actions">
              <h2>Quick actions</h2>
              <button>
                <FiSend />
                <span>
                  <strong>Send Announcement</strong>
                  <small>Send message to all parents</small>
                </span>
                <b>›</b>
              </button>
              <button>
                <FiUsers />
                <span>
                  <strong>Invite New Parent</strong>
                  <small>Add and invite a new parent</small>
                </span>
                <b>›</b>
              </button>
              <button>
                <FiDownload />
                <span>
                  <strong>Download Parent List</strong>
                  <small>Export parents data</small>
                </span>
                <b>›</b>
              </button>
            </section>
          </aside>
        </section>
      </div>
    </>
  );
}

export default Parents;
