package calculator

import (
	"sort"
	"time"
)

// ExperiencePeriod 経験期間を表す構造体
type ExperiencePeriod struct {
	Technology string
	StartDate  time.Time
	EndDate    *time.Time // nilの場合は現在進行中
}

// ExperienceResult 経験計算結果
type ExperienceResult struct {
	TotalMonths      int32
	Years            int32
	Months           int32
	FirstUsedDate    time.Time
	LastUsedDate     time.Time
	ProjectCount     int32
	TotalProjectDays int32 // 重複期間を含む総プロジェクト日数
}

// ITExperienceResult IT経験全体の計算結果
type ITExperienceResult struct {
	TotalMonths        int32
	Years              int32
	Months             int32
	FirstProjectDate   time.Time
	LastProjectDate    time.Time
	TotalProjectCount  int32
	ActiveProjectCount int32
	TotalProjectMonths int32 // 重複期間を含む総プロジェクト月数
}

// CalculateITExperience IT業界での総経験年数を計算
// プロジェクト期間の重複を除外した実際の経験期間を算出
func CalculateITExperience(periods []ExperiencePeriod) ITExperienceResult {
	if len(periods) == 0 {
		return ITExperienceResult{}
	}

	// 期間をソート（開始日順）
	sortedPeriods := make([]ExperiencePeriod, len(periods))
	copy(sortedPeriods, periods)
	sort.Slice(sortedPeriods, func(i, j int) bool {
		return sortedPeriods[i].StartDate.Before(sortedPeriods[j].StartDate)
	})

	// 重複期間をマージして実際の経験期間を計算
	mergedPeriods := mergeOverlappingPeriods(sortedPeriods)

	// 最初と最後の日付を取得
	firstDate := sortedPeriods[0].StartDate
	var lastDate time.Time
	activeCount := int32(0)
	totalProjectMonths := int32(0)

	for _, period := range sortedPeriods {
		endDate := period.EndDate
		if endDate == nil {
			endDate = &time.Time{}
			*endDate = time.Now()
			activeCount++
		}

		if endDate.After(lastDate) {
			lastDate = *endDate
		}

		// 各プロジェクトの月数を加算（重複含む）
		totalProjectMonths += calculateMonthsBetween(period.StartDate, *endDate)
	}

	// マージされた期間から総経験月数を計算
	totalMonths := int32(0)
	for _, merged := range mergedPeriods {
		endDate := merged.EndDate
		if endDate == nil {
			now := time.Now()
			endDate = &now
		}
		totalMonths += calculateMonthsBetween(merged.StartDate, *endDate)
	}

	years := totalMonths / 12
	months := totalMonths % 12

	return ITExperienceResult{
		TotalMonths:        totalMonths,
		Years:              years,
		Months:             months,
		FirstProjectDate:   firstDate,
		LastProjectDate:    lastDate,
		TotalProjectCount:  int32(len(periods)),
		ActiveProjectCount: activeCount,
		TotalProjectMonths: totalProjectMonths,
	}
}

// CalculateSkillExperience 特定技術の経験年数を計算
func CalculateSkillExperience(periods []ExperiencePeriod, technology string) ExperienceResult {
	// 指定された技術のみをフィルタリング
	var filteredPeriods []ExperiencePeriod
	for _, period := range periods {
		if period.Technology == technology {
			filteredPeriods = append(filteredPeriods, period)
		}
	}

	if len(filteredPeriods) == 0 {
		return ExperienceResult{}
	}

	// 期間をソート
	sort.Slice(filteredPeriods, func(i, j int) bool {
		return filteredPeriods[i].StartDate.Before(filteredPeriods[j].StartDate)
	})

	// 重複期間をマージ
	mergedPeriods := mergeOverlappingPeriods(filteredPeriods)

	// 最初と最後の使用日を取得
	firstDate := filteredPeriods[0].StartDate
	var lastDate time.Time
	totalProjectDays := int32(0)

	for _, period := range filteredPeriods {
		endDate := period.EndDate
		if endDate == nil {
			now := time.Now()
			endDate = &now
		}

		if endDate.After(lastDate) {
			lastDate = *endDate
		}

		// 各プロジェクトの日数を加算（重複含む）
		totalProjectDays += int32(endDate.Sub(period.StartDate).Hours() / 24)
	}

	// マージされた期間から総経験月数を計算
	totalMonths := int32(0)
	for _, merged := range mergedPeriods {
		endDate := merged.EndDate
		if endDate == nil {
			now := time.Now()
			endDate = &now
		}
		totalMonths += calculateMonthsBetween(merged.StartDate, *endDate)
	}

	years := totalMonths / 12
	months := totalMonths % 12

	return ExperienceResult{
		TotalMonths:      totalMonths,
		Years:            years,
		Months:           months,
		FirstUsedDate:    firstDate,
		LastUsedDate:     lastDate,
		ProjectCount:     int32(len(filteredPeriods)),
		TotalProjectDays: totalProjectDays,
	}
}

// mergeOverlappingPeriods 重複する期間をマージ
func mergeOverlappingPeriods(periods []ExperiencePeriod) []ExperiencePeriod {
	if len(periods) == 0 {
		return periods
	}

	var merged []ExperiencePeriod
	current := periods[0]

	for i := 1; i < len(periods); i++ {
		next := periods[i]

		// 現在の期間の終了日を取得（nilの場合は現在日時）
		currentEnd := current.EndDate
		if currentEnd == nil {
			now := time.Now()
			currentEnd = &now
		}

		// 次の期間と重複または隣接しているかチェック
		if next.StartDate.Before(*currentEnd) || next.StartDate.Equal(*currentEnd) {
			// 重複している場合はマージ
			nextEnd := next.EndDate
			if nextEnd == nil {
				// 次の期間が進行中の場合、現在の期間も進行中にする
				current.EndDate = nil
			} else if currentEnd != nil && nextEnd.After(*currentEnd) {
				// より遅い終了日を採用
				current.EndDate = nextEnd
			}
		} else {
			// 重複していない場合は現在の期間を結果に追加し、次の期間を現在にする
			merged = append(merged, current)
			current = next
		}
	}

	// 最後の期間を追加
	merged = append(merged, current)

	return merged
}

// calculateMonthsBetween 2つの日付間の月数を計算
func calculateMonthsBetween(start, end time.Time) int32 {
	if end.Before(start) {
		return 0
	}

	years := end.Year() - start.Year()
	months := int(end.Month()) - int(start.Month())

	// 日付を考慮した調整
	if end.Day() < start.Day() {
		months--
	}

	totalMonths := years*12 + months
	if totalMonths < 0 {
		totalMonths = 0
	}

	return int32(totalMonths)
}

// GetExperienceLevel 経験月数からレベルを判定
func GetExperienceLevel(totalMonths int32) string {
	if totalMonths < 6 {
		return "新人"
	} else if totalMonths < 24 {
		return "ジュニア"
	} else if totalMonths < 60 {
		return "ミドル"
	} else {
		return "シニア"
	}
}

// GetSkillLevel スキル経験月数からレベルを判定
func GetSkillLevel(totalMonths int32) string {
	if totalMonths < 6 {
		return "初級"
	} else if totalMonths < 24 {
		return "中級"
	} else {
		return "上級"
	}
}

// IsRecentlyUsed 最近使用したかどうか（1年以内）
func IsRecentlyUsed(lastUsedDate time.Time) bool {
	oneYearAgo := time.Now().AddDate(-1, 0, 0)
	return lastUsedDate.After(oneYearAgo)
}
