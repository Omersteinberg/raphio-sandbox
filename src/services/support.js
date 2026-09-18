import axios from "./api.js";
import { API_BASE } from "../config.js";

const SUPPORT_URL = `${API_BASE}/support`;

/**
 * Submit the support contact form. Unauthenticated endpoint - the shared
 * axios instance still attaches a token if the user happens to be logged in,
 * which the backend just ignores.
 */
export async function submitContactForm({ name, email, category, subject, message }) {
  const response = await axios.post(`${SUPPORT_URL}/contact`, {
    name,
    email,
    category,
    subject,
    message,
  });
  return response.data;
}
