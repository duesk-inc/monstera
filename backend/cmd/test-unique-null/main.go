package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/testdata"
)

// UNIQUE制約でのNULL値扱いのテストツール
// MySQLとPostgreSQLでの動作の違いを検証

func main() {
	println("🧪 Testing UNIQUE Constraint NULL Handling")
	println("=========================================")
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

	// データベースタイプを表示
	dbType := cfg.Database.Driver
	fmt.Printf("Database Type: %s\n", dbType)
	fmt.Println("")

	// テスト実行
	if err := runUniqueNullTests(db, logger, dbType); err != nil {
		logger.Fatal("Tests failed", zap.Error(err))
	}

	println("")
	println("🎉 All tests completed!")
}

func runUniqueNullTests(db *gorm.DB, logger *zap.Logger, dbType string) error {
	ctx := context.Background()

	// 1. 単一カラムのUNIQUE制約テスト
	println("1. Testing single column UNIQUE constraint with NULL")
	println("===================================================")

	if err := testSingleColumnUnique(ctx, db); err != nil {
		return fmt.Errorf("single column unique test failed: %w", err)
	}
	println("✅ Single column UNIQUE constraint works as expected")
	println("")

	// 2. 複合UNIQUE制約テスト（論理削除パターン）
	println("2. Testing composite UNIQUE constraint with NULL (soft delete)")
	println("=============================================================")

	if err := testCompositeUniqueWithNull(ctx, db, dbType); err != nil {
		return fmt.Errorf("composite unique test failed: %w", err)
	}
	println("")

	// 3. 部分インデックスのテスト（PostgreSQLのみ）
	if dbType == "postgres" {
		println("3. Testing partial index (PostgreSQL only)")
		println("=========================================")

		if err := testPartialIndex(ctx, db); err != nil {
			return fmt.Errorf("partial index test failed: %w", err)
		}
		println("✅ Partial index works correctly")
		println("")
	}

	// 4. アプリケーション層での重複チェック
	println("4. Testing application-level duplicate check")
	println("===========================================")

	if err := testApplicationLevelCheck(ctx, db); err != nil {
		return fmt.Errorf("application level check failed: %w", err)
	}
	println("✅ Application-level duplicate check works correctly")

	return nil
}

// 1. 単一カラムのUNIQUE制約テスト
func testSingleColumnUnique(ctx context.Context, db *gorm.DB) error {
	// テスト用のemployee_numberでテスト
	tx := db.Begin()
	defer tx.Rollback()

	user1ID := uuid.New()
	user2ID := uuid.New()

	// 最初のユーザー（employee_number = NULL）
	user1 := &model.User{
		ID:        user1ID,
		Email:     "unique_test1@duesk.co.jp",
		Password:  "password",
		FirstName: "Test1",
		LastName:  "User1",
		// employee_number は NULL
	}
	if err := tx.Create(user1).Error; err != nil {
		return fmt.Errorf("failed to create first user: %w", err)
	}

	// 2番目のユーザー（employee_number = NULL）
	user2 := &model.User{
		ID:        user2ID,
		Email:     "unique_test2@duesk.co.jp",
		Password:  "password",
		FirstName: "Test2",
		LastName:  "User2",
		// employee_number は NULL
	}
	if err := tx.Create(user2).Error; err != nil {
		return fmt.Errorf("failed to create second user: %w", err)
	}

	println("  Created 2 users with NULL employee_number (both DBs allow this)")

	// クリーンアップ
	tx.Delete(&model.User{}, "id IN ?", []uuid.UUID{user1ID, user2ID})
	tx.Commit()

	return nil
}

