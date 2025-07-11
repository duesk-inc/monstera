package config

import (
	"fmt"
	"log"
	"time"
)

// ConnectionPoolConfig PostgreSQL接続プール設定
type ConnectionPoolConfig struct {
	// 基本設定
	MaxOpenConnections int           `yaml:"max_open_connections" json:"max_open_connections"`
	MaxIdleConnections int           `yaml:"max_idle_connections" json:"max_idle_connections"`
	ConnMaxLifetime    time.Duration `yaml:"conn_max_lifetime" json:"conn_max_lifetime"`
	ConnMaxIdleTime    time.Duration `yaml:"conn_max_idle_time" json:"conn_max_idle_time"`

	// 監視閾値
	WarningThreshold   int `yaml:"warning_threshold" json:"warning_threshold"`
	CriticalThreshold  int `yaml:"critical_threshold" json:"critical_threshold"`
	EmergencyThreshold int `yaml:"emergency_threshold" json:"emergency_threshold"`

	// タイムアウト設定
	ConnectionTimeout time.Duration `yaml:"connection_timeout" json:"connection_timeout"`
	QueryTimeout      time.Duration `yaml:"query_timeout" json:"query_timeout"`

	// ヘルスチェック設定
	HealthCheckInterval time.Duration `yaml:"health_check_interval" json:"health_check_interval"`
	HealthCheckTimeout  time.Duration `yaml:"health_check_timeout" json:"health_check_timeout"`

	// アプリケーション識別
	ApplicationName string `yaml:"application_name" json:"application_name"`
	Environment     string `yaml:"environment" json:"environment"`
}

// GetConnectionPoolConfig 環境別の接続プール設定を取得
func GetConnectionPoolConfig() *ConnectionPoolConfig {
	env := getEnv("GO_ENV", "development")

	config := &ConnectionPoolConfig{
		ApplicationName: getEnv("APP_NAME", "monstera-backend"),
		Environment:     env,

		// デフォルト設定
		MaxOpenConnections: 20,
		MaxIdleConnections: 5,
		ConnMaxLifetime:    5 * time.Minute,
		ConnMaxIdleTime:    1 * time.Minute,

		WarningThreshold:   60,
		CriticalThreshold:  80,
		EmergencyThreshold: 90,

		ConnectionTimeout: 10 * time.Second,
		QueryTimeout:      30 * time.Second,

		HealthCheckInterval: 30 * time.Second,
		HealthCheckTimeout:  5 * time.Second,
	}

	// 環境別設定の適用
	switch env {
	case "production":
		config.MaxOpenConnections = getEnvInt("DB_MAX_OPEN_CONNECTIONS", 50)
		config.MaxIdleConnections = getEnvInt("DB_MAX_IDLE_CONNECTIONS", 10)
		config.ConnMaxLifetime = getEnvDuration("DB_CONN_MAX_LIFETIME", 15*time.Minute)
		config.ConnMaxIdleTime = getEnvDuration("DB_CONN_MAX_IDLE_TIME", 3*time.Minute)
		config.QueryTimeout = getEnvDuration("DB_QUERY_TIMEOUT", 60*time.Second)
	case "staging":
		config.MaxOpenConnections = getEnvInt("DB_MAX_OPEN_CONNECTIONS", 30)
		config.MaxIdleConnections = getEnvInt("DB_MAX_IDLE_CONNECTIONS", 8)
		config.ConnMaxLifetime = getEnvDuration("DB_CONN_MAX_LIFETIME", 10*time.Minute)
		config.ConnMaxIdleTime = getEnvDuration("DB_CONN_MAX_IDLE_TIME", 2*time.Minute)
	case "test":
		config.MaxOpenConnections = getEnvInt("DB_MAX_OPEN_CONNECTIONS", 10)
		config.MaxIdleConnections = getEnvInt("DB_MAX_IDLE_CONNECTIONS", 2)
		config.ConnMaxLifetime = getEnvDuration("DB_CONN_MAX_LIFETIME", 2*time.Minute)
		config.ConnMaxIdleTime = getEnvDuration("DB_CONN_MAX_IDLE_TIME", 30*time.Second)
	default: // development
		config.MaxOpenConnections = getEnvInt("DB_MAX_OPEN_CONNECTIONS", 20)
		config.MaxIdleConnections = getEnvInt("DB_MAX_IDLE_CONNECTIONS", 5)
		config.ConnMaxLifetime = getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute)
		config.ConnMaxIdleTime = getEnvDuration("DB_CONN_MAX_IDLE_TIME", 1*time.Minute)
	}

	// 閾値の環境変数上書き
	config.WarningThreshold = getEnvInt("DB_WARNING_THRESHOLD", config.WarningThreshold)
	config.CriticalThreshold = getEnvInt("DB_CRITICAL_THRESHOLD", config.CriticalThreshold)
	config.EmergencyThreshold = getEnvInt("DB_EMERGENCY_THRESHOLD", config.EmergencyThreshold)

	// タイムアウト設定の環境変数上書き
	config.ConnectionTimeout = getEnvDuration("DB_CONNECTION_TIMEOUT", config.ConnectionTimeout)
	config.QueryTimeout = getEnvDuration("DB_QUERY_TIMEOUT", config.QueryTimeout)

	// ヘルスチェック設定の環境変数上書き
	config.HealthCheckInterval = getEnvDuration("DB_HEALTH_CHECK_INTERVAL", config.HealthCheckInterval)
	config.HealthCheckTimeout = getEnvDuration("DB_HEALTH_CHECK_TIMEOUT", config.HealthCheckTimeout)

	// 設定の妥当性チェック
	if err := config.Validate(); err != nil {
		log.Printf("Connection pool configuration warning: %v", err)
	}

	return config
}

