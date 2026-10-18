import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiBookOpen,
  FiExternalLink,
  FiFileText,
  FiSave,
  FiSettings as SettingsIcon,
  FiUpload,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { apiRequest } from "../api";
import { canManageUsers } from "../accessControl";
import Members from "./Members";
import { supabaseClient } from "../supabaseClient";
import "../styles/settings.css";

const educationDistrictsAndProvinces = {
  "Eastern Cape": [
    "Alfred Nzo East",
    "Alfred Nzo West",
    "Amathole East",
    "Amathole West",
    "Buffalo City",
    "Chris Hani East",
    "Chris Hani West",
    "Joe Gqabi",
    "Maluti",
    "Mbizana",
    "Mt Fletcher",
    "Mt Frere",
    "Mthatha",
    "Mzimkhulu",
    "Ngcobo",
    "Nelson Mandela",
    "North Eastern",
    "Northern",
    "O R Tambo Coastal",
    "O R Tambo Inland",
    "Port Elizabeth",
    "Queenstown",
    "Qumbu",
    "Sarah Baartman",
    "Sterkspruit",
    "Uitenhage",
    "Western",
    "Other",
  ],

  "Free State": [
    "Fezile Dabi",
    "Lejweleputswa",
    "Mangaung Metropolitan",
    "Thabo Mofutsanyana",
    "Xhariep",
    "Other",
  ],

  Gauteng: [
    "Ekurhuleni North",
    "Ekurhuleni South",
    "Gauteng East",
    "Gauteng North",
    "Gauteng West",
    "Johannesburg Central",
    "Johannesburg East",
    "Johannesburg North",
    "Johannesburg South",
    "Johannesburg West",
    "Sedibeng East",
    "Sedibeng West",
    "Tshwane North",
    "Tshwane South",
    "Tshwane West",
    "Other",
  ],

  "KwaZulu-Natal": [
    "Amajuba",
    "Harry Gwala",
    "iLembe",
    "King Cetshwayo",
    "Pinetown",
    "Ugu",
    "uMgungundlovu",
    "uMkhanyakude",
    "uMnyango",
    "uMzinyathi",
    "uThukela",
    "Umlazi",
    "Zululand",
    "Other",
  ],

  Limpopo: [
    "Capricorn North",
    "Capricorn South",
    "Mogalakwena",
    "Mopani East",
    "Mopani West",
    "Sekhukhune East",
    "Sekhukhune South",
    "Vhembe East",
    "Vhembe West",
    "Waterberg",
    "Other",
  ],

  Mpumalanga: ["Bohlabela", "Ehlanzeni", "Gert Sibande", "Nkangala", "Other"],

  "Northern Cape": [
    "Frances Baard",
    "John Taolo Gaetsewe",
    "Namaqua",
    "Pixley Ka Seme",
    "ZF Mgcawu",
    "Other",
  ],

  "North West": [
    "Bojanala",
    "Brits",
    "Ditsobotla",
    "Greater Delareyville",
    "Greater Taung",
    "Kagisano Molopo",
    "Kgetleng APO",
    "Kgetleng River",
    "Lichtenburg",
    "Madibeng",
    "Mafikeng",
    "Maquassi Hills",
    "Matlosana",
    "Moretele",
    "Moses Kotane East",
    "Moses Kotane West",
    "Ngaka Modiri Molema",
    "Ramotshere",
    "Rekopantswe",
    "Rustenburg",
    "Taung",
    "Tlokwe",
    "Other",
  ],

  "Western Cape": [
    "Cape Winelands",
    "Eden & Central Karoo",
    "Metro Central",
    "Metro East",
    "Metro North",
    "Metro South",
    "Overberg",
    "West Coast",
    "Other",
  ],

  Other: ["Other"],
};

const emptyProfile = {
  name: "",
  emis_number: "",
  school_email: "",
  phone: "",
  principal_name: "",
  contact_person: "",
  address: "",
  province: "",
  district: "",
  logo: "",
  latitude: "",
  longitude: "",
  start_time: "",
  end_time: "",
};

