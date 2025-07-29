# NEW-FEATURE-PLAN フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
調査結果を基に、新規機能の詳細設計と実装計画を策定する。

## 注意事項
- **Model: Opus** - アーキテクチャ設計には深い検討が必要なため、必ずultrathinkで考察すること
- Serenaで既存パターンを参照し、プロジェクトの一貫性を保つこと
- 段階的な実装計画を立て、各段階でのリスクを最小化すること

## 必要な入力ファイル
- `docs/investigate/new-feature-investigate_{TIMESTAMP}.md` - 調査結果

## Serena活用ポイント
```bash
# 1. 設計パターンの確認
read_memory("implementation_patterns_*")
read_memory("common_pitfalls_*")

# 2. 既存構造の確認
get_symbols_overview("backend/internal")
get_symbols_overview("frontend/src")

# 3. 影響範囲の特定
find_referencing_symbols("変更予定のシンボル")
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、計画開始をコンソールで通知
2. 最新の調査結果ファイルを読み込み
3. **ultrathinkでアーキテクチャ設計を深く検討**
4. Serenaで既存の設計パターンを確認
5. データモデル設計（新規テーブル、カラム追加など）
6. API設計（エンドポイント、リクエスト/レスポンス形式）
7. ビジネスロジック設計（サービス層の構成）
8. UI/UXコンポーネント設計
9. セキュリティ設計（認証・認可、入力検証）
10. テスト計画（単体、統合、E2E）
11. 実装タスクの分解と優先順位付け
12. マイグレーション計画（必要な場合）
13. ロールバック計画
14. 計画を `docs/plan/new-feature-plan_{TIMESTAMP}.md` に保存
15. 新しい設計パターンをSerenaメモリに記録
16. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
17. 計画ファイル名をコンソール出力

## 設計ドキュメント構成
1. **概要**
   - 機能の目的と価値
   - ユーザーストーリー
2. **アーキテクチャ設計**
   - システム構成図
   - データフロー
3. **詳細設計**
   - データモデル
   - API仕様
   - ビジネスロジック
   - UI/UX設計
4. **実装計画**
   - タスク分解（WBS）
   - 依存関係
   - 実装順序
5. **リスク管理**
   - 技術的リスク
   - 対策案

## 出力ファイル
- `docs/plan/new-feature-plan_{TIMESTAMP}.md`

## 最終出力形式
### 計画策定完了の場合
status: SUCCESS
next: NEW-FEATURE-IMPLEMENT
details: "新規機能の実装計画策定完了。new-feature-plan_{TIMESTAMP}.mdに詳細記録。実装フェーズへ移行。"

### 設計見直しが必要な場合
status: NEED_REDESIGN
next: NEW-FEATURE-INVESTIGATE
details: "設計課題発見。new-feature-plan_{TIMESTAMP}.mdに詳細記録。再調査が必要。"

### 段階的実装が必要な場合
status: PHASED_IMPLEMENTATION
next: NEW-FEATURE-IMPLEMENT
details: "段階的実装計画策定。new-feature-plan_{TIMESTAMP}.mdに詳細記録。Phase 1から実装開始。"