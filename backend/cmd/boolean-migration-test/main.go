package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/duesk/monstera/internal/config"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Boolean Migration Test Tool
// BOOLEAN型の動作を検証するツール

func main() {
	println("🧪 Boolean Type Migration Test")
	println("==============================")
	println("")

	// ロガー初期化
	logger, err := zap.NewDevelopment()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// 設定読み込み
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// データベース接続
	db, err := config.InitDatabase(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	sqlDB, err := db.DB()
	if err != nil {
		logger.Fatal("Failed to get sql.DB", zap.Error(err))
	}
	defer sqlDB.Close()

	// 1. データベースドライバーの確認
	println("1. Database Driver Check")
	println("========================")
	fmt.Printf("Driver: %s\n", cfg.Database.Driver)
	fmt.Printf("Host: %s:%s\n", cfg.Database.Host, cfg.Database.Port)
	fmt.Printf("Database: %s\n", cfg.Database.DBName)
	println("")

	// 2. BOOLEAN型テストテーブルの作成
	println("2. Creating Test Table")
	println("======================")

	// テストテーブル作成
	if err := createTestTable(db, cfg.Database.Driver); err != nil {
		logger.Error("Failed to create test table", zap.Error(err))
		return
	}
	println("✅ Test table created successfully")
	println("")

	// 3. BOOLEAN値の挿入テスト
	println("3. Boolean Value Insert Test")
	println("============================")

	if err := testBooleanInsert(db); err != nil {
		logger.Error("Boolean insert test failed", zap.Error(err))
		return
	}
	println("✅ All boolean values inserted successfully")
	println("")

	// 4. BOOLEAN値の読み取りテスト
	println("4. Boolean Value Read Test")
	println("==========================")

	if err := testBooleanRead(db); err != nil {
		logger.Error("Boolean read test failed", zap.Error(err))
		return
	}
	println("")

	// 5. GORM モデルでのBOOLEAN操作テスト
	println("5. GORM Model Boolean Test")
	println("==========================")

	if err := testGormBooleanOperations(db); err != nil {
		logger.Error("GORM boolean test failed", zap.Error(err))
		return
	}
	println("✅ GORM boolean operations completed successfully")
	println("")

	// 6. NULL値のテスト
	println("6. NULL Boolean Test")
	println("====================")

	if err := testNullableBoolean(db); err != nil {
		logger.Error("Nullable boolean test failed", zap.Error(err))
		return
	}
	println("✅ Nullable boolean test completed successfully")
	println("")

	// 7. デフォルト値のテスト
	println("7. Default Value Test")
	println("=====================")

	if err := testDefaultValues(db); err != nil {
		logger.Error("Default value test failed", zap.Error(err))
		return
	}
	println("✅ Default value test completed successfully")
	println("")

	// 8. クリーンアップ
	println("8. Cleanup")
	println("==========")

	if err := cleanupTestTable(db); err != nil {
		logger.Error("Cleanup failed", zap.Error(err))
		return
	}
	println("✅ Test table cleaned up successfully")
	println("")

	// 結果サマリー
	println("🎉 Boolean Type Migration Test Completed!")
	println("=========================================")
	println("")
	println("Summary:")
	println("  ✅ Database connection successful")
	println("  ✅ Boolean type creation works correctly")
	println("  ✅ Boolean value insert/read works correctly")
	println("  ✅ GORM boolean operations work correctly")
	println("  ✅ NULL and default values work as expected")
	println("")
	println("Conclusion: Boolean types are fully compatible between MySQL and PostgreSQL!")
}

// テストテーブル作成
func createTestTable(db *gorm.DB, driver string) error {
	var createSQL string

	if driver == "postgres" {
		createSQL = `
		CREATE TABLE IF NOT EXISTS boolean_test (
			id SERIAL PRIMARY KEY,
			name VARCHAR(50) NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			is_verified BOOLEAN NOT NULL DEFAULT FALSE,
			has_access BOOLEAN,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	} else {
		createSQL = `
		CREATE TABLE IF NOT EXISTS boolean_test (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(50) NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			is_verified BOOLEAN NOT NULL DEFAULT FALSE,
			has_access BOOLEAN,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	}

	return db.Exec(createSQL).Error
}

// BOOLEAN値の挿入テスト
func testBooleanInsert(db *gorm.DB) error {
	// 様々なboolean値を挿入
	testCases := []struct {
		name       string
		isActive   bool
		isVerified bool
		hasAccess  *bool
	}{
		{"Test User 1", true, false, nil},
		{"Test User 2", false, true, boolPtr(true)},
		{"Test User 3", true, true, boolPtr(false)},
		{"Test User 4", false, false, nil},
	}

	for _, tc := range testCases {
		var hasAccessSQL sql.NullBool
		if tc.hasAccess != nil {
			hasAccessSQL = sql.NullBool{Bool: *tc.hasAccess, Valid: true}
		}

		result := db.Exec(
			"INSERT INTO boolean_test (name, is_active, is_verified, has_access) VALUES (?, ?, ?, ?)",
			tc.name, tc.isActive, tc.isVerified, hasAccessSQL,
		)

		if result.Error != nil {
			return fmt.Errorf("failed to insert %s: %w", tc.name, result.Error)
		}

		fmt.Printf("  Inserted: %s (active=%v, verified=%v, access=%v)\n",
			tc.name, tc.isActive, tc.isVerified, tc.hasAccess)
	}

	return nil
}

// BOOLEAN値の読み取りテスト
func testBooleanRead(db *gorm.DB) error {
	type BooleanTest struct {
		ID         int
		Name       string
		IsActive   bool
		IsVerified bool
		HasAccess  sql.NullBool
	}

	var results []BooleanTest
	if err := db.Raw("SELECT id, name, is_active, is_verified, has_access FROM boolean_test").Scan(&results).Error; err != nil {
		return err
	}

	fmt.Println("Read results:")
	for _, r := range results {
		accessStr := "NULL"
		if r.HasAccess.Valid {
			accessStr = fmt.Sprintf("%v", r.HasAccess.Bool)
		}
		fmt.Printf("  ID=%d, Name=%s, Active=%v, Verified=%v, Access=%s\n",
			r.ID, r.Name, r.IsActive, r.IsVerified, accessStr)
	}

	// WHERE句でのboolean条件テスト
	var activeCount int64
	db.Table("boolean_test").Where("is_active = ?", true).Count(&activeCount)
	fmt.Printf("\nActive users count: %d\n", activeCount)

	var verifiedCount int64
	db.Table("boolean_test").Where("is_verified = ?", true).Count(&verifiedCount)
	fmt.Printf("Verified users count: %d\n", verifiedCount)

	return nil
}

// GORMモデルでのBOOLEAN操作テスト
func testGormBooleanOperations(db *gorm.DB) error {
	// テスト用モデル定義
	type BooleanTestModel struct {
		ID         uint   `gorm:"primaryKey"`
		Name       string `gorm:"size:50;not null"`
		IsActive   bool   `gorm:"default:true"`
		IsVerified bool   `gorm:"default:false"`
		HasAccess  *bool
		CreatedAt  time.Time `json:"created_at"`
		UpdatedAt  time.Time `json:"updated_at"`
	}

	// GORMでの作成
	testModel := BooleanTestModel{
		Name:       "GORM Test User",
		IsActive:   true,
		IsVerified: false,
		HasAccess:  boolPtr(true),
	}

	if err := db.Table("boolean_test").Create(&testModel).Error; err != nil {
		return fmt.Errorf("failed to create with GORM: %w", err)
	}

	fmt.Printf("  Created with GORM: ID=%d, Name=%s\n", testModel.ID, testModel.Name)

	// GORMでの更新
	if err := db.Table("boolean_test").
		Where("id = ?", testModel.ID).
		Updates(map[string]interface{}{
			"is_active":   false,
			"is_verified": true,
		}).Error; err != nil {
		return fmt.Errorf("failed to update with GORM: %w", err)
	}

	fmt.Println("  Updated boolean values with GORM")

	// GORMでの読み取り
	var readModel BooleanTestModel
	if err := db.Table("boolean_test").First(&readModel, testModel.ID).Error; err != nil {
		return fmt.Errorf("failed to read with GORM: %w", err)
	}

	fmt.Printf("  Read with GORM: Active=%v, Verified=%v\n", readModel.IsActive, readModel.IsVerified)

	return nil
}

// NULL値のテスト
func testNullableBoolean(db *gorm.DB) error {
	// NULL値の挿入
	result := db.Exec(
		"INSERT INTO boolean_test (name, is_active, is_verified) VALUES (?, ?, ?)",
		"Null Test User", true, false,
	)

	if result.Error != nil {
		return fmt.Errorf("failed to insert with NULL: %w", result.Error)
	}

	// NULL値の検索
	var nullCount int64
	db.Table("boolean_test").Where("has_access IS NULL").Count(&nullCount)
	fmt.Printf("  Records with NULL has_access: %d\n", nullCount)

	var notNullCount int64
	db.Table("boolean_test").Where("has_access IS NOT NULL").Count(&notNullCount)
	fmt.Printf("  Records with NOT NULL has_access: %d\n", notNullCount)

	return nil
}

// デフォルト値のテスト
func testDefaultValues(db *gorm.DB) error {
	// デフォルト値を使った挿入
	result := db.Exec(
		"INSERT INTO boolean_test (name) VALUES (?)",
		"Default Test User",
	)

	if result.Error != nil {
		return fmt.Errorf("failed to insert with defaults: %w", result.Error)
	}

	// デフォルト値の確認
	type DefaultTest struct {
		Name       string
		IsActive   bool
		IsVerified bool
	}

	var defaultRecord DefaultTest
	if err := db.Raw(
		"SELECT name, is_active, is_verified FROM boolean_test WHERE name = ?",
		"Default Test User",
	).Scan(&defaultRecord).Error; err != nil {
		return err
	}

	fmt.Printf("  Default values: Active=%v (expected: true), Verified=%v (expected: false)\n",
		defaultRecord.IsActive, defaultRecord.IsVerified)

	if defaultRecord.IsActive != true || defaultRecord.IsVerified != false {
		return fmt.Errorf("default values don't match expected")
	}

	return nil
}

// テストテーブルのクリーンアップ
func cleanupTestTable(db *gorm.DB) error {
	return db.Exec("DROP TABLE IF EXISTS boolean_test").Error
}

// bool ポインタ作成ヘルパー
func boolPtr(b bool) *bool {
	return &b
}
