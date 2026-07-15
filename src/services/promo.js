import axios from "./api.js";
import { API_BASE } from "../config.js";

const PROMO_URL = `${API_BASE}/promo`;

/**
 * Redeem a promo code for free credits.
 * @returns {Promise<{creditsAdded:number, credits:number, code:string}>}
 */
export async function redeemCode(code) {
  const response = await axios.post(`${PROMO_URL}/redeem`, { code });
  return response.data.data;
}

/**
 * Admin: list all promo codes with redemption counts.
 */
export async function listCodes() {
  const response = await axios.get(`${PROMO_URL}/admin/codes`);
  return response.data.data.codes;
}

/**
 * Admin: create a promo code.
 * @param {{code:string, credits:number, expiresAt?:string|null}} payload
 */
export async function createCode(payload) {
  const response = await axios.post(`${PROMO_URL}/admin/codes`, payload);
  return response.data.data.code;
}

/**
 * Admin: update a code's credits / expiry / active flag.
 */
export async function updateCode(id, payload) {
  const response = await axios.patch(`${PROMO_URL}/admin/codes/${id}`, payload);
  return response.data.data.code;
}

/**
 * Admin: list the users who redeemed a given code.
 */
export async function listRedemptions(id) {
  const response = await axios.get(`${PROMO_URL}/admin/codes/${id}/redemptions`);
  return response.data.data.redemptions;
}
