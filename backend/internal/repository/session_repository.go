package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
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
	DeleteUserSessions(ctx context.Context, userID string) error
	GetUserActiveSessions(ctx context.Context, userID string) ([]model.Session, error)
}
