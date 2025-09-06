package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupSkillSheetRoutes /api/v1/skill-sheet を登録
func SetupSkillSheetRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, skillSheetHandler *handler.SkillSheetHandler) {
    skill := api.Group("/skill-sheet")
    skill.Use(authRequired)
    {
        skill.GET("", skillSheetHandler.GetSkillSheet)
        skill.PUT("", skillSheetHandler.SaveSkillSheet)
        skill.POST("/temp-save", skillSheetHandler.TempSaveSkillSheet)
        // PDF 出力は v0 除外
    }
}

