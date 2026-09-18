import axios from "./api.js";
import { API_BASE } from "../config.js";

const ADMIN_URL = `${API_BASE}/admin`;

/**
 * Global analytics for the overview page.
 * @param {number} days window for the per-day time series (7/30/90)
 */
export async function getStats(days = 30) {
  const response = await axios.get(`${ADMIN_URL}/stats?days=${days}`);
  return response.data.data;
}

/**
 * Paginated, searchable list of users with activity aggregates.
 * @param {{page?:number, limit?:number, search?:string}} opts
 * @returns {Promise<{users:Array, total:number, page:number, limit:number}>}
 */
export async function listUsers({ page = 1, limit = 25, search = "" } = {}) {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("limit", String(limit));
  if (search) params.append("search", search);
  const response = await axios.get(`${ADMIN_URL}/users?${params.toString()}`);
  return response.data.data;
}

/**
 * Full activity detail for one user (sessions, videos, transactions).
 */
export async function getUser(userId, { page = 1, limit = 25 } = {}) {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("limit", String(limit));
  const response = await axios.get(`${ADMIN_URL}/users/${userId}?${params.toString()}`);
  return response.data.data;
}

/**
 * Paginated gallery of every video across all users, newest first.
 * @param {{page?:number, limit?:number, search?:string, status?:string}} opts
 *        status: 'all' or a VideoStatus (COMPLETED / FAILED / PROCESSING / ...)
 * @returns {Promise<{videos:Array, total:number, page:number, limit:number, status:string}>}
 */
export async function listVideos({ page = 1, limit = 24, search = "", status = "COMPLETED" } = {}) {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("limit", String(limit));
  params.append("status", status);
  if (search) params.append("search", search);
  const response = await axios.get(`${ADMIN_URL}/videos?${params.toString()}`);
  return response.data.data;
}

/**
 * Storyboard critic runs, newest first.
 *
 * Each run is the agent looking over a session's scene frames at full resolution and
 * across the whole set, which is what the per-frame validator cannot do. Reading
 * these is how you judge whether the critic is worth letting act.
 *
 * @param {{limit?:number, sessionId?:string}} opts
 * @returns {Promise<Array>} runs with their state
 */
export async function listAgentRuns({ limit = 25, sessionId = "" } = {}) {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  if (sessionId) params.append("sessionId", sessionId);
  const response = await axios.get(`${ADMIN_URL}/agent-runs?${params.toString()}`);
  return response.data.data;
}

/**
 * One run with every step it took: tokens, cost, verdicts, and what it changed.
 * @param {number|string} runId
 */
export async function getAgentRun(runId) {
  const response = await axios.get(`${ADMIN_URL}/agent-runs/${runId}`);
  return response.data.data;
}

/**
 * Grant / set / deduct a user's credits.
 * @param {number|string} userId
 * @param {{mode:'grant'|'set'|'deduct', amount:number, note?:string}} payload
 * @returns {Promise<{balance:number, transaction:object|null}>}
 */
export async function adjustCredits(userId, payload) {
  const response = await axios.post(`${ADMIN_URL}/users/${userId}/credits`, payload);
  return response.data.data;
}
