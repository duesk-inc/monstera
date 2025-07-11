#!/bin/bash

# =============================================================================
# PostgreSQL パフォーマンス分析統合実行スクリプト
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

# 結果保存ディレクトリ
RESULTS_DIR="${PROJECT_ROOT}/performance-analysis-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件チェック..."
    
    # PostgreSQL接続確認
    if ! docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        log_error "PostgreSQLに接続できません"
        log_info "コンテナを起動してください: ./scripts/postgresql-container-manager.sh start"
        return 1
    fi
    
    # 必要なコマンド確認
    local missing_commands=()
    
    if ! command -v jq &> /dev/null; then
        missing_commands+=("jq")
    fi
    
    if ! command -v go &> /dev/null; then
        missing_commands+=("go")
    fi
    
    if [ ${#missing_commands[@]} -gt 0 ]; then
        log_warning "以下のコマンドが見つかりません: ${missing_commands[*]}"
        log_info "一部の分析機能が制限される可能性があります"
    fi
    
    log_success "前提条件チェック完了"
}

# 結果ディレクトリ作成
create_results_dir() {
    if [ ! -d "${RESULTS_DIR}" ]; then
        mkdir -p "${RESULTS_DIR}"
        log_info "結果ディレクトリを作成: ${RESULTS_DIR}"
    fi
    
    # タイムスタンプ付きサブディレクトリ
    ANALYSIS_DIR="${RESULTS_DIR}/analysis_${TIMESTAMP}"
    mkdir -p "${ANALYSIS_DIR}"
    log_info "分析結果ディレクトリ: ${ANALYSIS_DIR}"
}

# 基本統計情報収集
collect_basic_stats() {
    log_info "基本統計情報収集..."
    
    local stats_file="${ANALYSIS_DIR}/basic_stats.txt"
    
    {
        echo "=== PostgreSQL基本統計情報 ==="
        echo "収集日時: $(date)"
        echo ""
        
        # データベース情報
        echo "--- データベース情報 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                current_database() as database,
                version() as version,
                pg_size_pretty(pg_database_size(current_database())) as size;
        "
        
        echo ""
        echo "--- 接続情報 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                state,
                COUNT(*) as count
            FROM pg_stat_activity 
            WHERE datname = current_database()
            GROUP BY state;
        "
        
        echo ""
        echo "--- テーブル数 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public';
        "
        
        echo ""
        echo "--- インデックス数 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
        "
        
    } > "${stats_file}"
    
    log_success "基本統計情報を保存: ${stats_file}"
}

# パフォーマンス監視レポート実行
run_performance_monitor() {
    log_info "パフォーマンス監視レポート実行..."
    
    local monitor_file="${ANALYSIS_DIR}/performance_monitor_report.txt"
    
    # PostgreSQL監視クエリ実行
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${SCRIPT_DIR}/postgresql-performance-monitor.sql" > "${monitor_file}" 2>&1
    
    log_success "監視レポートを保存: ${monitor_file}"
}

# EXPLAIN ANALYZE分析実行
run_explain_analyze() {
    log_info "EXPLAIN ANALYZE分析実行..."
    
    # シェルスクリプト版EXPLAIN ANALYZE実行
    "${SCRIPT_DIR}/explain-analyze-performance-test.sh" full
    
    # 結果ファイルを分析ディレクトリに移動
    local latest_explain_file=$(ls -t "${PROJECT_ROOT}/performance-test-results"/explain_analyze_*.md 2>/dev/null | head -1 || echo "")
    
    if [ -n "${latest_explain_file}" ] && [ -f "${latest_explain_file}" ]; then
        cp "${latest_explain_file}" "${ANALYSIS_DIR}/explain_analyze_report.md"
        log_success "EXPLAIN ANALYZE結果をコピー: ${ANALYSIS_DIR}/explain_analyze_report.md"
    else
        log_warning "EXPLAIN ANALYZE結果ファイルが見つかりません"
    fi
}

# Go版パフォーマンス分析実行
run_go_analyzer() {
    log_info "Go版パフォーマンス分析実行..."
    
    # 環境変数設定
    export DB_HOST="${DB_HOST}"
    export DB_PORT="${DB_PORT}"
    export DB_NAME="${DB_NAME}"
    export DB_USER="${DB_USER}"
    export DB_PASSWORD="${DB_PASSWORD}"
    export DB_SSL_MODE="disable"
    
    # Go分析器実行
    cd "${SCRIPT_DIR}"
    
    if command -v go &> /dev/null; then
        # Go依存関係取得
        if [ ! -f "go.mod" ]; then
            go mod init query-performance-analyzer
            go mod tidy
        fi
        
        # PostgreSQLドライバー追加
        go get github.com/lib/pq
        
        # 分析実行
        if go run query-performance-analyzer.go; then
            # 結果ファイルを移動
            for file in query_performance_*.json query_performance_*.md; do
                if [ -f "${file}" ]; then
                    mv "${file}" "${ANALYSIS_DIR}/"
                    log_success "Go分析結果を移動: ${file}"
                fi
            done
        else
            log_warning "Go版分析器の実行に失敗しました"
        fi
    else
        log_warning "Goコマンドが見つからないため、Go版分析器をスキップします"
    fi
    
    cd "${PROJECT_ROOT}"
}

# インデックス使用状況分析
analyze_index_usage() {
    log_info "インデックス使用状況分析..."
    
    local index_file="${ANALYSIS_DIR}/index_usage_analysis.txt"
    
    {
        echo "=== インデックス使用状況分析 ==="
        echo "分析日時: $(date)"
        echo ""
        
        echo "--- 最も使用されているインデックス TOP 10 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan as scans,
                idx_tup_read as tuples_read,
                pg_size_pretty(pg_relation_size(indexrelname::regclass)) as size
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            LIMIT 10;
        "
        
        echo ""
        echo "--- 未使用インデックス ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelname::regclass)) as wasted_size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
                AND indexrelname NOT LIKE '%_pkey'
            ORDER BY pg_relation_size(indexrelname::regclass) DESC;
        "
        
        echo ""
        echo "--- インデックスサイズ TOP 10 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelname::regclass)) as size,
                idx_scan as scans
            FROM pg_stat_user_indexes
            ORDER BY pg_relation_size(indexrelname::regclass) DESC
            LIMIT 10;
        "
        
    } > "${index_file}"
    
    log_success "インデックス分析を保存: ${index_file}"
}

# スロークエリ分析
analyze_slow_queries() {
    log_info "スロークエリ分析..."
    
    local slow_query_file="${ANALYSIS_DIR}/slow_query_analysis.txt"
    
    {
        echo "=== スロークエリ分析 ==="
        echo "分析日時: $(date)"
        echo ""
        
        echo "--- 現在実行中の長時間クエリ ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                pid,
                usename,
                state,
                ROUND(EXTRACT(EPOCH FROM (now() - query_start))::numeric, 2) as duration_seconds,
                LEFT(query, 100) as query_preview
            FROM pg_stat_activity
            WHERE datname = current_database()
                AND state = 'active'
                AND query_start < now() - INTERVAL '5 seconds'
            ORDER BY duration_seconds DESC;
        "
        
        echo ""
        echo "--- pg_stat_statements情報（有効な場合） ---"
        # pg_stat_statementsが有効かチェック
        if docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements';" 2>/dev/null | grep -q "1"; then
            docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
                SELECT 
                    calls,
                    ROUND(total_exec_time::numeric, 2) as total_time_ms,
                    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
                    ROUND(max_exec_time::numeric, 2) as max_time_ms,
                    LEFT(query, 100) as query_preview
                FROM pg_stat_statements
                ORDER BY total_exec_time DESC
                LIMIT 10;
            "
        else
            echo "pg_stat_statements拡張が無効です"
        fi
        
    } > "${slow_query_file}"
    
    log_success "スロークエリ分析を保存: ${slow_query_file}"
}

# テーブル統計情報分析
analyze_table_stats() {
    log_info "テーブル統計情報分析..."
    
    local table_stats_file="${ANALYSIS_DIR}/table_statistics.txt"
    
    {
        echo "=== テーブル統計情報分析 ==="
        echo "分析日時: $(date)"
        echo ""
        
        echo "--- テーブルサイズ TOP 10 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
                pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10;
        "
        
        echo ""
        echo "--- 更新頻度の高いテーブル ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples,
                ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_ratio
            FROM pg_stat_user_tables
            WHERE n_tup_upd + n_tup_del > 0
            ORDER BY n_tup_upd + n_tup_del DESC
            LIMIT 10;
        "
        
        echo ""
        echo "--- VACUUM/ANALYZE実行履歴 ---"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
            SELECT 
                schemaname,
                tablename,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze,
                vacuum_count,
                autovacuum_count,
                analyze_count,
                autoanalyze_count
            FROM pg_stat_user_tables
            ORDER BY COALESCE(last_analyze, last_autoanalyze, '1970-01-01'::timestamp) ASC;
        "
        
    } > "${table_stats_file}"
    
    log_success "テーブル統計情報を保存: ${table_stats_file}"
}

# 最適化推奨事項生成
generate_optimization_recommendations() {
    log_info "最適化推奨事項生成..."
    
    local recommendations_file="${ANALYSIS_DIR}/optimization_recommendations.md"
    
    cat > "${recommendations_file}" << 'EOF'
# PostgreSQL 最適化推奨事項

## 概要

このレポートは自動分析に基づく最適化推奨事項です。

## 緊急対応が必要な項目

### 1. 未使用インデックスの削除

以下のクエリで未使用インデックスを確認し、不要なものは削除を検討してください：

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as wasted_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelname::regclass) DESC;
```

### 2. デッドタプルの多いテーブル

以下のクエリでVACUUMが必要なテーブルを確認してください：

```sql
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
    AND 100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0) > 10
