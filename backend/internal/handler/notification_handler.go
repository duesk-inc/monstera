package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// NotificationHandler は通知関連のAPI処理を担当するインターフェース
type NotificationHandler interface {
	// 通知一覧取得
	GetUserNotifications(c *gin.Context)
	// 未読通知取得
	GetUnreadNotifications(c *gin.Context)
	// 通知既読化
	MarkAsRead(c *gin.Context)
	MarkAsReadSingle(c *gin.Context)
	MarkAllAsRead(c *gin.Context)
	// 通知作成（管理者用）
	CreateNotification(c *gin.Context)
	// 通知設定
	GetUserNotificationSettings(c *gin.Context)
	UpdateNotificationSetting(c *gin.Context)

	// 通知履歴API（新機能）
	GetAdvancedNotifications(c *gin.Context) // 高度な通知一覧（管理者向け）
	GetNotificationByID(c *gin.Context)      // 通知詳細取得
	UpdateNotification(c *gin.Context)       // 通知更新
	DeleteNotification(c *gin.Context)       // 通知削除
	HideNotification(c *gin.Context)         // 通知を非表示
	GetUnreadCount(c *gin.Context)           // 未読通知数取得
	GetNotificationStats(c *gin.Context)     // 通知統計取得（管理者向け）

	// 週報関連通知
	SendWeeklyReportReminder(c *gin.Context) // 週報リマインド送信
	SendBulkReminder(c *gin.Context)         // 一括リマインド送信
}

// notificationHandler は NotificationHandler の実装
type notificationHandler struct {
	notificationService service.NotificationService
	weeklyReportRepo    repository.WeeklyReportRepository
	userRepo            repository.UserRepository
	departmentRepo      repository.DepartmentRepository
	logger              *zap.Logger
	handlerUtil         *HandlerUtil
	errorHandler        *utils.ErrorHandler
	validationUtils     *utils.ValidationUtils
	weeklyReportUtils   *utils.WeeklyReportUtils
}

// NewNotificationHandler は通知ハンドラのインスタンスを生成します
func NewNotificationHandler(
	notificationService service.NotificationService,
	weeklyReportRepo repository.WeeklyReportRepository,
	userRepo repository.UserRepository,
	departmentRepo repository.DepartmentRepository,
	logger *zap.Logger,
) NotificationHandler {
	return &notificationHandler{
		notificationService: notificationService,
		weeklyReportRepo:    weeklyReportRepo,
		userRepo:            userRepo,
		departmentRepo:      departmentRepo,
		logger:              logger,
		handlerUtil:         NewHandlerUtil(logger),
		errorHandler:        utils.NewErrorHandler(),
		validationUtils:     utils.NewValidationUtils(),
		weeklyReportUtils:   utils.NewWeeklyReportUtils(),
	}
}

// GetUserNotifications はユーザーの通知一覧を取得するAPIハンドラです
// @Summary ユーザーの通知一覧を取得
// @Description ログインユーザーの通知一覧を取得します
// @Tags notifications
// @Accept json
// @Produce json
// @Param limit query int false "取得件数 (デフォルト: 10)"
// @Param offset query int false "オフセット (デフォルト: 0)"
// @Success 200 {object} dto.UserNotificationListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications [get]
func (h *notificationHandler) GetUserNotifications(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		// エラーは既にGetAuthenticatedUserID内で処理されている
		return
	}

	// クエリパラメータ取得
	limit := 10
	offset := 0

	limitStr := c.Query("limit")
	if limitStr != "" {
		limitVal, err := strconv.Atoi(limitStr)
		if err == nil && limitVal > 0 {
			limit = limitVal
		}
	}

	offsetStr := c.Query("offset")
	if offsetStr != "" {
		offsetVal, err := strconv.Atoi(offsetStr)
		if err == nil && offsetVal >= 0 {
			offset = offsetVal
		}
	}

	// サービス呼び出し
	response, err := h.notificationService.GetUserNotifications(c.Request.Context(), userID, limit, offset)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationListGetError, err)
		return
	}

	// レスポンス返却
	c.JSON(http.StatusOK, response)
}

