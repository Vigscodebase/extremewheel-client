// Build-time prerender of <title> + meta description - runs AFTER `vite build`:
//
//   "build": "vite build && node scripts/prerender.mjs"
//
// For each route in seo.config.js it copies dist/index.html (so the CSP <meta> from
// the app-csp plugin and the hashed script/CSS tags stay exactly as Vite emitted
// them) to dist/<route>/index.html and adds the route's title and description.
// Nothing inline is added, so the CSP (script-src 'self') is unaffected.
//
// nginx must serve the per-route file:
//
//   location / { try_files $uri $uri/index.html /index.html; }
//
// ($uri/index.html - not "$uri/" - so /login is served directly instead of being
// 301-redirected to /login/. Don't put add_header inside that location: nginx
// would then drop the server-level headers from csp-nginx.conf.)

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { routes } = await import(pathToFileURL(path.join(root, 'seo.config.js')).href);

const source = path.join(dist, 'index.html');
if (!fs.existsSync(source)) {
  console.error('[prerender] dist/index.html not found - run "vite build" first.');
  process.exit(1);
}
const template = fs.readFileSync(source, 'utf8');
if (!/<\/head>/i.test(template)) {
  console.error('[prerender] dist/index.html has no </head>.');
  process.exit(1);
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const { path: routePath, title, description } of routes) {
  const html = template
    // drop any existing title/description so they are never duplicated
    .replace(/[ \t]*<title>[\s\S]*?<\/title>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<meta\s+[^>]*name=["']description["'][^>]*>[ \t]*\r?\n?/gi, '')
    .replace(
      /<\/head>/i,
      `  <title>${esc(title)}</title>\n    <meta name="description" content="${esc(description)}" />\n  </head>`,
    );

  const file = path.join(dist, routePath.replace(/^\/+/, ''), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`[prerender] ${routePath} -> ${path.relative(root, file)}`);
}
