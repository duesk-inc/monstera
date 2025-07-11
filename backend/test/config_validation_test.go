package test

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/duesk/monstera/internal/config"
)

// TestFreeeConfigValidation freee設定の検証テスト
func TestFreeeConfigValidation(t *testing.T) {
	// 環境変数を設定
	os.Setenv("FREEE_CLIENT_ID", "test-client-id")
	os.Setenv("FREEE_CLIENT_SECRET", "test-client-secret")
	os.Setenv("FREEE_REDIRECT_URI", "http://localhost:3000/freee/callback")
	os.Setenv("FREEE_API_BASE_URL", "https://api.freee.co.jp")
	os.Setenv("FREEE_OAUTH_BASE_URL", "https://accounts.secure.freee.co.jp")
	os.Setenv("FREEE_API_VERSION", "1")
	os.Setenv("FREEE_SCOPE", "read write")
	os.Setenv("FREEE_RATE_LIMIT_REQUESTS", "300")
	os.Setenv("FREEE_RATE_LIMIT_WINDOW", "3600")
	os.Setenv("FREEE_TIMEOUT_SECONDS", "30")
	os.Setenv("FREEE_MAX_RETRIES", "3")
	os.Setenv("FREEE_RETRY_DELAY_SECONDS", "5")
	os.Setenv("TOKEN_ENCRYPTION_KEY", "test-encryption-key-32-characters")
	os.Setenv("TOKEN_ENCRYPTION_ALGORITHM", "AES-GCM")

	defer func() {
		// テスト終了後に環境変数をクリア
		os.Unsetenv("FREEE_CLIENT_ID")
		os.Unsetenv("FREEE_CLIENT_SECRET")
		os.Unsetenv("FREEE_REDIRECT_URI")
		os.Unsetenv("FREEE_API_BASE_URL")
		os.Unsetenv("FREEE_OAUTH_BASE_URL")
		os.Unsetenv("FREEE_API_VERSION")
		os.Unsetenv("FREEE_SCOPE")
		os.Unsetenv("FREEE_RATE_LIMIT_REQUESTS")
		os.Unsetenv("FREEE_RATE_LIMIT_WINDOW")
		os.Unsetenv("FREEE_TIMEOUT_SECONDS")
		os.Unsetenv("FREEE_MAX_RETRIES")
		os.Unsetenv("FREEE_RETRY_DELAY_SECONDS")
		os.Unsetenv("TOKEN_ENCRYPTION_KEY")
		os.Unsetenv("TOKEN_ENCRYPTION_ALGORITHM")
	}()

	cfg, err := config.Load()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	t.Run("FreeeConfig基本設定", func(t *testing.T) {
		assert.Equal(t, "test-client-id", cfg.Freee.ClientID)
		assert.Equal(t, "test-client-secret", cfg.Freee.ClientSecret)
		assert.Equal(t, "http://localhost:3000/freee/callback", cfg.Freee.RedirectURI)
		assert.Equal(t, "https://api.freee.co.jp", cfg.Freee.APIBaseURL)
		assert.Equal(t, "https://accounts.secure.freee.co.jp", cfg.Freee.OAuthBaseURL)
		assert.Equal(t, 1, cfg.Freee.APIVersion)
		assert.Equal(t, "read write", cfg.Freee.Scope)
	})

	t.Run("FreeeConfigレート制限設定", func(t *testing.T) {
		assert.Equal(t, 300, cfg.Freee.RateLimitRequests)
		assert.Equal(t, 3600, cfg.Freee.RateLimitWindow)
		assert.Equal(t, 30, cfg.Freee.TimeoutSeconds)
		assert.Equal(t, 3, cfg.Freee.MaxRetries)
		assert.Equal(t, 5, cfg.Freee.RetryDelaySeconds)
	})

	t.Run("EncryptionConfig設定", func(t *testing.T) {
		assert.Equal(t, "test-encryption-key-32-characters", cfg.Encryption.Key)
		assert.Equal(t, "AES-GCM", cfg.Encryption.Algorithm)
	})

	t.Run("FreeeConfig有効性確認", func(t *testing.T) {
		assert.True(t, cfg.Freee.IsValid())
	})

	t.Run("EncryptionConfig有効性確認", func(t *testing.T) {
		assert.True(t, cfg.Encryption.IsValid())
	})
}

