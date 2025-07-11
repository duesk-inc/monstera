#!/bin/bash

# =============================================================================
# PostgreSQL EXPLAIN ANALYZE パフォーマンステストスクリプト
# =============================================================================

set -euo pipefail

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONTAINER_NAME="monstera-postgres-test"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-monstera_test}"
DB_USER="${DB_USER:-monstera}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# テスト結果保存ディレクトリ
RESULTS_DIR="${PROJECT_ROOT}/performance-test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_FILE="${RESULTS_DIR}/explain_analyze_${TIMESTAMP}.md"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# PostgreSQL接続テスト
test_connection() {
    log_info "PostgreSQL接続テスト..."
    
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        log_success "PostgreSQL接続成功"
        return 0
    else
        log_error "PostgreSQL接続失敗"
        return 1
    fi
}

# 結果ディレクトリ作成
create_results_dir() {
    if [ ! -d "${RESULTS_DIR}" ]; then
        mkdir -p "${RESULTS_DIR}"
        log_info "結果ディレクトリを作成: ${RESULTS_DIR}"
    fi
}

# EXPLAIN ANALYZE実行関数
execute_explain_analyze() {
    local query_name="$1"
    local query="$2"
    local description="$3"
    
    log_info "実行中: ${query_name}"
    
    # EXPLAIN ANALYZEクエリ作成
    local explain_query="EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}"
    
    # クエリ実行
    local result=$(docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "${explain_query}" 2>/dev/null || echo "ERROR")
    
    if [ "${result}" = "ERROR" ]; then
        log_error "${query_name} 実行エラー"
        echo "## ${query_name} - FAILED" >> "${RESULT_FILE}"
        echo "" >> "${RESULT_FILE}"
        echo "**説明**: ${description}" >> "${RESULT_FILE}"
        echo "" >> "${RESULT_FILE}"
        echo "**エラー**: クエリ実行に失敗しました" >> "${RESULT_FILE}"
        echo "" >> "${RESULT_FILE}"
        return 1
    fi
    
    # JSON結果をパース
    local execution_time=$(echo "${result}" | jq -r '.[0]."Execution Time"' 2>/dev/null || echo "N/A")
    local planning_time=$(echo "${result}" | jq -r '.[0]."Planning Time"' 2>/dev/null || echo "N/A")
    local total_cost=$(echo "${result}" | jq -r '.[0].Plan."Total Cost"' 2>/dev/null || echo "N/A")
    local actual_rows=$(echo "${result}" | jq -r '.[0].Plan."Actual Rows"' 2>/dev/null || echo "N/A")
    
    # 結果をファイルに出力
    cat >> "${RESULT_FILE}" << EOF
## ${query_name}

**説明**: ${description}

**パフォーマンス結果**:
- 実行時間: ${execution_time} ms
- プランニング時間: ${planning_time} ms
- 総コスト: ${total_cost}
- 実際の行数: ${actual_rows}

**クエリ**:
\`\`\`sql
${query}
\`\`\`

**実行計画 (JSON)**:
\`\`\`json
${result}
\`\`\`

---

EOF
    
    log_success "${query_name} 完了 (実行時間: ${execution_time}ms)"
}

# 基本的なクエリテスト
run_basic_queries() {
    log_info "基本クエリのEXPLAIN ANALYZE実行..."
    
    # 1. 単純なSELECT
    execute_explain_analyze \
        "基本的なユーザー取得" \
        "SELECT id, name, email, role FROM users WHERE is_active = true LIMIT 10;" \
        "アクティブユーザーの基本情報取得"
    
    # 2. JOINクエリ
    execute_explain_analyze \
        "週報とユーザーJOIN" \
        "SELECT wr.id, wr.start_date, wr.status, u.name FROM weekly_reports wr JOIN users u ON wr.user_id = u.id WHERE wr.start_date >= CURRENT_DATE - INTERVAL '30 days' LIMIT 20;" \
        "過去30日の週報をユーザー情報とJOIN"
    
    # 3. 集計クエリ
    execute_explain_analyze \
        "ユーザー別週報集計" \
        "SELECT u.name, COUNT(wr.id) as report_count FROM users u LEFT JOIN weekly_reports wr ON u.id = wr.user_id GROUP BY u.id, u.name ORDER BY report_count DESC LIMIT 10;" \
        "ユーザー別の週報件数集計"
    
    # 4. 複雑なWHERE条件
    execute_explain_analyze \
        "複雑な条件での週報検索" \
        "SELECT * FROM weekly_reports WHERE status IN ('submitted', 'approved') AND start_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE AND total_work_hours > 35.0 ORDER BY start_date DESC;" \
        "特定ステータスと日付範囲、勤務時間条件での週報検索"
    
    # 5. サブクエリ
    execute_explain_analyze \
        "サブクエリを使用した提案検索" \
        "SELECT * FROM engineer_proposals WHERE user_id IN (SELECT id FROM users WHERE role = 'engineer' AND is_active = true) AND created_at >= CURRENT_DATE - INTERVAL '60 days';" \
        "アクティブエンジニアの過去60日の提案"
}

# 複雑なクエリテスト
run_complex_queries() {
    log_info "複雑なクエリのEXPLAIN ANALYZE実行..."
    
    # 1. 複数テーブルJOIN
    execute_explain_analyze \
        "多テーブルJOIN (提案-ユーザー-プロジェクト)" \
        "SELECT ep.id, ep.status, u.name as user_name, p.name as project_name FROM engineer_proposals ep JOIN users u ON ep.user_id = u.id LEFT JOIN projects p ON ep.project_id = p.id WHERE ep.created_at >= CURRENT_DATE - INTERVAL '30 days' ORDER BY ep.created_at DESC LIMIT 50;" \
        "提案、ユーザー、プロジェクトの多テーブルJOIN"
    
    # 2. 統計クエリ
    execute_explain_analyze \
        "月別週報統計" \
        "SELECT DATE_TRUNC('month', start_date) as month, COUNT(*) as report_count, AVG(total_work_hours) as avg_hours FROM weekly_reports WHERE start_date >= CURRENT_DATE - INTERVAL '12 months' GROUP BY DATE_TRUNC('month', start_date) ORDER BY month;" \
        "過去1年間の月別週報統計"
    
    # 3. ウィンドウ関数
    execute_explain_analyze \
        "ランキングクエリ (ウィンドウ関数)" \
        "SELECT u.name, wr.total_work_hours, ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('month', wr.start_date) ORDER BY wr.total_work_hours DESC) as rank FROM weekly_reports wr JOIN users u ON wr.user_id = u.id WHERE wr.start_date >= CURRENT_DATE - INTERVAL '3 months';" \
        "月別勤務時間ランキング (ウィンドウ関数使用)"
    
    # 4. 存在チェック
    execute_explain_analyze \
        "EXISTS句を使用した条件検索" \
        "SELECT u.* FROM users u WHERE EXISTS (SELECT 1 FROM weekly_reports wr WHERE wr.user_id = u.id AND wr.status = 'approved' AND wr.start_date >= CURRENT_DATE - INTERVAL '30 days');" \
        "過去30日に承認された週報があるユーザー検索"
    
    # 5. CASE文と複雑な集計
    execute_explain_analyze \
        "条件分岐集計クエリ" \
        "SELECT u.name, COUNT(CASE WHEN wr.status = 'approved' THEN 1 END) as approved_count, COUNT(CASE WHEN wr.status = 'submitted' THEN 1 END) as submitted_count, COUNT(CASE WHEN wr.status = 'draft' THEN 1 END) as draft_count FROM users u LEFT JOIN weekly_reports wr ON u.id = wr.user_id GROUP BY u.id, u.name HAVING COUNT(wr.id) > 0;" \
        "ユーザー別ステータス別週報件数集計"
}

# インデックス効果テスト
run_index_effectiveness_test() {
    log_info "インデックス効果のテスト..."
    
    # テーブル統計情報更新
    docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "ANALYZE;" > /dev/null 2>&1
    
    # 1. 主キーでの検索
    execute_explain_analyze \
        "主キー検索 (UUID)" \
        "SELECT * FROM users WHERE id = (SELECT id FROM users LIMIT 1);" \
        "UUID主キーによる単一レコード検索"
    
    # 2. インデックスカラムでの検索
    execute_explain_analyze \
        "インデックス利用検索 (email)" \
        "SELECT * FROM users WHERE email LIKE '%test%';" \
        "email カラムでのLIKE検索"
    
    # 3. 複合インデックスでの検索
    execute_explain_analyze \
        "複合インデックス検索 (user_id + start_date)" \
        "SELECT * FROM weekly_reports WHERE user_id = (SELECT id FROM users LIMIT 1) AND start_date >= CURRENT_DATE - INTERVAL '30 days';" \
        "user_id と start_date の複合条件検索"
    
    # 4. フルテーブルスキャン
    execute_explain_analyze \
        "フルテーブルスキャン" \
        "SELECT COUNT(*) FROM weekly_reports WHERE weekly_remarks LIKE '%テスト%';" \
        "インデックスが効かないカラムでの検索"
}

# パフォーマンス問題クエリの特定
run_slow_query_analysis() {
    log_info "潜在的にスローなクエリの分析..."
    
    # 1. 大量JOINクエリ
    execute_explain_analyze \
        "大量データJOIN" \
        "SELECT wr.*, u.name, u.email, dr.date, dr.work_hours FROM weekly_reports wr JOIN users u ON wr.user_id = u.id LEFT JOIN daily_records dr ON wr.id = dr.weekly_report_id WHERE wr.start_date >= CURRENT_DATE - INTERVAL '90 days';" \
        "週報-ユーザー-日次記録の大量JOIN"
    
    # 2. OR条件でのスキャン
    execute_explain_analyze \
        "OR条件検索" \
        "SELECT * FROM users WHERE email LIKE '%admin%' OR name LIKE '%テスト%' OR role = 'manager';" \
        "複数OR条件による検索"
    
    # 3. ソートが重いクエリ
    execute_explain_analyze \
        "大量データソート" \
        "SELECT wr.*, u.name FROM weekly_reports wr JOIN users u ON wr.user_id = u.id ORDER BY wr.total_work_hours DESC, wr.start_date DESC;" \
        "全週報データの複数カラムソート"
    
    # 4. GROUP BY with HAVING
    execute_explain_analyze \
        "複雑なGROUP BY" \
        "SELECT u.name, COUNT(*) as report_count, AVG(wr.total_work_hours) as avg_hours FROM users u JOIN weekly_reports wr ON u.id = wr.user_id GROUP BY u.id, u.name HAVING COUNT(*) > 1 AND AVG(wr.total_work_hours) > 35.0;" \
        "GROUP BY と HAVING 句を使用した複雑な集計"
}

# 実際のアプリケーションクエリテスト
run_application_queries() {
    log_info "実際のアプリケーションクエリのテスト..."
    
    # 実際のリポジトリからクエリを抽出してテスト
    # (engineer_proposal_repository.go から)
    execute_explain_analyze \
        "提案トレンド分析クエリ" \
        "SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as total_proposals, SUM(CASE WHEN status = 'proceed' THEN 1 ELSE 0 END) as proceed_count FROM engineer_proposals WHERE user_id = (SELECT id FROM users WHERE role = 'engineer' LIMIT 1) AND created_at >= CURRENT_DATE - INTERVAL '6 months' GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month;" \
        "エンジニア提案の月別トレンド分析"
    
    # (weekly_report_repository.go から想定)
    execute_explain_analyze \
        "週報一覧取得クエリ" \
        "SELECT wr.*, u.name as user_name FROM weekly_reports wr JOIN users u ON wr.user_id = u.id WHERE wr.status = 'submitted' ORDER BY wr.created_at DESC LIMIT 20 OFFSET 0;" \
        "管理者向け週報一覧取得 (ページネーション)"
    
    # ダッシュボード用集計クエリ
    execute_explain_analyze \
        "ダッシュボード統計クエリ" \
        "SELECT (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users, (SELECT COUNT(*) FROM weekly_reports WHERE status = 'submitted') as pending_reports, (SELECT COUNT(*) FROM engineer_proposals WHERE status = 'proposed') as pending_proposals;" \
        "ダッシュボード表示用の各種件数集計"
}

# 最適化提案の生成
generate_optimization_suggestions() {
    log_info "最適化提案の生成..."
    
    cat >> "${RESULT_FILE}" << 'EOF'
# 最適化提案

## 一般的な最適化ポイント

### 1. インデックス最適化
- **頻繁に検索されるカラム**: email, status, created_at, start_date
- **複合インデックス**: (user_id, start_date), (status, created_at)
- **部分インデックス**: `WHERE is_active = true` 条件付きインデックス

### 2. クエリ最適化
- **LIMIT句の活用**: 大量データを扱う際は必ずLIMITを設定
- **EXISTS vs IN**: サブクエリではEXISTSの方が効率的な場合が多い
- **JOINの順序**: 結果セットが小さくなる順序でJOIN

### 3. 統計情報の更新
```sql
-- 定期的な統計情報更新
ANALYZE;

-- 特定テーブルの統計情報更新
ANALYZE table_name;
```

### 4. 設定パラメータ最適化
- `work_mem`: ソート・ハッシュ操作用メモリ
- `shared_buffers`: バッファキャッシュサイズ
- `effective_cache_size`: OSのファイルシステムキャッシュサイズ

## 推奨インデックス

### 基本インデックス
```sql
-- ユーザーテーブル
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- 週報テーブル
CREATE INDEX idx_weekly_reports_user_start_date ON weekly_reports(user_id, start_date);
CREATE INDEX idx_weekly_reports_status_created ON weekly_reports(status, created_at);

-- 提案テーブル
CREATE INDEX idx_engineer_proposals_user_created ON engineer_proposals(user_id, created_at);
CREATE INDEX idx_engineer_proposals_status_created ON engineer_proposals(status, created_at);
```

### 部分インデックス
```sql
-- アクティブユーザーのみ
CREATE INDEX idx_users_active_email ON users(email) WHERE is_active = true;

-- 提出済み週報のみ
CREATE INDEX idx_weekly_reports_submitted ON weekly_reports(user_id, start_date) 
WHERE status IN ('submitted', 'approved');
```

### GINインデックス (全文検索用)
```sql
-- 週報の全文検索
CREATE INDEX idx_weekly_reports_remarks_gin ON weekly_reports 
USING gin(to_tsvector('japanese', weekly_remarks));
```

## モニタリング推奨事項

### 1. スロークエリの監視
```sql
-- log_min_duration_statement を設定
-- postgresql.conf または ALTER SYSTEM
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1秒以上のクエリをログ
```

### 2. インデックス使用状況の確認
```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 3. テーブル統計の確認
```sql
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

EOF
}

# パフォーマンステスト結果の分析
analyze_performance_results() {
    log_info "パフォーマンステスト結果の分析..."
    
    # 実行時間が長いクエリを特定
    local slow_queries=$(grep -A 2 "実行時間:" "${RESULT_FILE}" | grep -E "[0-9]+\.[0-9]+ ms" | sort -rn -k 2 | head -5)
    
    cat >> "${RESULT_FILE}" << EOF

# パフォーマンス分析結果

## 実行時間の長いクエリ TOP 5

\`\`\`
${slow_queries}
\`\`\`

## 改善が必要なクエリの特徴

1. **フルテーブルスキャン**: インデックスが効いていないクエリ
2. **大量JOIN**: 結果セットが大きくなるJOIN操作
3. **ソート処理**: ORDER BY での大量データソート
4. **集計処理**: GROUP BY での複雑な集計

## 次のステップ

1. インデックスの追加・最適化
2. クエリの書き換え・最適化
3. アプリケーション側でのキャッシュ実装
4. 定期的なVACUUM・ANALYZE実行

EOF
}

# レポート生成
generate_report() {
    log_info "パフォーマンステストレポート生成中..."
    
    # ヘッダー情報
    cat > "${RESULT_FILE}" << EOF
# PostgreSQL EXPLAIN ANALYZE パフォーマンステスト結果

**実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
**データベース**: ${DB_NAME}
**PostgreSQLバージョン**: $(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT version();" | head -1)

---

EOF

    # 基本クエリテスト
    run_basic_queries
    
    # 複雑なクエリテスト
    run_complex_queries
    
    # インデックス効果テスト
    run_index_effectiveness_test
    
    # スローキエリ分析
    run_slow_query_analysis
    
    # アプリケーションクエリテスト
    run_application_queries
    
    # 最適化提案生成
    generate_optimization_suggestions
    
    # 結果分析
    analyze_performance_results
    
    log_success "レポート生成完了: ${RESULT_FILE}"
}

# 簡易パフォーマンステスト実行
run_quick_test() {
    log_info "簡易パフォーマンステスト実行..."
    
    # 基本的なクエリのみテスト
    cat > "${RESULT_FILE}" << EOF
# PostgreSQL 簡易パフォーマンステスト結果

**実行日時**: $(date '+%Y-%m-%d %H:%M:%S')

---

EOF
    
    run_basic_queries
    
    log_success "簡易テスト完了: ${RESULT_FILE}"
}

# メイン処理
main() {
    log_info "=== PostgreSQL EXPLAIN ANALYZE パフォーマンステスト開始 ==="
    
    # 引数解析
    local test_type="${1:-full}"
    
    # 事前チェック
    test_connection || exit 1
    create_results_dir
    
    # jqコマンドの確認
    if ! command -v jq &> /dev/null; then
        log_warning "jqコマンドが見つかりません。JSONパースができない可能性があります"
    fi
    
    case "${test_type}" in
        "full")
            generate_report
            ;;
        "quick")
            run_quick_test
            ;;
        "basic")
            cat > "${RESULT_FILE}" << EOF
# PostgreSQL 基本クエリテスト結果
**実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
---
EOF
            run_basic_queries
            ;;
        "complex")
            cat > "${RESULT_FILE}" << EOF
# PostgreSQL 複雑クエリテスト結果
**実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
---
EOF
            run_complex_queries
            ;;
        "help"|"--help"|"-h")
            echo "使用方法: $0 [test_type]"
            echo ""
            echo "Test Types:"
            echo "  full     全テスト実行（デフォルト）"
            echo "  quick    簡易テスト実行"
            echo "  basic    基本クエリのみ"
            echo "  complex  複雑クエリのみ"
            echo "  help     ヘルプ表示"
            exit 0
            ;;
        *)
            log_error "不正なテストタイプ: ${test_type}"
            log_info "使用方法: $0 [full|quick|basic|complex|help]"
            exit 1
            ;;
    esac
    
    # 結果ファイルの場所を表示
    echo ""
    log_success "=== テスト完了 ==="
    log_info "結果ファイル: ${RESULT_FILE}"
    
    if [ -f "${RESULT_FILE}" ]; then
        local file_size=$(du -h "${RESULT_FILE}" | cut -f1)
        log_info "ファイルサイズ: ${file_size}"
    fi
}

# スクリプト実行
main "$@"