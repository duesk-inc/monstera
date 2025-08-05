package dto

import (
	"time"

	"github.com/duesk/monstera/internal/model"
)

// UserDTO ユーザー情報DTO（簡易版）
type UserDTO struct {
	ID         string `json:"id"`
	Email      string    `json:"email"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	FullName   string    `json:"full_name"`
	Department string    `json:"department,omitempty"`
}

// AlertSettingsDTO アラート設定DTO
type AlertSettingsDTO struct {
	ID                          string    `json:"id"`
	WeeklyHoursLimit            int       `json:"weekly_hours_limit"`
	WeeklyHoursChangeLimit      int       `json:"weekly_hours_change_limit"`
	ConsecutiveHolidayWorkLimit int       `json:"consecutive_holiday_work_limit"`
	MonthlyOvertimeLimit        int       `json:"monthly_overtime_limit"`
	UpdatedBy                   string    `json:"updated_by"`
	UpdatedAt                   time.Time `json:"updated_at"`
	CreatedAt                   time.Time `json:"created_at"`
	Updater                     *UserDTO  `json:"updater,omitempty"`
}

// CreateAlertSettingsRequest アラート設定作成リクエスト
type CreateAlertSettingsRequest struct {
	WeeklyHoursLimit            int `json:"weekly_hours_limit" binding:"min=0,max=168"`
	WeeklyHoursChangeLimit      int `json:"weekly_hours_change_limit" binding:"min=0,max=100"`
	ConsecutiveHolidayWorkLimit int `json:"consecutive_holiday_work_limit" binding:"min=0,max=30"`
	MonthlyOvertimeLimit        int `json:"monthly_overtime_limit" binding:"min=0,max=300"`
}

// UpdateAlertSettingsRequest アラート設定更新リクエスト
type UpdateAlertSettingsRequest struct {
	WeeklyHoursLimit            *int `json:"weekly_hours_limit" binding:"omitempty,min=0,max=168"`
	WeeklyHoursChangeLimit      *int `json:"weekly_hours_change_limit" binding:"omitempty,min=0,max=100"`
	ConsecutiveHolidayWorkLimit *int `json:"consecutive_holiday_work_limit" binding:"omitempty,min=0,max=30"`
	MonthlyOvertimeLimit        *int `json:"monthly_overtime_limit" binding:"omitempty,min=0,max=300"`
}

// AlertHistoryDTO アラート履歴DTO
type AlertHistoryDTO struct {
	ID                 string                 `json:"id"`
	AlertSettingID     string                 `json:"alert_setting_id"`
	UserID             string                 `json:"user_id"`
	WeeklyReportID     *string                `json:"weekly_report_id"`
	AlertType          string                 `json:"alert_type"`
	Severity           string                 `json:"severity"`
	DetectedValue      float64                `json:"detected_value"`
	ThresholdValue     float64                `json:"threshold_value"`
	Message            string                 `json:"message"`
	Metadata           map[string]interface{} `json:"metadata"`
	Status             string                 `json:"status"`
	HandledBy          *string                `json:"handled_by"`
	HandledAt          *time.Time             `json:"handled_at"`
	ResolutionComment  string                 `json:"resolution_comment"`
	NotificationSent   bool                   `json:"notification_sent"`
	NotificationSentAt *time.Time             `json:"notification_sent_at"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`

	// Relations
	AlertSetting *AlertSettingsDTO     `json:"alert_setting,omitempty"`
	User         *UserDTO              `json:"user,omitempty"`
	WeeklyReport *AdminWeeklyReportDTO `json:"weekly_report,omitempty"`
	Handler      *UserDTO              `json:"handler,omitempty"`
}

// AlertFilters アラート履歴フィルター
type AlertFilters struct {
	Status    string `form:"status"`
	Severity  string `form:"severity"`
	AlertType string `form:"alert_type"`
	UserID    string `form:"user_id"`
	DateFrom  string `form:"date_from"`
	DateTo    string `form:"date_to"`
}

// UpdateAlertStatusRequest アラートステータス更新リクエスト
type UpdateAlertStatusRequest struct {
	Status  string `json:"status" binding:"required,oneof=handling resolved ignored"`
	Comment string `json:"comment" binding:"max=500"`
}

// AlertDetailSummaryDTO アラート詳細サマリー
type AlertDetailSummaryDTO struct {
	TotalAlerts       int64             `json:"total_alerts"`
	UnhandledAlerts   int64             `json:"unhandled_alerts"`
	HandlingAlerts    int64             `json:"handling_alerts"`
	ResolvedAlerts    int64             `json:"resolved_alerts"`
	SeverityBreakdown map[string]int64  `json:"severity_breakdown"`
	TypeBreakdown     map[string]int64  `json:"type_breakdown"`
	RecentAlerts      []AlertHistoryDTO `json:"recent_alerts"`
}

// ToAlertSettingsModel DTOからモデルに変換
func (dto *CreateAlertSettingsRequest) ToAlertSettingsModel(updatedBy string) *model.AlertSettings {
	return &model.AlertSettings{
		WeeklyHoursLimit:            dto.WeeklyHoursLimit,
		WeeklyHoursChangeLimit:      dto.WeeklyHoursChangeLimit,
		ConsecutiveHolidayWorkLimit: dto.ConsecutiveHolidayWorkLimit,
		MonthlyOvertimeLimit:        dto.MonthlyOvertimeLimit,
		UpdatedBy:                   updatedBy,
	}
}

// ToAlertSettingsDTO モデルからDTOに変換
func ToAlertSettingsDTO(alert *model.AlertSettings) *AlertSettingsDTO {
	dto := &AlertSettingsDTO{
		ID:                          alert.ID.String(),
		WeeklyHoursLimit:            alert.WeeklyHoursLimit,
		WeeklyHoursChangeLimit:      alert.WeeklyHoursChangeLimit,
		ConsecutiveHolidayWorkLimit: alert.ConsecutiveHolidayWorkLimit,
		MonthlyOvertimeLimit:        alert.MonthlyOvertimeLimit,
		UpdatedBy:                   alert.UpdatedBy,
		CreatedAt:                   alert.CreatedAt,
		UpdatedAt:                   alert.UpdatedAt,
	}

	if alert.UpdatedByUser != nil {
		dto.Updater = ToUserDTO(alert.UpdatedByUser)
	}

	return dto
}

// ToUserDTO ユーザーモデルをDTOに変換
func ToUserDTO(user *model.User) *UserDTO {
	return &UserDTO{
		ID:         user.ID,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		FullName:   user.FirstName + " " + user.LastName,
		Department: user.Department,
	}
}

// ToAlertHistoryDTO モデルからDTOに変換
func ToAlertHistoryDTO(alert *model.AlertHistory) *AlertHistoryDTO {
	var detectedValue, thresholdValue float64
	// JSON値から数値を取得（簡易実装）
	// 実際の実装では適切なパースが必要

	dto := &AlertHistoryDTO{
		ID:             alert.ID.String(),
		UserID:         alert.UserID,
		AlertType:      string(alert.AlertType),
		Severity:       string(alert.Severity),
		DetectedValue:  detectedValue,
		ThresholdValue: thresholdValue,
		Status:         string(alert.Status),
		CreatedAt:      alert.CreatedAt,
	}

	if alert.WeeklyReportID != nil {
		weeklyReportID := alert.WeeklyReportID.String()
		dto.WeeklyReportID = &weeklyReportID
	}

	if alert.ResolvedBy != nil {
		handledBy := alert.ResolvedBy.String()
		dto.HandledBy = &handledBy
		dto.HandledAt = alert.ResolvedAt
	}

	if alert.ResolutionComment != nil {
		dto.ResolutionComment = *alert.ResolutionComment
	}

	if alert.User != nil {
		dto.User = ToUserDTO(alert.User)
	}

	if alert.ResolvedByUser != nil {
		dto.Handler = ToUserDTO(alert.ResolvedByUser)
	}

	return dto
}
