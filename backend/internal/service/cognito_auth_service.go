package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	cfg "github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CognitoAuthService Cognito認証サービス
type CognitoAuthService struct {
	client      *cognitoidentityprovider.Client
	cfg         *cfg.Config
	db          *gorm.DB
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
	logger      *zap.Logger
}

// NewCognitoAuthService 新しいCognito認証サービスを作成
func NewCognitoAuthService(
	cfg *cfg.Config,
	db *gorm.DB,
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	logger *zap.Logger,
) (*CognitoAuthService, error) {
	// AWS SDK設定
	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(cfg.Cognito.Region),
		config.WithClientLogMode(aws.LogRequestWithBody|aws.LogResponseWithBody),
	)
	if err != nil {
		return nil, fmt.Errorf("AWS設定の読み込みに失敗しました: %w", err)
	}

	// ローカル環境の場合は静的な認証情報を設定
	if cfg.Cognito.Endpoint != "" {
		awsCfg.Credentials = aws.NewCredentialsCache(aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
			return aws.Credentials{
				AccessKeyID:     "local",
				SecretAccessKey: "local",
				SessionToken:    "",
			}, nil
		}))
	}

	// Cognitoクライアント作成
	client := cognitoidentityprovider.NewFromConfig(awsCfg)

	// ローカル開発環境の場合はエンドポイントを上書き
	if cfg.Cognito.Endpoint != "" {
		client = cognitoidentityprovider.NewFromConfig(awsCfg, func(o *cognitoidentityprovider.Options) {
			o.BaseEndpoint = aws.String(cfg.Cognito.Endpoint)
		})
	}

	return &CognitoAuthService{
		client:      client,
		cfg:         cfg,
		db:          db,
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		logger:      logger,
	}, nil
}

// calculateSecretHash CLIENT_SECRETのハッシュを計算
func (s *CognitoAuthService) calculateSecretHash(username string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.Cognito.ClientSecret))
	mac.Write([]byte(username + s.cfg.Cognito.ClientID))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// Login ユーザーログイン
func (s *CognitoAuthService) Login(ctx context.Context, email, password, userAgent, ipAddress string) (*AuthResponse, error) {
	s.logger.Info("ログイン試行",
		zap.String("email", email),
		zap.String("user_agent", userAgent),
		zap.String("ip_address", ipAddress),
	)

	// Cognito Localの場合はAdminInitiateAuthを使用
	if s.cfg.Cognito.Endpoint != "" {
		s.logger.Info("Using Cognito Local with AdminInitiateAuth",
			zap.String("endpoint", s.cfg.Cognito.Endpoint),
			zap.String("user_pool_id", s.cfg.Cognito.UserPoolID),
			zap.String("client_id", s.cfg.Cognito.ClientID),
			zap.String("email", email),
		)

		// AdminInitiateAuthを使用（emailでの認証をサポート）
		authInput := &cognitoidentityprovider.AdminInitiateAuthInput{
			UserPoolId: aws.String(s.cfg.Cognito.UserPoolID),
			ClientId:   aws.String(s.cfg.Cognito.ClientID),
			AuthFlow:   types.AuthFlowTypeAdminUserPasswordAuth,
			AuthParameters: map[string]string{
				"USERNAME": email,
				"PASSWORD": password,
			},
		}

		// タイムアウト付きコンテキストを作成
		authCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		authOutput, err := s.client.AdminInitiateAuth(authCtx, authInput)
		if err != nil {
			s.logger.Error("Cognito認証エラー（Admin）",
				zap.Error(err),
				zap.String("email", email),
				zap.String("user_pool_id", s.cfg.Cognito.UserPoolID),
				zap.String("client_id", s.cfg.Cognito.ClientID),
				zap.String("endpoint", s.cfg.Cognito.Endpoint),
			)
			return nil, fmt.Errorf("認証に失敗しました")
		}

		// トークンを取得
		if authOutput.AuthenticationResult == nil {
			return nil, fmt.Errorf("認証結果が取得できませんでした")
		}

		return s.processAuthResult(ctx, authOutput.AuthenticationResult, userAgent, ipAddress)
	}

	// 本番環境の場合は通常のInitiateAuthを使用
	// SecretHashを計算
	secretHash := s.calculateSecretHash(email)

	// Cognitoで認証
	authInput := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeUserPasswordAuth,
		ClientId: aws.String(s.cfg.Cognito.ClientID),
		AuthParameters: map[string]string{
			"USERNAME":    email,
			"PASSWORD":    password,
			"SECRET_HASH": secretHash,
		},
	}

	authOutput, err := s.client.InitiateAuth(ctx, authInput)
	if err != nil {
		s.logger.Error("Cognito認証エラー", zap.Error(err))
		return nil, fmt.Errorf("認証に失敗しました")
	}

	// トークンを取得
	if authOutput.AuthenticationResult == nil {
		return nil, fmt.Errorf("認証結果が取得できませんでした")
	}

	return s.processAuthResult(ctx, authOutput.AuthenticationResult, userAgent, ipAddress)
}

