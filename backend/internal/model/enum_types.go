package model

import (
	"database/sql/driver"
	"fmt"
)

// WeeklyReportStatusEnum is a custom type for handling MySQL ENUM values
type WeeklyReportStatusEnum string

// Scan implements the sql.Scanner interface for database scanning
func (s *WeeklyReportStatusEnum) Scan(value interface{}) error {
	if value == nil {
		*s = WeeklyReportStatusEnum("")
		return nil
	}

	switch v := value.(type) {
	case []byte:
		*s = WeeklyReportStatusEnum(string(v))
		return nil
	case string:
		*s = WeeklyReportStatusEnum(v)
		return nil
	default:
		return fmt.Errorf("cannot scan type %T into WeeklyReportStatusEnum", value)
	}
}

// Value implements the driver.Valuer interface for database writing
func (s WeeklyReportStatusEnum) Value() (driver.Value, error) {
	return string(s), nil
}

// String returns the string representation
func (s WeeklyReportStatusEnum) String() string {
	return string(s)
}

// MarshalJSON implements json.Marshaler
func (s WeeklyReportStatusEnum) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, string(s))), nil
}

// UnmarshalJSON implements json.Unmarshaler
func (s *WeeklyReportStatusEnum) UnmarshalJSON(data []byte) error {
	if len(data) >= 2 && data[0] == '"' && data[len(data)-1] == '"' {
		*s = WeeklyReportStatusEnum(data[1 : len(data)-1])
		return nil
	}
	return fmt.Errorf("WeeklyReportStatusEnum must be a string")
}
