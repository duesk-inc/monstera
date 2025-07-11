package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SessionRepository セッションリポジトリのインターフェース（仕様書準拠）
type SessionRepository interface {
	Create(ctx context.Context, session *model.Session) error
	CreateSession(ctx context.Context, session model.Session) error
	GetSessionByRefreshToken(ctx context.Context, refreshToken string) (model.Session, error)
	GetByRefreshToken(ctx context.Context, refreshToken string) (*model.Session, error)
	UpdateSession(ctx context.Context, session model.Session) error
	Update(ctx context.Context, session *model.Session) error
	DeleteSession(ctx context.Context, sessionID uuid.UUID) error
	DeleteByRefreshToken(ctx context.Context, refreshToken string) error
	DeleteExpiredSessions(ctx context.Context) (int, error)
	DeleteUserSessions(ctx context.Context, userID uuid.UUID) error
	GetUserActiveSessions(ctx context.Context, userID uuid.UUID) ([]model.Session, error)
}

// sessionRepository セッションリポジトリの実装
type sessionRepository struct {
	repository.BaseRepository
	Logger *zap.Logger
}

// NewSessionRepository セッションリポジトリのインスタンスを生成
func NewSessionRepository(db *gorm.DB, logger *zap.Logger) SessionRepository {
	baseRepo := repository.NewBaseRepository(db, logger)
	return &sessionRepository{
		BaseRepository: baseRepo,
		Logger:         logger,
	}
}

// CreateSession セッションを作成
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

// GetSessionByRefreshToken リフレッシュトークンでセッションを取得
func (r *sessionRepository) GetSessionByRefreshToken(ctx context.Context, refreshToken string) (model.Session, error) {
	var session model.Session
	result := r.WithContext(ctx).
		Where("refresh_token = ? AND deleted_at IS NULL", refreshToken).
		First(&session)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return session, fmt.Errorf("セッションが見つかりません")
		}
		return session, fmt.Errorf("セッションの取得に失敗しました: %w", result.Error)
	}

	return session, nil
}

// UpdateSession セッションを更新
func (r *sessionRepository) UpdateSession(ctx context.Context, session model.Session) error {
	result := r.WithContext(ctx).Save(&session)
	if result.Error != nil {
		return fmt.Errorf("セッションの更新に失敗しました: %w", result.Error)
	}

	return nil
}

// DeleteSession セッションを削除
func (r *sessionRepository) DeleteSession(ctx context.Context, sessionID uuid.UUID) error {
	result := r.WithContext(ctx).
		Where("id = ?", sessionID).
		Delete(&model.Session{})

	if result.Error != nil {
		return fmt.Errorf("セッションの削除に失敗しました: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("セッションが見つかりません")
	}

	return nil
}

// DeleteExpiredSessions 期限切れセッションを削除
func (r *sessionRepository) DeleteExpiredSessions(ctx context.Context) (int, error) {
	result := r.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Delete(&model.Session{})

	if result.Error != nil {
		return 0, fmt.Errorf("期限切れセッションの削除に失敗しました: %w", result.Error)
	}

	return int(result.RowsAffected), nil
}

// DeleteUserSessions ユーザーの全セッションを削除
func (r *sessionRepository) DeleteUserSessions(ctx context.Context, userID uuid.UUID) error {
	result := r.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&model.Session{})

	if result.Error != nil {
		return fmt.Errorf("ユーザーセッションの削除に失敗しました: %w", result.Error)
	}

	return nil
}

// GetUserActiveSessions ユーザーのアクティブなセッションを取得
func (r *sessionRepository) GetUserActiveSessions(ctx context.Context, userID uuid.UUID) ([]model.Session, error) {
	var sessions []model.Session
	result := r.WithContext(ctx).
		Where("user_id = ? AND expires_at > ? AND deleted_at IS NULL", userID, time.Now()).
		Order("last_used_at DESC").
		Find(&sessions)

	if result.Error != nil {
		return nil, fmt.Errorf("アクティブセッションの取得に失敗しました: %w", result.Error)
	}

	return sessions, nil
}

// Create セッションを作成（簡素版）
func (r *sessionRepository) Create(ctx context.Context, session *model.Session) error {
	if session.ID == uuid.Nil {
		session.ID = r.NewID()
	}

	result := r.WithContext(ctx).Create(session)
	if result.Error != nil {
		return fmt.Errorf("セッションの作成に失敗しました: %w", result.Error)
	}

	return nil
}

// GetByRefreshToken リフレッシュトークンでセッションを取得（ポインタ版）
func (r *sessionRepository) GetByRefreshToken(ctx context.Context, refreshToken string) (*model.Session, error) {
	var session model.Session

	result := r.WithContext(ctx).
		Where("refresh_token = ? AND expires_at > ?", refreshToken, time.Now()).
		First(&session)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("有効なセッションが見つかりません")
		}
		return nil, fmt.Errorf("セッションの取得に失敗しました: %w", result.Error)
	}

	return &session, nil
}

// Update セッションを更新（ポインタ版）
func (r *sessionRepository) Update(ctx context.Context, session *model.Session) error {
	result := r.WithContext(ctx).Save(session)
	if result.Error != nil {
		return fmt.Errorf("セッションの更新に失敗しました: %w", result.Error)
	}

	return nil
}

// DeleteByRefreshToken リフレッシュトークンでセッションを削除
func (r *sessionRepository) DeleteByRefreshToken(ctx context.Context, refreshToken string) error {
	result := r.WithContext(ctx).
		Where("refresh_token = ?", refreshToken).
		Delete(&model.Session{})

	if result.Error != nil {
		return fmt.Errorf("セッションの削除に失敗しました: %w", result.Error)
	}

	return nil
}
