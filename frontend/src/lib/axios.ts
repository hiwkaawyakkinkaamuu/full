import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
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

// 🚨 ดักจับ Error 401 (ตรงนี้แหละที่ต้องแก้!)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      // 🔥 หัวใจสำคัญ: ถ้าเป็นการยิงไปที่ "/users" หรือดึง "logs" แล้วติด 401 
      // "ห้ามเตะออกเด็ดขาด" ให้ปล่อยผ่านไปให้หน้า UI จัดการตัวเอง
      if (requestUrl.includes("/users") || requestUrl.includes("/logs")) {
         console.warn(`[Axios] Ignored 401 for ${requestUrl}`);
         return Promise.reject(error); 
      }

      // ถ้าเป็น API หลักอื่นๆ ที่สำคัญจริงๆ ค่อยเตะออก
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