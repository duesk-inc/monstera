package test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/testutils"
)

// TestAuthServiceIntegration 認証サービスの統合テスト
func TestAuthServiceIntegration(t *testing.T) {
	// テスト環境設定
	testutils.SetupTestEnvironment()

	// テスト用DBセットアップ
	db := testutils.SetupTestDB(t)

	// ロガー設定
	logger := zap.NewNop()

	// 認証サービス作成
	authSvc := service.NewAuthService(logger)

	t.Run("ValidateJWTClaims", func(t *testing.T) {
		ctx := context.Background()

		// 有効なクレーム
		validClaims := map[string]interface{}{
			"sub": "user123",
			"exp": float64(1234567890),
			"iat": float64(1234567890),
		}

		err := authSvc.ValidateJWTClaims(validClaims)
		assert.NoError(t, err)

		// 無効なクレーム（subjectなし）
		invalidClaims := map[string]interface{}{
			"exp": float64(1234567890),
			"iat": float64(1234567890),
		}

		err = authSvc.ValidateJWTClaims(invalidClaims)
		assert.Error(t, err)

		_ = ctx // コンテキストを使用（将来的な拡張のため）
		_ = db  // DBを使用（将来的な拡張のため）
	})

	t.Run("ValidateTOTP", func(t *testing.T) {
		// TOTP検証テスト
		userID := "test-user-123"
		code := "123456"

		valid, err := authSvc.ValidateTOTP(userID, code)
		// 実装されていない場合はfalseとエラーが返される
		assert.False(t, valid)
		assert.Error(t, err)
	})

	t.Run("SendSMSCode", func(t *testing.T) {
		// SMS送信テスト
		phoneNumber := "090-1234-5678"

		verificationID, err := authSvc.SendSMSCode(phoneNumber)
		// 実装されていない場合は空文字とエラーが返される
		assert.Empty(t, verificationID)
		assert.Error(t, err)
	})

	t.Run("VerifySMSCode", func(t *testing.T) {
		// SMS検証テスト
		verificationID := "test-verification-id"
		code := "123456"

		valid, err := authSvc.VerifySMSCode(verificationID, code)
		// 実装されていない場合はfalseとエラーが返される
		assert.False(t, valid)
		assert.Error(t, err)
	})

	t.Run("UseBackupCode", func(t *testing.T) {
		// バックアップコード使用テスト
		userID := "test-user-123"
		backupCode := "backup-code-123"

		valid, err := authSvc.UseBackupCode(userID, backupCode)
		// 実装されていない場合はfalseとエラーが返される
		assert.False(t, valid)
		assert.Error(t, err)
	})
}

// TestAuthServiceBasic 基本的な認証機能のテスト
func TestAuthServiceBasic(t *testing.T) {
	logger := zap.NewNop()
	authSvc := service.NewAuthService(logger)

	// サービスが正常に作成されることを確認
	require.NotNil(t, authSvc)

	// 基本的なインターフェースメソッドが実装されていることを確認
	t.Run("ServiceMethods", func(t *testing.T) {
		// インターフェースメソッドの存在確認
		assert.NotPanics(t, func() {
			_ = authSvc.ValidateJWTClaims(map[string]interface{}{})
			_, _ = authSvc.ValidateTOTP("", "")
			_, _ = authSvc.SendSMSCode("")
			_, _ = authSvc.VerifySMSCode("", "")
			_, _ = authSvc.UseBackupCode("", "")
		})
	})
}
