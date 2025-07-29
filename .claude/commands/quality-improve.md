# QUALITY-IMPROVE フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
品質監査で特定された改善点を体系的に修正し、コード品質・保守性・パフォーマンスを向上させる。設計書も同時に更新する。

## 注意事項
- **Model: Sonnet** - 通常の改善作業はSonnetで十分
- ただし、アーキテクチャレベルの改善や複雑な最適化は**ultrathink**を使用
- Serenaのシンボル操作を活用して安全に修正すること
- 設計書の更新も忘れずに行うこと

## 必要な入力ファイル
- `docs/audit/quality-audit_{TIMESTAMP}.md` - 品質監査結果
- 関連する設計書（`docs/05_design/`）
- 優先順位指定（あれば）

## Serena活用ポイント
```bash
# 1. 改善対象の正確な特定
find_symbol("改善対象", include_body=True)
find_referencing_symbols("改善対象")

# 2. 安全な修正
replace_symbol_body()  # 関数単位の置換
replace_regex()        # 部分的な修正

# 3. 設計書の更新
search_for_pattern("改善対象", "docs/05_design")
find_file("*機能名*.md", "docs/05_design")

# 4. テストの確認
find_symbol("Test改善対象")
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、改善作業開始をコンソールで通知
2. 品質監査結果から改善項目を抽出
3. 優先順位に基づいて作業順序を決定
4. **カテゴリ別の改善作業**
   - **コード品質改善**
     - 重複コードの統合
     - 複雑な関数の分割
     - 命名の改善
     - コメント・ドキュメント追加
   - **エラーハンドリング改善**
     - 適切なエラー型の定義
     - リカバリー処理の追加
     - ログ出力の充実
     - ユーザーフレンドリーなメッセージ
   - **パフォーマンス改善**
     - N+1問題の解消
     - 不要なデータ取得削除
     - キャッシュの追加
     - アルゴリズムの最適化
   - **セキュリティ改善**
     - 入力検証の強化
     - 認証・認可の修正
     - 脆弱性の修正
   - **テスト改善**
     - 不足テストの追加
     - テストの可読性向上
     - モックの適切な使用
5. **設計書の確認と更新**
   - 改善に伴う設計変更の反映
   - 新しいパターンの文書化
   - 設計書がない場合は作成
6. **リファクタリング実施**
   - Serenaで影響範囲確認
   - 段階的な修正実施
   - 各段階でのテスト実行
7. **品質メトリクスの測定**
   - 改善前後の比較
   - カバレッジの向上確認
   - パフォーマンス指標確認
8. **レビューポイントの作成**
   - 主要な変更点リスト
   - 改善効果の説明
   - 今後の推奨事項
9. 適切なコミット単位で変更を記録
10. 改善詳細を `docs/improve/quality-improve_{TIMESTAMP}.md` に保存
11. 改善パターンをSerenaメモリに記録
12. Draft PRの作成または更新
13. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
14. 改善項目数、効果をコンソール出力

## 改善チェックリスト
- [ ] すべての指摘事項に対応したか
- [ ] 新たな問題を作り込んでいないか
- [ ] テストは追加・更新したか
- [ ] 設計書は更新したか
- [ ] パフォーマンスは向上したか
- [ ] コードは読みやすくなったか
- [ ] セキュリティは強化されたか

## 改善効果の測定
```bash
# コード品質
make lint
go vet ./...

# テストカバレッジ
go test -cover ./...

# パフォーマンス
make benchmark

# セキュリティ
make security-scan
```

## 出力ファイル
- `docs/improve/quality-improve_{TIMESTAMP}.md`
- 更新された設計書

## 最終出力形式
### 改善完了の場合
status: SUCCESS
next: TEST
details: "品質改善完了。quality-improve_{TIMESTAMP}.mdに詳細記録。X件改善、品質スコアY%向上。"

### 部分的改善の場合
status: PARTIAL_COMPLETE
next: QUALITY-IMPROVE
details: "優先度高の改善完了。quality-improve_{TIMESTAMP}.mdに詳細記録。残りZ件。"

### 大規模な変更が必要な場合
status: NEEDS_REFACTORING
next: REFACTOR-ANALYZE
details: "構造的な問題発見。quality-improve_{TIMESTAMP}.mdに詳細記録。リファクタリング推奨。"

### 設計書作成が必要な場合
status: NEEDS_DESIGN_DOC
next: NEW-FEATURE-PLAN
details: "設計書なし。quality-improve_{TIMESTAMP}.mdに詳細記録。設計書作成へ移行。"