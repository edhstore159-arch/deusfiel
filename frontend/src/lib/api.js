import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function isInsufficientBalance(err) {
  const data = err.response?.data;
  return data?.code === "insufficient_balance";
}

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("lf_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("lf_token");
      localStorage.removeItem("lf_user");
      if (!window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
        window.location.href = "/login";
      }
    }
    if (isInsufficientBalance(err)) {
      window.dispatchEvent(new CustomEvent("opencode:insufficient_balance", {
        detail: { source: err.config?.url || "api" },
      }));
    }
    return Promise.reject(err);
  }
);
