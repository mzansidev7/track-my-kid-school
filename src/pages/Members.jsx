import { useEffect, useState } from "react";
import {
  FiDownload,
  FiFileText,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { supabaseClient } from "../supabaseClient";
import "../styles/members.css";
import {
  downloadSchoolReport,
  getCachedSchoolReportProfile,
} from "../utils/schoolReport";

const roles = [
  ["super_admin", "Super administrator"],
  ["principal", "Principal"],
  ["vice_principal", "Vice principal"],
  ["administrator", "Administrator"],
  ["transport_coordinator", "Transport coordinator"],
  ["transport_manager", "Transport manager"],
  ["school_secretary", "School secretary"],
  ["teacher", "Teacher"],
  ["class_teacher", "Class teacher"],
  ["grade_head", "Grade head"],
  ["receptionist", "Receptionist"],
  ["parent_coordinator", "Parent coordinator"],
  ["safety_officer", "Safety officer"],
  ["security", "Security"],
  ["staff", "Staff"],
];

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    return {};
  }
};

const getMembersCacheKey = (auth) => {
  const fallbackId = auth.user?.id || "current";

  try {
    const profileKey = `schoolProfileCache:${fallbackId}`;
    const schoolId =
      auth.user?.school_id ||
      auth.school_id ||
      JSON.parse(localStorage.getItem(profileKey) || "null")?.data?.id;

    return `schoolMembersCache:${schoolId || fallbackId}`;
  } catch {
    return `schoolMembersCache:${fallbackId}`;
  }
};

const readCachedMembers = (cacheKey) => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
};

