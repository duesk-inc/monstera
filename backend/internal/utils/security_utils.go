package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/scrypt"
)

// SecurityUtils セキュリティ関連のユーティリティ
type SecurityUtils struct {
	saltLength int
	keyLength  int
}

// NewSecurityUtils SecurityUtilsのインスタンスを作成
func NewSecurityUtils() *SecurityUtils {
	return &SecurityUtils{
		saltLength: 32,
		keyLength:  32,
	}
}

// GenerateSalt ランダムソルトを生成
func (s *SecurityUtils) GenerateSalt() (string, error) {
	salt := make([]byte, s.saltLength)
	_, err := rand.Read(salt)
	if err != nil {
		return "", fmt.Errorf("ソルトの生成に失敗しました: %w", err)
	}

	return base64.StdEncoding.EncodeToString(salt), nil
}

// HashWithSalt ソルト付きハッシュを生成（scrypt使用）
func (s *SecurityUtils) HashWithSalt(data, salt string) (string, error) {
	saltBytes, err := base64.StdEncoding.DecodeString(salt)
	if err != nil {
		return "", fmt.Errorf("ソルトのデコードに失敗しました: %w", err)
	}

	// scryptでハッシュ化
	hash, err := scrypt.Key([]byte(data), saltBytes, 32768, 8, 1, s.keyLength)
	if err != nil {
		return "", fmt.Errorf("ハッシュの生成に失敗しました: %w", err)
	}

	return base64.StdEncoding.EncodeToString(hash), nil
}

// GenerateSecureToken セキュアなトークンを生成
func (s *SecurityUtils) GenerateSecureToken(length int) (string, error) {
	if length <= 0 {
		length = 32
	}

	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("トークンの生成に失敗しました: %w", err)
	}

	return base64.URLEncoding.EncodeToString(bytes), nil
}

// GenerateAPIKey API キーを生成
func (s *SecurityUtils) GenerateAPIKey() (string, error) {
	// プレフィックス + タイムスタンプ + ランダム部分
	prefix := "mst_" // monstera
	timestamp := fmt.Sprintf("%x", time.Now().Unix())

	randomBytes := make([]byte, 20)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", fmt.Errorf("APIキーの生成に失敗しました: %w", err)
	}

	randomPart := hex.EncodeToString(randomBytes)
	return prefix + timestamp + randomPart, nil
}

// SanitizeInput 入力のサニタイズ
func (s *SecurityUtils) SanitizeInput(input string) string {
	// XSS対策：HTMLタグを除去
	htmlTagRegex := regexp.MustCompile(`<[^>]*>`)
	sanitized := htmlTagRegex.ReplaceAllString(input, "")

	// スクリプトタグを除去
	scriptRegex := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	sanitized = scriptRegex.ReplaceAllString(sanitized, "")

	// 危険な文字をエスケープ
	sanitized = strings.ReplaceAll(sanitized, "<", "&lt;")
	sanitized = strings.ReplaceAll(sanitized, ">", "&gt;")
	sanitized = strings.ReplaceAll(sanitized, "\"", "&quot;")
	sanitized = strings.ReplaceAll(sanitized, "'", "&#x27;")
	sanitized = strings.ReplaceAll(sanitized, "&", "&amp;")

	return sanitized
}

// ValidateEmail セキュアなメールアドレス検証
func (s *SecurityUtils) ValidateEmail(email string) error {
	if len(email) == 0 {
		return fmt.Errorf("メールアドレスが入力されていません")
	}

	if len(email) > 254 {
		return fmt.Errorf("メールアドレスが長すぎます")
	}

	// 基本的なフォーマットチェック
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("無効なメールアドレス形式です")
	}

	// 危険なパターンをチェック
	dangerousPatterns := []string{
		"<script", "javascript:", "data:", "vbscript:",
	}

	lowercaseEmail := strings.ToLower(email)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowercaseEmail, pattern) {
			return fmt.Errorf("無効なメールアドレスです")
		}
	}

	return nil
}

// GenerateCSRFToken CSRF トークンを生成
func (s *SecurityUtils) GenerateCSRFToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("CSRFトークンの生成に失敗しました: %w", err)
	}

	return base64.URLEncoding.EncodeToString(bytes), nil
}

