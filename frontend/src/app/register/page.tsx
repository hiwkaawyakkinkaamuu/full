"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Service Layer
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const authService = {
  register: async (email: string, password: string) => {
    try {
      const response = await api.post(`${API_BASE_URL}/auth/register`, {
        email: email,
        password: password,
        confirmPassword: password
      });
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || 
        error.response?.data?.message || 
        "การเชื่อมต่อเซิร์ฟเวอร์ล้มเหลว";
      throw errorMessage;
    }
  },
  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// 1. Components
// ==========================================

export default function RegisterPage() {
  const router = useRouter();

  // UI States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Logic: ตรวจสอบประเภทอีเมลแบบ Real-time
  const isKuEmail = useMemo(() => email.toLowerCase().endsWith("@ku.th"), [email]);

  // --- Password Validation Logic ---
  const passwordCriteria = useMemo(() => {
    return [
      { id: 1, label: "ยาว 8 ตัวอักษรขึ้นไป", valid: password.length >= 8 },
      { id: 2, label: "มีตัวเลข (0-9)", valid: /\d/.test(password) },
      { id: 3, label: "มีอักขระพิเศษ", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
      { id: 4, label: "ตัวพิมพ์ใหญ่และเล็ก", valid: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    ];
  }, [password]);

  const isPasswordValid = passwordCriteria.every((c) => c.valid);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!EMAIL_REGEX.test(email)) {
      Swal.fire({ icon: "warning", title: "อีเมลไม่ถูกต้อง", text: "กรุณาตรวจสอบรูปแบบอีเมล" });
      return;
    }
    if (!isPasswordValid) {
      Swal.fire({ icon: "warning", title: "รหัสผ่านไม่ปลอดภัย", text: "กรุณาตั้งรหัสผ่านให้ครบตามเงื่อนไขที่กำหนด" });
      return;
    }
    if (password !== confirmPassword) {
      Swal.fire({ icon: "warning", title: "รหัสผ่านไม่ตรงกัน", text: "กรุณาตรวจสอบการยืนยันรหัสผ่าน" });
      return;
    }

    setLoading(true);
    try {
      await authService.register(email, password);

      await Swal.fire({
        icon: "success",
        title: "สมัครสมาชิกสำเร็จ",
        // แจ้งเตือนสิทธิ์ตามประเภทอีเมล
        text: isKuEmail 
          ? "ระบบลงทะเบียนให้คุณในสิทธิ์ 'นิสิต' เรียบร้อยแล้ว" 
          : "ระบบลงทะเบียนให้คุณในสิทธิ์ 'บุคคลภายนอก' เรียบร้อยแล้ว",
        timer: 2500,
        showConfirmButton: false,
      });

      router.push("/"); 
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "สมัครสมาชิกไม่สำเร็จ",
        text: typeof err === "string" ? err : "เกิดข้อผิดพลาดจากระบบ",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    // ล็อคหน้าจอด้วย h-screen และ overflow-hidden
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
            แพลตฟอร์มพิจารณาผลงานสำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์และหน่วยงานภายนอก
          </p>
          
          <div className="space-y-5">
            <FeatureItem title="แยกสิทธิ์อัตโนมัติ" desc="ระบุตัวตนด้วย @ku.th หรืออีเมลทั่วไป" delay="0ms" />
            <FeatureItem title="ตรวจสอบได้ 100%" desc="ติดตามสถานะการพิจารณาแบบเรียลไทม์" delay="150ms" />
            <FeatureItem title="ความปลอดภัยสูง" desc="ปกป้องข้อมูลส่วนบุคคลด้วยมาตรฐานสากล" delay="300ms" />
          </div>
        </div>
      </div>

      {/* Right Side (Form) */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-6 sm:p-10 relative overflow-y-auto">
        {/* เปลี่ยนจาก max-w-[400px] เป็น max-w-[460px] เพื่อความสมดุล */}
        <div className="w-full max-w-[460px] animate-scale-up py-8">
          
          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-green-600 to-emerald-500 rounded-2xl rotate-3 mx-auto mb-5 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-100/50 transform hover:rotate-0 transition-all duration-300">
              NDD
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างบัญชีใหม่</h2>
            <p className="text-sm text-gray-500 mt-2">กรอกข้อมูลอีเมลและรหัสผ่านเพื่อลงทะเบียน</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            
            {/* Email Field with Smart Badge */}
            <div className="group relative">
              <div className="flex justify-between items-end mb-1.5">
                {/* เอา ml-1 ออกและเปลี่ยนเป็น font-medium เพื่อความ Clean */}
                <label className="block text-sm font-medium text-gray-700 group-focus-within:text-green-600 transition-colors">
                  อีเมล
                </label>
                {/* Smart Badge */}
                {email && (
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${isKuEmail ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {isKuEmail ? "สิทธิ์: นิสิต" : "สิทธิ์: บุคคลภายนอก"}
                  </span>
                )}
              </div>
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

            {/* Password Fields (Grid Responsive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors">
                    {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 group-focus-within:text-green-600 transition-colors">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white border border-gray-300 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 rounded-xl px-4 py-3 text-sm text-gray-900 transition-all outline-none placeholder-gray-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors">
                    {showConfirmPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Indicators */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">เงื่อนไขความปลอดภัย</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-2">
                {passwordCriteria.map((item) => (
                  <div key={item.id} className={`flex items-center gap-2 text-xs transition-colors duration-300 ${item.valid ? "text-green-700 font-medium" : "text-gray-500"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${item.valid ? "bg-green-100 border-green-500" : "bg-white border-gray-300"}`}>
                      {item.valid && <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-black text-white text-sm font-semibold py-3.5 rounded-xl transition-all shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {loading ? (
                   <span className="flex items-center justify-center gap-2">
                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     กำลังประมวลผล...
                   </span>
                ) : "สมัครสมาชิก"}
              </button>
              
              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">หรือ</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                type="button"
                onClick={authService.googleLogin}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 text-sm font-semibold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-sm transform active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" /></svg>
                ดำเนินการต่อด้วย Google
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            มีบัญชีผู้ใช้แล้วใช่ไหม?{" "}
            <Link href="/" className="text-green-600 font-semibold hover:text-green-800 hover:underline transition-colors">
              เข้าสู่ระบบที่นี่
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

function EyeClosedIcon() { return ( <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> ); }
function EyeOpenIcon() { return ( <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> ); }