// Validate 設定の妥当性をチェック
func (c *ConnectionPoolConfig) Validate() error {
	if c.MaxOpenConnections <= 0 {
		return fmt.Errorf("MaxOpenConnections must be greater than 0")
	}

	if c.MaxIdleConnections < 0 {
		return fmt.Errorf("MaxIdleConnections must be >= 0")
	}

	if c.MaxIdleConnections > c.MaxOpenConnections {
		return fmt.Errorf("MaxIdleConnections (%d) cannot be greater than MaxOpenConnections (%d)",
			c.MaxIdleConnections, c.MaxOpenConnections)
	}

	if c.ConnMaxLifetime <= 0 {
		return fmt.Errorf("ConnMaxLifetime must be greater than 0")
	}

	if c.ConnMaxIdleTime <= 0 {
		return fmt.Errorf("ConnMaxIdleTime must be greater than 0")
	}

	if c.WarningThreshold <= 0 || c.WarningThreshold > 100 {
		return fmt.Errorf("WarningThreshold must be between 1 and 100")
	}

	if c.CriticalThreshold <= c.WarningThreshold || c.CriticalThreshold > 100 {
		return fmt.Errorf("CriticalThreshold must be greater than WarningThreshold and <= 100")
	}

	if c.EmergencyThreshold <= c.CriticalThreshold || c.EmergencyThreshold > 100 {
		return fmt.Errorf("EmergencyThreshold must be greater than CriticalThreshold and <= 100")
	}

	return nil
}

// String 設定の文字列表現
func (c *ConnectionPoolConfig) String() string {
	return fmt.Sprintf(
		"ConnectionPool{App: %s, Env: %s, MaxOpen: %d, MaxIdle: %d, MaxLifetime: %v, MaxIdleTime: %v, Thresholds: %d%%/%d%%/%d%%}",
		c.ApplicationName,
		c.Environment,
		c.MaxOpenConnections,
		c.MaxIdleConnections,
		c.ConnMaxLifetime,
		c.ConnMaxIdleTime,
		c.WarningThreshold,
		c.CriticalThreshold,
		c.EmergencyThreshold,
	)
}

