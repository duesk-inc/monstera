package validation

import (
	"errors"
	"unicode"
)

// ValidatePassword パスワードの複雑性を検証（仕様書準拠）
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("パスワードは8文字以上である必要があります")
	}

	if len(password) > 128 {
		return errors.New("パスワードは128文字以下である必要があります")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("パスワードには大文字を含める必要があります")
	}

	if !hasLower {
		return errors.New("パスワードには小文字を含める必要があります")
	}

	if !hasDigit {
		return errors.New("パスワードには数字を含める必要があります")
	}

	if !hasSpecial {
		return errors.New("パスワードには特殊文字を含める必要があります")
	}

	return nil
}

// PasswordStrength パスワードの強度を評価
type PasswordStrength int

const (
	PasswordStrengthWeak PasswordStrength = iota
	PasswordStrengthMedium
	PasswordStrengthStrong
	PasswordStrengthVeryStrong
)

// GetPasswordStrength パスワードの強度を取得
func GetPasswordStrength(password string) PasswordStrength {
	score := 0
	length := len(password)

	// 長さによるスコア
	if length >= 8 {
		score++
	}
	if length >= 12 {
		score++
	}
	if length >= 16 {
		score++
	}

	// 文字種によるスコア
	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if hasUpper {
		score++
	}
	if hasLower {
		score++
	}
	if hasDigit {
		score++
	}
	if hasSpecial {
		score++
	}

	// スコアから強度を判定
	switch {
	case score <= 3:
		return PasswordStrengthWeak
	case score <= 5:
		return PasswordStrengthMedium
	case score <= 7:
		return PasswordStrengthStrong
	default:
		return PasswordStrengthVeryStrong
	}
}

// GetPasswordStrengthLabel パスワード強度のラベルを取得
func GetPasswordStrengthLabel(strength PasswordStrength) string {
	switch strength {
	case PasswordStrengthWeak:
		return "弱い"
	case PasswordStrengthMedium:
		return "普通"
	case PasswordStrengthStrong:
		return "強い"
	case PasswordStrengthVeryStrong:
		return "非常に強い"
	default:
		return "不明"
	}
}
