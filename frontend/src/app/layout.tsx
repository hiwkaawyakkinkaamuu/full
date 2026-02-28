import "./globals.css";
import type { Metadata } from "next";
import { Sarabun, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext"; // เพิ่มการ Import

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบคัดเลือกนิสิตดีเด่น | มหาวิทยาลัยเกษตรศาสตร์",
  description: "Student Development Division Nomination System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth"> 
      <body
        className={`
          ${sarabun.className} ${geistSans.variable} ${geistMono.variable} 
          antialiased min-h-screen bg-[#F8F9FA] text-gray-900
          selection:bg-green-100 selection:text-green-800
        `}
      >
        {/* ครอบ children ด้วย AuthProvider */}
        <AuthProvider>
          <main className="relative flex flex-col min-h-screen">
              {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}