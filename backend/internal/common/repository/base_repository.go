package repository

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/common/logger"
	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// BaseRepository は基本的なリポジトリ機能を提供するインターフェース
type BaseRepository interface {
	// GetDB はデータベース接続を取得する
	GetDB() *gorm.DB
	// WithContext はコンテキスト付きのクエリを実行する
	WithContext(ctx context.Context) *gorm.DB
	// ExecuteInTransaction はトランザクション内で関数を実行する
	ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error
	// ValidateID は渡されたIDが有効かどうかを検証する
	ValidateID(id string) error
	// NewID は新しいUUIDを生成する
	NewID() string
}

// baseRepository は基本的なリポジトリ実装
type baseRepository struct {
	db        *gorm.DB
	logger    *zap.Logger
	txManager transaction.TransactionManager
}

// NewBaseRepository は新しいBaseRepositoryインスタンスを作成する
func NewBaseRepository(db *gorm.DB, log *zap.Logger) BaseRepository {
	// ロガーがnilの場合は無効ロガーを使用
	if log == nil {
		log = logger.NewNopLogger()
	}

	// トランザクションマネージャーを生成
	txManager := transaction.NewTransactionManager(db, log)

	return &baseRepository{
		db:        db,
		logger:    log,
		txManager: txManager,
	}
}

// GetDB はデータベース接続を取得する
func (r *baseRepository) GetDB() *gorm.DB {
	return r.db
}

// WithContext はコンテキスト付きのクエリを実行する
func (r *baseRepository) WithContext(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx)
}

// ExecuteInTransaction はトランザクション内で関数を実行する
func (r *baseRepository) ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.txManager.ExecuteInTransaction(ctx, fn)
}

// ValidateID は渡されたIDが有効かどうかを検証する
func (r *baseRepository) ValidateID(id string) error {
	if id == "" {
		return fmt.Errorf("無効なID: 空のUUID")
	}
	return nil
}

// NewID は新しいUUIDを生成する
func (r *baseRepository) NewID() string {
	return uuid.New().String()
}
