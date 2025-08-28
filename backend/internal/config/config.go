package config

import (
	"fmt"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config アプリケーション全体の設定を保持する構造体
type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	Batch      BatchConfig // バッチ処理設定を追加
	Cors       CorsConfig
	Email      EmailConfig
	Slack      SlackConfig
	Redis      RedisConfig
	Freee      FreeeConfig
	Encryption EncryptionConfig
	Prometheus PrometheusConfig
	Cognito    CognitoConfig
}

// ServerConfig サーバー関連の設定
type ServerConfig struct {
	Port           string
	ReadTimeout    time.Duration
	WriteTimeout   time.Duration
	SecureCookies  bool   // HTTPS環境でのCookie設定
	CookieSameSite string // Cookie SameSite属性: strict, lax, none
}

// DatabaseConfig データベース接続情報
type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	Driver          string // mysql, postgres
	SSLMode         string
	SSLCert         string
	SSLKey          string
	SSLRootCert     string
	SSLCertFile     string
	SSLKeyFile      string
	SSLRootCertFile string
	ConnectTimeout  int    // 接続タイムアウト（秒）
	RequireSSL      bool   // SSL必須フラグ
	MinTLSVersion   string // 最小TLSバージョン（1.2, 1.3）
}

// CorsConfig CORS設定
type CorsConfig struct {
	AllowOrigins     []string
	AllowMethods     []string
	AllowHeaders     []string
	ExposeHeaders    []string
	AllowCredentials bool
	MaxAge           time.Duration
}

// EmailConfig メール送信設定
type EmailConfig struct {
	Enabled   bool
	Host      string
	Port      int
	Username  string
	Password  string
	From      string
	FromName  string
	SystemURL string
}

// SlackConfig Slack通知設定
type SlackConfig struct {
	Enabled        bool
	WebhookURL     string
	DefaultChannel string
	SystemURL      string
	IconURL        string
}

// RedisConfig Redis設定
type RedisConfig struct {
	Enabled      bool
	Host         string
	Port         string
	Password     string
	DB           int
	PoolSize     int
	MinIdleConns int
	MaxRetries   int
	KeyPrefix    string
}

// FreeeConfig freee API設定
type FreeeConfig struct {
	ClientID          string
	ClientSecret      string
	RedirectURI       string
	APIBaseURL        string
	OAuthBaseURL      string
	APIVersion        int
	Scope             string
	RateLimitRequests int
	RateLimitWindow   int
	TimeoutSeconds    int
	MaxRetries        int
	RetryDelaySeconds int
}

// EncryptionConfig トークン暗号化設定
type EncryptionConfig struct {
	Key       string
	Algorithm string
}

// PrometheusConfig Prometheus設定
type PrometheusConfig struct {
	Enabled                bool
	Port                   string
	Path                   string
	MetricsCollectInterval time.Duration
}

// GetMySQLDSN MySQL接続用のDSN文字列を生成
func (c *DatabaseConfig) GetMySQLDSN() string {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&collation=utf8mb4_0900_ai_ci&parseTime=True&loc=Local",
		c.User, c.Password, c.Host, c.Port, c.DBName)

	// SSL設定を追加
	if c.SSLMode != "" && c.SSLMode != "disable" {
		dsn += "&tls=" + c.SSLMode
	}

	// 接続タイムアウトを追加
	if c.ConnectTimeout > 0 {
		dsn += fmt.Sprintf("&timeout=%ds", c.ConnectTimeout)
	}

	return dsn
}

// GetPostgreSQLDSN PostgreSQL接続用のDSN文字列を生成
func (c *DatabaseConfig) GetPostgreSQLDSN() string {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName)

	// SSL設定
	sslMode := c.SSLMode
	if sslMode == "" {
		sslMode = "prefer" // PostgreSQLのデフォルト
	}
	dsn += " sslmode=" + sslMode

	// SSL証明書ファイルの設定
	if c.SSLCertFile != "" {
		dsn += " sslcert=" + c.SSLCertFile
	}
	if c.SSLKeyFile != "" {
		dsn += " sslkey=" + c.SSLKeyFile
	}
	if c.SSLRootCertFile != "" {
		dsn += " sslrootcert=" + c.SSLRootCertFile
	}

	// 接続タイムアウト
	if c.ConnectTimeout > 0 {
		dsn += fmt.Sprintf(" connect_timeout=%d", c.ConnectTimeout)
	}

	// タイムゾーン設定
	dsn += " timezone=Asia/Tokyo"

	return dsn
}

