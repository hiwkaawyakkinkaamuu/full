"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios"; 
import Swal from "sweetalert2";
import { 
  Search, Award, Users, Mail, ChevronDown, 
  ShieldCheck, AlertTriangle, Sparkles, CheckCircle2 
} from "lucide-react";

// ==========================================
// 0. Configuration & Types
// ==========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type CommitteeRole = "none" | "committee" | "chairman";

interface Staff {
  id: number;
  name: string;
  role: CommitteeRole;
  email: string;
  image_path?: string;
  provider?: string;
}

// ==========================================
// 1. Components
// ==========================================

const RoleBadge = ({ role }: { role: CommitteeRole }) => {
  if (role === 'chairman') {
    return (
      <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center gap-1.5 w-fit mx-auto transition-transform hover:scale-105">
        <Award className="w-3.5 h-3.5" />
        ประธานกรรมการ
      </span>
    );
  }
  if (role === 'committee') {
    return (
      <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-1.5 w-fit mx-auto transition-transform hover:scale-105">
        <ShieldCheck className="w-3.5 h-3.5" />
        กรรมการ
      </span>
    );
  }
  return (
    <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center w-fit mx-auto">
      - ว่าง -
    </span>
  );
};

// Avatar Component (Handle missing/broken images with Initials)
const Avatar = ({ src, name, role }: { src?: string, name: string, role: string }) => {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name.replace('นาย', '').replace('นางสาว', '').replace('นาง', '').charAt(0) : '?';
  
  const ringColor = role === 'chairman' ? 'ring-orange-400' : role === 'committee' ? 'ring-blue-400' : 'ring-slate-200';

  return (
    <div className={`relative w-12 h-12 rounded-full ring-2 ring-offset-2 ${ringColor} bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg overflow-hidden flex-shrink-0 shadow-sm`}>
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

const SkeletonLoader = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-6 animate-pulse shadow-sm">
        <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
          <div className="h-3 bg-slate-200 rounded-md w-1/4"></div>
        </div>
        <div className="w-32 h-10 bg-slate-200 rounded-xl"></div>
      </div>
    ))}
  </div>
);

// ==========================================
// 2. Main Page Component
// ==========================================

