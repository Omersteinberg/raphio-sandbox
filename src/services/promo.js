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
 * Apply a code on the Buy Credits page. A CREDITS code is redeemed immediately;
 * a DISCOUNT code is validated and its terms returned for use at checkout.
 * @returns {Promise<{kind:'CREDITS', creditsAdded:number, credits:number, code:string}
 *   | {kind:'DISCOUNT', code:string, discountType:'PERCENT'|'AMOUNT', discountValue:number}>}
 */
export async function applyCode(code) {
  const response = await axios.post(`${PROMO_URL}/apply`, { code });
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
 * @param {{code:string, kind?:'CREDITS'|'DISCOUNT', credits?:number,
 *   discountType?:'PERCENT'|'AMOUNT', discountValue?:number, expiresAt?:string|null}} payload
 *   discountValue is a whole percent (PERCENT) or an integer of cents (AMOUNT).
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
