package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupProfileRoutes /api/v1/profile を登録
func SetupProfileRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, profileHandler *handler.ProfileHandler) {
    profile := api.Group("/profile")
    profile.Use(authRequired)
    {
        profile.GET("", profileHandler.GetProfile)
        profile.GET("/with-work-history", profileHandler.GetProfileWithWorkHistory)
        profile.POST("", profileHandler.SaveProfile)
        profile.POST("/temp-save", profileHandler.TempSaveProfile)
        profile.GET("/history", profileHandler.GetProfileHistory)
        profile.GET("/history/latest", profileHandler.GetProfileHistory)
        profile.GET("/common-certifications", profileHandler.GetCommonCertifications)
        profile.GET("/technology-categories", profileHandler.GetTechnologyCategories)
    }
}

