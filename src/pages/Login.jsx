import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { apiRequest } from "../api";
import logo from "../assets/images/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [pendingAuth, setPendingAuth] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
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
      if (result.user?.is_verified === false) {
        setPendingAuth(result);
        return;
      }
      localStorage.setItem("schoolAuth", JSON.stringify(result));
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const verifyStaffOtp = async (event) => {
    event.preventDefault();
    if (!pendingAuth?.user?.id || otp.length !== 6) {
      setError("Enter the 6-digit OTP from your email.");
      return;
    }

    setError("");
    setOtpLoading(true);
    try {
      const result = await apiRequest("/verify-otp", {
        method: "POST",
        body: JSON.stringify({ user_id: pendingAuth.user.id, code: otp }),
      });
      if (result.message !== "OTP_VERIFIED") {
        throw new Error(result.message || "Unable to verify OTP.");
      }
      const authenticated = {
        ...pendingAuth,
        user: { ...pendingAuth.user, is_verified: true },
      };
      localStorage.setItem("schoolAuth", JSON.stringify(authenticated));
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to verify OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendStaffOtp = async () => {
    if (!pendingAuth?.user?.id) return;
    setError("");
    setOtpLoading(true);
    try {
      const result = await apiRequest("/resend-otp", {
        method: "POST",
        body: JSON.stringify({ user_id: pendingAuth.user.id }),
      });
      if (result.message !== "OTP_RESENT") {
        throw new Error(result.message || "Unable to resend OTP.");
      }
      setOtp("");
    } catch (requestError) {
      setError(requestError.message || "Unable to resend OTP.");
    } finally {
      setOtpLoading(false);
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
          <p>
            {pendingAuth
              ? "Enter the OTP sent to your email to finish signing in."
              : "Enter the email and password for your school account."}
          </p>
        </div>
        {pendingAuth ? (
          <form onSubmit={verifyStaffOtp} className="auth-form">
            <div className="form-success">
              {pendingAuth.user?.admin_profile?.is_invited_member
                ? "Use the temporary password from the email sent when your school administrator added your account, then enter the 6-digit verification code."
                : "Enter the 6-digit verification code sent to your email. Use the password you chose when registering."}
            </div>
            <label>
              Verification code
              <span className="input-wrap">
                <FiLock />
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
                  }
                  required
                  placeholder="Enter 6-digit OTP"
                />
              </span>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button" disabled={otpLoading}>
              {otpLoading ? "Verifying..." : "Verify and continue"}{" "}
              <FiArrowRight />
            </button>
            <button
              type="button"
              className="auth-secondary-button"
              onClick={resendStaffOtp}
              disabled={otpLoading}
            >
              Resend OTP
            </button>
          </form>
        ) : (
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
        )}
        <p className="auth-switch">
          Have an invitation? <Link to="/register">Create your account</Link>
        </p>
      </section>
    </main>
  );
}
