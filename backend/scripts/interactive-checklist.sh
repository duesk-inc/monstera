#!/bin/bash

# interactive-checklist.sh
# PostgreSQL移行前インタラクティブチェックリスト
# 手動確認項目のガイド付き実行

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# グローバル変数
TOTAL_ITEMS=0
COMPLETED_ITEMS=0
SKIPPED_ITEMS=0
CRITICAL_ITEMS=0
CRITICAL_COMPLETED=0

# ログファイル設定
LOG_DIR="./migration-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
INTERACTIVE_LOG="$LOG_DIR/interactive_checklist_${TIMESTAMP}.log"
COMPLETION_REPORT="$LOG_DIR/checklist_completion_${TIMESTAMP}.md"

# 関数定義
log_message() {
    echo "$1" | tee -a "$INTERACTIVE_LOG"
}

check_item() {
    local category="$1"
    local item="$2"
    local critical="${3:-false}"
    local guidance="$4"
    
    TOTAL_ITEMS=$((TOTAL_ITEMS + 1))
    if [ "$critical" = "true" ]; then
        CRITICAL_ITEMS=$((CRITICAL_ITEMS + 1))
    fi
    
    echo ""
    echo -e "${BOLD}=== [$TOTAL_ITEMS] $category ===${NC}"
    echo -e "${BLUE}項目:${NC} $item"
    
    if [ "$critical" = "true" ]; then
        echo -e "${RED}[CRITICAL]${NC} この項目は移行成功に必須です"
    fi
    
    if [ -n "$guidance" ]; then
        echo -e "${CYAN}ガイダンス:${NC} $guidance"
    fi
    
    echo ""
    while true; do
        echo -n "この項目は完了していますか? [y/n/s(skip)/h(help)]: "
        read -r response
        
        case $response in
            [Yy]|[Yy][Ee][Ss])
                echo -e "${GREEN}✅ 完了${NC}"
                COMPLETED_ITEMS=$((COMPLETED_ITEMS + 1))
                if [ "$critical" = "true" ]; then
                    CRITICAL_COMPLETED=$((CRITICAL_COMPLETED + 1))
                fi
                log_message "[$TOTAL_ITEMS] $category: $item - COMPLETED"
                echo "- ✅ **$category**: $item" >> "$COMPLETION_REPORT"
                break
                ;;
            [Nn]|[Nn][Oo])
                if [ "$critical" = "true" ]; then
                    echo -e "${RED}❌ 未完了 (CRITICAL)${NC}"
                    echo -e "${RED}この項目は移行実行前に必ず完了させてください${NC}"
                else
                    echo -e "${YELLOW}⚠️  未完了${NC}"
                fi
                log_message "[$TOTAL_ITEMS] $category: $item - NOT COMPLETED"
                echo "- ❌ **$category**: $item" >> "$COMPLETION_REPORT"
                break
                ;;
            [Ss]|[Ss][Kk][Ii][Pp])
                echo -e "${YELLOW}⏭️  スキップ${NC}"
                SKIPPED_ITEMS=$((SKIPPED_ITEMS + 1))
                log_message "[$TOTAL_ITEMS] $category: $item - SKIPPED"
                echo "- ⏭️ **$category**: $item (スキップ)" >> "$COMPLETION_REPORT"
                break
                ;;
            [Hh]|[Hh][Ee][Ll][Pp])
                echo ""
                echo -e "${CYAN}=== ヘルプ ===${NC}"
                echo "y/yes: 項目が完了している場合"
                echo "n/no:  項目が未完了の場合"
                echo "s/skip: 項目をスキップする場合（非推奨）"
                echo "h/help: このヘルプを表示"
                echo ""
                if [ -n "$guidance" ]; then
                    echo -e "${CYAN}詳細ガイダンス:${NC}"
                    echo "$guidance"
                    echo ""
                fi
                ;;
            *)
                echo "無効な入力です。y, n, s, h のいずれかを入力してください。"
                ;;
        esac
    done
}

