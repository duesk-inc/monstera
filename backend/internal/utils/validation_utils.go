package utils

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/duesk/monstera/internal/message"
)

// ValidationUtils バリデーション関連のユーティリティ
type ValidationUtils struct{}

// NewValidationUtils ValidationUtilsのインスタンスを作成
func NewValidationUtils() *ValidationUtils {
	return &ValidationUtils{}
}

// ValidateRequired 必須項目チェック
func (v *ValidationUtils) ValidateRequired(value string, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%sは必須項目です", fieldName)
	}
	return nil
}

// ValidateStringLength 文字列長のバリデーション
func (v *ValidationUtils) ValidateStringLength(value string, fieldName string, min, max int) error {
	length := utf8.RuneCountInString(value)

	if min > 0 && length < min {
		return fmt.Errorf("%sは%d文字以上入力してください", fieldName, min)
	}

	if max > 0 && length > max {
		return fmt.Errorf("%sは%d文字以内で入力してください", fieldName, max)
	}

	return nil
}

// ValidateEmail メールアドレスのバリデーション
func (v *ValidationUtils) ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("メールアドレスは必須項目です")
	}

	// 基本的なメール形式チェック
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("正しいメールアドレス形式で入力してください")
	}

	return nil
}

// ValidateUUID UUIDのバリデーション
func (v *ValidationUtils) ValidateUUID(id string, fieldName string) error {
	if id == "" {
		return fmt.Errorf("%sは必須項目です", fieldName)
	}

	// UUID validation removed after migration - now just a string check
	// ID format validation could be added here if needed

	return nil
}

// ValidateRange 数値範囲のバリデーション
func (v *ValidationUtils) ValidateRange(value float64, fieldName string, min, max float64) error {
	if value < min {
		return fmt.Errorf("%sは%g以上の値を入力してください", fieldName, min)
	}

	if value > max {
		return fmt.Errorf("%sは%g以下の値を入力してください", fieldName, max)
	}

	return nil
}

// ValidateIntRange 整数範囲のバリデーション
func (v *ValidationUtils) ValidateIntRange(value int, fieldName string, min, max int) error {
	if value < min {
		return fmt.Errorf("%sは%d以上の値を入力してください", fieldName, min)
	}

	if value > max {
		return fmt.Errorf("%sは%d以下の値を入力してください", fieldName, max)
	}

	return nil
}

// ValidateDate 日付のバリデーション
func (v *ValidationUtils) ValidateDate(date time.Time, fieldName string) error {
	// 未来の日付チェック（現在より1年以上未来は無効）
	if date.After(time.Now().AddDate(1, 0, 0)) {
		return fmt.Errorf("%sは現在から1年以内の日付を入力してください", fieldName)
	}

	// 過去の日付チェック（10年以上前は無効）
	if date.Before(time.Now().AddDate(-10, 0, 0)) {
		return fmt.Errorf("%sは過去10年以内の日付を入力してください", fieldName)
	}

	return nil
}

// ValidateDateRange 日付範囲のバリデーション
func (v *ValidationUtils) ValidateDateRange(startDate, endDate time.Time) error {
	if startDate.After(endDate) {
		return fmt.Errorf("開始日は終了日より前の日付を入力してください")
	}

	// 範囲が長すぎる場合（1年以上）
	if endDate.Sub(startDate) > 365*24*time.Hour {
		return fmt.Errorf("日付範囲は1年以内で設定してください")
	}

	return nil
}

// ValidateWeekRange 週報の週範囲バリデーション
func (v *ValidationUtils) ValidateWeekRange(startDate, endDate time.Time) error {
	// 開始日が月曜日かチェック
	if startDate.Weekday() != time.Monday {
		return fmt.Errorf("週報の開始日は月曜日である必要があります")
	}

	// 終了日が日曜日かチェック
	if endDate.Weekday() != time.Sunday {
		return fmt.Errorf("週報の終了日は日曜日である必要があります")
	}

	// 7日間の期間かチェック
	diff := endDate.Sub(startDate)
	expectedDuration := 6 * 24 * time.Hour // 月曜から日曜まで
	if diff < expectedDuration || diff > expectedDuration+23*time.Hour+59*time.Minute {
		return fmt.Errorf("週報の期間は7日間（月曜日〜日曜日）である必要があります")
	}

	return nil
}

// ValidateWorkHours 勤務時間のバリデーション
func (v *ValidationUtils) ValidateWorkHours(hours float64, fieldName string) error {
	if hours < 0 {
		return fmt.Errorf("%sは0以上の値を入力してください", fieldName)
	}

	if hours > 24 {
		return fmt.Errorf("%sは24時間以内で入力してください", fieldName)
	}

	// 小数点以下の桁数チェック（15分単位：0.25時間刻み）
	remainder := hours * 4 // 15分単位にするため4倍
	if remainder != float64(int(remainder)) {
		return fmt.Errorf("%sは15分単位（0.25時間刻み）で入力してください", fieldName)
	}

	return nil
}

// ValidateMood 気分値のバリデーション
func (v *ValidationUtils) ValidateMood(mood int) error {
	if mood < 1 || mood > 5 {
		return fmt.Errorf("気分は1〜5の範囲で選択してください")
	}
	return nil
}