// GetUnreadNotifications はユーザーの未読通知を取得するAPIハンドラです
// @Summary ユーザーの未読通知を取得
// @Description ログインユーザーの未読通知一覧を取得します
// @Tags notifications
// @Accept json
// @Produce json
// @Success 200 {object} dto.UnreadNotificationResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/unread [get]
func (h *notificationHandler) GetUnreadNotifications(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// 未読通知を取得するためのパラメータ設定
	params := &repository.NotificationQueryParams{
		Page:  1,
		Limit: 50, // フロントエンドのポーリング用に多めに設定
	}

	// 未読ステータスを設定
	unreadStatus := model.NotificationStatusUnread
	params.Status = &unreadStatus

	// サービス呼び出し
	notifications, err := h.notificationService.GetNotificationsByRecipient(c.Request.Context(), userID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationListGetError, err)
		return
	}

	// 未読件数を取得
	unreadCount, err := h.notificationService.GetUnreadNotificationCount(c.Request.Context(), userID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationListGetError, err)
		return
	}

	// レスポンス作成
	response := gin.H{
		"notifications": notifications,
		"unread_count":  unreadCount,
	}

	c.JSON(http.StatusOK, response)
}

// MarkAsRead は通知を既読にするAPIハンドラです
// @Summary 通知を既読にする
// @Description 指定された通知を既読状態に更新します
// @Tags notifications
// @Accept json
// @Produce json
// @Param request body dto.MarkAsReadRequest true "既読にする通知IDリスト"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/read [put]
func (h *notificationHandler) MarkAsRead(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストをバインド
	var request dto.MarkAsReadRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.respondError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// 通知IDをパース
	notificationIDs := make([]string, 0, len(request.NotificationIDs))
	for _, idStr := range request.NotificationIDs {
		id := idStr
		// UUID validation removed after migration
		if id == "" {
			h.respondError(c, http.StatusBadRequest, fmt.Sprintf(message.MsgInvalidNotificationID, idStr), fmt.Errorf("invalid notification ID: %s", idStr))
			return
		}
		notificationIDs = append(notificationIDs, id)
	}

	// 各通知を既読にする
	for _, notificationID := range notificationIDs {
		err := h.notificationService.MarkAsRead(c.Request.Context(), userID, notificationID)
		if err != nil {
			h.respondError(c, http.StatusInternalServerError, message.MsgNotificationMarkReadError, err)
			return
		}
	}

	// 成功レスポンス
	c.JSON(http.StatusOK, gin.H{"success": true, "message": message.MsgNotificationMarkedAsRead})
}

// MarkAsReadSingle は単一の通知を既読にするAPIハンドラです
// @Summary 単一の通知を既読にする
// @Description 指定されたIDの通知を既読状態に更新します
// @Tags notifications
// @Accept json
// @Produce json
// @Param id path string true "通知ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/{id}/read [put]
func (h *notificationHandler) MarkAsReadSingle(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// パスパラメータから通知IDを取得
	notificationIDStr := c.Param("id")
	notificationID := notificationIDStr
	// UUID validation removed after migration
	if notificationID == "" {
		h.respondError(c, http.StatusBadRequest, fmt.Sprintf(message.MsgInvalidNotificationID, notificationIDStr), fmt.Errorf("invalid notification ID: %s", notificationIDStr))
		return
	}

	// サービス呼び出し
	err := h.notificationService.MarkAsRead(c.Request.Context(), userID, notificationID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationMarkReadError, err)
		return
	}

	// 成功レスポンス
	c.JSON(http.StatusOK, gin.H{"success": true, "message": message.MsgNotificationMarkedAsRead})
}

