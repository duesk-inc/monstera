package repository

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// PostgreSQLSQLAdapter PostgreSQL SQL変換アダプター
type PostgreSQLSQLAdapter struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPostgreSQLSQLAdapter アダプターの作成
func NewPostgreSQLSQLAdapter(db *gorm.DB, logger *zap.Logger) *PostgreSQLSQLAdapter {
	return &PostgreSQLSQLAdapter{
		db:     db,
		logger: logger,
	}
}

// ExecuteRawSQL PostgreSQL対応のRAW SQL実行
func (a *PostgreSQLSQLAdapter) ExecuteRawSQL(ctx context.Context, sql string, dest interface{}, args ...interface{}) error {
	// データベースタイプを確認
	if a.db.Dialector.Name() == "postgres" {
		convertedSQL := a.convertMySQLToPostgreSQL(sql)
		convertedSQL = a.convertPlaceholders(convertedSQL)

		a.logger.Debug("Converting SQL for PostgreSQL",
			zap.String("original", sql),
			zap.String("converted", convertedSQL),
		)

		return a.db.WithContext(ctx).Raw(convertedSQL, args...).Scan(dest).Error
	}

	// MySQLまたはその他の場合は元のSQLを使用
	return a.db.WithContext(ctx).Raw(sql, args...).Scan(dest).Error
}

// convertMySQLToPostgreSQL MySQL SQLをPostgreSQLに変換
func (a *PostgreSQLSQLAdapter) convertMySQLToPostgreSQL(sql string) string {
	converted := sql

	// 1. DATE_FORMAT変換
	converted = a.convertDateFormat(converted)

	// 2. TIMESTAMPDIFF変換
	converted = a.convertTimestampDiff(converted)

	// 3. CONCAT変換
	converted = a.convertConcat(converted)

	// 4. YEAR, MONTH, DAY変換
	converted = a.convertDateExtract(converted)

	// 5. IFNULL変換
	converted = a.convertIfNull(converted)

	// 6. ROUND関数の数値キャスト
	converted = a.convertRound(converted)

	// 7. DATE_SUB, DATE_ADD変換
	converted = a.convertDateArithmetic(converted)

	// 8. その他の変換
	converted = a.convertMiscellaneous(converted)

	return converted
}

// convertDateFormat DATE_FORMAT関数の変換
func (a *PostgreSQLSQLAdapter) convertDateFormat(sql string) string {
	// DATE_FORMAT(field, '%Y-%m') → TO_CHAR(field, 'YYYY-MM')
	patterns := map[string]string{
		`DATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m'\s*\)`:    `TO_CHAR($1, 'YYYY-MM')`,
		`DATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m-%d'\s*\)`: `TO_CHAR($1, 'YYYY-MM-DD')`,
		`DATE_FORMAT\s*\(\s*([^,]+),\s*'%Y'\s*\)`:       `TO_CHAR($1, 'YYYY')`,
		`DATE_FORMAT\s*\(\s*([^,]+),\s*'%m'\s*\)`:       `TO_CHAR($1, 'MM')`,
		`DATE_FORMAT\s*\(\s*([^,]+),\s*'%d'\s*\)`:       `TO_CHAR($1, 'DD')`,
	}

	for pattern, replacement := range patterns {
		re := regexp.MustCompile(pattern)
		sql = re.ReplaceAllString(sql, replacement)
	}

	return sql
}

// convertTimestampDiff TIMESTAMPDIFF関数の変換
func (a *PostgreSQLSQLAdapter) convertTimestampDiff(sql string) string {
	patterns := map[string]string{
		`TIMESTAMPDIFF\s*\(\s*HOUR\s*,\s*([^,]+),\s*([^)]+)\s*\)`:   `EXTRACT(EPOCH FROM ($2 - $1))/3600`,
		`TIMESTAMPDIFF\s*\(\s*MINUTE\s*,\s*([^,]+),\s*([^)]+)\s*\)`: `EXTRACT(EPOCH FROM ($2 - $1))/60`,
		`TIMESTAMPDIFF\s*\(\s*DAY\s*,\s*([^,]+),\s*([^)]+)\s*\)`:    `EXTRACT(EPOCH FROM ($2 - $1))/86400`,
		`TIMESTAMPDIFF\s*\(\s*MONTH\s*,\s*([^,]+),\s*([^)]+)\s*\)`:  `EXTRACT(YEAR FROM AGE($2, $1))*12 + EXTRACT(MONTH FROM AGE($2, $1))`,
	}

	for pattern, replacement := range patterns {
		re := regexp.MustCompile(pattern)
		sql = re.ReplaceAllString(sql, replacement)
	}

	return sql
}

