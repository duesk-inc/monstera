package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupExpenseRoutes /api/v1/expenses を登録
func SetupExpenseRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, expenseHandler *handler.ExpenseHandler) {
    expenses := api.Group("/expenses")
    expenses.Use(authRequired)
    {
        // 基本CRUD操作
        expenses.POST("", expenseHandler.CreateExpense)
        expenses.GET("/categories", expenseHandler.GetCategories)
        expenses.GET("", expenseHandler.GetExpenseList)
        expenses.GET("/:id", expenseHandler.GetExpense)
        expenses.PUT("/:id", expenseHandler.UpdateExpense)
        expenses.DELETE("/:id", expenseHandler.DeleteExpense)

        // 申請提出・取消
        expenses.POST("/:id/submit", expenseHandler.SubmitExpense)
        expenses.POST("/:id/cancel", expenseHandler.CancelExpense)

        // ファイルアップロード関連
        expenses.POST("/upload-url", expenseHandler.GenerateUploadURL)
        expenses.POST("/upload-complete", expenseHandler.CompleteUpload)
        expenses.DELETE("/upload", expenseHandler.DeleteUploadedFile)

        // 上限チェック
        expenses.GET("/check-limits", expenseHandler.CheckExpenseLimits)

        // 集計
        expenses.GET("/summary", expenseHandler.GetExpenseSummary)
    }
}

