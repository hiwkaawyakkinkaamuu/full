"use client";

import { useState, useRef, useEffect, useMemo, ChangeEvent } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Lightbulb, Heart, Star, UploadCloud, FileText, XCircle, CheckCircle2,
  AlertCircle, Calendar, MapPin, User, Mail, Phone, GraduationCap,
  ChevronRight, Percent
} from "lucide-react";

// ==========================================
// 0. Configuration & Types
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const MAX_TOTAL_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ✅ แก้ไข: เพิ่ม Tailwind Class แบบเต็มๆ ให้กับ Card (ลดการใช้ String interpolation ที่ทำให้สีหาย)
const THEME_STYLES: Record<string, any> = {
  activity: {
    accent: "orange", border: "border-orange-200/50", gradient: "from-orange-400 to-rose-500", shadow: "shadow-orange-500/20", text: "text-orange-600", ring: "focus:ring-orange-500/30",
    cardBorder: "border-orange-500", cardBg: "bg-orange-50", cardIconBg: "bg-orange-500", cardIconText: "text-white", cardShadow: "shadow-orange-500/30", titleText: "text-orange-700", subText: "text-orange-500"
  },
  innovation: {
    accent: "purple", border: "border-purple-200/50", gradient: "from-purple-500 to-indigo-500", shadow: "shadow-purple-500/20", text: "text-purple-600", ring: "focus:ring-purple-500/30",
    cardBorder: "border-purple-500", cardBg: "bg-purple-50", cardIconBg: "bg-purple-500", cardIconText: "text-white", cardShadow: "shadow-purple-500/30", titleText: "text-purple-700", subText: "text-purple-500"
  },
  behavior: {
    accent: "blue", border: "border-blue-200/50", gradient: "from-blue-400 to-cyan-500", shadow: "shadow-blue-500/20", text: "text-blue-600", ring: "focus:ring-blue-500/30",
    cardBorder: "border-blue-500", cardBg: "bg-blue-50", cardIconBg: "bg-blue-500", cardIconText: "text-white", cardShadow: "shadow-blue-500/30", titleText: "text-blue-700", subText: "text-blue-500"
  },
  other: {
    accent: "emerald", border: "border-emerald-200/50", gradient: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-500/20", text: "text-emerald-600", ring: "focus:ring-emerald-500/30",
    cardBorder: "border-emerald-500", cardBg: "bg-emerald-50", cardIconBg: "bg-emerald-500", cardIconText: "text-white", cardShadow: "shadow-emerald-500/30", titleText: "text-emerald-700", subText: "text-emerald-500"
  },
  default: {
    accent: "gray", border: "border-gray-200/50", gradient: "from-gray-600 to-slate-800", shadow: "shadow-gray-500/20", text: "text-gray-800", ring: "focus:ring-gray-500/30",
    cardBorder: "border-slate-300", cardBg: "bg-white/60", cardIconBg: "bg-slate-100", cardIconText: "text-slate-400", cardShadow: "", titleText: "text-slate-600", subText: "text-slate-400"
  }
};

interface UserProfile {
  student_firstname: string; student_lastname: string; student_number: string;
  email: string; student_year: string; faculty: string; department: string;
  faculty_id: string; department_id: string; campus_id: string; 
  advisor_name: string; gpa: string; phone_number: string; campus: string;
  date_of_birth: string; age: string; address: string;
}

