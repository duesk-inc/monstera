package mocks

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/stretchr/testify/mock"
)

// MockCognitoClient Cognito クライアントのモック
type MockCognitoClient struct {
	mock.Mock
}

// InitiateAuth InitiateAuth メソッドのモック
func (m *MockCognitoClient) InitiateAuth(ctx context.Context, params *cognitoidentityprovider.InitiateAuthInput, optFns ...func(*cognitoidentityprovider.Options)) (*cognitoidentityprovider.InitiateAuthOutput, error) {
	args := m.Called(ctx, params, optFns)

	if output, ok := args.Get(0).(*cognitoidentityprovider.InitiateAuthOutput); ok {
		return output, args.Error(1)
	}
	return nil, args.Error(1)
}

// AdminCreateUser AdminCreateUser メソッドのモック
func (m *MockCognitoClient) AdminCreateUser(ctx context.Context, params *cognitoidentityprovider.AdminCreateUserInput, optFns ...func(*cognitoidentityprovider.Options)) (*cognitoidentityprovider.AdminCreateUserOutput, error) {
	args := m.Called(ctx, params, optFns)

	if output, ok := args.Get(0).(*cognitoidentityprovider.AdminCreateUserOutput); ok {
		return output, args.Error(1)
	}
	return nil, args.Error(1)
}

// AdminSetUserPassword AdminSetUserPassword メソッドのモック
func (m *MockCognitoClient) AdminSetUserPassword(ctx context.Context, params *cognitoidentityprovider.AdminSetUserPasswordInput, optFns ...func(*cognitoidentityprovider.Options)) (*cognitoidentityprovider.AdminSetUserPasswordOutput, error) {
	args := m.Called(ctx, params, optFns)

	if output, ok := args.Get(0).(*cognitoidentityprovider.AdminSetUserPasswordOutput); ok {
		return output, args.Error(1)
	}
	return nil, args.Error(1)
}

// AdminDeleteUser AdminDeleteUser メソッドのモック
func (m *MockCognitoClient) AdminDeleteUser(ctx context.Context, params *cognitoidentityprovider.AdminDeleteUserInput, optFns ...func(*cognitoidentityprovider.Options)) (*cognitoidentityprovider.AdminDeleteUserOutput, error) {
	args := m.Called(ctx, params, optFns)

	if output, ok := args.Get(0).(*cognitoidentityprovider.AdminDeleteUserOutput); ok {
		return output, args.Error(1)
	}
	return nil, args.Error(1)
}

// GetUser GetUser メソッドのモック
func (m *MockCognitoClient) GetUser(ctx context.Context, params *cognitoidentityprovider.GetUserInput, optFns ...func(*cognitoidentityprovider.Options)) (*cognitoidentityprovider.GetUserOutput, error) {
	args := m.Called(ctx, params, optFns)

	if output, ok := args.Get(0).(*cognitoidentityprovider.GetUserOutput); ok {
		return output, args.Error(1)
	}
	return nil, args.Error(1)
}

// NewMockInitiateAuthOutput 成功レスポンスのモックを作成
func NewMockInitiateAuthOutput(accessToken, refreshToken, idToken string) *cognitoidentityprovider.InitiateAuthOutput {
	return &cognitoidentityprovider.InitiateAuthOutput{
		AuthenticationResult: &types.AuthenticationResultType{
			AccessToken:  &accessToken,
			RefreshToken: &refreshToken,
			IdToken:      &idToken,
			ExpiresIn:    3600, // 1時間
			TokenType:    stringPtr("Bearer"),
		},
	}
}

// NewMockAdminCreateUserOutput ユーザー作成成功レスポンスのモックを作成
func NewMockAdminCreateUserOutput(email, cognitoSub string) *cognitoidentityprovider.AdminCreateUserOutput {
	return &cognitoidentityprovider.AdminCreateUserOutput{
		User: &types.UserType{
			Username: &email,
			Attributes: []types.AttributeType{
				{
					Name:  stringPtr("sub"),
					Value: &cognitoSub,
				},
				{
					Name:  stringPtr("email"),
					Value: &email,
				},
				{
					Name:  stringPtr("email_verified"),
					Value: stringPtr("true"),
				},
			},
			UserStatus:     types.UserStatusTypeConfirmed,
			Enabled:        true,
			UserCreateDate: nil, // 現在時刻が設定される
		},
	}
}

