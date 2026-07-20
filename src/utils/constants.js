// Central source of truth for roles and the navigable pages of the app.
// Adding a new page: add it here + a route in App.jsx + a sidebar icon.
//
// Any *scalar* config (timeouts, poll intervals, tolerance percentages, etc.)
// lives in .env and is read here via import.meta.env (Vite). Structural data
// (arrays/objects like PAGES/ROLES) can't be expressed in a .env file, so it
// stays here as the single JS source of truth — the server's /navigation and
// /permissions endpoints are the real runtime source; these are the offline
// fallback used before that first request resolves (see sidebar.jsx).
//
// Update values in .env (or .env.example for the checked-in template), not
// here, when you need to change a number.

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const ROLES = ['admin', 'staff', 'guest'];

export const PAGES = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'user-management', label: 'User Management', path: '/user-management' },
  { key: 'tire-comparison', label: 'Tire Size Comparison', path: '/tire-comparison' },
  { key: 'tire-options', label: 'Tire Size Option', path: '/tire-options' },
  { key: 'plus-size', label: 'Plus Size Options', path: '/plus-size' },
  { key: 'application-guide', label: 'Application Guide', path: '/application-guide' },
  { key: 'vehicle-notes', label: 'Vehicle Notes', path: '/vehicle-notes' },
];

// Default access matrix used the very first time the app runs (no backend
// value saved yet). Admin always has full access and cannot be edited down
// from the UI (guarded in PermissionContext) so there is always at least
// one role that can reach User Management to fix mistakes.
export const DEFAULT_PERMISSIONS = {
  admin: PAGES.map((p) => p.key),
  staff: ['dashboard', 'tire-comparison', 'tire-options', 'plus-size', 'application-guide', 'vehicle-notes'],
  guest: ['dashboard', 'tire-comparison'],
};

export const SESSION_TIMEOUT_MS = num(import.meta.env.VITE_SESSION_TIMEOUT_MS, 7.5 * 60 * 1000); // bank-style idle timeout
export const PERMISSIONS_POLL_MS = num(import.meta.env.VITE_PERMISSIONS_POLL_MS, 20 * 1000); // cross-device permission sync interval

// Plus-size recommendation engine tolerances (see tiresizeoption/plus-size flows)
export const PLUS_SIZE_HEIGHT_TOLERANCE_PCT = num(import.meta.env.VITE_PLUS_SIZE_HEIGHT_TOLERANCE_PCT, 0.03);
export const PLUS_SIZE_TREAD_TOLERANCE_PCT = num(import.meta.env.VITE_PLUS_SIZE_TREAD_TOLERANCE_PCT, 0.15);