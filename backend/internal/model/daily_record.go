package model

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// TimeString はデータベースの文字列形式の時間を扱うためのカスタム型
type TimeString struct {
	TimeValue time.Time
	Valid     bool
}

// Scan は文字列型や時間型をTimeStringにスキャンする
func (ts *TimeString) Scan(value interface{}) error {
	if value == nil {
		ts.TimeValue, ts.Valid = time.Time{}, false
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		ts.TimeValue, ts.Valid = v, true
		return nil
	case []byte:
		t, err := parseTimeString(string(v))
		if err != nil {
			ts.Valid = false
			return nil // エラーを返さず、無効な値として処理
		}
		ts.TimeValue, ts.Valid = t, true
		return nil
	case string:
		t, err := parseTimeString(v)
		if err != nil {
			ts.Valid = false
			return nil // エラーを返さず、無効な値として処理
		}
		ts.TimeValue, ts.Valid = t, true
		return nil
	}

	return fmt.Errorf("cannot scan %T into TimeString", value)
}

// Value はTimeStringをデータベースに格納可能な値に変換する
func (ts TimeString) Value() (driver.Value, error) {
	if !ts.Valid {
		return nil, nil
	}
	return ts.TimeValue.Format("15:04:05"), nil
}

// GormDataType はGORMに型情報を提供する
func (TimeString) GormDataType() string {
	return "varchar"
}

// GormDBDataType はGORMにデータベース固有の型情報を提供する
func (TimeString) GormDBDataType(db *gorm.DB, field *schema.Field) string {
	switch db.Dialector.Name() {
	case "mysql", "sqlite":
		return "VARCHAR(8)"
	default:
		return "VARCHAR(8)"
	}
}

// MarshalJSON はTimeStringをJSON文字列に変換する
func (ts TimeString) MarshalJSON() ([]byte, error) {
	if !ts.Valid {
		return []byte("null"), nil
	}
	return []byte(fmt.Sprintf("\"%s\"", ts.TimeValue.Format("15:04:05"))), nil
}

// UnmarshalJSON はJSON文字列からTimeStringに変換する
func (ts *TimeString) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		ts.Valid = false
		return nil
	}

	s := strings.Trim(string(data), "\"")
	t, err := parseTimeString(s)
	if err != nil {
		return err
	}

	ts.TimeValue = t
	ts.Valid = true
	return nil
}

// String はTimeStringを文字列として返す
func (ts TimeString) String() string {
	if !ts.Valid {
		return ""
	}
	return ts.TimeValue.Format("15:04:05")
}

// Time はTimeStringのtime.Time値を返す
func (ts TimeString) Time() *time.Time {
	if !ts.Valid {
		return nil
	}
	t := ts.TimeValue
	return &t
}

// parseTimeString は時刻文字列をtime.Time型に変換するヘルパー関数
func parseTimeString(timeStr string) (time.Time, error) {
	// 時間のパターンを複数試す
	timeStr = strings.TrimSpace(timeStr)
	formats := []string{
		"15:04:05",            // HH:MM:SS
		"15:04",               // HH:MM
		"2006-01-02 15:04:05", // YYYY-MM-DD HH:MM:SS
		"2006-01-02 15:04",    // YYYY-MM-DD HH:MM
	}

	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			// 日付が含まれていない形式の場合、現在の日付を追加
			if format == "15:04:05" || format == "15:04" {
				now := time.Now()
				return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), t.Second(), 0, time.Local), nil
			}
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unsupported time format: %s", timeStr)
}

// DailyRecord 日次勤怠記録モデル
type DailyRecord struct {
	ID              uuid.UUID    `gorm:"type:varchar(36);primary_key" json:"id"`
	WeeklyReportID  uuid.UUID    `gorm:"type:varchar(36);not null" json:"weekly_report_id"`
	WeeklyReport    WeeklyReport `gorm:"foreignKey:WeeklyReportID" json:"-"`
	Date            time.Time    `gorm:"not null" json:"date"`
	StartTime       string       `json:"start_time" gorm:"column:start_time;type:varchar(10)"`
	EndTime         string       `json:"end_time" gorm:"column:end_time;type:varchar(10)"`
	BreakTime       float64      `json:"break_time"`
	WorkHours       float64      `json:"work_hours"`
	ClientStartTime string       `json:"client_start_time" gorm:"column:client_start_time;type:varchar(10)"`
	ClientEndTime   string       `json:"client_end_time" gorm:"column:client_end_time;type:varchar(10)"`
	ClientBreakTime float64      `json:"client_break_time"`
	ClientWorkHours float64      `json:"client_work_hours"`
	HasClientWork   bool         `gorm:"default:false" json:"has_client_work"`
	Remarks         string       `gorm:"type:text" json:"remarks"`
	IsHolidayWork   bool         `gorm:"default:false" json:"is_holiday_work"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

// BeforeCreate UUIDを生成
func (dr *DailyRecord) BeforeCreate(tx *gorm.DB) error {
	if dr.ID == uuid.Nil {
		dr.ID = uuid.New()
	}
	return nil
}
