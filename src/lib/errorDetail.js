/**
 * Normalize an axios or job-poll error into what's safe to show a user and what
 * belongs in the log.
 *
 * `userMessage` deliberately drops the body on 5xx: the API's error middleware
 * always returns `{ error: 'Internal server error' }` for those, which tells the
 * user nothing. The raw body still reaches `logDetail`.
 *
 * Errors thrown by pollJobUntilDone carry `isJobError` and no `response`; their
 * `message` is the backend's own jobError text and is worth showing.
 */
export function describeError(err, fallback = "Something went wrong. Please try again.") {
  const status = err?.response?.status ?? null;
  const body = err?.response?.data ?? null;
  const backendMessage = body?.error || body?.message || null;

  let userMessage;
  if (err?.isJobError) {
    userMessage = err.message || fallback;
  } else if (!err?.response || status >= 500) {
    userMessage = fallback;
  } else {
    userMessage = backendMessage || fallback;
  }

  let logDetail = null;
  if (body !== null && body !== undefined) {
    logDetail = typeof body === "string" ? body : tryStringify(body);
  } else if (err?.message) {
    logDetail = err.message;
  }

  return { userMessage, logDetail, status, body };
}

function tryStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
