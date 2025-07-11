package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// BatchConfig バッチ処理関連の設定
type BatchConfig struct {
	// 基本タイムアウト設定
	DefaultTimeout           time.Duration
	QueryTimeout             time.Duration
	StatementTimeout         time.Duration
	LockTimeout              time.Duration
	IdleInTransactionTimeout time.Duration

	// PostgreSQL固有設定
	TCPKeepAlivesIdle     time.Duration
	TCPKeepAlivesInterval time.Duration
	TCPKeepAlivesCount    int

	// バッチ処理固有設定
	ChunkSize           int
	MaxTransactionTime  time.Duration
	ProgressInterval    time.Duration
	HealthCheckInterval time.Duration
	ConnectionTimeout   time.Duration

	// リトライ設定
	MaxRetries   int
	BaseDelay    time.Duration
	MaxDelay     time.Duration
	Multiplier   float64
	JitterFactor float64

	// 環境別タイムアウト設定
	JobTimeouts map[string]time.Duration
}

// LoadBatchConfig バッチ設定を環境変数から読み込み
func LoadBatchConfig() BatchConfig {
	env := getEnv("GO_ENV", "development")

	config := BatchConfig{
		// デフォルト値
		DefaultTimeout:           getEnvDuration("BATCH_DEFAULT_TIMEOUT", 15*time.Minute),
		QueryTimeout:             getEnvDuration("BATCH_QUERY_TIMEOUT", 30*time.Minute),
		StatementTimeout:         getEnvDuration("DB_STATEMENT_TIMEOUT", 5*time.Minute),
		LockTimeout:              getEnvDuration("DB_LOCK_TIMEOUT", 1*time.Minute),
		IdleInTransactionTimeout: getEnvDuration("DB_IDLE_IN_TRANSACTION_TIMEOUT", 5*time.Minute),

		// PostgreSQL TCP KeepAlive設定
		TCPKeepAlivesIdle:     getEnvDuration("DB_TCP_KEEPALIVES_IDLE", 10*time.Minute),
		TCPKeepAlivesInterval: getEnvDuration("DB_TCP_KEEPALIVES_INTERVAL", 1*time.Minute),
		TCPKeepAlivesCount:    getEnvInt("DB_TCP_KEEPALIVES_COUNT", 3),

		// バッチ処理設定
		ChunkSize:           getEnvInt("BATCH_CHUNK_SIZE", 1000),
		MaxTransactionTime:  getEnvDuration("BATCH_MAX_TRANSACTION_TIME", 15*time.Minute),
		ProgressInterval:    getEnvDuration("BATCH_PROGRESS_INTERVAL", 30*time.Second),
		HealthCheckInterval: getEnvDuration("BATCH_HEALTH_CHECK_INTERVAL", 5*time.Minute),
		ConnectionTimeout:   getEnvDuration("BATCH_CONNECTION_TIMEOUT", 1*time.Minute),

		// リトライ設定
		MaxRetries:   getEnvInt("BATCH_MAX_RETRIES", 3),
		BaseDelay:    getEnvDuration("BATCH_RETRY_BASE_DELAY", 100*time.Millisecond),
		MaxDelay:     getEnvDuration("BATCH_RETRY_MAX_DELAY", 5*time.Second),
		Multiplier:   getEnvFloat("BATCH_RETRY_MULTIPLIER", 2.0),
		JitterFactor: getEnvFloat("BATCH_RETRY_JITTER_FACTOR", 0.1),
	}

	// 環境別調整
	config.adjustForEnvironment(env)

	// ジョブ別タイムアウト設定
	config.JobTimeouts = loadJobTimeouts(env)

	return config
}

// adjustForEnvironment 環境に応じてタイムアウト値を調整
func (c *BatchConfig) adjustForEnvironment(env string) {
	switch env {
	case "production":
		// 本番環境: より長いタイムアウト
		c.QueryTimeout = getEnvDuration("BATCH_QUERY_TIMEOUT", 60*time.Minute)
		c.StatementTimeout = getEnvDuration("DB_STATEMENT_TIMEOUT", 10*time.Minute)
		c.LockTimeout = getEnvDuration("DB_LOCK_TIMEOUT", 2*time.Minute)
		c.MaxTransactionTime = getEnvDuration("BATCH_MAX_TRANSACTION_TIME", 30*time.Minute)

	case "staging":
		// ステージング環境: 中程度のタイムアウト
		c.QueryTimeout = getEnvDuration("BATCH_QUERY_TIMEOUT", 45*time.Minute)
		c.StatementTimeout = getEnvDuration("DB_STATEMENT_TIMEOUT", 7*time.Minute)
		c.LockTimeout = getEnvDuration("DB_LOCK_TIMEOUT", 90*time.Second)
		c.MaxTransactionTime = getEnvDuration("BATCH_MAX_TRANSACTION_TIME", 20*time.Minute)

	case "development", "test":
		// 開発・テスト環境: 短めのタイムアウト
		c.QueryTimeout = getEnvDuration("BATCH_QUERY_TIMEOUT", 15*time.Minute)
		c.StatementTimeout = getEnvDuration("DB_STATEMENT_TIMEOUT", 3*time.Minute)
		c.LockTimeout = getEnvDuration("DB_LOCK_TIMEOUT", 30*time.Second)
		c.MaxTransactionTime = getEnvDuration("BATCH_MAX_TRANSACTION_TIME", 10*time.Minute)
		c.ChunkSize = getEnvInt("BATCH_CHUNK_SIZE", 100) // テスト用に小さく
	}
}

