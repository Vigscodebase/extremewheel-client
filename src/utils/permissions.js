// Client-side mirror of server/config/permissionCatalog.js.
//
// Access is granted PER USER (keyed by their unique email) — there is no
// role-based matrix. Two kinds of key:
//
//   - PAGE keys     "vehicle-notes"        may open the page
//   - ELEMENT keys  "vehicle-notes.edit"   may use one control on that page
//
// Element keys sit under their page (the Vehicle Notes database buttons sit
// under the database card), and a key only counts when every ancestor is also
// granted. The server enforces all of this; the client only uses it to decide
// what to show.
//
// Keep this file and the server catalog in step — add a key in both, then guard
// the route (server) and the control (client).

export const PAGE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'tire-calculator', label: 'Tire Size Calculator', path: '/tire-calculator' },
  { key: 'tire-comparison', label: 'Tire Size Comparison', path: '/tire-comparison' },
  { key: 'plus-size', label: 'Plus Size Options', path: '/plus-size' },
  { key: 'tire-options', label: 'Tire Size Option', path: '/tire-options' },
  // { key: 'application-guide', label: 'Application Guide', path: '/application-guide' }, // hidden page
  { key: 'tech-data', label: 'Tech Data', path: '/tech-data' },
  { key: 'vehicle-notes', label: 'Vehicle Notes', path: '/vehicle-notes' },
  { key: 'reports', label: 'Reporting & Data Export', path: '/reports' },
  { key: 'user-management', label: 'User Management', path: '/user-management' },
];

// Named keys, so a typo is a ReferenceError instead of a silently-hidden button.
export const PERM = {
  TILE_TOTAL_USERS: 'dashboard.tile.total-users',
  TILE_VEHICLE_NOTES: 'dashboard.tile.vehicle-notes',
  TILE_TIRE_PRESETS: 'dashboard.tile.tire-presets',
  TILE_QUICK_ACCESS: 'dashboard.tile.quick-access',
  TILE_TIRE_SHOWROOM: 'dashboard.tile.tire-showroom',
  TILE_RECENT_VEHICLES: 'dashboard.tile.recent-vehicles',
  TILE_USERS_BY_ROLE: 'dashboard.tile.users-by-role',
  TILE_RECENT_COMPARISONS: 'dashboard.tile.recent-comparisons',
  TILE_RECENT_VEHICLE_SEARCHES: 'dashboard.tile.recent-vehicle-searches',
  TILE_RECENT_PLUS_SIZE: 'dashboard.tile.recent-plus-size',
  TILE_REPORTS: 'dashboard.tile.reports',

  COMPARISON_SAVE: 'tire-comparison.save',

  PLUS_SIZE_DOWNLOAD: 'plus-size.download',
  PLUS_SIZE_UPLOAD: 'plus-size.upload',

  TECH_DATA_CSV_TAB: 'tech-data.csv-tab',

  VEHICLE_ADD: 'vehicle-notes.add',
  VEHICLE_EDIT: 'vehicle-notes.edit',
  VEHICLE_DELETE: 'vehicle-notes.delete',
  VEHICLE_DATABASE: 'vehicle-notes.database',
  VEHICLE_DATABASE_DOWNLOAD: 'vehicle-notes.database.download',
  VEHICLE_DATABASE_UPLOAD: 'vehicle-notes.database.upload',

  REPORTS_DOWNLOAD: 'reports.download',
};

const el = (key, label, parent) => ({ key, label, parent });

