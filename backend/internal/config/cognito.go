package config

import (
	"fmt"
	"net/url"
	"time"
)

// CognitoConfig Cognito認証の設定
type CognitoConfig struct {
	Enabled      bool   `mapstructure:"COGNITO_ENABLED"`
	AuthSkipMode bool   `mapstructure:"AUTH_SKIP_MODE"` // 開発用: 認証をスキップ
	Region       string `mapstructure:"COGNITO_REGION"`
	UserPoolID   string `mapstructure:"COGNITO_USER_POOL_ID"`
	ClientID     string `mapstructure:"COGNITO_CLIENT_ID"`
	ClientSecret string `mapstructure:"COGNITO_CLIENT_SECRET"`
	Endpoint     string `mapstructure:"COGNITO_ENDPOINT"` // ローカル開発用

	// トークン設定
	TokenExpiration time.Duration // アクセストークンの有効期限（デフォルト: 1時間）

	// キャッシュ設定
	JWKCacheDuration time.Duration // JWKキャッシュの有効期限（デフォルト: 1時間）
}

// IsValid Cognito設定の妥当性を検証
func (c *CognitoConfig) IsValid() bool {
	if !c.Enabled {
		return true // 無効化されている場合は検証をスキップ
	}

	return c.Region != "" &&
		c.UserPoolID != "" &&
		c.ClientID != "" &&
		c.ClientSecret != ""
}

// GetJWKURL JWKエンドポイントURLを取得
func (c *CognitoConfig) GetJWKURL() string {
	if c.Endpoint != "" {
		// ローカル開発環境
		return c.Endpoint + "/" + c.UserPoolID + "/.well-known/jwks.json"
	}
	// 本番環境
	return "https://cognito-idp." + c.Region + ".amazonaws.com/" + c.UserPoolID + "/.well-known/jwks.json"
}

// GetIssuer Issuerを取得
func (c *CognitoConfig) GetIssuer() string {
	if c.Endpoint != "" {
		// ローカル開発環境
		// COGNITO_ENDPOINTをパースしてissuerを生成
		u, err := url.Parse(c.Endpoint)
		if err != nil {
			// エラーの場合は従来の形式を使用（デフォルトポート9229）
			return "http://0.0.0.0:9229/" + c.UserPoolID
		}

		// ホスト名を0.0.0.0に変換（Cognito Localの仕様）
		host := u.Hostname()
		port := u.Port()

		// ホスト名が空の場合（無効なURL等）はデフォルト値を使用
		if host == "" {
			return "http://0.0.0.0:9229/" + c.UserPoolID
		}

		if host == "cognito-local" || host == "localhost" {
			host = "0.0.0.0"
		}

		// ポート番号がある場合は含める
		if port != "" {
			return fmt.Sprintf("http://%s:%s/%s", host, port, c.UserPoolID)
		}
		return fmt.Sprintf("http://%s/%s", host, c.UserPoolID)
	}
	// 本番環境
	return "https://cognito-idp." + c.Region + ".amazonaws.com/" + c.UserPoolID
}

// SetDefaults デフォルト値を設定
func (c *CognitoConfig) SetDefaults() {
	if c.TokenExpiration == 0 {
		c.TokenExpiration = time.Hour // 1時間
	}
	if c.JWKCacheDuration == 0 {
		c.JWKCacheDuration = time.Hour // 1時間
	}
}