const emptyUserProfile = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  role: "",
  avatar: null,
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const formatRole = (role) =>
  String(role || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const schoolProfileFields = [
  "name",
  "emis_number",
  "school_email",
  "phone",
  "principal_name",
  "contact_person",
  "address",
  "province",
  "district",
  "logo",
  "latitude",
  "longitude",
  "start_time",
  "end_time",
];

const requiredSchoolFields = [
  "name",
  "emis_number",
  "school_email",
  "phone",
  "principal_name",
  "address",
  "province",
  "district",
  "logo",
  "latitude",
  "longitude",
  "start_time",
  "end_time",
];

function Settings() {
  const navigate = useNavigate();
  const [active, setActive] = useState("School Profile");
  const [membersFormOpen, setMembersFormOpen] = useState(false);
  const [passwordFieldsVisible, setPasswordFieldsVisible] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
      const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      return cached?.data ? { ...emptyProfile, ...cached.data } : emptyProfile;
    } catch {
      return emptyProfile;
    }
  });
  const [districtOtherSelected, setDistrictOtherSelected] = useState(() => {
    const currentProfile = (() => {
      try {
        const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
        const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
        return JSON.parse(localStorage.getItem(cacheKey) || "null")?.data;
      } catch {
        return null;
      }
    })();
    const districts = educationDistrictsAndProvinces[currentProfile?.province];
    return Boolean(
      currentProfile?.district &&
      (!districts || !districts.includes(currentProfile.district)),
    );
  });
  const [userProfile, setUserProfile] = useState(emptyUserProfile);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarImageOpen, setAvatarImageOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState("");
  const [auditLogRefresh, setAuditLogRefresh] = useState(0);
  const logoPreviewRef = useRef("");
  const avatarPreviewRef = useRef("");
  const items = [
    [FiBookOpen, "School Profile"],
    [FiUser, "User Profile"],
    [FiFileText, "Subscriptions"],
    [FiFileText, "Audit Logs"],
  ];
  const userProfileIncomplete = [
    userProfile.first_name,
    userProfile.last_name,
    userProfile.email,
    userProfile.phone,
    userProfile.job_title,
    userProfile.role,
  ].some((value) => !String(value || "").trim());
  const schoolProfileIncomplete = requiredSchoolFields.some(
    (field) => !String(profile[field] || "").trim(),
  );
  const hasSelectedProvince = Object.prototype.hasOwnProperty.call(
    educationDistrictsAndProvinces,
    profile.province,
  );
  const settingsProfileIncomplete =
    schoolProfileIncomplete || userProfileIncomplete;
  const accessLevel = userProfile.access_level;
  const visibleItems = items.filter((item) => {
    const title = item[1];
    if (title === "Users & Roles") return canManageUsers(accessLevel);
    return true;
  });

  useEffect(() => {
    if (active !== "Audit Logs") return undefined;
    let activeRequest = true;
    const timeout = window.setTimeout(async () => {
      setAuditLogsLoading(true);
      setAuditLogsError("");
      let token;
      try {
        token = JSON.parse(localStorage.getItem("schoolAuth") || "{}").token;
      } catch {
        if (activeRequest) {
          setAuditLogsError(
            "Your session could not be read. Please sign in again.",
          );
          setAuditLogsLoading(false);
        }
        return;
      }
      if (!token) {
        if (activeRequest) {
          setAuditLogsError("Your session has expired. Please sign in again.");
          setAuditLogsLoading(false);
        }
        return;
      }
      try {
        const logs = await apiRequest("/school/audit-logs", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        if (activeRequest) setAuditLogs(Array.isArray(logs) ? logs : []);
      } catch (requestError) {
        if (activeRequest) {
          setAuditLogsError(
            requestError.message || "Unable to load audit logs.",
          );
        }
      } finally {
        if (activeRequest) setAuditLogsLoading(false);
      }
    }, 0);
    return () => {
      activeRequest = false;
      window.clearTimeout(timeout);
    };
  }, [active, auditLogRefresh]);

  useEffect(() => {
    let activeRequest = true;
    let auth = {};
    try {
      auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
    } catch {
      // Fetch the profile when local storage does not contain valid data.
    }

    apiRequest("/school/profile", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((school) => {
        if (!activeRequest) return;
        setProfile({ ...emptyProfile, ...school });
        const districts = educationDistrictsAndProvinces[school.province];
        setDistrictOtherSelected(
          Boolean(
            school.district &&
            (!districts || !districts.includes(school.district)),
          ),
        );
        const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: school, timestamp: Date.now() }),
        );
      })
      .catch((requestError) => {
        if (activeRequest)
          setError(requestError.message || "Unable to load school profile.");
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });

    apiRequest("/school/admin/profile", {
      headers: { Authorization: `Bearer ${auth.token || ""}` },
    })
      .then((adminProfile) => {
        if (activeRequest) {
          setUserProfile({ ...emptyUserProfile, ...adminProfile });
          const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
          try {
            const cached = JSON.parse(
              localStorage.getItem(cacheKey) || "null",
            );
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: {
                  ...(cached?.data || {}),
                  admin_profile: adminProfile,
                },
                timestamp: Date.now(),
              }),
            );
          } catch {
            // Profile loading remains successful if the browser cache is unavailable.
          }
          window.dispatchEvent(
            new CustomEvent("school-profile-updated", {
              detail: { admin_profile: adminProfile },
            }),
          );
        }
      })
      .catch((requestError) => {
        if (activeRequest) {
          setError(requestError.message || "Unable to load user profile.");
        }
      })
      .finally(() => {
        if (activeRequest) setUserProfileLoading(false);
      });

    return () => {
      activeRequest = false;
    };
  }, []);

  useEffect(() => {
    if (!supabaseClient || !profile.id) return undefined;

    let auth = {};
    try {
      auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
    } catch {
      // Realtime remains available without a custom access token.
    }

    const channel = supabaseClient
      .channel(`school-settings:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schools",
          filter: `id=eq.${profile.id}`,
        },
        ({ new: nextSchool }) => {
          if (nextSchool?.id) {
            setProfile((current) => ({ ...current, ...nextSchool }));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_admins",
          filter: `school_id=eq.${profile.id}`,
        },
        ({ new: nextAdmin }) => {
          if (nextAdmin?.user_id !== auth.user?.id) return;
          setUserProfile((current) => ({
            ...current,
            first_name: nextAdmin.first_name || "",
            last_name: nextAdmin.last_name || "",
            phone: nextAdmin.phone || "",
            job_title: nextAdmin.job_title || "",
            role: nextAdmin.role || "",
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${auth.user?.id || ""}`,
        },
        ({ new: nextUser }) => {
          if (nextUser?.id !== auth.user?.id) return;
          setUserProfile((current) => ({
            ...current,
            email: nextUser.email || current.email,
            phone: nextUser.phone || current.phone,
          }));
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [profile.id]);

  useEffect(
    () => () => {
      if (logoPreviewRef.current) {
        URL.revokeObjectURL(logoPreviewRef.current);
      }
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!avatarImageOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAvatarImageOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [avatarImageOpen]);

  const updateProfile = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
    setError("");
    setSaved(false);
  };

  const updateProvince = (event) => {
    const province = event.target.value;
    setProfile((current) => ({ ...current, province, district: "" }));
    setDistrictOtherSelected(false);
    setError("");
    setSaved(false);
  };

  const updateDistrictSelection = (event) => {
    const district = event.target.value;
    const isOther = district === "__other__";
    setDistrictOtherSelected(isOther);
    setProfile((current) => ({
      ...current,
      district: isOther ? "" : district,
    }));
    setError("");
    setSaved(false);
  };

  const updateUserProfile = (field) => (event) => {
    setUserProfile((current) => ({ ...current, [field]: event.target.value }));
    setError("");
    setSaved(false);
  };

  const selectLogo = (event) => {
    const file = event.target.files?.[0] || null;
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
    }
    logoPreviewRef.current = file ? URL.createObjectURL(file) : "";
    setLogoPreviewUrl(logoPreviewRef.current);
    setLogoFile(file);
    setError("");
    setSaved(false);
  };

  const selectAvatar = (event) => {
    const file = event.target.files?.[0] || null;
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }
    avatarPreviewRef.current = file ? URL.createObjectURL(file) : "";
    setAvatarPreviewUrl(avatarPreviewRef.current);
    setAvatarFile(file);
    setError("");
    setSaved(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
      let profileToSave = Object.fromEntries(
        schoolProfileFields.map((field) => [field, profile[field]]),
      );
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        const uploadedSchool = await apiRequest("/school/profile/logo", {
          method: "PUT",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: formData,
        });
        profileToSave.logo = uploadedSchool.logo;
      }
      const school = await apiRequest("/school/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth.token || ""}` },
        body: JSON.stringify(profileToSave),
      });
      setProfile({ ...emptyProfile, ...school });
      setLogoFile(null);
      const cacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: {
            ...school,
            admin_profile: {
              id: userProfile.id,
              user_id: userProfile.user_id,
              first_name: userProfile.first_name,
              last_name: userProfile.last_name,
              email: userProfile.email,
              phone: userProfile.phone,
              job_title: userProfile.job_title,
              role: userProfile.role,
              access_level: userProfile.access_level,
              avatar: userProfile.avatar,
            },
          },
          timestamp: Date.now(),
        }),
      );
      window.dispatchEvent(
        new CustomEvent("school-profile-updated", {
          detail: school,
        }),
      );
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to save school profile.");
    } finally {
      setSaving(false);
    }
  };

  const saveUserProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
      if (
        (userProfile.current_password || userProfile.new_password) &&
        userProfile.new_password !== userProfile.confirm_password
      ) {
        throw new Error("New passwords do not match.");
      }
      let avatar = userProfile.avatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const uploaded = await apiRequest("/school/admin/profile/avatar", {
          method: "PUT",
          headers: { Authorization: `****** || ""}` },
          body: formData,
        });
        avatar = uploaded.avatar;
        setAvatarFile(null);
        setAvatarPreviewUrl("");
        if (avatarPreviewRef.current) {
          URL.revokeObjectURL(avatarPreviewRef.current);
          avatarPreviewRef.current = "";
        }
        setUserProfile((current) => ({ ...current, avatar }));
        const profileCacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
        const avatarAdminProfile = {
          id: userProfile.id,
          user_id: userProfile.user_id,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          email: userProfile.email,
          phone: userProfile.phone,
          job_title: userProfile.job_title,
          role: userProfile.role,
          access_level: userProfile.access_level,
          avatar,
        };
        try {
          const cached = JSON.parse(
            localStorage.getItem(profileCacheKey) || "null",
          );
          localStorage.setItem(
            profileCacheKey,
            JSON.stringify({
              data: {
                ...(cached?.data || {}),
                admin_profile: {
                  ...(cached?.data?.admin_profile || {}),
                  ...avatarAdminProfile,
                },
              },
              timestamp: Date.now(),
            }),
          );
        } catch {
          // The uploaded image remains available even if the browser cache is unavailable.
        }
        window.dispatchEvent(
          new CustomEvent("school-profile-updated", {
            detail: { admin_profile: avatarAdminProfile },
          }),
        );
      }
      const updated = await apiRequest("/school/admin/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userProfile),
      });
      const profileCacheKey = `schoolProfileCache:${auth.user?.id || "current"}`;
      try {
        const cached = JSON.parse(
          localStorage.getItem(profileCacheKey) || "null",
        );
        localStorage.setItem(
          profileCacheKey,
          JSON.stringify({
            data: {
              ...(cached?.data || {}),
              admin_profile: {
                ...(cached?.data?.admin_profile || {}),
                ...updated,
              },
            },
            timestamp: Date.now(),
          }),
        );
      } catch {
        // Profile save remains successful if the browser cache is unavailable.
      }
      if (userProfile.current_password || userProfile.new_password) {
        await apiRequest("/school/admin/password", {
          method: "PUT",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: JSON.stringify({
            currentPassword: userProfile.current_password,
            newPassword: userProfile.new_password,
          }),
        });
      }
      setUserProfile({ ...emptyUserProfile, ...updated, avatar });
      setPasswordFieldsVisible(false);
      setSaved(true);
      window.dispatchEvent(
        new CustomEvent("school-profile-updated", {
          detail: { admin_profile: updated },
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to save user profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Settings</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <SettingsIcon />
            <input placeholder="Search anything..." />
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
      </header>
      <div className="portal-content settings-content">
        <section className="settings-heading">
          <div>
            <p className="page-kicker">ADMINISTRATION</p>
            <h1>Settings</h1>
            <p>Manage your school settings and preferences.</p>
            {settingsProfileIncomplete && (
              <div className="settings-incomplete-banner" role="alert">
                Complete all required School Profile and User Profile fields to
                unlock the remaining settings.
              </div>
            )}
          </div>
          {active === "Users & Roles" && canManageUsers(accessLevel) ? (
            <button
              className="member-primary"
              onClick={() => setMembersFormOpen(true)}
            >
              <FiUsers /> Add staff member
            </button>
          ) : active === "Subscriptions" ? (
            <button
              className="settings-save"
              type="button"
              onClick={() => navigate("/billing")}
            >
              <FiExternalLink /> Manage subscription
            </button>
          ) : active === "Audit Logs" ? null : (
            <button
              type="submit"
              form={
                active === "User Profile"
                  ? "school-user-profile-form"
                  : "school-profile-form"
              }
              className="settings-save"
              disabled={
                saving ||
                (active === "User Profile" ? userProfileLoading : loading)
              }
            >
              <FiSave />{" "}
              {saving
                ? passwordFieldsVisible && active === "User Profile"
                  ? "Updating password..."
                  : "Saving..."
                : saved
                  ? "Saved"
                  : passwordFieldsVisible && active === "User Profile"
                    ? "Update password"
                    : "Save changes"}
            </button>
          )}
        </section>
        <section className="settings-layout">
          <aside className="settings-menu">
            <h2>Settings</h2>
            {visibleItems.map(([Icon, title]) => (
              <button
                key={title}
                className={`${active === title ? "active" : ""}${
                  (title === "User Profile" && userProfileIncomplete) ||
                  (title === "School Profile" && schoolProfileIncomplete)
                    ? " incomplete"
                    : ""
                }`}
                onClick={() => setActive(title)}
              >
                <Icon />
                {title}
              </button>
            ))}
          </aside>
          <main className="settings-main">
            {active === "Users & Roles" && canManageUsers(accessLevel) ? (
              <Members
                formOpen={membersFormOpen}
                setFormOpen={setMembersFormOpen}
              />
            ) : active === "Audit Logs" ? (
              <section className="settings-card settings-audit-card">
                <div className="settings-card-heading">
                  <div>
                    <h2>Audit logs</h2>
                    <p>
                      Recent recorded actions by active administrators at this
                      school. Showing up to 100 entries.
                    </p>
                  </div>
                  <button
                    className="settings-refresh-button"
                    type="button"
                    onClick={() => setAuditLogRefresh((current) => current + 1)}
                  >
                    Refresh
                  </button>
                </div>
                {auditLogsError && (
                  <div className="settings-form-error">{auditLogsError}</div>
                )}
                {auditLogsLoading ? (
                  <p className="settings-empty-state">Loading audit logs...</p>
                ) : auditLogs.length ? (
                  <div className="settings-audit-table-wrap">
                    <table className="settings-audit-table">
                      <thead>
                        <tr>
                          <th>Date and time</th>
                          <th>Staff member</th>
                          <th>Action</th>
                          <th>Entity</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString()
                                : "—"}
                            </td>
                            <td>
                              {log.users?.name || log.users?.email || "—"}
                            </td>
                            <td>{log.action || "—"}</td>
                            <td>
                              {[log.entity_type, log.entity_id]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </td>
                            <td>
                              {log.metadata && Object.keys(log.metadata).length
                                ? JSON.stringify(log.metadata)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="settings-empty-state">
                    No activity has been recorded for school staff yet.
                  </p>
                )}
              </section>
            ) : active === "Subscriptions" ? (
              <section className="settings-card settings-action-card">
                <div className="settings-card-heading">
                  <div>
                    <h2>Subscriptions</h2>
                    <p>
                      View your school plan, renewal details, invoices, and
                      payment options.
                    </p>
                  </div>
                </div>
                <button
                  className="settings-link-button"
                  type="button"
                  onClick={() => navigate("/billing")}
                >
                  <FiFileText /> Open subscription and billing{" "}
                  <FiExternalLink />
                </button>
              </section>
            ) : active === "User Profile" ? (
              <form
                id="school-user-profile-form"
                className="settings-card"
                onSubmit={saveUserProfile}
              >
                <div className="settings-card-heading">
                  <div>
                    <h2>User Profile</h2>
                    <p>Update your personal account and contact details.</p>
                  </div>
                </div>
                {error && <div className="settings-form-error">{error}</div>}
                <button
                  type="button"
                  className="settings-password-toggle settings-form-wide"
                  aria-expanded={passwordFieldsVisible}
                  aria-controls="school-password-fields"
                  onClick={() => {
                    if (passwordFieldsVisible) {
                      setUserProfile((current) => ({
                        ...current,
                        current_password: "",
                        new_password: "",
                        confirm_password: "",
                      }));
                    }
                    setPasswordFieldsVisible((visible) => !visible);
                  }}
                >
                  {passwordFieldsVisible
                    ? "Hide password fields"
                    : "Change password"}
                </button>
                {passwordFieldsVisible ? (
                  <div
                    id="school-password-fields"
                    className="settings-form-grid settings-password-fields"
                  >
                    <label>
                      Current Password
                      <input
                        type="password"
                        value={userProfile.current_password}
                        onChange={updateUserProfile("current_password")}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        required
                      />
                    </label>
                    <label>
                      New Password
                      <input
                        type="password"
                        value={userProfile.new_password}
                        onChange={updateUserProfile("new_password")}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                    </label>
                    <label>
                      Confirm New Password
                      <input
                        type="password"
                        value={userProfile.confirm_password}
                        onChange={updateUserProfile("confirm_password")}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="settings-admin-avatar">
                      {avatarPreviewUrl || userProfile.avatar ? (
                        <button
                          className="settings-avatar-preview-button"
                          type="button"
                          onClick={() => setAvatarImageOpen(true)}
                          aria-label="View profile picture"
                        >
                          <img
                            src={avatarPreviewUrl || userProfile.avatar}
                            alt={`${userProfile.first_name || "School admin"} profile`}
                          />
                        </button>
                      ) : (
                        <FiUser aria-hidden="true" />
                      )}
                      <div>
                        <strong>Profile picture</strong>
                        <p>
                          Choose a photo for your school administrator account.
                        </p>
                        <label className="settings-link-button">
                          <FiUpload /> Choose image
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={selectAvatar}
                            hidden
                          />
                        </label>
                        {avatarFile && (
                          <span className="settings-avatar-pending">
                            Save the profile to upload this image.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="settings-form-grid">
                      <label>
                        First Name
                        <input
                          value={userProfile.first_name}
                          onChange={updateUserProfile("first_name")}
                          required
                        />
                      </label>
                      <label>
                        Last Name
                        <input
                          value={userProfile.last_name}
                          onChange={updateUserProfile("last_name")}
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={userProfile.email}
                          required
                          disabled
                          title="Email address cannot be changed here"
                        />
                      </label>
                      <label>
                        Phone Number
                        <input
                          value={userProfile.phone}
                          onChange={updateUserProfile("phone")}
                          required
                        />
                      </label>
                      <label>
                        Job Title
                        <input
                          value={userProfile.job_title}
                          required
                          disabled
                          title="Job title cannot be changed here"
                        />
                      </label>
                      <label>
                        Role
                        <input
                          value={formatRole(userProfile.role)}
                          disabled={Boolean(userProfile.role)}
                        />
                      </label>
                    </div>
                  </>
                )}
              </form>
            ) : (
              <form
                id="school-profile-form"
                className="settings-card"
                onSubmit={saveProfile}
              >
                <div className="settings-card-heading">
                  <div>
                    <h2>
                      {active === "General Settings"
                        ? "General settings"
                        : "School Profile"}
                    </h2>
                    <p>
                      {active === "General Settings"
                        ? "Keep the school's main contact details current."
                        : "Complete the information stored for your school."}
                    </p>
                  </div>
                </div>
                {error && <div className="settings-form-error">{error}</div>}
                {active === "General Settings" ? (
                  <div className="settings-form-grid">
                    <label>
                      School Email
                      <input
                        type="email"
                        value={profile.school_email}
                        onChange={updateProfile("school_email")}
                        required
                      />
                    </label>
                    <label>
                      School Phone Number
                      <input
                        value={profile.phone}
                        onChange={updateProfile("phone")}
                        required
                      />
                    </label>
                    <label>
                      Principal Name
                      <input
                        value={profile.principal_name}
                        onChange={updateProfile("principal_name")}
                        required
                      />
                    </label>
                    <label>
                      Contact Person
                      <input
                        value={profile.contact_person}
                        onChange={updateProfile("contact_person")}
                      />
                    </label>
                    <label className="settings-form-wide">
                      School Address
                      <input
                        value={profile.address}
                        onChange={updateProfile("address")}
                        required
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="settings-form-grid">
                      <label>
                        School Name
                        <input
                          value={profile.name}
                          onChange={updateProfile("name")}
                          required
                          disabled
                        />
                      </label>
                      <label>
                        EMIS Number
                        <input
                          value={profile.emis_number}
                          onChange={updateProfile("emis_number")}
                          required
                          disabled
                        />
                      </label>
                      <label>
                        School Email
                        <input
                          type="email"
                          value={profile.school_email}
                          onChange={updateProfile("school_email")}
                          required
                        />
                      </label>
                      <label>
                        School Phone Number
                        <input
                          value={profile.phone}
                          onChange={updateProfile("phone")}
                          required
                        />
                      </label>
                      <label>
                        Principal Name
                        <input
                          value={profile.principal_name}
                          onChange={updateProfile("principal_name")}
                          required
                        />
                      </label>
                      <label>
                        Address
                        <input
                          value={profile.address}
                          onChange={updateProfile("address")}
                          required
                          disabled
                        />
                      </label>
                      <label className="settings-select-field">
                        Province
                        <select
                          value={profile.province}
                          onChange={updateProvince}
                          required
                        >
                          <option value="">Select province</option>
                          {Object.keys(educationDistrictsAndProvinces)
                            .filter((province) => province !== "Other")
                            .map((province) => (
                              <option key={province} value={province}>
                                {province}
                              </option>
                            ))}
                          <option value="Other">Other</option>
                        </select>
                      </label>
                      <label className="settings-select-field">
                        Education district
                        <select
                          value={
                            districtOtherSelected
                              ? "__other__"
                              : profile.district
                          }
                          onChange={updateDistrictSelection}
                          disabled={!hasSelectedProvince}
                          required={!districtOtherSelected}
                        >
                          <option value="">Select district</option>
                          {(
                            educationDistrictsAndProvinces[profile.province] ||
                            []
                          )
                            .filter((district) => district !== "Other")
                            .map((district) => (
                              <option key={district} value={district}>
                                {district}
                              </option>
                            ))}
                          <option value="__other__">
                            Other (enter district)
                          </option>
                        </select>
                      </label>
                      {districtOtherSelected && (
                        <label>
                          District name
                          <input
                            value={profile.district}
                            onChange={updateProfile("district")}
                            placeholder="Enter your education district"
                            disabled={!hasSelectedProvince}
                            required
                          />
                        </label>
                      )}
                      <label>
                        Latitude
                        <input
                          type="number"
                          step="any"
                          value={profile.latitude}
                          onChange={updateProfile("latitude")}
                          disabled
                        />
                      </label>
                      <label>
                        Longitude
                        <input
                          type="number"
                          step="any"
                          value={profile.longitude}
                          onChange={updateProfile("longitude")}
                          disabled
                        />
                      </label>
                      <label>
                        Start Time
                        <input
                          type="time"
                          value={profile.start_time}
                          onChange={updateProfile("start_time")}
                        />
                      </label>
                      <label>
                        End Time
                        <input
                          type="time"
                          value={profile.end_time}
                          onChange={updateProfile("end_time")}
                        />
                      </label>
                    </div>
                    <div className="logo-upload">
                      <label>
                        School Logo
                        {profile.logo || logoPreviewUrl ? (
                          <img
                            className="logo-preview-image"
                            src={logoPreviewUrl || profile.logo}
                            alt="Current school logo"
                          />
                        ) : (
                          <div className="logo-preview">No logo uploaded</div>
                        )}
                      </label>
                      <label className="logo-upload-button">
                        <FiUpload />
                        <strong>
                          {logoFile ? logoFile.name : "Choose image"}
                        </strong>
                        <small>PNG, JPG, WEBP or GIF up to 5MB</small>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={selectLogo}
                        />
                      </label>
                    </div>
                  </>
                )}
              </form>
            )}
          </main>
        </section>
      </div>
      {avatarImageOpen && (avatarPreviewUrl || userProfile.avatar) && (
        <div
          className="settings-avatar-modal-backdrop"
          onClick={() => setAvatarImageOpen(false)}
        >
          <div
            className="settings-avatar-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Profile picture preview"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="settings-avatar-modal-close"
              type="button"
              onClick={() => setAvatarImageOpen(false)}
              aria-label="Close profile picture preview"
            >
              <FiX />
            </button>
            <img
              src={avatarPreviewUrl || userProfile.avatar}
              alt={`${userProfile.first_name || "School admin"} profile picture`}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
