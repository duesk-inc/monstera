package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// UserService ユーザー管理サービスのインターフェース
type UserService interface {
	// ユーザー作成
	CreateUser(ctx context.Context, req *CreateUserRequest) (*model.User, error)
	// ログイン
	Login(ctx context.Context, req *UserLoginRequest) (*model.User, string, error)
	// アカウントロック解除
	UnlockAccount(ctx context.Context, userID string) error
	// ユーザー情報取得
	GetUserByID(ctx context.Context, userID string) (*model.User, error)
	GetUserByEmail(ctx context.Context, email string) (*model.User, error)
	// ユーザー情報更新
	UpdateUser(ctx context.Context, userID string, req *UpdateUserRequest) (*model.User, error)
}

// CreateUserRequest ユーザー作成リクエスト
type CreateUserRequest struct {
	Email         string `json:"email" binding:"required,email" validate:"required,email"`
	Password      string `json:"password" binding:"required,min=8" validate:"required,min=8"`
	FirstName     string `json:"first_name" binding:"required" validate:"required"`
	LastName      string `json:"last_name" binding:"required" validate:"required"`
	FirstNameKana string `json:"first_name_kana"`
	LastNameKana  string `json:"last_name_kana"`
	PhoneNumber   string `json:"phone_number"`
	Role          int    `json:"role"`
}

// UserLoginRequest ユーザーログインリクエスト
type UserLoginRequest struct {
	Email    string `json:"email" binding:"required,email" validate:"required,email"`
	Password string `json:"password" binding:"required" validate:"required"`
}

// UpdateUserRequest ユーザー更新リクエスト
type UpdateUserRequest struct {
	FirstName     *string `json:"first_name,omitempty"`
	LastName      *string `json:"last_name,omitempty"`
	FirstNameKana *string `json:"first_name_kana,omitempty"`
	LastNameKana  *string `json:"last_name_kana,omitempty"`
	PhoneNumber   *string `json:"phone_number,omitempty"`
}

// userService ユーザー管理サービスの実装
type userService struct {
	db            *gorm.DB
	cognitoAuth   *CognitoAuthService
	userRepo      repository.UserRepository
	sessionRepo   repository.SessionRepository
	logger        *zap.Logger
	config        *config.Config
	cognitoClient *cognitoidentityprovider.Client
}

// NewUserService ユーザー管理サービスのコンストラクタ
func NewUserService(
	db *gorm.DB,
	cognitoAuth *CognitoAuthService,
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	logger *zap.Logger,
	config *config.Config,
) UserService {
	return &userService{
		db:            db,
		cognitoAuth:   cognitoAuth,
		userRepo:      userRepo,
		sessionRepo:   sessionRepo,
		logger:        logger,
		config:        config,
		cognitoClient: cognitoAuth.client,
	}
}

// CreateUser ユーザー作成
func (s *userService) CreateUser(ctx context.Context, req *CreateUserRequest) (*model.User, error) {
	s.logger.Info("Creating user", zap.String("email", req.Email))

	// メールアドレスの重複チェック（DBレベル）
	existingUser, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		s.logger.Error("Failed to check existing user", zap.Error(err))
		return nil, fmt.Errorf("ユーザーの重複チェックに失敗しました: %w", err)
	}
	if existingUser != nil {
		return nil, errors.New("このメールアドレスは既に登録されています")
	}

	// ロールの設定（デフォルト: 一般ユーザー）
	role := model.Role(req.Role)
	if role == 0 {
		role = 4 // 一般ユーザー
	}

	// CognitoAuthServiceのRegisterUserメソッドを使用
	registerReq := &RegisterUserRequest{
		Email:       req.Email,
		Password:    req.Password,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		PhoneNumber: req.PhoneNumber,
		Role:        role,
	}
	user, err := s.cognitoAuth.RegisterUser(ctx, registerReq)
	if err != nil {
		s.logger.Error("Failed to create user in Cognito", zap.Error(err))
		return nil, err
	}

	// 追加のフィールドを更新（必要に応じて）
	if req.FirstNameKana != "" || req.LastNameKana != "" {
		user.FirstNameKana = req.FirstNameKana
		user.LastNameKana = req.LastNameKana
		if err := s.userRepo.Update(ctx, user); err != nil {
			s.logger.Error("Failed to update user kana names", zap.Error(err))
			// エラーは無視（ユーザー作成自体は成功）
		}
	}

	s.logger.Info("User created successfully", zap.String("user_id", user.ID.String()))

	return user, nil
}

