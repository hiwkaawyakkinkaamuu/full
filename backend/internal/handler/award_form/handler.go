package awardform

import (
	awardformdto "backend/internal/dto/award_form_dto"
	"backend/internal/models"
	"backend/internal/usecase"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AwardHandler struct {
	useCase             usecase.AwardUseCase
	studentService      usecase.StudentService
	academicYearService usecase.AcademicYearService
}

func NewAwardHandler(u usecase.AwardUseCase, s usecase.StudentService, ays usecase.AcademicYearService) *AwardHandler {
	return &AwardHandler{useCase: u, studentService: s, academicYearService: ays}
}

func (h *AwardHandler) Submit(c *fiber.Ctx) error {
	// สร้าง uploads folder อัตโนมัติ
	uploadDir := "uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to create uploads directory",
		})
	}

	// เช็คว่าอยู่ในช่วงเวลาที่อนุญาตของ academic year หรือไม่
	currentSemester, err := h.academicYearService.GetCurrentSemester(c.UserContext())
	if err != nil || currentSemester == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "ไม่พบข้อมูลปีการศึกษาปัจจุบัน",
		})
	}
	now := time.Now()
	if now.Before(currentSemester.StartDate) || now.After(currentSemester.EndDate) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "ขณะนี้ไม่อยู่ในช่วงเวลาที่อนุญาตให้ส่งฟอร์ม (" + currentSemester.StartDate.Format("2006-01-02") + " ถึง " + currentSemester.EndDate.Format("2006-01-02") + ")",
		})
	}

	// ดึงข้อมูลผู้ใช้ที่ login อยู่จาก middleware
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}
	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	// 1. Check Role และรับข้อมูลตามแต่ละ Role
	fmt.Printf("=== DEBUG: User RoleID = %d ===\n", user.RoleID)

	var req awardformdto.SubmitAwardRequest

	// ===== ROLE: STUDENT (RoleID = 1) =====
	switch user.RoleID {
	case 1:
		fmt.Println("🎓 Processing STUDENT submission...")

		// Auto-fill จาก token สำหรับ student
		req.StudentFirstname = user.Firstname
		req.StudentLastname = user.Lastname
		req.StudentEmail = user.Email

		// Student กรอก:
		awardType := c.FormValue("award_type")
		if awardType == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "award_type is required",
			})
		}
		req.AwardType = awardType

		studentYear, err := strconv.Atoi(c.FormValue("student_year"))
		if err != nil || studentYear == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_year is required and must be a valid number",
			})
		}
		req.StudentYear = studentYear

		advisorName := c.FormValue("advisor_name")
		if advisorName == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "advisor_name is required",
			})
		}
		req.AdvisorName = advisorName

		studentPhoneNumber := c.FormValue("student_phone_number")
		if studentPhoneNumber == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_phone_number is required",
			})
		}
		req.StudentPhoneNumber = studentPhoneNumber

		studentAddress := c.FormValue("student_address")
		if studentAddress == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_address is required",
			})
		}
		req.StudentAddress = studentAddress

		gpa, err := strconv.ParseFloat(c.FormValue("gpa"), 64)
		if err != nil || gpa < 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "gpa is required and must be a valid number",
			})
		}
		req.GPA = gpa

		dobStr := c.FormValue("student_date_of_birth")
		if dobStr == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_date_of_birth is required",
			})
		}
		dob, err := time.Parse("2006-01-02", dobStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_date_of_birth format should be YYYY-MM-DD",
			})
		}
		req.StudentDateOfBirth = dob

		formDetail := c.FormValue("form_detail")
		if formDetail == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "form_detail is required",
			})
		}
		req.FormDetail = formDetail

	// ===== ROLE: ORGANIZATION (RoleID = 8) =====
	case 8:
		fmt.Println("🏢 Processing ORGANIZATION submission...")

		// Organization กรอก:
		studentFirstname := c.FormValue("student_firstname")
		if studentFirstname == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_firstname is required",
			})
		}
		req.StudentFirstname = studentFirstname

		studentLastname := c.FormValue("student_lastname")
		if studentLastname == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_lastname is required",
			})
		}
		req.StudentLastname = studentLastname

		studentEmail := c.FormValue("student_email")
		if studentEmail == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_email is required",
			})
		}
		req.StudentEmail = studentEmail

		studentNumber := c.FormValue("student_number")
		if studentNumber == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_number is required",
			})
		}
		req.StudentNumber = studentNumber

		facultyID, err := strconv.Atoi(c.FormValue("faculty_id"))
		if err != nil || facultyID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "faculty_id is required and must be a valid number",
			})
		}
		req.FacultyID = facultyID

		departmentID, err := strconv.Atoi(c.FormValue("department_id"))
		if err != nil || departmentID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "department_id is required and must be a valid number",
			})
		}
		req.DepartmentID = departmentID

		awardType := c.FormValue("award_type")
		if awardType == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "award_type is required",
			})
		}
		req.AwardType = awardType

		studentYear, err := strconv.Atoi(c.FormValue("student_year"))
		if err != nil || studentYear == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_year is required and must be a valid number",
			})
		}
		req.StudentYear = studentYear

		advisorName := c.FormValue("advisor_name")
		if advisorName == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "advisor_name is required",
			})
		}
		req.AdvisorName = advisorName

		studentPhoneNumber := c.FormValue("student_phone_number")
		if studentPhoneNumber == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_phone_number is required",
			})
		}
		req.StudentPhoneNumber = studentPhoneNumber

		studentAddress := c.FormValue("student_address")
		if studentAddress == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_address is required",
			})
		}
		req.StudentAddress = studentAddress

		gpa, err := strconv.ParseFloat(c.FormValue("gpa"), 64)
		if err != nil || gpa < 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "gpa is required and must be a valid number",
			})
		}
		req.GPA = gpa

		dobStr := c.FormValue("student_date_of_birth")
		if dobStr == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_date_of_birth is required",
			})
		}
		dob, err := time.Parse("2006-01-02", dobStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "student_date_of_birth format should be YYYY-MM-DD",
			})
		}
		req.StudentDateOfBirth = dob

		formDetail := c.FormValue("form_detail")
		if formDetail == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "form_detail is required",
			})
		}
		req.FormDetail = formDetail

	default:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Only Student (RoleID=1) and Organization (RoleID=8) can submit awards",
		})
	}

	// จัดการกับไฟล์แนบ (ถ้ามี)
	var awardFiles []models.AwardFileDirectory

	form, err := c.MultipartForm()
	if err == nil {
		// Debug: แสดง field names ทั้งหมดที่มีในฟอร์ม
		fmt.Println("🔍 Form fields ที่มีในฟอร์ม:")
		for fieldName := range form.File {
			fmt.Printf("  - %s: %d files\n", fieldName, len(form.File[fieldName]))
		}

		files := form.File["files"]

		fmt.Printf("📁 จำนวนไฟล์ที่ได้รับ (field 'files'): %d\n", len(files))

		// --- STEP 1: VALIDATION LOOP ---
		// เช็คไฟล์ทั้งหมดก่อนว่ามีอันไหนไม่ valid ไหม
		allowedExtensions := map[string]bool{".pdf": true}
		maxTotalSize := int64(10 * 1024 * 1024) // 10 MB
		var totalSize int64

		for _, file := range files {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			if !allowedExtensions[ext] {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"status":  "error",
					"message": fmt.Sprintf("ไม่อนุญาตให้อัปโหลดไฟล์ประเภท %s (รองรับเฉพาะ PDF)", ext),
				})
			}
			totalSize += file.Size
		}

		// เช็คขนาดไฟล์รวม
		if totalSize > maxTotalSize {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": fmt.Sprintf("ขนาดไฟล์รวมเกิน 10 MB (ได้รับ %.2f MB)", float64(totalSize)/(1024*1024)),
			})
		}

		// --- STEP 2: PROCESSING & SAVING LOOP ---
		// ถ้าผ่านการเช็คด้านบนมาได้ แสดงว่าไฟล์ทุกไฟล์ valid พร้อมบันทึก
		for _, file := range files {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			subDir := "pdf" // รองรับเฉพาะ PDF

			targetDir := filepath.Join(uploadDir, subDir)
			if err := os.MkdirAll(targetDir, 0755); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"status": "error", "message": "Failed to create directory",
				})
			}

			newFileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
			savePath := filepath.Join(targetDir, newFileName)

			if err := c.SaveFile(file, savePath); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"status":  "error",
					"message": "Failed to save file: " + err.Error(),
				})
			}

			fmt.Printf("✅ บันทึกไฟล์สำเร็จ: %s (ขนาด: %d bytes)\n", savePath, file.Size)

			cleanPath := filepath.ToSlash(savePath)
			awardFiles = append(awardFiles, models.AwardFileDirectory{
				FilePath:   cleanPath,
				FileType:   strings.TrimPrefix(ext, "."),
				FileSize:   file.Size,
				UploadedAt: time.Now(),
			})
		}
	}

	// 3. ส่งข้อมูลไปยัง UseCase พร้อม userID
	if err := h.useCase.SubmitAward(c.UserContext(), user.UserID, req, awardFiles); err != nil {

		// --- ส่วนที่เพิ่มเข้ามา: ลบไฟล์ทิ้งถ้า DB บันทึกไม่สำเร็จ ---
		for _, f := range awardFiles {
			// f.FilePath เก็บค่าเช่น "uploads/pdf/xxx.pdf"
			if removeErr := os.Remove(f.FilePath); removeErr != nil {
				fmt.Printf("Failed to cleanup file %s: %v\n", f.FilePath, removeErr)
			}
		}

		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "บันทึกข้อมูลไม่สำเร็จ (อาจมีการส่งข้อมูลในปีการศึกษานี้ไปแล้ว): " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":  "success",
		"message": "Award form submitted successfully",
	})
}

