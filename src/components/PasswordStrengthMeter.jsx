import { PASSWORD_RULES, getPasswordStrength } from "../utils/validation";

const COLORS = { 1: "#d93025", 2: "#f29900", 3: "#1e8e3e", 4: "#0b6b2b" };

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const { level, label, percent } = getPasswordStrength(password);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, borderRadius: 3, background: "var(--color-border, #e5e5e5)", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: COLORS[level], transition: "width .2s" }} />
      </div>
      <p style={{ fontSize: 12, marginTop: 4, color: COLORS[level], fontWeight: 600 }}>{label}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", fontSize: 12 }}>
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.key} style={{ color: ok ? "#1e8e3e" : "var(--color-muted)" }}>
              {ok ? "✓" : "○"} {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
