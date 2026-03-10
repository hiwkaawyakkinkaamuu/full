"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/axios"; 
import { 
    Search, ChevronDown, CheckCircle2, History, User, 
    ChevronLeft, ChevronRight, XCircle, ArrowUpDown, Building2, FileText
} from "lucide-react";

// ==========================================
// 0. Configuration & Interfaces
// ==========================================

const USE_MOCK_DATA = false;
const ITEMS_PER_PAGE = 6;

export interface LogEntry {
    log_id: number;
    form_id: number;
    changed_by: number;
    created_at: string;
    
    operator_name?: string;
    target_student_name?: string;
    target_student_id?: string;
    action_type?: string;
    detail_text?: string;
}

// ==========================================
// 1. Helper Functions
// ==========================================

const formatDateTh = (isoDate: string) => {
    if (!isoDate) return "-";
    return new Date(isoDate).toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
};

const formatTimeTh = (isoDate: string) => {
    if (!isoDate) return "-";
    return new Date(isoDate).toLocaleTimeString('th-TH', { 
        hour: '2-digit', minute: '2-digit' 
    });
};

// ==========================================
// 2. Custom Components
// ==========================================

const ActionBadge = ({ action }: { action: string }) => {
    const config: Record<string, { bg: string, text: string, border: string, label: string, icon: any }> = {
        approve: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "ตรวจสอบผ่าน", icon: <CheckCircle2 size={14} className="mr-1.5" /> },
        reject: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "ตีกลับ/ปฏิเสธ", icon: <XCircle size={14} className="mr-1.5" /> },
        other: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", label: "อัปเดตข้อมูล", icon: <History size={14} className="mr-1.5" /> }
    };

    const style = config[action] || config.other;

    return (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase border shadow-sm ${style.bg} ${style.text} ${style.border}`}>
            {style.icon}
            {style.label}
        </span>
    );
};

// Custom Dropdown Component
const CustomSelect = ({ value, onChange, options, icon: Icon, placeholder }: any) => {
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
  
    const selectedLabel = options.find((o: any) => o.v === value)?.l || placeholder;
  
    return (
        <div className="relative w-full z-20" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur-sm border rounded-2xl cursor-pointer transition-all duration-300 shadow-sm
                    ${isOpen ? 'border-indigo-400 ring-4 ring-indigo-500/10' : 'border-slate-200/80 hover:border-slate-300'}
                `}
            >
                <Icon className={`w-4 h-4 absolute left-4 top-3.5 transition-colors ${isOpen ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium truncate ${!value || value === "all" || value === "date_desc" ? 'text-slate-500' : 'text-slate-800'}`}>
                    {selectedLabel}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
            </div>
  
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl overflow-hidden py-2 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
                    >
                        {options.map((o: any, i: number) => (
                            <div
                                key={i}
                                onClick={() => { onChange(o.v); setIsOpen(false); }}
                                className={`px-4 py-3 cursor-pointer transition-all duration-200 text-sm font-medium flex items-center justify-between
                                    ${value === o.v ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                {o.l}
                                {value === o.v && <CheckCircle2 size={16} className="text-indigo-500" />}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ==========================================
// 3. Main Page Component
// ==========================================

export default function SDDHistoryPage() {
    const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    // สำหรับโชว์ชื่อตัวเอง
    const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterAction, setFilterAction] = useState("all");
    const [sortBy, setSortBy] = useState("date_desc");

    // Pagination (Client-Side)
    const [currentPage, setCurrentPage] = useState(1);

    // Debounce ค้นหา ป้องกันการยิง API รัวๆ เวลาพิมพ์
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // รีเซ็ตกลับไปหน้าแรกเสมอเมื่อมีการเปลี่ยนตัวกรอง
    useEffect(() => { 
        setCurrentPage(1); 
    }, [debouncedSearch, filterAction, sortBy]);

    // Fetch Data หลัก
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (USE_MOCK_DATA) return;

                // โหลดข้อมูลตัวเองมาใช้แทน ถ้าหา User ในลิสต์ไม่เจอ
                let myInfo = currentUserInfo;
                if (!myInfo) {
                    const myRes = await api.get('/auth/me').catch(() => null);
                    if (myRes && myRes.data) {
                        myInfo = myRes.data.user || myRes.data.data || myRes.data;
                        if (isMounted) setCurrentUserInfo(myInfo);
                    }
                }

                // เตรียมพารามิเตอร์สำหรับส่งไปให้ Backend (API ใหม่ใช้ sort_order / arrange)
                const params: Record<string, any> = {
                    sort_order: sortBy === "date_desc" ? "desc" : "asc"
                };

                if (debouncedSearch) params.keyword = debouncedSearch;

                // 🚨 เรียกใช้ API ใหม่สำหรับกองพัฒนานิสิต 🚨
                const res = await api.get(`/awards/my/award-type-logs`, { params });
                
                const rawData = res.data?.data;
                const rawLogs = Array.isArray(rawData) ? rawData : []; 

                // Map ข้อมูลให้เข้ากับรูปแบบของ UI
                const mappedLogs = rawLogs.map((log: any) => {
                    
                    let operatorDisplayName = "คุณ"; // Default เป็นคุณ
                    if (myInfo && String(myInfo.user_id) === String(log.user_id)) {
                        operatorDisplayName = `${myInfo.prefix || ""}${myInfo.firstname || ""} ${myInfo.lastname || ""}`.trim();
                    } else {
                        operatorDisplayName = `รหัสผู้ดำเนินการ: ${log.user_id || "?"}`;
                    }

                    // 💡 คำนวณ Action จาก Data ที่ Backend ส่งมาให้
                    let actionType = "other";
                    let detailText = "อัปเดตข้อมูล";

                    if (log.reject_reason) {
                        actionType = "reject";
                        detailText = `ตีกลับ/ปฏิเสธ: ${log.reject_reason}`;
                    } else if (log.old_type && log.new_type && log.old_type !== log.new_type) {
                        actionType = "other";
                        detailText = `ปรับประเภทรางวัลจาก "${log.old_type}" เป็น "${log.new_type}"`;
                    } else {
                        actionType = "approve";
                        detailText = "ตรวจสอบและส่งต่อเอกสารให้คณะกรรมการ";
                    }

                    return {
                        log_id: log.type_log_id || Math.random(),
                        form_id: log.form_id,
                        changed_by: log.user_id,
                        created_at: log.changed_at,
                        operator_name: operatorDisplayName,
                        target_student_name: `เอกสารฟอร์มใบสมัครรางวัล`, // DTO นี้ไม่มีชื่อนิสิตแนบมาด้วย จึงใช้ชื่อกลาง
                        target_student_id: log.form_id ? `Form #${log.form_id}` : "-",
                        action_type: actionType,
                        detail_text: detailText
                    };
                });

                if (isMounted) {
                    setAllLogs(mappedLogs);
                }

            } catch (error) {
                console.error("Failed to fetch logs:", error);
                if (isMounted) setAllLogs([]); 
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [debouncedSearch, sortBy]);

    // Client-side Filtering & Pagination
    const processedLogs = useMemo(() => {
        let result = allLogs;
        if (filterAction !== "all") {
            result = result.filter(log => log.action_type === filterAction);
        }
        return result;
    }, [allLogs, filterAction]);

    const totalPages = Math.max(Math.ceil(processedLogs.length / ITEMS_PER_PAGE), 1);
    const paginatedLogs = processedLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const sortOptions = [
        { v: "date_desc", l: "ทำรายการล่าสุดก่อน" },
        { v: "date_asc", l: "ทำรายการเก่าสุดก่อน" }
    ];

    // ==========================================
    // Render UI
    // ==========================================
    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-32 relative overflow-hidden">
            
            {/* Abstract Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-transparent/10 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-transparent/10 blur-[120px] rounded-full pointer-events-none z-0" />

            <style jsx global>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/70 backdrop-blur-xl p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 animate-fade-in-up">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-bold mb-3 border border-indigo-200 shadow-sm">
                            <History className="w-3.5 h-3.5" />ระบบประวัติการดำเนินการ (กองพัฒนานิสิต)
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            ประวัติการดำเนินการ
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm font-medium">
                            ติดตามสถานะการพิจารณา ตรวจสอบ และการอัปเดตข้อมูลแบบฟอร์มทั้งหมดของคุณ
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_10px_40px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col overflow-hidden min-h-[600px] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    
                    {/* Filters Bar */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                            {/* Search */}
                            <div className="relative w-full md:w-80 group">
                                <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                                <input 
                                    type="text" 
                                    placeholder="ค้นหาจากเลข Form ID..." 
                                    className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm placeholder:text-slate-400 text-slate-800"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Sort Filter (Custom Dropdown) */}
                        <div className="w-full lg:w-56">
                            <CustomSelect 
                                value={sortBy} 
                                onChange={setSortBy} 
                                options={sortOptions} 
                                icon={ArrowUpDown}
                                placeholder="ล่าสุดก่อน"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1 relative">
                        <table className="w-full text-left border-collapse h-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] uppercase text-slate-500 font-extrabold tracking-widest">
                                    <th className="p-6 w-[18%]">วัน-เวลา</th>
                                    <th className="p-6 w-[22%]">ผู้ทำรายการ</th>
                                    <th className="p-6 w-[15%] text-center">กิจกรรม</th>
                                    <th className="p-6 w-[20%]">เอกสารเป้าหมาย</th>
                                    <th className="p-6 w-[25%]">รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-transparent text-sm relative">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-24 mb-2"></div><div className="h-3 bg-slate-100 rounded-md w-12"></div></td>
                                            <td className="p-6"><div className="flex gap-3 items-center"><div className="w-8 h-8 bg-slate-200 rounded-full"></div><div className="h-4 bg-slate-200 rounded-md w-32"></div></div></td>
                                            <td className="p-6"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto"></div></td>
                                            <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-32 mb-2"></div><div className="h-3 bg-slate-100 rounded-md w-20"></div></td>
                                            <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-48"></div></td>
                                        </tr>
                                    ))
                                ) : paginatedLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-0 h-full">
                                            <div className="flex flex-col items-center justify-center text-slate-400 min-h-[400px] w-full">
                                                <span className="bg-slate-50 p-5 rounded-full mb-4 shadow-sm border border-slate-100">
                                                    <History className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
                                                </span>
                                                <p className="text-xl font-bold text-slate-700">ไม่พบประวัติการดำเนินการ</p>
                                                <p className="text-sm mt-2 text-slate-500">ยังไม่มีการบันทึกประวัติ หรืออัปเดตเอกสารในระบบ</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <AnimatePresence>
                                        {paginatedLogs.map((log, index) => (
                                            <motion.tr 
                                                key={`${log.log_id}-${index}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group hover:bg-indigo-50/30 transition-colors"
                                            >
                                                <td className="p-6 align-middle">
                                                    <div className="font-extrabold text-slate-700 text-sm group-hover:text-indigo-700 transition-colors">{formatDateTh(log.created_at)}</div>
                                                    <div className="text-xs text-slate-400 mt-1 font-mono tracking-wide bg-slate-100 px-2 py-0.5 rounded-md w-fit border border-slate-200/60">{formatTimeTh(log.created_at)} น.</div>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <div className="font-bold text-slate-800 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-200">
                                                            <User size={14} strokeWidth={2.5}/>
                                                        </div>
                                                        <span className="text-[13px] text-indigo-900">
                                                            {log.operator_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center align-middle">
                                                    <ActionBadge action={log.action_type || "other"} />
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <FileText size={14} className="text-emerald-500" />
                                                        <div className="font-bold text-slate-800 text-[13px]">{log.target_student_name}</div>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-mono tracking-wide bg-slate-100 px-2 py-0.5 rounded w-fit">{log.target_student_id}</div>
                                                </td>
                                                <td className="p-6 text-[13px] font-medium text-slate-500 leading-relaxed align-middle">
                                                    {log.detail_text}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex justify-between items-center p-5 border-t border-slate-100 bg-slate-50/80 mt-auto">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1}
                                className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-bold text-slate-600 px-5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                หน้า {currentPage} / {Math.max(totalPages, 1)}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}