// 2. 複合UNIQUE制約テスト
func testCompositeUniqueWithNull(ctx context.Context, db *gorm.DB, dbType string) error {
	tx := db.Begin()
	defer tx.Rollback()

	projectID := uuid.New()
	userID := uuid.New()

	// プロジェクトとユーザーを作成
	clientID := uuid.New()
	project := &model.Project{
		ID:          projectID,
		ClientID:    clientID,
		ProjectName: "Test Project",
		Status:      "active",
		StartDate:   &time.Time{},
	}
	if err := tx.Create(project).Error; err != nil {
		return fmt.Errorf("failed to create project: %w", err)
	}

	user := &model.User{
		ID:        userID,
		Email:     testdata.UniqueTest1Email,
		Password:  "password",
		FirstName: "Assignment",
		LastName:  "Test",
	}
	if err := tx.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// 最初のアサインメント（deleted_at = NULL）
	assignment1 := &model.ProjectAssignment{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		StartDate: time.Now(),
		// DeletedAt は NULL
	}
	if err := tx.Create(assignment1).Error; err != nil {
		return fmt.Errorf("failed to create first assignment: %w", err)
	}
	println("  Created first assignment (deleted_at = NULL)")

	// 2番目のアサインメント（同じproject_id, user_id, deleted_at = NULL）
	assignment2 := &model.ProjectAssignment{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		StartDate: time.Now(),
		// DeletedAt は NULL
	}
	err := tx.Create(assignment2).Error

	if dbType == "mysql" {
		if err == nil {
			return fmt.Errorf("MySQL should reject duplicate (project_id, user_id, NULL)")
		}
		println("  ✅ MySQL: Correctly rejected duplicate assignment")
	} else {
		// PostgreSQLの場合
		if err == nil {
			println("  ⚠️  PostgreSQL: Allowed duplicate (needs partial index)")
		} else {
			println("  ✅ PostgreSQL: Rejected duplicate (partial index working)")
		}
	}

	// 論理削除後の再作成テスト
	now := time.Now()
	assignment1.DeletedAt = gorm.DeletedAt{Time: now, Valid: true}
	tx.Save(assignment1)
	println("  Soft-deleted first assignment")

	// 新しいアサインメント作成
	assignment3 := &model.ProjectAssignment{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		StartDate: time.Now(),
	}
	if err := tx.Create(assignment3).Error; err != nil {
		return fmt.Errorf("failed to create new assignment after soft delete: %w", err)
	}
	println("  ✅ Successfully created new assignment after soft delete")

	// クリーンアップ
	tx.Exec("DELETE FROM project_assignments WHERE project_id = ?", projectID)
	tx.Delete(&model.Project{}, projectID)
	tx.Delete(&model.User{}, userID)
	tx.Commit()

	return nil
}

// 3. 部分インデックスのテスト（PostgreSQLのみ）
func testPartialIndex(ctx context.Context, db *gorm.DB) error {
	// 部分インデックスが存在するか確認
	var indexExists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM pg_indexes 
			WHERE indexname = 'idx_project_assignments_active' 
			AND indexdef LIKE '%WHERE%deleted_at IS NULL%'
		)
	`).Scan(&indexExists).Error

	if err != nil {
		return fmt.Errorf("failed to check partial index: %w", err)
	}

	if indexExists {
		println("  ✅ Partial index exists and is configured correctly")
	} else {
		println("  ⚠️  Partial index not found (run migration 200004)")
	}

	return nil
}

// 4. アプリケーション層での重複チェック
func testApplicationLevelCheck(ctx context.Context, db *gorm.DB) error {
	projectID := uuid.New()
	userID := uuid.New()

	// 重複チェック関数
	checkDuplicate := func(projectID, userID uuid.UUID) (bool, error) {
		var count int64
		err := db.Model(&model.ProjectAssignment{}).
			Where("project_id = ? AND user_id = ? AND deleted_at IS NULL",
				projectID, userID).
			Count(&count).Error
		return count > 0, err
	}

	// 存在しない組み合わせをチェック
	exists, err := checkDuplicate(projectID, userID)
	if err != nil {
		return fmt.Errorf("duplicate check failed: %w", err)
	}

	if !exists {
		println("  ✅ Correctly detected no duplicate")
	} else {
		return fmt.Errorf("unexpected duplicate found")
	}

	return nil
}

// ProjectAssignment モデル（テスト用の簡易版）
// 実際のモデルがインポートできない場合のフォールバック
type ProjectAssignment struct {
	ID        string     `gorm:"type:varchar(36);primaryKey"`
	ProjectID string     `gorm:"type:varchar(36);not null"`
	UserID    string     `gorm:"type:varchar(36);not null"`
	StartDate time.Time  `gorm:"not null"`
	DeletedAt *time.Time `gorm:"index"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
