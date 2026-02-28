"use client";

import { useState, useEffect } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, Calendar, CheckCircle2, XCircle,
  Eye, Award, Building2,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Types (อัปเดตให้ตรงกับ Backend DTO ล่าสุด)
// ==========================================
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
  
  // Custom mapped สำหรับ UI
  award_type_name?: string; 
  is_organization_nominated?: boolean; 
  organization_name?: string;
}

// ==========================================
// 1. Framer Motion Variants
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

// ==========================================
// 2. Main Component
// ==========================================
export default function DeanHistoryPage() { 
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any | null>(null);
  
  // State สำหรับ Server-Side Filtering (เอา filterYear ออก)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  // State สำหรับ Server-Side Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // Debounce ค้นหา ป้องกันการยิง API รัวๆ
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // รีเซ็ตไปหน้า 1 เสมอเวลาเปลี่ยนตัวกรอง
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterCategory, filterDate]);

  const formatDateTh = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' });
  };

  // ✅ ใช้ operation จาก Backend โดยตรง (approve / reject)
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

  // ดึงประเภทรางวัล
  useEffect(() => {
    let isMounted = true;
    const fetchAwardTypes = async () => {
      try {
        const response = await api.get(`${API_BASE_URL}/awards/types`);
        if (isMounted) setAwardTypes(response.data?.data || []);
      } catch (error) {
        console.error("Error fetching award types:", error);
      }
    };
    fetchAwardTypes();
    return () => { isMounted = false; };
  }, []);

  // ✅ ยิง API ขอข้อมูลประวัติ (Server-Side)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        // เตรียม Params
        const params: Record<string, any> = {
            page: currentPage,
            sort_by: sortConfig.key,       // name, studentNumber, awardType, date
            sort_order: sortConfig.direction
        };
        
        if (debouncedSearch) params.keyword = debouncedSearch;
        if (filterCategory) params.award_type = filterCategory;
        if (filterDate) params.date = filterDate;

        const response = await api.get(`${API_BASE_URL}/awards/my/approval-logs`, { params });
        const rawData = response.data?.data || [];
        const pagination = response.data?.pagination;

        // แปลงข้อมูลให้อยู่ในฟอร์มที่ตาราง UI เข้าใจ
        const mappedData = rawData.map((item: any) => {
            const isOrg = item.student_lastname === "-";
            return {
                ...item,
                award_type_name: item.award_type, 
                is_organization_nominated: isOrg, 
                organization_name: isOrg ? item.student_firstname : "" 
            };
        });

        if (isMounted) {
            setItems(mappedData);
            if (pagination) {
                setTotalPages(pagination.total_pages || 1);
                setTotalItems(pagination.total_items || 0);
            }
        }
      } catch (error) {
        console.warn("API Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [currentPage, debouncedSearch, filterCategory, filterDate, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'desc' };
    });
  };

  const openDetailModal = async (formId: number) => {
    try {
        const response = await api.get(`${API_BASE_URL}/awards/details/${formId}`); // ✅ เติม /details
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
        
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-xl border border-white shadow-sm rounded-3xl p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ประวัติการพิจารณา
              </h1>
              <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                สำหรับหัวหน้าภาควิชา
              </p>
            </div>
          </div>

          {/* Filters Grid (เอาชั้นปีออก) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input type="text" placeholder="ค้นหาชื่อ หรือ รหัสนิสิต" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/80 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm" />
            </div>
            
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-white/80 border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-sm text-slate-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer" />
            </div>
            
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Award className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white/80 border border-slate-200 rounded-2xl px-4 py-3 pl-10 pr-10 text-sm text-slate-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer appearance-none">
                <option value="">ทุกประเภทรางวัล</option>
                {awardTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">ชื่อ-นามสกุล {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('studentNumber')}>
                    <div className="flex items-center justify-center gap-1">รหัสนิสิต {sortConfig.key === 'studentNumber' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('awardType')}>
                     <div className="flex items-center justify-center gap-1">รางวัลที่เสนอ {sortConfig.key === 'awardType' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 text-center">ผู้เสนอชื่อ</th>
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('date')}>
                     <div className="flex items-center justify-center gap-1">วันที่พิจารณา {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
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
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-slate-50 p-4 rounded-full mb-3">
                          <CheckCircle2 className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">ไม่มีประวัติการพิจารณา</p>
                        <p className="text-sm mt-1">รายการที่พิจารณาแล้วจะแสดงที่นี่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
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
                             {/* ✅ เอาปีการศึกษาออก แสดงแค่ นิสิต หรือ องค์กร */}
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
                          {/* ✅ ใช้วันที่อนุมัติจาก Operation Date */}
                          {formatDateTh(item.operation_date)}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                         {/* ✅ ใช้สถานะจาก Operation (Approve/Reject) */}
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
        {modalData && (
            <NominationDetailModal 
              isOpen={isDetailModalOpen} 
              onClose={() => setIsDetailModalOpen(false)} 
              data={modalData} 
              faculties={[]} 
              departments={[]}
            />
        )}

      </div>
    </div>
  );
}