import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiLock } from "react-icons/fi";
import { apiRequest } from "../api";
import logo from "../assets/images/logo.png";

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        requestError.message === "RESET_TOKEN_INVALID_OR_EXPIRED"
          ? "This reset link is invalid or has expired. Request a new one."
          : requestError.message || "Unable to reset your password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <img className="auth-brand-logo" src={logo} alt="Track My Kid" />
        <p className="eyebrow">TRACK MY KID / ACCOUNT SECURITY</p>
        <h1>A fresh start for your account.</h1>
        <p className="intro-copy">
          Choose a new password to securely get back into Track My Kid.
        </p>
        <div className="intro-note">Password reset links expire after one hour</div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">PASSWORD RECOVERY</p>
          <h2>{success ? "Password updated" : "Choose a new password"}</h2>
          <p>
            {success
              ? "Your password was changed. You can now sign in with the new password."
              : "Use at least 8 characters. Your reset link can only be used once."}
          </p>
        </div>
        {success ? (
          <div className="auth-form">
            <div className="form-success">Password reset successfully.</div>
            <Link
              className="primary-button"
              to="/login"
              style={{ textDecoration: "none" }}
            >
              Continue to sign in <FiArrowRight />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            {!token ? (
              <div className="form-error">
                This reset link is invalid or has expired. Request a new one.
              </div>
            ) : null}
            <label>
              New password
              <span className="input-wrap">
                <FiLock />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </span>
            </label>
            <label>
              Confirm new password
              <span className="input-wrap">
                <FiLock />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </span>
            </label>
            {error ? <div className="form-error">{error}</div> : null}
            <button
              className="primary-button"
              type="submit"
              disabled={loading || !token}
            >
              {loading ? "Updating password..." : "Update password"}{" "}
              <FiArrowRight />
            </button>
            <p className="auth-switch">
              Remembered your password? <Link to="/login">Sign in</Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
