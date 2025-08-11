package handler

import (
	"net/http"

	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// UserHandler ユーザー管理ハンドラー
type UserHandler struct {
	userService service.UserService
	logger      *zap.Logger
}

// NewUserHandler UserHandlerのインスタンスを生成
func NewUserHandler(userService service.UserService, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: userService,
		logger:      logger,
	}
}

// UnlockAccountRequest アカウントロック解除リクエスト
type UnlockAccountRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

// CreateUser ユーザー作成ハンドラー
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req service.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	// メールアドレス形式チェック
	// TODO: Email validation is handled by Cognito
	// if !h.isValidEmail(req.Email) {
	//	c.JSON(http.StatusBadRequest, gin.H{"error": "メールアドレスの形式が正しくありません"})
	//	return
	// }

	user, err := h.userService.CreateUser(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Failed to create user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー作成に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// Login ログインハンドラー
func (h *UserHandler) Login(c *gin.Context) {
	var req service.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid login request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	user, token, err := h.userService.Login(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("Login failed", zap.Error(err))

		// ログイン失敗回数をチェック（実装は簡略化）
		failureCount := h.getLoginFailureCount(req.Email)
		if failureCount >= 5 {
			c.JSON(http.StatusLocked, gin.H{"error": "アカウントがロックされました。管理者にお問い合わせください"})
			return
		}

		if err.Error() == "メールアドレスまたはパスワードが正しくありません" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ログインに失敗しました"})
		}
		return
	}

	// ログイン成功時は失敗回数をリセット
	h.resetLoginFailureCount(req.Email)

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}

// UnlockAccount アカウントロック解除ハンドラー
func (h *UserHandler) UnlockAccount(c *gin.Context) {
	var req UnlockAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Invalid unlock request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err := h.userService.UnlockAccount(c.Request.Context(), req.UserID)
	if err != nil {
		h.logger.Error("Failed to unlock account", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "アカウントロック解除に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "アカウントのロックを解除しました"})
}

// Helper methods

func (h *UserHandler) getLoginFailureCount(email string) int {
	// 実際の実装では適切なストレージからログイン失敗回数を取得
	// ここではテスト用の簡単な実装
	return 0
}

func (h *UserHandler) resetLoginFailureCount(email string) {
	// 実際の実装では適切なストレージのログイン失敗回数をリセット
	// ここではテスト用の簡単な実装
}

// Helper functions for string operations
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func split(s, sep string) []string {
	if sep == "" {
		return []string{s}
	}

	var result []string
	start := 0

	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i = i + len(sep) - 1
		}
	}

	result = append(result, s[start:])
	return result
}
