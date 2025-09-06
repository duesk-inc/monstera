package routes

import (
    "github.com/duesk/monstera/internal/handler"
    "github.com/gin-gonic/gin"
)

// SetupLeaveRoutes /api/v1/leave と /api/v1/leave/holidays を登録
func SetupLeaveRoutes(api *gin.RouterGroup, authRequired gin.HandlerFunc, leaveHandler handler.LeaveHandler) {
    leave := api.Group("/leave")
    leave.Use(authRequired)
    {
        // 休暇種別・残数・申請
        leave.GET("/types", leaveHandler.GetLeaveTypes)
        leave.GET("/balances", leaveHandler.GetUserLeaveBalances)
        leave.GET("/requests", leaveHandler.GetLeaveRequests)
        leave.POST("/requests", leaveHandler.CreateLeaveRequest)

        // 休日情報
        leave.GET("/holidays", leaveHandler.GetHolidays)
    }
}

