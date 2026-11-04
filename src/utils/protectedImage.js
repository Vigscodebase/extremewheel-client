// Vehicle photos are private: the API serves them from /uploads/... only to a
// signed-in user, and an <img src> tag can't send the Authorization header. So a
// photo is fetched through the shared axios instance (which attaches the token)
// and shown from a blob: URL instead.
//
// This module is the cache behind <AuthImage>:
//   - the same photo is downloaded once, however many components show it
//     (concurrent requests share one download);
//   - a photo that is still on screen is never freed; once nothing shows it, it
//     becomes eligible for eviction when the cache is over MAX_CACHED;
//   - everything is dropped when the person signs out, so the next person on this
//     browser can't be shown the previous person's photos.
import axios from "./axiosInstance";
import useAuthStore from "../store/authStore";

const MAX_CACHED = 300;

// path -> { url, promise, refs, dead }   (insertion order = least recently used first)
const cache = new Map();

// Server-stored photos are referenced as "/uploads/vehicle-notes/<hash>.webp".
// Anything else (a data: URL for a photo that was just picked, a blob:, an
// absolute URL) is shown as is.
export const isProtectedImagePath = (src) => typeof src === "string" && src.startsWith("/uploads/");

function evictIfNeeded() {
  if (cache.size <= MAX_CACHED) return;
  for (const [path, entry] of cache) {
    if (cache.size <= MAX_CACHED) break;
    if (entry.refs === 0 && entry.url) {
      URL.revokeObjectURL(entry.url);
      cache.delete(path);
    }
  }
}

/**
 * Starts (or joins) the download of one photo.
 * Returns { promise, release }: `promise` resolves to a blob: URL; call
 * `release()` when the component stops showing the photo.
 */
export function acquireImage(path) {
  let entry = cache.get(path);

  if (entry) {
    cache.delete(path); // move to the "most recently used" end
    cache.set(path, entry);
  } else {
    entry = { url: null, promise: null, refs: 0, dead: false };
    const mine = entry;
    // silentError: a photo that fails to load shows an empty frame; it must not
    // pop the global error dialog once per photo.
    mine.promise = axios
      .get(path, { responseType: "blob", silentError: true, timeout: 60_000 })
      .then((res) => {
        if (mine.dead) throw new Error("Image cache was cleared.");
        mine.url = URL.createObjectURL(res.data);
        return mine.url;
      })
      .catch((err) => {
        if (cache.get(path) === mine) cache.delete(path); // let the next mount try again
        throw err;
      });
    cache.set(path, mine);
  }

  entry.refs += 1;
  evictIfNeeded();

  const held = entry;
  let released = false;
  return {
    promise: held.promise,
    release: () => {
      if (released) return;
      released = true;
      held.refs = Math.max(0, held.refs - 1);
      evictIfNeeded();
    },
  };
}

export function clearImageCache() {
  for (const entry of cache.values()) {
    entry.dead = true;
    if (entry.url) URL.revokeObjectURL(entry.url);
  }
  cache.clear();
}

// Signing out (or being signed out by the server) wipes every cached photo.
useAuthStore.subscribe((state, prev) => {
  if (prev.token && !state.token) clearImageCache();
});
