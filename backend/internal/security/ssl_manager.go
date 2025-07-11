package security

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
)

// SSLManager SSL/TLS証明書の管理を行う
type SSLManager struct {
	logger *zap.Logger
}

// NewSSLManager 新しいSSLManagerを作成
func NewSSLManager(logger *zap.Logger) *SSLManager {
	return &SSLManager{
		logger: logger,
	}
}

// SSLConfig SSL設定情報
type SSLConfig struct {
	CertFile        string
	KeyFile         string
	RootCertFile    string
	CertContent     string
	KeyContent      string
	RootCertContent string
	MinTLSVersion   string
	RequireSSL      bool
}

// LoadTLSConfig SSL設定からTLS設定を作成
func (sm *SSLManager) LoadTLSConfig(config SSLConfig) (*tls.Config, error) {
	tlsConfig := &tls.Config{}

	// 最小TLSバージョンの設定
	switch config.MinTLSVersion {
	case "1.3":
		tlsConfig.MinVersion = tls.VersionTLS13
		sm.logger.Info("TLS version set to 1.3")
	case "1.2":
		tlsConfig.MinVersion = tls.VersionTLS12
		sm.logger.Info("TLS version set to 1.2")
	default:
		tlsConfig.MinVersion = tls.VersionTLS12
		sm.logger.Info("TLS version set to 1.2 (default)")
	}

	// 強固な暗号スイートの設定
	tlsConfig.CipherSuites = []uint16{
		tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
		tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	}

	// クライアント証明書の設定
	if config.CertFile != "" && config.KeyFile != "" {
		cert, err := sm.loadClientCertFromFile(config.CertFile, config.KeyFile)
		if err != nil {
			return nil, fmt.Errorf("failed to load client certificate from files: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
		sm.logger.Info("Client certificate loaded from files")
	} else if config.CertContent != "" && config.KeyContent != "" {
		cert, err := sm.loadClientCertFromContent(config.CertContent, config.KeyContent)
		if err != nil {
			return nil, fmt.Errorf("failed to load client certificate from content: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
		sm.logger.Info("Client certificate loaded from content")
	}

	// ルート証明書の設定
	if config.RootCertFile != "" {
		err := sm.loadRootCertFromFile(tlsConfig, config.RootCertFile)
		if err != nil {
			return nil, fmt.Errorf("failed to load root certificate from file: %w", err)
		}
		sm.logger.Info("Root certificate loaded from file")
	} else if config.RootCertContent != "" {
		err := sm.loadRootCertFromContent(tlsConfig, config.RootCertContent)
		if err != nil {
			return nil, fmt.Errorf("failed to load root certificate from content: %w", err)
		}
		sm.logger.Info("Root certificate loaded from content")
	}

	// SSL必須設定
	if config.RequireSSL {
		tlsConfig.InsecureSkipVerify = false
		sm.logger.Info("SSL verification required")
	}

	return tlsConfig, nil
}

// loadClientCertFromFile ファイルからクライアント証明書を読み込み
func (sm *SSLManager) loadClientCertFromFile(certFile, keyFile string) (tls.Certificate, error) {
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return tls.Certificate{}, fmt.Errorf("failed to load key pair: %w", err)
	}
	return cert, nil
}

// loadClientCertFromContent コンテンツからクライアント証明書を読み込み
func (sm *SSLManager) loadClientCertFromContent(certContent, keyContent string) (tls.Certificate, error) {
	cert, err := tls.X509KeyPair([]byte(certContent), []byte(keyContent))
	if err != nil {
		return tls.Certificate{}, fmt.Errorf("failed to parse key pair: %w", err)
	}
	return cert, nil
}

// loadRootCertFromFile ファイルからルート証明書を読み込み
func (sm *SSLManager) loadRootCertFromFile(tlsConfig *tls.Config, rootCertFile string) error {
	rootCert, err := os.ReadFile(rootCertFile)
	if err != nil {
		return fmt.Errorf("failed to read root certificate file: %w", err)
	}
	return sm.addRootCert(tlsConfig, rootCert)
}

// loadRootCertFromContent コンテンツからルート証明書を読み込み
func (sm *SSLManager) loadRootCertFromContent(tlsConfig *tls.Config, rootCertContent string) error {
	return sm.addRootCert(tlsConfig, []byte(rootCertContent))
}

// addRootCert ルート証明書をTLS設定に追加
func (sm *SSLManager) addRootCert(tlsConfig *tls.Config, rootCert []byte) error {
	if tlsConfig.RootCAs == nil {
		tlsConfig.RootCAs = x509.NewCertPool()
	}

	if !tlsConfig.RootCAs.AppendCertsFromPEM(rootCert) {
		return fmt.Errorf("failed to append root certificate")
	}

	return nil
}

// ValidateCertificate 証明書の有効性を検証
func (sm *SSLManager) ValidateCertificate(certFile string) error {
	cert, err := sm.readCertificate(certFile)
	if err != nil {
		return fmt.Errorf("failed to read certificate: %w", err)
	}

	// 証明書の有効期限をチェック
	now := time.Now()
	if now.Before(cert.NotBefore) {
		return fmt.Errorf("certificate is not yet valid (valid from %v)", cert.NotBefore)
	}
	if now.After(cert.NotAfter) {
		return fmt.Errorf("certificate has expired (expired on %v)", cert.NotAfter)
	}

	// 証明書の残り有効期間を警告
	daysRemaining := int(cert.NotAfter.Sub(now).Hours() / 24)
	if daysRemaining < 30 {
		sm.logger.Warn("Certificate expires soon",
			zap.String("certificate", certFile),
			zap.Int("days_remaining", daysRemaining),
			zap.Time("expires_at", cert.NotAfter),
		)
	}

	sm.logger.Info("Certificate validation successful",
		zap.String("certificate", certFile),
		zap.String("subject", cert.Subject.String()),
		zap.Time("expires_at", cert.NotAfter),
		zap.Int("days_remaining", daysRemaining),
	)

	return nil
}

// readCertificate 証明書ファイルを読み込み
func (sm *SSLManager) readCertificate(certFile string) (*x509.Certificate, error) {
	certPEM, err := os.ReadFile(certFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate file: %w", err)
	}

	block, _ := parseCertificate(certPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to parse certificate PEM")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	return cert, nil
}

// GetSSLModeRecommendation 環境に応じたSSLモードの推奨値を取得
func (sm *SSLManager) GetSSLModeRecommendation(environment string) string {
	switch environment {
	case "production":
		return "require"
	case "staging":
		return "prefer"
	case "development":
		return "prefer"
	default:
		return "disable"
	}
}

// LogSSLConfiguration SSL設定情報をログに出力
func (sm *SSLManager) LogSSLConfiguration(config SSLConfig) {
	sm.logger.Info("SSL Configuration",
		zap.Bool("ssl_enabled", config.RequireSSL),
		zap.String("min_tls_version", config.MinTLSVersion),
		zap.Bool("has_client_cert", config.CertFile != "" || config.CertContent != ""),
		zap.Bool("has_root_cert", config.RootCertFile != "" || config.RootCertContent != ""),
	)
}
