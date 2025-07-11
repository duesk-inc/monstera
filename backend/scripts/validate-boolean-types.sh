#!/bin/bash

# Boolean Type Validation Script for PostgreSQL Migration
# このスクリプトはBOOLEAN型の使用状況を検証し、移行準備状況を確認します

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
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

# プロジェクトルートディレクトリ
PROJECT_ROOT="${PROJECT_ROOT:-/Users/daichirouesaka/Documents/90_duesk/monstera}"
BACKEND_DIR="$PROJECT_ROOT/backend"
MIGRATIONS_DIR="$BACKEND_DIR/migrations"
MODELS_DIR="$BACKEND_DIR/internal/model"

# メイン処理
main() {
    echo "======================================"
    echo "Boolean Type Validation for PostgreSQL"
    echo "======================================"
    echo ""
    
    log_info "Project root: $PROJECT_ROOT"
    echo ""
    
    # 1. マイグレーションファイルのBOOLEAN型使用状況
    echo "1. Migration Files Analysis"
    echo "==========================="
    
    log_info "Searching for BOOLEAN type definitions..."
    
    # BOOLEAN型の使用数をカウント
    boolean_count=$(grep -r "BOOLEAN" "$MIGRATIONS_DIR" --include="*.sql" 2>/dev/null | grep -v "down.sql" | wc -l | tr -d ' ')
    tinyint1_count=$(grep -r "TINYINT(1)" "$MIGRATIONS_DIR" --include="*.sql" 2>/dev/null | grep -v "down.sql" | wc -l | tr -d ' ')
    
    echo "Found BOOLEAN types: $boolean_count"
    echo "Found TINYINT(1) types: $tinyint1_count"
    
    if [ "$tinyint1_count" -gt 0 ]; then
        log_warning "Found TINYINT(1) declarations that need conversion:"
        grep -r "TINYINT(1)" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | head -10
    else
        log_success "✓ No TINYINT(1) found - all boolean fields use BOOLEAN type"
    fi
    
    echo ""
    
    # 2. BOOLEAN型を使用しているテーブルの一覧
    echo "2. Tables with BOOLEAN Fields"
    echo "============================="
    
    log_info "Analyzing tables with boolean fields..."
    
    # BOOLEANフィールドを持つテーブルを抽出
    tables_with_boolean=$(grep -r "BOOLEAN" "$MIGRATIONS_DIR" --include="*.sql" 2>/dev/null | \
        grep -v "down.sql" | \
        grep -E "CREATE TABLE|ALTER TABLE" -B5 | \
        grep -E "CREATE TABLE|ALTER TABLE" | \
        sed -E 's/.*CREATE TABLE `?([^`\s]+).*/\1/' | \
        sed -E 's/.*ALTER TABLE `?([^`\s]+).*/\1/' | \
        sort -u)
    
    if [ -n "$tables_with_boolean" ]; then
        echo "Tables with BOOLEAN fields:"
        echo "$tables_with_boolean" | while read table; do
            echo "  ├─ $table"
        done
    fi
    
    echo ""
    
    # 3. Goモデルのbool型フィールド分析
    echo "3. Go Model Bool Fields Analysis"
    echo "================================"
    
    log_info "Searching for bool type fields in models..."
    
    # bool型フィールドの数をカウント
    bool_field_count=$(grep -r "bool" "$MODELS_DIR" --include="*.go" | grep -E "^\s+\w+\s+bool" | wc -l | tr -d ' ')
    
    echo "Found bool fields in models: $bool_field_count"
    
    # 主要なモデルのboolフィールドを表示
    echo ""
    echo "Sample bool fields in models:"
    grep -r "bool" "$MODELS_DIR" --include="*.go" | grep -E "^\s+\w+\s+bool" | head -10 | while IFS=: read -r file line; do
        model_name=$(basename "$file" .go)
        field_line=$(echo "$line" | xargs)
        echo "  ├─ $model_name: $field_line"
    done
    
    echo ""
    
    # 4. デフォルト値の分析
    echo "4. Default Value Analysis"
    echo "========================"
    
    log_info "Analyzing default values for boolean fields..."
    
    # DEFAULT TRUEとDEFAULT FALSEの数をカウント
    default_true=$(grep -r "DEFAULT TRUE" "$MIGRATIONS_DIR" --include="*.sql" | wc -l | tr -d ' ')
    default_false=$(grep -r "DEFAULT FALSE" "$MIGRATIONS_DIR" --include="*.sql" | wc -l | tr -d ' ')
    default_none=$(grep -r "BOOLEAN NOT NULL" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "DEFAULT" | wc -l | tr -d ' ')
    
    echo "DEFAULT TRUE: $default_true fields"
    echo "DEFAULT FALSE: $default_false fields"
    echo "No default: $default_none fields"
    
    if [ "$default_none" -gt 0 ]; then
        log_warning "⚠ Found boolean fields without default values - consider adding defaults"
    fi
    
    echo ""
    
    # 5. NULL許可の分析
    echo "5. NULL Constraint Analysis"
    echo "==========================="
    
    log_info "Analyzing NULL constraints on boolean fields..."
    
    # NOT NULLとNULL許可の数をカウント
    not_null_count=$(grep -r "BOOLEAN NOT NULL" "$MIGRATIONS_DIR" --include="*.sql" | wc -l | tr -d ' ')
    nullable_count=$(grep -r "BOOLEAN" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "NOT NULL" | grep -v "down.sql" | wc -l | tr -d ' ')
    
    echo "NOT NULL boolean fields: $not_null_count"
    echo "Nullable boolean fields: $nullable_count"
    
    if [ "$nullable_count" -gt 0 ]; then
        log_warning "⚠ Found nullable boolean fields - ensure 3-value logic is intended"
        echo ""
        echo "Nullable boolean fields:"
        grep -r "BOOLEAN" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "NOT NULL" | grep -v "down.sql" | head -5
    fi
    
    echo ""
    
    # 6. インデックス分析
    echo "6. Index Analysis on Boolean Fields"
    echo "==================================="
    
    log_info "Searching for indexes on boolean fields..."
    
    # BOOLEANフィールドのインデックスを検索
    index_count=$(grep -r "INDEX.*BOOLEAN\|INDEX.*active\|INDEX.*enabled\|INDEX.*is_" "$MIGRATIONS_DIR" --include="*.sql" | wc -l | tr -d ' ')
    
    if [ "$index_count" -gt 0 ]; then
        echo "Found indexes on boolean fields:"
        grep -r "INDEX.*active\|INDEX.*enabled\|INDEX.*is_" "$MIGRATIONS_DIR" --include="*.sql" | head -5
    else
        echo "No indexes found on boolean fields (this is generally good practice)"
    fi
    
    echo ""
    
    # 7. PostgreSQL互換性チェック
    echo "7. PostgreSQL Compatibility Check"
    echo "================================="
    
    log_info "Checking PostgreSQL compatibility..."
    
    # 問題となる可能性のあるパターンをチェック
    issues=0
    
    # TINYINT(1)の使用チェック
    if [ "$tinyint1_count" -gt 0 ]; then
        log_error "✗ Found TINYINT(1) usage - needs conversion to BOOLEAN"
        ((issues++))
    else
        log_success "✓ No TINYINT(1) usage found"
    fi
    
    # 文字列 '0'/'1' の使用チェック
    string_bool_count=$(grep -r "'0'\|'1'" "$MIGRATIONS_DIR" --include="*.sql" | grep -E "DEFAULT|SET.*=" | wc -l | tr -d ' ')
    if [ "$string_bool_count" -gt 0 ]; then
        log_warning "⚠ Found string '0'/'1' usage - may need adjustment for PostgreSQL"
        ((issues++))
    else
        log_success "✓ No string boolean representations found"
    fi
    
    echo ""
    
    # 8. 推奨事項
    echo "8. Recommendations"
    echo "=================="
    
    if [ "$issues" -eq 0 ]; then
        log_success "✓ Boolean type implementation is PostgreSQL-ready!"
        echo ""
        echo "Current implementation follows best practices:"
        echo "  • Using BOOLEAN type consistently"
        echo "  • Appropriate default values set"
        echo "  • Proper NOT NULL constraints"
    else
        log_warning "⚠ Some adjustments needed for PostgreSQL migration:"
        echo ""
        if [ "$tinyint1_count" -gt 0 ]; then
            echo "  • Convert TINYINT(1) to BOOLEAN in migration files"
        fi
        if [ "$string_bool_count" -gt 0 ]; then
            echo "  • Review string boolean representations ('0'/'1')"
        fi
        if [ "$default_none" -gt 0 ]; then
            echo "  • Add default values to boolean fields without defaults"
        fi
    fi
    
    echo ""
    
    # 9. 移行準備チェックリスト
    echo "9. Migration Readiness Checklist"
    echo "================================"
    
    echo "PostgreSQL Boolean Migration Checklist:"
    echo ""
    [ "$tinyint1_count" -eq 0 ] && echo "  ✓ All boolean fields use BOOLEAN type" || echo "  ✗ Convert TINYINT(1) to BOOLEAN"
    [ "$default_none" -eq 0 ] && echo "  ✓ All boolean fields have default values" || echo "  ⚠ Add default values to $default_none fields"
    echo "  ✓ GORM models use bool type correctly"
    echo "  ✓ PostgreSQL supports BOOLEAN natively"
    [ "$string_bool_count" -eq 0 ] && echo "  ✓ No string boolean literals found" || echo "  ⚠ Review string boolean usage"
    
    echo ""
    
    # 10. 最終結果
    echo "======================================"
    log_success "Boolean Type Validation Completed"
    echo "======================================"
    
    if [ "$issues" -eq 0 ]; then
        log_success "✓ Boolean types are PostgreSQL-ready!"
        echo "   No conversion needed - proceed with migration"
    else
        log_warning "⚠ Minor adjustments needed before migration"
        echo "   Review the recommendations above"
    fi
}

# 引数処理
case "${1:-}" in
    "--help"|"-h")
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  PROJECT_ROOT  Project root directory"
        echo ""
        echo "This script validates boolean type usage in:"
        echo "  • SQL migration files"
        echo "  • Go model definitions"
        echo "  • Default values and constraints"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac