package utils

import (
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/model"
)

// WeeklyReportUtils 週報関連のユーティリティ関数
type WeeklyReportUtils struct{}

// NewWeeklyReportUtils WeeklyReportUtilsのインスタンスを生成
func NewWeeklyReportUtils() *WeeklyReportUtils {
	return &WeeklyReportUtils{}
}

// CalculateWeekRange 指定した日付の週の開始日と終了日を計算
// 月曜日を週の開始、日曜日を週の終了とする
func (u *WeeklyReportUtils) CalculateWeekRange(date time.Time) (start, end time.Time) {
	// 日本のタイムゾーンに変換
	jst := time.FixedZone("JST", 9*60*60)
	localDate := date.In(jst)

	// 月曜日を週の開始とする（Mondayは1）
	weekday := int(localDate.Weekday())
	if weekday == 0 { // 日曜日の場合
		weekday = 7
	}

	// 週の開始日（月曜日）を計算
	daysFromMonday := weekday - 1
	start = localDate.AddDate(0, 0, -daysFromMonday)
	start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, jst)

	// 週の終了日（日曜日）を計算
	end = start.AddDate(0, 0, 6)
	end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, jst)

	return start, end
}

// GetCurrentWeekRange 現在の週の範囲を取得
func (u *WeeklyReportUtils) GetCurrentWeekRange() (start, end time.Time) {
	return u.CalculateWeekRange(time.Now())
}

// GetPreviousWeekRange 前週の範囲を取得
func (u *WeeklyReportUtils) GetPreviousWeekRange() (start, end time.Time) {
	lastWeek := time.Now().AddDate(0, 0, -7)
	return u.CalculateWeekRange(lastWeek)
}

// GetNextWeekRange 翌週の範囲を取得
func (u *WeeklyReportUtils) GetNextWeekRange() (start, end time.Time) {
	nextWeek := time.Now().AddDate(0, 0, 7)
	return u.CalculateWeekRange(nextWeek)
}

// FormatWeekRange 週の範囲を文字列形式で取得
func (u *WeeklyReportUtils) FormatWeekRange(start, end time.Time) string {
	return fmt.Sprintf("%s - %s",
		start.Format("2006/01/02"),
		end.Format("2006/01/02"))
}

// CalculateSubmissionDeadline 提出期限を計算
func (u *WeeklyReportUtils) CalculateSubmissionDeadline(weekEnd time.Time) time.Time {
	// 週の終了日（日曜日）の翌日（月曜日）正午を期限とする
	jst := time.FixedZone("JST", 9*60*60)
	deadline := weekEnd.AddDate(0, 0, 1)
	return time.Date(deadline.Year(), deadline.Month(), deadline.Day(), 12, 0, 0, 0, jst)
}

// IsSubmissionOverdue 提出期限を過ぎているかチェック
func (u *WeeklyReportUtils) IsSubmissionOverdue(deadline time.Time, submittedAt *time.Time) bool {
	if submittedAt != nil {
		return submittedAt.After(deadline)
	}
	return time.Now().After(deadline)
}

// CalculateWorkingDays 稼働日数を計算
func (u *WeeklyReportUtils) CalculateWorkingDays(dailyRecords []*model.DailyRecord) int {
	workingDays := 0
	for _, record := range dailyRecords {
		if record.WorkHours > 0 || record.ClientWorkHours > 0 {
			workingDays++
		}
	}
	return workingDays
}

// CalculateTotalHours 総稼働時間を計算
func (u *WeeklyReportUtils) CalculateTotalHours(dailyRecords []*model.DailyRecord) (companyHours, clientHours float64) {
	for _, record := range dailyRecords {
		companyHours += record.WorkHours
		clientHours += record.ClientWorkHours
	}
	return companyHours, clientHours
}

// ValidateWeekRange 週の範囲が有効かチェック
func (u *WeeklyReportUtils) ValidateWeekRange(start, end time.Time) error {
	if start.After(end) {
		return fmt.Errorf("開始日が終了日より後になっています")
	}

	// 7日間かチェック
	diff := end.Sub(start)
	if diff.Hours() < 6*24 || diff.Hours() > 7*24 {
		return fmt.Errorf("週の範囲は7日間である必要があります")
	}

	// 月曜日から日曜日かチェック
	if start.Weekday() != time.Monday {
		return fmt.Errorf("開始日は月曜日である必要があります")
	}

	if end.Weekday() != time.Sunday {
		return fmt.Errorf("終了日は日曜日である必要があります")
	}

	return nil
}

// GetWeekNumber 年間の週番号を取得
func (u *WeeklyReportUtils) GetWeekNumber(date time.Time) (year, week int) {
	return date.ISOWeek()
}

// GenerateWeeklyReportTitle 週報のタイトルを生成
func (u *WeeklyReportUtils) GenerateWeeklyReportTitle(start, end time.Time, userName string) string {
	weekRange := u.FormatWeekRange(start, end)
	return fmt.Sprintf("%s の週報 (%s)", userName, weekRange)
}

