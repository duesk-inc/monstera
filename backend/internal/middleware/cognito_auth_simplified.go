package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"go.uber.org/zap"
)

// CognitoAuthMiddleware Cognito認証ミドルウェア（簡素化版）
type CognitoAuthMiddleware struct {
	cfg           *config.Config
	logger        *zap.Logger
	cognitoClient *cognitoidentityprovider.Client
	userRepo      repository.UserRepository
	jwks          jwk.Set
}

// NewCognitoAuthMiddleware 新しいCognito認証ミドルウェアを作成
func NewCognitoAuthMiddleware(
	cfg *config.Config,
	logger *zap.Logger,
	cognitoClient *cognitoidentityprovider.Client,
	userRepo repository.UserRepository,
) (*CognitoAuthMiddleware, error) {
	// JWKSエンドポイントからキーセットを取得
	jwksURL := fmt.Sprintf(
		"https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json",
		cfg.Cognito.Region,
		cfg.Cognito.UserPoolID,
	)

	jwks, err := jwk.Fetch(context.Background(), jwksURL)
	if err != nil {
		return nil, fmt.Errorf("JWKSの取得に失敗しました: %w", err)
	}

	return &CognitoAuthMiddleware{
		cfg:           cfg,
		logger:        logger,
		cognitoClient: cognitoClient,
		userRepo:      userRepo,
		jwks:          jwks,
	}, nil
}

// AuthRequired 認証必須ミドルウェア
func (m *CognitoAuthMiddleware) AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 開発時の認証スキップ
		if m.cfg.Cognito.AuthSkipMode {
			m.handleAuthSkipMode(c)
			return
		}

		// Bearerトークンの取得
		token, err := m.extractBearerToken(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		// トークンの検証とクレームの取得
		claims, err := m.verifyToken(token)
		if err != nil {
			m.logger.Error("トークン検証エラー", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			c.Abort()
			return
		}

		// ユーザー情報の取得
		user, err := m.getUserFromClaims(c.Request.Context(), claims)
		if err != nil {
			m.logger.Error("ユーザー取得エラー", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーが見つかりません"})
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("role", string(user.Role))
		c.Set("cognito_sub", user.ID) // IDがCognito Sub

		c.Next()
	}
}

// AdminRequired 管理者権限必須ミドルウェア
func (m *CognitoAuthMiddleware) AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		user, ok := userInterface.(*model.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
			c.Abort()
			return
		}

		// 管理者権限チェック
		if !user.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ManagerRequired マネージャー権限必須ミドルウェア
func (m *CognitoAuthMiddleware) ManagerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		user, ok := userInterface.(*model.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
			c.Abort()
			return
		}

		// マネージャー権限チェック
		if !user.IsManager() {
			c.JSON(http.StatusForbidden, gin.H{"error": "マネージャー権限が必要です"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// extractBearerToken リクエストからBearerトークンを抽出
func (m *CognitoAuthMiddleware) extractBearerToken(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("Authorizationヘッダーがありません")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("無効なAuthorizationヘッダー形式です")
	}

	return parts[1], nil
}

// verifyToken JWTトークンを検証
func (m *CognitoAuthMiddleware) verifyToken(tokenString string) (jwt.MapClaims, error) {
	// トークンのパース
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// kid（Key ID）の取得
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kidが見つかりません")
		}

		// 対応する公開鍵の取得
		key, ok := m.jwks.LookupKeyID(kid)
		if !ok {
			return nil, fmt.Errorf("対応する公開鍵が見つかりません: kid=%s", kid)
		}

		// 公開鍵の取得
		var rawKey interface{}
		if err := key.Raw(&rawKey); err != nil {
			return nil, fmt.Errorf("公開鍵の取得に失敗しました: %w", err)
		}

		return rawKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("トークンのパースに失敗しました: %w", err)
	}

	// 有効性チェック
	if !token.Valid {
		return nil, fmt.Errorf("無効なトークンです")
	}

	// クレームの取得
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("クレームの取得に失敗しました")
	}

	// トークンの用途チェック
	tokenUse, ok := claims["token_use"].(string)
	if !ok || tokenUse != "access" {
		return nil, fmt.Errorf("無効なトークンタイプです")
	}

	// クライアントIDチェック
	clientID, ok := claims["client_id"].(string)
	if !ok || clientID != m.cfg.Cognito.ClientID {
		return nil, fmt.Errorf("無効なクライアントIDです")
	}

	return claims, nil
}

// getUserFromClaims ClaimsからユーザーDBレコードを取得（簡素化版）
func (m *CognitoAuthMiddleware) getUserFromClaims(ctx context.Context, claims jwt.MapClaims) (*model.User, error) {
	// CognitoサブIDを取得
	cognitoSub, ok := claims["sub"].(string)
	if !ok {
		return nil, fmt.Errorf("subが見つかりません")
	}

	// Cognito SubをIDとして直接使用
	user, err := m.userRepo.GetByID(ctx, cognitoSub)
	if err != nil {
		return nil, fmt.Errorf("ユーザーが見つかりません: id=%s", cognitoSub)
	}

	return user, nil
}

// handleAuthSkipMode 開発用の認証スキップモード処理
func (m *CognitoAuthMiddleware) handleAuthSkipMode(c *gin.Context) {
	// デフォルトのテストユーザー
	testUser := &model.User{
		ID:        "test-cognito-sub-12345",
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		Name:      "Test User",
		Role:      model.RoleSuperAdmin,
		Active:    true,
		Status:    "active",
	}

	// ヘッダーでユーザーIDが指定されている場合は取得を試みる
	if userID := c.GetHeader("X-Auth-Skip-User-ID"); userID != "" {
		if user, err := m.userRepo.GetByID(c.Request.Context(), userID); err == nil {
			testUser = user
		}
	}

	// コンテキストに設定
	c.Set("user", testUser)
	c.Set("user_id", testUser.ID)
	c.Set("role", string(testUser.Role))
	c.Set("cognito_sub", testUser.ID)
	c.Set("auth_skip_mode", true)

	m.logger.Debug("認証スキップモードでリクエストを処理",
		zap.String("user_id", testUser.ID),
		zap.String("email", testUser.Email),
	)

	c.Next()
}

// RefreshToken トークンをリフレッシュ
func (m *CognitoAuthMiddleware) RefreshToken(ctx context.Context, refreshToken string) (*cognitoidentityprovider.InitiateAuthOutput, error) {
	input := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: "REFRESH_TOKEN_AUTH",
		ClientId: aws.String(m.cfg.Cognito.ClientID),
		AuthParameters: map[string]string{
			"REFRESH_TOKEN": refreshToken,
		},
	}

	return m.cognitoClient.InitiateAuth(ctx, input)
}
