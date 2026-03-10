package main

import (
	"backend/config"
	"backend/internal/models"
	"backend/internal/server"
	"backend/migration"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	// 1. โหลดไฟล์ .env (สำหรับค่า Client ID, Secret และ DB Config)
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// 2. เชื่อมต่อ Database และทำ Auto Migration
	// ตรวจสอบให้แน่ใจว่าใน config/db.go มีการคืนค่า *gorm.DB ออกมา
	db := config.ConnectDB()

	fmt.Println("Create database tables if not exist...")
	if err := db.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.Campus{},
		&models.AcademicYear{},
		&models.Faculty{},
		&models.Department{},
		&models.Student{},
		&models.StudentDevelopment{},
		&models.AwardForm{},
		&models.AwardApprovalLog{},
		&models.CommitteeVoteLog{},
		&models.AwardSignedLog{},
		&models.AwardTypeLog{},
		&models.AwardFileDirectory{},
		&models.FormStatus{},
		&models.Committee{},
		&models.Dean{},
		&models.AssociateDean{},
		&models.HeadOfDepartment{},
		&models.Chancellor{},
		&models.Organization{},
	); err != nil {
		log.Fatal("Migration failed: ", err)
	}

	// 2.5 สร้าง uploads folder อัตโนมัติ
	uploadsDir := filepath.Join("uploads", "pdf")
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		log.Fatal("Failed to create uploads directory: ", err)
	}
	fmt.Println("✓ Uploads directory ready")

	// 2.6 Seed Campus ลงฐานข้อมูล
	fmt.Println("Seeding Campus data...")
	if err := migration.SeedCampus(db); err != nil {
		log.Fatal("Seeding Campus failed: ", err)
	}
	fmt.Println("✓ Campus seeded successfully")

	// 2.7 Seed FormStatus ลงฐานข้อมูล
	fmt.Println("Seeding FormStatus data...")
	if err := migration.SeedFormStatus(db); err != nil {
		log.Fatal("Seeding FormStatus failed: ", err)
	}
	fmt.Println("✓ FormStatus seeded successfully")

	// 2.8 Seed Role ลงฐานข้อมูล
	fmt.Println("Seeding Role data...")
	if err := migration.SeedRole(db); err != nil {
		log.Fatal("Seeding Role failed: ", err)
	}
	fmt.Println("✓ Role seeded successfully")

	// 2.9 Seed Faculty และ Department ลงฐานข้อมูล
	fmt.Println("Seeding Faculty and Department data...")
	if err := migration.SeedFacultyAndDepartments(db); err != nil {
		log.Fatal("Seeding Faculty and Department failed: ", err)
	}
	fmt.Println("✓ Faculty and Department seeded successfully")

	// 3. ตั้งค่า Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Backend JA",
<<<<<<< HEAD
=======
		BodyLimit: 10 * 1024 * 1024, // 10 MB
>>>>>>> develop
	})

	// 4. ตั้งค่า Routes (ส่ง db เข้าไปเชื่อมต่อกับ Repository/Usecase/Handler)
	server.SetupRoutes(app, db)

	// 5. รัน Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // ใช้ port 8080 เป็นค่าเริ่มต้นตามที่ตั้งใน Google Console
	}

	fmt.Printf("🚀 Server is starting on http://localhost:%s\n", port)
	log.Fatal(app.Listen(":" + port))
}
