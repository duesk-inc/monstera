package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDatabaseConfig_GetPostgreSQLDSN(t *testing.T) {
	config := DatabaseConfig{
		Host:           "localhost",
		Port:           "5432",
		User:           "testuser",
		Password:       "testpass",
		DBName:         "testdb",
		Driver:         "postgres",
		SSLMode:        "require",
		ConnectTimeout: 30,
	}

	dsn := config.GetPostgreSQLDSN()
	expected := "host=localhost port=5432 user=testuser password=testpass dbname=testdb sslmode=require connect_timeout=30 timezone=Asia/Tokyo"
	assert.Equal(t, expected, dsn)
}

func TestDatabaseConfig_GetMySQLDSN(t *testing.T) {
	config := DatabaseConfig{
		Host:           "localhost",
		Port:           "3306",
		User:           "testuser",
		Password:       "testpass",
		DBName:         "testdb",
		Driver:         "mysql",
		SSLMode:        "true",
		ConnectTimeout: 30,
	}

	dsn := config.GetMySQLDSN()
	expected := "testuser:testpass@tcp(localhost:3306)/testdb?charset=utf8mb4&collation=utf8mb4_0900_ai_ci&parseTime=True&loc=Local&tls=true&timeout=30s"
	assert.Equal(t, expected, dsn)
}

func TestDatabaseConfig_GetDSN(t *testing.T) {
	t.Run("PostgreSQL", func(t *testing.T) {
		config := DatabaseConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "testuser",
			Password: "testpass",
			DBName:   "testdb",
			Driver:   "postgres",
			SSLMode:  "prefer",
		}

		dsn := config.GetDSN()
		assert.Contains(t, dsn, "host=localhost")
		assert.Contains(t, dsn, "sslmode=prefer")
		assert.Contains(t, dsn, "timezone=Asia/Tokyo")
	})

	t.Run("MySQL", func(t *testing.T) {
		config := DatabaseConfig{
			Host:     "localhost",
			Port:     "3306",
			User:     "testuser",
			Password: "testpass",
			DBName:   "testdb",
			Driver:   "mysql",
			SSLMode:  "false",
		}

		dsn := config.GetDSN()
		assert.Contains(t, dsn, "testuser:testpass@tcp(localhost:3306)/testdb")
		assert.Contains(t, dsn, "charset=utf8mb4")
	})

	t.Run("Default to PostgreSQL", func(t *testing.T) {
		config := DatabaseConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "testuser",
			Password: "testpass",
			DBName:   "testdb",
			Driver:   "", // 空文字列
		}

		dsn := config.GetDSN()
		assert.Contains(t, dsn, "host=localhost")
		assert.Contains(t, dsn, "timezone=Asia/Tokyo")
	})
}

func TestDatabaseConfig_IsSSLEnabled(t *testing.T) {
	tests := []struct {
		name     string
		sslMode  string
		expected bool
	}{
		{"SSL disabled", "disable", false},
		{"SSL empty", "", false},
		{"SSL require", "require", true},
		{"SSL prefer", "prefer", true},
		{"SSL verify-ca", "verify-ca", true},
		{"SSL verify-full", "verify-full", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := DatabaseConfig{
				SSLMode: tt.sslMode,
			}
			assert.Equal(t, tt.expected, config.IsSSLEnabled())
		})
	}
}

func TestDatabaseConfig_ValidateSSLConfig(t *testing.T) {
	t.Run("Valid PostgreSQL SSL modes", func(t *testing.T) {
		validModes := []string{"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}

		for _, mode := range validModes {
			config := DatabaseConfig{
				Driver:  "postgres",
				SSLMode: mode,
			}
			assert.NoError(t, config.ValidateSSLConfig(), "Mode %s should be valid", mode)
		}
	})

	t.Run("Invalid PostgreSQL SSL mode", func(t *testing.T) {
		config := DatabaseConfig{
			Driver:  "postgres",
			SSLMode: "invalid_mode",
		}
		assert.Error(t, config.ValidateSSLConfig())
	})

	t.Run("Valid MySQL SSL modes", func(t *testing.T) {
		validModes := []string{"true", "false", "skip-verify", "preferred"}

		for _, mode := range validModes {
			config := DatabaseConfig{
				Driver:  "mysql",
				SSLMode: mode,
			}
			assert.NoError(t, config.ValidateSSLConfig(), "Mode %s should be valid", mode)
		}
	})

	t.Run("Invalid MySQL SSL mode", func(t *testing.T) {
		config := DatabaseConfig{
			Driver:  "mysql",
			SSLMode: "invalid_mode",
		}
		assert.Error(t, config.ValidateSSLConfig())
	})

	t.Run("SSL disabled", func(t *testing.T) {
		config := DatabaseConfig{
			Driver:  "postgres",
			SSLMode: "disable",
		}
		assert.NoError(t, config.ValidateSSLConfig())
	})
}