// GetPostgreSQLDSNWithSSL PostgreSQL接続用のDSN文字列を生成（SSL有効）
func (c *DatabaseConfig) GetPostgreSQLDSNWithSSL() string {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		c.Host, c.Port, c.User, c.Password, c.DBName)

	// SSL証明書ファイルの設定
	if c.SSLCertFile != "" {
		dsn += " sslcert=" + c.SSLCertFile
	}
	if c.SSLKeyFile != "" {
		dsn += " sslkey=" + c.SSLKeyFile
	}
	if c.SSLRootCertFile != "" {
		dsn += " sslrootcert=" + c.SSLRootCertFile
	}

	// 接続タイムアウト
	if c.ConnectTimeout > 0 {
		dsn += fmt.Sprintf(" connect_timeout=%d", c.ConnectTimeout)
	}

	// タイムゾーン設定
	dsn += " timezone=Asia/Tokyo"

	return dsn
}

// GetDSN ドライバーに応じて適切なDSNを返す
func (c *DatabaseConfig) GetDSN() string {
	switch c.Driver {
	case "postgres":
		return c.GetPostgreSQLDSN()
	case "mysql":
		return c.GetMySQLDSN()
	default:
		// デフォルトはPostgreSQL
		return c.GetPostgreSQLDSN()
	}
}

// IsSSLEnabled SSL接続が有効かどうかを判定
func (c *DatabaseConfig) IsSSLEnabled() bool {
	return c.SSLMode != "" && c.SSLMode != "disable"
}

