// Shared form validation helpers.

/* ---------- Tire size number fields ---------- */
// <input type="number"> lets the browser accept "e" (exponent), "+", "-" and ".".
// Use a text input that only ever holds digits instead.
export const NUMERIC_INPUT_PROPS = {
  type: "text",
  inputMode: "numeric",
  pattern: "[0-9]*",
  autoComplete: "off",
};
export const onlyDigits = (value, maxLength) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
};
// Max digits per tire field (e.g. 265 / 70 / 17).
export const TIRE_MAX = { width: 4, aspect: 3, rim: 2 };

/* ---------- Full name ---------- */
// Error when this MATCHES (any character that is not a letter or whitespace).
export const NAME_INVALID_REGEX = /[^a-zA-Z\s]/;

export function validateFullName(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Full name is required.";
  if (NAME_INVALID_REGEX.test(v)) return "Full name can only contain letters and spaces.";
  return "";
}

/* ---------- Email ---------- */
// Valid when this MATCHES (error when it does NOT match).
export const EMAIL_REGEX = /^([a-zA-Z0-9._]+)@([a-zA-Z0-9-]+)\.([a-z]{2,3})(\.[a-z]{2,3})?$/;

export function validateEmail(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Email is required.";
  if (!EMAIL_REGEX.test(v)) return "Enter a valid email address (e.g. jane@company.com).";
  return "";
}

/* ---------- Phone (USA) ---------- */
// Accepts: 5551234567, 555-123-4567, 555.123.4567, 555 123 4567, (555) 123-4567,
// 1 555 123 4567, 1-555-123-4567, +1 555 123 4567, +1 (555) 123-4567
// Area code cannot start with 0 or 1.
export const US_PHONE_REGEX = /^(?:\+?1[-. ]?)?(?:\(([2-9][0-9]{2})\)|([2-9][0-9]{2}))[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

export function validatePhone(value, { required = false } = {}) {
  const v = String(value ?? "").trim();
  if (!v) return required ? "Phone is required." : "";
  if (!US_PHONE_REGEX.test(v)) return "Enter a valid US phone number (e.g. +1 555 123 4567 or (555) 123-4567).";
  return "";
}

/* ---------- Password ---------- */
// The rule most big sites use: 8-64 chars with a lowercase, an uppercase,
// a digit and a special character, and no spaces.
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/;

export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "digit", label: "One number", test: (p) => /\d/.test(p) },
  { key: "special", label: "One special character (!@#$%…)", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

// Returns { level: 0-4, label, percent } -> Too weak / Weak / Strong / Stronger
export function getPasswordStrength(password) {
  const p = String(password ?? "");
  if (!p) return { level: 0, label: "", percent: 0 };
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).length;
  const meetsAll = STRONG_PASSWORD_REGEX.test(p);
  if (meetsAll && p.length >= 12) return { level: 4, label: "Stronger", percent: 100 };
  if (meetsAll) return { level: 3, label: "Strong", percent: 75 };
  if (passed >= 3 && p.length >= 8) return { level: 2, label: "Weak", percent: 50 };
  return { level: 1, label: "Too weak", percent: 25 };
}

// required: true on "Add user", false on "Edit user" (blank = keep current).
export function validatePassword(value, { required = true } = {}) {
  const p = String(value ?? "");
  if (!p) return required ? "Password is required." : "";
  if (/\s/.test(p)) return "Password cannot contain spaces.";
  if (p.length > 64) return "Password must be 64 characters or fewer.";
  if (!STRONG_PASSWORD_REGEX.test(p)) {
    return "Use 8+ characters with an uppercase letter, a lowercase letter, a number and a special character.";
  }
  return "";
}

/* ---------- Model year (1950 – 2030) ---------- */
// Every Year dropdown (and every place a year can be added) uses this one range.
// Keep in sync with MIN_MODEL_YEAR / MAX_MODEL_YEAR in server/utils/modelYear.js.
export const MIN_MODEL_YEAR = 1950;
export const MAX_MODEL_YEAR = 2030;

export const isValidModelYear = (value) => {
  const text = String(value ?? "").trim();
  if (!/^\d{4}$/.test(text)) return false;
  const n = Number(text);
  return n >= MIN_MODEL_YEAR && n <= MAX_MODEL_YEAR;
};

// "" when fine (an empty year is allowed), otherwise a message for the form.
export const modelYearProblem = (value, label = "Year") => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return isValidModelYear(text) ? "" : `${label} must be a 4-digit year between ${MIN_MODEL_YEAR} and ${MAX_MODEL_YEAR}.`;
};

// Only the years inside the allowed range, as strings, in ascending order.
// Used for every Year dropdown so stray out-of-range values already in the
// database (or an old import) never show up as choices.
export const filterModelYears = (years) =>
  (years || [])
    .map((y) => String(y).trim())
    .filter(isValidModelYear)
    .sort((a, b) => Number(a) - Number(b));

// What the typed-in ("+ Add new year…") box accepts: digits only, at most 4.
export const cleanYearInput = (text) => String(text ?? "").replace(/\D/g, "").slice(0, 4);

/* ---------- Tire size / wheel offset text fields ---------- */
// Tire size: digits plus the separators people type ("205/55R16", "205 55 16").
export const cleanTireSizeInput = (text) => String(text ?? "").replace(/[^\d\s/\-rRzZ]/g, "").slice(0, 14);
// Wheel offset (mm): a whole number, optionally negative — digits and one leading "-" only.
export const cleanOffsetInput = (text) => String(text ?? "").replace(/[^\d-]/g, "").replace(/(?!^)-/g, "").slice(0, 4);
