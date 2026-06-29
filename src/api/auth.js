import { API_BASE } from '../config.js';

const API_URL = API_BASE;

// Store token in localStorage
export const setToken = (token) => localStorage.setItem('token', token);
export const getToken = () => localStorage.getItem('token');
export const removeToken = () => localStorage.removeItem('token');

// Auth header helper
export const authHeader = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

// Safe JSON parse helper
async function parseJSON(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Server error (${res.status})`);
  }
}

// Register user
export async function register(username, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

  setToken(data.token);
  return data.user;
}

// Login
export async function login(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

  setToken(data.token);
  return data.user;
}

// Login or register with Google Identity Services credential
export async function loginWithGoogle(credential) {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

  setToken(data.token);
  return data.user;
}

// Get current user (protected)
export async function getMe() {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: authHeader(),
  });
  
  if (res.status === 401) {
    removeToken();
    throw new Error('Session expired');
  }

  const data = await parseJSON(res);
  return data.user;
}

// Update profile (protected)
export async function updateProfile({ username, email }) {
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ username, email }),
  });
  
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
  return data.user;
}

// Change password (protected)
export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_URL}/auth/password`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
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
  } catch {
    removeToken();
    return null;
  }
}