// ValidateSSLConfig SSL設定の妥当性を検証
func (c *DatabaseConfig) ValidateSSLConfig() error {
	if !c.IsSSLEnabled() {
		return nil
	}

	// PostgreSQLの場合
	if c.Driver == "postgres" {
		validModes := []string{"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}
		for _, mode := range validModes {
			if c.SSLMode == mode {
				return nil
			}
		}
		return fmt.Errorf("invalid SSL mode for PostgreSQL: %s", c.SSLMode)
	}

	// MySQLの場合
	if c.Driver == "mysql" {
		validModes := []string{"true", "false", "skip-verify", "preferred"}
		for _, mode := range validModes {
			if c.SSLMode == mode {
				return nil
			}
		}
		return fmt.Errorf("invalid SSL mode for MySQL: %s", c.SSLMode)
	}

	return nil
}

// GetOAuthURL OAuth認証用のURLを生成
func (c *FreeeConfig) GetOAuthURL(state string) string {
	return fmt.Sprintf("%s/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&state=%s&scope=%s",
		c.OAuthBaseURL, c.ClientID, c.RedirectURI, state, c.Scope)
}

// GetTokenURL トークン取得用のURLを生成
func (c *FreeeConfig) GetTokenURL() string {
	return fmt.Sprintf("%s/oauth/token", c.OAuthBaseURL)
}

// GetAPIURL API呼び出し用のURLを生成
func (c *FreeeConfig) GetAPIURL(endpoint string) string {
	return fmt.Sprintf("%s/api/%d%s", c.APIBaseURL, c.APIVersion, endpoint)
}

// IsValid freee設定が有効かどうかを確認
func (c *FreeeConfig) IsValid() bool {
	return c.ClientID != "" && c.ClientSecret != "" && c.RedirectURI != ""
}

// IsValidEncryption 暗号化設定が有効かどうかを確認
func (c *EncryptionConfig) IsValid() bool {
	return c.Key != "" && len(c.Key) >= 32 && c.Algorithm != ""
}

// Load .envファイルから設定を読み込む
func Load(envFile ...string) (*Config, error) {
	var envFileName string
	if len(envFile) > 0 {
		envFileName = envFile[0]
	}
	if envFileName != "" {
		if err := godotenv.Load(envFileName); err != nil {
			return nil, fmt.Errorf("error loading .env file: %w", err)
		}
	}

	readTimeout, _ := strconv.Atoi(getEnv("SERVER_READ_TIMEOUT", "30"))
	writeTimeout, _ := strconv.Atoi(getEnv("SERVER_WRITE_TIMEOUT", "30"))
	corsMaxAge, _ := strconv.Atoi(getEnv("CORS_MAX_AGE", "300"))
	secureCookies, _ := strconv.ParseBool(getEnv("SECURE_COOKIES", "false"))

	// Email設定の読み込み
	emailEnabled, _ := strconv.ParseBool(getEnv("EMAIL_ENABLED", "false"))
	emailPort, _ := strconv.Atoi(getEnv("EMAIL_PORT", "587"))

	// Slack設定の読み込み
	slackEnabled, _ := strconv.ParseBool(getEnv("SLACK_ENABLED", "false"))

	// Redis設定の読み込み
	redisEnabled, _ := strconv.ParseBool(getEnv("REDIS_ENABLED", "false"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	redisPoolSize, _ := strconv.Atoi(getEnv("REDIS_POOL_SIZE", "10"))
	redisMinIdleConns, _ := strconv.Atoi(getEnv("REDIS_MIN_IDLE_CONNS", "5"))
	redisMaxRetries, _ := strconv.Atoi(getEnv("REDIS_MAX_RETRIES", "3"))

	// freee設定の読み込み
	freeeAPIVersion, _ := strconv.Atoi(getEnv("FREEE_API_VERSION", "1"))
	freeeRateLimitRequests, _ := strconv.Atoi(getEnv("FREEE_RATE_LIMIT_REQUESTS", "300"))
	freeeRateLimitWindow, _ := strconv.Atoi(getEnv("FREEE_RATE_LIMIT_WINDOW", "3600"))
	freeeTimeoutSeconds, _ := strconv.Atoi(getEnv("FREEE_TIMEOUT_SECONDS", "30"))
	freeeMaxRetries, _ := strconv.Atoi(getEnv("FREEE_MAX_RETRIES", "3"))
	freeeRetryDelaySeconds, _ := strconv.Atoi(getEnv("FREEE_RETRY_DELAY_SECONDS", "5"))

	config := &Config{
		Server: ServerConfig{
			Port:           getEnv("SERVER_PORT", "8080"),
			ReadTimeout:    time.Duration(readTimeout) * time.Second,
			WriteTimeout:   time.Duration(writeTimeout) * time.Second,
			SecureCookies:  secureCookies,
			CookieSameSite: getEnv("COOKIE_SAME_SITE", "lax"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "5432"), // PostgreSQLのデフォルトポート
			User:            getEnv("DB_USER", "monstera"),
			Password:        getEnv("DB_PASSWORD", "password"),
			DBName:          getEnv("DB_NAME", "monstera"),
			Driver:          getEnv("DB_DRIVER", "postgres"),
			SSLMode:         getEnv("DB_SSL_MODE", "prefer"),
			SSLCert:         getEnv("DB_SSL_CERT", ""),
			SSLKey:          getEnv("DB_SSL_KEY", ""),
			SSLRootCert:     getEnv("DB_SSL_ROOT_CERT", ""),
			SSLCertFile:     getEnv("DB_SSL_CERT_FILE", ""),
			SSLKeyFile:      getEnv("DB_SSL_KEY_FILE", ""),
			SSLRootCertFile: getEnv("DB_SSL_ROOT_CERT_FILE", ""),
			ConnectTimeout:  getEnvInt("DB_CONNECT_TIMEOUT", 30),
			RequireSSL:      getEnv("DB_REQUIRE_SSL", "false") == "true",
			MinTLSVersion:   getEnv("DB_MIN_TLS_VERSION", "1.2"),
		},
		Batch: LoadBatchConfig(),
		Cors: CorsConfig{
			AllowOrigins:     []string{getEnv("CORS_ALLOW_ORIGINS", "http://localhost:3000")},
			AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Admin-Request"},
			ExposeHeaders:    []string{"Content-Length"},
			AllowCredentials: true,
			MaxAge:           time.Duration(corsMaxAge) * time.Second,
		},
		Email: EmailConfig{
			Enabled:   emailEnabled,
			Host:      getEnv("EMAIL_HOST", "smtp.gmail.com"),
			Port:      emailPort,
			Username:  getEnv("EMAIL_USERNAME", ""),
			Password:  getEnv("EMAIL_PASSWORD", ""),
			From:      getEnv("EMAIL_FROM", "noreply@monstera.com"),
			FromName:  getEnv("EMAIL_FROM_NAME", "Monstera System"),
			SystemURL: getEnv("SYSTEM_URL", "http://localhost:3000"),
		},
		Slack: SlackConfig{
			Enabled:        slackEnabled,
			WebhookURL:     getEnv("SLACK_WEBHOOK_URL", ""),
			DefaultChannel: getEnv("SLACK_DEFAULT_CHANNEL", "#general"),
			SystemURL:      getEnv("SYSTEM_URL", "http://localhost:3000"),
			IconURL:        getEnv("SLACK_ICON_URL", ""),
		},
		Redis: RedisConfig{
			Enabled:      redisEnabled,
			Host:         getEnv("REDIS_HOST", "localhost"),
			Port:         getEnv("REDIS_PORT", "6379"),
			Password:     getEnv("REDIS_PASSWORD", ""),
			DB:           redisDB,
			PoolSize:     redisPoolSize,
			MinIdleConns: redisMinIdleConns,
			MaxRetries:   redisMaxRetries,
			KeyPrefix:    getEnv("REDIS_KEY_PREFIX", "monstera:"),
		},
		Freee: FreeeConfig{
			ClientID:          getEnv("FREEE_CLIENT_ID", ""),
			ClientSecret:      getEnv("FREEE_CLIENT_SECRET", ""),
			RedirectURI:       getEnv("FREEE_REDIRECT_URI", ""),
			APIBaseURL:        getEnv("FREEE_API_BASE_URL", "https://api.freee.co.jp"),
			OAuthBaseURL:      getEnv("FREEE_OAUTH_BASE_URL", "https://accounts.secure.freee.co.jp"),
			APIVersion:        freeeAPIVersion,
			Scope:             getEnv("FREEE_SCOPE", "read write"),
			RateLimitRequests: freeeRateLimitRequests,
			RateLimitWindow:   freeeRateLimitWindow,
			TimeoutSeconds:    freeeTimeoutSeconds,
			MaxRetries:        freeeMaxRetries,
			RetryDelaySeconds: freeeRetryDelaySeconds,
		},
		Encryption: EncryptionConfig{
			Key:       getEnv("TOKEN_ENCRYPTION_KEY", ""),
			Algorithm: getEnv("TOKEN_ENCRYPTION_ALGORITHM", "AES-GCM"),
		},
		Prometheus: PrometheusConfig{
			Enabled:                getEnv("PROMETHEUS_ENABLED", "true") == "true",
			Port:                   getEnv("PROMETHEUS_PORT", "9090"),
			Path:                   getEnv("PROMETHEUS_PATH", "/metrics"),
			MetricsCollectInterval: time.Duration(getEnvInt("PROMETHEUS_COLLECT_INTERVAL_SECONDS", 60)) * time.Second,
		},
		Cognito: CognitoConfig{
			Enabled:      getEnv("COGNITO_ENABLED", "false") == "true",
			DevUserRole:  getEnvInt("DEV_USER_ROLE", 2), // デフォルト: 2=Admin
			Region:       getEnv("COGNITO_REGION", "us-east-1"),
			UserPoolID:   getEnv("COGNITO_USER_POOL_ID", ""),
			ClientID:     getEnv("COGNITO_CLIENT_ID", ""),
			ClientSecret: getEnv("COGNITO_CLIENT_SECRET", ""),
			Endpoint:     getEnv("COGNITO_ENDPOINT", ""),
			Environment:  getEnv("GO_ENV", "development"),
		},
	}

	// ドライバー固有の設定を調整
	driver := getEnv("DB_DRIVER", "postgres")
	if driver == "mysql" {
		// MySQLの場合はポート3306をデフォルトにする
		if config.Database.Port == "5432" {
			config.Database.Port = "3306"
		}
		// MySQLの場合はSSLModeのデフォルトを無効にする
		if config.Database.SSLMode == "prefer" {
			config.Database.SSLMode = "disable"
		}
	}

	// Cognitoのデフォルト値を設定
	config.Cognito.SetDefaults()

	return config, nil
}