ORDER BY dead_ratio DESC;
```

### 3. 統計情報の更新

古い統計情報を持つテーブルにANALYZEを実行してください：

```sql
-- 全テーブルの統計情報更新
ANALYZE;

-- 特定テーブルの更新例
-- ANALYZE table_name;
```

## 定期メンテナンス項目

### 1. 日次メンテナンス

```sql
-- 軽量なVACUUM（毎日実行推奨）
VACUUM (VERBOSE, ANALYZE);
```

### 2. 週次メンテナンス

```sql
-- インデックス再構築（週1回推奨）
REINDEX DATABASE CONCURRENTLY your_database_name;
```

### 3. 月次メンテナンス

```sql
-- フルVACUUM（月1回推奨、メンテナンス時間中）
VACUUM (FULL, VERBOSE, ANALYZE);
```

## パフォーマンス設定推奨事項

### 1. PostgreSQL設定パラメータ

```sql
-- 共有バッファサイズ（物理メモリの25%程度）
ALTER SYSTEM SET shared_buffers = '256MB';

-- ワークメモリ（接続数を考慮して設定）
ALTER SYSTEM SET work_mem = '16MB';

-- メンテナンス用ワークメモリ
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- 実効キャッシュサイズ（物理メモリの75%程度）
ALTER SYSTEM SET effective_cache_size = '1GB';

