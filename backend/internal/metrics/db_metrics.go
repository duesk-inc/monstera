package metrics

import (
	"context"
	"database/sql"
	"time"

	"gorm.io/gorm"
)

// GormMetricsPlugin GORMプラグインとしてメトリクスを収集
type GormMetricsPlugin struct{}

// Name プラグイン名を返す
func (p *GormMetricsPlugin) Name() string {
	return "prometheus_metrics"
}

// Initialize プラグインを初期化
func (p *GormMetricsPlugin) Initialize(db *gorm.DB) error {
	// クエリ実行前のコールバック
	db.Callback().Create().Before("gorm:create").Register("prometheus:before_create", beforeQuery("create"))
	db.Callback().Query().Before("gorm:query").Register("prometheus:before_query", beforeQuery("select"))
	db.Callback().Update().Before("gorm:update").Register("prometheus:before_update", beforeQuery("update"))
	db.Callback().Delete().Before("gorm:delete").Register("prometheus:before_delete", beforeQuery("delete"))

	// クエリ実行後のコールバック
	db.Callback().Create().After("gorm:create").Register("prometheus:after_create", afterQuery("create"))
	db.Callback().Query().After("gorm:query").Register("prometheus:after_query", afterQuery("select"))
	db.Callback().Update().After("gorm:update").Register("prometheus:after_update", afterQuery("update"))
	db.Callback().Delete().After("gorm:delete").Register("prometheus:after_delete", afterQuery("delete"))

	// エラー時のコールバック
	db.Callback().Create().After("gorm:create").Register("prometheus:error_create", errorQuery("create"))
	db.Callback().Query().After("gorm:query").Register("prometheus:error_query", errorQuery("select"))
	db.Callback().Update().After("gorm:update").Register("prometheus:error_update", errorQuery("update"))
	db.Callback().Delete().After("gorm:delete").Register("prometheus:error_delete", errorQuery("delete"))

	return nil
}

// beforeQuery クエリ実行前の処理
func beforeQuery(queryType string) func(*gorm.DB) {
	return func(db *gorm.DB) {
		// 開始時刻をコンテキストに保存
		ctx := context.WithValue(db.Statement.Context, "start_time", time.Now())
		db.Statement.Context = ctx
	}
}

// afterQuery クエリ実行後の処理
func afterQuery(queryType string) func(*gorm.DB) {
	return func(db *gorm.DB) {
		// エラーがある場合はスキップ
		if db.Error != nil {
			return
		}

		// 開始時刻を取得
		if startTime, ok := db.Statement.Context.Value("start_time").(time.Time); ok {
			duration := time.Since(startTime).Seconds()
			table := db.Statement.Table

			// メトリクスを記録
			DBQueryDuration.WithLabelValues(queryType, table).Observe(duration)
		}
	}
}

// errorQuery エラー時の処理
func errorQuery(queryType string) func(*gorm.DB) {
	return func(db *gorm.DB) {
		if db.Error == nil {
			return
		}

		table := db.Statement.Table
		errorType := getErrorType(db.Error)

		// エラーメトリクスを記録
		DBQueryErrors.WithLabelValues(queryType, table, errorType).Inc()
	}
}

// getErrorType エラータイプを取得
func getErrorType(err error) string {
	switch err {
	case gorm.ErrRecordNotFound:
		return "record_not_found"
	case gorm.ErrInvalidTransaction:
		return "invalid_transaction"
	case gorm.ErrNotImplemented:
		return "not_implemented"
	case gorm.ErrMissingWhereClause:
		return "missing_where_clause"
	case gorm.ErrUnsupportedRelation:
		return "unsupported_relation"
	case gorm.ErrPrimaryKeyRequired:
		return "primary_key_required"
	case gorm.ErrModelValueRequired:
		return "model_value_required"
	case gorm.ErrInvalidData:
		return "invalid_data"
	case gorm.ErrUnsupportedDriver:
		return "unsupported_driver"
	case gorm.ErrRegistered:
		return "registered"
	case gorm.ErrInvalidField:
		return "invalid_field"
	case gorm.ErrEmptySlice:
		return "empty_slice"
	case gorm.ErrDryRunModeUnsupported:
		return "dry_run_mode_unsupported"
	default:
		return "unknown"
	}
}

// CollectDBStats データベース統計情報を定期的に収集
func CollectDBStats(db *sql.DB) {
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			stats := db.Stats()

			// アクティブな接続数
			DBConnectionsActive.Set(float64(stats.InUse))

			// アイドル接続数
			DBConnectionsIdle.Set(float64(stats.Idle))
		}
	}()
}
