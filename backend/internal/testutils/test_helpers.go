package testutils

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/duesk/monstera/internal/testdata"
)

// MockUser はテスト用のユーザーデータを表します
type MockUser struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Role         int       `json:"role"`
	DepartmentID uuid.UUID `json:"department_id"`
}

// MockWeeklyReport はテスト用の週報データを表します
type MockWeeklyReport struct {
	ID                       uuid.UUID         `json:"id"`
	UserID                   uuid.UUID         `json:"user_id"`
	StartDate                time.Time         `json:"start_date"`
	EndDate                  time.Time         `json:"end_date"`
	Status                   string            `json:"status"`
	Mood                     int               `json:"mood"`
	WeeklyRemarks            string            `json:"weekly_remarks"`
	WorkplaceName            string            `json:"workplace_name"`
	WorkplaceHours           string            `json:"workplace_hours"`
	WorkplaceChangeRequested bool              `json:"workplace_change_requested"`
	TotalWorkHours           float64           `json:"total_work_hours"`
	ClientTotalWorkHours     float64           `json:"client_total_work_hours"`
	DailyRecords             []MockDailyRecord `json:"daily_records"`
	SubmittedAt              *time.Time        `json:"submitted_at"`
	CreatedAt                time.Time         `json:"created_at"`
	UpdatedAt                time.Time         `json:"updated_at"`
}

// MockDailyRecord はテスト用の日次記録データを表します
type MockDailyRecord struct {
	ID              uuid.UUID `json:"id"`
	WeeklyReportID  uuid.UUID `json:"weekly_report_id"`
	Date            time.Time `json:"date"`
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
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// CreateMockUser はテスト用のユーザーを作成します
func CreateMockUser(role int) *MockUser {
	return &MockUser{
		ID:           uuid.New(),
		Email:        testdata.DefaultTestEmail,
		FirstName:    "Test",
		LastName:     "User",
		Role:         role,
		DepartmentID: uuid.New(),
	}
}

// CreateMockWeeklyReport はテスト用の週報を作成します
func CreateMockWeeklyReport(userID uuid.UUID, status string) *MockWeeklyReport {
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2024, 1, 7, 0, 0, 0, 0, time.UTC)

	weeklyReport := &MockWeeklyReport{
		ID:                       uuid.New(),
		UserID:                   userID,
		StartDate:                startDate,
		EndDate:                  endDate,
		Status:                   status,
		Mood:                     3,
		WeeklyRemarks:            "Test weekly remarks",
		WorkplaceName:            "Test Workplace",
		WorkplaceHours:           "40",
		WorkplaceChangeRequested: false,
		TotalWorkHours:           40.0,
		ClientTotalWorkHours:     40.0,
		DailyRecords:             CreateMockDailyRecords(startDate, endDate),
		CreatedAt:                time.Now(),
		UpdatedAt:                time.Now(),
	}

	if status == "submitted" {
		now := time.Now()
		weeklyReport.SubmittedAt = &now
	}

	return weeklyReport
}

// CreateMockDailyRecords はテスト用の日次記録を作成します
func CreateMockDailyRecords(startDate, endDate time.Time) []MockDailyRecord {
	var records []MockDailyRecord

	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		record := MockDailyRecord{
			ID:              uuid.New(),
			Date:            d,
			StartTime:       "09:00",
			EndTime:         "18:00",
			BreakTime:       1.0,
			WorkHours:       8.0,
			ClientStartTime: "",
			ClientEndTime:   "",
			ClientBreakTime: 0.0,
			ClientWorkHours: 0.0,
			HasClientWork:   false,
			Remarks:         "",
			IsHolidayWork:   false,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		// Weekend records have no work hours
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			record.StartTime = ""
			record.EndTime = ""
			record.BreakTime = 0.0
			record.WorkHours = 0.0
		}

		records = append(records, record)
	}

	return records
}

// AssertErrorResponse はエラーレスポンスを検証します
func AssertErrorResponse(t *testing.T, recorder *httptest.ResponseRecorder, expectedStatus int, expectedMessage string) {
	assert.Equal(t, expectedStatus, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response["error"], expectedMessage)
}

// AssertSuccessResponse は成功レスポンスを検証します
func AssertSuccessResponse(t *testing.T, recorder *httptest.ResponseRecorder, expectedStatus int) map[string]interface{} {
	assert.Equal(t, expectedStatus, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "data")

	return response
}

// SetupGinTest はテスト用のGinエンジンを設定します
func SetupGinTest() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

// CreateAuthenticatedRequest は認証済みリクエストを作成します
func CreateAuthenticatedRequest(method, url string, body interface{}, userID uuid.UUID, role int) (*http.Request, error) {
	req := httptest.NewRequest(method, url, nil)

	// Mock authentication context
	ctx := req.Context()
	ctx = SetUserIDToContext(ctx, userID.String())
	ctx = SetUserRoleToContext(ctx, role)
	req = req.WithContext(ctx)

	return req, nil
}

// Context helpers for testing
type contextKey string

const (
	userIDKey   contextKey = "user_id"
	userRoleKey contextKey = "user_role"
)

func SetUserIDToContext(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func SetUserRoleToContext(ctx context.Context, role int) context.Context {
	return context.WithValue(ctx, userRoleKey, role)
}

func GetUserIDFromContext(ctx context.Context) string {
	if userID, ok := ctx.Value(userIDKey).(string); ok {
		return userID
	}
	return ""
}

func GetUserRoleFromContext(ctx context.Context) int {
	if role, ok := ctx.Value(userRoleKey).(int); ok {
		return role
	}
	return 0
}
