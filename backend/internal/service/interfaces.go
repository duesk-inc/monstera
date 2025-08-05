package service

import (
	"context"

	"github.com/duesk/monstera/internal/model"
)

// AuthService 認証サービスのインターフェース
type AuthService interface {
	// Login ユーザーのログイン処理
	Login(ctx context.Context, email, password, userAgent, ipAddress string) (*AuthResponse, error)
	
	// RefreshToken トークンのリフレッシュ
	RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error)
	
	// Logout ログアウト処理
	Logout(ctx context.Context, userID string, refreshToken string) error
	
	// RegisterUser ユーザー登録
	RegisterUser(ctx context.Context, req *RegisterUserRequest) (*model.User, error)
	
	// ValidateClaims JWTクレームの検証
	ValidateClaims(claims map[string]interface{}) error
	
	// MFA関連
	ValidateTOTP(ctx context.Context, userID string, code string) error
	SendSMSCode(ctx context.Context, userID string) error
	VerifySMSCode(ctx context.Context, userID string, code string) error
	UseBackupCode(ctx context.Context, userID string, code string) error
}