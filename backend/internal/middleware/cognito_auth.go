package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	cfg "github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// JWK JSON Web Key構造体
type JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Alg string `json:"alg"`
}

// JWKSet JWK Set構造体
type JWKSet struct {
	Keys []JWK `json:"keys"`
}

// JWKCache JWKキャッシュ構造体
type JWKCache struct {
	keys      map[string]*rsa.PublicKey
	expiresAt time.Time
	mutex     sync.RWMutex
}

// CognitoAuthMiddleware Cognito認証ミドルウェア
type CognitoAuthMiddleware struct {
	config   *cfg.Config
	userRepo repository.UserRepository
	logger   *zap.Logger
	jwkCache *JWKCache
	client   *http.Client
}

// NewCognitoAuthMiddleware 新しいCognito認証ミドルウェアを作成
func NewCognitoAuthMiddleware(
	config *cfg.Config,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) *CognitoAuthMiddleware {
	return &CognitoAuthMiddleware{
		config:   config,
		userRepo: userRepo,
		logger:   logger,
		jwkCache: &JWKCache{
			keys: make(map[string]*rsa.PublicKey),
		},
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// AuthRequired 認証が必要なエンドポイント用のミドルウェア
func (m *CognitoAuthMiddleware) AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// デバッグログ追加
		m.logger.Info("AuthRequired called",
			zap.Bool("Cognito.Enabled", m.config.Cognito.Enabled),
			zap.Bool("Cognito.AuthSkipMode", m.config.Cognito.AuthSkipMode))

		// Cognitoが無効な場合
		if !m.config.Cognito.Enabled {
			m.logger.Info("Cognito is disabled")
			// 認証スキップモードの場合は開発用ユーザーを設定
			if m.config.Cognito.AuthSkipMode {
				m.logger.Info("Setting development user")
				m.setDevelopmentUser(c)
			}
			c.Next()
			return
		}

		// 開発用: 認証スキップモード
		if m.config.Cognito.AuthSkipMode {
			m.setDevelopmentUser(c)
			c.Next()
			return
		}

		// トークンを取得
		token := m.extractToken(c)
		if token == "" {
			m.logger.Warn("認証トークンが見つかりません")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		// トークンを検証
		claims, err := m.validateToken(token)
		if err != nil {
			m.logger.Error("トークン検証エラー", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			c.Abort()
			return
		}

		// ユーザー情報を取得
		user, err := m.getUserFromClaims(c.Request.Context(), claims)
		if err != nil {
			m.logger.Error("ユーザー情報取得エラー", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザー情報が取得できません"})
			c.Abort()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("email", user.Email)
		c.Set("role", user.DefaultRole) // 互換性のため
		c.Set("roles", []model.Role{user.Role})      // 複数ロール対応
		c.Set("cognito_sub", claims["sub"])

		c.Next()
	}
}

// OptionalAuth 認証が任意のエンドポイント用のミドルウェア
func (m *CognitoAuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Cognitoが無効な場合
		if !m.config.Cognito.Enabled {
			// 認証スキップモードの場合は開発用ユーザーを設定
			if m.config.Cognito.AuthSkipMode {
				m.setDevelopmentUser(c)
			}
			c.Next()
			return
		}

		// トークンを取得
		token := m.extractToken(c)
		if token == "" {
			c.Next()
			return
		}

		// トークンを検証
		claims, err := m.validateToken(token)
		if err != nil {
			m.logger.Warn("任意認証でのトークン検証エラー", zap.Error(err))
			c.Next()
			return
		}

		// ユーザー情報を取得
		user, err := m.getUserFromClaims(c.Request.Context(), claims)
		if err != nil {
			m.logger.Warn("任意認証でのユーザー情報取得エラー", zap.Error(err))
			c.Next()
			return
		}

		// コンテキストにユーザー情報を設定
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("email", user.Email)
		c.Set("role", user.DefaultRole) // 互換性のため
		c.Set("roles", []model.Role{user.Role})      // 複数ロール対応
		c.Set("cognito_sub", claims["sub"])

		c.Next()
	}
}

// AdminRequired 管理者権限が必要なエンドポイント用のミドルウェア
func (m *CognitoAuthMiddleware) AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// まず認証チェック
		authMiddleware := m.AuthRequired()
		authMiddleware(c)

		if c.IsAborted() {
			return
		}

		// ユーザー情報を取得
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザー情報が見つかりません"})
			c.Abort()
			return
		}

		user, ok := userInterface.(*model.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の形式が無効です"})
			c.Abort()
			return
		}

		// 管理者権限をチェック（スーパー管理者または管理者）
		if user.Role != model.RoleSuperAdmin && user.Role != model.RoleAdmin {
			m.logger.Warn("管理者権限なしでのアクセス試行",
				zap.String("user_id", user.ID),
				zap.Int("role", int(user.Role)),
			)
			c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// extractToken リクエストからトークンを抽出
func (m *CognitoAuthMiddleware) extractToken(c *gin.Context) string {
	// Authorizationヘッダーから取得
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		// "Bearer TOKEN" 形式
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}

	// Cookieから取得（フォールバック）
	cookie, err := c.Cookie("access_token")
	if err == nil && cookie != "" {
		return cookie
	}

	return ""
}

// validateToken トークンを検証
func (m *CognitoAuthMiddleware) validateToken(tokenString string) (jwt.MapClaims, error) {
	// トークンをパース
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// アルゴリズムをチェック
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("予期しない署名方法: %v", token.Header["alg"])
		}

		// Kid（Key ID）を取得
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kidヘッダーが見つかりません")
		}

		// 公開鍵を取得
		publicKey, err := m.getPublicKey(kid)
		if err != nil {
			return nil, fmt.Errorf("公開鍵の取得に失敗しました: %w", err)
		}

		return publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("トークンのパースに失敗しました: %w", err)
	}

	// Claimsを取得
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("無効なトークンです")
	}

	// 基本的なClaimsを検証
	if err := m.validateClaims(claims); err != nil {
		return nil, fmt.Errorf("クレーム検証に失敗しました: %w", err)
	}

	return claims, nil
}