// In the order they appear on the permissions screen.
export const ELEMENT_PERMISSIONS = [
  el(PERM.TILE_TOTAL_USERS, 'Total users', 'dashboard'),
  el(PERM.TILE_VEHICLE_NOTES, 'Vehicle notes count', 'dashboard'),
  el(PERM.TILE_TIRE_PRESETS, 'Tire presets count', 'dashboard'),
  el(PERM.TILE_QUICK_ACCESS, 'Quick access', 'dashboard'),
  el(PERM.TILE_TIRE_SHOWROOM, 'Tire showroom', 'dashboard'),
  el(PERM.TILE_RECENT_VEHICLES, 'Recently added vehicles', 'dashboard'),
  el(PERM.TILE_USERS_BY_ROLE, 'Users by role', 'dashboard'),
  el(PERM.TILE_RECENT_COMPARISONS, 'Recent tire comparisons', 'dashboard'),
  el(PERM.TILE_RECENT_VEHICLE_SEARCHES, 'Recently searched vehicles', 'dashboard'),
  el(PERM.TILE_RECENT_PLUS_SIZE, 'Recent plus-size saves', 'dashboard'),
  el(PERM.TILE_REPORTS, 'Reports', 'dashboard'),

  el(PERM.COMPARISON_SAVE, 'Save comparison button', 'tire-comparison'),

  el(PERM.PLUS_SIZE_DOWNLOAD, 'Download OE library button', 'plus-size'),
  el(PERM.PLUS_SIZE_UPLOAD, 'Upload OE sizes button', 'plus-size'),

  el(PERM.TECH_DATA_CSV_TAB, 'CSV import / export tab', 'tech-data'),

  el(PERM.VEHICLE_ADD, 'Add vehicle button', 'vehicle-notes'),
  el(PERM.VEHICLE_EDIT, 'Edit button (on each vehicle)', 'vehicle-notes'),
  el(PERM.VEHICLE_DELETE, 'Delete button (on each vehicle)', 'vehicle-notes'),
  el(PERM.VEHICLE_DATABASE, 'Vehicle Notes database', 'vehicle-notes'),
  el(PERM.VEHICLE_DATABASE_DOWNLOAD, 'Download database button', PERM.VEHICLE_DATABASE),
  el(PERM.VEHICLE_DATABASE_UPLOAD, 'Upload database button', PERM.VEHICLE_DATABASE),

  el(PERM.REPORTS_DOWNLOAD, 'Download CSV button', 'reports'),
];

const PARENT_OF = new Map([
  ...PAGE_PERMISSIONS.map((p) => [p.key, null]),
  ...ELEMENT_PERMISSIONS.map((e) => [e.key, e.parent]),
]);

// Every key above `key`, nearest first ([] for a page, or a key we don't know).
export function ancestorsOf(key) {
  const chain = [];
  let parent = PARENT_OF.get(key);
  while (parent) {
    chain.push(parent);
    parent = PARENT_OF.get(parent);
  }
  return chain;
}

// Every key below `key` (children, grandchildren, …).
export function descendantsOf(key) {
  return ELEMENT_PERMISSIONS.filter((e) => ancestorsOf(e.key).includes(key)).map((e) => e.key);
}

// Keys the permissions screen can edit, in display order.
export const ALL_EDITABLE_KEYS = [
  ...PAGE_PERMISSIONS.map((p) => p.key),
  ...ELEMENT_PERMISSIONS.map((e) => e.key),
];

// One block per page, with its element permissions (and how deep each sits) in
// display order — what the permissions screen renders.
export const PERMISSION_GROUPS = PAGE_PERMISSIONS.map((page) => ({
  page,
  elements: ELEMENT_PERMISSIONS.filter((e) => ancestorsOf(e.key).includes(page.key)).map((e) => ({
    ...e,
    depth: ancestorsOf(e.key).length, // 1 = directly under the page, 2 = under another element
  })),
}));

// A page's path is always "/" + its key, so a link target maps straight back to
// the page permission needed to open it.
export const pageKeyForPath = (path) => String(path || '').replace(/^\//, '');

// "Full name (email)" — the label used wherever a user has to be picked out of
// a list or named in a confirmation. The email is the unique identity that
// permissions belong to, the name makes it recognisable at a glance.
export function formatUserLabel(user) {
  const email = user?.email || '';
  const name = (user?.name || '').trim();
  if (name && email) return `${name} (${email})`;
  return name || email || 'Unknown user';
}

// The first page (in sidebar order) the user may open, or null. Used to land
// someone sensibly when the page they asked for — usually the Dashboard, the
// default landing page — isn't one of theirs.
export const firstAllowedPath = (can, { exclude } = {}) =>
  PAGE_PERMISSIONS.find((p) => p.key !== exclude && can(p.key))?.path ?? null;
