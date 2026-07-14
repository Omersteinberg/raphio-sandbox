import api from '../services/api.js';
import { API_BASE } from '../config.js';
import { setToken, getToken, removeToken } from '../lib/token.js';

const API_URL = API_BASE;

// Token storage lives in lib/token.js (see the note there). Re-exported so the
// long-standing `@/api/auth` import path keeps working.
export { setToken, getToken, removeToken };

// Auth header helper
export const authHeader = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

// Register user
export async function register(username, email, password) {
  const { data } = await api.post(`${API_URL}/auth/register`, { username, email, password });
  setToken(data.token);
  return data.user;
}

// Login
export async function login(username, password) {
  const { data } = await api.post(`${API_URL}/auth/login`, { username, password });
  setToken(data.token);
  return data.user;
}

// Login or register with Google Identity Services credential
export async function loginWithGoogle(credential) {
  const { data } = await api.post(`${API_URL}/auth/google`, { credential });
  setToken(data.token);
  return data.user;
}

// Get current user (protected). A 401 here means the stored token is dead, so
// drop it - checkAuth below turns that into a logged-out app rather than an error.
export async function getMe() {
  try {
    const { data } = await api.get(`${API_URL}/auth/me`);
    return data.user;
  } catch (err) {
    if (err?.response?.status === 401) {
      removeToken();
      throw new Error('Session expired');
    }
    throw err;
  }
}

// Only a 401 proves the token is dead. Anything else (5xx, a 429 from the global
// rate-limiter, a dropped connection) means we could not verify it *right now* -
// clearing it there would log out a perfectly valid session on a transient blip.
function isExpiredSession(err) {
  return err?.message === 'Session expired' || err?.response?.status === 401;
}

// Update profile (protected)
export async function updateProfile({ username, email }) {
  const { data } = await api.put(`${API_URL}/auth/profile`, { username, email });
  return data.user;
}

// Change password (protected)
export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.put(`${API_URL}/auth/password`, { currentPassword, newPassword });
  return data;
}

// Request a password reset email (public)
export async function requestPasswordReset(email) {
  const { data } = await api.post(`${API_URL}/auth/forgot-password`, { email });
  return data;
}

// Complete a password reset with a token + new password (public)
export async function resetPassword(token, password) {
  const { data } = await api.post(`${API_URL}/auth/reset-password`, { token, password });
  return data;
}

// Logout
export function logout() {
  removeToken();
  window.location.href = '/login';
}

// Auth check on app load
export async function checkAuth() {
  const token = getToken();
  if (!token) return null;

  try {
    return await getMe();
  } catch (err) {
    if (isExpiredSession(err)) {
      removeToken();
    }
    return null;
  }
}
