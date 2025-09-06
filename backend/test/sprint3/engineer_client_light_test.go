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

type mockClientService struct{}

func (m *mockClientService) GetClients(_ context.Context, _ int, _ int, _ string) ([]dto.ClientDTO, int64, error) { return nil, 0, nil }
func (m *mockClientService) GetClientByID(_ context.Context, _ string) (*dto.ClientDetailDTO, error) { return nil, nil }
func (m *mockClientService) CreateClient(_ context.Context, _ *dto.CreateClientRequest) (*dto.ClientDTO, error) {
    return nil, nil
}
func (m *mockClientService) UpdateClient(_ context.Context, _ string, _ *dto.UpdateClientRequest) (*dto.ClientDTO, error) {
    return nil, nil
}
func (m *mockClientService) DeleteClient(_ context.Context, _ string) error { return nil }
func (m *mockClientService) GetClientProjects(_ context.Context, _ string) ([]dto.ProjectDTO, error) { return nil, nil }
func (m *mockClientService) ListClientsLight(_ context.Context, page, limit int, q string) ([]dto.ClientLightItem, int64, error) {
    items := []dto.ClientLightItem{{ID: "c1", CompanyName: "Acme"}, {ID: "c2", CompanyName: "Beta"}}
    return items, int64(len(items)), nil
}

func TestEngineerClient_Light_Success(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    h := handler.NewClientHandler(&mockClientService{}, zap.NewNop())
    r.GET("/api/v1/engineer/clients", h.GetClientsLight)

    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodGet, "/api/v1/engineer/clients?light=true&q=Ac&page=1&limit=200", nil)
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
    var resp map[string]interface{}
    _ = json.Unmarshal(w.Body.Bytes(), &resp)
    assert.Equal(t, float64(2), resp["total"]) // numbers become float64 in json
    // limitは>100のときデフォルト20へ正規化（ハンドラ実装仕様）
    assert.Equal(t, float64(20), resp["limit"])
}

func TestEngineerClient_Light_RequireLightFlag(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    h := handler.NewClientHandler(&mockClientService{}, zap.NewNop())
    r.GET("/api/v1/engineer/clients", h.GetClientsLight)

    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodGet, "/api/v1/engineer/clients", nil)
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}
