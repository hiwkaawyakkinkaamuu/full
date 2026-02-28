"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";

// ==========================================
// 0. Configuration & Service Layer
// ==========================================

const USE_MOCK_DATA = true;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// --- Hardcoded Codes Mapping (For API) ---
const FACULTY_CODE_MAP: Record<string, string> = {
  "คณะวิศวกรรมศาสตร์": "ENG",
  "คณะวิทยาศาสตร์": "SCI",
  "คณะเกษตร": "AGR",
  "คณะบริหารธุรกิจ": "BUS",
  "คณะมนุษยศาสตร์": "HUM",
  "คณะเศรษฐศาสตร์": "ECO",
  "คณะสังคมศาสตร์": "SOC",
  "คณะศึกษาศาสตร์": "EDU",
  "คณะอุตสาหกรรมเกษตร": "AGI",
  "คณะประมง": "FIS",
  "คณะวนศาสตร์": "FOR",
  "คณะสถาปัตยกรรมศาสตร์": "ARC",
  "คณะสัตวแพทยศาสตร์": "VET",
  "คณะเทคนิคการสัตวแพทย์": "VTT",
  "คณะสิ่งแวดล้อม": "ENV",
  "คณะแพทยศาสตร์": "MED",
  "คณะพยาบาลศาสตร์": "NUR",
  "คณะเภสัชศาสตร์": "PHA",
  "วิทยาลัยบูรณาการศาสตร์": "SIS",
  "วิทยาลัยนานาชาติ (KUBIM)": "KUBIM"
  // Add more as needed...
};

const DEPT_CODE_MAP: Record<string, string> = {
  "วิศวกรรมคอมพิวเตอร์": "CPE",
  "วิศวกรรมไฟฟ้า": "EE",
  "วิศวกรรมโยธา": "CE",
  "วิทยาการคอมพิวเตอร์": "CS",
  "การตลาด": "MKT",
  "การเงิน": "FIN",
  "ภาษาอังกฤษ": "ENG_LANG",
  // Default fallback generator will be used if not found
};

const getFacultyCode = (name: string) => FACULTY_CODE_MAP[name] || `FAC_${Math.floor(Math.random() * 1000)}`;
const getDeptCode = (name: string) => DEPT_CODE_MAP[name] || `DEPT_${Math.floor(Math.random() * 1000)}`;

// --- Interfaces ---
interface Department {
  department_id: number;
  department_name: string;
}

interface Faculty {
  faculty_id: number;
  faculty_name: string;
  campus_name: string;
  departments: Department[];
}

interface ModalState {
  isOpen: boolean;
  type: "faculty" | "department";
  parentId?: number;
  parentCampus?: string;
  parentFacultyName?: string;
  data: { id?: number; name: string; campus: string };
}