// MarkAllAsRead はすべての通知を既読にするAPIハンドラです
// @Summary すべての通知を既読にする
// @Description ユーザーのすべての未読通知を既読状態に更新します
// @Tags notifications
// @Accept json
// @Produce json
// @Success 200 {object} SuccessResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/read-all [put]
func (h *notificationHandler) MarkAllAsRead(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// サービス呼び出し
	err := h.notificationService.MarkAllAsRead(c.Request.Context(), userID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationMarkAllReadError, err)
		return
	}

	// 成功レスポンス
	c.JSON(http.StatusOK, gin.H{"success": true, "message": message.MsgAllNotificationsMarkedAsRead})
}

// CreateNotification は新しい通知を作成するAPIハンドラです（管理者用）
// @Summary 新しい通知を作成（管理者用）
// @Description 新しい通知を作成し、指定したユーザーに送信します
// @Tags notifications
// @Accept json
// @Produce json
// @Param request body dto.CreateNotificationRequest true "通知作成リクエスト"
// @Success 201 {object} dto.NotificationResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/notifications [post]
func (h *notificationHandler) CreateNotification(c *gin.Context) {
	// 認証チェック
	if _, ok := h.handlerUtil.GetAuthenticatedUserID(c); !ok {
		return
	}

	// 管理者であることを確認
	isAdmin, err := h.handlerUtil.IsAdmin(c)
	if err != nil || !isAdmin {
		h.respondError(c, http.StatusForbidden, message.MsgAdminRightsRequired, err)
		return
	}

	// リクエストをバインド
	var request dto.CreateNotificationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.respondError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// バリデーション
	if len(request.UserIDs) == 0 {
		h.respondError(c, http.StatusBadRequest, message.MsgNoUserIDSpecified, nil)
		return
	}

	// DTOからモデルへ変換して通知を作成
	var createdNotifications []string
	for _, userIDStr := range request.UserIDs {
		userID := userIDStr
		// UUID validation removed after migration
		if userID == "" {
			h.respondError(c, http.StatusBadRequest, "Invalid user ID format", fmt.Errorf("invalid user ID: %s", userIDStr))
			return
		}

		var referenceID *string
		if request.ReferenceID != nil {
			// UUID validation removed after migration
			if *request.ReferenceID != "" {
				referenceID = request.ReferenceID
			}
		}

		notification := &model.Notification{
			ID:               uuid.New().String(),
			Title:            request.Title,
			Message:          request.Message,
			NotificationType: model.NotificationType(request.NotificationType),
			Priority:         model.NotificationPriority(request.Priority),
			RecipientID:      &userID,
			ExpiresAt:        request.ExpiresAt,
			ReferenceID:      referenceID,
			ReferenceType:    request.ReferenceType,
		}

		// サービス呼び出し
		err = h.notificationService.CreateNotification(c.Request.Context(), notification)
		if err != nil {
			h.respondError(c, http.StatusInternalServerError, message.MsgNotificationCreateError, err)
			return
		}

		createdNotifications = append(createdNotifications, notification.ID)
	}

	// 成功レスポンス
	c.JSON(http.StatusCreated, map[string]interface{}{
		"message":          "Notifications created successfully",
		"notification_ids": createdNotifications,
	})
}

// GetUserNotificationSettings はユーザーの通知設定を取得するAPIハンドラです
// @Summary ユーザーの通知設定を取得
// @Description ログインユーザーの通知設定を取得します
// @Tags notifications
// @Accept json
// @Produce json
// @Success 200 {object} dto.NotificationSettingsListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/settings [get]
func (h *notificationHandler) GetUserNotificationSettings(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// サービス呼び出し
	response, err := h.notificationService.GetUserNotificationSettings(c.Request.Context(), userID)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationSettingsGetError, err)
		return
	}

	// レスポンス返却
	c.JSON(http.StatusOK, response)
}

