import { useEffect, useState } from "react";
import { acquireImage, isProtectedImagePath } from "../utils/protectedImage";

// Resolves a stored photo reference to something an <img> can display.
//   "/uploads/…"          -> downloaded with the login token, returned as a blob: URL
//   data: / blob: / http  -> returned unchanged
// Returns { url, failed }: `url` is null while a server photo is still loading.
export default function useProtectedImage(src) {
  const protectedPath = isProtectedImagePath(src);
  const [loaded, setLoaded] = useState({ src: null, url: null, failed: false });

  useEffect(() => {
    if (!protectedPath) return undefined;
    let alive = true;
    const { promise, release } = acquireImage(src);
    promise
      .then((url) => { if (alive) setLoaded({ src, url, failed: false }); })
      .catch(() => { if (alive) setLoaded({ src, url: null, failed: true }); });
    return () => {
      alive = false;
      release();
    };
  }, [src, protectedPath]);

  if (!protectedPath) return { url: src || null, failed: false };

  // Ignore a result that belongs to a previous `src` (the photo changed).
  const mine = loaded.src === src ? loaded : null;
  return { url: mine?.url ?? null, failed: !!mine?.failed };
}
