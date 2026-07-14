import axios from "axios";
import { getToken } from "../lib/token.js";
import { reportClientError } from "./errorReporter.js";

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

// Report genuine failures to the backend (which alerts Slack). Only network
// errors (backend unreachable, the server never saw the request) and 5xx are
// reported. 4xx is expected user error (auth, validation, insufficient credits)
// and is intentionally skipped so it can't drown the real failures.
//
// PROVIDER_UNAVAILABLE is a 5xx by wire shape only: our PiAPI account being dry is
// an expected block that already alerts Slack from the server, and it fires on every
// click while the account is empty, so reporting it here would drown the real failures.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status;
      if (!error?.response) {
        reportClientError({
          kind: "network-error",
          message: error?.message || "Network request failed",
          url: error?.config?.url,
        });
      } else if (status >= 500 && error?.response?.data?.code !== "PROVIDER_UNAVAILABLE") {
        reportClientError({
          kind: `http-${status}`,
          message: error?.response?.data?.error || error?.message,
          status,
          url: error?.config?.url,
        });
      }
    } catch {
      // Never let reporting break the request chain.
    }
    return Promise.reject(error);
  }
);

export default api;
