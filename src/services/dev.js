import axios from "./api.js";
import { API_BASE as BASE } from "../config.js";

// Client for the backend's dev-only mock-harness control plane. Those routes are
// mounted only when the API runs with MOCK_AI and NODE_ENV !== 'production', so
// every call here 404s in a normal build. Only MockDevPanel uses this module, and
// that panel renders nothing unless mock mode is on.
const DEV_BASE = `${BASE}/dev`;

/** Arm a session's fault injection. Throws on an unknown failStep/failMode. */
export const armMock = (sessionId, arm) =>
  axios.post(`${DEV_BASE}/mock/arm`, { sessionId, ...arm }).then((r) => r.data);

export const disarmMock = (sessionId) =>
  axios.post(`${DEV_BASE}/mock/disarm`, { sessionId }).then((r) => r.data);

/**
 * Age a session's liveness timestamps so the real watchdog reaps it on the next
 * read or sweep, instead of waiting out the backend's 15-minute STALE_MS.
 */
export const backdate = (sessionId, seconds = 16 * 60) =>
  axios.post(`${DEV_BASE}/backdate`, { sessionId, seconds }).then((r) => r.data);

/** Run sweepStuckGenerations + sweepStuckJobs now. */
export const sweep = () => axios.post(`${DEV_BASE}/sweep`, {}).then((r) => r.data);

export const setCredits = (userId, credits) =>
  axios.post(`${DEV_BASE}/credits`, { userId, credits }).then((r) => r.data);
