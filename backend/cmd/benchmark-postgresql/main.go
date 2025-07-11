package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/config"
)

// PostgreSQLベンチマークツール
// パラメータチューニングの効果を測定

type BenchmarkResult struct {
	TestName     string
	Duration     time.Duration
	Transactions int
	TPS          float64 // Transactions Per Second
	AvgLatency   time.Duration
	MinLatency   time.Duration
	MaxLatency   time.Duration
	Errors       int
}

type MemoryStats struct {
	SharedBufferHitRatio float64
	TempFilesCreated     int64
	TempBytesWritten     int64
}

func main() {
	println("🧪 PostgreSQL Performance Benchmark")
	println("==================================")
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

	// 接続プール設定
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	// ベンチマーク実行
	if err := runBenchmarks(db, logger); err != nil {
		logger.Fatal("Benchmarks failed", zap.Error(err))
	}

	println("")
	println("🎉 Benchmark completed!")
}

func runBenchmarks(db *sql.DB, logger *zap.Logger) error {
	ctx := context.Background()

	// テストテーブルの準備
	if err := prepareBenchmarkTables(ctx, db); err != nil {
		return fmt.Errorf("failed to prepare tables: %w", err)
	}

	// メモリ統計（開始時）
	startMemStats, _ := getMemoryStats(ctx, db)

	// ベンチマークテスト実行
	results := []BenchmarkResult{}

	// 1. 単純INSERT性能テスト
	fmt.Println("1. Simple INSERT Performance Test")
	fmt.Println("=================================")
	result := benchmarkInserts(ctx, db, 10000, 10)
	printResult(result)
	results = append(results, result)
	fmt.Println()

	// 2. 複雑クエリ性能テスト
	fmt.Println("2. Complex Query Performance Test")
	fmt.Println("=================================")
	result = benchmarkComplexQueries(ctx, db, 1000, 5)
	printResult(result)
	results = append(results, result)
	fmt.Println()

	// 3. 同時実行性能テスト
	fmt.Println("3. Concurrent Transaction Test")
	fmt.Println("==============================")
	result = benchmarkConcurrentTransactions(ctx, db, 100, 20)
	printResult(result)
	results = append(results, result)
	fmt.Println()

	// 4. work_mem依存のソート性能テスト
	fmt.Println("4. Sort Performance Test (work_mem)")
	fmt.Println("===================================")
	result = benchmarkSortOperations(ctx, db, 100)
	printResult(result)
	results = append(results, result)
	fmt.Println()

	// 5. インデックススキャン性能テスト
	fmt.Println("5. Index Scan Performance Test")
	fmt.Println("==============================")
	result = benchmarkIndexScans(ctx, db, 10000)
	printResult(result)
	results = append(results, result)
	fmt.Println()

	// メモリ統計（終了時）
	endMemStats, _ := getMemoryStats(ctx, db)

	// パラメータ情報を表示
	fmt.Println("6. Current Parameter Settings")
	fmt.Println("=============================")
	displayCurrentParameters(ctx, db)
	fmt.Println()

	// メモリ使用状況
	fmt.Println("7. Memory Usage Statistics")
	fmt.Println("=========================")
	fmt.Printf("Shared Buffer Hit Ratio: %.2f%%\n", endMemStats.SharedBufferHitRatio*100)
	fmt.Printf("Temp Files Created: %d\n", endMemStats.TempFilesCreated-startMemStats.TempFilesCreated)
	fmt.Printf("Temp Bytes Written: %s\n", formatBytes(endMemStats.TempBytesWritten-startMemStats.TempBytesWritten))
	fmt.Println()

	// サマリー
	fmt.Println("8. Benchmark Summary")
	fmt.Println("===================")
	var totalTPS float64
	for _, r := range results {
		totalTPS += r.TPS
		fmt.Printf("%-30s: %.2f TPS\n", r.TestName, r.TPS)
	}
	fmt.Printf("\nAverage TPS: %.2f\n", totalTPS/float64(len(results)))

	// クリーンアップ
	cleanupBenchmarkTables(ctx, db)

	return nil
}

