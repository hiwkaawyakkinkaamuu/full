"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { 
  CheckCircle2, XCircle, Clock, Award, FileText, 
  History, UserCheck, ShieldCheck, Landmark, GraduationCap,
  ChevronDown, ChevronUp, ArrowRight, ArrowLeft,
  User, Building2, Search, CalendarDays, Phone, Mail, MapPin, Map,
  Filter // ✅ นำเข้า Filter Icon เพิ่ม
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// ฟังก์ชันสำหรับแปลง Path ไฟล์ให้ชี้ไปที่ Backend เสมอ (ป้องกัน 404)
const getFileUrl = (filePath: string) => {
  if (!filePath) return "#";
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/api$/, "");
  const cleanPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
  return `${backendUrl}/${cleanPath}`;
};

// ==========================================
// 1. Logic Mapping (ขั้นตอนการติดตามอิงตาม Seed FormStatus)
// ==========================================
const STEP_LOGIC = [
  { id: 1, label: "ยื่นเสนอชื่อ", ids: [], role: "ผู้ยื่นคำร้อง", icon: User },
  { id: 2, label: "ภาควิชา", ids: [1, 3], role: "หัวหน้าภาควิชา", icon: GraduationCap },
  { id: 3, label: "กิจการนิสิต", ids: [2, 5], role: "รองคณบดี", icon: ShieldCheck },
  { id: 4, label: "ระดับคณะ", ids: [4, 7], role: "คณบดี", icon: Landmark },
  { id: 5, label: "กองพัฒนานิสิต", ids: [6, 9], role: "เจ้าหน้าที่มหาวิทยาลัย", icon: Building2 },
  { id: 6, label: "คณะกรรมการ", ids: [8, 11], role: "คณะกรรมการพิจารณา", icon: UserCheck },
  { id: 7, label: "ประธานฯ", ids: [10, 13], role: "ประธานกรรมการ", icon: Award },
  { id: 8, label: "อธิการบดี", ids: [12, 14, 15], role: "อธิการบดี", icon: CheckCircle2 }
];

