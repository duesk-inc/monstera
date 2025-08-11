package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// HolidayType 休日タイプ
type HolidayType string

const (
	// HolidayTypeNational 国民の祝日
	HolidayTypeNational HolidayType = "national"
	// HolidayTypeCompany 会社休日
	HolidayTypeCompany HolidayType = "company"
	// HolidayTypeSpecial 特別休日
	HolidayTypeSpecial HolidayType = "special"
	// HolidayTypeOther その他
	HolidayTypeOther HolidayType = "other"
)

// Holiday は休日設定を表すモデルです
type Holiday struct {
	ID          string      `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Date        time.Time   `gorm:"not null;index:idx_holiday_date" json:"date"` // エイリアスフィールド
	HolidayDate time.Time   `gorm:"not null;index:idx_holiday_date" json:"holiday_date"`
	HolidayName string      `gorm:"type:varchar(100);not null" json:"holiday_name"`
	HolidayType HolidayType `gorm:"type:enum('national','company','special','other');not null;default:'national'" json:"holiday_type"`
	Description string      `gorm:"type:text" json:"description"`
	IsRecurring bool        `gorm:"default:false" json:"is_recurring"`  // 毎年繰り返すかどうか
	AppliesTo   string      `gorm:"type:varchar(50)" json:"applies_to"` // 適用対象（all, specific_dept, specific_projectなど）
	CreatedBy   string      `gorm:"type:varchar(36)" json:"created_by"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	DeletedAt   *time.Time  `gorm:"index" json:"deleted_at"`
}

// TableName はテーブル名を指定します
func (Holiday) TableName() string {
	return "holidays"
}

// BeforeCreate UUIDを生成
func (h *Holiday) BeforeCreate(tx *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.New().String()
	}
	return nil
}

// IsNational 国民の祝日かチェック
func (h *Holiday) IsNational() bool {
	return h.HolidayType == HolidayTypeNational
}

// IsCompany 会社休日かチェック
func (h *Holiday) IsCompany() bool {
	return h.HolidayType == HolidayTypeCompany
}

// IsSpecial 特別休日かチェック
func (h *Holiday) IsSpecial() bool {
	return h.HolidayType == HolidayTypeSpecial
}

// IsWeekend 土日かチェック（静的メソッド）
func IsWeekend(date time.Time) bool {
	weekday := date.Weekday()
	return weekday == time.Saturday || weekday == time.Sunday
}

// IsBusinessDay 営業日かチェック（土日祝日でない）
func IsBusinessDay(date time.Time, holidays []Holiday) bool {
	if IsWeekend(date) {
		return false
	}

	for _, holiday := range holidays {
		if holiday.HolidayDate.Format("2006-01-02") == date.Format("2006-01-02") {
			return false
		}
	}

	return true
}

// GetHolidayByDate 指定日の休日情報を取得
func GetHolidayByDate(date time.Time, holidays []Holiday) *Holiday {
	for _, holiday := range holidays {
		if holiday.HolidayDate.Format("2006-01-02") == date.Format("2006-01-02") {
			return &holiday
		}
	}
	return nil
}

// CountBusinessDays 指定期間内の営業日数を計算
func CountBusinessDays(startDate, endDate time.Time, holidays []Holiday) int {
	if startDate.After(endDate) {
		return 0
	}

	businessDays := 0
	currentDate := startDate

	for !currentDate.After(endDate) {
		if IsBusinessDay(currentDate, holidays) {
			businessDays++
		}
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	return businessDays
}

// GetMonthBusinessDays 指定月の営業日数を計算
func GetMonthBusinessDays(year, month int, holidays []Holiday) int {
	firstDay := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)

	return CountBusinessDays(firstDay, lastDay, holidays)
}

// ValidateHolidayType 休日タイプのバリデーション
func ValidateHolidayType(holidayType string) bool {
	switch HolidayType(holidayType) {
	case HolidayTypeNational, HolidayTypeCompany, HolidayTypeSpecial, HolidayTypeOther:
		return true
	default:
		return false
	}
}
