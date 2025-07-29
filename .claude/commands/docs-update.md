# DOCS-UPDATE フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
監査で特定された古い情報を、現在のコードベースに基づいて体系的に更新する。正確性と一貫性を保ちながら、ドキュメントの鮮度を維持する。

## 注意事項
- **Model: Sonnet** - 通常の更新作業はSonnetで十分
- ただし、大規模な書き直しや技術的に複雑な内容は**ultrathink**を使用
- Serenaで必ず最新のコード情報を確認してから更新すること
- 更新履歴を明確に記録すること

## 必要な入力ファイル
- `docs/audit/docs-audit_{TIMESTAMP}.md` - 監査結果
- 更新対象ドキュメントのリスト
- 優先順位指定（あれば）

## Serena活用ポイント
```bash
# 1. 最新実装の確認
find_symbol("ドキュメントに記載のシンボル", include_body=True)
get_symbols_overview("関連ディレクトリ")

# 2. API仕様の取得
find_symbol("Handler", depth=2)
search_for_pattern("@router|@route|router\.")

# 3. データモデルの確認
search_for_pattern("type.*struct|interface")
find_symbol("Model|Entity", depth=1)

# 4. 設定値の確認
search_for_pattern("config\.|env\.|getenv")
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、更新開始をコンソールで通知
2. 現在のブランチを確認（通常は`docs/audit-<目的>`から継続）
3. 監査結果から更新対象を抽出
4. 更新優先度の決定
5. **各ドキュメントの更新作業**
   - 現在の内容を読み込み
   - Serenaで最新のコード情報を収集
   - 差分を特定
   - 内容を更新
6. **更新タイプ別の処理**
   - **API仕様更新**
     - エンドポイントの確認
     - リクエスト/レスポンス形式
     - 認証要件
   - **データモデル更新**
     - テーブル定義
     - 型定義
     - 制約条件
   - **設定・環境情報更新**
     - 環境変数
     - 設定ファイル
     - デフォルト値
   - **アーキテクチャ図更新**
     - コンポーネント構成
     - データフロー
     - 依存関係
7. **更新品質の確保**
   - 技術的正確性
   - 読みやすさ
   - 一貫性
   - 完全性
8. **更新履歴の記録**
   - 更新日時
   - 更新内容の要約
   - 更新理由
9. **相互参照の更新**
   - 内部リンクの修正
   - 関連ドキュメントへの参照
10. 更新結果を `docs/update/docs-update_{TIMESTAMP}.md` に記録
11. 更新パターンをSerenaメモリに保存
12. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
13. 更新ファイル数、主な変更点、ブランチ名をコンソール出力

## 更新チェックリスト
- [ ] コードとの整合性確認
- [ ] 専門用語の統一
- [ ] バージョン情報の更新
- [ ] 図表の最新化
- [ ] サンプルコードの動作確認
- [ ] 参照リンクの有効性
- [ ] 更新日時の記載

## 更新テンプレート
```markdown
---
最終更新日: YYYY-MM-DD
更新者: Claude Code & Serena
更新理由: [監査結果に基づく定期更新/機能変更に伴う更新]
---

## 更新履歴
- YYYY-MM-DD: [更新内容の要約]
```

## 出力ファイル
- `docs/update/docs-update_{TIMESTAMP}.md`
- 更新された各ドキュメントファイル

## 最終出力形式
### 更新完了の場合
status: SUCCESS
next: NONE
details: "ドキュメント更新完了。docs-update_{TIMESTAMP}.mdに詳細記録。X件のファイルを更新。"

### 部分更新完了の場合
status: PARTIAL_COMPLETE
next: DOCS-UPDATE
details: "Phase 1更新完了。docs-update_{TIMESTAMP}.mdに詳細記録。残りY件の更新継続。"

### 大規模な書き直しが必要な場合
status: NEEDS_REWRITE
next: NEW-FEATURE-PLAN
details: "大幅な書き直しが必要。docs-update_{TIMESTAMP}.mdに詳細記録。計画フェーズへ。"