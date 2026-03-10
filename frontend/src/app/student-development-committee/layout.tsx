import RoleGuard from "@/components/auth/RoleGuard"; // Import เข้ามา
import StudentFormLayout from "@/components/layouts/Layout"; // Layout ความสวยงามเดิมของคุณ

export default function StudentDevelopmentCommitteeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ครอบด้วย RoleGuard และระบุว่าหน้านี้ให้เข้าได้เฉพาะ "student_development_committee"
    <RoleGuard allowedRoles={['student_development_committee']}>
        <StudentFormLayout>
            {children}
        </StudentFormLayout>
    </RoleGuard>
  );
}