# スクリプト開始
clear
echo "================================================"
echo -e "${BOLD}${BLUE}PostgreSQL移行前インタラクティブチェックリスト${NC}"
echo "================================================"
echo "このスクリプトは移行前の手動確認項目をガイドします。"
echo ""
echo -e "${YELLOW}注意事項:${NC}"
echo "- 各項目を慎重に確認してください"
echo "- CRITICAL項目は移行成功に必須です"
echo "- 不明な点がある場合は必ずチームに確認してください"
echo ""
echo -n "チェックリストを開始しますか? [y/n]: "
read -r start_response

if [[ ! $start_response =~ ^[Yy]([Ee][Ss])?$ ]]; then
    echo "チェックリストを中止しました。"
    exit 0
fi

# ログ初期化
cat > "$INTERACTIVE_LOG" << EOF
PostgreSQL移行前インタラクティブチェックリスト実行ログ
実行時刻: $(date '+%Y-%m-%d %H:%M:%S')
実行者: $(whoami)
========================================

EOF

# レポート初期化
cat > "$COMPLETION_REPORT" << EOF
# PostgreSQL移行前チェックリスト完了レポート

**実行時刻**: $(date '+%Y-%m-%d %H:%M:%S')
**実行者**: $(whoami)

## チェック結果

EOF

# 1. プロジェクト管理・計画確認
echo ""
echo -e "${BOLD}${BLUE}🎯 1. プロジェクト管理・計画確認${NC}"

check_item "計画承認" "ステークホルダー最終承認取得" true \
"経営陣、部門長、関係者全員からの書面または電子承認を取得してください。承認書類に実行日時、ダウンタイム、リスクが明記されていることを確認してください。"

check_item "計画承認" "移行実行日時確定" true \
"推奨時間: 日曜日 2:00-5:00 AM JST。ユーザー活動が最も少ない時間帯を選択し、祝日や連休との重複を避けてください。"

check_item "計画承認" "移行チーム体制確定" true \
"移行責任者、DBA、インフラエンジニア、アプリエンジニア、QAエンジニアの役割分担と連絡先を確定してください。"

check_item "計画承認" "緊急連絡体制確立" true \
"24時間対応可能な連絡体制、エスカレーション手順、緊急時の意思決定権限者を明確にしてください。"

check_item "リスク管理" "リスク評価レポート完成" true \
"技術リスク、ビジネスリスク、外部要因リスクを洗い出し、各リスクの対応策を文書化してください。"

check_item "リスク管理" "ロールバック手順確定" true \
"緊急時の戻し手順、判断基準、実行責任者、必要時間を明確にし、テスト実行で検証済みであることを確認してください。"

# 2. 技術環境準備
echo ""
echo -e "${BOLD}${BLUE}🔧 2. 技術環境準備${NC}"

check_item "サーバー" "PostgreSQLサーバー本番設定完了" true \
"PostgreSQL 14以上、適切なメモリ・CPU設定、セキュリティ設定（SSL/TLS）、ファイアウォール設定を確認してください。"

check_item "サーバー" "十分なディスク容量確保" true \
"現在のMySQLデータサイズの3倍以上の空き容量があることを確認してください。バックアップ領域も考慮してください。"

check_item "アプリケーション" "Go PostgreSQLドライバー導入済み" true \
"github.com/lib/pq ドライバーの導入、GORM PostgreSQL対応、環境変数設定（DB_DRIVER=postgres）を確認してください。"

check_item "アプリケーション" "Next.js環境設定更新" true \
"API接続先設定、環境変数更新、ビルド成功確認を行ってください。"

check_item "Docker環境" "PostgreSQLコンテナ設定完了" true \
"docker-compose.postgresql.yml作成、pgAdminコンテナ設定、ボリューム・ネットワーク設定を確認してください。"

# 3. データベース準備
echo ""
echo -e "${BOLD}${BLUE}🗄️ 3. データベース準備${NC}"

check_item "スキーマ" "全マイグレーションファイルPostgreSQL対応完了" true \
"323個のマイグレーションファイル全てのPostgreSQL対応、ENUM→CHECK制約変換、UUID関数変換を確認してください。"

