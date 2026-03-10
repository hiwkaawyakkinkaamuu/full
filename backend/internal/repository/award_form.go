package repository

import (
	"backend/internal/models"
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

type AwardRepository struct {
	db *gorm.DB
}

type AwardSearchFilter struct {
	CampusID             int
	Keyword              string
	Date                 string
	StudentYear          int
	AwardType            string
<<<<<<< HEAD
=======
	AwardTypes           []string
	IsOtherAwardType     bool
>>>>>>> develop
	ExcludeVotedByUserID *uint
	FacultyID            *int
	DepartmentID         *int
	FormStatusID         *int
	SortBy               string
	SortOrder            string
	Page                 int
	Limit                int
}

type ApprovalLogSearchFilter struct {
	UserID    uint
	CampusID  int
	Keyword   string
	Date      string
	Operation string
	SortBy    string
	SortOrder string
	Page      int
	Limit     int
}

type CommitteeVoteLogSearchFilter struct {
	UserID  uint
	Keyword string
	Date    string
	Page    int
	Limit   int
}

type ApprovalLogHistoryRow struct {
	ApprovalLogID    uint      `gorm:"column:approval_log_id"`
	FormID           uint      `gorm:"column:form_id"`
	ReviewerUserID   uint      `gorm:"column:reviewer_user_id"`
	Operation        string    `gorm:"column:operation"`
	OperationDate    time.Time `gorm:"column:operation_date"`
	StudentFirstname string    `gorm:"column:student_firstname"`
	StudentLastname  string    `gorm:"column:student_lastname"`
	StudentNumber    string    `gorm:"column:student_number"`
	AcademicYear     int       `gorm:"column:academic_year"`
	AwardType        string    `gorm:"column:award_type"`
	CampusID         int       `gorm:"column:campus_id"`
}

type AnnouncementFilter struct {
	CampusID     int
	Keyword      string
	AcademicYear int
	Semester     int
	AwardType    string
	FacultyID    int
	Page         int
	Limit        int
	SortBy       string
	SortOrder    string
}

type AnnouncementAwardRow struct {
	FormID           uint   `gorm:"column:form_id"`
	CampusID         int    `gorm:"column:campus_id"`
	AcademicYear     int    `gorm:"column:academic_year"`
	Semester         int    `gorm:"column:semester"`
	AwardType        string `gorm:"column:award_type"`
	FacultyID        int    `gorm:"column:faculty_id"`
	FacultyName      string `gorm:"column:faculty_name"`
	StudentNumber    string `gorm:"column:student_number"`
	Prefix           string `gorm:"column:prefix"`
	StudentFirstname string `gorm:"column:student_firstname"`
	StudentLastname  string `gorm:"column:student_lastname"`
	IsOtherType      bool   `gorm:"column:is_other_type"`
}

type AwardTypeLogFilter struct {
	Keyword   string
	SortOrder string
}

func NewAwardRepository(db *gorm.DB) *AwardRepository {
	return &AwardRepository{db: db}
}

// ปรับปรุง: เพิ่มพารามิเตอร์ files เพื่อรองรับการบันทึกไฟล์แนบ (ถ้ามี)
func (r *AwardRepository) CreateWithTransaction(ctx context.Context, form *models.AwardForm, files []models.AwardFileDirectory) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. บันทึกตารางหลัก (Award_Form)
		if err := tx.Create(form).Error; err != nil {
			return err
		}

		// 2. บันทึกตารางไฟล์แนบ (ถ้า len > 0 คือมีการแนบไฟล์มา)
		if len(files) > 0 {
			for i := range files {
				// ผูก ID ของไฟล์เข้ากับ FormID ที่เพิ่งสร้างใหม่
				files[i].FormID = form.FormID
				if err := tx.Create(&files[i]).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// GetByKeyword ค้นหาและกรองพร้อม pagination ตาม role scope
func (r *AwardRepository) GetByKeyword(ctx context.Context, filter AwardSearchFilter) ([]models.AwardForm, int64, error) {
	var list []models.AwardForm
	var total int64

	query := r.db.WithContext(ctx).Model(&models.AwardForm{}).Where("campus_id = ?", filter.CampusID)

	// ค้นหาด้วย keyword (firstname, lastname, studentNumber, semester, year, award_type)
	if filter.Keyword != "" {
		query = query.Where(
			"student_firstname LIKE ? OR student_lastname LIKE ? OR student_number LIKE ? OR CONCAT(student_firstname, ' ', student_lastname) LIKE ?",
			"%"+filter.Keyword+"%", "%"+filter.Keyword+"%", "%"+filter.Keyword+"%", "%"+filter.Keyword+"%",
		)
	}

	// กรองตามวันที่ (ถ้ามี)
	if filter.Date != "" {
		query = query.Where("DATE(created_at) = ?", filter.Date)
	}

	// กรองตามชั้นปี (ถ้ามี)
	if filter.StudentYear > 0 {
		query = query.Where("student_year = ?", filter.StudentYear)
	}

<<<<<<< HEAD
	// กรองตามประเภทรางวัล (ถ้ามี)
	if filter.AwardType != "" {
=======
	// กรองตามประเภทรางวัล (รองรับ single type และ grouped type)
	if len(filter.AwardTypes) > 0 {
		if filter.IsOtherAwardType {
			query = query.Where("award_type NOT IN ?", filter.AwardTypes)
		} else {
			query = query.Where("award_type IN ?", filter.AwardTypes)
		}
	} else if filter.AwardType != "" {
>>>>>>> develop
		query = query.Where("award_type = ?", filter.AwardType)
	}

	if filter.FacultyID != nil {
		query = query.Where("faculty_id = ?", *filter.FacultyID)
	}

	if filter.DepartmentID != nil {
		query = query.Where("department_id = ?", *filter.DepartmentID)
	}

	if filter.FormStatusID != nil {
		query = query.Where("form_status_id = ?", *filter.FormStatusID)
	}

	if filter.ExcludeVotedByUserID != nil {
		query = query.Where(
			`NOT EXISTS (
				SELECT 1
				FROM "Committee_Vote_Log" cvl
				WHERE cvl.form_id = "Award_Form".form_id
				  AND cvl.user_id = ?
			)`,
			*filter.ExcludeVotedByUserID,
		)
	}

	// นับจำนวนทั้งหมด
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// คำนวณ offset
	offset := (filter.Page - 1) * filter.Limit

	// ดึงข้อมูลพร้อม pagination และ preload
	orderClause := buildOrderClause(filter.SortBy, filter.SortOrder)

	err := query.
		Preload("AwardFiles").
		Order(orderClause).
		Limit(filter.Limit).
		Offset(offset).
		Find(&list).Error

	return list, total, err
}

func (r *AwardRepository) GetAnnouncementDefaults(ctx context.Context, campusID int) (int, int, []string, error) {
	var latestYear int
	err := r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Where("campus_id = ? AND form_status_id = ?", campusID, 12).
		Select("COALESCE(MAX(academic_year), 0)").
		Scan(&latestYear).Error
	if err != nil {
		return 0, 0, nil, err
	}

	var latestSemester int
	if latestYear > 0 {
		err = r.db.WithContext(ctx).
			Model(&models.AwardForm{}).
			Where("campus_id = ? AND form_status_id = ? AND academic_year = ?", campusID, 12, latestYear).
			Select("COALESCE(MAX(semester), 0)").
			Scan(&latestSemester).Error
		if err != nil {
			return 0, 0, nil, err
		}
	}

	var topAwardTypes []string
	baseQuery := r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Where("campus_id = ? AND form_status_id = ?", campusID, 12)

	if latestYear > 0 {
		baseQuery = baseQuery.Where("academic_year = ?", latestYear)
	}
	if latestSemester > 0 {
		baseQuery = baseQuery.Where("semester = ?", latestSemester)
	}

	err = baseQuery.
		Distinct("award_type").
		Order("award_type ASC").
		Limit(3).
		Pluck("award_type", &topAwardTypes).Error
	if err != nil {
		return 0, 0, nil, err
	}

	return latestYear, latestSemester, topAwardTypes, nil
}

func (r *AwardRepository) GetAnnouncementAcademicYears(ctx context.Context, campusID int) ([]int, error) {
	years := make([]int, 0)
	err := r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Where("campus_id = ? AND form_status_id = ?", campusID, 12).
		Distinct("academic_year").
		Order("academic_year DESC").
		Pluck("academic_year", &years).Error
	if err != nil {
		return nil, err
	}
	return years, nil
}

func (r *AwardRepository) GetAnnouncementSemesters(ctx context.Context, campusID int, academicYear int) ([]int, error) {
	semesters := make([]int, 0)
	query := r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Where("campus_id = ? AND form_status_id = ?", campusID, 12)

	if academicYear > 0 {
		query = query.Where("academic_year = ?", academicYear)
	}

	err := query.
		Distinct("semester").
		Order("semester DESC").
		Pluck("semester", &semesters).Error
	if err != nil {
		return nil, err
	}

	return semesters, nil
}

func (r *AwardRepository) GetAnnouncementAwards(ctx context.Context, filter AnnouncementFilter, topAwardTypes []string) ([]AnnouncementAwardRow, int64, error) {
	rows := make([]AnnouncementAwardRow, 0)
	var total int64

	query := r.db.WithContext(ctx).
		Table(`"Award_Form" af`).
		Joins(`LEFT JOIN "Faculty" f ON f.faculty_id = af.faculty_id`).
		Joins(`LEFT JOIN "User" u ON u.user_id = af.user_id`).
		Where("af.campus_id = ?", filter.CampusID).
		Where("af.form_status_id = ?", 12)

	if filter.AcademicYear > 0 {
		query = query.Where("af.academic_year = ?", filter.AcademicYear)
	}
	if filter.Semester > 0 {
		query = query.Where("af.semester = ?", filter.Semester)
	}
	if filter.FacultyID > 0 {
		query = query.Where("af.faculty_id = ?", filter.FacultyID)
	}

	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		query = query.Where(
			"af.student_firstname LIKE ? OR af.student_lastname LIKE ? OR af.student_number LIKE ? OR CONCAT(af.student_firstname, ' ', af.student_lastname) LIKE ? OR f.faculty_name LIKE ?",
			like, like, like, like, like,
		)
	}

	selectedAwardType := strings.TrimSpace(filter.AwardType)
	if selectedAwardType != "" {
		if selectedAwardType == "ประเภทอื่นๆ" {
			if len(topAwardTypes) > 0 {
				query = query.Where("af.award_type NOT IN ?", topAwardTypes)
			}
		} else {
			query = query.Where("af.award_type = ?", selectedAwardType)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit
	if offset < 0 {
		offset = 0
	}

	err := query.Select(`
		af.form_id,
		af.campus_id,
		af.academic_year,
		af.semester,
		af.award_type,
		af.faculty_id,
		COALESCE(f.faculty_name, '') AS faculty_name,
		af.student_number,
		COALESCE(u.prefix, '') AS prefix,
		af.student_firstname,
		af.student_lastname,
		FALSE AS is_other_type
	`).
		Order(buildAnnouncementOrderClause(filter.SortBy, filter.SortOrder)).
		Limit(filter.Limit).
		Offset(offset).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	if len(topAwardTypes) > 0 {
		for i := range rows {
			rows[i].IsOtherType = true
			for _, t := range topAwardTypes {
				if rows[i].AwardType == t {
					rows[i].IsOtherType = false
					break
				}
			}
		}
	}

	return rows, total, nil
}

func (r *AwardRepository) GetAnnouncementAwardsByCategory(ctx context.Context, filter AnnouncementFilter, categoryAwardTypes []string, isOther bool) ([]AnnouncementAwardRow, int64, error) {
	rows := make([]AnnouncementAwardRow, 0)
	var total int64

	query := r.db.WithContext(ctx).
		Table(`"Award_Form" af`).
		Joins(`LEFT JOIN "Faculty" f ON f.faculty_id = af.faculty_id`).
		Joins(`LEFT JOIN "User" u ON u.user_id = af.user_id`).
		Where("af.campus_id = ?", filter.CampusID).
		Where("af.form_status_id = ?", 12)

	if filter.AcademicYear > 0 {
		query = query.Where("af.academic_year = ?", filter.AcademicYear)
	}
	if filter.Semester > 0 {
		query = query.Where("af.semester = ?", filter.Semester)
	}
	if filter.FacultyID > 0 {
		query = query.Where("af.faculty_id = ?", filter.FacultyID)
	}

	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		query = query.Where(
			"af.student_firstname LIKE ? OR af.student_lastname LIKE ? OR af.student_number LIKE ? OR CONCAT(af.student_firstname, ' ', af.student_lastname) LIKE ? OR f.faculty_name LIKE ?",
			like, like, like, like, like,
		)
	}

	if len(categoryAwardTypes) > 0 {
		if isOther {
			query = query.Where("af.award_type NOT IN ?", categoryAwardTypes)
		} else {
			query = query.Where("af.award_type IN ?", categoryAwardTypes)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit
	if offset < 0 {
		offset = 0
	}

	err := query.Select(`
		af.form_id,
		af.campus_id,
		af.academic_year,
		af.semester,
		af.award_type,
		af.faculty_id,
		COALESCE(f.faculty_name, '') AS faculty_name,
		af.student_number,
		COALESCE(u.prefix, '') AS prefix,
		af.student_firstname,
		af.student_lastname,
		FALSE AS is_other_type
	`).
		Order(buildAnnouncementOrderClause(filter.SortBy, filter.SortOrder)).
		Limit(filter.Limit).
		Offset(offset).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	if isOther {
		for i := range rows {
			rows[i].IsOtherType = true
		}
	}

	return rows, total, nil
}

func buildOrderClause(sortBy string, sortOrder string) string {
	order := strings.ToUpper(sortOrder)
	if order != "ASC" {
		order = "DESC"
	}

	switch sortBy {
	case "name":
		return fmt.Sprintf("student_firstname %s, student_lastname %s", order, order)
	case "studentNumber":
		return fmt.Sprintf("student_number %s", order)
	case "awardType":
		return fmt.Sprintf("award_type %s", order)
	case "date":
		fallthrough
	default:
		return fmt.Sprintf("created_at %s", order)
	}
}

func (r *AwardRepository) GetApprovalHistoryByUserAndCampus(ctx context.Context, filter ApprovalLogSearchFilter) ([]ApprovalLogHistoryRow, int64, error) {
	var rows []ApprovalLogHistoryRow
	var total int64

	query := r.db.WithContext(ctx).
		Table(`"Award_Approval_Log" AS aal`).
		Joins(`JOIN "Award_Form" af ON af.form_id = aal.form_id`).
		Where("aal.user_id = ?", filter.UserID).
		Where("af.campus_id = ?", filter.CampusID)

	if filter.Keyword != "" {
		query = query.Where(
			"af.student_firstname LIKE ? OR af.student_lastname LIKE ? OR af.student_number LIKE ? OR CONCAT(af.student_firstname, ' ', af.student_lastname) LIKE ?",
			"%"+filter.Keyword+"%", "%"+filter.Keyword+"%", "%"+filter.Keyword+"%", "%"+filter.Keyword+"%",
		)
	}

	if filter.Date != "" {
		query = query.Where("DATE(aal.approved_at) = ?", filter.Date)
	}

	if filter.Operation != "" {
		query = query.Where("aal.approval_status = ?", filter.Operation)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit

	err := query.Select(`
		aal.approval_log_id AS approval_log_id,
		aal.form_id AS form_id,
		aal.user_id AS reviewer_user_id,
		aal.approval_status AS operation,
		aal.approved_at AS operation_date,
		af.student_firstname AS student_firstname,
		af.student_lastname AS student_lastname,
		af.student_number AS student_number,
		af.academic_year AS academic_year,
		af.award_type AS award_type,
		af.campus_id AS campus_id
	`).
		Order(buildApprovalLogOrderClause(filter.SortBy, filter.SortOrder)).
		Limit(filter.Limit).
		Offset(offset).
		Scan(&rows).Error

	return rows, total, err
}

func buildApprovalLogOrderClause(sortBy string, sortOrder string) string {
	order := strings.ToUpper(sortOrder)
	if order != "ASC" {
		order = "DESC"
	}

	switch sortBy {
	case "name":
		return fmt.Sprintf("af.student_firstname %s, af.student_lastname %s", order, order)
	case "studentNumber":
		return fmt.Sprintf("af.student_number %s", order)
	case "academicYear":
		return fmt.Sprintf("af.academic_year %s", order)
	case "date":
		fallthrough
	default:
		return fmt.Sprintf("aal.approved_at %s", order)
	}
}

func buildAnnouncementOrderClause(sortBy string, sortOrder string) string {
	order := strings.ToUpper(sortOrder)
	if order != "ASC" {
		order = "DESC"
	}

	switch sortBy {
	case "name":
		return fmt.Sprintf("af.student_firstname %s, af.student_lastname %s", order, order)
	case "studentNumber":
		return fmt.Sprintf("af.student_number %s", order)
	case "faculty":
		return fmt.Sprintf("f.faculty_name %s", order)
	case "awardType":
		return fmt.Sprintf("af.award_type %s", order)
	case "academicYear":
		return fmt.Sprintf("af.academic_year %s", order)
	case "semester":
		return fmt.Sprintf("af.semester %s", order)
	case "date":
		fallthrough
	default:
		return fmt.Sprintf("af.created_at %s", order)
	}
}

func (r *AwardRepository) GetHeadOfDepartmentScopeByUserID(ctx context.Context, userID uint) (int, int, error) {
	var scope struct {
		FacultyID    int `gorm:"column:faculty_id"`
		DepartmentID int `gorm:"column:department_id"`
	}

	err := r.db.WithContext(ctx).
		Table("Head_Of_Department").
		Select("faculty_id, department_id").
		Where("user_id = ?", userID).
		Take(&scope).Error
	if err != nil {
		return 0, 0, err
	}

	return scope.FacultyID, scope.DepartmentID, nil
}

func (r *AwardRepository) GetFacultyScopeByRoleAndUserID(ctx context.Context, roleID int, userID uint) (int, error) {
	tableName := ""
	switch roleID {
	case 3:
		tableName = "Associate_Dean"
	case 4:
		tableName = "Dean"
	default:
		return 0, nil
	}

	var scope struct {
		FacultyID int `gorm:"column:faculty_id"`
	}

	err := r.db.WithContext(ctx).
		Table(tableName).
		Select("faculty_id").
		Where("user_id = ?", userID).
		Take(&scope).Error
	if err != nil {
		return 0, err
	}

	return scope.FacultyID, nil
}

func (r *AwardRepository) GetByType(ctx context.Context, awardType string, campusID int) ([]models.AwardForm, error) {
	var list []models.AwardForm
	err := r.db.WithContext(ctx).
		Where("award_type = ? AND campus_id = ?", awardType, campusID).
		Preload("AwardFiles").
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *AwardRepository) GetByUserID(ctx context.Context, userID uint) ([]models.AwardForm, error) {
	var list []models.AwardForm
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Preload("AwardFiles").
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *AwardRepository) GetByUserIDAndYear(ctx context.Context, userID uint, year int) ([]models.AwardForm, error) {
	var list []models.AwardForm
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND academic_year = ?", userID, year).
		Preload("AwardFiles").
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *AwardRepository) GetByUserIDAndSemester(ctx context.Context, userID uint, year int, semester int) ([]models.AwardForm, error) {
	var list []models.AwardForm
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND academic_year = ? AND semester = ?", userID, year, semester).
		Preload("AwardFiles").
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *AwardRepository) GetByUserIDWithYearSort(ctx context.Context, userID uint, years []int) ([]models.AwardForm, error) {
	var list []models.AwardForm
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if len(years) > 0 {
		query = query.Where("academic_year IN ?", years)
	}
	err := query.
		Preload("AwardFiles").
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *AwardRepository) GetByUserIDWithYearPaged(ctx context.Context, userID uint, years []int, page int, limit int) ([]models.AwardForm, int64, error) {
	var list []models.AwardForm
	var total int64

	query := r.db.WithContext(ctx).Model(&models.AwardForm{}).Where("user_id = ?", userID)
	if len(years) > 0 {
		query = query.Where("academic_year IN ?", years)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.
		Preload("AwardFiles").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&list).Error

	return list, total, err
}

func (r *AwardRepository) GetByStudentID(ctx context.Context, studentID int) ([]models.AwardForm, error) {
	var list []models.AwardForm
	err := r.db.WithContext(ctx).
		Where("student_id = ?", studentID).
		Preload("AwardFiles").
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *AwardRepository) GetByFormID(ctx context.Context, formID int) (*models.AwardForm, error) {
	var form models.AwardForm
	err := r.db.WithContext(ctx).
		Where("form_id = ?", formID).
		Preload("AwardFiles").
		First(&form).Error
	if err != nil {
		return nil, err
	}
	return &form, nil
}

func (r *AwardRepository) CheckDuplicate(userID uint, year int, semester int) (bool, error) {
	var count int64
	// เช็คในตาราง AwardForm ว่ามีข้อมูลที่ user_id, academic_year, semester ตรงกันไหม
	err := r.db.Model(&models.AwardForm{}).
		Where("user_id = ? AND academic_year = ? AND semester = ?", userID, year, semester).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *AwardRepository) UpdateAwardType(ctx context.Context, formID uint, awardType string) error {
	return r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Where("form_id = ?", formID).
		Updates(map[string]interface{}{
			"award_type":    awardType,
			"latest_update": time.Now(),
		}).Error
}

func (r *AwardRepository) UpdateFormStatus(ctx context.Context, formID uint, formStatus int, rejectReason string) error {
	return r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Where("form_id = ?", formID).
		Updates(map[string]interface{}{
			"form_status_id": formStatus,
			"reject_reason":  rejectReason,
			"latest_update":  time.Now(),
		}).Error
}

func (r *AwardRepository) CreateAwardApprovalLog(ctx context.Context, log *models.AwardApprovalLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *AwardRepository) CreateAwardSignedLog(ctx context.Context, log *models.AwardSignedLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *AwardRepository) SaveAwardTypeLog(ctx context.Context, log *models.AwardTypeLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *AwardRepository) GetAwardTypeLogs(ctx context.Context, filter AwardTypeLogFilter) ([]models.AwardTypeLog, error) {
	logs := make([]models.AwardTypeLog, 0)

	order := strings.ToUpper(strings.TrimSpace(filter.SortOrder))
	if order != "ASC" {
		order = "DESC"
	}

	query := r.db.WithContext(ctx).Model(&models.AwardTypeLog{})

	keyword := strings.TrimSpace(filter.Keyword)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where(
			`CAST(form_id AS TEXT) ILIKE ? OR CAST(user_id AS TEXT) ILIKE ? OR old_value ILIKE ? OR new_value ILIKE ? OR reject_reason ILIKE ?`,
			like, like, like, like, like,
		)
	}

	err := query.Order("changed_at " + order).Find(&logs).Error
	if err != nil {
		return nil, err
	}

	return logs, nil
}

func (r *AwardRepository) IsCommitteeNonChairman(ctx context.Context, userID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("\"Committee\" c").
		Joins("JOIN \"User\" u ON u.user_id = c.user_id").
		Where("c.user_id = ?", userID).
		Where("u.role_id = ?", 6).
		Where("c.is_chairman = ?", false).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *AwardRepository) IsCommitteeChairman(ctx context.Context, userID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("\"Committee\" c").
		Joins("JOIN \"User\" u ON u.user_id = c.user_id").
		Where("c.user_id = ?", userID).
		Where("u.role_id = ?", 6).
		Where("c.is_chairman = ?", true).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *AwardRepository) UpsertCommitteeVoteLog(ctx context.Context, formID uint, userID uint, operation string) error {
	var existing models.CommitteeVoteLog
	err := r.db.WithContext(ctx).
		Where("form_id = ? AND user_id = ?", formID, userID).
		First(&existing).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			log := &models.CommitteeVoteLog{
				FormID:    formID,
				UserID:    userID,
				Operation: operation,
				VotedAt:   time.Now(),
			}
			return r.db.WithContext(ctx).Create(log).Error
		}
		return err
	}

	existing.Operation = operation
	existing.VotedAt = time.Now()
	return r.db.WithContext(ctx).Save(&existing).Error
}

func (r *AwardRepository) CountNonChairmanCommittees(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Table("\"Committee\" c").
		Joins("JOIN \"User\" u ON u.user_id = c.user_id").
		Where("u.role_id = ?", 6).
		Where("c.is_chairman = ?", false).
		Count(&total).Error
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (r *AwardRepository) CountCommitteeVotesByOperation(ctx context.Context, formID uint, operation string) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&models.CommitteeVoteLog{}).
		Where("form_id = ? AND operation = ?", formID, operation).
		Count(&total).Error
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (r *AwardRepository) GetApprovalLogsByUserID(ctx context.Context, userID uint) ([]models.AwardApprovalLog, error) {
	var logs []models.AwardApprovalLog
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("approved_at desc").
		Find(&logs).Error
	return logs, err
}

func (r *AwardRepository) GetSignedLogsByUserID(ctx context.Context, userID uint) ([]models.AwardSignedLog, error) {
	var logs []models.AwardSignedLog
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("signed_at desc").
		Find(&logs).Error
	return logs, err
}

func (r *AwardRepository) GetCommitteeVoteLogsByUserID(ctx context.Context, filter CommitteeVoteLogSearchFilter) ([]models.CommitteeVoteLog, int64, error) {
	var logs []models.CommitteeVoteLog
	var total int64

	query := r.db.WithContext(ctx).
		Table(`"Committee_Vote_Log" AS cvl`).
		Joins(`JOIN "Award_Form" af ON af.form_id = cvl.form_id`).
		Where("cvl.user_id = ?", filter.UserID)

	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		query = query.Where(
			"af.student_firstname LIKE ? OR af.student_lastname LIKE ? OR af.student_number LIKE ? OR CONCAT(af.student_firstname, ' ', af.student_lastname) LIKE ?",
			like, like, like, like,
		)
	}

	if filter.Date != "" {
		query = query.Where("DATE(cvl.voted_at) = ?", filter.Date)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.Limit

	err := query.Select(`
		cvl.vote_log_id AS vote_log_id,
		cvl.form_id AS form_id,
		cvl.user_id AS user_id,
		cvl.operation AS operation,
		cvl.voted_at AS voted_at
	`).
		Order("cvl.voted_at desc").
		Limit(filter.Limit).
		Offset(offset).
		Scan(&logs).Error

	return logs, total, err
}

// GetApprovalLogByID fetches a single approval log by its ID
func (r *AwardRepository) GetApprovalLogByID(ctx context.Context, approvalLogID uint) (*models.AwardApprovalLog, error) {
	var log models.AwardApprovalLog
	err := r.db.WithContext(ctx).
		Where("approval_log_id = ?", approvalLogID).
		First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetAllAwardTypes ดึง award_type ทั้งหมดที่มีในตาราง (ไม่ซ้ำกัน)
func (r *AwardRepository) GetAllAwardTypes(ctx context.Context) ([]string, error) {
	var awardTypes []string
	err := r.db.WithContext(ctx).
		Model(&models.AwardForm{}).
		Distinct("award_type").
		Order("award_type ASC").
		Pluck("award_type", &awardTypes).Error

	if err != nil {
		return nil, err
	}

	return awardTypes, nil
}