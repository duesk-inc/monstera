package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// ExplainPlan EXPLAIN ANALYZEの結果構造体
type ExplainPlan struct {
	Plan         PlanNode `json:"Plan"`
	PlanningTime float64  `json:"Planning Time"`
	ExecutionTime float64 `json:"Execution Time"`
	Triggers     []string `json:"Triggers,omitempty"`
}

// PlanNode 実行計画のノード
type PlanNode struct {
	NodeType         string     `json:"Node Type"`
	Strategy         string     `json:"Strategy,omitempty"`
	PartialMode      string     `json:"Partial Mode,omitempty"`
	ParallelAware    bool       `json:"Parallel Aware,omitempty"`
	StartupCost      float64    `json:"Startup Cost"`
	TotalCost        float64    `json:"Total Cost"`
	PlanRows         int        `json:"Plan Rows"`
	PlanWidth        int        `json:"Plan Width"`
	ActualStartupTime float64   `json:"Actual Startup Time"`
	ActualTotalTime  float64    `json:"Actual Total Time"`
	ActualRows       int        `json:"Actual Rows"`
	ActualLoops      int        `json:"Actual Loops"`
	SharedHitBlocks  int        `json:"Shared Hit Blocks,omitempty"`
	SharedReadBlocks int        `json:"Shared Read Blocks,omitempty"`
	SharedDirtyBlocks int       `json:"Shared Dirtied Blocks,omitempty"`
	SharedWrittenBlocks int     `json:"Shared Written Blocks,omitempty"`
	LocalHitBlocks   int        `json:"Local Hit Blocks,omitempty"`
	LocalReadBlocks  int        `json:"Local Read Blocks,omitempty"`
	LocalDirtyBlocks int        `json:"Local Dirtied Blocks,omitempty"`
	LocalWrittenBlocks int      `json:"Local Written Blocks,omitempty"`
	TempReadBlocks   int        `json:"Temp Read Blocks,omitempty"`
	TempWrittenBlocks int       `json:"Temp Written Blocks,omitempty"`
	IOReadTime       float64    `json:"I/O Read Time,omitempty"`
	IOWriteTime      float64    `json:"I/O Write Time,omitempty"`
	RelationName     string     `json:"Relation Name,omitempty"`
	Alias            string     `json:"Alias,omitempty"`
	IndexName        string     `json:"Index Name,omitempty"`
	IndexCond        []string   `json:"Index Cond,omitempty"`
	Filter           string     `json:"Filter,omitempty"`
	RowsRemovedByFilter int     `json:"Rows Removed by Filter,omitempty"`
	JoinType         string     `json:"Join Type,omitempty"`
	HashCond         []string   `json:"Hash Cond,omitempty"`
	Plans            []PlanNode `json:"Plans,omitempty"`
}

// QueryTest クエリテスト構造体
type QueryTest struct {
	Name        string
	Description string
	Query       string
	Category    string
}

// QueryAnalyzer クエリアナライザー
type QueryAnalyzer struct {
	db       *sql.DB
	dbConfig DatabaseConfig
}

// DatabaseConfig データベース接続設定
type DatabaseConfig struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
	SSLMode  string
}

// PerformanceResult パフォーマンス結果
type PerformanceResult struct {
	QueryName       string        `json:"query_name"`
	Category        string        `json:"category"`
	Description     string        `json:"description"`
	Query           string        `json:"query"`
	ExecutionTime   float64       `json:"execution_time_ms"`
	PlanningTime    float64       `json:"planning_time_ms"`
	TotalCost       float64       `json:"total_cost"`
	ActualRows      int           `json:"actual_rows"`
	PlanRows        int           `json:"plan_rows"`
	BufferHits      int           `json:"buffer_hits"`
	BufferReads     int           `json:"buffer_reads"`
	HasIndexScan    bool          `json:"has_index_scan"`
	HasSeqScan      bool          `json:"has_seq_scan"`
	HasHashJoin     bool          `json:"has_hash_join"`
	HasSort         bool          `json:"has_sort"`
	Performance     string        `json:"performance_rating"`
	Recommendations []string      `json:"recommendations"`
	ExplainPlan     ExplainPlan   `json:"explain_plan"`
	Timestamp       time.Time     `json:"timestamp"`
}

