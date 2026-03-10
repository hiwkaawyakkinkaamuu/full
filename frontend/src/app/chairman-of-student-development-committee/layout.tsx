import RoleGuard from "@/components/auth/RoleGuard"; // Import เข้ามา
import StudentFormLayout from "@/components/layouts/Layout"; // Layout ความสวยงามเดิมของคุณ

export default function ChairmanRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ครอบด้วย RoleGuard และระบุว่าหน้านี้ให้เข้าได้เฉพาะ "chairman_of_student_development-committee"
    <RoleGuard allowedRoles={['chairman_of_student_development_committee']}>
        <StudentFormLayout>
            {children}
        </StudentFormLayout>
    </RoleGuard>
  );
}