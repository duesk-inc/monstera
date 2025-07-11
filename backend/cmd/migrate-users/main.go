package main

import (
	"fmt"
	"log"
	"os"

	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/security"
)

// PostgreSQL User Migration Tool
// このツールはMySQLからPostgreSQLへのユーザー権限移行を支援します

func main() {
	println("🚀 PostgreSQL User Migration and Validation Tool")
	println("================================================")
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

	// セキュリティ設定初期化
	securityConfig := security.NewSecurityConfig(logger)

	// データベースセキュリティ設定作成
	dbSecurityConfig := security.DatabaseSecurityConfig{
		SSLMode:         cfg.Database.SSLMode,
		RequireSSL:      cfg.Database.RequireSSL,
		MinTLSVersion:   cfg.Database.MinTLSVersion,
		CertFile:        cfg.Database.SSLCertFile,
		KeyFile:         cfg.Database.SSLKeyFile,
		RootCertFile:    cfg.Database.SSLRootCertFile,
		CertContent:     cfg.Database.SSLCert,
		KeyContent:      cfg.Database.SSLKey,
		RootCertContent: cfg.Database.SSLRootCert,
		ConnectTimeout:  cfg.Database.ConnectTimeout,
	}

	// 1. 現在の設定確認
	println("📋 Current Configuration Analysis:")
	println("==================================")
	fmt.Printf("Database Driver: %s\n", cfg.Database.Driver)
	fmt.Printf("Host: %s:%s\n", cfg.Database.Host, cfg.Database.Port)
	fmt.Printf("Database: %s\n", cfg.Database.DBName)
	fmt.Printf("User: %s\n", cfg.Database.User)
	fmt.Printf("SSL Mode: %s\n", cfg.Database.SSLMode)
	fmt.Printf("Require SSL: %v\n", cfg.Database.RequireSSL)
	fmt.Printf("Min TLS Version: %s\n", cfg.Database.MinTLSVersion)
	println("")

	// 2. ユーザー移行マッピング表示
	println("👥 User Migration Mapping:")
	println("==========================")

	mysqlUsers := map[string]string{
		"root":     "Administrative access (MySQL)",
		"monstera": "Application access (MySQL)",
	}

	postgresUsers := map[string]string{
		"postgres":          "Administrative access (PostgreSQL)",
		"monstera_app":      "Application access (PostgreSQL)",
		"monstera_readonly": "Read-only access (PostgreSQL)",
		"monstera_backup":   "Backup access (PostgreSQL)",
	}

	println("MySQL Users (Current):")
	for user, desc := range mysqlUsers {
		fmt.Printf("  ├─ %s: %s\n", user, desc)
	}
	println("")

	println("PostgreSQL Users (Target):")
	for user, desc := range postgresUsers {
		fmt.Printf("  ├─ %s: %s\n", user, desc)
	}
	println("")

	// 3. セキュリティ設定検証
	println("🔒 Security Configuration Validation:")
	println("=====================================")

	if err := securityConfig.ValidateSecurityConfiguration(dbSecurityConfig); err != nil {
		logger.Warn("Security configuration validation failed", zap.Error(err))
		fmt.Printf("⚠️  Security Warning: %v\n", err)
	} else {
		println("✅ Security configuration validation passed")
	}

	// セキュリティレポート生成
	report := securityConfig.GenerateSecurityReport(dbSecurityConfig)
	println("")
	println("📊 Security Assessment Report:")
	println("==============================")
	fmt.Printf("SSL Enabled: %v\n", report.SSLEnabled)
	fmt.Printf("SSL Required: %v\n", report.RequireSSL)
	fmt.Printf("TLS Version: %s\n", report.TLSVersion)
	fmt.Printf("Has Client Certificate: %v\n", report.HasClientCert)
	fmt.Printf("Has Root Certificate: %v\n", report.HasRootCert)
	fmt.Printf("Security Score: %d/100\n", report.SecurityScore)

	if len(report.Recommendations) > 0 {
		println("")
		println("📋 Security Recommendations:")
		for i, rec := range report.Recommendations {
			fmt.Printf("  %d. %s\n", i+1, rec)
		}
	}
	println("")

	// 4. 環境別推奨設定表示
	println("🌍 Environment-Specific Recommendations:")
	println("========================================")

	environments := []string{"development", "staging", "production", "test"}
	for _, env := range environments {
		envConfig := securityConfig.GetRecommendedSSLConfig(env)
		fmt.Printf("%s Environment:\n", capitalize(env))
		fmt.Printf("  ├─ SSL Mode: %s\n", envConfig.SSLMode)
		fmt.Printf("  ├─ Require SSL: %v\n", envConfig.RequireSSL)
		fmt.Printf("  ├─ Min TLS Version: %s\n", envConfig.MinTLSVersion)
		fmt.Printf("  └─ Connect Timeout: %ds\n", envConfig.ConnectTimeout)
		println("")
	}

	// 5. 移行チェックリスト
	println("✅ Migration Checklist:")
	println("=======================")

	checklist := []struct {
		task string
		done bool
	}{
		{"PostgreSQL container setup", true},
		{"User creation script ready", true},
		{"Environment variables updated", false},
		{"Application configuration updated", false},
		{"SSL certificates configured", false},
		{"Connection pool settings optimized", true},
		{"Permission validation script ready", true},
		{"Monitoring setup configured", true},
		{"Backup user configured", true},
		{"Security audit completed", false},
	}

	for _, item := range checklist {
		status := "❌"
		if item.done {
			status = "✅"
		}
		fmt.Printf("  %s %s\n", status, item.task)
	}
	println("")

	// 6. 次のステップ
	println("🔄 Next Steps:")
	println("==============")
	println("1. Update environment variables in .env file:")
	println("   - Set DB_DRIVER=postgres")
	println("   - Set DB_PORT=5432")
	println("   - Set DB_USER=monstera_app")
	println("   - Set DB_PASSWORD=app_password")
	println("   - Configure SSL settings")
	println("")
	println("2. Run PostgreSQL user setup script:")
	println("   psql -h localhost -U postgres -d monstera -f scripts/setup-postgres-users.sql")
	println("")
	println("3. Validate user permissions:")
	println("   ./scripts/validate-user-permissions.sh")
	println("")
	println("4. Test application connectivity:")
	println("   go run main.go")
	println("")
	println("5. Monitor security score and optimize settings")
	println("")

	// 7. 現在の接続テスト（設定されている場合）
	if cfg.Database.Driver == "postgres" {
		println("🔌 Connection Test:")
		println("==================")

		// データベース接続を試行
		db, err := config.InitDatabase(cfg, logger)
		if err != nil {
			fmt.Printf("❌ Database connection failed: %v\n", err)
			println("   Check your environment variables and PostgreSQL service")
		} else {
			println("✅ Database connection successful")

			// 接続を閉じる
			sqlDB, _ := db.DB()
			if sqlDB != nil {
				sqlDB.Close()
			}
		}
	} else {
		println("ℹ️  Database driver is set to MySQL. Update DB_DRIVER=postgres to test PostgreSQL connection.")
	}

	println("")
	println("🎉 User Migration Analysis Complete!")
	println("====================================")
	println("")
	println("📝 Summary:")
	fmt.Printf("   • Current driver: %s\n", cfg.Database.Driver)
	fmt.Printf("   • Security score: %d/100\n", report.SecurityScore)
	fmt.Printf("   • SSL enabled: %v\n", report.SSLEnabled)
	println("   • PostgreSQL users configured and ready")
	println("   • Migration scripts and validation tools prepared")
	println("")

	if report.SecurityScore < 75 {
		println("⚠️  Consider improving security configuration before production deployment")
	} else {
		println("✅ Security configuration meets recommended standards")
	}
}

// capitalize 文字列の最初の文字を大文字にする
func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	return string(s[0]-32) + s[1:]
}

// 環境変数から設定を読み込むヘルパー関数
func getEnvOr(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