// convertConcat CONCAT関数の変換
func (a *PostgreSQLSQLAdapter) convertConcat(sql string) string {
	// CONCAT(a, b, c) → a || b || c
	concatPattern := regexp.MustCompile(`CONCAT\s*\(\s*([^)]+)\s*\)`)

	return concatPattern.ReplaceAllStringFunc(sql, func(match string) string {
		// CONCAT内の引数を抽出
		argsStart := strings.Index(match, "(") + 1
		argsEnd := strings.LastIndex(match, ")")
		args := match[argsStart:argsEnd]

		// カンマで分割して || で結合
		parts := strings.Split(args, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		return strings.Join(parts, " || ")
	})
}

// convertDateExtract YEAR, MONTH, DAY関数の変換
func (a *PostgreSQLSQLAdapter) convertDateExtract(sql string) string {
	patterns := map[string]string{
		`YEAR\s*\(\s*([^)]+)\s*\)`:    `EXTRACT(YEAR FROM $1)`,
		`MONTH\s*\(\s*([^)]+)\s*\)`:   `EXTRACT(MONTH FROM $1)`,
		`DAY\s*\(\s*([^)]+)\s*\)`:     `EXTRACT(DAY FROM $1)`,
		`WEEKDAY\s*\(\s*([^)]+)\s*\)`: `EXTRACT(DOW FROM $1)`,
	}

	for pattern, replacement := range patterns {
		re := regexp.MustCompile(pattern)
		sql = re.ReplaceAllString(sql, replacement)
	}

	return sql
}

// convertIfNull IFNULL関数の変換
func (a *PostgreSQLSQLAdapter) convertIfNull(sql string) string {
	// IFNULL(field, default) → COALESCE(field, default)
	re := regexp.MustCompile(`IFNULL\s*\(\s*([^,]+),\s*([^)]+)\s*\)`)
	return re.ReplaceAllString(sql, `COALESCE($1, $2)`)
}

// convertRound ROUND関数の数値キャスト
func (a *PostgreSQLSQLAdapter) convertRound(sql string) string {
	// ROUND(value, 2) → ROUND(value::numeric, 2)
	re := regexp.MustCompile(`ROUND\s*\(\s*([^,)]+)\s*,\s*(\d+)\s*\)`)
	return re.ReplaceAllString(sql, `ROUND($1::numeric, $2)`)
}

// convertDateArithmetic DATE_SUB, DATE_ADD関数の変換
func (a *PostgreSQLSQLAdapter) convertDateArithmetic(sql string) string {
	patterns := map[string]string{
		`DATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\s*\)`:   `$1 - INTERVAL '$2 days'`,
		`DATE_ADD\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\s*\)`:   `$1 + INTERVAL '$2 days'`,
		`DATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+MONTH\s*\)`: `$1 - INTERVAL '$2 months'`,
		`DATE_ADD\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+MONTH\s*\)`: `$1 + INTERVAL '$2 months'`,
	}

	// WEEKDAY関数を含む複雑なパターン
	weekdayPattern := regexp.MustCompile(`DATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+WEEKDAY\s*\(\s*([^)]+)\s*\)\s+DAY\s*\)`)
	sql = weekdayPattern.ReplaceAllString(sql, `$1 - INTERVAL (EXTRACT(DOW FROM $2)::text || ' days')::interval`)

	for pattern, replacement := range patterns {
		re := regexp.MustCompile(pattern)
		sql = re.ReplaceAllString(sql, replacement)
	}

	return sql
}

// convertMiscellaneous その他の変換
func (a *PostgreSQLSQLAdapter) convertMiscellaneous(sql string) string {
	converted := sql

	// LIMIT句の変換: LIMIT offset, count → LIMIT count OFFSET offset
	limitPattern := regexp.MustCompile(`LIMIT\s+(\d+)\s*,\s*(\d+)`)
	converted = limitPattern.ReplaceAllString(converted, `LIMIT $2 OFFSET $1`)

	// バックティック識別子の変換: `identifier` → "identifier"
	backtickPattern := regexp.MustCompile("`([^`]+)`")
	converted = backtickPattern.ReplaceAllString(converted, `"$1"`)

	// テーブル名の正規化（必要に応じて）
	converted = strings.ReplaceAll(converted, "proposals", "engineer_proposals")

	return converted
}

// convertPlaceholders プレースホルダーの変換（? → $1, $2, ...）
func (a *PostgreSQLSQLAdapter) convertPlaceholders(sql string) string {
	converted := sql
	placeholderCount := 0

	for strings.Contains(converted, "?") {
		placeholderCount++
		converted = strings.Replace(converted, "?", fmt.Sprintf("$%d", placeholderCount), 1)
	}

	return converted
}

// GetConvertedSQL 変換されたSQLを取得（デバッグ用）
func (a *PostgreSQLSQLAdapter) GetConvertedSQL(originalSQL string) string {
	if a.db.Dialector.Name() == "postgres" {
		converted := a.convertMySQLToPostgreSQL(originalSQL)
		return a.convertPlaceholders(converted)
	}
	return originalSQL
}

// ValidateSQL SQL変換の妥当性を検証
func (a *PostgreSQLSQLAdapter) ValidateSQL(sql string) []string {
	var issues []string

	// MySQL固有の構文が残っていないかチェック
	mysqlPatterns := []string{
		`DATE_FORMAT\s*\(`,
		`TIMESTAMPDIFF\s*\(`,
		`IFNULL\s*\(`,
		`CONCAT\s*\(`,
		`YEAR\s*\(\s*[^)]+\s*\)`,
		`MONTH\s*\(\s*[^)]+\s*\)`,
		`LIMIT\s+\d+\s*,\s*\d+`,
		"`[^`]+`",
	}

	for _, pattern := range mysqlPatterns {
		if matched, _ := regexp.MatchString(pattern, sql); matched {
			issues = append(issues, fmt.Sprintf("MySQL-specific syntax found: %s", pattern))
		}
	}

	return issues
}