// --- Hardcoded KU Structure ---
const KU_DATA: Record<string, { faculty: string; departments: string[] }[]> = {
  "วิทยาเขตบางเขน": [
    { 
      faculty: "คณะวิศวกรรมศาสตร์", 
      departments: ["วิศวกรรมโยธา", "วิศวกรรมไฟฟ้า", "วิศวกรรมเครื่องกล", "วิศวกรรมอุตสาหการ", "วิศวกรรมคอมพิวเตอร์", "วิศวกรรมเคมี", "วิศวกรรมสิ่งแวดล้อม", "วิศวกรรมวัสดุ", "วิศวกรรมการบินและอวกาศ"] 
    },
    { 
      faculty: "คณะวิทยาศาสตร์", 
      departments: ["คณิตศาสตร์", "เคมี", "ฟิสิกส์", "ชีววิทยา", "สถิติ", "วิทยาการคอมพิวเตอร์", "จุลชีววิทยา"] 
    },
    { 
      faculty: "คณะเกษตร", 
      departments: ["นวัตกรรมเกษตร", "กีฏวิทยา", "ปฐพีวิทยา", "พืชสวน", "พืชไร่", "สัตวบาล"] 
    },
    { 
      faculty: "คณะบริหารธุรกิจ", 
      departments: ["การเงิน", "การจัดการ", "การตลาด", "บัญชี", "การจัดการการผลิต"] 
    },
    { 
      faculty: "คณะมนุษยศาสตร์", 
      departments: ["ภาษาไทย", "ภาษาอังกฤษ", "ภาษาตะวันออก", "นิเทศศาสตร์", "วรรณคดี"] 
    },
    { 
      faculty: "คณะเศรษฐศาสตร์", 
      departments: ["เศรษฐศาสตร์", "เศรษฐศาสตร์เกษตร", "เศรษฐศาสตร์สหกรณ์"] 
    },
    { 
      faculty: "คณะสังคมศาสตร์", 
      departments: ["จิตวิทยา", "รัฐศาสตร์", "นิติศาสตร์", "สังคมวิทยาและมานุษยวิทยา", "ประวัติศาสตร์", "ภูมิศาสตร์"] 
    },
    { 
      faculty: "คณะศึกษาศาสตร์", 
      departments: ["พลศึกษา", "สุขศึกษา", "คหกรรมศาสตรศึกษา", "การสอนวิทยาศาสตร์", "การสอนคณิตศาสตร์", "การสอนภาษาอังกฤษ"] 
    },
    { 
      faculty: "คณะอุตสาหกรรมเกษตร", 
      departments: ["วิทยาศาสตร์และเทคโนโลยีการอาหาร", "เทคโนโลยีชีวภาพ", "เทคโนโลยีการบรรจุ"] 
    },
    { 
      faculty: "คณะประมง", 
      departments: ["เพาะเลี้ยงสัตว์น้ำ", "ชีววิทยาประมง", "ผลิตภัณฑ์ประมง", "วิทยาศาสตร์ทางทะเล"] 
    },
    { 
      faculty: "คณะวนศาสตร์", 
      departments: ["การจัดการป่าไม้", "วนวัฒนวิทยา", "วิศวกรรมป่าไม้"] 
    },
    { 
      faculty: "คณะสถาปัตยกรรมศาสตร์", 
      departments: ["สถาปัตยกรรม", "ภูมิสถาปัตยกรรม", "นวัตกรรมอาคาร"] 
    },
    { faculty: "คณะสัตวแพทยศาสตร์", departments: ["สัตวแพทยศาสตร์"] },
    { 
      faculty: "คณะเทคนิคการสัตวแพทย์", 
      departments: ["เทคนิคการสัตวแพทย์", "การพยาบาลสัตว์"] 
    },
    { faculty: "คณะสิ่งแวดล้อม", departments: ["วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม"] },
    { faculty: "คณะแพทยศาสตร์", departments: ["แพทยศาสตร์"] },
    { faculty: "คณะพยาบาลศาสตร์", departments: ["พยาบาลศาสตร์"] },
    { faculty: "คณะเภสัชศาสตร์", departments: ["เภสัชศาสตร์"] },
    { faculty: "วิทยาลัยบูรณาการศาสตร์", departments: ["ศาสตร์แห่งแผ่นดิน"] },
    { faculty: "วิทยาลัยนานาชาติ (KUBIM)", departments: ["การจัดการหลักสูตรนานาชาติ"] }
  ],
  "วิทยาเขตกำแพงแสน": [
    { 
      faculty: "คณะเกษตร กำแพงแสน", 
      departments: ["เกษตรศาสตร์", "เครื่องจักรกลและเมคคาทรอนิกส์เกษตร", "เทคโนโลยีชีวภาพทางการเกษตร"] 
    },
    { 
      faculty: "คณะวิศวกรรมศาสตร์ กำแพงแสน", 
      departments: ["วิศวกรรมเกษตร", "วิศวกรรมโยธา-ชลประทาน", "วิศวกรรมการอาหาร", "วิศวกรรมเครื่องกล", "วิศวกรรมคอมพิวเตอร์"] 
    },
    { 
      faculty: "คณะศิลปศาสตร์และวิทยาศาสตร์", 
      departments: ["ภาษาอังกฤษ", "การจัดการ", "การตลาด", "บัญชี", "วิทยาการคอมพิวเตอร์", "เคมี", "ชีววิทยา"] 
    },
    { 
      faculty: "คณะศึกษาศาสตร์และพัฒนศาสตร์", 
      departments: ["เกษตรและสิ่งแวดล้อมศึกษา", "พลศึกษาและสุขศึกษา", "การสอนภาษาอังกฤษ"] 
    },
    { faculty: "คณะวิทยาศาสตร์การกีฬา", departments: ["วิทยาศาสตร์การกีฬาและการออกกำลังกาย"] },
    { 
      faculty: "คณะอุตสาหกรรมบริการ", 
      departments: ["การจัดการโรงแรมและท่องเที่ยว", "การจัดการอุตสาหกรรมการบริการ"] 
    }
  ],
  "วิทยาเขตศรีราชา": [
    { 
      faculty: "คณะพาณิชยนาวีนานาชาติ", 
      departments: ["วิทยาศาสตร์การเดินเรือ", "วิศวกรรมต่อเรือและเครื่องกลเรือ", "การขนส่งทางทะเล"] 
    },
    { 
      faculty: "คณะวิศวกรรมศาสตร์ ศรีราชา", 
      departments: ["วิศวกรรมเครื่องกลและการออกแบบ", "ไฟฟ้าและอิเล็กทรอนิกส์", "โยธา", "อุตสาหการและระบบ", "คอมพิวเตอร์และสารสนเทศ", "หุ่นยนต์และระบบอัตโนมัติ"] 
    },
    { 
      faculty: "คณะวิทยาการจัดการ", 
      departments: ["การเงินและการลงทุน", "การจัดการ", "การตลาดดิจิทัล", "ธุรกิจระหว่างประเทศ", "การจัดการโรงแรม", "บัญชี"] 
    },
    { 
      faculty: "คณะวิทยาศาสตร์ ศรีราชา", 
      departments: ["วิทยาการคอมพิวเตอร์", "เทคโนโลยีสารสนเทศ", "เคมี", "ฟิสิกส์", "สิ่งแวดล้อม"] 
    },
    { faculty: "คณะเศรษฐศาสตร์ ศรีราชา", departments: ["เศรษฐศาสตร์"] }
  ],
  "วิทยาเขตเฉลิมพระเกียรติ จ.สกลนคร": [
    { 
      faculty: "คณะทรัพยากรธรรมชาติและอุตสาหกรรมเกษตร", 
      departments: ["พืชศาสตร์", "สัตวศาสตร์", "ประมง", "เทคโนโลยีการอาหาร", "อาหารปลอดภัย"] 
    },
    { 
      faculty: "คณะวิทยาศาสตร์และวิศวกรรมศาสตร์", 
      departments: ["วิศวกรรมไฟฟ้า", "โยธา", "เครื่องกล", "คอมพิวเตอร์", "อุตสาหการ", "เคมีประยุกต์", "วิทยาการคอมพิวเตอร์"] 
    },
    { 
      faculty: "คณะศิลปศาสตร์และวิทยาการจัดการ", 
      departments: ["การจัดการ", "บัญชี", "การตลาด", "การจัดการโรงแรมและท่องเที่ยว", "ภาษาอังกฤษ", "นิติศาสตร์"] 
    },
    { faculty: "คณะสาธารณสุขศาสตร์", departments: ["สาธารณสุขศาสตร์"] }
  ]
};

