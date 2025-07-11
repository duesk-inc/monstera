package main

import (
	"fmt"
	"log"

	"github.com/duesk/monstera/internal/config"
)

func main() {
	fmt.Println("🔧 freee設定テストプログラム")
	fmt.Println("")

	// 設定を読み込み（.envファイルを指定）
	cfg, err := config.Load(".env")
	if err != nil {
		log.Fatalf("設定の読み込みに失敗しました: %v", err)
	}

	fmt.Println("📋 freee設定:")
	fmt.Printf("  Client ID: %s\n", cfg.Freee.ClientID)
	fmt.Printf("  Redirect URI: %s\n", cfg.Freee.RedirectURI)
	fmt.Printf("  API Base URL: %s\n", cfg.Freee.APIBaseURL)
	fmt.Printf("  OAuth Base URL: %s\n", cfg.Freee.OAuthBaseURL)
	fmt.Printf("  API Version: %d\n", cfg.Freee.APIVersion)
	fmt.Printf("  Scope: %s\n", cfg.Freee.Scope)
	fmt.Printf("  Rate Limit Requests: %d\n", cfg.Freee.RateLimitRequests)
	fmt.Printf("  Rate Limit Window: %d秒\n", cfg.Freee.RateLimitWindow)
	fmt.Printf("  Timeout: %d秒\n", cfg.Freee.TimeoutSeconds)
	fmt.Printf("  Max Retries: %d\n", cfg.Freee.MaxRetries)
	fmt.Printf("  Retry Delay: %d秒\n", cfg.Freee.RetryDelaySeconds)
	fmt.Println("")

	fmt.Println("🔐 暗号化設定:")
	fmt.Printf("  Key Length: %d文字\n", len(cfg.Encryption.Key))
	fmt.Printf("  Algorithm: %s\n", cfg.Encryption.Algorithm)
	fmt.Println("")

	fmt.Println("✅ 設定有効性確認:")
	fmt.Printf("  freee設定: %v\n", cfg.Freee.IsValid())
	fmt.Printf("  暗号化設定: %v\n", cfg.Encryption.IsValid())
	fmt.Println("")

	fmt.Println("🌐 URL生成テスト:")
	if cfg.Freee.IsValid() {
		testState := "test-state-123"
		oauthURL := cfg.Freee.GetOAuthURL(testState)
		tokenURL := cfg.Freee.GetTokenURL()
		apiURL := cfg.Freee.GetAPIURL("/partners")

		fmt.Printf("  OAuth URL: %s\n", oauthURL)
		fmt.Printf("  Token URL: %s\n", tokenURL)
		fmt.Printf("  API URL: %s\n", apiURL)
	} else {
		fmt.Println("  ⚠️ freee設定が無効なため、URL生成をスキップします")
	}

	fmt.Println("")
	fmt.Println("🎉 設定テスト完了")
}
