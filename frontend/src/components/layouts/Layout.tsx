"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/axios";
import { z } from "zod"; 
import Swal from "sweetalert2";
import Sidebar from "@/components/Sidebar"; 
import { CalendarDays } from "lucide-react";

// ==========================================
// 1. Validation Schema (Zod)
// ==========================================
const TermSchema = z.object({
  year: z.number().or(z.string()).transform(String),
  semester: z.number().or(z.string()).transform(String),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable()
});

type TermResponse = z.infer<typeof TermSchema>;

// ฟังก์ชันแปลงวันที่ให้เป็นรูปแบบทางการ (เช่น 1 สิงหาคม 2567)
const formatFormalDate = (dateStr: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
  });
};

// ==========================================
// 2. Main Layout Component
// ==========================================

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- UI States ---
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [termData, setTermData] = useState<TermResponse | null>(null);

  const displayYear = termData ? (parseInt(termData.year) + 543) : "N/A";

  // --- API Handling ---
  useEffect(() => {
    const fetchTermData = async () => {
      setIsLoading(true);
      
      try {
        const token = localStorage.getItem("token");
        // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

        const response = await api.get(`/academic-years/current`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 5000, 
        });

        const backendData = response.data.data;

        if (!backendData) {
            throw new Error("No data received from backend");
        }

        const validatedData = TermSchema.parse(backendData);
        setTermData(validatedData);

      } catch (error: any) {
        console.error("Error fetching term:", error);

        if (error.response?.status !== 404) {
             const isNetworkError = error.code === "ERR_NETWORK" || error.response?.status >= 500;
             if (isNetworkError) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "warning",
                    title: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
                    text: "แสดงข้อมูลปีการศึกษาเริ่มต้น",
                    showConfirmButton: false,
                    timer: 3000,
                    customClass: { popup: "font-sans text-sm rounded-xl shadow-lg" }
                });
             }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTermData();
  }, []);

  // --- Render UI ---
  return (
    <div className="flex min-h-screen bg-[#F8F9FC] font-sans text-slate-800 overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Container */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: isCollapsed ? "80px" : "280px", 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className="flex-1 min-h-screen flex flex-col relative w-full"
      >
        
        {/* ==========================================
            Top Header (Glassmorphism + Emerald Theme)
           ========================================== */}
        <header className="sticky top-0 z-30 px-8 py-4 h-[90px] flex justify-end items-center bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm transition-all">
            
            {/* Status & Period Badge (Formal & Elegant) */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-full border border-gray-100 shadow-sm"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
                </motion.div>
              ) : (
                <motion.div
                  key="loaded"
                  initial={{ scale: 0.9, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center bg-white/95 rounded-full border border-emerald-100/60 shadow-sm hover:shadow-md transition-all duration-300 cursor-default p-1.5"
                >
                  {/* ส่วนแสดงเทอมและปีการศึกษา (เน้นความทางการ) */}
                  <div className="flex items-center gap-2.5 px-4 py-1.5 bg-emerald-50/50 rounded-full">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500"></span>
                    </div>
                    <span className="font-bold text-emerald-800 text-sm tracking-wide">
                      {termData ? `ปีการศึกษา ${displayYear} ภาคเรียนที่ ${termData.semester}` : "ไม่มีข้อมูลปีการศึกษา"}
                    </span>
                  </div>

                  {/* ส่วนแสดงช่วงเวลาเปิดรับสมัครแบบทางการ */}
                  {termData?.start_date && termData?.end_date && (
                    <>
                      <div className="w-px h-5 bg-gray-200 mx-2"></div>
                      <div className="flex items-center gap-2 px-3 pr-4 text-slate-600">
                        <CalendarDays size={16} className="text-emerald-500" />
                        <span className="text-sm font-medium">
                          เปิดรับสมัคร: <span className="font-bold text-slate-800">{formatFormalDate(termData.start_date)}</span>
                          <span className="mx-2 text-slate-400">-</span>
                          <span className="font-bold text-slate-800">{formatFormalDate(termData.end_date)}</span>
                        </span>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
        </header>

        {/* ==========================================
            Page Content Area
           ========================================== */}
        <div className="p-6 md:p-10 w-full max-w-[1920px] mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="w-full"
          >
             {children}
          </motion.div>
        </div>

        {/* Decorative Background Elements (Emerald Theme) */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-50/40 blur-3xl opacity-60" />
            <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-teal-50/40 blur-3xl opacity-50" />
        </div>

      </motion.main>
    </div>
  );
}