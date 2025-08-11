package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/pkg/debug"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// SkillSheetHandler スキルシート関連のハンドラー
type SkillSheetHandler struct {
	cfg               *config.Config
	skillSheetService *service.SkillSheetService
	logger            *zap.Logger
	debugLogger       *debug.DebugLogger
}

// NewSkillSheetHandler SkillSheetHandlerのインスタンスを生成
func NewSkillSheetHandler(cfg *config.Config, skillSheetService *service.SkillSheetService, logger *zap.Logger) *SkillSheetHandler {
	return &SkillSheetHandler{
		cfg:               cfg,
		skillSheetService: skillSheetService,
		logger:            logger,
		debugLogger:       debug.NewDebugLogger(logger),
	}
}

// GetSkillSheet ユーザーのスキルシート情報を取得
func (h *SkillSheetHandler) GetSkillSheet(c *gin.Context) {
	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "スキルシート取得",
		},
		debug.RequestDebugData{
			Method: "GET",
			URL:    "/api/v1/skill-sheet",
		},
	)

	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationRead,
				Description: "スキルシート取得",
			},
			debug.ErrorDebugData{
				ErrorType: "認証エラー",
				Metadata:  "ユーザーIDが見つかりません",
			},
		)
		c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
		return
	}

	// ユーザーIDがuuid.UUID型であることを確認
	userIDValue, ok := userID.(string)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationRead,
				Description: "スキルシート取得",
			},
			debug.ErrorDebugData{
				ErrorType: "バリデーションエラー",
				Metadata:  "無効なユーザーIDです",
			},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidUserID})
		return
	}

	// スキルシート情報を取得
	skillSheet, err := h.skillSheetService.GetUserSkillSheet(userIDValue)
	if err != nil {
		h.logger.Error("Failed to get skill sheet", zap.Error(err), zap.String("user_id", userIDValue))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationRead,
				Description: "スキルシート取得",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgSkillSheetGetError})
		return
	}

	// デバッグログ: レスポンスデータ
	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "スキルシート取得",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"user_id":              userIDValue,
				"work_histories_count": len(skillSheet.WorkHistories),
			},
		},
	)

	c.JSON(http.StatusOK, skillSheet)
}

// SaveSkillSheet スキルシート情報を保存
func (h *SkillSheetHandler) SaveSkillSheet(c *gin.Context) {
	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationUpdate,
			Description: "スキルシート保存",
		},
		debug.RequestDebugData{
			Method: "PUT",
			URL:    "/api/v1/skill-sheet",
		},
	)

	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationUpdate,
				Description: "スキルシート保存",
			},
			debug.ErrorDebugData{
				ErrorType: "認証エラー",
				Metadata:  "ユーザーIDが見つかりません",
			},
		)
		c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
		return
	}

	// ユーザーIDがuuid.UUID型であることを確認
	userIDValue, ok := userID.(string)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationUpdate,
				Description: "スキルシート保存",
			},
			debug.ErrorDebugData{
				ErrorType: "バリデーションエラー",
				Metadata:  "無効なユーザーIDです",
			},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidUserID})
		return
	}

	// リクエストボディをバインド
	var request dto.SkillSheetSaveRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.logger.Error("Failed to bind request body", zap.Error(err))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationUpdate,
				Description: "スキルシート保存",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "リクエストボディエラー",
			},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidRequestBody})
		return
	}

	// データ処理ログ
	h.debugLogger.DataProcess(
		debug.DebugLogConfig{
			Category:    debug.CategoryService,
			Operation:   debug.OperationUpdate,
			Description: "スキルシート保存データ処理",
		},
		debug.DataProcessDebugData{
			ProcessType: "SkillSheetSaveRequest",
			InputData: map[string]interface{}{
				"user_id":        userIDValue,
				"work_histories": len(request.WorkHistory),
			},
		},
	)

	// スキルシート情報を更新
	err := h.skillSheetService.UpdateUserSkillSheetWithDTO(userIDValue, request, false)
	if err != nil {
		h.logger.Error("Failed to update skill sheet", zap.Error(err), zap.String("user_id", userIDValue))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationUpdate,
				Description: "スキルシート保存",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgSkillSheetUpdateError})
		return
	}

	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationUpdate,
			Description: "スキルシート保存",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"user_id": userIDValue,
				"message": "スキルシート情報を更新しました",
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"message": message.MsgSkillSheetUpdated})
}

// TempSaveSkillSheet スキルシート情報を一時保存
func (h *SkillSheetHandler) TempSaveSkillSheet(c *gin.Context) {
	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationCreate,
			Description: "スキルシート一時保存",
		},
		debug.RequestDebugData{
			Method: "POST",
			URL:    "/api/v1/skill-sheet/temp-save",
		},
	)

	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationCreate,
				Description: "スキルシート一時保存",
			},
			debug.ErrorDebugData{
				ErrorType: "認証エラー",
				Metadata:  "ユーザーIDが見つかりません",
			},
		)
		c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
		return
	}

	// ユーザーIDがuuid.UUID型であることを確認
	userIDValue, ok := userID.(string)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationCreate,
				Description: "スキルシート一時保存",
			},
			debug.ErrorDebugData{
				ErrorType: "バリデーションエラー",
				Metadata:  "無効なユーザーIDです",
			},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidUserID})
		return
	}

	// リクエストボディをバインド
	var request dto.SkillSheetTempSaveRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.logger.Error("Failed to bind request body", zap.Error(err))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationCreate,
				Description: "スキルシート一時保存",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "リクエストボディエラー",
			},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidRequestBody})
		return
	}

	// データ処理ログ
	h.debugLogger.DataProcess(
		debug.DebugLogConfig{
			Category:    debug.CategoryService,
			Operation:   debug.OperationCreate,
			Description: "スキルシート一時保存データ処理",
		},
		debug.DataProcessDebugData{
			ProcessType: "SkillSheetTempSaveRequest",
			InputData: map[string]interface{}{
				"user_id":        userIDValue,
				"work_histories": len(request.WorkHistory),
			},
		},
	)

	// スキルシート情報を一時保存（isTempSave = true）
	saveRequest := dto.SkillSheetSaveRequest{
		WorkHistory: request.WorkHistory,
	}
	err := h.skillSheetService.UpdateUserSkillSheetWithDTO(userIDValue, saveRequest, true)
	if err != nil {
		h.logger.Error("Failed to temp save skill sheet", zap.Error(err), zap.String("user_id", userIDValue))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationCreate,
				Description: "スキルシート一時保存",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgSkillSheetTempSaveError})
		return
	}

	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationCreate,
			Description: "スキルシート一時保存",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"user_id": userIDValue,
				"message": "スキルシート情報を一時保存しました",
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"message": message.MsgSkillSheetTempSaved})
}
