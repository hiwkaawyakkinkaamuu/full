"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios"; 
import Swal from "sweetalert2";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Award, Users, Mail, ChevronDown, 
  ShieldCheck, AlertTriangle, Sparkles, CheckCircle2,
  Building2, GraduationCap, X, Edit2, Trash2, Plus, MapPin
} from "lucide-react";

// ==========================================
// 0. Configuration
// ==========================================

const ITEMS_PER_PAGE = 8;
const PREFIX_OPTIONS = ["นาย", "นาง", "นางสาว", "อ.", "ดร.", "ผศ.", "รศ.", "ศ.", "ผศ.ดร.", "รศ.ดร.", "ศ.ดร.", "-"];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// --- Interfaces ---
interface User {
  user_id: number;
  prefix?: string;
  firstname: string;
  lastname: string;
  email: string;
  password?: string;
  confirm_password?: string;
  role_id: number;
  role_name_th?: string;
  
  // Specific Fields
  campus_id?: number;
  student_number?: string;
  faculty_id?: number;
  department_id?: number;
  is_chairman?: boolean;
  
  organization_name?: string;
  organization_type?: string;
  organization_location?: string;
  organization_phone?: string;

  // Display only
  faculty_name?: string;
  department_name?: string;
  image_path?: string;
  provider?: string;
}

// --- Validation Schemas (Zod) ---
const UserSchema = z.object({
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อจริงหรือชื่อผู้ติดต่อ"),
  lastname: z.string().optional(), // เปลี่ยนเป็น optional เพราะองค์กรไม่มีนามสกุล
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  role_id: z.number().min(1, "กรุณาเลือกตำแหน่ง"),
  campus_id: z.number().min(1, "กรุณาเลือกวิทยาเขต"),
  
  password: z.string().optional(),
  confirm_password: z.string().optional(),
  
  student_number: z.string().optional(),
  faculty_id: z.number().optional(),
  department_id: z.number().optional(),
  organization_name: z.string().optional(),
  
  image_path: z.string().optional(),
}).superRefine((data, ctx) => {
  
  // บังคับนามสกุล สำหรับคนที่ไม่ใช่องค์กร
  if (data.role_id !== 8 && (!data.lastname || data.lastname.trim() === "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกนามสกุล", path: ["lastname"] });
  }

  // กฎตาม Role
  if (data.role_id === 1) { // Student
    if (!data.student_number || !/^\d{10}$/.test(data.student_number)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "รหัสนิสิตต้องเป็นตัวเลข 10 หลัก", path: ["student_number"] });
    }
    if (!data.faculty_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณาเลือกคณะ", path: ["faculty_id"] });
    if (!data.department_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณาเลือกสาขา", path: ["department_id"] });
  }

  if (data.role_id === 2) { // HOD
    if (!data.faculty_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณาเลือกคณะ", path: ["faculty_id"] });
    if (!data.department_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณาเลือกสาขา", path: ["department_id"] });
  }

  if (data.role_id === 3 || data.role_id === 4) { // Assoc Dean & Dean
    if (!data.faculty_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณาเลือกคณะ", path: ["faculty_id"] });
  }

  if (data.role_id === 8) { // Organization
    if (!data.organization_name) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกชื่อหน่วยงาน", path: ["organization_name"] });
  }
  
  // รหัสผ่าน
  if (data.password || data.confirm_password) {
      if (data.password !== data.confirm_password) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "รหัสผ่านไม่ตรงกัน", path: ["confirm_password"] });
      }
      if (data.password && data.password.length < 6) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร", path: ["password"] });
      }
  }
});

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    customClass: { popup: 'rounded-2xl shadow-xl border border-slate-100' }
});

// ==========================================
// 1. Helper Components
// ==========================================