// NewQueryAnalyzer アナライザーの作成
func NewQueryAnalyzer(config DatabaseConfig) (*QueryAnalyzer, error) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.Database, config.SSLMode)
	
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("データベース接続エラー: %v", err)
	}
	
	// 接続テスト
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("データベース接続テストエラー: %v", err)
	}
	
	return &QueryAnalyzer{
		db:       db,
		dbConfig: config,
	}, nil
}

// Close データベース接続を閉じる
func (qa *QueryAnalyzer) Close() error {
	return qa.db.Close()
}

// AnalyzeQuery クエリを分析
func (qa *QueryAnalyzer) AnalyzeQuery(ctx context.Context, test QueryTest) (*PerformanceResult, error) {
	// EXPLAIN ANALYZE実行
	explainQuery := fmt.Sprintf("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) %s", test.Query)
	
	var jsonResult string
	err := qa.db.QueryRowContext(ctx, explainQuery).Scan(&jsonResult)
	if err != nil {
		return nil, fmt.Errorf("EXPLAIN ANALYZE実行エラー: %v", err)
	}
	
	// JSON結果をパース
	var explainResults []ExplainPlan
	if err := json.Unmarshal([]byte(jsonResult), &explainResults); err != nil {
		return nil, fmt.Errorf("JSON解析エラー: %v", err)
	}
	
	if len(explainResults) == 0 {
		return nil, fmt.Errorf("EXPLAIN結果が空です")
	}
	
	plan := explainResults[0]
	
	// パフォーマンス結果を作成
	result := &PerformanceResult{
		QueryName:     test.Name,
		Category:      test.Category,
		Description:   test.Description,
		Query:         test.Query,
		ExecutionTime: plan.ExecutionTime,
		PlanningTime:  plan.PlanningTime,
		TotalCost:     plan.Plan.TotalCost,
		ActualRows:    plan.Plan.ActualRows,
		PlanRows:      plan.Plan.PlanRows,
		ExplainPlan:   plan,
		Timestamp:     time.Now(),
	}
	
	// 実行計画を分析
	qa.analyzePlan(&plan.Plan, result)
	
	// パフォーマンス評価
	qa.evaluatePerformance(result)
	
	// 推奨事項生成
	qa.generateRecommendations(result)
	
	return result, nil
}

// analyzePlan 実行計画を再帰的に分析
func (qa *QueryAnalyzer) analyzePlan(node *PlanNode, result *PerformanceResult) {
	// バッファ統計
	result.BufferHits += node.SharedHitBlocks + node.LocalHitBlocks
	result.BufferReads += node.SharedReadBlocks + node.LocalReadBlocks
	
	// 実行計画タイプの検出
	switch node.NodeType {
	case "Index Scan", "Index Only Scan", "Bitmap Index Scan":
		result.HasIndexScan = true
	case "Seq Scan":
		result.HasSeqScan = true
	case "Hash Join", "Merge Join", "Nested Loop":
		if node.NodeType == "Hash Join" {
			result.HasHashJoin = true
		}
	case "Sort":
		result.HasSort = true
	}
	
	// 子ノードを再帰的に分析
	for _, child := range node.Plans {
		qa.analyzePlan(&child, result)
	}
}

