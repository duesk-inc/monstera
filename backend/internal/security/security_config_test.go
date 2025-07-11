package security

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestSecurityConfig_GetRecommendedSSLConfig(t *testing.T) {
	logger := zap.NewNop()
	securityConfig := NewSecurityConfig(logger)

	tests := []struct {
		environment string
		expected    DatabaseSecurityConfig
	}{
		{
			environment: "production",
			expected: DatabaseSecurityConfig{
				SSLMode:        "require",
				RequireSSL:     true,
				MinTLSVersion:  "1.2",
				ConnectTimeout: 30,
			},
		},
		{
			environment: "staging",
			expected: DatabaseSecurityConfig{
				SSLMode:        "prefer",
				RequireSSL:     false,
				MinTLSVersion:  "1.2",
				ConnectTimeout: 30,
			},
		},
		{
			environment: "development",
			expected: DatabaseSecurityConfig{
				SSLMode:        "prefer",
				RequireSSL:     false,
				MinTLSVersion:  "1.2",
				ConnectTimeout: 30,
			},
		},
		{
			environment: "test",
			expected: DatabaseSecurityConfig{
				SSLMode:        "disable",
				RequireSSL:     false,
				MinTLSVersion:  "1.2",
				ConnectTimeout: 30,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.environment, func(t *testing.T) {
			result := securityConfig.GetRecommendedSSLConfig(tt.environment)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSecurityConfig_ValidateSecurityConfiguration(t *testing.T) {
	logger := zap.NewNop()
	securityConfig := NewSecurityConfig(logger)

	t.Run("Valid configuration", func(t *testing.T) {
		config := DatabaseSecurityConfig{
			SSLMode:        "prefer",
			RequireSSL:     false,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}

		err := securityConfig.ValidateSecurityConfiguration(config)
		assert.NoError(t, err)
	})

	t.Run("Invalid configuration - RequireSSL true but SSL disabled", func(t *testing.T) {
		config := DatabaseSecurityConfig{
			SSLMode:        "disable",
			RequireSSL:     true,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}

		err := securityConfig.ValidateSecurityConfiguration(config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "RequireSSL is true but SSLMode is disabled")
	})
}

func TestSecurityConfig_GenerateSecurityReport(t *testing.T) {
	logger := zap.NewNop()
	securityConfig := NewSecurityConfig(logger)

	t.Run("High security configuration", func(t *testing.T) {
		config := DatabaseSecurityConfig{
			SSLMode:        "require",
			RequireSSL:     true,
			MinTLSVersion:  "1.3",
			CertFile:       "/path/to/cert.pem",
			RootCertFile:   "/path/to/ca.pem",
			ConnectTimeout: 30,
		}

		report := securityConfig.GenerateSecurityReport(config)

		assert.True(t, report.SSLEnabled)
		assert.True(t, report.RequireSSL)
		assert.Equal(t, "1.3", report.TLSVersion)
		assert.True(t, report.HasClientCert)
		assert.True(t, report.HasRootCert)
		assert.Equal(t, 100, report.SecurityScore) // 満点
		assert.Empty(t, report.Recommendations)    // 推奨事項なし
	})

	t.Run("Low security configuration", func(t *testing.T) {
		config := DatabaseSecurityConfig{
			SSLMode:        "disable",
			RequireSSL:     false,
			MinTLSVersion:  "1.0",
			ConnectTimeout: 0,
		}

		report := securityConfig.GenerateSecurityReport(config)

		assert.False(t, report.SSLEnabled)
		assert.False(t, report.RequireSSL)
		assert.Equal(t, "1.0", report.TLSVersion)
		assert.False(t, report.HasClientCert)
		assert.False(t, report.HasRootCert)
		assert.Equal(t, 0, report.SecurityScore)   // 最低点
		assert.NotEmpty(t, report.Recommendations) // 推奨事項あり

		// 推奨事項の確認
		assert.Contains(t, report.Recommendations, "Enable SSL encryption for database connections")
		assert.Contains(t, report.Recommendations, "Upgrade to TLS 1.2 or higher")
		assert.Contains(t, report.Recommendations, "Set a reasonable connection timeout")
	})

	t.Run("Medium security configuration", func(t *testing.T) {
		config := DatabaseSecurityConfig{
			SSLMode:        "prefer",
			RequireSSL:     false,
			MinTLSVersion:  "1.2",
			ConnectTimeout: 30,
		}

		report := securityConfig.GenerateSecurityReport(config)

		assert.True(t, report.SSLEnabled)
		assert.False(t, report.RequireSSL)
		assert.Equal(t, "1.2", report.TLSVersion)
		assert.Equal(t, 55, report.SecurityScore) // 中程度のスコア

		// SSL必須化の推奨
		assert.Contains(t, report.Recommendations, "Consider requiring SSL for all connections")
	})
}

func TestSecurityConfig_calculateSecurityScore(t *testing.T) {
	logger := zap.NewNop()
	securityConfig := NewSecurityConfig(logger)

	tests := []struct {
		name     string
		report   SecurityReport
		expected int
	}{
		{
			name: "Maximum security",
			report: SecurityReport{
				SSLEnabled:    true,
				RequireSSL:    true,
				TLSVersion:    "1.3",
				HasClientCert: true,
				HasRootCert:   true,
			},
			expected: 100, // 40 + 20 + 20 + 10 + 10
		},
		{
			name: "SSL enabled, TLS 1.2",
			report: SecurityReport{
				SSLEnabled:    true,
				RequireSSL:    true,
				TLSVersion:    "1.2",
				HasClientCert: false,
				HasRootCert:   false,
			},
			expected: 75, // 40 + 20 + 15
		},
		{
			name: "SSL enabled, not required",
			report: SecurityReport{
				SSLEnabled:    true,
				RequireSSL:    false,
				TLSVersion:    "1.2",
				HasClientCert: false,
				HasRootCert:   false,
			},
			expected: 55, // 40 + 15
		},
		{
			name: "No security",
			report: SecurityReport{
				SSLEnabled:    false,
				RequireSSL:    false,
				TLSVersion:    "1.0",
				HasClientCert: false,
				HasRootCert:   false,
			},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := securityConfig.calculateSecurityScore(tt.report)
			assert.Equal(t, tt.expected, score)
		})
	}
}