// processAuthResult 認証結果を処理する共通メソッド
func (s *CognitoAuthService) processAuthResult(ctx context.Context, authResult *types.AuthenticationResultType, userAgent, ipAddress string) (*AuthResponse, error) {
	accessToken := *authResult.AccessToken
	refreshToken := *authResult.RefreshToken
	idToken := *authResult.IdToken

	// ユーザー情報を取得
	userInfo, err := s.getUserInfo(ctx, accessToken)
	if err != nil {
		s.logger.Error("ユーザー情報取得エラー", zap.Error(err))
		return nil, err
	}

	// DBのユーザー情報を取得または作成
	user, err := s.syncUserWithDB(ctx, userInfo)
	if err != nil {
		s.logger.Error("ユーザー同期エラー", zap.Error(err))
		return nil, err
	}

	// セッション作成（リフレッシュトークンを保存）
	session := &model.Session{
		ID:           uuid.New(),
		UserID:       user.ID,
		RefreshToken: refreshToken,
		UserAgent:    userAgent,
		IPAddress:    ipAddress,
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour), // 7日間
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		s.logger.Error("セッション作成エラー", zap.Error(err))
		// セッション作成に失敗してもログインは成功とする
	}

	return &AuthResponse{
		AccessToken:  idToken, // フロントエンドにはIDトークンを返す
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(time.Hour), // 1時間
		User:         user,
	}, nil
}

// RegisterUser ユーザー登録
func (s *CognitoAuthService) RegisterUser(
	email, password, firstName, lastName, phoneNumber string,
	role model.Role,
) (*model.User, error) {
	ctx := context.Background()

	// ユーザー属性を設定
	userAttributes := []types.AttributeType{
		{
			Name:  aws.String("email"),
			Value: aws.String(email),
		},
		{
			Name:  aws.String("email_verified"),
			Value: aws.String("true"), // 管理者作成のため自動検証
		},
		{
			Name:  aws.String("name"),
			Value: aws.String(firstName + " " + lastName),
		},
		{
			Name:  aws.String("custom:role"),
			Value: aws.String(fmt.Sprintf("%d", role)),
		},
	}

	if phoneNumber != "" {
		userAttributes = append(userAttributes, types.AttributeType{
			Name:  aws.String("phone_number"),
			Value: aws.String(phoneNumber),
		})
	}

	// Cognitoにユーザーを作成
	createUserInput := &cognitoidentityprovider.AdminCreateUserInput{
		UserPoolId:        aws.String(s.cfg.Cognito.UserPoolID),
		Username:          aws.String(email),
		UserAttributes:    userAttributes,
		TemporaryPassword: aws.String(password),            // 初回は仮パスワード
		MessageAction:     types.MessageActionTypeSuppress, // ウェルカムメールを送信しない
	}

	createUserOutput, err := s.client.AdminCreateUser(ctx, createUserInput)
	if err != nil {
		s.logger.Error("Cognitoユーザー作成エラー", zap.Error(err))
		return nil, fmt.Errorf("ユーザーの作成に失敗しました")
	}

	// 仮パスワードを永続パスワードに設定
	setPasswordInput := &cognitoidentityprovider.AdminSetUserPasswordInput{
		UserPoolId: aws.String(s.cfg.Cognito.UserPoolID),
		Username:   aws.String(email),
		Password:   aws.String(password),
		Permanent:  true,
	}

	if _, err := s.client.AdminSetUserPassword(ctx, setPasswordInput); err != nil {
		s.logger.Error("パスワード設定エラー", zap.Error(err))
		// パスワード設定に失敗してもユーザー作成は成功とする
	}

	// CognitoのサブIDを取得
	cognitoSub := ""
	for _, attr := range createUserOutput.User.Attributes {
		if *attr.Name == "sub" {
			cognitoSub = *attr.Value
			break
		}
	}

	// DBにユーザーを作成
	user := &model.User{
		ID:          uuid.New(),
		Email:       email,
		FirstName:   firstName,
		LastName:    lastName,
		PhoneNumber: phoneNumber,
		Role:        role,
		CognitoSub:  cognitoSub,
		Status:      "active",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		// DBへの保存に失敗した場合はCognitoユーザーを削除
		deleteInput := &cognitoidentityprovider.AdminDeleteUserInput{
			UserPoolId: aws.String(s.cfg.Cognito.UserPoolID),
			Username:   aws.String(email),
		}
		s.client.AdminDeleteUser(ctx, deleteInput)

		return nil, fmt.Errorf("ユーザーの保存に失敗しました: %w", err)
	}

	return user, nil
}