// GetByKeyword ค้นหาและกรองตามเงื่อนไข พร้อม pagination
// Query params: keyword, date (YYYY-MM-DD), student_year, page (default: 1), limit (default: 10)
func (h *AwardHandler) GetByKeyword(c *fiber.Ctx) error {
	// ดึงข้อมูล user จาก middleware
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}
	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	// รับ query parameters
	var req awardformdto.SearchAwardRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid query parameters",
		})
	}

	// ค้นหาและกรองตามวิทยาเขตของ user
	sortOrder := req.SortOrder
	if strings.TrimSpace(sortOrder) == "" {
		sortOrder = req.Arrangement
	}

	results, err := h.useCase.GetByKeyword(
		c.UserContext(),
		user.UserID,
		user.RoleID,
		user.CampusID,
		req.Keyword,
		req.Date,
		req.StudentYear,
		req.AwardType,
		req.SortBy,
		sortOrder,
		req.Page,
		req.Limit,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":     "success",
		"data":       results.Data,
		"pagination": results.Pagination,
	})
}

func (h *AwardHandler) GetAnnouncementAwards(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	var req awardformdto.AnnouncementAwardRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid query parameters",
		})
	}

	results, err := h.useCase.GetAnnouncementAwards(c.UserContext(), user.CampusID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":     "success",
		"data":       results.Data,
		"pagination": results.Pagination,
		"filters":    results.Filters,
	})
}

