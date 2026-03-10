"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal"; 
import Swal from "sweetalert2";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, Calendar, GraduationCap, CheckCircle2, XCircle,
  Eye, AlertCircle, Award, Clock, X, Building2, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown
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

const ITEMS_PER_PAGE = 6; 

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const AWARD_CATEGORIES = [
  { value: "all", label: "ทุกประเภทรางวัล" },
  { value: "กิจกรรม", label: "กิจกรรมเสริมหลักสูตร" },
  { value: "นวัตกรรม", label: "ความคิดสร้างสรรค์และนวัตกรรม" },
  { value: "ประพฤติดี", label: "ความประพฤติดี" },
  { value: "อื่นๆ", label: "อื่นๆ" }
];

const YEAR_LEVELS = [
  { value: "all", label: "ทุกระดับชั้นปี" },
  { value: "1", label: "ชั้นปีที่ 1" },
  { value: "2", label: "ชั้นปีที่ 2" },
  { value: "3", label: "ชั้นปีที่ 3" },
  { value: "4", label: "ชั้นปีที่ 4" },
  { value: "5", label: "ชั้นปีที่ 5+" }
];

// ==========================================
// 1. Custom Animated Dropdown & DatePicker
// ==========================================

function AnimatedSelect({ 
    value, onChange, options, label, icon: Icon, disabled 
  }: { 
    value: any, onChange: (val: any) => void, options: {value: string, label: string}[], label: string, icon: any, disabled?: boolean 
  }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    const selectedLabel = options.find(o => o.value === value)?.label || "-";
  
    return (
      <div className="relative w-full lg:w-auto flex-1 min-w-[200px]" ref={dropdownRef}>
        <button 
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center justify-between bg-white hover:bg-slate-50 transition-all border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400'}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm border border-emerald-100/50 shrink-0">
                <Icon size={18} />
            </div>
            <div className="flex flex-col text-left justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
              <span className="text-sm font-bold text-slate-800 leading-normal truncate max-w-[120px] sm:max-w-[150px]">{selectedLabel}</span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </button>
  
        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[280px] mt-2 bg-white border border-slate-100 rounded-[24px] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.15)] overflow-hidden z-[9999]"
            >
              <div className="max-h-64 overflow-y-auto py-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { onChange(opt.value); setIsOpen(false); }}
                      className={`w-full text-left px-4 py-3.5 text-sm font-semibold leading-normal transition-colors flex items-center justify-between
                        ${value === opt.value ? 'bg-emerald-50/80 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                      `}
                    >
                      <span className="truncate pr-4 pb-0.5">{opt.label}</span>
                      {value === opt.value && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
}

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
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm border border-emerald-100/50 shrink-0">
              <Calendar size={18} />
          </div>
          <div className="flex flex-col text-left justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
            <span className={`text-sm font-bold leading-normal truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
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
            className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[320px] mt-2 bg-white border border-slate-100 rounded-[24px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] z-[9999] p-5 origin-top-left"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={handlePrevMonth} className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm border border-slate-100">
                <ChevronLeft size={18} />
              </button>
              <div className="font-bold text-slate-800 text-[15px]">
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
              </div>
              <button 
                type="button" 
                onClick={handleNextMonth} 
                disabled={isCurrentMonth}
                className={`p-2 rounded-xl transition-colors shadow-sm border border-slate-100 ${isCurrentMonth ? 'text-slate-300 bg-slate-50 cursor-not-allowed opacity-50' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
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
export default function HeadOfDepartmentApprovalPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'award_type_name' | null, direction: 'asc' | 'desc' | null }>({ key: 'created_at', direction: 'desc' });

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Nomination | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setCurrentPage(1);
    setSelectedId(null);
  }, [searchTerm, selectedCategory, filterDate, selectedLevel]);

  const formatDateTh = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Helper สำหรับ Filter
  const getLocalYMD = (isoDate: string) => {
      const d = new Date(isoDate);
      if(isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
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

        const response = await api.get(`/awards/search`);
        const fetchedData = response.data?.data || response.data;
        const rawData = Array.isArray(fetchedData) ? fetchedData : [];

        const mappedData = rawData.map((item: any) => {
            const isOrgNominated = item.org_name && item.org_name.trim() !== "";
            return {
                ...item,
                award_type_name: item.award_type,
                is_organization_nominated: isOrgNominated, 
                organization_name: item.org_name 
            };
        });

        const TARGET_STATUS_ID = 1; // 1 = รอหัวหน้าภาควิชาพิจารณา
        const filteredData = mappedData.filter((item: any) => item.form_status === TARGET_STATUS_ID);

        if (isMounted) {
            setItems(filteredData);
        }
      } catch (error: any) {
        console.error("Error fetching nominations:", error);
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
    
    // ค้นหาตามชื่อหรือรหัส (Frontend search)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.student_firstname?.toLowerCase().includes(lowerTerm) || 
        item.student_lastname?.toLowerCase().includes(lowerTerm) ||
        item.student_number?.includes(lowerTerm)
      );
    }
    
    // กรองประเภทรางวัล
    if (selectedCategory !== "all") {
        filtered = filtered.filter(item => {
            const awardStr = (item.award_type_name || "").toLowerCase();
            if (selectedCategory === "อื่นๆ") {
                return !awardStr.includes("กิจกรรม") && !awardStr.includes("นวัตกรรม") && !awardStr.includes("ประพฤติดี");
            }
            return awardStr.includes(selectedCategory);
        });
    }
    
    // กรองชั้นปี
    if (selectedLevel !== "all") {
        if(selectedLevel === "5") {
            filtered = filtered.filter(item => item.student_year >= 5);
        } else {
            filtered = filtered.filter(item => String(item.student_year) === selectedLevel);
        }
    }

    // กรองวันที่ส่ง (แสดงฟอร์มที่ส่งตั้งแต่อดีต จนถึง สิ้นสุดของวันที่เลือก)
    if (filterDate) {
        const filterTime = new Date(filterDate).setHours(23, 59, 59, 999); // ปรับเวลาเป็นเกือบเที่ยงคืนของวันที่เลือก
        filtered = filtered.filter(item => {
            const itemTime = new Date(item.created_at).getTime();
            return itemTime <= filterTime; // เอาเฉพาะรายการที่ส่งก่อนหรือเท่ากับเวลาสิ้นสุดของวันที่เลือก
        });
    }
    
    // เรียงข้อมูล
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        let valA = sortConfig.key ? a[sortConfig.key] : '';
        let valB = sortConfig.key ? b[sortConfig.key] : '';
        if (sortConfig.key === 'student_firstname') {
          valA = `${a.student_firstname} ${a.student_lastname}`;
          valB = `${b.student_firstname} ${b.student_lastname}`;
        } else if (sortConfig.key === 'created_at') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [items, searchTerm, selectedLevel, filterDate, selectedCategory, sortConfig]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const currentItems = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Format Options
  const categoryOptions = AWARD_CATEGORIES.map(c => ({ label: c.label, value: c.value }));
  const levelOptions = YEAR_LEVELS.map(c => ({ label: c.label, value: c.value }));

  // ==========================================
  // 5. Handlers
  // ==========================================
  const handleSort = (key: keyof Nomination | 'award_type_name') => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const submitVote = async (id: number, statusId: number, reason: string, studentName: string) => {
    try {
      if (!USE_MOCK_DATA) {
        await api.put(`/awards/form-status/change/${id}`, { form_status: statusId, reject_reason: reason });
      }
      setItems(prev => prev.filter(c => c.form_id !== id));
      setSelectedId(null);
      setIsRejectModalOpen(false);
      Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: reason.length > 0 ? 'info' : 'success', title: 'บันทึกผลสำเร็จ', text: `จัดการข้อมูลของ: ${studentName} เรียบร้อย` });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ดำเนินการไม่สำเร็จ' });
    }
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
    const result = await Swal.fire({ title: `ยืนยันการ "เห็นชอบ"?`, html: `ยืนยันความเห็นชอบให้กับ <b>${displayName}</b>`, icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#10B981' });
    
    if (result.isConfirmed) {
      const NEXT_STATUS_ID = 2; // 2 = รอรองคณบดีพิจารณา
      await submitVote(selectedId, NEXT_STATUS_ID, "", displayName);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return Swal.fire({ icon: 'warning', title: 'กรุณาระบุเหตุผล' });
    const selectedItem = items.find(c => c.form_id === selectedId);
    if (selectedId && selectedItem) {
      const displayName = getDisplayName(selectedItem);
      const REJECT_STATUS_ID = 3; // 3 = หัวหน้าภาควิชาตีกลับ
      await submitVote(selectedId, REJECT_STATUS_ID, rejectReason, displayName);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        {/* กำหนด z-index ให้สูงกว่า Data Table (z-50) */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/70 backdrop-blur-xl border border-white shadow-sm rounded-3xl p-8 relative z-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" /> พิจารณาคัดเลือกนิสิตดีเด่น
              </h1>
              <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" /> สำหรับหัวหน้าภาควิชา
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Search Box - อยู่ด้านบนเต็มความกว้าง */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสนิสิต..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-white hover:bg-slate-50 transition-all border border-slate-200/80 rounded-2xl px-4 py-[14px] pl-12 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 shadow-sm" 
              />
            </div>
            
            {/* Filters - แบ่ง 3 ส่วนสมมาตร */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                <CustomDatePicker label="วันที่ส่ง (ถึงวันที่)" value={filterDate} onChange={setFilterDate} disabled={loading} />
                <AnimatedSelect label="ประเภทรางวัล" value={selectedCategory} onChange={setSelectedCategory} options={categoryOptions} icon={Award} disabled={loading} />
                <AnimatedSelect label="ระดับชั้นปี" value={selectedLevel} onChange={setSelectedLevel} options={levelOptions} icon={GraduationCap} disabled={loading} />
            </div>
          </div>
        </motion.div>

        {/* Data Table */}
        {/* กำหนด z-index ให้ต่ำกว่า Header (z-10) เพื่อไม่ให้บัง Dropdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
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
                     <div className="flex items-center justify-center gap-1">รางวัล {sortConfig.key === 'award_type_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 text-center">ผู้เสนอชื่อ</th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('created_at')}>
                     <div className="flex items-center justify-center gap-1">วันที่ส่ง {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 text-center">สถานะ</th>
                  <th className="p-5 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-100">
                      <td colSpan={7} className="p-5"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-medium">ไม่พบรายการรอพิจารณา</td></tr>
                ) : (
                  currentItems.map((item, index) => (
                    <motion.tr key={item.form_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} onClick={() => setSelectedId(item.form_id)} className={`transition-colors cursor-pointer group ${selectedId === item.form_id ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full shrink-0 ${selectedId === item.form_id ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                           <div><p className="text-sm font-bold text-slate-800">{getDisplayName(item)}</p><p className="text-xs text-slate-500">{item.student_lastname === "-" ? 'หน่วยงาน' : `ปี ${item.student_year || "-"}`}</p></div>
                        </div>
                      </td>
                      <td className="p-5 text-sm text-center text-slate-600 font-mono">{item.student_lastname === "-" ? "-" : (item.student_number || "-")}</td>
                      <td className="p-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 truncate max-w-[150px]">{item.award_type_name || "-"}</span>
                      </td>
                      <td className="p-5 text-center">
                          {item.is_organization_nominated ? (<span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">องค์กร: {item.organization_name}</span>) : (<span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">เสนอตัวเอง</span>)}
                      </td>
                      <td className="p-5 text-sm text-center text-slate-500">{formatDateTh(item.created_at)}</td>
                      <td className="p-5 text-center"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200"><Clock className="w-3.5 h-3.5" /> รอพิจารณา</span></td>
                      <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}><button onClick={() => { setModalData(item); setIsDetailModalOpen(true); }} className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"><Eye className="w-5 h-5" /></button></td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-50 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">หน้า {currentPage} จาก {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-50 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => { setRejectReason(""); setIsRejectModalOpen(true); }} disabled={selectedId === null} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${selectedId === null ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200"}`}><XCircle className="w-4 h-4" /> ไม่เห็นชอบ</button>
              <button onClick={handleApprove} disabled={selectedId === null} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${selectedId === null ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"}`}><CheckCircle2 className="w-4 h-4" /> เห็นชอบ</button>
            </div>
          </div>
        </motion.div>

        {/* Modal: Nomination Detail */}
        <NominationDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} data={modalData} faculties={[]} departments={[]} />

        {/* Modal: Reject Reason */}
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">เหตุผลที่ตีกลับเอกสาร <span className="text-rose-500">*</span></label>
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