package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
)

type MigrationConfig struct {
	SourceDB  *sql.DB
	TargetDB  *sql.DB
	BatchSize int
	Workers   int
	Tables    []TableMigration
	Timeout   time.Duration
	Verbose   bool
}

type TableMigration struct {
	Name        string
	Query       string
	InsertQuery string
	PrimaryKey  string
	BatchSize   int
	Priority    int
}

type MigrationController struct {
	config *MigrationConfig
	stats  *MigrationStats
	mutex  sync.RWMutex
}

type MigrationStats struct {
	TablesCompleted  int
	RecordsProcessed int64
	BytesTransferred int64
	StartTime        time.Time
	Errors           []error
	Duration         time.Duration
}

type MigrationPhase struct {
	Name    string
	Tables  []TableMigration
	Workers int
}

func main() {
	// コマンドライン引数解析
	var (
		sourceHost = flag.String("source-host", "localhost", "MySQL host")
		sourcePort = flag.String("source-port", "3306", "MySQL port")
		sourceDB   = flag.String("source-db", "monstera", "MySQL database")
		sourceUser = flag.String("source-user", "root", "MySQL user")
		sourcePass = flag.String("source-pass", "", "MySQL password")

		targetHost = flag.String("target-host", "localhost", "PostgreSQL host")
		targetPort = flag.String("target-port", "5432", "PostgreSQL port")
		targetDB   = flag.String("target-db", "monstera", "PostgreSQL database")
		targetUser = flag.String("target-user", "postgres", "PostgreSQL user")
		targetPass = flag.String("target-pass", "", "PostgreSQL password")

		batchSize = flag.Int("batch-size", 10000, "Batch size for processing")
		workers   = flag.Int("workers", 8, "Number of parallel workers")
		timeout   = flag.Duration("timeout", 3600*time.Second, "Migration timeout")
		verbose   = flag.Bool("verbose", false, "Verbose logging")
	)
	flag.Parse()

	log.Printf("一括データ移行コントローラー開始")
	log.Printf("設定: バッチサイズ=%d, ワーカー数=%d, タイムアウト=%v", *batchSize, *workers, *timeout)

	// MySQL接続
	mysqlDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=UTC",
		*sourceUser, *sourcePass, *sourceHost, *sourcePort, *sourceDB)

	mysqlDB, err := sql.Open("mysql", mysqlDSN)
	if err != nil {
		log.Fatalf("MySQL接続エラー: %v", err)
	}
	defer mysqlDB.Close()

	// PostgreSQL接続
	postgresDSN := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		*targetHost, *targetPort, *targetUser, *targetPass, *targetDB)

	postgresDB, err := sql.Open("postgres", postgresDSN)
	if err != nil {
		log.Fatalf("PostgreSQL接続エラー: %v", err)
	}
	defer postgresDB.Close()

	// 接続テスト
	if err := mysqlDB.Ping(); err != nil {
		log.Fatalf("MySQL接続テストエラー: %v", err)
	}
	if err := postgresDB.Ping(); err != nil {
		log.Fatalf("PostgreSQL接続テストエラー: %v", err)
	}

	log.Printf("データベース接続確認完了")

	// 移行設定作成
	config := &MigrationConfig{
		SourceDB:  mysqlDB,
		TargetDB:  postgresDB,
		BatchSize: *batchSize,
		Workers:   *workers,
		Tables:    generateTableMigrations(),
		Timeout:   *timeout,
		Verbose:   *verbose,
	}

	// 移行コントローラー作成・実行
	controller := NewMigrationController(config)

	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()

	if err := controller.ExecuteMigration(ctx); err != nil {
		log.Fatalf("移行実行エラー: %v", err)
	}

	// 最終統計表示
	stats := controller.GetStats()
	log.Printf("移行完了: テーブル数=%d, レコード数=%d, 実行時間=%v",
		stats.TablesCompleted, stats.RecordsProcessed, stats.Duration)

	if len(stats.Errors) > 0 {
		log.Printf("エラー数: %d", len(stats.Errors))
		os.Exit(1)
	}

	log.Printf("一括データ移行が正常に完了しました")
}

func NewMigrationController(config *MigrationConfig) *MigrationController {
	return &MigrationController{
		config: config,
		stats: &MigrationStats{
			StartTime: time.Now(),
			Errors:    make([]error, 0),
		},
	}
}