// evaluatePerformance パフォーマンス評価
func (qa *QueryAnalyzer) evaluatePerformance(result *PerformanceResult) {
	score := 0
	
	// 実行時間による評価
	if result.ExecutionTime < 10 {
		score += 3 // 優秀
	} else if result.ExecutionTime < 100 {
		score += 2 // 良好
	} else if result.ExecutionTime < 1000 {
		score += 1 // 普通
	} else {
		score += 0 // 改善が必要
	}
	
	// インデックス使用による評価
	if result.HasIndexScan && !result.HasSeqScan {
		score += 2
	} else if result.HasIndexScan {
		score += 1
	} else if result.HasSeqScan {
		score += 0
	}
	
	// コスト効率による評価
	if result.TotalCost < 100 {
		score += 2
	} else if result.TotalCost < 1000 {
		score += 1
	}
	
	// 行数予測精度による評価
	if result.PlanRows > 0 {
		accuracy := float64(result.ActualRows) / float64(result.PlanRows)
		if accuracy >= 0.8 && accuracy <= 1.2 {
			score += 1
		}
	}
	
	// 総合評価
	switch {
	case score >= 7:
		result.Performance = "優秀"
	case score >= 5:
		result.Performance = "良好"
	case score >= 3:
		result.Performance = "普通"
	case score >= 1:
		result.Performance = "要改善"
	default:
		result.Performance = "要緊急改善"
	}
}

// generateRecommendations 推奨事項生成
func (qa *QueryAnalyzer) generateRecommendations(result *PerformanceResult) {
	var recommendations []string
	
	// 実行時間に基づく推奨事項
	if result.ExecutionTime > 1000 {
		recommendations = append(recommendations, "実行時間が1秒を超えています。クエリの最適化またはインデックスの追加を検討してください")
	}
	
	// シーケンシャルスキャンの検出
	if result.HasSeqScan && !result.HasIndexScan {
		recommendations = append(recommendations, "フルテーブルスキャンが発生しています。適切なインデックスの追加を検討してください")
	}
	
	// 高コストクエリ
	if result.TotalCost > 10000 {
		recommendations = append(recommendations, "クエリのコストが高すぎます。JOINの順序やWHERE条件の見直しを検討してください")
	}
	
	// 行数予測の不正確さ
	if result.PlanRows > 0 {
		accuracy := float64(result.ActualRows) / float64(result.PlanRows)
		if accuracy < 0.5 || accuracy > 2.0 {
			recommendations = append(recommendations, "統計情報が古い可能性があります。ANALYZEコマンドの実行を検討してください")
		}
	}
	
	// ソート処理
	if result.HasSort && result.ExecutionTime > 100 {
		recommendations = append(recommendations, "ソート処理が重い可能性があります。work_memの調整やインデックスの追加を検討してください")
	}
	
	// JOINの最適化
	if result.HasHashJoin && result.ExecutionTime > 500 {
		recommendations = append(recommendations, "Hash Joinの処理が重い可能性があります。統計情報の更新や結合条件の見直しを検討してください")
	}
	
	// バッファヒット率
	if result.BufferReads > 0 {
		hitRatio := float64(result.BufferHits) / float64(result.BufferHits+result.BufferReads)
		if hitRatio < 0.9 {
			recommendations = append(recommendations, fmt.Sprintf("バッファヒット率が低いです (%.1f%%)。shared_buffersの調整を検討してください", hitRatio*100))
		}
	}
	
	result.Recommendations = recommendations
}