// テストテーブルの準備
func prepareBenchmarkTables(ctx context.Context, db *sql.DB) error {
	queries := []string{
		`DROP TABLE IF EXISTS bench_data`,
		`CREATE TABLE bench_data (
			id SERIAL PRIMARY KEY,
			uuid_col UUID DEFAULT gen_random_uuid(),
			name TEXT,
			value INTEGER,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			data JSONB
		)`,
		`CREATE INDEX idx_bench_value ON bench_data(value)`,
		`CREATE INDEX idx_bench_created ON bench_data(created_at)`,
		`CREATE INDEX idx_bench_data_gin ON bench_data USING GIN(data)`,
	}

	for _, query := range queries {
		if _, err := db.ExecContext(ctx, query); err != nil {
			return err
		}
	}

	// 初期データ投入
	for i := 0; i < 50000; i++ {
		_, err := db.ExecContext(ctx,
			`INSERT INTO bench_data (name, value, data) VALUES ($1, $2, $3)`,
			fmt.Sprintf("record_%d", i),
			rand.Intn(10000),
			fmt.Sprintf(`{"type": "test", "index": %d, "tags": ["tag%d", "tag%d"]}`, i, i%10, i%20),
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// 1. INSERT性能ベンチマーク
func benchmarkInserts(ctx context.Context, db *sql.DB, records int, workers int) BenchmarkResult {
	result := BenchmarkResult{
		TestName:     "Simple INSERT",
		Transactions: records,
	}

	latencies := make([]time.Duration, 0, records)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errors := 0

	start := time.Now()
	recordsPerWorker := records / workers

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for i := 0; i < recordsPerWorker; i++ {
				txStart := time.Now()
				_, err := db.ExecContext(ctx,
					`INSERT INTO bench_data (name, value, data) VALUES ($1, $2, $3)`,
					fmt.Sprintf("bench_%d_%d", workerID, i),
					rand.Intn(10000),
					fmt.Sprintf(`{"worker": %d, "index": %d}`, workerID, i),
				)
				latency := time.Since(txStart)

				mu.Lock()
				if err != nil {
					errors++
				} else {
					latencies = append(latencies, latency)
				}
				mu.Unlock()
			}
		}(w)
	}

	wg.Wait()
	result.Duration = time.Since(start)
	result.Errors = errors

	// 統計計算
	if len(latencies) > 0 {
		var total time.Duration
		result.MinLatency = latencies[0]
		result.MaxLatency = latencies[0]

		for _, l := range latencies {
			total += l
			if l < result.MinLatency {
				result.MinLatency = l
			}
			if l > result.MaxLatency {
				result.MaxLatency = l
			}
		}

		result.AvgLatency = total / time.Duration(len(latencies))
		result.TPS = float64(len(latencies)) / result.Duration.Seconds()
	}

	return result
}

// 2. 複雑クエリベンチマーク
func benchmarkComplexQueries(ctx context.Context, db *sql.DB, queries int, workers int) BenchmarkResult {
	result := BenchmarkResult{
		TestName:     "Complex Query",
		Transactions: queries,
	}

	latencies := make([]time.Duration, 0, queries)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errors := 0

	start := time.Now()
	queriesPerWorker := queries / workers

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for i := 0; i < queriesPerWorker; i++ {
				txStart := time.Now()

				// 複雑なクエリ（集計、JOIN相当の処理）
				var count int
				err := db.QueryRowContext(ctx, `
					WITH aggregated AS (
						SELECT 
							value / 100 as bucket,
							COUNT(*) as cnt,
							AVG(value) as avg_value,
							MAX(created_at) as latest
						FROM bench_data
						WHERE value BETWEEN $1 AND $2
						GROUP BY value / 100
					)
					SELECT COUNT(*) FROM aggregated WHERE cnt > 10
				`, rand.Intn(5000), rand.Intn(5000)+5000).Scan(&count)

				latency := time.Since(txStart)

				mu.Lock()
				if err != nil {
					errors++
				} else {
					latencies = append(latencies, latency)
				}
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	result.Duration = time.Since(start)
	result.Errors = errors

	// 統計計算
	calculateStats(&result, latencies)
	return result
}

// 3. 同時実行トランザクションベンチマーク
func benchmarkConcurrentTransactions(ctx context.Context, db *sql.DB, txPerWorker int, workers int) BenchmarkResult {
	result := BenchmarkResult{
		TestName:     "Concurrent Transactions",
		Transactions: txPerWorker * workers,
	}

	latencies := make([]time.Duration, 0, txPerWorker*workers)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errors := 0

	start := time.Now()

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for i := 0; i < txPerWorker; i++ {
				txStart := time.Now()

				tx, err := db.BeginTx(ctx, nil)
				if err != nil {
					mu.Lock()
					errors++
					mu.Unlock()
					continue
				}

				// トランザクション内で複数操作
				success := true
				for j := 0; j < 5; j++ {
					_, err = tx.ExecContext(ctx,
						`UPDATE bench_data SET value = value + 1 WHERE id = $1`,
						rand.Intn(10000)+1,
					)
					if err != nil {
						success = false
						break
					}
				}

				if success {
					err = tx.Commit()
				} else {
					err = tx.Rollback()
				}

				latency := time.Since(txStart)

				mu.Lock()
				if err != nil {
					errors++
				} else {
					latencies = append(latencies, latency)
				}
				mu.Unlock()
			}
		}(w)
	}

	wg.Wait()
	result.Duration = time.Since(start)
	result.Errors = errors

	calculateStats(&result, latencies)
	return result
}