// --- Mock Data ---
const MOCK_FACULTIES: Faculty[] = [
  { 
    faculty_id: 1, 
    faculty_name: "คณะวิศวกรรมศาสตร์", 
    campus_name: "วิทยาเขตบางเขน", 
    departments: [
      { department_id: 101, department_name: "วิศวกรรมคอมพิวเตอร์" },
      { department_id: 102, department_name: "วิศวกรรมไฟฟ้า" }
    ] 
  },
  { 
    faculty_id: 2, 
    faculty_name: "คณะวิทยาศาสตร์ ศรีราชา", 
    campus_name: "วิทยาเขตศรีราชา", 
    departments: [
      { department_id: 201, department_name: "วิทยาการคอมพิวเตอร์" }
    ] 
  }
];

// --- Service Object ---
const masterDataService = {
  getAllFaculties: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return MOCK_FACULTIES;
    }
    const res = await axios.get(`${API_BASE_URL}/master/faculties`);
    return res.data.data;
  },

  createFaculty: async (name: string, campus: string) => {
    const payload = {
      faculty_name: name,
      faculty_code: getFacultyCode(name),
      campus_name: campus // Backend should handle campus logic (create if not exist or link)
    };

    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return { ...payload, faculty_id: Date.now(), departments: [] };
    }
    const res = await axios.post(`${API_BASE_URL}/master/faculties`, payload);
    return res.data;
  },

  deleteFaculty: async (id: number) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return true;
    }
    await axios.delete(`${API_BASE_URL}/master/faculties/${id}`);
    return true;
  },

  createDepartment: async (facultyId: number, name: string) => {
    const payload = {
      faculty_id: facultyId,
      department_name: name,
      department_code: getDeptCode(name)
    };

    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return { ...payload, department_id: Date.now() };
    }
    const res = await axios.post(`${API_BASE_URL}/master/departments`, payload);
    return res.data;
  },

  deleteDepartment: async (id: number) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return true;
    }
    await axios.delete(`${API_BASE_URL}/master/departments/${id}`);
    return true;
  }
};

