package transaction

import (
	"context"
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TransactionManager トランザクション管理を行うインターフェース
type TransactionManager interface {
	ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error
	GetDB() *gorm.DB
}

// transactionManager トランザクション管理の実装
type transactionManager struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewTransactionManager 新しいTransactionManagerを作成
func NewTransactionManager(db *gorm.DB, logger *zap.Logger) TransactionManager {
	if logger == nil {
		logger = zap.NewNop()
	}

	return &transactionManager{
		db:     db,
		logger: logger,
	}
}

// ExecuteInTransaction トランザクション内で関数を実行
func (tm *transactionManager) ExecuteInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	tm.logger.Debug("トランザクション開始")
	err := tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := fn(tx)
		if err != nil {
			tm.logger.Debug("トランザクションロールバック", zap.Error(err))
			return err
		}
		tm.logger.Debug("トランザクションコミット")
		return nil
	})

	if err != nil {
		return fmt.Errorf("トランザクション実行エラー: %w", err)
	}
	return nil
}

// GetDB データベース接続を取得
func (tm *transactionManager) GetDB() *gorm.DB {
	return tm.db
}