// UpdateNotificationSetting はユーザーの通知設定を更新するAPIハンドラです
// @Summary ユーザーの通知設定を更新
// @Description ログインユーザーの通知設定を更新します
// @Tags notifications
// @Accept json
// @Produce json
// @Param request body dto.UpdateNotificationSettingRequest true "通知設定更新リクエスト"
// @Success 200 {object} dto.NotificationSettingResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/settings [put]
func (h *notificationHandler) UpdateNotificationSetting(c *gin.Context) {
	// ユーザーIDを取得
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	// リクエストをバインド
	var request dto.UpdateNotificationSettingRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.respondError(c, http.StatusBadRequest, message.MsgInvalidRequest, err)
		return
	}

	// サービス呼び出し
	err := h.notificationService.UpdateNotificationSetting(c.Request.Context(), userID, request)
	if err != nil {
		h.respondError(c, http.StatusInternalServerError, message.MsgNotificationSettingUpdateError, err)
		return
	}

	// レスポンス返却
	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// GetAdvancedNotifications 高度な通知一覧を取得（管理者向け）
func (h *notificationHandler) GetAdvancedNotifications(c *gin.Context) {
	// ページネーションパラメータ
	params := &repository.NotificationQueryParams{
		Page:  h.getIntQueryParam(c, "page", 1),
		Limit: h.getIntQueryParam(c, "limit", 20),
	}

	// フィルタパラメータ
	if statusStr := c.Query("status"); statusStr != "" {
		if status, err := model.ParseNotificationStatus(statusStr); err == nil {
			params.Status = &status
		}
	}

	if typeStr := c.Query("type"); typeStr != "" {
		if notificationType, err := model.ParseNotificationType(typeStr); err == nil {
			params.Type = &notificationType
		}
	}

	if priorityStr := c.Query("priority"); priorityStr != "" {
		if priority, err := model.ParseNotificationPriority(priorityStr); err == nil {
			params.Priority = &priority
		}
	}

	if startDate := c.Query("start_date"); startDate != "" {
		if date, err := time.Parse("2006-01-02", startDate); err == nil {
			params.StartDate = &date
		}
	}

	if endDate := c.Query("end_date"); endDate != "" {
		if date, err := time.Parse("2006-01-02", endDate); err == nil {
			params.EndDate = &date
		}
	}

	params.SearchKeyword = c.Query("search")
	params.SortBy = c.Query("sort_by")
	params.SortDirection = c.Query("sort_direction")

	// 受信者IDが指定されている場合（特定ユーザーの通知）
	if recipientIDStr := c.Query("recipient_id"); recipientIDStr != "" {
		recipientID := recipientIDStr
		// UUID validation removed after migration
		if recipientID == "" {
			h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効な受信者IDです。", nil)
			return
		}

		notifications, err := h.notificationService.GetNotificationsByRecipient(c.Request.Context(), recipientID)
		if err != nil {
			h.errorHandler.HandleInternalError(c, err, "notification_by_recipient")
			return
		}

		response := gin.H{
			"items": notifications,
		}
		c.JSON(http.StatusOK, response)
		return
	}

	// 全通知を取得（管理者向け）
	notifications, pagination, err := h.notificationService.GetAllNotifications(c.Request.Context(), params)
	if err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_list_all")
		return
	}

	response := gin.H{
		"items":      notifications,
		"pagination": pagination,
	}
	c.JSON(http.StatusOK, response)
}

// GetNotificationByID 通知詳細を取得
func (h *notificationHandler) GetNotificationByID(c *gin.Context) {
	notificationID := c.Param("id")
	if notificationID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "通知IDが指定されていません。", nil)
		return
	}

	notificationUUID := notificationID
	// UUID validation removed after migration
	if notificationUUID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効な通知IDです。", nil)
		return
	}

	notification, err := h.notificationService.GetAdvancedNotificationByID(c.Request.Context(), notificationUUID)
	if err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_detail")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": notification})
}

