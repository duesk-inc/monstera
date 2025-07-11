package patches

import (
	"context"
	"reflect"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PostgreSQLBulkInsertMixin PostgreSQL最適化されたバルクインサート機能を提供
type PostgreSQLBulkInsertMixin struct {
	db     *gorm.DB
	logger *zap.Logger
}

// CreateInBatchesOptimized PostgreSQL最適化版CreateInBatches
// 既存のCreateInBatchesの代替として使用
func (m *PostgreSQLBulkInsertMixin) CreateInBatchesOptimized(ctx context.Context, data interface{}, batchSize int) error {
	// PostgreSQLかどうかを判定
	isPostgreSQL := m.db.Dialector.Name() == "postgres"

	if !isPostgreSQL {
		// MySQL等の場合は標準のCreateInBatchesを使用
		return m.db.WithContext(ctx).CreateInBatches(data, batchSize).Error
	}

	// PostgreSQL最適化処理
	return m.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// バルクインサート前の最適化
		// 注意: これらの設定は慎重に使用する必要があります

		// 自動コミットの一時無効化（パフォーマンス向上）
		// tx.Exec("SET LOCAL synchronous_commit = OFF")

		// 標準のCreateInBatchesを実行
		return tx.CreateInBatches(data, batchSize).Error
	})
}

// CreateInBatchesWithConflict ON CONFLICT対応のバルクインサート
func (m *PostgreSQLBulkInsertMixin) CreateInBatchesWithConflict(
	ctx context.Context,
	data interface{},
	batchSize int,
	conflictColumns []string,
	updateColumns []string,
) error {
	isPostgreSQL := m.db.Dialector.Name() == "postgres"

	if !isPostgreSQL {
		// MySQLの場合
		return m.db.WithContext(ctx).
			Clauses(clause.OnConflict{
				UpdateAll: true,
			}).
			CreateInBatches(data, batchSize).Error
	}

	// PostgreSQLの場合
	onConflict := clause.OnConflict{
		Columns: []clause.Column{},
	}

	// 競合カラムの設定
	for _, col := range conflictColumns {
		onConflict.Columns = append(onConflict.Columns, clause.Column{Name: col})
	}

	// 更新カラムの設定
	if len(updateColumns) > 0 {
		onConflict.DoUpdates = clause.AssignmentColumns(updateColumns)
	} else {
		onConflict.UpdateAll = true
	}

	return m.db.WithContext(ctx).
		Clauses(onConflict).
		CreateInBatches(data, batchSize).Error
}

// 以下、各リポジトリの更新例

// モデル定義のプレースホルダー（実際のプロジェクトのモデルを使用）
type Notification struct {
	ID string
}

type DailyRecord struct {
	ID             string
	WeeklyReportID string
	Date           time.Time
}

type WeeklyReportArchive struct {
	ID string
}

// NotificationRepositoryPatch 通知リポジトリのパッチ
type NotificationRepositoryPatch struct {
	*PostgreSQLBulkInsertMixin
}

// CreateNotificationsBulkOptimized 最適化版バルク作成
func (r *NotificationRepositoryPatch) CreateNotificationsBulkOptimized(ctx context.Context, notifications []*Notification) error {
	if len(notifications) == 0 {
		return nil
	}

	// PostgreSQL向けバッチサイズの調整
	batchSize := 100
	if r.db.Dialector.Name() == "postgres" && len(notifications) > 1000 {
		batchSize = 250 // PostgreSQLは大きめのバッチサイズでも効率的
	}

	return r.CreateInBatchesOptimized(ctx, notifications, batchSize)
}

// DailyRecordRepositoryPatch 日次記録リポジトリのパッチ
type DailyRecordRepositoryPatch struct {
	*PostgreSQLBulkInsertMixin
}

