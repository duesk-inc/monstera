# DOCS-ORGANIZE フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
ドキュメントを論理的で一貫性のあるディレクトリ構成に再編成し、見つけやすさと保守性を向上させる。

## 注意事項
- **Model: Opus** - 構造設計には必ず**ultrathink**で深く検討すること
- 既存の参照パスを壊さないよう、リダイレクトや移行計画を立てること
- チーム全体への影響を考慮すること
- 段階的な移行を計画すること

## 必要な入力
- 現在のディレクトリ構造
- 理想的な構成案（あれば）
- 移行の制約条件

## Serena活用ポイント
```bash
# 1. 現在の構造分析
list_dir("docs", recursive=True)
search_for_pattern("import.*docs|require.*docs")  # 依存関係

# 2. 参照パターンの分析
search_for_pattern("\[.*\]\(.*docs/")  # Markdownリンク
search_for_pattern("href=.*docs/")  # HTMLリンク

# 3. トピック分析
search_for_pattern("^#+ ")  # 見出しレベル
get_symbols_overview("docs")  # 構造的な分析
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、整理開始をコンソールで通知
2. 現在のブランチを確認（通常は`docs/audit-<目的>`から継続）
3. **ultrathinkでディレクトリ構成を深く設計**
4. **現状分析**
   - 現在のディレクトリ構造マッピング
   - ファイル数とサイズの統計
   - 相互参照の分析
   - アクセス頻度の推定
5. **問題点の特定**
   - 深すぎる階層
   - 不明確な分類
   - 散在する関連ドキュメント
   - 一貫性のない命名
6. **新構造の設計**
   - トップレベルカテゴリの定義
   - サブカテゴリの整理
   - 命名規則の統一
   - 番号プレフィックスの使用
7. **推奨ディレクトリ構造**
   ```
   docs/
   ├── 00_overview/          # プロジェクト概要
   ├── 01_architecture/      # アーキテクチャ
   ├── 02_api/              # API仕様
   ├── 03_database/         # データベース
   ├── 04_frontend/         # フロントエンド
   ├── 05_backend/          # バックエンド
   ├── 06_deployment/       # デプロイメント
   ├── 07_development/      # 開発ガイド
   ├── 08_testing/          # テスト
   ├── 09_maintenance/      # 保守・運用
   ├── archive/             # アーカイブ
   └── templates/           # テンプレート
   ```
8. **移行計画の策定**
   - Phase分けした移行
   - リダイレクト設定
   - 参照更新スクリプト
   - ロールバック計画
9. **自動化スクリプトの作成**
   - ファイル移動スクリプト
   - 参照更新スクリプト
   - 検証スクリプト
10. **段階的実行**
    - Phase 1: 新ディレクトリ作成
    - Phase 2: ファイル移動
    - Phase 3: 参照更新
    - Phase 4: 旧構造削除
11. **品質確認**
    - すべてのリンクの有効性
    - ビルドプロセスの動作
    - 検索性の向上確認
12. 整理結果を `docs/organize/docs-organize_{TIMESTAMP}.md` に記録
13. 移行スクリプトを `scripts/docs-migration/` に保存
14. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
15. 新構造の概要、ブランチ名をコンソール出力

## 整理原則
### 1. 階層の深さ
- 最大3階層まで
- よく使うドキュメントは浅い階層に

### 2. 命名規則
- 小文字とハイフン使用（kebab-case）
- 番号プレフィックスで順序制御
- 明確で説明的な名前

### 3. 分類基準
- 機能別（what）
- 対象者別（who）
- 時系列別（when）
- 技術別（how）

### 4. 特殊ディレクトリ
- `archive/` - 古いが保存すべきドキュメント
- `templates/` - ドキュメントテンプレート
- `images/` - 画像リソース
- `examples/` - サンプルコード

## 出力ファイル
- `docs/organize/docs-organize_{TIMESTAMP}.md`
- `scripts/docs-migration/migrate.sh`
- `scripts/docs-migration/update-refs.sh`

## 最終出力形式
### 整理完了の場合
status: SUCCESS
next: DONE
details: "ドキュメント整理完了。docs-organize_{TIMESTAMP}.mdに詳細記録。新構造への移行完了。"

### 段階的移行中の場合
status: PHASE_COMPLETE
next: DOCS-ORGANIZE
details: "Phase X完了。docs-organize_{TIMESTAMP}.mdに詳細記録。次フェーズへ移行。"

### 大規模な変更の場合
status: NEEDS_APPROVAL
next: USER_INPUT
details: "整理計画策定。docs-organize_{TIMESTAMP}.mdに詳細記録。承認後に実行。"