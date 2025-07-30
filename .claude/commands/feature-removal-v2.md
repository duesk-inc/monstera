# FEATURE-REMOVAL-V2 フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
機能を完全かつ安全に削除し、すべての依存関係を確実に除去する。Serenaの機能を最大限活用して自動的に影響範囲を特定し、段階的に削除を実行する。

## 注意事項
- **Model: Opus** - **ultrathink**で削除計画を立案
- Serenaの全機能を活用して完全な依存関係マップを作成
- 削除作業は必ず新しいブランチで実行
- 各段階でコミットし、ロールバック可能にする

## 実行手順

### Phase 1: 初期分析と計画立案

```bash
# 1. Serenaメモリに削除計画を記録
write_memory("removal_${FEATURE_NAME}_plan", """
削除対象機能: ${FEATURE_NAME}
削除理由: ${REASON}
開始日時: $(date)
""")

# 2. 機能の全体像を把握
get_symbols_overview("backend/internal")
find_symbol("${FEATURE_NAME}", depth=5)

# 3. ultrathinkで削除戦略を立案
think_about_task_adherence()
```

### Phase 2: 完全な依存関係分析

```bash
# 1. サービス層の依存関係
find_symbol("*Service", include_kinds=[5, 12])  # クラスと関数
find_referencing_symbols("${FEATURE_NAME}Service")

# 2. ハンドラー層の依存関係
find_symbol("*Handler", include_kinds=[5, 12])
search_for_pattern("${FEATURE_NAME}", restrict_search_to_code_files=true)

# 3. モデル層の依存関係
find_symbol("model.${FEATURE_NAME}")
find_referencing_symbols("model.${FEATURE_NAME}")

# 4. リポジトリ層の依存関係
find_symbol("*Repository")
search_for_pattern("${FEATURE_NAME}_table|${FEATURE_NAME}s")

# 5. 設定関連の検索
search_for_pattern("${FEATURE_NAME}|${FEATURE_NAME_UPPER}", 
                   paths_include_glob="**/*.go,**/*.env*,**/*.yml,**/*.yaml")

# 6. マイグレーションファイルの検索
search_for_pattern("${FEATURE_NAME}", 
                   relative_path="migrations",
                   paths_include_glob="*.sql")

# 7. テストファイルの検索
search_for_pattern("${FEATURE_NAME}", 
                   paths_include_glob="**/*_test.go,**/test_*.sh")

# 8. フロントエンドの依存関係
search_for_pattern("${FEATURE_NAME}|${FEATURE_API_PATH}", 
                   relative_path="frontend",
                   paths_include_glob="**/*.ts,**/*.tsx,**/*.js,**/*.jsx")

# 9. ドキュメントの依存関係
search_for_pattern("${FEATURE_NAME}", 
                   relative_path="docs",
                   paths_include_glob="**/*.md")

# 10. 分析結果の確認
think_about_collected_information()
```

### Phase 3: 削除計画の自動生成

```bash
# TodoWriteで削除タスクを自動生成
TodoWrite([
  {
    "content": "ブランチ作成: feature/remove-${FEATURE_NAME}",
    "status": "pending",
    "priority": "high",
    "id": "1"
  },
  {
    "content": "フロントエンドの機能無効化",
    "status": "pending",
    "priority": "high",
    "id": "2"
  },
  {
    "content": "APIエンドポイントの削除",
    "status": "pending",
    "priority": "high",
    "id": "3"
  },
  {
    "content": "ハンドラー層の削除",
    "status": "pending",
    "priority": "high",
    "id": "4"
  },
  {
    "content": "サービス層の削除",
    "status": "pending",
    "priority": "high",
    "id": "5"
  },
  {
    "content": "リポジトリ層の削除",
    "status": "pending",
    "priority": "high",
    "id": "6"
  },
  {
    "content": "モデル層の削除",
    "status": "pending",
    "priority": "high",
    "id": "7"
  },
  {
    "content": "設定・環境変数の削除",
    "status": "pending",
    "priority": "medium",
    "id": "8"
  },
  {
    "content": "メトリクス・ログの削除",
    "status": "pending",
    "priority": "medium",
    "id": "9"
  },
  {
    "content": "マイグレーションファイルの削除",
    "status": "pending",
    "priority": "medium",
    "id": "10"
  },
  {
    "content": "テストファイルの修正・削除",
    "status": "pending",
    "priority": "medium",
    "id": "11"
  },
  {
    "content": "ドキュメントの更新",
    "status": "pending",
    "priority": "low",
    "id": "12"
  }
])
```

