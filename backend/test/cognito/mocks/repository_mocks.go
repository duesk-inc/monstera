package mocks

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MockUserRepository UserRepositoryのモック
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *model.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	args := m.Called(ctx, id)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) GetByCognitoSub(ctx context.Context, cognitoSub string) (*model.User, error) {
	args := m.Called(ctx, cognitoSub)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, user *model.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(id uuid.UUID) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockUserRepository) List(offset, limit int) ([]model.User, int64, error) {
	args := m.Called(offset, limit)
	if users, ok := args.Get(0).([]model.User); ok {
		return users, args.Get(1).(int64), args.Error(2)
	}
	return nil, 0, args.Error(2)
}

// インターフェース追加メソッド
func (m *MockUserRepository) FindByID(id uuid.UUID) (*model.User, error) {
	args := m.Called(id)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) FindByEmail(email string) (*model.User, error) {
	args := m.Called(email)
	if user, ok := args.Get(0).(*model.User); ok {
		return user, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) FindByRole(role model.Role) ([]model.User, error) {
	args := m.Called(role)
	if users, ok := args.Get(0).([]model.User); ok {
		return users, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) AddRole(userID uuid.UUID, role model.Role) error {
	args := m.Called(userID, role)
	return args.Error(0)
}

func (m *MockUserRepository) RemoveRole(userID uuid.UUID, role model.Role) error {
	args := m.Called(userID, role)
	return args.Error(0)
}

func (m *MockUserRepository) SetRoles(userID uuid.UUID, roles []model.Role) error {
	args := m.Called(userID, roles)
	return args.Error(0)
}

func (m *MockUserRepository) GetRoles(userID uuid.UUID) ([]model.Role, error) {
	args := m.Called(userID)
	if roles, ok := args.Get(0).([]model.Role); ok {
		return roles, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockUserRepository) UpdateDefaultRole(userID uuid.UUID, defaultRole *model.Role) error {
	args := m.Called(userID, defaultRole)
	return args.Error(0)
}

func (m *MockUserRepository) SetLogger(logger *zap.Logger) {
	m.Called(logger)
}

func (m *MockUserRepository) CountByDepartment(ctx context.Context, departmentID uuid.UUID) (int64, error) {
	args := m.Called(ctx, departmentID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockUserRepository) CountActiveUsers(ctx context.Context, days int) (int64, error) {
	args := m.Called(ctx, days)
	return args.Get(0).(int64), args.Error(1)
}

// MockSessionRepository SessionRepositoryのモック
type MockSessionRepository struct {
	mock.Mock
}

func (m *MockSessionRepository) Create(ctx context.Context, session *model.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) GetByRefreshToken(ctx context.Context, refreshToken string) (*model.Session, error) {
	args := m.Called(ctx, refreshToken)
	if session, ok := args.Get(0).(*model.Session); ok {
		return session, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockSessionRepository) CreateSession(ctx context.Context, session model.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) GetSessionByRefreshToken(ctx context.Context, refreshToken string) (model.Session, error) {
	args := m.Called(ctx, refreshToken)
	if session, ok := args.Get(0).(model.Session); ok {
		return session, args.Error(1)
	}
	return model.Session{}, args.Error(1)
}

func (m *MockSessionRepository) UpdateSession(ctx context.Context, session model.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) Update(ctx context.Context, session *model.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) DeleteSession(ctx context.Context, sessionID uuid.UUID) error {
	args := m.Called(ctx, sessionID)
	return args.Error(0)
}

func (m *MockSessionRepository) DeleteByRefreshToken(ctx context.Context, refreshToken string) error {
	args := m.Called(ctx, refreshToken)
	return args.Error(0)
}

func (m *MockSessionRepository) DeleteExpiredSessions(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Get(0).(int), args.Error(1)
}

func (m *MockSessionRepository) DeleteUserSessions(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockSessionRepository) GetUserActiveSessions(ctx context.Context, userID uuid.UUID) ([]model.Session, error) {
	args := m.Called(ctx, userID)
	if sessions, ok := args.Get(0).([]model.Session); ok {
		return sessions, args.Error(1)
	}
	return nil, args.Error(1)
}

// モックユーザーデータ作成ヘルパー
func NewMockUser(email, cognitoSub string, role model.Role) *model.User {
	return &model.User{
		ID:          uuid.New(),
		Email:       email,
		FirstName:   "Test",
		LastName:    "User",
		Role:        role,
		CognitoSub:  cognitoSub,
		PhoneNumber: "+81901234567",
		Status:      "active",
	}
}

// モックセッションデータ作成ヘルパー
func NewMockSession(userID uuid.UUID, refreshToken string) *model.Session {
	return &model.Session{
		ID:           uuid.New(),
		UserID:       userID,
		RefreshToken: refreshToken,
	}
}

// SetupSuccessfulUserCreation 成功するユーザー作成のモックを設定
func (m *MockUserRepository) SetupSuccessfulUserCreation(user *model.User) {
	m.On("Create", mock.Anything, mock.MatchedBy(func(u *model.User) bool {
		return u.Email == user.Email
	})).Return(nil)
}

// SetupSuccessfulUserRetrieval 成功するユーザー取得のモックを設定
func (m *MockUserRepository) SetupSuccessfulUserRetrieval(user *model.User) {
	// メールアドレスでの取得
	m.On("GetByEmail", mock.Anything, user.Email).Return(user, nil)
	// CognitoSubでの取得
	m.On("GetByCognitoSub", mock.Anything, user.CognitoSub).Return(user, nil)
	// IDでの取得
	m.On("GetByID", mock.Anything, user.ID).Return(user, nil)
}

// SetupUserNotFound ユーザーが見つからない場合のモックを設定
func (m *MockUserRepository) SetupUserNotFound(email, cognitoSub string, userID uuid.UUID) {
	if email != "" {
		m.On("GetByEmail", mock.Anything, email).Return(nil, gorm.ErrRecordNotFound)
	}
	if cognitoSub != "" {
		m.On("GetByCognitoSub", mock.Anything, cognitoSub).Return(nil, gorm.ErrRecordNotFound)
	}
	if userID != uuid.Nil {
		m.On("GetByID", mock.Anything, userID).Return(nil, gorm.ErrRecordNotFound)
	}
}

// SetupSuccessfulSessionCreation 成功するセッション作成のモックを設定
func (m *MockSessionRepository) SetupSuccessfulSessionCreation(session *model.Session) {
	m.On("Create", mock.Anything, mock.MatchedBy(func(s *model.Session) bool {
		return s.UserID == session.UserID
	})).Return(nil)
}

// SetupSuccessfulSessionRetrieval 成功するセッション取得のモックを設定
func (m *MockSessionRepository) SetupSuccessfulSessionRetrieval(session *model.Session) {
	m.On("GetByRefreshToken", mock.Anything, session.RefreshToken).Return(session, nil)
	m.On("GetByUserID", mock.Anything, session.UserID).Return([]*model.Session{session}, nil)
}

// SetupSessionNotFound セッションが見つからない場合のモックを設定
func (m *MockSessionRepository) SetupSessionNotFound(refreshToken string, userID uuid.UUID) {
	if refreshToken != "" {
		m.On("GetByRefreshToken", mock.Anything, refreshToken).Return(nil, gorm.ErrRecordNotFound)
	}
	if userID != uuid.Nil {
		m.On("GetByUserID", mock.Anything, userID).Return([]*model.Session{}, nil)
	}
}
