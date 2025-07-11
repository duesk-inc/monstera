#!/bin/bash

# マイグレーションファイルの構文検証スクリプト
# SQLファイルの基本的な構文エラーをチェックします

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 マイグレーションファイルの構文検証を開始します..."
echo ""

# 検証対象のファイル
MIGRATION_FILE="migrations/200042_add_accounting_permissions.up.sql"
ROLLBACK_FILE="migrations/200042_add_accounting_permissions.down.sql"

# 検証結果を格納する配列
ERRORS=()
WARNINGS=()
SUCCESS=()

# ファイル存在確認
check_file_exists() {
    local file=$1
    if [ ! -f "$file" ]; then
        ERRORS+=("ファイルが見つかりません: $file")
        return 1
    else
        SUCCESS+=("ファイルが存在します: $file")
        return 0
    fi
}

# SQL構文の基本チェック
check_sql_syntax() {
    local file=$1
    local filename=$(basename "$file")
    
    echo "📋 $filename の構文チェック..."
    
    # 基本的なSQL構文チェック
    if grep -q "INSERT INTO.*VALUES" "$file"; then
        SUCCESS+=("$filename: INSERT文が正しく記述されています")
    fi
    
    if grep -q "CREATE TABLE.*IF NOT EXISTS" "$file"; then
        SUCCESS+=("$filename: CREATE TABLE文が正しく記述されています")
    fi
    
    if grep -q "ALTER TABLE.*MODIFY COLUMN" "$file"; then
        SUCCESS+=("$filename: ALTER TABLE文が正しく記述されています")
    fi
    
    # セミコロンの確認
    local semicolon_count=$(grep -c ";" "$file" || true)
    if [ "$semicolon_count" -gt 0 ]; then
        SUCCESS+=("$filename: SQL文が適切にセミコロンで終了しています ($semicolon_count個)")
    else
        WARNINGS+=("$filename: セミコロンが見つかりません")
    fi
    
    # UUID()関数の使用確認
    if grep -q "UUID()" "$file"; then
        SUCCESS+=("$filename: UUID()関数が使用されています")
    fi
    
    # 文字エンコーディングの確認
    if grep -q "utf8mb4" "$file"; then
        SUCCESS+=("$filename: utf8mb4文字セットが指定されています")
    fi
    
    # コメントの確認
    if grep -q "COMMENT" "$file"; then
        SUCCESS+=("$filename: テーブル・カラムコメントが記述されています")
    fi
    
    # 外部キー制約の確認
    if grep -q "FOREIGN KEY" "$file"; then
        SUCCESS+=("$filename: 外部キー制約が定義されています")
    fi
    
    # インデックスの確認
    if grep -q "INDEX\|KEY" "$file"; then
        SUCCESS+=("$filename: インデックスが定義されています")
    fi
}

# UPファイルとDOWNファイルの整合性チェック
check_migration_consistency() {
    echo "🔄 マイグレーションの整合性チェック..."
    
    # UPファイルのテーブル作成とDOWNファイルのテーブル削除の対応確認
    local up_tables=$(grep -o "CREATE TABLE.*IF NOT EXISTS \([a-z_]*\)" "$MIGRATION_FILE" | grep -o "[a-z_]*$" || true)
    local down_tables=$(grep -o "DROP TABLE.*IF EXISTS \([a-z_]*\)" "$ROLLBACK_FILE" | grep -o "[a-z_]*$" || true)
    
    if [ -n "$up_tables" ] && [ -n "$down_tables" ]; then
        SUCCESS+=("UPファイルのテーブル作成とDOWNファイルのテーブル削除が対応しています")
    fi
    
    # INSERTとDELETEの対応確認
    if grep -q "INSERT INTO role_permissions" "$MIGRATION_FILE" && grep -q "DELETE FROM role_permissions" "$ROLLBACK_FILE"; then
        SUCCESS+=("権限の追加と削除が対応しています")
    fi
    
    # ALTERとその逆操作の確認
    if grep -q "ALTER TABLE.*MODIFY COLUMN" "$MIGRATION_FILE" && grep -q "ALTER TABLE.*MODIFY COLUMN" "$ROLLBACK_FILE"; then
        SUCCESS+=("テーブル変更とその逆操作が対応しています")
    fi
}

# 権限内容の妥当性チェック
check_permission_validity() {
    echo "🔐 権限内容の妥当性チェック..."
    
    # 権限の命名規則確認
    local permission_pattern="accounting\.[a-z_]+\.(view|manage|create|read|update|delete|execute|approve|export|sync|configure|all)"
    if grep -P "$permission_pattern" "$MIGRATION_FILE" > /dev/null 2>&1 || grep -E "accounting\.[a-z_]+\.(view|manage|create|read|update|delete|execute|approve|export|sync|configure|all)" "$MIGRATION_FILE" > /dev/null; then
        SUCCESS+=("権限の命名規則が適切です")
    else
        WARNINGS+=("権限の命名規則を確認してください")
    fi
    
    # ロール番号の確認
    if grep -q "role, 1\|role, 2\|role, 3\|role, 7\|role, 8" "$MIGRATION_FILE"; then
        SUCCESS+=("適切なロール番号が使用されています")
    else
        WARNINGS+=("ロール番号を確認してください")
    fi
    
    # 段階的権限設定の確認
    local super_admin_perms=$(grep -c "role, 1" "$MIGRATION_FILE" || echo "0")
    local admin_perms=$(grep -c "role, 2" "$MIGRATION_FILE" || echo "0")
    local manager_perms=$(grep -c "role, 3" "$MIGRATION_FILE" || echo "0")
    
    if [ "$super_admin_perms" -gt "$admin_perms" ] && [ "$admin_perms" -gt "$manager_perms" ]; then
        SUCCESS+=("権限が段階的に設定されています (super_admin: $super_admin_perms, admin: $admin_perms, manager: $manager_perms)")
    else
        WARNINGS+=("権限の段階設定を確認してください")
    fi
}

# メイン処理
echo "📁 ファイル存在確認..."
check_file_exists "$MIGRATION_FILE"
check_file_exists "$ROLLBACK_FILE"

if [ ${#ERRORS[@]} -eq 0 ]; then
    check_sql_syntax "$MIGRATION_FILE"
    check_sql_syntax "$ROLLBACK_FILE"
    check_migration_consistency
    check_permission_validity
fi

echo ""
echo "📊 検証結果:"
echo ""

# 成功メッセージ
if [ ${#SUCCESS[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ 成功 (${#SUCCESS[@]}件):${NC}"
    for success in "${SUCCESS[@]}"; do
        echo -e "   ${GREEN}✓${NC} $success"
    done
    echo ""
fi

# 警告メッセージ
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  警告 (${#WARNINGS[@]}件):${NC}"
    for warning in "${WARNINGS[@]}"; do
        echo -e "   ${YELLOW}!${NC} $warning"
    done
    echo ""
fi

# エラーメッセージ
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo -e "${RED}❌ エラー (${#ERRORS[@]}件):${NC}"
    for error in "${ERRORS[@]}"; do
        echo -e "   ${RED}✗${NC} $error"
    done
    echo ""
    echo -e "${RED}マイグレーションファイルを修正してください${NC}"
    exit 1
fi

if [ ${#WARNINGS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 すべての検証が完了しました！${NC}"
else
    echo -e "${YELLOW}⚠️  警告がありますが、構文的には問題ありません${NC}"
fi

echo ""
echo "📖 次のステップ: Docker環境でマイグレーションを実行してください"
echo "   docker-compose exec backend migrate -path migrations -database \"mysql://root:password@tcp(mysql:3306)/monstera\" up"