// RefreshToken トークンをリフレッシュ
func (s *CognitoAuthService) RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	// セッションを検証
	session, err := s.sessionRepo.GetByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("無効なリフレッシュトークンです")
	}

	// セッションの有効期限を確認
	if session.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("セッションの有効期限が切れています")
	}

	// ユーザー情報を取得
	user, err := s.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, fmt.Errorf("ユーザーが見つかりません")
	}

	// SecretHashを計算
	secretHash := s.calculateSecretHash(user.Email)

	// Cognitoでトークンをリフレッシュ
	authInput := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeRefreshTokenAuth,
		ClientId: aws.String(s.cfg.Cognito.ClientID),
		AuthParameters: map[string]string{
			"REFRESH_TOKEN": refreshToken,
			"SECRET_HASH":   secretHash,
		},
	}

	authOutput, err := s.client.InitiateAuth(ctx, authInput)
	if err != nil {
		s.logger.Error("トークンリフレッシュエラー", zap.Error(err))
		return nil, fmt.Errorf("トークンのリフレッシュに失敗しました")
	}

	// 新しいトークンを取得
	if authOutput.AuthenticationResult == nil {
		return nil, fmt.Errorf("認証結果が取得できませんでした")
	}

	newIdToken := *authOutput.AuthenticationResult.IdToken

	// セッションの最終使用時刻を更新
	session.LastUsedAt = time.Now()
	if err := s.sessionRepo.Update(ctx, session); err != nil {
		s.logger.Error("セッション更新エラー", zap.Error(err))
	}

	return &AuthResponse{
		AccessToken:  newIdToken,
		RefreshToken: refreshToken, // リフレッシュトークンは変更なし
		ExpiresAt:    time.Now().Add(time.Hour),
		User:         user,
	}, nil
}

// Logout ログアウト
func (s *CognitoAuthService) Logout(ctx context.Context, refreshToken string) error {
	// セッションを削除
	if err := s.sessionRepo.DeleteByRefreshToken(ctx, refreshToken); err != nil {
		s.logger.Error("セッション削除エラー", zap.Error(err))
		// エラーが発生してもログアウトは成功とする
	}

	// Cognitoからもサインアウト（オプション）
	// GlobalSignOutを使用すると全デバイスからログアウトされる
	// 今回はセッション削除のみとする

	return nil
}

// getUserInfo アクセストークンからユーザー情報を取得
func (s *CognitoAuthService) getUserInfo(ctx context.Context, accessToken string) (map[string]string, error) {
	input := &cognitoidentityprovider.GetUserInput{
		AccessToken: aws.String(accessToken),
	}

	output, err := s.client.GetUser(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
	}

	// 属性をマップに変換
	userInfo := make(map[string]string)
	for _, attr := range output.UserAttributes {
		userInfo[*attr.Name] = *attr.Value
	}

	return userInfo, nil
}

