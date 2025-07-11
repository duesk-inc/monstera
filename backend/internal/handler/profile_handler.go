package handler

import (
	"fmt"
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

// ProfileHandler プロフィール関連のハンドラー
type ProfileHandler struct {
	cfg            *config.Config
	profileService *service.ProfileService
	logger         *zap.Logger
	debugLogger    *debug.DebugLogger
}

// NewProfileHandler ProfileHandlerのインスタンスを生成
func NewProfileHandler(cfg *config.Config, profileService *service.ProfileService, logger *zap.Logger) *ProfileHandler {
	return &ProfileHandler{
		cfg:            cfg,
		profileService: profileService,
		logger:         logger,
		debugLogger:    debug.NewDebugLogger(logger),
	}
}

// GetProfile ユーザーのプロフィール情報を取得
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "プロフィール取得",
		},
		debug.RequestDebugData{
			Method: "GET",
			URL:    "/api/v1/profile",
		},
	)

	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationRead,
				Description: "プロフィール取得",
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
	userIDValue, ok := userID.(uuid.UUID)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationRead,
				Description: "プロフィール取得",
			},
			debug.ErrorDebugData{
				ErrorType: "バリデーションエラー",
				Metadata:  "無効なユーザーIDです",
			},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidUserID})
		return
	}

	// プロフィール情報を取得
	profile, err := h.profileService.GetUserProfile(userIDValue)
	if err != nil {
		h.logger.Error("Failed to get profile", zap.Error(err), zap.String("user_id", userIDValue.String()))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationRead,
				Description: "プロフィール取得",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgProfileGetError})
		return
	}

	// デバッグログ: レスポンスデータ
	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "プロフィール取得",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"user_id":              userIDValue.String(),
				"profile_id":           profile.ID,
				"certifications_count": len(profile.Certifications),
				"certifications":       profile.Certifications,
			},
		},
	)

	c.JSON(http.StatusOK, profile)
}

// GetProfileWithWorkHistory ユーザーのプロフィール情報と職務経歴を取得
func (h *ProfileHandler) GetProfileWithWorkHistory(c *gin.Context) {
	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
		return
	}

	// ユーザーIDがuuid.UUID型であることを確認
	userIDValue, ok := userID.(uuid.UUID)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidUserID})
		return
	}

	// プロフィール情報と職務経歴を取得
	profile, workHistories, err := h.profileService.GetUserProfileWithWorkHistory(userIDValue)
	if err != nil {
		h.logger.Error("Failed to get profile with work history", zap.Error(err), zap.String("user_id", userIDValue.String()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgProfileGetError})
		return
	}

	// レスポンスを作成
	response := gin.H{
		"profile":      profile,
		"work_history": workHistories,
	}

	c.JSON(http.StatusOK, response)
}

// GetProfileHistory 指定されたバージョンのプロフィール履歴を取得
func (h *ProfileHandler) GetProfileHistory(c *gin.Context) {
	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": message.MsgUnauthorized})
		return
	}

	// ユーザーIDがuuid.UUID型であることを確認
	userIDValue, ok := userID.(uuid.UUID)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidUserID})
		return
	}

	// バージョンパラメータを取得
	versionStr := c.Query("version")
	if versionStr != "" {
		// 特定バージョンの履歴を取得
		var version int
		if _, err := fmt.Sscanf(versionStr, "%d", &version); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": message.MsgInvalidVersionNumber})
			return
		}

		history, err := h.profileService.GetProfileHistoryByVersion(userIDValue, version)
		if err != nil {
			h.logger.Error("Failed to get profile history by version", zap.Error(err), zap.String("user_id", userIDValue.String()), zap.Int("version", version))
			c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgProfileHistoryGetError})
			return
		}

		c.JSON(http.StatusOK, history)
	} else {
		// 最新の履歴を取得
		history, err := h.profileService.GetLatestProfileHistory(userIDValue)
		if err != nil {
			h.logger.Error("Failed to get latest profile history", zap.Error(err), zap.String("user_id", userIDValue.String()))
			c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgProfileHistoryGetError})
			return
		}

		c.JSON(http.StatusOK, history)
	}
}

