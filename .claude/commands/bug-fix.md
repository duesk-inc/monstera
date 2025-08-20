# BUG-FIX フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
調査で特定した根本原因に基づき、バグを確実に修正する。影響を最小限に抑え、デグレを防止する。

## 注意事項
- **Model: Sonnet** - 通常の修正作業はSonnetで十分
- ただし、複雑な修正ロジックが必要な場合は**ultrathink**を使用
- Serenaの`find_referencing_symbols`で必ず影響範囲を確認すること
- 修正前後で既存のテストが通ることを確認すること

## 必要な入力ファイル
- `docs/investigate/bug-investigate_{TIMESTAMP}.md` - 調査結果
- 関連するテストコード

## Serena活用ポイント
```bash
# 1. 修正前の確認
find_symbol("修正対象シンボル")
find_referencing_symbols("修正対象")  # 影響確認必須

# 2. 安全な修正
replace_symbol_body()  # シンボル単位の置換
replace_regex()  # 部分的な修正

# 3. 修正後の検証
think_about_task_adherence()
think_about_whether_you_are_done()
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、修正開始をコンソールで通知
2. 最新の調査結果を読み込み、修正方針を確認
3. 現在のブランチを確認（bugfix/ブランチ作成）
4. **修正前の影響確認（必須）**
   - `find_referencing_symbols()` で参照箇所を完全把握
   - 既存テストの確認
5. **バグ修正の実装**
   - 最小限の変更で確実に修正
   - エラーハンドリングの改善
   - 入力検証の強化（必要な場合）
6. **テストの追加・修正**
   - バグを再現するテストケース追加
   - 修正を検証するテストケース追加
   - 既存テストの更新（必要な場合）
7. **リグレッションテスト**
   - `make test-backend` / `make test-frontend`
   - 関連機能の動作確認
8. **コード品質確認**
   - `make lint` でリントチェック
   - `make format` でフォーマット
9. 修正内容を適切にコミット
10. `.cursor/rules/COMMIT_AND_PR_GUIDELINES.md`に従ったコミット・プッシュ
11. 修正詳細を `docs/fix/bug-fix_{TIMESTAMP}.md` に記録
12. 同様のバグを防ぐパターンをSerenaメモリに保存
13. Draft PRの作成または更新
14. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
15. 修正ファイル、PR番号をコンソール出力

## 修正チェックリスト
- [ ] 根本原因が解決されているか
- [ ] 影響範囲をすべて修正したか
- [ ] テストケースを追加したか
- [ ] 既存のテストが通るか
- [ ] エラーハンドリングは適切か
- [ ] パフォーマンスへの影響はないか
- [ ] セキュリティの問題はないか

## 出力ファイル
- `docs/fix/bug-fix_{TIMESTAMP}.md`

## 最終出力形式
### 修正完了の場合
status: SUCCESS
next: TEST
details: "バグ修正完了。bug-fix_{TIMESTAMP}.mdに詳細記録。テストフェーズへ移行。"

### 追加修正が必要な場合
status: PARTIAL_FIX
next: BUG-FIX
details: "部分的な修正完了。bug-fix_{TIMESTAMP}.mdに詳細記録。関連箇所の修正継続。"

### より大きな変更が必要な場合
status: NEED_REFACTORING
next: REFACTOR-PLAN
details: "根本的な改善が必要。bug-fix_{TIMESTAMP}.mdに詳細記録。リファクタリングへ移行。"