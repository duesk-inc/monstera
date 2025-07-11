package calculator

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCalculateITExperience(t *testing.T) {
	tests := []struct {
		name     string
		periods  []ExperiencePeriod
		expected ITExperienceResult
	}{
		{
			name:     "空の期間",
			periods:  []ExperiencePeriod{},
			expected: ITExperienceResult{},
		},
		{
			name: "単一プロジェクト",
			periods: []ExperiencePeriod{
				{
					Technology: "Java",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			expected: ITExperienceResult{
				TotalMonths:        6,
				Years:              0,
				Months:             6,
				TotalProjectCount:  1,
				ActiveProjectCount: 0,
				TotalProjectMonths: 6,
			},
		},
		{
			name: "重複しない複数プロジェクト",
			periods: []ExperiencePeriod{
				{
					Technology: "Java",
					StartDate:  time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2022, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					Technology: "Python",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			expected: ITExperienceResult{
				TotalMonths:        12,
				Years:              1,
				Months:             0,
				TotalProjectCount:  2,
				ActiveProjectCount: 0,
				TotalProjectMonths: 12,
			},
		},
		{
			name: "重複する複数プロジェクト",
			periods: []ExperiencePeriod{
				{
					Technology: "Java",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					Technology: "Python",
					StartDate:  time.Date(2023, 4, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 10, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			expected: ITExperienceResult{
				TotalMonths:        9, // 1月〜10月 = 9ヶ月（重複除外）
				Years:              0,
				Months:             9,
				TotalProjectCount:  2,
				ActiveProjectCount: 0,
				TotalProjectMonths: 12, // 6ヶ月 + 6ヶ月（重複含む）
			},
		},
		{
			name: "進行中のプロジェクト",
			periods: []ExperiencePeriod{
				{
					Technology: "Java",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    nil, // 進行中
				},
			},
			expected: ITExperienceResult{
				TotalProjectCount:  1,
				ActiveProjectCount: 1,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateITExperience(tt.periods)

			if tt.expected.TotalMonths > 0 {
				assert.Equal(t, tt.expected.TotalMonths, result.TotalMonths)
			}
			if tt.expected.Years > 0 {
				assert.Equal(t, tt.expected.Years, result.Years)
			}
			if tt.expected.Months > 0 {
				assert.Equal(t, tt.expected.Months, result.Months)
			}
			assert.Equal(t, tt.expected.TotalProjectCount, result.TotalProjectCount)
			assert.Equal(t, tt.expected.ActiveProjectCount, result.ActiveProjectCount)

			if tt.expected.TotalProjectMonths > 0 {
				assert.Equal(t, tt.expected.TotalProjectMonths, result.TotalProjectMonths)
			}
		})
	}
}

func TestCalculateSkillExperience(t *testing.T) {
	tests := []struct {
		name       string
		periods    []ExperiencePeriod
		technology string
		expected   ExperienceResult
	}{
		{
			name:       "空の期間",
			periods:    []ExperiencePeriod{},
			technology: "Java",
			expected:   ExperienceResult{},
		},
		{
			name: "該当技術なし",
			periods: []ExperiencePeriod{
				{
					Technology: "Python",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			technology: "Java",
			expected:   ExperienceResult{},
		},
		{
			name: "該当技術あり",
			periods: []ExperiencePeriod{
				{
					Technology: "Java",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					Technology: "Python",
					StartDate:  time.Date(2023, 4, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 10, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			technology: "Java",
			expected: ExperienceResult{
				TotalMonths:  6,
				Years:        0,
				Months:       6,
				ProjectCount: 1,
			},
		},
		{
			name: "同一技術の複数プロジェクト（重複あり）",
			periods: []ExperiencePeriod{
				{
					Technology: "Java",
					StartDate:  time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					Technology: "Java",
					StartDate:  time.Date(2023, 4, 1, 0, 0, 0, 0, time.UTC),
					EndDate:    &[]time.Time{time.Date(2023, 10, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			technology: "Java",
			expected: ExperienceResult{
				TotalMonths:  9, // 1月〜10月 = 9ヶ月（重複除外）
				Years:        0,
				Months:       9,
				ProjectCount: 2,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateSkillExperience(tt.periods, tt.technology)

			assert.Equal(t, tt.expected.TotalMonths, result.TotalMonths)
			assert.Equal(t, tt.expected.Years, result.Years)
			assert.Equal(t, tt.expected.Months, result.Months)
			assert.Equal(t, tt.expected.ProjectCount, result.ProjectCount)
		})
	}
}

func TestCalculateMonthsBetween(t *testing.T) {
	tests := []struct {
		name     string
		start    time.Time
		end      time.Time
		expected int32
	}{
		{
			name:     "同じ日",
			start:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			end:      time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: 0,
		},
		{
			name:     "1ヶ月",
			start:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			end:      time.Date(2023, 2, 1, 0, 0, 0, 0, time.UTC),
			expected: 1,
		},
		{
			name:     "1年",
			start:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			end:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: 12,
		},
		{
			name:     "1年6ヶ月",
			start:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			end:      time.Date(2024, 7, 1, 0, 0, 0, 0, time.UTC),
			expected: 18,
		},
		{
			name:     "月末から月初",
			start:    time.Date(2023, 1, 31, 0, 0, 0, 0, time.UTC),
			end:      time.Date(2023, 2, 1, 0, 0, 0, 0, time.UTC),
			expected: 0, // 日付を考慮して1ヶ月未満
		},
		{
			name:     "逆順の日付",
			start:    time.Date(2023, 2, 1, 0, 0, 0, 0, time.UTC),
			end:      time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateMonthsBetween(tt.start, tt.end)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetExperienceLevel(t *testing.T) {
	tests := []struct {
		name          string
		totalMonths   int32
		expectedLevel string
	}{
		{
			name:          "0ヶ月",
			totalMonths:   0,
			expectedLevel: "新人",
		},
		{
			name:          "3ヶ月",
			totalMonths:   3,
			expectedLevel: "新人",
		},
		{
			name:          "6ヶ月",
			totalMonths:   6,
			expectedLevel: "ジュニア",
		},
		{
			name:          "12ヶ月",
			totalMonths:   12,
			expectedLevel: "ジュニア",
		},
		{
			name:          "24ヶ月",
			totalMonths:   24,
			expectedLevel: "ミドル",
		},
		{
			name:          "36ヶ月",
			totalMonths:   36,
			expectedLevel: "ミドル",
		},
		{
			name:          "60ヶ月",
			totalMonths:   60,
			expectedLevel: "シニア",
		},
		{
			name:          "72ヶ月",
			totalMonths:   72,
			expectedLevel: "シニア",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetExperienceLevel(tt.totalMonths)
			assert.Equal(t, tt.expectedLevel, result)
		})
	}
}

func TestGetSkillLevel(t *testing.T) {
	tests := []struct {
		name          string
		totalMonths   int32
		expectedLevel string
	}{
		{
			name:          "0ヶ月",
			totalMonths:   0,
			expectedLevel: "初級",
		},
		{
			name:          "3ヶ月",
			totalMonths:   3,
			expectedLevel: "初級",
		},
		{
			name:          "6ヶ月",
			totalMonths:   6,
			expectedLevel: "中級",
		},
		{
			name:          "12ヶ月",
			totalMonths:   12,
			expectedLevel: "中級",
		},
		{
			name:          "24ヶ月",
			totalMonths:   24,
			expectedLevel: "上級",
		},
		{
			name:          "36ヶ月",
			totalMonths:   36,
			expectedLevel: "上級",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetSkillLevel(tt.totalMonths)
			assert.Equal(t, tt.expectedLevel, result)
		})
	}
}

func TestIsRecentlyUsed(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name         string
		lastUsedDate time.Time
		expected     bool
	}{
		{
			name:         "今日",
			lastUsedDate: now,
			expected:     true,
		},
		{
			name:         "6ヶ月前",
			lastUsedDate: now.AddDate(0, -6, 0),
			expected:     true,
		},
		{
			name:         "11ヶ月前",
			lastUsedDate: now.AddDate(0, -11, 0),
			expected:     true,
		},
		{
			name:         "13ヶ月前",
			lastUsedDate: now.AddDate(0, -13, 0),
			expected:     false,
		},
		{
			name:         "2年前",
			lastUsedDate: now.AddDate(-2, 0, 0),
			expected:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsRecentlyUsed(tt.lastUsedDate)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMergeOverlappingPeriods(t *testing.T) {
	tests := []struct {
		name     string
		periods  []ExperiencePeriod
		expected int // 期待されるマージ後の期間数
	}{
		{
			name:     "空の期間",
			periods:  []ExperiencePeriod{},
			expected: 0,
		},
		{
			name: "重複なし",
			periods: []ExperiencePeriod{
				{
					StartDate: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   &[]time.Time{time.Date(2023, 3, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					StartDate: time.Date(2023, 6, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   &[]time.Time{time.Date(2023, 9, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			expected: 2,
		},
		{
			name: "完全重複",
			periods: []ExperiencePeriod{
				{
					StartDate: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   &[]time.Time{time.Date(2023, 6, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					StartDate: time.Date(2023, 2, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   &[]time.Time{time.Date(2023, 5, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			expected: 1,
		},
		{
			name: "部分重複",
			periods: []ExperiencePeriod{
				{
					StartDate: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   &[]time.Time{time.Date(2023, 4, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
				{
					StartDate: time.Date(2023, 3, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   &[]time.Time{time.Date(2023, 6, 1, 0, 0, 0, 0, time.UTC)}[0],
				},
			},
			expected: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mergeOverlappingPeriods(tt.periods)
			assert.Equal(t, tt.expected, len(result))
		})
	}
}