// GetTestQueries テストクエリの定義
func GetTestQueries() []QueryTest {
	return []QueryTest{
		{
			Name:        "基本ユーザー検索",
			Description: "アクティブユーザーの基本情報取得",
			Query:       "SELECT id, name, email, role FROM users WHERE is_active = true LIMIT 10",
			Category:    "基本クエリ",
		},
		{
			Name:        "週報ユーザーJOIN",
			Description: "週報とユーザー情報のJOIN",
			Query:       "SELECT wr.id, wr.start_date, wr.status, u.name FROM weekly_reports wr JOIN users u ON wr.user_id = u.id WHERE wr.start_date >= CURRENT_DATE - INTERVAL '30 days' LIMIT 20",
			Category:    "JOIN クエリ",
		},
		{
			Name:        "ユーザー別週報集計",
			Description: "ユーザー別の週報件数集計",
			Query:       "SELECT u.name, COUNT(wr.id) as report_count FROM users u LEFT JOIN weekly_reports wr ON u.id = wr.user_id GROUP BY u.id, u.name ORDER BY report_count DESC LIMIT 10",
			Category:    "集計クエリ",
		},
		{
			Name:        "複雑条件検索",
			Description: "複数条件での週報検索",
			Query:       "SELECT * FROM weekly_reports WHERE status IN ('submitted', 'approved') AND start_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE AND total_work_hours > 35.0 ORDER BY start_date DESC",
			Category:    "複雑クエリ",
		},
		{
			Name:        "サブクエリ検索",
			Description: "サブクエリを使用した提案検索",
			Query:       "SELECT * FROM engineer_proposals WHERE user_id IN (SELECT id FROM users WHERE role = 'engineer' AND is_active = true) AND created_at >= CURRENT_DATE - INTERVAL '60 days'",
			Category:    "サブクエリ",
		},
		{
			Name:        "月別統計",
			Description: "月別週報統計",
			Query:       "SELECT DATE_TRUNC('month', start_date) as month, COUNT(*) as report_count, AVG(total_work_hours) as avg_hours FROM weekly_reports WHERE start_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY DATE_TRUNC('month', start_date) ORDER BY month",
			Category:    "統計クエリ",
		},
		{
			Name:        "ランキングクエリ",
			Description: "ウィンドウ関数を使用したランキング",
			Query:       "SELECT u.name, wr.total_work_hours, ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('month', wr.start_date) ORDER BY wr.total_work_hours DESC) as rank FROM weekly_reports wr JOIN users u ON wr.user_id = u.id WHERE wr.start_date >= CURRENT_DATE - INTERVAL '3 months'",
			Category:    "ウィンドウ関数",
		},
		{
			Name:        "EXISTS検索",
			Description: "EXISTS句を使用した条件検索",
			Query:       "SELECT u.* FROM users u WHERE EXISTS (SELECT 1 FROM weekly_reports wr WHERE wr.user_id = u.id AND wr.status = 'approved' AND wr.start_date >= CURRENT_DATE - INTERVAL '30 days')",
			Category:    "EXISTS クエリ",
		},
	}
}

// RunPerformanceAnalysis パフォーマンス分析の実行
func (qa *QueryAnalyzer) RunPerformanceAnalysis(ctx context.Context) ([]PerformanceResult, error) {
	queries := GetTestQueries()
	results := make([]PerformanceResult, 0, len(queries))
	
	for _, query := range queries {
		log.Printf("分析中: %s", query.Name)
		
		result, err := qa.AnalyzeQuery(ctx, query)
		if err != nil {
			log.Printf("エラー (%s): %v", query.Name, err)
			continue
		}
		
		results = append(results, *result)
		log.Printf("完了: %s (実行時間: %.2fms)", query.Name, result.ExecutionTime)
	}
	
	return results, nil
}

