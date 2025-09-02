package handler_test

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "go.uber.org/zap"

    "github.com/duesk/monstera/internal/dto"
    "github.com/duesk/monstera/internal/handler"
    "github.com/duesk/monstera/internal/model"
    "github.com/duesk/monstera/internal/service"
)

// --- Mocks ---

type MockAdminWeeklyReportService struct{ mock.Mock }

func (m *MockAdminWeeklyReportService) GetWeeklyReports(ctx context.Context, page, limit int, status, userID, dateFrom, dateTo string) ([]dto.AdminWeeklyReportDTO, int64, error) {
    args := m.Called(ctx, page, limit, status, userID, dateFrom, dateTo)
    if v, ok := args.Get(0).([]dto.AdminWeeklyReportDTO); ok {
        return v, args.Get(1).(int64), args.Error(2)
    }
    return nil, 0, args.Error(2)
}
func (m *MockAdminWeeklyReportService) GetWeeklyReportDetail(ctx context.Context, reportID string) (*dto.AdminWeeklyReportDetailDTO, error) {
    args := m.Called(ctx, reportID)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).(*dto.AdminWeeklyReportDetailDTO), args.Error(1)
}
func (m *MockAdminWeeklyReportService) CommentWeeklyReport(ctx context.Context, reportID, userID string, comment string) error {
    args := m.Called(ctx, reportID, userID, comment)
    return args.Error(0)
}
func (m *MockAdminWeeklyReportService) GetMonthlyAttendance(ctx context.Context, month string) ([]dto.MonthlyAttendanceDTO, error) {
    args := m.Called(ctx, month)
    if v, ok := args.Get(0).([]dto.MonthlyAttendanceDTO); ok { return v, args.Error(1) }
    return nil, args.Error(1)
}
func (m *MockAdminWeeklyReportService) GetFollowUpRequiredUsers(ctx context.Context) ([]dto.FollowUpUserDTO, error) {
    args := m.Called(ctx)
    if v, ok := args.Get(0).([]dto.FollowUpUserDTO); ok { return v, args.Error(1) }
    return nil, args.Error(1)
}
func (m *MockAdminWeeklyReportService) ExportMonthlyReport(ctx context.Context, month, format string) ([]byte, string, string, error) {
    args := m.Called(ctx, month, format)
    return nil, "", "", args.Error(3)
}
func (m *MockAdminWeeklyReportService) GetWeeklyReportSummary(ctx context.Context, startDate, endDate time.Time, departmentID *string) (*dto.WeeklyReportSummaryStatsDTO, error) {
    args := m.Called(ctx, startDate, endDate, departmentID)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).(*dto.WeeklyReportSummaryStatsDTO), args.Error(1)
}
func (m *MockAdminWeeklyReportService) GetMonthlySummary(ctx context.Context, year int, month int, departmentID *string) (*dto.MonthlySummaryDTO, error) {
    args := m.Called(ctx, year, month, departmentID)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).(*dto.MonthlySummaryDTO), args.Error(1)
}
func (m *MockAdminWeeklyReportService) ApproveWeeklyReport(ctx context.Context, reportID, approverID string, comment *string) error {
    args := m.Called(ctx, reportID, approverID, comment)
    return args.Error(0)
}
func (m *MockAdminWeeklyReportService) RejectWeeklyReport(ctx context.Context, reportID, approverID string, comment string) error {
    args := m.Called(ctx, reportID, approverID, comment)
    return args.Error(0)
}

// ExportService mock (minimal)
type MockExportService struct{ mock.Mock }

func (m *MockExportService) CreateExportJob(ctx context.Context, userID string, jobType model.ExportJobType, format model.ExportJobFormat, parameters json.RawMessage) (*model.ExportJob, error) {
    args := m.Called(ctx, userID, jobType, format, parameters)
    return nil, args.Error(1)
}
func (m *MockExportService) ProcessExportJob(ctx context.Context, jobID string) error {
    args := m.Called(ctx, jobID); return args.Error(0)
}
func (m *MockExportService) GetExportJob(ctx context.Context, jobID string) (*model.ExportJob, error) {
    args := m.Called(ctx, jobID); return nil, args.Error(1)
}
func (m *MockExportService) ExportData(ctx context.Context) error { args := m.Called(ctx); return args.Error(0) }

