package utils

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/testdata"
)

// ExampleUsage デッドロック検出・リトライ機能の使用例
type ExampleUsage struct {
	db     *gorm.DB
	helper *TransactionHelper
	logger *zap.Logger
}

// NewExampleUsage 使用例のインスタンスを作成
func NewExampleUsage(db *gorm.DB, logger *zap.Logger) *ExampleUsage {
	return &ExampleUsage{
		db:     db,
		helper: NewTransactionHelper(db, logger),
		logger: logger,
	}
}

// Example1_BasicUsage 基本的な使用例
func (eu *ExampleUsage) Example1_BasicUsage(ctx context.Context) error {
	// 標準的なトランザクション実行（デッドロック検出・リトライ付き）
	return eu.helper.ExecuteStandard(ctx, "create_user", func(tx *gorm.DB) error {
		user := &model.User{
			Email: "user@duesk.co.jp",
			Name:  "Test User",
		}
		return tx.Create(user).Error
	})
}

// Example2_CriticalTransaction 重要なトランザクションの使用例
func (eu *ExampleUsage) Example2_CriticalTransaction(ctx context.Context) error {
	// 重要なトランザクション（詳細統計付き）
	stats, err := eu.helper.ExecuteCritical(ctx, "update_user_balance", func(tx *gorm.DB) error {
		// 残高更新などの重要な処理
		var user model.User
		if err := tx.First(&user, "id = ?", 1).Error; err != nil {
			return err
		}

		// 残高を更新（この処理でデッドロックが発生する可能性がある）
		return tx.Model(&user).Update("updated_at", time.Now()).Error
	})

	if stats != nil {
		eu.logger.Info("重要なトランザクション実行結果",
			zap.Int("attempts", stats.TotalAttempts),
			zap.Duration("duration", stats.TotalDuration),
			zap.Bool("retry_successful", stats.SuccessfulRetry),
		)
	}

	return err
}

// Example3_BatchProcessing バッチ処理の使用例
func (eu *ExampleUsage) Example3_BatchProcessing(ctx context.Context) error {
	const batchSize = 1000
	totalUsers := 10000

	bulkHelper := NewBulkOperationHelper(eu.db, batchSize, eu.logger)

	return bulkHelper.ExecuteInChunks(
		ctx,
		"batch_update_users",
		totalUsers,
		batchSize,
		func(tx *gorm.DB, start, end int) error {
			// 指定範囲のユーザーを更新
			return tx.Model(&model.User{}).
				Where("id BETWEEN ? AND ?", start, end).
				Update("last_login", time.Now()).Error
		},
	)
}

// Example4_ServiceIntegration サービス層での統合例
func (eu *ExampleUsage) Example4_ServiceIntegration(ctx context.Context) error {
	// サービス専用のトランザクションラッパー
	wrapper := NewServiceTransactionWrapper(eu.db, "user_service", eu.logger)

	return wrapper.Execute(ctx, "create_profile", func(tx *gorm.DB) error {
		// ユーザー作成
		user := &model.User{
			Email: "profile@duesk.co.jp",
			Name:  "Profile User",
		}
		if err := tx.Create(user).Error; err != nil {
			return err
		}

		// プロフィール作成（関連するテーブル更新でデッドロックの可能性）
		profile := &model.Profile{
			UserID:         user.ID,
			Education:      "大学卒業",
			NearestStation: "東京駅",
			AppealPoints:   "Go言語とPostgreSQLに精通しています",
		}
		return tx.Create(profile).Error
	})
}

// Example5_WithTimeout タイムアウト付きトランザクション
func (eu *ExampleUsage) Example5_WithTimeout(ctx context.Context) error {
	return eu.helper.ExecuteStandardWithTimeout(
		ctx,
		30*time.Second, // 30秒のタイムアウト
		"complex_operation",
		func(tx *gorm.DB) error {
			// 複雑な処理（時間がかかる可能性がある）
			var users []model.User
			if err := tx.Find(&users).Error; err != nil {
				return err
			}

			// 各ユーザーに対して何らかの処理
			for _, user := range users {
				if err := tx.Model(&user).Update("updated_at", time.Now()).Error; err != nil {
					return err
				}
			}

			return nil
		},
	)
}

// Example6_CustomRetryConfig カスタムリトライ設定の使用例
func (eu *ExampleUsage) Example6_CustomRetryConfig(ctx context.Context) error {
	// カスタムリトライ設定
	customConfig := DeadlockRetryConfig{
		MaxRetries:   5,                      // より多くのリトライ
		BaseDelay:    250 * time.Millisecond, // より長い初期遅延
		MaxDelay:     15 * time.Second,       // より長い最大遅延
		Multiplier:   2.5,                    // より強い指数バックオフ
		JitterFactor: 0.2,                    // より大きなジッター
		EnableJitter: true,
	}

	// カスタム設定でリトライマネージャーを作成
	retryManager := NewDeadlockRetryManager(customConfig, eu.logger)

	return retryManager.ExecuteWithRetry(ctx, eu.db, func(tx *gorm.DB) error {
		// 競合が激しい処理
		return tx.Exec("UPDATE users SET last_active = NOW() WHERE is_active = true").Error
	})
}

