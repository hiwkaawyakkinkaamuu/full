"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import axios from "axios";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  UploadCloud, User, Mail, Hash, MapPin, BookOpen, GraduationCap,
  ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";

// ==========================================
// 0. Configuration
// ==========================================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface Faculty { faculty_id: number; faculty_name: string; }
interface Department { department_id: number; department_name: string; }
interface Campus { campus_id: number; campus_name: string; campus_code?: string; }
interface UserProfile {
  title: string; firstname: string; lastname: string; student_number: string;
  faculty_id: string; department_id: string; campus_id: string;
  email: string; image_url?: string; provider?: string;
}

const PREFIXES = ["นาย", "นาง", "นางสาว"];

// --- Framer Motion Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function FirstLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<UserProfile>({
    title: "", firstname: "", lastname: "", student_number: "",
    faculty_id: "", department_id: "", campus_id: "", email: "", image_url: "", provider: ""
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initData = async () => {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/"); return; }
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const resMe = await axios.get(`${API_BASE_URL}/auth/me`, { headers });
        const user = resMe.data.user || resMe.data || {};
        setFormData(prev => ({
          ...prev, email: user.email || "", firstname: user.firstname || "",
          lastname: user.lastname || "", image_url: user.image_path || "",
          campus_id: user.campus_id ? String(user.campus_id) : "",
          student_number: user.student_number || "", provider: user.provider || "local",
        }));

        try {
          const resFac = await axios.get(`${API_BASE_URL}/faculty`, { headers });
          setFaculties(Array.isArray(resFac.data?.data) ? resFac.data.data : resFac.data || []);
        } catch (err) { console.error("Error faculties", err); }

        try {
          const resCam = await axios.get(`${API_BASE_URL}/campus`, { headers });
          const camData = resCam.data?.data || resCam.data;
          setCampuses(Array.isArray(camData) ? camData.map((c: any) => ({
            campus_id: c.campus_id || c.campusID, campus_name: c.campus_name || c.campusName, campus_code: c.campus_code || c.campusCode
          })) : []);
        } catch (err) { console.error("Error campuses", err); }

        setIsPageLoaded(true);
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้' });
        router.push("/");
      }
    };
    initData();
  }, [router]);

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!formData.faculty_id) { setDepartments([]); return; }
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/department/faculty/${formData.faculty_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartments(Array.isArray(res.data?.data) ? res.data.data : res.data || []);
      } catch (err) { setDepartments([]); }
    };
    fetchDepartments();
  }, [formData.faculty_id]);

  const urlToFile = async (url: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(url, { referrerPolicy: "no-referrer", cache: "no-cache" });
    if (!res.ok) throw new Error("Network response was not ok");
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "faculty_id") setFormData(prev => ({ ...prev, faculty_id: value, department_id: "" }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) return Swal.fire({ icon: 'warning', title: 'ไฟล์ไม่ถูกต้อง' });
      if (file.size > 5 * 1024 * 1024) return Swal.fire({ icon: 'error', title: 'ขนาดใหญ่เกินไป', text: 'รูปภาพต้องไม่เกิน 5MB' });
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    // Validation
    if (!formData.title || !formData.firstname.trim() || !formData.lastname.trim() || !/^\d{10}$/.test(formData.student_number) || !formData.campus_id || !formData.faculty_id || !formData.department_id) {
      return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนและถูกต้อง' });
    }

    const isGoogleLogin = formData.provider === "google";
    const hasImage = !!selectedFile || (!!formData.image_url && formData.image_url !== "");
    if (!isGoogleLogin && !hasImage) return Swal.fire({ icon: 'warning', title: 'รูปภาพจำเป็น', text: 'กรุณาอัปโหลดรูปภาพโปรไฟล์' });

    setLoading(true);
    try {
      const payload = new FormData();
      
      // แก้ไขตรงนี้: แมปค่าให้ตรงกับ Schema ที่ Backend ต้องการ
      payload.append("prefix", formData.title); // Backend ใช้คำว่า prefix แต่ frontend ใช้ title
      payload.append("firstname", formData.firstname);
      payload.append("lastname", formData.lastname);
      payload.append("student_number", formData.student_number);
      payload.append("campus_id", formData.campus_id);
      payload.append("faculty_id", formData.faculty_id);
      payload.append("department_id", formData.department_id);

      // จัดการรูปภาพ
      if (selectedFile) {
          payload.append("profile_image", selectedFile);
      } else if (isGoogleLogin && formData.image_url) {
        try { 
            payload.append("profile_image", await urlToFile(formData.image_url, "profile.jpg", "image/jpeg")); 
        } catch (err) { 
            console.warn("Cannot convert image", err); 
        }
      }

      // ยิง API
      await axios.put(`${API_BASE_URL}/auth/first-login`, payload, { headers: { Authorization: `Bearer ${token}` } });
      
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกข้อมูลเรียบร้อย', timer: 1500, showConfirmButton: false });
      window.location.href = "/student/main/student-nomination-form";
      
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.response?.data?.message || "เกิดข้อผิดพลาด" });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
      {/* Background Animated Blobs */}
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-emerald-300/30 rounded-full blur-3xl" />
      <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity }} className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-teal-200/40 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-6xl w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col lg:flex-row relative z-10"
      >
        {/* Left Hero Panel */}
        <div className="lg:w-2/5 p-12 bg-gradient-to-br from-emerald-500 to-teal-700 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/30">
              <GraduationCap className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h2 initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              สร้างโปรไฟล์<br/><span className="text-emerald-200">นิสิตของคุณ</span>
            </motion.h2>
            <motion.p initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-emerald-50 text-lg leading-relaxed font-light">
              ยินดีต้อนรับเข้าสู่ระบบเสนอรายชื่อนิสิตดีเด่น มหาวิทยาลัยเกษตรศาสตร์ กรุณากรอกข้อมูลพื้นฐานเพื่อเริ่มต้นใช้งานระบบ
            </motion.p>
          </div>
          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-3 text-emerald-100/80 text-sm">
              <CheckCircle2 className="w-5 h-5" /> ข้อมูลปลอดภัยและได้รับการปกป้อง
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:w-3/5 p-8 sm:p-12 overflow-y-auto max-h-[90vh] custom-scrollbar bg-white/50">
          <div className="mb-8">
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">ข้อมูลส่วนตัว</h3>
            <p className="text-gray-500 mt-2">อัปเดตข้อมูลของคุณให้เป็นปัจจุบันเสมอ</p>
          </div>

          <motion.form variants={containerVariants} initial="hidden" animate="show" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Image Upload Area */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <motion.div whileHover={{ scale: 1.05 }} className="w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-100 shadow-xl bg-gray-50 flex items-center justify-center relative">
                  {imagePreview || formData.image_url ? (
                    <img src={imagePreview || formData.image_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-16 h-16 text-gray-300" />
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white">
                    <UploadCloud className="w-8 h-8 mb-1" />
                    <span className="text-xs font-medium">เปลี่ยนรูป</span>
                  </div>
                </motion.div>
                <div className="absolute bottom-1 right-1 bg-emerald-500 p-2.5 rounded-full text-white shadow-lg border-2 border-white">
                  <UploadCloud className="w-4 h-4" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <p className="text-sm text-gray-400 mt-4">ไฟล์ภาพขนาดไม่เกิน 5MB</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email (Readonly) */}
              <motion.div variants={itemVariants} className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">อีเมล (บัญชีผู้ใช้)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.email} readOnly className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-3.5 text-gray-500 cursor-not-allowed focus:ring-0 shadow-inner" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">คำนำหน้า <span className="text-red-500">*</span></label>
                  <select name="title" value={formData.title} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md appearance-none">
                    <option value="">เลือก</option>
                    {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อจริง <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md" placeholder="ชื่อ (ภาษาไทย)" />
                  </div>
                </div>
                <div className="md:col-span-4 lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">นามสกุล <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md" placeholder="นามสกุล (ภาษาไทย)" />
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสนิสิต (10 หลัก) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" name="student_number" maxLength={10} value={formData.student_number} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-700 font-mono tracking-wider focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md" placeholder="xxxxxxxxxx" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">วิทยาเขต <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select name="campus_id" value={formData.campus_id} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm appearance-none hover:shadow-md transition-shadow relative">
                    <option value="">-- เลือกวิทยาเขต --</option>
                    {campuses.map(c => <option key={c.campus_id} value={c.campus_id}>{c.campus_name} {c.campus_code && `(${c.campus_code})`}</option>)}
                  </select>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">คณะ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select name="faculty_id" value={formData.faculty_id} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm appearance-none hover:shadow-md transition-shadow relative">
                    <option value="">-- เลือกคณะ --</option>
                    {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                  </select>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">สาขาวิชา <span className="text-red-500">*</span></label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select name="department_id" value={formData.department_id} onChange={handleChange} disabled={!formData.faculty_id} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm appearance-none disabled:bg-gray-100 hover:shadow-md transition-shadow relative">
                    <option value="">-- เลือกสาขา --</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(16, 185, 129, 0.4)" }} 
                whileTap={{ scale: 0.98 }} 
                type="submit" 
                disabled={loading} 
                className={`group px-8 py-4 rounded-2xl font-bold text-white flex items-center gap-3 transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/30'}`}
              >
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> กำลังบันทึก...</>
                ) : (
                  <>บันทึกข้อมูล <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </motion.button>
            </motion.div>
            
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}