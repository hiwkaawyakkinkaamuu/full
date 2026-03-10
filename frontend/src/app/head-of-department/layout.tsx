import RoleGuard from "@/components/auth/RoleGuard"; // Import เข้ามา
import StudentFormLayout from "@/components/layouts/Layout"; // Layout ความสวยงามเดิมของคุณ

export default function HeadOfDepartmentRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ครอบด้วย RoleGuard และระบุว่าหน้านี้ให้เข้าได้เฉพาะ "head_of_department"
    <RoleGuard allowedRoles={['head_of_department']}>
        <StudentFormLayout>
            {children}
        </StudentFormLayout>
    </RoleGuard>
  );
}