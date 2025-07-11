package timeutil

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// TimeFormat 日時フォーマット定数
const (
	DateFormat     = "2006-01-02"
	TimeFormat     = "15:04:05"
	DateTimeFormat = "2006-01-02T15:04:05"
)

// GetJSTLocation 日本時間（JST）のロケーションを取得
func GetJSTLocation() *time.Location {
	return time.FixedZone("Asia/Tokyo", 9*60*60)
}

// ParseDateString 日付文字列をtime.Time型に変換
func ParseDateString(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("日付が空です")
	}

	return time.Parse(DateFormat, dateStr)
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
	return time.Parse(DateTimeFormat, fullTimeStr)
}

// ConvertToJST 時間をJSTに変換
func ConvertToJST(t time.Time) time.Time {
	return t.In(GetJSTLocation())
}

// FormatTimeForDisplay 時刻表示用にフォーマット (HH:MM)
func FormatTimeForDisplay(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("15:04")
}

// CalculateWorkHours 稼働時間を計算（開始時刻、終了時刻、休憩時間から）
func CalculateWorkHours(startTime, endTime string, breakTimeHours float64) float64 {
	if startTime == "" || endTime == "" {
		return 0
	}

	// 時間文字列がHH:MM形式でない場合に対応
	ensureValidTimeFormat := func(timeStr string) string {
		// すでにHH:MM:SS形式なら変更しない
		if len(timeStr) > 5 && strings.Contains(timeStr, ":") {
			return timeStr
		}
		// HH:MM形式なら秒を追加
		if len(timeStr) == 5 && strings.Contains(timeStr, ":") {
			return timeStr + ":00"
		}
		// その他の形式はそのまま返す
		return timeStr
	}

	// 時間を分に変換する関数
	getMinutes := func(timeStr string) (int, error) {
		// 時間形式を標準化
		formattedTime := ensureValidTimeFormat(timeStr)

		// まずHH:MM形式で解析
		t, err := time.Parse("15:04", formattedTime)
		if err != nil {
			// 次にHH:MM:SS形式で解析
			t, err = time.Parse("15:04:05", formattedTime)
			if err != nil {
				return 0, err
			}
		}

		return t.Hour()*60 + t.Minute(), nil
	}

	startMinutes, err := getMinutes(startTime)
	if err != nil {
		return 0
	}

	endMinutes, err := getMinutes(endTime)
	if err != nil {
		return 0
	}

	// 終了時間が開始時間より前の場合は0を返す
	if endMinutes <= startMinutes {
		return 0
	}

	// 休憩時間を分に変換
	breakMinutes := int(breakTimeHours * 60)

	// 稼働時間（分）の計算
	workMinutes := endMinutes - startMinutes - breakMinutes

	// 負の値にならないよう補正して時間に変換
	if workMinutes < 0 {
		workMinutes = 0
	}

	// 結果を時間に変換（小数点第2位まで）
	return math.Round(float64(workMinutes)/60*100) / 100
}
