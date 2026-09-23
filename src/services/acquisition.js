import { API_BASE } from "../config.js";

const ID_KEY = "raphio_acquisition_id";
const ATTRIBUTION_KEY = "raphio_attribution";
const ALLOWED = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];

function sessionValue(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function setSessionValue(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* private browsing/storage disabled */ }
}

export function getAnonymousId() {
  let id = sessionValue(ID_KEY);
  if (!id && typeof crypto !== "undefined" && crypto.randomUUID) {
    id = crypto.randomUUID().replace(/-/g, "");
    setSessionValue(ID_KEY, id);
  }
  return id || null;
}

export function captureAttribution(search = window.location.search) {
  const params = new URLSearchParams(search);
  const next = {};
  for (const key of ALLOWED) {
    const value = params.get(key)?.trim().slice(0, 100);
    if (value) next[key] = value;
  }
  if (Object.keys(next).length) setSessionValue(ATTRIBUTION_KEY, JSON.stringify(next));
  return getAttribution();
}

export function getAttribution() {
  try {
    const value = JSON.parse(sessionValue(ATTRIBUTION_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}

export function trackAcquisition(event, { cta } = {}) {
  try {
    const anonymousId = getAnonymousId();
    if (!anonymousId) return;
    fetch(`${API_BASE}/telemetry/acquisition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, anonymousId, attribution: getAttribution(), ...(cta ? { cta } : {}) }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* analytics is always best effort */ }
}
