package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

const (
	// テストユーザー数
	TotalUsers = 500
	
	// 部署数
	DepartmentCount = 10
	
	// マネージャー数
	ManagerCount = 50
)

type TestDataGenerator struct {
	db *sql.DB
}

func main() {
	// .envファイルの読み込み
	if err := godotenv.Load("../../../.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// データベース接続
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		getEnv("DB_USER", "root"),
		getEnv("DB_PASSWORD", "password"),
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "3306"),
		getEnv("DB_NAME", "monstera"),
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	generator := &TestDataGenerator{db: db}
	
	// テストデータ生成
	log.Println("Starting test data generation for 500 users...")
	
	// 1. 部署データ生成
	if err := generator.generateDepartments(); err != nil {
		log.Fatal("Failed to generate departments:", err)
	}
	
	// 2. ユーザーデータ生成
	if err := generator.generateUsers(); err != nil {
		log.Fatal("Failed to generate users:", err)
	}
	
	// 3. 週報データ生成（過去3ヶ月分）
	if err := generator.generateWeeklyReports(); err != nil {
		log.Fatal("Failed to generate weekly reports:", err)
	}
	
	// 4. 日次記録データ生成
	if err := generator.generateDailyRecords(); err != nil {
		log.Fatal("Failed to generate daily records:", err)
	}
	
	// 5. リマインダー設定生成
	if err := generator.generateReminderSettings(); err != nil {
		log.Fatal("Failed to generate reminder settings:", err)
	}
	
	log.Println("Test data generation completed successfully!")
}

func (g *TestDataGenerator) generateDepartments() error {
	log.Println("Generating departments...")
	
	// 既存の部署を削除（テスト用）
	_, err := g.db.Exec("DELETE FROM departments WHERE name LIKE 'Test Department%'")
	if err != nil {
		return err
	}
	
	for i := 1; i <= DepartmentCount; i++ {
		id := uuid.New()
		name := fmt.Sprintf("Test Department %02d", i)
		
		_, err := g.db.Exec(`
			INSERT INTO departments (id, name, created_at, updated_at)
			VALUES (?, ?, NOW(), NOW())
		`, id, name)
		
		if err != nil {
			return fmt.Errorf("failed to insert department %d: %w", i, err)
		}
	}
	
	log.Printf("Generated %d departments", DepartmentCount)
	return nil
}

func (g *TestDataGenerator) generateUsers() error {
	log.Println("Generating users...")
	
	// 既存のテストユーザーを削除
	_, err := g.db.Exec("DELETE FROM users WHERE email LIKE 'testuser%@duesk.co.jp'")
	if err != nil {
		return err
	}
	
	// 部署IDを取得
	rows, err := g.db.Query("SELECT id FROM departments WHERE name LIKE 'Test Department%' ORDER BY name")
	if err != nil {
		return err
	}
	defer rows.Close()
	
	var departmentIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		departmentIDs = append(departmentIDs, id)
	}
	
	// ユーザー生成
	for i := 1; i <= TotalUsers; i++ {
		userID := uuid.New()
		email := fmt.Sprintf("testuser%03d@duesk.co.jp", i)
		name := fmt.Sprintf("Test User %03d", i)
		employeeID := fmt.Sprintf("TEST%04d", i)
		
		// ロールの割り当て
		role := "ENGINEER"
		if i <= 10 {
			role = "ADMIN"
		} else if i <= 10+ManagerCount {
			role = "MANAGER"
		}
		
		// 部署の割り当て
		deptIndex := (i - 1) % len(departmentIDs)
		departmentID := departmentIDs[deptIndex]
		
		// ステータスの割り当て（90%はアクティブ、10%は非アクティブ）
		status := "active"
		if rand.Float64() < 0.1 {
			status = "inactive"
		}
		
		_, err := g.db.Exec(`
			INSERT INTO users (
				id, email, password, name, employee_id, department_id, 
				role, status, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		`, userID, email, "$2a$10$dummy.password.hash", name, employeeID, departmentID, role, status)
		
		if err != nil {
			return fmt.Errorf("failed to insert user %d: %w", i, err)
		}
		
		// プロフィール作成
		profileID := uuid.New()
		_, err = g.db.Exec(`
			INSERT INTO profiles (
				id, user_id, first_name, last_name, first_name_kana, last_name_kana,
				phone_number, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		`, profileID, userID, "Test", fmt.Sprintf("User%03d", i), "テスト", fmt.Sprintf("ユーザー%03d", i), "090-1234-5678")
		
		if err != nil {
			return fmt.Errorf("failed to insert profile for user %d: %w", i, err)
		}
	}
	
	log.Printf("Generated %d users", TotalUsers)
	return nil
}

