"use client";

import { useState, useRef, useEffect, useMemo, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Lightbulb, Heart, Star, UploadCloud, FileText, XCircle, CheckCircle2,
  AlertCircle, Calendar, User, Mail, Phone, GraduationCap,
  ChevronRight, ChevronDown, Building2, Hash, Percent, BookOpen, Clock, X, ChevronLeft
} from "lucide-react";

// ==========================================
// 0. Configuration & Types
// ==========================================

const MAX_TOTAL_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const THEME_STYLES: Record<string, any> = {
  activity: {
    accent: "orange", border: "border-orange-200/50", gradient: "from-orange-400 to-rose-500", shadow: "shadow-orange-500/20", text: "text-orange-600", ring: "focus:ring-orange-500/30",
    cardBorder: "border-orange-500", cardBg: "bg-orange-50", cardIconBg: "bg-orange-500", cardIconText: "text-white", cardShadow: "shadow-orange-500/30", titleText: "text-orange-700", subText: "text-orange-500",
    dateSel: "bg-orange-500 text-white shadow-orange-500/40", dateToday: "text-orange-600 bg-orange-50 border-orange-200", dateHover: "hover:bg-orange-50 hover:text-orange-600"
  },
  innovation: {
    accent: "purple", border: "border-purple-200/50", gradient: "from-purple-500 to-indigo-500", shadow: "shadow-purple-500/20", text: "text-purple-600", ring: "focus:ring-purple-500/30",
    cardBorder: "border-purple-500", cardBg: "bg-purple-50", cardIconBg: "bg-purple-500", cardIconText: "text-white", cardShadow: "shadow-purple-500/30", titleText: "text-purple-700", subText: "text-purple-500",
    dateSel: "bg-purple-500 text-white shadow-purple-500/40", dateToday: "text-purple-600 bg-purple-50 border-purple-200", dateHover: "hover:bg-purple-50 hover:text-purple-600"
  },
  behavior: {
    accent: "blue", border: "border-blue-200/50", gradient: "from-blue-400 to-cyan-500", shadow: "shadow-blue-500/20", text: "text-blue-600", ring: "focus:ring-blue-500/30",
    cardBorder: "border-blue-500", cardBg: "bg-blue-50", cardIconBg: "bg-blue-500", cardIconText: "text-white", cardShadow: "shadow-blue-500/30", titleText: "text-blue-700", subText: "text-blue-500",
    dateSel: "bg-blue-500 text-white shadow-blue-500/40", dateToday: "text-blue-600 bg-blue-50 border-blue-200", dateHover: "hover:bg-blue-50 hover:text-blue-600"
  },
  other: {
    accent: "emerald", border: "border-emerald-200/50", gradient: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-500/20", text: "text-emerald-600", ring: "focus:ring-emerald-500/30",
    cardBorder: "border-emerald-500", cardBg: "bg-emerald-50", cardIconBg: "bg-emerald-500", cardIconText: "text-white", cardShadow: "shadow-emerald-500/30", titleText: "text-emerald-700", subText: "text-emerald-500",
    dateSel: "bg-emerald-500 text-white shadow-emerald-500/40", dateToday: "text-emerald-600 bg-emerald-50 border-emerald-200", dateHover: "hover:bg-emerald-50 hover:text-emerald-600"
  },
  default: {
    accent: "gray", border: "border-gray-200/50", gradient: "from-gray-600 to-slate-800", shadow: "shadow-gray-500/20", text: "text-gray-800", ring: "focus:ring-gray-500/30",
    cardBorder: "border-slate-300", cardBg: "bg-white/60", cardIconBg: "bg-slate-100", cardIconText: "text-slate-400", cardShadow: "", titleText: "text-slate-600", subText: "text-slate-400",
    dateSel: "bg-slate-700 text-white shadow-slate-500/40", dateToday: "text-slate-700 bg-slate-100 border-slate-300", dateHover: "hover:bg-slate-100 hover:text-slate-800"
  }
};

interface ManualProfile {
  prefix: string; firstname: string; lastname: string; student_number: string; email: string;
  phone_number: string; student_year: string; gpa: string; faculty: string;
  major: string; advisor_name: string; date_of_birth: string;
  age: string; address: string;
}

