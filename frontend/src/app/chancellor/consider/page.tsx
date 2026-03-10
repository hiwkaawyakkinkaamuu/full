"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal";
import Swal from "sweetalert2";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, GraduationCap, CheckCircle2,
  Eye, Award, Building2, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, PenTool,
  Sparkles, FileSignature, Calendar, Clock, X
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Types
// ==========================================
const USE_MOCK_DATA = false;

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
}

const ITEMS_PER_PAGE = 8; 

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

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
        <div className={`relative w-full ${className}`} style={{ zIndex: isOpen ? 50 : 10 }} ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full pl-11 pr-4 py-3.5 bg-white/80 backdrop-blur-sm border rounded-2xl cursor-pointer transition-all duration-300 shadow-sm
                    ${isOpen ? 'border-purple-400 ring-4 ring-purple-500/10' : 'border-slate-200/80 hover:border-slate-300'}
                `}
            >
                <Icon className={`w-4 h-4 absolute left-4 top-4 transition-colors ${isOpen ? 'text-purple-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium truncate ${!value || value === "all" ? 'text-slate-500' : 'text-slate-800'}`}>
                    {selectedLabel}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-purple-500' : ''}`} />
            </div>
  
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto z-[9999] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
                    >
                        {options.map((o: any, i: number) => (
                            <div
                                key={i}
                                onClick={() => { onChange(String(o.v)); setIsOpen(false); }}
                                className={`px-4 py-3 cursor-pointer transition-all duration-200 text-sm font-medium flex items-center justify-between
                                    ${String(value) === String(o.v) ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                {o.l}
                                {String(value) === String(o.v) && <CheckCircle2 size={16} className="text-purple-500" />}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function CustomDatePicker({ value, onChange, label, disabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { if (value) setViewDate(new Date(value)); }, [value]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "เลือกวันที่...";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSelectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(selected.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isFutureDate = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return date > today;
  };

  return (
    <div className={`relative w-full group ${isOpen ? 'z-[50]' : 'z-10'}`} ref={containerRef}>
      <button 
        type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between bg-white/80 backdrop-blur-sm transition-all border border-slate-200/80 rounded-2xl px-4 py-3.5 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400'}`}
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="flex flex-col text-left justify-center">
            <span className={`text-sm font-medium leading-normal truncate max-w-[120px] sm:max-w-[150px] ${value ? 'text-slate-800' : 'text-slate-500'}`}>{value ? formatDisplayDate(value) : label}</span>
          </div>
        </div>
        {value ? (
          <div onClick={(e) => { e.stopPropagation(); onChange(""); }} className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors z-20 relative"><X size={14} /></div>
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180 text-purple-500' : ''}`} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 sm:min-w-[320px] mt-2 bg-white border border-slate-100 rounded-[24px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] z-[9999] p-5">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-purple-50 hover:text-purple-600"><ChevronLeft size={18} /></button>
              <div className="font-bold text-slate-800 text-sm">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear() + 543}</div>
              <button type="button" disabled={viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth()} onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map(day => (<div key={day} className="text-center text-[11px] font-black py-1 text-slate-400">{day}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
              {blanks.map(blank => (<div key={`blank-${blank}`} className="w-full h-10"></div>))}
              {days.map(day => {
                const selected = value && day === new Date(value).getDate() && viewDate.getMonth() === new Date(value).getMonth() && viewDate.getFullYear() === new Date(value).getFullYear();
                const today = day === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();
                const future = isFutureDate(day);
                return (
                  <button key={day} type="button" disabled={future} onClick={() => handleSelectDate(day)} className={`w-9 h-9 sm:w-10 sm:h-10 mx-auto flex items-center justify-center rounded-full text-[14px] transition-all ${future ? 'text-slate-300 cursor-not-allowed opacity-50' : selected ? 'bg-purple-500 text-white font-bold shadow-md' : today ? 'text-purple-600 bg-purple-50 border border-purple-200 font-bold' : 'text-slate-700 hover:bg-slate-100 font-semibold'}`}>{day}</button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); setIsOpen(false); }} className="flex-1 text-center text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl border border-slate-200 transition-colors">ล้างวันที่</button>
                <button type="button" onClick={() => { setViewDate(new Date()); handleSelectDate(new Date().getDate()); }} className="flex-1 text-center text-xs font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 py-2.5 rounded-xl border border-slate-200 transition-colors">เลือกวันนี้</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
// 1. Main Component
// ==========================================
export default function ChancellorApprovalPage() {
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Nomination | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const awardTypeOptions = AWARD_CATEGORIES;
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'award_type_name' | null, direction: 'asc' | 'desc' | null }>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    setCurrentPage(1);
    setSelectedId(null);
  }, [searchTerm, filterCategory, filterYear, filterDate]);

  const formatPrettyDate = (isoDate: string) => {
      if (!isoDate) return { date: "-", time: "-" };
      const d = new Date(isoDate);
      const dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return { date: dateStr, time: timeStr };
  };

  // ==========================================
  // 2. Data Fetching
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    
    const fetchAwardTypes = async () => {
      try {
        const response = await api.get(`/awards/types`);
        const types = response.data?.data || response.data || [];
        if (isMounted) setAwardTypes(types);
      } catch (error) {}
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        if (USE_MOCK_DATA) return;

        // 🚨 ดึงข้อมูล 1,000 รายการล่าสุด
        const response = await api.get(`/awards/search`, { params: { limit: 1000 } });
        const rawData = response.data?.data || response.data;
        const fetchedData = Array.isArray(rawData) ? rawData : [];

        // 🚨 ตัดการ Filter ตัวเลข Status ในหน้าบ้านออก 
        // เพราะ Backend (Role 7) กรองข้อมูลที่รออธิการบดี (11) มาให้ 100% แล้ว
        const mappedData = fetchedData.map((item: any) => {
            const isOrgNominated = item.student_lastname === "-" || (item.org_name && item.org_name.trim() !== "");
            return {
                ...item,
                form_status_id: item.form_status_id || item.form_status || 11, // เผื่อเหนียว
                award_type_name: item.award_type || "-",
                is_organization_nominated: isOrgNominated, 
                organization_name: item.org_name || ""
            };
        });

        if (isMounted) setItems(mappedData);
      } catch (error) {
        console.error("API Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAwardTypes();
    fetchData();
    return () => { isMounted = false; };
  }, []);

  // ==========================================
  // 3. Logic & Handlers
  // ==========================================
  const processedData = useMemo(() => {
    // 🚨 แก้บัค Array Mutation: Copy array ออกมาก่อนจัดเรียง
    let filtered = [...items];

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(item => 
          (item.student_firstname || "").toLowerCase().includes(lowerTerm) || 
          (item.student_lastname || "").toLowerCase().includes(lowerTerm) ||
          (item.student_number || "").includes(lowerTerm)
        );
    }

    if (filterCategory && filterCategory !== "all") {
        filtered = filtered.filter(item => {
            const awardStr = (item.award_type_name || item.award_type || "").toLowerCase();
            if (filterCategory === "อื่นๆ") {
                return !awardStr.includes("กิจกรรม") && !awardStr.includes("นวัตกรรม") && !awardStr.includes("ประพฤติดี");
            }
            return awardStr.includes(filterCategory.toLowerCase());
        });
    }

    if (filterYear && filterYear !== "all") {
        filtered = filtered.filter(item => String(item.student_year) === filterYear);
    }

    if (filterDate) {
        const filterTime = new Date(filterDate).setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => {
            const itemTime = new Date(item.created_at).getTime();
            return itemTime <= filterTime;
        });
    }
    
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        let valA: any = sortConfig.key ? a[sortConfig.key as keyof Nomination] : '';
        let valB: any = sortConfig.key ? b[sortConfig.key as keyof Nomination] : '';

        if (sortConfig.key === 'student_firstname') {
          valA = `${a.student_firstname} ${a.student_lastname}`;
          valB = `${b.student_firstname} ${b.student_lastname}`;
        } else if (sortConfig.key === 'student_year') {
          valA = Number(a.student_year) || 0;
          valB = Number(b.student_year) || 0;
        } else if (sortConfig.key === 'created_at' || sortConfig.key === 'latest_update') {
          valA = new Date(a[sortConfig.key as 'created_at' | 'latest_update']).getTime();
          valB = new Date(b[sortConfig.key as 'created_at' | 'latest_update']).getTime();
        }

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

  const handleApprove = async () => {
    if (selectedId === null) return;
    const selectedItem = items.find(c => c.form_id === selectedId);
    if (!selectedItem) return;

    const displayName = getDisplayName(selectedItem);
    const result = await Swal.fire({ 
        title: `ยืนยันการ "ลงนามรับรอง"?`, 
        html: `คุณต้องการลงนามขั้นสุดท้ายให้กับ <br/><b class="text-purple-600 text-lg">${displayName}</b> ใช่หรือไม่?<br/><span class="text-sm text-slate-500">(เมื่อลงนามแล้ว จะถือว่าสิ้นสุดกระบวนการพิจารณา)</span>`, 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonText: 'ยืนยันลงนาม', 
        cancelButtonText: 'ยกเลิก', 
        confirmButtonColor: '#9333ea' // Purple-600
    });
    
    if (result.isConfirmed) {
      try {
        if (!USE_MOCK_DATA) {
          // 🚨 อธิการบดีลงนาม เปลี่ยนสถานะเป็น 12 (สิ้นสุดกระบวนการ)
          await api.put(`/awards/form-status/change/${selectedId}`, { 
            form_status_id: 12, 
            form_status: 12, 
            reject_reason: "" 
          });
        }
    
        setItems(prev => prev.filter(c => c.form_id !== selectedId));
        setSelectedId(null);
        
        Swal.fire({ 
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, 
          icon: 'success', 
          title: 'ลงนามสำเร็จ', 
          text: `อนุมัติผลขั้นสุดท้ายของ: ${displayName} เรียบร้อยแล้ว` 
        });
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errorMsg });
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-24 relative overflow-hidden">
      
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6 relative">
        
        {/* --- Header Section --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in-up relative z-20">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 mb-3 text-purple-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em]">ลงนามขั้นสุดท้าย</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              ลงนามอนุมัติขั้นสุดท้าย
            </h1>
            <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" /> สำหรับอธิการบดี
            </p>
          </div>
        </div>

        {/* --- Filters Grid --- */}
        <div className="flex flex-col gap-4 animate-fade-in-up relative z-30" style={{ animationDelay: '100ms' }}>
            
            {/* Search Row */}
            <div className="relative group w-full z-10">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสนิสิต" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl px-4 py-4 pl-12 text-[15px] font-medium focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none transition-all shadow-sm placeholder:text-slate-400 text-slate-800" 
              />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="relative z-[33]">
                   <CustomDatePicker 
                      label="วันที่ยื่นฟอร์ม (ถึงวันที่)" 
                      value={filterDate} 
                      onChange={setFilterDate} 
                      disabled={loading} 
                   />
                </div>
                
                <div className="relative z-[32]">
                   <CustomSelect 
                      value={filterCategory} 
                      onChange={setFilterCategory} 
                      options={awardTypeOptions} 
                      icon={Award}
                      placeholder="ทุกประเภทรางวัล"
                   />
                </div>
                
                <div className="relative z-[31]">
                   <CustomSelect 
                      value={filterYear} 
                      onChange={setFilterYear} 
                      options={YEAR_LEVELS} 
                      icon={GraduationCap}
                      placeholder="ทุกระดับชั้นปี"
                   />
                </div>
            </div>

        </div>

        {/* --- Data Table --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-visible animate-fade-in-up relative z-10" style={{ animationDelay: '150ms' }}>
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200">
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors w-[25%]" onClick={() => handleSort('student_firstname')}>
                    <div className="flex items-center gap-1.5">ผู้ได้รับการเสนอชื่อ {sortConfig.key === 'student_firstname' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[15%]" onClick={() => handleSort('student_number')}>
                    <div className="flex items-center justify-center gap-1.5">รหัสนิสิต {sortConfig.key === 'student_number' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[20%]" onClick={() => handleSort('created_at')}>
                     <div className="flex items-center justify-center gap-1.5">วันที่ยื่นฟอร์ม {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[20%]" onClick={() => handleSort('latest_update')}>
                     <div className="flex items-center justify-center gap-1.5">วันที่ประธานลงนาม {sortConfig.key === 'latest_update' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 text-center w-[10%]">
                    <div className="flex items-center justify-center gap-1.5">สถานะ</div>
                  </th>
                  <th className="p-6 text-center w-[10%]">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-48 mb-2"></div><div className="h-3 bg-slate-100 rounded-md w-32"></div></td>
                      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
                      <td className="p-6"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                      <td className="p-6"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                      <td className="p-6"><div className="h-6 w-20 bg-slate-200 rounded-full mx-auto"></div></td>
                      <td className="p-6"><div className="h-10 w-10 bg-slate-200 rounded-xl mx-auto"></div></td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-purple-50 p-5 rounded-full mb-4 shadow-sm border border-purple-100">
                          <FileSignature className="w-12 h-12 text-purple-300" strokeWidth={1.5} />
                        </div>
                        <p className="text-xl font-bold text-slate-700">ไม่มีรายการรอลงนาม</p>
                        <p className="text-sm mt-2 font-medium text-slate-500">ยังไม่มีข้อมูลที่ผ่านการลงนามจากประธานคณะกรรมการมาถึงคุณ</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const fullName = getDisplayName(item);
                    const isOrg = item.student_lastname === "-";

                    const createdDate = formatPrettyDate(item.created_at);
                    const signedDate = formatPrettyDate(item.latest_update);

                    return (
                        <tr 
                          key={item.form_id} 
                          onClick={() => setSelectedId(item.form_id)}
                          className={`group cursor-pointer transition-all duration-300 animate-fade-in-up ${selectedId === item.form_id ? 'bg-purple-50/50' : 'hover:bg-slate-50'}`}
                          style={{ opacity: 0, animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                        >
                          <td className="p-6 align-middle">
                            <div className="flex items-center gap-3">
                               <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${selectedId === item.form_id ? 'bg-purple-500' : 'bg-transparent'}`}></div>
                               <div>
                                   <div className={`font-extrabold text-[15px] transition-colors ${selectedId === item.form_id ? 'text-purple-700' : 'text-slate-800'}`}>{fullName}</div>
                                   <div className="text-[12px] text-slate-500 mt-1 font-medium tracking-wide">
                                       {isOrg ? <span className="text-purple-500 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-100">เสนอโดยหน่วยงาน</span> : `ชั้นปีที่ ${item.student_year || "-"}`}
                                   </div>
                                   <div className="text-[10.5px] font-bold text-purple-600 mt-2.5 bg-purple-50 inline-block px-3 py-1 rounded-lg border border-purple-100 shadow-sm">
                                       {item.award_type_name || item.award_type}
                                   </div>
                               </div>
                            </div>
                          </td>

                          <td className="p-6 text-center align-middle">
                              <span className="font-mono bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 border border-slate-200 font-medium">
                                {item.student_number || "-"}
                              </span>
                          </td>

                          <td className="p-6 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <div className="flex items-center gap-1.5 text-slate-700 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{createdDate.date}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11.5px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{createdDate.time} น.</span>
                                </div>
                              </div>
                          </td>

                          <td className="p-6 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <div className="flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                                    <span>{signedDate.date}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11.5px] font-medium text-purple-500 bg-white px-2 py-0.5 rounded-md border border-purple-100 shadow-sm">
                                    <Clock className="w-3 h-3 text-purple-400" />
                                    <span>{signedDate.time} น.</span>
                                </div>
                              </div>
                          </td>

                          <td className="p-6 text-center align-middle">
                              <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm bg-amber-50 text-amber-600 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 mr-1.5" /> รออธิการบดี
                              </span>
                          </td>

                          <td className="p-6 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => { setModalData(item); setIsDetailModalOpen(true); }} 
                              className="inline-flex items-center justify-center p-3 rounded-xl text-slate-500 bg-slate-50 hover:text-purple-600 hover:bg-purple-50 transition-all transform hover:scale-110 border border-slate-200 hover:border-purple-200 shadow-sm"
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

          <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-[32px]">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold text-slate-700 bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm">หน้า {currentPage} จาก {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                  onClick={handleApprove} 
                  disabled={selectedId === null} 
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg 
                  ${selectedId === null ? "bg-slate-300 shadow-none cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20 transform hover:-translate-y-0.5 active:scale-95"}`}
              >
                  <PenTool className="w-4 h-4" /> ลงนามรับรองผล
              </button>
            </div>
          </div>
        </div>

        <NominationDetailModal 
          isOpen={isDetailModalOpen} 
          onClose={() => setIsDetailModalOpen(false)} 
          data={modalData} 
          faculties={[]} 
          departments={[]}
        />

      </div>
    </div>
  );
}