// <title> and meta description for the login page - the only page that has meta.
//
// Used in two places (so the text lives in one spot):
//  - scripts/prerender.mjs writes it into dist/login/index.html after `vite build`,
//    so crawlers see it without running JS.
//  - src/hooks/usePageMeta.js applies it while the login page is on screen (and
//    puts the default back when the user leaves it), because the <title> from the
//    first loaded HTML would otherwise stay put during client-side navigation.
//
// Every other page keeps the plain default title and no description.
export const defaultTitle = 'extremewheel';

export const routes = [
  {
    path: '/login',
    title: 'Extremewheel - Tire & Wheel Fitment Software',
    description:
      'Manage tire and wheel fitment effortlessly with Extremewheel. Verify OEM specs, eliminate sizing errors, and speed',
  },
];

export const loginMeta = routes[0];
