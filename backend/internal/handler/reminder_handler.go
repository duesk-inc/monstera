package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ReminderHandler リマインドハンドラーインターフェース
type ReminderHandler interface {
	// 手動リマインド送信
	SendManualReminder(c *gin.Context)
	// 本日のリマインド対象者取得
	GetTodaysReminders(c *gin.Context)
	// リマインド設定取得
	GetReminderSettings(c *gin.Context)
	// リマインド設定更新
	UpdateReminderSettings(c *gin.Context)
}

// reminderHandler リマインドハンドラー実装
type reminderHandler struct {
	unsubmittedService service.UnsubmittedReportService
	reminderService    service.ReminderBatchService
	logger             *zap.Logger
}

// NewReminderHandler インスタンスを生成
func NewReminderHandler(
	unsubmittedService service.UnsubmittedReportService,
	reminderService service.ReminderBatchService,
	logger *zap.Logger,
) ReminderHandler {
	return &reminderHandler{
		unsubmittedService: unsubmittedService,
		reminderService:    reminderService,
		logger:             logger,
	}
}

// SendManualReminderRequest 手動リマインド送信リクエスト
type SendManualReminderRequest struct {
	UserIDs []uuid.UUID `json:"user_ids" binding:"required,min=1"`
	Message string      `json:"message" binding:"required,min=1,max=1000"`
}

// SendManualReminder 手動リマインド送信
func (h *reminderHandler) SendManualReminder(c *gin.Context) {
	var req SendManualReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidInput})
		return
	}

	// TODO: SendRemindersToUnsubmittedメソッドをサービスに実装する必要があります
	c.JSON(http.StatusNotImplemented, gin.H{"error": "リマインド送信機能は実装中です"})
}

// GetTodaysReminders 本日のリマインド対象者取得
func (h *reminderHandler) GetTodaysReminders(c *gin.Context) {
	targets, err := h.reminderService.GetTodaysReminders(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get today's reminders", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "リマインド対象者の取得に失敗しました"})
		return
	}

	// タイプ別に集計
	summary := make(map[string]int)
	for _, target := range targets {
		summary[target.ReminderType]++
	}

	c.JSON(http.StatusOK, gin.H{
		"targets": targets,
		"summary": summary,
		"total":   len(targets),
	})
}

// GetReminderSettings リマインド設定取得
func (h *reminderHandler) GetReminderSettings(c *gin.Context) {
	// TODO: GetAutoReminderSettingsメソッドをサービスに実装する必要があります
	c.JSON(http.StatusNotImplemented, gin.H{"error": "リマインド設定取得機能は実装中です"})
}

// UpdateReminderSettingsRequest リマインド設定更新リクエスト
type UpdateReminderSettingsRequest struct {
	Enabled            bool   `json:"enabled"`
	FirstReminderDays  int    `json:"first_reminder_days" binding:"min=1,max=30"`
	SecondReminderDays int    `json:"second_reminder_days" binding:"min=1,max=30"`
	EscalationDays     int    `json:"escalation_days" binding:"min=1,max=30"`
	ReminderTime       string `json:"reminder_time" binding:"required,datetime=15:04"`
	IncludeManager     bool   `json:"include_manager"`
}

// UpdateReminderSettings リマインド設定更新
func (h *reminderHandler) UpdateReminderSettings(c *gin.Context) {
	var req UpdateReminderSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidInput})
		return
	}

	// 検証：日数の順序
	if req.FirstReminderDays >= req.SecondReminderDays ||
		req.SecondReminderDays >= req.EscalationDays {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リマインド日数は昇順である必要があります"})
		return
	}

	// TODO: SetAutoReminderSettingsメソッドをサービスに実装する必要があります
	c.JSON(http.StatusNotImplemented, gin.H{"error": "リマインド設定更新機能は実装中です"})
}
