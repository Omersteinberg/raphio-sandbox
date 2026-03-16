import axios from "./api.js";
import { API_BASE } from "../config.js";

const CREDITS_URL = `${API_BASE}/credits`;

/**
 * Get current user's credit balance
 */
export async function getBalance() {
  console.log("[credits] GET", `${CREDITS_URL}/balance`);
  try {
    const response = await axios.get(`${CREDITS_URL}/balance`);
    console.log("[credits] getBalance response status:", response.status);
    console.log("[credits] getBalance response.data:", JSON.stringify(response.data));
    console.log("[credits] getBalance response.data.data:", JSON.stringify(response.data?.data));
    return response.data.data;
  } catch (err) {
    console.error("[credits] getBalance FAILED:", err.message);
    console.error("[credits] getBalance error status:", err.response?.status);
    console.error("[credits] getBalance error data:", JSON.stringify(err.response?.data));
    console.error("[credits] getBalance request headers:", JSON.stringify(err.config?.headers));
    throw err;
  }
}

/**
 * Create a Stripe Checkout session and return the URL
 */
export async function createCheckoutSession() {
  const response = await axios.post(`${CREDITS_URL}/checkout`);
  return response.data.data;
}

/**
 * Get transaction history
 */
export async function getTransactions({ limit, offset } = {}) {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await axios.get(`${CREDITS_URL}/transactions?${params.toString()}`);
  return response.data;
}
