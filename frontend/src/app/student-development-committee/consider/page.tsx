"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal"; 
import Swal from "sweetalert2";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, Calendar, GraduationCap, CheckCircle2, XCircle,
  Eye, AlertCircle, Award, Clock, X, Building2, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, PenTool, Check,
  Sparkles, Users, FileSignature
} from "lucide-react";

import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Types
// ==========================================
const USE_MOCK_DATA = false;

interface VoteSummary {
  approve: number;
  reject: number;
  abstain: number;
  total_voters: number;
}

export interface FileResponse {
  file_dir_id: number;
  file_name?: string;
  file_type: string;
  file_size: number;
  file_path: string;
}

export interface Nomination {
  form_id: number;
  user_id: number;
  student_firstname: string;
  student_lastname: string;
  student_email: string;
  student_number: string;
  faculty_id: number;
  department_id: number;
  campus_id: number;
  academic_year: number;
  semester: number;
  form_status_id: number; 
  form_status: number; 
  award_type: string;
  award_type_name?: string;
  created_at: string;
  latest_update: string;
  student_year: number;
  advisor_name: string;
  student_phone_number: string;
  student_address: string;
  gpa: number;
  student_date_of_birth: string;
  org_name: string;
  org_type: string;
  org_location: string;
  org_phone_number: string;
  form_detail: string | any;
  reject_reason: string;
  files?: FileResponse[];
  is_organization_nominated?: boolean; 
  organization_name?: string;
  vote_summary?: VoteSummary; 
}

const ITEMS_PER_PAGE = 8; 

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

<<<<<<< HEAD
=======
// 🌟 ตั้งค่า List Dropdown แบบตายตัว (Hardcode) ไว้ที่หน้าบ้าน
const awardTypeOptions = [
  { v: "all", l: "ทุกประเภทรางวัล" },
  { v: "กิจกรรมนอกหลักสูตร", l: "กิจกรรมนอกหลักสูตร" },
  { v: "ความคิดสร้างสรรค์และนวัตกรรม", l: "ความคิดสร้างสรรค์และนวัตกรรม" },
  { v: "ความประพฤติดี", l: "ความประพฤติดี" },
  { v: "อื่นๆ", l: "อื่นๆ" }
];

const yearOptions = [
  { v: "all", l: "ทุกระดับชั้นปี" },
  { v: "1", l: "ชั้นปีที่ 1" },
  { v: "2", l: "ชั้นปีที่ 2" },
  { v: "3", l: "ชั้นปีที่ 3" },
  { v: "4", l: "ชั้นปีที่ 4" },
  { v: "5", l: "ชั้นปีที่ 5+" }
];