### Phase 4: 段階的削除実行

#### 4.1 準備作業
```bash
# ブランチ作成
git checkout -b feature/remove-${FEATURE_NAME}

# バックアップディレクトリ作成
mkdir -p .backup/${FEATURE_NAME}_$(date +%Y%m%d_%H%M%S)

# 削除対象ファイルリストの作成
cat > removal_targets.txt << 'EOF'
# 自動生成された削除対象ファイル
EOF
```

#### 4.2 フロントエンド機能の無効化
```bash
# APIコールの削除
replace_regex(
  relative_path="frontend",
  regex=".*${FEATURE_NAME}.*",
  repl="// Removed: ${FEATURE_NAME} feature",
  allow_multiple_occurrences=true
)

# UIコンポーネントの無効化
find_symbol("${FEATURE_NAME}Component")
# 見つかったコンポーネントを条件付きレンダリングに変更
```

#### 4.3 バックエンド機能の削除
```bash
# 1. APIルーティングの削除
replace_regex(
  relative_path="cmd/server/main.go",
  regex=".*${FEATURE_NAME}.*routes.*",
  repl="",
  allow_multiple_occurrences=true
)

# 2. ハンドラーの削除
rm -f backend/internal/handler/${FEATURE_NAME}_handler.go

# 3. サービスの削除
# まず依存注入を削除
replace_regex(
  relative_path="cmd/server/main.go",
  regex=".*${FEATURE_NAME}Service.*",
  repl="",
  allow_multiple_occurrences=true
)
rm -f backend/internal/service/${FEATURE_NAME}_service.go

# 4. リポジトリの削除
rm -f backend/internal/repository/${FEATURE_NAME}_repository.go

# 5. モデルの削除
rm -f backend/internal/model/${FEATURE_NAME}.go

# 6. DTOの削除
replace_regex(
  relative_path="backend/internal/dto",
  regex=".*${FEATURE_NAME}.*",
  repl="",
  allow_multiple_occurrences=true
)
```

#### 4.4 設定とインフラの削除
```bash
# 1. 設定構造体の削除
replace_symbol_body(
  name_path="Config",
  relative_path="backend/internal/config/config.go",
  body="更新された構造体（${FEATURE_NAME}設定を除外）"
)

# 2. 環境変数の削除
replace_regex(
  relative_path="docker-compose.yml",
  regex=".*${FEATURE_NAME_UPPER}.*",
  repl="",
  allow_multiple_occurrences=true
)

replace_regex(
  relative_path=".env.example",
  regex=".*${FEATURE_NAME_UPPER}.*",
  repl="",
  allow_multiple_occurrences=true
)

# 3. メトリクスの削除
replace_regex(
  relative_path="backend/internal/metrics/metrics.go",
  regex=".*${FEATURE_NAME}.*",
  repl="",
  allow_multiple_occurrences=true
)
```

#### 4.5 データベース関連の削除
```bash
# マイグレーションファイルの削除（履歴は残す）
find migrations -name "*${FEATURE_NAME}*" -type f | while read f; do
  mv "$f" ".backup/${FEATURE_NAME}_$(date +%Y%m%d_%H%M%S)/"
done

# 新しいマイグレーションで関連テーブル/カラムを削除
cat > migrations/$(date +%s)_remove_${FEATURE_NAME}.up.sql << EOF
-- Remove ${FEATURE_NAME} related tables and columns
DROP TABLE IF EXISTS ${FEATURE_NAME}s CASCADE;
DROP TABLE IF EXISTS ${FEATURE_NAME}_logs CASCADE;
-- Add more cleanup as needed
EOF
```

#### 4.6 テストの修正
```bash
# テストファイルから関連テストを削除
find . -name "*_test.go" -exec grep -l "${FEATURE_NAME}" {} \; | while read f; do
  replace_regex(
    relative_path="$f",
    regex="func.*Test.*${FEATURE_NAME}.*\{[\s\S]*?\n\}",
    repl="",
    allow_multiple_occurrences=true
  )
done

# E2Eテストの修正
replace_regex(
  relative_path="test",
  regex=".*${FEATURE_NAME}.*",
  repl="",
  allow_multiple_occurrences=true
)
```