func (g *TestDataGenerator) generateWeeklyReports() error {
	log.Println("Generating weekly reports...")
	
	// テストユーザーのIDを取得
	rows, err := g.db.Query("SELECT id FROM users WHERE email LIKE 'testuser%@duesk.co.jp' AND status = 'active' ORDER BY email")
	if err != nil {
		return err
	}
	defer rows.Close()
	
	var userIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		userIDs = append(userIDs, id)
	}
	
	// 過去3ヶ月分の週報を生成
	now := time.Now()
	startDate := now.AddDate(0, -3, 0)
	weekCount := 0
	reportCount := 0
	
	for current := startDate; current.Before(now); current = current.AddDate(0, 0, 7) {
		weekStart := getWeekStart(current)
		weekEnd := weekStart.AddDate(0, 0, 6)
		weekCount++
		
		for _, userID := range userIDs {
			// 80%の確率で週報を作成（20%は未提出）
			if rand.Float64() > 0.8 {
				continue
			}
			
			reportID := uuid.New()
			
			// ステータスの割り当て
			// 最新週は draft/submitted の混在
			// 過去の週は submitted/approved の混在
			status := "submitted"
			if weekCount == 1 { // 最新週
				if rand.Float64() < 0.3 {
					status = "draft"
				}
			} else { // 過去の週
				if rand.Float64() < 0.7 {
					status = "approved"
				}
			}
			
			// 週次気分（1-5のランダム）
			weeklyMood := rand.Intn(5) + 1
			
			// コメント
			comment := fmt.Sprintf("Week %d test report for performance testing", weekCount)
			
			_, err := g.db.Exec(`
				INSERT INTO weekly_reports (
					id, user_id, week_start, week_end, status, 
					weekly_mood, comment, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
			`, reportID, userID, weekStart, weekEnd, status, weeklyMood, comment)
			
			if err != nil {
				return fmt.Errorf("failed to insert weekly report: %w", err)
			}
			
			reportCount++
		}
	}
	
	log.Printf("Generated %d weekly reports for %d weeks", reportCount, weekCount)
	return nil
}

func (g *TestDataGenerator) generateDailyRecords() error {
	log.Println("Generating daily records...")
	
	// 週報を取得
	rows, err := g.db.Query(`
		SELECT id, week_start, week_end 
		FROM weekly_reports 
		WHERE comment LIKE '%test report for performance testing%'
		ORDER BY week_start DESC
		LIMIT 1000
	`)
	if err != nil {
		return err
	}
	defer rows.Close()
	
	recordCount := 0
	for rows.Next() {
		var reportID, weekStart, weekEnd string
		if err := rows.Scan(&reportID, &weekStart, &weekEnd); err != nil {
			return err
		}
		
		start, _ := time.Parse("2006-01-02", weekStart)
		end, _ := time.Parse("2006-01-02", weekEnd)
		
		// 各日の記録を生成
		for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
			// 土日はスキップ（80%の確率）
			if (d.Weekday() == time.Saturday || d.Weekday() == time.Sunday) && rand.Float64() < 0.8 {
				continue
			}
			
			recordID := uuid.New()
			workStartTime := "09:00:00"
			workEndTime := "18:00:00"
			breakMinutes := 60
			
			// ランダムな作業時間
			if rand.Float64() < 0.2 {
				workEndTime = fmt.Sprintf("%02d:00:00", 18+rand.Intn(3))
			}
			
			// 日次気分（1-5のランダム）
			dailyMood := rand.Intn(5) + 1
			
			// 作業内容
			tasks := fmt.Sprintf("Test task for %s", d.Format("2006-01-02"))
			
			_, err := g.db.Exec(`
				INSERT INTO daily_records (
					id, weekly_report_id, record_date, work_start_time, work_end_time,
					break_minutes, daily_mood, tasks, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
			`, recordID, reportID, d.Format("2006-01-02"), workStartTime, workEndTime, breakMinutes, dailyMood, tasks)
			
			if err != nil {
				return fmt.Errorf("failed to insert daily record: %w", err)
			}
			
			recordCount++
		}
	}
	
	log.Printf("Generated %d daily records", recordCount)
	return nil
}

func (g *TestDataGenerator) generateReminderSettings() error {
	log.Println("Generating reminder settings...")
	
	// デフォルトのリマインダー設定
	settings := []struct {
		reminderType string
		dayOfWeek    int
		hour         int
		minute       int
		isActive     bool
		message      string
	}{
		{"weekly_report_submission", 5, 17, 0, true, "週報提出のリマインダー: 本日の提出期限は18:00です。"},
		{"weekly_report_draft", 1, 9, 0, true, "週報下書きのリマインダー: 今週の週報を準備しましょう。"},
		{"monthly_summary", 1, 10, 0, true, "月次サマリーのリマインダー: 先月の振り返りをお願いします。"},
	}
	
	// 既存の設定を削除
	_, err := g.db.Exec("DELETE FROM reminder_settings WHERE message LIKE '%リマインダー%'")
	if err != nil {
		return err
	}
	
	for _, s := range settings {
		id := uuid.New()
		_, err := g.db.Exec(`
			INSERT INTO reminder_settings (
				id, reminder_type, day_of_week, hour, minute, 
				is_active, message, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		`, id, s.reminderType, s.dayOfWeek, s.hour, s.minute, s.isActive, s.message)
		
		if err != nil {
			return fmt.Errorf("failed to insert reminder setting: %w", err)
		}
	}
	
	log.Printf("Generated %d reminder settings", len(settings))
	return nil
}

func getWeekStart(date time.Time) time.Time {
	// 月曜日を週の始まりとする
	offset := int(time.Monday - date.Weekday())
	if offset > 0 {
		offset = -6
	}
	return date.AddDate(0, 0, offset).Truncate(24 * time.Hour)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}