// Central source of truth for roles and the navigable pages of the app.
// Adding a new page: add it here + a route in App.jsx + a sidebar icon.

export const ROLES = ['admin', 'staff', 'guest'];

export const PAGES = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'user-management', label: 'User Management', path: '/user-management' },
  { key: 'tire-comparison', label: 'Tire Size Comparison', path: '/tire-comparison' },
  { key: 'tire-options', label: 'Tire Size Option', path: '/tire-options' },
  { key: 'vehicle-notes', label: 'Vehicle Notes', path: '/vehicle-notes' },
];

// Default access matrix used the very first time the app runs (no backend
// value saved yet). Admin always has full access and cannot be edited down
// from the UI (guarded in PermissionContext) so there is always at least
// one role that can reach User Management to fix mistakes.
export const DEFAULT_PERMISSIONS = {
  admin: PAGES.map((p) => p.key),
  staff: ['dashboard', 'tire-comparison', 'tire-options', 'vehicle-notes'],
  guest: ['dashboard', 'tire-comparison'],
};

export const SESSION_TIMEOUT_MS = 7.5 * 60 * 1000; // 7.5 minutes, bank-style idle timeout
export const PERMISSIONS_POLL_MS = 20 * 1000; // cross-device permission sync interval
