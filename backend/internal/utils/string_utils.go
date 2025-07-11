package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// StringUtils 文字列処理関連のユーティリティ
type StringUtils struct{}

// NewStringUtils StringUtilsのインスタンスを作成
func NewStringUtils() *StringUtils {
	return &StringUtils{}
}

// Truncate 文字列を指定した長さで切り詰める
func (s *StringUtils) Truncate(text string, maxLength int, suffix string) string {
	if utf8.RuneCountInString(text) <= maxLength {
		return text
	}

	runes := []rune(text)
	if len(suffix) > 0 {
		maxLength -= utf8.RuneCountInString(suffix)
	}

	if maxLength <= 0 {
		return suffix
	}

	return string(runes[:maxLength]) + suffix
}

// SanitizeString 文字列のサニタイズ（HTML、SQL注入対策）
func (s *StringUtils) SanitizeString(input string) string {
	// HTMLタグを除去
	htmlTagRegex := regexp.MustCompile(`<[^>]*>`)
	sanitized := htmlTagRegex.ReplaceAllString(input, "")

	// 危険な文字を除去
	dangerousChars := regexp.MustCompile(`[<>'"&;]`)
	sanitized = dangerousChars.ReplaceAllString(sanitized, "")

	// 前後の空白を除去
	sanitized = strings.TrimSpace(sanitized)

	return sanitized
}

// GenerateRandomString ランダム文字列を生成
func (s *StringUtils) GenerateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	rand.Read(b)

	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}

	return string(b)
}

// GenerateHash 文字列のハッシュ値を生成
func (s *StringUtils) GenerateHash(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:])
}

// IsEmpty 文字列が空かどうかチェック（空白文字のみも空とみなす）
func (s *StringUtils) IsEmpty(str string) bool {
	return strings.TrimSpace(str) == ""
}

// IsNotEmpty 文字列が空でないかどうかチェック
func (s *StringUtils) IsNotEmpty(str string) bool {
	return !s.IsEmpty(str)
}

// ToSnakeCase キャメルケースをスネークケースに変換
func (s *StringUtils) ToSnakeCase(str string) string {
	var result strings.Builder

	for i, r := range str {
		if i > 0 && unicode.IsUpper(r) {
			result.WriteRune('_')
		}
		result.WriteRune(unicode.ToLower(r))
	}

	return result.String()
}

// ToCamelCase スネークケースをキャメルケースに変換
func (s *StringUtils) ToCamelCase(str string) string {
	words := strings.Split(str, "_")
	var result strings.Builder

	for i, word := range words {
		if i == 0 {
			result.WriteString(strings.ToLower(word))
		} else {
			if len(word) > 0 {
				result.WriteString(strings.ToUpper(string(word[0])) + strings.ToLower(word[1:]))
			}
		}
	}

	return result.String()
}

// ToPascalCase スネークケースをパスカルケースに変換
func (s *StringUtils) ToPascalCase(str string) string {
	words := strings.Split(str, "_")
	var result strings.Builder

	for _, word := range words {
		if len(word) > 0 {
			result.WriteString(strings.ToUpper(string(word[0])) + strings.ToLower(word[1:]))
		}
	}

	return result.String()
}

// EscapeSQL SQL用の文字列エスケープ
func (s *StringUtils) EscapeSQL(input string) string {
	// シングルクォートをエスケープ
	escaped := strings.ReplaceAll(input, "'", "''")
	// バックスラッシュをエスケープ
	escaped = strings.ReplaceAll(escaped, "\\", "\\\\")
	return escaped
}

// RemoveNonPrintable 印刷できない文字を除去
func (s *StringUtils) RemoveNonPrintable(input string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsPrint(r) {
			return r
		}
		return -1
	}, input)
}

// NormalizeSpaces 連続する空白を単一の空白に正規化
func (s *StringUtils) NormalizeSpaces(input string) string {
	spaceRegex := regexp.MustCompile(`\s+`)
	normalized := spaceRegex.ReplaceAllString(input, " ")
	return strings.TrimSpace(normalized)
}

