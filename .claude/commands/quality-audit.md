# QUALITY-AUDIT フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
システム全体または特定機能の品質を包括的に監査し、不具合・改善点・リスクを体系的に特定する。設計書との整合性も確認する。

## 注意事項
- **Model: Opus** - 品質監査は広範囲な分析が必要なため、必ず**ultrathink**で深く検討すること
- Serenaを活用して静的解析と動的解析を組み合わせること
- 設計書との照合を必ず行い、設計書がない場合は作成を推奨すること
- ユーザー視点とコード品質の両面から評価すること

## 必要な入力
- 監査対象（全体/特定機能/特定モジュール）
- 重点項目（パフォーマンス/セキュリティ/保守性等）
- 品質基準（あれば）

## Serena活用ポイント
```bash
# 1. 設計書の探索
search_for_pattern("機能名|feature", "docs/05_design")
find_file("*design*.md", "docs/05_design")

# 2. コード品質の分析
search_for_pattern("TODO|FIXME|HACK|XXX")  # 技術的負債
search_for_pattern("panic|fatal|error")     # エラーハンドリング
search_for_pattern("any|interface{}")      # 型安全性

# 3. アーキテクチャの確認
find_symbol("Handler|Service|Repository", depth=2)
find_referencing_symbols("重要なインターフェース")

# 4. テストカバレッジの確認
search_for_pattern("Test.*|test_|describe")
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、品質監査開始をコンソールで通知
2. **ultrathinkで監査戦略を深く検討**
3. **設計書の確認**
   - `docs/05_design`から関連設計書を検索
   - 設計書の有無と最新性確認
   - 実装との差異チェック
4. **静的コード分析**
   - コード複雑度の測定
   - 重複コードの検出
   - 命名規則の遵守状況
   - コメント率とドキュメント
5. **アーキテクチャ分析**
   - レイヤー分離の適切性
   - 依存関係の健全性
   - インターフェースの一貫性
   - 設計パターンの適用
6. **エラーハンドリング分析**
   - エラー処理の網羅性
   - エラーメッセージの適切性
   - リカバリー処理の有無
   - ログ出力の充実度
7. **セキュリティ分析**
   - 入力検証の実装状況
   - 認証・認可の適切性
   - SQLインジェクション対策
   - XSS/CSRF対策
8. **パフォーマンス分析**
   - N+1問題の検出
   - 非効率なアルゴリズム
   - 不要なデータ取得
   - キャッシュ活用状況
9. **テスト分析**
   - テストカバレッジ
   - テストの質と網羅性
   - E2Eテストの有無
   - テストの保守性
10. **ユーザビリティ分析**
    - UIの一貫性
    - エラーメッセージの親切さ
    - レスポンス速度
    - アクセシビリティ
11. **問題の優先度付け**
    - 重大度（Critical/High/Medium/Low）
    - 影響範囲
    - 修正工数
    - ビジネスインパクト
12. 監査結果を `docs/audit/quality-audit_{TIMESTAMP}.md` に保存
13. 発見したパターンをSerenaメモリに記録
14. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
15. 重要な発見事項をコンソール出力

## 品質評価基準

### コード品質
- **優秀**: 複雑度低、重複なし、命名明確
- **良好**: 軽微な問題のみ
- **要改善**: 中程度の問題複数
- **要対応**: 重大な問題あり

### セキュリティ
- **安全**: 脆弱性なし、ベストプラクティス遵守
- **概ね安全**: 軽微なリスクのみ
- **要注意**: 中程度のリスクあり
- **危険**: 重大な脆弱性あり

### パフォーマンス
- **最適**: 効率的、スケーラブル
- **良好**: 実用上問題なし
- **要改善**: ボトルネックあり
- **要対応**: 深刻な性能問題

### 保守性
- **優秀**: 理解しやすく変更容易
- **良好**: 標準的な保守性
- **要改善**: 理解・変更に困難
- **要対応**: 技術的負債が深刻

## 出力ファイル
- `docs/audit/quality-audit_{TIMESTAMP}.md`

## 最終出力形式
### 問題なしの場合
status: SUCCESS
next: NONE
details: "品質監査完了。quality-audit_{TIMESTAMP}.mdに詳細記録。大きな問題なし。"

### 軽微な改善点がある場合
status: MINOR_ISSUES
next: QUALITY-IMPROVE
details: "監査完了。quality-audit_{TIMESTAMP}.mdに詳細記録。X件の改善推奨事項あり。"

### 不具合発見の場合
status: BUGS_FOUND
next: BUG-FIX
details: "不具合発見。quality-audit_{TIMESTAMP}.mdに詳細記録。Y件の不具合要修正。"

### 設計書不足の場合
status: DESIGN_DOC_MISSING
next: NEW-FEATURE-PLAN
details: "設計書不足。quality-audit_{TIMESTAMP}.mdに詳細記録。設計書作成を推奨。"