check_item "データ型" "主要データ型変換完了" true \
"DATETIME→TIMESTAMP、TINYINT(1)→BOOLEAN、TEXT型統一、JSON→JSONB対応を確認してください。"

check_item "SQL対応" "アプリケーションSQL PostgreSQL対応完了" true \
"repository層の生SQLクエリ、GROUP BY句厳格化、LIMIT句構文変換、関数変換を全て確認してください。"

check_item "プロシージャ" "ストアドプロシージャPL/pgSQL変換完了" true \
"ArchiveWeeklyReports、CleanupExpiredArchives等の重要プロシージャのPL/pgSQL変換を確認してください。"

check_item "設定" "PostgreSQL設定最適化完了" true \
"shared_buffers、work_mem、max_parallel_workers等の性能設定、timezone設定を確認してください。"

check_item "権限" "データベースユーザー・権限設定完了" true \
"アプリケーション用ユーザー、読み取り専用ユーザー、バックアップ用ユーザーの作成と適切な権限設定を確認してください。"

# 4. 移行ツール・スクリプト準備
echo ""
echo -e "${BOLD}${BLUE}🚀 4. 移行ツール・スクリプト準備${NC}"

check_item "移行ツール" "一括移行システム動作確認" true \
"bulk-migration-controller.go、bulk-migration-executor.shの動作確認、Go依存関係インストールを確認してください。"

check_item "監視ツール" "監視・検証ツール動作確認" true \
"migration-performance-monitor.sh、validate-migration-data.sh、migration-benchmark.shの動作確認を行ってください。"

check_item "バックアップ" "バックアップ・復旧ツール準備" true \
"pg_dump対応バックアップスクリプト、緊急ロールバックスクリプト、自動検証スクリプトを確認してください。"

# 5. テスト・検証
echo ""
echo -e "${BOLD}${BLUE}🧪 5. テスト・検証${NC}"

check_item "移行テスト" "ステージング環境完全移行テスト実行" true \
"本番と同等環境での完全移行テスト、データ整合性100%確認、機能テスト全項目パス、性能テスト基準達成を確認してください。"

check_item "移行テスト" "ロールバックテスト成功" true \
"緊急時ロールバック手順の実行テスト、データ復旧確認、所要時間測定を行ってください。"

check_item "アプリテスト" "PostgreSQL環境全テスト実行" true \
"repository層、service層、handler層、E2Eテストの全てをPostgreSQL環境で実行し、全項目パスを確認してください。"

check_item "セキュリティ" "セキュリティテスト実行" true \
"SQLインジェクション対策、認証・認可機能、SSL/TLS接続、データ暗号化のテストを行ってください。"

# 6. 性能・監視
echo ""
echo -e "${BOLD}${BLUE}📊 6. 性能・監視${NC}"

check_item "性能最適化" "データベース性能確認" true \
"EXPLAIN ANALYZE実行、インデックス使用率確認、接続プール最適化、VACUUM/ANALYZE設定を確認してください。"

check_item "監視システム" "リアルタイム監視設定完了" true \
"データベース接続数、CPU・メモリ使用率、ディスクI/O、ネットワーク通信の監視設定を確認してください。"

check_item "アラート" "アラート閾値設定完了" true \
"エラー率>1%、レスポンス時間>3秒、接続数>80%、ディスク使用率>90%のアラート設定を確認してください。"

# 7. セキュリティ・コンプライアンス
echo ""
echo -e "${BOLD}${BLUE}🔒 7. セキュリティ・コンプライアンス${NC}"

check_item "データセキュリティ" "暗号化設定完了" true \
"データベース暗号化、通信暗号化（TLS 1.2以上）、バックアップ暗号化、アクセス制御（RBAC）を確認してください。"

check_item "監査ログ" "監査ログ機能移行完了" true \
"audit_log機能のPostgreSQL移行、アクセスログ記録、変更履歴ログ、ログ保存期間設定を確認してください。"

check_item "コンプライアンス" "法的コンプライアンス確認" false \
"個人情報保護法対応、データ保存・削除ポリシー、GDPR対応（該当する場合）を確認してください。"

