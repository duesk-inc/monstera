package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserITExperience_GetITExperienceText(t *testing.T) {
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
			name:   "5年2ヶ月",
			years:  5,
			months: 2,
			want:   "5年 2ヶ月",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserITExperience{
				ITExperienceYears:  tt.years,
				ITExperienceMonths: tt.months,
			}
			got := u.GetITExperienceText()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUserITExperience_HasITExperience(t *testing.T) {
	tests := []struct {
		name        string
		totalMonths int32
		want        bool
	}{
		{
			name:        "0ヶ月",
			totalMonths: 0,
			want:        false,
		},
		{
			name:        "1ヶ月",
			totalMonths: 1,
			want:        true,
		},
		{
			name:        "12ヶ月",
			totalMonths: 12,
			want:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserITExperience{
				TotalITExperienceMonths: tt.totalMonths,
			}
			got := u.HasITExperience()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUserITExperience_ExperienceLevel(t *testing.T) {
	tests := []struct {
		name         string
		totalMonths  int32
		expectLevel  string
		expectNewbie bool
		expectJunior bool
		expectMid    bool
		expectSenior bool
	}{
		{
			name:         "0ヶ月 - 新人",
			totalMonths:  0,
			expectLevel:  "新人",
			expectNewbie: true,
			expectJunior: false,
			expectMid:    false,
			expectSenior: false,
		},
		{
			name:         "3ヶ月 - 新人",
			totalMonths:  3,
			expectLevel:  "新人",
			expectNewbie: true,
			expectJunior: false,
			expectMid:    false,
			expectSenior: false,
		},
		{
			name:         "6ヶ月 - ジュニア",
			totalMonths:  6,
			expectLevel:  "ジュニア",
			expectNewbie: false,
			expectJunior: true,
			expectMid:    false,
			expectSenior: false,
		},
		{
			name:         "12ヶ月 - ジュニア",
			totalMonths:  12,
			expectLevel:  "ジュニア",
			expectNewbie: false,
			expectJunior: true,
			expectMid:    false,
			expectSenior: false,
		},
		{
			name:         "24ヶ月 - ミドル",
			totalMonths:  24,
			expectLevel:  "ミドル",
			expectNewbie: false,
			expectJunior: false,
			expectMid:    true,
			expectSenior: false,
		},
		{
			name:         "36ヶ月 - ミドル",
			totalMonths:  36,
			expectLevel:  "ミドル",
			expectNewbie: false,
			expectJunior: false,
			expectMid:    true,
			expectSenior: false,
		},
		{
			name:         "60ヶ月 - シニア",
			totalMonths:  60,
			expectLevel:  "シニア",
			expectNewbie: false,
			expectJunior: false,
			expectMid:    false,
			expectSenior: true,
		},
		{
			name:         "72ヶ月 - シニア",
			totalMonths:  72,
			expectLevel:  "シニア",
			expectNewbie: false,
			expectJunior: false,
			expectMid:    false,
			expectSenior: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserITExperience{
				TotalITExperienceMonths: tt.totalMonths,
			}

			assert.Equal(t, tt.expectLevel, u.GetExperienceLevel())
			assert.Equal(t, tt.expectNewbie, u.IsNewbie())
			assert.Equal(t, tt.expectJunior, u.IsJunior())
			assert.Equal(t, tt.expectMid, u.IsMid())
			assert.Equal(t, tt.expectSenior, u.IsSenior())
		})
	}
}

func TestUserITExperience_IsActiveProject(t *testing.T) {
	tests := []struct {
		name               string
		activeProjectCount int32
		want               bool
	}{
		{
			name:               "0件",
			activeProjectCount: 0,
			want:               false,
		},
		{
			name:               "1件",
			activeProjectCount: 1,
			want:               true,
		},
		{
			name:               "3件",
			activeProjectCount: 3,
			want:               true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserITExperience{
				ActiveProjectCount: tt.activeProjectCount,
			}
			got := u.IsActiveProject()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUserITExperience_GetProjectCountText(t *testing.T) {
	tests := []struct {
		name         string
		projectCount int32
		want         string
	}{
		{
			name:         "0件",
			projectCount: 0,
			want:         "0件",
		},
		{
			name:         "1件",
			projectCount: 1,
			want:         "1件",
		},
		{
			name:         "15件",
			projectCount: 15,
			want:         "15件",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := &UserITExperience{
				TotalProjectCount: tt.projectCount,
			}
			got := u.GetProjectCountText()
			assert.Equal(t, tt.want, got)
		})
	}
}
