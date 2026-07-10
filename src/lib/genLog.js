import { reportClientError, postGenLog } from "@/services/errorReporter";

// Structured logging for the generation path. Three sinks: the console (open
// devtools to read it), Slack telemetry, and the server's logs/generation.log via
// postGenLog. Nothing here renders in the UI. The user-facing explanation of a
// failure is the reason string on the failed checklist row, not this log.

// Telemetry dedup, keyed sessionId|stepId. reportClientError already dedups on
// a 60s window, but the failure screen sits for minutes while the 5s poll keeps
// re-detecting the same failure.
const reported = new Set();

// Last value seen per key, so logObserve only writes on a real transition. The
// gen-log endpoint allows 60 posts / 5 min, which an undeduped 5s poll saturates.
const lastSeen = new Map();

// Call on a fresh generation so a retry can report its own failures instead of
// being swallowed as duplicates of the previous run's.
export function resetGenLog() {
  reported.clear();
  lastSeen.clear();
}

export function logStep(phase, stepId, from, to, meta) {
  console.log(`[gen:${phase}] ${stepId}: ${from} -> ${to}`, meta ?? "");
}

/**
 * Record a one-off lifecycle event (resume entry, backstop fired, gate decision).
 * Goes to the console and to logs/generation.log. Not deduped: callers fire these
 * on discrete actions, not on a timer.
 */
export function logEvent(event, data = {}) {
  console.log(`[gen] ${event}`, data);
  postGenLog(event, data);
}

/**
 * Record a polled observation, but only when it actually changed. `key` scopes the
 * comparison (e.g. `${sessionId}:poll`); `data` is compared by JSON identity.
 */
export function logObserve(key, event, data = {}) {
  const sig = JSON.stringify(data);
  if (lastSeen.get(key) === sig) return;
  lastSeen.set(key, sig);
  console.log(`[gen] ${event}`, data);
  postGenLog(event, data);
}

export function logWarning({ phase, stepId, reason }) {
  console.warn(`[gen:${phase}] ${stepId} degraded: ${reason}`);
}

/**
 * Record a failure. `body` should carry the raw backend payload so the console
 * shows what the server actually said, not just the user-safe string.
 */
export function logFailure({ phase, stepId, reason, status, body, err, sessionId }) {
  console.error(`[gen:${phase}] ${stepId || "unknown"} FAILED: ${reason}`, {
    status,
    body,
    error: err,
  });

  const key = `${sessionId || "no-session"}|${stepId || "unknown"}`;
  if (reported.has(key)) return;
  reported.add(key);

  postGenLog("client.failure", { sessionId, phase, stepId, reason, status });

  const detail = body !== undefined && body !== null ? safeStringify(body) : err?.stack || undefined;

  reportClientError({
    kind: "generation-failed",
    message: `[${phase}/${stepId || "unknown"}] ${reason}`,
    status,
    stack: detail,
  });
}

function safeStringify(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