>>>>>>> develop
// Custom Dropdown Component
const CustomSelect = ({ value, onChange, options, icon: Icon, placeholder, className = "" }: any) => {
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
  
    const selectedLabel = options.find((o: any) => String(o.v) === String(value))?.l || placeholder;
  
    return (
        <div className={`relative w-full ${className}`} style={{ zIndex: isOpen ? 40 : 1 }} ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full pl-11 pr-4 py-3.5 bg-white border rounded-2xl cursor-pointer transition-all duration-300 shadow-sm
                    ${isOpen ? 'border-indigo-400 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}
                `}
            >
                <Icon className={`w-4 h-4 absolute left-4 top-4 transition-colors ${isOpen ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium truncate ${!value || value === "all" ? 'text-slate-500' : 'text-slate-800'}`}>
                    {selectedLabel}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
            </div>
  
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto z-[50] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
                    >
                        {options.map((o: any, i: number) => (
                            <div
                                key={i}
                                onClick={() => { onChange(String(o.v)); setIsOpen(false); }}
                                className={`px-4 py-3 cursor-pointer transition-all duration-200 text-sm font-medium flex items-center justify-between
                                    ${String(value) === String(o.v) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                {o.l}
                                {String(value) === String(o.v) && <CheckCircle2 size={16} className="text-indigo-500" />}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

<<<<<<< HEAD
const AWARD_CATEGORIES = [
  { v: "all", l: "ทุกประเภทรางวัล" },
  { v: "กิจกรรม", l: "กิจกรรมเสริมหลักสูตร" },
  { v: "นวัตกรรม", l: "ความคิดสร้างสรรค์และนวัตกรรม" },
  { v: "ประพฤติดี", l: "ความประพฤติดี" },
  { v: "อื่นๆ", l: "อื่นๆ" }
];

const YEAR_LEVELS = [
  { v: "all", l: "ทุกระดับชั้นปี" },
  { v: "1", l: "ชั้นปีที่ 1" },
  { v: "2", l: "ชั้นปีที่ 2" },
  { v: "3", l: "ชั้นปีที่ 3" },
  { v: "4", l: "ชั้นปีที่ 4" },
  { v: "5", l: "ชั้นปีที่ 5+" }
];

// ==========================================
// 1. Custom Animated DatePicker
// ==========================================
const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function CustomDatePicker({ value, onChange, label, disabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) setViewDate(new Date(value));
  }, [value]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "เลือกวันที่...";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(selected.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selected = new Date(value);
    return day === selected.getDate() && viewDate.getMonth() === selected.getMonth() && viewDate.getFullYear() === selected.getFullYear();
  };

  const isFutureDate = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return date > today;
  };

  const isCurrentMonth = viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth();

  return (
    <div className={`relative w-full lg:w-72 shrink-0 group ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
      <button 
        type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between bg-white hover:bg-slate-50 transition-all border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400'}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm border border-emerald-100/50 shrink-0"><Calendar size={18} /></div>
          <div className="flex flex-col text-left justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
            <span className={`text-sm font-bold leading-normal truncate max-w-[120px] sm:max-w-[150px] ${value ? 'text-slate-800' : 'text-slate-400'}`}>{formatDisplayDate(value)}</span>
          </div>
        </div>
        {value ? (
          <div onClick={(e) => { e.stopPropagation(); onChange(""); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors z-20 relative"><X size={16} /></div>
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute top-full right-0 sm:right-auto sm:min-w-[320px] mt-2 bg-white border border-slate-100 rounded-[24px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] z-[9999] p-5 origin-top-right sm:origin-top-left">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"><ChevronLeft size={18} /></button>
              <div className="font-bold text-slate-800 text-sm">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear() + 543}</div>
              <button type="button" disabled={viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth()} onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((day, i) => (<div key={day} className={`text-center text-[11px] font-black py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{day}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
              {blanks.map(blank => (<div key={`blank-${blank}`} className="w-full h-10"></div>))}
              {days.map(day => {
                const selected = value && day === new Date(value).getDate() && viewDate.getMonth() === new Date(value).getMonth() && viewDate.getFullYear() === new Date(value).getFullYear();
                const today = day === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();
                const future = isFutureDate(day);
                return (
                  <button key={day} type="button" disabled={future} onClick={() => handleSelectDate(day)} className={`w-9 h-9 sm:w-10 sm:h-10 mx-auto flex items-center justify-center rounded-full text-[14px] transition-all ${future ? 'text-slate-300 cursor-not-allowed opacity-50' : selected ? 'bg-emerald-500 text-white font-bold shadow-md' : today ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 font-bold' : 'text-slate-700 hover:bg-slate-100 font-semibold'}`}>{day}</button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); setIsOpen(false); }} className="flex-1 text-center text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl border border-slate-200 transition-colors">ล้างวันที่</button>
                <button type="button" onClick={() => { setViewDate(new Date()); handleSelectDate(new Date().getDate()); }} className="flex-1 text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 py-2.5 rounded-xl border border-slate-200 transition-colors">เลือกวันนี้</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

=======
>>>>>>> develop
// ==========================================
// 2. Main Component
// ==========================================
export default function StudentDevelopmentCommitteeApprovalPage() {
  
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
<<<<<<< HEAD
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
=======
>>>>>>> develop
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Nomination | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filters & Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
<<<<<<< HEAD
  // เรียงวันที่ยื่นล่าสุด (created_at) เสมอเป็น Default
=======
>>>>>>> develop
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'award_type_name' | null, direction: 'asc' | 'desc' | null }>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    setCurrentPage(1);
    setSelectedId(null);
  }, [searchTerm, filterCategory, filterYear, filterDate]);

  const formatDateTh = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' });
  };

<<<<<<< HEAD
=======
  // 🌟 ฟังก์ชันจัดกลุ่ม Priority เพื่อใช้ในการ Sort 
  const getAwardGroupPriority = (awardName: string) => {
    if (!awardName) return 4;
    if (awardName.includes("กิจกรรมนอกหลักสูตร")) return 1;
    if (awardName.includes("ความคิดสร้างสรรค์และนวัตกรรม")) return 2;
    if (awardName.includes("ความประพฤติดี")) return 3;
    return 4; // อื่นๆ (ไม่เข้าข่าย 3 อย่างแรก)
  };

>>>>>>> develop
  // ==========================================
  // 3. Data Fetching
  // ==========================================
  useEffect(() => {
    let isMounted = true;
<<<<<<< HEAD
    
    const fetchAwardTypes = async () => {
      try {
        const response = await api.get(`/awards/types`);
        const types = response.data?.data || response.data || [];
        if (isMounted) setAwardTypes(types);
      } catch (error) {
        console.error("Error fetching award types:", error);
      }
    };
=======
>>>>>>> develop

    const fetchData = async () => {
      setLoading(true);
      try {
        if (USE_MOCK_DATA) return;

<<<<<<< HEAD
=======
        // ไม่ส่ง filter ไป API เพื่อให้ดึงข้อมูลทั้งหมดมาคัดกรองที่หน้าบ้าน (แก้ปัญหา Backend ไม่รู้จักคำว่า "อื่นๆ")
>>>>>>> develop
        const response = await api.get(`/awards/search`, { params: { limit: 1000 } });
        const rawData = response.data?.data || response.data;
        const fetchedData = Array.isArray(rawData) ? rawData : [];

        const mappedData = fetchedData.map((item: any) => {
            const isOrgNominated = item.org_name && item.org_name.trim() !== "";
            return {
                ...item,
                form_status_id: item.form_status_id || item.form_status, 
                award_type_name: item.award_type,
                is_organization_nominated: isOrgNominated, 
                organization_name: item.org_name 
            };
        });

<<<<<<< HEAD
        // 🚨 กรองเอาเฉพาะ "สถานะ 8: อนุมัติโดยกองพัฒนานิสิต" เพื่อให้คณะกรรมการพิจารณา
=======
        // กรองเอาเฉพาะ "สถานะ 8: อนุมัติโดยกองพัฒนานิสิต" เพื่อให้คณะกรรมการพิจารณา
>>>>>>> develop
        const TARGET_STATUS_ID = 8; 
        const pendingCommitteeForms = mappedData.filter((item: any) => item.form_status_id === TARGET_STATUS_ID);

        if (isMounted) setItems(pendingCommitteeForms);
      } catch (error) {
        console.error("API Error:", error);
        if (isMounted) {
          Swal.fire({ icon: 'error', title: 'ไม่สามารถดึงข้อมูลได้', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

<<<<<<< HEAD
    fetchAwardTypes();
=======
>>>>>>> develop
    fetchData();
    return () => { isMounted = false; };
  }, []);

  // ==========================================
<<<<<<< HEAD
  // 4. Filtering & Sorting Logic
  // ==========================================
  const processedData = useMemo(() => {
    let filtered = items;

=======
  // 4. Filtering & Sorting Logic (หน้าบ้าน)
  // ==========================================
  const processedData = useMemo(() => {
    let filtered = [...items];

    // --- Text Search ---
>>>>>>> develop
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(item => 
          item.student_firstname?.toLowerCase().includes(lowerTerm) || 
          item.student_lastname?.toLowerCase().includes(lowerTerm) ||
          item.student_number?.includes(lowerTerm)
        );
    }

<<<<<<< HEAD
    if (filterCategory && filterCategory !== "all") {
        filtered = filtered.filter(item => item.award_type_name === filterCategory);
    }

=======
    // --- 🌟 Category Filter ---
    if (filterCategory && filterCategory !== "all") {
        filtered = filtered.filter(item => {
            const name = item.award_type_name || item.award_type || "";
            const isActivity = name.includes("กิจกรรมนอกหลักสูตร");
            const isCreative = name.includes("ความคิดสร้างสรรค์และนวัตกรรม");
            const isGoodBehavior = name.includes("ความประพฤติดี");

            if (filterCategory === "กิจกรรมนอกหลักสูตร") return isActivity;
            if (filterCategory === "ความคิดสร้างสรรค์และนวัตกรรม") return isCreative;
            if (filterCategory === "ความประพฤติดี") return isGoodBehavior;
            
            // ถ้าเลือก "อื่นๆ" ต้องไม่ใช่ 3 ประเภทข้างบน
            if (filterCategory === "อื่นๆ") return !isActivity && !isCreative && !isGoodBehavior;

            return true;
        });
    }

    // --- Year Filter ---
>>>>>>> develop
    if (filterYear && filterYear !== "all") {
        filtered = filtered.filter(item => String(item.student_year) === filterYear);
    }

<<<<<<< HEAD
=======
    // --- Date Filter ---
>>>>>>> develop
    if (filterDate) {
        const filterTime = new Date(filterDate).setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => {
            const itemTime = new Date(item.created_at).getTime();
            return itemTime <= filterTime;
        });
    }
    
<<<<<<< HEAD
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
=======
    // --- 🌟 Sort Data ---
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {

        // จัดเรียงประเภทรางวัลตาม Priority (1, 2, 3, 4)
        if (sortConfig.key === 'award_type_name') {
            const nameA = a.award_type_name || a.award_type || "";
            const nameB = b.award_type_name || b.award_type || "";
            
            const priorityA = getAwardGroupPriority(nameA);
            const priorityB = getAwardGroupPriority(nameB);
  
            if (priorityA !== priorityB) {
              return sortConfig.direction === 'asc' ? priorityA - priorityB : priorityB - priorityA;
            }
            if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }

        // จัดเรียงคอลัมน์อื่นๆ
>>>>>>> develop
        let valA = sortConfig.key ? a[sortConfig.key] : '';
        let valB = sortConfig.key ? b[sortConfig.key] : '';
        if (sortConfig.key === 'student_firstname') {
          valA = `${a.student_firstname} ${a.student_lastname}`;
          valB = `${b.student_firstname} ${b.student_lastname}`;
        } else if (sortConfig.key === 'created_at') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        }
<<<<<<< HEAD
=======

>>>>>>> develop
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [items, searchTerm, filterCategory, filterYear, filterDate, sortConfig]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE) || 1;
  const currentItems = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: keyof Nomination | 'award_type_name') => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const getDisplayName = (item: Nomination) => {
    if (!item.student_lastname || item.student_lastname === "-") return item.student_firstname || "-";
    return `${item.student_firstname || ""} ${item.student_lastname || ""}`.trim();
  };

  // 🚨 API สำหรับการส่งผล (คณะกรรมการ)
<<<<<<< HEAD
  // ให้คง API นี้ไว้ตามเดิม แต่ส่งค่าแบบที่ Go รอรับ
=======
>>>>>>> develop
  const submitVote = async (id: number, isApproved: boolean, reason: string, studentName: string) => {
    try {
      if (!USE_MOCK_DATA) {
        await api.post(`/awards/committee/vote/${id}`, { 
          operation: isApproved ? 'approve' : 'reject', 
          reject_reason: reason 
        });
      }
  
      setItems(prev => prev.filter(c => c.form_id !== id));
      setSelectedId(null);
      setIsRejectModalOpen(false);
      
      Swal.fire({ 
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, 
        icon: isApproved ? 'success' : 'info', 
        title: 'บันทึกผลสำเร็จ', 
        text: `บันทึกผลการพิจารณาของ: ${studentName} เรียบร้อย` 
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errorMsg });
    }
  };

  const handleApprove = async () => {
    if (selectedId === null) return;
    const selectedItem = items.find(c => c.form_id === selectedId);
    if (!selectedItem) return;

    const displayName = getDisplayName(selectedItem);
    const result = await Swal.fire({ 
        title: `ยืนยันการ "เห็นชอบ"?`, 
        html: `คุณต้องการลงคะแนนเห็นชอบให้กับ <br/><b class="text-indigo-600 text-lg">${displayName}</b> ใช่หรือไม่?`, 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonText: 'ยืนยัน', 
        cancelButtonText: 'ยกเลิก', 
        confirmButtonColor: '#10B981' 
    });
    
    if (result.isConfirmed) {
      await submitVote(selectedId, true, "", displayName);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return Swal.fire({ icon: 'warning', title: 'กรุณาระบุเหตุผล' });
    const selectedItem = items.find(c => c.form_id === selectedId);
    if (selectedId && selectedItem) {
      const displayName = getDisplayName(selectedItem);
      await submitVote(selectedId, false, rejectReason, displayName);
    }
  };

<<<<<<< HEAD
  const awardTypeOptions = [
    { v: "all", l: "ทุกประเภทรางวัล" },
    ...awardTypes.map(type => ({ v: type, l: type }))
  ];

  const yearOptions = [
    { v: "all", l: "ทุกระดับชั้นปี" },
    { v: "1", l: "ชั้นปีที่ 1" },
    { v: "2", l: "ชั้นปีที่ 2" },
    { v: "3", l: "ชั้นปีที่ 3" },
    { v: "4", l: "ชั้นปีที่ 4" },
    { v: "5", l: "ชั้นปีที่ 5+" }
  ];

=======
>>>>>>> develop
  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-24 relative overflow-hidden">
      
      {/* --- CSS Animations --- */}
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* --- Header Section --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in-up relative z-20">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-3 text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em]">การพิจารณาของคณะกรรมการ</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              ลงคะแนนพิจารณานิสิตดีเด่น
            </h1>
            <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> สำหรับคณะกรรมการพิจารณานิสิตดีเด่น
            </p>
          </div>
        </div>

        {/* --- Filters Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up relative z-30" style={{ animationDelay: '100ms' }}>
            <div className="relative group md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /></div>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสนิสิต" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 pl-11 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm placeholder:text-slate-400 text-slate-800" 
              />
            </div>
            
            <div className="relative">
               <CustomSelect 
                  value={filterCategory} 
                  onChange={setFilterCategory} 
                  options={awardTypeOptions} 
                  icon={Award}
                  placeholder="ทุกประเภทรางวัล"
               />
            </div>
            
            <div className="relative">
               <CustomSelect 
                  value={filterYear} 
                  onChange={setFilterYear} 
                  options={yearOptions} 
                  icon={GraduationCap}
                  placeholder="ทุกระดับชั้นปี"
               />
            </div>
        </div>

        {/* --- Data Table --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-visible animate-fade-in-up relative z-10" style={{ animationDelay: '150ms' }}>
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200">
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('student_firstname')}>
                    <div className="flex items-center gap-1.5">ชื่อ-นามสกุล {sortConfig.key === 'student_firstname' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500"/> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('student_number')}>
                    <div className="flex items-center justify-center gap-1.5">รหัสนิสิต {sortConfig.key === 'student_number' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500"/> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('student_year')}>
                    <div className="flex items-center justify-center gap-1.5">ชั้นปี {sortConfig.key === 'student_year' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500"/> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('award_type_name')}>
                     <div className="flex items-center justify-center gap-1.5">รางวัลที่เสนอ {sortConfig.key === 'award_type_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500"/> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('created_at')}>
                     <div className="flex items-center justify-center gap-1.5">วันที่ยื่นล่าสุด {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500"/> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 text-center">สถานะ</th>
                  <th className="p-6 text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="p-6"><div className="h-4 bg-slate-200 rounded-md w-full"></div></td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-indigo-50 p-5 rounded-full mb-4 shadow-sm border border-indigo-100">
                          <CheckCircle2 className="w-12 h-12 text-indigo-300" strokeWidth={1.5} />
                        </div>
                        <p className="text-xl font-bold text-slate-700">ไม่มีรายการรอพิจารณา</p>
                        <p className="text-sm mt-2 font-medium text-slate-500">คุณได้พิจารณาข้อมูลทั้งหมดเรียบร้อยแล้ว</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const fullName = getDisplayName(item);
                    return (
                        <tr 
                          key={item.form_id} 
                          onClick={() => setSelectedId(item.form_id)}
                          className={`group cursor-pointer transition-all duration-300 animate-fade-in-up ${selectedId === item.form_id ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                          style={{ opacity: 0, animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                        >
                          <td className="p-6 align-middle">
                            <div className="flex items-center gap-3">
                               <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${selectedId === item.form_id ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                               <div className={`font-extrabold text-[15px] transition-colors ${selectedId === item.form_id ? 'text-indigo-700' : 'text-slate-800'}`}>{fullName}</div>
                            </div>
                          </td>
<<<<<<< HEAD
                          {/* แก้ไขส่วนที่ซ่อนรหัสนิสิต ให้แสดงค่าเสมอ */}
=======
>>>>>>> develop
                          <td className="p-6 text-center align-middle font-mono text-slate-600">
                              {item.student_number || "-"}
                          </td>
                          <td className="p-6 text-center align-middle text-slate-600">
                              {item.student_year || "-"}
                          </td>
                          <td className="p-6 text-center align-middle">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 truncate max-w-[150px]">
                                {item.award_type_name || item.award_type || "-"}
                              </span>
                          </td>
                          <td className="p-6 text-center align-middle text-slate-500 text-xs">
                             <div className="flex items-center justify-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDateTh(item.created_at)}
                             </div>
                          </td>
                          <td className="p-6 text-center align-middle">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" /> รอลงคะแนน
                              </span>
                          </td>
                          <td className="p-6 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => { setModalData(item); setIsDetailModalOpen(true); }} 
                              className="inline-flex items-center justify-center p-3 rounded-xl text-slate-500 bg-slate-50 hover:text-indigo-600 hover:bg-indigo-50 transition-all transform hover:scale-110 border border-slate-200 hover:border-indigo-200 shadow-sm"
                              title="ดูรายละเอียดข้อมูล"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* --- Table Footer / Pagination / Actions --- */}
          <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-[32px]">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold text-slate-700 bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm">หน้า {currentPage} จาก {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                  onClick={() => { setRejectReason(""); setIsRejectModalOpen(true); }} 
                  disabled={selectedId === null} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all 
                  ${selectedId === null ? "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed" : "bg-white border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200"}`}
              >
                  <XCircle className="w-4 h-4" /> ไม่เห็นชอบ
              </button>
              <button 
                  onClick={handleApprove} 
                  disabled={selectedId === null} 
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg 
                  ${selectedId === null ? "bg-slate-300 shadow-none cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 transform hover:-translate-y-0.5 active:scale-95"}`}
              >
                  <CheckCircle2 className="w-4 h-4" /> เห็นชอบ
              </button>
            </div>
          </div>
        </div>

        {/* --- Modal: Nomination Detail --- */}
        <NominationDetailModal 
          isOpen={isDetailModalOpen} 
          onClose={() => setIsDetailModalOpen(false)} 
          data={modalData} 
          faculties={[]} 
          departments={[]}
        />

        {/* --- Modal: Reject Reason --- */}
        <AnimatePresence>
          {isRejectModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRejectModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div variants={modalVariants} initial="hidden" animate="show" exit="exit" className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                <div className="bg-rose-50/50 px-6 py-5 border-b border-rose-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-rose-800 flex items-center gap-2"><AlertCircle className="w-6 h-6 text-rose-500" /> ระบุเหตุผล "ไม่เห็นชอบ"</h3>
                  <button onClick={() => setIsRejectModalOpen(false)} className="text-rose-400 hover:text-rose-600 bg-white p-1.5 rounded-full hover:bg-rose-100 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">เหตุผลที่ไม่เห็นชอบ (จะถูกบันทึกลงระบบ) <span className="text-rose-500">*</span></label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-slate-300 rounded-xl p-4 text-sm outline-none transition-all h-32 resize-none bg-slate-50/50 focus:ring-4 focus:ring-rose-100 focus:border-rose-400" placeholder="ระบุเหตุผล..." autoFocus />
                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsRejectModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium">ยกเลิก</button>
                    <button onClick={handleConfirmReject} className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20">ยืนยันไม่เห็นชอบ</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}