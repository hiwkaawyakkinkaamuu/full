"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function GoogleCallbackHandler() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get("token");
    const role = searchParams.get("role");
    // เช็คทั้ง first_login และชื่อ-นามสกุล (ถ้าไม่มีชื่อ = ต้องไปกรอกใหม่)
    const paramFirstLogin = searchParams.get("first_login") === "true";
    const firstname = searchParams.get("firstname");
    
    // Logic ใหม่: ถ้า Backend บอกว่าเป็น First Login หรือ ไม่มีชื่อติดมาด้วย ให้ถือว่าเป็น First Login
    const isFirstLogin = paramFirstLogin || !firstname || firstname === "";

    if (token) {
      processedRef.current = true;

      // ลบค่าเก่าเพื่อความชัวร์
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      // บันทึกค่าใหม่
      localStorage.setItem("token", token);
      localStorage.setItem("role", role || "student");
      
      const expires = new Date();
      expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000));
      document.cookie = `token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

      // อัปเดต Context
      login(token, role || "student", { 
        firstname: firstname || "", 
        role_id: role === "student" ? 1 : 2, 
        is_first_login: isFirstLogin 
      });

      console.log("Token saved. Redirecting...", { isFirstLogin, role });

      // Redirect ไปให้ถูกหน้า
      setTimeout(() => {
        if (isFirstLogin) {
            if (role === "organization") return window.location.replace("/organization/auth/first-login");
            return window.location.replace("/student/auth/first-login");
        } else {
            switch (role) {
                case "student": return window.location.replace("/student/main/student-nomination-form");
                case "organization": return window.location.replace("/organization/main/organization-nomination-form");
                case "head_of_department": return window.location.replace("/head-of-department/hall-of-fame");
                case "associate_dean": return window.location.replace("/associate-dean/hall-of-fame");
                case "dean": return window.location.replace("/dean/hall-of-fame");
                case "student_development": return window.location.replace("/student-development/hall-of-fame");
                case "student_development_committee": return window.location.replace("/student-development-committee/hall-of-fame");
                case "chairman_of_student_development_committee": return window.location.replace("/chairman-of-student-development-committee/hall-of-fame");
                case "chancellor": return window.location.replace("/chancellor/hall-of-fame");
                default: return window.location.replace("/");
            }
        }
      }, 500);

    } else {
       console.error("No token found");
       window.location.replace("/"); 
    }
  }, [searchParams, login]); 

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      <h2 className="mt-4 text-lg font-medium text-gray-600">กำลังเข้าสู่ระบบ...</h2>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GoogleCallbackHandler />
    </Suspense>
  );
}