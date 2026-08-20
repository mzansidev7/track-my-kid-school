import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiBriefcase, FiCheck, FiLock, FiMail, FiUser } from "react-icons/fi";
import { apiRequest } from "../api";
import SchoolLocationPicker from "../components/SchoolLocationPicker";
import SchoolSearchInput from "../components/SchoolSearchInput";
import logo from "../assets/images/logo.png";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: searchParams.get("email") || "",
    password: "",
    confirmPassword: "",
    principal_name: "",
    address: "",
    latitude: null,
    longitude: null,
    emis_number: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [locationLocked, setLocationLocked] = useState(false);

  useEffect(() => {
    apiRequest("/schools")
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const trimmedName = form.name.trim();
    const trimmedPrincipalName = form.principal_name.trim();
    const trimmedAddress = form.address.trim();
    const hasCoordinates =
      Number.isFinite(Number(form.latitude)) &&
      Number.isFinite(Number(form.longitude));

    if (!trimmedName) {
      setError("Enter or select a school name.");
      return;
    }
    if (!trimmedPrincipalName) {
      setError("Enter the principal or contact person's name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Enter an email address.");
      return;
    }
    if (!trimmedAddress || !hasCoordinates) {
      setError("Select a school or map location before continuing.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/create-user", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          role: "school",
          ...(selectedSchool ? { school_id: selectedSchool.id } : {}),
        }),
      });
      setSuccess("Your school account was created. You can now sign in.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (requestError) {
      setError(requestError.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  const matchingSchools = schools.filter((school) =>
    `${school.name} ${school.address || ""}`
      .toLowerCase()
      .includes(schoolSearch.trim().toLowerCase()),
  );

  const chooseSchool = (school) => {
    if (school.is_active || school.latitude === null || school.longitude === null) {
      return;
    }
    setSelectedSchool(school);
    setLocationLocked(true);
    setSchoolSearch(school.name);
    setForm((current) => ({
      ...current,
      name: school.name,
      address: school.address || "",
      latitude: school.latitude,
      longitude: school.longitude,
    }));
  };

  const clearSchoolSelection = () => {
    setSelectedSchool(null);
    setLocationLocked(false);
    setSchoolSearch("");
    setForm((current) => ({
      ...current,
      name: "",
      address: "",
      latitude: null,
      longitude: null,
    }));
  };

  const chooseGooglePlace = (place) => {
    setSelectedSchool(null);
    setLocationLocked(true);
    setSchoolSearch(place.name);
    setForm((current) => ({
      ...current,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  };

  return (
    <main className="auth-shell register-shell">
      <section className="auth-intro register-intro">
        <img className="auth-brand-logo" src={logo} alt="Track My Kid" />
        <p className="eyebrow">SCHOOL REGISTRATION</p>
        <h1>Your school, ready for the day ahead.</h1>
        <p className="intro-copy">Complete your registration to start managing your school community in Track My Kid.</p>
        <ul className="benefit-list">
          <li><FiCheck /> Connect your school profile</li>
          <li><FiCheck /> Keep learner information organised</li>
          <li><FiCheck /> Coordinate with families and transport teams</li>
        </ul>
      </section>
      <section className="auth-panel registration-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">INVITED SCHOOL</p>
          <h2>Create your account</h2>
          <p>Your invitation email is already attached to this registration.</p>
        </div>
        <form onSubmit={submit} className="auth-form registration-form">
          <label>
            School name
            <SchoolSearchInput
              value={form.name}
              disabled={Boolean(selectedSchool)}
              onChange={(value) => {
                setSchoolSearch(value);
                setSelectedSchool(null);
                setLocationLocked(false);
                setForm((current) => ({ ...current, name: value }));
              }}
              onPlaceSelected={chooseGooglePlace}
            />
          </label>
          {!selectedSchool && form.name.trim() && matchingSchools.length > 0 && (
            <div className="school-results">
              {matchingSchools.slice(0, 6).map((school) => (
                <button type="button" key={school.id} disabled={school.is_active || school.latitude === null || school.longitude === null} onClick={() => chooseSchool(school)}>
                  <strong>{school.name}</strong>
                  <span>{school.address || "Address not set"} · {school.is_active ? "Already registered" : school.latitude === null || school.longitude === null ? "No map location" : "Select school"}</span>
                </button>
              ))}
            </div>
          )}
          {selectedSchool && <button type="button" className="change-school" onClick={clearSchoolSelection}>Change school</button>}
          <div className="form-grid">
            <label>Principal or contact person<span className="input-wrap"><FiUser /><input value={form.principal_name} onChange={update("principal_name")} required placeholder="Full name" /></span></label>
          </div>
          <label>Email address<span className="input-wrap"><FiMail /><input type="email" value={form.email} onChange={update("email")} required placeholder="school@example.com" /></span></label>
          <SchoolLocationPicker
            value={{
              address: form.address,
              latitude: form.latitude,
              longitude: form.longitude,
            }}
            onChange={(location) =>
              setForm((current) => ({
                ...current,
                address: location.address,
                latitude: location.latitude,
                longitude: location.longitude,
              }))
            }
            locked={locationLocked}
            onLocationSelected={() => setLocationLocked(true)}
          />
          <label>EMIS number <span className="optional">Optional</span><span className="input-wrap"><FiBriefcase /><input value={form.emis_number} onChange={update("emis_number")} placeholder="School registration number" /></span></label>
          <div className="form-grid">
            <label>Password<span className="input-wrap"><FiLock /><input type="password" value={form.password} onChange={update("password")} required minLength={6} placeholder="At least 6 characters" /></span></label>
            <label>Confirm password<span className="input-wrap"><FiLock /><input type="password" value={form.confirmPassword} onChange={update("confirmPassword")} required placeholder="Repeat password" /></span></label>
          </div>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          <button className="primary-button" disabled={loading}>{loading ? "Creating account..." : "Complete registration"} <FiArrowRight /></button>
        </form>
        <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
