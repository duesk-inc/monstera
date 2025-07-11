package dateutil

import (
	"fmt"
	"time"
)

// 日付フォーマット定数
const (
	DateFormat        = "2006-01-02"
	TimeFormat        = "15:04:05"
	DateTimeFormat    = "2006-01-02 15:04:05"
	ISODateTimeFormat = "2006-01-02T15:04:05"

	// 職務経歴・資格取得の最小年
	CareerMinYear = 1980
)

// GetJSTLocation 日本時間（JST）のロケーションを取得
func GetJSTLocation() *time.Location {
	return time.FixedZone("Asia/Tokyo", 9*60*60)
}

// ParseDateString は文字列を日付に変換します
func ParseDateString(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("日付が空です")
	}

	if len(dateStr) > 10 {
		dateStr = dateStr[:10] // YYYY-MM-DD部分のみ取得
	}

	result, err := time.Parse(DateFormat, dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("無効な日付フォーマット: %s: %w", dateStr, err)
	}
	return result, nil
}

// FormatDate は日付をYYYY-MM-DD形式の文字列に変換します
func FormatDate(date time.Time) string {
	return date.Format(DateFormat)
}

// FormatDateTime は日時をYYYY-MM-DD HH:MM:SS形式の文字列に変換します
func FormatDateTime(date time.Time) string {
	return date.Format(DateTimeFormat)
}

// FormatISODateTime は日時をYYYY-MM-DDThh:mm:ss形式の文字列に変換します
func FormatISODateTime(date time.Time) string {
	return date.Format(ISODateTimeFormat)
}

// ValidateDateRange は日付範囲を検証します
func ValidateDateRange(start, end time.Time) error {
	if end.Before(start) {
		return fmt.Errorf("終了日は開始日以降である必要があります")
	}
	return nil
}

// ExtractDatePart 日付文字列からYYYY-MM-DD部分のみを抽出します
func ExtractDatePart(dateStr string) string {
	if len(dateStr) > 10 {
		return dateStr[:10] // YYYY-MM-DD部分のみを取得
	}
	return dateStr
}

// IsExpired は日付が現在時刻よりも前かどうかを判定します
func IsExpired(date time.Time) bool {
	return date.Before(time.Now())
}

// IsFutureDate は日付が現在よりも未来かどうかを判定します
func IsFutureDate(date time.Time) bool {
	return date.After(time.Now())
}

// ValidateNotFutureDate は日付が未来日付でないことを検証します
func ValidateNotFutureDate(date time.Time, fieldName string) error {
	if IsFutureDate(date) {
		return fmt.Errorf("%sは未来の日付を指定できません", fieldName)
	}
	return nil
}

// ValidateCareerDate は職務経歴・資格取得の日付が有効な範囲内であることを検証します
func ValidateCareerDate(date time.Time, fieldName string) error {
	// 最小日付のチェック
	minDate := time.Date(CareerMinYear, 1, 1, 0, 0, 0, 0, date.Location())
	if date.Before(minDate) {
		return fmt.Errorf("%sは%d年以降の日付を指定してください", fieldName, CareerMinYear)
	}

	// 未来日付のチェック
	if IsFutureDate(date) {
		return fmt.Errorf("%sは未来の日付を指定できません", fieldName)
	}

	return nil
}

// ValidateYearMonth は年月（YYYY-MM形式）が有効な範囲内であることを検証します
func ValidateYearMonth(yearMonth string, fieldName string) error {
	if yearMonth == "" {
		return nil
	}

	// YYYY-MM形式を日付に変換（1日として扱う）
	parsedDate, err := time.Parse("2006-01", yearMonth)
	if err != nil {
		return fmt.Errorf("無効な年月フォーマット: %s", yearMonth)
	}

	// 最小年月のチェック
	minDate := time.Date(CareerMinYear, 1, 1, 0, 0, 0, 0, parsedDate.Location())
	if parsedDate.Before(minDate) {
		return fmt.Errorf("%sは%d年以降の年月を指定してください", fieldName, CareerMinYear)
	}

	// 現在の年月を取得（時刻を切り捨て）
	now := time.Now()
	currentYearMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	if parsedDate.After(currentYearMonth) {
		return fmt.Errorf("%sは未来の年月を指定できません", fieldName)
	}
	return nil
}

// CombineDateAndTime 日付と時刻を結合して完全な日時を生成
func CombineDateAndTime(date time.Time, timeStr string) (time.Time, error) {
	if timeStr == "" {
		return time.Time{}, fmt.Errorf("時刻が空です")
	}

	// 時間文字列に秒がない場合は追加
	if len(timeStr) == 5 {
		timeStr = timeStr + ":00"
	}

	// 日付と時刻を結合して完全な日時を作成
	fullTimeStr := date.Format(DateFormat) + "T" + timeStr
	return time.Parse(ISODateTimeFormat, fullTimeStr)
}

// ConvertToJST 時間をJSTに変換
func ConvertToJST(t time.Time) time.Time {
	return t.In(GetJSTLocation())
}
