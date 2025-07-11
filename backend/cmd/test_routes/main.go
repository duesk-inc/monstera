package main

import (
	"fmt"
	"sort"

	"github.com/gin-gonic/gin"
)

func main() {
	// テスト用のルーターを作成
	router := gin.New()

	// ルートパスのハンドラー
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "OK"})
	})

	// APIグループ
	v1 := router.Group("/api/v1")

	// 管理者用週報エンドポイント（設計書準拠）
	adminWeeklyReports := v1.Group("/admin/weekly-reports")
	{
		// 未提出者管理
		adminWeeklyReports.GET("/unsubmitted", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "unsubmitted"})
		})
		adminWeeklyReports.POST("/remind", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "remind"})
		})

		// 月次サマリー
		adminWeeklyReports.GET("/summary", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "summary"})
		})

		// エクスポート（未実装）
		adminWeeklyReports.POST("/export", func(c *gin.Context) {
			c.JSON(501, gin.H{"error": "Not implemented"})
		})
	}

	// アラート設定エンドポイント
	alertSettings := v1.Group("/admin/alert-settings")
	{
		alertSettings.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-settings list"})
		})
		alertSettings.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-settings detail"})
		})
		alertSettings.POST("", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-settings create"})
		})
		alertSettings.PUT("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-settings update"})
		})
		alertSettings.DELETE("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-settings delete"})
		})
	}

	// アラート履歴エンドポイント
	alertHistories := v1.Group("/admin/alert-histories")
	{
		alertHistories.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-histories list"})
		})
		alertHistories.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-histories detail"})
		})
		alertHistories.PUT("/:id/status", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alert-histories status update"})
		})
	}

	// アラートサマリー
	alerts := v1.Group("/admin/alerts")
	{
		alerts.GET("/summary", func(c *gin.Context) {
			c.JSON(200, gin.H{"endpoint": "alerts summary"})
		})
	}

	// 登録されているルートを表示
	fmt.Println("=== 登録されているエンドポイント ===")
	fmt.Println()

	routes := router.Routes()
	var paths []string
	for _, route := range routes {
		paths = append(paths, fmt.Sprintf("%-6s %s", route.Method, route.Path))
	}

	sort.Strings(paths)
	for _, path := range paths {
		fmt.Println(path)
	}

	fmt.Println()
	fmt.Println("=== サーバー起動 (ポート: 8081) ===")
	fmt.Println("別のターミナルで以下のコマンドでテスト可能:")
	fmt.Println("curl http://localhost:8081/api/v1/admin/weekly-reports/unsubmitted")
	fmt.Println()

	// サーバー起動
	if err := router.Run(":8081"); err != nil {
		fmt.Printf("サーバー起動エラー: %v\n", err)
	}
}
