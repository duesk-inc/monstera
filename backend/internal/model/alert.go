package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AlertSettings アラート設定（システム全体で1レコード）
type AlertSettings struct {
	ID                          uuid.UUID `gorm:"type:varchar(255);primary_key" json:"id"`
	WeeklyHoursLimit            int       `gorm:"not null;default:60" json:"weekly_hours_limit"`
	WeeklyHoursChangeLimit      int       `gorm:"not null;default:20" json:"weekly_hours_change_limit"`
	ConsecutiveHolidayWorkLimit int       `gorm:"not null;default:3" json:"consecutive_holiday_work_limit"`
	MonthlyOvertimeLimit        int       `gorm:"not null;default:80" json:"monthly_overtime_limit"`
	UpdatedBy string `gorm:"type:varchar(255);not null" json:"updated_by"`
	UpdatedByUser               *User     `gorm:"foreignKey:UpdatedBy" json:"updated_by_user,omitempty"`
	UpdatedAt                   time.Time `json:"updated_at"`
	CreatedAt                   time.Time `json:"created_at"`
}

// TableName アラート設定テーブル名
func (AlertSettings) TableName() string {
	return "alert_settings"
}

// BeforeCreate UUIDを生成
func (a *AlertSettings) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// AlertHistory アラート履歴
type AlertHistory struct {
	ID                uuid.UUID       `gorm:"type:varchar(255);primary_key" json:"id"`
	UserID string       `gorm:"type:varchar(255);not null" json:"user_id"`
	User              *User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	WeeklyReportID    *uuid.UUID      `gorm:"type:varchar(255)" json:"weekly_report_id,omitempty"`
	WeeklyReport      *WeeklyReport   `gorm:"foreignKey:WeeklyReportID" json:"weekly_report,omitempty"`
	AlertType         AlertType       `gorm:"type:varchar(50);not null" json:"alert_type"`
	Severity          AlertSeverity   `gorm:"type:varchar(20);not null" json:"severity"`
	DetectedValue     json.RawMessage `gorm:"type:json;not null" json:"detected_value"`
	ThresholdValue    json.RawMessage `gorm:"type:json;not null" json:"threshold_value"`
	Status            AlertStatus     `gorm:"type:varchar(20);not null;default:'unhandled'" json:"status"`
	ResolvedAt        *time.Time      `json:"resolved_at,omitempty"`
	ResolvedBy        *uuid.UUID      `gorm:"type:varchar(255)" json:"resolved_by,omitempty"`
	ResolvedByUser    *User           `gorm:"foreignKey:ResolvedBy" json:"resolved_by_user,omitempty"`
	ResolutionComment *string         `gorm:"type:text" json:"resolution_comment,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

// TableName アラート履歴テーブル名
func (AlertHistory) TableName() string {
	return "alert_histories"
}

// BeforeCreate UUIDを生成
func (a *AlertHistory) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// AlertType アラートタイプ
type AlertType string

const (
	AlertTypeOverwork        AlertType = "overwork"         // 長時間労働
	AlertTypeSuddenChange    AlertType = "sudden_change"    // 前週比急激な変化
	AlertTypeHolidayWork     AlertType = "holiday_work"     // 連続休日出勤
	AlertTypeMonthlyOvertime AlertType = "monthly_overtime" // 月間残業時間超過
	AlertTypeUnsubmitted     AlertType = "unsubmitted"      // 週報未提出
)

// String AlertTypeをstringに変換
func (a AlertType) String() string {
	return string(a)
}

// IsValid 有効なAlertTypeかチェック
func (a AlertType) IsValid() bool {
	switch a {
	case AlertTypeOverwork, AlertTypeSuddenChange, AlertTypeHolidayWork,
		AlertTypeMonthlyOvertime, AlertTypeUnsubmitted:
		return true
	}
	return false
}

// AlertSeverity アラート深刻度
type AlertSeverity string

const (
	AlertSeverityHigh   AlertSeverity = "high"   // 高
	AlertSeverityMedium AlertSeverity = "medium" // 中
	AlertSeverityLow    AlertSeverity = "low"    // 低
)

// String AlertSeverityをstringに変換
func (a AlertSeverity) String() string {
	return string(a)
}

// IsValid 有効なAlertSeverityかチェック
func (a AlertSeverity) IsValid() bool {
	switch a {
	case AlertSeverityHigh, AlertSeverityMedium, AlertSeverityLow:
		return true
	}
	return false
}

// AlertStatus アラートステータス
type AlertStatus string

const (
	AlertStatusUnhandled AlertStatus = "unhandled" // 未対応
	AlertStatusHandling  AlertStatus = "handling"  // 対応中
	AlertStatusResolved  AlertStatus = "resolved"  // 解決済み
	AlertStatusIgnored   AlertStatus = "ignored"   // 無視
)

// String AlertStatusをstringに変換
func (a AlertStatus) String() string {
	return string(a)
}

// IsValid 有効なAlertStatusかチェック
func (a AlertStatus) IsValid() bool {
	switch a {
	case AlertStatusUnhandled, AlertStatusHandling, AlertStatusResolved, AlertStatusIgnored:
		return true
	}
	return false
}

// Scan AlertTypeをデータベースから読み込み
func (a *AlertType) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case string:
		*a = AlertType(v)
		return nil
	case []byte:
		*a = AlertType(v)
		return nil
	default:
		return gorm.ErrInvalidData
	}
}

// Value AlertTypeをデータベースに保存
func (a AlertType) Value() (driver.Value, error) {
	return string(a), nil
}

// Scan AlertSeverityをデータベースから読み込み
func (a *AlertSeverity) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case string:
		*a = AlertSeverity(v)
		return nil
	case []byte:
		*a = AlertSeverity(v)
		return nil
	default:
		return gorm.ErrInvalidData
	}
}

// Value AlertSeverityをデータベースに保存
func (a AlertSeverity) Value() (driver.Value, error) {
	return string(a), nil
}

// Scan AlertStatusをデータベースから読み込み
func (a *AlertStatus) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case string:
		*a = AlertStatus(v)
		return nil
	case []byte:
		*a = AlertStatus(v)
		return nil
	default:
		return gorm.ErrInvalidData
	}
}

// Value AlertStatusをデータベースに保存
func (a AlertStatus) Value() (driver.Value, error) {
	return string(a), nil
}
