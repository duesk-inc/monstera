package utils

import (
	"regexp"
	"strings"
)

// SQLPostgreSQLConverter MySQL→PostgreSQL SQL変換ユーティリティ
type SQLPostgreSQLConverter struct {
	// MySQL関数のパターンとPostgreSQL変換のマッピング
	functionMappings map[string]func(string) string
	patterns         map[string]*regexp.Regexp
}

// NewSQLPostgreSQLConverter コンバーターのインスタンス作成
func NewSQLPostgreSQLConverter() *SQLPostgreSQLConverter {
	converter := &SQLPostgreSQLConverter{
		functionMappings: make(map[string]func(string) string),
		patterns:         make(map[string]*regexp.Regexp),
	}

	converter.initializeMappings()
	converter.initializePatterns()

	return converter
}

// initializeMappings 変換マッピングの初期化
func (c *SQLPostgreSQLConverter) initializeMappings() {
	// DATE_FORMAT 変換
	c.functionMappings["DATE_FORMAT"] = func(content string) string {
		// DATE_FORMAT(field, '%Y-%m') → TO_CHAR(field, 'YYYY-MM')
		// DATE_FORMAT(field, '%Y-%m-%d') → TO_CHAR(field, 'YYYY-MM-DD')
		// DATE_FORMAT(field, '%Y') → TO_CHAR(field, 'YYYY')
		content = regexp.MustCompile(`DATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m'\s*\)`).
			ReplaceAllString(content, "TO_CHAR($1, 'YYYY-MM')")
		content = regexp.MustCompile(`DATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m-%d'\s*\)`).
			ReplaceAllString(content, "TO_CHAR($1, 'YYYY-MM-DD')")
		content = regexp.MustCompile(`DATE_FORMAT\s*\(\s*([^,]+),\s*'%Y'\s*\)`).
			ReplaceAllString(content, "TO_CHAR($1, 'YYYY')")
		return content
	}

	// TIMESTAMPDIFF 変換
	c.functionMappings["TIMESTAMPDIFF"] = func(content string) string {
		// TIMESTAMPDIFF(HOUR, start, end) → EXTRACT(EPOCH FROM (end - start))/3600
		// TIMESTAMPDIFF(MINUTE, start, end) → EXTRACT(EPOCH FROM (end - start))/60
		// TIMESTAMPDIFF(DAY, start, end) → EXTRACT(EPOCH FROM (end - start))/86400
		// TIMESTAMPDIFF(MONTH, start, end) → EXTRACT(YEAR FROM AGE(end, start))*12 + EXTRACT(MONTH FROM AGE(end, start))

		content = regexp.MustCompile(`TIMESTAMPDIFF\s*\(\s*HOUR\s*,\s*([^,]+),\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(EPOCH FROM ($2 - $1))/3600")
		content = regexp.MustCompile(`TIMESTAMPDIFF\s*\(\s*MINUTE\s*,\s*([^,]+),\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(EPOCH FROM ($2 - $1))/60")
		content = regexp.MustCompile(`TIMESTAMPDIFF\s*\(\s*DAY\s*,\s*([^,]+),\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(EPOCH FROM ($2 - $1))/86400")
		content = regexp.MustCompile(`TIMESTAMPDIFF\s*\(\s*MONTH\s*,\s*([^,]+),\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(YEAR FROM AGE($2, $1))*12 + EXTRACT(MONTH FROM AGE($2, $1))")

		return content
	}

	// YEAR, MONTH, DAY 変換
	c.functionMappings["DATE_EXTRACT"] = func(content string) string {
		content = regexp.MustCompile(`YEAR\s*\(\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(YEAR FROM $1)")
		content = regexp.MustCompile(`MONTH\s*\(\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(MONTH FROM $1)")
		content = regexp.MustCompile(`DAY\s*\(\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(DAY FROM $1)")
		content = regexp.MustCompile(`WEEKDAY\s*\(\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "EXTRACT(DOW FROM $1)")
		return content
	}

	// CONCAT 変換
	c.functionMappings["CONCAT"] = func(content string) string {
		// CONCAT(a, ' ', b) → a || ' ' || b
		// 複数の引数を || で結合
		concatPattern := regexp.MustCompile(`CONCAT\s*\(\s*([^)]+)\s*\)`)
		return concatPattern.ReplaceAllStringFunc(content, func(match string) string {
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

	// DATE_SUB, DATE_ADD 変換
	c.functionMappings["DATE_ARITHMETIC"] = func(content string) string {
		// DATE_SUB(date, INTERVAL n DAY) → date - INTERVAL 'n days'
		// DATE_ADD(date, INTERVAL n DAY) → date + INTERVAL 'n days'
		content = regexp.MustCompile(`DATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\s*\)`).
			ReplaceAllString(content, "$1 - INTERVAL '$2 days'")
		content = regexp.MustCompile(`DATE_ADD\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\s*\)`).
			ReplaceAllString(content, "$1 + INTERVAL '$2 days'")
		content = regexp.MustCompile(`DATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+WEEKDAY\s*\(\s*([^)]+)\s*\)\s+DAY\s*\)`).
			ReplaceAllString(content, "$1 - INTERVAL (EXTRACT(DOW FROM $2)::text || ' days')::interval")

		return content
	}

	// IFNULL 変換
	c.functionMappings["IFNULL"] = func(content string) string {
		// IFNULL(field, default) → COALESCE(field, default)
		return regexp.MustCompile(`IFNULL\s*\(\s*([^,]+),\s*([^)]+)\s*\)`).
			ReplaceAllString(content, "COALESCE($1, $2)")
	}
}

// initializePatterns 正規表現パターンの初期化
func (c *SQLPostgreSQLConverter) initializePatterns() {
	// LIMIT句の変換用パターン
	c.patterns["LIMIT_OFFSET"] = regexp.MustCompile(`LIMIT\s+(\d+)\s*,\s*(\d+)`)

	// バックティック識別子の変換用パターン
	c.patterns["BACKTICK"] = regexp.MustCompile("`([^`]+)`")

	// AUTO_INCREMENT の変換用パターン
	c.patterns["AUTO_INCREMENT"] = regexp.MustCompile(`AUTO_INCREMENT`)

	// ENGINE=InnoDB の変換用パターン
	c.patterns["ENGINE"] = regexp.MustCompile(`ENGINE\s*=\s*\w+`)

	// CHARSET 指定の変換用パターン
	c.patterns["CHARSET"] = regexp.MustCompile(`(DEFAULT\s+)?CHARSET\s*=\s*\w+`)
}

// ConvertSQL MySQL SQLをPostgreSQL SQLに変換
func (c *SQLPostgreSQLConverter) ConvertSQL(sql string) string {
	converted := sql

	// 関数変換を適用
	for _, converter := range c.functionMappings {
		converted = converter(converted)
	}

	// パターン変換を適用
	converted = c.convertLimitOffset(converted)
	converted = c.convertBackticks(converted)
	converted = c.convertMiscellaneous(converted)

	return converted
}

// convertLimitOffset LIMIT句の変換
func (c *SQLPostgreSQLConverter) convertLimitOffset(sql string) string {
	// LIMIT offset, count → LIMIT count OFFSET offset
	return c.patterns["LIMIT_OFFSET"].ReplaceAllString(sql, "LIMIT $2 OFFSET $1")
}

// convertBackticks バックティック識別子の変換
func (c *SQLPostgreSQLConverter) convertBackticks(sql string) string {
	// `identifier` → "identifier"
	return c.patterns["BACKTICK"].ReplaceAllString(sql, `"$1"`)
}

// convertMiscellaneous その他の変換
func (c *SQLPostgreSQLConverter) convertMiscellaneous(sql string) string {
	converted := sql

	// ROUND関数の数値型キャスト
	converted = regexp.MustCompile(`ROUND\s*\(\s*([^,)]+)\s*,\s*(\d+)\s*\)`).
		ReplaceAllString(converted, "ROUND($1::numeric, $2)")

	// TRUE/FALSE の値
	converted = strings.ReplaceAll(converted, " 1 ", " TRUE ")
	converted = strings.ReplaceAll(converted, " 0 ", " FALSE ")

	// 型キャスト
	converted = regexp.MustCompile(`\bINT\b`).ReplaceAllString(converted, "INTEGER")
	converted = regexp.MustCompile(`\bTINYINT\(1\)\b`).ReplaceAllString(converted, "BOOLEAN")

	return converted
}

// ConvertStoredProcedureCall ストアドプロシージャ呼び出しの変換
func (c *SQLPostgreSQLConverter) ConvertStoredProcedureCall(procedureName string, args []interface{}) string {
	// MySQL: CALL procedure_name(arg1, arg2)
	// PostgreSQL: CALL procedure_name(arg1, arg2) (同じ構文)

	placeholders := make([]string, len(args))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	return "CALL " + procedureName + "(" + strings.Join(placeholders, ", ") + ")"
}

// GetPostgreSQLEquivalent MySQL関数のPostgreSQL equivalent取得
func (c *SQLPostgreSQLConverter) GetPostgreSQLEquivalent(mysqlFunction string) string {
	equivalents := map[string]string{
		"DATE_FORMAT(field, '%Y-%m')":    "TO_CHAR(field, 'YYYY-MM')",
		"DATE_FORMAT(field, '%Y-%m-%d')": "TO_CHAR(field, 'YYYY-MM-DD')",
		"YEAR(field)":                    "EXTRACT(YEAR FROM field)",
		"MONTH(field)":                   "EXTRACT(MONTH FROM field)",
		"DAY(field)":                     "EXTRACT(DAY FROM field)",
		"WEEKDAY(field)":                 "EXTRACT(DOW FROM field)",
		"TIMESTAMPDIFF(HOUR, a, b)":      "EXTRACT(EPOCH FROM (b - a))/3600",
		"TIMESTAMPDIFF(MINUTE, a, b)":    "EXTRACT(EPOCH FROM (b - a))/60",
		"TIMESTAMPDIFF(DAY, a, b)":       "EXTRACT(EPOCH FROM (b - a))/86400",
		"TIMESTAMPDIFF(MONTH, a, b)":     "EXTRACT(YEAR FROM AGE(b, a))*12 + EXTRACT(MONTH FROM AGE(b, a))",
		"CONCAT(a, b, c)":                "a || b || c",
		"IFNULL(field, default)":         "COALESCE(field, default)",
		"DATE_SUB(date, INTERVAL n DAY)": "date - INTERVAL 'n days'",
		"DATE_ADD(date, INTERVAL n DAY)": "date + INTERVAL 'n days'",
		"ROUND(value, 2)":                "ROUND(value::numeric, 2)",
		"LIMIT offset, count":            "LIMIT count OFFSET offset",
		"`identifier`":                   `"identifier"`,
		"TINYINT(1)":                     "BOOLEAN",
		"AUTO_INCREMENT":                 "SERIAL",
	}

	return equivalents[mysqlFunction]
}

// ValidatePostgreSQLSQL PostgreSQL SQLの構文検証
func (c *SQLPostgreSQLConverter) ValidatePostgreSQLSQL(sql string) []string {
	var issues []string

	// MySQL固有の構文をチェック
	mysqlPatterns := map[string]string{
		`DATE_FORMAT\s*\(`:        "DATE_FORMAT関数が残っています",
		`TIMESTAMPDIFF\s*\(`:      "TIMESTAMPDIFF関数が残っています",
		`IFNULL\s*\(`:             "IFNULL関数が残っています",
		`LIMIT\s+\d+\s*,\s*\d+`:   "MySQL形式のLIMIT句が残っています",
		"`[^`]+`":                 "バックティック識別子が残っています",
		`CONCAT\s*\(`:             "CONCAT関数が残っています（||演算子を推奨）",
		`YEAR\s*\(\s*[^)]+\s*\)`:  "YEAR関数が残っています",
		`MONTH\s*\(\s*[^)]+\s*\)`: "MONTH関数が残っています",
	}

	for pattern, message := range mysqlPatterns {
		if matched, _ := regexp.MatchString(pattern, sql); matched {
			issues = append(issues, message)
		}
	}

	return issues
}

// ConvertRepositorySQL リポジトリ層のSQL変換（完全版）
func (c *SQLPostgreSQLConverter) ConvertRepositorySQL(originalSQL string, context map[string]interface{}) string {
	converted := c.ConvertSQL(originalSQL)

	// コンテキストに基づく追加変換
	if tableName, ok := context["table_name"].(string); ok {
		// テーブル固有の変換ロジック
		converted = c.applyTableSpecificConversions(converted, tableName)
	}

	return converted
}

// applyTableSpecificConversions テーブル固有の変換
func (c *SQLPostgreSQLConverter) applyTableSpecificConversions(sql, tableName string) string {
	converted := sql

	switch tableName {
	case "engineer_proposals", "proposals":
		// 提案テーブル固有の変換
		converted = strings.ReplaceAll(converted, "proposals", "engineer_proposals")

	case "daily_records":
		// 日次記録テーブル固有の変換
		// 特に日付関連の処理を強化

	case "weekly_reports":
		// 週報テーブル固有の変換
		// ステータス関連の処理を強化
	}

	return converted
}

// GenerateConversionReport 変換レポートの生成
func (c *SQLPostgreSQLConverter) GenerateConversionReport(originalSQL, convertedSQL string) map[string]interface{} {
	report := map[string]interface{}{
		"original_sql":  originalSQL,
		"converted_sql": convertedSQL,
		"changes_made":  []string{},
		"issues_found":  c.ValidatePostgreSQLSQL(convertedSQL),
		"conversion_ok": true,
	}

	// 変更点を検出
	changes := []string{}
	if strings.Contains(originalSQL, "DATE_FORMAT") && !strings.Contains(convertedSQL, "DATE_FORMAT") {
		changes = append(changes, "DATE_FORMAT → TO_CHAR")
	}
	if strings.Contains(originalSQL, "TIMESTAMPDIFF") && !strings.Contains(convertedSQL, "TIMESTAMPDIFF") {
		changes = append(changes, "TIMESTAMPDIFF → EXTRACT")
	}
	if strings.Contains(originalSQL, "CONCAT") && !strings.Contains(convertedSQL, "CONCAT") {
		changes = append(changes, "CONCAT → ||")
	}
	if strings.Contains(originalSQL, "LIMIT") && strings.Contains(originalSQL, ",") && strings.Contains(convertedSQL, "OFFSET") {
		changes = append(changes, "LIMIT offset,count → LIMIT count OFFSET offset")
	}

	report["changes_made"] = changes
	report["conversion_ok"] = len(report["issues_found"].([]string)) == 0

	return report
}
