package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
)

// AccountingDashboardHandler 経理ダッシュボードハンドラー
type AccountingDashboardHandler struct {
	billingService      service.BillingServiceInterface
	projectGroupService service.ProjectGroupServiceInterface
	freeeService        service.FreeeServiceInterface
	logger              *zap.Logger
}

// NewAccountingDashboardHandler 経理ダッシュボードハンドラーのコンストラクタ
func NewAccountingDashboardHandler(
	billingService service.BillingServiceInterface,
	projectGroupService service.ProjectGroupServiceInterface,
	freeeService service.FreeeServiceInterface,
	logger *zap.Logger,
) *AccountingDashboardHandler {
	return &AccountingDashboardHandler{
		billingService:      billingService,
		projectGroupService: projectGroupService,
		freeeService:        freeeService,
		logger:              logger,
	}
}

// GetDashboard ダッシュボード情報取得
// @Summary 経理ダッシュボード情報取得
// @Description 経理機能のダッシュボード情報を取得します
// @Tags AccountingDashboard
// @Accept json
// @Produce json
// @Param month query string false "対象月（YYYY-MM）" default(current month)
// @Success 200 {object} map[string]interface{} "ダッシュボード情報"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/accounting/dashboard [get]
func (h *AccountingDashboardHandler) GetDashboard(c *gin.Context) {
	// 対象月の取得（デフォルトは当月）
	targetMonth := c.Query("month")
	if targetMonth == "" {
		targetMonth = time.Now().Format("2006-01")
	}

	// 対象月の形式チェック
	if _, err := time.Parse("2006-01", targetMonth); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "対象月の形式が正しくありません（YYYY-MM）")
		return
	}

	// ユーザーIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "認証が必要です")
		return
	}

	_, ok := userID.(string)
	if !ok {
		utils.RespondError(c, http.StatusInternalServerError, "ユーザーID取得エラー")
		return
	}

	// 各種情報を並行で取得
	var (
		summary          *dto.BillingSummaryDTO
		recentInvoices   []*dto.InvoiceDTO
		projectGroups    []*dto.ProjectGroupDTO
		freeeStatus      interface{}
		upcomingBillings []map[string]interface{}
		activities       []map[string]interface{}
		summaryErr       error
		_                error // freeeErr 未使用
	)

	// 並行処理で各データを取得
	ch := make(chan bool, 6)

	// 請求サマリー取得 (TODO: メソッド実装待ち)
	go func() {
		// summary, summaryErr = h.billingService.GetBillingSummary(c.Request.Context(), targetMonth)
		summary = nil // 仮実装
		summaryErr = nil
		ch <- true
	}()

	// 最近の請求書取得 (TODO: メソッド実装待ち)
	go func() {
		// filters := map[string]interface{}{
		//	"billing_month": targetMonth,
		//	"limit":         10,
		// }
		// recentInvoices, _, invoicesErr = h.billingService.GetBillingHistory(c.Request.Context(), filters, 0, 10)
		recentInvoices = nil // 仮実装
		ch <- true
	}()

	// プロジェクトグループ取得 (TODO: メソッド実装待ち)
	go func() {
		// filters := map[string]interface{}{
		//	"is_active": true,
		// }
		// projectGroups, _, groupsErr = h.projectGroupService.ListProjectGroups(c.Request.Context(), filters, 0, 5)
		projectGroups = nil // 仮実装
		ch <- true
	}()

	// freee接続状態取得 (TODO: メソッド実装待ち)
	go func() {
		// freeeStatus, _ = h.freeeService.GetConnectionStatus(c.Request.Context(), userUUID)
		freeeStatus = nil // 仮実装
		ch <- true
	}()

	// 今後の請求予定取得 (TODO: メソッド実装待ち)
	go func() {
		// filters := map[string]interface{}{
		//	"status": "pending",
		//	"from":   time.Now().Format(time.RFC3339),
		// }
		// upcomingBillings, scheduledErr = h.billingService.GetScheduledBillings(c.Request.Context(), filters)
		upcomingBillings = make([]map[string]interface{}, 0) // 仮実装
		ch <- true
	}()

	// アクティビティ取得
	go func() {
		activities, _ = h.getRecentActivities(c.Request.Context(), targetMonth)
		ch <- true
	}()

	// 全ての処理完了を待つ
	for i := 0; i < 6; i++ {
		<-ch
	}

	// エラーチェック
	if summaryErr != nil {
		h.logger.Error("Failed to get billing summary", zap.Error(summaryErr))
		c.JSON(500, gin.H{"error": "請求サマリーの取得に失敗しました"})
		return
	}

	// KPI計算
	kpis := h.calculateKPIs(summary, recentInvoices, projectGroups)

	// チャート用データ生成
	chartData := h.generateChartData(summary, recentInvoices)

	// レスポンス構築
	response := map[string]interface{}{
		"month":             targetMonth,
		"kpis":              kpis,
		"billing_summary":   summary,
		"recent_invoices":   recentInvoices,
		"project_groups":    projectGroups,
		"freee_status":      freeeStatus,
		"upcoming_billings": upcomingBillings,
		"activities":        activities,
		"chart_data":        chartData,
		"last_updated":      time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// GetMonthlyTrend 月次トレンド取得
// @Summary 月次トレンド取得
// @Description 指定期間の月次請求トレンドを取得します
// @Tags AccountingDashboard
// @Accept json
// @Produce json
// @Param from query string false "開始月（YYYY-MM）"
// @Param to query string false "終了月（YYYY-MM）"
// @Param months query int false "過去何ヶ月分" default(6)
// @Success 200 {object} map[string]interface{} "月次トレンド"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/accounting/dashboard/trend [get]
func (h *AccountingDashboardHandler) GetMonthlyTrend(c *gin.Context) {
	var startMonth, endMonth string

	// 期間の決定
	if from := c.Query("from"); from != "" {
		startMonth = from
	}
	if to := c.Query("to"); to != "" {
		endMonth = to
	}

	// fromとtoが指定されていない場合はmonthsパラメータを使用
	if startMonth == "" || endMonth == "" {
		months := 6
		if monthsStr := c.Query("months"); monthsStr != "" {
			if m, err := strconv.Atoi(monthsStr); err == nil && m > 0 && m <= 24 {
				months = m
			}
		}

		now := time.Now()
		endMonth = now.Format("2006-01")
		startMonth = now.AddDate(0, -(months - 1), 0).Format("2006-01")
	}

	// 期間の妥当性チェック
	start, err := time.Parse("2006-01", startMonth)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "開始月の形式が正しくありません（YYYY-MM）")
		return
	}

	end, err := time.Parse("2006-01", endMonth)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "終了月の形式が正しくありません（YYYY-MM）")
		return
	}

	if start.After(end) {
		utils.RespondError(c, http.StatusBadRequest, "開始月は終了月より前である必要があります")
		return
	}

	// 月次データを取得
	monthlyData := make([]map[string]interface{}, 0)
	current := start

	for !current.After(end) {
		monthStr := current.Format("2006-01")

		// 該当月のサマリーを取得 (TODO: メソッド実装待ち)
		// summary, err := h.billingService.GetBillingSummary(c.Request.Context(), monthStr)
		err := error(nil) // 仮実装
		if err != nil {
			h.logger.Error("Failed to get monthly summary",
				zap.String("month", monthStr),
				zap.Error(err))
			// エラーの場合は0データとして扱う
			monthlyData = append(monthlyData, map[string]interface{}{
				"month":         monthStr,
				"total_amount":  0,
				"invoice_count": 0,
				"client_count":  0,
				"paid_amount":   0,
				"unpaid_amount": 0,
				"paid_rate":     0,
			})
		} else {
			// TODO: 実際のsummaryデータを使用
			monthlyData = append(monthlyData, map[string]interface{}{
				"month":         monthStr,
				"total_amount":  0, // summary.TotalAmount,
				"invoice_count": 0, // summary.InvoiceCount,
				"client_count":  0, // summary.ClientCount,
				"paid_amount":   0, // summary.PaidAmount,
				"unpaid_amount": 0, // summary.UnpaidAmount,
				"paid_rate":     0, // summary.PaidRate,
			})
		}

		current = current.AddDate(0, 1, 0)
	}

	// 統計情報を計算
	stats := h.calculateTrendStats(monthlyData)

	response := map[string]interface{}{
		"start_month": startMonth,
		"end_month":   endMonth,
		"data":        monthlyData,
		"statistics":  stats,
	}

	c.JSON(http.StatusOK, response)
}

