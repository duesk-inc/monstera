# REFACTOR-ANALYZE フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
リファクタリング対象のコードを詳細に分析し、問題点と改善機会を特定する。

## 注意事項
- **Model: Opus** - アーキテクチャレベルの分析には必ず**ultrathink**で深く検討すること
- Serenaの分析機能で網羅的に問題箇所を特定すること
- パフォーマンス、保守性、拡張性の観点から総合的に評価すること

## 必要な入力
- リファクタリング対象（モジュール、機能、ファイル）
- リファクタリングの目的（パフォーマンス改善、保守性向上など）
- 現在の問題点（あれば）

## Serena活用ポイント
```bash
# 1. 対象コードの構造分析
get_symbols_overview("対象ディレクトリ")
find_symbol("対象クラス/関数", depth=2)

# 2. 依存関係の分析
find_referencing_symbols("リファクタリング対象")

# 3. パターンの検出
search_for_pattern("重複パターン")
search_for_pattern("アンチパターン")
```

## タスクに含まれるべきTODO
1. ユーザの意図を理解し、分析開始をコンソールで通知
2. Serenaメモリから設計パターンを確認
3. **ultrathinkで現在のアーキテクチャを深く分析**
4. 対象コードの構造分析
   - `get_symbols_overview()` で全体構造把握
   - クラス/関数の責務確認
   - 結合度と凝集度の評価
5. コード品質の評価
   - 重複コードの検出
   - 複雑度の測定
   - 命名の一貫性確認
6. 依存関係の分析
   - `find_referencing_symbols()` で利用箇所確認
   - 循環依存の検出
   - 不適切な依存の特定
7. パフォーマンス分析
   - ボトルネックの特定
   - 非効率な処理の検出
8. セキュリティ分析
   - 脆弱性の可能性
   - 入力検証の不備
9. テストカバレッジ確認
10. 改善機会のリストアップ
11. リスク評価
12. 分析結果を `docs/analyze/refactor-analyze_{TIMESTAMP}.md` に保存
13. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
14. 分析結果ファイル名をコンソール出力

## 分析項目チェックリスト
- [ ] SOLID原則の遵守状況
- [ ] DRY原則の遵守状況
- [ ] 適切な抽象化レベル
- [ ] エラーハンドリングの一貫性
- [ ] パフォーマンスボトルネック
- [ ] セキュリティリスク
- [ ] テストの容易性
- [ ] ドキュメントの充実度

## 出力ファイル
- `docs/analyze/refactor-analyze_{TIMESTAMP}.md`

## 最終出力形式
### 分析完了の場合
status: SUCCESS
next: REFACTOR-PLAN
details: "リファクタリング分析完了。refactor-analyze_{TIMESTAMP}.mdに詳細記録。計画フェーズへ移行。"

### 問題が軽微な場合
status: MINOR_ISSUES
next: USER_INPUT
details: "軽微な問題のみ検出。refactor-analyze_{TIMESTAMP}.mdに詳細記録。リファクタリング不要の可能性。"

### 大規模な変更が必要な場合
status: MAJOR_REFACTORING_NEEDED
next: REFACTOR-PLAN
details: "大規模な改善が必要。refactor-analyze_{TIMESTAMP}.mdに詳細記録。慎重な計画が必要。"