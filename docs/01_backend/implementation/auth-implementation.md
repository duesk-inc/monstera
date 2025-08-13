# 認証・認可実装仕様書

## 概要

認証・認可システムはユーザーの身元確認とアクセス権限の管理を担当します。
Monsteraプロジェクトでは、AWS Cognitoを活用した認証システムを採用しています。

## 実装規約

### 基本原則

- **セキュアな認証**: 強固な認証メカニズムの実装
- **統一されたアクセス制御**: 一貫した認可ポリシー
- **トークン管理**: Cognitoトークンの適切な検証
- **セッション管理**: セキュアなセッション制御
- **ロールベースアクセス制御**: RBAC実装（数値ベース）
- **監査ログ**: セキュリティイベントの記録
- **Cookie認証**: HTTPOnly Cookieによるセキュアなトークン管理

### 認証フロー

#### Cognito認証フロー
```
1. ユーザーがメールアドレス/パスワードでログイン
2. バックエンドがCognitoで認証
3. Cognitoトークン（ID/Access/Refresh）を取得
4. HTTPOnly Cookieにトークンを設定
5. ユーザー情報をLocalStorageに保存（UI表示用）
6. APIリクエスト時にCookieからトークンを自動送信
7. ミドルウェアでJWK検証
8. 401エラー時は自動的にトークンをリフレッシュ
```

## 実装パターン

### 1. 認証システム

#### 環境設定

```go
// Cognito設定
type CognitoConfig struct {
    Enabled          bool          // Cognito認証の有効化
    Region           string        // AWSリージョン
    UserPoolID       string        // ユーザープールID
    ClientID         string        // クライアントID
    ClientSecret     string        // クライアントシークレット
    Endpoint         string        // ローカル開発用エンドポイント
    JWKCacheDuration time.Duration // JWKキャッシュ期間（デフォルト: 1時間）
}
```

#### Cognito認証サービス

```go
// CognitoAuthService AWS Cognitoを使用した認証サービス
type CognitoAuthService struct {
    client      *cognitoidentityprovider.Client
    cfg         *cfg.Config
    db          *gorm.DB
    userRepo    repository.UserRepository
    sessionRepo repository.SessionRepository
    logger      *zap.Logger
}

// Login Cognitoを使用したログイン
func (s *CognitoAuthService) Login(ctx context.Context, email, password, userAgent, ipAddress string) (*AuthResponse, error) {
    // ローカル開発環境の場合はAdminInitiateAuthを使用
    if s.cfg.Cognito.Endpoint != "" {
        authInput := &cognitoidentityprovider.AdminInitiateAuthInput{
            UserPoolId: aws.String(s.cfg.Cognito.UserPoolID),
            ClientId:   aws.String(s.cfg.Cognito.ClientID),
            AuthFlow:   types.AuthFlowTypeAdminUserPasswordAuth,
            AuthParameters: map[string]string{
                "USERNAME": email,
                "PASSWORD": password,
            },
        }
        
        authOutput, err := s.client.AdminInitiateAuth(ctx, authInput)
        if err != nil {
            return nil, fmt.Errorf("認証に失敗しました")
        }
        
        return s.processAuthResult(ctx, authOutput.AuthenticationResult, userAgent, ipAddress)
    }
    
    // 本番環境は通常のInitiateAuthを使用
    // SECRET_HASHを計算して認証
    // ...
}
```

#### Cookie認証の実装

