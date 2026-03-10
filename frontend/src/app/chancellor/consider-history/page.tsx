"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, GraduationCap, CheckCircle2,
  Eye, Award, Building2, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, History, Calendar, X, Clock
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Types
// ==========================================
const ITEMS_PER_PAGE = 8; 

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
  signed_at?: string; // เพิ่มสำหรับหน้า History
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

// Custom Dropdown Component
const CustomSelect = ({ value, onChange, options, icon: Icon, placeholder, className = "" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const selectedLabel = options.find((o: any) => String(o.v) === String(value))?.l || placeholder;
    return (
        <div className={`relative w-full ${className}`} style={{ zIndex: isOpen ? 50 : 10 }} ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full pl-11 pr-4 py-3.5 bg-white border rounded-2xl cursor-pointer transition-all duration-300 shadow-sm ${isOpen ? 'border-purple-400 ring-4 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300'}`}>
                <Icon className={`w-4 h-4 absolute left-4 top-4 transition-colors ${isOpen ? 'text-purple-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium truncate ${!value || value === "all" ? 'text-slate-500' : 'text-slate-800'}`}>{selectedLabel}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-purple-500' : ''}`} />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto z-[9999]">
                        {options.map((o: any, i: number) => (
                            <div key={i} onClick={() => { onChange(String(o.v)); setIsOpen(false); }} className={`px-4 py-3 cursor-pointer transition-all text-sm font-medium flex items-center justify-between ${String(value) === String(o.v) ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>{o.l} {String(value) === String(o.v) && <CheckCircle2 size={16} className="text-purple-500" />}</div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Custom Animated DatePicker
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
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "เลือกวันที่...";
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const handleSelectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(`${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`);
    setIsOpen(false);
  };
  return (
    <div className={`relative w-full ${isOpen ? 'z-[50]' : 'z-10'}`} ref={containerRef}>
      <button type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)} className={`flex w-full items-center justify-between bg-white transition-all border border-slate-200 rounded-2xl px-4 py-3.5 shadow-sm ${disabled ? 'opacity-50' : 'cursor-pointer focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400'}`}>
        <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-slate-400" /><span className={`text-sm font-medium ${value ? 'text-slate-800' : 'text-slate-500'}`}>{value ? formatDisplayDate(value) : label}</span></div>
        {value ? <div onClick={(e) => { e.stopPropagation(); onChange(""); }} className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-500"><X size={14} /></div> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 sm:min-w-[320px] mt-2 bg-white border border-slate-100 rounded-[24px] shadow-2xl z-[9999] p-5">
             <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={18}/></button>
                <div className="font-bold text-sm text-slate-800">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear() + 543}</div>
                <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={18}/></button>
             </div>
             <div className="grid grid-cols-7 gap-y-1 text-center">
                {DAY_NAMES.map(d => <div key={d} className="text-[10px] font-bold text-slate-400 py-1">{d}</div>)}
                {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`blank-${i}`} />)}
                {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => (
                  <button key={i} type="button" onClick={() => handleSelectDate(i + 1)} className="aspect-square text-sm font-medium rounded-full hover:bg-purple-50 hover:text-purple-600 transition-colors">{i + 1}</button>
                ))}
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

