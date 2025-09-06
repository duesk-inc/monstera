package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupUserRoutes /api/v1/users を登録
func SetupUserRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, userRoleHandler *handler.UserRoleHandler) {
    users := api.Group("/users")
    users.Use(authRequired)
    {
        users.PUT("/default-role", userRoleHandler.UpdateDefaultRole)
    }
}