func (h *AwardHandler) GetMySubmissions(c *fiber.Ctx) error {
	// ดึงข้อมูล user จาก middleware
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}
	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	// เช็ค Role
	if user.RoleID != 1 && user.RoleID != 8 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Only Student and Organization can view submissions",
		})
	}

	// รับ year parameter (optional)
	yearQuery := c.Query("year")
	var year int

	if yearQuery != "" {
		// ถ้ามี query param ให้ใช้ค่านั้น
		yearValue, err := strconv.Atoi(yearQuery)
		if err != nil || yearValue <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "Invalid year parameter",
			})
		}
		year = yearValue
	} else {
		// ถ้าไม่มี query param ให้ดึง current active year
		currentSemester, err := h.academicYearService.GetCurrentSemester(c.UserContext())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to get current semester: " + err.Error(),
			})
		}

		if currentSemester == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"status":  "error",
				"message": "No active semester found",
			})
		}
		year = int(currentSemester.Year)
	}

	// ดึงการส่งฟอร์มของ user ในปีการศึกษาที่ระบุ (ทั้ง semester)
	results, err := h.useCase.GetAwardsByUserIDAndYear(c.UserContext(), user.UserID, year)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	if results == nil {
		results = []awardformdto.AwardFormResponse{}
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   results,
	})
}