// validateClaims Claimsを検証
func (m *CognitoAuthMiddleware) validateClaims(claims jwt.MapClaims) error {
	// Issuerを検証
	iss, ok := claims["iss"].(string)
	if !ok {
		return fmt.Errorf("issuerが見つかりません")
	}

	expectedIssuer := m.config.Cognito.GetIssuer()
	if iss != expectedIssuer {
		return fmt.Errorf("無効なissuer: expected %s, got %s", expectedIssuer, iss)
	}

	// token_useを検証
	tokenUse, ok := claims["token_use"].(string)
	if !ok {
		return fmt.Errorf("token_useが見つかりません")
	}

	// IDトークンまたはアクセストークンを許可
	if tokenUse != "id" && tokenUse != "access" {
		return fmt.Errorf("無効なtoken_use: %s", tokenUse)
	}

	// 有効期限を検証
	exp, ok := claims["exp"].(float64)
	if !ok {
		return fmt.Errorf("有効期限が見つかりません")
	}

	if time.Now().Unix() > int64(exp) {
		return fmt.Errorf("トークンの有効期限が切れています")
	}

	// Client IDを検証（IDトークンの場合）
	if tokenUse == "id" {
		aud, ok := claims["aud"].(string)
		if !ok {
			return fmt.Errorf("audienceが見つかりません")
		}

		if aud != m.config.Cognito.ClientID {
			return fmt.Errorf("無効なaudience: %s", aud)
		}
	}

	return nil
}

// getUserFromClaims ClaimsからユーザーDBレコードを取得
func (m *CognitoAuthMiddleware) getUserFromClaims(ctx context.Context, claims jwt.MapClaims) (*model.User, error) {
	// CognitoサブIDを取得
	cognitoSub, ok := claims["sub"].(string)
	if !ok {
		return nil, fmt.Errorf("subが見つかりません")
	}

	// DBからユーザーを取得
	user, err := m.userRepo.GetByCognitoSub(ctx, cognitoSub)
	if err != nil {
		// ユーザーが見つからない場合はメールアドレスで検索
		email, ok := claims["email"].(string)
		if !ok {
			return nil, fmt.Errorf("ユーザーが見つかりません: sub=%s", cognitoSub)
		}

		user, err = m.userRepo.GetByEmail(ctx, email)
		if err != nil {
			return nil, fmt.Errorf("ユーザーが見つかりません: email=%s", email)
		}

		// CognitoサブIDを更新
		user.ID = cognitoSub
		if err := m.userRepo.Update(ctx, user); err != nil {
			m.logger.Error("CognitoサブID更新エラー", zap.Error(err))
		}
	}

	return user, nil
}

// getPublicKey Kid（Key ID）に対応する公開鍵を取得
func (m *CognitoAuthMiddleware) getPublicKey(kid string) (*rsa.PublicKey, error) {
	m.jwkCache.mutex.RLock()

	// キャッシュから取得を試行
	if key, exists := m.jwkCache.keys[kid]; exists && time.Now().Before(m.jwkCache.expiresAt) {
		m.jwkCache.mutex.RUnlock()
		return key, nil
	}

	m.jwkCache.mutex.RUnlock()

	// キャッシュにない、または期限切れの場合はJWKSetを取得
	return m.fetchAndCacheJWK(kid)
}

