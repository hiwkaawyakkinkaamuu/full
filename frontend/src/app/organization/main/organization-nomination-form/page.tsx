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
  ChevronRight, Building2, Hash, Percent, BookOpen
} from "lucide-react";

// ==========================================
// 0. Configuration & Types
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const MAX_TOTAL_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// เพิ่มคลาสสีแบบเต็ม เพื่อป้องกันบัค Tailwind ไม่ยอม Render สีตามประเภท
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

interface ManualProfile {
  firstname: string; lastname: string; student_number: string; email: string;
  phone_number: string; student_year: string; gpa: string; faculty: string;
  major: string; campus: string; advisor_name: string; date_of_birth: string;
  age: string; address: string;
}

// ==========================================
// 1. Service Layer
// ==========================================
const nominationService = {
  getAllFaculties: async () => { try { return (await axios.get(`${API_BASE_URL}/faculty`)).data?.data || []; } catch { return []; } },
  getAllDepartments: async () => { try { return (await axios.get(`${API_BASE_URL}/department`)).data?.data || []; } catch { return []; } },
  getAllCampuses: async () => { try { return (await axios.get(`${API_BASE_URL}/campus`)).data?.data || []; } catch { return []; } },
  getOrgProfile: async (token: string) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const u = data.user || data.data || data;
      const org = u.OrganizationData || u.organization_data || {};
      return {
        name: org.OrganizationName || org.organization_name || u.firstname || "ไม่พบชื่อหน่วยงาน",
        type: org.OrganizationType || org.organization_type || "ไม่ระบุประเภท",
        location: org.OrganizationLocation || org.organization_location || "-",
        phone: org.OrganizationPhone || org.organization_phone || "-",
      };
    } catch { return null; }
  },
  getCurrentTerm: async (token: string) => {
    try { return (await axios.get(`${API_BASE_URL}/academic-years/current`, { headers: { Authorization: `Bearer ${token}` } })).data?.data; } catch { return null; }
  },
  checkSubmissionHistory: async (token: string, year: number, sem: number) => {
    try {
      const subs = (await axios.get(`${API_BASE_URL}/awards/my/submissions`, { headers: { Authorization: `Bearer ${token}` } })).data?.data || [];
      return subs.some((s: any) => Number(s.academic_year) === Number(year) && Number(s.semester) === Number(sem));
    } catch { return false; }
  },
  submitNomination: async (token: string, formData: FormData) => {
    return (await axios.post(`${API_BASE_URL}/awards/submit`, formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } })).data;
  },
};

// ==========================================
// 2. Main Component
// ==========================================