const getRoleStyle = (roleId: number) => {
  const styles: Record<number, any> = {
    1: { icon: GraduationCap, style: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    2: { icon: Users, style: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    3: { icon: Users, style: "bg-sky-50 text-sky-700 border-sky-200" },
    4: { icon: Award, style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    5: { icon: ShieldCheck, style: "bg-blue-50 text-blue-700 border-blue-200" },
    6: { icon: Award, style: "bg-teal-50 text-teal-700 border-teal-200" },
    7: { icon: Users, style: "bg-purple-50 text-purple-700 border-purple-200" },
    8: { icon: Building2, style: "bg-rose-50 text-rose-700 border-rose-200" }
  };
  return styles[roleId] || { icon: Users, style: "bg-slate-100 text-slate-600 border-slate-200" };
};

const RoleBadge = ({ roleId, roleName }: { roleId: number, roleName: string }) => {
  const { icon: Icon, style } = getRoleStyle(roleId);
  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1.5 w-fit shadow-sm ${style}`}>
      <Icon className="w-3.5 h-3.5" />
      {roleName || "ไม่ระบุตำแหน่ง"}
    </span>
  );
};

const Avatar = ({ src, name }: { src?: string, name: string }) => {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name.replace('นาย', '').replace('นางสาว', '').replace('นาง', '').charAt(0) : '?';
  const colors = ['from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500', 'from-amber-400 to-orange-500', 'from-purple-400 to-violet-500'];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  
  return (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl text-white font-bold shadow-md bg-gradient-to-br ${colors[colorIndex]} overflow-hidden shrink-0 border border-white/20 ring-2 ring-slate-50`}>
      {!imgError && src ? (
        <img 
          src={src.startsWith('http') ? src : `${process.env.NEXT_PUBLIC_API_URL || ''}${src}`} 
          alt={name} 
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

// ==========================================
// 2. Main Page Component
// ==========================================

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, campusRes, facRes, deptRes] = await Promise.all([
        api.get(`${API_BASE_URL}/users`), 
        api.get(`${API_BASE_URL}/roles/`).catch(() => ({ data: { data: [] } })), 
        api.get(`${API_BASE_URL}/campus/`).catch(() => ({ data: { data: [] } })),
        api.get(`${API_BASE_URL}/faculty/`).catch(() => ({ data: { data: [] } })),
        api.get(`${API_BASE_URL}/department/`).catch(() => ({ data: { data: [] } }))
      ]);

      const rawUsers = usersRes.data?.data || usersRes.data || [];
      const rawRoles = rolesRes.data?.data || rolesRes.data || [];
      const rawCampuses = campusRes.data?.data || campusRes.data || [];
      const rawFaculties = facRes.data?.data || facRes.data || [];
      const rawDepartments = deptRes.data?.data || deptRes.data || [];

      setRoles(rawRoles);
      setCampuses(rawCampuses);
      setFaculties(rawFaculties);
      setDepartments(rawDepartments);
      
      const mapped = rawUsers.map((u: any) => {
        const role = rawRoles.find((r: any) => String(r.role_id) === String(u.role_id));
        const fac = rawFaculties.find((f: any) => String(f.faculty_id) === String(u.faculty_id));
        const dept = rawDepartments.find((d: any) => String(d.department_id) === String(u.department_id));

        return {
          user_id: u.user_id,
          prefix: u.prefix || "",
          firstname: u.firstname || "ไม่มีชื่อ",
          lastname: u.lastname || "",
          email: u.email || "-",
          role_id: u.role_id || 1,
          role_name_th: role ? role.role_name_th : "ไม่ระบุตำแหน่ง",
          campus_id: u.campus_id,
          faculty_id: u.faculty_id, 
          department_id: u.department_id,
          faculty_name: fac ? fac.faculty_name : "",
          department_name: dept ? dept.department_name : "",
          student_number: u.student_number || "",
          image_path: u.image_path || "",
          is_chairman: u.is_chairman || false,
          provider: u.provider
        };
      });
      setUsers(mapped);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลระบบได้', customClass: { popup: 'rounded-3xl' } });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ role_id: 1, campus_id: 1, prefix: "นาย", password: "", confirm_password: "", image_path: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode("edit");
    setFormData({ ...user, password: "", confirm_password: "" }); 
    setIsModalOpen(true);
  };

  const handleRoleChange = (roleIdStr: string) => {
      const roleId = Number(roleIdStr);
      setFormData(prev => ({ 
        ...prev, 
        role_id: roleId, 
        department_id: undefined, 
        faculty_id: undefined,
        // ถ้าเปลี่ยนเป็นองค์กร ให้เคลียร์คำนำหน้าและนามสกุลทิ้ง
        prefix: roleId === 8 ? "-" : (prev.prefix === "-" ? "นาย" : prev.prefix),
        lastname: roleId === 8 ? "-" : prev.lastname,
      }));
  };

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      html: `คุณกำลังจะลบบัญชีของ <br/><b class="text-rose-500 text-lg">${name}</b>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`${API_BASE_URL}/users/${id}`);
        setUsers(prev => prev.filter(u => u.user_id !== id));
        Toast.fire({ icon: 'success', title: 'ลบบัญชีสำเร็จ' });
      } catch (error: any) {
        Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: 'ระบบหลังบ้านอาจยังไม่รองรับการลบ', customClass: { popup: 'rounded-3xl' } });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modalMode === 'create' && (!formData.password || formData.password.trim() === '')) {
       return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากำหนดรหัสผ่านสำหรับบัญชีใหม่', confirmButtonColor: '#0f172a', customClass: { popup: 'rounded-3xl' } });
    }

    const validation = UserSchema.safeParse(formData);
    if (!validation.success) {
      const errorMsg = validation.error.issues[0].message;
      return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: errorMsg, confirmButtonColor: '#0f172a', customClass: { popup: 'rounded-3xl' } });
    }

    setIsSaving(true);
    try {
      // 🎯 สร้าง Payload
      const payload: any = { 
        email: formData.email,
        role_id: formData.role_id,
        campus_id: formData.campus_id,
        prefix: formData.role_id === 8 ? "-" : (formData.prefix || "นาย"),
        firstname: formData.firstname,
        lastname: formData.role_id === 8 ? "-" : formData.lastname,
      };

      if (formData.password) {
        payload.password = formData.password;
        payload.confirmPassword = formData.confirm_password; 
      }

      // 🎯 เงื่อนไขเฉพาะ Role
      if (formData.role_id === 1) { // Student
        payload.student_number = formData.student_number;
        payload.faculty_id = formData.faculty_id;
        payload.department_id = formData.department_id;
      } else if (formData.role_id === 2) { // HOD
        payload.faculty_id = formData.faculty_id;
        payload.department_id = formData.department_id;
      } else if (formData.role_id === 3 || formData.role_id === 4) { // Assoc Dean & Dean
        payload.faculty_id = formData.faculty_id;
      } else if (formData.role_id === 6) { // Committee
        payload.is_chairman = formData.is_chairman || false;
      } else if (formData.role_id === 8) { // Organization
        payload.organization_name = formData.organization_name;
        payload.organization_type = formData.organization_type;
        payload.organization_location = formData.organization_location;
        payload.organization_phone = formData.organization_phone;
      }

      if (modalMode === 'create') {
        await api.post(`${API_BASE_URL}/auth/register`, payload);
        Toast.fire({ icon: 'success', title: 'สร้างบัญชีสำเร็จ' });
      } else {
        await api.put(`${API_BASE_URL}/users/update/${formData.user_id}`, payload);
        Toast.fire({ icon: 'success', title: 'แก้ไขข้อมูลสำเร็จ' });
      }

      setIsModalOpen(false);
      fetchData();

    } catch (error: any) {
      console.error("🚨 Error Save:", error.response?.data);
      Swal.fire({ 
        icon: 'error', 
        title: 'บันทึกไม่สำเร็จ', 
        text: error.response?.data?.message || error.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 
        customClass: { popup: 'rounded-3xl' } 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const fullSearch = `${u.firstname} ${u.lastname} ${u.email} ${u.student_number || ''}`.toLowerCase();
      const matchSearch = fullSearch.includes(searchTerm.toLowerCase());
      const matchRole = filterRole === 'all' ? true : String(u.role_id) === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const visibleDepartments = departments.filter(d => String(d.faculty_id) === String(formData.faculty_id));

  // ==========================================
  // 3. Render UI
  // ==========================================

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 pb-36 font-sans text-slate-800 selection:bg-slate-200 selection:text-slate-900 relative">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold mb-3 border border-blue-200 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> ระบบจัดการส่วนกลาง
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">จัดการข้อมูลผู้ใช้งาน</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">กำหนดสิทธิ์การเข้าถึง และจัดการบัญชีบุคลากรภายในระบบ</p>
          </div>
          <button onClick={handleOpenCreate} className="group bg-slate-900 hover:bg-slate-800 text-white px-7 py-4 rounded-2xl font-bold shadow-md transition-all flex items-center gap-3 active:scale-95">
            <div className="bg-white/20 p-1 rounded-md group-hover:rotate-90 transition-transform"><Plus className="w-4 h-4" /></div> เพิ่มผู้ใช้งาน
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
                <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                <input type="text" placeholder="ค้นหาชื่อ, อีเมล, รหัสนิสิต..." className="w-full pl-14 pr-4 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-slate-400 text-slate-700" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="relative w-full md:w-72 group">
                <select className="w-full px-5 pr-12 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer appearance-none transition-all" value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}>
                    <option value="all">แสดงทุกตำแหน่ง</option>
                    {roles.map((r: any) => <option key={r.role_id} value={r.role_id}>{r.role_name_th}</option>)}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600" />
            </div>
        </div>

        {/* User Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {loading ? (
                [...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-200 flex items-start gap-5 animate-pulse shadow-sm">
                        <div className="w-14 h-14 bg-slate-200 rounded-2xl shrink-0"></div>
                        <div className="flex-1 space-y-3 w-full mt-2"><div className="w-1/2 h-4 bg-slate-200 rounded-lg"></div><div className="w-3/4 h-3 bg-slate-100 rounded-lg"></div></div>
                    </div>
                ))
            ) : paginatedUsers.length === 0 ? (
                <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-300 flex flex-col items-center justify-center shadow-sm">
                    <AlertTriangle className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">ไม่พบข้อมูลในระบบ</h3>
                </div>
            ) : (
                <AnimatePresence>
                    {paginatedUsers.map((user, index) => (
                        <motion.div key={user.user_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: index * 0.05 }} className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-6 overflow-hidden">
                            <div className="flex items-start gap-4 flex-1 min-w-0 z-10">
                                <Avatar src={user.image_path} name={`${user.firstname} ${user.lastname}`} />
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-[1.1rem] truncate group-hover:text-blue-700 transition-colors">
                                          {user.role_id === 8 
                                            ? `${user.firstname}` // หน่วยงาน ไม่แสดงคำนำหน้าและนามสกุล
                                            : `${user.prefix && user.prefix !== "-" ? user.prefix : ''}${user.firstname} ${user.lastname}`.trim()
                                          }
                                        </h3>
                                        {user.role_id === 1 && user.student_number && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono border border-slate-200 font-bold">{user.student_number}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" /> <span className="truncate">{user.email}</span>
                                    </div>
                                    <div className="pt-2 flex flex-col gap-2">
                                      <RoleBadge roleId={user.role_id} roleName={user.role_name_th || ""} />
                                      {(user.faculty_name || user.department_name) && (
                                        <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5 bg-slate-50 w-fit px-2 py-1 rounded-lg border border-slate-100">
                                            <Building2 className="w-3 h-3 text-slate-400" />
                                            {user.faculty_name} {user.department_name && <span className="text-slate-300">•</span>} {user.department_name}
                                        </p>
                                      )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:justify-start gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-5 shrink-0">
                                <button onClick={() => handleOpenEdit(user)} className="flex-1 sm:flex-none w-full p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold border border-slate-200 sm:border-transparent sm:bg-transparent"><Edit2 className="w-4 h-4" /><span className="sm:hidden">แก้ไข</span></button>
                                <button onClick={() => handleDelete(user.user_id, `${user.firstname} ${user.lastname}`)} className="flex-1 sm:flex-none w-full p-2.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold border border-slate-200 sm:border-transparent sm:bg-transparent"><Trash2 className="w-4 h-4" /><span className="sm:hidden">ลบ</span></button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-6 pb-4">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-300 shadow-sm font-bold text-sm text-slate-700">{currentPage} <span className="text-slate-400 font-normal mx-1">จาก</span> {totalPages}</div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative bg-white w-full max-w-xl h-auto max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
                
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 sticky top-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                          {modalMode === 'create' ? <Plus className="w-5 h-5 text-slate-700" /> : <Edit2 className="w-5 h-5 text-slate-700" />}
                          <h3 className="text-2xl font-black text-slate-900">{modalMode === 'create' ? 'สร้างบัญชีใหม่' : 'แก้ไขข้อมูลบัญชี'}</h3>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">กรอกข้อมูลให้ครบถ้วนเพื่อบันทึกเข้าสู่ระบบ</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                {/* Form Body */}
                <form id="userForm" onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
                    
                    {/* ข้อมูลส่วนตัว */}
                    <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 space-y-5">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> ข้อมูลส่วนตัวพื้นฐาน</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            
                            {/* ถ้าเป็นองค์กร ซ่อนคำนำหน้า */}
                            {formData.role_id !== 8 && (
                                <div className="sm:col-span-4 space-y-1.5">
                                    <label className="text-[13px] font-bold text-slate-600">คำนำหน้า</label>
                                    <div className="relative">
                                      <select className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:border-slate-400 outline-none transition-all appearance-none" value={formData.prefix || 'นาย'} onChange={e => setFormData({...formData, prefix: e.target.value})}>
                                        {PREFIX_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                      </select>
                                      <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* ชื่อจริง / ชื่อผู้ติดต่อ */}
                            <div className={formData.role_id === 8 ? "sm:col-span-12 space-y-1.5" : "sm:col-span-4 space-y-1.5"}>
                                <label className="text-[13px] font-bold text-slate-600">
                                    {formData.role_id === 8 ? "ชื่อผู้ติดต่อ / ตัวแทนองค์กร" : "ชื่อจริง"} <span className="text-red-500">*</span>
                                </label>
                                <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none transition-all" value={formData.firstname || ''} onChange={e => setFormData({...formData, firstname: e.target.value})} placeholder={formData.role_id === 8 ? "ชื่อตัวแทนผู้ประสานงาน" : "สมชาย"} />
                            </div>

                            {/* ถ้าเป็นองค์กร ซ่อนนามสกุล */}
                            {formData.role_id !== 8 && (
                                <div className="sm:col-span-4 space-y-1.5">
                                    <label className="text-[13px] font-bold text-slate-600">นามสกุล <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none transition-all" value={formData.lastname || ''} onChange={e => setFormData({...formData, lastname: e.target.value})} placeholder="ใจดี" />
                                </div>
                            )}
                      </div>

                      {/* ข้อมูลพิเศษสำหรับ Organization (Role 8) */}
                      {formData.role_id === 8 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-2 border-t border-slate-200 border-dashed">
                              <div className="space-y-1.5">
                                  <label className="text-[13px] font-bold text-slate-600">ชื่อองค์กร/มูลนิธิ <span className="text-red-500">*</span></label>
                                  <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none" value={formData.organization_name || ''} onChange={e => setFormData({...formData, organization_name: e.target.value})} placeholder="ระบุชื่อองค์กร" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[13px] font-bold text-slate-600">ประเภทองค์กร</label>
                                  <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none" value={formData.organization_type || ''} onChange={e => setFormData({...formData, organization_type: e.target.value})} placeholder="เช่น เอกชน, รัฐบาล" />
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                  <label className="text-[13px] font-bold text-slate-600">สถานที่ตั้ง</label>
                                  <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none" value={formData.organization_location || ''} onChange={e => setFormData({...formData, organization_location: e.target.value})} placeholder="สถานที่ตั้งองค์กร" />
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                  <label className="text-[13px] font-bold text-slate-600">เบอร์ติดต่อ</label>
                                  <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none" value={formData.organization_phone || ''} onChange={e => setFormData({...formData, organization_phone: e.target.value})} placeholder="เบอร์โทรศัพท์" />
                              </div>
                          </div>
                      )}
                    </div>

                    {/* บทบาทและสังกัด */}
                    <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 space-y-5">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" /> บทบาทและสังกัด</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-600">ตำแหน่ง (Role) <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <select className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-slate-400 outline-none transition-all font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 appearance-none" value={formData.role_id || ''} onChange={e => handleRoleChange(e.target.value)} disabled={modalMode === 'edit'}>
                                    <option value="" disabled>-- เลือกตำแหน่ง --</option>
                                    {roles.map((r: any) => <option key={r.role_id} value={r.role_id}>{r.role_name_th}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                          </div>
                          
                          <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> วิทยาเขต <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <select 
                                  className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-slate-400 outline-none transition-all font-medium appearance-none cursor-pointer" 
                                  value={formData.campus_id || ''} 
                                  onChange={e => setFormData({...formData, campus_id: Number(e.target.value)})}
                                  >
                                      <option value="" disabled>-- เลือกวิทยาเขต --</option>
                                      {/* แก้ไขให้รองรับทั้ง campusID (API ใหม่) และ campus_id */}
                                      {campuses.map((c: any) => (
                                          <option key={c.campusID || c.campus_id} value={c.campusID || c.campus_id}>
                                              {c.campusName || c.campus_name}
                                          </option>
                                      ))}
                                  </select>
                                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                          </div>
                      </div>

                      {/* เฉพาะ Committee (Role 6) - ประธาน */}
                      {formData.role_id === 6 && (
                          <div className="flex items-center gap-3 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                              <input type="checkbox" id="is_chairman" checked={formData.is_chairman || false} onChange={e => setFormData({...formData, is_chairman: e.target.checked})} className="w-5 h-5 text-teal-600 rounded border-teal-300 focus:ring-teal-500" />
                              <label htmlFor="is_chairman" className="text-[13px] font-bold text-slate-700 cursor-pointer select-none">กำหนดเป็นประธานกรรมการ</label>
                          </div>
                      )}

                      {/* เฉพาะ Student (Role 1) - รหัสนิสิต */}
                      {formData.role_id === 1 && (
                          <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-600">รหัสนิสิต <span className="text-red-500">*</span></label>
                              <input type="text" maxLength={10} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none font-mono placeholder-slate-300" value={formData.student_number || ''} onChange={e => setFormData({...formData, student_number: e.target.value.replace(/\D/g, "")})} placeholder="ตัวเลข 10 หลัก" />
                          </div>
                      )}

                      {/* เฉพาะ Role 1, 2, 3, 4 - คณะและสาขา */}
                      {[1, 2, 3, 4].includes(formData.role_id || 0) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                              <div className="space-y-1.5">
                                  <label className="text-[13px] font-bold text-slate-600">คณะ / สังกัดหลัก <span className="text-red-500">*</span></label>
                                  <div className="relative">
                                    <select className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-slate-400 outline-none transition-all font-medium appearance-none" value={formData.faculty_id || ''} onChange={e => setFormData({...formData, faculty_id: Number(e.target.value) || undefined, department_id: undefined})}>
                                        <option value="">-- เลือกคณะ --</option>
                                        {faculties.map((f: any) => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>
                              </div>

                              {/* สาขาแสดงเฉพาะ Role 1, 2 */}
                              {[1, 2].includes(formData.role_id || 0) && (
                                  <div className="space-y-1.5">
                                      <label className="text-[13px] font-bold text-slate-600">สาขา / ภาควิชา <span className="text-red-500">*</span></label>
                                      <div className="relative">
                                        <select className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-slate-400 outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400 appearance-none" value={formData.department_id || ''} onChange={e => setFormData({...formData, department_id: Number(e.target.value) || undefined})} disabled={!formData.faculty_id || visibleDepartments.length === 0}>
                                            <option value="">-- เลือกสาขา --</option>
                                            {visibleDepartments.map((d: any) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                                        </select>
                                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                    </div>

                    {/* บัญชีเข้าใช้งานระบบ */}
                    <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 space-y-5">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> บัญชีเข้าใช้งานระบบ</h4>
                      <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-600">อีเมล <span className="text-red-500">*</span></label>
                          <input type="email" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none transition-all placeholder:text-slate-300" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@ku.th" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-600">รหัสผ่าน {modalMode === 'create' && <span className="text-red-500">*</span>}</label>
                              <input type="password" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none transition-all placeholder:text-slate-300" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={modalMode === 'edit' ? "เว้นว่างไว้หากไม่เปลี่ยน" : "อย่างน้อย 6 ตัวอักษร"} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-600">ยืนยันรหัสผ่าน {modalMode === 'create' && <span className="text-red-500">*</span>}</label>
                              <input type="password" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-slate-400 outline-none transition-all placeholder:text-slate-300" value={formData.confirm_password || ''} onChange={e => setFormData({...formData, confirm_password: e.target.value})} placeholder="กรอกรหัสผ่านอีกครั้ง" />
                          </div>
                      </div>
                    </div>

                </form>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 z-10 sticky bottom-0">
                    <button onClick={() => setIsModalOpen(false)} type="button" className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-center">ยกเลิก</button>
                    <button form="userForm" type="submit" disabled={isSaving} className="w-full sm:w-auto px-10 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl shadow-md hover:bg-black transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2">
                        {isSaving ? (
                          <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> กำลังบันทึก...</>
                        ) : (
                          <><CheckCircle2 className="w-5 h-5" /> บันทึกข้อมูล</>
                        )}
                    </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}