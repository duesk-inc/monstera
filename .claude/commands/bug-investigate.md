# BUG-INVESTIGATE フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
バグの根本原因を特定し、影響範囲を正確に把握する。Serenaの精密な検索機能で確実な原因特定を行う。

## 注意事項
- **Model: Opus（複雑なバグ）/ Sonnet（単純なバグ）** - バグの複雑さに応じて選択
- 複雑なバグや再現困難なバグは必ず**ultrathink**で深く分析すること
- Serenaの検索機能で関連コードを漏れなく調査すること
- 思い込みを排除し、データに基づいた分析を行うこと

## 必要な入力
- バグの症状・エラーメッセージ
- 再現手順
- 発生環境（開発/本番）
- 関連するログ

## Serena活用ポイント
```bash
# 1. エラー関連の調査
search_for_pattern("エラーメッセージの一部")
find_symbol("エラーが発生しているクラス/関数")

# 2. 影響範囲の特定
find_referencing_symbols("問題のあるシンボル")
get_symbols_overview("関連モジュール")

# 3. 過去の知見確認
read_memory("common_pitfalls_*")
```

## タスクに含まれるべきTODO
1. ユーザの報告を理解し、調査開始をコンソールで通知
2. バグの再現を試みる（可能な場合）
3. **複雑なバグの場合はultrathinkで根本原因を深く分析**
4. エラーログ・スタックトレースを詳細に分析
5. Serenaでエラー発生箇所を特定
   - `search_for_pattern()` でエラーメッセージを検索
   - `find_symbol()` で関連シンボルを特定
6. データフローを追跡
   - `find_referencing_symbols()` で呼び出し元を確認
   - 入力から出力までの処理経路を把握
7. 関連コンポーネントの調査
   - DB操作、API通信、状態管理など
8. 影響範囲の特定
   - 同様のパターンを使用している箇所
   - 依存している機能
9. 根本原因の仮説立案と検証
10. 調査結果を `docs/investigate/bug-investigate_{TIMESTAMP}.md` に保存
11. 発見した問題パターンをSerenaメモリに記録
12. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
13. 調査結果ファイル名をコンソール出力

## 調査チェックリスト
- [ ] エラーの直接的な原因
- [ ] エラーが発生する条件
- [ ] 影響を受ける機能・ユーザー
- [ ] データ整合性への影響
- [ ] セキュリティへの影響
- [ ] 関連する過去の修正履歴
- [ ] 回避策の有無

## 出力ファイル
- `docs/investigate/bug-investigate_{TIMESTAMP}.md`

## 最終出力形式
### 原因特定完了の場合
status: SUCCESS
next: BUG-FIX
details: "バグの根本原因を特定。bug-investigate_{TIMESTAMP}.mdに詳細記録。修正フェーズへ移行。"

### 再現できない場合
status: CANNOT_REPRODUCE
next: USER_INPUT
details: "バグを再現できず。bug-investigate_{TIMESTAMP}.mdに調査内容記録。追加情報が必要。"

### より深い調査が必要な場合
status: NEED_DEEP_ANALYSIS
next: ROOT-CAUSE-ANALYSIS
details: "複雑な問題。bug-investigate_{TIMESTAMP}.mdに初期調査記録。詳細分析へ移行。"