package utils

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/duesk/monstera/internal/message"
)

// DatabaseUtils データベース関連のユーティリティ
type DatabaseUtils struct {
	db *gorm.DB
}

// NewDatabaseUtils DatabaseUtilsのインスタンスを作成
func NewDatabaseUtils(db *gorm.DB) *DatabaseUtils {
	return &DatabaseUtils{
		db: db,
	}
}

// PaginationOptions ページネーション設定
type PaginationOptions struct {
	Page    int    `json:"page"`
	Limit   int    `json:"limit"`
	SortBy  string `json:"sort_by"`
	SortDir string `json:"sort_dir"` // asc, desc
}

// PaginationResult ページネーション結果
type PaginationResult struct {
	CurrentPage int   `json:"current_page"`
	TotalPages  int   `json:"total_pages"`
	TotalCount  int64 `json:"total_count"`
	HasNext     bool  `json:"has_next"`
	HasPrev     bool  `json:"has_prev"`
	Limit       int   `json:"limit"`
}

// DefaultPaginationOptions デフォルトのページネーション設定を取得
func (d *DatabaseUtils) DefaultPaginationOptions() *PaginationOptions {
	return &PaginationOptions{
		Page:    1,
		Limit:   20,
		SortBy:  "created_at",
		SortDir: "desc",
	}
}

// ValidatePaginationOptions ページネーション設定のバリデーション
func (d *DatabaseUtils) ValidatePaginationOptions(opts *PaginationOptions) error {
	if opts.Page < 1 {
		opts.Page = 1
	}

	if opts.Limit < 1 || opts.Limit > 1000 {
		opts.Limit = 20
	}

	if opts.SortDir != "asc" && opts.SortDir != "desc" {
		opts.SortDir = "desc"
	}

	// ソートフィールドのサニタイズ（SQLインジェクション対策）
	if opts.SortBy != "" {
		opts.SortBy = d.sanitizeSortField(opts.SortBy)
	}

	return nil
}

// sanitizeSortField ソートフィールドのサニタイズ
func (d *DatabaseUtils) sanitizeSortField(field string) string {
	// 許可されたフィールド名のパターン
	allowedPattern := `^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$`
	if matched, _ := regexp.MatchString(allowedPattern, field); !matched {
		return "created_at" // デフォルトにフォールバック
	}
	return field
}

// ApplyPagination ページネーションをクエリに適用
func (d *DatabaseUtils) ApplyPagination(query *gorm.DB, opts *PaginationOptions) (*gorm.DB, *PaginationResult, error) {
	// バリデーション
	if err := d.ValidatePaginationOptions(opts); err != nil {
		return nil, nil, err
	}

	// 総件数を取得
	var totalCount int64
	countQuery := query.Session(&gorm.Session{})
	if err := countQuery.Count(&totalCount).Error; err != nil {
		return nil, nil, fmt.Errorf("総件数の取得に失敗しました: %w", err)
	}

	// ページネーション結果を計算
	totalPages := int((totalCount + int64(opts.Limit) - 1) / int64(opts.Limit))
	result := &PaginationResult{
		CurrentPage: opts.Page,
		TotalPages:  totalPages,
		TotalCount:  totalCount,
		HasNext:     opts.Page < totalPages,
		HasPrev:     opts.Page > 1,
		Limit:       opts.Limit,
	}

	// ソートとページネーションを適用
	offset := (opts.Page - 1) * opts.Limit
	query = query.Order(fmt.Sprintf("%s %s", opts.SortBy, opts.SortDir)).
		Offset(offset).
		Limit(opts.Limit)

	return query, result, nil
}

// TransactionWrapper トランザクション処理のラッパー
func (d *DatabaseUtils) TransactionWrapper(ctx context.Context, fn func(*gorm.DB) error) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(tx)
	})
}

// BatchInsert バッチインサート（大量データの効率的な挿入）
func (d *DatabaseUtils) BatchInsert(ctx context.Context, data interface{}, batchSize int) error {
	return d.db.WithContext(ctx).CreateInBatches(data, batchSize).Error
}

// SafeDelete 安全な削除（論理削除を推奨）
func (d *DatabaseUtils) SafeDelete(ctx context.Context, model interface{}, id interface{}) error {
	// 論理削除（GORM のソフトデリート機能を使用）
	return d.db.WithContext(ctx).Delete(model, id).Error
}