export default function OrganizationNominationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasNominated, setHasNominated] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [currentTermInfo, setCurrentTermInfo] = useState<{ year: number, semester: number } | null>(null);

  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<any[]>([]);

  // --- Form Data ---
  const [awardType, setAwardType] = useState("");
  const [otherTitle, setOtherTitle] = useState("");
  const [orgInfo, setOrgInfo] = useState({ name: "", type: "", location: "", phone: "" });

  const [otherDetails, setOtherDetails] = useState(""); // ใช้ตัวเดียวสำหรับทุกประเภทผลงาน

  const [manualProfile, setManualProfile] = useState<ManualProfile>({
    firstname: "", lastname: "", student_number: "", email: "", phone_number: "",
    student_year: "", gpa: "", faculty: "", major: "", campus: "", advisor_name: "", date_of_birth: "", age: "", address: ""
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFileSize = useMemo(() => selectedFiles.reduce((acc, file) => acc + file.size, 0), [selectedFiles]);
  const fileSizePercentage = (totalFileSize / MAX_TOTAL_FILE_SIZE_BYTES) * 100;
  const theme = useMemo(() => THEME_STYLES[awardType] || THEME_STYLES.default, [awardType]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return router.push("/");
      try {
        const [facs, depts, camps] = await Promise.all([nominationService.getAllFaculties(), nominationService.getAllDepartments(), nominationService.getAllCampuses()]);
        setFaculties(facs); setDepartments(depts); setCampuses(camps);
        const term = await nominationService.getCurrentTerm(token);
        if (term) {
          setCurrentTermInfo(term);
          if (await nominationService.checkSubmissionHistory(token, term.year, term.semester)) return setAlreadySubmitted(true);
        }
        const org = await nominationService.getOrgProfile(token);
        if (org) setOrgInfo(org);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (manualProfile.faculty) {
      const facId = faculties.find(f => f.faculty_name === manualProfile.faculty)?.faculty_id;
      setFilteredDepartments(facId ? departments.filter(d => d.faculty_id === facId) : departments);
    } else setFilteredDepartments([]);
  }, [manualProfile.faculty, faculties, departments]);

  const handleProfileChange = (key: keyof ManualProfile, value: string) => {
    if (key === 'date_of_birth') {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      setManualProfile(p => ({ ...p, date_of_birth: value, age: age.toString() }));
    } else if (key === 'gpa') {
      if (/^\d*\.?\d{0,2}$/.test(value)) setManualProfile(p => ({ ...p, gpa: value }));
    } else if (key === 'phone_number' || key === 'student_number') {
      setManualProfile(p => ({ ...p, [key]: value.replace(/\D/g, "") }));
    } else setManualProfile(p => ({ ...p, [key]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.some(f => f.type !== "application/pdf")) return Swal.fire({ icon: "warning", title: "เฉพาะไฟล์ PDF", text: "กรุณาอัปโหลดเฉพาะไฟล์นามสกุล .pdf" });
      if (totalFileSize + files.reduce((acc, f) => acc + f.size, 0) > MAX_TOTAL_FILE_SIZE_BYTES) return Swal.fire({ icon: "error", title: "ขนาดไฟล์เกินกำหนด", text: `รวมสูงสุดไม่เกิน 10MB` });
      setSelectedFiles(p => [...p, ...files]);
    }
  };

  const validateForm = () => {
    if (!awardType) return "กรุณาเลือกประเภทรางวัล";
    if (awardType === "other" && !otherTitle.trim()) return "กรุณาระบุชื่อรางวัล";
    const mp = manualProfile;
    if (!mp.firstname || !mp.lastname) return "กรุณากรอกชื่อ-นามสกุล นิสิต";
    if (mp.student_number.length !== 10) return "รหัสนิสิตต้องมี 10 หลัก";
    if (!mp.email.includes("@")) return "รูปแบบอีเมลไม่ถูกต้อง";
    if (mp.phone_number.length !== 10) return "เบอร์โทรศัพท์ต้องมี 10 หลัก";
    if (!mp.faculty || !mp.major || !mp.campus) return "กรุณาเลือกข้อมูลการศึกษาให้ครบถ้วน";
    if (parseFloat(mp.gpa) < 0 || parseFloat(mp.gpa) > 4.00 || !mp.gpa) return "เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00";
    if (!otherDetails.trim()) return "กรุณากรอกเหตุผลในการเสนอชื่อและความโดดเด่นของผลงาน";
    if (!selectedFiles.length) return "กรุณาแนบไฟล์เอกสารอย่างน้อย 1 ไฟล์";
    return null;
  };

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
      text: "โปรดตรวจสอบข้อมูลก่อนกดส่งเข้าสู่ระบบ",
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
      
      // ข้อมูลหลักของฟอร์ม
      fd.append("award_type", awardName);
      
      // 1. ข้อมูลนิสิต
      fd.append("student_firstname", manualProfile.firstname);
      fd.append("student_lastname", manualProfile.lastname);
      fd.append("student_number", manualProfile.student_number);
      fd.append("student_email", manualProfile.email); 
      
      const selectedFac = faculties.find(f => f.faculty_name === manualProfile.faculty);
      const selectedDept = departments.find(d => d.department_name === manualProfile.major);
      const selectedCampus = campuses.find(c => c.campus_name === manualProfile.campus || c.campusName === manualProfile.campus);
      
      if (selectedFac) fd.append("faculty_id", selectedFac.faculty_id);
      if (selectedDept) fd.append("department_id", selectedDept.department_id);
      if (selectedCampus) fd.append("campus_id", selectedCampus.campus_id || selectedCampus.campusID);

      fd.append("student_year", manualProfile.student_year);
      fd.append("advisor_name", manualProfile.advisor_name);
      fd.append("gpa", manualProfile.gpa);
      fd.append("student_date_of_birth", manualProfile.date_of_birth);
      fd.append("student_phone_number", manualProfile.phone_number);
      fd.append("student_address", manualProfile.address);

      // 2. ข้อมูลองค์กร 
      fd.append("org_name", orgInfo.name);
      fd.append("org_type", orgInfo.type);
      fd.append("org_location", orgInfo.location);
      fd.append("org_phone_number", orgInfo.phone);

      // 3. ข้อมูลรายละเอียดตามประเภทรางวัล
      // ส่ง text ไปตรงๆ แทน Object หากเป็น awardType แบบปกติ
      let formDetailValue = otherDetails;
      
      // คงรูปแบบ Object ไว้เฉพาะกรณีที่เป็น "อื่นๆ" เพราะต้องส่งชื่อรางวัลไปด้วย
      if (awardType === "other") {
          formDetailValue = JSON.stringify({
            award_title: otherTitle,
            other_details: otherDetails
          });
      }

      fd.append("form_detail", formDetailValue);
      
      // แนบไฟล์
      selectedFiles.forEach(f => fd.append("files", f));

      await nominationService.submitNomination(token, fd);
      setHasNominated(true);
    } catch (e: any) {
      if (e.response?.data?.message?.toLowerCase().includes("duplicate")) setAlreadySubmitted(true);
      else Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: e.response?.data?.message || e.message });
    } finally { setLoading(false); }
  };

  // --- Views ---
  if (loading) return <LoadingScreen />;
  if (hasNominated) return <StatusScreen icon={CheckCircle2} color="emerald" title="สำเร็จ!" msg="ระบบได้รับข้อมูลการเสนอชื่อของหน่วยงานท่านเรียบร้อยแล้ว" />;
  if (alreadySubmitted) return <StatusScreen icon={AlertCircle} color="amber" title="ดำเนินการแล้ว" msg={`หน่วยงานของท่านได้เสนอชื่อในปีการศึกษา ${currentTermInfo ? currentTermInfo.year + 543 : ""}/${currentTermInfo?.semester} แล้ว`} />;

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 font-sans selection:bg-blue-200 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-purple-400/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="max-w-6xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-[2.5rem] p-8 md:p-14 border border-white">
          
          {/* Header */}
          <header className="mb-14 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <motion.h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight mb-4">
                เสนอรายชื่อนิสิตดีเด่น
              </motion.h1>
              <p className="text-slate-500 text-lg flex items-center gap-2 justify-center md:justify-start">
                <Building2 className="w-5 h-5 text-blue-500" /> โดยหน่วยงานองค์กร หรือ คณะ
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-16">
            
            {/* Step 1: Award Type */}
            <Section num={1} title="ประเภทรางวัลที่เสนอชื่อ" theme={theme}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TypeCard type="activity" active={awardType} set={setAwardType} title="นอกหลักสูตรกิจกรรม" sub="ผู้นำ/แข่งขัน" icon={Trophy} />
                <TypeCard type="innovation" active={awardType} set={setAwardType} title="ความคิดสร้างสรรค์เเละนวัตกรรม" sub="สิ่งประดิษฐ์/วิจัย" icon={Lightbulb} />
                <TypeCard type="behavior" active={awardType} set={setAwardType} title="ความประพฤติดี" sub="จิตอาสา/คุณธรรม" icon={Heart} />
                <TypeCard type="other" active={awardType} set={setAwardType} title="อื่นๆ" sub="ระบุชื่อรางวัลเอง" icon={Star} />
              </div>
              <AnimatePresence>
                {awardType === "other" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                    <Input label="ชื่อรางวัลที่ต้องการเสนอ" val={otherTitle} set={setOtherTitle} icon={Star} theme={theme} placeholder="เช่น รางวัลเยาวชนต้นแบบ..." req />
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>

            <AnimatePresence>
              {awardType && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="space-y-16">
                  
                  {/* Step 2: Student Profile */}
                  <Section num={2} title="ข้อมูลส่วนตัวนิสิต (ผู้รับรางวัล)" theme={theme}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input label="ชื่อจริง" val={manualProfile.firstname} set={(v: string) => handleProfileChange("firstname", v)} icon={User} theme={theme} req />
                      <Input label="นามสกุล" val={manualProfile.lastname} set={(v: string) => handleProfileChange("lastname", v)} icon={User} theme={theme} req />
                      <Input label="รหัสนิสิต" val={manualProfile.student_number} set={(v: string) => handleProfileChange("student_number", v)} icon={Hash} theme={theme} req max={10} />
                      <Select label="ชั้นปี" val={manualProfile.student_year} set={(v: string) => handleProfileChange("student_year", v)} options={[1,2,3,4,5,6].map(y => ({v:y, l:`ปี ${y}`}))} icon={GraduationCap} theme={theme} req />
                      <Select label="คณะ" val={manualProfile.faculty} set={(v: string) => handleProfileChange("faculty", v)} options={faculties.map(f => ({v:f.faculty_name, l:f.faculty_name}))} icon={Building2} theme={theme} req />
                      <Select label="สาขา/ภาควิชา" val={manualProfile.major} set={(v: string) => handleProfileChange("major", v)} options={filteredDepartments.map(d => ({v:d.department_name, l:d.department_name}))} icon={BookOpen} theme={theme} disabled={!manualProfile.faculty} req />
                      <Select label="วิทยาเขต" val={manualProfile.campus} set={(v: string) => handleProfileChange("campus", v)} options={campuses.map(c => ({v:c.campus_name || c.campusName, l:c.campus_name || c.campusName}))} icon={MapPin} theme={theme} req />
                      <Input label="เกรดเฉลี่ยสะสม (GPA)" val={manualProfile.gpa} set={(v: string) => handleProfileChange("gpa", v)} icon={Percent} theme={theme} req />
                      <Input label="อีเมลติดต่อนิสิต" val={manualProfile.email} set={(v: string) => handleProfileChange("email", v)} icon={Mail} theme={theme} type="email" req />
                      <Input label="เบอร์โทรศัพท์นิสิต" val={manualProfile.phone_number} set={(v: string) => handleProfileChange("phone_number", v)} icon={Phone} theme={theme} req max={10} />
                      <Input label="วันเกิด" val={manualProfile.date_of_birth} set={(v: string) => handleProfileChange("date_of_birth", v)} icon={Calendar} theme={theme} type="date" req />
                      <Input label="ชื่ออาจารย์ที่ปรึกษา" val={manualProfile.advisor_name} set={(v: string) => handleProfileChange("advisor_name", v)} icon={GraduationCap} theme={theme} req />
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">ที่อยู่ปัจจุบัน <span className="text-rose-500">*</span></label>
                        <textarea value={manualProfile.address} onChange={(e) => handleProfileChange("address", e.target.value)} rows={3} className={`w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 outline-none transition-all ${theme.ring} hover:border-slate-300 resize-none`} placeholder="ระบุรายละเอียดที่อยู่ปัจจุบันที่สามารถติดต่อได้..." />
                      </div>
                    </div>
                  </Section>

                  {/* Step 3: Organization Details */}
                  <Section num={3} title="ข้อมูลองค์กรผู้เสนอชื่อ (อ้างอิงจากระบบของท่าน)" theme={theme}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnly label="ชื่อหน่วยงาน" val={orgInfo.name} />
                      <ReadOnly label="ประเภทหน่วยงาน" val={orgInfo.type} />
                      <ReadOnly label="เบอร์โทรศัพท์" val={orgInfo.phone} />
                      <ReadOnly label="ที่ตั้ง" val={orgInfo.location} />
                    </div>
                  </Section>

                  {/* Step 4: Specific Details (Simplified for all types) */}
                  <Section num={4} title="รายละเอียดผลงานและเหตุผลประกอบ" theme={theme}>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">เหตุผลในการเสนอชื่อและความโดดเด่นของผลงาน <span className="text-rose-500">*</span></label>
                        <textarea value={otherDetails} onChange={(e) => setOtherDetails(e.target.value)} rows={5} className={`w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 outline-none transition-all ${theme.ring} hover:border-slate-300 resize-none`} placeholder="บรรยายเหตุผล ผลงาน กิจกรรม บทบาทหน้าที่ หรือคุณงามความดีของนิสิต..." />
                    </div>
                  </Section>

                  {/* Step 5: File Uploads */}
                  <Section num={5} title="แนบเอกสารหลักฐาน (PDF)" theme={theme}>
                    <div onClick={() => fileInputRef.current?.click()} className={`group relative overflow-hidden border-2 border-dashed border-slate-300 hover:border-${theme.accent}-400 rounded-[2rem] p-12 text-center cursor-pointer transition-all duration-300 bg-white/40 hover:bg-white/80`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      <motion.div whileHover={{ scale: 1.05 }} className={`w-20 h-20 mx-auto bg-${theme.accent}-100 rounded-full flex items-center justify-center mb-6 shadow-sm`}>
                        <UploadCloud className={`w-10 h-10 text-${theme.accent}-600`} />
                      </motion.div>
                      <h4 className="text-xl font-bold text-slate-800 mb-2">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h4>
                      <p className="text-slate-500 text-sm">รองรับเฉพาะไฟล์ .PDF (ขนาดรวมไม่เกิน 10MB)</p>
                      
                      {/* Progress bar */}
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

// แก้ไข: TypeCard ดึงค่าคลาสสีจาก THEME_STYLES ทำให้ใช้งานได้ 100% ไม่มีปัญหา Tailwind ลบสี
const TypeCard = ({ type, active, set, title, sub, icon: Icon }: any) => {
  const isActive = active === type;
  const t = THEME_STYLES[type] || THEME_STYLES.default;

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
      <Link href="/organization/main/organization-trace-and-details" className="inline-flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
        กลับสู่หน้าหลัก <ChevronRight className="w-5 h-5" />
      </Link>
    </motion.div>
  </div>
);