package sprint3_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "context"
    "github.com/duesk/monstera/internal/dto"
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "go.uber.org/zap"
)

// mockProjectService implements service.ProjectService for handler tests
type mockProjectService struct{}

func (m *mockProjectService) List(_ context.Context, _ dto.ProjectListQuery) (*dto.ProjectListResponse, error) {
    items := []dto.ProjectMinimalDTO{{ID: "p1", ProjectName: "Alpha", Status: "draft", ClientID: "c1"}}
    return &dto.ProjectListResponse{Items: items, Total: 1, Page: 1, Limit: 20, TotalPages: 1}, nil
}
func (m *mockProjectService) Get(_ context.Context, _ string) (*dto.ProjectMinimalDTO, error) {
    return &dto.ProjectMinimalDTO{ID: "p1", ProjectName: "Alpha", Status: "draft", ClientID: "c1"}, nil
}
func (m *mockProjectService) Create(_ context.Context, _ *dto.ProjectCreate) (*dto.ProjectMinimalDTO, error) {
    return &dto.ProjectMinimalDTO{ID: "p2", ProjectName: "New", Status: "draft", ClientID: "c1"}, nil
}
func (m *mockProjectService) Update(_ context.Context, _ string, _ *dto.ProjectUpdate) (*dto.ProjectMinimalDTO, error) {
    return &dto.ProjectMinimalDTO{ID: "p1", ProjectName: "Alpha2", Status: "active", ClientID: "c1"}, nil
}

func TestProjectHandler_List_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    h := handler.NewProjectHandler(&mockProjectService{}, zap.NewNop())
    r.GET("/api/v1/projects", h.List)

    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodGet, "/api/v1/projects?q=a&page=1&limit=20&sort_by=created_at&sort_order=desc", nil)
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
    var resp map[string]interface{}
    _ = json.Unmarshal(w.Body.Bytes(), &resp)
    assert.Equal(t, float64(1), resp["total"])
    assert.Equal(t, float64(1), resp["page"])
    assert.NotNil(t, resp["items"])
}