// ==========================================
// 1. Service Layer
// ==========================================
const nominationService = {
  getAllFaculties: async () => { try { return (await api.get(`/faculty`)).data?.data || []; } catch { return []; } },
  getAllDepartments: async () => { try { return (await api.get(`/department`)).data?.data || []; } catch { return []; } },
  getOrgProfile: async (token: string) => {
    try {
      const { data } = await api.get(`/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
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
    try { return (await api.get(`/academic-years/current`, { headers: { Authorization: `Bearer ${token}` } })).data?.data; } catch { return null; }
  },
  checkSubmissionHistory: async (token: string, year: number, sem: number) => {
    try {
      const subs = (await api.get(`/awards/my/submissions`, { headers: { Authorization: `Bearer ${token}` } })).data?.data || [];
      return subs.some((s: any) => Number(s.academic_year) === Number(year) && Number(s.semester) === Number(sem));
    } catch { return false; }
  },
  submitNomination: async (token: string, formData: FormData) => {
    return (await api.post(`/awards/submit`, formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } })).data;
  },
};

// ==========================================
// 🌟 Premium Birth Date Picker Component
// ==========================================
const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function PremiumBirthDatePicker({ id, value, onChange, label, theme, req, disabled, hasError, clearError }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'date' | 'month' | 'year'>('date');
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 20);
  
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : defaultDate);
  const [yearPage, setYearPage] = useState(() => viewDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setViewMode('date');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSelectDate = (day: number, month: number, year: number) => {
    const selected = new Date(year, month, day);
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(selected.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    if (clearError) clearError();
    setIsOpen(false);
    setViewMode('date');
  };

  const getCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const daysArray = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      daysArray.push({ day: daysInPrevMonth - i, month: month - 1, year: year, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push({ day: i, month: month, year: year, isCurrentMonth: true });
    }
    const remainingSlots = 42 - daysArray.length;
    for (let i = 1; i <= remainingSlots; i++) {
      daysArray.push({ day: i, month: month + 1, year: year, isCurrentMonth: false });
    }
    return daysArray;
  };

  const calendarDays = getCalendarDays();
  const isSelected = (d: number, m: number, y: number) => {
    if (!value) return false;
    const date = new Date(value);
    return d === date.getDate() && m === date.getMonth() && y === date.getFullYear();
  };

  const startYear = Math.floor(yearPage / 20) * 20;
  const yearsArray = Array.from({length: 20}, (_, i) => startYear + i);

  return (
    <div id={id} className={`scroll-mt-32 ${disabled ? "opacity-50 pointer-events-none" : ""}`} ref={containerRef}>
      <label className={`block text-sm font-bold mb-2 ml-1 transition-colors ${hasError ? 'text-rose-600' : 'text-slate-700'}`}>
        {label} {req && <span className="text-rose-500">*</span>}
      </label>
      
      <div className={`relative group ${isOpen ? 'z-[100]' : 'z-10'}`}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <Calendar className={`w-5 h-5 transition-colors ${hasError ? 'text-rose-500' : (isOpen ? theme.text : 'text-slate-400 group-hover:text-slate-500')}`} />
        </div>
        
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full cursor-pointer rounded-2xl pl-12 pr-4 py-[14px] outline-none transition-all duration-300 flex items-center justify-between
            ${hasError 
                ? 'bg-rose-50 border-2 border-rose-500 ring-4 ring-rose-500/20 text-rose-900' 
                : (isOpen ? `bg-white border-slate-300 shadow-md ${theme.ring}` : 'bg-white/50 backdrop-blur-sm border border-slate-200 hover:border-slate-300')
            }
          `}
        >
          <span className={`font-medium truncate pr-4 transition-colors ${value ? (hasError ? 'text-rose-900' : 'text-slate-800') : (hasError ? 'text-rose-400' : 'text-slate-400')}`}>
            {value ? formatDisplayDate(value) : "วัน/เดือน/ปีเกิด (คลิกเพื่อเลือก)"}
          </span>
          
          {value ? (
            <div onClick={(e) => { e.stopPropagation(); onChange(""); if(clearError) clearError(); }} className={`p-1 rounded-md transition-colors z-20 shrink-0 ${hasError ? 'text-rose-400 hover:text-rose-700' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}>
              <X size={18} />
            </div>
          ) : (
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 flex-shrink-0 ${hasError ? 'text-rose-400' : 'text-slate-400'} ${isOpen ? `rotate-180 ${theme.text}` : ''}`} />
          )}
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[340px] mt-2 bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-[24px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] z-[9999] p-5 origin-top-left"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between mb-5">
                <button 
                  type="button" 
                  onClick={(e) => { 
                      e.stopPropagation();
                      if (viewMode === 'year') setYearPage(p => p - 20);
                      else if (viewMode === 'date') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
                      else setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
                  }} 
                  className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors shadow-sm border border-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1">
                  {viewMode === 'date' && (
                    <>
                      <button type="button" onClick={() => setViewMode('month')} className={`px-2 py-1 font-bold text-[15px] rounded-lg transition-colors ${theme.dateHover} text-slate-800`}>
                        {MONTH_NAMES[viewDate.getMonth()]}
                      </button>
                      <button type="button" onClick={() => { setViewMode('year'); setYearPage(viewDate.getFullYear()); }} className={`px-2 py-1 font-bold text-[15px] rounded-lg transition-colors ${theme.dateHover} text-slate-800`}>
                        {viewDate.getFullYear() + 543}
                      </button>
                    </>
                  )}
                  {viewMode === 'month' && (
                    <button type="button" onClick={() => { setViewMode('year'); setYearPage(viewDate.getFullYear()); }} className={`px-3 py-1 font-bold text-[15px] rounded-lg transition-colors ${theme.dateHover} text-slate-800`}>
                      เลือกเดือน (ปี {viewDate.getFullYear() + 543})
                    </button>
                  )}
                  {viewMode === 'year' && (
                    <span className="font-bold text-[15px] text-slate-800 px-2 py-1">
                      พ.ศ. {startYear + 543} - {startYear + 19 + 543}
                    </span>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={(e) => { 
                      e.stopPropagation();
                      if (viewMode === 'year') setYearPage(p => p + 20);
                      else if (viewMode === 'date') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
                      else setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
                  }} 
                  className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors shadow-sm border border-slate-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* BODY - DATE MODE */}
              {viewMode === 'date' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAY_NAMES.map((day, i) => (
                      <div key={day} className={`text-center text-[11px] font-black py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
                    {calendarDays.map((d, i) => {
                      const isSel = isSelected(d.day, d.month, d.year);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectDate(d.day, d.month, d.year)}
                          className={`
                            w-9 h-9 sm:w-10 sm:h-10 mx-auto flex items-center justify-center rounded-full text-[14px] transition-all
                            ${!d.isCurrentMonth ? 'text-slate-300 hover:text-slate-500 font-medium' : 'text-slate-700 font-semibold'}
                            ${isSel ? `${theme.dateSel} scale-105 z-10 relative` : `${theme.dateHover}`}
                          `}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* BODY - MONTH MODE */}
              {viewMode === 'month' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-3 gap-3">
                  {MONTH_NAMES.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                          setViewDate(new Date(viewDate.getFullYear(), i, 1));
                          setViewMode('date');
                      }}
                      className={`py-4 rounded-2xl text-sm font-bold transition-all
                          ${viewDate.getMonth() === i ? `${theme.dateSel} shadow-md` : `bg-slate-50 text-slate-700 border border-slate-100 ${theme.dateHover}`}
                      `}
                    >
                      {m}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* BODY - YEAR MODE */}
              {viewMode === 'year' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-4 gap-2">
                  {yearsArray.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                          setViewDate(new Date(y, viewDate.getMonth(), 1));
                          setViewMode('month');
                      }}
                      className={`py-3 rounded-xl text-sm font-bold transition-all
                          ${viewDate.getFullYear() === y ? `${theme.dateSel} shadow-md` : `bg-slate-50 text-slate-700 border border-slate-100 ${theme.dateHover}`}
                      `}
                    >
                      {y + 543}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


// ==========================================
// 2. Main Component
// ==========================================

export default function OrganizationNominationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasNominated, setHasNominated] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isOutOfPeriod, setIsOutOfPeriod] = useState(false); 
  const [currentTermInfo, setCurrentTermInfo] = useState<{ year: number, semester: number } | null>(null);

  // 🌟 เพิ่ม State สำหรับเก็บ ID ช่องที่มีปัญหา (เพื่อนำไปทำ Highlight)
  const [errorFieldId, setErrorFieldId] = useState<string | null>(null);

  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<any[]>([]);

  // --- Form Data ---
  const [awardType, setAwardType] = useState("");
  const [otherTitle, setOtherTitle] = useState("");
  const [orgInfo, setOrgInfo] = useState({ name: "", type: "", location: "", phone: "" });

  const [otherDetails, setOtherDetails] = useState("");

  const [manualProfile, setManualProfile] = useState<ManualProfile>({
    prefix: "", firstname: "", lastname: "", student_number: "", email: "", phone_number: "",
    student_year: "", gpa: "", faculty: "", major: "", advisor_name: "", date_of_birth: "", age: "", address: ""
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFileSize = useMemo(() => selectedFiles.reduce((acc, file) => acc + file.size, 0), [selectedFiles]);
  const fileSizePercentage = (totalFileSize / MAX_TOTAL_FILE_SIZE_BYTES) * 100;
  const theme = useMemo(() => THEME_STYLES[awardType] || THEME_STYLES.default, [awardType]);

  // ฟังก์ชันช่วยเคลียร์การแสดงผล Error
  const clearErr = () => {
    if (errorFieldId) setErrorFieldId(null);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return router.push("/");
      try {
        const [facs, depts] = await Promise.all([nominationService.getAllFaculties(), nominationService.getAllDepartments()]);
        setFaculties(facs); setDepartments(depts);
        
        const term = await nominationService.getCurrentTerm(token);
        if (term) {
          setCurrentTermInfo(term);
          if (await nominationService.checkSubmissionHistory(token, term.year, term.semester)) return setAlreadySubmitted(true);
        } else {
          return setIsOutOfPeriod(true);
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
    clearErr(); // ลบไฮไลท์แดงออกเมื่อเริ่มพิมพ์แก้
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
    clearErr(); // ลบไฮไลท์แดงออกเมื่ออัปโหลดไฟล์
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.some(f => f.type !== "application/pdf")) return Swal.fire({ icon: "warning", title: "เฉพาะไฟล์ PDF", text: "กรุณาอัปโหลดเฉพาะไฟล์นามสกุล .pdf" });
      if (totalFileSize + files.reduce((acc, f) => acc + f.size, 0) > MAX_TOTAL_FILE_SIZE_BYTES) return Swal.fire({ icon: "error", title: "ขนาดไฟล์เกินกำหนด", text: `รวมสูงสุดไม่เกิน 10MB` });
      setSelectedFiles(p => [...p, ...files]);
    }
  };

  const validateForm = (): { msg: string, id: string } | null => {
    if (!awardType) return { msg: "กรุณาเลือกประเภทรางวัล", id: "section-award-type" };
    if (awardType === "other" && !otherTitle.trim()) return { msg: "กรุณาระบุชื่อรางวัลที่ต้องการเสนอ (ห้ามเว้นว่าง)", id: "input-otherTitle" };

    const mp = manualProfile;
    if (!mp.prefix) return { msg: "กรุณาเลือกคำนำหน้าชื่อ", id: "input-prefix" };
    if (!mp.firstname.trim()) return { msg: "กรุณากรอกชื่อจริง", id: "input-firstname" };
    if (!mp.lastname.trim()) return { msg: "กรุณากรอกนามสกุล", id: "input-lastname" };
    if (mp.firstname.trim().length < 2 || mp.lastname.trim().length < 2) return { msg: "ชื่อและนามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร", id: "input-firstname" };

    const studentNumRegex = /^\d{10}$/;
    if (!studentNumRegex.test(mp.student_number)) return { msg: "รหัสนิสิตต้องเป็นตัวเลข 10 หลักเท่านั้น", id: "input-student_number" };

    if (!mp.student_year) return { msg: "กรุณาเลือกชั้นปีของนิสิต", id: "input-student_year" };
    if (!mp.faculty) return { msg: "กรุณาเลือกคณะ", id: "input-faculty" };
    if (!mp.major) return { msg: "กรุณาเลือกสาขา/ภาควิชา", id: "input-major" };

    if (!mp.gpa || mp.gpa.trim() === "") return { msg: "กรุณากรอกเกรดเฉลี่ยสะสม (GPA)", id: "input-gpa" };
    const gpaNum = parseFloat(mp.gpa);
    if (isNaN(gpaNum) || gpaNum < 0.00 || gpaNum > 4.00) return { msg: "เกรดเฉลี่ย (GPA) ต้องเป็นตัวเลขและอยู่ระหว่าง 0.00 - 4.00 เท่านั้น", id: "input-gpa" };

    const emailRegex = /^[a-zA-Z0-9._%+-]+@ku\.th$/i;
    if (!mp.email.trim()) return { msg: "กรุณากรอกอีเมลติดต่อนิสิต", id: "input-email" };
    if (!emailRegex.test(mp.email.trim())) return { msg: "อีเมลต้องเป็นโดเมน @ku.th เท่านั้น (เช่น name.s@ku.th)", id: "input-email" };

    const phoneRegex = /^0\d{9}$/;
    if (!mp.phone_number) return { msg: "กรุณากรอกเบอร์โทรศัพท์นิสิต", id: "input-phone_number" };
    if (!phoneRegex.test(mp.phone_number)) return { msg: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0 เท่านั้น", id: "input-phone_number" };

    if (!mp.date_of_birth) return { msg: "กรุณาระบุวันเกิดของนิสิต", id: "input-date_of_birth" };
    const currentAge = parseInt(mp.age);
    if (isNaN(currentAge) || currentAge < 15 || currentAge > 100) return { msg: "อายุนิสิตไม่ถูกต้อง (ระบบรองรับอายุ 15 - 100 ปี)", id: "input-date_of_birth" };

    if (!mp.advisor_name.trim()) return { msg: "กรุณากรอกชื่ออาจารย์ที่ปรึกษา", id: "input-advisor_name" };
    if (mp.advisor_name.trim().length < 5) return { msg: "กรุณากรอกชื่อ-นามสกุลอาจารย์ที่ปรึกษาให้ครบถ้วน", id: "input-advisor_name" };

    if (!mp.address.trim()) return { msg: "กรุณากรอกที่อยู่ปัจจุบันของนิสิต", id: "input-address" };
    if (mp.address.trim().length < 10) return { msg: "กรุณากรอกที่อยู่ให้ชัดเจนและครบถ้วนยิ่งขึ้น (อย่างน้อย 10 ตัวอักษร)", id: "input-address" };

    if (!otherDetails.trim()) return { msg: "กรุณากรอกเหตุผลในการเสนอชื่อและความโดดเด่นของผลงาน", id: "input-otherDetails" };
    if (otherDetails.trim().length < 20) return { msg: "กรุณาอธิบายรายละเอียดผลงานให้ชัดเจนยิ่งขึ้น (พิมพ์อย่างน้อย 20 ตัวอักษร)", id: "input-otherDetails" };

    if (!selectedFiles || selectedFiles.length === 0) return { msg: "กรุณาแนบไฟล์เอกสารประกอบ (PDF) อย่างน้อย 1 ไฟล์", id: "input-fileUpload" };

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setErrorFieldId(err.id);

      Swal.fire({ 
        icon: "warning", 
        title: "ข้อมูลไม่ครบถ้วน", 
        text: err.msg, 
        confirmButtonColor: "#3b82f6", 
        customClass: { popup: 'rounded-[24px]' },
        returnFocus: false
      }).then(() => {
        const el = document.getElementById(err.id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          
          setTimeout(() => {
            const inputEl = el.querySelector('input, select, textarea') as HTMLElement;
            if (inputEl) inputEl.focus({ preventScroll: true });
          }, 300);
        }
      });
      
      return;
    }
    
    setErrorFieldId(null);
    const token = localStorage.getItem("token");
    if (!token) return;

    let awardName = "";
    if (awardType === "activity") awardName = "กิจกรรมนอกหลักสูตร";
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
      fd.append("award_type", awardName);
      fd.append("student_prefix", manualProfile.prefix);
      fd.append("student_firstname", manualProfile.firstname);
      fd.append("student_lastname", manualProfile.lastname);
      fd.append("student_number", manualProfile.student_number);
      fd.append("student_email", manualProfile.email); 
      
      const selectedFac = faculties.find(f => f.faculty_name === manualProfile.faculty);
      const selectedDept = departments.find(d => d.department_name === manualProfile.major);
      
      if (selectedFac) fd.append("faculty_id", String(selectedFac.faculty_id || selectedFac.id || selectedFac.facultyID));
      if (selectedDept) fd.append("department_id", String(selectedDept.department_id || selectedDept.id || selectedDept.departmentID));
      
      fd.append("student_year", manualProfile.student_year);
      fd.append("advisor_name", manualProfile.advisor_name);
      fd.append("gpa", manualProfile.gpa);
      fd.append("student_date_of_birth", manualProfile.date_of_birth);
      fd.append("student_phone_number", manualProfile.phone_number);
      fd.append("student_address", manualProfile.address);

      fd.append("org_name", orgInfo.name);
      fd.append("org_type", orgInfo.type);
      fd.append("org_location", orgInfo.location);
      fd.append("org_phone_number", orgInfo.phone);

      fd.append("form_detail", otherDetails);
      selectedFiles.forEach(f => fd.append("files", f));

      await nominationService.submitNomination(token, fd);
      setHasNominated(true);
    } catch (e: any) {
      const errorMsg = e.response?.data?.message?.toLowerCase() || "";
      if (errorMsg.includes("duplicate")) {
        setAlreadySubmitted(true);
      } else if (errorMsg.includes("เวลา") || errorMsg.includes("period")) {
        setIsOutOfPeriod(true);
      } else {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: e.response?.data?.message || e.message });
      }
    } finally { setLoading(false); }
  };

  if (loading) return <LoadingScreen />;
  if (isOutOfPeriod) return <StatusScreen icon={Clock} color="rose" title="ไม่อยู่ในช่วงเวลา" msg="เลยเวลารับสมัคร หรือ ไม่อยู่ในช่วงเวลาที่สามารถส่งข้อมูลการเสนอชื่อได้" />;
  if (hasNominated) return <StatusScreen icon={CheckCircle2} color="emerald" title="สำเร็จ!" msg="ระบบได้รับข้อมูลการเสนอชื่อของหน่วยงานท่านเรียบร้อยแล้ว" />;
  if (alreadySubmitted) return <StatusScreen icon={AlertCircle} color="amber" title="ดำเนินการแล้ว" msg={`หน่วยงานของท่านได้เสนอชื่อในปีการศึกษา ${currentTermInfo ? currentTermInfo.year + 543 : ""}/${currentTermInfo?.semester} แล้ว`} />;

  return (
    <div className="min-h-screen bg-transparent text-slate-800 font-sans selection:bg-blue-200 py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="max-w-6xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-[2.5rem] p-8 md:p-14 border border-slate-100">
          
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
            
            <Section num={1} zIndex={40} title="ประเภทรางวัลที่เสนอชื่อ" theme={theme}>
              {/* ไฮไลท์แดงครอบทั้งกล่องรางวัลถ้าไม่เลือก */}
              <div id="section-award-type" className={`scroll-mt-32 rounded-3xl p-1 transition-all duration-300 ${errorFieldId === "section-award-type" ? "bg-rose-50 border-2 border-rose-500 ring-4 ring-rose-500/20" : ""}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <TypeCard type="activity" active={awardType} set={(v:any) => { setAwardType(v); clearErr(); }} title="กิจกรรมนอกหลักสูตร" sub="ผู้นำ/แข่งขัน" icon={Trophy} />
                  <TypeCard type="innovation" active={awardType} set={(v:any) => { setAwardType(v); clearErr(); }} title="ความคิดสร้างสรรค์เเละนวัตกรรม" sub="สิ่งประดิษฐ์/วิจัย" icon={Lightbulb} />
                  <TypeCard type="behavior" active={awardType} set={(v:any) => { setAwardType(v); clearErr(); }} title="ความประพฤติดี" sub="จิตอาสา/คุณธรรม" icon={Heart} />
                  <TypeCard type="other" active={awardType} set={(v:any) => { setAwardType(v); clearErr(); }} title="อื่นๆ" sub="ระบุชื่อรางวัลเอง" icon={Star} />
                </div>
              </div>
              <AnimatePresence>
                {awardType === "other" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                    <Input id="input-otherTitle" label="ชื่อรางวัลที่ต้องการเสนอ" val={otherTitle} set={setOtherTitle} icon={Star} theme={theme} placeholder="เช่น รางวัลเยาวชนต้นแบบ..." req hasError={errorFieldId === "input-otherTitle"} clearError={clearErr} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>

            <AnimatePresence>
              {awardType && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="space-y-16">
                  
                  <Section num={2} zIndex={30} title="ข้อมูลส่วนตัวนิสิต" theme={theme}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Select id="input-prefix" label="คำนำหน้า" val={manualProfile.prefix} set={(v: string) => handleProfileChange("prefix", v)} options={[{v:"นาย", l:"นาย"}, {v:"นางสาว", l:"นางสาว"}, {v:"ไม่ระบุ", l:"ไม่ระบุ"}]} icon={User} theme={theme} req hasError={errorFieldId === "input-prefix"} clearError={clearErr} />
                      
                      <Input id="input-firstname" label="ชื่อจริง" val={manualProfile.firstname} set={(v: string) => handleProfileChange("firstname", v)} icon={User} theme={theme} req hasError={errorFieldId === "input-firstname"} clearError={clearErr} />
                      <Input id="input-lastname" label="นามสกุล" val={manualProfile.lastname} set={(v: string) => handleProfileChange("lastname", v)} icon={User} theme={theme} req hasError={errorFieldId === "input-lastname"} clearError={clearErr} />
                      
                      <Input id="input-student_number" label="รหัสนิสิต" val={manualProfile.student_number} set={(v: string) => handleProfileChange("student_number", v)} icon={Hash} theme={theme} req max={10} hasError={errorFieldId === "input-student_number"} clearError={clearErr} />
                      <Select id="input-student_year" label="ชั้นปี" val={manualProfile.student_year} set={(v: string) => handleProfileChange("student_year", v)} options={[1,2,3,4,5,6].map(y => ({v:y, l:`ปี ${y}`}))} icon={GraduationCap} theme={theme} req hasError={errorFieldId === "input-student_year"} clearError={clearErr} />
                      <Select id="input-faculty" label="คณะ" val={manualProfile.faculty} set={(v: string) => handleProfileChange("faculty", v)} options={faculties.map(f => ({v:f.faculty_name, l:f.faculty_name}))} icon={Building2} theme={theme} req hasError={errorFieldId === "input-faculty"} clearError={clearErr} />
                      <Select id="input-major" label="สาขา/ภาควิชา" val={manualProfile.major} set={(v: string) => handleProfileChange("major", v)} options={filteredDepartments.map(d => ({v:d.department_name, l:d.department_name}))} icon={BookOpen} theme={theme} disabled={!manualProfile.faculty} req hasError={errorFieldId === "input-major"} clearError={clearErr} />
                      <Input id="input-gpa" label="เกรดเฉลี่ยสะสม (GPA)" val={manualProfile.gpa} set={(v: string) => handleProfileChange("gpa", v)} icon={Percent} theme={theme} req hasError={errorFieldId === "input-gpa"} clearError={clearErr} />
                      <Input id="input-email" label="อีเมลติดต่อนิสิต (@ku.th เท่านั้น)" val={manualProfile.email} set={(v: string) => handleProfileChange("email", v)} icon={Mail} theme={theme} type="email" req hasError={errorFieldId === "input-email"} clearError={clearErr} />
                      <Input id="input-phone_number" label="เบอร์โทรศัพท์นิสิต" val={manualProfile.phone_number} set={(v: string) => handleProfileChange("phone_number", v)} icon={Phone} theme={theme} req max={10} hasError={errorFieldId === "input-phone_number"} clearError={clearErr} />
                      
                      <PremiumBirthDatePicker 
                          id="input-date_of_birth"
                          label="วันเกิด" 
                          value={manualProfile.date_of_birth} 
                          onChange={(v: string) => handleProfileChange("date_of_birth", v)} 
                          theme={theme} 
                          req 
                          hasError={errorFieldId === "input-date_of_birth"} clearError={clearErr}
                      />
                      
                      <Input id="input-advisor_name" label="ชื่ออาจารย์ที่ปรึกษา" val={manualProfile.advisor_name} set={(v: string) => handleProfileChange("advisor_name", v)} icon={GraduationCap} theme={theme} req hasError={errorFieldId === "input-advisor_name"} clearError={clearErr} />
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">อายุ (ปี)</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="w-5 h-5 text-slate-400" /></div>
                          <input type="text" value={manualProfile.age} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-2xl pl-12 pr-4 py-[14px] outline-none text-slate-500 font-medium cursor-not-allowed" />
                        </div>
                      </div>

                      <div id="input-address" className="md:col-span-2 scroll-mt-32">
                        <label className={`block text-sm font-bold mb-2 ml-1 transition-colors ${errorFieldId === "input-address" ? 'text-rose-600' : 'text-slate-700'}`}>ที่อยู่ปัจจุบัน <span className="text-rose-500">*</span></label>
                        <textarea value={manualProfile.address} onChange={(e) => handleProfileChange("address", e.target.value)} rows={3} 
                          className={`w-full rounded-2xl px-5 py-4 outline-none transition-all resize-none font-medium
                            ${errorFieldId === "input-address" 
                               ? 'bg-rose-50 border-2 border-rose-500 ring-4 ring-rose-500/20 text-rose-900 placeholder:text-rose-300' 
                               : `bg-white/50 backdrop-blur-sm border border-slate-200 ${theme.ring} hover:border-slate-300`}`} 
                          placeholder="ระบุรายละเอียดที่อยู่ปัจจุบันที่สามารถติดต่อได้..." 
                        />
                      </div>
                    </div>
                  </Section>

                  <Section num={3} zIndex={20} title="ข้อมูลองค์กรผู้เสนอชื่อ" theme={theme}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnly label="ชื่อหน่วยงาน" val={orgInfo.name} />
                      <ReadOnly label="ประเภทหน่วยงาน" val={orgInfo.type} />
                      <ReadOnly label="เบอร์โทรศัพท์" val={orgInfo.phone} />
                      <ReadOnly label="ที่ตั้ง" val={orgInfo.location} />
                    </div>
                  </Section>

                  <Section num={4} zIndex={15} title="รายละเอียดผลงานและเหตุผลประกอบ" theme={theme}>
                    <div id="input-otherDetails" className="scroll-mt-32">
                        <label className={`block text-sm font-bold mb-2 ml-1 transition-colors ${errorFieldId === "input-otherDetails" ? 'text-rose-600' : 'text-slate-700'}`}>เหตุผลในการเสนอชื่อและความโดดเด่นของผลงาน <span className="text-rose-500">*</span></label>
                        <textarea value={otherDetails} onChange={(e) => { setOtherDetails(e.target.value); clearErr(); }} rows={5} 
                          className={`w-full rounded-2xl px-5 py-4 outline-none transition-all resize-none font-medium
                            ${errorFieldId === "input-otherDetails" 
                               ? 'bg-rose-50 border-2 border-rose-500 ring-4 ring-rose-500/20 text-rose-900 placeholder:text-rose-300' 
                               : `bg-white/50 backdrop-blur-sm border border-slate-200 ${theme.ring} hover:border-slate-300`}`}  
                          placeholder="บรรยายเหตุผล ผลงาน กิจกรรม บทบาทหน้าที่ หรือคุณงามความดีของนิสิต..." 
                        />
                    </div>
                  </Section>

                  <Section num={5} zIndex={10} title="แนบเอกสารหลักฐาน" theme={theme}>
                    <div id="input-fileUpload" className="scroll-mt-32">
                      <div onClick={() => { fileInputRef.current?.click(); clearErr(); }} 
                          className={`group relative overflow-hidden border-2 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all duration-300 
                            ${errorFieldId === "input-fileUpload" 
                                ? 'bg-rose-50 border-rose-500 ring-4 ring-rose-500/20' 
                                : `border-slate-300 hover:border-${theme.accent}-400 bg-slate-50 hover:bg-white`}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                        <motion.div whileHover={{ scale: 1.05 }} className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-sm ${errorFieldId === "input-fileUpload" ? 'bg-rose-100 text-rose-500' : `bg-${theme.accent}-100 text-${theme.accent}-600`}`}>
                          <UploadCloud className="w-10 h-10" />
                        </motion.div>
                        <h4 className={`text-xl font-bold mb-2 ${errorFieldId === "input-fileUpload" ? 'text-rose-700' : 'text-slate-800'}`}>ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h4>
                        <p className={`${errorFieldId === "input-fileUpload" ? 'text-rose-500' : 'text-slate-500'} text-sm`}>รองรับเฉพาะไฟล์ .PDF (ขนาดรวมไม่เกิน 10MB)</p>
                        
                        <div className="max-w-xs mx-auto mt-6" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                            <span>พื้นที่ที่ใช้ไป</span>
                            <span className={fileSizePercentage > 100 ? "text-rose-500" : ""}>{formatBytes(totalFileSize)} / 10MB</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(fileSizePercentage, 100)}%` }} className={`h-full ${fileSizePercentage > 100 ? 'bg-rose-500' : `bg-${theme.accent}-500`}`} />
                          </div>
                        </div>
                        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                      </div>
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

const Section = ({ num, title, children, theme, zIndex = 10 }: any) => (
  <motion.div style={{ zIndex }} className={`bg-white/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border ${theme.border} relative shadow-lg shadow-slate-200/20`}>
    <div className={`absolute top-0 left-0 w-full h-1.5 rounded-t-[2.5rem] bg-gradient-to-r ${theme.gradient} opacity-80`} />
    <div className="flex items-center gap-4 mb-8">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center font-black text-xl shadow-lg ${theme.shadow}`}>
        {num}
      </div>
      <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const TypeCard = ({ type, active, set, title, sub, icon: Icon }: any) => {
  const isActive = active === type;
  const t = THEME_STYLES[type] || THEME_STYLES.default;

  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => set(type)} className={`relative cursor-pointer rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 overflow-hidden ${isActive ? `${t.cardBorder} bg-white shadow-xl ${t.cardShadow}` : 'border-slate-100 bg-white hover:border-slate-300'}`}>
      {isActive && <div className={`absolute inset-0 ${t.cardBg} opacity-50 pointer-events-none`} />}
      <div className={`p-4 rounded-2xl transition-colors duration-300 z-10 ${isActive ? `${t.cardIconBg} ${t.cardIconText} shadow-md` : 'bg-slate-50 text-slate-400'}`}>
        <Icon className="w-8 h-8" strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <div className="z-10">
        <h4 className={`text-lg font-extrabold ${isActive ? t.titleText : 'text-slate-600'}`}>{title}</h4>
        <p className={`text-sm font-medium ${isActive ? t.subText : 'text-slate-400'}`}>{sub}</p>
      </div>
    </motion.div>
  );
};

const Input = ({ id, label, val, set, icon: Icon, theme, type = "text", req, max, placeholder, hasError, clearError }: any) => (
  <div id={id} className="scroll-mt-32">
    <label className={`block text-sm font-bold mb-2 ml-1 transition-colors ${hasError ? 'text-rose-600' : 'text-slate-700'}`}>
      {label} {req && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon className={`w-5 h-5 transition-colors ${hasError ? 'text-rose-500' : `text-slate-400 group-focus-within:${theme.text}`}`} />
      </div>
      <input 
        type={type} value={val} 
        onChange={e => { set(e.target.value); if(clearError) clearError(); }} 
        maxLength={max} placeholder={placeholder} 
        className={`w-full rounded-2xl pl-12 pr-4 py-[14px] outline-none transition-all font-medium
          ${hasError 
             ? 'bg-rose-50 border-2 border-rose-500 ring-4 ring-rose-500/20 text-rose-900 placeholder:text-rose-300' 
             : `bg-white border border-slate-200 hover:border-slate-300 focus:bg-white text-slate-800 ${theme.ring}`}`} 
      />
    </div>
  </div>
);

const Select = ({ id, label, val, set, options, icon: Icon, theme, req, disabled, hasError, clearError }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  const selectedLabel = options.find((o: any) => o.v === val)?.l || "-- เลือก --";

  const dropdownMenu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.18 }}
          style={dropdownStyle}
          className="bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[20px] shadow-2xl overflow-hidden py-2 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <div
            onClick={() => { set(""); setIsOpen(false); if(clearError) clearError(); }}
            className={`px-5 py-3.5 cursor-pointer transition-all duration-200 hover:bg-slate-50 text-slate-500 text-sm font-medium ${val === "" ? "bg-slate-50 text-slate-800" : ""}`}
          >
            -- เลือก --
          </div>
          {options.map((o: any, i: number) => (
            <div
              key={i}
              onClick={() => { set(o.v); setIsOpen(false); if(clearError) clearError(); }}
              className={`px-5 py-3.5 cursor-pointer transition-all duration-200 text-sm font-medium truncate flex items-center justify-between
                ${val === o.v ? `bg-${theme.accent}-50 ${theme.text}` : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {o.l}
              {val === o.v && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle2 className={`w-4 h-4 ${theme.text}`} />
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div id={id} className={`scroll-mt-32 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <label className={`block text-sm font-bold mb-2 ml-1 transition-colors ${hasError ? 'text-rose-600' : 'text-slate-700'}`}>
        {label} {req && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative group" ref={triggerRef}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <Icon className={`w-5 h-5 transition-colors duration-300 ${hasError ? 'text-rose-500' : (isOpen ? theme.text : 'text-slate-400 group-hover:text-slate-500')}`} />
        </div>
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full cursor-pointer rounded-2xl pl-12 pr-4 py-[14px] outline-none transition-all duration-300 flex items-center justify-between
            ${hasError 
                ? 'bg-rose-50 border-2 border-rose-500 ring-4 ring-rose-500/20 text-rose-900' 
                : (isOpen ? `bg-slate-50/50 border border-slate-300 shadow-md ${theme.ring}` : 'bg-white border border-slate-200 hover:border-slate-300')
            }
          `}
        >
          <span className={`font-medium truncate pr-4 transition-colors ${val ? (hasError ? 'text-rose-900' : 'text-slate-800') : (hasError ? 'text-rose-400' : 'text-slate-400')}`}>
            {selectedLabel}
          </span>
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 flex-shrink-0 ${hasError ? 'text-rose-400' : 'text-slate-400'} ${isOpen ? `rotate-180 ${theme.text}` : ''}`} />
        </div>
      </div>
      {typeof document !== "undefined" && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

const ReadOnly = ({ label, val }: { label: string, val: string }) => (
  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
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
  <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-16 h-16 border-4 border-slate-100 border-t-blue-500 rounded-full mb-6" />
    <p className="text-slate-500 font-bold tracking-widest animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
  </div>
);

const StatusScreen = ({ icon: Icon, color, title, msg }: any) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-6">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white max-w-lg w-full rounded-[3rem] p-12 text-center shadow-2xl shadow-slate-100 border border-slate-100">
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