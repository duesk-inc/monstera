package handler

import (
	"net/http"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
)

// ApprovalReminderHandler 承認催促ハンドラー
type ApprovalReminderHandler struct {
	schedulerService service.SchedulerService
	reminderJob      *service.ExpenseApprovalReminderJob
	logger           *zap.Logger
	reminderConfig   *dto.ApprovalReminderConfig
	reminderJobID    cron.EntryID
}

// NewApprovalReminderHandler 承認催促ハンドラーのインスタンスを生成
func NewApprovalReminderHandler(
	schedulerService service.SchedulerService,
	expenseService service.ExpenseService,
	notificationService service.NotificationService,
	logger *zap.Logger,
) *ApprovalReminderHandler {
	// デフォルト設定
	defaultConfig := &dto.ApprovalReminderConfig{
		Enabled:           false,
		ReminderThreshold: 3 * 24 * time.Hour, // 3日
		ReminderInterval:  24 * time.Hour,     // 1日
		MaxReminders:      3,
		Schedule:          "0 9 * * *", // 毎日午前9時
	}

	// 承認催促ジョブを作成
	reminderJob := service.NewExpenseApprovalReminderJob(
		expenseService,
		notificationService,
		logger,
		defaultConfig.ReminderThreshold,
		defaultConfig.MaxReminders,
	)

	return &ApprovalReminderHandler{
		schedulerService: schedulerService,
		reminderJob:      reminderJob,
		logger:           logger,
		reminderConfig:   defaultConfig,
	}
}

// GetApprovalReminderConfig 承認催促設定を取得
// @Summary 承認催促設定取得
// @Description 承認催促機能の設定とステータスを取得します
// @Tags Admin-ApprovalReminder
// @Accept json
// @Produce json
// @Success 200 {object} dto.GetApprovalReminderConfigResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/approval-reminder/config [get]
func (h *ApprovalReminderHandler) GetApprovalReminderConfig(c *gin.Context) {
	// 現在のステータスを取得
	status := dto.ApprovalReminderStatus{
		IsRunning: h.schedulerService.IsRunning(),
	}

	// ジョブ情報を取得
	if h.reminderJobID != 0 {
		jobInfo, err := h.schedulerService.GetJobInfo(h.reminderJobID)
		if err == nil {
			status.NextScheduled = jobInfo.NextRun
			status.LastExecuted = jobInfo.PrevRun
		}
	}

	response := dto.GetApprovalReminderConfigResponse{
		Config: *h.reminderConfig,
		Status: status,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateApprovalReminderConfig 承認催促設定を更新
// @Summary 承認催促設定更新
// @Description 承認催促機能の設定を更新します
// @Tags Admin-ApprovalReminder
// @Accept json
// @Produce json
// @Param request body dto.UpdateApprovalReminderConfigRequest true "更新内容"
// @Success 200 {object} dto.GetApprovalReminderConfigResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/approval-reminder/config [put]
func (h *ApprovalReminderHandler) UpdateApprovalReminderConfig(c *gin.Context) {
	var req dto.UpdateApprovalReminderConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "リクエストデータが不正です")
		return
	}

	// 設定を更新
	if req.Enabled != nil {
		h.reminderConfig.Enabled = *req.Enabled
	}
	if req.ReminderThresholdDays != nil {
		h.reminderConfig.ReminderThreshold = time.Duration(*req.ReminderThresholdDays) * 24 * time.Hour
	}
	if req.ReminderIntervalDays != nil {
		h.reminderConfig.ReminderInterval = time.Duration(*req.ReminderIntervalDays) * 24 * time.Hour
	}
	if req.MaxReminders != nil {
		h.reminderConfig.MaxReminders = *req.MaxReminders
	}
	if req.Schedule != nil {
		h.reminderConfig.Schedule = *req.Schedule
	}

	// ジョブを更新
	if err := h.updateReminderJob(); err != nil {
		h.logger.Error("Failed to update reminder job", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, "承認催促ジョブの更新に失敗しました")
		return
	}

	// 現在のステータスを取得
	status := dto.ApprovalReminderStatus{
		IsRunning: h.schedulerService.IsRunning(),
	}

	if h.reminderJobID != 0 {
		jobInfo, err := h.schedulerService.GetJobInfo(h.reminderJobID)
		if err == nil {
			status.NextScheduled = jobInfo.NextRun
			status.LastExecuted = jobInfo.PrevRun
		}
	}

	response := dto.GetApprovalReminderConfigResponse{
		Config: *h.reminderConfig,
		Status: status,
	}

	c.JSON(http.StatusOK, response)
}

