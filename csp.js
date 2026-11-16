// Content Security Policy for the browser app. Used at build time by vite.config.js
// (Node only - it is not part of the bundle).
//
// What the app needs, found by reading the source:
//   scripts   only its own bundled files (Vite emits no inline scripts; three.js
//             and @react-three/fiber use no eval / workers)  -> 'self'
//   styles    own CSS + the Google Fonts stylesheet (@import in styles/global.css);
//             React `style={}` props are set through the CSSOM, which CSP allows;
//             'unsafe-inline' is limited to style *attributes* only
//   fonts     fonts.gstatic.com (Google Fonts files)
//   images    own files, data: (blank pixel, select arrow), blob: (private photos
//             are fetched with the login token and shown from a blob: URL)
//   connect   the API (same origin, or VITE_API_BASE_URL) and the live-update
//             WebSocket (/ws, or VITE_WS_URL)
//
// Env (read from .env* by Vite, or process.env):
//   VITE_API_BASE_URL      API origin if it is not same-origin (already used by the app)
//   VITE_WS_URL            WebSocket URL if it is not next to the API (already used)
//   VITE_CSP_CONNECT_SRC   extra connect-src sources, space separated
//   VITE_CSP_IMG_SRC       extra img-src sources, space separated
//   VITE_CSP_REPORT_URI    where to send violation reports, e.g. /api/csp-report
//   VITE_CSP_FRAME_ANCESTORS  frame-ancestors sources (default 'self', same as X-Frame-Options SAMEORIGIN)
//   VITE_CSP_REPORT_ONLY   "true": report but don't block (rolled out via the nginx
//                          header only; a <meta> tag cannot be report-only)
//   VITE_CSP_ENABLED       "false": build with no CSP at all

const words = (v) => String(v || "").split(/\s+/).filter(Boolean);

const originOf = (value) => {
  if (!value) return null;
  try {
    // Relative values ("/api") are same-origin and already covered by 'self'.
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export function buildCsp(env = {}, { forMeta = false } = {}) {
  const connect = new Set(["'self'"]);
  const api = originOf(env.VITE_API_BASE_URL);
  if (api) connect.add(api);

  // WebSocket: 'self' covers a same-origin ws:// / wss:// in current browsers; an
  // explicit VITE_WS_URL (or an absolute API origin) is added as ws(s)://host.
  for (const raw of [env.VITE_WS_URL, env.VITE_API_BASE_URL]) {
    const o = originOf(raw);
    if (o) connect.add(o.replace(/^http/i, "ws"));
  }
  words(env.VITE_CSP_CONNECT_SRC).forEach((s) => connect.add(s));

  const img = new Set(["'self'", "data:", "blob:"]);
  words(env.VITE_CSP_IMG_SRC).forEach((s) => img.add(s));

  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "https://fonts.googleapis.com"],
    "style-src-elem": ["'self'", "https://fonts.googleapis.com"],
    "style-src-attr": ["'unsafe-inline'"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": [...img],
    "connect-src": [...connect],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // The three below are ignored inside a <meta> tag by browsers, so they are
    // only added for the real HTTP header.
    ...(forMeta
      ? {}
      : {
          // 'self' matches nginx's "X-Frame-Options: SAMEORIGIN". Override with
          // VITE_CSP_FRAME_ANCESTORS (e.g. "'none'") if you want it stricter.
          "frame-ancestors": words(env.VITE_CSP_FRAME_ANCESTORS).length ? words(env.VITE_CSP_FRAME_ANCESTORS) : ["'self'"],
          ...(env.VITE_CSP_REPORT_URI ? { "report-uri": [env.VITE_CSP_REPORT_URI] } : {}),
        }),
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .concat(forMeta ? [] : ["upgrade-insecure-requests"])
    .join("; ");
}

export const cspEnabled = (env = {}) => String(env.VITE_CSP_ENABLED || "").trim().toLowerCase() !== "false";
export const cspReportOnly = (env = {}) => String(env.VITE_CSP_REPORT_ONLY || "").trim().toLowerCase() === "true";