func (mc *MigrationController) ExecuteMigration(ctx context.Context) error {
	log.Printf("開始: 一括データ移行 - %d テーブル, %d ワーカー",
		len(mc.config.Tables), mc.config.Workers)

	// フェーズ別実行
	phases := mc.organizeByPhases()

	for phaseNum, phase := range phases {
		log.Printf("フェーズ %d/%d 開始: %s", phaseNum+1, len(phases), phase.Name)

		if err := mc.executePhase(ctx, phase); err != nil {
			return fmt.Errorf("フェーズ %d 実行エラー: %w", phaseNum+1, err)
		}

		log.Printf("フェーズ %d 完了: %s (処理時間: %v)",
			phaseNum+1, phase.Name, time.Since(mc.stats.StartTime))
	}

	return nil
}

func (mc *MigrationController) executePhase(ctx context.Context, phase MigrationPhase) error {
	semaphore := make(chan struct{}, mc.config.Workers)
	errChan := make(chan error, len(phase.Tables))
	var wg sync.WaitGroup

	for _, table := range phase.Tables {
		wg.Add(1)
		go func(tbl TableMigration) {
			defer wg.Done()
			semaphore <- struct{}{}        // ワーカー数制限
			defer func() { <-semaphore }() // セマフォ解放

			if err := mc.migrateTable(ctx, tbl); err != nil {
				errChan <- fmt.Errorf("テーブル %s: %w", tbl.Name, err)
				return
			}

			mc.mutex.Lock()
			mc.stats.TablesCompleted++
			mc.mutex.Unlock()

			log.Printf("完了: テーブル %s", tbl.Name)
		}(table)
	}

	wg.Wait()
	close(errChan)

	// エラー収集
	for err := range errChan {
		mc.stats.Errors = append(mc.stats.Errors, err)
	}

	if len(mc.stats.Errors) > 0 {
		return fmt.Errorf("フェーズでエラー: %d件", len(mc.stats.Errors))
	}

	return nil
}

func (mc *MigrationController) migrateTable(ctx context.Context, table TableMigration) error {
	startTime := time.Now()

	// 1. レコード数確認
	var totalRecords int64
	err := mc.config.SourceDB.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM %s", table.Name)).Scan(&totalRecords)
	if err != nil {
		return fmt.Errorf("レコード数取得エラー: %w", err)
	}

	if totalRecords == 0 {
		if mc.config.Verbose {
			log.Printf("テーブル %s: レコード数0 - スキップ", table.Name)
		}
		return nil
	}

	log.Printf("テーブル %s: %d レコード移行開始", table.Name, totalRecords)

	// 2. バッチ処理で移行
	batchSize := table.BatchSize
	if batchSize == 0 {
		batchSize = mc.config.BatchSize
	}

	var processedRecords int64
	for offset := int64(0); offset < totalRecords; offset += int64(batchSize) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// バッチクエリ実行
		query := fmt.Sprintf("%s LIMIT %d OFFSET %d", table.Query, batchSize, offset)

		if err := mc.migrateBatch(ctx, table, query); err != nil {
			return fmt.Errorf("バッチ移行エラー (offset: %d): %w", offset, err)
		}

		processedRecords = offset + int64(batchSize)
		if processedRecords > totalRecords {
			processedRecords = totalRecords
		}

		// 進捗ログ
		if mc.config.Verbose && (processedRecords%10000 == 0 || processedRecords == totalRecords) {
			progress := float64(processedRecords) / float64(totalRecords) * 100
			elapsed := time.Since(startTime)
			log.Printf("テーブル %s: %.1f%% (%d/%d) - 経過時間: %v",
				table.Name, progress, processedRecords, totalRecords, elapsed)
		}

		mc.mutex.Lock()
		mc.stats.RecordsProcessed += int64(batchSize)
		mc.mutex.Unlock()
	}

	duration := time.Since(startTime)
	throughput := float64(totalRecords) / duration.Seconds()
	log.Printf("テーブル %s 完了: %d レコード, %v, %.1f レコード/秒",
		table.Name, totalRecords, duration, throughput)

	return nil
}

func (mc *MigrationController) migrateBatch(ctx context.Context, table TableMigration, query string) error {
	// MySQL からデータ取得
	rows, err := mc.config.SourceDB.QueryContext(ctx, query)
	if err != nil {
		return fmt.Errorf("MySQLクエリエラー: %w", err)
	}
	defer rows.Close()

	// カラム情報取得
	columns, err := rows.Columns()
	if err != nil {
		return fmt.Errorf("カラム情報取得エラー: %w", err)
	}

	// PostgreSQL バルクインサート準備
	tx, err := mc.config.TargetDB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("トランザクション開始エラー: %w", err)
	}
	defer tx.Rollback()

	// INSERT文準備
	stmt, err := tx.PrepareContext(ctx, table.InsertQuery)
	if err != nil {
		return fmt.Errorf("INSERT準備エラー: %w", err)
	}
	defer stmt.Close()

	// データ転送
	values := make([]interface{}, len(columns))
	scanArgs := make([]interface{}, len(columns))
	for i := range values {
		scanArgs[i] = &values[i]
	}

	var batchCount int
	for rows.Next() {
		if err := rows.Scan(scanArgs...); err != nil {
			return fmt.Errorf("行スキャンエラー: %w", err)
		}

		// データ型変換（MySQL → PostgreSQL）
		convertedValues := mc.convertDataTypes(values)

		if _, err := stmt.ExecContext(ctx, convertedValues...); err != nil {
			return fmt.Errorf("INSERT実行エラー: %w", err)
		}

		batchCount++
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("行読み取りエラー: %w", err)
	}

	// トランザクションコミット
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("コミットエラー: %w", err)
	}

	return nil
}