# 8. バックアップ・復旧
echo ""
echo -e "${BOLD}${BLUE}🔄 8. バックアップ・復旧${NC}"

check_item "移行前バックアップ" "MySQL完全バックアップ取得" true \
"移行直前の完全バックアップ取得、整合性検証、複数箇所保存、復旧テスト実行を確認してください。"

check_item "PostgreSQLバックアップ" "PostgreSQLバックアップ設定" true \
"pg_dump自動バックアップ、PITR設定、WAL設定、バックアップ検証自動化を確認してください。"

check_item "災害復旧" "災害復旧計画確定" true \
"RTO・RPO設定、災害復旧手順書作成、復旧訓練実施を確認してください。"

# 9. 運用・保守
echo ""
echo -e "${BOLD}${BLUE}👥 9. 運用・保守${NC}"

check_item "運用体制" "24時間対応体制確立" true \
"移行チーム体制、緊急時対応、エスカレーション手順、インシデント管理手順を確認してください。"

check_item "ドキュメント" "運用ドキュメント完成" true \
"運用手順書、トラブルシューティングガイド、FAQ、設定変更手順書を確認してください。"

# 10. コミュニケーション・ユーザー対応
echo ""
echo -e "${BOLD}${BLUE}📞 10. コミュニケーション・ユーザー対応${NC}"

check_item "内部連絡" "ステークホルダー最終合意" true \
"経営陣、各部門長、IT部門内での最終説明・合意取得を確認してください。"

check_item "チーム連絡" "移行時コミュニケーション準備" true \
"Slack #migration-live、Teams移行ルーム、電話会議設定、緊急時SMS通知システムを確認してください。"

check_item "ユーザー通知" "ユーザー事前通知完了" true \
"1週間前詳細通知、3日前リマインド、1日前最終確認、1時間前実行開始通知を確認してください。"

check_item "サポート体制" "ユーザーサポート体制準備" true \
"ヘルプデスク体制強化、FAQ準備・公開、問い合わせ窓口明確化を確認してください。"

# 結果計算と表示
echo ""
echo "================================================"
echo -e "${BOLD}${BLUE}チェックリスト完了結果${NC}"
echo "================================================"

COMPLETION_RATE=$(echo "scale=1; $COMPLETED_ITEMS * 100 / $TOTAL_ITEMS" | bc -l)
CRITICAL_COMPLETION_RATE=$(echo "scale=1; $CRITICAL_COMPLETED * 100 / $CRITICAL_ITEMS" | bc -l)

echo "総項目数: $TOTAL_ITEMS"
echo -e "完了項目: ${GREEN}$COMPLETED_ITEMS${NC}"
echo -e "未完了項目: ${RED}$((TOTAL_ITEMS - COMPLETED_ITEMS - SKIPPED_ITEMS))${NC}"
echo -e "スキップ項目: ${YELLOW}$SKIPPED_ITEMS${NC}"
echo -e "完了率: ${GREEN}${COMPLETION_RATE}%${NC}"
echo ""
echo -e "CRITICAL項目: ${RED}$CRITICAL_ITEMS${NC}"
echo -e "CRITICAL完了: ${GREEN}$CRITICAL_COMPLETED${NC}"
echo -e "CRITICAL完了率: ${GREEN}${CRITICAL_COMPLETION_RATE}%${NC}"

# レポート完成
cat >> "$COMPLETION_REPORT" << EOF

## 結果サマリー

**総項目数**: $TOTAL_ITEMS
**完了項目**: $COMPLETED_ITEMS
**未完了項目**: $((TOTAL_ITEMS - COMPLETED_ITEMS - SKIPPED_ITEMS))
**スキップ項目**: $SKIPPED_ITEMS
**完了率**: ${COMPLETION_RATE}%

**CRITICAL項目数**: $CRITICAL_ITEMS
**CRITICAL完了数**: $CRITICAL_COMPLETED
**CRITICAL完了率**: ${CRITICAL_COMPLETION_RATE}%

## 最終判定

EOF

# 最終判定
echo ""
echo -e "${BOLD}最終判定:${NC}"

