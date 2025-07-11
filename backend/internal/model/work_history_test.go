package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestWorkHistory_CalculateDuration(t *testing.T) {
	tests := []struct {
		name         string
		startDate    time.Time
		endDate      *time.Time
		wantYears    int
		wantMonths   int
		wantDuration string
	}{
		{
			name:         "ちょうど1年",
			startDate:    time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:      timePtr(time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)),
			wantYears:    1,
			wantMonths:   0,
			wantDuration: "1年",
		},
		{
			name:         "1年6ヶ月",
			startDate:    time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:      timePtr(time.Date(2023, 7, 1, 0, 0, 0, 0, time.UTC)),
			wantYears:    1,
			wantMonths:   6,
			wantDuration: "1年6ヶ月",
		},
		{
			name:         "6ヶ月のみ",
			startDate:    time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:      timePtr(time.Date(2022, 7, 1, 0, 0, 0, 0, time.UTC)),
			wantYears:    0,
			wantMonths:   6,
			wantDuration: "6ヶ月",
		},
		{
			name:         "同じ月",
			startDate:    time.Date(2022, 1, 15, 0, 0, 0, 0, time.UTC),
			endDate:      timePtr(time.Date(2022, 1, 20, 0, 0, 0, 0, time.UTC)),
			wantYears:    0,
			wantMonths:   0,
			wantDuration: "0ヶ月",
		},
		{
			name:         "月またぎで日付を考慮",
			startDate:    time.Date(2022, 1, 20, 0, 0, 0, 0, time.UTC),
			endDate:      timePtr(time.Date(2022, 2, 10, 0, 0, 0, 0, time.UTC)),
			wantYears:    0,
			wantMonths:   0,
			wantDuration: "0ヶ月",
		},
		{
			name:         "月またぎで1ヶ月",
			startDate:    time.Date(2022, 1, 10, 0, 0, 0, 0, time.UTC),
			endDate:      timePtr(time.Date(2022, 2, 15, 0, 0, 0, 0, time.UTC)),
			wantYears:    0,
			wantMonths:   1,
			wantDuration: "1ヶ月",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wh := &WorkHistory{
				StartDate: tt.startDate,
				EndDate:   tt.endDate,
			}

			years, months := wh.CalculateDuration()
			assert.Equal(t, tt.wantYears, years, "years mismatch")
			assert.Equal(t, tt.wantMonths, months, "months mismatch")

			durationText := wh.GetDurationText()
			assert.Equal(t, tt.wantDuration, durationText, "duration text mismatch")
		})
	}
}

func TestWorkHistory_GetProcessesArray(t *testing.T) {
	tests := []struct {
		name      string
		processes string
		want      []int32
	}{
		{
			name:      "通常のカンマ区切り",
			processes: "1,2,3,4,5",
			want:      []int32{1, 2, 3, 4, 5},
		},
		{
			name:      "スペースあり",
			processes: "1, 2, 3",
			want:      []int32{1, 2, 3},
		},
		{
			name:      "空文字列",
			processes: "",
			want:      []int32{},
		},
		{
			name:      "不正な値を含む",
			processes: "1,abc,3",
			want:      []int32{1, 3},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wh := &WorkHistory{
				Processes: tt.processes,
			}
			got := wh.GetProcessesArray()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestWorkHistory_SetProcessesArray(t *testing.T) {
	tests := []struct {
		name      string
		processes []int32
		want      string
	}{
		{
			name:      "通常の配列",
			processes: []int32{1, 2, 3, 4, 5},
			want:      "1,2,3,4,5",
		},
		{
			name:      "空の配列",
			processes: []int32{},
			want:      "",
		},
		{
			name:      "単一要素",
			processes: []int32{1},
			want:      "1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wh := &WorkHistory{}
			wh.SetProcessesArray(tt.processes)
			assert.Equal(t, tt.want, wh.Processes)
		})
	}
}

// timePtr 時間のポインタを返すヘルパー関数
func timePtr(t time.Time) *time.Time {
	return &t
}
