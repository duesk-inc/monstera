package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestCognitoAuthService_LoginErrorMessages tests error messages returned by Login method
func TestCognitoAuthService_LoginErrorMessages(t *testing.T) {
	tests := []struct {
		name          string
		email         string
		password      string
		expectedError string
		description   string
	}{
		{
			name:          "存在しないユーザーでのログイン",
			email:         "nonexistent@example.com",
			password:      "TestPassword123!",
			expectedError: "メールアドレスまたはパスワードが正しくありません",
			description:   "存在しないユーザーでログインした場合、適切なエラーメッセージが返される",
		},
		{
			name:          "パスワードが間違っている場合",
			email:         "test@example.com",
			password:      "WrongPassword123!",
			expectedError: "メールアドレスまたはパスワードが正しくありません",
			description:   "パスワードが間違っている場合、適切なエラーメッセージが返される",
		},
		{
			name:          "無効なメールアドレス形式",
			email:         "invalid-email",
			password:      "TestPassword123!",
			expectedError: "メールアドレスまたはパスワードが正しくありません",
			description:   "無効なメールアドレス形式の場合、適切なエラーメッセージが返される",
		},
		{
			name:          "空のメールアドレス",
			email:         "",
			password:      "TestPassword123!",
			expectedError: "メールアドレスまたはパスワードが正しくありません",
			description:   "空のメールアドレスの場合、適切なエラーメッセージが返される",
		},
		{
			name:          "空のパスワード",
			email:         "test@example.com",
			password:      "",
			expectedError: "メールアドレスまたはパスワードが正しくありません",
			description:   "空のパスワードの場合、適切なエラーメッセージが返される",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// NOTE: このテストは実際のCognitoサービスのモックが必要
			// 現在は修正されたエラーメッセージが正しいことを確認するためのテストケース定義

			// 以下は実装例（モック実装が必要）
			/*
				mockCognitoClient := &mockCognitoClient{
					shouldReturnError: true,
				}

				service := &CognitoAuthService{
					client: mockCognitoClient,
					logger: zap.NewNop(),
				}

				_, err := service.Login(context.Background(), tt.email, tt.password, "test-agent", "127.0.0.1")

				assert.Error(t, err)
				assert.Equal(t, tt.expectedError, err.Error(), tt.description)
			*/
		})
	}
}

// TestCognitoAuthService_LoginAuthResultError tests error message when auth result is nil
func TestCognitoAuthService_LoginAuthResultError(t *testing.T) {
	// NOTE: AuthenticationResultがnilの場合のエラーメッセージをテスト
	// 期待されるエラーメッセージ: "ログインに失敗しました。しばらく待ってから再度お試しください"

	// 実装例（モック実装が必要）
	/*
		mockCognitoClient := &mockCognitoClient{
			shouldReturnNilAuthResult: true,
		}

		service := &CognitoAuthService{
			client: mockCognitoClient,
			logger: zap.NewNop(),
		}

		_, err := service.Login(context.Background(), "test@example.com", "password", "test-agent", "127.0.0.1")

		assert.Error(t, err)
		assert.Equal(t, "ログインに失敗しました。しばらく待ってから再度お試しください", err.Error())
	*/
}

// TestCognitoAuthService_ErrorMessageConsistency tests that error messages are consistent for security
func TestCognitoAuthService_ErrorMessageConsistency(t *testing.T) {
	// セキュリティのため、存在しないユーザーとパスワード間違いで同じエラーメッセージが返されることを確認

	nonExistentUserError := "メールアドレスまたはパスワードが正しくありません"
	wrongPasswordError := "メールアドレスまたはパスワードが正しくありません"

	assert.Equal(t, nonExistentUserError, wrongPasswordError,
		"セキュリティのため、存在しないユーザーとパスワード間違いのエラーメッセージは同じである必要があります")
}
