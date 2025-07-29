# REFACTOR-PLAN フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
分析結果に基づき、安全で効果的なリファクタリング計画を策定する。

## 注意事項
- **Model: Opus** - リファクタリング設計には必ず**ultrathink**で深く検討すること
- 段階的な実装計画を立て、各段階でテスト可能にすること
- 既存機能への影響を最小限に抑えること

## 必要な入力ファイル
- `docs/analyze/refactor-analyze_{TIMESTAMP}.md` - 分析結果

## Serena活用ポイント
```bash
# 1. 既存パターンの確認
read_memory("implementation_patterns_*")
read_memory("coding_conventions")

# 2. 影響範囲の詳細確認
find_referencing_symbols("変更対象", depth=2)

# 3. テスト状況の確認
search_for_pattern("test.*変更対象")
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、計画開始をコンソールで通知
2. 最新の分析結果を読み込み
3. **ultrathinkでリファクタリング戦略を深く検討**
4. リファクタリング目標の明確化
   - パフォーマンス目標
   - 保守性目標
   - 拡張性目標
5. 設計方針の決定
   - 適用するデザインパターン
   - アーキテクチャの変更点
   - インターフェースの改善
6. 段階的実装計画
   - Phase分割（各Phaseは独立してテスト可能）
   - 依存関係と実装順序
   - 各Phaseのリスク評価
7. 移行戦略
   - 既存コードとの共存方法
   - データ移行（必要な場合）
   - 後方互換性の維持
8. テスト戦略
   - 既存テストの活用
   - 新規テストの追加
   - パフォーマンステスト
9. ロールバック計画
10. 影響を受けるドキュメントのリスト
11. 計画を `docs/plan/refactor-plan_{TIMESTAMP}.md` に保存
12. 新しい設計パターンをSerenaメモリに記録
13. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
14. 計画ファイル名をコンソール出力

## リファクタリング計画の構成
1. **概要**
   - 目的と期待効果
   - スコープ
2. **現状と改善後の比較**
   - Before/Afterの構造図
   - メトリクスの改善予測
3. **実装計画**
   - Phase別タスク
   - 各Phaseの成果物
   - タイムライン
4. **リスク管理**
   - 技術的リスク
   - スケジュールリスク
   - 緩和策

## 出力ファイル
- `docs/plan/refactor-plan_{TIMESTAMP}.md`

## 最終出力形式
### 計画策定完了の場合
status: SUCCESS
next: REFACTOR-IMPLEMENT
details: "リファクタリング計画策定完了。refactor-plan_{TIMESTAMP}.mdに詳細記録。実装フェーズへ移行。"

### リスクが高い場合
status: HIGH_RISK
next: USER_INPUT
details: "高リスクなリファクタリング。refactor-plan_{TIMESTAMP}.mdに詳細記録。承認が必要。"

### 段階的実装が必要な場合
status: PHASED_APPROACH
next: REFACTOR-IMPLEMENT
details: "段階的リファクタリング計画策定。refactor-plan_{TIMESTAMP}.mdに詳細記録。Phase 1から開始。"