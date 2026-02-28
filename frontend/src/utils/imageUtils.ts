// ฟังก์ชันสำหรับแปลง path ให้เป็น URL ที่ถูกต้อง
export const getProfileImageUrl = (imagePath: string | undefined | null) => {
  // 1. ถ้าไม่มีข้อมูล ให้ใช้รูป Default
  if (!imagePath) {
    return "/images/default-avatar.png"; // หรือรูป placeholder ที่คุณมี
  }

  // 2. ถ้าเป็นรูปจาก Google (ขึ้นต้นด้วย http หรือ https) ให้ใช้ได้เลย
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // 3. ถ้าเป็นรูปในเครื่อง (Local Upload)
  // ให้เติม API_BASE_URL หรือ Path ของ Server เข้าไปข้างหน้า
  // สมมติรูปอยู่ที่ http://localhost:8080/uploads/user-profile/1.png
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"; 
  
  // ตัด / ตัวแรกออกถ้ามีซ้ำกัน เพื่อความสวยงาม (Optional)
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  
  return `${API_BASE_URL}${cleanPath}`;
};