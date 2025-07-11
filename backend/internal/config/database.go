package config

import (
	"crypto/tls"
	"fmt"
	"log"
	"os"
	"time"

	// model.Expense を参照するため必要だが、AutoMigrateからは除外

	"go.uber.org/zap" // zapロガーのために必要
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/duesk/monstera/internal/security"
)

// InitDatabase データベース接続を初期化する
func InitDatabase(config *Config, logger *zap.Logger) (*gorm.DB, error) {
	// セキュリティ設定の初期化
	securityConfig := security.NewSecurityConfig(logger)

	// データベースセキュリティ設定を作成
	dbSecurityConfig := security.DatabaseSecurityConfig{
		SSLMode:         config.Database.SSLMode,
		RequireSSL:      config.Database.RequireSSL,
		MinTLSVersion:   config.Database.MinTLSVersion,
		CertFile:        config.Database.SSLCertFile,
		KeyFile:         config.Database.SSLKeyFile,
		RootCertFile:    config.Database.SSLRootCertFile,
		CertContent:     config.Database.SSLCert,
		KeyContent:      config.Database.SSLKey,
		RootCertContent: config.Database.SSLRootCert,
		ConnectTimeout:  config.Database.ConnectTimeout,
	}

	// セキュリティ設定の検証
	if err := securityConfig.ValidateSecurityConfiguration(dbSecurityConfig); err != nil {
		logger.Warn("Security configuration validation failed", zap.Error(err))
	}

	// セキュリティ設定をログに出力
	securityConfig.LogSecuritySettings(dbSecurityConfig)

	// セキュリティレポート生成
	report := securityConfig.GenerateSecurityReport(dbSecurityConfig)
	logger.Info("Database security score",
		zap.Int("score", report.SecurityScore),
		zap.Strings("recommendations", report.Recommendations),
	)

	// SSL設定の検証
	if err := config.Database.ValidateSSLConfig(); err != nil {
		return nil, fmt.Errorf("invalid SSL configuration: %w", err)
	}

	gormLogger := gormlogger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		gormlogger.Config{
			SlowThreshold:             time.Second,     // 遅いクエリとして記録する閾値
			LogLevel:                  gormlogger.Warn, // ログレベル
			IgnoreRecordNotFoundError: true,            // レコードが見つからないエラーを無視
			Colorful:                  true,            // カラー表示
		},
	)

	// ドライバーに応じたDialectorを選択
	var dialector gorm.Dialector
	var err error

	logger.Info("Database driver configuration",
		zap.String("driver", config.Database.Driver),
		zap.String("host", config.Database.Host),
		zap.String("port", config.Database.Port),
		zap.String("dbname", config.Database.DBName),
		zap.String("user", config.Database.User),
	)

	switch config.Database.Driver {
	case "postgres":
		logger.Info("Using PostgreSQL driver")
		dialector, err = createPostgreSQLDialector(config)
	case "mysql":
		logger.Info("Using MySQL driver")
		dialector, err = createMySQLDialector(config)
	default:
		// デフォルトはPostgreSQL
		logger.Info("Using default PostgreSQL driver")
		dialector, err = createPostgreSQLDialector(config)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create database dialector: %w", err)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:                                   gormLogger,
		DisableForeignKeyConstraintWhenMigrating: true,
		CreateBatchSize:                          1000,
		DisableAutomaticPing:                     true, // 自動Pingを無効化
		PrepareStmt:                              true, // Enable prepared statements for better performance and security
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// 接続プール設定
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// PostgreSQL用の最適化された接続プール設定
	if config.Database.Driver == "postgres" {
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)
		sqlDB.SetConnMaxIdleTime(10 * time.Minute)
	} else {
		// MySQL用の設定
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	return db, nil
}

// createPostgreSQLDialector PostgreSQL用のDialectorを作成
func createPostgreSQLDialector(config *Config) (gorm.Dialector, error) {
	dsn := config.Database.GetPostgreSQLDSN()
	return postgres.Open(dsn), nil
}

// createMySQLDialector MySQL用のDialectorを作成
func createMySQLDialector(config *Config) (gorm.Dialector, error) {
	dsn := config.Database.GetMySQLDSN()

	// SSL設定が必要な場合はTLS設定を行う
	if config.Database.IsSSLEnabled() && config.Database.SSLMode != "false" {
		tlsConfig, err := createTLSConfig(config.Database)
		if err != nil {
			return nil, fmt.Errorf("failed to create TLS config: %w", err)
		}

		// TLS設定を登録 (go-sql-driver/mysql パッケージの機能)
		// 注: この機能はMySQL専用のため、MySQLドライバーを使用する場合のみ有効
		if tlsConfig != nil {
			// mysql.RegisterTLSConfig()は実際のMySQL接続でのみ使用可能
			// 現在はPostgreSQL移行が主目的のため、コメントアウト
			// mysql.RegisterTLSConfig(config.Database.SSLMode, tlsConfig)
		}
	}

	return mysql.Open(dsn), nil
}

// createTLSConfig TLS設定を作成
func createTLSConfig(dbConfig DatabaseConfig) (*tls.Config, error) {
	if !dbConfig.IsSSLEnabled() {
		return nil, nil
	}

	tlsConfig := &tls.Config{}

	// 最小TLSバージョンの設定
	switch dbConfig.MinTLSVersion {
	case "1.3":
		tlsConfig.MinVersion = tls.VersionTLS13
	case "1.2":
		tlsConfig.MinVersion = tls.VersionTLS12
	default:
		tlsConfig.MinVersion = tls.VersionTLS12
	}

	// SSL証明書の検証レベル設定
	switch dbConfig.SSLMode {
	case "skip-verify":
		tlsConfig.InsecureSkipVerify = true
	case "preferred", "true":
		tlsConfig.InsecureSkipVerify = false
	}

	// SSL必須フラグが設定されている場合
	if dbConfig.RequireSSL {
		tlsConfig.InsecureSkipVerify = false
	}

	return tlsConfig, nil
}

// MigrateDatabase データベースマイグレーションを実行
func MigrateDatabase(db *gorm.DB, logger *zap.Logger) error {
	logger.Info("Running database migrations...")

	// データベース構造は既に正しく設定されているため、マイグレーションを無効化
	// 外部キー制約の問題を避けるため、現在の構造をそのまま使用

	logger.Info("Database migration skipped - using existing database structure")
	return nil
}
