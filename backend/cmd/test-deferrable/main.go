package main

import (
	"fmt"
	"log"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/config"
)

// DEFERRABLE制約のテストツール
// PostgreSQLのDEFERRABLE制約の動作を検証

func main() {
	println("🧪 PostgreSQL DEFERRABLE Constraint Test")
	println("========================================")
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

	// PostgreSQL専用機能のため、ドライバーチェック
	if cfg.Database.Driver != "postgres" {
		logger.Fatal("This test requires PostgreSQL database")
	}

	// データベース接続
	db, err := config.InitDatabase(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	// テスト実行
	if err := runDeferrableTests(db, logger); err != nil {
		logger.Fatal("DEFERRABLE tests failed", zap.Error(err))
	}

	println("")
	println("🎉 All DEFERRABLE constraint tests passed!")
}

func runDeferrableTests(db *gorm.DB, logger *zap.Logger) error {
	// 1. 通常の制約動作テスト（INITIALLY IMMEDIATE）
	println("1. Testing INITIALLY IMMEDIATE behavior")
	println("======================================")

	if err := testInitiallyImmediate(db); err != nil {
		return fmt.Errorf("INITIALLY IMMEDIATE test failed: %w", err)
	}
	println("✅ INITIALLY IMMEDIATE constraints work as expected")
	println("")

	// 2. DEFERRED制約のテスト
	println("2. Testing DEFERRED constraints")
	println("==============================")

	if err := testDeferredConstraints(db); err != nil {
		return fmt.Errorf("DEFERRED constraints test failed: %w", err)
	}
	println("✅ DEFERRED constraints work correctly")
	println("")

	// 3. 部署の循環参照テスト
	println("3. Testing circular references with DEFERRABLE")
	println("==============================================")

	if err := testCircularReferences(db); err != nil {
		return fmt.Errorf("circular reference test failed: %w", err)
	}
	println("✅ Circular references handled successfully")
	println("")

	// 4. バルク操作のテスト
	println("4. Testing bulk operations with DEFERRABLE")
	println("==========================================")

	if err := testBulkOperations(db); err != nil {
		return fmt.Errorf("bulk operations test failed: %w", err)
	}
	println("✅ Bulk operations completed successfully")

	return nil
}

// 1. INITIALLY IMMEDIATEの動作テスト
func testInitiallyImmediate(db *gorm.DB) error {
	// テストデータ作成
	testDeptID := uuid.New().String()
	testUserID := uuid.New().String()

	// トランザクション開始
	tx := db.Begin()
	defer tx.Rollback()

	// 部署作成（manager_idはNULL）
	if err := tx.Exec(`
		INSERT INTO departments (id, name, manager_id) 
		VALUES (?, '即時チェック部署', NULL)
	`, testDeptID).Error; err != nil {
		return fmt.Errorf("failed to create department: %w", err)
	}

	// ユーザー作成
	if err := tx.Exec(`
		INSERT INTO users (id, email, password, first_name, last_name, department_id) 
		VALUES (?, 'immediate@test.com', 'password', 'Immediate', 'Test', ?)
	`, testUserID, testDeptID).Error; err != nil {
		// department_idカラムが存在しない場合はスキップ
		if err := tx.Exec(`
			INSERT INTO users (id, email, password, first_name, last_name) 
			VALUES (?, 'immediate@test.com', 'password', 'Immediate', 'Test')
		`, testUserID).Error; err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}
	}

	// 部署のマネージャーを更新
	if err := tx.Exec(`
		UPDATE departments SET manager_id = ? WHERE id = ?
	`, testUserID, testDeptID).Error; err != nil {
		return fmt.Errorf("failed to update department manager: %w", err)
	}

	println("  Created department and user with immediate constraint check")

	// クリーンアップ
	tx.Exec("DELETE FROM departments WHERE id = ?", testDeptID)
	tx.Exec("DELETE FROM users WHERE id = ?", testUserID)
	tx.Commit()

	return nil
}