export default function CommitteeSetupPage() {
  
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersRes = await api.get(`${API_BASE_URL}/users/`);
        const rawUsers = usersRes.data?.data || usersRes.data || [];

        const staffs = rawUsers.filter((u: any) => u.role_id === 6);
        
        const detailedStaffs = await Promise.all(
          staffs.map(async (u: any) => {
            try {
              const infoRes = await api.get(`${API_BASE_URL}/users/info/${u.user_id}`);
              const info = infoRes.data?.data || infoRes.data || {};
              return { ...u, ...info };
            } catch (err) {
              return u; 
            }
          })
        );

        const mappedStaffs = detailedStaffs.map((u: any) => {
          let role: CommitteeRole = "committee"; 
          
          const isChair = u.is_chairman === true || u.is_chairman === 1 || 
                          u.committee_data?.is_chairman === true || u.committee_data?.is_chairman === 1 ||
                          u.CommitteeData?.is_chairman === true; 

          if (isChair) {
              role = "chairman";
          }

          return {
            id: u.user_id,
            name: `${u.prefix || ''}${u.firstname} ${u.lastname}`.trim(),
            role: role,
            email: u.email,
            image_path: u.image_path,
            provider: u.provider
          };
        });

        mappedStaffs.sort((a: Staff, b: Staff) => {
          if (a.role === 'chairman') return -1;
          if (b.role === 'chairman') return 1;
          return 0;
        });

        setStaffList(mappedStaffs);
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้', confirmButtonColor: '#3b82f6' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Computed Stats ---
  const chairman = staffList.find(s => s.role === 'chairman');
  const committeeCount = staffList.filter(s => s.role === 'committee').length;

  // --- Filters ---
  const filteredList = useMemo(() => {
    return staffList.filter(staff => {
      const matchSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          staff.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === 'all' ? true : staff.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [staffList, searchTerm, filterRole]);

  // --- Handlers ---
  const handleRoleChange = (id: number, newRole: CommitteeRole) => {
    setStaffList(prev => {
      let updated = [...prev];
      if (newRole === 'chairman') {
        updated = updated.map(s => s.role === 'chairman' ? { ...s, role: 'committee' } : s);
      }
      return updated.map(s => s.id === id ? { ...s, role: newRole } : s);
    });
  };

  const handleSave = async () => {
    if (!chairman) {
      return Swal.fire({ 
          icon: 'warning', 
          title: 'ข้อมูลไม่ครบถ้วน', 
          text: 'กรุณาแต่งตั้ง "ประธานคณะกรรมการ" อย่างน้อย 1 ท่าน', 
          confirmButtonColor: '#f59e0b' 
      });
    }

    const result = await Swal.fire({
      title: 'ยืนยันการแต่งตั้ง?',
      html: `
        <div class="text-left text-sm bg-slate-50 p-5 rounded-2xl border border-slate-100 mt-2">
          <p class="mb-2 flex items-center gap-2"><strong class="text-slate-700">ประธาน:</strong> <span class="text-orange-600 font-bold">${chairman.name}</span></p>
          <p class="flex items-center gap-2"><strong class="text-slate-700">กรรมการ:</strong> <span class="text-blue-600 font-bold">${committeeCount} ท่าน</span></p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยันและบันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-3xl' }
    });

    if (result.isConfirmed) {
      setSaving(true);
      try {
        const updatePromises = staffList.map(staff => {
          if (staff.role === 'chairman') {
            return api.put(`/users/promote-chairman/${staff.id}`);
          } else if (staff.role === 'committee') {
            return api.put(`/users/update/${staff.id}`, { role_id: 6, is_chairman: false });
          } else {
            return api.put(`/users/update/${staff.id}`, { role_id: 2, is_chairman: false });
          }
        });

        await Promise.all(updatePromises);
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
        
      } catch (error: any) {
        Swal.fire({ 
          icon: 'error', 
          title: 'บันทึกไม่สำเร็จ', 
          text: error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์',
          confirmButtonColor: '#3b82f6'
        });
      } finally {
        setSaving(false);
      }
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F4F7FC] p-6 md:p-10 pb-36 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Background Decorators */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none -z-10"></div>
      
      <style jsx global>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-10 animate-slide-up">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          {/* Header Section */}
          <div className="flex flex-col gap-2 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold mb-3 border border-blue-200 shadow-sm">
                <Sparkles className="w-4 h-4" />ระบบจัดการประธานและกรรมการพิจารณานิสิตดีเด่น
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">จัดการประธานคณะกรรมการ</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">ตั้งค่าบทบาทประธานและกรรมการพิจารณานิสิตดีเด่น เพื่อกำหนดสิทธิ์ในการจัดการระบบ</p>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chairman Card */}
          <div className={`relative overflow-hidden p-8 rounded-[2rem] border transition-all duration-500 flex items-center gap-6 shadow-sm hover:shadow-xl
            ${chairman ? 'bg-white border-orange-100 shadow-orange-100/50' : 'bg-slate-50/50 border-dashed border-slate-300'}
          `}>
            {chairman && <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/5 rounded-full blur-3xl"></div>}
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-colors duration-500
              ${chairman ? 'bg-gradient-to-br from-orange-100 to-rose-100 text-orange-600' : 'bg-slate-200 text-slate-400'}
            `}>
              <Award className="w-8 h-8" />
            </div>
            <div className="z-10">
              <p className="text-sm text-slate-500 uppercase font-black tracking-widest mb-1">ประธานคณะกรรมการ</p>
              <p className={`text-2xl font-extrabold ${chairman ? 'text-slate-800' : 'text-slate-400'}`}>
                {chairman ? chairman.name : "ยังไม่ได้ระบุ"}
              </p>
            </div>
          </div>

          {/* Committee Card */}
          <div className="relative overflow-hidden p-8 rounded-[2rem] bg-white border border-blue-50 shadow-sm hover:shadow-xl shadow-blue-100/50 transition-all duration-500 flex items-center gap-6">
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-3xl"></div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center shadow-inner">
              <Users className="w-8 h-8" />
            </div>
            <div className="z-10">
              <p className="text-sm text-slate-500 uppercase font-black tracking-widest mb-1">จำนวนกรรมการทั้งหมด</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">
                  {committeeCount + (chairman ? 1 : 0)}
                </p>
                <p className="text-slate-500 font-medium">ท่าน</p>
              </div>
            </div>
          </div>

        </div>

        {/* Toolbar (Search & Filter) */}
        <div className="bg-white/80 backdrop-blur-xl p-3 rounded-[1.5rem] shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-3 sticky top-4 z-20">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ อีเมล..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
             <select 
              className="w-full pl-4 pr-10 py-3.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 cursor-pointer text-slate-700 font-medium appearance-none transition-all"
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="all">แสดงทุกตำแหน่ง</option>
              <option value="chairman">ประธานเท่านั้น</option>
              <option value="committee">กรรมการทั่วไป</option>
            </select>
            <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Staff List (Card-based Table) */}
        <div>
          {/* Table Headers (Visible only on lg screens) */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            <div className="col-span-4">รายชื่อกรรมการ</div>
            <div className="col-span-4">ข้อมูลติดต่อ</div>
            <div className="col-span-2 text-center">บทบาทปัจจุบัน</div>
            <div className="col-span-2 text-center">ตั้งค่าสิทธิ์</div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <SkeletonLoader />
            ) : filteredList.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200 flex flex-col items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">ไม่พบรายชื่อกรรมการในระบบ</p>
              </div>
            ) : (
              filteredList.map((staff, idx) => (
                <div 
                  key={staff.id} 
                  className={`group bg-white rounded-2xl p-4 lg:p-5 border transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5
                    ${staff.role === 'chairman' ? 'border-orange-200/60 shadow-sm shadow-orange-100/50 bg-orange-50/10' : 'border-slate-100'}
                  `}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    
                    {/* Column 1: Profile */}
                    <div className="col-span-1 lg:col-span-4 flex items-center gap-4">
                      <Avatar src={staff.image_path} name={staff.name} role={staff.role} />
                      <div>
                        <div className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{staff.name}</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">ID: {staff.id}</div>
                      </div>
                    </div>

                    {/* Column 2: Contact Info (Replaced Faculty) */}
                    <div className="col-span-1 lg:col-span-4 flex flex-col justify-center gap-1.5 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-400">
                           <Mail className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium truncate">{staff.email}</span>
                      </div>
                    </div>

                    {/* Column 3: Current Role */}
                    <div className="col-span-1 lg:col-span-2 flex justify-start lg:justify-center py-2 lg:py-0">
                      <RoleBadge role={staff.role} />
                    </div>

                    {/* Column 4: Action */}
                    <div className="col-span-1 lg:col-span-2 flex justify-end lg:justify-center">
                      <div className="relative w-full sm:w-48 lg:w-full">
                        <select 
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff.id, e.target.value as CommitteeRole)}
                          className={`
                            w-full pl-4 pr-10 py-2.5 rounded-xl text-sm font-bold border outline-none cursor-pointer appearance-none transition-all shadow-sm
                            ${staff.role === 'chairman' 
                              ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100/50 focus:ring-2 focus:ring-orange-200' 
                              : staff.role === 'committee'
                              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/50 focus:ring-2 focus:ring-blue-200'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 focus:ring-2 focus:ring-slate-200'
                            }
                          `}
                        >
                          <option value="none">--- ถอดถอน ---</option>
                          <option value="committee">กรรมการ</option>
                          <option value="chairman">ประธานกรรมการ</option>
                        </select>
                        <ChevronDown className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none 
                          ${staff.role === 'chairman' ? 'text-orange-500' : staff.role === 'committee' ? 'text-blue-500' : 'text-slate-400'}
                        `} />
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500 z-40 
        ${saving ? 'scale-95 opacity-90' : 'scale-100 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20'}`}
      >
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 transition-colors active:scale-95 disabled:cursor-wait disabled:opacity-70 border border-slate-700/50"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              กำลังบันทึกข้อมูล...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              ยืนยันการบันทึกตำแหน่ง
            </>
          )}
        </button>
      </div>

    </div>
  );
}