```go
// 認証ハンドラーでのCookie設定
func (h *AuthHandler) setAuthCookies(c *gin.Context, accessToken, refreshToken string) {
    // HTTPOnly Cookieにアクセストークンを設定
    c.SetCookie(
        "access_token",
        accessToken,
        3600, // 1時間
        "/",
        "",
        h.cfg.Server.SecureCookies, // 環境変数SECURE_COOKIESで制御
        true,                         // JavaScriptからアクセス不可（HTTPOnly）
    )
    
    // リフレッシュトークンもHTTPOnly Cookieに設定
    c.SetCookie(
        "refresh_token",
        refreshToken,
        604800, // 7日間
        "/",
        "",
        h.cfg.Server.SecureCookies, // 環境変数SECURE_COOKIESで制御
        true,                         // JavaScriptからアクセス不可（HTTPOnly）
    )
}

// Cookie削除の実装
func (h *AuthHandler) clearAuthCookies(c *gin.Context) {
    c.SetCookie(
        "access_token",
        "",
        -1,
        "/",
        "",
        h.cfg.Server.SecureCookies, // 環境変数SECURE_COOKIESで制御
        true,                         // JavaScriptからアクセス不可（HTTPOnly）
    )
    c.SetCookie(
        "refresh_token",
        "",
        -1,
        "/",
        "",
        h.cfg.Server.SecureCookies, // 環境変数SECURE_COOKIESで制御
        true,                         // JavaScriptからアクセス不可（HTTPOnly）
    )
}
```

**重要なセキュリティ設定:**
- `SECURE_COOKIES`: 環境変数でCookieのSecure属性を制御
  - 開発環境（HTTP）: `false`に設定
  - 本番環境（HTTPS）: `true`に設定（必須）
- `HTTPOnly`: 常に`true`（XSS攻撃対策）
- 将来的には`SameSite`属性も追加予定（CSRF攻撃対策）

#### ユーザー登録

```go
type AuthService interface {
    RegisterUser(ctx context.Context, req dto.RegisterRequest) (dto.UserResponse, error)
    LoginUser(ctx context.Context, req dto.LoginRequest) (dto.LoginResponse, error)
    RefreshToken(ctx context.Context, refreshToken string) (dto.TokenResponse, error)
    LogoutUser(ctx context.Context, userID uuid.UUID) error
}

type authService struct {
    userRepo    repository.UserRepository
    sessionRepo repository.SessionRepository
    authService AuthService
    hashService HashService
    logger      *zap.Logger
}

func (s *authService) RegisterUser(ctx context.Context, req dto.RegisterRequest) (dto.UserResponse, error) {
    logger.LogInfo(s.logger, "ユーザー登録開始", zap.String("email", req.Email))
    
    // バリデーション
    if err := s.validateRegisterRequest(req); err != nil {
        return dto.UserResponse{}, fmt.Errorf("登録リクエストのバリデーションに失敗しました: %w", err)
    }
    
    // 重複チェック
    existingUser, err := s.userRepo.GetUserByEmail(ctx, req.Email)
    if err == nil && existingUser.ID != uuid.Nil {
        return dto.UserResponse{}, errors.New("このメールアドレスは既に登録されています")
    }
    
    // パスワードハッシュ化
    hashedPassword, err := s.hashService.HashPassword(req.Password)
    if err != nil {
        return dto.UserResponse{}, fmt.Errorf("パスワードのハッシュ化に失敗しました: %w", err)
    }
    
    // ユーザー作成
    user := model.User{
        ID:           uuid.New(),
        Email:        req.Email,
        Username:     req.Username,
        PasswordHash: hashedPassword,
        Role:         "user",
        Status:       "active",
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }
    
    createdUser, err := s.userRepo.CreateUser(ctx, user)
    if err != nil {
        return dto.UserResponse{}, fmt.Errorf("ユーザーの作成に失敗しました: %w", err)
    }
    
    response := dto.UserResponse{
        ID:       createdUser.ID.String(),
        Email:    createdUser.Email,
        Username: createdUser.Username,
        Role:     createdUser.Role,
        Status:   createdUser.Status,
    }
    
    logger.LogInfo(s.logger, "ユーザー登録完了", zap.String("user_id", response.ID))
    
    return response, nil
}
```

#### ユーザーログイン

