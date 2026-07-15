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
 * Grant / set / deduct a user's credits.
 * @param {number|string} userId
 * @param {{mode:'grant'|'set'|'deduct', amount:number, note?:string}} payload
 * @returns {Promise<{balance:number, transaction:object|null}>}
 */
export async function adjustCredits(userId, payload) {
  const response = await axios.post(`${ADMIN_URL}/users/${userId}/credits`, payload);
  return response.data.data;
}
