package sprint3_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "go.uber.org/zap"
)

// Contract check: POST /api/v1/projects returns common error envelope on validation error
func TestProjectHandler_Create_ErrorEnvelope(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    h := handler.NewProjectHandler(nil, zap.NewNop())
    r.POST("/api/v1/projects", h.Create)

    // Missing required fields
    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodPost, "/api/v1/projects", bytes.NewBufferString(`{"project_name":"","client_id":""}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
    var resp map[string]interface{}
    _ = json.Unmarshal(w.Body.Bytes(), &resp)
    assert.Equal(t, "validation_error", resp["code"])
    _, okMsg := resp["message"]
    _, okErrs := resp["errors"]
    assert.True(t, okMsg)
    assert.True(t, okErrs)
}