// GetClientBillingRanking クライアント請求ランキング取得
// @Summary クライアント請求ランキング取得
// @Description 指定期間のクライアント別請求額ランキングを取得します
// @Tags AccountingDashboard
// @Accept json
// @Produce json
// @Param month query string false "対象月（YYYY-MM）"
// @Param limit query int false "取得件数" default(10)
// @Success 200 {object} map[string]interface{} "クライアント請求ランキング"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/accounting/dashboard/ranking/clients [get]
func (h *AccountingDashboardHandler) GetClientBillingRanking(c *gin.Context) {
	// 対象月の取得（デフォルトは当月）
	targetMonth := c.Query("month")
	if targetMonth == "" {
		targetMonth = time.Now().Format("2006-01")
	}

	// 対象月の形式チェック
	if _, err := time.Parse("2006-01", targetMonth); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "対象月の形式が正しくありません（YYYY-MM）")
		return
	}

	// 取得件数
	// limit := 10
	// if limitStr := c.Query("limit"); limitStr != "" {
	//	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
	//		limit = l
	//	}
	// }

	// ランキングデータを取得 (TODO: メソッド実装待ち)
	// ranking, err := h.billingService.GetClientBillingRanking(c.Request.Context(), targetMonth, limit)
	// if err != nil {
	//	h.logger.Error("Failed to get client billing ranking", zap.Error(err))
	//	c.JSON(500, gin.H{"error": "クライアント請求ランキングの取得に失敗しました"})
	//	return
	// }

	// 仮実装
	ranking := make([]map[string]interface{}, 0)

	response := map[string]interface{}{
		"month":   targetMonth,
		"ranking": ranking,
		"total":   len(ranking),
	}

	c.JSON(http.StatusOK, response)
}

