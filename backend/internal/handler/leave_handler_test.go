package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "go.uber.org/zap"

    "github.com/duesk/monstera/internal/dto"
)

// ========== テスト用モック ==========

type mockLeaveService struct{}

func (m *mockLeaveService) GetLeaveTypes(_ context.Context) ([]dto.LeaveTypeResponse, error) {
    return nil, nil
}

func (m *mockLeaveService) GetUserLeaveBalances(_ context.Context, _ string) ([]dto.UserLeaveBalanceResponse, error) {
    return nil, nil
}

func (m *mockLeaveService) CreateLeaveRequest(_ context.Context, _ dto.LeaveRequestRequest) (dto.LeaveRequestResponse, error) {
    return dto.LeaveRequestResponse{}, nil
}

func (m *mockLeaveService) GetLeaveRequestsByUserID(_ context.Context, _ string) ([]dto.LeaveRequestResponse, error) {
    // 正常系のモックデータ
    return []dto.LeaveRequestResponse{
        {
            ID:            "req-1",
            UserID:        "user-1",
            LeaveTypeID:   "paid",
            LeaveTypeName: "有給休暇",
            RequestDate:   "2025-01-20",
            IsHourlyBased: false,
            Reason:        "通院",
            TotalDays:     1.0,
            Status:        "pending",
            Details: []dto.LeaveRequestDetailResponse{
                {ID: "det-1", LeaveDate: "2025-01-30", DayValue: 1.0},
            },
        },
    }, nil
}

func (m *mockLeaveService) GetHolidaysByYear(_ context.Context, _ int) ([]dto.HolidayResponse, error) {
    return nil, nil
}

func (m *mockLeaveService) GetSubstituteLeaveGrants(_ context.Context, _ string) ([]dto.SubstituteLeaveGrantResponse, error) {
    return nil, nil
}

func (m *mockLeaveService) GetSubstituteLeaveGrantSummary(_ context.Context, _ string) (dto.SubstituteLeaveGrantSummaryResponse, error) {
    return dto.SubstituteLeaveGrantSummaryResponse{}, nil
}

func (m *mockLeaveService) CreateSubstituteLeaveGrant(_ context.Context, _ dto.SubstituteLeaveGrantRequest) (dto.SubstituteLeaveGrantResponse, error) {
    return dto.SubstituteLeaveGrantResponse{}, nil
}

func (m *mockLeaveService) UpdateSubstituteLeaveGrant(_ context.Context, _ string, _ dto.SubstituteLeaveGrantRequest) (dto.SubstituteLeaveGrantResponse, error) {
    return dto.SubstituteLeaveGrantResponse{}, nil
}

func (m *mockLeaveService) DeleteSubstituteLeaveGrant(_ context.Context, _ string) error { return nil }

func (m *mockLeaveService) UpdateSubstituteLeaveUsage(_ context.Context, _ string, _ float64) error { return nil }

// ========== ヘルパー ==========

func setupGinLocal() *gin.Engine {
    gin.SetMode(gin.TestMode)
    return gin.New()
}

// ========== テスト ==========

func TestLeaveHandler_GetLeaveRequests_Success(t *testing.T) {
    // Arrange
    router := setupGinLocal()

    // 認証ミドルウェア相当: user_id をコンテキストに詰める
    router.Use(func(c *gin.Context) {
        c.Set("user_id", "user-1")
        c.Next()
    })

    svc := &mockLeaveService{}
    logger := zap.NewNop()
    h := NewLeaveHandler(svc, logger)

    router.GET("/api/v1/leave/requests", h.GetLeaveRequests)

    // Act
    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodGet, "/api/v1/leave/requests", nil)
    router.ServeHTTP(w, req)

    // Assert
    assert.Equal(t, http.StatusOK, w.Code)

    var resp []dto.LeaveRequestResponse
    err := json.Unmarshal(w.Body.Bytes(), &resp)
    assert.NoError(t, err)
    assert.Len(t, resp, 1)
    assert.Equal(t, "req-1", resp[0].ID)
    assert.Equal(t, "有給休暇", resp[0].LeaveTypeName)
    if assert.Len(t, resp[0].Details, 1) {
        assert.Equal(t, "2025-01-30", resp[0].Details[0].LeaveDate)
    }
}