// UpdateNotification 通知を更新
func (h *notificationHandler) UpdateNotification(c *gin.Context) {
	notificationID := c.Param("id")
	if notificationID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "通知IDが指定されていません。", nil)
		return
	}

	notificationUUID := notificationID
	// UUID validation removed after migration
	if notificationUUID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効な通知IDです。", nil)
		return
	}

	var req service.UpdateAdvancedNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "リクエスト形式が正しくありません。", nil)
		return
	}

	// バリデーション
	if err := h.validationUtils.ValidateStruct(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Validation error", err)
		return
	}

	// 通知を更新
	err := h.notificationService.UpdateAdvancedNotification(c.Request.Context(), notificationUUID, &req)
	if err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_update")
		return
	}

	h.logger.Info("Notification updated",
		zap.String("notification_id", notificationUUID))

	c.JSON(http.StatusOK, gin.H{"message": "Notification updated successfully"})
}

// DeleteNotification 通知を削除
func (h *notificationHandler) DeleteNotification(c *gin.Context) {
	notificationID := c.Param("id")
	if notificationID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "通知IDが指定されていません。", nil)
		return
	}

	notificationUUID := notificationID
	// UUID validation removed after migration
	if notificationUUID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効な通知IDです。", nil)
		return
	}

	// 通知を削除
	if err := h.notificationService.DeleteAdvancedNotification(c.Request.Context(), notificationUUID); err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_delete")
		return
	}

	h.logger.Info("Notification deleted",
		zap.String("notification_id", notificationID),
		zap.String("deleted_by", h.getCurrentUserID(c)))

	c.JSON(http.StatusOK, gin.H{"message": "通知が削除されました。"})
}

// HideNotification 通知を非表示にする
func (h *notificationHandler) HideNotification(c *gin.Context) {
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	notificationID := c.Param("id")
	if notificationID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "通知IDが指定されていません。", nil)
		return
	}

	notificationUUID := notificationID
	// UUID validation removed after migration
	if notificationUUID == "" {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効な通知IDです。", nil)
		return
	}

	// 通知を非表示にする
	if err := h.notificationService.HideNotification(c.Request.Context(), userID, notificationUUID); err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_hide")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "通知を非表示にしました。"})
}

// GetUnreadCount 未読通知数を取得
func (h *notificationHandler) GetUnreadCount(c *gin.Context) {
	userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
	if !ok {
		return
	}

	count, err := h.notificationService.GetUnreadNotificationCount(c.Request.Context(), userID)
	if err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_unread_count")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"unread_count": count}})
}

// GetNotificationStats 通知統計を取得（管理者向け）
func (h *notificationHandler) GetNotificationStats(c *gin.Context) {
	// 期間の指定（デフォルトは過去30日）
	// 日付パラメータは現在は使用しないが、将来のために残す
	// endDate := time.Now()
	// startDate := endDate.AddDate(0, 0, -30)

	// if startDateStr := c.Query("start_date"); startDateStr != "" {
	// 	if date, err := time.Parse("2006-01-02", startDateStr); err == nil {
	// 		startDate = date
	// 	}
	// }

	// if endDateStr := c.Query("end_date"); endDateStr != "" {
	// 	if date, err := time.Parse("2006-01-02", endDateStr); err == nil {
	// 		endDate = date
	// 	}
	// }

	stats, err := h.notificationService.GetNotificationStats(c.Request.Context())
	if err != nil {
		h.errorHandler.HandleInternalError(c, err, "notification_stats")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// SendWeeklyReportReminder 週報リマインドを送信
func (h *notificationHandler) SendWeeklyReportReminder(c *gin.Context) {
	var req service.WeeklyReportReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "リクエスト形式が正しくありません。", nil)
		return
	}

	// バリデーション
	if err := h.validationUtils.ValidateStruct(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Validation error", err)
		return
	}

	// 週報リマインドを送信
	if err := h.notificationService.CreateWeeklyReportReminderNotification(c.Request.Context(), &req); err != nil {
		h.errorHandler.HandleInternalError(c, err, "weekly_report_reminder")
		return
	}

	recipientID := ""
	if req.RecipientID != nil {
		recipientID = *req.RecipientID
	}
	h.logger.Info("Weekly report reminder sent",
		zap.String("recipient_id", recipientID),
		zap.String("start_date", req.StartDate.Format("2006-01-02")),
		zap.String("end_date", req.EndDate.Format("2006-01-02")),
		zap.String("sent_by", h.getCurrentUserID(c)))

	c.JSON(http.StatusOK, gin.H{"message": "週報リマインドを送信しました。"})
}