// GetProjectBillingRanking プロジェクト請求ランキング取得
// @Summary プロジェクト請求ランキング取得
// @Description 指定期間のプロジェクト別請求額ランキングを取得します
// @Tags AccountingDashboard
// @Accept json
// @Produce json
// @Param month query string false "対象月（YYYY-MM）"
// @Param limit query int false "取得件数" default(10)
// @Success 200 {object} map[string]interface{} "プロジェクト請求ランキング"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/accounting/dashboard/ranking/projects [get]
func (h *AccountingDashboardHandler) GetProjectBillingRanking(c *gin.Context) {
	// 対象月の取得（デフォルトは当月）
	targetMonth := c.Query("month")
	if targetMonth == "" {
		targetMonth = time.Now().Format("2006-01")
	}

	// 対象月の形式チェック
	if _, err := time.Parse("2006-01", targetMonth); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "対象月の形式が正しくありません（YYYY-MM）")
		return
	}

	// 取得件数
	// limit := 10
	// if limitStr := c.Query("limit"); limitStr != "" {
	//	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
	//		limit = l
	//	}
	// }

	// ランキングデータを取得 (TODO: メソッド実装待ち)
	// ranking, err := h.billingService.GetProjectBillingRanking(c.Request.Context(), targetMonth, limit)
	// if err != nil {
	//	h.logger.Error("Failed to get project billing ranking", zap.Error(err))
	//	c.JSON(500, gin.H{"error": "プロジェクト請求ランキングの取得に失敗しました"})
	//	return
	// }

	// 仮実装
	ranking := make([]map[string]interface{}, 0)

	response := map[string]interface{}{
		"month":   targetMonth,
		"ranking": ranking,
		"total":   len(ranking),
	}

	c.JSON(http.StatusOK, response)
}

// GetPaymentStatus 入金状況取得
// @Summary 入金状況取得
// @Description 指定期間の入金状況を取得します
// @Tags AccountingDashboard
// @Accept json
// @Produce json
// @Param month query string false "対象月（YYYY-MM）"
// @Param status query string false "ステータス（paid, unpaid, overdue）"
// @Success 200 {object} dto.PaymentStatusResponse "入金状況"
// @Failure 400 {object} utils.ErrorResponse "リクエストエラー"
// @Failure 500 {object} utils.ErrorResponse "サーバーエラー"
// @Router /api/v1/accounting/dashboard/payment-status [get]
func (h *AccountingDashboardHandler) GetPaymentStatus(c *gin.Context) {
	// 対象月の取得（デフォルトは当月）
	targetMonth := c.Query("month")
	if targetMonth == "" {
		targetMonth = time.Now().Format("2006-01")
	}

	// 対象月の形式チェック
	if _, err := time.Parse("2006-01", targetMonth); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "対象月の形式が正しくありません（YYYY-MM）")
		return
	}

	// ステータスフィルター
	statusFilter := c.Query("status")
	if statusFilter != "" {
		validStatuses := []string{"paid", "unpaid", "overdue"}
		isValid := false
		for _, validStatus := range validStatuses {
			if statusFilter == validStatus {
				isValid = true
				break
			}
		}
		if !isValid {
			utils.RespondError(c, http.StatusBadRequest, "無効なステータスです")
			return
		}
	}

	// 入金状況を取得 (TODO: メソッド実装待ち)
	// paymentStatus, err := h.billingService.GetPaymentStatus(c.Request.Context(), targetMonth, statusFilter)
	// if err != nil {
	//	h.logger.Error("Failed to get payment status", zap.Error(err))
	//	utils.HandleError(c, err, "入金状況の取得")
	//	return
	// }

	// 仮実装
	paymentStatus := map[string]interface{}{
		"month": targetMonth,
		"data":  make([]map[string]interface{}, 0),
	}

	c.JSON(http.StatusOK, paymentStatus)
}

