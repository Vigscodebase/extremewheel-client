import { Eye, EyeOff, LogIn } from "lucide-react";
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
    <div className="auth-screen">
      <div className="auth-card card">
        <div className="auth-logo">FM</div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to your fleet management account.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={onChange} />
          </div>
          <div className="field" style={{ marginBottom: 22 }}>
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                style={{ width: "100%", paddingRight: 40 }}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            <LogIn size={16} />
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}