// loadJobTimeouts ジョブ別タイムアウト設定を読み込み
func loadJobTimeouts(env string) map[string]time.Duration {
	// PostgreSQL向け調整タイムアウト設定

	// PostgreSQL向け調整（MySQL比1.5倍）
	postgresqlAdjustments := map[string]time.Duration{
		"alert_detection":        45 * time.Minute,
		"weekly_reminder":        30 * time.Minute,
		"unsubmitted_escalation": 25 * time.Minute,
		"notification_cleanup":   20 * time.Minute,
		"monthly_archive":        120 * time.Minute,
		"bulk_data_migration":    180 * time.Minute, // 新規: データ移行用
		"vacuum_analyze":         60 * time.Minute,  // 新規: メンテナンス用
		"index_maintenance":      90 * time.Minute,  // 新規: インデックス管理用
		"statistics_update":      30 * time.Minute,  // 新規: 統計更新用
	}

	// 環境変数からの個別設定をチェック
	result := make(map[string]time.Duration)
	for jobName, defaultTimeout := range postgresqlAdjustments {
		envVar := "BATCH_TIMEOUT_" + jobName
		if customTimeout := getEnvDuration(envVar, 0); customTimeout > 0 {
			result[jobName] = customTimeout
		} else {
			// 環境別調整
			switch env {
			case "production":
				result[jobName] = defaultTimeout
			case "staging":
				result[jobName] = time.Duration(float64(defaultTimeout) * 0.8) // 80%
			case "development", "test":
				result[jobName] = time.Duration(float64(defaultTimeout) * 0.5) // 50%
			default:
				result[jobName] = defaultTimeout
			}
		}
	}

	return result
}

// GetJobTimeout 指定されたジョブのタイムアウト値を取得
func (c *BatchConfig) GetJobTimeout(jobName string) time.Duration {
	if timeout, exists := c.JobTimeouts[jobName]; exists {
		return timeout
	}
	return c.DefaultTimeout
}

// IsRetryableError エラーがリトライ対象かどうか判定
func (c *BatchConfig) IsRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// PostgreSQL固有のリトライ対象エラーコード
	postgresqlRetryableErrors := []string{
		"40001", // serialization_failure
		"40P01", // deadlock_detected
		"55P03", // lock_not_available
		"53200", // out_of_memory
		"53300", // too_many_connections
	}

	errStr := err.Error()
	for _, code := range postgresqlRetryableErrors {
		if contains(errStr, code) {
			return true
		}
	}

	// 一般的なネットワークエラーやタイムアウトエラー
	commonRetryableErrors := []string{
		"connection refused",
		"connection reset",
		"timeout",
		"temporary failure",
		"server closed",
	}

	for _, pattern := range commonRetryableErrors {
		if contains(errStr, pattern) {
			return true
		}
	}

	return false
}

// ValidateConfig 設定値の妥当性を検証
func (c *BatchConfig) ValidateConfig() error {
	if c.ChunkSize <= 0 {
		return fmt.Errorf("BATCH_CHUNK_SIZE must be positive, got: %d", c.ChunkSize)
	}

	if c.MaxRetries < 0 {
		return fmt.Errorf("BATCH_MAX_RETRIES must be non-negative, got: %d", c.MaxRetries)
	}

	if c.Multiplier <= 1.0 {
		return fmt.Errorf("BATCH_RETRY_MULTIPLIER must be greater than 1.0, got: %f", c.Multiplier)
	}

	if c.JitterFactor < 0 || c.JitterFactor > 1 {
		return fmt.Errorf("BATCH_RETRY_JITTER_FACTOR must be between 0 and 1, got: %f", c.JitterFactor)
	}

	if c.QueryTimeout <= 0 {
		return fmt.Errorf("BATCH_QUERY_TIMEOUT must be positive, got: %v", c.QueryTimeout)
	}

	return nil
}

// ヘルパー関数
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
		// 秒数での指定も許可
		if seconds, err := strconv.Atoi(value); err == nil {
			return time.Duration(seconds) * time.Second
		}
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
