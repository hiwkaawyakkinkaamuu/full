"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Clock, XCircle, ChevronDown, Award, Edit3, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/axios";

// 🌟 Import useAuth เพื่อดึง Role ของคนที่กำลังดู Modal
import { useAuth } from "@/context/AuthContext";

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
  org_name?: string;
  org_type?: string;
  org_location?: string;
  org_phone_number?: string;
  form_detail: string | any;
  reject_reason?: string; 
  files?: FileResponse[];
  logs?: ApprovalLog[];
}

interface ApprovalLog {
  approval_log_id?: number;
  id?: number;
  form_id: number;
  reviewer_user_id?: number;
  role_name?: string;
  operation?: string; 
  action?: string;
  approval_status?: string;
  reject_reason?: string;
  operation_date?: string;
  approved_at?: string;
  created_at?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Nomination | null;
  faculties?: any[]; 
  departments?: any[];
  canEditAwardType?: boolean;
  editedAwardType?: string;
  onAwardTypeChange?: (val: string) => void;
  // 🌟 เพิ่ม Prop สำหรับบอกว่านี่คือการเปิดจากหน้า History หรือไม่
  isHistoryView?: boolean; 
}

// ==========================================
// 2. Helpers & Configurations
// ==========================================

const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTimeDisplay = (isoDate: string) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const calculateAge = (isoDate: string) => {
    if (!isoDate) return "-";
    const dob = new Date(isoDate);
    if (isNaN(dob.getTime())) return "-";
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const getRoleFromStatus = (statusId: number) => {
    switch (statusId) {
        case 3: return "หัวหน้าภาควิชา";
        case 5: return "รองคณบดีฝ่ายกิจการนิสิต";
        case 7: return "คณบดี";
        case 9: return "กองพัฒนานิสิต";
        case 11: return "คณะกรรมการพิจารณา";
        case 15: return "อธิการบดี";
        default: return "ผู้พิจารณาคำร้อง";
    }
};

const THEME_STYLES: Record<string, any> = {
    "activity": {
        border: "border-orange-100", gradient: "from-orange-400 to-orange-600", 
        numberBg: "bg-orange-600", text: "text-orange-600", bgSoft: "bg-orange-50", radioColor: "text-orange-600 focus:ring-orange-500"
    },
    "innovation": {
        border: "border-purple-100", gradient: "from-purple-400 to-purple-600", 
        numberBg: "bg-purple-600", text: "text-purple-600", bgSoft: "bg-purple-50", radioColor: "text-purple-600 focus:ring-purple-500"
    },
    "behavior": {
        border: "border-blue-100", gradient: "from-blue-400 to-blue-600", 
        numberBg: "bg-blue-600", text: "text-blue-600", bgSoft: "bg-blue-50", radioColor: "text-blue-600 focus:ring-blue-500"
    },
    "other": {
        border: "border-green-100", gradient: "from-green-400 to-green-600", 
        numberBg: "bg-green-600", text: "text-green-600", bgSoft: "bg-green-50", radioColor: "text-green-600 focus:ring-green-500"
    },
    "default": {
        border: "border-gray-100", gradient: "from-gray-400 to-gray-600", 
        numberBg: "bg-gray-600", text: "text-gray-600", bgSoft: "bg-gray-50", radioColor: "text-gray-600 focus:ring-gray-500"
    }
};

// ==========================================
// 3. Sub-Components
// ==========================================

const ReadOnlyField = ({ label, value, font }: any) => (
    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl h-full">
        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">{label}</span>
        <span className={`font-bold text-blue-900 ${font || ""}`}>{value || "-"}</span>
    </div>
);

const InputReadOnly = ({ label, value, font, isTextarea = false }: any) => (
    <div className="space-y-2">
        {label && <label className="text-sm font-bold text-gray-700">{label}</label>}
        {isTextarea ? (
             <textarea readOnly rows={5} value={value || ""} className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none resize-none ${font || ""}`} />
        ) : (
            <div className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none ${font || ""}`}>
                {value || "-"}
            </div>
        )}
    </div>
);