// GenerateReport レポート生成
func GenerateReport(results []PerformanceResult, outputFile string) error {
	file, err := os.Create(outputFile)
	if err != nil {
		return err
	}
	defer file.Close()
	
	// ヘッダー
	fmt.Fprintf(file, "# PostgreSQL クエリパフォーマンス分析レポート\n\n")
	fmt.Fprintf(file, "**生成日時**: %s\n\n", time.Now().Format("2006-01-02 15:04:05"))
	
	// サマリー
	fmt.Fprintf(file, "## サマリー\n\n")
	fmt.Fprintf(file, "- **総クエリ数**: %d\n", len(results))
	
	// パフォーマンス評価別の集計
	performanceCount := make(map[string]int)
	totalExecutionTime := 0.0
	slowestQuery := ""
	slowestTime := 0.0
	
	for _, result := range results {
		performanceCount[result.Performance]++
		totalExecutionTime += result.ExecutionTime
		if result.ExecutionTime > slowestTime {
			slowestTime = result.ExecutionTime
			slowestQuery = result.QueryName
		}
	}
	
	for rating, count := range performanceCount {
		fmt.Fprintf(file, "- **%s**: %d件\n", rating, count)
	}
	
	fmt.Fprintf(file, "- **平均実行時間**: %.2fms\n", totalExecutionTime/float64(len(results)))
	fmt.Fprintf(file, "- **最も遅いクエリ**: %s (%.2fms)\n\n", slowestQuery, slowestTime)
	
	// カテゴリ別結果
	categoryMap := make(map[string][]PerformanceResult)
	for _, result := range results {
		categoryMap[result.Category] = append(categoryMap[result.Category], result)
	}
	
	fmt.Fprintf(file, "## カテゴリ別分析結果\n\n")
	
	for category, categoryResults := range categoryMap {
		fmt.Fprintf(file, "### %s\n\n", category)
		
		// カテゴリ内でソート（実行時間順）
		sort.Slice(categoryResults, func(i, j int) bool {
			return categoryResults[i].ExecutionTime > categoryResults[j].ExecutionTime
		})
		
		for _, result := range categoryResults {
			fmt.Fprintf(file, "#### %s\n\n", result.QueryName)
			fmt.Fprintf(file, "**説明**: %s\n\n", result.Description)
			fmt.Fprintf(file, "**パフォーマンス評価**: %s\n\n", result.Performance)
			fmt.Fprintf(file, "**メトリクス**:\n")
			fmt.Fprintf(file, "- 実行時間: %.2fms\n", result.ExecutionTime)
			fmt.Fprintf(file, "- プランニング時間: %.2fms\n", result.PlanningTime)
			fmt.Fprintf(file, "- 総コスト: %.2f\n", result.TotalCost)
			fmt.Fprintf(file, "- 実際の行数: %d\n", result.ActualRows)
			fmt.Fprintf(file, "- 予測行数: %d\n", result.PlanRows)
			fmt.Fprintf(file, "- バッファヒット: %d\n", result.BufferHits)
			fmt.Fprintf(file, "- バッファリード: %d\n", result.BufferReads)
			
			fmt.Fprintf(file, "\n**実行計画の特徴**:\n")
			features := []string{}
			if result.HasIndexScan {
				features = append(features, "インデックススキャン")
			}
			if result.HasSeqScan {
				features = append(features, "シーケンシャルスキャン")
			}
			if result.HasHashJoin {
				features = append(features, "ハッシュジョイン")
			}
			if result.HasSort {
				features = append(features, "ソート処理")
			}
			if len(features) > 0 {
				fmt.Fprintf(file, "- %s\n", strings.Join(features, ", "))
			} else {
				fmt.Fprintf(file, "- 特記事項なし\n")
			}
			
			if len(result.Recommendations) > 0 {
				fmt.Fprintf(file, "\n**推奨事項**:\n")
				for _, rec := range result.Recommendations {
					fmt.Fprintf(file, "- %s\n", rec)
				}
			}
			
			fmt.Fprintf(file, "\n**クエリ**:\n")
			fmt.Fprintf(file, "```sql\n%s\n```\n\n", result.Query)
			
			fmt.Fprintf(file, "---\n\n")
		}
	}
	
	// 総合推奨事項
	fmt.Fprintf(file, "## 総合推奨事項\n\n")
	
	// よくある問題の集計
	seqScanCount := 0
	slowQueryCount := 0
	highCostCount := 0
	
	for _, result := range results {
		if result.HasSeqScan && !result.HasIndexScan {
			seqScanCount++
		}
		if result.ExecutionTime > 100 {
			slowQueryCount++
		}
		if result.TotalCost > 1000 {
			highCostCount++
		}
	}
	
	if seqScanCount > 0 {
		fmt.Fprintf(file, "### インデックス最適化\n")
		fmt.Fprintf(file, "%d個のクエリでフルテーブルスキャンが発生しています。以下の対策を検討してください：\n\n", seqScanCount)
		fmt.Fprintf(file, "- 頻繁に検索されるカラムにインデックスを追加\n")
		fmt.Fprintf(file, "- 複合インデックスの利用を検討\n")
		fmt.Fprintf(file, "- 部分インデックスの活用\n\n")
	}
	
	if slowQueryCount > 0 {
		fmt.Fprintf(file, "### パフォーマンス改善\n")
		fmt.Fprintf(file, "%d個のクエリで実行時間が100ms以上です。以下の対策を検討してください：\n\n", slowQueryCount)
		fmt.Fprintf(file, "- クエリの書き換え・最適化\n")
		fmt.Fprintf(file, "- 適切なLIMIT句の使用\n")
		fmt.Fprintf(file, "- 結果のキャッシュ実装\n\n")
	}
	
	if highCostCount > 0 {
		fmt.Fprintf(file, "### 高コストクエリ最適化\n")
		fmt.Fprintf(file, "%d個のクエリでコストが1000以上です。以下の対策を検討してください：\n\n", highCostCount)
		fmt.Fprintf(file, "- JOINの順序見直し\n")
		fmt.Fprintf(file, "- WHERE条件の最適化\n")
		fmt.Fprintf(file, "- 統計情報の更新 (ANALYZE)\n\n")
	}
	
	return nil
}

