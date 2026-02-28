"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import Swal from "sweetalert2";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/axios";

import { 
  UserCheck, History, Award, Search, FileText, User, 
  CheckSquare, Users, Menu, X, LogOut, Landmark, BookOpen, 
  Phone, MapPin, Building2, Mail, ChevronRight, Sparkles
} from "lucide-react";

// ==========================================
// 1. Interfaces & Types
// ==========================================

type UserRole = 
  | "student" 
  | "head_of_department" 
  | "dean" 
  | "associate_dean" 
  | "chairman_of_student_development_committee" 
  | "student_development_committee" 
  | "student_development" 
  | "chancellor"
  | "organization";

interface Faculty { faculty_id?: number; facultyID?: number; faculty_name?: string; facultyName?: string; name?: string; }
interface Department { department_id?: number; departmentID?: number; department_name?: string; departmentName?: string; name?: string; }
interface Campus { campus_id?: number; campusID?: number; campus_name?: string; campusName?: string; }

interface OrganizationData {
  organization_id: number;
  user_id: number;
  organization_name: string;
  organization_type: string;
  organization_location: string;
  organization_phone: string;
}

interface UserProfileData {
  user_id: number;
  firstname: string;
  lastname: string;
  email: string;
  role_id: number;
  campus_id?: number;
  CampusID?: number;
  image_path?: string;
  Student?: any;
  student?: any;
  student_data?: any;
  Organization?: OrganizationData;
  organization?: OrganizationData;
  organization_data?: OrganizationData; 
  committee_data?: {
    is_chairman: boolean;
  };
  is_chairman?: boolean;
}

interface MenuItemType { href: string; label: string; icon: ReactNode; isAction?: boolean; }
interface SidebarProps { isCollapsed: boolean; toggleSidebar: () => void; }

// ==========================================
// 2. Constants & Helpers
// ==========================================


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const ROLE_NAMES_TH: Record<string, string> = {
  student: "นักศึกษา",
  head_of_department: "หัวหน้าภาควิชา",
  associate_dean: "รองคณบดี",
  dean: "คณบดี",
  student_development: "กองพัฒนานิสิต",
  student_development_committee: "คณะกรรมการ",
  chairman_of_student_development_committee: "ประธานคณะกรรมการ",
  chancellor: "อธิการบดี",
  organization: "หน่วยงานภายนอก"
};