export default function ChancellorHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Nomination | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterDate, setFilterDate] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'signed_at' | null, direction: 'asc' | 'desc' | null }>({ key: 'signed_at', direction: 'desc' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatPrettyDate = (isoDate: string) => {
      if (!isoDate) return { date: "-", time: "-" };
      const d = new Date(isoDate);
      return { 
          date: d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
          time: d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("🟡 1. เริ่มยิง API /awards/my/signed-logs");
        const response = await api.get(`/awards/my/signed-logs`, { params: { limit: 500 } });
        
        const responseData = response.data?.data || response.data;
        const rawLogs = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
        
        console.log("🟢 2. ได้รับข้อมูล Raw Logs จาก Backend:", rawLogs);

        if (rawLogs.length === 0) {
            console.log("🔴 Backend ส่ง Array ว่างมาให้");
            setItems([]);
            setLoading(false);
            return;
        }

        const mappedDataPromises = rawLogs.map(async (item: any) => {
            try {
                const detailResponse = await api.get(`/awards/details/${item.form_id}`);
                const detailData = detailResponse.data?.data || {};
                const isOrg = detailData.student_lastname === "-";
                
                return {
                    ...item, // เอาข้อมูลจาก log เป็นหลัก (เพราะมี signed_at)
                    ...detailData, // เอาข้อมูลจาก details มาแปะทับ
                    form_status: detailData.form_status_id || detailData.form_status || item.form_status_id || item.form_status, 
                    award_type_name: detailData.award_type || "-",
                    is_organization_nominated: isOrg,
                    organization_name: isOrg ? detailData.student_firstname : "",
                    signed_at: item.signed_at || item.created_at || detailData.latest_update // แมปวันที่ลงนามให้ชัวร์
                };
            } catch (error) { 
                console.error(`🔴 3. Failed to fetch details for Form ID ${item.form_id}`, error);
                return null; 
            }
        });

        const finalData = (await Promise.all(mappedDataPromises)).filter(x => x !== null);
        console.log("🔵 4. ข้อมูลหลังจาก Map กับ Details เสร็จแล้ว:", finalData);
        
        const historyOnly = finalData.filter(item => {
             const status = Number(item.form_status);
             return status >= 12; // ประวัติที่อธิการลงนามเสร็จ 
        });

        console.log("🟣 5. ข้อมูลพร้อมแสดงผล:", historyOnly);
        setItems(historyOnly);

      } catch (err) { 
        console.error("🔴 เกิด Error ตอน Fetch Data:", err); 
        setItems([]); 
      } finally { 
        setLoading(false); 
      }
    };

    const fetchAwardTypes = async () => {
      try {
        const response = await api.get(`/awards/types`);
        const types = response.data?.data || response.data || [];
        setAwardTypes(Array.isArray(types) ? types : []);
      } catch (error) {}
    };

    fetchAwardTypes();
    fetchData();
  }, []);

  const processedData = useMemo(() => {
    let filtered = [...items]; // 🚨 แก้บัค Array Mutation
    if (debouncedSearch) {
        const low = debouncedSearch.toLowerCase();
        filtered = filtered.filter(i => (i.student_firstname?.toLowerCase().includes(low)) || (i.student_number?.includes(low)));
    }
    if (filterCategory !== "all") {
        filtered = filtered.filter(i => {
            const award = (i.award_type_name || "").toLowerCase();
            if (filterCategory === "อื่นๆ") return !award.includes("กิจกรรม") && !award.includes("นวัตกรรม") && !award.includes("ประพฤติดี");
            return award.includes(filterCategory.toLowerCase());
        });
    }
    if (filterYear !== "all") filtered = filtered.filter(i => String(i.student_year) === filterYear);
    if (filterDate) {
        const fTime = new Date(filterDate).setHours(23, 59, 59, 999);
        filtered = filtered.filter(i => new Date(i.signed_at || "").getTime() <= fTime);
    }
    if (sortConfig.key) {
        filtered.sort((a: any, b: any) => {
            const vA = sortConfig.key === 'signed_at' ? new Date(a.signed_at || "").getTime() : a[sortConfig.key as keyof Nomination];
            const vB = sortConfig.key === 'signed_at' ? new Date(b.signed_at || "").getTime() : b[sortConfig.key as keyof Nomination];
            return sortConfig.direction === 'asc' ? (vA < vB ? -1 : 1) : (vA > vB ? -1 : 1);
        });
    }
    return filtered;
  }, [items, debouncedSearch, filterCategory, filterYear, filterDate, sortConfig]);

  const currentItems = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const handleSort = (key: keyof Nomination | 'award_type_name' | 'signed_at') => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/30 p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-6 relative">
        
        {/* Header */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="w-full text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 mb-3 font-bold text-[11px] tracking-widest uppercase"><History className="w-4 h-4" /> ประวัติการลงนามอธิการบดี</div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">รายการที่อนุมัติแล้ว</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 relative z-30">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
              <input type="text" placeholder="ค้นหาชื่อนิสิต หรือ รหัสนิสิต..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 pl-12 text-[15px] font-medium focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none transition-all shadow-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomDatePicker label="วันที่ลงนาม (ถึงวันที่)" value={filterDate} onChange={setFilterDate} disabled={loading} />
                {/* 🚨 แก้ไขการส่งค่า Props ให้ตรงกับ Key v, l */}
                <CustomSelect value={filterCategory} onChange={setFilterCategory} options={AWARD_CATEGORIES} icon={Award} placeholder="ทุกประเภทรางวัล" />
                <CustomSelect value={filterYear} onChange={setFilterYear} options={YEAR_LEVELS} icon={GraduationCap} placeholder="ทุกระดับชั้นปี" />
            </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden relative z-10">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors w-[30%]" onClick={() => handleSort('student_firstname')}>
                    <div className="flex items-center gap-1.5">ผู้ได้รับการเสนอชื่อ {sortConfig.key === 'student_firstname' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[20%]" onClick={() => handleSort('student_number')}>
                    <div className="flex items-center justify-center gap-1.5">รหัสนิสิต {sortConfig.key === 'student_number' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 text-center w-[20%]">สถานะ</th>
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors text-center w-[20%]" onClick={() => handleSort('signed_at')}>
                     <div className="flex items-center justify-center gap-1.5">วันที่ลงนาม {sortConfig.key === 'signed_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-500"/> : <ArrowDown className="w-3.5 h-3.5 text-purple-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 text-center w-[10%]">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? <tr className="animate-pulse"><td colSpan={5} className="p-20 text-center text-slate-400">กำลังโหลดประวัติ...</td></tr> : 
                 currentItems.length === 0 ? <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-medium">ไม่พบประวัติการลงนาม</td></tr> :
                 currentItems.map((item) => {
                    const fullName = `${item.student_firstname || ""} ${item.student_lastname || ""}`.trim();
                    const isOrg = item.student_lastname === "-";
                    const signed = formatPrettyDate(item.signed_at || "");
                    return (
                        <tr key={item.form_id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="p-6">
                            <div className="font-extrabold text-slate-800 text-[15px] group-hover:text-purple-700 transition-colors">{fullName}</div>
                            <div className="text-[12px] text-slate-500 mt-1">{isOrg ? "หน่วยงานภายนอก" : `ชั้นปีที่ ${item.student_year || "-"}`} • {item.award_type_name}</div>
                          </td>
                          <td className="p-6 text-center"><span className="font-mono bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 border border-slate-200 font-medium">{item.student_number || "-"}</span></td>
                          <td className="p-6 text-center">
                              <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> เสร็จสิ้นกระบวนการ</div>
                          </td>
                          <td className="p-6 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded-md border border-purple-100"><Calendar size={13}/>{signed.date}</div>
                                <div className="text-[11px] text-purple-400 font-bold"><Clock className="w-3 h-3 inline-block mr-1"/>{signed.time} น.</div>
                              </div>
                          </td>
                          <td className="p-6 text-center">
                            <button onClick={() => { setModalData(item); setIsDetailModalOpen(true); }} className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all border border-slate-200"><Eye size={18}/></button>
                          </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="bg-slate-50/50 border-t border-slate-100 p-6 flex justify-between items-center rounded-b-[32px]">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"><ChevronLeft size={20}/></button>
              <span className="text-sm font-bold text-slate-700 px-4">หน้า {currentPage} จาก {Math.ceil(processedData.length / ITEMS_PER_PAGE) || 1}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(processedData.length / ITEMS_PER_PAGE)))} disabled={currentPage >= Math.ceil(processedData.length / ITEMS_PER_PAGE) || processedData.length === 0} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"><ChevronRight size={20}/></button>
            </div>
            <div className="text-[13px] text-slate-500 font-bold">ทั้งหมด {processedData.length} รายการ</div>
          </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
            {isDetailModalOpen && modalData && (
                <NominationDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} data={modalData} faculties={[]} departments={[]} />
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}