// --- Helpers ---
func setupAdminWeeklyHandler() (handler.AdminWeeklyReportHandler, *MockAdminWeeklyReportService) {
    mockSvc := new(MockAdminWeeklyReportService)
    mockExport := new(MockExportService)
    h := handler.NewAdminWeeklyReportHandler(mockSvc, mockExport, zap.NewNop())
    return h, mockSvc
}

// --- Tests ---

func TestApproveWeeklyReport_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h, svc := setupAdminWeeklyHandler()

    router := gin.Default()
    router.Use(func(c *gin.Context) { c.Set("user_id", "admin-1"); c.Next() })
    router.PUT("/api/v1/admin/engineers/weekly-reports/:id/approve", func(c *gin.Context) { h.ApproveWeeklyReport(c) })

    svc.On("ApproveWeeklyReport", mock.Anything, "wr-1", "admin-1", mock.Anything).Return(nil)

    req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/engineers/weekly-reports/wr-1/approve", nil)
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
}

func TestApproveWeeklyReport_NotFound(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h, svc := setupAdminWeeklyHandler()

    router := gin.Default()
    router.Use(func(c *gin.Context) { c.Set("user_id", "admin-1"); c.Next() })
    router.PUT("/api/v1/admin/engineers/weekly-reports/:id/approve", func(c *gin.Context) { h.ApproveWeeklyReport(c) })

    svc.On("ApproveWeeklyReport", mock.Anything, "wr-404", "admin-1", mock.Anything).Return(assert.AnError)

    req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/engineers/weekly-reports/wr-404/approve", nil)
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    // Handler maps generic error to 422; NotFoundケースはサービス側のメッセージで分岐する実装に合わせるならここを調整
    // 現在は文字列一致を使用していないため、422の想定
    assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

func TestRejectWeeklyReport_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h, svc := setupAdminWeeklyHandler()

    router := gin.Default()
    router.Use(func(c *gin.Context) { c.Set("user_id", "admin-1"); c.Next() })
    router.PUT("/api/v1/admin/engineers/weekly-reports/:id/reject", func(c *gin.Context) { h.RejectWeeklyReport(c) })

    body, _ := json.Marshal(map[string]string{"comment": "不備があります"})
    svc.On("RejectWeeklyReport", mock.Anything, "wr-2", "admin-1", "不備があります").Return(nil)

    req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/engineers/weekly-reports/wr-2/reject", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
}

func TestRejectWeeklyReport_ValidationError(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h, _ := setupAdminWeeklyHandler()

    router := gin.Default()
    router.Use(func(c *gin.Context) { c.Set("user_id", "admin-1"); c.Next() })
    router.PUT("/api/v1/admin/engineers/weekly-reports/:id/reject", func(c *gin.Context) { h.RejectWeeklyReport(c) })

    req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/engineers/weekly-reports/wr-3/reject", bytes.NewBufferString(`{}`))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestReturnWeeklyReport_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h, svc := setupAdminWeeklyHandler()

    router := gin.Default()
    router.Use(func(c *gin.Context) { c.Set("user_id", "admin-1"); c.Next() })
    router.PUT("/api/v1/admin/engineers/weekly-reports/:id/return", func(c *gin.Context) { h.ReturnWeeklyReport(c) })

    body, _ := json.Marshal(map[string]string{"comment": "再編集してください"})
    svc.On("ReturnWeeklyReport", mock.Anything, "wr-5", "admin-1", "再編集してください").Return(nil)

    req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/engineers/weekly-reports/wr-5/return", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
}

func TestReturnWeeklyReport_ValidationError(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h, _ := setupAdminWeeklyHandler()

    router := gin.Default()
    router.Use(func(c *gin.Context) { c.Set("user_id", "admin-1"); c.Next() })
    router.PUT("/api/v1/admin/engineers/weekly-reports/:id/return", func(c *gin.Context) { h.ReturnWeeklyReport(c) })

    req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/engineers/weekly-reports/wr-6/return", bytes.NewBufferString(`{}`))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}
