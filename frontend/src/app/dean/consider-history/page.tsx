"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, Calendar, CheckCircle2, XCircle,
  Eye, Building2,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, X
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Types & Constants
// ==========================================
const USE_MOCK_DATA = false;

export interface Nomination {
  approval_log_id: number;
  form_id: number;
  reviewer_user_id: number;
  operation: string;         // 'approve' หรือ 'reject'
  operation_date: string;    // วันที่ดำเนินการ
  student_firstname: string;
  student_lastname: string;
  student_number: string;
  academic_year: number;
  award_type: string;
  campus_id: number;
  student_year?: number;
  
  // Custom mapped สำหรับ UI
  award_type_name?: string; 
  is_organization_nominated?: boolean; 
  organization_name?: string;
}

const ITEMS_PER_PAGE = 6;

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

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

  // ตรวจสอบว่าใช่วันในอนาคตหรือไม่
  const isFutureDate = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // ตั้งเวลาให้เป็นเริ่มวัน เพื่อเทียบแค่วันที่
    return date > today;
  };

  // เช็คว่าปัจจุบันปฏิทินกำลังดูเดือนปัจจุบันอยู่หรือเปล่า (ถ้าใช่ จะกดปุ่มไปเดือนหน้าไม่ได้)
  const isCurrentMonth = viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth();

  return (
    <div className={`relative w-full lg:w-72 shrink-0 group ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between bg-white hover:bg-slate-50 transition-all border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm border border-emerald-100/50 shrink-0">
              <Calendar size={18} />
          </div>
          <div className="flex flex-col text-left justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
            <span className={`text-sm font-bold leading-normal truncate max-w-[120px] sm:max-w-[150px] ${value ? 'text-slate-800' : 'text-slate-400'}`}>
              {formatDisplayDate(value)}
            </span>
          </div>
        </div>
        
        {value ? (
          <div 
            onClick={(e) => { e.stopPropagation(); onChange(""); }} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors z-20 relative"
          >
            <X size={16} />
          </div>
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 sm:right-auto sm:min-w-[320px] mt-2 bg-white border border-slate-100 rounded-[24px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] z-[9999] p-5 origin-top-right sm:origin-top-left"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm border border-slate-100">
                <ChevronLeft size={18} />
              </button>
              <div className="font-bold text-slate-800 text-sm">
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
              </div>
              <button 
                type="button" 
                onClick={handleNextMonth} 
                disabled={isCurrentMonth}
                className={`p-1.5 rounded-lg transition-colors shadow-sm border border-slate-100 ${isCurrentMonth ? 'text-slate-300 bg-slate-50 cursor-not-allowed opacity-50' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((day, i) => (
                <div key={day} className={`text-center text-[11px] font-black py-1 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="w-full h-10"></div>
              ))}
              {days.map(day => {
                const selected = isSelected(day);
                const today = isToday(day);
                const future = isFutureDate(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={future}
                    onClick={() => handleSelectDate(day)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 mx-auto flex items-center justify-center rounded-full text-[14px] transition-all
                      ${future ? 'text-slate-300 cursor-not-allowed opacity-50' :
                        selected ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/40 scale-105 relative z-10' : 
                        today ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 font-bold' : 
                        'text-slate-700 hover:bg-slate-100 font-semibold'}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            {/* ปุ่ม ล้างวันที่ และ เลือกวันนี้ */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button 
                    type="button"
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onChange(""); 
                        setIsOpen(false); 
                    }}
                    className="flex-1 text-center text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors"
                >
                    ล้างวันที่
                </button>
                <button 
                    type="button"
                    onClick={() => { setViewDate(new Date()); handleSelectDate(new Date().getDate()); }}
                    className="flex-1 text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors"
                >
                    เลือกวันนี้
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// 2. Main Component
// ==========================================
export default function DeanHistoryPage() { 
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any | null>(null);
  
  // State สำหรับ Filter & Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' | null }>({ key: 'operation_date', direction: 'desc' });

  // รีเซ็ตไปหน้า 1 เสมอเวลาเปลี่ยนตัวกรอง
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);

  const formatDateTh = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' });
  };

  const getStatusBadge = (operation: string) => {
      if (operation === "reject") { 
          return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200"><XCircle className="w-3.5 h-3.5"/> ไม่เห็นชอบ</span>;
      } else if (operation === "approve") {
          return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5"/> เห็นชอบแล้ว</span>;
      }
      return <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">ดำเนินการแล้ว</span>;
  };

  const getDisplayName = (item: Nomination) => {
    if (!item.student_lastname || item.student_lastname === "-") return item.student_firstname || "-";
    return `${item.student_firstname || ""} ${item.student_lastname || ""}`.trim();
  };

  // ==========================================
  // 3. Data Fetching
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (USE_MOCK_DATA) {
          setTimeout(() => { if(isMounted) { setItems([]); setLoading(false); } }, 800);
          return;
        }
        
        const response = await api.get(`/awards/my/approval-logs`, { params: { limit: 3000 } });
        const rawData = response.data?.data || [];

        const mappedData = rawData.map((item: any) => {
            const isOrg = item.student_lastname === "-";
            return {
                ...item,
                award_type_name: item.award_type, 
                is_organization_nominated: isOrg, 
                organization_name: isOrg ? item.student_firstname : "" 
            };
        });

        if (isMounted) setItems(mappedData);
      } catch (error) {
        console.warn("API Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  // ==========================================
  // 4. Filtering & Sorting Logic
  // ==========================================
  const processedData = useMemo(() => {
    let filtered = items;
    
    // ค้นหาตามชื่อ, รหัสนิสิต หรือ ชื่อหน่วยงาน หรือ ชื่อรางวัล
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.student_firstname?.toLowerCase().includes(lowerTerm) || 
        item.student_lastname?.toLowerCase().includes(lowerTerm) ||
        item.student_number?.includes(lowerTerm) ||
        item.organization_name?.toLowerCase().includes(lowerTerm) ||
        item.award_type_name?.toLowerCase().includes(lowerTerm)
      );
    }

    // กรองวันที่ (แสดงฟอร์มที่พิจารณาตั้งแต่อดีต จนถึง 23:59:59 ของวันที่เลือก)
    if (filterDate) {
      const filterTime = new Date(filterDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
          const itemTime = new Date(item.operation_date).getTime();
          return itemTime <= filterTime;
      });
    }
    
    // เรียงข้อมูล
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        let valA = sortConfig.key ? a[sortConfig.key as keyof Nomination] : '';
        let valB = sortConfig.key ? b[sortConfig.key as keyof Nomination] : '';
        
        if (sortConfig.key === 'student_firstname') {
          valA = `${a.student_firstname} ${a.student_lastname}`;
          valB = `${b.student_firstname} ${b.student_lastname}`;
        } else if (sortConfig.key === 'operation_date') {
          valA = new Date(a.operation_date).getTime();
          valB = new Date(b.operation_date).getTime();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [items, searchTerm, filterDate, sortConfig]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE) || 1;
  const currentItems = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalItems = processedData.length;

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const openDetailModal = async (formId: number) => {
    try {
        const response = await api.get(`/awards/details/${formId}`); 
        setModalData(response.data?.data);
        setIsDetailModalOpen(true);
    } catch (err) {
        console.error("Failed to load form details", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-24">
      <style jsx global>{`
          @keyframes fadeInUp { 
              from { opacity: 0; transform: translateY(10px); } 
              to { opacity: 1; transform: translateY(0); } 
          }
          .animate-fade-in-up { 
              animation: fadeInUp 0.4s ease-out forwards; 
          }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section (z-50 เพื่อไม่ให้ Dropdown โดนตารางบัง) */}
        <div className="bg-white/70 backdrop-blur-xl border border-white shadow-sm rounded-3xl p-8 relative z-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ประวัติการพิจารณา
              </h1>
              <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                สำหรับคณบดี
              </p>
            </div>
          </div>

          {/* Search & Filter - เรียงบรรทัดเดียว */}
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
            
            {/* Search Box - ขยายให้เต็มพื้นที่ที่เหลือ */}
            <div className="relative w-full flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ, รหัสนิสิต หรือ รางวัล..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-white hover:bg-slate-50 transition-all border border-slate-200/80 rounded-2xl px-4 py-[14px] pl-12 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 shadow-sm" 
              />
            </div>
            
            {/* DatePicker - ดันไปชิดขวา */}
            <CustomDatePicker 
                label="วันที่พิจารณา (ถึงวันที่)" 
                value={filterDate} 
                onChange={setFilterDate} 
                disabled={loading} 
            />
            
          </div>
        </div>

        {/* Data Table (z-10 เพื่อให้อยู่ใต้ Dropdown) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('student_firstname')}>
                    <div className="flex items-center gap-1">ชื่อ-นามสกุล {sortConfig.key === 'student_firstname' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('student_number')}>
                    <div className="flex items-center justify-center gap-1">รหัสนิสิต {sortConfig.key === 'student_number' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('award_type_name')}>
                     <div className="flex items-center justify-center gap-1">รางวัลที่เสนอ {sortConfig.key === 'award_type_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 text-center">ผู้เสนอชื่อ</th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('operation_date')}>
                     <div className="flex items-center justify-center gap-1">วันที่พิจารณา {sortConfig.key === 'operation_date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 text-center">สถานะการตัดสิน</th>
                  <th className="p-5 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-100">
                      <td className="p-5"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="p-5"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
                      <td className="p-5"><div className="h-6 bg-slate-200 rounded-full w-32 mx-auto"></div></td>
                      <td className="p-5"><div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div></td>
                      <td className="p-5"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
                      <td className="p-5"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto"></div></td>
                      <td className="p-5"><div className="h-8 w-8 bg-slate-200 rounded-full mx-auto"></div></td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-slate-50 p-4 rounded-full mb-3">
                          <CheckCircle2 className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">ไม่มีประวัติการพิจารณาตามเงื่อนไข</p>
                        <p className="text-sm mt-1">รายการที่พิจารณาแล้วจะแสดงที่นี่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => (
                    <tr 
                      key={`${item.approval_log_id}-${index}`} 
                      className="transition-colors hover:bg-slate-50 group cursor-pointer animate-fade-in-up"
                      style={{ opacity: 0, animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full shrink-0 bg-slate-300 group-hover:bg-emerald-500 transition-colors"></div>
                           <div>
                             <p className="text-sm font-bold text-slate-800">
                                {getDisplayName(item)}
                             </p>
                             <p className="text-xs text-slate-500">
                                {(!item.student_lastname || item.student_lastname === "-") ? 'องค์กร/หน่วยงาน' : `นิสิต`}
                             </p>
                           </div>
                        </div>
                      </td>
                      <td className="p-5 text-sm text-center text-slate-600 font-mono">
                        {(!item.student_lastname || item.student_lastname === "-") ? "-" : (item.student_number || "-")}
                      </td>
                      <td className="p-5 text-center">
                         <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 group-hover:bg-white transition-colors">
                           {item.award_type_name || item.award_type || "-"}
                         </span>
                      </td>
                      <td className="p-5 text-center">
                          {item.is_organization_nominated ? (
                              <span className="inline-flex flex-col items-center">
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">องค์กรภายนอก</span>
                                  <span className="text-[10px] text-slate-400 mt-1">{item.organization_name || 'ไม่ระบุชื่อ'}</span>
                              </span>
                          ) : (
                              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">เสนอตัวเอง</span>
                          )}
                      </td>
                      <td className="p-5 text-sm text-center text-slate-500">
                        <div className="flex items-center justify-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTh(item.operation_date)}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                         {getStatusBadge(item.operation)}
                      </td>
                      <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => openDetailModal(item.form_id)} 
                          className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all focus:ring-2 focus:ring-emerald-100 outline-none"
                          title="ดูรายละเอียดข้อมูล"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">หน้า {currentPage} จาก {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="text-sm text-slate-500 font-medium">
                พบข้อมูลทั้งหมด {totalItems} รายการ
            </div>
          </div>
        </div>

        {/* Modal: Nomination Detail */}
        <AnimatePresence>
          {isDetailModalOpen && modalData && (
              <NominationDetailModal 
                isOpen={isDetailModalOpen} 
                onClose={() => setIsDetailModalOpen(false)} 
                data={modalData} 
                faculties={[]} 
                departments={[]}
              />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}