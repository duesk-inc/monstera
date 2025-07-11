package dto

import "github.com/google/uuid"

// LeaveTypeResponse 休暇種別のレスポンスDTO
type LeaveTypeResponse struct {
	ID                string  `json:"id"`
	Code              string  `json:"code"`
	Name              string  `json:"name"`
	Description       string  `json:"description"`
	DefaultDays       float64 `json:"default_days"`
	IsHourlyAvailable bool    `json:"is_hourly_available"`
	ReasonRequired    bool    `json:"reason_required"`
	GenderSpecific    string  `json:"gender_specific"`
	DisplayOrder      int     `json:"display_order"`
	IsActive          bool    `json:"is_active"`
}

// UserLeaveBalanceResponse ユーザーの休暇残日数のレスポンスDTO
type UserLeaveBalanceResponse struct {
	ID            string  `json:"id"`
	LeaveTypeID   string  `json:"leave_type_id"`
	LeaveTypeName string  `json:"leave_type_name"`
	FiscalYear    int     `json:"fiscal_year"`
	TotalDays     float64 `json:"total_days"`
	UsedDays      float64 `json:"used_days"`
	RemainingDays float64 `json:"remaining_days"`
	ExpireDate    string  `json:"expire_date"`
}

// LeaveRequestDetailRequest 休暇申請詳細のリクエストDTO
type LeaveRequestDetailRequest struct {
	LeaveDate string  `json:"leave_date" binding:"required"`
	StartTime string  `json:"start_time,omitempty"`
	EndTime   string  `json:"end_time,omitempty"`
	DayValue  float64 `json:"day_value" binding:"required"`
}

// LeaveRequestRequest 休暇申請のリクエストDTO
type LeaveRequestRequest struct {
	UserID         uuid.UUID                   `json:"user_id"`
	LeaveTypeID    string                      `json:"leave_type_id" binding:"required"`
	IsHourlyBased  bool                        `json:"is_hourly_based"`
	Reason         string                      `json:"reason"`
	TotalDays      float64                     `json:"total_days" binding:"required"`
	RequestDetails []LeaveRequestDetailRequest `json:"request_details" binding:"required"`
}

// LeaveRequestDetailResponse 休暇申請詳細のレスポンスDTO
type LeaveRequestDetailResponse struct {
	ID        string  `json:"id"`
	LeaveDate string  `json:"leave_date"`
	StartTime string  `json:"start_time,omitempty"`
	EndTime   string  `json:"end_time,omitempty"`
	DayValue  float64 `json:"day_value"`
}

// LeaveRequestResponse 休暇申請のレスポンスDTO
type LeaveRequestResponse struct {
	ID            string                       `json:"id"`
	UserID        uuid.UUID                    `json:"user_id"`
	LeaveTypeID   string                       `json:"leave_type_id"`
	LeaveTypeName string                       `json:"leave_type_name"`
	RequestDate   string                       `json:"request_date"`
	IsHourlyBased bool                         `json:"is_hourly_based"`
	Reason        string                       `json:"reason"`
	TotalDays     float64                      `json:"total_days"`
	Status        string                       `json:"status"`
	ApproverID    string                       `json:"approver_id,omitempty"`
	ProcessedAt   string                       `json:"processed_at,omitempty"`
	Details       []LeaveRequestDetailResponse `json:"details"`
}

// HolidayResponse 休日情報のレスポンスDTO
type HolidayResponse struct {
	Date string `json:"date"`
	Name string `json:"name"`
	Type string `json:"type"`
}

// SubstituteLeaveGrantRequest 振替特別休暇付与のリクエストDTO
type SubstituteLeaveGrantRequest struct {
	UserID      uuid.UUID `json:"user_id" binding:"required"`
	GrantDate   string    `json:"grant_date" binding:"required"`
	GrantedDays float64   `json:"granted_days" binding:"required"`
	WorkDate    string    `json:"work_date" binding:"required"`
	Reason      string    `json:"reason" binding:"required"`
	ExpireDate  string    `json:"expire_date" binding:"required"`
}

// SubstituteLeaveGrantResponse 振替特別休暇付与のレスポンスDTO
type SubstituteLeaveGrantResponse struct {
	ID            string    `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	GrantDate     string    `json:"grant_date"`
	GrantedDays   float64   `json:"granted_days"`
	UsedDays      float64   `json:"used_days"`
	RemainingDays float64   `json:"remaining_days"`
	WorkDate      string    `json:"work_date"`
	Reason        string    `json:"reason"`
	ExpireDate    string    `json:"expire_date"`
	IsExpired     bool      `json:"is_expired"`
}

// SubstituteLeaveGrantSummaryResponse 振替特別休暇の合計付与日数レスポンスDTO
type SubstituteLeaveGrantSummaryResponse struct {
	TotalGrantedDays   float64                        `json:"total_granted_days"`
	TotalUsedDays      float64                        `json:"total_used_days"`
	TotalRemainingDays float64                        `json:"total_remaining_days"`
	Grants             []SubstituteLeaveGrantResponse `json:"grants"`
}