const CustomSelect = ({ value, onChange, options, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 999999, // ให้แสดงชั้นบนสุด
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false); // ปิดทันทีเมื่อมีการไถเมาส์ เพื่อไม่ให้มันลอยหลุดตำแหน่ง
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  const selectedOption = options.find((o: any) => o.v === value);
  const selectedLabel = selectedOption ? selectedOption.l : "-- โปรดเลือกประเภทรางวัล --";

  const dropdownMenu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.18 }}
          style={dropdownStyle}
          className="bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[20px] shadow-2xl overflow-hidden py-2 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {options.map((o: any, i: number) => (
            <div
              key={i}
              onClick={() => { onChange(o.v); setIsOpen(false); }}
              className={`px-5 py-3.5 cursor-pointer transition-all duration-200 text-sm font-medium truncate flex items-center justify-between
                ${value === o.v ? `bg-blue-50 text-blue-600` : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {o.l}
              {value === o.v && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle2 className={`w-4 h-4 text-blue-600`} />
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`relative group ${disabled ? "opacity-50 pointer-events-none" : ""}`} ref={triggerRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full cursor-pointer bg-white border rounded-xl pl-4 pr-12 py-3.5 outline-none transition-all duration-300 flex items-center justify-between
          ${isOpen ? `border-blue-400 ring-4 ring-blue-500/10 shadow-md` : 'border-gray-200 hover:border-blue-400 shadow-sm'}
        `}
      >
        <span className={`text-sm font-medium truncate pr-4 transition-colors ${value ? 'text-gray-800' : 'text-gray-400'}`}>
          {selectedLabel}
        </span>
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
          <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </div>
      </div>
      {typeof document !== "undefined" && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

// ==========================================
// 4. Main Component
// ==========================================

export default function NominationDetailModal({ 
    isOpen, 
    onClose, 
    data, 
    editedAwardType, 
    canEditAwardType,
    onAwardTypeChange,
    isHistoryView = false // 🌟 Default เป็น false
}: ModalProps) {
  
  const { user } = useAuth(); // 🌟 ดึงข้อมูล user ปัจจุบัน

  const [facultyName, setFacultyName] = useState("-");
  const [deptName, setDepartmentName] = useState("-");
  const [campusName, setCampusName] = useState("-");
  const [isVisible, setIsVisible] = useState(false);
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);
  const [selectedMainType, setSelectedMainType] = useState<string>("");
  const [otherType, setOtherType] = useState<string>("");

  const parsedDetail = useMemo(() => {
      if (!data) return {};
      if (typeof data.form_detail === 'string') {
          if (data.form_detail.trim().startsWith('{')) {
              try { return JSON.parse(data.form_detail); } catch { return { other_details: data.form_detail }; }
          }
          return { other_details: data.form_detail };
      }
      return data.form_detail || {};
  }, [data]);

  useEffect(() => {
    if (isOpen && data) {
        setIsVisible(true);

        const rawInitialType = editedAwardType || data.award_type || data.award_type_name || "";
        const initialType = rawInitialType === "ประพฤติดี" ? "ความประพฤติดี" : rawInitialType;
        
        if (["กิจกรรมนอกหลักสูตร", "ความคิดสร้างสรรค์และนวัตกรรม", "ความประพฤติดี"].includes(initialType)) {
            setSelectedMainType(initialType);
            setOtherType("");
        } else {
            setSelectedMainType("ประเภทอื่นๆ");
            setOtherType(initialType); 
        }

        // Fetch Faculty
        if (data.faculty_id) {
            api.get(`/faculty`)
                .then(res => {
                    const list = res.data?.data || res.data || [];
                    const found = Array.isArray(list) ? list.find((item: any) => String(item.facultyID || item.faculty_id || item.id) === String(data.faculty_id)) : null;
                    setFacultyName(found ? (found.facultyName || found.faculty_name || found.name) : `(ID: ${data.faculty_id})`);
                }).catch(() => setFacultyName(`(ID: ${data.faculty_id})`));
        } else {
            setFacultyName(parsedDetail?.faculty || "-");
        }

        // Fetch Department
        if (data.department_id) {
            api.get(`/department`)
                .then(res => {
                    const list = res.data?.data || res.data || [];
                    const found = Array.isArray(list) ? list.find((item: any) => String(item.departmentID || item.department_id || item.id) === String(data.department_id)) : null;
                    setDepartmentName(found ? (found.departmentName || found.department_name || found.name) : `(ID: ${data.department_id})`);
                }).catch(() => setDepartmentName(`(ID: ${data.department_id})`));
        } else {
            setDepartmentName(parsedDetail?.department || "-");
        }

        // Fetch Campus
        if (data.campus_id) {
            api.get(`/campus`)
                .then(res => {
                    const list = res.data?.data || res.data || [];
                    const found = Array.isArray(list) ? list.find((item: any) => String(item.campusID || item.campus_id || item.id) === String(data.campus_id)) : null;
                    setCampusName(found ? (found.campusName || found.campus_name || found.name) : `(ID: ${data.campus_id})`);
                }).catch(() => setCampusName(`(ID: ${data.campus_id})`));
        } else {
            setCampusName(parsedDetail?.campus || "-");
        }

        api.get(`/awards/approval-logs/${data.form_id}`)
            .then(res => {
                const logs = res.data?.data || res.data;
                setApprovalLogs(Array.isArray(logs) ? logs : []);
            }).catch(err => {
                console.error("Failed to fetch approval logs:", err);
                setApprovalLogs([]);
            });

    } else {
        setIsVisible(false);
        setFacultyName("-");
        setDepartmentName("-");
        setCampusName("-");
        setApprovalLogs([]);
    }
  }, [isOpen, data, parsedDetail, editedAwardType]);

  if (!isOpen || !data) return null;

  // 🌟 เงื่อนไขตรวจสอบสิทธิ์ในการดูกล่องเหตุผลปฏิเสธ
  const roleId = user?.role_id;
  const canViewRejectReason = roleId === 1 || roleId === 8 || isHistoryView;

  // --- กำหนดประเภทและ Theme ---
  const awardStr = data.award_type || data.award_type_name || "";
  const isActivity = awardStr.includes("กิจกรรม");
  const isInnovation = awardStr.includes("นวัตกรรม");
  const isBehavior = awardStr.includes("ประพฤติดี");
  const isOther = !isActivity && !isInnovation && !isBehavior;

  let themeKey = "default";
  if (isActivity) themeKey = "activity";
  if (isInnovation) themeKey = "innovation";
  if (isBehavior) themeKey = "behavior";
  if (isOther && awardStr) themeKey = "other";
  const theme = THEME_STYLES[themeKey];

  const isOrganization = (data.org_name && data.org_name.trim() !== "") || data.student_lastname === "-";

  const displayStudentName = data.student_lastname === "-" 
      ? data.student_firstname 
      : `${data.student_firstname || ""} ${data.student_lastname || ""}`.trim();

  let stepCounter = 1;
  const reasonToDisplay = parsedDetail?.other_details || parsedDetail?.behavior_desc || (typeof data.form_detail === 'string' && !data.form_detail.startsWith('{') ? data.form_detail : "");

  const safeLogs = Array.isArray(approvalLogs) ? approvalLogs : [];
  
  let rejectedLogs = safeLogs
    .filter(log => 
        (log.operation && String(log.operation).toLowerCase().includes("reject")) ||
        (log.action && String(log.action).toLowerCase().includes("reject")) ||
        (log.reject_reason && String(log.reject_reason).trim() !== "")
    )
    .sort((a, b) => new Date(b.operation_date || b.created_at || 0).getTime() - new Date(a.operation_date || a.created_at || 0).getTime());

  const isFormRejected = [3, 5, 7, 9, 11, 15].includes(data.form_status);
  if (rejectedLogs.length === 0 && isFormRejected) {
      rejectedLogs = [{
          approval_log_id: 999999,
          form_id: data.form_id,
          role_name: getRoleFromStatus(data.form_status),
          operation: "reject",
          operation_date: data.latest_update || data.created_at,
          reject_reason: data.reject_reason || "ไม่ได้ระบุเหตุผล (กรุณาติดต่อผู้พิจารณา)"
      }];
  }

  return (
    <div className="absolute inset-0 z-[50] flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>

      <div className={`relative bg-[#F8F9FA] rounded-[24px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 transform ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>
        
        <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }
        `}</style>

        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md z-10 px-6 md:px-8 py-5 border-b border-gray-200 flex justify-between items-center sticky top-0 shadow-sm shrink-0">
            <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 flex items-center gap-3">รายละเอียดแบบเสนอชื่อ</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-all active:scale-90 shrink-0">
                <XCircle size={24} />
            </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">

            {/* 🌟 แสดงกล่องแสดงเหตุผลการปฏิเสธ เฉพาะเมื่อ canViewRejectReason เป็น true */}
            {canViewRejectReason && rejectedLogs.length > 0 && (
                <div className="space-y-4">
                    {rejectedLogs.map((log, index) => (
                        <div key={log.approval_log_id || index} className="bg-rose-50 border border-rose-200 p-6 md:p-8 rounded-[24px] shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-red-600"></div>
                            <h3 className="text-lg md:text-xl font-bold text-rose-800 mb-2 flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-rose-600" />
                                ฟอร์มปฏิเสธโดย: {log.role_name || getRoleFromStatus(data.form_status)}
                            </h3>
                            <p className="text-sm font-bold text-rose-500 mb-5 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                เมื่อวันที่: {formatDateTimeDisplay(log.operation_date || log.created_at || data.latest_update)}
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-rose-700">ข้อเสนอแนะ / เหตุผลที่ปฏิเสธ:</label>
                                <div className="w-full bg-white border border-rose-200 rounded-xl px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap shadow-inner">
                                    {log.reject_reason || data.reject_reason || "ไม่มีการระบุเหตุผลประกอบ"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* === Section ประเภทรางวัล === */}
            <div className={`bg-white p-6 md:p-8 rounded-[24px] ${theme.border} shadow-sm relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradient}`}></div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full ${theme.numberBg} text-white flex items-center justify-center text-sm`}>{stepCounter++}</span>
                    ประเภทรางวัลที่เสนอชื่อ
                </h3>
                
                {canEditAwardType ? (
                    <div className="space-y-5 bg-blue-50/40 p-5 rounded-[20px] border border-blue-100">
                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Award size={16} className="text-blue-500" />
                                ประเภทรางวัล (กองพัฒนานิสิตสามารถแก้ไขได้)
                            </label>
                            
                            <CustomSelect 
                                value={selectedMainType} 
                                onChange={(val: string) => {
                                    setSelectedMainType(val);
                                    if (val !== "ประเภทอื่นๆ") {
                                        onAwardTypeChange?.(val);
                                    } else {
                                        onAwardTypeChange?.(otherType);
                                    }
                                }}
                                options={[
                                    { v: "กิจกรรมนอกหลักสูตร", l: "กิจกรรมนอกหลักสูตร" },
                                    { v: "ความคิดสร้างสรรค์และนวัตกรรม", l: "ความคิดสร้างสรรค์และนวัตกรรม" },
                                    { v: "ความประพฤติดี", l: "ความประพฤติดี" },
                                    { v: "ประเภทอื่นๆ", l: "ประเภทอื่นๆ" }
                                ]}
                            />
                        </div>
                        
                        {selectedMainType === "ประเภทอื่นๆ" && (
                            <div className="animate-fade-in-up">
                                <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Edit3 size={16} className="text-blue-500" />
                                    โปรดระบุชื่อประเภทรางวัล
                                </label>
                                <input 
                                    type="text" 
                                    value={otherType} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setOtherType(val);
                                        onAwardTypeChange?.(val);
                                    }}
                                    placeholder="พิมพ์ชื่อประเภทรางวัลที่นี่..."
                                    className="w-full bg-white border border-gray-200 hover:border-blue-400 rounded-xl px-4 py-3.5 text-sm text-gray-800 font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <InputReadOnly label="ชื่อรางวัล" value={parsedDetail?.award_title || awardStr} />
                )}
            </div>

            {/* === Section ข้อมูลองค์กร (ถ้ามี) === */}
            {isOrganization && (
                <div className={`bg-white p-6 md:p-8 rounded-[24px] border border-blue-100 shadow-sm relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500`}></div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm`}>{stepCounter++}</span>
                        ข้อมูลองค์กร/หน่วยงานผู้เสนอชื่อ
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ReadOnlyField label="ชื่อหน่วยงาน" value={data.org_name || parsedDetail?.organization_name} />
                        <ReadOnlyField label="ประเภทหน่วยงาน" value={data.org_type || parsedDetail?.organization_type} />
                        <ReadOnlyField label="เบอร์โทรศัพท์" value={data.org_phone_number || parsedDetail?.organization_phone} font="font-mono" />
                        <ReadOnlyField label="ที่ตั้งหน่วยงาน" value={data.org_location || parsedDetail?.organization_location} />
                    </div>
                </div>
            )}

            {/* === Section ข้อมูลนิสิต === */}
            <div className={`bg-white p-6 md:p-8 rounded-[24px] ${theme.border} shadow-sm relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradient}`}></div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full ${theme.numberBg} text-white flex items-center justify-center text-sm`}>{stepCounter++}</span>
                    ข้อมูลนิสิตที่ได้รับการเสนอชื่อ {isOrganization && <span className="text-sm font-normal text-gray-500 ml-2">(นิสิต/ตัวแทนองค์กร)</span>}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <ReadOnlyField label="ชื่อ-นามสกุล" value={displayStudentName} />
                    <ReadOnlyField label="รหัสนิสิต" value={data.student_number} font="font-mono" />
                    <ReadOnlyField label="อีเมล" value={data.student_email || parsedDetail?.email} />
                    <ReadOnlyField label="คณะ" value={facultyName} />
                    <ReadOnlyField label="สาขา/ภาควิชา" value={deptName} />
                    <ReadOnlyField label="วิทยาเขต" value={campusName} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <InputReadOnly label="ชั้นปี" value={data.student_year ? `ปี ${data.student_year}` : "-"} />
                    <InputReadOnly label="เกรดเฉลี่ยสะสม (GPA)" value={data.gpa || parsedDetail?.gpa} font="font-mono" />
                    <InputReadOnly label="อาจารย์ที่ปรึกษา" value={data.advisor_name || parsedDetail?.advisor_name} />
                    <InputReadOnly label="เบอร์โทรศัพท์ติดต่อ" value={data.student_phone_number || parsedDetail?.phone_number} font="font-mono" />
                    <InputReadOnly label="วันเกิด" value={formatDateDisplay(data.student_date_of_birth)} />
                    <InputReadOnly label="อายุ (ปี)" value={calculateAge(data.student_date_of_birth)} />
                    <div className="md:col-span-2">
                        <InputReadOnly label="ที่อยู่ปัจจุบัน" value={data.student_address || parsedDetail?.address} isTextarea />
                    </div>
                </div>
            </div>

            {/* === Section รายละเอียดผลงาน === */}
            <div className={`bg-white p-6 md:p-8 rounded-[24px] ${theme.border} shadow-sm relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradient}`}></div>
                
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.numberBg} text-white text-sm`}>{stepCounter++}</span>
                    รายละเอียดเหตุผลและผลงาน
                </h3>
                
                {parsedDetail.project_title && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <ReadOnlyField label="ชื่อโครงการ/ผลงาน" value={parsedDetail.project_title} className="md:col-span-2" />
                        <ReadOnlyField label="บทบาท/รางวัลที่ได้รับ" value={parsedDetail.prize} />
                        <ReadOnlyField label="หน่วยงานที่จัด/เวที" value={parsedDetail.organized_by} />
                        <ReadOnlyField label="วันที่ได้รับ/เข้าร่วม" value={parsedDetail.date_received} />
                        <ReadOnlyField label="ชื่อทีม (ถ้ามี)" value={parsedDetail.team_name} />
                    </div>
                )}

                <InputReadOnly 
                    label="เหตุผลในการเสนอชื่อ/รายละเอียดเพิ่มเติม" 
                    value={reasonToDisplay} 
                    isTextarea 
                />
            </div>

            {/* === Section เอกสารประกอบ === */}
            <div className={`bg-white p-6 md:p-8 rounded-[24px] ${theme.border} shadow-sm relative overflow-hidden`}>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.numberBg} text-white text-sm`}>
                        {stepCounter++}
                    </span>
                    เอกสารประกอบ <span className="text-gray-400 text-sm font-normal ml-2">(ไฟล์ PDF ที่แนบมา)</span>
                </h3>

                {data.files && data.files.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.files.map((file, idx) => {
                            let safePath = file.file_path;
                            if (safePath.startsWith("api/")) safePath = safePath.replace("api/", "");
                            if (safePath.startsWith("/api/")) safePath = safePath.replace("/api/", "");
                            if (!safePath.startsWith("/")) safePath = "/" + safePath;

                            const fileName = file.file_name || safePath.split('/').pop() || `Document_${idx + 1}.pdf`;

                            return (
                                <a 
                                    key={idx} 
                                    href={safePath}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-red-200 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4 overflow-hidden">
                                         <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-500 font-bold text-xs group-hover:scale-110 transition-transform shrink-0">PDF</div>
                                         <div className="min-w-0">
                                             <p className="text-sm font-bold text-gray-700 truncate group-hover:text-red-500 transition-colors">{fileName}</p>
                                             <p className="text-xs text-gray-400">{(file.file_size / 1024).toFixed(2)} KB</p>
                                         </div>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        ดูเอกสาร
                                    </span>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-10 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-medium">
                        ไม่พบเอกสารแนบในระบบ
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}