// GetPostgreSQLMaxConnections PostgreSQLの最大接続数設定を推定
func (c *ConnectionPoolConfig) GetPostgreSQLMaxConnections() int {
	// アプリケーションの接続数から全体の最大接続数を推定
	// 複数のアプリケーション、管理ツール、予備接続を考慮

	applicationConnections := c.MaxOpenConnections
	batchConnections := applicationConnections / 2 // バッチ処理用
	adminConnections := 10                         // 管理ツール用
	reserveConnections := 20                       // 予備・緊急用

	totalEstimated := applicationConnections + batchConnections + adminConnections + reserveConnections

	// 安全マージンを追加（推定値の1.5倍）
	recommended := int(float64(totalEstimated) * 1.5)

	// 最小値と最大値の制限
	if recommended < 100 {
		recommended = 100
	}
	if recommended > 500 {
		recommended = 500
	}

	return recommended
}

// IsHighUsage 現在の使用率が高いかどうかを判定
func (c *ConnectionPoolConfig) IsHighUsage(currentConnections, maxConnections int) (bool, string, int) {
	if maxConnections <= 0 {
		return false, "OK", 0
	}

	usagePercent := (currentConnections * 100) / maxConnections

	if usagePercent >= c.EmergencyThreshold {
		return true, "EMERGENCY", usagePercent
	} else if usagePercent >= c.CriticalThreshold {
		return true, "CRITICAL", usagePercent
	} else if usagePercent >= c.WarningThreshold {
		return true, "WARNING", usagePercent
	}

	return false, "OK", usagePercent
}

// GetRecommendedPoolSize 推奨プールサイズを計算
func (c *ConnectionPoolConfig) GetRecommendedPoolSize(cpuCount int) (maxOpen, maxIdle int) {
	if cpuCount <= 0 {
		cpuCount = 4 // デフォルト値
	}

	// CPUコア数の2-4倍を基準とする
	baseSize := cpuCount * 3

	switch c.Environment {
	case "production":
		maxOpen = baseSize * 2
		maxIdle = baseSize / 2
	case "staging":
		maxOpen = baseSize
		maxIdle = baseSize / 3
	case "development":
		maxOpen = baseSize / 2
		maxIdle = baseSize / 4
	case "test":
		maxOpen = baseSize / 4
		maxIdle = 2
	default:
		maxOpen = baseSize
		maxIdle = baseSize / 3
	}

	// 最小値の保証
	if maxOpen < 5 {
		maxOpen = 5
	}
	if maxIdle < 1 {
		maxIdle = 1
	}

	// 設定された値を優先
	if c.MaxOpenConnections > 0 {
		maxOpen = c.MaxOpenConnections
	}
	if c.MaxIdleConnections > 0 {
		maxIdle = c.MaxIdleConnections
	}

	return maxOpen, maxIdle
}

// 注: getEnv, getEnvInt, getEnvDuration関数はconfig.goで定義済みのため、ここでは削除

// ConnectionPoolMetrics 接続プールのメトリクス
type ConnectionPoolMetrics struct {
	MaxOpenConnections int           `json:"max_open_connections"`
	OpenConnections    int           `json:"open_connections"`
	InUseConnections   int           `json:"in_use_connections"`
	IdleConnections    int           `json:"idle_connections"`
	WaitCount          int64         `json:"wait_count"`
	WaitDuration       time.Duration `json:"wait_duration"`
	MaxIdleClosed      int64         `json:"max_idle_closed"`
	MaxIdleTimeClosed  int64         `json:"max_idle_time_closed"`
	MaxLifetimeClosed  int64         `json:"max_lifetime_closed"`
	UsagePercent       float64       `json:"usage_percent"`
	LastCollectedAt    time.Time     `json:"last_collected_at"`
}

// GetUsageLevel メトリクスからの使用レベル判定
func (m *ConnectionPoolMetrics) GetUsageLevel(config *ConnectionPoolConfig) string {
	usagePercent := int(m.UsagePercent)

	if usagePercent >= config.EmergencyThreshold {
		return "EMERGENCY"
	} else if usagePercent >= config.CriticalThreshold {
		return "CRITICAL"
	} else if usagePercent >= config.WarningThreshold {
		return "WARNING"
	}

	return "OK"
}
