package repository

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SessionRepositoryImpl セッションリポジトリの実装
type SessionRepositoryImpl struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

// NewSessionRepository 新しいセッションリポジトリを作成
func NewSessionRepository(db *gorm.DB, logger *zap.Logger) SessionRepository {
	return &SessionRepositoryImpl{
		DB:     db,
		Logger: logger,
	}
}

// Create セッションを作成
func (r *SessionRepositoryImpl) Create(ctx context.Context, session *model.Session) error {
	if r.Logger != nil {
		r.Logger.Info("Creating session", zap.String("user_id", session.UserID))
	}
	return r.DB.WithContext(ctx).Create(session).Error
}

// CreateSession セッションを作成（モデル値渡し版）
func (r *SessionRepositoryImpl) CreateSession(ctx context.Context, session model.Session) error {
	return r.Create(ctx, &session)
}

// GetSessionByRefreshToken リフレッシュトークンでセッションを取得（モデル値返し版）
func (r *SessionRepositoryImpl) GetSessionByRefreshToken(ctx context.Context, refreshToken string) (model.Session, error) {
	session, err := r.GetByRefreshToken(ctx, refreshToken)
	if err != nil {
		return model.Session{}, err
	}
	return *session, nil
}

// GetByRefreshToken リフレッシュトークンでセッションを取得
func (r *SessionRepositoryImpl) GetByRefreshToken(ctx context.Context, refreshToken string) (*model.Session, error) {
	var session model.Session
	err := r.DB.WithContext(ctx).Where("refresh_token = ?", refreshToken).First(&session).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to get session by refresh token", zap.Error(err))
		}
		return nil, err
	}
	return &session, nil
}

// UpdateSession セッションを更新（モデル値渡し版）
func (r *SessionRepositoryImpl) UpdateSession(ctx context.Context, session model.Session) error {
	return r.Update(ctx, &session)
}

// Update セッションを更新
func (r *SessionRepositoryImpl) Update(ctx context.Context, session *model.Session) error {
	if r.Logger != nil {
		r.Logger.Info("Updating session", zap.String("id", session.ID))
	}
	return r.DB.WithContext(ctx).Save(session).Error
}

// DeleteSession セッションをIDで削除
func (r *SessionRepositoryImpl) DeleteSession(ctx context.Context, sessionID string) error {
	if r.Logger != nil {
		r.Logger.Info("Deleting session", zap.String("id", sessionID))
	}
	return r.DB.WithContext(ctx).Delete(&model.Session{}, "id = ?", sessionID).Error
}

// DeleteByRefreshToken リフレッシュトークンでセッションを削除
func (r *SessionRepositoryImpl) DeleteByRefreshToken(ctx context.Context, refreshToken string) error {
	if r.Logger != nil {
		r.Logger.Info("Deleting session by refresh token")
	}
	return r.DB.WithContext(ctx).Delete(&model.Session{}, "refresh_token = ?", refreshToken).Error
}

// DeleteExpiredSessions 期限切れセッションを削除
func (r *SessionRepositoryImpl) DeleteExpiredSessions(ctx context.Context) (int, error) {
	if r.Logger != nil {
		r.Logger.Info("Deleting expired sessions")
	}
	result := r.DB.WithContext(ctx).Delete(&model.Session{}, "expires_at < ?", time.Now())
	return int(result.RowsAffected), result.Error
}

// DeleteUserSessions ユーザーの全セッションを削除
func (r *SessionRepositoryImpl) DeleteUserSessions(ctx context.Context, userID string) error {
	if r.Logger != nil {
		r.Logger.Info("Deleting all sessions for user", zap.String("user_id", userID))
	}
	return r.DB.WithContext(ctx).Delete(&model.Session{}, "user_id = ?", userID).Error
}

// GetUserActiveSessions ユーザーのアクティブなセッション一覧を取得
func (r *SessionRepositoryImpl) GetUserActiveSessions(ctx context.Context, userID string) ([]model.Session, error) {
	var sessions []model.Session
	err := r.DB.WithContext(ctx).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Order("created_at DESC").
		Find(&sessions).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to get user active sessions", zap.String("user_id", userID), zap.Error(err))
		}
		return nil, err
	}
	return sessions, nil
}