// SendBulkReminder 一括リマインドを送信
func (h *notificationHandler) SendBulkReminder(c *gin.Context) {
	var req struct {
		UserIDs   []string  `json:"user_ids" validate:"required,min=1"`
		StartDate time.Time `json:"start_date" validate:"required"`
		EndDate   time.Time `json:"end_date" validate:"required"`
		Message   string    `json:"message"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "リクエスト形式が正しくありません。", nil)
		return
	}

	// バリデーション
	if err := h.validationUtils.ValidateStruct(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Validation error", err)
		return
	}

	// 週の範囲をバリデーション
	if err := h.weeklyReportUtils.ValidateWeekRange(req.StartDate, req.EndDate); err != nil {
		h.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidDates, nil)
		return
	}

	// 一括リマインドを送信
	successCount := 0
	failureCount := 0

	for _, userID := range req.UserIDs {

		reminderReq := &service.WeeklyReportReminderRequest{
			RecipientID: &userID,
			StartDate:   req.StartDate,
			EndDate:     req.EndDate,
		}

		if err := h.notificationService.CreateWeeklyReportReminderNotification(c.Request.Context(), reminderReq); err != nil {
			h.logger.Warn("Failed to send reminder",
				zap.String("user_id", userID),
				zap.Error(err))
			failureCount++
		} else {
			successCount++
		}
	}

	// 一括リマインド完了通知を送信
	currentUserID := h.getCurrentUserID(c)
	if currentUserID != "" {
		if _, err := uuid.Parse(currentUserID); err == nil {
			bulkReq := &service.BulkReminderCompleteRequest{
				SuccessCount: successCount,
				FailureCount: failureCount,
			}

			h.notificationService.CreateBulkReminderCompleteNotification(c.Request.Context(), bulkReq)
		}
	}

	h.logger.Info("Bulk reminder completed",
		zap.Int("total", len(req.UserIDs)),
		zap.Int("success", successCount),
		zap.Int("failure", failureCount),
		zap.String("sent_by", currentUserID))

	response := gin.H{
		"message":       "一括リマインドを送信しました。",
		"total_count":   len(req.UserIDs),
		"success_count": successCount,
		"failure_count": failureCount,
	}

	c.JSON(http.StatusOK, response)
}

// Helper methods

func (h *notificationHandler) getIntQueryParam(c *gin.Context, key string, defaultValue int) int {
	if valueStr := c.Query(key); valueStr != "" {
		if value, err := strconv.Atoi(valueStr); err == nil && value > 0 {
			return value
		}
	}
	return defaultValue
}

func (h *notificationHandler) getCurrentUserID(c *gin.Context) string {
	userID, exists := c.Get("user_id")
	if !exists {
		return ""
	}
	if userIDStr, ok := userID.(string); ok {
		return userIDStr
	}
	return ""
}

// エラーレスポンスを返却するヘルパーメソッド
func (h *notificationHandler) respondError(c *gin.Context, statusCode int, message string, err error) {
	// ログ出力
	if h.logger != nil && err != nil {
		h.logger.Error(message,
			zap.String("path", c.Request.URL.Path),
			zap.Error(err))
	}

	// エラーレスポンス
	c.JSON(statusCode, gin.H{
		"error":   true,
		"message": message,
	})
}