// syncUserWithDB Cognitoユーザー情報をDBと同期
func (s *CognitoAuthService) syncUserWithDB(ctx context.Context, cognitoUser map[string]string) (*model.User, error) {
	cognitoSub := cognitoUser["sub"]
	email := cognitoUser["email"]

	// デバッグログ追加
	s.logger.Info("syncUserWithDB called",
		zap.String("cognito_sub", cognitoSub),
		zap.String("email", email),
		zap.Any("cognito_user_attributes", cognitoUser),
	)

	// CognitoサブIDまたはメールアドレスでユーザーを検索
	user, err := s.userRepo.GetByCognitoSub(ctx, cognitoSub)
	if err != nil {
		s.logger.Info("GetByCognitoSub failed",
			zap.String("cognito_sub", cognitoSub),
			zap.Error(err),
		)
		// メールアドレスで検索
		user, err = s.userRepo.GetByEmail(ctx, email)
		if err != nil {
			s.logger.Info("GetByEmail also failed",
				zap.String("email", email),
				zap.Error(err),
			)
			// 新規ユーザーとして作成
			roleStr := cognitoUser["custom:role"]
			role := 4 // デフォルトはemployee
			if roleStr != "" {
				fmt.Sscanf(roleStr, "%d", &role)
			}

			// 名前を分割
			name := cognitoUser["name"]
			firstName := ""
			lastName := ""
			if name != "" {
				// スペースで分割（簡易実装）
				parts := splitName(name)
				if len(parts) > 0 {
					firstName = parts[0]
				}
				if len(parts) > 1 {
					lastName = parts[1]
				}
			}

			user = &model.User{
				ID:             uuid.New(),
				Email:          email,
				FirstName:      firstName,
				LastName:       lastName,
				Name:           name, // Nameフィールドを追加
				PhoneNumber:    cognitoUser["phone_number"],
				Role:           model.Role(role),
				CognitoSub:     cognitoSub,
				Status:         "active",
				Active:         true,
				EngineerStatus: "active", // EngineerStatus を追加
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := s.userRepo.Create(ctx, user); err != nil {
				return nil, fmt.Errorf("ユーザーの作成に失敗しました: %w", err)
			}
		} else {
			// 既存ユーザーのCognitoサブIDを更新
			user.CognitoSub = cognitoSub
			if err := s.userRepo.Update(ctx, user); err != nil {
				s.logger.Error("CognitoサブID更新エラー", zap.Error(err))
			}
		}
	}

	return user, nil
}

// splitName 名前を姓と名に分割（簡易実装）
func splitName(fullName string) []string {
	// スペースで分割
	parts := []string{}
	current := ""
	for _, char := range fullName {
		if char == ' ' && current != "" {
			parts = append(parts, current)
			current = ""
		} else if char != ' ' {
			current += string(char)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}

// 既存のAuthServiceインターフェースを満たすためのメソッド

// ValidateJWTClaims JWT claimsの検証（Cognito版）
func (s *CognitoAuthService) ValidateJWTClaims(claims map[string]interface{}) error {
	// token_useの確認
	tokenUse, ok := claims["token_use"].(string)
	if !ok || (tokenUse != "id" && tokenUse != "access") {
		return fmt.Errorf("無効なtoken_use")
	}

	// 有効期限の確認
	exp, ok := claims["exp"].(float64)
	if !ok || time.Now().Unix() > int64(exp) {
		return fmt.Errorf("トークンの有効期限が切れています")
	}

	// Issuerの確認
	iss, ok := claims["iss"].(string)
	if !ok || iss != s.cfg.Cognito.GetIssuer() {
		return fmt.Errorf("無効なIssuer")
	}

	return nil
}

// 以下は既存のAuthServiceインターフェースとの互換性のため

func (s *CognitoAuthService) ValidateTOTP(userID, code string) (bool, error) {
	// Cognito MFAを使用する場合は実装
	return false, fmt.Errorf("TOTP is not implemented yet")
}

func (s *CognitoAuthService) SendSMSCode(phoneNumber string) (string, error) {
	// Cognito SMSを使用する場合は実装
	return "", fmt.Errorf("SMS is not implemented yet")
}

func (s *CognitoAuthService) VerifySMSCode(verificationID, code string) (bool, error) {
	// Cognito SMSを使用する場合は実装
	return false, fmt.Errorf("SMS verification is not implemented yet")
}

func (s *CognitoAuthService) UseBackupCode(userID, backupCode string) (bool, error) {
	// バックアップコードを使用する場合は実装
	return false, fmt.Errorf("backup codes are not implemented yet")
}
