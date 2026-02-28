export const API_CONFIG = {
  // อ่านค่าจาก .env ถ้าไม่มีให้ใช้ localhost:8080
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api",
};

const withApiPrefix = (base: string) => {
  let b = base;
  while (b.endsWith("/")) {
    b = b.slice(0, -1);
  }
  return b.endsWith("/api") ? b : `${b}/api`;
};

export const createApiUrl = (path: string): string => {
  const base = withApiPrefix(API_CONFIG.baseUrl);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};