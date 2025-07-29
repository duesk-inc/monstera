# Claude Code & Serena 統合開発ガイド

## 📌 概要
本ガイドは、Claude CodeとSerenaの機能を最大限に活用し、高精度で一貫性のある開発を実現するための手順書です。

## 🎯 基本原則

### 1. Serenaの活用原則
- **セマンティック検索優先**: grep/findではなく、Serenaのシンボル検索を使用
- **メモリベース開発**: プロジェクト知識をSerenaメモリに蓄積・参照
- **思考ツールの活用**: 実装前後で必ず思考ツールで検証

### 2. モデル使い分けの原則
- **Opus使用（ultrathink）**: 
  - 新規機能開発の設計
  - 複雑なバグの根本原因分析
  - アーキテクチャレベルのリファクタリング
  - DB最適化の設計
- **Sonnet使用**: 
  - 単純な実装作業
  - 既存パターンの適用
  - ドキュメント作成

## 🔄 開発フロー

### 1. 開発開始時の準備
```bash
# 1. Serenaメモリの確認
read_memory("coding_conventions")
read_memory("task_completion_checklist")
read_memory("claude_commands_integration")

# 2. プロジェクト構造の把握
get_symbols_overview("対象ディレクトリ")
```

### 2. 実装前の調査
```bash
# 1. 既存実装パターンの調査
search_for_pattern("類似機能のパターン")

# 2. 影響範囲の確認
find_symbol("変更対象シンボル")
find_referencing_symbols("変更対象", "ファイルパス")

# 3. 情報の完全性確認
think_about_collected_information()
```

### 3. 安全な実装
```bash
# 1. シンボル単位での変更
replace_symbol_body()  # ファイル全体編集より安全

# 2. 新規追加時の正確な位置指定
insert_after_symbol()  # 既存シンボルの後に追加
insert_before_symbol() # 既存シンボルの前に追加

# 3. タスク遵守の確認
think_about_task_adherence()
```

### 4. 品質確認
```bash
# 1. 自動テスト
make test-backend
make test-frontend

# 2. リント・フォーマット
make lint
make format

# 3. 完了確認
think_about_whether_you_are_done()
```

### 5. 知識の蓄積
```bash
# 新しい実装パターンや注意点を発見した場合
write_memory("implementation_patterns_[機能名]", "内容")
write_memory("common_pitfalls_[機能名]", "内容")
```

## 📁 コマンドファイルの使い方

### 基本構造
1. **investigate系**: 調査・分析フェーズ
2. **plan系**: 設計・計画フェーズ
3. **implement系**: 実装フェーズ
4. **test系**: テスト・検証フェーズ

### 開発タイプ別の使い分け

#### 新規機能開発
```bash
/new-feature-investigate → /new-feature-plan → /new-feature-implement → /test
```

#### バグ改修
```bash
/bug-investigate → /bug-fix → /test
```

#### リファクタリング
```bash
/refactor-analyze → /refactor-plan → /refactor-implement → /test
```

#### 原因調査
```bash
/root-cause-analysis → /bug-fix（修正が必要な場合）
```

#### 既存機能削除
```bash
/feature-removal → /test
```

#### 最適な実装案の提案
```bash
/implementation-proposal → /new-feature-plan（採用時）
```

#### DB最適化
```bash
/db-optimization → /test
```

## ⚠️ 注意事項

### 1. デグレ防止
- 変更前に必ず `find_referencing_symbols()` で影響範囲を確認
- テストカバレッジの維持・向上を意識

### 2. ドキュメント遵守
- 作業開始時に必ず関連メモリを読み込む
- 規約から逸脱しそうな場合は `think_about_task_adherence()` で確認

### 3. 知識の共有
- 新しい発見は必ず `write_memory()` で記録
- エラー解決方法は特に重要

## 🛠️ トラブルシューティング

### Serenaが正しく動作しない場合
1. `restart_language_server()` で言語サーバーを再起動
2. goplsのパスを確認（Go言語の場合）
3. プロジェクト設定（.serena/project.yml）を確認

### 実装精度が低い場合
1. 既存パターンの調査不足 → `search_for_pattern()` で再調査
2. 影響範囲の見落とし → `find_referencing_symbols()` で再確認
3. 思考ツールの未使用 → 各種 `think_about_*` ツールを活用

## 📊 品質メトリクス

### 開発品質の指標
- テストカバレッジ: 80%以上
- リントエラー: 0件
- デグレーション: 0件
- ドキュメント更新率: 100%

### Serena活用度の指標
- セマンティック検索使用率: 90%以上
- メモリ参照頻度: タスク開始時100%
- 思考ツール使用率: 実装前後100%

## 🚀 継続的改善

### 週次レビュー
1. 開発効率の振り返り
2. 新規メモリの整理・統合
3. コマンドファイルの改善

### 月次レビュー
1. 開発プロセスの最適化
2. ツール活用方法の見直し
3. 品質メトリクスの評価

---

最終更新日: 2025-07-30