// ==========================================
// 1. Helper: Beautiful Notification
// ==========================================
const notify = (
  action: 'add' | 'delete' | 'error',
  itemType: 'Faculty' | 'Department',
  itemName: string,
  locationName: string
) => {
  const isError = action === 'error';
  const isDelete = action === 'delete';
  
  const icon = isError ? 'error' : (isDelete ? 'warning' : 'success');
  const titleText = isError ? 'เกิดข้อผิดพลาด' : (isDelete ? 'ลบข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ');
  
  const actionText = isDelete 
    ? `<span style="color:#ef4444; font-weight:bold;">ลบ</span>` 
    : `<span style="color:#10b981; font-weight:bold;">เพิ่ม</span>`;
  const itemLabel = itemType === 'Faculty' ? 'คณะ' : 'สาขา';
  const locationLabel = itemType === 'Faculty' ? 'ที่' : 'ใน';

  const htmlContent = `
    <div class="text-sm text-gray-600 leading-relaxed">
       ${actionText} ${itemLabel} <b>${itemName}</b> <br/>
       ${locationLabel} <b>${locationName}</b> เรียบร้อยแล้ว
    </div>
  `;

  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#1f2937',
    customClass: {
      popup: 'rounded-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
      title: 'text-base font-bold text-gray-800',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  }).fire({
    icon: icon,
    title: titleText,
    html: htmlContent,
  });
};

// ==========================================
// 2. Sub-Components
// ==========================================

