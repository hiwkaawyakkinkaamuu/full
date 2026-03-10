import RoleGuard from "@/components/auth/RoleGuard"; // Import เข้ามา
import StudentFormLayout from "@/components/layouts/Layout"; // Layout ความสวยงามเดิมของคุณ

export default function AssociateDeanRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ครอบด้วย RoleGuard และระบุว่าหน้านี้ให้เข้าได้เฉพาะ "associate_dean"
    <RoleGuard allowedRoles={['associate_dean']}>
        <StudentFormLayout>
            {children}
        </StudentFormLayout>
    </RoleGuard>
  );
}