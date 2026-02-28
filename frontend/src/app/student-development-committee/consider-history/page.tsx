"use client";

import { useState, useEffect, useMemo } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search, Calendar, GraduationCap, CheckCircle2, XCircle,
  Eye, AlertCircle, Award, Clock, Building2,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Types
// ==========================================
const USE_MOCK_DATA = false;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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
  role_id?: number; 
  is_organization_nominated?: boolean; 
  organization_name?: string;
}

const ITEMS_PER_PAGE = 8; 

// ==========================================
// 1. Framer Motion Variants (เฉพาะ Modal)
// ==========================================
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

// ==========================================
// 2. Main Component
// ==========================================
export default function CommitteeHistoryPage() { 
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Nomination | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'award_type_name' | null, direction: 'asc' | 'desc' | null }>({ key: 'latest_update', direction: 'desc' });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterDate, filterYear]);

  const formatDateTh = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' });
  };

  const getStatusBadge = (statusId: number) => {
    if (statusId === 11) { 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200"><XCircle className="w-3.5 h-3.5"/> ไม่เห็นชอบ</span>;
    } 
    else if (statusId >= 10 && statusId !== 11) {
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5"/> เห็นชอบแล้ว</span>;
    }
    return <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">สถานะ {statusId}</span>;
};

  const getDisplayName = (item: Nomination) => {
    if (!item.student_lastname || item.student_lastname === "-") return item.student_firstname || "-";
    return `${item.student_firstname || ""} ${item.student_lastname || ""}`.trim();
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAwardTypes = async () => {
      try {
        const response = await api.get(`${API_BASE_URL}/awards/types`);
        const types = response.data?.data || response.data || [];
        if (isMounted) setAwardTypes(types);
      } catch (error) {
        console.error("Error fetching award types:", error);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        if (USE_MOCK_DATA) {
          setItems([]);
          setLoading(false);
          return;
        }

        const params: Record<string, string> = { limit: "200" };
        if (searchTerm) params.keyword = searchTerm;
        if (filterCategory) params.award_type = filterCategory;
        if (filterYear) params.student_year = filterYear;

        const response = await api.get(`${API_BASE_URL}/awards/search`, { params });
        const rawData = response.data?.data || response.data || [];

        const mappedData = rawData.map((item: any) => {
            const isOrgNominated = item.org_name && item.org_name.trim() !== "";
            return {
                ...item,
                award_type_name: item.award_type, 
                is_organization_nominated: isOrgNominated, 
                organization_name: item.org_name 
            };
        });

        const filteredData = mappedData.filter((item: any) => item.form_status >= 10);

        if (isMounted) setItems(filteredData);
      } catch (error) {
        console.warn("API Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAwardTypes();
    fetchData();
    return () => { isMounted = false; };
  }, [searchTerm, filterCategory, filterYear]);

  const processedData = useMemo(() => {
    let filtered = items;
    
    if (filterCategory) filtered = filtered.filter(item => item.award_type_name === filterCategory);
    if (filterDate) {
      const filterTime = new Date(filterDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => new Date(item.latest_update || item.created_at).getTime() <= filterTime);
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA: any = sortConfig.key ? a[sortConfig.key] : '';
        let valB: any = sortConfig.key ? b[sortConfig.key] : '';

        if (sortConfig.key === 'student_firstname') {
          valA = `${a.student_firstname} ${a.student_lastname}`;
          valB = `${b.student_firstname} ${b.student_lastname}`;
        } else if (sortConfig.key === 'latest_update' || sortConfig.key === 'created_at') {
          valA = new Date(a.latest_update || a.created_at).getTime();
          valB = new Date(b.latest_update || b.created_at).getTime();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [items, filterDate, filterCategory, sortConfig]);

  const filteredDataCount = processedData.length;
  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const currentItems = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: keyof Nomination | 'award_type_name' | 'latest_update') => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-24">
      {/* CSS Animation สำหรับเฟดอิน */}
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
              {/* เปลี่ยนเป็น รองคณบดี */}
              <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                สำหรับรองคณบดี (รายการที่ดำเนินการเรียบร้อยแล้ว)
              </p>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
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
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full bg-white/80 border border-slate-200 rounded-2xl px-4 py-3 pl-10 pr-10 text-sm text-slate-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer appearance-none">
                <option value="">ทุกระดับชั้นปี</option>
                <option value="1">ชั้นปีที่ 1</option><option value="2">ชั้นปีที่ 2</option><option value="3">ชั้นปีที่ 3</option><option value="4">ชั้นปีที่ 4</option>
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
                  <th className="p-5 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('latest_update')}>
                     <div className="flex items-center justify-center gap-1">วันที่พิจารณา {sortConfig.key === 'latest_update' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500"/> : <ArrowDown className="w-3 h-3 text-emerald-500"/>) : <ArrowUpDown className="w-3 h-3 text-slate-300"/>}</div>
                  </th>
                  <th className="p-5 text-center">สถานะ</th>
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
                        <p className="text-lg font-medium text-slate-600">ไม่มีประวัติการพิจารณา</p>
                        <p className="text-sm mt-1">รายการที่พิจารณาแล้วจะแสดงที่นี่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => (
                    <tr 
                      key={item.form_id} 
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
                                {(!item.student_lastname || item.student_lastname === "-") ? 'องค์กร/หน่วยงาน' : `ปี ${item.student_year || "-"}`}
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
                          {formatDateTh(item.latest_update || item.created_at)}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                         {getStatusBadge(item.form_status)}
                      </td>
                      <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => { setModalData(item); setIsDetailModalOpen(true); }} 
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
                พบข้อมูลทั้งหมด {filteredDataCount} รายการ
            </div>
          </div>
        </div>

        {/* Modal: Nomination Detail */}
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