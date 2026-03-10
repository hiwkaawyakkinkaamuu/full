"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Medal, Trophy, GraduationCap,
  Sparkles, Search, CalendarDays, BookOpen, Info, IdCard,
  ChevronDown, ChevronLeft, ChevronRight, Filter, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Types
// ==========================================

const MAIN_CATEGORIES = [
  "กิจกรรมนอกหลักสูตร",
  "ความคิดสร้างสรรค์และนวัตกรรม",
  "ความประพฤติดี"
];

const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  "กิจกรรมนอกหลักสูตร": "ด้านกิจกรรมเสริมหลักสูตร",
  "ความคิดสร้างสรรค์และนวัตกรรม": "ด้านความคิดสร้างสรรค์และนวัตกรรม",
  "ความประพฤติดี": "ด้านประพฤติดี",
  "อื่นๆ": "ประเภทอื่นๆ",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "กิจกรรมนอกหลักสูตร": "ผลงานที่แสดงถึงความเสียสละ ความเป็นผู้นํา และการทําประโยชน์เพื่อสังคมและส่วนรวม",
  "ความคิดสร้างสรรค์และนวัตกรรม": "ผลงานที่เกิดจากการคิดค้น สิ่งประดิษฐ์ หรือแนวคิดใหม่ๆ ที่เป็นประโยชน์และเป็นที่ยอมรับ",
  "ความประพฤติดี": "ผลงานที่แสดงถึงความมีวินัย ความซื่อสัตย์ ความรับผิดชอบ และการเป็นแบบอย่างที่ดีในมหาวิทยาลัย",
  "อื่นๆ": "ผลงานด้านอื่นๆ ที่นิสิตได้แสดงศักยภาพ สร้างชื่อเสียง และทําคุณประโยชน์ให้แก่มหาวิทยาลัย นอกเหนือจาก 3 ประเภทหลัก"
};