export default function Members({
  formOpen: controlledFormOpen,
  setFormOpen: setControlledFormOpen,
}) {
  const auth = getAuth();
  const token = auth.token;
  const membersCacheKey = getMembersCacheKey(auth);
  const [members, setMembers] = useState(() =>
    readCachedMembers(membersCacheKey),
  );

  const isFormControlled = controlledFormOpen !== undefined;
  const [internalFormOpen, setInternalFormOpen] = useState(false);
  const formOpen = isFormControlled ? controlledFormOpen : internalFormOpen;
  const updateFormOpen = (open) => {
    if (isFormControlled) {
      setControlledFormOpen?.(open);
    } else {
      setInternalFormOpen(open);
    }
  };

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    your_email: "",
    phone: "",
    job_title: "",
    member_role: "teacher",
    access_level: "read_only",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const getMemberName = (member) =>
    member.users?.name ||
    [member.first_name, member.last_name].filter(Boolean).join(" ") ||
    "Staff member";

  const getMemberDepartment = (member) => {
    const role = String(member.member_role || "").toLowerCase();
    const department = String(member.department || "").toLowerCase();

    if (
      department.includes("transport") ||
      role.includes("driver") ||
      role.includes("transport")
    ) {
      return "Transport";
    }
    if (
      department.includes("academic") ||
      department.includes("teach") ||
      role === "teacher"
    ) {
      return "Academic";
    }
    if (
      department.includes("admin") ||
      [
        "super_admin",
        "administrator",
        "principal",
        "vice_principal",
        "deputy_principal",
      ].includes(role)
    ) {
      return "Administration";
    }
    return member.department || "Other";
  };

  const getMemberStatus = (member) =>
    member.is_active === false ||
    String(member.status).toLowerCase() === "inactive"
      ? "Inactive"
      : "Active";

  const filteredMembers = members.filter((member) => {
    const role = member.member_role || "";
    const name = getMemberName(member);
    const email = member.users?.email || member.email || "";
    const phone = member.phone || "";
    const searchText = `${name} ${email} ${phone}`.toLowerCase();

    return (
      (!search || searchText.includes(search.trim().toLowerCase())) &&
      (!roleFilter || role === roleFilter) &&
      (!departmentFilter || getMemberDepartment(member) === departmentFilter) &&
      (!statusFilter || getMemberStatus(member) === statusFilter)
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageMembers = filteredMembers.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [search, roleFilter, departmentFilter, statusFilter]);

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setDepartmentFilter("");
    setStatusFilter("");
  };

  const exportMembers = async () => {
    const school = getCachedSchoolReportProfile();
    const exportRecords = filteredMembers.map((member) => ({
      name: getMemberName(member),
      role:
        roles.find(([value]) => value === member.member_role)?.[1] ||
        member.member_role ||
        "Teacher",
      department: getMemberDepartment(member),
      email: member.users?.email || member.email || "—",
      phone: member.phone || "—",
      status: getMemberStatus(member),
    }));

    try {
      await downloadSchoolReport({
        records: exportRecords,
        columns: [
          { key: "name", title: "Staff member", width: 2.2, emphasize: true },
          { key: "role", title: "Role", width: 1.5 },
          { key: "department", title: "Department", width: 1.4 },
          { key: "email", title: "Email", width: 2.4 },
          { key: "phone", title: "Phone", width: 1.5 },
          { key: "status", title: "Status", width: 1.2, type: "status" },
        ],
        title: "Staff members",
        schoolName: school.name || "School report",
        fileName: "school-members.pdf",
        subject: "School staff members",
        metadata: [{ label: "Staff members", value: exportRecords.length }],
      });
    } catch (error) {
      setMessage(error.message || "Could not export staff members.");
    }
  };

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const loadMembers = async () => {
    const data = await apiRequest("/school/members", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembers(Array.isArray(data) ? data : []);
  };

  const updateMemberStatus = async (member, isActive) => {
    const previousStatus = member.status;
    const previousIsActive = member.is_active;

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id
          ? {
              ...item,
              is_active: isActive,
              status: isActive ? "active" : "inactive",
            }
          : item,
      ),
    );
    setMessage("");
    try {
      const data = await apiRequest(`/school/members/${member.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: isActive }),
      });
      setMessage(data.message || "Member status updated.");
    } catch (error) {
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? { ...item, is_active: previousIsActive, status: previousStatus }
            : item,
        ),
      );
      setMessage(error.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    apiRequest("/school/members", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => (Array.isArray(data) ? data : []))
      .then((data) => {
        if (mounted) setMembers(data);
      })
      .catch((error) => {
        if (mounted) setMessage(error.message);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!supabaseClient) return undefined;

    const schoolId = (() => {
      try {
        const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
        const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
        return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data?.id;
      } catch {
        return "";
      }
    })();

    if (!schoolId) return undefined;

    const channel = supabaseClient
      .channel(`school-members:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_admins",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          apiRequest("/school/members", {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((data) => {
              if (Array.isArray(data)) setMembers(data);
            })
            .catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await apiRequest("/school/members", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setMessage("Member added. Temporary login details were sent by email.");
      setForm({
        first_name: "",
        last_name: "",
        your_email: "",
        phone: "",
        job_title: "",
        member_role: "teacher",
        access_level: "read_only",
        is_active: true,
      });
      updateFormOpen(false);
      await loadMembers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(membersCacheKey, JSON.stringify(members));
    } catch {
      // Continue normally if browser storage is unavailable or full.
    }
  }, [members, membersCacheKey]);

  return (
    <>
      <div className="portal-content members-content">
        <section className="members-heading">
          <div>
            <p className="page-kicker">SCHOOL ADMINISTRATION</p>
            <h1>Staff Members</h1>
            <p>Manage school users, roles and contact information.</p>
          </div>
          {!isFormControlled && (
            <button
              className="member-primary"
              onClick={() => updateFormOpen(true)}
            >
              <FiUsers /> Add staff member
            </button>
          )}
        </section>
        {message && <div className="member-message">{message}</div>}
        <section className="member-metrics">
          <article>
            <span className="member-metric green">
              <FiUsers />
            </span>
            <div>
              <small>Total users</small>
              <strong>{members.length}</strong>
              <em>All school users</em>
            </div>
          </article>
          <article>
            <span className="member-metric blue">
              <FiUser />
            </span>
            <div>
              <small>Administrators</small>
              <strong>
                {
                  members.filter((member) =>
                    [
                      "super_admin",
                      "administrator",
                      "principal",
                      "vice_principal",
                      "deputy_principal",
                    ].includes(member.member_role),
                  ).length
                }
              </strong>
              <em>Full access users</em>
            </div>
          </article>
          <article>
            <span className="member-metric orange">
              <FiUsers />
            </span>
            <div>
              <small>Teachers</small>
              <strong>
                {
                  members.filter((member) => member.member_role === "teacher")
                    .length
                }
              </strong>
              <em>Teaching staff</em>
            </div>
          </article>
          <article>
            <span className="member-metric purple">
              <FiFileText />
            </span>
            <div>
              <small>Drivers</small>
              <strong>
                {
                  members.filter((member) =>
                    [
                      "driver",
                      "transport_coordinator",
                      "transport_manager",
                    ].includes(member.member_role),
                  ).length
                }
              </strong>
              <em>Transport staff</em>
            </div>
          </article>
          <article>
            <span className="member-metric red">
              <FiUser />
            </span>
            <div>
              <small>Other staff</small>
              <strong>
                {
                  members.filter(
                    (member) =>
                      ![
                        "super_admin",
                        "teacher",
                        "driver",
                        "transport_coordinator",
                        "transport_manager",
                        "administrator",
                        "principal",
                        "vice_principal",
                        "deputy_principal",
                      ].includes(member.member_role),
                  ).length
                }
              </strong>
              <em>Non-teaching staff</em>
            </div>
          </article>
        </section>
        <section className="members-panel">
          <div className="members-toolbar">
            <label className="members-search">
              <FiSearch />
              <input
                placeholder="Search staff by name, email or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="">Role: All</option>
              {roles.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by department"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">Department: All</option>
              <option value="Administration">Administration</option>
              <option value="Academic">Academic</option>
              <option value="Transport">Transport</option>
              <option value="Other">Other</option>
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button className="member-clear" onClick={clearFilters}>
              Clear
            </button>
            <button className="member-export" onClick={exportMembers}>
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
                </tr>
              </thead>
              <tbody>
                {pageMembers.map((member) => {
                  const role =
                    roles.find(
                      ([value]) => value === member.member_role,
                    )?.[1] ||
                    member.member_role ||
                    "Teacher";
                  const status = getMemberStatus(member);
                  const email =
                    member.users?.email || member.email || "No email address";

                  return (
                    <tr key={member.id}>
                      <td>
                        <strong>{getMemberName(member)}</strong>
                        <small>{email}</small>
                      </td>
                      <td>{role}</td>
                      <td>{getMemberDepartment(member)}</td>
                      <td>{member.phone || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="member-status-toggle"
                          role="switch"
                          aria-checked={status === "Active"}
                          aria-label={`${status === "Active" ? "Deactivate" : "Activate"} ${getMemberName(member)}`}
                          onClick={() =>
                            updateMemberStatus(member, status !== "Active")
                          }
                        >
                          <span className="member-status-toggle-thumb" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredMembers.length && (
              <div className="member-empty">No matching staff members.</div>
            )}
          </div>
          <div className="members-footer">
            <span>
              Showing{" "}
              {filteredMembers.length
                ? `${(activePage - 1) * pageSize + 1} to ${Math.min(activePage * pageSize, filteredMembers.length)}`
                : "0"}{" "}
              of {filteredMembers.length} staff members
            </span>
            <div>
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={page === currentPage ? "current-page" : ""}
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                ›
              </button>
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
                  onClick={() => updateFormOpen(false)}
                  aria-label="Close"
                >
                  <FiX />
                </button>
              </div>
              <input
                required
                placeholder="First name"
                value={form.first_name}
                onChange={(event) =>
                  setForm({ ...form, first_name: event.target.value })
                }
              />
              <input
                required
                placeholder="Last name"
                value={form.last_name}
                onChange={(event) =>
                  setForm({ ...form, last_name: event.target.value })
                }
              />
              <input
                required
                type="email"
                placeholder="Email address"
                value={form.your_email}
                onChange={(event) =>
                  setForm({ ...form, your_email: event.target.value })
                }
              />
              <input
                required
                placeholder="Phone number"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
              <input
                required
                placeholder="Job title"
                value={form.job_title}
                onChange={(event) =>
                  setForm({ ...form, job_title: event.target.value })
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
              <select
                value={form.access_level}
                onChange={(event) =>
                  setForm({ ...form, access_level: event.target.value })
                }
              >
                <option value="full">Full access</option>
                <option value="management">Management</option>
                <option value="transport">Transport</option>
                <option value="academic">Academic</option>
                <option value="support">Support</option>
                <option value="read_only">Read only</option>
              </select>
              <label className="member-active-field">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                />
                Active member
              </label>
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