```go
func (s *authService) LoginUser(ctx context.Context, req dto.LoginRequest) (dto.LoginResponse, error) {
    logger.LogInfo(s.logger, "ユーザーログイン開始", zap.String("email", req.Email))
    
    // バリデーション
    if err := s.validateLoginRequest(req); err != nil {
        return dto.LoginResponse{}, fmt.Errorf("ログインリクエストのバリデーションに失敗しました: %w", err)
    }
    
    // ユーザー取得
    user, err := s.userRepo.GetUserByEmail(ctx, req.Email)
    if err != nil {
        // セキュリティのため詳細なエラーは返さない
        s.logAuthFailure(ctx, req.Email, "ユーザーが見つかりません")
        return dto.LoginResponse{}, errors.New("メールアドレスまたはパスワードが正しくありません")
    }
    
    // アカウント状態確認
    if user.Status != "active" {
        s.logAuthFailure(ctx, req.Email, "アカウントが無効化されています")
        return dto.LoginResponse{}, errors.New("アカウントが無効化されています")
    }
    
    // パスワード検証
    if !s.hashService.CheckPasswordHash(req.Password, user.PasswordHash) {
        s.logAuthFailure(ctx, req.Email, "パスワードが一致しません")
        return dto.LoginResponse{}, errors.New("メールアドレスまたはパスワードが正しくありません")
    }
    
    // トークン生成
    accessToken, refreshToken, err := s.authService.GenerateTokenPair(user.ID, user.Email, user.Role)
    if err != nil {
        return dto.LoginResponse{}, fmt.Errorf("トークンの生成に失敗しました: %w", err)
    }
    
    // セッション作成
    session := model.Session{
        ID:           uuid.New(),
        UserID:       user.ID,
        RefreshToken: refreshToken,
        ExpiresAt:    time.Now().Add(7 * 24 * time.Hour), // 7日間
        CreatedAt:    time.Now(),
    }
    
    if err := s.sessionRepo.CreateSession(ctx, session); err != nil {
        return dto.LoginResponse{}, fmt.Errorf("セッションの作成に失敗しました: %w", err)
    }
    
    // 最終ログイン時刻の更新
    if err := s.userRepo.UpdateLastLogin(ctx, user.ID, time.Now()); err != nil {
        // ログイン自体は成功しているのでエラーログのみ
        logger.LogError(s.logger, "最終ログイン時刻の更新に失敗しました", err)
    }
    
    response := dto.LoginResponse{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        TokenType:    "Bearer",
        ExpiresIn:    3600, // 1時間
        User: dto.UserResponse{
            ID:       user.ID.String(),
            Email:    user.Email,
            Username: user.Username,
            Role:     user.Role,
            Status:   user.Status,
        },
    }
    
    logger.LogInfo(s.logger, "ユーザーログイン完了", 
        zap.String("user_id", user.ID.String()),
        zap.String("email", user.Email))
    
    return response, nil
}
```

#### トークン更新

```go
func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (dto.TokenResponse, error) {
    logger.LogInfo(s.logger, "トークン更新開始")
    
    // リフレッシュトークンの検証
    userID, err := s.authService.ValidateRefreshToken(refreshToken)
    if err != nil {
        return dto.TokenResponse{}, fmt.Errorf("無効なリフレッシュトークンです: %w", err)
    }
    
    // セッション確認
    session, err := s.sessionRepo.GetSessionByRefreshToken(ctx, refreshToken)
    if err != nil {
        return dto.TokenResponse{}, fmt.Errorf("セッションが見つかりません: %w", err)
    }
    
    // セッション有効期限確認
    if session.ExpiresAt.Before(time.Now()) {
        // 期限切れセッションを削除
        s.sessionRepo.DeleteSession(ctx, session.ID)
        return dto.TokenResponse{}, errors.New("セッションの有効期限が切れています")
    }
    
    // ユーザー情報取得
    user, err := s.userRepo.GetUserByID(ctx, userID)
    if err != nil {
        return dto.TokenResponse{}, fmt.Errorf("ユーザーが見つかりません: %w", err)
    }
    
    // アカウント状態確認
    if user.Status != "active" {
        return dto.TokenResponse{}, errors.New("アカウントが無効化されています")
    }
    
    // 新しいトークンペア生成
    newAccessToken, newRefreshToken, err := s.authService.GenerateTokenPair(user.ID, user.Email, user.Role)
    if err != nil {
        return dto.TokenResponse{}, fmt.Errorf("新しいトークンの生成に失敗しました: %w", err)
    }
    
    // セッション更新
    session.RefreshToken = newRefreshToken
    session.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
    
    if err := s.sessionRepo.UpdateSession(ctx, session); err != nil {
        return dto.TokenResponse{}, fmt.Errorf("セッションの更新に失敗しました: %w", err)
    }
    
    response := dto.TokenResponse{
        AccessToken:  newAccessToken,
        RefreshToken: newRefreshToken,
        TokenType:    "Bearer",
        ExpiresIn:    3600,
    }
    
    logger.LogInfo(s.logger, "トークン更新完了", zap.String("user_id", user.ID.String()))
    
    return response, nil
}
```

