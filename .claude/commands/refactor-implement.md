# REFACTOR-IMPLEMENT フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
リファクタリング計画に基づき、段階的かつ安全にコードを改善する。各段階でテストを実行し、品質を維持する。

## 注意事項
- **Model: Sonnet** - 計画に従った実装作業はSonnetで十分
- ただし、複雑な設計変更が必要になった場合は**ultrathink**を使用
- Serenaのシンボル操作を活用し、正確な変更を行うこと
- 各Phaseの完了時に必ずテストを実行すること

## 必要な入力ファイル
- `docs/plan/refactor-plan_{TIMESTAMP}.md` - リファクタリング計画
- 関連するテストコード

## Serena活用ポイント
```bash
# 1. Phase開始時の確認
read_memory("refactor_plan_phase_X")
find_referencing_symbols("変更対象")

# 2. 安全な変更
replace_symbol_body()  # クラス/関数単位での置換
insert_before_symbol() # 新規追加

# 3. 変更後の検証
think_about_task_adherence()
find_referencing_symbols("新しい実装")  # 正しく参照されているか
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、実装開始をコンソールで通知
2. 最新のリファクタリング計画を読み込み
3. 現在のPhaseと進捗を確認
4. 現在のブランチを確認（refactor/xxxブランチ）
5. **Phase X の実装**
   - 計画に従った構造変更
   - インターフェースの改善
   - 依存関係の整理
6. **Serenaを活用した安全な変更**
   - `find_symbol()` で正確な位置特定
   - `replace_symbol_body()` で確実な置換
   - `find_referencing_symbols()` で影響確認
7. **既存テストの修正**
   - 変更に合わせてテストを更新
   - テストが通ることを確認
8. **リファクタリング固有のテスト追加**
   - パフォーマンステスト（改善を確認）
   - 後方互換性テスト（必要な場合）
9. **品質確認**
   - `make test` で全テスト実行
   - `make lint` でコード品質確認
   - カバレッジの維持/向上
10. Phase完了をコミット
11. 実装詳細を `docs/implement/refactor-implement_{TIMESTAMP}.md` に記録
12. 改善されたパターンをSerenaメモリに保存
13. Draft PRの更新
14. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
15. 完了Phase、次のPhase情報をコンソール出力

## Phase実装チェックリスト
- [ ] 計画通りの変更か
- [ ] テストはすべて通るか
- [ ] パフォーマンスは改善/維持されているか
- [ ] コードの可読性は向上したか
- [ ] 依存関係は整理されたか
- [ ] ドキュメントは更新したか
- [ ] 次のPhaseへの準備は整ったか

## 各Phaseの品質ゲート
```bash
# Phase完了前に必ず実行
make test              # 全テスト成功
make lint              # リントエラー0
make build             # ビルド成功
git diff --check       # 空白エラーなし
```

## 出力ファイル
- `docs/implement/refactor-implement_{TIMESTAMP}.md`

## 最終出力形式
### Phase完了の場合
status: PHASE_COMPLETE
next: REFACTOR-IMPLEMENT
details: "Phase X完了。refactor-implement_{TIMESTAMP}.mdに詳細記録。Phase Y実装へ移行。"

### 全Phase完了の場合
status: SUCCESS
next: TEST
details: "リファクタリング完了。refactor-implement_{TIMESTAMP}.mdに詳細記録。統合テストへ移行。"

### 計画修正が必要な場合
status: NEED_REPLAN
next: REFACTOR-PLAN
details: "実装中に課題発見。refactor-implement_{TIMESTAMP}.mdに詳細記録。計画見直しへ。"