// CheckDuplicateWeekRange 同じ週の範囲の週報が既に存在するかチェック
func (u *WeeklyReportUtils) CheckDuplicateWeekRange(start, end time.Time, existingReports []model.WeeklyReport) bool {
	for _, report := range existingReports {
		if u.isSameWeek(start, end, report.StartDate, report.EndDate) {
			return true
		}
	}
	return false
}

// isSameWeek 同じ週かどうかをチェック
func (u *WeeklyReportUtils) isSameWeek(start1, end1, start2, end2 time.Time) bool {
	return start1.Format("2006-01-02") == start2.Format("2006-01-02") &&
		end1.Format("2006-01-02") == end2.Format("2006-01-02")
}

// GetWeekDates 週の各日付を取得
func (u *WeeklyReportUtils) GetWeekDates(start time.Time) []time.Time {
	dates := make([]time.Time, 7)
	for i := 0; i < 7; i++ {
		dates[i] = start.AddDate(0, 0, i)
	}
	return dates
}

// IsWeekend 週末（土日）かどうかチェック
func (u *WeeklyReportUtils) IsWeekend(date time.Time) bool {
	weekday := date.Weekday()
	return weekday == time.Saturday || weekday == time.Sunday
}

// GetWeekdayName 曜日名を取得（日本語）
func (u *WeeklyReportUtils) GetWeekdayName(date time.Time) string {
	weekdays := map[time.Weekday]string{
		time.Sunday:    "日",
		time.Monday:    "月",
		time.Tuesday:   "火",
		time.Wednesday: "水",
		time.Thursday:  "木",
		time.Friday:    "金",
		time.Saturday:  "土",
	}
	return weekdays[date.Weekday()]
}

// CalculateMonthlyStats 月次統計を計算
func (u *WeeklyReportUtils) CalculateMonthlyStats(reports []model.WeeklyReport) model.WeeklyReportStats {
	stats := model.WeeklyReportStats{
		TotalReports: len(reports),
	}

	totalWorkHours := 0.0

	for _, report := range reports {
		switch report.Status {
		case model.WeeklyReportStatusSubmitted, model.WeeklyReportStatusApproved:
			stats.SubmittedReports++
		case model.WeeklyReportStatusDraft:
			stats.DraftReports++
		}

		// 遅延提出チェック（リファクタリング後の場合）
		if report.SubmittedAt != nil && report.SubmissionDeadline != nil {
			if report.SubmittedAt.After(*report.SubmissionDeadline) {
				stats.LateSubmissions++
			}
		}

		// 期限切れチェック
		if !u.isSubmitted(report.Status) && report.SubmissionDeadline != nil {
			if time.Now().After(*report.SubmissionDeadline) {
				stats.OverdueReports++
			}
		}

		totalWorkHours += report.TotalWorkHours
	}

	// 提出率の計算
	if stats.TotalReports > 0 {
		stats.SubmissionRate = float64(stats.SubmittedReports) / float64(stats.TotalReports) * 100
		stats.AverageWorkHours = totalWorkHours / float64(stats.TotalReports)
	}

	return stats
}

// isSubmitted 提出済み状態かチェック
func (u *WeeklyReportUtils) isSubmitted(status model.WeeklyReportStatusEnum) bool {
	return status == model.WeeklyReportStatusSubmitted ||
		status == model.WeeklyReportStatusApproved ||
		status == model.WeeklyReportStatusRejected
}

// GenerateWeekOptions 週選択用のオプションを生成（過去n週間分）
func (u *WeeklyReportUtils) GenerateWeekOptions(weeksBack int) []WeekOption {
	options := make([]WeekOption, weeksBack)
	currentDate := time.Now()

	for i := 0; i < weeksBack; i++ {
		targetDate := currentDate.AddDate(0, 0, -7*i)
		start, end := u.CalculateWeekRange(targetDate)

		options[i] = WeekOption{
			Value:     fmt.Sprintf("%s_%s", start.Format("2006-01-02"), end.Format("2006-01-02")),
			Label:     u.FormatWeekRange(start, end),
			StartDate: start,
			EndDate:   end,
			IsCurrent: i == 0,
		}
	}

	return options
}

// WeekOption 週選択用のオプション
type WeekOption struct {
	Value     string    `json:"value"`
	Label     string    `json:"label"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	IsCurrent bool      `json:"is_current"`
}

// ParseWeekOption 週オプションの値から開始日と終了日を取得
func (u *WeeklyReportUtils) ParseWeekOption(value string) (start, end time.Time, err error) {
	// "2024-01-01_2024-01-07" 形式から日付を抽出
	dates := strings.Split(value, "_")
	if len(dates) != 2 {
		return start, end, fmt.Errorf("無効な週オプション形式です: %s", value)
	}

	start, err = time.Parse("2006-01-02", dates[0])
	if err != nil {
		return start, end, fmt.Errorf("開始日の解析に失敗しました: %v", err)
	}

	end, err = time.Parse("2006-01-02", dates[1])
	if err != nil {
		return start, end, fmt.Errorf("終了日の解析に失敗しました: %v", err)
	}

	return start, end, nil
}