// calculateKPIs KPI計算（内部メソッド）
func (h *AccountingDashboardHandler) calculateKPIs(
	summary *dto.BillingSummaryDTO,
	recentInvoices []*dto.InvoiceDTO,
	projectGroups []*dto.ProjectGroupDTO,
) interface{} { // TODO: *dto.AccountingKPIs {
	// 前月比計算
	var monthOverMonthGrowth float64
	// if summary.LastMonthAmount > 0 {
	//	monthOverMonthGrowth = ((summary.TotalAmount - summary.LastMonthAmount) / summary.LastMonthAmount) * 100
	// }

	// 平均請求額
	var averageInvoiceAmount float64
	// if summary.InvoiceCount > 0 {
	//	averageInvoiceAmount = summary.TotalAmount / float64(summary.InvoiceCount)
	// }

	// アクティブなプロジェクトグループ数
	activeGroupCount := 0
	for _, group := range projectGroups {
		if group != nil {
			activeGroupCount++
		}
	}

	// TODO: AccountingKPIを定義して使用
	_ = monthOverMonthGrowth
	_ = averageInvoiceAmount
	return map[string]interface{}{
		"total_billing_amount":    summary.TotalAmount,
		"month_over_month_growth": 0.0, // monthOverMonthGrowth,
		"collection_rate":         0.0, // summary.PaidRate,
		"average_invoice_amount":  0.0, // averageInvoiceAmount,
		"active_client_count":     0,   // summary.ClientCount,
		"pending_invoice_count":   0,   // summary.PendingCount,
		"overdue_invoice_count":   0,   // summary.OverdueCount,
		"active_project_groups":   activeGroupCount,
	}
}

// generateChartData チャートデータ生成（内部メソッド）
func (h *AccountingDashboardHandler) generateChartData(
	summary *dto.BillingSummaryDTO,
	recentInvoices []*dto.InvoiceDTO,
) interface{} { // TODO: *interface{} {
	// ステータス別集計
	statusDistribution := make(map[string]int)
	for _, invoice := range recentInvoices {
		if invoice != nil {
			statusDistribution[invoice.Status]++
		}
	}

	// 日別請求額（簡易版）
	dailyBillings := make([]map[string]interface{}, 0)

	return map[string]interface{}{
		"status_distribution": statusDistribution,
		"daily_billings":      dailyBillings,
		"client_distribution": make(map[string]float64),
	}
}

// getRecentActivities 最近のアクティビティ取得（内部メソッド）
func (h *AccountingDashboardHandler) getRecentActivities(ctx context.Context, targetMonth string) ([]map[string]interface{}, error) {
	// TODO: 実際のアクティビティログから取得する実装
	activities := make([]map[string]interface{}, 0)

	// サンプルデータ
	activities = append(activities, map[string]interface{}{
		"id":          uuid.New().String(),
		"type":        "invoice_created",
		"title":       "請求書作成",
		"description": "新規請求書が作成されました",
		"timestamp":   time.Now().Add(-1 * time.Hour),
		"user_id":     uuid.New().String(),
		"user_name":   "システム",
	})

	return activities, nil
}

// calculateTrendStats トレンド統計計算（内部メソッド）
func (h *AccountingDashboardHandler) calculateTrendStats(data []map[string]interface{}) interface{} {
	if len(data) == 0 {
		return map[string]interface{}{} // TODO: &dto.TrendStatistics{}
	}

	var (
		totalAmount float64
		maxAmount   float64
		minAmount   float64 = -1
		totalGrowth float64
		growthCount int
	)

	for i, monthly := range data {
		// mapからtotal_amountを取得
		amount, ok := monthly["total_amount"].(float64)
		if !ok {
			amount = 0
		}

		totalAmount += amount

		if amount > maxAmount {
			maxAmount = amount
		}

		if minAmount < 0 || amount < minAmount {
			minAmount = amount
		}

		// 成長率計算
		if i > 0 {
			prevAmount, ok := data[i-1]["total_amount"].(float64)
			if ok && prevAmount > 0 {
				growth := ((amount - prevAmount) / prevAmount) * 100
				totalGrowth += growth
				growthCount++
			}
		}
	}

	averageAmount := totalAmount / float64(len(data))
	var averageGrowth float64
	if growthCount > 0 {
		averageGrowth = totalGrowth / float64(growthCount)
	}

	return map[string]interface{}{
		"average_amount": averageAmount,
		"max_amount":     maxAmount,
		"min_amount":     minAmount,
		"total_amount":   totalAmount,
		"average_growth": averageGrowth,
		"data_points":    len(data),
	}
}