// ValidatePhoneNumber 電話番号のバリデーション（日本の電話番号）
func (v *ValidationUtils) ValidatePhoneNumber(phone string) error {
	if phone == "" {
		return nil // 電話番号は任意項目
	}

	// ハイフンと空白を除去
	cleanPhone := strings.ReplaceAll(strings.ReplaceAll(phone, "-", ""), " ", "")

	// 日本の電話番号パターン
	phoneRegex := regexp.MustCompile(`^(0[1-9]{1}[0-9]{8,9}|0[5-9]{1}0[0-9]{8})$`)
	if !phoneRegex.MatchString(cleanPhone) {
		return fmt.Errorf("正しい電話番号形式で入力してください")
	}

	return nil
}

// ValidatePostalCode 郵便番号のバリデーション（日本の郵便番号）
func (v *ValidationUtils) ValidatePostalCode(postalCode string) error {
	if postalCode == "" {
		return nil // 郵便番号は任意項目
	}

	// ハイフンを除去
	cleanCode := strings.ReplaceAll(postalCode, "-", "")

	// 日本の郵便番号パターン（7桁）
	if len(cleanCode) != 7 {
		return fmt.Errorf("郵便番号は7桁で入力してください")
	}

	postalRegex := regexp.MustCompile(`^[0-9]{7}$`)
	if !postalRegex.MatchString(cleanCode) {
		return fmt.Errorf("郵便番号は数字7桁で入力してください")
	}

	return nil
}

// ValidateFileSize ファイルサイズのバリデーション
func (v *ValidationUtils) ValidateFileSize(size int64, maxSize int64) error {
	if size > maxSize {
		return fmt.Errorf("ファイルサイズは%dMB以内にしてください", maxSize/(1024*1024))
	}
	return nil
}

// ValidateFileExtension ファイル拡張子のバリデーション
func (v *ValidationUtils) ValidateFileExtension(filename string, allowedExtensions []string) error {
	if filename == "" {
		return fmt.Errorf("ファイル名が指定されていません")
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		return fmt.Errorf("ファイルに拡張子がありません")
	}

	for _, allowed := range allowedExtensions {
		if ext == strings.ToLower(allowed) {
			return nil
		}
	}

	return fmt.Errorf("許可されていない拡張子です。許可されている拡張子: %s", strings.Join(allowedExtensions, ", "))
}

// ValidationErrors 複数のバリデーションエラーを管理
type ValidationErrors struct {
	Errors map[string][]string
}

// NewValidationErrors ValidationErrorsのインスタンスを作成
func NewValidationErrors() *ValidationErrors {
	return &ValidationErrors{
		Errors: make(map[string][]string),
	}
}

// AddError エラーを追加
func (ve *ValidationErrors) AddError(field, message string) {
	if ve.Errors[field] == nil {
		ve.Errors[field] = make([]string, 0)
	}
	ve.Errors[field] = append(ve.Errors[field], message)
}

// AddFieldError フィールド固有のエラーを追加
func (ve *ValidationErrors) AddFieldError(field string, err error) {
	if err != nil {
		ve.AddError(field, err.Error())
	}
}

// HasErrors エラーがあるかチェック
func (ve *ValidationErrors) HasErrors() bool {
	return len(ve.Errors) > 0
}

// GetFirstError 最初のエラーメッセージを取得
func (ve *ValidationErrors) GetFirstError() string {
	for _, messages := range ve.Errors {
		if len(messages) > 0 {
			return messages[0]
		}
	}
	return ""
}

// ToMap エラーをmap形式で取得
func (ve *ValidationErrors) ToMap() map[string]string {
	result := make(map[string]string)
	for field, messages := range ve.Errors {
		if len(messages) > 0 {
			result[field] = strings.Join(messages, ", ")
		}
	}
	return result
}

// ToErrorCode バリデーションエラーの種類からエラーコードを取得
func (v *ValidationUtils) ToErrorCode(err error) message.ErrorCode {
	if err == nil {
		return ""
	}

	errorMessage := err.Error()

	switch {
	case strings.Contains(errorMessage, "必須項目"):
		return message.ErrCodeRequiredField
	case strings.Contains(errorMessage, "文字数") || strings.Contains(errorMessage, "文字以"):
		return message.ErrCodeInvalidLength
	case strings.Contains(errorMessage, "メールアドレス"):
		return message.ErrCodeInvalidEmail
	case strings.Contains(errorMessage, "日付"):
		return message.ErrCodeInvalidDate
	case strings.Contains(errorMessage, "UUID") || strings.Contains(errorMessage, "形式"):
		return message.ErrCodeInvalidUUID
	case strings.Contains(errorMessage, "電話番号"):
		return message.ErrCodeInvalidPhoneNumber
	case strings.Contains(errorMessage, "郵便番号"):
		return message.ErrCodeInvalidPostalCode
	case strings.Contains(errorMessage, "範囲") || strings.Contains(errorMessage, "以上") || strings.Contains(errorMessage, "以下"):
		return message.ErrCodeInvalidRange
	case strings.Contains(errorMessage, "ファイル"):
		if strings.Contains(errorMessage, "サイズ") {
			return message.ErrCodeFileSizeExceeded
		}
		return message.ErrCodeInvalidFileType
	default:
		return message.ErrCodeInvalidFormat
	}
}

// ValidateStruct 構造体のバリデーション（簡易実装）
func (v *ValidationUtils) ValidateStruct(data interface{}) error {
	// TODO: リフレクションを使った本格的なバリデーション実装
	// 現在は簡易実装として何もチェックしない
	return nil
}
