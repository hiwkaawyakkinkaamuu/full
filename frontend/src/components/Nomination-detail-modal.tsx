"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { api } from "@/lib/axios";

// ==========================================
// 1. Interfaces
// ==========================================

interface FileResponse {
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
  reject_reason?: string; // ใช้เป็น Optional เผื่อไม่มี
  files?: FileResponse[];
}

interface MasterFaculty {
  faculty_id: number;
  faculty_name: string;
}

interface MasterDepartment {
  department_id: number;
  department_name: string;
  faculty_id: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Nomination | null;
  faculties: MasterFaculty[]; 
  departments: MasterDepartment[];
}

interface ApprovalLog {
  approval_log_id?: number;
  id?: number;
  form_id: number;
  reviewer_user_id?: number;
  role_name?: string;
  operation?: string; 
  action?: string;
  reject_reason?: string;
  operation_date?: string;
  created_at?: string;
}

// ==========================================
// 2. Helpers & Themes
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

// ==========================================
// 4. Main Component
// ==========================================

export default function NominationDetailModal({ isOpen, onClose, data }: ModalProps) {
  
  const [facultyName, setFacultyName] = useState("-");
  const [deptName, setDepartmentName] = useState("-");
  const [campusName, setCampusName] = useState("-");
  const [isVisible, setIsVisible] = useState(false);
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);

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

        // ✅ แก้ไข: Fetch Approval Logs ป้องกัน Array Filter พัง
        api.get(`/awards/approval-logs/${data.form_id}`)
            .then(res => {
                const logs = res.data?.data || res.data;
                // เช็คให้ชัวร์ว่าเป็น Array เท่านั้น ถ้าเป็น Object (เช่น 404 response) ให้เป็น []
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
  }, [isOpen, data, parsedDetail]);

  if (!isOpen || !data) return null;

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

  // ✅ แก้ไข: ป้องกัน Filter แตก และสร้าง Fallback ดึงข้อมูลจากการตีกลับของฟอร์มหลัก
  const safeLogs = Array.isArray(approvalLogs) ? approvalLogs : [];
  
  // 1. ดึงจากประวัติ Logs (ถ้ามี)
  let rejectedLogs = safeLogs
    .filter(log => 
        (log.operation && String(log.operation).toLowerCase().includes("reject")) ||
        (log.action && String(log.action).toLowerCase().includes("reject")) ||
        (log.reject_reason && String(log.reject_reason).trim() !== "")
    )
    .sort((a, b) => new Date(b.operation_date || b.created_at || 0).getTime() - new Date(a.operation_date || a.created_at || 0).getTime());

  // 2. ถ้า Logs API Error(404) แต่ตัวฟอร์มหลักบอกว่าโดนปฏิเสธ ให้ใช้ข้อมูลจากฟอร์มหลักแสดงผล
  if (rejectedLogs.length === 0 && data.reject_reason && data.reject_reason.trim() !== "") {
      rejectedLogs = [{
          approval_log_id: 999999, // Dummy ID
          form_id: data.form_id,
          role_name: "คณะกรรมการพิจารณา",
          operation: "reject",
          operation_date: data.latest_update || data.created_at,
          reject_reason: data.reject_reason
      }];
  }

  return (
    <div className="absolute inset-0 z-[50] flex items-center justify-center p-4 md:p-8 overflow-hidden">
      
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      {/* Modal Content */}
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
                <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 flex items-center gap-3">
                    รายละเอียดแบบเสนอชื่อ
                </h3>
                <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${theme.numberBg}`}></span> 
                    {awardStr}
                </p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-200 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">

            {/* ✅ กล่องแสดงเหตุผลการปฏิเสธ */}
            {rejectedLogs.length > 0 && (
                <div className="space-y-4">
                    {rejectedLogs.map((log, index) => (
                        <div key={log.approval_log_id || index} className="bg-rose-50 border border-rose-200 p-6 md:p-8 rounded-[24px] shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-red-600"></div>
                            <h3 className="text-lg md:text-xl font-bold text-rose-800 mb-2 flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-rose-600" />
                                ฟอร์มถูกตีกลับให้แก้ไขโดย: {log.role_name || "คณะกรรมการ"}
                            </h3>
                            <p className="text-sm font-bold text-rose-500 mb-5 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                เมื่อวันที่: {formatDateTimeDisplay(log.operation_date || log.created_at || data.latest_update)}
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-rose-700">ข้อเสนอแนะ / เหตุผลที่ปฏิเสธ:</label>
                                <div className="w-full bg-white border border-rose-200 rounded-xl px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap shadow-inner">
                                    {log.reject_reason || "ไม่มีการระบุเหตุผลประกอบ"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* === Section 1 (เฉพาะ Other) === */}
            {isOther && (
                <div className={`bg-white p-6 md:p-8 rounded-[24px] ${theme.border} shadow-sm relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradient}`}></div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full ${theme.numberBg} text-white flex items-center justify-center text-sm`}>{stepCounter++}</span>
                        ระบุชื่อรางวัล/ประเภทที่ยื่นเสนอ
                    </h3>
                    <InputReadOnly label="ชื่อรางวัล" value={parsedDetail?.award_title || awardStr} />
                </div>
            )}

            {/* === Section ข้อมูลองค์กร === */}
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
                    ข้อมูลผู้ได้รับการเสนอชื่อ {isOrganization && <span className="text-sm font-normal text-gray-500 ml-2">(นิสิต/ตัวแทนองค์กร)</span>}
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

                <InputReadOnly 
                    label="เหตุผลในการเสนอชื่อและความโดดเด่นของผลงาน" 
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