// Login ログイン
func (s *userService) Login(ctx context.Context, req *UserLoginRequest) (*model.User, string, error) {
	s.logger.Info("User login attempt", zap.String("email", req.Email))

	// CognitoAuthServiceのLoginメソッドを使用
	// ユーザーエージェントとIPアドレスは仮値（実際はGinコンテキストから取得すべき）
	authResponse, err := s.cognitoAuth.Login(ctx, req.Email, req.Password, "unknown", "unknown")
	if err != nil {
		s.logger.Warn("Login failed", zap.String("email", req.Email), zap.Error(err))
		// Cognitoのエラーメッセージを適切な日本語エラーに変換
		if err.Error() == "認証に失敗しました" {
			return nil, "", errors.New("メールアドレスまたはパスワードが正しくありません")
		}
		return nil, "", err
	}

	s.logger.Info("User logged in successfully", zap.String("user_id", authResponse.User.ID.String()))

	// アクセストークン（IDトークン）を返す
	return authResponse.User, authResponse.AccessToken, nil
}

// UnlockAccount アカウントロック解除
func (s *userService) UnlockAccount(ctx context.Context, userID string) error {
	s.logger.Info("Unlocking account", zap.String("user_id", userID))

	uid, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("無効なユーザーID: %w", err)
	}

	user, err := s.userRepo.GetByID(ctx, uid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("ユーザーが見つかりません")
		}
		s.logger.Error("Failed to get user", zap.Error(err))
		return fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
	}

	// Cognitoでユーザーを有効化
	enableUserInput := &cognitoidentityprovider.AdminEnableUserInput{
		UserPoolId: aws.String(s.config.Cognito.UserPoolID),
		Username:   aws.String(user.Email),
	}

	if _, err := s.cognitoClient.AdminEnableUser(ctx, enableUserInput); err != nil {
		s.logger.Error("Failed to enable user in Cognito", zap.Error(err))
		return fmt.Errorf("Cognitoでのアカウント有効化に失敗しました: %w", err)
	}

	// DBのステータスも更新
	user.Status = "active"
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("Failed to update user status", zap.Error(err))
		return fmt.Errorf("ユーザーステータスの更新に失敗しました: %w", err)
	}

	s.logger.Info("Account unlocked successfully", zap.String("user_id", userID))

	return nil
}

// GetUserByID ユーザー情報取得（ID）
func (s *userService) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("無効なユーザーID: %w", err)
	}

	user, err := s.userRepo.GetByID(ctx, uid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("ユーザーが見つかりません")
		}
		return nil, fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
	}

	return user, nil
}

// GetUserByEmail ユーザー情報取得（メールアドレス）
func (s *userService) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("ユーザーが見つかりません")
		}
		return nil, fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
	}

	return user, nil
}



// UpdateUser ユーザー情報更新
func (s *userService) UpdateUser(ctx context.Context, userID string, req *UpdateUserRequest) (*model.User, error) {
	s.logger.Info("Updating user", zap.String("user_id", userID))

	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("無効なユーザーID: %w", err)
	}

	user, err := s.userRepo.GetByID(ctx, uid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("ユーザーが見つかりません")
		}
		return nil, fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
	}

	// Cognito属性の更新用
	var userAttributes []types.AttributeType

	// 更新フィールドの適用
	if req.FirstName != nil || req.LastName != nil {
		if req.FirstName != nil {
			user.FirstName = *req.FirstName
		}
		if req.LastName != nil {
			user.LastName = *req.LastName
		}
		// Cognitoのname属性も更新
		fullName := user.FirstName + " " + user.LastName
		userAttributes = append(userAttributes, types.AttributeType{
			Name:  aws.String("name"),
			Value: aws.String(fullName),
		})
	}

	if req.FirstNameKana != nil {
		user.FirstNameKana = *req.FirstNameKana
	}
	if req.LastNameKana != nil {
		user.LastNameKana = *req.LastNameKana
	}
	if req.PhoneNumber != nil {
		user.PhoneNumber = *req.PhoneNumber
		// Cognitoのphone_number属性も更新
		userAttributes = append(userAttributes, types.AttributeType{
			Name:  aws.String("phone_number"),
			Value: aws.String(user.PhoneNumber),
		})
	}

	// Cognito属性を更新
	if len(userAttributes) > 0 {
		updateInput := &cognitoidentityprovider.AdminUpdateUserAttributesInput{
			UserPoolId:     aws.String(s.config.Cognito.UserPoolID),
			Username:       aws.String(user.Email),
			UserAttributes: userAttributes,
		}

		if _, err := s.cognitoClient.AdminUpdateUserAttributes(ctx, updateInput); err != nil {
			s.logger.Error("Failed to update user attributes in Cognito", zap.Error(err))
			// Cognito更新エラーは無視（DBは更新する）
		}
	}

	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("Failed to update user", zap.Error(err))
		return nil, fmt.Errorf("ユーザー情報の更新に失敗しました: %w", err)
	}

	s.logger.Info("User updated successfully", zap.String("user_id", userID))

	return user, nil
}
