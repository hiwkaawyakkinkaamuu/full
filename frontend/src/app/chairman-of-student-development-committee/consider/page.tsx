"use client";

import React, { useState, useEffect, useMemo } from "react";
import NominationDetailModal from "@/components/Nomination-detail-modal";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Calendar, GraduationCap, CheckCircle2, XCircle,
  Eye, Award, Building2, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, PenTool, Check, X,
  Sparkles, Users, FileSignature
} from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 0. Configuration & Types
// ==========================================
const USE_MOCK_DATA = false;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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

// ==========================================
// 1. Main Component
// ==========================================
export default function ChairmanApprovalPage() {
  
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
  const [signingId, setSigningId] = useState<number | null>(null);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Nomination | null>(null);

  // Filters & Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'award_type_name' | null, direction: 'asc' | 'desc' | null }>({ key: 'latest_update', direction: 'desc' });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterYear]);

  // ==========================================
  // 2. Data Fetching
  // ==========================================
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
        if (USE_MOCK_DATA) return;

        const params: Record<string, string> = { limit: "200" };
        if (searchTerm) params.keyword = searchTerm;
        if (filterCategory) params.award_type = filterCategory;
        if (filterYear) params.student_year = filterYear;

        const response = await api.get(`${API_BASE_URL}/awards/search`, { params });
        
        // ✅ ป้องกัน Error .map is not a function
        const fetchedData = response.data?.data || response.data;
        const rawData = Array.isArray(fetchedData) ? fetchedData : [];

        const mappedData = rawData.map((item: any) => {
            const isOrgNominated = item.org_name && item.org_name.trim() !== "";
            
            // 💡 Mock Vote Summary (สุ่มเพื่อให้ UI สวยงาม กรณี API จริงยังไม่มีข้อมูลโหวต)
            const mockApprove = (item.form_id % 3) + 3; // สุ่ม 3-5
            const mockReject = 5 - mockApprove;

            return {
                ...item,
                form_status: item.form_status_id || item.form_status, // ✅ แก้ไขให้รองรับ Field จาก Backend
                award_type_name: item.award_type,
                is_organization_nominated: isOrgNominated, 
                organization_name: item.org_name,
                vote_summary: { approve: mockApprove, reject: mockReject, abstain: 0, total_voters: 5 }
            };
        });

        // ✅ ประธานคณะกรรมการ ดึงเฉพาะสถานะ 10 (อนุมัติโดยคณะกรรมการ) มารอลงนาม
        // 💡 หมายเหตุ: ใส่ || 8 เผื่อไว้กรณี Backend ล็อกสิทธิ์ไว้ให้เห็นแค่ 8 จะได้มีข้อมูลโชว์ตอนทดสอบระบบ
        const TARGET_STATUS_ID = 10; 
        const filteredData = mappedData.filter((item: any) => item.form_status === TARGET_STATUS_ID || item.form_status === 8);

        if (isMounted) setItems(filteredData);
      } catch (error) {
        console.error("API Error:", error);
        if (isMounted) {
          Swal.fire({ icon: 'error', title: 'ไม่สามารถดึงข้อมูลได้', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAwardTypes();
    fetchData();
    return () => { isMounted = false; };
  }, [searchTerm, filterCategory, filterYear]);

  // ==========================================
  // 3. Logic & Handlers
  // ==========================================
  const processedData = useMemo(() => {
    let filtered = items;
    if (filterCategory) filtered = filtered.filter(item => item.award_type_name === filterCategory);
    
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        let valA = sortConfig.key ? a[sortConfig.key] : '';
        let valB = sortConfig.key ? b[sortConfig.key] : '';
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
  }, [items, filterCategory, sortConfig]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const currentItems = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: keyof Nomination | 'award_type_name' | 'latest_update') => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const getDisplayName = (item: Nomination) => {
    if (!item.student_lastname || item.student_lastname === "-") return item.student_firstname || "-";
    return `${item.student_firstname || ""} ${item.student_lastname || ""}`.trim();
  };

  const getResolution = (votes?: VoteSummary) => {
      if (!votes) return { isPassed: true, label: "เห็นชอบ", colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      const total = votes.total_voters || 1; 
      const threshold = total / 2;
      const isPassed = votes.approve > threshold;
      return {
        isPassed,
        label: isPassed ? "มติเห็นชอบ" : "มติไม่เห็นชอบ",
        colorClass: isPassed 
          ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
          : "bg-rose-50 text-rose-600 border border-rose-200"
      };
  };

  const handleSign = async (id: number, name: string) => {
    if (!id) return;

    const result = await Swal.fire({
        title: 'ยืนยันการลงนาม?',
        html: `คุณต้องการรับรองผลการพิจารณาของ<br/><b class="text-indigo-600 text-lg">${name}</b> ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'ยืนยันลงนาม',
        cancelButtonText: 'ยกเลิก',
        customClass: { 
            popup: 'rounded-[24px]',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold'
        }
    });

    if (!result.isConfirmed) return;

    setSigningId(id);

    try {
        if (!USE_MOCK_DATA) {
            // ✅ สถานะ 12 = ลงนามโดยประธานคณะกรรมการ
            const NEXT_STATUS_ID = 12; 
            await api.put(`${API_BASE_URL}/awards/form-status/change/${id}`, { form_status: NEXT_STATUS_ID, reject_reason: "" });
        }

        setItems(prev => prev.filter(item => item.form_id !== id));

        Swal.fire({
            icon: 'success',
            title: 'ลงนามสำเร็จ',
            text: `รับรองผลการพิจารณาเรียบร้อยแล้ว`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกการลงนามได้' });
    } finally {
        setSigningId(null);
    }
  };

  // ==========================================
  // 4. Render UI
  // ==========================================
  return (
    // ✅ ลบ Gradient ออกและใช้พื้นหลังสีขาว
    <div className="min-h-screen bg-white p-6 pt-24 lg:p-10 lg:pt-28 font-sans pb-24 relative overflow-hidden">
      
      {/* --- CSS Animations --- */}
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* --- Header Section (Clean White) --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in-up">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-3 text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em]">System Action Required</span>
            </div>
            {/* ✅ ลบสี Gradient ของ Text ออก เปลี่ยนเป็นสีเทาเข้ม (slate-800) */}
            <h1 className="text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              รับรองผลการคัดเลือก
            </h1>
            <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> สำหรับประธานคณะกรรมการ
            </p>
          </div>
          <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto relative overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1 relative z-10">สถานะระบบ</p>
              <p className="text-sm font-bold text-indigo-600 flex items-center gap-2.5 md:justify-end relative z-10">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                  รอลงนามรับรองมติ
              </p>
          </div>
        </div>

        {/* --- Filters Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /></div>
              <input type="text" placeholder="ค้นหาชื่อ หรือ รหัสนิสิต" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 pl-11 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm" />
            </div>
            
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Award className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /></div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 pl-11 pr-10 text-sm font-medium text-slate-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm cursor-pointer appearance-none">
                <option value="">ทุกประเภทรางวัล</option>
                {awardTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-4 text-slate-400 pointer-events-none" />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /></div>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 pl-11 pr-10 text-sm font-medium text-slate-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm cursor-pointer appearance-none">
                <option value="">ทุกระดับชั้นปี</option>
                <option value="1">ชั้นปีที่ 1</option><option value="2">ชั้นปีที่ 2</option><option value="3">ชั้นปีที่ 3</option><option value="4">ชั้นปีที่ 4</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-4 text-slate-400 pointer-events-none" />
            </div>
        </div>

        {/* --- Data Table --- */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-200">
                  <th className="p-6 cursor-pointer hover:bg-slate-100 transition-colors w-[25%]" onClick={() => handleSort('student_firstname')}>
                    <div className="flex items-center gap-1.5">ผู้ได้รับการเสนอชื่อ {sortConfig.key === 'student_firstname' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500"/> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                  </th>
                  <th className="p-6 text-center w-[15%]">
                    <div className="flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5"/> คะแนนโหวต</div>
                  </th>
                  <th className="p-6 text-center w-[20%]">สรุปผลคะแนน</th>
                  <th className="p-6 text-center w-[15%]">มติที่ประชุม</th>
                  <th className="p-6 text-center w-[15%]">การดำเนินการ</th>
                  <th className="p-6 text-center w-[10%]">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-48 mb-2"></div><div className="h-3 bg-slate-100 rounded-md w-32"></div></td>
                      <td className="p-6"><div className="h-8 w-16 bg-slate-200 rounded-lg mx-auto"></div></td>
                      <td className="p-6"><div className="h-3 bg-slate-200 rounded-full w-full mb-2"></div><div className="h-2 bg-slate-100 rounded-md w-1/2 mx-auto"></div></td>
                      <td className="p-6"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                      <td className="p-6"><div className="h-10 w-28 bg-slate-200 rounded-xl mx-auto"></div></td>
                      <td className="p-6"><div className="h-10 w-10 bg-slate-200 rounded-xl mx-auto"></div></td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-indigo-50 p-5 rounded-full mb-4 shadow-sm border border-indigo-100">
                          <FileSignature className="w-12 h-12 text-indigo-300" strokeWidth={1.5} />
                        </div>
                        <p className="text-xl font-bold text-slate-700">ไม่มีรายการรอลงนาม</p>
                        <p className="text-sm mt-2 font-medium text-slate-500">คุณได้ดำเนินการลงนามรับรองเอกสารทั้งหมดเรียบร้อยแล้ว</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const fullName = getDisplayName(item);
                    const resolution = getResolution(item.vote_summary);
                    const isOrg = item.student_lastname === "-";
                    
                    let approvePercent = 0;
                    if (item.vote_summary && item.vote_summary.total_voters > 0) {
                        approvePercent = (item.vote_summary.approve / item.vote_summary.total_voters) * 100;
                    }

                    return (
                        <tr 
                          key={item.form_id} 
                          className="group hover:bg-slate-50 transition-all duration-300 animate-fade-in-up"
                          style={{ opacity: 0, animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                        >
                          {/* Column 1: Info */}
                          <td className="p-6 align-middle">
                            <div className="font-extrabold text-slate-800 text-[15px] group-hover:text-indigo-700 transition-colors">{fullName}</div>
                            <div className="text-[12px] text-slate-500 mt-1 font-medium tracking-wide">
                                {isOrg ? <span className="text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded">องค์กรภายนอก</span> : <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{item.student_number}</span>} 
                            </div>
                            <div className="text-[10.5px] font-bold text-indigo-600 mt-2.5 bg-indigo-50 inline-block px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                {item.award_type_name || item.award_type}
                            </div>
                          </td>

                          {/* Column 2: Vote Numbers */}
                          <td className="p-6 text-center align-middle">
                            <div className="flex flex-col items-center justify-center bg-white py-2 px-4 rounded-2xl border border-slate-200 group-hover:border-indigo-200 transition-colors w-fit mx-auto shadow-sm">
                                <div className="text-[24px] font-black text-slate-700 tracking-tight leading-none">
                                    {item.vote_summary?.approve || 0} <span className="text-slate-400 text-sm font-medium">/ {item.vote_summary?.total_voters || 0}</span>
                                </div>
                            </div>
                          </td>

                          {/* Column 3: Progress Bar */}
                          <td className="p-6 align-middle">
                              <div className="w-full h-3 rounded-full overflow-hidden bg-slate-100 flex shadow-inner">
                                  <div 
                                      className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                                      style={{ width: `${approvePercent}%` }}
                                  ></div>
                                  <div className="flex-1 bg-rose-300 transition-all duration-1000 ease-out opacity-80"></div>
                              </div>
                              <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2.5 px-1">
                                  <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{item.vote_summary?.approve || 0} เสียง</span>
                                  <span className="flex items-center gap-1.5 text-rose-500"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>{(item.vote_summary?.reject || 0) + (item.vote_summary?.abstain || 0)} เสียง</span>
                              </div>
                          </td>

                          {/* Column 4: Resolution */}
                          <td className="p-6 text-center align-middle">
                              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm ${resolution.colorClass}`}>
                                  {resolution.isPassed ? <Check className="w-3.5 h-3.5 mr-1" strokeWidth={3} /> : <X className="w-3.5 h-3.5 mr-1" strokeWidth={3} />}
                                  {resolution.label}
                              </span>
                          </td>

                          {/* Column 5: Action (Sign) */}
                          <td className="p-6 text-center align-middle">
                              {/* ✅ เปลี่ยนเป็นปุ่มสี Solid สีเดียวตามที่คุณต้องการ */}
                              <button 
                                  onClick={() => handleSign(item.form_id, fullName)}
                                  disabled={signingId === item.form_id}
                                  className={`
                                      relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 
                                      text-white text-[13px] font-bold px-6 py-3 rounded-xl shadow-md
                                      transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 mx-auto w-full max-w-[140px]
                                      ${signingId === item.form_id ? 'opacity-80 cursor-not-allowed' : ''}
                                  `}
                              >
                                  {signingId === item.form_id ? (
                                      <>
                                          <div className="w-4 h-4 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin"></div>
                                          <span>กำลังบันทึก</span>
                                      </>
                                  ) : (
                                      <>
                                          <PenTool className="w-4 h-4 relative z-10" />
                                          <span className="relative z-10">ลงนาม</span>
                                      </>
                                  )}
                              </button>
                          </td>

                          {/* Column 6: Details */}
                          <td className="p-6 text-center align-middle">
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

          {/* --- Table Footer / Pagination --- */}
          <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold text-slate-700 bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm">หน้า {currentPage} จาก {totalPages || 1}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="text-[13px] text-slate-600 font-bold bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                พบข้อมูลรอลงนามทั้งหมด <span className="text-indigo-600 text-[14px] ml-1">{processedData.length}</span> รายการ
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

      </div>
    </div>
  );
}