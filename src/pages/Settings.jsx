import { useEffect, useState } from "react";
import {
  FiBell,
  FiBookOpen,
  FiCloud,
  FiFileText,
  FiSave,
  FiSettings as SettingsIcon,
  FiShield,
  FiTruck,
  FiUpload,
  FiUsers,
} from "react-icons/fi";
import { apiRequest } from "../api";
import "../styles/settings.css";

const emptyProfile = {
  name: "",
  emis_number: "",
  email: "",
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

function Settings() {
  const [active, setActive] = useState("School Profile");
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
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [toggles, setToggles] = useState({
    dark: false,
    email: true,
    attendance: true,
    maintenance: false,
    parent: true,
    alerts: true,
  });
  const items = [
    [FiBookOpen, "School Profile"],
    [SettingsIcon, "General Settings"],
    [FiUsers, "Users & Roles"],
    [FiBell, "Notifications"],
    [FiBookOpen, "Attendance Settings"],
    [FiTruck, "Transport Settings"],
    [FiShield, "Security"],
    [FiFileText, "Subscription"],
    [FiCloud, "Backup & Data"],
    [SettingsIcon, "Integrations"],
    [FiFileText, "Audit Logs"],
  ];
  const toggle = (key) =>
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  const settingRows = [
    ["dark", "Enable Dark Mode", "Switch between light and dark theme"],
    [
      "email",
      "Enable Email Notifications",
      "Send email notifications to users",
    ],
    [
      "attendance",
      "Auto Attendance",
      "Automatically mark attendance for trips",
    ],
    ["maintenance", "Maintenance Mode", "Put system in maintenance mode"],
    ["parent", "Allow Parent App Access", "Allow parents to access mobile app"],
    ["alerts", "Trip Alerts", "Send alerts for trip start and end"],
  ];

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

    return () => {
      activeRequest = false;
    };
  }, []);

  const updateProfile = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
    setError("");
    setSaved(false);
  };

  const selectLogo = (event) => {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);
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
      let profileToSave = profile;
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        const uploadedSchool = await apiRequest("/school/profile/logo", {
          method: "PUT",
          headers: { Authorization: `Bearer ${auth.token || ""}` },
          body: formData,
        });
        profileToSave = { ...profile, logo: uploadedSchool.logo };
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
        JSON.stringify({ data: school, timestamp: Date.now() }),
      );
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to save school profile.");
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
          </div>
          <button
            type="submit"
            form="school-profile-form"
            className="settings-save"
            disabled={saving || loading}
          >
            <FiSave /> {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
          </button>
        </section>
        <section className="settings-layout">
          <aside className="settings-menu">
            <h2>Settings</h2>
            {items.map(([Icon, title]) => (
              <button
                key={title}
                className={active === title ? "active" : ""}
                onClick={() => setActive(title)}
              >
                <Icon />
                {title}
              </button>
            ))}
          </aside>
          <main className="settings-main">
            <form
              id="school-profile-form"
              className="settings-card"
              onSubmit={saveProfile}
            >
              <div className="settings-card-heading">
                <div>
                  <h2>School Profile</h2>
                  <p>Complete the information stored for your school.</p>
                </div>
              </div>
              {error && <div className="settings-form-error">{error}</div>}
              <div className="settings-form-grid">
                <label>
                  School Name
                  <input
                    value={profile.name}
                    onChange={updateProfile("name")}
                    required
                  />
                </label>
                <label>
                  EMIS Number
                  <input
                    value={profile.emis_number}
                    onChange={updateProfile("emis_number")}
                    required
                  />
                </label>
                <label>
                  School Email
                  <input
                    type="email"
                    value={profile.email}
                    onChange={updateProfile("email")}
                    required
                  />
                </label>
                <label>
                  Phone Number
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
                <label>
                  Address
                  <input
                    value={profile.address}
                    onChange={updateProfile("address")}
                    required
                  />
                </label>
                <label>
                  Province
                  <input
                    value={profile.province}
                    onChange={updateProfile("province")}
                    required
                  />
                </label>
                <label>
                  District
                  <input
                    value={profile.district}
                    onChange={updateProfile("district")}
                  />
                </label>
                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={profile.latitude}
                    onChange={updateProfile("latitude")}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={profile.longitude}
                    onChange={updateProfile("longitude")}
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
                  {profile.logo ? (
                    <img
                      className="logo-preview-image"
                      src={profile.logo}
                      alt="Current school logo"
                    />
                  ) : (
                    <div className="logo-preview">No logo uploaded</div>
                  )}
                </label>
                <label className="logo-upload-button">
                  <FiUpload />
                  <strong>{logoFile ? logoFile.name : "Choose image"}</strong>
                  <small>PNG, JPG, WEBP or GIF up to 5MB</small>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={selectLogo}
                  />
                </label>
              </div>
            </form>
            <section className="settings-card general-card">
              <div className="settings-card-heading">
                <div>
                  <h2>General Settings</h2>
                  <p>Configure general preferences for the system.</p>
                </div>
              </div>
              <div className="toggle-grid">
                {settingRows.map(([key, title, description]) => (
                  <button
                    key={key}
                    className="toggle-setting"
                    onClick={() => toggle(key)}
                  >
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <i className={toggles[key] ? "on" : ""}>
                      <b />
                    </i>
                  </button>
                ))}
              </div>
            </section>
          </main>
        </section>
      </div>
    </>
  );
}

export default Settings;
