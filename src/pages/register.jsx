import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const user = await register({ name: form.name, email: form.email, password: form.password });
      navigate(user ? "/dashboard" : "/login", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card card auth-card-wide">
        <div className="auth-logo">FM</div>
        <h1>Create your account</h1>
        <p className="auth-sub">New accounts start with guest access until an admin upgrades your role.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="field field-mb">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" placeholder="Jane Doe" value={form.name} onChange={onChange} />
          </div>
          <div className="field field-mb">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@company.com" value={form.email} onChange={onChange} />
          </div>
          <div className="field field-mb">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={onChange} />
          </div>
          <div className="field field-mb-lg">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" placeholder="Re-enter password" value={form.confirm} onChange={onChange} />
          </div>

          <button type="submit" className="btn btn-accent btn-full" disabled={loading}>
            <UserPlus size={16} />
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}