// Example7_RecoveryCallback 回復コールバック付きトランザクション
func (eu *ExampleUsage) Example7_RecoveryCallback(ctx context.Context) error {
	return eu.helper.TransactionWithRecovery(
		ctx,
		"sensitive_operation",
		func(tx *gorm.DB) error {
			// 機密性の高い処理
			return tx.Exec("UPDATE accounts SET balance = balance + 1000 WHERE user_id = ?", 1).Error
		},
		func(attempt int, err error, elapsed time.Duration) {
			// デッドロック回復時の処理
			eu.logger.Warn("デッドロックから回復しました",
				zap.Int("attempt", attempt),
				zap.Error(err),
				zap.Duration("elapsed", elapsed),
			)

			// 必要に応じて外部システムに通知やメトリクス送信
			// sendMetrics("deadlock_recovery", attempt, elapsed)
		},
	)
}

// Example8_ConcurrentTransactions 並行トランザクションの例
func (eu *ExampleUsage) Example8_ConcurrentTransactions(ctx context.Context) error {
	concurrentManager := NewConcurrentTransactionManager(eu.db, 3, eu.logger)

	operations := []func(ctx context.Context, helper *TransactionHelper) error{
		func(ctx context.Context, helper *TransactionHelper) error {
			return helper.ExecuteStandard(ctx, "operation_1", func(tx *gorm.DB) error {
				return tx.Create(&model.User{Email: testdata.DefaultTestEmail, Name: "User 1"}).Error
			})
		},
		func(ctx context.Context, helper *TransactionHelper) error {
			return helper.ExecuteStandard(ctx, "operation_2", func(tx *gorm.DB) error {
				return tx.Create(&model.User{Email: testdata.DefaultTestEmail + "2", Name: "User 2"}).Error
			})
		},
		func(ctx context.Context, helper *TransactionHelper) error {
			return helper.ExecuteStandard(ctx, "operation_3", func(tx *gorm.DB) error {
				return tx.Create(&model.User{Email: "user3@duesk.co.jp", Name: "User 3"}).Error
			})
		},
	}

	errors := concurrentManager.ExecuteConcurrent(ctx, operations)

	// エラーチェック
	for i, err := range errors {
		if err != nil {
			eu.logger.Error("並行トランザクションでエラー",
				zap.Int("operation_index", i),
				zap.Error(err),
			)
			return fmt.Errorf("並行処理の操作 %d でエラー: %w", i, err)
		}
	}

	return nil
}

// Example9_ProgressTracking 進捗追跡付きバッチ処理
func (eu *ExampleUsage) Example9_ProgressTracking(ctx context.Context) error {
	batchHelper := NewBulkOperationHelper(eu.db, 500, eu.logger)

	progressCallback := func(attempt int, elapsed time.Duration) {
		eu.logger.Info("バッチ処理進捗",
			zap.Int("attempt", attempt),
			zap.Duration("elapsed", elapsed),
		)
	}

	stats, err := batchHelper.helper.ExecuteBatchWithProgress(
		ctx,
		"data_migration",
		1000,
		progressCallback,
		func(tx *gorm.DB) error {
			// 大量データ移行処理
			return tx.Exec(`
				INSERT INTO new_table (id, data, created_at)
				SELECT id, data, created_at FROM old_table
				WHERE processed = false
				LIMIT 1000
			`).Error
		},
	)

	if stats != nil {
		eu.logger.Info("バッチ処理完了",
			zap.String("operation", stats.OperationName),
			zap.Int("total_attempts", stats.TotalAttempts),
			zap.Duration("total_duration", stats.TotalDuration),
		)
	}

	return err
}

// Example10_ErrorAnalysis エラー分析の例
func (eu *ExampleUsage) Example10_ErrorAnalysis(ctx context.Context) {
	config := DefaultDeadlockRetryConfig()
	retryManager := NewDeadlockRetryManager(config, eu.logger)

	stats, err := retryManager.ExecuteWithRetryStats(
		ctx,
		eu.db,
		func(tx *gorm.DB) error {
			// 意図的にデッドロックを引き起こす可能性のある処理
			return tx.Exec("UPDATE users SET updated_at = NOW() WHERE id IN (1, 2, 3)").Error
		},
		"deadlock_prone_operation",
	)

	if err != nil {
		eu.logger.Error("トランザクション失敗", zap.Error(err))
	}

	if stats != nil {
		// 詳細な統計分析
		eu.logger.Info("トランザクション統計",
			zap.String("operation", stats.OperationName),
			zap.Int("attempts", stats.TotalAttempts),
			zap.Duration("duration", stats.TotalDuration),
			zap.Bool("successful_retry", stats.SuccessfulRetry),
			zap.Strings("error_codes", stats.ErrorCodes),
		)

		// エラーパターンの分析
		deadlockCount := 0
		concurrencyErrorCount := 0
		for _, errorCode := range stats.ErrorCodes {
			switch errorCode {
			case "ErrCodeDeadlock":
				deadlockCount++
			case "ErrCodeConcurrencyError":
				concurrencyErrorCount++
			}
		}

		if deadlockCount > 0 {
			eu.logger.Warn("デッドロックが検出されました",
				zap.Int("count", deadlockCount),
				zap.String("recommendation", "インデックスの最適化やクエリの見直しを検討してください"),
			)
		}

		if concurrencyErrorCount > 0 {
			eu.logger.Warn("並行性エラーが検出されました",
				zap.Int("count", concurrencyErrorCount),
				zap.String("recommendation", "トランザクション分離レベルの調整を検討してください"),
			)
		}
	}
}
