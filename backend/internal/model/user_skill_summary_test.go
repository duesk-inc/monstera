package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestUserSkillSummary_GetExperienceText(t *testing.T) {
	tests := []struct {
		name   string
		years  int32
		months int32
		want   string
	}{
		{
			name:   "0年0ヶ月",
			years:  0,
			months: 0,
			want:   "0ヶ月",
		},
		{
			name:   "1年0ヶ月",
			years:  1,
			months: 0,
			want:   "1年",
		},
		{
			name:   "0年6ヶ月",
			years:  0,
			months: 6,
			want:   "6ヶ月",
		},
		{
			name:   "1年6ヶ月",
			years:  1,
			months: 6,
			want:   "1年 6ヶ月",
		},
		{
			name:   "3年2ヶ月",
			years:  3,
			months: 2,
			want:   "3年 2ヶ月",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserSkillSummary{
				ExperienceYears:  tt.years,
				ExperienceMonths: tt.months,
			}
			got := u.GetExperienceText()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUserSkillSummary_IsRecentlyUsed(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name         string
		lastUsedDate time.Time
		want         bool
	}{
		{
			name:         "今日",
			lastUsedDate: now,
			want:         true,
		},
		{
			name:         "6ヶ月前",
			lastUsedDate: now.AddDate(0, -6, 0),
			want:         true,
		},
		{
			name:         "11ヶ月前",
			lastUsedDate: now.AddDate(0, -11, 0),
			want:         true,
		},
		{
			name:         "13ヶ月前",
			lastUsedDate: now.AddDate(0, -13, 0),
			want:         false,
		},
		{
			name:         "2年前",
			lastUsedDate: now.AddDate(-2, 0, 0),
			want:         false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserSkillSummary{
				LastUsedDate: tt.lastUsedDate,
			}
			got := u.IsRecentlyUsed()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUserSkillSummary_GetUsageLevel(t *testing.T) {
	tests := []struct {
		name        string
		totalMonths int32
		wantLevel   string
	}{
		{
			name:        "0ヶ月",
			totalMonths: 0,
			wantLevel:   "初級",
		},
		{
			name:        "3ヶ月",
			totalMonths: 3,
			wantLevel:   "初級",
		},
		{
			name:        "5ヶ月",
			totalMonths: 5,
			wantLevel:   "初級",
		},
		{
			name:        "6ヶ月",
			totalMonths: 6,
			wantLevel:   "中級",
		},
		{
			name:        "12ヶ月",
			totalMonths: 12,
			wantLevel:   "中級",
		},
		{
			name:        "23ヶ月",
			totalMonths: 23,
			wantLevel:   "中級",
		},
		{
			name:        "24ヶ月",
			totalMonths: 24,
			wantLevel:   "上級",
		},
		{
			name:        "36ヶ月",
			totalMonths: 36,
			wantLevel:   "上級",
		},
		{
			name:        "60ヶ月",
			totalMonths: 60,
			wantLevel:   "上級",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserSkillSummary{
				TotalExperienceMonths: tt.totalMonths,
			}
			got := u.GetUsageLevel()
			assert.Equal(t, tt.wantLevel, got)
		})
	}
}
