package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/config"
)

// VACUUMパフォーマンステストツール
// autovacuum設定の効果を検証

type VacuumStats struct {
	TableName      string
	LiveTuples     int64
	DeadTuples     int64
	DeadRatio      float64
	LastVacuum     *time.Time
	LastAutovacuum *time.Time
	TableSize      string
}

func main() {
	println("🧪 PostgreSQL VACUUM Performance Test")
	println("====================================")
	println("")

	// ロガー初期化
	logger, err := zap.NewDevelopment()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// 設定読み込み
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// PostgreSQL接続
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.User,
		cfg.Database.Password, cfg.Database.DBName)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// テスト実行
	if err := runVacuumTests(db, logger); err != nil {
		logger.Fatal("Tests failed", zap.Error(err))
	}

	println("")
	println("🎉 All tests completed!")
}

func runVacuumTests(db *sql.DB, logger *zap.Logger) error {
	ctx := context.Background()

	// 1. 現在の統計情報を取得
	println("1. Getting current table statistics")
	println("==================================")

	stats, err := getTableStats(ctx, db)
	if err != nil {
		return fmt.Errorf("failed to get table stats: %w", err)
	}

	printStats(stats)
	println("")

	// 2. デッドタプル生成テスト
	println("2. Dead tuple generation test")
	println("============================")

	if err := generateDeadTuples(ctx, db); err != nil {
		return fmt.Errorf("failed to generate dead tuples: %w", err)
	}
	println("")

	// 3. Autovacuum設定の確認
	println("3. Checking autovacuum settings")
	println("==============================")

	if err := checkAutovacuumSettings(ctx, db); err != nil {
		return fmt.Errorf("failed to check autovacuum settings: %w", err)
	}
	println("")

	// 4. 手動VACUUM実行とパフォーマンス測定
	println("4. Manual VACUUM performance test")
	println("================================")

	if err := testManualVacuum(ctx, db); err != nil {
		return fmt.Errorf("failed to test manual vacuum: %w", err)
	}
	println("")

	// 5. Autovacuumトリガーテスト
	println("5. Autovacuum trigger test")
	println("=========================")

	if err := testAutovacuumTrigger(ctx, db); err != nil {
		return fmt.Errorf("failed to test autovacuum trigger: %w", err)
	}

	return nil
}

// テーブル統計情報を取得
func getTableStats(ctx context.Context, db *sql.DB) ([]VacuumStats, error) {
	query := `
		SELECT 
			tablename,
			n_live_tup,
			n_dead_tup,
			ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2),
			last_vacuum,
			last_autovacuum,
			pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
		FROM pg_stat_user_tables
		WHERE schemaname = 'public'
			AND tablename IN ('audit_logs', 'sessions', 'weekly_reports', 'daily_records', 'expenses')
		ORDER BY n_dead_tup DESC
	`

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []VacuumStats
	for rows.Next() {
		var s VacuumStats
		err := rows.Scan(
			&s.TableName,
			&s.LiveTuples,
			&s.DeadTuples,
			&s.DeadRatio,
			&s.LastVacuum,
			&s.LastAutovacuum,
			&s.TableSize,
		)
		if err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}

	return stats, nil
}

// 統計情報を表示
func printStats(stats []VacuumStats) {
	fmt.Printf("%-20s %10s %10s %8s %20s %10s\n",
		"Table", "Live", "Dead", "Dead%", "Last Autovacuum", "Size")
	fmt.Println(string(make([]byte, 90)))

	for _, s := range stats {
		lastAV := "Never"
		if s.LastAutovacuum != nil {
			lastAV = s.LastAutovacuum.Format("2006-01-02 15:04")
		}
		fmt.Printf("%-20s %10d %10d %7.2f%% %20s %10s\n",
			s.TableName, s.LiveTuples, s.DeadTuples, s.DeadRatio, lastAV, s.TableSize)
	}
}

