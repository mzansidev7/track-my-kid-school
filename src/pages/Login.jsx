import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { apiRequest } from "../api";
import logo from "../assets/images/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (result.user?.role !== "school") {
        throw new Error("This portal is for school accounts only.");
      }
      localStorage.setItem("schoolAuth", JSON.stringify(result));
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <img className="auth-brand-logo" src={logo} alt="Track My Kid" />
        <p className="eyebrow">TRACK MY KID / SCHOOL PORTAL</p>
        <h1>Keep every school-day detail in view.</h1>
        <p className="intro-copy">
          Manage attendance, learners, transport coordination, and family
          communication from one calm workspace.
        </p>
        <div className="intro-note">Secure access for registered schools</div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to your school</h2>
          <p>Use the email and password created from your invitation.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            Email address
            <span className="input-wrap">
              <FiMail />
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                placeholder="school@example.com"
              />
            </span>
          </label>
          <label>
            Password
            <span className="input-wrap">
              <FiLock />
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                required
                placeholder="Enter your password"
              />
            </span>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"} <FiArrowRight />
          </button>
        </form>
        <p className="auth-switch">
          Have an invitation? <Link to="/register">Create your account</Link>
        </p>
      </section>
    </main>
  );
}