if [ "$CRITICAL_COMPLETED" -eq "$CRITICAL_ITEMS" ] && [ "$(echo "$COMPLETION_RATE >= 90" | bc -l)" -eq 1 ]; then
    echo -e "${GREEN}✅ 移行実行可能${NC}"
    echo -e "${GREEN}全ての重要項目が完了し、全体完了率も十分です。${NC}"
    echo "**判定**: ✅ 移行実行可能" >> "$COMPLETION_REPORT"
    echo "**理由**: 全CRITICAL項目完了 + 全体完了率${COMPLETION_RATE}% ≥ 90%" >> "$COMPLETION_REPORT"
    FINAL_STATUS=0
elif [ "$CRITICAL_COMPLETED" -eq "$CRITICAL_ITEMS" ]; then
    echo -e "${YELLOW}⚠️  条件付き移行可能${NC}"
    echo -e "${YELLOW}重要項目は完了していますが、全体完了率が低めです。${NC}"
    echo "**判定**: ⚠️ 条件付き移行可能" >> "$COMPLETION_REPORT"
    echo "**理由**: 全CRITICAL項目完了、ただし全体完了率${COMPLETION_RATE}% < 90%" >> "$COMPLETION_REPORT"
    FINAL_STATUS=1
else
    echo -e "${RED}❌ 移行実行不可${NC}"
    echo -e "${RED}重要項目が未完了です。移行前に必ず完了させてください。${NC}"
    echo "**判定**: ❌ 移行実行不可" >> "$COMPLETION_REPORT"
    echo "**理由**: CRITICAL項目未完了 ($CRITICAL_COMPLETED/$CRITICAL_ITEMS)" >> "$COMPLETION_REPORT"
    FINAL_STATUS=2
fi

# 推奨事項
echo ""
echo -e "${BOLD}推奨事項:${NC}"
if [ "$FINAL_STATUS" -eq 0 ]; then
    echo "1. ✅ 技術的自動チェック実行: ./scripts/pre-migration-checker.sh"
    echo "2. 👥 チーム最終確認会議実施"
    echo "3. 📅 移行実行スケジュール最終確定"
    echo "4. 🚀 移行実行開始"
elif [ "$FINAL_STATUS" -eq 1 ]; then
    echo "1. 📋 未完了項目の優先度評価"
    echo "2. 🔧 可能な限り未完了項目の完了"
    echo "3. 📊 リスク評価と承認手続き"
    echo "4. ✅ 技術的自動チェック実行"
else
    echo "1. ❌ CRITICAL未完了項目の完了（必須）"
    echo "2. 🔄 チェックリスト再実行"
    echo "3. 📋 完了確認後に移行判定"
fi

cat >> "$COMPLETION_REPORT" << EOF

## 推奨事項

EOF

if [ "$FINAL_STATUS" -eq 0 ]; then
    cat >> "$COMPLETION_REPORT" << EOF
1. ✅ 技術的自動チェック実行: \`./scripts/pre-migration-checker.sh\`
2. 👥 チーム最終確認会議実施
3. 📅 移行実行スケジュール最終確定
4. 🚀 移行実行開始
EOF
elif [ "$FINAL_STATUS" -eq 1 ]; then
    cat >> "$COMPLETION_REPORT" << EOF
1. 📋 未完了項目の優先度評価
2. 🔧 可能な限り未完了項目の完了
3. 📊 リスク評価と承認手続き
4. ✅ 技術的自動チェック実行
EOF
else
    cat >> "$COMPLETION_REPORT" << EOF
1. ❌ CRITICAL未完了項目の完了（必須）
2. 🔄 チェックリスト再実行
3. 📋 完了確認後に移行判定
EOF
fi

cat >> "$COMPLETION_REPORT" << EOF

**実行完了時刻**: $(date '+%Y-%m-%d %H:%M:%S')
**詳細ログ**: \`$INTERACTIVE_LOG\`

EOF

echo ""
echo "詳細ログ: $INTERACTIVE_LOG"
echo "完了レポート: $COMPLETION_REPORT"
echo ""
echo -e "${GREEN}インタラクティブチェックリスト完了${NC}"

exit $FINAL_STATUS