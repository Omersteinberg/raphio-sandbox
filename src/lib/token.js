// Token storage, split out from api/auth.js so the axios instance can read the
// token without importing the auth module (which now imports the instance back).
export const setToken = (token) => localStorage.setItem('token', token);
export const getToken = () => localStorage.getItem('token');
export const removeToken = () => localStorage.removeItem('token');