### 2. Cognito認証の実装

Cognito認証はCognitoAuthServiceとCognitoAuthMiddlewareで実装されています。go
func AuthMiddleware(authService AuthService, logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Authorizationヘッダーの取得
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証トークンが必要です"})
            c.Abort()
            return
        }
        
        // Bearer トークンの抽出
        tokenParts := strings.Split(authHeader, " ")
        if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "無効な認証形式です"})
            c.Abort()
            return
        }
        
        tokenString := tokenParts[1]
        
        // トークンの検証
        claims, err := authService.ValidateAccessToken(tokenString)
        if err != nil {
            logger.Warn("トークン検証失敗",
                zap.String("token", tokenString[:min(len(tokenString), 20)]),
                zap.Error(err))
            c.JSON(http.StatusUnauthorized, gin.H{"error": "無効な認証トークンです"})
            c.Abort()
            return
        }
        
        // コンテキストにユーザー情報を設定
        c.Set("user_id", claims.UserID)
        c.Set("user_email", claims.Email)
        c.Set("user_role", claims.Role)
        
        c.Next()
    }
}
```

### 4. 認可（Authorization）

#### ロールベース認可

```go
func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole, exists := c.Get("user_role")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
            c.Abort()
            return
        }
        
        roleStr, ok := userRole.(string)
        if !ok {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "ロール情報の取得に失敗しました"})
            c.Abort()
            return
        }
        
        if !hasRequiredRole(roleStr, role) {
            c.JSON(http.StatusForbidden, gin.H{"error": "この操作を実行する権限がありません"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// Role定義（数値ベース）
type Role int8

const (
    RoleSuperAdmin Role = 1 // スーパー管理者
    RoleAdmin      Role = 2 // 管理者
    RoleManager    Role = 3 // マネージャー
    RoleEmployee   Role = 4 // 社員
)

// AdminRequired 管理者権限チェックミドルウェア
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
        
        // 管理者権限をチェック（ロール1: super_admin, ロール2: admin）
        if user.Role != RoleSuperAdmin && user.Role != RoleAdmin {
            m.logger.Warn("管理者権限なしでのアクセス試行",
                zap.String("user_id", user.ID.String()),
                zap.Int("role", int(user.Role)),
            )
            c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

#### リソースベース認可

```go
func RequireResourceOwnership() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
            c.Abort()
            return
        }
        
        userUUID, ok := userID.(uuid.UUID)
        if !ok {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザーIDの取得に失敗しました"})
            c.Abort()
            return
        }
        
        // リソースIDの取得（パスパラメータから）
        resourceID := c.Param("id")
        if resourceID == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "リソースIDが必要です"})
            c.Abort()
            return
        }
        
        resourceUUID, err := uuid.Parse(resourceID)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "無効なリソースIDです"})
            c.Abort()
            return
        }
        
        // リソースの所有者確認
        // ここでリポジトリを使用してリソースの所有者を確認
        // 実装は具体的なリソースタイプによって異なる
        
        c.Set("resource_id", resourceUUID)
        c.Next()
    }
}
```

### 5. パスワードハッシュ化

#### ハッシュサービス

```go
type HashService interface {
    HashPassword(password string) (string, error)
    CheckPasswordHash(password, hash string) bool
}

type hashService struct {
    cost int
}

func NewHashService(cost int) HashService {
    return &hashService{cost: cost}
}

func (h *hashService) HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), h.cost)
    if err != nil {
        return "", fmt.Errorf("パスワードのハッシュ化に失敗しました: %w", err)
    }
    return string(bytes), nil
}

func (h *hashService) CheckPasswordHash(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### 6. セッション管理

#### セッションテーブル構造

```sql
-- sessionsテーブル
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    refresh_token TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### セッションリポジトリ

```go
type SessionRepository interface {
    CreateSession(ctx context.Context, session model.Session) error
    GetSessionByRefreshToken(ctx context.Context, refreshToken string) (model.Session, error)
    UpdateSession(ctx context.Context, session model.Session) error
    DeleteSession(ctx context.Context, sessionID uuid.UUID) error
    DeleteExpiredSessions(ctx context.Context) (int, error)
}

type sessionRepository struct {
    repository.BaseRepository
    logger *zap.Logger
}

func (r *sessionRepository) CreateSession(ctx context.Context, session model.Session) error {
    if session.ID == uuid.Nil {
        session.ID = r.NewID()
    }
    
    result := r.WithContext(ctx).Create(&session)
    if result.Error != nil {
        return fmt.Errorf("セッションの作成に失敗しました: %w", result.Error)
    }
    
    return nil
}

func (r *sessionRepository) DeleteExpiredSessions(ctx context.Context) (int, error) {
    result := r.WithContext(ctx).Where("expires_at < ?", time.Now()).Delete(&model.Session{})
    if result.Error != nil {
        return 0, fmt.Errorf("期限切れセッションの削除に失敗しました: %w", result.Error)
    }
    
    return int(result.RowsAffected), nil
}
```

### 7. 監査ログとJWKキャッシュ

#### 監査ログの実装

```go
// 認証失敗のログ記録
func (s *authService) logAuthFailure(ctx context.Context, email, reason string) {
    s.logger.Warn("認証失敗",
        zap.String("email", email),
        zap.String("reason", reason),
        zap.String("ip_address", getClientIP(ctx)),
        zap.Time("timestamp", time.Now()),
    )
    
    // 監査ログをデータベースに保存（将来的な実装）
    // s.auditRepo.LogAuthFailure(ctx, email, reason, getClientIP(ctx))
}

// 重要な操作のログ記録
func (s *authService) logCriticalOperation(ctx context.Context, userID uuid.UUID, operation, details string) {
    s.logger.Info("重要操作",
        zap.String("user_id", userID.String()),
        zap.String("operation", operation),
        zap.String("details", details),
        zap.Time("timestamp", time.Now()),
    )
}
```

#### JWKキャッシュの実装

```go
// fetchAndCacheJWK JWKSetを取得してキャッシュに保存
func (m *CognitoAuthMiddleware) fetchAndCacheJWK(kid string) (*rsa.PublicKey, error) {
    m.jwkCache.mutex.Lock()
    defer m.jwkCache.mutex.Unlock()
    
    // ダブルチェック
    if key, exists := m.jwkCache.keys[kid]; exists && time.Now().Before(m.jwkCache.expiresAt) {
        return key, nil
    }
    
    // JWKSetを取得
    jwkURL := m.config.Cognito.GetJWKURL()
    resp, err := m.client.Get(jwkURL)
    if err != nil {
        return nil, fmt.Errorf("JWKSetの取得に失敗しました: %w", err)
    }
    defer resp.Body.Close()
    
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
    
    // キャッシュの有効期限を設定（デフォルト: 1時間）
    m.jwkCache.expiresAt = time.Now().Add(m.config.Cognito.JWKCacheDuration)
    
    if key, exists := m.jwkCache.keys[kid]; exists {
        return key, nil
    }
    
    return nil, fmt.Errorf("指定されたkid '%s' の公開鍵が見つかりません", kid)
}
```

## セキュリティ考慮事項

### 1. パスワードポリシー

```go
func ValidatePassword(password string) error {
    if len(password) < 8 {
        return errors.New("パスワードは8文字以上である必要があります")
    }
    
    if len(password) > 128 {
        return errors.New("パスワードは128文字以下である必要があります")
    }
    
    hasUpper := false
    hasLower := false
    hasDigit := false
    hasSpecial := false
    
    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsDigit(char):
            hasDigit = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }
    
    if !hasUpper {
        return errors.New("パスワードには大文字を含める必要があります")
    }
    
    if !hasLower {
        return errors.New("パスワードには小文字を含める必要があります")
    }
    
    if !hasDigit {
        return errors.New("パスワードには数字を含める必要があります")
    }
    
    if !hasSpecial {
        return errors.New("パスワードには特殊文字を含める必要があります")
    }
    
    return nil
}
```

### 2. レート制限

```go
// RateLimiterMiddleware レート制限ミドルウェア
func RateLimiterMiddleware(maxAttempts int, duration time.Duration) gin.HandlerFunc {
    // Redixベースの実装
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        key := fmt.Sprintf("rate_limit:%s:%s", c.Request.URL.Path, clientIP)
        
        // レート制限チェック
        allowed, err := checkRateLimit(key, maxAttempts, duration)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "レート制限の確認に失敗しました"})
            c.Abort()
            return
        }
        
        if !allowed {
            c.JSON(http.StatusTooManyRequests, gin.H{"error": "リクエストが多すぎます。しばらく待ってから再度お試しください"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 3. 環境別認証設定

```yaml
# 開発環境 (docker-compose.yml)
services:
  cognito-local:
    image: jagregory/cognito-local:latest
    ports:
      - "9230:9229"
    environment:
      - COGNITO_LOCAL_ENABLED=true
      - COGNITO_LOCAL_REGION=us-east-1
      - COGNITO_LOCAL_USER_POOL_ID=local_7221v1tw

# 環境変数設定 (開発環境)
# docker-compose.ymlのenvironmentセクションで設定
# COGNITO_ENABLED=true
# COGNITO_ENDPOINT=http://localhost:9230
# COGNITO_REGION=us-east-1
# COGNITO_USER_POOL_ID=local_7221v1tw
# COGNITO_CLIENT_ID=62h69i1tpbn9rmh83xmtjyj4b
# COGNITO_CLIENT_SECRET=47c44j2dkj2y4tkf777zqgpiw
# SECURE_COOKIES=false  # 開発環境はHTTPなのでfalse

# 本番環境 (.env.production)
COGNITO_ENABLED=true
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
# COGNITO_ENDPOINTは設定しない（AWSの本番エンドポイントを使用）
SECURE_COOKIES=true  # 本番環境はHTTPSなので必ずtrue
```

#### Cookie設定の詳細

| 環境変数 | 開発環境 | 本番環境 | 説明 |
|---------|---------|---------|------|
| `SECURE_COOKIES` | `false` | `true` | CookieのSecure属性制御（HTTPSでのみ送信） |
| `SESSION_SECURE` | `false` | `true` | セッションCookieのSecure属性 |
| `SESSION_SAME_SITE` | `lax` | `strict` | SameSite属性（将来実装） |

```go
func LoginRateLimitMiddleware(rateLimiter RateLimiter) gin.HandlerFunc {
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        key := fmt.Sprintf("login_attempts:%s", clientIP)
        
        allowed, err := rateLimiter.Allow(key, 5, time.Minute*15) // 15分間に5回まで
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "レート制限の確認に失敗しました"})
            c.Abort()
            return
        }
        
        if !allowed {
            c.JSON(http.StatusTooManyRequests, gin.H{"error": "ログイン試行回数が上限に達しました。しばらく待ってから再度お試しください"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

---

## 関連ドキュメント

- [バックエンド仕様書](./backend-specification.md)
- [ハンドラー実装仕様書](./backend-handler-implementation.md)
- [サービス実装仕様書](./backend-service-implementation.md)
- [リポジトリ実装仕様書](./backend-repository-implementation.md)
- [テスト実装ガイド](./backend-testing-guide.md) 