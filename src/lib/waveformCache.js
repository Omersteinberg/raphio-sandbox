// Session-lifetime cache for fetched waveform arrays, shared between the trim
// modal (ItemEditModal, which does the actual fetching) and the timeline
// track view (which only ever reads a cache hit - see the note below).
//
// Why read-only on the track side: rendering a waveform for every visible
// clip the moment the timeline loads would mean one network request per clip
// with no bulk endpoint to batch them, and for a clip whose waveform hasn't
// been generated yet that's real ffmpeg work on the backend - exactly what
// the modal's own lazy-fetch was built to avoid (see ItemEditModal.jsx). So
// the track view opportunistically shows a waveform only for a clip the user
// has already opened the trim modal for this session; everything else stays
// the plain flat look it has today. A real "waveform on every track item"
// feature would need a bulk-fetch endpoint - flagged as a follow-up, not
// built here.
const cache = new Map();

const key = (kind, id) => `${kind}:${id}`;

export function getCachedWaveform(kind, id) {
  if (!id) return null;
  return cache.get(key(kind, id)) || null;
}

export function setCachedWaveform(kind, id, data) {
  if (!id || !Array.isArray(data)) return;
  cache.set(key(kind, id), data);
}