// ExtractNumbers 文字列から数字のみを抽出
func (s *StringUtils) ExtractNumbers(input string) string {
	re := regexp.MustCompile(`[0-9]+`)
	matches := re.FindAllString(input, -1)
	return strings.Join(matches, "")
}

// ExtractAlpha 文字列からアルファベットのみを抽出
func (s *StringUtils) ExtractAlpha(input string) string {
	re := regexp.MustCompile(`[a-zA-Z]+`)
	matches := re.FindAllString(input, -1)
	return strings.Join(matches, "")
}

// MaskString 文字列をマスクする（個人情報保護用）
func (s *StringUtils) MaskString(input string, maskChar rune, visibleStart, visibleEnd int) string {
	runes := []rune(input)
	length := len(runes)

	if length <= visibleStart+visibleEnd {
		return input
	}

	for i := visibleStart; i < length-visibleEnd; i++ {
		runes[i] = maskChar
	}

	return string(runes)
}

// MaskEmail メールアドレスをマスクする
func (s *StringUtils) MaskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}

	local := parts[0]
	domain := parts[1]

	if len(local) <= 2 {
		return email
	}

	maskedLocal := s.MaskString(local, '*', 1, 1)
	return maskedLocal + "@" + domain
}

// MaskPhoneNumber 電話番号をマスクする
func (s *StringUtils) MaskPhoneNumber(phone string) string {
	// ハイフンと空白を除去
	cleanPhone := strings.ReplaceAll(strings.ReplaceAll(phone, "-", ""), " ", "")

	if len(cleanPhone) < 4 {
		return phone
	}

	return s.MaskString(cleanPhone, '*', 2, 2)
}

// FormatFileSize ファイルサイズを人間が読みやすい形式にフォーマット
func (s *StringUtils) FormatFileSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
		TB = GB * 1024
	)

	switch {
	case bytes >= TB:
		return fmt.Sprintf("%.2f TB", float64(bytes)/TB)
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/GB)
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/MB)
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/KB)
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

// FormatDuration 時間を人間が読みやすい形式にフォーマット
func (s *StringUtils) FormatDuration(duration time.Duration) string {
	if duration < time.Minute {
		return fmt.Sprintf("%.0f秒", duration.Seconds())
	} else if duration < time.Hour {
		return fmt.Sprintf("%.0f分", duration.Minutes())
	} else if duration < 24*time.Hour {
		return fmt.Sprintf("%.1f時間", duration.Hours())
	} else {
		days := int(duration.Hours() / 24)
		hours := duration.Hours() - float64(days*24)
		return fmt.Sprintf("%d日%.1f時間", days, hours)
	}
}

// FormatJapaneseDate 日付を日本語形式でフォーマット
func (s *StringUtils) FormatJapaneseDate(t time.Time) string {
	weekdays := []string{"日", "月", "火", "水", "木", "金", "土"}
	weekday := weekdays[t.Weekday()]

	return fmt.Sprintf("%d年%d月%d日(%s)",
		t.Year(), t.Month(), t.Day(), weekday)
}

// FormatJapaneseDateTime 日時を日本語形式でフォーマット
func (s *StringUtils) FormatJapaneseDateTime(t time.Time) string {
	return s.FormatJapaneseDate(t) + " " + t.Format("15:04")
}

// ParseJapaneseNumber 全角数字を半角数字に変換
func (s *StringUtils) ParseJapaneseNumber(input string) string {
	// 全角数字を半角数字にマッピング
	mapping := map[rune]rune{
		'０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
		'５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
	}

	return strings.Map(func(r rune) rune {
		if mapped, exists := mapping[r]; exists {
			return mapped
		}
		return r
	}, input)
}

// ValidateJapanese 日本語文字が含まれているかチェック
func (s *StringUtils) ValidateJapanese(input string) bool {
	// ひらがな、カタカナ、漢字の範囲をチェック
	japaneseRegex := regexp.MustCompile(`[\p{Hiragana}\p{Katakana}\p{Han}]`)
	return japaneseRegex.MatchString(input)
}

