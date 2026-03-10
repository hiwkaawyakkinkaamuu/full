"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Swal from "sweetalert2";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const getRoleString = (id: number, isChairman: boolean) => {
     switch(id) {
        case 1: return "student";
        case 2: return "head_of_department";
        case 3: return "associate_dean";
        case 4: return "dean";
        case 5: return "student_development";
        case 6: return isChairman ? "chairman_of_student_development_committee" : "student_development_committee";
        case 7: return "chancellor";
        case 8: return "organization";
        default: return "student";
     }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/");
        return;
      }

      const actualUser = user.user ? user.user : user;
      const userRoleId = actualUser?.role_id ?? actualUser?.roleId ?? actualUser?.RoleId ?? actualUser?.RoleID;

      if (userRoleId === undefined || userRoleId === null) {
         router.replace("/");
         return;
      }

      // 🚨 เช็คสถานะประธานแบบครอบคลุมสุดๆ
      let isChairman = false;
      const committeeData = actualUser?.committee_data || actualUser?.CommitteeData || {};
      const chairmanFlag = committeeData?.is_chairman ?? committeeData?.IsChairman ?? actualUser?.is_chairman ?? actualUser?.IsChairman;
      
      if (chairmanFlag === true || chairmanFlag === "true" || chairmanFlag === 1) {
          isChairman = true;
      }

      const userRoleStr = getRoleString(Number(userRoleId), isChairman);

      if (!allowedRoles.includes(userRoleStr)) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่มีสิทธิ์เข้าถึง',
            text: `ระบบกำลังพาคุณไปยังหน้าหลักของคุณ`,
            timer: 2000,
            showConfirmButton: false
        });
        
        const dashboardMap: Record<string, string> = {
            student: "/student/main/hall-of-fame",
            student_development: "/student-development/hall-of-fame",
            head_of_department: "/head-of-department/hall-of-fame",
            associate_dean: "/associate-dean/hall-of-fame",
            dean: "/dean/hall-of-fame",
            student_development_committee: "/student-development-committee/hall-of-fame",
            chairman_of_student_development_committee: "/chairman-of-student-development-committee/hall-of-fame",
            chancellor: "/chancellor/hall-of-fame",
            organization: "/organization/main/hall-of-fame"
        };
        
        router.replace(dashboardMap[userRoleStr] || "/");
      }
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}