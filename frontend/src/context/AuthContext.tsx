"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/axios"; 

// 1. สร้าง Interface สำหรับ User Data เพื่อให้ TypeScript รู้จักโครงสร้างข้อมูล
export interface UserData {
  user_id?: number;
  role_id?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  is_first_login?: boolean;
  committee_data?: {
    is_chairman: boolean;
  };
  is_chairman?: boolean; // fallback กรณีที่ backend ส่งมาข้างนอกสุด
  token?: string;
  role?: string;
  [key: string]: any; // อนุญาตให้รับฟิลด์อื่นๆ เพิ่มเติมจาก Backend ได้โดยไม่ติด Error
}

// 2. นำ UserData มาใช้แทน any ใน Context Type
interface AuthContextType {
  user: UserData | null;
  login: (token: string, role: string, userData: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // 3. อัปเดต Type ของ State จาก <any> เป็น <UserData | null>
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = () => {
    api.post("/auth/logout").catch(() => {}); 
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    setUser(null);
    router.push("/");
  };

  const login = (token: string, role: string, userData: any) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    const actualUser = userData.user ? userData.user : userData;
    setUser({ ...actualUser, token, role });
  };

  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // 1. ดักหน้า Google Callback: ถ้าเป็นหน้านี้ ให้หยุดการทำงานของ AuthContext เดี๋ยวนี้
      // ปล่อยให้หน้า google-callback/page.tsx เป็นคนจัดการ Redirect เอง
      if (
        window.location.pathname.includes("/google-callback") || 
        urlParams.has("token")
      ) {
        console.log("AuthContext: Google process detected, skipping...");
        return; // ออกจากฟังก์ชันเลย ไม่ต้องทำข้างล่างต่อ
      }
      
      const token = localStorage.getItem("token");

      // 2. ถ้าไม่มี Token -> เช็คว่าจะดีดออกไหม
      if (!token) {
        // ข้อยกเว้น: หน้า Public หรือหน้า First Login ไม่ต้องดีดออก
        const isPublicPage = pathname === "/" || pathname === "/register";
        const isFirstLoginPage = pathname.includes("/student/auth/first-login");

        if (!isPublicPage && !isFirstLoginPage) {
          console.log(`AuthContext: No token on [${pathname}], redirecting...`);
          router.push("/");
        }
        setIsLoading(false);
        return;
      }

      // 3. มี Token -> ยืนยันกับ Backend
      try {
        const res = await api.get(`${API_BASE_URL}/auth/me`);
        if (res.data) {
          const userData = res.data.user || res.data;
          setUser({ ...userData, token });
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
           logout(); 
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};