func (h *AwardHandler) GetMyCurrentSemesterSubmissions(c *fiber.Ctx) error {
	// ดึงข้อมูล user จาก middleware
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}
	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	// เช็ค Role
	if user.RoleID != 1 && user.RoleID != 8 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Only Student and Organization can view submissions",
		})
	}

	// ดึง Academic Year ปัจจุบันที่เปิดใช้งาน (isActive = true)
	currentSemester, err := h.academicYearService.GetCurrentSemester(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to get current semester: " + err.Error(),
		})
	}

	if currentSemester == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "No active semester found",
		})
	}

	// ดึงการส่งฟอร์มของ user ในภาคเรียนปัจจุบัน
	results, err := h.useCase.GetAwardsByUserIDAndSemester(c.UserContext(), user.UserID, int(currentSemester.Year), int(currentSemester.Semester))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	if results == nil {
		results = []awardformdto.AwardFormResponse{}
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   results,
		"meta": fiber.Map{
			"academic_year": currentSemester.Year,
			"semester":      currentSemester.Semester,
		},
	})
}

func (h *AwardHandler) GetByFormID(c *fiber.Ctx) error {
	formID, err := strconv.Atoi(c.Params("formId"))
	if err != nil || formID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid formId",
		})
	}

	form, err := h.useCase.GetByFormID(c.UserContext(), formID)
	if err != nil {
		status := fiber.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			status = fiber.StatusNotFound
		}
		return c.Status(status).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   form,
	})
}

func (h *AwardHandler) UpdateAwardType(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}
	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	formID, err := strconv.Atoi(c.Params("formId"))
	if err != nil || formID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid formId",
		})
	}

	var req awardformdto.UpdateAwardTypeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}
	if req.AwardType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "award_type is required",
		})
	}

	if err := h.useCase.UpdateAwardType(c.UserContext(), uint(formID), req.AwardType, user.UserID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "award_type updated",
	})
}

func (h *AwardHandler) UpdateFormStatus(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}
	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	formID, err := strconv.Atoi(c.Params("formId"))
	if err != nil || formID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid formId",
		})
	}

	var req awardformdto.UpdateFormStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}
	if req.FormStatusID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "form_status is required",
		})
	}

	if user.RoleID == 6 {
		isChairman, err := h.useCase.IsCommitteeChairman(c.UserContext(), user.UserID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})
		}

		if !isChairman {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status":  "error",
				"message": "Committee non-chairman must use vote endpoint",
			})
		}
	}

	switch user.RoleID {
	case 2, 3, 4:
		if err := h.useCase.UpdateFormStatus(c.UserContext(), uint(formID), req.FormStatusID, req.RejectReason, user.UserID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})
		}
	case 5:
		if err := h.useCase.UpdateFormStatusWithLog(c.UserContext(), uint(formID), req.FormStatusID, req.RejectReason, user.UserID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})
		}
	case 6, 7:
		if err := h.useCase.UpdateFormStatusWithSignedLog(c.UserContext(), uint(formID), req.FormStatusID, req.RejectReason, user.UserID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})
		}
	default:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "role is not allowed to change form status",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "form_status updated",
	})
}

