// Central source of truth for roles and the navigable pages of the app.
// Adding a new page: add it to utils/permissions.js (and the server catalog) +
// a route in App.jsx + a sidebar icon.
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

import { PAGE_PERMISSIONS } from './permissions';

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// Account types. A role no longer carries any page/button permissions — those
// are granted per user (see utils/permissions.js). "admin" is the master account
// type and always has full access; staff/guest are labels, plus the few
// data-sensitivity rules that still key off them (customer details, internal
// staff notes, managing dropdown lists).
export const ROLES = ['admin', 'staff', 'guest'];

// The navigable pages — the page permissions, from the single catalog.
export const PAGES = PAGE_PERMISSIONS;

export const SESSION_TIMEOUT_MS = num(import.meta.env.VITE_SESSION_TIMEOUT_MS, 7.5 * 60 * 1000); // bank-style idle timeout
export const PERMISSIONS_POLL_MS = num(import.meta.env.VITE_PERMISSIONS_POLL_MS, 20 * 1000); // cross-device permission sync interval

// Plus-size recommendation engine tolerances (see tiresizeoption/plus-size flows)
export const PLUS_SIZE_HEIGHT_TOLERANCE_PCT = num(import.meta.env.VITE_PLUS_SIZE_HEIGHT_TOLERANCE_PCT, 0.03);
export const PLUS_SIZE_TREAD_TOLERANCE_PCT = num(import.meta.env.VITE_PLUS_SIZE_TREAD_TOLERANCE_PCT, 0.15);