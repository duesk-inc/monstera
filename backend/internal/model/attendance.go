package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AttendanceStatus 勤怠ステータス
type AttendanceStatus string

const (
	// AttendanceStatusPresent 出勤
	AttendanceStatusPresent AttendanceStatus = "present"
	// AttendanceStatusAbsent 欠勤
	AttendanceStatusAbsent AttendanceStatus = "absent"
	// AttendanceStatusLate 遅刻
	AttendanceStatusLate AttendanceStatus = "late"
	// AttendanceStatusEarlyLeave 早退
	AttendanceStatusEarlyLeave AttendanceStatus = "early_leave"
	// AttendanceStatusPaidLeave 有給休暇
	AttendanceStatusPaidLeave AttendanceStatus = "paid_leave"
	// AttendanceStatusUnpaidLeave 無給休暇
	AttendanceStatusUnpaidLeave AttendanceStatus = "unpaid_leave"
	// AttendanceStatusHoliday 休日
	AttendanceStatusHoliday AttendanceStatus = "holiday"
)

// Attendance 勤怠モデル
type Attendance struct {
	ID        uuid.UUID        `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID    uuid.UUID        `gorm:"type:varchar(36);not null" json:"user_id"`
	User      User             `gorm:"foreignKey:UserID" json:"user"`
	Date      time.Time        `gorm:"not null" json:"date"`
	Status    AttendanceStatus `gorm:"type:enum('present','absent','late','early_leave','paid_leave','unpaid_leave','holiday');default:'present';not null" json:"status"`
	StartTime *time.Time       `json:"start_time"`
	EndTime   *time.Time       `json:"end_time"`
	BreakTime int              `gorm:"default:0" json:"break_time"` // 休憩時間（分）
	Memo      string           `gorm:"type:text" json:"memo"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (a *Attendance) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// WorkingMinutes 勤務時間を分単位で計算
func (a *Attendance) WorkingMinutes() int {
	if a.StartTime == nil || a.EndTime == nil {
		return 0
	}

	// 休憩時間を考慮した実労働時間（分）を計算
	durationMinutes := int(a.EndTime.Sub(*a.StartTime).Minutes()) - a.BreakTime
	if durationMinutes < 0 {
		return 0
	}

	return durationMinutes
}

// WorkingHours 勤務時間を時間単位で計算
func (a *Attendance) WorkingHours() float64 {
	return float64(a.WorkingMinutes()) / 60.0
}

// 既存のVARCHAR型との互換性を保つための変換関数（移行期間中のみ使用）
func NormalizeAttendanceStatus(status string) AttendanceStatus {
	switch status {
	case "present":
		return AttendanceStatusPresent
	case "absent":
		return AttendanceStatusAbsent
	case "late":
		return AttendanceStatusLate
	case "early_leave":
		return AttendanceStatusEarlyLeave
	case "paid_leave":
		return AttendanceStatusPaidLeave
	case "unpaid_leave":
		return AttendanceStatusUnpaidLeave
	case "holiday":
		return AttendanceStatusHoliday
	default:
		return AttendanceStatusPresent
	}
}