// ValidateCSRFToken CSRF トークンを検証
func (s *SecurityUtils) ValidateCSRFToken(token, expected string) bool {
	// タイミング攻撃対策のため constant time comparison を使用
	return subtle.ConstantTimeCompare([]byte(token), []byte(expected)) == 1
}

// HashForComparison 比較用のハッシュを生成（一方向）
func (s *SecurityUtils) HashForComparison(data string) string {
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// MaskSensitiveData 機密データをマスク
func (s *SecurityUtils) MaskSensitiveData(data string, maskChar rune, visibleChars int) string {
	if len(data) <= visibleChars*2 {
		return strings.Repeat(string(maskChar), len(data))
	}

	runes := []rune(data)
	for i := visibleChars; i < len(runes)-visibleChars; i++ {
		runes[i] = maskChar
	}

	return string(runes)
}

// GenerateOTP ワンタイムパスワードを生成
func (s *SecurityUtils) GenerateOTP(length int) (string, error) {
	if length <= 0 || length > 10 {
		length = 6
	}

	digits := "0123456789"
	otp := make([]byte, length)

	for i := range otp {
		randomBytes := make([]byte, 1)
		_, err := rand.Read(randomBytes)
		if err != nil {
			return "", fmt.Errorf("OTPの生成に失敗しました: %w", err)
		}
		otp[i] = digits[randomBytes[0]%byte(len(digits))]
	}

	return string(otp), nil
}

// ValidateIPAddress IP アドレスの形式を検証
func (s *SecurityUtils) ValidateIPAddress(ip string) bool {
	// IPv4 パターン
	ipv4Regex := regexp.MustCompile(`^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$`)
	if ipv4Regex.MatchString(ip) {
		return true
	}

	// IPv6 パターン（簡略版）
	ipv6Regex := regexp.MustCompile(`^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$`)
	return ipv6Regex.MatchString(ip)
}

// RateLimitInfo レート制限情報
type RateLimitInfo struct {
	Limit      int           `json:"limit"`
	Remaining  int           `json:"remaining"`
	ResetTime  time.Time     `json:"reset_time"`
	RetryAfter time.Duration `json:"retry_after"`
	IsExceeded bool          `json:"is_exceeded"`
}

// CheckRateLimit レート制限をチェック（シンプルな実装）
func (s *SecurityUtils) CheckRateLimit(key string, limit int, window time.Duration) *RateLimitInfo {
	// 実際の実装では Redis などの外部ストレージを使用
	// ここでは概念的な実装のみ

	return &RateLimitInfo{
		Limit:      limit,
		Remaining:  limit - 1, // 仮の値
		ResetTime:  time.Now().Add(window),
		RetryAfter: 0,
		IsExceeded: false,
	}
}

// SecureCompare セキュアな文字列比較（タイミング攻撃対策）
func (s *SecurityUtils) SecureCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// GenerateNonce ナンス（一回限りの数値）を生成
func (s *SecurityUtils) GenerateNonce() (string, error) {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("ナンスの生成に失敗しました: %w", err)
	}

	return hex.EncodeToString(bytes), nil
}

// ValidateUserAgent User-Agent の基本的な検証
func (s *SecurityUtils) ValidateUserAgent(userAgent string) bool {
	if len(userAgent) == 0 || len(userAgent) > 1000 {
		return false
	}

	// 危険なパターンをチェック
	dangerousPatterns := []string{
		"<script", "javascript:", "sqlmap", "nikto", "nmap",
	}

	lowercaseUA := strings.ToLower(userAgent)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowercaseUA, pattern) {
			return false
		}
	}

	return true
}

// LogSecurityEvent セキュリティイベントのログ記録
func (s *SecurityUtils) LogSecurityEvent(eventType, userID, details string) {
	// 実際の実装では適切なログシステムに記録
	logEntry := fmt.Sprintf("[SECURITY] %s - User: %s - Details: %s - Time: %s",
		eventType, userID, details, time.Now().Format(time.RFC3339))

	// ここでログシステムに送信
	fmt.Println(logEntry)
}