-- 設定反映
SELECT pg_reload_conf();
```

### 2. インデックス戦略

#### 推奨インデックス

```sql
-- 基本的な検索カラム
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_active ON users(is_active) WHERE is_active = true;

-- 複合インデックス
CREATE INDEX CONCURRENTLY idx_weekly_reports_user_date ON weekly_reports(user_id, start_date);
CREATE INDEX CONCURRENTLY idx_engineer_proposals_status_created ON engineer_proposals(status, created_at);

-- 部分インデックス
CREATE INDEX CONCURRENTLY idx_weekly_reports_submitted ON weekly_reports(user_id, start_date) 
WHERE status IN ('submitted', 'approved');
```

#### GINインデックス（全文検索用）

```sql
-- テキスト検索用
CREATE INDEX CONCURRENTLY idx_weekly_reports_remarks_gin ON weekly_reports 
USING gin(to_tsvector('english', weekly_remarks));
```

## 監視設定推奨事項

### 1. スロークエリログ設定

```sql
-- 1秒以上のクエリをログに記録
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- その他の有用なログ設定
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;

-- 設定反映
SELECT pg_reload_conf();
```

### 2. 統計拡張の有効化

```sql
-- pg_stat_statements拡張（クエリ統計用）
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- auto_explain拡張（自動実行計画ログ）
-- postgresql.conf に以下を追加:
-- shared_preload_libraries = 'auto_explain'
-- auto_explain.log_min_duration = 1000
```

## アプリケーション側の推奨事項

### 1. クエリ最適化

- **LIMIT句の使用**: 大量データを扱う場合は必ずLIMITを設定
- **適切なインデックス利用**: WHERE句に使用するカラムにインデックスを作成
- **JOIN順序の最適化**: 小さいテーブルから大きいテーブルへJOIN

### 2. 接続プール設定

- **max_connections**: PostgreSQL側の最大接続数調整
- **connection pooling**: アプリケーション側でコネクションプール実装

### 3. キャッシュ戦略

- **アプリケーションレベルキャッシュ**: 頻繁にアクセスされるデータのキャッシュ
- **クエリ結果キャッシュ**: 重いクエリの結果キャッシュ

## 次のステップ

1. **緊急対応項目**の実施（未使用インデックス削除、VACUUM実行）
2. **定期メンテナンス**の自動化設定
3. **監視システム**の導入・設定
4. **1ヶ月後の再評価**で効果測定

## 参考資料

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)
EOF
    
    log_success "最適化推奨事項を保存: ${recommendations_file}"
}

# 総合レポート生成
generate_comprehensive_report() {
    log_info "総合レポート生成..."
    
    local report_file="${ANALYSIS_DIR}/comprehensive_performance_report.md"
    
    cat > "${report_file}" << EOF
# PostgreSQL パフォーマンス分析総合レポート

**分析実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
**データベース**: ${DB_NAME}
**分析ディレクトリ**: ${ANALYSIS_DIR}

## レポート概要

このレポートは、PostgreSQLデータベースの包括的なパフォーマンス分析結果です。

## 分析内容

### 1. 基本統計情報
- ファイル: \`basic_stats.txt\`
- データベースサイズ、接続数、テーブル数などの基本情報

### 2. パフォーマンス監視レポート
- ファイル: \`performance_monitor_report.txt\`
- 詳細な統計情報、インデックス使用状況、バッファキャッシュ情報

### 3. EXPLAIN ANALYZE分析
- ファイル: \`explain_analyze_report.md\`
- 実際のクエリ実行計画と性能測定結果

### 4. Go版詳細分析
- ファイル: \`query_performance_*.json\`, \`query_performance_*.md\`
- 構造化されたパフォーマンス分析とJSON形式の詳細データ

### 5. インデックス使用状況分析
- ファイル: \`index_usage_analysis.txt\`
- インデックスの使用頻度と最適化可能性

### 6. スロークエリ分析
- ファイル: \`slow_query_analysis.txt\`
- 実行時間の長いクエリの特定と分析

### 7. テーブル統計情報
- ファイル: \`table_statistics.txt\`
- テーブルサイズ、更新頻度、VACUUM履歴

### 8. 最適化推奨事項
- ファイル: \`optimization_recommendations.md\`
- 具体的な最適化手順と推奨事項

## 重要な発見事項

### 🚨 緊急対応が必要
$(if [ -f "${ANALYSIS_DIR}/performance_monitor_report.txt" ]; then
    if grep -q "dead_tuple_ratio" "${ANALYSIS_DIR}/performance_monitor_report.txt" 2>/dev/null; then
        echo "- デッドタプルが多いテーブルが検出されました"
    fi
    if grep -q "未使用インデックス" "${ANALYSIS_DIR}/index_usage_analysis.txt" 2>/dev/null; then
        echo "- 未使用インデックスが検出されました"
    fi
else
    echo "- 詳細な分析結果を確認してください"
fi)

### ⚠️ 注意が必要
- 実行時間の長いクエリの確認
- バッファキャッシュヒット率の改善
- 統計情報の定期更新

### ✅ 良好な状態
- 基本的なデータベース構造
- 主要なインデックス設定

## 推奨される次のアクション

1. **即座に実行**:
   - \`optimization_recommendations.md\` の緊急対応項目を確認
   - 必要に応じてVACUUM実行

2. **1週間以内**:
   - 未使用インデックスの削除検討
   - スロークエリの最適化

3. **1ヶ月以内**:
   - 定期メンテナンスの自動化
   - 監視システムの強化

## ファイル一覧

\`\`\`
$(ls -la "${ANALYSIS_DIR}" | tail -n +2)
\`\`\`

## 実行コマンド

このレポートを再生成するには：

\`\`\`bash
./scripts/run-performance-analysis.sh full
\`\`\`

個別分析の実行：

\`\`\`bash
# EXPLAIN ANALYZE のみ
./scripts/explain-analyze-performance-test.sh

# 基本監視のみ
psql -f ./scripts/postgresql-performance-monitor.sql

# Go版分析のみ
cd scripts && go run query-performance-analyzer.go
\`\`\`

---

**注意**: このレポートは自動生成されたものです。本番環境への変更適用前には、必ず詳細な検証を行ってください。
EOF
    
    log_success "総合レポートを保存: ${report_file}"
}

# メイン処理
main() {
    log_info "=== PostgreSQL パフォーマンス分析開始 ==="
    
    # 引数解析
    local analysis_type="${1:-full}"
    
    # 前提条件チェック
    check_prerequisites || exit 1
    
    # 結果ディレクトリ作成
    create_results_dir
    
    case "${analysis_type}" in
        "full")
            log_info "完全なパフォーマンス分析を実行..."
            collect_basic_stats
            run_performance_monitor
            run_explain_analyze
            run_go_analyzer
            analyze_index_usage
            analyze_slow_queries
            analyze_table_stats
            generate_optimization_recommendations
            generate_comprehensive_report
            ;;
        "quick")
            log_info "簡易パフォーマンス分析を実行..."
            collect_basic_stats
            run_performance_monitor
            analyze_index_usage
            generate_optimization_recommendations
            generate_comprehensive_report
            ;;
        "explain")
            log_info "EXPLAIN ANALYZE分析のみ実行..."
            run_explain_analyze
            ;;
        "monitor")
            log_info "監視レポートのみ実行..."
            collect_basic_stats
            run_performance_monitor
            ;;
        "go")
            log_info "Go版分析のみ実行..."
            run_go_analyzer
            ;;
        "help"|"--help"|"-h")
            echo "使用方法: $0 [analysis_type]"
            echo ""
            echo "Analysis Types:"
            echo "  full     完全な分析実行（デフォルト）"
            echo "  quick    簡易分析実行"
            echo "  explain  EXPLAIN ANALYZE分析のみ"
            echo "  monitor  監視レポートのみ"
            echo "  go       Go版分析のみ"
            echo "  help     ヘルプ表示"
            exit 0
            ;;
        *)
            log_error "不正な分析タイプ: ${analysis_type}"
            log_info "使用方法: $0 [full|quick|explain|monitor|go|help]"
            exit 1
            ;;
    esac
    
    # 結果表示
    echo ""
    log_success "=== パフォーマンス分析完了 ==="
    log_info "結果ディレクトリ: ${ANALYSIS_DIR}"
    
    if [ -f "${ANALYSIS_DIR}/comprehensive_performance_report.md" ]; then
        log_info "総合レポート: ${ANALYSIS_DIR}/comprehensive_performance_report.md"
    fi
    
    # ディレクトリサイズ表示
    local dir_size=$(du -sh "${ANALYSIS_DIR}" | cut -f1)
    log_info "分析結果サイズ: ${dir_size}"
    
    # ファイル数表示
    local file_count=$(find "${ANALYSIS_DIR}" -type f | wc -l)
    log_info "生成ファイル数: ${file_count}"
}

# スクリプト実行
main "$@"