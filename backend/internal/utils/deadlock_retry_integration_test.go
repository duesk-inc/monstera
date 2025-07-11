package utils

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

// TestDeadlockRetryManager_BasicFunctionality 基本機能テスト（データベースなしで実行）
func TestDeadlockRetryManager_BasicFunctionality(t *testing.T) {
	logger := zap.NewNop()
	config := DefaultDeadlockRetryConfig()
	manager := NewDeadlockRetryManager(config, logger)

	t.Run("設定の取得と更新", func(t *testing.T) {
		// 初期設定の確認
		currentConfig := manager.GetRetryConfig()
		assert.Equal(t, config.MaxRetries, currentConfig.MaxRetries)
		assert.Equal(t, config.BaseDelay, currentConfig.BaseDelay)

		// 設定の更新
		newConfig := DeadlockRetryConfig{
			MaxRetries:   5,
			BaseDelay:    200 * time.Millisecond,
			MaxDelay:     10 * time.Second,
			Multiplier:   3.0,
			JitterFactor: 0.2,
			EnableJitter: true,
		}
		manager.UpdateRetryConfig(newConfig)

		// 更新された設定の確認
		updatedConfig := manager.GetRetryConfig()
		assert.Equal(t, newConfig.MaxRetries, updatedConfig.MaxRetries)
		assert.Equal(t, newConfig.BaseDelay, updatedConfig.BaseDelay)
		assert.Equal(t, newConfig.MaxDelay, updatedConfig.MaxDelay)
	})

	t.Run("遅延時間計算", func(t *testing.T) {
		// ジッターなしの設定
		noJitterConfig := DeadlockRetryConfig{
			MaxRetries:   3,
			BaseDelay:    100 * time.Millisecond,
			MaxDelay:     5 * time.Second,
			Multiplier:   2.0,
			JitterFactor: 0.0,
			EnableJitter: false,
		}
		manager.UpdateRetryConfig(noJitterConfig)

		tests := []struct {
			attempt  int
			expected time.Duration
		}{
			{0, 100 * time.Millisecond},
			{1, 200 * time.Millisecond},
			{2, 400 * time.Millisecond},
			{3, 800 * time.Millisecond},
		}

		for _, tt := range tests {
			delay := manager.calculateDelay(tt.attempt)
			assert.Equal(t, tt.expected, delay, "attempt %d", tt.attempt)
		}
	})

	t.Run("最大遅延時間制限", func(t *testing.T) {
		// 小さな最大値を設定
		limitedConfig := DeadlockRetryConfig{
			MaxRetries:   10,
			BaseDelay:    100 * time.Millisecond,
			MaxDelay:     1 * time.Second, // 小さな最大値
			Multiplier:   2.0,
			JitterFactor: 0.0,
			EnableJitter: false,
		}
		manager.UpdateRetryConfig(limitedConfig)

		// 大きなリトライ回数でも最大遅延時間を超えないことを確認
		delay := manager.calculateDelay(10) // 2^10 * 100ms = 102.4秒になるはずだが、1秒に制限される
		assert.LessOrEqual(t, delay, limitedConfig.MaxDelay)
	})

	t.Run("ジッター有効時の遅延時間", func(t *testing.T) {
		jitterConfig := DeadlockRetryConfig{
			MaxRetries:   3,
			BaseDelay:    100 * time.Millisecond,
			MaxDelay:     5 * time.Second,
			Multiplier:   2.0,
			JitterFactor: 0.1,
			EnableJitter: true,
		}
		manager.UpdateRetryConfig(jitterConfig)

		// ジッターありの場合、期待値の範囲内に収まることを確認
		baseDelay := 100 * time.Millisecond
		jitterRange := float64(baseDelay) * 0.1
		expectedMin := baseDelay - time.Duration(jitterRange)
		expectedMax := baseDelay + time.Duration(jitterRange)

		for i := 0; i < 10; i++ {
			delay := manager.calculateDelay(0)
			assert.True(t, delay >= expectedMin && delay <= expectedMax,
				"ジッター付き遅延時間が期待範囲外: %v (期待範囲: %v - %v)", delay, expectedMin, expectedMax)
		}
	})
}

// TestErrorHandler_Functionality エラーハンドラーの機能テスト
func TestErrorHandler_Functionality(t *testing.T) {
	logger := zap.NewNop()
	handler := NewPostgreSQLErrorHandler(logger)

	t.Run("PostgreSQLエラーコードの処理", func(t *testing.T) {
		// テスト用エラーの作成と検証
		deadlockErr := createDeadlockError()
		assert.True(t, handler.IsRetryableError(deadlockErr))

		serializationErr := createSerializationError()
		assert.True(t, handler.IsRetryableError(serializationErr))

		uniqueErr := createUniqueViolationError()
		assert.False(t, handler.IsRetryableError(uniqueErr))
	})

	t.Run("重複キー情報の抽出", func(t *testing.T) {
		uniqueErr := createUniqueViolationError()
		table, constraint, value := handler.ExtractDuplicateKeyInfo(uniqueErr)

		// createUniqueViolationError()で設定した値を確認
		assert.NotEmpty(t, table)
		assert.NotEmpty(t, constraint)
		assert.Equal(t, "test@duesk.co.jp", value)
	})
}

