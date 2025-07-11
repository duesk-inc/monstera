#!/bin/bash

# Foreign Key Constraint Analysis Script for PostgreSQL Migration
# 外部キー制約の分析とDEFERRABLE設定の必要性を評価

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクトルート
PROJECT_ROOT="${PROJECT_ROOT:-/Users/daichirouesaka/Documents/90_duesk/monstera}"
BACKEND_DIR="$PROJECT_ROOT/backend"
MIGRATIONS_DIR="$BACKEND_DIR/migrations"

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

# メイン処理
main() {
    echo "============================================"
    echo "Foreign Key Constraint Analysis for PostgreSQL"
    echo "============================================"
    echo ""
    
    log_info "Analyzing migration files in: $MIGRATIONS_DIR"
    echo ""
    
    # 1. 外部キー制約の統計
    echo "1. Foreign Key Statistics"
    echo "========================="
    
    # 外部キー制約の総数
    fk_count=$(grep -r "FOREIGN KEY\|REFERENCES" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | grep -v "postgresql.sql" | wc -l | tr -d ' ')
    echo "Total foreign key constraints: $fk_count"
    
    # CASCADE設定の統計
    cascade_delete=$(grep -r "ON DELETE CASCADE" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    cascade_update=$(grep -r "ON UPDATE CASCADE" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    set_null=$(grep -r "ON DELETE SET NULL" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    restrict=$(grep -r "ON DELETE RESTRICT" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    
    echo "  - ON DELETE CASCADE: $cascade_delete"
    echo "  - ON UPDATE CASCADE: $cascade_update"
    echo "  - ON DELETE SET NULL: $set_null"
    echo "  - ON DELETE RESTRICT: $restrict"
    echo ""
    
    # 2. 最も参照されるテーブル
    echo "2. Most Referenced Tables"
    echo "========================="
    
    log_info "Analyzing table references..."
    
    # REFERENCES句を抽出して集計
    echo "Top referenced tables:"
    grep -r "REFERENCES" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | grep -v "postgresql.sql" | \
        sed -E 's/.*REFERENCES\s+`?([a-z_]+)`?\s*\(.*/\1/' | \
        sort | uniq -c | sort -rn | head -10 | \
        while read count table; do
            echo "  ├─ $table: $count references"
        done
    echo ""
    
    # 3. 自己参照テーブルの検出
    echo "3. Self-Referencing Tables"
    echo "=========================="
    
    log_info "Detecting self-referencing foreign keys..."
    
    # CREATE TABLEとその中のREFERENCESを検出
    self_refs=$(grep -r "CREATE TABLE" "$MIGRATIONS_DIR" --include="*.sql" -A 50 | \
        grep -B 50 "REFERENCES" | \
        grep -E "CREATE TABLE.*|REFERENCES" | \
        awk '/CREATE TABLE/ {table=$0; gsub(/.*CREATE TABLE `?|`?.*/, "", table)} 
             /REFERENCES/ && $0 ~ table {print table}' | \
        sort -u)
    
    if [ -n "$self_refs" ]; then
        echo "Tables with self-references:"
        echo "$self_refs" | while read table; do
            echo "  ├─ $table"
            # 詳細を表示
            grep -r "CREATE TABLE.*$table" "$MIGRATIONS_DIR" --include="*.sql" -A 50 | \
                grep "REFERENCES.*$table" | head -1 | sed 's/^/     └─ /'
        done
    else
        echo "No self-referencing tables found"
    fi
    echo ""
    
    # 4. 循環参照の可能性チェック
    echo "4. Circular Reference Check"
    echo "==========================="
    
    log_info "Checking for potential circular references..."
    
    # 簡易的な循環参照チェック（相互参照するテーブルを検出）
    circular_found=0
    
    # 簡易的な循環参照チェック（相互に参照し合うテーブルを検出）
    # 注: macOSのbashは連想配列をサポートしていない可能性があるため、簡易実装
    
    # departmentsテーブルの自己参照チェック
    dept_self_ref=$(grep -r "departments.*parent_id.*REFERENCES.*departments" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    if [ "$dept_self_ref" -gt 0 ]; then
        echo "  ⚠ Self-reference found: departments → departments (parent_id)"
        circular_found=1
    fi
    
    # users ⇄ departments の相互参照チェック
    users_to_dept=$(grep -r "users.*department_id.*REFERENCES.*departments" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    dept_to_users=$(grep -r "departments.*manager_id.*REFERENCES.*users" "$MIGRATIONS_DIR" --include="*.sql" | grep -v "down.sql" | wc -l | tr -d ' ')
    
    if [ "$users_to_dept" -gt 0 ] && [ "$dept_to_users" -gt 0 ]; then
        echo "  ⚠ Potential circular reference: users ⇄ departments"
        echo "    └─ users.department_id → departments.id"
        echo "    └─ departments.manager_id → users.id"
        circular_found=1
    fi
    
    if [ $circular_found -eq 0 ]; then
        log_success "✓ No circular references detected"
    fi
    echo ""
    
    # 5. DEFERRABLE必要性評価
    echo "5. DEFERRABLE Requirement Assessment"
    echo "===================================="
    
    log_info "Evaluating need for DEFERRABLE constraints..."
    echo ""
    
    # 評価基準
    echo "Evaluation criteria:"
    echo "  • Self-referencing tables: $([ -n "$self_refs" ] && echo "Found" || echo "None")"
    echo "  • Circular references: $([ $circular_found -eq 1 ] && echo "Found" || echo "None")"
    echo "  • Complex CASCADE chains: $([ $cascade_delete -gt 20 ] && echo "Many ($cascade_delete)" || echo "Moderate ($cascade_delete)")"
    echo ""
    
    # 推奨事項
    echo "Recommendations for DEFERRABLE constraints:"
    
    if [ -n "$self_refs" ]; then
        echo ""
        echo "  ${YELLOW}►${NC} Self-referencing tables (Consider DEFERRABLE):"
        echo "$self_refs" | while read table; do
            echo "    - $table: DEFERRABLE INITIALLY IMMEDIATE recommended"
        done
    fi
    
    echo ""
    echo "  ${YELLOW}►${NC} Organizational structure tables (Recommended):"
    echo "    - users ⇄ departments relationships"
    echo "    - Any manager/subordinate relationships"
    
    echo ""
    echo "  ${YELLOW}►${NC} Bulk operation tables (Optional):"
    echo "    - Tables involved in data import/export"
    echo "    - Tables with complex update patterns"
    echo ""
    
    # 6. PostgreSQL移行準備状況
    echo "6. PostgreSQL Migration Readiness"
    echo "================================="
    
    # DEFERRABLEキーワードの存在チェック
    deferrable_count=$(grep -r "DEFERRABLE" "$MIGRATIONS_DIR" --include="*.sql" | wc -l | tr -d ' ')
    
    if [ $deferrable_count -eq 0 ]; then
        log_success "✓ No DEFERRABLE constraints in MySQL (expected)"
    else
        log_warning "⚠ Found $deferrable_count DEFERRABLE references (unexpected for MySQL)"
    fi
    
    echo ""
    echo "Migration approach:"
    echo "  1. Initial migration: Keep all constraints as NOT DEFERRABLE (default)"
    echo "  2. Post-migration: Add DEFERRABLE selectively based on:"
    echo "     - Operational requirements"
    echo "     - Performance testing results"
    echo "     - Bulk operation needs"
    echo ""
    
    # 7. サンプルDEFERRABLE実装
    echo "7. Sample DEFERRABLE Implementation"
    echo "==================================="
    
    echo "Example PostgreSQL syntax for key tables:"
    echo ""
    echo -e "${GREEN}-- For self-referencing table (departments)
ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS fk_departments_parent,
ADD CONSTRAINT fk_departments_parent 
FOREIGN KEY (parent_id) REFERENCES departments(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY IMMEDIATE;${NC}"
    echo ""
    echo -e "${GREEN}-- For user-department relationship
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS fk_users_department,
ADD CONSTRAINT fk_users_department 
FOREIGN KEY (department_id) REFERENCES departments(id)
DEFERRABLE INITIALLY IMMEDIATE;${NC}"
    echo ""
    
    # 8. 最終評価
    echo "============================================"
    echo "Foreign Key Analysis Summary"
    echo "============================================"
    
    echo ""
    if [ -n "$self_refs" ] || [ $circular_found -eq 1 ]; then
        log_warning "⚠ DEFERRABLE constraints recommended for some tables"
        echo "   Priority tables for DEFERRABLE:"
        [ -n "$self_refs" ] && echo "   - Self-referencing: $self_refs"
        [ $circular_found -eq 1 ] && echo "   - Tables with circular references"
    else
        log_success "✓ Current schema can migrate without DEFERRABLE constraints"
        echo "   Optional DEFERRABLE for operational flexibility only"
    fi
    
    echo ""
    echo "Total foreign keys to migrate: $fk_count"
    echo "Cascade operations to test: $(($cascade_delete + $cascade_update))"
    echo ""
}

# 引数処理
case "${1:-}" in
    "--help"|"-h")
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Show this help message"
        echo ""
        echo "This script analyzes foreign key constraints and evaluates"
        echo "the need for DEFERRABLE settings in PostgreSQL migration."
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac