import axios from "axios";
import { getToken } from "../api/auth.js";

// Create a dedicated instance so the interceptor can't be tree-shaken
const api = axios.create();

api.interceptors.request.use((config) => {
  const token = getToken();
  console.log("[api interceptor] request to:", config.url, "| token exists:", !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