// BulkUpdate 一括更新
func (d *DatabaseUtils) BulkUpdate(ctx context.Context, model interface{}, updates map[string]interface{}, whereClause string, args ...interface{}) error {
	return d.db.WithContext(ctx).Model(model).Where(whereClause, args...).Updates(updates).Error
}

// ExistsCheck レコードの存在チェック
func (d *DatabaseUtils) ExistsCheck(ctx context.Context, model interface{}, whereClause string, args ...interface{}) (bool, error) {
	var count int64
	err := d.db.WithContext(ctx).Model(model).Where(whereClause, args...).Count(&count).Error
	return count > 0, err
}

// UpsertRecord レコードの挿入または更新
func (d *DatabaseUtils) UpsertRecord(ctx context.Context, model interface{}, conflictColumns []string, updateColumns []string) error {
	return d.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   d.stringToColumns(conflictColumns),
		DoUpdates: clause.AssignmentColumns(updateColumns),
	}).Create(model).Error
}

// stringToColumns 文字列配列をカラム配列に変換
func (d *DatabaseUtils) stringToColumns(columns []string) []clause.Column {
	result := make([]clause.Column, len(columns))
	for i, col := range columns {
		result[i] = clause.Column{Name: col}
	}
	return result
}

// GetConnectionStats データベース接続統計を取得
func (d *DatabaseUtils) GetConnectionStats() map[string]interface{} {
	sqlDB, err := d.db.DB()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"open_connections":    stats.OpenConnections,
		"in_use":              stats.InUse,
		"idle":                stats.Idle,
		"wait_count":          stats.WaitCount,
		"wait_duration":       stats.WaitDuration.String(),
		"max_idle_closed":     stats.MaxIdleClosed,
		"max_lifetime_closed": stats.MaxLifetimeClosed,
	}
}

// HealthCheck データベースヘルスチェック
func (d *DatabaseUtils) HealthCheck(ctx context.Context) error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return fmt.Errorf("データベース接続の取得に失敗: %w", err)
	}

	// 接続テスト（タイムアウト付き）
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(pingCtx); err != nil {
		return fmt.Errorf("データベース接続テストに失敗: %w", err)
	}

	return nil
}

// OptimizeQuery クエリ最適化のヒント
func (d *DatabaseUtils) OptimizeQuery(query *gorm.DB, optimizations []string) *gorm.DB {
	for _, opt := range optimizations {
		switch opt {
		case "use_index":
			// インデックス使用のヒント（MySQL固有）
			query = query.Set("gorm:use_index", true)
		case "no_cache":
			// キャッシュを使用しない
			query = query.Set("gorm:query_option", "SQL_NO_CACHE")
		case "straight_join":
			// JOIN順序の固定（MySQL固有）
			query = query.Set("gorm:query_option", "STRAIGHT_JOIN")
		}
	}
	return query
}

// SearchConditionBuilder 検索条件ビルダー
type SearchConditionBuilder struct {
	query *gorm.DB
}

// NewSearchConditionBuilder SearchConditionBuilderのインスタンスを作成
func (d *DatabaseUtils) NewSearchConditionBuilder(query *gorm.DB) *SearchConditionBuilder {
	return &SearchConditionBuilder{query: query}
}

// AddLikeCondition LIKE条件を追加
func (s *SearchConditionBuilder) AddLikeCondition(field, value string) *SearchConditionBuilder {
	if value != "" {
		s.query = s.query.Where(fmt.Sprintf("%s LIKE ?", field), "%"+value+"%")
	}
	return s
}

// AddEqualCondition 等価条件を追加
func (s *SearchConditionBuilder) AddEqualCondition(field string, value interface{}) *SearchConditionBuilder {
	if value != nil && value != "" {
		s.query = s.query.Where(fmt.Sprintf("%s = ?", field), value)
	}
	return s
}

// AddInCondition IN条件を追加
func (s *SearchConditionBuilder) AddInCondition(field string, values []interface{}) *SearchConditionBuilder {
	if len(values) > 0 {
		s.query = s.query.Where(fmt.Sprintf("%s IN ?", field), values)
	}
	return s
}

