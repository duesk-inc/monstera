package security

import (
	"crypto/tls"
	"fmt"
	"os"
	"strings"

	"go.uber.org/zap"
)

// SecurityConfig セキュリティ設定全般を管理
type SecurityConfig struct {
	logger     *zap.Logger
	sslManager *SSLManager
}

// NewSecurityConfig 新しいSecurityConfigを作成
func NewSecurityConfig(logger *zap.Logger) *SecurityConfig {
	return &SecurityConfig{
		logger:     logger,
		sslManager: NewSSLManager(logger),
	}
}

// DatabaseSecurityConfig データベースセキュリティ設定
type DatabaseSecurityConfig struct {
	SSLMode         string
	RequireSSL      bool
	MinTLSVersion   string
	CertFile        string
	KeyFile         string
	RootCertFile    string
	CertContent     string
	KeyContent      string
	RootCertContent string
	ConnectTimeout  int
}

// ValidateSecurityConfiguration セキュリティ設定の妥当性を検証
func (sc *SecurityConfig) ValidateSecurityConfiguration(config DatabaseSecurityConfig) error {
	// SSL証明書ファイルの存在確認
	if config.CertFile != "" {
		if err := sc.validateFileExists(config.CertFile, "certificate"); err != nil {
			return err
		}
	}

	if config.KeyFile != "" {
		if err := sc.validateFileExists(config.KeyFile, "private key"); err != nil {
			return err
		}
	}

	if config.RootCertFile != "" {
		if err := sc.validateFileExists(config.RootCertFile, "root certificate"); err != nil {
			return err
		}
	}

	// SSL証明書の有効性確認
	if config.CertFile != "" {
		if err := sc.sslManager.ValidateCertificate(config.CertFile); err != nil {
			sc.logger.Warn("Certificate validation failed", zap.Error(err))
		}
	}

	// SSL設定の論理確認
	if config.RequireSSL && config.SSLMode == "disable" {
		return fmt.Errorf("RequireSSL is true but SSLMode is disabled")
	}

	sc.logger.Info("Security configuration validation completed")
	return nil
}

// validateFileExists ファイルの存在を確認
func (sc *SecurityConfig) validateFileExists(filePath, fileType string) error {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("%s file not found: %s", fileType, filePath)
	}
	sc.logger.Debug("File exists", zap.String("type", fileType), zap.String("path", filePath))
	return nil
}

// GetRecommendedSSLConfig 環境に応じた推奨SSL設定を取得
func (sc *SecurityConfig) GetRecommendedSSLConfig(environment string) DatabaseSecurityConfig {
	switch strings.ToLower(environment) {
	case "production":
		return DatabaseSecurityConfig{
			SSLMode:        "require",
			RequireSSL:     true,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}
	case "staging":
		return DatabaseSecurityConfig{
			SSLMode:        "prefer",
			RequireSSL:     false,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}
	case "development":
		return DatabaseSecurityConfig{
			SSLMode:        "prefer",
			RequireSSL:     false,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}
	default:
		return DatabaseSecurityConfig{
			SSLMode:        "disable",
			RequireSSL:     false,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}
	}
}

// CreateTLSConfigFromDatabaseConfig データベース設定からTLS設定を作成
func (sc *SecurityConfig) CreateTLSConfigFromDatabaseConfig(config DatabaseSecurityConfig) (*tls.Config, error) {
	sslConfig := SSLConfig{
		CertFile:        config.CertFile,
		KeyFile:         config.KeyFile,
		RootCertFile:    config.RootCertFile,
		CertContent:     config.CertContent,
		KeyContent:      config.KeyContent,
		RootCertContent: config.RootCertContent,
		MinTLSVersion:   config.MinTLSVersion,
		RequireSSL:      config.RequireSSL,
	}

	return sc.sslManager.LoadTLSConfig(sslConfig)
}

