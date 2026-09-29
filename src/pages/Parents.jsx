import { useMemo, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiDownload,
  FiEye,
  FiMail,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPhone,
  // FiPlus,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import "../styles/parents.css";
import { useParents } from "../hooks/useParents";
import {
  downloadSchoolReport,
  getCachedSchoolReportProfile,
} from "../utils/schoolReport";

const tabs = ["All Parents", "Active", "Inactive", "Verified", "Unverified"];

function Parents() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Parents");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [relationshipFilter, setRelationshipFilter] =
    useState("All relationships");
  const [showFilters, setShowFilters] = useState(false);
  const [menuParentId, setMenuParentId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedView, setSelectedView] = useState("details");
  const { parents, loading } = useParents();
  const filteredParents = useMemo(
    () =>
      parents.filter((parent) => {
        const matchesQuery =
          `${parent.name} ${parent.displayId} ${parent.email} ${parent.children.map((child) => child.name).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesTab =
          activeTab === "All Parents" ||
          parent.status === activeTab ||
          (activeTab === "Verified" ? parent.status === "Active" : false);
        const matchesStatus =
          statusFilter === "All statuses" || parent.status === statusFilter;
        const matchesRelationship =
          relationshipFilter === "All relationships" ||
          parent.relationship === relationshipFilter;
        return (
          matchesQuery && matchesTab && matchesStatus && matchesRelationship
        );
      }),
    [activeTab, parents, query, relationshipFilter, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredParents.length / pageSize));

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentParents = filteredParents.slice(
    startIndex,
    startIndex + pageSize,
  );

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  );

  const updateTab = (nextTab) => {
    setActiveTab(nextTab);
    setPage(1);
  };

  const changePage = (nextPage) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };
  const initials = (name) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const parentsThisMonth = parents.filter((parent) => {
    if (!parent.created_at) return false;

    const joinedDate = new Date(parent.created_at);
    if (Number.isNaN(joinedDate.getTime())) return false;

    return joinedDate >= monthStart;
  }).length;

  const activeParents = parents.filter(
    (parent) => parent.status === "Active",
  ).length;
  const linkedChildren = parents.reduce(
    (total, parent) => total + parent.children.length,
    0,
  );
  const verifiedContacts = parents.filter(
    (parent) =>
      parent.email !== "No email" || parent.phone !== "No phone number",
  ).length;
  const emailSubscribers = parents.filter(
    (parent) => parent.email !== "No email",
  ).length;

  const relationshipOptions = [
    "All relationships",
    ...new Set(parents.map((parent) => parent.relationship).filter(Boolean)),
  ];

  const openParentView = (parent, view) => {
    setSelectedParent(parent);
    setSelectedView(view);
    setMenuParentId(null);
  };

  const exportPdf = async () => {
    const schoolProfile = getCachedSchoolReportProfile();
    const reportParents = filteredParents.map((parent) => ({
      name: `${parent.name || "Unnamed parent"}\n${parent.displayId || ""}`,
      phone: parent.phone || "No phone number",
      email: parent.email || "No email",
      children: parent.children?.length
        ? parent.children
            .map((child) => child.name)
            .filter(Boolean)
            .join(", ")
        : "No linked students",
      status: parent.status || "Active",
    }));
    const reportActive = filteredParents.filter(
      (parent) => parent.status === "Active",
    ).length;
    const reportLinkedChildren = filteredParents.reduce(
      (total, parent) => total + (parent.children?.length || 0),
      0,
    );
    const reportEmailContacts = filteredParents.filter(
      (parent) => parent.email !== "No email",
    ).length;

    await downloadSchoolReport({
      records: reportParents,
      columns: [
        { title: "PARENT", key: "name", width: 46, emphasize: true },
        { title: "PHONE", key: "phone", width: 30 },
        { title: "EMAIL", key: "email", width: 52 },
        { title: "LINKED STUDENTS", key: "children", width: 32 },
        { title: "ACCOUNT", key: "status", width: 22, type: "status" },
      ],
      title: "School parent directory",
      schoolName: schoolProfile.name || "School parent directory",
      schoolLogo: schoolProfile.logo,
      badgeLabel: "FAMILY DIRECTORY",
      metadata: [
        { label: "Directory view", value: activeTab },
        { label: "Account status", value: statusFilter },
        { label: "Relationship", value: relationshipFilter },
      ],
      summaryCards: [
        {
          label: "Parents",
          value: filteredParents.length,
          color: [47, 96, 187],
          tint: [235, 243, 255],
        },
        {
          label: "Active",
          value: reportActive,
          color: [23, 135, 82],
          tint: [233, 248, 240],
        },
        {
          label: "Linked students",
          value: reportLinkedChildren,
          color: [189, 111, 22],
          tint: [255, 247, 232],
        },
        {
          label: "Email contacts",
          value: reportEmailContacts,
          color: [94, 77, 181],
          tint: [242, 239, 255],
        },
      ],
      fileName: "parent-directory.pdf",
      subject: "School parent and guardian directory",
    });
  };

  return (
    <>
      <div className="portal-content parents-content">
        <section className="parents-heading">
          <div>
            <p className="page-kicker">FAMILY DIRECTORY</p>
            <h1>Parents</h1>
            <p>Manage parents and guardians of registered students.</p>
          </div>
          <div className="parents-actions">
            <button className="parent-secondary" onClick={exportPdf}>
              <FiDownload /> Export
            </button>
            {/* <button className="parent-primary">
              <FiPlus /> Add parent
            </button> */}
          </div>
        </section>
        <section className="parent-metrics">
          <article>
            <span className="parent-icon purple">
              <FiUsers />
            </span>
            <div>
              <small>Total parents</small>
              <strong>{parents.length}</strong>
              <em>
                <FiArrowUp /> {parentsThisMonth} this month
              </em>
            </div>
          </article>
          <article>
            <span className="parent-icon green">
              <FiShield />
            </span>
            <div>
              <small>Active parents</small>
              <strong>{activeParents}</strong>
              <em className="neutral">
                {parents.length
                  ? `${Math.round((activeParents / parents.length) * 100)}%`
                  : "0%"}
              </em>
            </div>
          </article>
          <article>
            <span className="parent-icon orange">
              <FiUsers />
            </span>
            <div>
              <small>Linked to students</small>
              <strong>{linkedChildren}</strong>
              <em className="neutral">Linked students</em>
            </div>
          </article>
          <article>
            <span className="parent-icon red">
              <FiPhone />
            </span>
            <div>
              <small>Verified contacts</small>
              <strong>{verifiedContacts}</strong>
              <em className="neutral">Contact details available</em>
            </div>
          </article>
          <article>
            <span className="parent-icon blue">
              <FiMail />
            </span>
            <div>
              <small>Email subscribers</small>
              <strong>{emailSubscribers}</strong>
              <em className="neutral">Email available</em>
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
                  onClick={() => updateTab(tab)}
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
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search parents..."
                />
              </label>
              <div className="parent-filter-wrap">
                <button onClick={() => setShowFilters((value) => !value)}>
                  <FiUsers /> Filter
                </button>
                {showFilters && (
                  <div className="parent-filter-panel">
                    <label>
                      <span>Status</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="All statuses">All statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </label>
                    <label>
                      <span>Relationship</span>
                      <select
                        value={relationshipFilter}
                        onChange={(event) => {
                          setRelationshipFilter(event.target.value);
                          setPage(1);
                        }}
                      >
                        {relationshipOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
              <button className="parent-export" onClick={exportPdf}>
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
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="parents-loading">
                        Loading parents...
                      </td>
                    </tr>
                  ) : currentParents.length ? (
                    currentParents.map((parent) => {
                      const emailAddress =
                        parent.email && parent.email !== "No email"
                          ? parent.email
                          : "";
                      const phoneNumber =
                        parent.phone && parent.phone !== "No phone number"
                          ? parent.phone.replace(/\s+/g, "")
                          : "";

                      return (
                        <tr key={parent.id}>
                          <td>
                            <div className="parent-name">
                              <span className="parent-avatar">
                                {parent.avatar ? (
                                  <img
                                    src={parent.avatar}
                                    alt={`${parent.name} profile`}
                                  />
                                ) : (
                                  initials(parent.name)
                                )}
                              </span>
                              <div>
                                <strong>{parent.name}</strong>
                                <small>ID: {parent.id.slice(0, 8)}</small>
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
                              {parent.children.length}
                            </span>
                            <small>
                              {parent.children
                                .map((child) => child.name)
                                .join(", ") || "No linked students"}
                            </small>
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
                            {emailAddress ? (
                              <a
                                className="parent-action"
                                href={`mailto:${emailAddress}`}
                                aria-label={`Email ${parent.name}`}
                                title={`Email ${emailAddress}`}
                              >
                                <FiMail />
                              </a>
                            ) : (
                              <span
                                className="parent-action disabled"
                                aria-label={`No email for ${parent.name}`}
                                title="No email available"
                              >
                                <FiMail />
                              </span>
                            )}
                            {phoneNumber ? (
                              <a
                                className="parent-action"
                                href={`tel:${phoneNumber}`}
                                aria-label={`Call ${parent.name}`}
                                title={`Call ${phoneNumber}`}
                              >
                                <FiPhone />
                              </a>
                            ) : (
                              <span
                                className="parent-action disabled"
                                aria-label={`No phone for ${parent.name}`}
                                title="No phone number available"
                              >
                                <FiPhone />
                              </span>
                            )}
                            <div className="parent-menu-wrap">
                              <button
                                className="parent-action"
                                aria-label={`More options for ${parent.name}`}
                                onClick={(event) => {
                                  const rect =
                                    event.currentTarget.getBoundingClientRect();
                                  setMenuPosition({
                                    top: rect.top + rect.height + 6,
                                    left: rect.left + rect.width - 150,
                                  });
                                  setMenuParentId(
                                    menuParentId === parent.id
                                      ? null
                                      : parent.id,
                                  );
                                }}
                              >
                                <FiMoreHorizontal />
                              </button>
                              {menuParentId === parent.id && (
                                <div
                                  className="parent-menu"
                                  style={{
                                    top: `${menuPosition.top}px`,
                                    left: `${menuPosition.left}px`,
                                  }}
                                >
                                  <a
                                    href={
                                      emailAddress
                                        ? `mailto:${emailAddress}`
                                        : "#"
                                    }
                                    className={`parent-menu-item${
                                      !emailAddress ? " disabled" : ""
                                    }`}
                                    onClick={(event) => {
                                      if (!emailAddress) {
                                        event.preventDefault();
                                        return;
                                      }
                                      setMenuParentId(null);
                                    }}
                                  >
                                    <FiMail />
                                    <span>Send email</span>
                                  </a>
                                  <a
                                    href={
                                      phoneNumber ? `tel:${phoneNumber}` : "#"
                                    }
                                    className={`parent-menu-item${
                                      !phoneNumber ? " disabled" : ""
                                    }`}
                                    onClick={(event) => {
                                      if (!phoneNumber) {
                                        event.preventDefault();
                                        return;
                                      }
                                      setMenuParentId(null);
                                    }}
                                  >
                                    <FiPhone />
                                    <span>Call parent</span>
                                  </a>
                                  <a
                                    href={
                                      phoneNumber ? `sms:${phoneNumber}` : "#"
                                    }
                                    className={`parent-menu-item${
                                      !phoneNumber ? " disabled" : ""
                                    }`}
                                    onClick={(event) => {
                                      if (!phoneNumber) {
                                        event.preventDefault();
                                        return;
                                      }
                                      setMenuParentId(null);
                                    }}
                                  >
                                    <FiMessageSquare />
                                    <span>Send SMS</span>
                                  </a>
                                  <button
                                    type="button"
                                    className="parent-menu-item button-link"
                                    onClick={() =>
                                      openParentView(parent, "details")
                                    }
                                  >
                                    <FiEye />
                                    <span>View details</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="parent-menu-item button-link"
                                    onClick={() =>
                                      openParentView(parent, "profile")
                                    }
                                  >
                                    <FiUser />
                                    <span>Parent profile</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : null}
                </tbody>
              </table>
              {!loading && filteredParents.length === 0 && (
                <div className="empty-parents">
                  No parents match your search.
                </div>
              )}
            </div>
            <div className="parents-footer">
              <span>
                Showing {filteredParents.length ? startIndex + 1 : 0} to{" "}
                {Math.min(startIndex + pageSize, filteredParents.length)} of{" "}
                {filteredParents.length} parents
              </span>
              <div>
                <button
                  disabled={currentPage === 1}
                  onClick={() => changePage(currentPage - 1)}
                >
                  ‹
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={pageNumber === currentPage ? "current-page" : ""}
                    onClick={() => changePage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => changePage(currentPage + 1)}
                >
                  ›
                </button>
              </div>
              <label>
                Rows per page{" "}
                <select
                  value={pageSize}
                  onChange={(event) => {
                    const nextSize = Number(event.target.value);
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                >
                  <option onChange={() => setPageSize(10)} value={10}>
                    10
                  </option>
                  <option onChange={() => setPageSize(25)} value={25}>
                    25
                  </option>
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
                  <strong>{parents.length}</strong>
                  <small>Total</small>
                </div>
              </div>
              <div className="parent-legend">
                <p>
                  <i className="dot active-dot" />
                  Active <b>{activeParents}</b>
                </p>
                <p>
                  <i className="dot inactive-dot" />
                  Inactive{" "}
                  <b>
                    {
                      parents.filter((parent) => parent.status === "Inactive")
                        .length
                    }
                  </b>
                </p>
                <p>
                  <i className="dot unverified-dot" />
                  Unverified <b>{parents.length - activeParents}</b>
                </p>
              </div>
            </section>
          </aside>
        </section>
      </div>
      {selectedParent && (
        <div
          className="parent-modal-backdrop"
          onClick={() => setSelectedParent(null)}
        >
          <div
            className="parent-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="parent-modal-header">
              <div className="parent-modal-identity">
                <div className="parent-modal-avatar">
                  {selectedParent.avatar ? (
                    <img
                      src={selectedParent.avatar}
                      alt={`${selectedParent.name} profile`}
                    />
                  ) : (
                    initials(selectedParent.name)
                  )}
                </div>
                <div>
                  <p className="page-kicker">
                    Parent {selectedView === "profile" ? "Profile" : "Details"}
                  </p>
                  <h2>{selectedParent.name}</h2>
                </div>
              </div>
              <button
                type="button"
                className="parent-modal-close"
                onClick={() => setSelectedParent(null)}
              >
                ×
              </button>
            </div>

            <div className="parent-modal-grid">
              <div className="parent-modal-card">
                <h3>
                  {selectedView === "profile"
                    ? "Profile overview"
                    : "Contact details"}
                </h3>
                <div className="parent-detail-list">
                  <div className="parent-detail-item">
                    <span>Parent ID</span>
                    <strong>{selectedParent.displayId}</strong>
                  </div>
                  <div className="parent-detail-item">
                    <span>Email</span>
                    <strong>{selectedParent.email}</strong>
                  </div>
                  <div className="parent-detail-item">
                    <span>Phone</span>
                    <strong>{selectedParent.phone}</strong>
                  </div>
                  <div className="parent-detail-item">
                    <span>Relationship</span>
                    <strong>{selectedParent.relationship}</strong>
                  </div>
                  <div className="parent-detail-item">
                    <span>Status</span>
                    <strong>{selectedParent.status}</strong>
                  </div>
                  <div className="parent-detail-item">
                    <span>Joined on</span>
                    <strong>{selectedParent.joined}</strong>
                  </div>
                </div>
              </div>

              <div className="parent-modal-card">
                <h3>Linked students</h3>
                {selectedParent.children.length ? (
                  <ul className="parent-student-list">
                    {selectedParent.children.map((child) => {
                      const childAvatar =
                        child.avatar ||
                        child.profile_picture ||
                        child.image ||
                        child.photo_url ||
                        "";
                      const childName =
                        child.name || child.displayName || "Unnamed child";
                      const childId =
                        child.displayId || child.id?.slice(0, 10) || "N/A";
                      const childGrade =
                        child.grade ||
                        child.grade_level ||
                        child.class_name ||
                        child.className ||
                        "Grade not assigned";
                      const childStatus =
                        child.status ||
                        (child.is_active === false ? "Inactive" : "Active");
                      const childRoute =
                        child.route_name || "No route assigned";

                      return (
                        <li
                          key={child.id || child.name}
                          className="parent-student-item"
                        >
                          <div className="parent-student-meta">
                            <span className="parent-student-avatar">
                              {childAvatar ? (
                                <img
                                  src={childAvatar}
                                  alt={`${childName} profile`}
                                />
                              ) : (
                                childName
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                              )}
                            </span>
                            <div>
                              <span>{childName}</span>
                              <small>{childId}</small>
                            </div>
                          </div>
                          <div className="parent-student-details">
                            <small>Grade: {childGrade}</small>
                            <small>Status: {childStatus}</small>
                            <small>Route: {childRoute}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="empty-parent-modal">No linked students</p>
                )}
              </div>
            </div>

            <div className="parent-modal-actions">
              {selectedParent.email !== "No email" && (
                <a href={`mailto:${selectedParent.email}`}>
                  <FiMail /> Email
                </a>
              )}
              {selectedParent.phone !== "No phone number" && (
                <a href={`tel:${selectedParent.phone.replace(/\s+/g, "")}`}>
                  <FiPhone /> Call
                </a>
              )}
              {selectedParent.phone !== "No phone number" && (
                <a href={`sms:${selectedParent.phone.replace(/\s+/g, "")}`}>
                  <FiMessageSquare /> SMS
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Parents;
