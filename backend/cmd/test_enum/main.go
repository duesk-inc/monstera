package main

import (
	"fmt"
	"log"
	"os"

	"github.com/duesk/monstera/internal/model"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// データベース接続設定
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		getEnv("DB_USER", "monstera"),
		getEnv("DB_PASSWORD", "password"),
		getEnv("DB_HOST", "mysql"),
		getEnv("DB_PORT", "3306"),
		getEnv("DB_NAME", "monstera"),
	)

	// GORM接続（ログ出力を有効化）
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 特定の週報をIDで取得
	reportIDs := []string{
		"550b2746-2dcc-4831-9c77-14c3c26022df",
		"60e2c652-58bb-4bb6-9eb9-13c893e73a0f",
	}

	fmt.Println("=== Testing GORM ENUM retrieval ===")
	for _, id := range reportIDs {
		var report model.WeeklyReport
		result := db.First(&report, "id = ?", id)
		if result.Error != nil {
			fmt.Printf("Error fetching report %s: %v\n", id, result.Error)
			continue
		}

		fmt.Printf("\nReport ID: %s\n", report.ID)
		fmt.Printf("Status: '%s'\n", report.Status)
		fmt.Printf("Status length: %d\n", len(report.Status))
		fmt.Printf("Status bytes: %v\n", []byte(report.Status))
		fmt.Printf("Status quoted: %q\n", report.Status)

		// 生SQLでも確認
		var rawStatus string
		db.Raw("SELECT status FROM weekly_reports WHERE id = ?", id).Scan(&rawStatus)
		fmt.Printf("Raw SQL status: '%s'\n", rawStatus)
		fmt.Printf("Raw SQL status length: %d\n", len(rawStatus))
	}

	// ENUM値の可能な値を確認
	fmt.Println("\n=== Testing all ENUM values ===")
	type StatusCount struct {
		Status string
		Count  int
	}
	var statusCounts []StatusCount
	db.Raw("SELECT status, COUNT(*) as count FROM weekly_reports GROUP BY status").Scan(&statusCounts)
	for _, sc := range statusCounts {
		fmt.Printf("Status: '%s' (Count: %d, Length: %d)\n", sc.Status, sc.Count, len(sc.Status))
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
