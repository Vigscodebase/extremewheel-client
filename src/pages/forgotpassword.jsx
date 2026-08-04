import { CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../api/authApi";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordRequest(email);
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
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
            <h1>Forgot password</h1>
            <p>Enter your account email and we'll send you a reset link.</p>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          {sent ? (
            <div className="alert-error" style={{ background: "#EAFBF5", borderColor: "#4FCFB6", color: "#0E7B5F" }}>
              <CheckCircle2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              If an account exists for that email, a reset link has been sent. Check your inbox (and spam folder).
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="auth-form">
              <div className="smart-input-group">
                <div className="smart-input-icon">
                  <Mail size={18} strokeWidth={2.5} />
                </div>
                <div className="smart-input-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="smart-btn-primary" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
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
