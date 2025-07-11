package security

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestSSLManager_GetSSLModeRecommendation(t *testing.T) {
	logger := zap.NewNop()
	sslManager := NewSSLManager(logger)

	tests := []struct {
		environment string
		expected    string
	}{
		{"production", "require"},
		{"staging", "prefer"},
		{"development", "prefer"},
		{"test", "disable"},
		{"", "disable"},
	}

	for _, tt := range tests {
		t.Run(tt.environment, func(t *testing.T) {
			result := sslManager.GetSSLModeRecommendation(tt.environment)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSSLManager_LoadTLSConfig(t *testing.T) {
	logger := zap.NewNop()
	sslManager := NewSSLManager(logger)

	t.Run("Default TLS 1.2", func(t *testing.T) {
		config := SSLConfig{
			MinTLSVersion: "1.2",
			RequireSSL:    true,
		}

		tlsConfig, err := sslManager.LoadTLSConfig(config)
		assert.NoError(t, err)
		assert.NotNil(t, tlsConfig)
		assert.Equal(t, uint16(tls.VersionTLS12), tlsConfig.MinVersion)
		assert.False(t, tlsConfig.InsecureSkipVerify)
	})

	t.Run("TLS 1.3", func(t *testing.T) {
		config := SSLConfig{
			MinTLSVersion: "1.3",
			RequireSSL:    false,
		}

		tlsConfig, err := sslManager.LoadTLSConfig(config)
		assert.NoError(t, err)
		assert.NotNil(t, tlsConfig)
		assert.Equal(t, uint16(tls.VersionTLS13), tlsConfig.MinVersion)
	})

	t.Run("Strong cipher suites", func(t *testing.T) {
		config := SSLConfig{
			MinTLSVersion: "1.2",
		}

		tlsConfig, err := sslManager.LoadTLSConfig(config)
		assert.NoError(t, err)
		assert.NotEmpty(t, tlsConfig.CipherSuites)

		// 強固な暗号スイートが含まれていることを確認
		expectedCiphers := []uint16{
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		}

		for _, expected := range expectedCiphers {
			assert.Contains(t, tlsConfig.CipherSuites, expected)
		}
	})
}

func TestSSLManager_LogSSLConfiguration(t *testing.T) {
	logger := zap.NewNop()
	sslManager := NewSSLManager(logger)

	config := SSLConfig{
		RequireSSL:    true,
		MinTLSVersion: "1.2",
		CertFile:      "/path/to/cert.pem",
		RootCertFile:  "/path/to/ca.pem",
	}

	// ログ出力のテスト（パニックしないことを確認）
	assert.NotPanics(t, func() {
		sslManager.LogSSLConfiguration(config)
	})
}
