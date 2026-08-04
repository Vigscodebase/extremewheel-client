import { Eye, EyeOff, Lock, Mail, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-auth-container">
      {/* Left Pane - Form */}
      <div className="auth-right">

      </div>

      {/* Right Pane - Visual Illustration */}
      <div className="auth-left">
        <div className="auth-content">

          {/* Brand Logo */}
          <div className="brand-header">
            {/* <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12L7.5 2.5H15.5L8 12H0Z" fill="var(--color-ink)" />
              <path d="M12.5 12L20 21.5H28L20.5 12H12.5Z" fill="var(--color-ink)" />
            </svg>
            <span className="brand-name">SmartSave</span> */}
            <img alt="login-logo" src="/login-logo.webp" />
          </div>

          <div className="auth-heading">
            <h1>Welcome Back</h1>
            <p>Welcome Back, Please enter Your details</p>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

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
                  value={form.email}
                  onChange={onChange}
                />
              </div>
              <div className="smart-input-action">
                {form.email.length > 3 ? (
                  <CheckCircle2 size={18} strokeWidth={2.5} className="text-green" />
                ) : null}
              </div>
            </div>

            <div className="smart-input-group">
              <div className="smart-input-icon">
                <Lock size={18} strokeWidth={2.5} />
              </div>
              <div className="smart-input-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={onChange}
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

            <p className="mb-8" style={{ textAlign: "right" }}>
              <Link to="/forgot-password" className="see-all-link" style={{ display: "inline-flex" }}>
                Forgot password?
              </Link>
            </p>

            <button type="submit" className="smart-btn-primary" disabled={loading}>
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}