// ==========================================
// 1. Service Layer
// ==========================================
const nominationService = {
  getProfile: async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const u = response.data.user || response.data.data || response.data;
      const st = u.student_data || {}; 

      let facultyName = "-";
      let departmentName = "-";
      let campusName = "-";

      const fetchRequests: Promise<any>[] = [];
      
      if (st.faculty_id) {
          fetchRequests.push(axios.get(`${API_BASE_URL}/faculty/${st.faculty_id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => { facultyName = res.data.data?.faculty_name || res.data.faculty_name || "-"; })
              .catch(err => console.error("Failed to fetch faculty:", err))
          );
      }

      if (st.department_id) {
          fetchRequests.push(axios.get(`${API_BASE_URL}/department/${st.department_id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => { departmentName = res.data.data?.department_name || res.data.department_name || "-"; })
              .catch(err => console.error("Failed to fetch department:", err))
          );
      }

      if (u.campus_id) {
          fetchRequests.push(axios.get(`${API_BASE_URL}/campus`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => {
                  const campuses = res.data.data || res.data || [];
                  if (Array.isArray(campuses)) {
                      const found = campuses.find((c: any) => String(c.campusID) === String(u.campus_id) || String(c.campus_id) === String(u.campus_id));
                      if (found) campusName = found.campusName || found.campus_name || "-";
                  }
              })
              .catch(err => console.error("Failed to fetch campus list:", err))
          );
      }

      await Promise.all(fetchRequests);

      return {
        student_firstname: u.firstname || "", 
        student_lastname: u.lastname || "",
        student_number: st.student_number || "", 
        email: u.email || "",
        student_year: st.year ? String(st.year) : "", 
        faculty: facultyName,
        faculty_id: st.faculty_id ? String(st.faculty_id) : "",
        department: departmentName, 
        department_id: st.department_id ? String(st.department_id) : "",
        campus: campusName,
        campus_id: u.campus_id ? String(u.campus_id) : "",
        advisor_name: "", gpa: "", phone_number: "", 
        date_of_birth: "", age: "", address: ""
      };
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  },

  getCurrentTerm: async (token: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/academic-years/current`, { headers: { Authorization: `Bearer ${token}` } });
        return response.data.data;
    } catch (e) { return null; }
  },

  checkSubmissionHistory: async (token: string, currentYear: number, currentSemester: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/awards/my/submissions`, { headers: { Authorization: `Bearer ${token}` } });
      const submissions = response.data.data || [];
      return submissions.some((sub: any) => Number(sub.academic_year) === Number(currentYear) && Number(sub.semester) === Number(currentSemester));
    } catch (error) { return false; }
  },

  submitNomination: async (token: string, formData: FormData) => {
    const response = await axios.post(`${API_BASE_URL}/awards/submit`, formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

// ==========================================
// 2. Main Component
// ==========================================

export default function StudentNominationForm() {
  const router = useRouter();

  // --- UI States ---
  const [loading, setLoading] = useState(true);
  const [hasNominated, setHasNominated] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [currentTermInfo, setCurrentTermInfo] = useState<{year: number, semester: number} | null>(null);

  // --- Form Data ---
  const [awardType, setAwardType] = useState(""); 
  const [otherTitle, setOtherTitle] = useState("");
  const [otherDetails, setOtherDetails] = useState("");

  const [userProfile, setUserProfile] = useState<UserProfile>({
    student_firstname: "", student_lastname: "", student_number: "", email: "", student_year: "", faculty: "", department: "",
    faculty_id: "", department_id: "", campus_id: "",
    advisor_name: "", gpa: "", phone_number: "", campus: "", date_of_birth: "", age: "", address: ""
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displaycurrentTermInfo = currentTermInfo ? (Number(currentTermInfo.year) + 543) : "N/A";
  const totalFileSize = useMemo(() => selectedFiles.reduce((acc, file) => acc + file.size, 0), [selectedFiles]);
  const fileSizePercentage = (totalFileSize / MAX_TOTAL_FILE_SIZE_BYTES) * 100;

  const theme = useMemo(() => THEME_STYLES[awardType] || THEME_STYLES.default, [awardType]);

  // ==========================================
  // 3. Initialization
  // ==========================================

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const termData = await nominationService.getCurrentTerm(token);
        if (termData) {
            setCurrentTermInfo({ year: termData.year, semester: termData.semester });
            const isSubmitted = await nominationService.checkSubmissionHistory(token, termData.year, termData.semester);
            if (isSubmitted) {
                setAlreadySubmitted(true);
                setLoading(false);
                return;
            }
        }

        const profile = await nominationService.getProfile(token);
        if (profile) {
            setUserProfile(prev => ({...prev, ...profile}));
        }

      } catch (err) {
        console.error("Init Error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  // ==========================================
  // 4. Helper Functions
  // ==========================================

  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const today = new Date();
    const birthDate = new Date(dob);
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a.toString();
  };

  const handleProfileChange = (key: keyof UserProfile, value: string) => {
    if (key === 'date_of_birth') {
      setUserProfile(p => ({ ...p, date_of_birth: value, age: calculateAge(value) }));
    } else if (key === 'gpa') {
      if (/^\d*\.?\d{0,2}$/.test(value)) setUserProfile(p => ({ ...p, gpa: value }));
    } else if (key === 'phone_number') {
      setUserProfile(p => ({ ...p, phone_number: value.replace(/\D/g, "") }));
    } else {
      setUserProfile(p => ({ ...p, [key]: value }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.some(f => f.type !== "application/pdf")) return Swal.fire({ icon: "warning", title: "เฉพาะไฟล์ PDF", text: "กรุณาอัปโหลดเฉพาะไฟล์นามสกุล .pdf" });
      if (totalFileSize + files.reduce((acc, f) => acc + f.size, 0) > MAX_TOTAL_FILE_SIZE_BYTES) return Swal.fire({ icon: "error", title: "ขนาดไฟล์เกินกำหนด", text: `รวมสูงสุดไม่เกิน 10MB` });
      setSelectedFiles(p => [...p, ...files]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==========================================
  // 5. Validation Logic
  // ==========================================

  const validateForm = () => {
    if (!awardType) return "กรุณาเลือกประเภทรางวัล";
    if (awardType === "other" && !otherTitle.trim()) return "กรุณาระบุชื่อรางวัลหรือประเภทที่ยื่น";

    if (!userProfile.student_year) return "กรุณาเลือกชั้นปี";
    if (!userProfile.advisor_name.trim()) return "กรุณากรอกชื่ออาจารย์ที่ปรึกษา";
    if (userProfile.phone_number.length !== 10) return "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก";
    if (!userProfile.address.trim()) return "กรุณากรอกที่อยู่ปัจจุบัน";
    if (!userProfile.date_of_birth) return "กรุณาระบุวันเกิด";
    
    const currentAge = parseInt(userProfile.age);
    if (isNaN(currentAge) || currentAge < 18) return "อายุต้อง 18 ปีบริบูรณ์ขึ้นไป";

    const gpaNum = parseFloat(userProfile.gpa);
    if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4.00) return "เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00";

    if (!otherDetails.trim()) return "กรุณากรอกเหตุผลในการเสนอชื่อและความโดดเด่นของผลงาน";
    if (selectedFiles.length === 0) return "กรุณาอัปโหลดเอกสารประกอบ (PDF) อย่างน้อย 1 ไฟล์";

    return null;
  };

  // ==========================================
  // 6. Submit Logic
  // ==========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) return Swal.fire({ icon: "warning", title: "ข้อมูลไม่ครบถ้วน", text: err, confirmButtonColor: "#3b82f6", customClass: { popup: 'rounded-[24px]' } });
    
    const token = localStorage.getItem("token");
    if (!token) return;

    let awardName = "";
    if (awardType === "activity") awardName = "นอกหลักสูตรกิจกรรม";
    else if (awardType === "innovation") awardName = "ความคิดสร้างสรรค์เเละนวัตกรรม";
    else if (awardType === "behavior") awardName = "ความประพฤติดี";
    else if (awardType === "other") awardName = otherTitle.trim();

    const res = await Swal.fire({
      title: "ยืนยันการเสนอชื่อ?",
      text: "โปรดตรวจสอบข้อมูลก่อนกดส่งเข้าสู่ระบบ ท่านสามารถส่งได้เพียง 1 ครั้งต่อภาคเรียน",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันและส่งข้อมูล",
      cancelButtonText: "กลับไปแก้ไข",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#ef4444",
      customClass: { popup: 'rounded-3xl' }
    });
    if (!res.isConfirmed) return;

    setLoading(true);
    try {
      const fd = new FormData();
      
      fd.append("award_type", awardName);
      fd.append("student_firstname", userProfile.student_firstname);
      fd.append("student_lastname", userProfile.student_lastname);
      fd.append("student_number", userProfile.student_number);
      fd.append("student_email", userProfile.email);
      if (userProfile.faculty_id) fd.append("faculty_id", userProfile.faculty_id);
      if (userProfile.department_id) fd.append("department_id", userProfile.department_id);
      if (userProfile.campus_id) fd.append("campus_id", userProfile.campus_id);
      
      fd.append("student_year", userProfile.student_year);
      fd.append("advisor_name", userProfile.advisor_name);
      fd.append("student_phone_number", userProfile.phone_number);
      fd.append("student_address", userProfile.address);
      fd.append("gpa", userProfile.gpa);
      fd.append("student_date_of_birth", userProfile.date_of_birth);

      // ✅ แก้ไข: ส่ง text ไปตรงๆ แทน Object หากเป็น awardType แบบปกติ
      let formDetailValue = otherDetails;
      
      // ✅ คงรูปแบบ Object ไว้เฉพาะกรณีที่เป็น "อื่นๆ" เพราะต้องส่งชื่อรางวัลไปด้วย
      if (awardType === "other") {
          formDetailValue = JSON.stringify({
            award_title: otherTitle,
            other_details: otherDetails
          });
      }

      fd.append("form_detail", formDetailValue);
      selectedFiles.forEach(f => fd.append("files", f));

      await nominationService.submitNomination(token, fd);
      setHasNominated(true);
    } catch (e: any) {
      console.error("Submit Error:", e);
      if (e.response?.data?.message?.toLowerCase().includes("duplicate")) setAlreadySubmitted(true);
      else Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการส่งข้อมูล", text: e.message });
    } finally { setLoading(false); }
  };

  // ==========================================
  // 7. Render
  // ==========================================

  if (loading) return <LoadingScreen />;
  if (hasNominated) return <StatusScreen icon={CheckCircle2} color="emerald" title="สำเร็จ!" msg="ระบบได้รับข้อมูลการเสนอชื่อของท่านเรียบร้อยแล้ว ท่านสามารถติดตามสถานะการพิจารณาได้ที่เมนูติดตามสถานะ" />;
  if (alreadySubmitted) return <StatusScreen icon={AlertCircle} color="amber" title="ดำเนินการแล้ว" msg={`ท่านได้ทำการเสนอชื่อในปีการศึกษา ${displaycurrentTermInfo}/${currentTermInfo?.semester} เรียบร้อยแล้ว ไม่สามารถส่งซ้ำได้`} />;

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 font-sans selection:bg-blue-200 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-purple-400/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="max-w-6xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-[2.5rem] p-8 md:p-14 border border-white">
          
          <header className="mb-14 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <motion.h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight mb-4">
                ยื่นเสนอประวัติและผลงาน
              </motion.h1>
              <p className="text-slate-500 text-lg flex items-center gap-2 justify-center md:justify-start">
                <User className="w-5 h-5 text-blue-500" /> สำหรับนิสิต (พิจารณาตนเอง)
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-16">
            
            {/* Step 1: Award Type */}
            <Section num={1} title="เลือกประเภทรางวัลที่ต้องการเสนอชื่อ" theme={theme}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TypeCard type="activity" active={awardType} set={setAwardType} title="นอกหลักสูตรกิจกรรม" sub="ผู้นำ/แข่งขัน" icon={Trophy} />
                <TypeCard type="innovation" active={awardType} set={setAwardType} title="ความคิดสร้างสรรค์เเละนวัตกรรม" sub="สิ่งประดิษฐ์/วิจัย" icon={Lightbulb} />
                <TypeCard type="behavior" active={awardType} set={setAwardType} title="ความประพฤติดี" sub="จิตอาสา/คุณธรรม" icon={Heart} />
                <TypeCard type="other" active={awardType} set={setAwardType} title="อื่นๆ" sub="ระบุชื่อรางวัลเอง" icon={Star} />
              </div>
              <AnimatePresence>
                {awardType === "other" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-6">
                    <Input label="ชื่อรางวัลหรือประเภทที่ต้องการยื่นเสนอ" val={otherTitle} set={setOtherTitle} icon={Star} theme={theme} placeholder="เช่น รางวัลเยาวชนต้นแบบ, ผู้สร้างชื่อเสียงให้มหาวิทยาลัย..." req />
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>

            <AnimatePresence>
              {awardType && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="space-y-16">
                  
                  {/* Step 2: Student Profile */}
                  <Section num={2} title="ข้อมูลส่วนตัวนิสิต" theme={theme}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                        <ReadOnly label="ชื่อ-นามสกุล" val={`${userProfile.student_firstname} ${userProfile.student_lastname}`} />
                        <ReadOnly label="รหัสนิสิต" val={userProfile.student_number} />
                        <ReadOnly label="อีเมล" val={userProfile.email} />
                        <ReadOnly label="คณะ" val={userProfile.faculty} />
                        <ReadOnly label="สาขา/ภาควิชา" val={userProfile.department} />
                        <ReadOnly label="วิทยาเขต" val={userProfile.campus} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200/60">
                      <Select label="ชั้นปี" val={userProfile.student_year} set={(v: string) => handleProfileChange("student_year", v)} options={[1,2,3,4,5,6].map(y => ({v:y, l:`ปี ${y}`}))} icon={GraduationCap} theme={theme} req />
                      <Input label="เกรดเฉลี่ยสะสม (GPA)" val={userProfile.gpa} set={(v: string) => handleProfileChange("gpa", v)} icon={Percent} theme={theme} req />
                      <Input label="ชื่ออาจารย์ที่ปรึกษา" val={userProfile.advisor_name} set={(v: string) => handleProfileChange("advisor_name", v)} icon={GraduationCap} theme={theme} req />
                      <Input label="เบอร์โทรศัพท์ติดต่อ" val={userProfile.phone_number} set={(v: string) => handleProfileChange("phone_number", v)} icon={Phone} theme={theme} req max={10} />
                      <Input label="วันเกิด" val={userProfile.date_of_birth} set={(v: string) => handleProfileChange("date_of_birth", v)} icon={Calendar} theme={theme} type="date" req />
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">อายุ (ปี)</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="w-5 h-5 text-slate-400" /></div>
                          <input type="text" value={userProfile.age} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 outline-none text-slate-500 font-medium cursor-not-allowed" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">ที่อยู่ปัจจุบัน <span className="text-rose-500">*</span></label>
                        <textarea value={userProfile.address} onChange={(e) => handleProfileChange("address", e.target.value)} rows={3} className={`w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 outline-none transition-all ${theme.ring} hover:border-slate-300 resize-none`} placeholder="ระบุรายละเอียดที่อยู่ปัจจุบันที่สามารถติดต่อได้..." />
                      </div>
                    </div>
                  </Section>

                  {/* Step 3: Specific Details */}
                  <Section num={3} title="เหตุผลในการเสนอชื่อและความโดดเด่น" theme={theme}>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                          รายละเอียด ความดี ผลงาน หรือบทบาทหน้าที่ <span className="text-rose-500">*</span>
                        </label>
                        <textarea value={otherDetails} onChange={(e) => setOtherDetails(e.target.value)} rows={6} className={`w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 outline-none transition-all ${theme.ring} hover:border-slate-300 resize-none`} placeholder="บรรยายรายละเอียด ความดี ผลงาน หรือบทบาทหน้าที่อย่างชัดเจน..." />
                    </div>
                  </Section>

                  {/* Step 4: File Uploads */}
                  <Section num={4} title="แนบเอกสารหลักฐาน (PDF)" theme={theme}>
                    <div onClick={() => fileInputRef.current?.click()} className={`group relative overflow-hidden border-2 border-dashed border-slate-300 hover:border-${theme.accent}-400 rounded-[2rem] p-12 text-center cursor-pointer transition-all duration-300 bg-white/40 hover:bg-white/80`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      <motion.div whileHover={{ scale: 1.05 }} className={`w-20 h-20 mx-auto bg-${theme.accent}-100 rounded-full flex items-center justify-center mb-6 shadow-sm`}>
                        <UploadCloud className={`w-10 h-10 text-${theme.accent}-600`} />
                      </motion.div>
                      <h4 className="text-xl font-bold text-slate-800 mb-2">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h4>
                      <p className="text-slate-500 text-sm">รองรับเฉพาะไฟล์ .PDF (ขนาดรวมไม่เกิน 10MB)</p>
                      
                      <div className="max-w-xs mx-auto mt-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                          <span>พื้นที่ที่ใช้ไป</span>
                          <span className={fileSizePercentage > 100 ? "text-rose-500" : ""}>{formatBytes(totalFileSize)} / 10MB</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(fileSizePercentage, 100)}%` }} className={`h-full ${fileSizePercentage > 100 ? 'bg-rose-500' : `bg-${theme.accent}-500`}`} />
                        </div>
                      </div>
                      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                    </div>

                    <AnimatePresence>
                      {selectedFiles.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedFiles.map((file, i) => (
                            <motion.div key={i} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex items-center gap-4 overflow-hidden">
                                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0"><FileText className="w-6 h-6" /></div>
                                <div className="truncate">
                                  <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => setSelectedFiles(p => p.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                                <XCircle className="w-5 h-5" />
                              </button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Section>

                  {/* Submit Button */}
                  <div className="pt-8 flex justify-end">
                    <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} type="submit" className={`px-10 py-5 rounded-2xl bg-gradient-to-r ${theme.gradient} text-white font-bold text-lg shadow-xl ${theme.shadow} flex items-center gap-3 transition-all`}>
                      ยืนยันการเสนอรายชื่อ <ChevronRight className="w-6 h-6" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 3. Beautiful Sub-components
// ==========================================

const Section = ({ num, title, children, theme }: any) => (
  <motion.div className={`bg-white/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border ${theme.border} relative overflow-hidden shadow-lg shadow-slate-200/20`}>
    <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${theme.gradient} opacity-80`} />
    <div className="flex items-center gap-4 mb-8">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center font-black text-xl shadow-lg ${theme.shadow}`}>
        {num}
      </div>
      <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
    </div>
    {children}
  </motion.div>
);

// ✅ แก้ไข: ให้ TypeCard เรียกใช้สีจาก THEME_STYLES โดยตรง
const TypeCard = ({ type, active, set, title, sub, icon: Icon }: any) => {
  const isActive = active === type;
  const t = THEME_STYLES[type];

  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => set(type)} className={`relative cursor-pointer rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 overflow-hidden ${isActive ? `${t.cardBorder} bg-white shadow-xl ${t.cardShadow}` : 'border-slate-100 bg-white/60 hover:border-slate-300'}`}>
      {isActive && <div className={`absolute inset-0 ${t.cardBg} opacity-50 pointer-events-none`} />}
      <div className={`p-4 rounded-2xl transition-colors duration-300 z-10 ${isActive ? `${t.cardIconBg} ${t.cardIconText} shadow-md` : 'bg-slate-100 text-slate-400'}`}>
        <Icon className="w-8 h-8" strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <div className="z-10">
        <h4 className={`text-lg font-extrabold ${isActive ? t.titleText : 'text-slate-600'}`}>{title}</h4>
        <p className={`text-sm font-medium ${isActive ? t.subText : 'text-slate-400'}`}>{sub}</p>
      </div>
    </motion.div>
  );
};

const Input = ({ label, val, set, icon: Icon, theme, type = "text", req, max, placeholder }: any) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">{label} {req && <span className="text-rose-500">*</span>}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className={`w-5 h-5 text-slate-400 group-focus-within:${theme.text} transition-colors`} />
      </div>
      <input type={type} value={val} onChange={e => set(e.target.value)} maxLength={max} placeholder={placeholder} className={`w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl pl-12 pr-4 py-4 outline-none transition-all ${theme.ring} hover:border-slate-300 focus:bg-white text-slate-800 font-medium`} />
    </div>
  </div>
);

const Select = ({ label, val, set, options, icon: Icon, theme, req, disabled }: any) => (
  <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">{label} {req && <span className="text-rose-500">*</span>}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className={`w-5 h-5 text-slate-400 group-focus-within:${theme.text} transition-colors`} />
      </div>
      <select value={val} onChange={e => set(e.target.value)} disabled={disabled} className={`w-full appearance-none bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl pl-12 pr-10 py-4 outline-none transition-all ${theme.ring} hover:border-slate-300 focus:bg-white text-slate-800 font-medium`}>
        <option value="">-- เลือก --</option>
        {options.map((o: any, i: number) => <option key={i} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  </div>
);

const ReadOnly = ({ label, val }: { label: string, val: string }) => (
  <div className="bg-slate-50/80 border border-slate-100 p-5 rounded-2xl">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{label}</span>
    <span className="text-base font-bold text-slate-800">{val || "-"}</span>
  </div>
);

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const LoadingScreen = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F4F7FC]">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-16 h-16 border-4 border-slate-200 border-t-blue-500 rounded-full mb-6" />
    <p className="text-slate-500 font-bold tracking-widest animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
  </div>
);

const StatusScreen = ({ icon: Icon, color, title, msg }: any) => (
  <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white max-w-lg w-full rounded-[3rem] p-12 text-center shadow-2xl shadow-slate-200/50 border border-slate-50">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className={`w-28 h-28 mx-auto bg-${color}-50 text-${color}-500 rounded-full flex items-center justify-center mb-8`}>
        <Icon className="w-14 h-14" strokeWidth={2.5} />
      </motion.div>
      <h2 className="text-3xl font-black text-slate-800 mb-4">{title}</h2>
      <p className="text-slate-500 text-lg mb-10 leading-relaxed">{msg}</p>
      <Link href="/student/main/student-trace-and-details" className="inline-flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
        กลับสู่หน้าหลัก <ChevronRight className="w-5 h-5" />
      </Link>
    </motion.div>
  </div>
);