const getProfileImageUrl = (imagePath: string | undefined | null) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${cleanPath}`;
};

const getRoleKey = (roleId: number | undefined, isChairman: boolean = false): UserRole => {
  switch (roleId) {
    case 1: return "student"; 
    case 2: return "head_of_department"; 
    case 3: return "associate_dean";
    case 4: return "dean"; 
    case 5: return "student_development"; 
    case 6: return isChairman ? "chairman_of_student_development_committee" : "student_development_committee";
    case 7: return "chancellor"; 
    case 8: return "organization";
    default: return "student";
  }
};

const iconProps = { className: "w-[18px] h-[18px] stroke-[2.5px]" };

const Icons = {
  CheckUser: <UserCheck {...iconProps} />,
  History: <History {...iconProps} />,
  Badge: <Award {...iconProps} />,
  Track: <Search {...iconProps} />,
  Edit: <FileText {...iconProps} />,
  User: <User {...iconProps} />,
  DocumentCheck: <CheckSquare {...iconProps} />,
  UsersGroup: <Users {...iconProps} />,
  Menu: <Menu className="w-5 h-5 stroke-[2.5px]" />,
  MenuClose: <X className="w-5 h-5 stroke-[2.5px]" />,
  Logout: <LogOut className="w-[18px] h-[18px] stroke-[2.5px]" />,
  Close: <X className="w-5 h-5 stroke-[2.5px]" />,
  School: <Landmark {...iconProps} />,
  BookOpen: <BookOpen {...iconProps} />,
  Phone: <Phone {...iconProps} />,
  MapPin: <MapPin {...iconProps} />,
  Building: <Building2 {...iconProps} />,
  Mail: <Mail {...iconProps} />
};

const MENU_CONFIG: Record<string, MenuItemType[]> = {
  student: [
    { href: "/student/main/student-nomination-form", label: "เสนอรายชื่อนิสิตดีเด่น", icon: Icons.Badge },
    { href: "/student/main/student-trace-and-details", label: "ติดตามและดูรายละเอียด", icon: Icons.Track },
  ],
  head_of_department: [
    { href: "/head-of-department/consider", label: "อนุมัติเห็นชอบ/ไม่ชอบ", icon: Icons.CheckUser },
    { href: "/head-of-department/consider-history", label: "ประวัติการพิจารณา", icon: Icons.History },
  ],
  dean: [
    { href: "/dean/consider", label: "อนุมัติเห็นชอบ/ไม่ชอบ", icon: Icons.CheckUser },
    { href: "/dean/consider-history", label: "ประวัติการพิจารณา", icon: Icons.History },
  ],
  associate_dean: [
    { href: "/associate-dean/consider", label: "อนุมัติเห็นชอบ/ไม่ชอบ", icon: Icons.CheckUser },
    { href: "/associate-dean/consider-history", label: "ประวัติการพิจารณา", icon: Icons.History },
  ],
  chairman_of_student_development_committee: [
    { href: "/chairman-of-student-development-committee/consider", label: "รับรองผลการคัดเลือก", icon: Icons.CheckUser }
  ],
  student_development_committee: [
    { href: "/student-development-committee/consider", label: "พิจารณาอนุมัติ/ไม่อนุมัติ", icon: Icons.CheckUser },
    { href: "/student-development-committee/consider-history", label: "ประวัติการพิจารณา", icon: Icons.History }
  ],
  student_development: [
    { href: "/student-development/verify-submit", label: "ตรวจสอบความถูกต้อง", icon: Icons.DocumentCheck },
    { href: "/student-development/history-verify-submit", label: "ประวัติการเเก้ไขประเภท", icon: Icons.History },
    { href: "/student-development/committee-setup", label: "จัดการคณะกรรมการ", icon: Icons.UsersGroup },
    { href: "/student-development/manage-account", label: "จัดการบัญชีผู้ใช้", icon: Icons.DocumentCheck },
    { href: "/student-development/setting", label: "ตั้งค่าช่วงเวลารับสมัคร", icon: Icons.History },
  ],
  chancellor: [
    { href: "/chancellor/dashboard", label: "หน้าหลัก", icon: Icons.Badge },
  ],
  organization: [
    { href: "/organization/main/organization-nomination-form", label: "เสนอรายชื่อนิสิตดีเด่น", icon: Icons.Badge },
    { href: "/organization/main/organization-trace-and-details", label: "ติดตามและดูรายละเอียด", icon: Icons.Track },
  ]
};

// ==========================================
// 3. Ultra-Premium UI Sub-Components
// ==========================================

function MenuItem({ href, label, icon, active, collapsed, onClick, index }: any) {
  return (
    <Link href={href} onClick={onClick} className="relative block mb-1.5 outline-none group/menu">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 24 }}
        className={`
            flex items-center px-3.5 py-3 rounded-[16px] text-[13.5px] font-semibold transition-all duration-500 cursor-pointer overflow-hidden relative z-10
            ${active ? 'text-white shadow-[0_6px_16px_-4px_rgba(20,184,166,0.4)]' : 'text-slate-500 hover:text-teal-800'}
            ${collapsed ? 'justify-center' : 'gap-3.5'}
        `}
      >
        {active && (
          <motion.div
            layoutId="active-menu-bg-magic"
            className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 rounded-[16px] -z-10"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          </motion.div>
        )}

        {!active && (
            <div className="absolute inset-0 bg-slate-100/60 rounded-[16px] opacity-0 group-hover/menu:opacity-100 transition-opacity duration-300 -z-10 backdrop-blur-md"></div>
        )}

        <span className={`relative z-10 shrink-0 transition-transform duration-500 ease-out 
            ${active ? 'text-white drop-shadow-md scale-110' : 'text-slate-400 group-hover/menu:text-teal-500 group-hover/menu:scale-110 group-hover/menu:rotate-[4deg]'}
        `}>
          {icon}
        </span>

        {!collapsed && (
          <span className="relative z-10 truncate tracking-wide flex-1">
              {label}
          </span>
        )}

        {!collapsed && active && (
            <motion.div initial={{ opacity:0, x: -10 }} animate={{ opacity:1, x: 0 }} className="shrink-0 text-white/80">
                <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
            </motion.div>
        )}

        {collapsed && (
            <div className="absolute left-[110%] ml-4 px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-300 whitespace-nowrap shadow-xl z-50">
                {label}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>
        )}
      </motion.div>
    </Link>
  )
}

const ProfileSkeleton = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <div className={`flex items-center gap-3 animate-pulse ${isCollapsed ? 'justify-center' : 'w-full'}`}>
    <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0"></div>
    {!isCollapsed && (
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 bg-slate-200 rounded-full w-2/3"></div>
        <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
      </div>
    )}
  </div>
);

function getOrganizationData(data: UserProfileData): OrganizationData | null {
  return data.organization_data || data.Organization || data.organization || null;
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function ProfileInfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative flex items-center gap-4 p-4 sm:p-5 bg-white/70 backdrop-blur-xl rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(20,184,166,0.08)] transition-all duration-300 group overflow-hidden"
    >
      <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 group-hover:animate-shine z-0"></div>
      
      <div className="relative z-10 w-[48px] h-[48px] rounded-[16px] bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100/50 flex items-center justify-center text-teal-600 shadow-[inset_0_2px_10px_rgba(255,255,255,1),0_4px_12px_rgba(20,184,166,0.1)] group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-500 shrink-0">
        {icon}
      </div>
      <div className="relative z-10 overflow-hidden flex-1">
        <p className="text-[10px] text-teal-600/70 uppercase font-black tracking-[0.2em] mb-1">{label}</p>
        <p className="text-[14px] text-slate-800 font-extrabold truncate leading-snug drop-shadow-sm">{value}</p>
      </div>
    </motion.div>
  );
}

// เพิ่ม Props roleNameTH เข้ามารับชื่อที่ประมวลผลเสร็จแล้วจาก Sidebar
function ProfileModal({ isOpen, onClose, data, faculties, departments, campuses, roleNameTH }: { isOpen: boolean; onClose: () => void; data: UserProfileData | null; faculties: Faculty[]; departments: Department[]; campuses: Campus[]; roleNameTH: string }) {
  if (!isOpen || !data) return null;

  const roleKey = getRoleKey(data.role_id, data.committee_data?.is_chairman || data.is_chairman || false);
  const isOrganization = roleKey === "organization" || data.role_id === 9;

  const userCampusId = data.campus_id || data.CampusID;
  const campus = campuses.find(c => c.campusID === userCampusId || c.campus_id === userCampusId);
  const campusName = campus ? (campus.campusName || campus.campus_name) : "ไม่ระบุวิทยาเขต";

  const orgData = getOrganizationData(data);
  const student = data.Student || data.student || data.student_data;
  const studentNumber = student?.student_number;

  let facultyName = student?.Faculty?.faculty_name || student?.faculty?.faculty_name || student?.Faculty?.facultyName;
  if (!facultyName && student?.faculty_id) {
      const found = faculties.find(f => f.faculty_id === Number(student.faculty_id) || f.facultyID === Number(student.faculty_id));
      facultyName = found ? (found.faculty_name || found.facultyName || found.name) : student.faculty_id;
  }

  let departmentName = student?.Department?.department_name || student?.department?.department_name || student?.Department?.departmentName;
  if (!departmentName && student?.department_id) {
      const found = departments.find(d => d.department_id === Number(student.department_id) || d.departmentID === Number(student.department_id));
      departmentName = found ? (found.department_name || found.departmentName || found.name) : student.department_id;
  }

  const imageUrl = getProfileImageUrl(data.image_path);

  return (
    <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden">
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes gradient-xy { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                .animate-gradient-xy { background-size: 400% 400%; animation: gradient-xy 12s ease infinite; }
                @keyframes shine { 100% { left: 200%; } }
                .animate-shine { animation: shine 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
            `}} />

            <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-slate-900/40"
                onClick={onClose}
            />
            
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30, rotateX: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative bg-slate-50/90 backdrop-blur-2xl rounded-[40px] shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_30px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden z-10 flex flex-col max-h-[92vh] perspective-[1000px]"
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-all duration-300 backdrop-blur-md shadow-sm hover:scale-110 hover:rotate-90 z-50"
                >
                    <X className="w-5 h-5 stroke-[2.5px]" />
                </button>

                <div className="overflow-y-auto custom-scrollbar flex-1 w-full relative">
                    
                    <div className="h-[150px] relative overflow-hidden shrink-0 animate-gradient-xy bg-gradient-to-br from-teal-400 via-emerald-600 to-cyan-500">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute -top-10 -right-10 w-48 h-48 bg-teal-300 rounded-full blur-[50px] mix-blend-lighten opacity-60"></div>
                        <div className="absolute top-20 -left-10 w-40 h-40 bg-emerald-300 rounded-full blur-[40px] mix-blend-lighten opacity-50"></div>
                    </div>

                    <div className="px-6 sm:px-8 pb-8 relative">
                        <div className="-mt-[65px] mb-5 flex justify-center relative z-20">
                            <motion.div 
                                initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type:"spring", delay: 0.1, stiffness: 300 }}
                                className="w-[120px] h-[120px] rounded-[32px] p-2 bg-white/60 backdrop-blur-xl shadow-[0_12px_40px_-10px_rgba(20,184,166,0.4)] rotate-3 hover:rotate-0 transition-transform duration-500"
                            >
                                <div className="w-full h-full rounded-[24px] overflow-hidden relative border-2 border-white shadow-inner bg-gradient-to-br from-teal-50 to-slate-100">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Profile" className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-700" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                    ) : null}
                                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 via-emerald-50 to-cyan-50 text-teal-600 text-5xl font-black drop-shadow-sm ${imageUrl ? 'hidden' : ''}`}>
                                        {isOrganization ? (orgData?.organization_name?.charAt(0) ?? "O") : (data.firstname ? data.firstname.charAt(0) : "U")}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                        
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-8">
                            <h2 className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight leading-tight px-2">
                              {isOrganization ? (orgData?.organization_name || data.firstname || "องค์กรภายนอก") : `${data.firstname} ${data.lastname}`}
                            </h2>
                            
                            <div className="flex flex-col items-center justify-center gap-2.5 mt-3">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full shadow-[0_4px_14px_rgba(20,184,166,0.25)]">
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                                        {/* ใช้ RoleName จาก API แทนของเดิม */}
                                        {roleNameTH}
                                    </span>
                                </div>
                                <span className="text-[12px] text-slate-500 font-bold flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-white shadow-sm mt-1">
                                    <MapPin className="w-3.5 h-3.5 text-teal-500" />
                                    {campusName}
                                </span>
                            </div>
                        </motion.div>

                        <motion.div 
                            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
                            initial="hidden" animate="visible"
                            className="space-y-3 relative z-10"
                        >
                            {isOrganization ? (
                              <>
                                <ProfileInfoRow icon={<Building2 {...iconProps} />} label="ชื่อองค์กร" value={orgData?.organization_name || "-"} />
                                <ProfileInfoRow icon={<Award {...iconProps} />} label="ประเภทของหน่วยงาน" value={orgData?.organization_type || "-"} />
                                <ProfileInfoRow icon={<Phone {...iconProps} />} label="เบอร์โทรศัพท์" value={orgData?.organization_phone || "-"} />
                                <ProfileInfoRow icon={<Mail {...iconProps} />} label="อีเมล" value={data.email || "-"} />
                                <ProfileInfoRow icon={<MapPin {...iconProps} />} label="ที่ตั้งหน่วยงาน" value={orgData?.organization_location || "-"} />
                              </>
                            ) : (
                              <>
                                <ProfileInfoRow icon={<Mail {...iconProps} />} label="อีเมลมหาวิทยาลัย" value={data.email || "-"} />
                                {studentNumber && <ProfileInfoRow icon={<User {...iconProps} />} label="รหัสนิสิต" value={studentNumber} />}
                                {facultyName && <ProfileInfoRow icon={<Landmark {...iconProps} />} label="คณะ" value={facultyName} />}
                                {departmentName && <ProfileInfoRow icon={<BookOpen {...iconProps} />} label="สาขาวิชา" value={departmentName} />}
                              </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    </AnimatePresence>
  );
}

// ==========================================
// 4. Main Sidebar Component
// ==========================================

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [fullProfile, setFullProfile] = useState<UserProfileData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [roleNameTH, setRoleNameTH] = useState("");

  const currentUserData = fullProfile || user;
  const isChairman = currentUserData?.committee_data?.is_chairman || currentUserData?.is_chairman || false;
  const roleKey = getRoleKey(currentUserData?.role_id, isChairman);
  const menuItems = MENU_CONFIG[roleKey] || [];

  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (pathname.startsWith(`${path}/`)) return true;
    return false;
  };

  const footerImageUrl = getProfileImageUrl(fullProfile?.image_path);

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            
            const [resMe, resFac, resDept, resRoles, resCampus] = await Promise.all([
                api.get(`${API_BASE_URL}/auth/me`, { headers }),
                api.get(`${API_BASE_URL}/faculty`, { headers }),
                api.get(`${API_BASE_URL}/department`, { headers }),
                api.get(`${API_BASE_URL}/roles`, { headers }),
                api.get(`${API_BASE_URL}/campus`, { headers })
            ]);

            const fetchedUser = resMe.data?.user || resMe.data;
            if(fetchedUser) setFullProfile(fetchedUser);
            if(resFac.data) setFaculties(resFac.data.data || resFac.data);
            if(resDept.data) setDepartments(resDept.data.data || resDept.data);
            if(resCampus.data) setCampuses(resCampus.data.data || resCampus.data);

            const fetchedIsChairman = fetchedUser?.committee_data?.is_chairman || fetchedUser?.is_chairman || false;
            const targetRoleId = fetchedUser?.role_id || user.role_id;
            
            // Logic ใหม่: ดึงข้อมูลชื่อ Role จาก API (Fallback หากไม่มีชื่อไทยให้ใช้ชื่ออังกฤษ หรือ Map หน้าบ้าน)
            const rolesList = resRoles.data?.data || resRoles.data || [];
            const currentRole = rolesList.find((r: any) => r.role_id === targetRoleId || r.id === targetRoleId);
            
            let displayRoleName = "";

            if (targetRoleId === 6 && fetchedIsChairman) {
                // ถ้าเป็น Role 6 แต่เป็นประธาน ต้อง Map เอง เพราะใน DB อาจมีแค่ชื่อกรรมการธรรมดา
                displayRoleName = ROLE_NAMES_TH["chairman_of_student_development_committee"];
            } else if (currentRole) {
                // พยายามดึงชื่อจาก API (ลองรองรับหลายๆ Key เผื่อโครงสร้าง Backend มีการเปลี่ยนแปลง)
                displayRoleName = currentRole.role_name_th || currentRole.role_name || currentRole.name || "";
            }
            
            // Fallback ถ้ายิง API มาแล้วไม่เจอชื่อ หรือยังว่างอยู่ ให้ใช้ MAP จากหน้าบ้าน
            if (!displayRoleName) {
                displayRoleName = ROLE_NAMES_TH[getRoleKey(targetRoleId, fetchedIsChairman)] || "ไม่ทราบสิทธิ์";
            }

            setRoleNameTH(displayRoleName);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            // @ts-ignore
            setFullProfile(user); 
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [user]);

  const confirmLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ',
      text: "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#f1f5f9',
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: '<span class="text-slate-600">ยกเลิก</span>',
      customClass: {
         popup: 'rounded-[32px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] font-sans border border-white/50 backdrop-blur-xl bg-white/90',
         title: 'text-[22px] font-black text-slate-800 tracking-tight',
         confirmButton: 'rounded-[14px] px-7 py-3 font-bold shadow-[0_8px_20px_rgba(15,118,110,0.25)] hover:shadow-[0_12px_24px_rgba(15,118,110,0.35)] hover:-translate-y-1 transition-all text-white',
         cancelButton: 'rounded-[14px] px-7 py-3 font-bold text-slate-600 hover:bg-slate-200 transition-all'
      }
    }).then((result) => {
      if (result.isConfirmed) logout();
    });
  };

  return (
    <>
      <ProfileModal 
        isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} 
        data={fullProfile} faculties={faculties} departments={departments} campuses={campuses}
        roleNameTH={roleNameTH} // ส่งชื่อเข้าไปให้ Profile Modal ใช้งานโดยตรง
      />

      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 86 : 280 }}
        transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
        className="bg-white/95 backdrop-blur-3xl h-screen fixed left-0 top-0 flex flex-col z-[60] border-r border-slate-200/80 shadow-[8px_0_40px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="h-[90px] flex items-center justify-between px-5 shrink-0 relative z-20 bg-transparent">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
              >
                <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-400 flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_rgba(20,184,166,0.3)] border border-teal-300 relative overflow-hidden group/logo">
                   <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full group-hover/logo:animate-shine"></div>
                   <Award className="w-[22px] h-[22px] stroke-[2.5px] relative z-10" />
                </div>
                <div className="flex flex-col">
                   <h1 className="font-black text-[16.5px] text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight leading-tight">ระบบนิสิตดีเด่น</h1>
                   <span className="text-[9px] text-teal-600 font-extrabold uppercase tracking-[0.15em] mt-0.5">มหาวิทยาลัยเกษตรศาสตร์</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSidebar}
            className={`p-2.5 rounded-xl text-slate-400 bg-white border border-slate-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 hover:shadow-[0_6px_12px_rgba(20,184,166,0.12)] transition-all duration-300 absolute ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-4'} shadow-sm`}
          >
            {isCollapsed ? <Menu className="w-[18px] h-[18px] stroke-[2.5px]" /> : <X className="w-[18px] h-[18px] stroke-[2.5px]" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 z-10 relative">
          <div className="absolute top-20 left-10 w-32 h-32 bg-teal-50/50 rounded-full blur-3xl -z-10"></div>
          <nav className="space-y-1">
            {menuItems.map((item, index) => (
              <MenuItem
                key={item.href} index={index} href={item.href} label={item.label}
                active={isActive(item.href)} icon={item.icon} collapsed={isCollapsed}
              />
            ))}
          </nav>
        </div>

        <div className="p-4 z-20 shrink-0">
          <div
            onClick={() => !loading && setIsProfileOpen(true)}
            className={`
                group relative flex items-center rounded-[24px] cursor-pointer transition-all duration-500 bg-white/90 backdrop-blur-xl border border-white shadow-[0_6px_20px_rgba(0,0,0,0.04)]
                ${isCollapsed 
                    ? 'justify-center p-2.5 hover:shadow-[0_8px_24px_rgba(20,184,166,0.15)] hover:border-teal-200' 
                    : 'p-3 hover:shadow-[0_16px_30px_-8px_rgba(20,184,166,0.25)] hover:border-teal-200 hover:-translate-y-1'
                }
            `}
          >
            {loading ? (
              <ProfileSkeleton isCollapsed={isCollapsed} />
            ) : (
              <>
                <div className="relative shrink-0">
                   <div className="w-[44px] h-[44px] rounded-[16px] p-[2px] bg-gradient-to-br from-teal-300 via-emerald-400 to-cyan-300 shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                      <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                          {footerImageUrl ? (
                              <img src={footerImageUrl} alt="User" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                          ) : null}
                          <span className={`text-[16px] font-black text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-emerald-600 drop-shadow-sm ${footerImageUrl ? 'hidden' : ''}`}>
                            {roleKey === "organization" || user?.role_id === 9
                              ? (getOrganizationData(fullProfile!)?.organization_name?.charAt(0) ?? "O")
                              : (fullProfile?.firstname?.charAt(0) || 'U')
                            }
                          </span>
                      </div>
                   </div>
                   <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[2.5px] border-white rounded-full shadow-[0_0_6px_rgba(16,185,129,0.5)]"></div>
                </div>

                {!isCollapsed && (
                  <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="ml-3 flex-1 min-w-0">
                    <p className="text-[14px] font-black text-slate-800 truncate group-hover:text-teal-700 transition-colors">
                      {roleKey === "organization" || user?.role_id === 9
                        ? (getOrganizationData(fullProfile!)?.organization_name || fullProfile?.firstname || "หน่วยงานภายนอก")
                        : `${fullProfile?.firstname} ${fullProfile?.lastname}`
                      }
                    </p>
                    <p className="text-[10px] text-slate-400 truncate font-extrabold uppercase tracking-widest mt-0.5">
                      {roleNameTH}
                    </p>
                  </motion.div>
                )}

                {!isCollapsed && (
                   <button 
                      onClick={(e) => { e.stopPropagation(); confirmLogout(); }}
                      className="ml-1 p-2 rounded-[12px] text-slate-300 hover:bg-rose-50 hover:text-rose-500 hover:shadow-inner border border-transparent transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
                      title="ออกจากระบบ"
                   >
                      <LogOut className="w-[18px] h-[18px] stroke-[2.5px]" />
                   </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}