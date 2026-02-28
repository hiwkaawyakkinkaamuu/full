"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import axios from "axios";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Building2, Briefcase, Phone, MapPin, Mail, UploadCloud, 
  ChevronRight, Trophy, CheckCircle2, Star
} from "lucide-react";

// ==========================================
// 0. Configuration
// ==========================================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface Campus { campus_id: number; campus_name: string; campus_code?: string; }
interface OrganizationProfile {
  organization_name: string; organization_type: string; organization_location: string;
  organization_phone: string; campus_id: string; email: string;
  image_url?: string; provider?: string;
}

// --- Framer Motion Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function OrganizationFirstLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [formData, setFormData] = useState<OrganizationProfile>({
    organization_name: "", organization_type: "", organization_location: "",
    organization_phone: "", campus_id: "", email: "", image_url: "", provider: ""
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
          ...prev, email: user.email || "", image_url: user.image_path || "",
          campus_id: user.campus_id ? String(user.campus_id) : "", provider: user.provider || "local",
        }));

        try {
          const resCam = await axios.get(`${API_BASE_URL}/campus`, { headers });
          const camData = resCam.data?.data || resCam.data;
          setCampuses(Array.isArray(camData) ? camData.map((c: any) => ({
            campus_id: c.campus_id || c.campusID, campus_name: c.campus_name || c.campusName, campus_code: c.campus_code || c.campusCode
          })) : []);
        } catch (err) { console.error("Error campuses", err); }

        setIsPageLoaded(true);
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้' });
        router.push("/");
      }
    };
    initData();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) return Swal.fire({ icon: 'warning', title: 'ไฟล์ไม่ถูกต้อง' });
      if (file.size > 5 * 1024 * 1024) return Swal.fire({ icon: 'error', title: 'ขนาดใหญ่เกินไป' });
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!formData.organization_name.trim() || !formData.organization_type.trim() || !formData.organization_location.trim() || !formData.organization_phone.trim() || !formData.campus_id) {
      return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกข้อมูลหน่วยงานให้ครบถ้วน' });
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("prefix", "-");
      payload.append("firstname", formData.organization_name);
      payload.append("lastname", "-");
      payload.append("campus_id", formData.campus_id);
      payload.append("organization_name", formData.organization_name);
      payload.append("organization_type", formData.organization_type);
      payload.append("organization_location", formData.organization_location);
      payload.append("organization_phone", formData.organization_phone);
      if (selectedFile) payload.append("profile_image", selectedFile);

      await axios.put(`${API_BASE_URL}/auth/first-login`, payload, { headers: { Authorization: `Bearer ${token}` } });
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกข้อมูลหน่วยงานเรียบร้อย', timer: 1500, showConfirmButton: false });
      window.location.href = "/organization/main/organization-nomination-form";
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.response?.data?.message || "เกิดข้อผิดพลาด" });
    } finally { setLoading(false); }
  };

  if (!isPageLoaded) return (
    <div className="min-h-screen bg-indigo-50 flex justify-center items-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EEF2FF] flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
      {/* Dynamic Animated Background */}
      <motion.div animate={{ x: [0, 50, 0], y: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[100px]" />
      <motion.div animate={{ x: [0, -50, 0], y: [0, 50, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-6xl w-full bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white flex flex-col lg:flex-row relative z-10 overflow-hidden"
      >
        {/* Left Hero Panel */}
        <div className="lg:w-2/5 p-12 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-900 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl z-20">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-10 border border-white/20 shadow-xl">
              <Building2 className="w-10 h-10 text-blue-100" />
            </motion.div>
            
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight">
              โปรไฟล์<br/><span className="text-blue-200">องค์กร/หน่วยงาน</span>
            </motion.h2>
            
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="text-indigo-100 text-lg leading-relaxed font-light">
              ร่วมเป็นส่วนหนึ่งในการสนับสนุนและคัดเลือกนิสิตดีเด่น มหาวิทยาลัยเกษตรศาสตร์ กรุณาระบุข้อมูลหน่วยงานของคุณเพื่อเข้าสู่ระบบ
            </motion.p>
          </div>

          <div className="relative z-10 mt-12 flex gap-4">
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-2 text-sm text-indigo-200"><CheckCircle2 className="w-5 h-5 text-blue-300"/> ตรวจสอบความถูกต้อง</div>
               <div className="flex items-center gap-2 text-sm text-indigo-200"><Star className="w-5 h-5 text-blue-300"/> สร้างความน่าเชื่อถือ</div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:w-3/5 p-8 sm:p-14 overflow-y-auto max-h-[90vh] custom-scrollbar bg-white/60">
          <div className="mb-10">
            <h3 className="text-3xl font-extrabold text-gray-800">ข้อมูลรายละเอียด</h3>
            <p className="text-gray-500 mt-2">โปรดกรอกข้อมูลของหน่วยงานหรือองค์กรที่ท่านเป็นตัวแทน</p>
          </div>

          <motion.form variants={containerVariants} initial="hidden" animate="show" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Logo Upload */}
            <motion.div variants={itemVariants} className="flex flex-col items-start mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">ตราสัญลักษณ์หน่วยงาน (ถ้ามี)</label>
              <div className="flex items-center gap-6">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <motion.div whileHover={{ scale: 1.05 }} className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-indigo-300 bg-indigo-50/50 flex items-center justify-center relative transition-colors group-hover:bg-indigo-100/50">
                    {imagePreview || formData.image_url ? (
                      <img src={imagePreview || formData.image_url} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                    ) : (
                      <Building2 className="w-10 h-10 text-indigo-300" />
                    )}
                    <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                      <UploadCloud className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">อัปโหลดโลโก้</span>
                    </div>
                  </motion.div>
                </div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  <p className="font-medium text-gray-700">อัปโหลดรูปภาพ</p>
                  <p>รองรับไฟล์ JPG, PNG หรือ GIF</p>
                  <p>ขนาดไฟล์ไม่เกิน 5MB</p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </motion.div>

            <div className="space-y-6">
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">อีเมลผู้ติดต่อ (Readonly)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.email} readOnly className="w-full bg-gray-100/80 border-none rounded-2xl pl-12 pr-4 py-4 text-gray-500 cursor-not-allowed focus:ring-0 shadow-inner" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อหน่วยงาน/องค์กร/บริษัท <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" name="organization_name" value={formData.organization_name} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md" placeholder="เช่น บริษัท เอบีซี จำกัด" />
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภทหน่วยงาน <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="organization_type" value={formData.organization_type} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md" placeholder="เช่น เอกชน, รัฐวิสาหกิจ" />
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="organization_phone" value={formData.organization_phone} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md" placeholder="เบอร์ติดต่อหน่วยงาน" />
                  </div>
                </motion.div>
              </div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ที่ตั้งหน่วยงาน <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-5 w-5 h-5 text-gray-400" />
                  <textarea name="organization_location" rows={3} value={formData.organization_location} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-shadow hover:shadow-md resize-none" placeholder="รายละเอียดที่อยู่แบบเต็ม..." />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">วิทยาเขตที่ประสานงานหลัก <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select name="campus_id" value={formData.campus_id} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none hover:shadow-md transition-shadow relative">
                    <option value="">-- เลือกวิทยาเขต --</option>
                    {campuses.map(c => <option key={c.campus_id} value={c.campus_id}>{c.campus_name} {c.campus_code && `(${c.campus_code})`}</option>)}
                  </select>
                </div>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="pt-8 mt-4 border-t border-gray-100 flex justify-end">
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.4)" }} 
                whileTap={{ scale: 0.98 }} 
                type="submit" 
                disabled={loading} 
                className={`group w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/30'}`}
              >
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> บันทึกข้อมูล...</>
                ) : (
                  <>ยืนยันและเข้าสู่ระบบ <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </motion.button>
            </motion.div>
            
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}