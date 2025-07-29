# FEATURE-REMOVAL フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
不要になった機能を安全に削除し、システムの保守性を向上させる。依存関係を完全に把握し、影響を最小限に抑える。

## 注意事項
- **Model: Opus** - 機能削除は影響範囲が広いため、必ず**ultrathink**で深く検討すること
- Serenaの`find_referencing_symbols`で完全な影響分析を行うこと
- 削除前に必ずバックアップやロールバック計画を立てること
- データベースへの影響も含めて総合的に判断すること

## 必要な入力
- 削除対象機能の明確な定義
- 削除理由（廃止、置き換え、統合など）
- 移行計画（必要な場合）

## Serena活用ポイント
```bash
# 1. 削除対象の完全把握
get_symbols_overview("削除対象ディレクトリ")
find_symbol("削除対象クラス/関数", depth=3)

# 2. 影響範囲の分析（最重要）
find_referencing_symbols("削除対象")  # すべての参照を確認
search_for_pattern("削除対象の名前")  # 文字列参照も確認

# 3. 依存関係の追跡
think_about_collected_information()
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、削除作業開始をコンソールで通知
2. 削除対象機能の仕様を完全に理解
3. **ultrathinkで削除の影響を深く分析**
4. 現在のブランチを確認（feature/remove-xxxブランチ作成）
5. **完全な影響分析**
   - `find_referencing_symbols()` ですべての参照箇所特定
   - API エンドポイントの利用状況確認
   - データベーステーブル/カラムの依存確認
   - フロントエンドの利用箇所確認
6. **削除計画の策定**
   - 削除順序の決定（依存関係を考慮）
   - 段階的削除か一括削除かの判断
   - ロールバック計画の作成
7. **データ移行計画**（必要な場合）
   - 既存データの扱い決定
   - アーカイブの必要性確認
8. **削除前の安全確認**
   - 削除対象のバックアップ
   - テスト環境での動作確認
9. **段階的な削除実行**
   - フロントエンドの機能無効化
   - APIエンドポイントの削除
   - サービス層の削除
   - データ層の削除
   - データベース変更（最後に実行）
10. **削除後の確認**
    - 関連テストの削除/更新
    - ドキュメントの更新
    - 不要な依存関係の削除
11. 各段階でのコミット
12. 削除詳細を `docs/removal/feature-removal_{TIMESTAMP}.md` に記録
13. Serenaメモリから削除機能に関する情報を削除
14. Draft PRの作成
15. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
16. 削除対象一覧、PR番号をコンソール出力

## 削除チェックリスト
- [ ] すべての参照箇所を特定したか
- [ ] 代替機能は用意されているか（必要な場合）
- [ ] データの扱いは決定したか
- [ ] ロールバック手順は明確か
- [ ] 関連ドキュメントを更新したか
- [ ] 不要なテストを削除したか
- [ ] パフォーマンスへの影響を確認したか

## 安全確認コマンド
```bash
# 削除前の最終確認
make test  # すべてのテストが通ることを確認
grep -r "削除対象機能名" --exclude-dir={.git,node_modules,vendor}

# ビルド確認
make build
```

## 出力ファイル
- `docs/removal/feature-removal_{TIMESTAMP}.md`

## 最終出力形式
### 削除完了の場合
status: SUCCESS
next: TEST
details: "機能削除完了。feature-removal_{TIMESTAMP}.mdに詳細記録。システムテストへ移行。"

### 段階的削除中の場合
status: PARTIAL_COMPLETE
next: FEATURE-REMOVAL
details: "Phase 1削除完了。feature-removal_{TIMESTAMP}.mdに詳細記録。次フェーズへ。"

### リスクが高い場合
status: HIGH_RISK
next: USER_INPUT
details: "削除による影響が大きい。feature-removal_{TIMESTAMP}.mdに詳細記録。再検討を推奨。"