package repository

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// QueryOptions はクエリのオプション設定
type QueryOptions struct {
	Offset     int
	Limit      int
	OrderBy    string
	OrderDir   string // asc または desc
	Search     string
	SearchKeys []string
}

// DefaultQueryOptions はデフォルトのクエリオプションを返す
func DefaultQueryOptions() QueryOptions {
	return QueryOptions{
		Offset:   0,
		Limit:    10,
		OrderBy:  "created_at",
		OrderDir: "desc",
	}
}

// ApplyPagination はクエリにページネーションを適用する
func ApplyPagination(db *gorm.DB, offset, limit int) *gorm.DB {
	return db.Offset(offset).Limit(limit)
}

// ApplyOrder はクエリに並び順を適用する
func ApplyOrder(db *gorm.DB, orderBy, orderDir string) *gorm.DB {
	if orderBy == "" {
		orderBy = "created_at"
	}

	if orderDir == "" {
		orderDir = "desc"
	} else {
		orderDir = strings.ToLower(orderDir)
		if orderDir != "asc" && orderDir != "desc" {
			orderDir = "desc"
		}
	}

	return db.Order(fmt.Sprintf("%s %s", orderBy, orderDir))
}

// ApplySearch はクエリに検索条件を適用する
func ApplySearch(db *gorm.DB, search string, searchKeys []string) *gorm.DB {
	if search == "" || len(searchKeys) == 0 {
		return db
	}

	searchPattern := "%" + search + "%"
	query := db

	for i, key := range searchKeys {
		if i == 0 {
			query = query.Where(fmt.Sprintf("%s LIKE ?", key), searchPattern)
		} else {
			query = query.Or(fmt.Sprintf("%s LIKE ?", key), searchPattern)
		}
	}

	return query
}

// ApplyOptions はクエリに全オプションを適用する
func ApplyOptions(db *gorm.DB, opts QueryOptions) *gorm.DB {
	query := db

	// 検索条件の適用
	if opts.Search != "" && len(opts.SearchKeys) > 0 {
		query = ApplySearch(query, opts.Search, opts.SearchKeys)
	}

	// 並び順の適用
	query = ApplyOrder(query, opts.OrderBy, opts.OrderDir)

	// ページネーションの適用
	query = ApplyPagination(query, opts.Offset, opts.Limit)

	return query
}

// LogQueryError はクエリエラーをログに記録する
func LogQueryError(logger *zap.Logger, op string, err error) {
	if logger != nil {
		logger.Error("データベースクエリエラー",
			zap.String("操作", op),
			zap.Error(err))
	}
}

// ExecuteAndCount はクエリを実行して結果と総数を返す
func ExecuteAndCount(ctx context.Context, db *gorm.DB, result interface{}, count *int64) error {
	// 総数を取得
	countQuery := db.WithContext(ctx)
	if err := countQuery.Count(count).Error; err != nil {
		return fmt.Errorf("レコード数取得エラー: %w", err)
	}

	// データを取得
	if err := db.WithContext(ctx).Find(result).Error; err != nil {
		return fmt.Errorf("レコード取得エラー: %w", err)
	}

	return nil
}