// TestSimpleTransactionHelper_BasicUsage シンプルトランザクションヘルパーの基本機能テスト
func TestSimpleTransactionHelper_BasicUsage(t *testing.T) {
	// このテストは実際のデータベース接続なしで実行可能な部分のみテスト
	logger := zap.NewNop()

	t.Run("ヘルパー作成", func(t *testing.T) {
		// nilのDBでもヘルパー自体は作成可能
		helper := NewTransactionHelper(nil, logger)
		assert.NotNil(t, helper)
		assert.NotNil(t, helper.retryManager)
		assert.NotNil(t, helper.logger)
	})

	t.Run("サービスラッパー作成", func(t *testing.T) {
		wrapper := NewServiceTransactionWrapper(nil, "test_service", logger)
		assert.NotNil(t, wrapper)
		assert.Equal(t, "test_service", wrapper.serviceName)
		assert.NotNil(t, wrapper.helper)
	})

	t.Run("バルクオペレーションヘルパー作成", func(t *testing.T) {
		bulkHelper := NewBulkOperationHelper(nil, 100, logger)
		assert.NotNil(t, bulkHelper)
		assert.Equal(t, 100, bulkHelper.defaultSize)
		assert.NotNil(t, bulkHelper.helper)
	})
}

// TestConfig_DefaultValues デフォルト設定値のテスト
func TestConfig_DefaultValues(t *testing.T) {
	config := DefaultDeadlockRetryConfig()

	assert.Equal(t, 3, config.MaxRetries)
	assert.Equal(t, 100*time.Millisecond, config.BaseDelay)
	assert.Equal(t, 5*time.Second, config.MaxDelay)
	assert.Equal(t, 2.0, config.Multiplier)
	assert.Equal(t, 0.1, config.JitterFactor)
	assert.True(t, config.EnableJitter)
	assert.Contains(t, config.RetryableErrors, "40001") // serialization_failure
	assert.Contains(t, config.RetryableErrors, "40P01") // deadlock_detected
	assert.Contains(t, config.RetryableErrors, "55P03") // lock_not_available
}

// TestRetryContext_Structure リトライコンテキストの構造テスト
func TestRetryContext_Structure(t *testing.T) {
	startTime := time.Now()
	ctx := RetryContext{
		Attempt:      2,
		LastError:    createDeadlockError(),
		TotalElapsed: time.Since(startTime),
		StartTime:    startTime,
	}

	assert.Equal(t, 2, ctx.Attempt)
	assert.NotNil(t, ctx.LastError)
	assert.True(t, ctx.TotalElapsed >= 0)
	assert.False(t, ctx.StartTime.IsZero())
}

// TestRetryStats_Structure リトライ統計の構造テスト
func TestRetryStats_Structure(t *testing.T) {
	stats := &RetryStats{
		OperationName:   "test_operation",
		TotalAttempts:   3,
		SuccessfulRetry: true,
		TotalDuration:   500 * time.Millisecond,
		ErrorCodes:      []string{"DB_001", "DB_001"},
		FinalError:      "",
	}

	assert.Equal(t, "test_operation", stats.OperationName)
	assert.Equal(t, 3, stats.TotalAttempts)
	assert.True(t, stats.SuccessfulRetry)
	assert.Equal(t, 500*time.Millisecond, stats.TotalDuration)
	assert.Len(t, stats.ErrorCodes, 2)
	assert.Empty(t, stats.FinalError)
}

// ベンチマークテスト
func BenchmarkDeadlockRetryManager_CalculateDelay(b *testing.B) {
	logger := zap.NewNop()
	config := DefaultDeadlockRetryConfig()
	manager := NewDeadlockRetryManager(config, logger)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.calculateDelay(i % 5) // 0-4の範囲でテスト
	}
}

func BenchmarkPostgreSQLErrorHandler_HandleDatabaseError(b *testing.B) {
	logger := zap.NewNop()
	handler := NewPostgreSQLErrorHandler(logger)
	err := createDeadlockError()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		handler.HandleDatabaseError(err)
	}
}

func BenchmarkPostgreSQLErrorHandler_IsRetryableError(b *testing.B) {
	logger := zap.NewNop()
	handler := NewPostgreSQLErrorHandler(logger)
	err := createDeadlockError()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		handler.IsRetryableError(err)
	}
}

// Helper functions for creating test errors
func createDeadlockError() error {
	return &pgconn.PgError{
		Code:    "40P01",
		Message: "deadlock detected",
		Detail:  "Process 123 waits for ShareLock on transaction 456",
	}
}

func createSerializationError() error {
	return &pgconn.PgError{
		Code:    "40001",
		Message: "could not serialize access due to concurrent update",
		Detail:  "Serialization failure",
	}
}

func createUniqueViolationError() error {
	return &pgconn.PgError{
		Code:           "23505",
		Message:        "duplicate key value violates unique constraint",
		Detail:         "Key (email)=(test@duesk.co.jp) already exists.",
		ConstraintName: "users_email_unique",
		TableName:      "users",
		ColumnName:     "email",
	}
}
