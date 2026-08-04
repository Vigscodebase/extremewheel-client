import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordRequest } from "../api/authApi";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const missingLink = !email || !token;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordRequest({ email, token, password });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-auth-container">
      <div className="auth-right"></div>
      <div className="auth-left">
        <div className="auth-content">
          <div className="brand-header">
            <img alt="login-logo" src="/login-logo.webp" />
          </div>

          <div className="auth-heading">
            <h1>Reset password</h1>
            <p>Choose a new password for {email || "your account"}.</p>
          </div>

          {missingLink ? (
            <div className="auth-error-banner">
              This reset link is missing information. Please request a new one.
            </div>
          ) : done ? (
            <div className="alert-error" style={{ background: "#EAFBF5", borderColor: "#4FCFB6", color: "#0E7B5F" }}>
              <CheckCircle2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Password updated. Redirecting to sign in…
            </div>
          ) : (
            <>
              {error && <div className="auth-error-banner">{error}</div>}
              <form onSubmit={onSubmit} noValidate className="auth-form">
                <div className="smart-input-group">
                  <div className="smart-input-icon">
                    <Lock size={18} strokeWidth={2.5} />
                  </div>
                  <div className="smart-input-field">
                    <label htmlFor="password">New password</label>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="smart-input-action toggle-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="smart-input-group">
                  <div className="smart-input-icon">
                    <Lock size={18} strokeWidth={2.5} />
                  </div>
                  <div className="smart-input-field">
                    <label htmlFor="confirm">Confirm new password</label>
                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="smart-btn-primary" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}

          <p className="mt-16">
            <Link to="/login" className="see-all-link" style={{ display: "inline-flex" }}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