// ==========================================
// 2. Main Page Component
// ==========================================
export default function StudentTraceAndDetails() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  
  // 🌟 เพิ่ม State สำหรับจัดการ Filter ปีการศึกษา
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  
  // เก็บ Master Data
  const [metaData, setMetaData] = useState<any>({
      faculties: [],
      departments: [],
      campuses: [],
      statuses: []
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // ✅ Fetch ข้อมูลหลัก รวมถึงดึงปีการศึกษาด้วย (ใส่ catch กัน error 403/404)
        const [profileRes, statusRes, subRes, facRes, deptRes, campusRes, yearsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/form-statuses/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_BASE_URL}/awards/my/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/faculty/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_BASE_URL}/department/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_BASE_URL}/campus/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_BASE_URL}/academic-years/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
        ]);

        const profile = profileRes.data?.user || profileRes.data?.data || profileRes.data;
        setStudentProfile(profile);

        const statuses = statusRes.data?.data || [];
        const rawSubmissions = subRes.data?.data || [];
        
        // เซ็ตข้อมูลปีการศึกษา
        setAcademicYears(yearsRes.data?.data || []);
        
        setMetaData({
            faculties: facRes.data?.data || [],
            departments: deptRes.data?.data || [],
            campuses: campusRes.data?.data || [],
            statuses: statuses
        });

        // ✅ แก้ไข: ดึง Logs โดยเรียกจาก Endpoint /awards/details/:formId แทนการเรียก /logs ที่ทำให้เกิด 404
        const detailed = await Promise.all(rawSubmissions.map(async (item: any) => {
            try {
                const detailRes = await axios.get(`${API_BASE_URL}/awards/details/${item.form_id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                
                // คาดหวังว่า Backend จะส่ง logs มาใน field 'logs'
                const itemLogs = detailRes.data?.data?.logs || detailRes.data?.logs || [];

                return {
                    ...item,
                    ...detailRes.data?.data, // เผื่อมีข้อมูล detail อื่นๆ คืนมาด้วย
                    logs: itemLogs,
                    status_detail: statuses.find((s: any) => s.form_status_id === item.form_status)
                };
            } catch (e) { 
                console.error("Error fetching details for form", item.form_id, e);
                return { ...item, logs: [] }; 
            }
        }));

        setSubmissions(detailed);
      } catch (e) { 
          console.error("Error fetching data:", e); 
      } finally { 
          setLoading(false); 
      }
    };
    fetchData();
  }, []);

  // 🌟 ฟังก์ชันกรองข้อมูลตามปีการศึกษาที่เลือก
  const filteredSubmissions = selectedYear === "all" 
    ? submissions 
    : submissions.filter(item => String(item.academic_year) === selectedYear);

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans selection:bg-blue-100">
      
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {selectedItem ? (
                    <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                        <User size={20} />
                    </div>
                )}
                <div className="overflow-hidden">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight truncate">
                        {selectedItem ? "รายละเอียดข้อมูลคำร้อง" : "ระบบติดตามสถานะคำร้อง"}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {selectedItem ? `รหัสอ้างอิง: #${selectedItem.form_id}` : "ตรวจสอบประวัติและสถานะการพิจารณารางวัล"}
                    </p>
                </div>
            </div>
            {!selectedItem && (
                <Link href="/student/main/student-nomination-form" className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
                    <FileText size={16} /> ยื่นเสนอผลงานใหม่
                </Link>
            )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        <AnimatePresence mode="wait">
            {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold animate-pulse">กำลังดึงข้อมูลคำร้องของคุณ...</p>
                </motion.div>
            ) : selectedItem ? (
                <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <SubmissionDetailView item={selectedItem} metaData={metaData} />
                </motion.div>
            ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                    
                    {/* 🌟 เพิ่มส่วนหัวที่มี Filter ปีการศึกษา */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">ประวัติการยื่นเสนอผลงาน</h3>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                            <Filter size={16} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-600 whitespace-nowrap">ปีการศึกษา:</span>
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 outline-none cursor-pointer"
                            >
                                <option value="all">ทั้งหมด</option>
                                {/* วนลูปแสดงปีการศึกษาที่ดึงมาจาก API */}
                                {academicYears.map((yearObj: any, idx: number) => {
                                    const y = typeof yearObj === 'object' ? (yearObj.year || yearObj.academic_year) : yearObj;
                                    return <option key={idx} value={String(y)}>{y}</option>
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {filteredSubmissions.length === 0 ? (
                             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                                 <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                                 <p className="text-slate-500 font-medium">ไม่พบรายการคำร้องในปีการศึกษาที่เลือก</p>
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {/* ✅ เปลี่ยนไปใช้ filteredSubmissions แทน submissions ธรรมดา */}
                                {filteredSubmissions.map((item, idx) => (
                                    <DetailedTraceCard key={item.form_id} item={item} index={idx} metaData={metaData} onSelect={() => setSelectedItem(item)} />
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ==========================================
// 3. Components สำหรับแสดงผล
// ==========================================

function DetailedTraceCard({ item, index, metaData, onSelect }: any) {
  const isRejected = [3, 5, 7, 9, 11, 13, 15].includes(item.form_status);
  const isAccepted = item.form_status === 14;
  
  let statusName = metaData.statuses.find((s: any) => s.form_status_id === item.form_status)?.form_status_name || "ไม่ทราบสถานะ";
  if (item.form_status === 1) {
      statusName = "รอหัวหน้าภาควิชาพิจารณา";
  }

  const facultyName = metaData.faculties.find((f: any) => f.faculty_id === item.faculty_id)?.faculty_name || "ไม่ระบุ";

  let detailObj: any = {};
  try {
      detailObj = typeof item.form_detail === 'string' && item.form_detail.startsWith('{') 
                  ? JSON.parse(item.form_detail) 
                  : {};
  } catch(e) {}

  const showFirstName = detailObj.student_firstname || item.student_firstname;
  const showLastName = detailObj.student_lastname || item.student_lastname;
  const showStudentNumber = detailObj.student_number || item.student_number;
  const showFaculty = detailObj.faculty || facultyName;

  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200/60 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer group"
        onClick={onSelect}
    >
        <div className="space-y-6 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black tracking-widest uppercase border border-slate-200">
                    ID: #{item.form_id}
                </span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-indigo-500" /> {new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}
                </span>
                <span className="text-slate-500 text-xs font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    ปีการศึกษา {item.academic_year} เทอม {item.semester}
                </span>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-700 transition-colors">
                ประเภทรางวัล: {item.award_type}
            </h3>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><User size={14} /></div>
                    <span>{showFirstName} {showLastName} ({showStudentNumber})</span>
                </div>
                <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                <span className="text-slate-500">{showFaculty}</span>
            </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-4 w-full lg:w-auto shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-8">
            <div className="text-right w-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 lg:text-right">สถานะล่าสุด</p>
                <div className={`px-5 py-2.5 rounded-xl font-black text-sm shadow-sm border text-center ${
                    isAccepted ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    isRejected ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}>
                    {statusName.replace(/_/g, ' ')}
                </div>
            </div>
            <button className="w-full lg:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-md flex items-center justify-center gap-2">
                ดูรายละเอียด <ArrowRight size={16} />
            </button>
        </div>
    </motion.div>
  );
}

function SubmissionDetailView({ item, metaData }: { item: any, metaData: any }) {
  const [showLogs, setShowLogs] = useState(false);
  
  const getStepProgress = (statusId: number) => {
    const step = STEP_LOGIC.find((s) => s.ids.includes(statusId));
    return step ? step.id : 1;
  };
  
  const currentStep = getStepProgress(item.form_status);
  const isRejected = [3, 5, 7, 9, 11, 13, 15].includes(item.form_status);
  const isAccepted = item.form_status === 14;
  const currentRole = STEP_LOGIC.find(s => s.id === currentStep)?.role || "ระบบ";

  let detailObj: any = {};
  try {
      detailObj = typeof item.form_detail === 'string' && item.form_detail.startsWith('{') 
                  ? JSON.parse(item.form_detail) 
                  : { other_details: item.form_detail };
  } catch(e) { detailObj = { other_details: item.form_detail }; }

  let statusName = metaData.statuses.find((s: any) => s.form_status_id === item.form_status)?.form_status_name?.replace(/_/g, ' ') || "ไม่ทราบสถานะ";
  if (item.form_status === 1) {
      statusName = "รอหัวหน้าภาควิชาพิจารณา";
  }
  
  const showFirstName = detailObj.student_firstname || item.student_firstname;
  const showLastName = detailObj.student_lastname || item.student_lastname;
  const showStudentNumber = detailObj.student_number || item.student_number;
  const showEmail = detailObj.email || item.student_email;
  const showFaculty = detailObj.faculty || metaData.faculties.find((f: any) => f.faculty_id === item.faculty_id)?.faculty_name || "ไม่ระบุ";
  const showDept = detailObj.department || metaData.departments.find((d: any) => d.department_id === item.department_id)?.department_name || "ไม่ระบุ";
  const showCampus = detailObj.campus || metaData.campuses.find((c: any) => c.campusId === item.campusId)?.campusName || "ไม่ระบุ";

  const translateField = (field: string) => {
    const dictionary: Record<string, string> = {
        form_status: "สถานะ",
        form_status_id: "สถานะ",
        award_type: "ประเภทรางวัล",
        award_type_id: "ประเภทรางวัล",
        faculty_id: "คณะ",
        department_id: "ภาควิชา"
    };
    return dictionary[field] || field;
  };

  const formatValue = (field: string, value: any) => {
    if (!value) return "-";
    if (field === "form_status" || field === "form_status_id") {
        const id = parseInt(value, 10);
        if (id === 1) return "รอหัวหน้าภาควิชาพิจารณา";
        const status = metaData.statuses.find((s: any) => s.form_status_id === id);
        return status ? status.form_status_name.replace(/_/g, ' ') : value;
    }
    if (field === "faculty_id") {
        const fac = metaData.faculties.find((f: any) => f.faculty_id === parseInt(value, 10));
        return fac ? fac.faculty_name : value;
    }
    if (field === "department_id") {
        const dept = metaData.departments.find((d: any) => d.department_id === parseInt(value, 10));
        return dept ? dept.department_name : value;
    }
    return value;
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
        {/* SECTION 1: TIMELINE & STATUS */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8 md:p-10">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12 border-b border-slate-100 pb-8">
                <div className="space-y-6 flex-1">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-black tracking-widest uppercase border border-indigo-100">
                        ปีการศึกษา {item.academic_year} / {item.semester}
                    </span>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">รางวัล: {item.award_type}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-slate-500 text-xs font-bold uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-blue-500" /> ยื่นเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}
                        </span>
                        <span className="text-slate-500 text-xs font-bold uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                            <Clock size={14} className="text-orange-500" /> อัปเดตล่าสุด: {new Date(item.latest_update).toLocaleString('th-TH')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-3 shrink-0 bg-slate-50 p-6 rounded-2xl border border-slate-100 w-full lg:w-auto">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">สถานะปัจจุบัน</p>
                    <div className={`px-6 py-3 rounded-xl font-black text-base shadow-sm border transition-all w-full text-center ${
                        isAccepted ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-200" :
                        isRejected ? "bg-rose-500 text-white border-rose-400 shadow-rose-200" :
                        "bg-white text-indigo-700 border-indigo-200"
                    }`}>
                        {statusName}
                    </div>
                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-indigo-500" /> ดำเนินการโดย: <span className="text-indigo-600">{currentRole}</span>
                    </p>
                </div>
            </div>

            {/* Progress Bar Timeline */}
            <div className="relative mb-16 mt-8 hidden md:block px-2">
                <div className="absolute top-[26px] left-[28px] right-[28px] h-[6px] flex items-center z-0">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const stepTarget = i + 2; 
                        
                        const isCompleted = currentStep > stepTarget || isAccepted;
                        const isProcessing = currentStep === stepTarget && !isRejected && !isAccepted;
                        const isError = currentStep === stepTarget && isRejected;

                        return (
                            <div key={i} className="flex-1 h-full bg-slate-100 relative overflow-hidden mx-1 rounded-full">
                                {isCompleted && (
                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-indigo-500" />
                                )}
                                {isError && (
                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-rose-500" />
                                )}
                                {isProcessing && (
                                    <div className="absolute inset-0 flex">
                                        <motion.div 
                                            className="h-full w-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                                            animate={{ x: ["-100%", "100%"] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="relative z-10 flex justify-between">
                    {STEP_LOGIC.map((step, i) => {
                        const stepNum = i + 1;
                        const isActive = stepNum === currentStep && !isAccepted;
                        const isDone = stepNum < currentStep || isAccepted;
                        const isErr = isActive && isRejected;
                        const StepIcon = step.icon;

                        return (
                            <div key={i} className="flex flex-col items-center group w-14">
                                <div className="relative">
                                    {isActive && !isErr && (
                                        <div className="absolute -inset-2 bg-indigo-400/30 rounded-full animate-ping z-0"></div>
                                    )}
                                    
                                    <div className={`relative z-10 w-14 h-14 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-sm ${
                                        isDone ? "bg-indigo-600 border-indigo-600 text-white" :
                                        isErr ? "bg-rose-500 border-rose-500 text-white scale-110 shadow-rose-200" :
                                        isActive ? "bg-white border-indigo-500 text-indigo-600 scale-110 shadow-indigo-200" :
                                        "bg-white border-slate-200 text-slate-300"
                                    }`}>
                                        <StepIcon size={22} strokeWidth={isDone || isActive ? 2.5 : 2} />
                                    </div>
                                </div>
                                
                                <div className="mt-4 text-center absolute top-14 w-28 -ml-7">
                                    <p className={`text-[11px] font-black uppercase tracking-tight mt-1 ${isActive ? 'text-indigo-700' : isDone ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {step.label}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Decision Log Toggle */}
            <div className="mt-14 border-t border-slate-100 pt-6 flex flex-col items-center">
                <button onClick={() => setShowLogs(!showLogs)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all bg-slate-50 hover:bg-indigo-50 px-6 py-2.5 rounded-full border border-slate-200">
                    <History size={16} /> 
                    {showLogs ? "ซ่อนประวัติการดำเนินการ" : "ดูประวัติการดำเนินการ (Logs)"}
                    {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <AnimatePresence>
                    {showLogs && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full mt-6">
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 space-y-4">
                                {item.logs?.length > 0 ? item.logs.map((log: any, i: number) => (
                                    <div key={i} className="flex gap-4 items-start text-sm bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shrink-0"><UserCheck size={18} /></div>
                                        <div>
                                            <p className="font-bold text-slate-800">
                                                อัปเดต {translateField(log.field_name)} เป็น <span className="text-indigo-600">{formatValue(log.field_name, log.new_value)}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                <Clock size={12}/> {new Date(log.created_at).toLocaleString('th-TH')} 
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span> 
                                                ดำเนินการโดย User ID: {log.changed_by || "System"}
                                            </p>
                                        </div>
                                    </div>
                                )) : <p className="text-center text-slate-400 text-sm py-4">-- ยังไม่มีประวัติการดำเนินการ --</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* SECTION 2: FORM DETAILS (ข้อมูลทั้งหมด) */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 flex items-center gap-3">
                <FileText className="text-indigo-400" size={24} />
                <h3 className="text-xl font-black text-white">ข้อมูลรายละเอียดในคำร้องของฉัน</h3>
            </div>

            <div className="p-8 md:p-10 space-y-12">
                
                {/* 1. ข้อมูลส่วนตัวนิสิต */}
                <section>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><User size={18} /></div>
                        <h4 className="text-lg font-black text-slate-800">ข้อมูลส่วนตัว</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <ReadOnlyField label="ชื่อ-นามสกุล" value={`${showFirstName} ${showLastName}`} />
                        <ReadOnlyField label="รหัสนิสิต" value={showStudentNumber} />
                        <ReadOnlyField label="ชั้นปี" value={item.student_year} />
                        <ReadOnlyField label="คณะ" value={showFaculty} />
                        <ReadOnlyField label="สาขา/ภาควิชา" value={showDept} />
                        <ReadOnlyField label="วิทยาเขต" value={showCampus} />
                        <ReadOnlyField label="เกรดเฉลี่ย (GPA)" value={item.gpa} />
                        <ReadOnlyField label="วัน/เดือน/ปีเกิด" value={item.student_date_of_birth ? new Date(item.student_date_of_birth).toLocaleDateString('th-TH') : "-"} />
                        <ReadOnlyField label="อาจารย์ที่ปรึกษา" value={item.advisor_name} />
                    </div>
                    
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ReadOnlyField label="อีเมลติดต่อ" value={showEmail} icon={Mail} />
                        <ReadOnlyField label="เบอร์โทรศัพท์" value={item.student_phone_number} icon={Phone} />
                        <ReadOnlyField label="ที่อยู่ปัจจุบัน" value={item.student_address} icon={MapPin} className="md:col-span-2" />
                    </div>
                </section>

                {/* 2. รายละเอียดผลงาน */}
                <section>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Award size={18} /></div>
                        <h4 className="text-lg font-black text-slate-800">รายละเอียดผลงานและการเสนอชื่อ</h4>
                    </div>
                    
                    {detailObj.project_title && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <ReadOnlyField label="ชื่อโครงการ/ผลงาน" value={detailObj.project_title} className="md:col-span-2" />
                            <ReadOnlyField label="บทบาท/รางวัลที่ได้รับ" value={detailObj.prize} />
                            <ReadOnlyField label="หน่วยงานที่จัด/เวที" value={detailObj.organized_by} />
                            <ReadOnlyField label="วันที่ได้รับ/เข้าร่วม" value={detailObj.date_received} />
                            <ReadOnlyField label="ชื่อทีม (ถ้ามี)" value={detailObj.team_name} />
                        </div>
                    )}
                    
                    <ReadOnlyField 
                        label="เหตุผล/รายละเอียดเพิ่มเติม" 
                        value={detailObj.other_details || item.form_detail} 
                        isTextArea 
                        className="bg-indigo-50/50 border-indigo-100"
                    />
                </section>

                {/* 3. ไฟล์แนบ */}
                {item.files && item.files.length > 0 && (
                    <section>
                         <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center"><FileText size={18} /></div>
                            <h4 className="text-lg font-black text-slate-800">เอกสารแนบประกอบพิจารณา</h4>
                        </div>
                        <div className="flex flex-col gap-3">
                            {item.files.map((file: any, idx: number) => (
                                <a 
                                    key={idx} 
                                    href={getFileUrl(file.file_path)}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">เอกสารแนบ #{idx + 1}</p>
                                            <p className="text-xs text-slate-400 uppercase">{file.file_type} • {(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        ดูเอกสาร
                                    </span>
                                </a>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    </div>
  );
}

// --- Helper Components ---
function ReadOnlyField({ label, value, className = "", isTextArea = false, icon: Icon }: any) {
    return (
        <div className={`p-4 bg-slate-50 border border-slate-200/60 rounded-2xl ${className}`}>
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1.5 mb-1.5">
                {Icon && <Icon size={12} />} {label}
            </span>
            {isTextArea ? (
                <p className="font-semibold text-slate-800 whitespace-pre-wrap text-sm leading-relaxed p-2 bg-white rounded-xl border border-slate-100 min-h-[100px]">{value || "-"}</p>
            ) : (
                <span className="font-bold text-slate-900 text-sm block">{value || "-"}</span>
            )}
        </div>
    );
}