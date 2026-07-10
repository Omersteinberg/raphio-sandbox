import { API_BASE } from "../config.js";
import { getToken } from "../api/auth.js";

const ENDPOINT = `${API_BASE}/telemetry/client-error`;
const GEN_LOG_ENDPOINT = `${API_BASE}/telemetry/gen-log`;

// Light client-side dedup so one repeating error can't spam the endpoint
// (the backend also rate-limits as a backstop).
const recent = new Map();
const WINDOW_MS = 60 * 1000;

// Pull userId out of the JWT (best effort) so alerts say who hit the error.
function decodeUserId() {
  try {
    const token = getToken();
    if (!token) return undefined;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.id || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Report a client-side failure to the backend, which forwards it to Slack.
 * Fire-and-forget: never throws, never blocks the caller. Deliberately uses
 * fetch (NOT the shared axios instance) so it can't recurse through the
 * response interceptor. keepalive lets it complete even if a navigation starts.
 */
export function reportClientError({ kind, message, status, url, stack } = {}) {
  try {
    const sig = `${kind}|${message}|${status || ""}`.slice(0, 200);
    const now = Date.now();
    const last = recent.get(sig);
    if (last && now - last < WINDOW_MS) return;
    recent.set(sig, now);
    if (recent.size > 200) recent.clear();

    const body = JSON.stringify({
      kind,
      message: String(message || "").slice(0, 1000),
      status,
      url: url || window.location.pathname + window.location.search,
      stack: String(stack || "").slice(0, 4000),
      userId: decodeUserId(),
    });

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never break the app.
  }
}

/**
 * Append one generation-trace line to the server's logs/generation.log.
 * Fire-and-forget, same constraints as reportClientError. Callers must send
 * transitions, not every poll: the endpoint's limiter allows 60 posts / 5 min,
 * which a 5s poll would saturate on its own.
 */
export function postGenLog(event, data = {}) {
  try {
    fetch(GEN_LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data: { ...data, userId: decodeUserId() } }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never break the app.
  }
}
