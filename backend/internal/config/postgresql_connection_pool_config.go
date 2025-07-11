package config

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// PostgreSQLPoolConfig PostgreSQL接続プール設定
type PostgreSQLPoolConfig struct {
	// 基本接続設定
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
	TimeZone string

	// 接続プール設定
	MaxOpenConns    int           // 最大接続数
	MaxIdleConns    int           // 最大アイドル接続数
	ConnMaxLifetime time.Duration // 接続の最大存続時間
	ConnMaxIdleTime time.Duration // アイドル接続の最大存続時間

	// PostgreSQL固有設定
	PreferSimpleProtocol bool   // プリペアドステートメントの無効化
	StatementCacheMode   string // prepared statement cache mode

	// パフォーマンス設定
	ConnectionTimeout time.Duration // 接続タイムアウト
	LockTimeout       time.Duration // ロックタイムアウト
	StatementTimeout  time.Duration // ステートメントタイムアウト

	// GORM設定
	CreateBatchSize int  // バッチINSERTサイズ
	PrepareStmt     bool // プリペアドステートメント有効化

	// モニタリング
	EnableMetrics bool // メトリクス収集有効化
}

// NewPostgreSQLPoolConfig 環境変数から設定を読み込み
func NewPostgreSQLPoolConfig() *PostgreSQLPoolConfig {
	return &PostgreSQLPoolConfig{
		// 基本接続設定
		Host:     getEnvOrDefault("DB_HOST", "localhost"),
		Port:     getEnvAsIntOrDefault("DB_PORT", 5432),
		User:     getEnvOrDefault("DB_USER", "postgres"),
		Password: getEnvOrDefault("DB_PASSWORD", "password"),
		DBName:   getEnvOrDefault("DB_NAME", "monstera"),
		SSLMode:  getEnvOrDefault("DB_SSLMODE", "disable"),
		TimeZone: getEnvOrDefault("DB_TIMEZONE", "Asia/Tokyo"),

		// 接続プール設定（PostgreSQL推奨値）
		MaxOpenConns:    getEnvAsIntOrDefault("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns:    getEnvAsIntOrDefault("DB_MAX_IDLE_CONNS", 5),
		ConnMaxLifetime: getEnvAsDurationOrDefault("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		ConnMaxIdleTime: getEnvAsDurationOrDefault("DB_CONN_MAX_IDLE_TIME", 1*time.Minute),

		// PostgreSQL固有設定
		PreferSimpleProtocol: getEnvAsBoolOrDefault("DB_PREFER_SIMPLE_PROTOCOL", false),
		StatementCacheMode:   getEnvOrDefault("DB_STATEMENT_CACHE_MODE", "describe"),

		// パフォーマンス設定
		ConnectionTimeout: getEnvAsDurationOrDefault("DB_CONNECTION_TIMEOUT", 5*time.Second),
		LockTimeout:       getEnvAsDurationOrDefault("DB_LOCK_TIMEOUT", 30*time.Second),
		StatementTimeout:  getEnvAsDurationOrDefault("DB_STATEMENT_TIMEOUT", 300*time.Second),

		// GORM設定
		CreateBatchSize: getEnvAsIntOrDefault("DB_CREATE_BATCH_SIZE", 1000),
		PrepareStmt:     getEnvAsBoolOrDefault("DB_PREPARE_STMT", true),

		// モニタリング
		EnableMetrics: getEnvAsBoolOrDefault("DB_ENABLE_METRICS", true),
	}
}

// GetDSN PostgreSQL接続文字列を生成
func (c *PostgreSQLPoolConfig) GetDSN() string {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode, c.TimeZone,
	)

	// 追加パラメータ
	if c.PreferSimpleProtocol {
		dsn += " prefer_simple_protocol=true"
	}

	if c.StatementCacheMode != "" {
		dsn += fmt.Sprintf(" statement_cache_mode=%s", c.StatementCacheMode)
	}

	// タイムアウト設定
	if c.ConnectionTimeout > 0 {
		dsn += fmt.Sprintf(" connect_timeout=%d", int(c.ConnectionTimeout.Seconds()))
	}

	return dsn
}

// ConfigureDatabase PostgreSQL接続プールを設定
func (c *PostgreSQLPoolConfig) ConfigureDatabase(logger *zap.Logger) (*gorm.DB, error) {
	// GORM設定
	gormConfig := &gorm.Config{
		CreateBatchSize:                          c.CreateBatchSize,
		PrepareStmt:                              c.PrepareStmt,
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   createGormLogger(logger),
		NowFunc: func() time.Time {
			return time.Now().In(time.FixedZone("Asia/Tokyo", 9*60*60))
		},
	}

	// PostgreSQL接続
	db, err := gorm.Open(postgres.Open(c.GetDSN()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}

	// SQL DBオブジェクトを取得
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get SQL DB: %w", err)
	}

	// 接続プール設定
	sqlDB.SetMaxOpenConns(c.MaxOpenConns)
	sqlDB.SetMaxIdleConns(c.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(c.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(c.ConnMaxIdleTime)

	// セッションレベルのタイムアウト設定
	if err := db.Exec(fmt.Sprintf("SET lock_timeout = '%dms'", c.LockTimeout.Milliseconds())).Error; err != nil {
		logger.Warn("Failed to set lock_timeout", zap.Error(err))
	}

	if err := db.Exec(fmt.Sprintf("SET statement_timeout = '%dms'", c.StatementTimeout.Milliseconds())).Error; err != nil {
		logger.Warn("Failed to set statement_timeout", zap.Error(err))
	}

	// 接続確認
	ctx, cancel := context.WithTimeout(context.Background(), c.ConnectionTimeout)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	logger.Info("PostgreSQL connection pool configured",
		zap.Int("max_open_conns", c.MaxOpenConns),
		zap.Int("max_idle_conns", c.MaxIdleConns),
		zap.Duration("conn_max_lifetime", c.ConnMaxLifetime),
		zap.Duration("conn_max_idle_time", c.ConnMaxIdleTime),
	)

	// メトリクス収集開始
	if c.EnableMetrics {
		go c.collectConnectionMetrics(sqlDB, logger)
	}

	return db, nil
}

// collectConnectionMetrics 接続プールメトリクスを収集
func (c *PostgreSQLPoolConfig) collectConnectionMetrics(db *sql.DB, logger *zap.Logger) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		stats := db.Stats()

		// Prometheusメトリクスとして公開（実装は別途必要）
		logger.Debug("Connection pool stats",
			zap.Int("open_connections", stats.OpenConnections),
			zap.Int("in_use", stats.InUse),
			zap.Int("idle", stats.Idle),
			zap.Int64("wait_count", stats.WaitCount),
			zap.Duration("wait_duration", stats.WaitDuration),
			zap.Int64("max_idle_closed", stats.MaxIdleClosed),
			zap.Int64("max_lifetime_closed", stats.MaxLifetimeClosed),
		)
	}
}

// GetOptimalPoolSize CPUコア数に基づいた最適な接続プールサイズを計算
func GetOptimalPoolSize() (maxOpen, maxIdle int) {
	cpuCount := runtime.NumCPU()

	// PostgreSQL推奨: (コア数 * 2) + ディスク数
	// 一般的なWebアプリケーションでは コア数 * 3-4
	maxOpen = cpuCount * 3

	// アイドル接続は最大接続数の20-25%
	maxIdle = maxOpen / 4

	// 最小値を保証
	if maxOpen < 10 {
		maxOpen = 10
	}
	if maxIdle < 2 {
		maxIdle = 2
	}

	return maxOpen, maxIdle
}

// 環境変数ヘルパー関数
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsIntOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBoolOrDefault(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvAsDurationOrDefault(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// createGormLogger GORMロガーを作成
func createGormLogger(zapLogger *zap.Logger) logger.Interface {
	return logger.New(
		&gormZapLogger{logger: zapLogger},
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)
}

// gormZapLogger zapロガーのラッパー
type gormZapLogger struct {
	logger *zap.Logger
}

func (l *gormZapLogger) Printf(format string, args ...interface{}) {
	l.logger.Info(fmt.Sprintf(format, args...))
}

// ProfileBasedConfig プロファイル別の推奨設定
var ProfileBasedConfig = map[string]PostgreSQLPoolConfig{
	"development": {
		MaxOpenConns:    10,
		MaxIdleConns:    2,
		ConnMaxLifetime: 30 * time.Minute,
		ConnMaxIdleTime: 5 * time.Minute,
	},
	"staging": {
		MaxOpenConns:    25,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 1 * time.Minute,
	},
	"production": {
		MaxOpenConns:    50,
		MaxIdleConns:    10,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 30 * time.Second,
	},
	"batch": {
		MaxOpenConns:    5, // バッチ処理は少ない接続数で長時間実行
		MaxIdleConns:    1,
		ConnMaxLifetime: 1 * time.Hour,
		ConnMaxIdleTime: 10 * time.Minute,
	},
}
