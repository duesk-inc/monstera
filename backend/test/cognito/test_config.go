package cognito

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestConfig テスト用設定
type TestConfig struct {
	DB           *gorm.DB
	Config       *config.Config
	Logger       *zap.Logger
	CleanupFuncs []func() error
}

// TestUser テスト用ユーザーデータ
type TestUser struct {
	ID          uuid.UUID
	Email       string
	Password    string
	FirstName   string
	LastName    string
	Role        model.Role
	CognitoSub  string
	PhoneNumber string
	Status      string
}

// SetupTestConfig テスト用設定を初期化
func SetupTestConfig() (*TestConfig, error) {
	// テスト用ロガー作成
	logger, err := zap.NewDevelopment()
	if err != nil {
		return nil, fmt.Errorf("failed to create test logger: %w", err)
	}

	// テスト用設定読み込み
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load test config: %w", err)
	}

	// テスト用Cognito設定を上書き
	cfg.Cognito.Enabled = true
	cfg.Cognito.Region = "us-east-1"
	cfg.Cognito.UserPoolID = "local_7221v1tw"
	cfg.Cognito.ClientID = "62h69i1tpbn9rmh83xmtjyj4b"
	cfg.Cognito.ClientSecret = "47c44j2dkj2y4tkf777zqgpiw"
	cfg.Cognito.Endpoint = "http://localhost:9230"

	// テスト用データベース接続
	db, err := setupTestDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to setup test database: %w", err)
	}

	return &TestConfig{
		DB:           db,
		Config:       cfg,
		Logger:       logger,
		CleanupFuncs: []func() error{},
	}, nil
}

// setupTestDatabase テスト用データベースを設定
func setupTestDatabase(cfg *config.Config) (*gorm.DB, error) {
	// テスト用データベース名を生成
	testDBName := fmt.Sprintf("monstera_test_%d", time.Now().Unix())

	// メインデータベースに接続してテストDBを作成
	mainDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User, cfg.Database.Password, cfg.Database.Host, cfg.Database.Port)

	mainDB, err := gorm.Open(mysql.Open(mainDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to main database: %w", err)
	}

	// テストデータベースを作成
	if err := mainDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", testDBName)).Error; err != nil {
		return nil, fmt.Errorf("failed to create test database: %w", err)
	}

	// テストデータベースに接続
	testDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User, cfg.Database.Password, cfg.Database.Host, cfg.Database.Port, testDBName)

	testDB, err := gorm.Open(mysql.Open(testDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to test database: %w", err)
	}

	// テーブル作成（マイグレーション）
	if err := autoMigrateTestTables(testDB); err != nil {
		return nil, fmt.Errorf("failed to migrate test tables: %w", err)
	}

	return testDB, nil
}

// autoMigrateTestTables テスト用テーブルを作成
func autoMigrateTestTables(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Session{},
		&model.UserRole{},
		&model.Department{},
	)
}

// Cleanup テスト後のクリーンアップ
func (tc *TestConfig) Cleanup() error {
	// 登録されたクリーンアップ関数を実行
	for _, cleanup := range tc.CleanupFuncs {
		if err := cleanup(); err != nil {
			tc.Logger.Error("Cleanup function failed", zap.Error(err))
		}
	}

	// データベースの削除
	if tc.DB != nil {
		// データベース名を取得
		var dbName string
		tc.DB.Raw("SELECT DATABASE()").Scan(&dbName)

		if dbName != "" && dbName != "monstera" { // 本番DBは削除しない
			// 接続を閉じる
			sqlDB, err := tc.DB.DB()
			if err == nil {
				sqlDB.Close()
			}

			// メインDBに接続し直してテストDBを削除
			mainDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
				tc.Config.Database.User, tc.Config.Database.Password, tc.Config.Database.Host, tc.Config.Database.Port)

			mainDB, err := gorm.Open(mysql.Open(mainDSN), &gorm.Config{
				Logger: logger.Default.LogMode(logger.Silent),
			})
			if err == nil {
				mainDB.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s", dbName))
				sqlDB, _ := mainDB.DB()
				sqlDB.Close()
			}
		}
	}

	return nil
}

// AddCleanupFunc クリーンアップ関数を追加
func (tc *TestConfig) AddCleanupFunc(cleanup func() error) {
	tc.CleanupFuncs = append(tc.CleanupFuncs, cleanup)
}

// CreateTestUser テスト用ユーザーを作成
func (tc *TestConfig) CreateTestUser(email string, role model.Role) *TestUser {
	return &TestUser{
		ID:          uuid.New(),
		Email:       email,
		Password:    "Test123!@#",
		FirstName:   "Test",
		LastName:    "User",
		Role:        role,
		CognitoSub:  uuid.New().String(),
		PhoneNumber: "+81901234567",
		Status:      "active",
	}
}

// GetTestUsers テスト用ユーザーデータセットを取得
func GetTestUsers() []*TestUser {
	return []*TestUser{
		{
			ID:          uuid.New(),
			Email:       "admin@test.com",
			Password:    "Admin123!@#",
			FirstName:   "Admin",
			LastName:    "User",
			Role:        1, // admin
			CognitoSub:  uuid.New().String(),
			PhoneNumber: "+81901234567",
			Status:      "active",
		},
		{
			ID:          uuid.New(),
			Email:       "manager@test.com",
			Password:    "Manager123!@#",
			FirstName:   "Manager",
			LastName:    "User",
			Role:        3, // manager
			CognitoSub:  uuid.New().String(),
			PhoneNumber: "+81901234568",
			Status:      "active",
		},
		{
			ID:          uuid.New(),
			Email:       "employee@test.com",
			Password:    "Employee123!@#",
			FirstName:   "Employee",
			LastName:    "User",
			Role:        4, // employee
			CognitoSub:  uuid.New().String(),
			PhoneNumber: "+81901234569",
			Status:      "active",
		},
	}
}

// IsCognitoLocalRunning Cognito-Localが動作しているかチェック
func IsCognitoLocalRunning() bool {
	if os.Getenv("SKIP_COGNITO_LOCAL") == "true" {
		return false
	}
	// 簡易的なヘルスチェック（実際のテストではより詳細なチェックを行う）
	return os.Getenv("COGNITO_ENDPOINT") != ""
}

// SkipIfCognitoLocalNotRunning Cognito-Localが動作していない場合はテストをスキップ
func SkipIfCognitoLocalNotRunning(t interface{ Skip(...interface{}) }) {
	if !IsCognitoLocalRunning() {
		t.Skip("Cognito-Local is not running, skipping test")
	}
}

// TestContext テスト用コンテキスト
func TestContext() context.Context {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	// テスト終了時にはキャンセルされることを想定
	_ = cancel
	return ctx
}
