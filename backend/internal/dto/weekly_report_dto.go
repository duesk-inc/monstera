package dto

import (
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
)

// DailyRecordRequest 日次勤怠記録リクエスト
type DailyRecordRequest struct {
	Date            string  `json:"date" binding:"required"`
	StartTime       string  `json:"start_time"`
	EndTime         string  `json:"end_time"`
	BreakTime       float64 `json:"break_time"`
	WorkHours       float64 `json:"work_hours"`
	ClientStartTime string  `json:"client_start_time"`
	ClientEndTime   string  `json:"client_end_time"`
	ClientBreakTime float64 `json:"client_break_time"`
	ClientWorkHours float64 `json:"client_work_hours"`
	HasClientWork   bool    `json:"has_client_work"`
	Remarks         string  `json:"remarks"`
	IsHolidayWork   bool    `json:"is_holiday_work"`
}

// DailyRecordResponse 日次勤怠記録レスポンス
type DailyRecordResponse struct {
	ID              uuid.UUID `json:"id"`
	Date            string    `json:"date"`
	StartTime       string    `json:"start_time"`
	EndTime         string    `json:"end_time"`
	BreakTime       float64   `json:"break_time"`
	WorkHours       float64   `json:"work_hours"`
	ClientStartTime string    `json:"client_start_time"`
	ClientEndTime   string    `json:"client_end_time"`
	ClientBreakTime float64   `json:"client_break_time"`
	ClientWorkHours float64   `json:"client_work_hours"`
	HasClientWork   bool      `json:"has_client_work"`
	Remarks         string    `json:"remarks"`
	IsHolidayWork   bool      `json:"is_holiday_work"`
}

// WeeklyReportResponse 週報レスポンス
type WeeklyReportResponse struct {
	ID                       uuid.UUID             `json:"id"`
	UserID                   uuid.UUID             `json:"user_id"`
	StartDate                time.Time             `json:"start_date"`
	EndDate                  time.Time             `json:"end_date"`
	Status                   string                `json:"status"`
	Mood                     model.MoodStatus      `json:"mood"`
	MoodString               string                `json:"mood_string"` // Phase 1: 文字列ムード
	WeeklyRemarks            string                `json:"weekly_remarks"`
	WorkplaceName            string                `json:"workplace_name"`
	WorkplaceHours           string                `json:"workplace_hours"`
	WorkplaceChangeRequested bool                  `json:"workplace_change_requested"`
	TotalWorkHours           float64               `json:"total_work_hours"`
	ClientTotalWorkHours     float64               `json:"client_total_work_hours"`
	DailyRecords             []DailyRecordResponse `json:"daily_records,omitempty"`
	SubmittedAt              *time.Time            `json:"submitted_at"`
	CreatedAt                time.Time             `json:"created_at"`
	UpdatedAt                time.Time             `json:"updated_at"`
}

// CreateWeeklyReportRequest 週報作成リクエスト
type CreateWeeklyReportRequest struct {
	ID                       string               `json:"id"`
	StartDate                string               `json:"start_date" binding:"required"`
	EndDate                  string               `json:"end_date" binding:"required"`
	Mood                     int                  `json:"mood" binding:"min=1,max=5"`
	WeeklyMood               string               `json:"weekly_mood"` // 後方互換性のためのフィールド
	WeeklyRemarks            string               `json:"weekly_remarks" binding:"max=1000"`
	WorkplaceName            string               `json:"workplace_name"`
	WorkplaceHours           string               `json:"workplace_hours"`
	WorkplaceChangeRequested bool                 `json:"workplace_change_requested"`
	Status                   string               `json:"status"`
	DailyRecords             []DailyRecordRequest `json:"daily_records"`
}

// UpdateWeeklyReportRequest 週報更新リクエスト
type UpdateWeeklyReportRequest struct {
	StartDate                string               `json:"start_date" binding:"required"`
	EndDate                  string               `json:"end_date" binding:"required"`
	Mood                     int                  `json:"mood" binding:"min=1,max=5"`
	WeeklyMood               string               `json:"weekly_mood"` // 後方互換性のためのフィールド
	WeeklyRemarks            string               `json:"weekly_remarks" binding:"max=1000"`
	WorkplaceName            string               `json:"workplace_name"`
	WorkplaceHours           string               `json:"workplace_hours"`
	WorkplaceChangeRequested bool                 `json:"workplace_change_requested"`
	Status                   string               `json:"status"`
	DailyRecords             []DailyRecordRequest `json:"daily_records"`
}

// ListWeeklyReportsResponse 週報一覧レスポンス
type ListWeeklyReportsResponse struct {
	Reports []WeeklyReportResponse `json:"reports"`
	Total   int64                  `json:"total"`
	Page    int                    `json:"page"`
	Limit   int                    `json:"limit"`
}

// WeeklyReportFilters 週報一覧検索フィルタ
type WeeklyReportFilters struct {
	Status    string `form:"status" json:"status"`
	StartDate string `form:"start_date" json:"start_date"`
	EndDate   string `form:"end_date" json:"end_date"`
	Search    string `form:"search" json:"search"`
	UserID    string `form:"user_id" json:"user_id"`
	Page      int    `form:"page" json:"page" binding:"min=1"`
	Limit     int    `form:"limit" json:"limit" binding:"min=1,max=100"`
}

// UserDefaultWorkSettingsRequest デフォルト勤務時間設定のリクエスト
type UserDefaultWorkSettingsRequest struct {
	WeekdayStartTime string  `json:"weekday_start_time" binding:"required"`
	WeekdayEndTime   string  `json:"weekday_end_time" binding:"required"`
	WeekdayBreakTime float64 `json:"weekday_break_time" binding:"required"`
}

