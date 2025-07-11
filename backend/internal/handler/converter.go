package handler

import (
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
)

// parseDate 日付文字列をtime.Timeに変換
func parseDate(dateStr string) (time.Time, error) {
	// 複数の日付フォーマットを試す
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05+09:00",
		time.RFC3339,
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("invalid date format: %s", dateStr)
}

// parseDateTime 日時文字列をtime.Timeに変換
func parseDateTime(dateTimeStr string) (time.Time, error) {
	if dateTimeStr == "" {
		return time.Time{}, nil
	}

	formats := []string{
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05+09:00",
		time.RFC3339,
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateTimeStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("invalid datetime format: %s", dateTimeStr)
}

// formatDate time.Timeを日付文字列に変換
func formatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02")
}

// formatDateTime time.Timeを日時文字列に変換
func formatDateTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}

// convertDailyRecordRequestToModel DTOからモデルへの変換
func convertDailyRecordRequestToModel(req *dto.DailyRecordRequest) (*model.DailyRecord, error) {
	date, err := parseDate(req.Date)
	if err != nil {
		return nil, err
	}

	return &model.DailyRecord{
		Date:            date,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		BreakTime:       req.BreakTime,
		WorkHours:       req.WorkHours,
		ClientStartTime: req.ClientStartTime,
		ClientEndTime:   req.ClientEndTime,
		ClientBreakTime: req.ClientBreakTime,
		ClientWorkHours: req.ClientWorkHours,
		HasClientWork:   req.HasClientWork,
		Remarks:         req.Remarks,
		IsHolidayWork:   req.IsHolidayWork,
	}, nil
}

// convertDailyRecordToDTO モデルからDTOへの変換
func convertDailyRecordToDTO(record *model.DailyRecord) *dto.DailyRecordResponse {
	return &dto.DailyRecordResponse{
		ID:              record.ID,
		Date:            formatDate(record.Date),
		StartTime:       record.StartTime,
		EndTime:         record.EndTime,
		BreakTime:       record.BreakTime,
		WorkHours:       record.WorkHours,
		ClientStartTime: record.ClientStartTime,
		ClientEndTime:   record.ClientEndTime,
		ClientBreakTime: record.ClientBreakTime,
		ClientWorkHours: record.ClientWorkHours,
		HasClientWork:   record.HasClientWork,
		Remarks:         record.Remarks,
		IsHolidayWork:   record.IsHolidayWork,
	}
}

// convertWeeklyReportToDTO 週報モデルからDTOへの変換
func convertWeeklyReportToDTO(report *model.WeeklyReport, dailyRecords []*model.DailyRecord) *dto.WeeklyReportResponse {
	dailyRecordDTOs := make([]dto.DailyRecordResponse, len(dailyRecords))
	for i, record := range dailyRecords {
		dailyRecordDTOs[i] = *convertDailyRecordToDTO(record)
	}

	return &dto.WeeklyReportResponse{
		ID:                       report.ID,
		UserID:                   report.UserID,
		StartDate:                report.StartDate,
		EndDate:                  report.EndDate,
		Status:                   string(report.Status),
		Mood:                     report.Mood,
		WeeklyRemarks:            report.WeeklyRemarks,
		WorkplaceName:            report.WorkplaceName,
		WorkplaceHours:           report.WorkplaceHours,
		WorkplaceChangeRequested: report.WorkplaceChangeRequested,
		SubmittedAt:              report.SubmittedAt,
		CreatedAt:                report.CreatedAt,
		UpdatedAt:                report.UpdatedAt,
		DailyRecords:             dailyRecordDTOs,
	}
}