### Phase 5: 検証と最終確認

```bash
# 1. ビルド確認
make build

# 2. テスト実行
make test

# 3. リンターチェック
make lint

# 4. 残存確認
grep -r "${FEATURE_NAME}" . \
  --exclude-dir={.git,node_modules,vendor,.backup} \
  --exclude="*.log" \
  --exclude="removal_report.md"

# 5. Docker環境での動作確認
docker-compose down
docker-compose up -d
docker-compose logs -f backend
```

### Phase 6: ドキュメント化とクリーンアップ

```bash
# 1. 削除レポートの生成
cat > docs/removal/${FEATURE_NAME}_removal_$(date +%Y%m%d).md << EOF
# ${FEATURE_NAME} 機能削除レポート

## 削除日時
$(date)

## 削除理由
${REASON}

## 削除された要素

### バックエンドファイル
$(find .backup -name "*.go" -type f | sort)

### フロントエンドファイル
$(find .backup -name "*.ts" -o -name "*.tsx" | sort)

### 設定ファイル
$(grep -l "${FEATURE_NAME}" .backup/* 2>/dev/null | sort)

### データベース
- テーブル: ${FEATURE_NAME}s
- マイグレーション: $(ls .backup/*migration* 2>/dev/null)

## 影響を受けたファイル
$(git diff --name-only)

## テスト結果
$(make test 2>&1 | tail -20)

## ロールバック手順
1. git checkout main
2. git branch -D feature/remove-${FEATURE_NAME}
3. .backupディレクトリから必要なファイルを復元
EOF

# 2. Serenaメモリの更新
write_memory("removal_${FEATURE_NAME}_complete", """
削除完了日時: $(date)
削除されたファイル数: $(find .backup -type f | wc -l)
影響を受けたファイル数: $(git diff --name-only | wc -l)
""")

# 3. 最終的な確認
think_about_whether_you_are_done()
summarize_changes()
```

### Phase 7: PR作成とレビュー準備

```bash
# 1. 変更をコミット
git add -A
git commit -m "feat: Remove ${FEATURE_NAME} feature

- Removed all ${FEATURE_NAME} related code from backend
- Removed ${FEATURE_NAME} UI components from frontend
- Cleaned up database migrations and models
- Updated configuration and environment variables
- Fixed all affected tests

BREAKING CHANGE: ${FEATURE_NAME} feature is no longer available"

# 2. PR作成
gh pr create \
  --title "Remove ${FEATURE_NAME} feature" \
  --body "$(cat docs/removal/${FEATURE_NAME}_removal_*.md)" \
  --draft

# 3. 完了通知
afplay /System/Library/Sounds/Sosumi.aiff
```

## 出力ファイル
- `docs/removal/${FEATURE_NAME}_removal_YYYYMMDD.md`
- `.backup/${FEATURE_NAME}_YYYYMMDD_HHMMSS/` (削除されたファイル)
- `removal_targets.txt` (削除対象リスト)

## エラーハンドリング

### 依存関係が複雑な場合
```bash
# 依存関係グラフの生成
find_referencing_symbols("${FEATURE_NAME}") > dependency_graph.txt
echo "複雑な依存関係を検出。手動レビューが必要です。"
```

### ビルドエラーの場合
```bash
# エラー箇所の特定
make build 2>&1 | grep -A5 -B5 "error"
# 影響を受けたファイルの修正提案
think_about_collected_information()
```

## 最終出力形式

### 完全削除成功の場合
```
status: SUCCESS
removed_files: ${FILE_COUNT}
affected_files: ${AFFECTED_COUNT}
pr_number: ${PR_NUMBER}
next: MERGE_PR
details: "${FEATURE_NAME}機能を完全に削除。PRレビュー待ち。"
```

### 部分削除の場合
```
status: PARTIAL_COMPLETE
completed_tasks: ${COMPLETED}/${TOTAL}
blocking_issues: ["依存関係の解決が必要", "テスト修正が必要"]
next: FEATURE-REMOVAL-V2
details: "削除作業を一時中断。blocking_issuesの解決が必要。"
```

### 削除不可の場合
```
status: CANNOT_REMOVE
reasons: ["重要な機能との結合が強い", "データ移行が必要"]
alternatives: ["機能の無効化", "段階的廃止"]
next: USER_INPUT
details: "削除による影響が大きすぎます。代替案を検討してください。"
```