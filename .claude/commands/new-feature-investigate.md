# NEW-FEATURE-INVESTIGATE フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
新規機能開発のための調査・分析を行い、既存システムへの影響と実装可能性を評価する。

## 注意事項
- **Model: Opus** - 新規機能の設計には深い検討が必要なため、必ずultrathinkで考察すること
- Serenaのセマンティック検索を最大限活用し、既存実装パターンを正確に把握すること
- 関連するすべてのコンポーネント・モジュールを網羅的に調査すること

## 必要な入力
- 新規機能の要件・仕様
- 関連するドキュメント（あれば）
- 参考となる既存機能（あれば）

## Serena活用ポイント
```bash
# 1. プロジェクト知識の確認
read_memory("project_overview")
read_memory("coding_conventions")

# 2. 類似機能の調査
search_for_pattern("類似機能のパターン")
get_symbols_overview("関連ディレクトリ")

# 3. 既存実装パターンの把握
find_symbol("関連クラス/関数")
```

## タスクに含まれるべきTODO
1. ユーザの要件を理解し、調査開始をコンソールで通知
2. Serenaメモリから関連知識を読み込み
3. **ultrathinkで新規機能の全体像と影響範囲を深く検討**
4. 類似機能・関連コンポーネントをSerenaで調査
5. 既存アーキテクチャとの整合性を確認
6. 技術的実現可能性を評価
7. セキュリティ・パフォーマンスへの影響を分析
8. 必要な新規コンポーネント・変更箇所をリストアップ
9. リスクと課題を特定
10. 調査結果を `docs/investigate/new-feature-investigate_{TIMESTAMP}.md` に保存
11. 発見した重要パターンをSerenaメモリに記録
12. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
13. 調査結果ファイル名をコンソール出力

## 調査項目チェックリスト
- [ ] 既存システムとの統合ポイント
- [ ] データモデルへの影響
- [ ] API設計の方針
- [ ] UI/UXの実装方針
- [ ] 認証・認可の要件
- [ ] パフォーマンス要件
- [ ] テスト戦略
- [ ] 既存機能への影響範囲

## 出力ファイル
- `docs/investigate/new-feature-investigate_{TIMESTAMP}.md`

## 最終出力形式
### 調査完了の場合
status: SUCCESS
next: NEW-FEATURE-PLAN
details: "新規機能の調査完了。new-feature-investigate_{TIMESTAMP}.mdに詳細記録。計画フェーズへ移行。"

### 要件が不明確な場合
status: NEED_CLARIFICATION
next: USER_INPUT
details: "要件の明確化が必要。new-feature-investigate_{TIMESTAMP}.mdに質問事項を記録。"

### 技術的に困難な場合
status: TECHNICAL_CHALLENGE
next: OPTIMIZATION-PROPOSAL
details: "技術的課題あり。new-feature-investigate_{TIMESTAMP}.mdに詳細記録。代替案の検討が必要。"