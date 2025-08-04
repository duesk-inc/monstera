package utils

import (
	"time"
)

// CalculateExpenseDeadline 経費申請の期限日を計算する
// 経費発生月の翌月10日23:59:59が期限
func CalculateExpenseDeadline(expenseDate time.Time) time.Time {
	// 翌月の1日を取得
	nextMonth := expenseDate.AddDate(0, 1, 0)
	year := nextMonth.Year()
	month := nextMonth.Month()

	// 翌月10日の23:59:59を設定
	deadline := time.Date(year, month, 10, 23, 59, 59, 999999999, time.Local)

	return deadline
}

// IsWithinDeadline 経費申請が期限内かどうかをチェック
func IsWithinDeadline(expenseDate time.Time, currentTime time.Time) bool {
	deadline := CalculateExpenseDeadline(expenseDate)
	return currentTime.Before(deadline) || currentTime.Equal(deadline)
}

// IsAllowableForSubmission 申請可能かどうかをチェック（年度と期限の両方を考慮）
func IsAllowableForSubmission(expenseDate time.Time, currentTime time.Time) bool {
	currentYear := currentTime.Year()
	expenseYear := expenseDate.Year()
	currentMonth := currentTime.Month()
	expenseMonth := expenseDate.Month()

	// 基本的に現在年度のみ許可
	if expenseYear != currentYear {
		// 1月の特例: 前年12月分は許可
		if currentMonth == 1 && expenseYear == currentYear-1 && expenseMonth == 12 {
			return IsWithinDeadline(expenseDate, currentTime)
		}
		return false
	}

	// 現在年度内でも期限チェック
	return IsWithinDeadline(expenseDate, currentTime)
}