const FacultyCard = ({
  faculty,
  onDeleteFaculty,
  onAddDept,
  onDeleteDept,
}: {
  faculty: Faculty;
  onDeleteFaculty: (id: number, name: string, campus: string) => void;
  onAddDept: (f: Faculty) => void;
  onDeleteDept: (fid: number, did: number, dname: string, fname: string) => void;
}) => {
  const getBadgeColor = (campus: string) => {
    if (campus.includes("บางเขน")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (campus.includes("กำแพงแสน")) return "bg-orange-50 text-orange-600 border-orange-100";
    if (campus.includes("ศรีราชา")) return "bg-blue-50 text-blue-600 border-blue-100";
    return "bg-purple-50 text-purple-600 border-purple-100";
  };

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      
      {/* Header Section */}
      <div className="flex justify-between items-start gap-4 mb-6 relative z-10">
        <div className="flex gap-4 items-start flex-1">
          {/* Icon */}
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0 border border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <div className="flex flex-col min-w-0">
             {/* Campus Badge */}
            <span className={`self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border mb-2 ${getBadgeColor(faculty.campus_name)}`}>
                {faculty.campus_name}
            </span>
            {/* Faculty Name */}
            <h3 className="font-bold text-gray-800 text-lg leading-snug break-words">
              {faculty.faculty_name}
            </h3>
          </div>
        </div>

        {/* Delete Faculty Button */}
        <button 
          onClick={() => onDeleteFaculty(faculty.faculty_id, faculty.faculty_name, faculty.campus_name)}
          className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all shrink-0 active:scale-95"
          title="ลบคณะ"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="h-px bg-gray-50 mb-4"></div>

      {/* Departments List */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-[150px]">
        {faculty.departments.length > 0 ? (
          faculty.departments.map((dept) => (
            <div key={dept.department_id} className="group/item flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
               <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover/item:bg-blue-500 shrink-0 transition-colors"></div>
                  <span className="text-sm text-gray-600 font-medium group-hover/item:text-gray-900 break-words">{dept.department_name}</span>
               </div>
               <button 
                  onClick={() => onDeleteDept(faculty.faculty_id, dept.department_id, dept.department_name, faculty.faculty_name)}
                  className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover/item:opacity-100 shrink-0"
                  title="ลบสาขา"
               >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-xs font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200 py-6">
             ยังไม่มีสาขาวิชา
          </div>
        )}
      </div>

      {/* Add Department Button */}
      <button 
        onClick={() => onAddDept(faculty)}
        className="mt-6 w-full py-3 rounded-xl border border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wide"
      >
        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors text-[10px] shadow-sm">+</span>
        เพิ่มสาขาวิชา
      </button>
    </div>
  );
};

// ==========================================
// 5. Main Page
// ==========================================
export default function MasterDataPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCampus, setActiveCampus] = useState<string>("ทั้งหมด");
  const [modal, setModal] = useState<ModalState>({ 
    isOpen: false, type: "faculty", data: { name: "", campus: "" } 
  });

  // Init Data (Fetch from API)
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await masterDataService.getAllFaculties();
            setFaculties(data);
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'ไม่สามารถโหลดข้อมูลได้' });
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  // --- Logic for Filtering Dropdowns ---
  const availableOptions = useMemo(() => {
    if (!modal.isOpen) return [];

    if (modal.type === "faculty") {
        if (!modal.data.campus) return [];
        const masterList = KU_DATA[modal.data.campus] || [];
        const usedNames = faculties
            .filter(f => f.campus_name === modal.data.campus)
            .map(f => f.faculty_name);
        return masterList.filter(item => !usedNames.includes(item.faculty));
    } 
    else { 
        if (!modal.parentCampus || !modal.parentFacultyName) return [];
        const campusData = KU_DATA[modal.parentCampus] || [];
        const targetFaculty = campusData.find(f => f.faculty === modal.parentFacultyName);
        if (!targetFaculty) return [];

        const parentInstance = faculties.find(f => f.faculty_id === modal.parentId);
        const usedDeptNames = parentInstance?.departments.map(d => d.department_name) || [];

        return targetFaculty.departments.filter(deptName => !usedDeptNames.includes(deptName));
    }
  }, [modal, faculties]);

  // Handlers
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.data.name) return;

    try {
        if (modal.type === "faculty") {
            const newFaculty = await masterDataService.createFaculty(modal.data.name, modal.data.campus);
            setFaculties(prev => [...prev, newFaculty]);
            notify('add', 'Faculty', modal.data.name, modal.data.campus);
        } else {
            if (modal.parentId) {
                const newDept = await masterDataService.createDepartment(modal.parentId, modal.data.name);
                setFaculties(prev => prev.map(f => f.faculty_id === modal.parentId 
                    ? { ...f, departments: [...f.departments, newDept] } 
                    : f
                ));
                notify('add', 'Department', modal.data.name, modal.parentFacultyName || "-");
            }
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'บันทึกไม่สำเร็จ' });
    }
    
    setModal({ ...modal, isOpen: false });
  };

  const onDeleteFaculty = (id: number, name: string, campus: string) => {
    Swal.fire({
      title: `<span class="text-xl font-bold text-gray-800">ยืนยันการลบ?</span>`,
      html: `<div class="text-gray-500 text-sm">คุณต้องการลบ <b>${name}</b> <br/> ออกจาก <b>${campus}</b> ใช่หรือไม่?</div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      customClass: {
         popup: 'rounded-2xl',
         confirmButton: 'rounded-xl px-6 py-2.5 font-bold shadow-none',
         cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-gray-600 shadow-none hover:bg-gray-200'
      }
    }).then(async (res) => {
        if(res.isConfirmed) {
            try {
                await masterDataService.deleteFaculty(id);
                setFaculties(prev => prev.filter(f => f.faculty_id !== id));
                notify('delete', 'Faculty', name, campus);
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'ลบข้อมูลไม่สำเร็จ' });
            }
        }
    });
  };

  const onDeleteDept = (fid: number, did: number, dname: string, fname: string) => {
      Swal.fire({
          title: 'ยืนยันการลบ?',
          html: `ลบสาขา <b>${dname}</b> ออกจาก <b>${fname}</b>?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#f3f4f6',
          confirmButtonText: 'ลบ',
          cancelButtonText: 'ยกเลิก',
          customClass: { popup: 'rounded-2xl', cancelButton: 'text-gray-800' }
      }).then(async (res) => {
          if (res.isConfirmed) {
              try {
                  await masterDataService.deleteDepartment(did);
                  setFaculties(prev => prev.map(f => f.faculty_id === fid 
                      ? { ...f, departments: f.departments.filter(d => d.department_id !== did) } 
                      : f
                  ));
                  notify('delete', 'Department', dname, fname);
              } catch (error) {
                  Swal.fire({ icon: 'error', title: 'Error', text: 'ลบข้อมูลไม่สำเร็จ' });
              }
          }
      });
  };

  const filteredFaculties = activeCampus === "ทั้งหมด" ? faculties : faculties.filter(f => f.campus_name === activeCampus);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-800 font-sans pb-32">
        
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
           <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Master Data Management</h1>
              <p className="text-gray-500 font-medium">จัดการโครงสร้างข้อมูลคณะและสาขาวิชา</p>
           </div>
           <button 
             onClick={() => setModal({ isOpen: true, type: "faculty", data: { name: "", campus: "" } })} 
             className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
             เพิ่มคณะใหม่
           </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
           {["ทั้งหมด", ...Object.keys(KU_DATA)].map(campus => (
              <button 
                 key={campus}
                 onClick={() => setActiveCampus(campus)}
                 className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 
                    ${activeCampus === campus 
                        ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
              >
                 {campus}
              </button>
           ))}
        </div>

        {/* Content Grid */}
        {loading ? (
           <div className="text-center py-20 text-gray-400 animate-pulse">กำลังโหลดข้อมูล...</div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFaculties.map((f) => (
                 <FacultyCard 
                    key={f.faculty_id} 
                    faculty={f} 
                    onDeleteFaculty={onDeleteFaculty} 
                    onAddDept={(fac) => setModal({
                        isOpen: true, type: "department",
                        parentId: fac.faculty_id, parentCampus: fac.campus_name, parentFacultyName: fac.faculty_name,
                        data: { name: "", campus: "" }
                    })} 
                    onDeleteDept={onDeleteDept} 
                 />
              ))}
              {filteredFaculties.length === 0 && (
                 <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                    <p>ยังไม่มีข้อมูลในส่วนนี้</p>
                 </div>
              )}
           </div>
        )}
      </div>

      {/* --- Modal --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div 
             className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
             onClick={() => setModal({ ...modal, isOpen: false })}
           ></div>
           
           <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-white/50">
              
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                 <h3 className="text-xl font-bold text-gray-800">
                    {modal.type === "faculty" ? "เพิ่มคณะใหม่" : "เพิ่มสาขาวิชา"}
                 </h3>
                 <button onClick={() => setModal({ ...modal, isOpen: false })} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSave} className="p-8 space-y-5">
                 
                 {modal.type === "faculty" && (
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">วิทยาเขต</label>
                       <select 
                          className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                          required
                          value={modal.data.campus}
                          onChange={e => setModal({ ...modal, data: { ...modal.data, campus: e.target.value, name: "" } })}
                       >
                          <option value="">-- เลือกวิทยาเขต --</option>
                          {Object.keys(KU_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 )}

                 {modal.type === "department" && (
                     <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2">
                        <div className="text-xs text-blue-500 font-bold uppercase mb-1">กำลังเพิ่มสาขาใน</div>
                        <div className="text-sm font-semibold text-gray-700">{modal.parentFacultyName}</div>
                        <div className="text-xs text-gray-400">{modal.parentCampus}</div>
                     </div>
                 )}

                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                        ชื่อ{modal.type === "faculty" ? "คณะ" : "สาขาวิชา"}
                    </label>
                    <select 
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        disabled={modal.type === "faculty" && !modal.data.campus}
                        value={modal.data.name}
                        onChange={e => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })}
                    >
                        <option value="">-- เลือกรายการ --</option>
                        {availableOptions.map((item: any, i: number) => (
                           <option key={i} value={item.faculty || item}>
                              {item.faculty || item}
                           </option>
                        ))}
                    </select>
                    {availableOptions.length === 0 && (modal.type === 'department' || modal.data.campus) && (
                        <p className="text-xs text-orange-400 mt-1 ml-1">* ไม่พบรายการที่เลือกได้ หรือเพิ่มครบแล้ว</p>
                    )}
                 </div>

                 <button 
                    type="submit" 
                    disabled={!modal.data.name}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-3.5 font-bold text-sm shadow-lg shadow-blue-200 disabled:shadow-none transition-all active:scale-95 mt-4"
                 >
                    บันทึกข้อมูล
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}