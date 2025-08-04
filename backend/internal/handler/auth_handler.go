package handler

import (
	"bytes"
	"io"
	"net/http"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuthHandler 認証関連のハンドラー
type AuthHandler struct {
	cfg         *config.Config
	authService service.AuthService
	logger      *zap.Logger
}

// NewAuthHandler AuthHandlerのインスタンスを生成
func NewAuthHandler(cfg *config.Config, authService service.AuthService, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		cfg:         cfg,
		authService: authService,
		logger:      logger,
	}
}

// RegisterRequest ユーザー登録リクエスト
type RegisterRequest struct {
	Email       string     `json:"email" binding:"required,email"`
	Password    string     `json:"password" binding:"required,min=8"`
	FirstName   string     `json:"first_name" binding:"required"`
	LastName    string     `json:"last_name" binding:"required"`
	PhoneNumber string     `json:"phone_number"`
	Role        model.Role `json:"role" binding:"required"`
}

// LoginRequest ログインリクエスト
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshTokenRequest トークンリフレッシュリクエスト
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Register ユーザー登録ハンドラー
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		HandleErrorWithCode(c, message.ErrCodeInvalidRequest, message.MsgInvalidRequest, h.logger, err)
		return
	}

	// 管理者ロールのみが他のユーザーを登録できる制限を追加する場合
	// currentRole, exists := c.Get("role")
	// if !exists || currentRole != string(model.RoleAdmin) {
	// 	RespondErrorWithCode(c, message.ErrCodeForbidden, message.MsgForbidden)
	// 	return
	// }

	user, err := h.authService.RegisterUser(
		req.Email,
		req.Password,
		req.FirstName,
		req.LastName,
		req.PhoneNumber,
		req.Role,
	)
	if err != nil {
		HandleError(c, http.StatusBadRequest, err.Error(), h.logger, err)
		return
	}

	RespondSuccess(c, http.StatusCreated, message.MsgUserRegistered, gin.H{"user": user})
}

// Login ログインハンドラー
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	// デバッグ用: リクエストボディを読み取ってログ出力
	bodyBytes, _ := c.GetRawData()
	h.logger.Info("Raw request body", zap.String("body", string(bodyBytes)))
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Login request validation failed",
			zap.Error(err),
			zap.String("raw_body", string(bodyBytes)),
			zap.String("error_detail", err.Error()),
		)
		HandleErrorWithCode(c, message.ErrCodeInvalidRequest, message.MsgInvalidRequest, h.logger, err)
		return
	}

	h.logger.Info("Login request received",
		zap.String("email", req.Email),
		zap.Bool("has_password", req.Password != ""),
	)

	// ユーザーエージェントとIPアドレスを取得
	userAgent := c.GetHeader("User-Agent")
	ipAddress := c.ClientIP()

	response, err := h.authService.Login(c.Request.Context(), req.Email, req.Password, userAgent, ipAddress)
	if err != nil {
		HandleError(c, http.StatusUnauthorized, err.Error(), h.logger, err, "email", req.Email)
		return
	}

	// トークンをクッキーとレスポンスに設定
	h.setAuthCookies(c, response.AccessToken, response.RefreshToken)

	// 監査ログ用にユーザー情報をコンテキストに設定
	c.Set("user_id", response.User.ID)
	c.Set("user", response.User)
	c.Set("email", response.User.Email)
	c.Set("role", response.User.Role)

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"access_token":  response.AccessToken,
		"refresh_token": response.RefreshToken,
		"user":          response.User,
		"expires_at":    response.ExpiresAt,
	})
}

// RefreshToken トークンリフレッシュハンドラー
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest

	// JSONからリフレッシュトークンを取得
	if err := c.ShouldBindJSON(&req); err != nil {
		// JSONから取得できない場合はクッキーから取得
		var err error
		req.RefreshToken, err = c.Cookie("refresh_token")
		if err != nil || req.RefreshToken == "" {
			RespondErrorWithCode(c, message.ErrCodeInvalidRequest, message.MsgRefreshTokenRequired)
			return
		}
	}

	response, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		HandleError(c, http.StatusUnauthorized, err.Error(), h.logger, err)
		return
	}

	// トークンをクッキーとレスポンスに設定
	h.setAuthCookies(c, response.AccessToken, response.RefreshToken)

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"access_token":  response.AccessToken,
		"refresh_token": response.RefreshToken,
		"user":          response.User,
		"expires_at":    response.ExpiresAt,
	})
}

// Logout ログアウトハンドラー
func (h *AuthHandler) Logout(c *gin.Context) {
	// リフレッシュトークンを取得してサービスのログアウト処理を呼び出し
	refreshToken, err := c.Cookie("refresh_token")
	if err == nil && refreshToken != "" {
		// サービス側でのログアウト処理（セッション削除など）
		if logoutErr := h.authService.Logout(c.Request.Context(), refreshToken); logoutErr != nil {
			h.logger.Warn("サービス側ログアウト処理エラー", zap.Error(logoutErr))
			// エラーが発生してもクッキーはクリアする
		}
	}

	// クッキーをクリア
	h.clearAuthCookies(c)
	RespondSuccess(c, http.StatusOK, message.MsgLoggedOut, nil)
}

// Me 現在のユーザー情報を取得
func (h *AuthHandler) Me(c *gin.Context) {
	// ミドルウェアによって設定されたユーザー情報を取得
	userInterface, exists := c.Get("user")
	if !exists {
		utils.RespondUnauthorized(c, "認証が必要です")
		return
	}

	user, ok := userInterface.(*model.User)
	if !ok {
		h.logger.Error("ユーザー情報の形式が無効です")
		utils.RespondError(c, http.StatusInternalServerError, "ユーザー情報の取得に失敗しました")
		return
	}

	RespondSuccess(c, http.StatusOK, "", gin.H{
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"role":       user.Role,
			"status":     user.Status,
		},
	})
}

// ヘルパーメソッド

// setAuthCookies トークンをクッキーに設定
func (h *AuthHandler) setAuthCookies(c *gin.Context, accessToken, refreshToken string) {
	c.SetCookie(
		"access_token",
		accessToken,
		3600, // 1時間
		"/",
		"",
		false, // HTTPSの場合はtrueに
		true,  // JavaScriptからアクセス不可
	)
	c.SetCookie(
		"refresh_token",
		refreshToken,
		604800, // 7日間
		"/",
		"",
		false, // HTTPSの場合はtrueに
		true,  // JavaScriptからアクセス不可
	)
}

// clearAuthCookies 認証クッキーをクリア
func (h *AuthHandler) clearAuthCookies(c *gin.Context) {
	c.SetCookie(
		"access_token",
		"",
		-1,
		"/",
		"",
		false,
		true,
	)
	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		"",
		false,
		true,
	)
}