// TestFreeeConfigURLGeneration freee設定のURL生成テスト
func TestFreeeConfigURLGeneration(t *testing.T) {
	cfg := &config.Config{
		Freee: config.FreeeConfig{
			ClientID:     "test-client-id",
			RedirectURI:  "http://localhost:3000/freee/callback",
			OAuthBaseURL: "https://accounts.secure.freee.co.jp",
			APIBaseURL:   "https://api.freee.co.jp",
			APIVersion:   1,
			Scope:        "read write",
		},
	}

	t.Run("OAuth URL生成", func(t *testing.T) {
		state := "test-state"
		expectedURL := "https://accounts.secure.freee.co.jp/oauth/authorize?client_id=test-client-id&redirect_uri=http://localhost:3000/freee/callback&response_type=code&state=test-state&scope=read write"
		actualURL := cfg.Freee.GetOAuthURL(state)
		assert.Equal(t, expectedURL, actualURL)
	})

	t.Run("Token URL生成", func(t *testing.T) {
		expectedURL := "https://accounts.secure.freee.co.jp/oauth/token"
		actualURL := cfg.Freee.GetTokenURL()
		assert.Equal(t, expectedURL, actualURL)
	})

	t.Run("API URL生成", func(t *testing.T) {
		endpoint := "/partners"
		expectedURL := "https://api.freee.co.jp/api/1/partners"
		actualURL := cfg.Freee.GetAPIURL(endpoint)
		assert.Equal(t, expectedURL, actualURL)
	})
}

// TestFreeeConfigInvalidSettings 無効な設定のテスト
func TestFreeeConfigInvalidSettings(t *testing.T) {
	t.Run("無効なFreeeConfig", func(t *testing.T) {
		cfg := config.FreeeConfig{
			ClientID:     "",
			ClientSecret: "secret",
			RedirectURI:  "http://localhost:3000/callback",
		}
		assert.False(t, cfg.IsValid())
	})

	t.Run("無効なEncryptionConfig - 短いキー", func(t *testing.T) {
		cfg := config.EncryptionConfig{
			Key:       "short-key",
			Algorithm: "AES-GCM",
		}
		assert.False(t, cfg.IsValid())
	})

	t.Run("無効なEncryptionConfig - 空のアルゴリズム", func(t *testing.T) {
		cfg := config.EncryptionConfig{
			Key:       "test-encryption-key-32-characters",
			Algorithm: "",
		}
		assert.False(t, cfg.IsValid())
	})
}

// TestFreeeConfigDefaults デフォルト値のテスト
func TestFreeeConfigDefaults(t *testing.T) {
	// 環境変数をクリア
	os.Unsetenv("FREEE_CLIENT_ID")
	os.Unsetenv("FREEE_CLIENT_SECRET")
	os.Unsetenv("FREEE_REDIRECT_URI")
	os.Unsetenv("FREEE_API_BASE_URL")
	os.Unsetenv("FREEE_OAUTH_BASE_URL")
	os.Unsetenv("FREEE_API_VERSION")
	os.Unsetenv("FREEE_SCOPE")
	os.Unsetenv("TOKEN_ENCRYPTION_ALGORITHM")

	cfg, err := config.Load()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	t.Run("FreeeConfigデフォルト値", func(t *testing.T) {
		assert.Equal(t, "", cfg.Freee.ClientID)
		assert.Equal(t, "", cfg.Freee.ClientSecret)
		assert.Equal(t, "", cfg.Freee.RedirectURI)
		assert.Equal(t, "https://api.freee.co.jp", cfg.Freee.APIBaseURL)
		assert.Equal(t, "https://accounts.secure.freee.co.jp", cfg.Freee.OAuthBaseURL)
		assert.Equal(t, 1, cfg.Freee.APIVersion)
		assert.Equal(t, "read write", cfg.Freee.Scope)
	})

	t.Run("EncryptionConfigデフォルト値", func(t *testing.T) {
		assert.Equal(t, "", cfg.Encryption.Key)
		assert.Equal(t, "AES-GCM", cfg.Encryption.Algorithm)
	})

	t.Run("デフォルト設定での有効性確認", func(t *testing.T) {
		assert.False(t, cfg.Freee.IsValid())
		assert.False(t, cfg.Encryption.IsValid())
	})
}

