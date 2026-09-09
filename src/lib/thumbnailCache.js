// Session-lifetime cache for fetched filmstrip-thumbnail URL arrays, mirroring
// waveformCache.js's role: TimelineItem lazy-fetches a clip's frames once it
// scrolls into view (see the IntersectionObserver effect there) and seeds
// itself from this cache on remount so scrolling a clip out and back in
// doesn't re-fetch. Simpler than waveformCache (no `kind` axis) because
// thumbnails only ever key off a VideoSection id - there's no audio-asset
// equivalent for filmstrip frames.
const cache = new Map();

export function getCachedThumbnails(sectionId) {
  if (!sectionId) return null;
  return cache.get(sectionId) || null;
}

export function setCachedThumbnails(sectionId, urls) {
  if (!sectionId || !Array.isArray(urls)) return;
  cache.set(sectionId, urls);
}