// SaveProfile プロフィール情報を保存
func (h *ProfileHandler) SaveProfile(c *gin.Context) {
	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationUpdate,
			Description: "プロフィール保存",
		},
		debug.RequestDebugData{
			Method: "POST",
			URL:    "/api/v1/profile",
		},
	)

	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationUpdate,
				Description: "プロフィール保存",
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
	userIDValue, ok := userID.(uuid.UUID)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationUpdate,
				Description: "プロフィール保存",
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
	var request dto.ProfileSaveRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.logger.Error("Failed to bind request body", zap.Error(err))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationUpdate,
				Description: "プロフィール保存",
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
			Description: "プロフィール保存データ処理",
		},
		debug.DataProcessDebugData{
			ProcessType: "ProfileSaveRequest",
			InputData: map[string]interface{}{
				"user_id":         userIDValue.String(),
				"education":       request.Education,
				"nearest_station": request.NearestStation,
				"can_travel":      request.CanTravel,
				"certifications":  len(request.Certifications),
				"work_histories":  len(request.WorkHistory),
			},
		},
	)

	// プロフィール情報を更新
	err := h.profileService.UpdateUserProfileWithDTO(userIDValue, request, false)
	if err != nil {
		h.logger.Error("Failed to update profile", zap.Error(err), zap.String("user_id", userIDValue.String()))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationUpdate,
				Description: "プロフィール保存",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		// サービスから返されたエラーメッセージをそのまま返す
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationUpdate,
			Description: "プロフィール保存",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"user_id": userIDValue.String(),
				"message": "プロフィール情報を更新しました",
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"message": message.MsgProfileUpdated})
}

// TempSaveProfile プロフィール情報を一時保存
func (h *ProfileHandler) TempSaveProfile(c *gin.Context) {
	// デバッグログ: リクエスト開始
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationCreate,
			Description: "プロフィール一時保存",
		},
		debug.RequestDebugData{
			Method: "POST",
			URL:    "/api/v1/profile/temp-save",
		},
	)

	// ミドルウェアによって設定されたユーザーIDを取得
	userID, exists := c.Get("user_id")
	if !exists {
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationCreate,
				Description: "プロフィール一時保存",
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
	userIDValue, ok := userID.(uuid.UUID)
	if !ok {
		h.logger.Error("Invalid user ID type", zap.Any("user_id", userID))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationCreate,
				Description: "プロフィール一時保存",
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
	var request dto.ProfileSaveRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		h.logger.Error("Failed to bind request body", zap.Error(err))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryAPI,
				Operation:   debug.OperationCreate,
				Description: "プロフィール一時保存",
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
			Description: "プロフィール一時保存データ処理",
		},
		debug.DataProcessDebugData{
			ProcessType: "ProfileSaveRequest",
			InputData: map[string]interface{}{
				"user_id":         userIDValue.String(),
				"education":       request.Education,
				"nearest_station": request.NearestStation,
				"can_travel":      request.CanTravel,
				"certifications":  len(request.Certifications),
				"work_histories":  len(request.WorkHistory),
			},
		},
	)

	// プロフィール情報を一時保存（isTempSave = true）
	err := h.profileService.UpdateUserProfileWithDTO(userIDValue, request, true)
	if err != nil {
		h.logger.Error("Failed to temp save profile", zap.Error(err), zap.String("user_id", userIDValue.String()))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationCreate,
				Description: "プロフィール一時保存",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		// サービスから返されたエラーメッセージをそのまま返す
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationCreate,
			Description: "プロフィール一時保存",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"user_id": userIDValue.String(),
				"message": "プロフィール情報を一時保存しました",
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"message": message.MsgProfileTempSaved})
}

// GetTechnologyCategories 技術カテゴリ一覧を取得
func (h *ProfileHandler) GetTechnologyCategories(c *gin.Context) {
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "技術カテゴリ取得",
		},
		debug.RequestDebugData{
			Method: "GET",
			URL:    "/api/v1/profile/technology-categories",
		},
	)

	// 技術カテゴリ一覧を取得
	categories, err := h.profileService.GetTechnologyCategories()
	if err != nil {
		h.logger.Error("Failed to get technology categories", zap.Error(err))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationRead,
				Description: "技術カテゴリ取得",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgTechnologyCategoryGetError})
		return
	}

	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "技術カテゴリ取得",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"categories_count": len(categories),
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// GetCommonCertifications よく使う資格一覧を取得
func (h *ProfileHandler) GetCommonCertifications(c *gin.Context) {
	h.debugLogger.RequestStart(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "よく使う資格一覧取得",
		},
		debug.RequestDebugData{
			Method: "GET",
			URL:    "/api/v1/profile/common-certifications",
		},
	)

	// よく使う資格一覧を取得
	certifications, err := h.profileService.GetCommonCertifications()
	if err != nil {
		h.logger.Error("Failed to get common certifications", zap.Error(err))
		h.debugLogger.RequestError(
			debug.DebugLogConfig{
				Category:    debug.CategoryService,
				Operation:   debug.OperationRead,
				Description: "よく使う資格一覧取得",
			},
			debug.ErrorDebugData{
				Error:     err,
				ErrorType: "サービスエラー",
			},
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": message.MsgCertificationListGetError})
		return
	}

	h.debugLogger.RequestSuccess(
		debug.DebugLogConfig{
			Category:    debug.CategoryAPI,
			Operation:   debug.OperationRead,
			Description: "よく使う資格一覧取得",
		},
		debug.ResponseDebugData{
			StatusCode: http.StatusOK,
			Metadata: map[string]interface{}{
				"certifications_count": len(certifications),
			},
		},
	)

	c.JSON(http.StatusOK, gin.H{"certifications": certifications})
}