// ConvertToHalfWidth 全角文字を半角文字に変換
func (s *StringUtils) ConvertToHalfWidth(input string) string {
	// 全角英数字記号を半角に変換
	var result strings.Builder

	for _, r := range input {
		switch {
		case r >= '０' && r <= '９': // 全角数字
			result.WriteRune(r - '０' + '0')
		case r >= 'Ａ' && r <= 'Ｚ': // 全角大文字英字
			result.WriteRune(r - 'Ａ' + 'A')
		case r >= 'ａ' && r <= 'ｚ': // 全角小文字英字
			result.WriteRune(r - 'ａ' + 'a')
		case r == '　': // 全角空白
			result.WriteRune(' ')
		default:
			result.WriteRune(r)
		}
	}

	return result.String()
}

// SplitByLength 指定した長さで文字列を分割
func (s *StringUtils) SplitByLength(input string, length int) []string {
	runes := []rune(input)
	var result []string

	for i := 0; i < len(runes); i += length {
		end := i + length
		if end > len(runes) {
			end = len(runes)
		}
		result = append(result, string(runes[i:end]))
	}

	return result
}

// ContainsAny 指定した文字列のいずれかが含まれているかチェック
func (s *StringUtils) ContainsAny(input string, targets []string) bool {
	for _, target := range targets {
		if strings.Contains(input, target) {
			return true
		}
	}
	return false
}

// CountWords 単語数をカウント（日本語対応）
func (s *StringUtils) CountWords(input string) int {
	// 空白で区切られた単語をカウント
	words := strings.Fields(input)
	wordCount := len(words)

	// 日本語文字が含まれている場合は文字数もカウント
	if s.ValidateJapanese(input) {
		// ひらがな、カタカナ、漢字の文字数を追加
		japaneseRegex := regexp.MustCompile(`[\p{Hiragana}\p{Katakana}\p{Han}]`)
		japaneseChars := japaneseRegex.FindAllString(input, -1)
		wordCount += len(japaneseChars)
	}

	return wordCount
}

// SafeParseInt 安全な整数変換
func (s *StringUtils) SafeParseInt(str string, defaultValue int) int {
	if val, err := strconv.Atoi(str); err == nil {
		return val
	}
	return defaultValue
}

// SafeParseFloat 安全な浮動小数点変換
func (s *StringUtils) SafeParseFloat(str string, defaultValue float64) float64 {
	if val, err := strconv.ParseFloat(str, 64); err == nil {
		return val
	}
	return defaultValue
}

// SafeParseBool 安全な真偽値変換
func (s *StringUtils) SafeParseBool(str string, defaultValue bool) bool {
	str = strings.ToLower(strings.TrimSpace(str))

	switch str {
	case "true", "1", "yes", "on", "はい", "真":
		return true
	case "false", "0", "no", "off", "いいえ", "偽":
		return false
	default:
		return defaultValue
	}
}

// BuildQueryString クエリ文字列を構築
func (s *StringUtils) BuildQueryString(params map[string]interface{}) string {
	var parts []string

	for key, value := range params {
		if value != nil && value != "" {
			parts = append(parts, fmt.Sprintf("%s=%v", key, value))
		}
	}

	return strings.Join(parts, "&")
}

// GenerateSlug URLスラッグを生成
func (s *StringUtils) GenerateSlug(input string) string {
	// 小文字化
	slug := strings.ToLower(input)

	// 日本語を除去または変換
	slug = regexp.MustCompile(`[^\w\s-]`).ReplaceAllString(slug, "")

	// 空白をハイフンに変換
	slug = regexp.MustCompile(`\s+`).ReplaceAllString(slug, "-")

	// 連続するハイフンを単一に
	slug = regexp.MustCompile(`-+`).ReplaceAllString(slug, "-")

	// 前後のハイフンを除去
	slug = strings.Trim(slug, "-")

	return slug
}