// fetchAndCacheJWK JWKSetを取得してキャッシュに保存
func (m *CognitoAuthMiddleware) fetchAndCacheJWK(kid string) (*rsa.PublicKey, error) {
	m.jwkCache.mutex.Lock()
	defer m.jwkCache.mutex.Unlock()

	// ダブルチェック（他のgoroutineが既に更新している可能性）
	if key, exists := m.jwkCache.keys[kid]; exists && time.Now().Before(m.jwkCache.expiresAt) {
		return key, nil
	}

	// JWKSetを取得
	jwkURL := m.config.Cognito.GetJWKURL()
	m.logger.Info("JWKSetを取得中", zap.String("url", jwkURL))

	resp, err := m.client.Get(jwkURL)
	if err != nil {
		return nil, fmt.Errorf("JWKSetの取得に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("JWKSetの取得に失敗しました: status %d", resp.StatusCode)
	}

	var jwkSet JWKSet
	if err := json.NewDecoder(resp.Body).Decode(&jwkSet); err != nil {
		return nil, fmt.Errorf("JWKSetのパースに失敗しました: %w", err)
	}

	// キャッシュを更新
	m.jwkCache.keys = make(map[string]*rsa.PublicKey)

	for _, jwk := range jwkSet.Keys {
		if jwk.Kty != "RSA" {
			continue
		}

		publicKey, err := m.parseRSAPublicKey(jwk)
		if err != nil {
			m.logger.Error("RSA公開鍵のパースに失敗", zap.String("kid", jwk.Kid), zap.Error(err))
			continue
		}

		m.jwkCache.keys[jwk.Kid] = publicKey
	}

	// キャッシュの有効期限を設定
	m.jwkCache.expiresAt = time.Now().Add(m.config.Cognito.JWKCacheDuration)

	// 要求されたKidの鍵を返す
	if key, exists := m.jwkCache.keys[kid]; exists {
		return key, nil
	}

	return nil, fmt.Errorf("指定されたkid '%s' の公開鍵が見つかりません", kid)
}

// parseRSAPublicKey JWKからRSA公開鍵をパース
func (m *CognitoAuthMiddleware) parseRSAPublicKey(jwk JWK) (*rsa.PublicKey, error) {
	// Base64URLデコード
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("nのデコードに失敗しました: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("eのデコードに失敗しました: %w", err)
	}

	// RSA公開鍵を構築
	var eInt int
	for _, b := range eBytes {
		eInt = eInt*256 + int(b)
	}

	publicKey := &rsa.PublicKey{
		N: big.NewInt(0).SetBytes(nBytes),
		E: eInt,
	}

	// 公開鍵を検証
	if err := validateRSAPublicKey(publicKey); err != nil {
		return nil, fmt.Errorf("無効なRSA公開鍵: %w", err)
	}

	return publicKey, nil
}

// validateRSAPublicKey RSA公開鍵の妥当性を検証
func validateRSAPublicKey(key *rsa.PublicKey) error {
	// 鍵のサイズをチェック（最小2048ビット）
	if key.N.BitLen() < 2048 {
		return fmt.Errorf("RSA鍵のサイズが小さすぎます: %d bits", key.N.BitLen())
	}

	// 指数をチェック
	if key.E < 3 || key.E > 65537 {
		return fmt.Errorf("無効なRSA指数: %d", key.E)
	}

	return nil
}

// setDevelopmentUser 開発環境用のダミーユーザーを設定
func (m *CognitoAuthMiddleware) setDevelopmentUser(c *gin.Context) {
	// 開発用のダミーユーザー情報
	adminRole := model.RoleAdmin // Role型の定数を使用

	// IDを設定
	userID := "00000000-0000-0000-0000-000000000001"

	devUser := &model.User{
		ID:          userID,
		Email:       "dev@duesk.co.jp",
		FirstName:   "開発",
		LastName:    "ユーザー",
		Role:        adminRole,  // Roleフィールドに直接設定
		DefaultRole: &adminRole, // ポインタで設定
		Status:      "active",
	}

	// コンテキストにユーザー情報を設定
	c.Set("user", devUser)
	c.Set("user_id", devUser.ID)
	c.Set("email", devUser.Email)
	c.Set("role", devUser.DefaultRole) // 互換性のため
	c.Set("roles", []model.Role{devUser.Role})      // 複数ロール対応
	c.Set("cognito_sub", "dev-user-sub")

	m.logger.Debug("開発用ユーザーを設定しました",
		zap.String("email", devUser.Email),
		zap.Int("role", int(adminRole)))
}