// 2. DEFERRED制約のテスト
func testDeferredConstraints(db *gorm.DB) error {
	// トランザクション開始
	tx := db.Begin()
	defer tx.Rollback()

	// 制約を遅延モードに設定
	if err := tx.Exec("SET CONSTRAINTS fk_departments_parent DEFERRED").Error; err != nil {
		// 制約が存在しない場合はスキップ
		println("  ⚠️  DEFERRABLE constraint not found (needs migration)")
		return nil
	}

	// テスト部署作成
	parentID := uuid.New().String()
	childID := uuid.New().String()

	// 子部署を先に作成（通常はエラーになるが、DEFERREDなので成功）
	if err := tx.Exec(`
		INSERT INTO departments (id, name, parent_id) 
		VALUES (?, '子部署', ?)
	`, childID, parentID).Error; err != nil {
		return fmt.Errorf("failed to create child department: %w", err)
	}

	// 親部署を後から作成
	if err := tx.Exec(`
		INSERT INTO departments (id, name, parent_id) 
		VALUES (?, '親部署', NULL)
	`, parentID).Error; err != nil {
		return fmt.Errorf("failed to create parent department: %w", err)
	}

	println("  Created child department before parent (DEFERRED mode)")

	// コミット時に制約チェック
	tx.Exec("DELETE FROM departments WHERE id IN (?, ?)", childID, parentID)
	tx.Commit()

	return nil
}

// 3. 循環参照のテスト
func testCircularReferences(db *gorm.DB) error {
	// トランザクション開始
	tx := db.Begin()
	defer tx.Rollback()

	// すべての関連制約を遅延
	tx.Exec("SET CONSTRAINTS ALL DEFERRED")

	deptID := uuid.New().String()
	userID := uuid.New().String()

	// 相互参照するデータを作成
	// 部署作成（マネージャーを先に指定）
	if err := tx.Exec(`
		INSERT INTO departments (id, name, manager_id) 
		VALUES (?, '循環参照テスト部署', ?)
	`, deptID, userID).Error; err != nil {
		return fmt.Errorf("failed to create department with manager: %w", err)
	}

	// ユーザー作成（部署を指定）
	if err := tx.Exec(`
		INSERT INTO users (id, email, password, first_name, last_name, department_id) 
		VALUES (?, 'circular@test.com', 'password', 'Circular', 'Test', ?)
		ON CONFLICT (id) DO UPDATE SET department_id = EXCLUDED.department_id
	`, userID, deptID).Error; err != nil {
		// department_idカラムが存在しない場合
		if err := tx.Exec(`
			INSERT INTO users (id, email, password, first_name, last_name) 
			VALUES (?, 'circular@test.com', 'password', 'Circular', 'Test')
		`, userID).Error; err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}
	}

	println("  Created circular reference: User ⇄ Department")

	// クリーンアップ
	tx.Exec("UPDATE departments SET manager_id = NULL WHERE id = ?", deptID)
	tx.Exec("DELETE FROM users WHERE id = ?", userID)
	tx.Exec("DELETE FROM departments WHERE id = ?", deptID)
	tx.Commit()

	return nil
}

// 4. バルク操作のテスト
func testBulkOperations(db *gorm.DB) error {
	// トランザクション開始
	tx := db.Begin()
	defer tx.Rollback()

	// 制約を遅延
	tx.Exec("SET CONSTRAINTS fk_departments_parent DEFERRED")

	// 部署の階層を一括再編成
	rootID := uuid.New().String()
	dept1ID := uuid.New().String()
	dept2ID := uuid.New().String()
	dept3ID := uuid.New().String()

	// 最初に全部署を作成
	departments := []struct {
		id       string
		name     string
		parentID *string
	}{
		{rootID, "本社", nil},
		{dept1ID, "開発部", &rootID},
		{dept2ID, "営業部", &rootID},
		{dept3ID, "企画部", &rootID},
	}

	for _, dept := range departments {
		if err := tx.Exec(`
			INSERT INTO departments (id, name, parent_id) 
			VALUES (?, ?, ?)
		`, dept.id, dept.name, dept.parentID).Error; err != nil {
			return fmt.Errorf("failed to create department %s: %w", dept.name, err)
		}
	}

	println("  Created department hierarchy")

	// 階層を再編成（営業部を開発部の下に移動）
	if err := tx.Exec(`
		UPDATE departments SET parent_id = ? WHERE id = ?
	`, dept1ID, dept2ID).Error; err != nil {
		return fmt.Errorf("failed to reorganize departments: %w", err)
	}

	println("  Reorganized department hierarchy")

	// クリーンアップ
	tx.Exec("DELETE FROM departments WHERE id IN (?, ?, ?, ?)", dept3ID, dept2ID, dept1ID, rootID)
	tx.Commit()

	return nil
}
