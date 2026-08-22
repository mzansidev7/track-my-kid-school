import { useEffect, useState } from "react";
import {
  // FiAlertCircle,
  FiEdit2,
  FiDownload,
  FiFileText,
  FiMail,
  FiMoreHorizontal,
  FiPhone,
  FiPlus,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { API_URL } from "../api";
import "../styles/members.css";

const roles = [
  ["principal", "Principal"],
  ["deputy_principal", "Deputy principal"],
  ["teacher", "Teacher"],
  ["administrator", "Administrator"],
  ["transport_coordinator", "Transport coordinator"],
];

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    member_role: "teacher",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const token = getAuth().token;

  const loadMembers = async () => {
    const response = await fetch(`${API_URL}/school/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) setMembers(await response.json());
  };

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URL}/school/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (mounted) setMembers(data);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/school/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add member");
      setMessage("Member added. Temporary login details were sent by email.");
      setForm({ name: "", email: "", phone: "", member_role: "teacher" });
      setFormOpen(false);
      await loadMembers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Staff Members</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search students, parents, routes..." />
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
      </header> */}
      <div className="portal-content members-content">
        <section className="members-heading">
          <div>
            <p className="page-kicker">SCHOOL TEAM</p>
            <h1>Staff Members</h1>
            <p>Manage school staff, their roles and contact information.</p>
          </div>
          <button className="member-primary" onClick={() => setFormOpen(true)}>
            <FiPlus /> Add staff member
          </button>
        </section>
        {message && <div className="member-message">{message}</div>}
        <section className="member-metrics">
          <article>
            <span className="member-metric green">
              <FiUsers />
            </span>
            <div>
              <small>Total staff</small>
              <strong>{members.length || 28}</strong>
              <em>All staff members</em>
            </div>
          </article>
          <article>
            <span className="member-metric blue">
              <FiUser />
            </span>
            <div>
              <small>Active staff</small>
              <strong>
                {members.filter((member) => member.status !== "inactive")
                  .length || 25}
              </strong>
              <em>Currently active</em>
            </div>
          </article>
          <article>
            <span className="member-metric orange">
              <FiUsers />
            </span>
            <div>
              <small>Teachers</small>
              <strong>
                {members.filter((member) => member.member_role === "teacher")
                  .length || 16}
              </strong>
              <em>Teaching staff</em>
            </div>
          </article>
          <article>
            <span className="member-metric purple">
              <FiFileText />
            </span>
            <div>
              <small>Non-teaching</small>
              <strong>9</strong>
              <em>Support staff</em>
            </div>
          </article>
          <article>
            <span className="member-metric red">
              <FiUser />
            </span>
            <div>
              <small>Inactive</small>
              <strong>3</strong>
              <em>Not active</em>
            </div>
          </article>
        </section>
        <section className="members-panel">
          <div className="members-toolbar">
            <label className="members-search">
              <FiSearch />
              <input placeholder="Search staff by name, email or phone..." />
            </label>
            <select aria-label="Filter by role">
              <option>Role: All</option>
              <option>Principal</option>
              <option>Teacher</option>
              <option>Administrator</option>
            </select>
            <select aria-label="Filter by department">
              <option>Department: All</option>
              <option>Administration</option>
              <option>Academic</option>
              <option>Transport</option>
            </select>
            <select aria-label="Filter by status">
              <option>Status: All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button className="member-clear">Clear</button>
            <button className="member-export">
              <FiDownload /> Export
            </button>
          </div>
          <div className="member-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => {
                  const name =
                    member.users?.name ||
                    [
                      "Linda Dlamini",
                      "James Nkosi",
                      "Nomsa Mthembu",
                      "Sipho Dube",
                      "Thandi Khumalo",
                      "Patrick Mahlangu",
                      "Bongani Mokoena",
                    ][index] ||
                    "Staff member";
                  const email =
                    member.users?.email ||
                    `${name.toLowerCase().replaceAll(" ", ".")}@abcprimary.co.za`;
                  const role =
                    roles.find(
                      ([value]) => value === member.member_role,
                    )?.[1] ||
                    member.member_role ||
                    "Teacher";
                  return (
                    <tr key={member.id || name}>
                      <td>
                        <div className="member-name">
                          <span>
                            <FiUser />
                          </span>
                          <div>
                            <strong>{name}</strong>
                            <small>
                              EMP-{String(index + 1).padStart(4, "0")}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{role}</td>
                      <td>
                        {role.toLowerCase().includes("teacher")
                          ? "Academic"
                          : "Administration"}
                      </td>
                      <td>
                        <small>
                          <FiMail /> {email}
                        </small>
                        <small>
                          <FiPhone /> {member.phone || "082 123 4567"}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`member-status ${member.status === "inactive" ? "inactive" : "active"}`}
                        >
                          <i />
                          {member.status === "inactive" ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="member-action"
                          aria-label={`Edit ${name}`}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="member-action"
                          aria-label={`More options for ${name}`}
                        >
                          <FiMoreHorizontal />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!members.length && (
              <div className="member-empty">No staff members added yet.</div>
            )}
          </div>
          <div className="members-footer">
            <span>Showing 1 to {members.length || 7} of 28 staff members</span>
            <div>
              <button disabled>‹</button>
              <button className="current-page">1</button>
              <button>2</button>
              <button>3</button>
              <button>4</button>
              <button>›</button>
            </div>
          </div>
        </section>
        {formOpen && (
          <div className="member-modal">
            <form onSubmit={submit} className="member-form">
              <div className="member-form-head">
                <h2>Add school member</h2>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Close"
                >
                  <FiX />
                </button>
              </div>
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              <input
                required
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
              <input
                placeholder="Phone number"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
              <select
                value={form.member_role}
                onChange={(event) =>
                  setForm({ ...form, member_role: event.target.value })
                }
              >
                {roles.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button disabled={saving} className="member-submit">
                {saving ? "Adding..." : "Add member"}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