// 4. ソート性能ベンチマーク（work_memテスト）
func benchmarkSortOperations(ctx context.Context, db *sql.DB, iterations int) BenchmarkResult {
	result := BenchmarkResult{
		TestName:     "Sort Operations",
		Transactions: iterations,
	}

	latencies := make([]time.Duration, 0, iterations)
	errors := 0

	start := time.Now()

	for i := 0; i < iterations; i++ {
		txStart := time.Now()

		// 大量データのソート
		rows, err := db.QueryContext(ctx, `
			SELECT name, value, data
			FROM bench_data
			ORDER BY value DESC, created_at DESC
			LIMIT 1000
		`)

		if err == nil {
			// 結果を読み込む
			for rows.Next() {
				var name string
				var value int
				var data string
				rows.Scan(&name, &value, &data)
			}
			rows.Close()
		}

		latency := time.Since(txStart)

		if err != nil {
			errors++
		} else {
			latencies = append(latencies, latency)
		}
	}

	result.Duration = time.Since(start)
	result.Errors = errors

	calculateStats(&result, latencies)
	return result
}

// 5. インデックススキャン性能ベンチマーク
func benchmarkIndexScans(ctx context.Context, db *sql.DB, scans int) BenchmarkResult {
	result := BenchmarkResult{
		TestName:     "Index Scans",
		Transactions: scans,
	}

	latencies := make([]time.Duration, 0, scans)
	errors := 0

	start := time.Now()

	for i := 0; i < scans; i++ {
		txStart := time.Now()

		// インデックスを使用するクエリ
		var count int
		err := db.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM bench_data
			WHERE value BETWEEN $1 AND $2
			  AND data @> '{"type": "test"}'::jsonb
		`, rand.Intn(8000), rand.Intn(2000)+8000).Scan(&count)

		latency := time.Since(txStart)

		if err != nil {
			errors++
		} else {
			latencies = append(latencies, latency)
		}
	}

	result.Duration = time.Since(start)
	result.Errors = errors

	calculateStats(&result, latencies)
	return result
}

// 統計計算ヘルパー
func calculateStats(result *BenchmarkResult, latencies []time.Duration) {
	if len(latencies) > 0 {
		var total time.Duration
		result.MinLatency = latencies[0]
		result.MaxLatency = latencies[0]

		for _, l := range latencies {
			total += l
			if l < result.MinLatency {
				result.MinLatency = l
			}
			if l > result.MaxLatency {
				result.MaxLatency = l
			}
		}

		result.AvgLatency = total / time.Duration(len(latencies))
		result.TPS = float64(len(latencies)) / result.Duration.Seconds()
	}
}

// 現在のパラメータ設定を表示
func displayCurrentParameters(ctx context.Context, db *sql.DB) {
	params := []string{
		"shared_buffers",
		"effective_cache_size",
		"work_mem",
		"maintenance_work_mem",
		"max_connections",
		"random_page_cost",
		"effective_io_concurrency",
	}

	for _, param := range params {
		var value string
		err := db.QueryRowContext(ctx, "SHOW "+param).Scan(&value)
		if err == nil {
			fmt.Printf("%-25s: %s\n", param, value)
		}
	}
}

// メモリ統計を取得
func getMemoryStats(ctx context.Context, db *sql.DB) (MemoryStats, error) {
	var stats MemoryStats

	// 共有バッファヒット率
	err := db.QueryRowContext(ctx, `
		SELECT 
			CASE 
				WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
				ELSE sum(heap_blks_hit)::float / (sum(heap_blks_hit) + sum(heap_blks_read))
			END as hit_ratio
		FROM pg_statio_user_tables
	`).Scan(&stats.SharedBufferHitRatio)
	if err != nil {
		return stats, err
	}

	// 一時ファイル統計
	err = db.QueryRowContext(ctx, `
		SELECT 
			COALESCE(sum(temp_files), 0),
			COALESCE(sum(temp_bytes), 0)
		FROM pg_stat_database
		WHERE datname = current_database()
	`).Scan(&stats.TempFilesCreated, &stats.TempBytesWritten)

	return stats, err
}

// 結果を表示
func printResult(result BenchmarkResult) {
	fmt.Printf("Transactions: %d\n", result.Transactions)
	fmt.Printf("Duration: %v\n", result.Duration)
	fmt.Printf("TPS: %.2f\n", result.TPS)
	fmt.Printf("Avg Latency: %v\n", result.AvgLatency)
	fmt.Printf("Min Latency: %v\n", result.MinLatency)
	fmt.Printf("Max Latency: %v\n", result.MaxLatency)
	fmt.Printf("Errors: %d\n", result.Errors)
}

// バイト数をフォーマット
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// クリーンアップ
func cleanupBenchmarkTables(ctx context.Context, db *sql.DB) {
	db.ExecContext(ctx, "DROP TABLE IF EXISTS bench_data")
}
