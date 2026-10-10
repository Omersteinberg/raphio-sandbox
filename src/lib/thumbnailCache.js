import { useSyncExternalStore } from "react";

// Session-lifetime cache for fetched filmstrip-thumbnail URL arrays, keyed by
// VideoSection id. TimelineEditor prefetches every clip on load; TimelineItem,
// AssetPanel and the mobile asset sheet read from here and re-render when an
// entry lands (useThumbnailsVersion). Concurrent requests for the same clip
// share one in-flight promise.
export const FILMSTRIP_FRAMES = 6;

const cache = new Map();
const inflight = new Map();
const listeners = new Set();
let version = 0;

// Bump the version and notify subscribed components.
function notify() {
  version += 1;
  listeners.forEach((fn) => fn());
}

// Cached frame URLs for a section, or null.
export function getCachedThumbnails(sectionId) {
  if (!sectionId) return null;
  return cache.get(sectionId) || null;
}

// Store frame URLs for a section.
export function setCachedThumbnails(sectionId, urls) {
  if (!sectionId || !Array.isArray(urls)) return;
  cache.set(sectionId, urls);
  notify();
}

// Fetch frames once per section; resolves to the URL array (possibly empty).
export function loadThumbnails(sectionId, fetcher) {
  if (!sectionId) return Promise.resolve([]);
  const hit = cache.get(sectionId);
  if (hit) return Promise.resolve(hit);
  if (inflight.has(sectionId)) return inflight.get(sectionId);
  const p = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      const urls = Array.isArray(data?.thumbnails) ? data.thumbnails : [];
      if (urls.length > 0) setCachedThumbnails(sectionId, urls);
      return urls;
    })
    .catch(() => [])
    .finally(() => inflight.delete(sectionId));
  inflight.set(sectionId, p);
  return p;
}

// Subscribe a listener to cache changes.
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Re-render the caller whenever any cache entry changes.
export function useThumbnailsVersion() {
  return useSyncExternalStore(subscribe, () => version);
}
