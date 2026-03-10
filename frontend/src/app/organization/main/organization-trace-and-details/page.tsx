"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { 
  CheckCircle2, Clock, Award, FileText, 
  UserCheck, ShieldCheck, Landmark, GraduationCap,
  ChevronDown, ArrowRight, ArrowLeft,
  User, Building2, CalendarDays, Phone, Mail, MapPin, Map, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


// ==========================================
// 1. Logic Mapping 
// ==========================================
const STEP_LOGIC = [
  { id: 1, label: "ยื่นเสนอชื่อ", ids: [], role: "ผู้ยื่นคำร้อง", icon: Building2 },
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
export default function OrganizationTraceAndDetails() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // State สำหรับจัดการ Filter ปีการศึกษา
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  
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

        const [statusRes, subRes, facRes, deptRes, campusRes, yearsRes] = await Promise.all([
          api.get(`/form-statuses/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get(`/awards/my/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/faculty/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get(`/department/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get(`/campus/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get(`/academic-years/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
        ]);

        const statuses = statusRes.data?.data || [];
        const rawSubmissions = subRes.data?.data || [];
        
        // จัดเรียงปีการศึกษาจากมากไปน้อย (ล่าสุดขึ้นก่อน)
        const yearsData = yearsRes.data?.data || [];
        const sortedYears = [...yearsData].sort((a: any, b: any) => {
            const yearA = typeof a === 'object' ? (a.year || a.academic_year) : a;
            const yearB = typeof b === 'object' ? (b.year || b.academic_year) : b;
            return yearB - yearA;
        });
        setAcademicYears(sortedYears);
        
        setMetaData({
            faculties: facRes.data?.data || [],
            departments: deptRes.data?.data || [],
            campuses: campusRes.data?.data || [],
            statuses: statuses
        });

        // ดึง Details
        const detailed = await Promise.all(rawSubmissions.map(async (item: any) => {
            try {
                const detailRes = await api.get(`/awards/details/${item.form_id}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });

                return {
                    ...item,
                    ...detailRes.data?.data,
                    status_detail: statuses.find((s: any) => s.form_status_id === item.form_status)
                };
            } catch (e) { 
                console.error("Error fetching details for form", item.form_id, e);
                return { ...item }; 
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

  const filteredSubmissions = selectedYear === "all" 
    ? submissions 
    : submissions.filter(item => String(item.academic_year) === selectedYear);

  // สร้างตัวเลือกสำหรับ Custom Dropdown พร้อมแปลงเป็น พ.ศ. (+543)
  const yearOptions = [
    { v: "all", l: "ทั้งหมด" },
    ...academicYears.map((yearObj: any) => {
        const y = typeof yearObj === 'object' ? (yearObj.year || yearObj.academic_year) : yearObj;
        const thaiYear = Number(y) + 543;
        return { v: String(y), l: String(thaiYear) };
    })
  ];

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
                        <Building2 size={20} />
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
                <Link href="/organization/main/organization-nomination-form" className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
                    <FileText size={16} /> เสนอรายชื่อใหม่
                </Link>
            )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        <AnimatePresence mode="wait">
            {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold animate-pulse">กำลังดึงข้อมูลคำร้องของหน่วยงาน...</p>
                </motion.div>
            ) : selectedItem ? (
                <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <SubmissionDetailView item={selectedItem} metaData={metaData} />
                </motion.div>
            ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                    
                    {/* ส่วนหัวที่มี Custom Filter Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">ประวัติการเสนอชื่อ</h3>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            <Filter size={16} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-600 whitespace-nowrap">ปีการศึกษา:</span>
                            <YearFilterDropdown value={selectedYear} onChange={setSelectedYear} options={yearOptions} />
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

// 🌟 Custom Dropdown Component
function YearFilterDropdown({ value, onChange, options }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o: any) => o.v === value)?.l || "ทั้งหมด";

  return (
      <div className="relative" ref={dropdownRef}>
          <div 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 cursor-pointer hover:border-indigo-300 hover:bg-white transition-all min-w-[120px]"
          >
              <span>{selectedLabel}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-500" : ""}`} />
          </div>

          <AnimatePresence>
              {isOpen && (
                  <motion.div
                      initial={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 z-50 w-full min-w-[140px] mt-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl overflow-hidden py-2 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
                  >
                      {options.map((o: any, i: number) => (
                          <div
                              key={i}
                              onClick={() => { onChange(o.v); setIsOpen(false); }}
                              className={`px-4 py-2.5 cursor-pointer transition-all duration-200 font-medium text-sm flex items-center justify-between
                                  ${value === o.v ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                              `}
                          >
                              {o.l}
                              {value === o.v && <CheckCircle2 size={14} className="text-indigo-600" />}
                          </div>
                      ))}
                  </motion.div>
              )}
          </AnimatePresence>
      </div>
  );
}


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
  
  // แปลงปีการศึกษาเป็น พ.ศ.
  const displayYear = Number(item.academic_year) + 543;

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
                    ปีการศึกษา {displayYear} เทอม {item.semester}
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

  // แปลงปีการศึกษาเป็น พ.ศ.
  const displayYear = Number(item.academic_year) + 543;

  return (
    <div className="space-y-8 animate-fade-in-up">

        {/* SECTION 1: TIMELINE & STATUS */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8 md:p-10">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12 border-b border-slate-100 pb-8">
                <div className="space-y-6 flex-1">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-black tracking-widest uppercase border border-indigo-100">
                        ปีการศึกษา {displayYear} / {item.semester}
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
                        <UserCheck size={14} className="text-indigo-500" /> รอพิจารณาโดย: <span className="text-indigo-600">{currentRole}</span>
                    </p>
                </div>
            </div>

            {/* Progress Bar Timeline */}
            <div className="relative mb-8 mt-8 hidden md:block px-2">
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
        </div>

        {/* SECTION 2: FORM DETAILS (ข้อมูลทั้งหมด) */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 flex items-center gap-3">
                <FileText className="text-indigo-400" size={24} />
                <h3 className="text-xl font-black text-white">ข้อมูลรายละเอียดในคำร้องของหน่วยงาน</h3>
            </div>

            <div className="p-8 md:p-10 space-y-12">
                
                {/* 1. ข้อมูลส่วนตัวนิสิต */}
                <section>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><User size={18} /></div>
                        <h4 className="text-lg font-black text-slate-800">ข้อมูลส่วนตัวนิสิตที่ได้รับการเสนอชื่อ</h4>
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

                {/* 2. ข้อมูลหน่วยงาน */}
                {item.org_name && (
                    <section>
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><Building2 size={18} /></div>
                            <h4 className="text-lg font-black text-slate-800">ข้อมูลองค์กร/หน่วยงานที่เสนอชื่อ</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <ReadOnlyField label="ชื่อหน่วยงาน" value={item.org_name} />
                            <ReadOnlyField label="ประเภทหน่วยงาน" value={item.org_type} />
                            <ReadOnlyField label="เบอร์โทรติดต่อหน่วยงาน" value={item.org_phone_number} icon={Phone} />
                            <ReadOnlyField label="ที่ตั้งหน่วยงาน" value={item.org_location} icon={Map} />
                        </div>
                    </section>
                )}

                {/* 3. รายละเอียดผลงาน */}
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
                        label="เหตุผลในการเสนอชื่อ/รายละเอียดเพิ่มเติม" 
                        value={detailObj.other_details || item.form_detail} 
                        isTextArea 
                        className="bg-indigo-50/50 border-indigo-100"
                    />
                </section>

                {/* 4. ไฟล์แนบ */}
                {item.files && item.files.length > 0 && (
                    <section>
                         <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center"><FileText size={18} /></div>
                            <h4 className="text-lg font-black text-slate-800">เอกสารแนบประกอบพิจารณา</h4>
                        </div>
                        <div className="flex flex-col gap-3">
                            {item.files.map((file: any, idx: number) => {
                                let safePath = file.file_path;
                                if (safePath.startsWith("api/")) safePath = safePath.replace("api/", "");
                                if (safePath.startsWith("/api/")) safePath = safePath.replace("/api/", "");
                                if (!safePath.startsWith("/")) safePath = "/" + safePath;

                                const fileName = file.file_name || safePath.split('/').pop() || `Document_${idx + 1}.pdf`;

                                return (
                                    <a 
                                        key={idx} 
                                        href={safePath}
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-red-200 hover:shadow-md transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-4 overflow-hidden">
                                             <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-500 font-bold text-xs group-hover:scale-110 transition-transform shrink-0">PDF</div>
                                             <div className="min-w-0">
                                                 <p className="text-sm font-bold text-gray-700 truncate group-hover:text-red-500 transition-colors">{fileName}</p>
                                                 <p className="text-xs text-gray-400">{(file.file_size / 1024).toFixed(2)} KB</p>
                                             </div>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            ดูเอกสาร
                                        </span>
                                    </a>
                                );
                            })}
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