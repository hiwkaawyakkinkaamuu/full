"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { z } from "zod"; 
import Swal from "sweetalert2";
import Sidebar from "@/components/Sidebar"; 

// ==========================================
// 1. Validation Schema (Zod)
// ==========================================
const TermSchema = z.object({
  year: z.number().or(z.string()).transform(String),
  semester: z.number().or(z.string()).transform(String)
});

type TermResponse = z.infer<typeof TermSchema>;

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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

        const response = await axios.get(`${apiUrl}/academic-years/current`, {
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
          marginLeft: isCollapsed ? "80px" : "280px", // ปรับความกว้างให้สอดคล้องกับ Sidebar ใหม่ (80px/280px)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className="flex-1 min-h-screen flex flex-col relative w-full"
      >
        
        {/* ==========================================
            Top Header (Glassmorphism + Emerald Theme)
           ========================================== */}
        <header className="sticky top-0 z-30 px-8 py-4 h-[90px] flex justify-end items-center bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm transition-all">
            
            {/* Status Badge */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                // Skeleton Loader
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
                // Actual Data Badge (Emerald Themed)
                <motion.div
                  key="loaded"
                  initial={{ scale: 0.9, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="group flex items-center gap-3 px-5 py-2.5 bg-white/90 hover:bg-white rounded-2xl border border-emerald-100/50 shadow-sm hover:shadow-emerald-100/50 hover:shadow-md transition-all duration-300 cursor-default"
                >
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-tr from-emerald-500 to-teal-500"></span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 font-medium text-xs uppercase tracking-wider">ปีการศึกษา/เทอม:</span>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 text-base">
                      {termData ? `${displayYear} / ${termData.semester}` : "N/A"}
                    </span>
                  </div>
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