// デッドタプルを生成（テスト用）
func generateDeadTuples(ctx context.Context, db *sql.DB) error {
	// テストテーブルが存在しない場合は作成
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS vacuum_test (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			data TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create test table: %w", err)
	}

	// autovacuum設定を適用
	_, err = db.ExecContext(ctx, `
		ALTER TABLE vacuum_test SET (
			autovacuum_vacuum_scale_factor = 0.01,
			autovacuum_analyze_scale_factor = 0.01,
			autovacuum_vacuum_threshold = 50
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to set autovacuum settings: %w", err)
	}

	// データ挿入
	fmt.Println("Inserting 10000 rows...")
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for i := 0; i < 10000; i++ {
		_, err = tx.ExecContext(ctx,
			"INSERT INTO vacuum_test (data) VALUES ($1)",
			fmt.Sprintf("Test data %d", i))
		if err != nil {
			return err
		}
	}
	tx.Commit()

	// 更新と削除でデッドタプルを生成
	fmt.Println("Generating dead tuples (UPDATE 5000 rows)...")
	_, err = db.ExecContext(ctx,
		"UPDATE vacuum_test SET data = data || ' - updated', updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT id FROM vacuum_test LIMIT 5000)")
	if err != nil {
		return err
	}

	fmt.Println("Generating more dead tuples (DELETE 2000 rows)...")
	_, err = db.ExecContext(ctx,
		"DELETE FROM vacuum_test WHERE id IN (SELECT id FROM vacuum_test LIMIT 2000)")
	if err != nil {
		return err
	}

	// 統計情報を確認
	var live, dead int64
	var deadRatio float64
	err = db.QueryRowContext(ctx, `
		SELECT n_live_tup, n_dead_tup, 
		       ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2)
		FROM pg_stat_user_tables WHERE tablename = 'vacuum_test'
	`).Scan(&live, &dead, &deadRatio)
	if err != nil {
		return err
	}

	fmt.Printf("✅ Test table created: %d live tuples, %d dead tuples (%.2f%% dead)\n",
		live, dead, deadRatio)

	return nil
}

// Autovacuum設定を確認
func checkAutovacuumSettings(ctx context.Context, db *sql.DB) error {
	// グローバル設定
	fmt.Println("Global autovacuum settings:")
	settings := []string{
		"autovacuum",
		"autovacuum_vacuum_scale_factor",
		"autovacuum_analyze_scale_factor",
		"autovacuum_vacuum_threshold",
		"autovacuum_naptime",
		"autovacuum_max_workers",
	}

	for _, setting := range settings {
		var value string
		err := db.QueryRowContext(ctx,
			"SELECT setting FROM pg_settings WHERE name = $1", setting).Scan(&value)
		if err != nil {
			continue
		}
		fmt.Printf("  %-35s: %s\n", setting, value)
	}

	// テーブル個別設定
	fmt.Println("\nTable-specific settings:")
	rows, err := db.QueryContext(ctx, `
		SELECT c.relname, c.reloptions
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' 
		  AND c.relkind = 'r'
		  AND c.reloptions IS NOT NULL
		ORDER BY c.relname
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var tableName string
		var options sql.NullString
		if err := rows.Scan(&tableName, &options); err != nil {
			continue
		}
		if options.Valid {
			fmt.Printf("  %-20s: %s\n", tableName, options.String)
		}
	}

	return nil
}

// 手動VACUUMのパフォーマンステスト
func testManualVacuum(ctx context.Context, db *sql.DB) error {
	tables := []string{"vacuum_test", "audit_logs", "sessions"}

	for _, table := range tables {
		// テーブル存在確認
		var exists bool
		err := db.QueryRowContext(ctx,
			"SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
			table).Scan(&exists)
		if err != nil || !exists {
			continue
		}

		fmt.Printf("Testing VACUUM on %s...\n", table)

		// VACUUM実行時間を測定
		start := time.Now()
		_, err = db.ExecContext(ctx, fmt.Sprintf("VACUUM (VERBOSE, ANALYZE) %s", table))
		duration := time.Since(start)

		if err != nil {
			fmt.Printf("  ❌ Error: %v\n", err)
		} else {
			fmt.Printf("  ✅ Completed in %v\n", duration)
		}
	}

	return nil
}

// Autovacuumトリガーテスト
func testAutovacuumTrigger(ctx context.Context, db *sql.DB) error {
	fmt.Println("Testing autovacuum trigger conditions...")

	// vacuum_testテーブルの閾値を確認
	var threshold, scaleFactor float64
	err := db.QueryRowContext(ctx, `
		SELECT 
			COALESCE((SELECT option_value::float FROM pg_options_to_table(c.reloptions) WHERE option_name = 'autovacuum_vacuum_threshold'), 
					 current_setting('autovacuum_vacuum_threshold')::float),
			COALESCE((SELECT option_value::float FROM pg_options_to_table(c.reloptions) WHERE option_name = 'autovacuum_vacuum_scale_factor'),
					 current_setting('autovacuum_vacuum_scale_factor')::float)
		FROM pg_class c
		WHERE c.relname = 'vacuum_test'
	`).Scan(&threshold, &scaleFactor)
	if err != nil {
		return err
	}

	fmt.Printf("  Threshold: %.0f rows\n", threshold)
	fmt.Printf("  Scale factor: %.2f (%.0f%%)\n", scaleFactor, scaleFactor*100)

	// 現在の統計を取得
	var liveTuples, deadTuples int64
	err = db.QueryRowContext(ctx, `
		SELECT n_live_tup, n_dead_tup
		FROM pg_stat_user_tables
		WHERE tablename = 'vacuum_test'
	`).Scan(&liveTuples, &deadTuples)
	if err != nil {
		return err
	}

	// autovacuumトリガー条件を計算
	triggerPoint := threshold + (scaleFactor * float64(liveTuples))
	fmt.Printf("\n  Current state:\n")
	fmt.Printf("    Live tuples: %d\n", liveTuples)
	fmt.Printf("    Dead tuples: %d\n", deadTuples)
	fmt.Printf("    Trigger point: %.0f\n", triggerPoint)

	if float64(deadTuples) >= triggerPoint {
		fmt.Println("  ✅ Autovacuum should trigger soon")
	} else {
		needed := int64(triggerPoint) - deadTuples
		fmt.Printf("  ⏳ Need %d more dead tuples to trigger autovacuum\n", needed)
	}

	// クリーンアップ
	fmt.Println("\nCleaning up test table...")
	_, err = db.ExecContext(ctx, "DROP TABLE IF EXISTS vacuum_test")
	if err != nil {
		return err
	}

	return nil
}
