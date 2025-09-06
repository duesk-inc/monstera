package sprint3_test

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/duesk/monstera/internal/middleware"
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "go.uber.org/zap"
)

func TestEngineerOnly_AllowsEngineer(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    r.Use(func(c *gin.Context) { c.Set("user_id", "u1"); c.Set("role", "engineer"); c.Next() })
    r.Use(middleware.EngineerOnly(zap.NewNop()))
    r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodGet, "/x", nil)
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
}

func TestEngineerOnly_RejectsAdmin(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    r.Use(func(c *gin.Context) { c.Set("user_id", "u1"); c.Set("role", "admin"); c.Next() })
    r.Use(middleware.EngineerOnly(zap.NewNop()))
    r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

    w := httptest.NewRecorder()
    req := httptest.NewRequest(http.MethodGet, "/x", nil)
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusForbidden, w.Code)
}