// ExecuteApprovalReminder 承認催促を手動実行
// @Summary 承認催促手動実行
// @Description 承認催促を手動で実行します
// @Tags Admin-ApprovalReminder
// @Accept json
// @Produce json
// @Param request body dto.ExecuteApprovalReminderRequest true "実行オプション"
// @Success 200 {object} dto.ExecuteApprovalReminderResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/approval-reminder/execute [post]
func (h *ApprovalReminderHandler) ExecuteApprovalReminder(c *gin.Context) {
	var req dto.ExecuteApprovalReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "リクエストデータが不正です")
		return
	}

	h.logger.Info("Manual execution of approval reminder requested",
		zap.Bool("dry_run", req.DryRun),
	)

	// レポートを生成
	report := dto.ApprovalReminderReport{
		GeneratedAt: time.Now(),
	}

	// ドライランモードの処理
	if req.DryRun {
		// TODO: ドライランモードでの処理を実装
		// 実際には通知を送信せず、送信予定の内容をレポートに含める
		response := dto.ExecuteApprovalReminderResponse{
			Success: true,
			Report:  report,
			Message: "ドライランモードで実行しました（実際の通知は送信されていません）",
		}
		c.JSON(http.StatusOK, response)
		return
	}

	// 実際の催促ジョブを実行
	h.reminderJob.Run()

	response := dto.ExecuteApprovalReminderResponse{
		Success: true,
		Report:  report,
		Message: "承認催促を実行しました",
	}

	c.JSON(http.StatusOK, response)
}

// StartScheduler スケジューラーを開始
// @Summary スケジューラー開始
// @Description 承認催促スケジューラーを開始します
// @Tags Admin-ApprovalReminder
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/approval-reminder/scheduler/start [post]
func (h *ApprovalReminderHandler) StartScheduler(c *gin.Context) {
	if h.schedulerService.IsRunning() {
		c.JSON(http.StatusOK, gin.H{"message": "スケジューラーは既に実行中です"})
		return
	}

	h.schedulerService.Start()
	c.JSON(http.StatusOK, gin.H{"message": "スケジューラーを開始しました"})
}

// StopScheduler スケジューラーを停止
// @Summary スケジューラー停止
// @Description 承認催促スケジューラーを停止します
// @Tags Admin-ApprovalReminder
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/admin/approval-reminder/scheduler/stop [post]
func (h *ApprovalReminderHandler) StopScheduler(c *gin.Context) {
	if !h.schedulerService.IsRunning() {
		c.JSON(http.StatusOK, gin.H{"message": "スケジューラーは既に停止しています"})
		return
	}

	h.schedulerService.Stop()
	c.JSON(http.StatusOK, gin.H{"message": "スケジューラーを停止しました"})
}

// updateReminderJob 承認催促ジョブを更新
func (h *ApprovalReminderHandler) updateReminderJob() error {
	// 既存のジョブを削除
	if h.reminderJobID != 0 {
		h.schedulerService.RemoveJob(h.reminderJobID)
	}

	// 新しいジョブを作成
	h.reminderJob = service.NewExpenseApprovalReminderJob(
		h.reminderJob.ExpenseService,
		h.reminderJob.NotificationService,
		h.logger,
		h.reminderConfig.ReminderThreshold,
		h.reminderConfig.MaxReminders,
	)

	// ジョブが有効な場合のみ追加
	if h.reminderConfig.Enabled {
		jobID, err := h.schedulerService.AddJob(
			"expense_approval_reminder",
			h.reminderConfig.Schedule,
			h.reminderJob.Run,
		)
		if err != nil {
			return err
		}
		h.reminderJobID = jobID
	}

	return nil
}

// Initialize 初期化処理
func (h *ApprovalReminderHandler) Initialize() error {
	// 設定に基づいてジョブを登録
	if h.reminderConfig.Enabled {
		return h.updateReminderJob()
	}
	return nil
}
