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
            // กรณียังไม่เคยกรอกข้อมูล (First Login)
            if (role === "organization") {
                window.location.replace("/organization/auth/first-login"); 
            } else {
                window.location.replace("/student/auth/first-login");
            }
        } else {
            // กรณีเคยกรอกข้อมูลแล้ว (ไม่ใช่ First Login)
            if (role === "organization") {
                // สมมติว่าหน้าหลักองค์กรคือหน้านี้ (แก้ path ได้ตามโครงสร้างโปรเจกต์คุณ)
                window.location.replace("/organization/main/organization-nomination-form"); 
            } else {
                window.location.replace("/student/main/student-nomination-form");
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