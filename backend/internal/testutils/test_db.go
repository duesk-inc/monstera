package testutils

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	migratemysql "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestDB は테스ト用データベース設定を保持します
type TestDB struct {
	DB       *gorm.DB
	migrate  *migrate.Migrate
	testName string
}

// NewTestDB はテスト用データベースを作成します
func NewTestDB(t *testing.T) *TestDB {
	dbName := fmt.Sprintf("monstera_test_%s", sanitizeTestName(t.Name()))

	// Root connection for database management
	rootDSN := "root:password@tcp(localhost:3306)/?charset=utf8mb4&parseTime=True&loc=Local"
	rootDB, err := sql.Open("mysql", rootDSN)
	if err != nil {
		t.Fatalf("Failed to connect to MySQL: %v", err)
	}
	defer rootDB.Close()

	// Create test database
	_, err = rootDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", dbName))
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Connect to test database
	testDSN := fmt.Sprintf("root:password@tcp(localhost:3306)/%s?charset=utf8mb4&parseTime=True&loc=Local", dbName)
	db, err := gorm.Open(mysql.Open(testDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // Suppress logs in tests
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("Failed to get underlying sql.DB: %v", err)
	}

	// Setup migrate instance
	driver, err := migratemysql.WithInstance(sqlDB, &migratemysql.Config{})
	if err != nil {
		t.Fatalf("Failed to create migrate driver: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://../../migrations",
		"mysql",
		driver,
	)
	if err != nil {
		t.Fatalf("Failed to create migrate instance: %v", err)
	}

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	return &TestDB{
		DB:       db,
		migrate:  m,
		testName: dbName,
	}
}

// Close はテストデータベースをクリーンアップします
func (tdb *TestDB) Close(t *testing.T) {
	// Drop all tables
	if err := tdb.migrate.Down(); err != nil && err != migrate.ErrNoChange {
		t.Logf("Warning: Failed to drop tables: %v", err)
	}

	// Close migrate instance
	sourceErr, dbErr := tdb.migrate.Close()
	if sourceErr != nil {
		t.Logf("Warning: Failed to close migrate source: %v", sourceErr)
	}
	if dbErr != nil {
		t.Logf("Warning: Failed to close migrate database: %v", dbErr)
	}

	// Close GORM connection
	sqlDB, err := tdb.DB.DB()
	if err != nil {
		t.Logf("Warning: Failed to get underlying sql.DB: %v", err)
		return
	}
	sqlDB.Close()

	// Drop test database
	rootDSN := "root:password@tcp(localhost:3306)/?charset=utf8mb4&parseTime=True&loc=Local"
	rootDB, err := sql.Open("mysql", rootDSN)
	if err != nil {
		t.Logf("Warning: Failed to connect to MySQL for cleanup: %v", err)
		return
	}
	defer rootDB.Close()

	_, err = rootDB.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s", tdb.testName))
	if err != nil {
		t.Logf("Warning: Failed to drop test database: %v", err)
	}
}

// TruncateTable はテーブルのデータをクリアします
func (tdb *TestDB) TruncateTable(tableName string) error {
	return tdb.DB.Exec(fmt.Sprintf("TRUNCATE TABLE %s", tableName)).Error
}

// sanitizeTestName はテスト名をデータベース名として使用可能な形式に変換します
func sanitizeTestName(name string) string {
	// Remove special characters and replace with underscores
	result := ""
	for _, char := range name {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') {
			result += string(char)
		} else {
			result += "_"
		}
	}
	return result
}

// SetupTestDB はテスト用データベースのセットアップの簡略化バージョンです
func SetupTestDB(t *testing.T) *gorm.DB {
	testDB := NewTestDB(t)
	// Cleanup when test finishes
	t.Cleanup(func() {
		testDB.Close(t)
	})
	return testDB.DB
}

// SetupTestEnvironment は環境変数を設定します
func SetupTestEnvironment() {
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "3306")
	os.Setenv("DB_USER", "root")
	os.Setenv("DB_PASSWORD", "password")
	os.Setenv("DB_NAME", "monstera_test")
	os.Setenv("JWT_SECRET", "test-secret-key")
	os.Setenv("GIN_MODE", "test")
}
