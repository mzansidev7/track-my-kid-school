import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { apiRequest, isJwt } from "../api";
import { setSupabaseSession } from "../supabaseClient";
import logo from "../assets/images/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [pendingAuth, setPendingAuth] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

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
      if (!isJwt(result.token)) {
        throw new Error(
          "The server returned an invalid login session. Please contact support.",
        );
      }
      if (result.user?.is_verified === false) {
        setPendingAuth(result);
        return;
      }
      await setSupabaseSession(result.supabaseSession);
      localStorage.setItem("schoolAuth", JSON.stringify(result));
      window.dispatchEvent(new Event("school-auth-changed"));
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      const errorCode = requestError.message;
      setError(
        errorCode === "INVALID_CREDENTIALS"
          ? "Incorrect email or password. Please check your details and try again."
          : errorCode === "LOGIN_FAILED"
            ? "We couldn't sign you in right now. Please try again shortly."
            : errorCode || "Unable to sign in.",
      );
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
      if (!isJwt(pendingAuth.token)) {
        throw new Error(
          "The server returned an invalid login session. Please contact support.",
        );
      }
      const authenticated = {
        ...pendingAuth,
        user: { ...pendingAuth.user, is_verified: true },
      };
      await setSupabaseSession(authenticated.supabaseSession);
      localStorage.setItem("schoolAuth", JSON.stringify(authenticated));
      window.dispatchEvent(new Event("school-auth-changed"));
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

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setError("");
    setForgotPasswordLoading(true);
    try {
      await apiRequest("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotPasswordSent(true);
      setError("");
    } catch (requestError) {
      setError(
        requestError.message === "PASSWORD_RESET_UNAVAILABLE"
          ? "Password reset is temporarily unavailable. Please try again later."
          : requestError.message || "Unable to request a password reset.",
      );
    } finally {
      setForgotPasswordLoading(false);
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
          <h2>
            {showForgotPassword
              ? "Reset your password"
              : "Sign in to your school"}
          </h2>
          <p>
            {pendingAuth
              ? "Enter the OTP sent to your email to finish signing in."
              : showForgotPassword
                ? "If an account exists for this address, we’ll email a secure reset link."
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
        ) : showForgotPassword ? (
          <form onSubmit={requestPasswordReset} className="auth-form">
            {forgotPasswordSent ? (
              <div className="form-success" role="status">
                If an account with that email exists, a password reset link has
                been sent. Check your inbox.
              </div>
            ) : (
              <>
                <label>
                  Email address
                  <span className="input-wrap">
                    <FiMail />
                    <input
                      type="email"
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      required
                      placeholder="school@example.com"
                    />
                  </span>
                </label>
                {error && <div className="form-error">{error}</div>}
                <button
                  className="primary-button"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? "Sending link..." : "Send reset link"}{" "}
                  <FiArrowRight />
                </button>
              </>
            )}
            <button
              type="button"
              className="auth-secondary-button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordSent(false);
                setError("");
              }}
            >
              Back to sign in
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
            <button
              type="button"
              className="auth-secondary-button"
              onClick={() => {
                setForgotEmail(form.email);
                setShowForgotPassword(true);
                setForgotPasswordSent(false);
                setError("");
              }}
            >
              Forgot password?
            </button>
          </form>
        )}
        {!showForgotPassword ? (
          <p className="auth-switch">
            Have an invitation? <Link to="/register">Create your account</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
