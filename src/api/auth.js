const API_URL = 'http://localhost:3000/api';

// Store token in localStorage
export const setToken = (token) => localStorage.setItem('token', token);
export const getToken = () => localStorage.getItem('token');
export const removeToken = () => localStorage.removeItem('token');

// Auth header helper
export const authHeader = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

// Register user
export async function register(username, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  
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
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  
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
  
  const data = await res.json();
  return data.user;
}

// Update profile (protected)
export async function updateProfile({ username, email }) {
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ username, email }),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.user;
}

// Change password (protected)
export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_URL}/auth/password`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
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