// BatchCreateOptimized 最適化版バッチ作成
func (r *DailyRecordRepositoryPatch) BatchCreateOptimized(ctx context.Context, records []*DailyRecord) error {
	if len(records) == 0 {
		return nil
	}

	// 重複チェックとUPSERT処理
	conflictColumns := []string{"weekly_report_id", "date"}
	updateColumns := []string{"start_time", "end_time", "work_hours", "updated_at"}

	return r.CreateInBatchesWithConflict(ctx, records, 100, conflictColumns, updateColumns)
}

// ArchiveRepositoryPatch アーカイブリポジトリのパッチ
type ArchiveRepositoryPatch struct {
	*PostgreSQLBulkInsertMixin
}

// BulkCreateWeeklyReportArchivesOptimized 最適化版週報アーカイブバルク作成
func (r *ArchiveRepositoryPatch) BulkCreateWeeklyReportArchivesOptimized(
	ctx context.Context,
	archives []*WeeklyReportArchive,
) error {
	if len(archives) == 0 {
		return nil
	}

	// アーカイブは大量データになりやすいため、バッチサイズを大きめに
	batchSize := 100
	if r.db.Dialector.Name() == "postgres" {
		batchSize = 500

		// 大量データの場合の追加最適化
		if len(archives) > 10000 {
			// トランザクション内で実行
			return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
				// 一時的に自動VACUUMを無効化（要注意）
				// tx.Exec("SET LOCAL autovacuum_enabled = OFF")

				// バルクインサート実行
				if err := tx.CreateInBatches(archives, batchSize).Error; err != nil {
					return err
				}

				// 統計情報の更新を促す
				// tx.Exec("ANALYZE weekly_report_archives")

				return nil
			})
		}
	}

	return r.CreateInBatchesOptimized(ctx, archives, batchSize)
}

// 実装例：既存リポジトリの更新方法
/*
既存のリポジトリを更新する方法：

1. PostgreSQLBulkInsertMixinを埋め込み
   type NotificationRepository struct {
       *PostgreSQLBulkInsertMixin
       // 既存のフィールド
   }

2. コンストラクタでMixinを初期化
   func NewNotificationRepository(db *gorm.DB, logger *zap.Logger) *NotificationRepository {
       return &NotificationRepository{
           PostgreSQLBulkInsertMixin: &PostgreSQLBulkInsertMixin{
               db:     db,
               logger: logger,
           },
           // 既存の初期化
       }
   }

3. CreateInBatchesの呼び出しを置き換え
   // Before:
   err := r.db.CreateInBatches(data, 100).Error

   // After:
   err := r.CreateInBatchesOptimized(ctx, data, 100)
*/

// BatchInsertMetrics バッチインサートのメトリクス
type BatchInsertMetrics struct {
	TableName     string
	RecordCount   int
	BatchSize     int
	Duration      float64 // seconds
	RecordsPerSec float64
	Success       bool
	Error         error
}

// CollectBatchInsertMetrics メトリクス収集用ラッパー
func CollectBatchInsertMetrics(
	db *gorm.DB,
	ctx context.Context,
	tableName string,
	data interface{},
	batchSize int,
	insertFunc func() error,
) *BatchInsertMetrics {
	start := time.Now()

	// レコード数の取得
	recordCount := reflect.ValueOf(data).Len()

	// バルクインサート実行
	err := insertFunc()

	duration := time.Since(start).Seconds()

	metrics := &BatchInsertMetrics{
		TableName:     tableName,
		RecordCount:   recordCount,
		BatchSize:     batchSize,
		Duration:      duration,
		RecordsPerSec: float64(recordCount) / duration,
		Success:       err == nil,
		Error:         err,
	}

	// ログ出力
	if err == nil {
		zap.L().Info("Bulk insert completed",
			zap.String("table", tableName),
			zap.Int("records", recordCount),
			zap.Int("batch_size", batchSize),
			zap.Float64("duration_sec", duration),
			zap.Float64("records_per_sec", metrics.RecordsPerSec),
		)
	} else {
		zap.L().Error("Bulk insert failed",
			zap.String("table", tableName),
			zap.Int("records", recordCount),
			zap.Error(err),
		)
	}

	return metrics
}