// NewMockGetUserOutput ユーザー情報取得成功レスポンスのモックを作成
func NewMockGetUserOutput(email, cognitoSub, name, role string) *cognitoidentityprovider.GetUserOutput {
	return &cognitoidentityprovider.GetUserOutput{
		Username: &email,
		UserAttributes: []types.AttributeType{
			{
				Name:  stringPtr("sub"),
				Value: &cognitoSub,
			},
			{
				Name:  stringPtr("email"),
				Value: &email,
			},
			{
				Name:  stringPtr("name"),
				Value: &name,
			},
			{
				Name:  stringPtr("custom:role"),
				Value: &role,
			},
			{
				Name:  stringPtr("email_verified"),
				Value: stringPtr("true"),
			},
		},
	}
}

// MockCognitoError Cognito エラーのモック
type MockCognitoError struct {
	Code    string
	Message string
}

func (e *MockCognitoError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// NewNotAuthorizedError 認証失敗エラーのモック
func NewNotAuthorizedError() error {
	return &MockCognitoError{
		Code:    "NotAuthorizedException",
		Message: "Incorrect username or password.",
	}
}

// NewUserNotFoundError ユーザー未発見エラーのモック
func NewUserNotFoundError() error {
	return &MockCognitoError{
		Code:    "UserNotFoundException",
		Message: "User does not exist.",
	}
}

// NewInvalidParameterError 無効パラメータエラーのモック
func NewInvalidParameterError(message string) error {
	return &MockCognitoError{
		Code:    "InvalidParameterException",
		Message: message,
	}
}

// NewUsernameExistsError ユーザー名重複エラーのモック
func NewUsernameExistsError() error {
	return &MockCognitoError{
		Code:    "UsernameExistsException",
		Message: "An account with the given email already exists.",
	}
}

// ヘルパー関数
func stringPtr(s string) *string {
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}

// SetupSuccessfulLoginMock 成功するログインのモックを設定
func (m *MockCognitoClient) SetupSuccessfulLoginMock(email, accessToken, refreshToken, idToken string) {
	output := NewMockInitiateAuthOutput(accessToken, refreshToken, idToken)
	m.On("InitiateAuth", mock.Anything, mock.MatchedBy(func(input *cognitoidentityprovider.InitiateAuthInput) bool {
		return input.AuthParameters["USERNAME"] == email
	}), mock.Anything).Return(output, nil)
}

// SetupFailedLoginMock 失敗するログインのモックを設定
func (m *MockCognitoClient) SetupFailedLoginMock(email string) {
	m.On("InitiateAuth", mock.Anything, mock.MatchedBy(func(input *cognitoidentityprovider.InitiateAuthInput) bool {
		return input.AuthParameters["USERNAME"] == email
	}), mock.Anything).Return(nil, NewNotAuthorizedError())
}

// SetupSuccessfulUserCreationMock 成功するユーザー作成のモックを設定
func (m *MockCognitoClient) SetupSuccessfulUserCreationMock(email, cognitoSub string) {
	createOutput := NewMockAdminCreateUserOutput(email, cognitoSub)
	m.On("AdminCreateUser", mock.Anything, mock.MatchedBy(func(input *cognitoidentityprovider.AdminCreateUserInput) bool {
		return *input.Username == email
	}), mock.Anything).Return(createOutput, nil)

	setPasswordOutput := &cognitoidentityprovider.AdminSetUserPasswordOutput{}
	m.On("AdminSetUserPassword", mock.Anything, mock.MatchedBy(func(input *cognitoidentityprovider.AdminSetUserPasswordInput) bool {
		return *input.Username == email
	}), mock.Anything).Return(setPasswordOutput, nil)
}

// SetupSuccessfulGetUserMock 成功するユーザー情報取得のモックを設定
func (m *MockCognitoClient) SetupSuccessfulGetUserMock(email, cognitoSub, name, role string) {
	output := NewMockGetUserOutput(email, cognitoSub, name, role)
	m.On("GetUser", mock.Anything, mock.Anything, mock.Anything).Return(output, nil)
}
