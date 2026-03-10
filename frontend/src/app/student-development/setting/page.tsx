"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/axios";
import Swal from "sweetalert2";
import { 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ==========================================
// 0. Configuration & Service Layer
// ==========================================

const USE_MOCK_DATA = false;

interface AcademicYear {
  academic_year_id: number;
  year: number;
  semester: number;
  start_date: string;
  end_date: string;
}

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// บังคับแปลงเป็น พ.ศ. เสมอเพื่อแสดงผลบน UI (แต่หลังบ้านยังเก็บเป็น ค.ศ.)
const formatDateThai = (dateString: string) => {
  if (!dateString || dateString.startsWith("0001")) return "ยังไม่ได้เลือกวันที่";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "ยังไม่ได้เลือกวันที่";
  
  const d = date.getDate();
  const m = MONTH_NAMES[date.getMonth()];
  const y = date.getFullYear() + 543; // แสดงเป็น พ.ศ.
  return `${d} ${m} ${y}`;
};

// ==========================================
// 1. Premium Custom Date Picker Component
// ==========================================

function CustomDatePicker({ value, onChange, label, theme = "blue", disabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // viewDate ใช้สำหรับเลื่อนปฏิทินดูเดือน/ปี (ระบบใช้ ค.ศ. เป็นหลัก)
  const [viewDate, setViewDate] = useState(() => value && !value.startsWith("0001") ? new Date(value) : new Date());

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
    if (value && !value.startsWith("0001")) {
        setViewDate(new Date(value));
    }
  }, [value]);

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
    // แปลงให้เป็น YYYY-MM-DD แบบ ค.ศ. สำหรับส่งกลับไปเก็บใน State และหลังบ้าน
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(selected.getDate()).padStart(2, '0');
    
    onChange(`${y}-${m}-${d}T00:00:00.000Z`);
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
    if (!value || value.startsWith("0001")) return false;
    const selected = new Date(value);
    return day === selected.getDate() && viewDate.getMonth() === selected.getMonth() && viewDate.getFullYear() === selected.getFullYear();
  };

  // ธีมสีที่ปรับแต่งให้ดูหรูหราขึ้น
  const themeStyles: Record<string, any> = {
      blue: {
          border: "focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10",
          iconBg: "bg-blue-50 text-blue-600",
          selectedBg: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 text-white",
          todayBg: "text-blue-600 bg-blue-50 border border-blue-200",
          hoverDay: "hover:bg-blue-50 hover:text-blue-600",
          textActive: "text-blue-600",
      },
      rose: {
          border: "focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/10",
          iconBg: "bg-rose-50 text-rose-600",
          selectedBg: "bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30 text-white",
          todayBg: "text-rose-600 bg-rose-50 border border-rose-200",
          hoverDay: "hover:bg-rose-50 hover:text-rose-600",
          textActive: "text-rose-600",
      }
  };
  const th = themeStyles[theme] || themeStyles.blue;

  return (
    <div className={`relative w-full group ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
      <label className="block text-[13px] font-black text-slate-500 mb-2.5 uppercase tracking-widest">
          {label}
      </label>
      
      {/* Input Button */}
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between bg-white border-2 border-slate-100 hover:border-slate-300 transition-all rounded-[1.25rem] px-5 py-4 shadow-sm ${th.border} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={`p-2.5 rounded-xl shadow-inner shrink-0 ${th.iconBg}`}>
              <Calendar size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col text-left truncate">
            {/* แสดงวันที่เป็น พ.ศ. เสมอ */}
            <span className={`text-[15px] font-bold leading-normal truncate ${value && !value.startsWith("0001") ? 'text-slate-900' : 'text-slate-400'}`}>
              {formatDateThai(value)}
            </span>
          </div>
        </div>
        
        {value && !value.startsWith("0001") ? (
          <div 
            onClick={(e) => { e.stopPropagation(); onChange(""); }} 
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-20 relative shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </div>
        ) : (
          <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-slate-700' : ''}`} />
        )}
      </button>

      {/* Calendar Popup (ดีไซน์ใหม่) */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 md:right-auto mt-4 w-full md:w-[360px] bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] p-6 z-[9999]"
          >
            {/* Header ปฏิทิน */}
            <div className="flex items-center justify-between mb-6 px-1">
              <button type="button" onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <div className="text-lg font-black text-slate-800 tracking-tight">
                {MONTH_NAMES[viewDate.getMonth()]} <span className={th.textActive}>{viewDate.getFullYear() + 543}</span>
              </div>
              <button type="button" onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* วันในสัปดาห์ */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 mb-3">
              {DAY_NAMES.map((day, idx) => (
                <div key={day} className={`text-center text-xs font-bold py-1 ${idx === 0 || idx === 6 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* วันที่ */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="w-10 h-10 mx-auto"></div>
              ))}
              {days.map(day => {
                const selected = isSelected(day);
                const today = isToday(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={`w-10 h-10 mx-auto flex items-center justify-center rounded-full text-[15px] transition-all duration-200
                      ${selected ? `${th.selectedBg} font-bold scale-105` : 
                        today ? `${th.todayBg} font-bold` : 
                        `text-slate-700 font-medium ${th.hoverDay} hover:scale-105`}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            {/* ปุ่มกลับเดือนปัจจุบัน */}
            <div className="mt-6 pt-5 border-t border-slate-100/80 flex justify-center">
                <button 
                    type="button"
                    onClick={() => { setViewDate(new Date()); }}
                    className={`text-[13px] font-bold transition-colors ${th.textActive} hover:opacity-70`}
                >
                    กลับไปเดือนปัจจุบัน
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
        const res = await api.get(`/academic-years/current`);
        const data = res.data.data || res.data;
        if (data) {
          // แปลงปีที่ดึงมาให้เป็น พ.ศ. เสมอเพื่อโชว์ในกล่องสรุป
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
          // สิ่งที่ส่งไปให้ Backend คือ ISO String ซึ่งเป็น ค.ศ. เสมอ
          await api.post(`/academic-years/create`, {
              start_date: new Date(config.start_date).toISOString(),
              end_date: new Date(config.end_date).toISOString(),
          });
          Swal.fire({ icon: 'success', title: isNewSystem ? 'เปิดระบบสำเร็จ' : 'ขึ้นภาคเรียนใหม่สำเร็จ', timer: 1500, showConfirmButton: false });
          window.location.reload();
      } catch (error: any) {
          Swal.fire({ icon: 'error', title: 'บันทึกล้มเหลว', text: error.response?.data?.error || error.message });
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-medium">กำลังโหลดข้อมูลระบบ...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 pb-[350px] font-sans text-slate-800 relative overflow-x-hidden">
      
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex flex-col">
            <div className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-bold mb-3 border border-blue-100 shadow-sm uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> ระบบจัดการข้อมูลปีการศึกษา
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {isNewSystem ? "เปิดระบบปีการศึกษาแรก" : "ตั้งค่าปีการศึกษาปัจจุบัน"}
            </h1>
            <p className="text-slate-500 mt-2 text-[15px] font-medium">บริหารจัดการช่วงเวลาการรับสมัครนิสิตดีเด่น และภาคเรียนปัจจุบัน</p>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-blue-200 transition-all duration-500">
            <div className="w-16 h-16 rounded-[1.25rem] bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Calendar className="w-8 h-8" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[13px] text-slate-400 uppercase font-black tracking-widest mb-1">ปีการศึกษาปัจจุบัน</p>
              <p className="text-3xl font-black text-slate-900">พ.ศ. {config.year}</p>
            </div>
          </div>

          <div className="relative overflow-hidden p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-indigo-200 transition-all duration-500">
            <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <BookOpen className="w-8 h-8" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[13px] text-slate-400 uppercase font-black tracking-widest mb-1">ภาคเรียนปัจจุบัน</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900">ภาคเรียนที่ {config.semester}</p>
                {config.semester === 3 && <p className="text-slate-500 font-bold">(ฤดูร้อน)</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            <div className="lg:col-span-1">
                <div className="relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200 h-full min-h-[300px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-10 -translate-x-10"></div>
                    
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                          <div className="inline-flex w-fit items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest border border-white/10 mb-6 shadow-sm">
                              {isNewSystem ? "SYSTEM INITIALIZATION" : "SYSTEM OPERATION"}
                          </div>
                          <h3 className="text-2xl font-bold leading-tight">เปลี่ยนผ่าน<br/>ภาคเรียนใหม่</h3>
                          <p className="text-white/70 text-[15px] mt-4 leading-relaxed font-light">
                            เมื่อขึ้นภาคเรียนใหม่ ระบบจะทำการจัดเก็บบัญชีเดิมเป็นประวัติ และเริ่มนับรอบการรับสมัครใหม่ทั้งหมดอัตโนมัติ
                          </p>
                        </div>
                        
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-md mt-8">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                                 <Clock className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                 <p className="text-[10px] text-white/60 uppercase font-black tracking-widest">สถานะระบบ</p>
                                 <p className="text-sm font-bold text-white">อัปเดตล่าสุด</p>
                              </div>
                           </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 relative z-50">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 h-full flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                    
                    <div>
                        <div className="flex items-center gap-5 mb-10 pb-8 border-b border-slate-100">
                            <div className="w-14 h-14 rounded-[1.25rem] bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                                <Clock className="w-7 h-7" strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">กำหนดระยะเวลา</h3>
                                <p className="text-slate-500 font-medium mt-1">ระบุวันเปิดและวันปิดรับคำร้องขอทุน/ดีเด่น</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 mb-12 w-full relative z-50">
                            <CustomDatePicker 
                                label="วันเปิดรับสมัคร" 
                                value={config.start_date} 
                                onChange={(val: string) => setConfig({ ...config, start_date: val })} 
                                theme="blue"
                            />
                            
                            <CustomDatePicker 
                                label="วันปิดรับสมัคร" 
                                value={config.end_date} 
                                onChange={(val: string) => setConfig({ ...config, end_date: val })} 
                                theme="rose"
                            />
                        </div>
                    </div>

                    <div className="pt-2 relative z-0">
                        <button 
                            onClick={handleSaveDecisions}
                            disabled={saving}
                            className={`w-full py-5 rounded-[1.5rem] font-black text-lg text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-3 transform active:scale-[0.98] hover:-translate-y-1
                                ${saving ? 'bg-slate-400 cursor-wait shadow-none' : 'bg-slate-900 hover:bg-black shadow-slate-900/20'}`}
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    กำลังดำเนินการ...
                                </>
                            ) : (
                                <><CheckCircle2 className="w-6 h-6" strokeWidth={2.5} /> {isNewSystem ? 'เปิดการใช้งานระบบภาคเรียนแรก' : 'บันทึกการตั้งค่าระบบ'}</>
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