// レガシーINT型ステータスから文字列への変換（移行期間中のみ使用）
func ConvertLegacyIntStatusToString(intStatus int) string {
	switch intStatus {
	case 0:
		return "draft" // NotSubmitted → draft
	case 1:
		return "draft" // Draft → draft
	case 2:
		return "submitted" // Submitted → submitted
	case 3:
		return "approved" // 互換性のため
	case 4:
		return "rejected" // 互換性のため
	default:
		return "draft"
	}
}

// ConvertStringToMood 文字列をMoodStatus（INT）に変換
func ConvertStringToMood(mood string) model.MoodStatus {
	switch mood {
	case "terrible":
		return model.MoodStatusTerrible
	case "bad":
		return model.MoodStatusBad
	case "neutral":
		return model.MoodStatusNeutral
	case "good":
		return model.MoodStatusGood
	case "excellent":
		return model.MoodStatusExcellent
	default:
		return model.MoodStatusNeutral
	}
}

// WeeklyReportDTO ユーザー向け週報DTO
type WeeklyReportDTO struct {
	ID                       uuid.UUID  `json:"id"`
	UserID                   uuid.UUID  `json:"user_id"`
	StartDate                time.Time  `json:"start_date"`
	EndDate                  time.Time  `json:"end_date"`
	Status                   string     `json:"status"`
	Mood                     int        `json:"mood"`
	MoodString               string     `json:"mood_string"`
	WeeklyRemarks            string     `json:"weekly_remarks"`
	WorkplaceName            string     `json:"workplace_name"`
	WorkplaceHours           string     `json:"workplace_hours"`
	WorkplaceChangeRequested bool       `json:"workplace_change_requested"`
	TotalWorkHours           float64    `json:"total_work_hours"`
	ClientTotalWorkHours     float64    `json:"client_total_work_hours"`
	SubmittedAt              *time.Time `json:"submitted_at"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}

// WeeklyReportDetailDTO ユーザー向け週報詳細DTO
type WeeklyReportDetailDTO struct {
	WeeklyReportDTO
	DailyRecords []DailyRecordDTO `json:"daily_records"`
}

// 重複定義はadmin_dto.goを使用

// UnsubmittedReportDTO 未提出週報DTO
type UnsubmittedReportDTO struct {
	ID                 uuid.UUID  `json:"id"`
	UserID             uuid.UUID  `json:"user_id"`
	UserName           string     `json:"user_name"`
	UserEmail          string     `json:"user_email"`
	DepartmentID       *uuid.UUID `json:"department_id"`
	DepartmentName     string     `json:"department_name"`
	ManagerID          *uuid.UUID `json:"manager_id"`
	ManagerName        string     `json:"manager_name"`
	StartDate          time.Time  `json:"start_date"`
	EndDate            time.Time  `json:"end_date"`
	SubmissionDeadline *time.Time `json:"submission_deadline"`
	DaysOverdue        int        `json:"days_overdue"`
	CreatedAt          time.Time  `json:"created_at"`
}

// 重複定義はadmin_dto.goを使用

// ConvertToWeeklyReportDTO モデルをDTOに変換
func ConvertToWeeklyReportDTO(report *model.WeeklyReport) WeeklyReportDTO {
	return WeeklyReportDTO{
		ID:                       report.ID,
		UserID:                   report.UserID,
		StartDate:                report.StartDate,
		EndDate:                  report.EndDate,
		Status:                   report.Status.String(),
		Mood:                     int(report.Mood),
		MoodString:               convertMoodToString(report.Mood),
		WeeklyRemarks:            report.WeeklyRemarks,
		WorkplaceName:            report.WorkplaceName,
		WorkplaceHours:           report.WorkplaceHours,
		WorkplaceChangeRequested: report.WorkplaceChangeRequested,
		TotalWorkHours:           report.TotalWorkHours,
		ClientTotalWorkHours:     report.ClientTotalWorkHours,
		SubmittedAt:              report.SubmittedAt,
		CreatedAt:                report.CreatedAt,
		UpdatedAt:                report.UpdatedAt,
	}
}

// ConvertToWeeklyReportDetailDTO モデルを詳細DTOに変換
func ConvertToWeeklyReportDetailDTO(report *model.WeeklyReport) *WeeklyReportDetailDTO {
	dto := &WeeklyReportDetailDTO{
		WeeklyReportDTO: ConvertToWeeklyReportDTO(report),
		DailyRecords:    make([]DailyRecordDTO, len(report.DailyRecords)),
	}

	for i, record := range report.DailyRecords {
		dto.DailyRecords[i] = DailyRecordDTO{
			ID:               record.ID,
			RecordDate:       record.Date,
			IsHoliday:        false, // TODO: 休日判定ロジック
			IsHolidayWork:    record.IsHolidayWork,
			CompanyWorkHours: record.WorkHours,
			ClientWorkHours:  record.ClientWorkHours,
			TotalWorkHours:   record.WorkHours + record.ClientWorkHours,
			Remarks:          record.Remarks,
			CreatedAt:        record.CreatedAt,
		}
	}

	return dto
}

// convertMoodToString MoodStatus（INT）を文字列に変換（ローカル版）
func convertMoodToString(mood model.MoodStatus) string {
	switch mood {
	case model.MoodStatusTerrible:
		return "terrible"
	case model.MoodStatusBad:
		return "bad"
	case model.MoodStatusNeutral:
		return "neutral"
	case model.MoodStatusGood:
		return "good"
	case model.MoodStatusExcellent:
		return "excellent"
	default:
		return "neutral"
	}
}