// main メイン関数
func main() {
	// 環境変数から設定を読み取り
	config := DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		Database: getEnv("DB_NAME", "monstera_test"),
		User:     getEnv("DB_USER", "monstera"),
		Password: getEnv("DB_PASSWORD", "password"),
		SSLMode:  getEnv("DB_SSL_MODE", "disable"),
	}
	
	// アナライザー作成
	analyzer, err := NewQueryAnalyzer(config)
	if err != nil {
		log.Fatalf("アナライザー作成エラー: %v", err)
	}
	defer analyzer.Close()
	
	log.Println("PostgreSQL クエリパフォーマンス分析を開始します...")
	
	// 分析実行
	ctx := context.Background()
	results, err := analyzer.RunPerformanceAnalysis(ctx)
	if err != nil {
		log.Fatalf("分析実行エラー: %v", err)
	}
	
	// JSON結果出力
	jsonFile := fmt.Sprintf("query_performance_analysis_%s.json", time.Now().Format("20060102_150405"))
	jsonData, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		log.Fatalf("JSON生成エラー: %v", err)
	}
	
	if err := os.WriteFile(jsonFile, jsonData, 0644); err != nil {
		log.Fatalf("JSONファイル出力エラー: %v", err)
	}
	
	// マークダウンレポート生成
	reportFile := fmt.Sprintf("query_performance_report_%s.md", time.Now().Format("20060102_150405"))
	if err := GenerateReport(results, reportFile); err != nil {
		log.Fatalf("レポート生成エラー: %v", err)
	}
	
	log.Printf("分析完了:")
	log.Printf("- JSON結果: %s", jsonFile)
	log.Printf("- レポート: %s", reportFile)
	log.Printf("- 分析クエリ数: %d", len(results))
	
	// サマリー表示
	fmt.Println("\n=== パフォーマンス分析サマリー ===")
	performanceCount := make(map[string]int)
	totalTime := 0.0
	
	for _, result := range results {
		performanceCount[result.Performance]++
		totalTime += result.ExecutionTime
	}
	
	for rating, count := range performanceCount {
		fmt.Printf("%-10s: %d件\n", rating, count)
	}
	
	fmt.Printf("平均実行時間: %.2fms\n", totalTime/float64(len(results)))
}

// getEnv 環境変数取得（デフォルト値付き）
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}