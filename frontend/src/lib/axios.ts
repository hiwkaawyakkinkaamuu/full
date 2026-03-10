import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// ยัด Token อัตโนมัติ
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      if (requestUrl.includes("/users") || requestUrl.includes("/logs") || requestUrl.includes("/auth/login")) {
         console.warn(`[Axios] Ignored 401 for ${requestUrl}`);
         return Promise.reject(error); 
      }

      if (typeof window !== "undefined") {
        console.error("[Axios] Unauthorized. Force Logout.");
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/"; 
      }
    }
    return Promise.reject(error);
  }
);