func (mc *MigrationController) convertDataTypes(values []interface{}) []interface{} {
	converted := make([]interface{}, len(values))

	for i, value := range values {
		switch v := value.(type) {
		case []byte:
			// MySQL BINARY/VARBINARY → PostgreSQL BYTEA
			converted[i] = v
		case time.Time:
			// タイムゾーン変換
			if v.IsZero() {
				converted[i] = nil
			} else {
				converted[i] = v.UTC()
			}
		case nil:
			converted[i] = nil
		default:
			converted[i] = v
		}
	}

	return converted
}

func (mc *MigrationController) organizeByPhases() []MigrationPhase {
	phases := []MigrationPhase{
		{
			Name:    "基盤テーブル",
			Workers: 4,
			Tables: []TableMigration{
				{Name: "departments", Query: "SELECT * FROM departments", InsertQuery: "INSERT INTO departments VALUES ($1, $2, $3, $4, $5)", Priority: 1},
				{Name: "roles", Query: "SELECT * FROM roles", InsertQuery: "INSERT INTO roles VALUES ($1, $2, $3, $4, $5)", Priority: 1},
				{Name: "permissions", Query: "SELECT * FROM permissions", InsertQuery: "INSERT INTO permissions VALUES ($1, $2, $3, $4, $5)", Priority: 1},
			},
		},
		{
			Name:    "ユーザー関連",
			Workers: 6,
			Tables: []TableMigration{
				{Name: "users", Query: "SELECT * FROM users", InsertQuery: "INSERT INTO users VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", Priority: 2},
				{Name: "user_roles", Query: "SELECT * FROM user_roles", InsertQuery: "INSERT INTO user_roles VALUES ($1, $2, $3, $4, $5)", Priority: 2},
				{Name: "profiles", Query: "SELECT * FROM profiles", InsertQuery: "INSERT INTO profiles VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)", Priority: 2},
			},
		},
		{
			Name:    "業務データ",
			Workers: 8,
			Tables: []TableMigration{
				{Name: "clients", Query: "SELECT * FROM clients", InsertQuery: "INSERT INTO clients VALUES ($1, $2, $3, $4, $5, $6, $7)", Priority: 3},
				{Name: "projects", Query: "SELECT * FROM projects", InsertQuery: "INSERT INTO projects VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)", Priority: 3},
				{Name: "weekly_reports", Query: "SELECT * FROM weekly_reports", InsertQuery: "INSERT INTO weekly_reports VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)", BatchSize: 5000, Priority: 3},
				{Name: "daily_records", Query: "SELECT * FROM daily_records", InsertQuery: "INSERT INTO daily_records VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)", BatchSize: 10000, Priority: 3},
			},
		},
		{
			Name:    "補助データ",
			Workers: 4,
			Tables: []TableMigration{
				{Name: "notifications", Query: "SELECT * FROM notifications", InsertQuery: "INSERT INTO notifications VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", Priority: 4},
				{Name: "audit_logs", Query: "SELECT * FROM audit_logs", InsertQuery: "INSERT INTO audit_logs VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", Priority: 4},
				{Name: "sessions", Query: "SELECT * FROM sessions", InsertQuery: "INSERT INTO sessions VALUES ($1, $2, $3, $4, $5, $6)", Priority: 4},
			},
		},
	}

	return phases
}

func (mc *MigrationController) GetStats() MigrationStats {
	mc.mutex.RLock()
	defer mc.mutex.RUnlock()

	stats := *mc.stats
	stats.Duration = time.Since(mc.stats.StartTime)
	return stats
}

func generateTableMigrations() []TableMigration {
	// 実際のテーブル設定は動的に生成
	return []TableMigration{
		{Name: "users", Query: "SELECT * FROM users", Priority: 1},
		{Name: "weekly_reports", Query: "SELECT * FROM weekly_reports", BatchSize: 5000, Priority: 2},
		{Name: "daily_records", Query: "SELECT * FROM daily_records", BatchSize: 10000, Priority: 2},
		// 他のテーブルも追加
	}
}
