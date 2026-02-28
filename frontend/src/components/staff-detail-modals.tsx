"use client";

interface Staff {
  id: number;
  name: string;
  faculty: string;
  department: string;
  role: string;
  email: string;
  phone?: string;
  position?: string;
  expertise?: string;
}

interface StaffDetailModal {
  isOpen: boolean;
  onClose: () => void;
  data: Staff | null;
}

export default function StaffDetailModal({ isOpen, onClose, data }: StaffDetailModal) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-blue-900">รายละเอียดบุคลากร</h3>
          <button onClick={onClose} className="text-blue-900 hover:bg-blue-200/50 rounded-full p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
               <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
                <p className="text-xl font-bold text-gray-800">{data.name}</p>
                <p className="text-blue-600 font-medium">{data.position || "อาจารย์"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500 text-xs uppercase">สังกัด</p><p>{data.faculty}</p></div>
            <div><p className="text-gray-500 text-xs uppercase">ภาควิชา</p><p>{data.department}</p></div>
            <div><p className="text-gray-500 text-xs uppercase">อีเมล</p><p>{data.email}</p></div>
            <div><p className="text-gray-500 text-xs uppercase">เบอร์โทร</p><p>{data.phone || "-"}</p></div>
          </div>
          {data.expertise && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="text-gray-500 text-xs uppercase mb-1">ความเชี่ยวชาญ</p>
                <p className="text-gray-700">{data.expertise}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}