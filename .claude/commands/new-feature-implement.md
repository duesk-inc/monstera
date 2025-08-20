# NEW-FEATURE-IMPLEMENT フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
計画に基づき、新規機能を高品質に実装する。Serenaの機能を最大限活用し、既存コードとの一貫性を保つ。

## 注意事項
- **Model: Sonnet** - 実装フェーズは既定のパターンに従うため、通常はSonnetで十分
- ただし、複雑なロジックの実装時は**ultrathink**を使用すること
- Serenaのシンボル操作機能を使い、安全で正確な実装を行うこと
- 小さなコミット単位で段階的に実装すること

## 必要な入力ファイル
- `docs/plan/new-feature-plan_{TIMESTAMP}.md` - 実装計画書
- 関連する既存コード

## Serena活用ポイント
```bash
# 1. 実装前の確認
read_memory("task_completion_checklist")
get_symbols_overview("実装対象ディレクトリ")

# 2. 安全な実装
find_symbol("変更対象シンボル")
find_referencing_symbols("変更対象")  # 影響確認
replace_symbol_body()  # シンボル単位の置換
insert_after_symbol()  # 新規追加

# 3. 実装中の検証
think_about_task_adherence()
think_about_collected_information()
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、実装開始をコンソールで通知
2. 最新の実装計画を読み込み
3. Serenaメモリから実装規約を確認
4. 現在のブランチを確認（必要に応じて新規作成）
5. **データモデル実装**（必要な場合）
   - マイグレーションファイル作成
   - モデル定義の追加/更新
6. **バックエンド実装**
   - Repository層の実装
   - Service層の実装
   - Handler層の実装
   - DTOの定義
7. **フロントエンド実装**
   - API通信サービスの実装
   - 状態管理の実装
   - UIコンポーネントの実装
8. **各実装段階でのSerena活用**
   - `find_referencing_symbols()` で影響確認
   - `replace_symbol_body()` で安全な変更
   - `think_about_task_adherence()` で規約遵守確認
9. **単体テストの実装**
10. 段階的なコミット（機能単位）
11. `.cursor/rules/COMMIT_AND_PR_GUIDELINES.md`に従ったコミット・プッシュ
12. 実装詳細を `docs/implement/new-feature-implement_{TIMESTAMP}.md` に記録
13. 新しい実装パターンをSerenaメモリに保存
14. Draft PRの作成または更新
15. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
16. 実装ファイル、PR番号をコンソール出力

## 実装チェックリスト
- [ ] 既存の命名規則に従っているか
- [ ] エラーハンドリングが適切か
- [ ] 入力検証が両層で実装されているか
- [ ] 認証・認可が正しく実装されているか
- [ ] ログ出力が適切か
- [ ] テストが実装されているか
- [ ] ドキュメントコメントが記載されているか

## 品質確認コマンド
```bash
# バックエンド
make test-backend
make lint

# フロントエンド
make test-frontend
make lint

# ビルド確認
make build
```

## 出力ファイル
- `docs/implement/new-feature-implement_{TIMESTAMP}.md`

## 最終出力形式
### 実装完了の場合
status: SUCCESS
next: TEST
details: "新規機能実装完了。new-feature-implement_{TIMESTAMP}.mdに詳細記録。テストフェーズへ移行。"

### 追加作業が必要な場合
status: PARTIAL_COMPLETE
next: NEW-FEATURE-IMPLEMENT
details: "Phase 1完了。new-feature-implement_{TIMESTAMP}.mdに詳細記録。Phase 2実装へ。"

### 設計変更が必要な場合
status: NEED_REDESIGN
next: NEW-FEATURE-PLAN
details: "実装中に設計課題発見。new-feature-implement_{TIMESTAMP}.mdに詳細記録。計画見直しへ。"