// LogSecuritySettings セキュリティ設定をログに出力
func (sc *SecurityConfig) LogSecuritySettings(config DatabaseSecurityConfig) {
	sc.logger.Info("Database Security Configuration",
		zap.String("ssl_mode", config.SSLMode),
		zap.Bool("require_ssl", config.RequireSSL),
		zap.String("min_tls_version", config.MinTLSVersion),
		zap.Int("connect_timeout", config.ConnectTimeout),
		zap.Bool("has_client_cert", config.CertFile != "" || config.CertContent != ""),
		zap.Bool("has_root_cert", config.RootCertFile != "" || config.RootCertContent != ""),
	)

	// セキュリティ警告の出力
	if !config.RequireSSL && config.SSLMode != "disable" {
		sc.logger.Warn("SSL is not required - consider enabling for production environments")
	}

	if config.MinTLSVersion == "1.1" || config.MinTLSVersion == "1.0" {
		sc.logger.Warn("Weak TLS version configured - consider using TLS 1.2 or higher",
			zap.String("current_version", config.MinTLSVersion))
	}

	if config.SSLMode == "disable" {
		sc.logger.Warn("SSL is disabled - database connections will be unencrypted")
	}
}

// GenerateSecurityReport セキュリティ設定レポートを生成
func (sc *SecurityConfig) GenerateSecurityReport(config DatabaseSecurityConfig) SecurityReport {
	report := SecurityReport{
		SSLEnabled:      config.SSLMode != "disable",
		TLSVersion:      config.MinTLSVersion,
		RequireSSL:      config.RequireSSL,
		HasClientCert:   config.CertFile != "" || config.CertContent != "",
		HasRootCert:     config.RootCertFile != "" || config.RootCertContent != "",
		Recommendations: []string{},
	}

	// セキュリティ推奨事項の生成
	if !report.SSLEnabled {
		report.Recommendations = append(report.Recommendations, "Enable SSL encryption for database connections")
	}

	if !report.RequireSSL && report.SSLEnabled {
		report.Recommendations = append(report.Recommendations, "Consider requiring SSL for all connections")
	}

	if config.MinTLSVersion == "1.1" || config.MinTLSVersion == "1.0" {
		report.Recommendations = append(report.Recommendations, "Upgrade to TLS 1.2 or higher")
	}

	if !report.HasClientCert && report.SSLEnabled {
		report.Recommendations = append(report.Recommendations, "Consider using client certificates for mutual TLS authentication")
	}

	if config.ConnectTimeout == 0 {
		report.Recommendations = append(report.Recommendations, "Set a reasonable connection timeout")
	}

	// セキュリティスコアの計算
	report.SecurityScore = sc.calculateSecurityScore(report)

	return report
}

// SecurityReport セキュリティレポート
type SecurityReport struct {
	SSLEnabled      bool     `json:"ssl_enabled"`
	TLSVersion      string   `json:"tls_version"`
	RequireSSL      bool     `json:"require_ssl"`
	HasClientCert   bool     `json:"has_client_cert"`
	HasRootCert     bool     `json:"has_root_cert"`
	SecurityScore   int      `json:"security_score"`
	Recommendations []string `json:"recommendations"`
}

// calculateSecurityScore セキュリティスコアを計算（0-100）
func (sc *SecurityConfig) calculateSecurityScore(report SecurityReport) int {
	score := 0

	// SSL有効化 (40点)
	if report.SSLEnabled {
		score += 40
	}

	// SSL必須設定 (20点)
	if report.RequireSSL {
		score += 20
	}

	// TLSバージョン (20点)
	switch report.TLSVersion {
	case "1.3":
		score += 20
	case "1.2":
		score += 15
	case "1.1":
		score += 5
	}

	// クライアント証明書 (10点)
	if report.HasClientCert {
		score += 10
	}

	// ルート証明書 (10点)
	if report.HasRootCert {
		score += 10
	}

	return score
}
