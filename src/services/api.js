import axios from "axios";
import { getToken } from "../api/auth.js";

// Attach auth token to every request
axios.interceptors.request.use((config) => {
  const token = getToken();
  console.log("[api interceptor] request to:", config.url, "| token exists:", !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axios;
