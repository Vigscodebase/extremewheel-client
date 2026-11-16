# Content Security Policy

Policy rules and .env switches: see `csp.js` (client) and `server/middleware/csp.js` (API).

## Rolling it out
1. Set `VITE_CSP_REPORT_ONLY=true` and `VITE_CSP_REPORT_URI=/api/csp-report`, build, include `dist/csp-nginx.conf` in nginx.
   Use the app; read `[CSP]` lines in the API log. Nothing is blocked in this mode.
2. When the log is clean, remove `VITE_CSP_REPORT_ONLY`, rebuild. The policy is now enforced
   (<meta> tag in index.html + the nginx header).

## Other origins
Add to the client `.env`: `VITE_CSP_CONNECT_SRC`, `VITE_CSP_IMG_SRC` (space separated).
`VITE_API_BASE_URL` and `VITE_WS_URL` are added automatically.

## API (.env)
`CSP_ENABLED=false` (rollback), `CSP_REPORT_ONLY=true`, `CSP_REPORT_URI=/api/csp-report` (public path behind nginx).

## nginx (extremewheelfitment.com)
`location /` includes `snippets/csp.conf` (copy of `dist/csp-nginx.conf` after a build, or the supplied one).
Needs `nginx -t && nginx -s reload` after changing it. Client `.env` for this site:
`VITE_CSP_CONNECT_SRC=wss://extremewheelfitment.com`, `VITE_CSP_REPORT_URI=/api/csp-report`, `VITE_CSP_REPORT_ONLY=true` (until clean).
Server `.env`: `CSP_REPORT_URI=/api/csp-report`.