// AddDateRangeCondition 日付範囲条件を追加
func (s *SearchConditionBuilder) AddDateRangeCondition(field string, startDate, endDate *time.Time) *SearchConditionBuilder {
	if startDate != nil {
		s.query = s.query.Where(fmt.Sprintf("%s >= ?", field), *startDate)
	}
	if endDate != nil {
		s.query = s.query.Where(fmt.Sprintf("%s <= ?", field), *endDate)
	}
	return s
}

// AddNullCheckCondition NULL チェック条件を追加
func (s *SearchConditionBuilder) AddNullCheckCondition(field string, isNull bool) *SearchConditionBuilder {
	if isNull {
		s.query = s.query.Where(fmt.Sprintf("%s IS NULL", field))
	} else {
		s.query = s.query.Where(fmt.Sprintf("%s IS NOT NULL", field))
	}
	return s
}

// Build 検索条件を適用したクエリを取得
func (s *SearchConditionBuilder) Build() *gorm.DB {
	return s.query
}

// DatabaseErrorHandler データベースエラーハンドラー
type DatabaseErrorHandler struct {
	errorHandler *ErrorHandler
}

// NewDatabaseErrorHandler DatabaseErrorHandlerのインスタンスを作成
func NewDatabaseErrorHandler() *DatabaseErrorHandler {
	return &DatabaseErrorHandler{
		errorHandler: NewErrorHandler(),
	}
}

// HandleDatabaseError データベースエラーを適切なエラーコードに変換
func (d *DatabaseErrorHandler) HandleDatabaseError(err error) message.ErrorCode {
	if err == nil {
		return ""
	}

	errorMessage := strings.ToLower(err.Error())

	switch {
	case strings.Contains(errorMessage, "record not found"):
		return message.ErrCodeNotFound
	case strings.Contains(errorMessage, "duplicate") || strings.Contains(errorMessage, "unique"):
		return message.ErrCodeAlreadyExists
	case strings.Contains(errorMessage, "foreign key"):
		return message.ErrCodeDependencyExists
	case strings.Contains(errorMessage, "deadlock"):
		return message.ErrCodeConcurrencyError
	case strings.Contains(errorMessage, "timeout") || strings.Contains(errorMessage, "context deadline"):
		return message.ErrCodeTimeout
	case strings.Contains(errorMessage, "connection") || strings.Contains(errorMessage, "network"):
		return message.ErrCodeNetworkError
	case strings.Contains(errorMessage, "transaction"):
		return message.ErrCodeTransactionError
	case strings.Contains(errorMessage, "syntax error") || strings.Contains(errorMessage, "invalid"):
		return message.ErrCodeDataCorruption
	default:
		return message.ErrCodeDatabaseError
	}
}

// IsTemporaryError 一時的なエラーかどうかを判定
func (d *DatabaseErrorHandler) IsTemporaryError(err error) bool {
	if err == nil {
		return false
	}

	errorMessage := strings.ToLower(err.Error())
	temporaryErrors := []string{
		"deadlock",
		"timeout",
		"connection",
		"network",
		"too many connections",
	}

	for _, tempErr := range temporaryErrors {
		if strings.Contains(errorMessage, tempErr) {
			return true
		}
	}

	return false
}

// ShouldRetry リトライすべきエラーかどうかを判定
func (d *DatabaseErrorHandler) ShouldRetry(err error, retryCount int, maxRetries int) bool {
	if retryCount >= maxRetries {
		return false
	}

	return d.IsTemporaryError(err)
}

// RetryableOperation リトライ可能な操作を実行
func (d *DatabaseUtils) RetryableOperation(ctx context.Context, operation func() error, maxRetries int) error {
	errorHandler := NewDatabaseErrorHandler()

	for i := 0; i <= maxRetries; i++ {
		err := operation()
		if err == nil {
			return nil
		}

		if !errorHandler.ShouldRetry(err, i, maxRetries) {
			return err
		}

		// 指数バックオフ（最大5秒まで）
		backoff := time.Duration(i+1) * 100 * time.Millisecond
		if backoff > 5*time.Second {
			backoff = 5 * time.Second
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
			// リトライ継続
		}
	}

	return fmt.Errorf("最大リトライ回数(%d)に達しました", maxRetries)
}
