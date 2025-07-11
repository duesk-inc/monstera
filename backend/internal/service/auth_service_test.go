package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

// TestAuthService 認証サービスのテストスイート
func TestAuthService(t *testing.T) {
	t.Run("ValidateJWTClaims", func(t *testing.T) {
		testValidateJWTClaims(t)
	})

	t.Run("ValidateTOTP", func(t *testing.T) {
		testValidateTOTP(t)
	})

	t.Run("SendSMSCode", func(t *testing.T) {
		testSendSMSCode(t)
	})

	t.Run("VerifySMSCode", func(t *testing.T) {
		testVerifySMSCode(t)
	})

	t.Run("UseBackupCode", func(t *testing.T) {
		testUseBackupCode(t)
	})
}

// testValidateJWTClaims JWTクレーム検証のテスト
func testValidateJWTClaims(t *testing.T) {
	t.Run("正常なJWTクレームを検証", func(t *testing.T) {
		service := setupAuthTestService(t)

		claims := map[string]interface{}{
			"sub": "user123",
			"exp": float64(1234567890),
			"iat": float64(1234567890),
		}

		err := service.ValidateJWTClaims(claims)
		assert.NoError(t, err)
	})

	t.Run("subjectが存在しない場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		claims := map[string]interface{}{
			"exp": float64(1234567890),
		}

		err := service.ValidateJWTClaims(claims)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "無効なsubject")
	})

	t.Run("subjectが空文字列の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		claims := map[string]interface{}{
			"sub": "",
			"exp": float64(1234567890),
		}

		err := service.ValidateJWTClaims(claims)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "無効なsubject")
	})

	t.Run("expirationが存在しない場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		claims := map[string]interface{}{
			"sub": "user123",
		}

		err := service.ValidateJWTClaims(claims)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "expiration が設定されていません")
	})

	t.Run("expirationの型が不正な場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		claims := map[string]interface{}{
			"sub": "user123",
			"exp": "invalid_exp",
		}

		err := service.ValidateJWTClaims(claims)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "無効なexpiration形式")
	})

	t.Run("expirationがint64型の場合正常", func(t *testing.T) {
		service := setupAuthTestService(t)

		claims := map[string]interface{}{
			"sub": "user123",
			"exp": int64(1234567890),
		}

		err := service.ValidateJWTClaims(claims)
		assert.NoError(t, err)
	})
}

// testValidateTOTP TOTP検証のテスト
func testValidateTOTP(t *testing.T) {
	t.Run("正常なTOTPコードを検証", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		code := "123456"

		valid, err := service.ValidateTOTP(userID, code)
		assert.NoError(t, err)
		assert.True(t, valid)
	})

	t.Run("TOTPコードが空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		code := ""

		valid, err := service.ValidateTOTP(userID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "TOTPコードが空です")
	})

	t.Run("TOTPコードが6桁でない場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		code := "12345" // 5桁

		valid, err := service.ValidateTOTP(userID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "TOTPコードは6桁である必要があります")
	})

	t.Run("無効なTOTPコード（000000）の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		code := "000000"

		valid, err := service.ValidateTOTP(userID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "無効なTOTPコード")
	})

	t.Run("7桁のTOTPコードの場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		code := "1234567" // 7桁

		valid, err := service.ValidateTOTP(userID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "TOTPコードは6桁である必要があります")
	})
}

// testSendSMSCode SMS認証コード送信のテスト
func testSendSMSCode(t *testing.T) {
	t.Run("正常にSMS認証コードを送信", func(t *testing.T) {
		service := setupAuthTestService(t)

		phoneNumber := "+81901234567"

		verificationID, err := service.SendSMSCode(phoneNumber)
		assert.NoError(t, err)
		assert.NotEmpty(t, verificationID)
		assert.Contains(t, verificationID, "verification_id_")
		assert.Contains(t, verificationID, "4567") // 電話番号の最後の4桁
	})

	t.Run("電話番号が空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		phoneNumber := ""

		verificationID, err := service.SendSMSCode(phoneNumber)
		assert.Error(t, err)
		assert.Empty(t, verificationID)
		assert.Contains(t, err.Error(), "電話番号が空です")
	})

	t.Run("短い電話番号でも処理可能", func(t *testing.T) {
		service := setupAuthTestService(t)

		phoneNumber := "123"

		verificationID, err := service.SendSMSCode(phoneNumber)
		assert.NoError(t, err)
		assert.NotEmpty(t, verificationID)
		assert.Contains(t, verificationID, "verification_id_123")
	})
}

// testVerifySMSCode SMS認証コード検証のテスト
func testVerifySMSCode(t *testing.T) {
	t.Run("正常にSMS認証コードを検証", func(t *testing.T) {
		service := setupAuthTestService(t)

		verificationID := "verification_id_123"
		code := "123456"

		valid, err := service.VerifySMSCode(verificationID, code)
		assert.NoError(t, err)
		assert.True(t, valid)
	})

	t.Run("verificationIDが空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		verificationID := ""
		code := "123456"

		valid, err := service.VerifySMSCode(verificationID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "認証情報が不足しています")
	})

	t.Run("認証コードが空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		verificationID := "verification_id_123"
		code := ""

		valid, err := service.VerifySMSCode(verificationID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "認証情報が不足しています")
	})

	t.Run("認証コードが6桁でない場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		verificationID := "verification_id_123"
		code := "12345" // 5桁

		valid, err := service.VerifySMSCode(verificationID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "認証コードは6桁である必要があります")
	})

	t.Run("無効な認証コード（000000）の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		verificationID := "verification_id_123"
		code := "000000"

		valid, err := service.VerifySMSCode(verificationID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "無効な認証コード")
	})

	t.Run("7桁の認証コードの場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		verificationID := "verification_id_123"
		code := "1234567" // 7桁

		valid, err := service.VerifySMSCode(verificationID, code)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "認証コードは6桁である必要があります")
	})
}

// testUseBackupCode バックアップコード使用のテスト
func testUseBackupCode(t *testing.T) {
	t.Run("正常にバックアップコードを使用", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		backupCode := "BACKUP-CODE-123"

		valid, err := service.UseBackupCode(userID, backupCode)
		assert.NoError(t, err)
		assert.True(t, valid)
	})

	t.Run("ユーザーIDが空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := ""
		backupCode := "BACKUP-CODE-123"

		valid, err := service.UseBackupCode(userID, backupCode)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "ユーザーIDまたはバックアップコードが空です")
	})

	t.Run("バックアップコードが空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		backupCode := ""

		valid, err := service.UseBackupCode(userID, backupCode)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "ユーザーIDまたはバックアップコードが空です")
	})

	t.Run("使用済みバックアップコードの場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := "user123"
		backupCode := "USED-BACKUP-CODE"

		valid, err := service.UseBackupCode(userID, backupCode)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "バックアップコードは既に使用済みです")
	})

	t.Run("両方が空の場合エラー", func(t *testing.T) {
		service := setupAuthTestService(t)

		userID := ""
		backupCode := ""

		valid, err := service.UseBackupCode(userID, backupCode)
		assert.Error(t, err)
		assert.False(t, valid)
		assert.Contains(t, err.Error(), "ユーザーIDまたはバックアップコードが空です")
	})
}

// Helper functions

func setupAuthTestService(t *testing.T) AuthService {
	// ロガーを作成
	logger, _ := zap.NewDevelopment()

	// サービスを作成
	service := NewAuthService(logger)

	return service
}
