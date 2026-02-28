"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import Swal from "sweetalert2";
import { 
  Calendar, 
  ChevronDown, 
  CheckCircle2, 
  Sparkles, 
  Clock,
  BookOpen
} from "lucide-react";

// ==========================================
// 0. Configuration & Service Layer
// ==========================================

const USE_MOCK_DATA = false;
const CENTRAL_ID = 99;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface AcademicYear {
  academic_year_id: number;
  year: number;
  semester: number;
  start_date: string;
  end_date: string;
}

const formatDateThai = (dateString: string) => {
  if (!dateString || dateString.startsWith("0001")) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
};

const toInputDate = (dateString: string) => {
  if (!dateString || dateString.startsWith("0001")) return "";
  return dateString.split("T")[0];
};

// ==========================================
// Main Component
// ==========================================

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState<AcademicYear>({
    academic_year_id: 0,
    year: new Date().getFullYear() + 543,
    semester: 1,
    start_date: "",
    end_date: "",
  });

  const isNewSystem = config.academic_year_id === 0;

  useEffect(() => {
    fetchCurrentConfig();
  }, []);

  const fetchCurrentConfig = async () => {
    setLoading(true);
    try {
      if (!USE_MOCK_DATA) {
        const res = await api.get(`${API_BASE_URL}/academic-years/current`);
        const data = res.data.data || res.data;
        if (data) {
          // convert year to Buddhist era if API returns CE
          const year = data.year && Number(data.year) < 2500 ? Number(data.year) + 543 : data.year;
          setConfig({ ...data, year });
        } else {
           setConfig({
            academic_year_id: 0,
            year: new Date().getFullYear() + 543,
            semester: 1,
            start_date: "",
            end_date: "",
          });
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
         setConfig({
            academic_year_id: 0,
            year: new Date().getFullYear() + 543,
            semester: 1,
            start_date: "",
            end_date: "",
          });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'ไม่สามารถดึงข้อมูลปีการศึกษาปัจจุบันได้' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDecisions = async () => {
    if (!config.start_date || !config.end_date) {
      return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุวันที่เริ่มต้นและสิ้นสุดการรับสมัคร' });
    }
    if (new Date(config.start_date) > new Date(config.end_date)) {
      return Swal.fire({ icon: 'error', title: 'วันที่ไม่ถูกต้อง', text: 'วันเริ่มต้นต้องมาก่อนวันสิ้นสุด' });
    }

    // only allow creating a new term (or initializing the system)
    const confirm = await Swal.fire({
      title: isNewSystem ? 'เปิดระบบปีการศึกษาแรก?' : 'ขึ้นภาคเรียนใหม่?',
      text: isNewSystem
        ? 'ระบบจะบันทึกวันที่เปิด-ปิดรับสมัครนี้ สำหรับเริ่มต้นใช้งาน'
        : 'ระบบจะปิดภาคเรียนปัจจุบันแล้วสร้างภาคเรียนถัดไปโดยอัตโนมัติ (ไม่สามารถย้อนกลับ)',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: isNewSystem ? '#10B981' : '#EF4444',
    });

    if (confirm.isConfirmed) {
      executeSave();
    }
  };

  const executeSave = async () => {
      setSaving(true);
      try {
          // only creation is supported now
          await api.post(`${API_BASE_URL}/academic-years/create`, {
              start_date: new Date(config.start_date).toISOString(),
              end_date: new Date(config.end_date).toISOString(),
          });
          Swal.fire({ icon: 'success', title: isNewSystem ? 'เปิดระบบสำเร็จ' : 'ขึ้นภาคเรียนใหม่สำเร็จ', timer: 1500, showConfirmButton: false });
          // reload entire page so layout/global state can pick up new year
          window.location.reload();
      } catch (error: any) {
          Swal.fire({ icon: 'error', title: 'บันทึกล้มเหลว', text: error.response?.data?.error || error.message });
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-medium">กำลังโหลดข้อมูลระบบ...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 pb-36 font-sans text-slate-800 relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            {/* Header Section */}
            <div className="flex flex-col">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold mb-3 border border-blue-200 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> ระบบจัดการข้อมูลปีการศึกษา
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {isNewSystem ? "เปิดระบบปีการศึกษาแรก" : "ตั้งค่าปีการศึกษาปัจจุบัน"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">บริหารจัดการช่วงเวลาการรับสมัครนิสิตดีเด่น และภาคเรียนปัจจุบัน</p>
            </div>
        </div>

        {/* กล่องสรุปสถิติตามภาพ (Stats Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Year Card */}
          <div className="relative overflow-hidden p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-blue-100 transition-all duration-500">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase font-black tracking-widest mb-1">ปีการศึกษาปัจจุบัน</p>
              <p className="text-3xl font-black text-slate-900">พ.ศ. {config.year}</p>
            </div>
          </div>

          {/* Semester Card */}
          <div className="relative overflow-hidden p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-indigo-100 transition-all duration-500">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase font-black tracking-widest mb-1">ภาคเรียนปัจจุบัน</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900">ภาคเรียนที่ {config.semester}</p>
                {config.semester === 3 && <p className="text-slate-500 font-bold">(ฤดูร้อน)</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Left Column: Side Info */}
            <div className="lg:col-span-1">
                <div className="relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200 h-full min-h-[300px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
                    
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider border border-white/10 mb-6">
                              {isNewSystem ? "SYSTEM INITIALIZATION" : "SYSTEM OPERATION"}
                          </div>
                          <h3 className="text-2xl font-bold leading-tight">เปลี่ยนผ่าน<br/>ภาคเรียนใหม่</h3>
                          <p className="text-white/60 text-sm mt-4 leading-relaxed">
                            เมื่อขึ้นภาคเรียนใหม่ ระบบจะทำการจัดเก็บบัญชีเดิมเป็นประวัติ และเริ่มนับรอบการรับสมัครใหม่ทั้งหมดอัตโนมัติ
                          </p>
                        </div>
                        
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                 <Clock className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                 <p className="text-[10px] text-white/50 uppercase font-bold tracking-tighter">อัพเดท</p>
                                 <p className="text-sm font-bold">ล่าสุด</p>
                              </div>
                           </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Date Config */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 h-full flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                    
                    <div>
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                                <Clock className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">กำหนดระยะเวลา</h3>
                                <p className="text-slate-500 font-medium">ระบุวันเปิดและวันปิดรับคำร้องขอทุน/ดีเด่น</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="group">
                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-blue-600 transition-colors uppercase tracking-wider">วันเปิดรับสมัคร</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-50 outline-none transition-all cursor-pointer"
                                    value={toInputDate(config.start_date)}
                                    onChange={(e) => setConfig({ ...config, start_date: e.target.value })}
                                />
                                <div className="mt-4 flex items-center gap-2 px-1">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <p className="text-sm font-bold text-slate-400">{formatDateThai(config.start_date)}</p>
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-rose-600 transition-colors uppercase tracking-wider">วันปิดรับสมัคร</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-rose-400 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-rose-50 outline-none transition-all cursor-pointer"
                                    value={toInputDate(config.end_date)}
                                    onChange={(e) => setConfig({ ...config, end_date: e.target.value })}
                                />
                                <div className="mt-4 flex items-center gap-2 px-1">
                                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
                                    <p className="text-sm font-bold text-slate-400">{formatDateThai(config.end_date)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-8 border-t border-slate-100">
                        <button 
                            onClick={handleSaveDecisions}
                            disabled={saving}
                            className={`w-full py-5 rounded-[1.5rem] font-black text-lg text-white shadow-xl transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] hover:-translate-y-1
                                ${saving ? 'bg-slate-400 cursor-wait' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    กำลังดำเนินการ...
                                </>
                            ) : (
                                <><CheckCircle2 className="w-6 h-6" /> {isNewSystem ? 'เปิดการใช้งานระบบภาคเรียนแรก' : 'บันทึกการตั้งค่าระบบ'}</>
                            )}
                        </button>
                    </div>

                </div>
            </div>

        </div>
      </div>
    </div>
  );
}