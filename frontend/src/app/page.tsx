"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { api } from "@/lib/axios"; 
import { useAuth } from "@/context/AuthContext";

// ==========================================
// 0. Configuration & Service Layer
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// แก้ไข Interface ให้รองรับ committee_data
interface LoginResponse {
  token: string;
  role: string;
  user: {
    firstname: string;
    lastname: string;
    role_id: number;
    is_first_login: boolean;
    committee_data?: {
      is_chairman: boolean;
    };
    is_chairman?: boolean; // fallback กรณีที่ backend ส่งมาข้างนอก
  };
}

// ==========================================
// 1. Main Component
// ==========================================

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // UI States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Logic: Google Login ---
  const handleGoogleLogin = () => {
    localStorage.clear(); 
    
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  // แก้ไข: Helper: Role-based Redirect พร้อม Logic เช็ค isChairman
  const handleRedirect = (user: LoginResponse["user"]) => {
    const roleId = Number(user.role_id);
    const firstLogin = user.is_first_login;
    const isChairman = user.committee_data?.is_chairman || user.is_chairman || false;

    // ตรวจสอบเงื่อนไข First Login สำหรับนิสิต (1) และหน่วยงานภายนอก (9)
    if (firstLogin) {
      if (roleId === 1) {
        router.push("/student/auth/first-login");
        return;
      }
      if (roleId === 8) {
        router.push("/organization/auth/first-login");
        return;
      }
    }

    // เปลี่ยนไปใช้ Switch Case หรือ IF-ELSE แทน Map เพื่อรองรับ Logic ของ Role 6 ได้สะดวกขึ้น
    let targetPath = "/";

    switch (roleId) {
      case 1:
        targetPath = "/student/main/student-nomination-form";
        break;
      case 2:
        targetPath = "/head-of-department/consider";
        break;
      case 3:
        targetPath = "/associate-dean/consider";
        break;
      case 4:
        targetPath = "/dean/consider";
        break;
      case 5:
        targetPath = "/student-development/verify-submit";
        break;
      case 6:
        // เช็คว่าเป็นประธานกรรมการหรือไม่
        targetPath = isChairman 
          ? "/chairman-of-student-development-committee/consider"
          : "/student-development-committee/consider";
        break;
      case 7:
        targetPath = "/chancellor/dashboard"; // อธิการบดี
        break;
      case 8:
        targetPath = "/organization/main/organization-nomination-form"; // หน่วยงานภายนอก
        break;
      default:
        targetPath = "/";
    }
    
    router.push(targetPath);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post(`${API_BASE_URL}/auth/login`, { email, password });
      const backendData = response.data;
      const roleId = backendData.user.role_id;

      // บันทึก Token และข้อมูลลง Context โดยส่ง roleId ไปเลย
      login(backendData.token, roleId.toString(), backendData.user);

      await Swal.fire({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        text: `ยินดีต้อนรับคุณ ${backendData.user.firstname}`,
        timer: 1500,
        showConfirmButton: false,
      });

      // แก้ไข: โยน Object User ไปทั้งหมดให้ handleRedirect จัดการ
      handleRedirect(backendData.user);
    } catch (err: any) {
      console.error("Login Error:", err);
      let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      
      // ดึง Error Message จาก Backend
      const backendError = err.response?.data?.error || err.response?.data?.message;
      if (backendError === "invalid credentials" || backendError === "record not found") {
          errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      }

      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        text: errorMessage,
        confirmButtonColor: "#d33",
        confirmButtonText: "ลองใหม่อีกครั้ง",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex font-sans bg-gray-50 overflow-hidden selection:bg-green-200">
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.4s ease-out forwards; }
      `}</style>

      {/* Left Side (Branding) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#006633] to-[#004220] text-white flex-col justify-center px-16 relative">
        {/* Abstract Backgrounds */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-green-400 opacity-10 rounded-full blur-[80px]"></div>

        <div className="z-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <span className="flex w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
            <span className="text-xs font-medium tracking-wide">KU Excellence System</span>
          </div>
          
          <h1 className="text-5xl font-extrabold mb-4 leading-tight tracking-tight">
            ระบบคัดเลือก<br />นิสิตดีเด่น
          </h1>
          <p className="text-green-100/90 mb-10 text-base font-light leading-relaxed max-w-md">
            ระบบการเสนอชื่อและพิจารณานิสิตดีเด่นของมหาวิทยาลัยเกษตรศาสตร์ เพื่อส่งเสริมและยกย่องนิสิตที่มีผลงานโดดเด่นและเป็นแบบอย่างที่ดี
          </p>
          
          <div className="space-y-5">
            <FeatureItem title="เสนอรายชื่อออนไลน์" desc="ลดขั้นตอนเอกสาร สะดวก รวดเร็ว ใช้งานง่าย" delay="0ms" />
            <FeatureItem title="ติดตามสถานะได้ทันที" desc="ตรวจสอบผลการพิจารณาได้แบบ Real-time" delay="150ms" />
            <FeatureItem title="โปร่งใสและตรวจสอบได้" desc="กระบวนการพิจารณาเป็นระบบและมีมาตรฐาน" delay="300ms" />
          </div>
        </div>
      </div>

      {/* Right Side (Form) */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="w-full max-w-[460px] animate-scale-up py-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-green-600 to-emerald-500 rounded-2xl rotate-3 mx-auto mb-5 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-100/50 transform hover:rotate-0 transition-all duration-300">
              NDD
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">เข้าสู่ระบบ</h2>
            <p className="text-sm text-gray-500 mt-2">กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบ</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            
            <div className="group relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 group-focus-within:text-green-600 transition-colors">
                อีเมล
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="example@ku.th หรืออีเมลทั่วไป" 
                  className="w-full bg-white border border-gray-300 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-none placeholder-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 group-focus-within:text-green-600 transition-colors">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full bg-white border border-gray-300 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-none placeholder-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-black text-white text-sm font-semibold py-3.5 rounded-xl transition-all shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {loading ? (
                   <span className="flex items-center justify-center gap-2">
                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     กำลังเข้าสู่ระบบ...
                   </span>
                ) : "เข้าสู่ระบบ"}
              </button>
              
              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">หรือ</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin} 
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 text-sm font-semibold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-sm transform active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                </svg>
                เข้าสู่ระบบด้วย Google
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            ยังไม่มีบัญชีผู้ใช้ ? {" "}
            <Link href="/register" className="text-green-600 font-semibold hover:text-green-800 hover:underline transition-colors">
              สมัครสมาชิกที่นี่
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. Sub-Components
// ==========================================

function FeatureItem({ title, desc, delay }: { title: string; desc: string; delay: string }) {
  return (
    <div className="flex items-start space-x-4 group" style={{ animationDelay: delay }}>
      <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-green-300 group-hover:bg-green-500 group-hover:text-white group-hover:border-green-500 transition-all duration-300">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <div>
        <h4 className="font-semibold text-sm tracking-wide text-white">{title}</h4>
        <p className="text-green-100/70 text-xs font-light mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function EyeClosedIcon() { 
  return ( 
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg> 
  ); 
}

function EyeOpenIcon() { 
  return ( 
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg> 
  ); 
}