// ==========================================
// Custom Dropdown Component (New Elegant UI)
// ==========================================
function ElegantSelect({ 
  value, onChange, options, label, icon: Icon, disabled 
}: { 
  value: any, onChange: (val: any) => void, options: {label: string, value: any}[], label: string, icon: any, disabled?: boolean 
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
    // เปลี่ยนจาก sm:w-64 เป็น w-full เพื่อให้ขยายเต็มช่อง 50/50 
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between transition-all duration-300 rounded-[1.25rem] px-5 py-3 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen 
            ? 'bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] border border-slate-100 ring-2 ring-emerald-500/10' 
            : 'bg-transparent border border-transparent hover:bg-white/60'}
        `}
      >
        <div className="flex items-center gap-3.5">
          <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100/80 text-slate-500'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</span>
            <span className={`text-sm font-bold leading-none ${isOpen ? 'text-emerald-700' : 'text-slate-700'} line-clamp-1`}>{selectedLabel}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`} />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div 
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden z-[9999]"
          >
            <div className="max-h-64 overflow-y-auto no-scrollbar p-2 space-y-1">
              {options.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-400 text-center font-medium">ไม่มีข้อมูลให้เลือก</div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all rounded-xl flex items-center justify-between
                      ${value === opt.value 
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                  >
                    {opt.label}
                    {value === opt.value && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// Category Card (Frontend Pagination & Search)
// ==========================================
function CategoryCard({ 
  categoryKey,
  title, 
  items, 
  formatName 
}: { 
  categoryKey: string;
  title: string; 
  items: any[]; 
  formatName: (item: any) => { name: string; studentId: string; faculty: string | undefined }; 
}) {
  const description = CATEGORY_DESCRIPTIONS[categoryKey] || CATEGORY_DESCRIPTIONS["อื่นๆ"];
  const isOther = categoryKey === "อื่นๆ";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4; // กำหนดให้แสดงหน้าละ 4 รายการ

  // รีเซ็ตกลับไปหน้า 1 เสมอเวลาพิมพ์ค้นหา
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // ระบบค้นหาและกรองข้อมูล
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const { name, studentId } = formatName(item);
      const organizationName = (item.organization_name || "").toLowerCase();
      const actualAwardType = (item.award_type || "").toLowerCase();
      return name.toLowerCase().includes(searchLower) || 
             studentId.includes(searchLower) || 
             organizationName.includes(searchLower) ||
             actualAwardType.includes(searchLower);
    });
  }, [items, searchQuery, formatName]);

  // คำนวณหน้าและการตัดข้อมูล
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-white rounded-[32px] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-200/80 relative flex flex-col hover:z-20 transition-all duration-300"
    >
      <div className="px-6 md:px-8 py-6 md:py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-t-[32px]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl shrink-0 z-10">
            <Medal className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
          </div>
          <h3 className="text-xl md:text-[22px] font-extrabold text-slate-800 tracking-tight flex items-center gap-2 relative z-50">
            {title}
            <div className="relative group/tooltip flex items-center justify-center cursor-help z-[100] hidden sm:flex">
              <Info className="w-4 h-4 text-slate-300 hover:text-emerald-500 transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-800 text-white text-[13px] leading-relaxed font-medium p-4 rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-2xl text-center pointer-events-none">
                {description}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45"></div>
              </div>
            </div>
          </h3>
        </div>

        <div className="w-full lg:w-72 flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100/50 transition-all shadow-sm z-10">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, รหัสนิสิต..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      <div className="p-6 md:p-8 flex-1 relative min-h-[150px]">
        <AnimatePresence mode="wait">
          {paginatedItems.length === 0 ? (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="py-12 flex flex-col items-center justify-center text-slate-400 w-full"
            >
              <Search className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">ไม่พบข้อมูลการค้นหาในหมวดนี้</p>
            </motion.div>
          ) : (
            <motion.div 
              key={currentPage + searchQuery} 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5"
            >
              {paginatedItems.map((item, index) => {
                const { name, studentId, faculty } = formatName(item);
                const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                
                return (
                  <div 
                    key={item.form_id || index} 
                    className="flex items-start gap-4 p-4 rounded-[20px] bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 hover:bg-emerald-50/30 transition-all duration-300 group/item"
                  >
                    <div className="w-12 h-12 shrink-0 bg-slate-50 text-slate-400 font-black text-lg rounded-[14px] flex items-center justify-center border border-slate-200 shadow-sm group-hover/item:text-emerald-600 group-hover/item:border-emerald-200 group-hover/item:bg-emerald-100/50 transition-colors">
                      <span>{actualIndex}</span>
                    </div>
                    <div className="flex-1 pt-0.5 min-w-0">
                      <h4 className="text-[16px] font-bold text-slate-800 leading-snug truncate group-hover/item:text-emerald-700 transition-colors">
                        {name}
                      </h4>
                      {isOther && item.award_type && (
                        <div className="text-[11px] font-bold text-emerald-600 mt-1 truncate">
                          รางวัล: {item.award_type}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">
                          <IdCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{studentId}</span>
                        </div>
                        {faculty && (
                          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="truncate">{faculty}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between rounded-b-[32px] z-10">
          <p className="text-sm font-medium text-slate-500">
            แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} จาก {filteredItems.length} รายการ
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-700 w-16 text-center">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// Main Page Component
// ==========================================
export default function HallOfFamePage() {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [awards, setAwards] = useState<any[]>([]);
  
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number>(2);

  // State เก็บ Search Keyword และเลขหน้าของแต่ละหมวด
  const [queries, setQueries] = useState({
    "กิจกรรมนอกหลักสูตร": { keyword: "", page: 1 },
    "ความคิดสร้างสรรค์และนวัตกรรม": { keyword: "", page: 1 },
    "ความประพฤติดี": { keyword: "", page: 1 },
    "อื่นๆ": { keyword: "", page: 1 },
  });

  // State เก็บข้อมูล Total items จาก Backend (เพื่อให้รู้ว่าแต่ละหมวดมีกี่หน้า)
  const [totals, setTotals] = useState({
    "กิจกรรมนอกหลักสูตร": 0,
    "ความคิดสร้างสรรค์และนวัตกรรม": 0,
    "ความประพฤติดี": 0,
    "อื่นๆ": 0,
  });

  const updateQuery = (category: string, key: 'keyword' | 'page', value: any) => {
    setQueries(prev => ({
      ...prev,
      // ถ้าเปลี่ยน Keyword ให้รีเซ็ตกลับไปหน้า 1
      [category]: { ...prev[category as keyof typeof prev], [key]: value, ...(key === 'keyword' ? { page: 1 } : {}) }
    }));
  };

  // ดึงปีการศึกษา
  useEffect(() => {
    let isMounted = true;
    const fetchYears = async () => {
      setLoadingInitial(true);
      try {
        const res = await api.get(`/academic-years/all`);
        const rawYears = res.data?.data || res.data || [];
        
        const yearSet = new Set<number>();
        rawYears.forEach((item: any) => {
          if (item.year) yearSet.add(item.year);
          else if (typeof item === 'number') yearSet.add(item);
        });
        
        const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
        if (isMounted) {
          setAvailableYears(sortedYears);
          if (sortedYears.length > 0) setSelectedYear(sortedYears[0]); 
        }
      } catch (error) {
        console.error("Error fetching academic years:", error);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };
    fetchYears();
    return () => { isMounted = false; };
  }, []);

  // ดึงข้อมูล Awards (จะทำงานเมื่อ Filter ด้านบน หรือ Queries เปลี่ยน)
  useEffect(() => {
    if (!selectedYear) return;
    let isMounted = true;

    const fetchAwards = async () => {
      setLoadingAwards(true);
      try {
        // ส่ง Params ตาม DTO Request ของ Backend เลยครับ
        const res = await api.get(`/awards/announcement`, { 
          params: { 
            academic_year: selectedYear, 
            semester: selectedSemester,
            keyword_extracurricular: queries["กิจกรรมนอกหลักสูตร"].keyword,
            page_extracurricular: queries["กิจกรรมนอกหลักสูตร"].page,
            keyword_creativity: queries["ความคิดสร้างสรรค์และนวัตกรรม"].keyword,
            page_creativity: queries["ความคิดสร้างสรรค์และนวัตกรรม"].page,
            keyword_behavior: queries["ความประพฤติดี"].keyword,
            page_behavior: queries["ความประพฤติดี"].page,
            keyword_other: queries["อื่นๆ"].keyword,
            page_other: queries["อื่นๆ"].page,
          } 
        });

        const fetchedData = res.data?.Data || res.data?.data || res.data || [];
        const payloadData = Array.isArray(fetchedData) ? fetchedData : [];
        if (isMounted) {
          setAwards(payloadData);

          // คำนวณหาว่าแต่ละหมวดมีของรวมกี่ชิ้น (เพื่อเอาไปคิดจำนวนหน้า)
          // *หมายเหตุ* ถ้า Backend มีการส่ง `total_extracurricular` กลับมาด้วยก็จะใช้ค่านั้นเลย ถ้าไม่มีจะใช้ความยาวของ Array แทนครับ
          const groupCount: any = { "กิจกรรมนอกหลักสูตร": 0, "ความคิดสร้างสรรค์และนวัตกรรม": 0, "ความประพฤติดี": 0, "อื่นๆ": 0 };
          payloadData.forEach(item => {
            const group = item.award_type_group || "";
            if (groupCount[group] !== undefined) groupCount[group]++;
            else groupCount["อื่นๆ"]++;
          });

          setTotals({
            "กิจกรรมนอกหลักสูตร": res.data?.total_extracurricular ?? groupCount["กิจกรรมนอกหลักสูตร"],
            "ความคิดสร้างสรรค์และนวัตกรรม": res.data?.total_creativity ?? groupCount["ความคิดสร้างสรรค์และนวัตกรรม"],
            "ความประพฤติดี": res.data?.total_behavior ?? groupCount["ความประพฤติดี"],
            "อื่นๆ": res.data?.total_other ?? groupCount["อื่นๆ"],
          });
        }
      } catch (error) {
        console.error("Error fetching announcement awards:", error);
        if (isMounted) setAwards([]);
      } finally {
        if (isMounted) setLoadingAwards(false);
      }
    };
    fetchAwards();
    return () => { isMounted = false; };
  }, [selectedYear, selectedSemester, queries]); // Re-fetch ทันทีที่ queries หรือ filter เปลี่ยน

  const groupedData = useMemo(() => {
    const result: Record<string, any[]> = { "อื่นๆ": [] };
    MAIN_CATEGORIES.forEach(cat => result[cat] = []);

    awards.forEach(item => {
      const group = item.award_type_group || "";
      if (MAIN_CATEGORIES.includes(group)) {
        result[group].push(item);
      } else {
        result["อื่นๆ"].push(item);
      }
    });

    return result;
  }, [awards]);

  const formatAwardeeName = (item: any) => {
    let name = "";
    if (item.display_name) {
      name = item.display_name;
    } else if (item.student_firstname) {
      const prefix = (item.prefix || item.student_prefix || "").trim();
      const fName = (item.student_firstname || "").trim();
      const lName = (item.student_lastname || "").trim();
      if (lName === "-") {
        name = item.organization_name || fName;
      } else {
        name = `${prefix}${fName} ${lName}`.trim();
      }
    } else {
      name = item.organization_name || "นิสิต (ไม่ระบุชื่อ)";
    }
    return { name, studentId: item.student_number || "-", faculty: item.faculty_name || "" };
  };

  const hasAnyData = useMemo(() => {
    return Object.values(groupedData).some(arr => arr.length > 0);
  }, [groupedData]);

  const yearOptions = availableYears.map(y => ({ label: `ปีการศึกษา ${y + 543}`, value: y }));
  const semesterOptions = [{ label: "ภาคเรียนที่ 1", value: 1 }, { label: "ภาคเรียนที่ 2", value: 2 }];

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-40 selection:bg-emerald-200 relative">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 1. Hero Section & Filter (รวมกันเป็นบล็อกเดียวเพื่อให้เนียนไร้รอยต่อ) */}
      <div className="relative bg-white rounded-b-[2.5rem] md:rounded-b-[3.5rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] z-20 mb-8 border-b border-slate-200/50">
        
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-50/80 to-transparent blur-[80px] pointer-events-none"></div>
        <div className="absolute -top-20 right-[5%] w-[400px] h-[400px] bg-yellow-50/50 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Hero Content */}
        <div className="max-w-5xl mx-auto px-6 pt-36 pb-12 relative z-10 text-center">
          <motion.div 
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 150, damping: 15 }}
            className="inline-flex items-center justify-center p-6 bg-white rounded-full mb-8 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.2)] border border-emerald-100/50 relative"
          >
            <Trophy className="w-16 h-16 text-emerald-600 drop-shadow-sm" strokeWidth={1.2} />
            <Sparkles className="absolute -top-2 -right-4 w-10 h-10 text-yellow-400 animate-pulse" />
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-6">
              ทําเนียบ<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">นิสิตดีเด่น</span>
            </h1>
            <p className="text-slate-500 text-lg md:text-2xl font-light max-w-2xl mx-auto leading-relaxed">
              มหาวิทยาลัยเกษตรศาสตร์ ยกย่องและเชิดชูเกียรตินิสิต<br className="hidden md:block"/>ผู้สร้างชื่อเสียงและเป็นแบบอย่างที่ดีในแต่ละภาคการศึกษา
            </p>
          </motion.div>
        </div>

        {/* NEW Elegant Filter Panel (ฝังเป็นส่วนหนึ่งของ Hero + ปรับขนาดให้เต็มช่อง) */}
        <div className="max-w-6xl mx-auto px-6 pb-10 relative z-[60]">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="bg-slate-50/80 backdrop-blur-xl rounded-[2rem] p-2 md:p-3 border border-slate-200/60 flex flex-col md:flex-row gap-2 items-center justify-between"
          >
            <div className="flex flex-col sm:flex-row items-center w-full divide-y sm:divide-y-0 sm:divide-x divide-slate-200/50">
              <div className="hidden md:flex items-center gap-2.5 px-6 shrink-0">
                <div className="p-1.5 bg-white shadow-sm rounded-lg border border-slate-100">
                  <Filter className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">ตัวกรอง</span>
              </div>
              
              {/* ใช้ Grid ให้ 2 Select แบ่ง 50/50 เต็มพื้นที่เสมอ */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 px-2 py-1">
                <div className="w-full">
                  <ElegantSelect 
                    label="ปีการศึกษา" 
                    value={selectedYear} 
                    onChange={(val) => setSelectedYear(val)} 
                    options={yearOptions} 
                    icon={CalendarDays} 
                    disabled={loadingInitial || loadingAwards}
                  />
                </div>
                <div className="w-full">
                  <ElegantSelect 
                    label="ภาคเรียน" 
                    value={selectedSemester} 
                    onChange={(val) => setSelectedSemester(val)} 
                    options={semesterOptions} 
                    icon={BookOpen} 
                    disabled={loadingInitial || loadingAwards}
                  />
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            <div className="w-full md:w-auto flex justify-center md:justify-end px-4 shrink-0">
              <AnimatePresence mode="wait">
                {loadingAwards ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
                  >
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">กำลังโหลด...</span>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-8 flex items-center"></motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. Main Content (คง max-w-6xl ไว้ให้พอดีกับกล่องด้านบนเป๊ะๆ) */}
      <div className="max-w-6xl mx-auto px-6 z-10 relative">
        {loadingInitial ? (
          <div className="space-y-12">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-white rounded-[32px] p-8 border border-slate-200">
                  <div className="h-10 bg-slate-200 rounded-xl w-64 mb-8"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-24 bg-slate-50 rounded-[20px] w-full border border-slate-100"></div>
                    <div className="h-24 bg-slate-50 rounded-[20px] w-full border border-slate-100"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyData ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] p-24 text-center shadow-sm border border-slate-200 mt-4">
            <div className="bg-slate-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <Search className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">ยังไม่มีข้อมูลในปีการศึกษานี้</h3>
            <p className="text-slate-500">รายชื่อผู้ได้รับรางวัลจะปรากฏที่นี่หลังจากการพิจารณาอนุมัติเสร็จสิ้น</p>
          </motion.div>
        ) : (
          <div className="space-y-10 pb-20">
            {MAIN_CATEGORIES.map((categoryKey) => {
              const items = groupedData[categoryKey] || [];
              if (items.length === 0) return null;
              return (
                <CategoryCard 
                  key={categoryKey} 
                  categoryKey={categoryKey}
                  title={CATEGORY_DISPLAY_LABELS[categoryKey] || categoryKey} 
                  items={items} 
                  formatName={formatAwardeeName} 
                />
              );
            })}
            
            {(groupedData["อื่นๆ"]?.length ?? 0) > 0 && (
              <CategoryCard 
                categoryKey="อื่นๆ"
                title={CATEGORY_DISPLAY_LABELS["อื่นๆ"]} 
                items={groupedData["อื่นๆ"]} 
                formatName={formatAwardeeName} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}