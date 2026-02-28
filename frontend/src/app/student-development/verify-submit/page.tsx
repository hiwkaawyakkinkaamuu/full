"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { z } from "zod";
import { api } from "@/lib/axios";
import { 
  Search, Calendar, CheckCircle2, XCircle, Eye, 
  Award, Building2, User, Phone, Mail, MapPin, 
  ChevronLeft, ChevronRight, FileText, ChevronDown, 
  ShieldCheck, AlertTriangle, Sparkles, Inbox,
  ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";

// ==========================================
// 0. Configuration & Validation
// ==========================================

const USE_MOCK_DATA = false;
const ITEMS_PER_PAGE = 8;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const getFileUrl = (filePath: string) => {
  if (!filePath) return "#";
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/api$/, "");
  const cleanPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
  return `${backendUrl}/${cleanPath}`;
};

const RejectionSchema = z.string().min(5, "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร");

// ==========================================
// 1. Interfaces
// ==========================================

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

// ==========================================
// 2. Main Component
// ==========================================

export default function SDDVerifyPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Nomination[]>([]);
  
  // Master Data
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);

  // Search & Filter & Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Nomination | 'award_type_name' | null, direction: 'asc' | 'desc' | null }>({ key: 'created_at', direction: 'desc' });
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<Nomination | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ==========================================
  // Fetch Data
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const fetchMasterData = async () => {
        try {
            const [facRes, deptRes, campRes, typeRes] = await Promise.all([
                api.get(`${API_BASE_URL}/faculty`),
                api.get(`${API_BASE_URL}/department`),
                api.get(`${API_BASE_URL}/campus`),
                api.get(`${API_BASE_URL}/awards/types`)
            ]);
            if(isMounted) {
                setFaculties(facRes.data?.data || facRes.data || []);
                setDepartments(deptRes.data?.data || deptRes.data || []);
                setCampuses(campRes.data?.data || campRes.data || []);
                setAwardTypes(typeRes.data?.data || typeRes.data || []);
            }
        } catch (error) { console.error("Error fetching master data", error); }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        if (USE_MOCK_DATA) return;

        const params: Record<string, string> = { limit: "200" };
        if (searchTerm) params.keyword = searchTerm;
        if (filterType !== "all") params.award_type = filterType;

        const response = await api.get(`${API_BASE_URL}/awards/search`, { params });
        
        // 1. ดึงข้อมูลออกมาก่อน
        const fetchedData = response.data?.data || response.data;
        // 2. เช็คว่าเป็น Array ไหม ถ้าเป็นให้ใช้ ถ้าไม่เป็นให้ใช้ค่าว่าง
        const rawData = Array.isArray(fetchedData) ? fetchedData : [];

        const mappedData = rawData.map((item: any) => ({
            ...item,
            award_type_name: item.award_type,
            is_organization_nominated: item.org_name && item.org_name.trim() !== "", 
            organization_name: item.org_name 
        }));

        // ✅ กองพัฒนานิสิต ตรวจสอบเอกสารที่ "คณบดีอนุมัติมาแล้ว" (สถานะ = 6)
        const TARGET_STATUS_ID = 6; 
        const filteredData = mappedData.filter((item: any) => item.form_status === TARGET_STATUS_ID);

        if (isMounted) setItems(filteredData);
      } catch (error) {
        console.error("API Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMasterData();
    fetchData();
    return () => { isMounted = false; };
  }, [searchTerm, filterType]);

  useEffect(() => {
    if (isModalOpen && selectedItem) {
      setRejectReason("");
      setIsRejectMode(false);
    }
  }, [isModalOpen, selectedItem]);

  // ==========================================
  // Logic & Sorting
  // ==========================================
  const processedData = useMemo(() => {
    let filtered = items;
    
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
  }, [items, sortConfig]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const paginatedData = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: keyof Nomination | 'award_type_name') => {
    setSortConfig(prev => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  // ==========================================
  // Handlers & Helpers
  // ==========================================
  const getDisplayName = (item: Nomination) => {
    if (!item.student_lastname || item.student_lastname === "-") return item.student_firstname || "-";
    return `${item.student_firstname || ""} ${item.student_lastname || ""}`.trim();
  };

  const getCampusName = (id: number) => {
    const c = campuses.find(c => c.campusID === id || c.campus_id === id || c.id === id);
    return c ? (c.campusName || c.campus_name || c.name) : "-";
  };

  const getFacultyName = (id: number) => {
    const f = faculties.find(f => f.faculty_id === id || f.facultyID === id || f.id === id);
    return f ? (f.faculty_name || f.facultyName || f.name) : "-";
  };
  
  const getDepartmentName = (id: number) => {
    const d = departments.find(d => d.department_id === id || d.departmentID === id || d.id === id);
    return d ? (d.department_name || d.departmentName || d.name) : "-";
  };

  const calculateAge = (dob: string) => {
      if (!dob) return "-";
      const birthDate = new Date(dob);
      if(isNaN(birthDate.getTime())) return "-";
      const ageDifMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDifMs); 
      return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    const studentName = getDisplayName(selectedItem);

    const result = await Swal.fire({
      title: 'ยืนยันความถูกต้อง?',
      html: `คุณได้ตรวจสอบความถูกต้องของ <b>${studentName}</b><br/>และพร้อมส่งให้คณะกรรมการพิจารณาใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการส่งต่อ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#94a3b8',
      customClass: { popup: 'rounded-3xl' }
    });

    if (result.isConfirmed) {
      try {
        // ✅ ยิง API เปลี่ยนสถานะเป็น 8 (อนุมัติโดยกองพัฒนานิสิต) ทันที
        await api.put(`${API_BASE_URL}/awards/form-status/change/${selectedItem.form_id}`, { 
            form_status: 8, 
            reject_reason: "" 
        });

        setItems(prev => prev.filter(c => c.form_id !== selectedItem.form_id));
        setIsModalOpen(false);
        Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: 'ตรวจสอบและส่งต่อสำเร็จ' });
      } catch (err) {
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึกสถานะ', 'error');
      }
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;

    const validation = RejectionSchema.safeParse(rejectReason);
    if (!validation.success) {
      return Swal.fire({ icon: 'warning', title: 'กรุณาระบุเหตุผล', text: validation.error.issues[0].message, confirmButtonColor: '#f43f5e' });
    }

    try {
      // ✅ เปลี่ยนสถานะเป็น 9 (ปฏิเสธ/ตีกลับ โดยกองพัฒนานิสิต)
      await api.put(`${API_BASE_URL}/awards/form-status/change/${selectedItem.form_id}`, { 
          form_status: 9, 
          reject_reason: rejectReason 
      });

      setItems(prev => prev.filter(c => c.form_id !== selectedItem.form_id));
      setIsModalOpen(false);
      Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'info', title: 'ส่งกลับแก้ไขสำเร็จ' });
    } catch (err) {
      Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // ==========================================
  // Render UI
  // ==========================================
  let detailObj: any = {};
  if (selectedItem) {
      try {
          detailObj = typeof selectedItem.form_detail === 'string' && selectedItem.form_detail.startsWith('{') 
                      ? JSON.parse(selectedItem.form_detail) 
                      : { other_details: selectedItem.form_detail };
      } catch(e) { detailObj = { other_details: selectedItem.form_detail }; }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans relative">
      
      {/* 🔮 Abstract Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-indigo-400/10 blur-[120px] rounded-full" />
      </div>

      <style jsx global>{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* 📄 Main Content Area */}
      <div className="p-6 pt-24 lg:p-10 lg:pt-28 pb-32 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/70 backdrop-blur-xl p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 animate-fade-in-up">
              <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold mb-3 border border-blue-200 shadow-sm">
                      <Sparkles className="w-4 h-4" />ระบบตรวจสอบความถูกต้อง
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    ตรวจสอบความถูกต้อง
                  </h1>
                  <p className="text-slate-500 mt-1 text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" /> กองพัฒนานิสิต - คัดกรองและประเมินผลงาน
                  </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative group">
                      <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                          type="text" 
                          placeholder="ค้นหาชื่อ, รหัส..." 
                          className="w-full sm:w-56 pl-11 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl outline-none text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-sm"
                          value={searchTerm}
                          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      />
                  </div>
                  <div className="relative group">
                    <Award className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <select 
                        className="w-full sm:w-56 pl-11 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl outline-none text-sm cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all appearance-none text-slate-600 font-medium shadow-sm"
                        value={filterType}
                        onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">ทุกประเภทรางวัล</option>
                        {awardTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_10px_40px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col min-h-[500px] overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] uppercase text-slate-500 font-extrabold tracking-widest">
                    <th className="p-6 w-16 text-center">#</th>
                    <th className="p-6 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('student_firstname')}>
                        <div className="flex items-center gap-1.5">ชื่อ-นามสกุล / รหัสนิสิต {sortConfig.key === 'student_firstname' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500"/> : <ArrowDown className="w-3.5 h-3.5 text-blue-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                    </th>
                    <th className="p-6">วิทยาเขต / คณะ / สาขาวิชา</th>
                    <th className="p-6 cursor-pointer hover:bg-slate-100/50 transition-colors text-center" onClick={() => handleSort('award_type_name')}>
                        <div className="flex items-center justify-center gap-1.5">รางวัลที่เสนอ {sortConfig.key === 'award_type_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500"/> : <ArrowDown className="w-3.5 h-3.5 text-blue-500"/>) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300"/>}</div>
                    </th>
                    <th className="p-6 text-center">สถานะการตรวจสอบ</th>
                    <th className="p-6 text-center">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-transparent text-sm">
                    {loading ? (
                    [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                            <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-8 mx-auto"></div></td>
                            <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-32 mb-2"></div><div className="h-3 bg-slate-100 rounded-md w-20"></div></td>
                            <td className="p-6"><div className="h-4 bg-slate-200 rounded-md w-24 mb-2"></div><div className="h-3 bg-slate-100 rounded-md w-20"></div></td>
                            <td className="p-6"><div className="h-6 bg-slate-200 rounded-full w-28 mx-auto"></div></td>
                            <td className="p-6"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto"></div></td>
                            <td className="p-6"><div className="h-10 bg-slate-200 rounded-xl w-28 mx-auto"></div></td>
                        </tr>
                    ))
                    ) : paginatedData.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="p-20 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <div className="bg-blue-50 p-5 rounded-full mb-4 shadow-sm border border-blue-100">
                                <Inbox className="w-12 h-12 text-blue-300" strokeWidth={1.5} />
                                </div>
                                <p className="text-xl font-bold text-slate-700">ไม่มีรายการรอตรวจสอบ</p>
                                <p className="text-sm mt-2 font-medium text-slate-500">เอกสารทั้งหมดได้รับการดำเนินการเรียบร้อยแล้ว</p>
                            </div>
                        </td>
                    </tr>
                    ) : (
                    paginatedData.map((item, index) => (
                        <tr 
                            key={item.form_id} 
                            className="group hover:bg-blue-50/30 transition-all duration-300 animate-fade-in-up cursor-pointer"
                            style={{ opacity: 0, animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                            onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                        >
                        <td className="p-6 text-center text-slate-300 font-mono text-xs">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td className="p-6 align-middle">
                            <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full shrink-0 bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                            <div>
                                <div className="font-extrabold text-slate-800 text-[15px] group-hover:text-blue-700 transition-colors">{getDisplayName(item)}</div>
                                <div className="text-[12px] text-slate-500 mt-1 font-medium tracking-wide">
                                    {item.student_lastname === "-" ? <span className="text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded">องค์กรภายนอก</span> : <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{item.student_number}</span>}
                                </div>
                            </div>
                            </div>
                        </td>
                        <td className="p-6 text-sm text-slate-600 align-middle">
                            <div className="font-extrabold text-blue-700 text-[11px] mb-1 bg-blue-50/80 w-fit px-2 py-0.5 rounded-md border border-blue-100">
                                วิทยาเขต{getCampusName(item.campus_id)}
                            </div>
                            <div className="font-bold text-slate-700">{getFacultyName(item.faculty_id)}</div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium">{getDepartmentName(item.department_id)}</div>
                        </td>
                        <td className="p-6 text-center align-middle">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-slate-700 text-xs font-bold border border-slate-200 bg-white shadow-sm group-hover:border-blue-200 transition-colors">
                            {item.award_type_name || item.award_type}
                            </span>
                        </td>
                        <td className="p-6 text-center align-middle">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                รอการตรวจสอบ
                            </span>
                        </td>
                        <td className="p-6 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <button 
                                onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                                className="bg-white hover:bg-blue-600 hover:text-white text-slate-600 border border-slate-200 hover:border-blue-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 mx-auto"
                            >
                                <Eye size={14} /> ตรวจสอบเอกสาร
                            </button>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex justify-between items-center p-5 border-t border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-bold text-slate-600 px-5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                        หน้า {currentPage} จาก {Math.max(totalPages, 1)}
                    </span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm">
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="text-[13px] text-slate-500 font-bold bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hidden sm:block">
                    พบข้อมูลรอตรวจสอบ <span className="text-blue-600 text-[14px] ml-1">{processedData.length}</span> รายการ
                </div>
            </div>
            </div>
        </div>
      </div>

      {/* ==========================================
        MODAL SECTION
        ==========================================
      */}
      <AnimatePresence>
        {isModalOpen && selectedItem && (
          <div className="absolute inset-0 z-[9999] pointer-events-none">
             
             {/* Sticky container limits modal to visible screen */}
             <div className="sticky top-0 left-0 w-full h-screen flex items-center justify-center p-4 sm:p-6 z-50 pointer-events-auto">
                 
                 {/* Backdrop */}
                 <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                    onClick={() => setIsModalOpen(false)} 
                 />
                 
                 {/* Modal Content */}
                 <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                    className="relative bg-[#F8F9FB] w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
                 >
                    {/* Modal Header */}
                    <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white z-10 shrink-0 shadow-sm">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <CheckCircle2 className="text-blue-500" size={24} />
                                พิจารณาคุณสมบัติ: {selectedItem.award_type_name || selectedItem.award_type}
                            </h2>
                            <p className="text-sm font-medium text-slate-500 pl-9 mt-1">
                                {getDisplayName(selectedItem)} 
                                {selectedItem.student_lastname !== "-" && <span className="font-mono ml-2 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">({selectedItem.student_number})</span>}
                            </p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm">
                            <XCircle size={24} />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                        {!isRejectMode ? (
                            <div className="space-y-6">
                                {/* 1. General Info */}
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg">
                                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">1</div>
                                        ข้อมูลทั่วไป
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <ReadOnlyField label="วิทยาเขต" value={`วิทยาเขต${getCampusName(selectedItem.campus_id)}`} fullWidth className="bg-blue-50/30 border-blue-100" />
                                        <ReadOnlyField label="คณะ" value={getFacultyName(selectedItem.faculty_id)} />
                                        <ReadOnlyField label="สาขา/ภาควิชา" value={getDepartmentName(selectedItem.department_id)} />
                                        <ReadOnlyField label="อาจารย์ที่ปรึกษา" value={selectedItem.advisor_name} />
                                        <ReadOnlyField label="เกรดเฉลี่ย (GPA)" value={selectedItem.gpa} />
                                        <ReadOnlyField label="วันเกิด" value={selectedItem.student_date_of_birth ? new Date(selectedItem.student_date_of_birth).toLocaleDateString('th-TH') : "-"} />
                                        <ReadOnlyField label="อายุ" value={`${calculateAge(selectedItem.student_date_of_birth)} ปี`} />
                                        <ReadOnlyField label="เบอร์โทรศัพท์" value={selectedItem.student_phone_number} icon={Phone} />
                                        <ReadOnlyField label="อีเมล" value={selectedItem.student_email} icon={Mail} />
                                        <ReadOnlyField label="ที่อยู่ปัจจุบัน" value={selectedItem.student_address} icon={MapPin} fullWidth />
                                    </div>
                                </div>

                                {/* 2. Award Details */}
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg">
                                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">2</div>
                                        รายละเอียดผลงาน/รางวัล
                                    </h3>
                                    
                                    {detailObj.project_title && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                                            <ReadOnlyField label="ชื่อโครงการ/กิจกรรม" value={detailObj.project_title} fullWidth />
                                            <ReadOnlyField label="รางวัล/บทบาทหน้าที่" value={detailObj.prize} />
                                            <ReadOnlyField label="วันที่ได้รับ/เข้าร่วม" value={detailObj.date_received} />
                                            <ReadOnlyField label="หน่วยงานที่จัด" value={detailObj.organized_by} />
                                            <ReadOnlyField label="ชื่อทีม (ถ้ามี)" value={detailObj.team_name} />
                                        </div>
                                    )}

                                    <ReadOnlyField 
                                        label="เหตุผลในการเสนอชื่อ (โดยละเอียด)" 
                                        value={detailObj.other_details || detailObj.behavior_desc || "-"} 
                                        isTextArea 
                                        className="bg-slate-50"
                                    />
                                </div>

                                {/* 3. Files */}
                                {selectedItem.files && selectedItem.files.length > 0 && (
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg">
                                            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">3</div>
                                            เอกสารแนบ
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedItem.files.map((f, i) => (
                                                <a key={i} href={getFileUrl(f.file_path)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all group">
                                                    <div className="p-3 bg-white rounded-xl shadow-sm text-rose-500 group-hover:scale-110 transition-transform">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">{f.file_name || `เอกสารประกอบ #${i+1}`}</p>
                                                        <p className="text-xs text-slate-400 font-mono mt-0.5">{(f.file_size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Reject Mode View
                            <div className="max-w-2xl mx-auto mt-10">
                                <div className="bg-rose-50 p-10 rounded-[32px] border border-rose-200 shadow-inner text-center">
                                    <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-white">
                                        <AlertTriangle size={48} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-3xl font-black text-rose-800 mb-3">ระบุเหตุผลการตีกลับเอกสาร</h3>
                                    <p className="text-rose-600 font-medium mb-10 text-lg">
                                        เอกสารของ <b className="text-rose-900 bg-white px-2 py-1 rounded-lg shadow-sm">{getDisplayName(selectedItem)}</b> จะถูกส่งกลับไปให้แก้ไข
                                    </p>
                                    <div className="text-left">
                                        <label className="block text-sm font-bold text-rose-800 mb-3 pl-1 uppercase tracking-wider">เหตุผล <span className="text-rose-500">*</span></label>
                                        <textarea 
                                            className="w-full h-48 p-6 rounded-2xl border-2 border-rose-200 focus:ring-4 focus:ring-rose-100 focus:border-rose-400 outline-none text-base resize-none shadow-sm font-medium text-slate-700 bg-white placeholder:text-slate-300" 
                                            placeholder="เช่น เอกสารแนบไม่ครบถ้วน, ข้อมูลวันที่ไม่ถูกต้องตามเกณฑ์ประกาศ..." 
                                            value={rejectReason} 
                                            onChange={e => setRejectReason(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="px-8 py-6 border-t border-slate-200 bg-white flex justify-end gap-4 z-10 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                        {!isRejectMode ? (
                            <>
                                <button onClick={() => setIsRejectMode(true)} className="px-8 py-3.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-transparent transition-colors shadow-sm">ตีกลับให้แก้ไข (Reject)</button>
                                <button onClick={handleApprove} className="px-10 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all flex items-center gap-2">บันทึกและส่งต่อ <ChevronRight size={16}/></button>
                            </>
                        ) : (
                            <>
                                 <button onClick={() => setIsRejectMode(false)} className="px-8 py-3.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm">ยกเลิก</button>
                                <button onClick={handleReject} className="px-10 py-3.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-[0_8px_20px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 transition-all flex items-center gap-2"><XCircle size={16}/> ยืนยันการตีกลับ</button>
                            </>
                        )}
                    </div>
                 </motion.div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// Helper Sub-Components
// ==========================================

function ReadOnlyField({ label, value, className = "", isTextArea = false, icon: Icon, fullWidth = false }: any) {
    return (
        <div className={`p-5 bg-slate-50/80 border border-slate-200/60 rounded-2xl ${fullWidth ? 'sm:col-span-2' : ''} ${className}`}>
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-1.5 mb-2">
                {Icon && <Icon size={14} className="text-slate-400" />} {label}
            </span>
            {isTextArea ? (
                <p className="font-semibold text-slate-800 whitespace-pre-wrap text-sm leading-relaxed p-4 bg-white rounded-xl border border-slate-200 min-h-[120px] shadow-sm">{value || "-"}</p>
            ) : (
                <span className="font-bold text-slate-800 text-[15px] block">{value || "-"}</span>
            )}
        </div>
    );
}