// TestFreeeConfigEdgeCases エッジケースのテスト
func TestFreeeConfigEdgeCases(t *testing.T) {
	t.Run("最小値設定", func(t *testing.T) {
		os.Setenv("FREEE_API_VERSION", "0")
		os.Setenv("FREEE_RATE_LIMIT_REQUESTS", "1")
		os.Setenv("FREEE_RATE_LIMIT_WINDOW", "1")
		os.Setenv("FREEE_TIMEOUT_SECONDS", "1")
		os.Setenv("FREEE_MAX_RETRIES", "0")
		os.Setenv("FREEE_RETRY_DELAY_SECONDS", "0")

		defer func() {
			os.Unsetenv("FREEE_API_VERSION")
			os.Unsetenv("FREEE_RATE_LIMIT_REQUESTS")
			os.Unsetenv("FREEE_RATE_LIMIT_WINDOW")
			os.Unsetenv("FREEE_TIMEOUT_SECONDS")
			os.Unsetenv("FREEE_MAX_RETRIES")
			os.Unsetenv("FREEE_RETRY_DELAY_SECONDS")
		}()

		cfg, err := config.Load()
		assert.NoError(t, err)
		assert.Equal(t, 0, cfg.Freee.APIVersion)
		assert.Equal(t, 1, cfg.Freee.RateLimitRequests)
		assert.Equal(t, 1, cfg.Freee.RateLimitWindow)
		assert.Equal(t, 1, cfg.Freee.TimeoutSeconds)
		assert.Equal(t, 0, cfg.Freee.MaxRetries)
		assert.Equal(t, 0, cfg.Freee.RetryDelaySeconds)
	})

	t.Run("大きな値設定", func(t *testing.T) {
		os.Setenv("FREEE_API_VERSION", "999")
		os.Setenv("FREEE_RATE_LIMIT_REQUESTS", "10000")
		os.Setenv("FREEE_RATE_LIMIT_WINDOW", "86400")
		os.Setenv("FREEE_TIMEOUT_SECONDS", "300")
		os.Setenv("FREEE_MAX_RETRIES", "100")
		os.Setenv("FREEE_RETRY_DELAY_SECONDS", "3600")

		defer func() {
			os.Unsetenv("FREEE_API_VERSION")
			os.Unsetenv("FREEE_RATE_LIMIT_REQUESTS")
			os.Unsetenv("FREEE_RATE_LIMIT_WINDOW")
			os.Unsetenv("FREEE_TIMEOUT_SECONDS")
			os.Unsetenv("FREEE_MAX_RETRIES")
			os.Unsetenv("FREEE_RETRY_DELAY_SECONDS")
		}()

		cfg, err := config.Load()
		assert.NoError(t, err)
		assert.Equal(t, 999, cfg.Freee.APIVersion)
		assert.Equal(t, 10000, cfg.Freee.RateLimitRequests)
		assert.Equal(t, 86400, cfg.Freee.RateLimitWindow)
		assert.Equal(t, 300, cfg.Freee.TimeoutSeconds)
		assert.Equal(t, 100, cfg.Freee.MaxRetries)
		assert.Equal(t, 3600, cfg.Freee.RetryDelaySeconds)
	})

	t.Run("無効な数値設定", func(t *testing.T) {
		os.Setenv("FREEE_API_VERSION", "invalid")
		os.Setenv("FREEE_RATE_LIMIT_REQUESTS", "not-a-number")

		defer func() {
			os.Unsetenv("FREEE_API_VERSION")
			os.Unsetenv("FREEE_RATE_LIMIT_REQUESTS")
		}()

		cfg, err := config.Load()
		assert.NoError(t, err)
		// 無効な値の場合はデフォルト値が使用される
		assert.Equal(t, 0, cfg.Freee.APIVersion) // strconv.Atoiは無効な文字列に対して0を返す
		assert.Equal(t, 0, cfg.Freee.RateLimitRequests)
	})
}
