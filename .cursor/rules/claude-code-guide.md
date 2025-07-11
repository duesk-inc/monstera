# Claude Code活用ガイド

このドキュメントはClaude Codeを効果的に活用するためのワークフロー戦略とベストプラクティスを記載します。

## 更新履歴
- 2025-01-09: CLAUDE.mdから分離して作成

## Claude Codeワークフロー戦略

### 基本フロー: Explore → Plan → Code → Commit
```
1. 🔍 Explore（探索）
   - 関連ファイルの読み込みと理解
   - 既存コンポーネント/関数の確認
   - コードベース全体の把握

2. 📋 Plan（計画）
   - TodoWriteツールで実装計画作成
   - テストケースの設計
   - リファクタリング戦略の立案

3. 💻 Code（実装）
   - TDDアプローチでの段階的実装
   - 既存パターンの踏襲
   - 継続的なテスト実行

4. ✅ Commit（コミット）
   - 変更の確認とコミット
   - PR作成と説明記載
```

### 視覚的反復開発
```
1. 📸 スクリーンショット提供
   - UIモックやデザイン案の共有
   - 現在の実装状態のキャプチャ

2. 🔄 反復実装
   - スクリーンショットベースでの実装
   - 即座のフィードバック反映
   - UIの段階的改善

3. ✨ 最終確認
   - 完成状態のスクリーンショット確認
   - 細部の調整
```

## コマンドとツール活用

### 効率的な検索と調査
```bash
# 複数ツールの並列実行で高速検索
- Glob: ファイルパターン検索
- Grep: コンテンツ検索
- Task: 複雑な検索（Agentツール活用）

# 使い分けの目安
- 特定ファイルパス既知 → Read/Glob
- クラス定義検索 → Glob
- キーワード検索 → Task（Agent）
- 2-3ファイル内検索 → Read
```

## タスク管理のベストプラクティス

### TodoWriteツール活用例
```markdown
# 複雑なタスクの管理
- [ ] 既存APIエンドポイントの調査
- [ ] テストケース作成（RED phase）
- [ ] エンドポイント実装（GREEN phase）
- [ ] エラーハンドリング追加
- [ ] 統合テスト実装
- [ ] リファクタリング（REFACTOR phase）
- [ ] ドキュメント更新
- [ ] PR作成とレビュー依頼

# タスク管理のルール
1. 1つずつin_progressに変更
2. 完了したら即座にcompletedに
3. ブロッカーがあれば新タスク追加
4. 3つ以上のステップがあればTodoWrite使用
```

## コンテキスト管理の最適化

### 効果的なコンテキスト活用
```
1. 明示的なファイル指定
   - "frontend/src/components/common/CommonTable.tsxを使って"
   - "backend/internal/handler/weekly_report.goを参考に"

2. 早期の軌道修正
   - 実装方向の確認
   - 設計判断の相談
   - エラー発生時の即座の報告

3. /clearの適切な使用
   - 大きなタスクの切り替え時
   - コンテキストが複雑になった時
   - 新しい機能開発の開始時
```

## 安全性と実験的アプローチ

### パーミッション管理
```bash
# ツール許可リストの管理
- 通常は確認プロンプトに従う
- 信頼できる環境でのみ --dangerously-skip-permissions 使用
- コンテナ環境での安全な実験を推奨

# 安全な実験環境
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  node:18 bash
```

### 「実験して最適な方法を見つける」原則
```
1. 📊 小規模な実験から開始
   - 単一ファイルでの動作確認
   - 影響範囲を限定した試行

2. 🔄 反復的な改善
   - フィードバックの即座の反映
   - 段階的な機能拡張

3. 📝 学習内容の文書化
   - 成功パターンのCLAUDE.mdへの追記
   - チーム内での知見共有
```

## 高度な使用パターン

### Multi-Claudeワークフロー（並列開発）
```bash
# git worktreesを使った複数機能の同時開発
git worktree add ../monstera-weekly-report feature/weekly-report
git worktree add ../monstera-expense feature/expense-system

# 各worktreeで独立した開発
cd ../monstera-weekly-report
# 週報機能の開発

cd ../monstera-expense  
# 経費精算機能の開発
```

### ヘッドレスモード活用
```bash
# 自動化タスクの実行
claude-code --headless "全テストを実行してカバレッジレポートを生成"
claude-code --headless "未使用のimportを削除してコードを整形"

# バッチ処理
claude-code --headless "migrations/ディレクトリのSQLファイルを検証"
```

### サブエージェント活用パターン
```
1. 複雑な調査タスク
   - "Task: 認証フローに関連する全ファイルを調査"
   - "Task: パフォーマンスボトルネックの特定"

2. 並列実行タスク
   - 複数のTaskツールを同時実行
   - 独立した調査の並列化

3. 専門的な分析
   - "Task: セキュリティ脆弱性の可能性を調査"
   - "Task: 循環依存の検出"
```

### MCP（Model Context Protocol）統合
```yaml
# MCP設定例
mcp_servers:
  database:
    command: "mcp-server-postgres"
    args: ["--connection-string", "postgres://..."]
  
  github:
    command: "mcp-server-github"
    args: ["--token", "${GITHUB_TOKEN}"]

# 活用例
- データベーススキーマの直接参照
- GitHub Issues/PRとの連携
- 外部APIとの統合
```

### CLAUDE.mdの階層的配置戦略
```
~/                           # ホームディレクトリ
├── .claude/
│   └── CLAUDE.md           # グローバル設定
├── projects/               # プロジェクトディレクトリ
│   └── CLAUDE.md          # 組織共通設定
└── monstera/              # 個別プロジェクト
    └── CLAUDE.md          # プロジェクト固有設定

# 優先順位: プロジェクト > 親ディレクトリ > ホーム
```

---

*このドキュメントはClaude Codeの新機能や効果的な使用方法が発見された際に更新してください。*