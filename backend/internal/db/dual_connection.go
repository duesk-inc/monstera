package db

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// DualDBConnection はMySQLとPostgreSQLの両方に接続を持つ構造体
type DualDBConnection struct {
	MySQL       *gorm.DB
	Postgres    *gorm.DB
	logger      *zap.Logger
	mu          sync.RWMutex
	rolloutPerc int // PostgreSQLへのロールアウト割合（0-100）
}

// NewDualDBConnection は新しいデュアルDB接続を作成
func NewDualDBConnection(mysql, postgres *gorm.DB, logger *zap.Logger) *DualDBConnection {
	rolloutPerc := 0
	if percStr := os.Getenv("POSTGRES_ROLLOUT_PERCENTAGE"); percStr != "" {
		if perc, err := strconv.Atoi(percStr); err == nil && perc >= 0 && perc <= 100 {
			rolloutPerc = perc
		}
	}

	return &DualDBConnection{
		MySQL:       mysql,
		Postgres:    postgres,
		logger:      logger,
		rolloutPerc: rolloutPerc,
	}
}

// GetDB はユーザーIDに基づいて適切なDBを返す
func (d *DualDBConnection) GetDB(userID string) *gorm.DB {
	if d.ShouldUsePostgres(userID) {
		d.logger.Debug("Using PostgreSQL", zap.String("user_id", userID))
		return d.Postgres
	}
	d.logger.Debug("Using MySQL", zap.String("user_id", userID))
	return d.MySQL
}

// GetReadDB は読み取り用のDBを返す（カナリアリリース対応）
func (d *DualDBConnection) GetReadDB(userID string) *gorm.DB {
	// 読み取りは設定に基づいて選択
	if os.Getenv("READ_FROM_POSTGRES") == "true" || d.ShouldUsePostgres(userID) {
		return d.Postgres
	}
	return d.MySQL
}

// GetWriteDB は書き込み用のDBを返す（デュアルライト対応）
func (d *DualDBConnection) GetWriteDB() (*gorm.DB, *gorm.DB) {
	if os.Getenv("ENABLE_DUAL_WRITE") == "true" {
		// 両方のDBに書き込む
		return d.MySQL, d.Postgres
	}
	// 通常はMySQLのみ
	return d.MySQL, nil
}

// ShouldUsePostgres はユーザーIDに基づいてPostgreSQLを使用するか判定
func (d *DualDBConnection) ShouldUsePostgres(userID string) bool {
	d.mu.RLock()
	percentage := d.rolloutPerc
	d.mu.RUnlock()

	if percentage == 0 {
		return false
	}
	if percentage == 100 {
		return true
	}

	// ユーザーIDのハッシュ値を計算
	hash := hashUserID(userID)
	return hash%100 < percentage
}

// UpdateRolloutPercentage はロールアウト割合を更新
func (d *DualDBConnection) UpdateRolloutPercentage(percentage int) error {
	if percentage < 0 || percentage > 100 {
		return fmt.Errorf("percentage must be between 0 and 100")
	}

	d.mu.Lock()
	d.rolloutPerc = percentage
	d.mu.Unlock()

	d.logger.Info("Updated PostgreSQL rollout percentage",
		zap.Int("percentage", percentage))
	return nil
}

// GetRolloutPercentage は現在のロールアウト割合を返す
func (d *DualDBConnection) GetRolloutPercentage() int {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.rolloutPerc
}

// ExecuteInTransaction は両方のDBでトランザクションを実行
func (d *DualDBConnection) ExecuteInTransaction(ctx context.Context, fn func(mysqlTx, pgTx *gorm.DB) error) error {
	// MySQLトランザクション開始
	mysqlTx := d.MySQL.WithContext(ctx).Begin()
	if mysqlTx.Error != nil {
		return fmt.Errorf("failed to begin MySQL transaction: %w", mysqlTx.Error)
	}

	// PostgreSQLトランザクション開始（デュアルライトが有効な場合）
	var pgTx *gorm.DB
	if os.Getenv("ENABLE_DUAL_WRITE") == "true" {
		pgTx = d.Postgres.WithContext(ctx).Begin()
		if pgTx.Error != nil {
			mysqlTx.Rollback()
			return fmt.Errorf("failed to begin PostgreSQL transaction: %w", pgTx.Error)
		}
	}

	// トランザクション実行
	if err := fn(mysqlTx, pgTx); err != nil {
		mysqlTx.Rollback()
		if pgTx != nil {
			pgTx.Rollback()
		}
		return err
	}

	// コミット
	if err := mysqlTx.Commit().Error; err != nil {
		if pgTx != nil {
			pgTx.Rollback()
		}
		return fmt.Errorf("failed to commit MySQL transaction: %w", err)
	}

	if pgTx != nil {
		if err := pgTx.Commit().Error; err != nil {
			// PostgreSQLのコミットが失敗した場合はログに記録
			// MySQLは既にコミット済みなのでロールバックできない
			d.logger.Error("Failed to commit PostgreSQL transaction",
				zap.Error(err))
		}
	}

	return nil
}

// HealthCheck は両方のDBの健全性をチェック
func (d *DualDBConnection) HealthCheck(ctx context.Context) error {
	// MySQL health check
	sqlDB, err := d.MySQL.DB()
	if err != nil {
		return fmt.Errorf("failed to get MySQL connection: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("MySQL ping failed: %w", err)
	}

	// PostgreSQL health check
	if d.Postgres != nil {
		sqlDB, err = d.Postgres.DB()
		if err != nil {
			return fmt.Errorf("failed to get PostgreSQL connection: %w", err)
		}

		if err := sqlDB.PingContext(ctx); err != nil {
			// PostgreSQLの障害は警告として記録（フェイルオーバー可能）
			d.logger.Warn("PostgreSQL ping failed", zap.Error(err))
		}
	}

	return nil
}

// GetMetrics は両DBのメトリクスを返す
func (d *DualDBConnection) GetMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	// MySQL metrics
	if sqlDB, err := d.MySQL.DB(); err == nil {
		stats := sqlDB.Stats()
		metrics["mysql"] = map[string]interface{}{
			"open_connections": stats.OpenConnections,
			"in_use":           stats.InUse,
			"idle":             stats.Idle,
			"wait_count":       stats.WaitCount,
			"wait_duration":    stats.WaitDuration.String(),
		}
	}

	// PostgreSQL metrics
	if d.Postgres != nil {
		if sqlDB, err := d.Postgres.DB(); err == nil {
			stats := sqlDB.Stats()
			metrics["postgresql"] = map[string]interface{}{
				"open_connections": stats.OpenConnections,
				"in_use":           stats.InUse,
				"idle":             stats.Idle,
				"wait_count":       stats.WaitCount,
				"wait_duration":    stats.WaitDuration.String(),
			}
		}
	}

	metrics["rollout_percentage"] = d.GetRolloutPercentage()
	metrics["dual_write_enabled"] = os.Getenv("ENABLE_DUAL_WRITE") == "true"

	return metrics
}

// hashUserID はユーザーIDから一貫したハッシュ値を生成
func hashUserID(userID string) int {
	h := md5.New()
	h.Write([]byte(userID))
	hash := hex.EncodeToString(h.Sum(nil))

	// 最初の8文字を使用して整数に変換
	var result int
	for i := 0; i < 8 && i < len(hash); i++ {
		result = result*16 + int(hash[i])
	}

	return result
}