func (h *AwardHandler) CommitteeVote(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	if user.RoleID != 6 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Only committee role can vote",
		})
	}

	formID, err := strconv.Atoi(c.Params("formId"))
	if err != nil || formID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid formId",
		})
	}

	var req awardformdto.CommitteeVoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	voteResult, err := h.useCase.CommitteeVote(c.UserContext(), uint(formID), req.Operation, user.UserID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	message := "vote saved"
	if voteResult.HasMajority {
		message = "vote saved and form status updated to 10"
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": message,
		"data":    voteResult,
	})
}

func (h *AwardHandler) GetMyApprovalLogs(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	var req awardformdto.SearchApprovalLogRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid query parameters",
		})
	}

	keyword := strings.TrimSpace(req.Keyword)
	if keyword == "" {
		keyword = strings.TrimSpace(c.Query("q"))
	}

	date := strings.TrimSpace(req.Date)

	operation := strings.TrimSpace(req.Operation)

	sortBy := strings.TrimSpace(req.SortBy)
	if sortBy == "" {
		sortBy = strings.TrimSpace(c.Query("sortBy"))
	}

	sortOrder := req.SortOrder
	if strings.TrimSpace(sortOrder) == "" {
		sortOrder = req.Arrangement
	}
	if strings.TrimSpace(sortOrder) == "" {
		sortOrder = c.Query("sortOrder")
	}

	page := req.Page
	if page == 0 {
		page = c.QueryInt("pageNumber", 1)
	}
	if page < 1 {
		page = 1
	}

	const limit = 5

	logs, err := h.useCase.GetApprovalHistory(
		c.UserContext(),
		user.UserID,
		user.CampusID,
		keyword,
		date,
		operation,
		sortBy,
		sortOrder,
		page,
		limit,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":     "success",
		"data":       logs.Data,
		"pagination": logs.Pagination,
	})
}

func (h *AwardHandler) GetMySignedLogs(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	logs, err := h.useCase.GetSignedLogsByUserID(c.UserContext(), user.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   logs,
	})
}

func (h *AwardHandler) GetMyVoteLogs(c *fiber.Ctx) error {
	currentUser := c.Locals("current_user")
	if currentUser == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: User not found",
		})
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid user data",
		})
	}

	if user.RoleID != 6 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Only committee role can view vote logs",
		})
	}

	var req awardformdto.SearchVoteLogRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid query parameters",
		})
	}

	keyword := strings.TrimSpace(req.Keyword)
	date := strings.TrimSpace(req.Date)
	page := req.Page
	if page < 1 {
		page = 1
	}

	const limit = 5

	logs, total, err := h.useCase.GetCommitteeVoteLogsByUserID(c.UserContext(), user.UserID, keyword, date, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"status":     "success",
		"data":       logs,
		"pagination": awardformdto.PaginationMeta{CurrentPage: page, TotalPages: totalPages, TotalItems: total, Limit: limit},
	})
}

// GetAllAwardTypes - ดึง award_type ทั้งหมดที่มีในระบบ
func (h *AwardHandler) GetAllAwardTypes(c *fiber.Ctx) error {
	awardTypes, err := h.useCase.GetAllAwardTypes(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to fetch award types",
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   awardTypes,
	})
}

func (h *AwardHandler) GetAwardTypeLogs(c *fiber.Ctx) error {
	var req awardformdto.SearchAwardTypeLogRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid query parameters",
		})
	}

	logs, err := h.useCase.GetAwardTypeLogs(c.UserContext(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   logs,
	})
}

// GetApprovalLogDetail handles GET /api/awards/approval-logs/:id
func (h *AwardHandler) GetApprovalLogDetail(c *fiber.Ctx) error {
	idParam := c.Params("formId")
	if idParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Missing approval log ID",
		})
	}
	approvalLogID, err := strconv.Atoi(idParam)
	if err != nil || approvalLogID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid approval log ID",
		})
	}

	detail, err := h.useCase.GetApprovalLogDetail(c.UserContext(), uint(approvalLogID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "Approval log not found",
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   detail,
	})
}