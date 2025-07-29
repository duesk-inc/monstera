# ROOT-CAUSE-ANALYSIS フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
システムの問題や障害の根本原因を体系的に分析し、再発防止策を提案する。表面的な症状ではなく、本質的な原因を特定する。

## 注意事項
- **Model: Opus** - 根本原因分析には必ず**ultrathink**で深く検討すること
- Serenaの検索機能を駆使して、関連する全ての情報を収集すること
- 「なぜ？」を5回繰り返す（5 Whys）手法を活用すること
- 時系列での分析と因果関係の明確化を重視すること

## 必要な入力
- 問題の症状（エラーメッセージ、異常動作など）
- 発生時期と頻度
- 影響範囲
- 関連ログやデータ

## Serena活用ポイント
```bash
# 1. エラーパターンの検索
search_for_pattern("エラーメッセージ")
search_for_pattern("スタックトレース")

# 2. 関連コードの分析
find_symbol("問題の関数/クラス", include_body=True)
find_referencing_symbols("問題箇所")

# 3. 変更履歴の確認
search_for_pattern("git log.*問題のファイル")

# 4. 類似問題の検索
read_memory("common_pitfalls_*")
search_for_pattern("類似のエラーパターン")
```

## タスクに含まれるべきTODO
1. ユーザの問題を理解し、分析開始をコンソールで通知
2. 問題の詳細情報を整理
3. **ultrathinkで問題の本質を深く分析**
4. **データ収集フェーズ**
   - エラーログの収集と分析
   - システムメトリクスの確認
   - 関連するコードの特定
   - 最近の変更履歴確認
5. **時系列分析**
   - 問題発生前後の状態変化
   - トリガーとなったイベント
   - 関連する他の事象
6. **原因の層別分析**
   - 直接原因（Immediate Cause）
   - 寄与要因（Contributing Factors）
   - 根本原因（Root Cause）
   - システム的原因（Systemic Cause）
7. **5 Whys分析**
   - なぜ1: 症状の直接原因
   - なぜ2-4: 中間原因の掘り下げ
   - なぜ5: 根本原因の特定
8. **影響範囲の特定**
   - 直接的な影響
   - 潜在的な影響
   - 他システムへの波及
9. **再現手順の確立**
   - 最小再現コード
   - 再現条件の明確化
10. **対策案の検討**
    - 短期的対策（ワークアラウンド）
    - 中期的対策（修正）
    - 長期的対策（予防）
11. **類似問題の調査**
    - 同様のパターンの検索
    - 潜在的なリスク箇所
12. 分析結果を `docs/analysis/root-cause-analysis_{TIMESTAMP}.md` に保存
13. 発見した問題パターンをSerenaメモリに記録
14. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
15. 根本原因、推奨対策をコンソール出力

## 分析フレームワーク
### 1. 問題の定義
- What: 何が起きたか
- When: いつ起きたか
- Where: どこで起きたか
- Who: 誰が影響を受けたか
- How: どのように起きたか

### 2. 因果関係図
```
症状
  └─> 直接原因
      └─> 中間原因1
          └─> 中間原因2
              └─> 根本原因
```

### 3. 対策マトリクス
| 対策 | 効果 | 実装コスト | 優先度 |
|------|------|-----------|--------|
| - | - | - | - |

## 出力ファイル
- `docs/analysis/root-cause-analysis_{TIMESTAMP}.md`

## 最終出力形式
### 分析完了（修正可能）の場合
status: SUCCESS
next: BUG-FIX
details: "根本原因を特定。root-cause-analysis_{TIMESTAMP}.mdに詳細記録。原因: [要約]。修正フェーズへ移行。"

### 分析完了（設計見直し必要）の場合
status: DESIGN_ISSUE
next: REFACTOR-ANALYZE
details: "設計上の問題を発見。root-cause-analysis_{TIMESTAMP}.mdに詳細記録。リファクタリングを推奨。"

### 追加調査が必要な場合
status: NEED_MORE_INFO
next: INVESTIGATE
details: "初期分析完了。root-cause-analysis_{TIMESTAMP}.mdに記録。[必要な情報]の追加調査が必要。"