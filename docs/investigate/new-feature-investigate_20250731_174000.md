# 新機能調査報告書: 経費申請一覧の編集機能追加

**調査日時**: 2025-07-31 17:40:00  
**調査者**: Claude Code  
**要件**: 経費申請一覧に、申請データの編集機能を追加したい

## 1. 要件分析

### ユーザー要件
- 経費申請一覧画面から直接編集機能にアクセスできるようにする
- 編集可能な申請を一覧で識別しやすくする
- 効率的な編集作業フローを実現する

### 想定されるユースケース
1. 下書き状態の経費申請を一覧から素早く編集
2. 申請内容の確認と修正を効率的に実施
3. 複数の下書きがある場合の管理性向上

## 2. 既存システムの調査結果

### バックエンド実装状況
- ✅ 編集API実装済み: `PUT /api/v1/expenses/{id}`
- ✅ 編集権限チェック実装済み
- ✅ 編集可能条件: `status === 'draft'` のみ
- ✅ サービス層実装: `expenseService.Update()`

### フロントエンド実装状況
- ✅ 編集専用ページ実装済み: `/expenses/[id]/edit`
- ❌ 一覧画面からの編集アクセス機能なし
- 📄 現在の一覧画面構成:
  - `ExpensesPage`: 一覧表示ページ
  - `ExpenseHistoryView`: 履歴テーブルコンポーネント
  - `HistoryTable`: 汎用履歴テーブル

### データモデル
```go
// 編集可能チェックメソッド（既存）
func (e *Expense) CanEdit() bool {
    return e.Status == ExpenseStatusDraft
}
```

## 3. 実装アプローチ

### 推奨実装方法
1. **アクションカラムの追加**
   - `createExpenseHistoryColumns`にアクション列を追加
   - 編集可能な行にのみ編集ボタンを表示

2. **編集ボタンの条件表示**
   - ステータスが`draft`の場合のみ編集ボタンを表示
   - 他のステータスでは詳細表示へのリンクのみ

3. **UI/UXの改善**
   - 編集可能な行を視覚的に区別（背景色など）
   - 編集ボタンにアイコン（EditIcon）を使用

## 4. 必要な変更箇所

### フロントエンド変更
1. **`HistoryTable.tsx`**
   - アクション列のサポート追加
   - 条件付きレンダリングの実装

2. **`createExpenseHistoryColumns`**
   - アクション列の追加
   - 編集ボタンのレンダリング

3. **`ExpenseHistoryView.tsx`**
   - ルーター機能の追加
   - 編集ページへのナビゲーション処理

4. **`ExpensesPage.tsx`**
   - 編集可能な申請の強調表示オプション

### バックエンド変更
- 不要（既存APIで対応可能）

## 5. 実装計画概要

### フェーズ1: 基本機能実装
1. HistoryTableコンポーネントの拡張
2. アクション列の追加
3. 編集ボタンの条件表示

### フェーズ2: UI/UX改善
1. 編集可能行の視覚的区別
2. ツールチップの追加
3. 編集不可理由の表示

### フェーズ3: テストと最適化
1. ユニットテストの作成
2. E2Eテストの追加
3. パフォーマンス最適化

## 6. セキュリティ考慮事項

### 認証・認可
- ✅ 既存の認証機能で対応可能
- ✅ 編集権限はバックエンドで検証済み
- ✅ フロントエンドでの表示制御は補助的

### データ保護
- 編集画面遷移時のデータ保護
- 未保存データの警告表示

## 7. パフォーマンス影響

### 予想される影響
- 最小限の影響（ボタン追加のみ）
- 既存のデータフェッチ処理に変更なし
- クライアントサイドのレンダリング負荷増加は軽微

### 最適化案
- 編集可能チェックの効率化
- メモ化による再レンダリング抑制

## 8. リスクと課題

### 技術的リスク
- **低**: 既存機能の拡張のため技術的リスクは低い
- **中**: HistoryTableの汎用性を保ちながら拡張する必要

### ユーザビリティ課題
- 編集可能/不可の区別を明確にする必要
- 誤操作防止の仕組みが必要

### 保守性
- 共通コンポーネントの変更による影響範囲
- 他の履歴表示機能への波及効果

## 9. 代替案

### 代替案1: バルク編集機能
- 複数の下書きを一括編集
- より高度なUI実装が必要

### 代替案2: インライン編集
- 一覧画面上で直接編集
- 実装複雑度が高い

## 10. 推奨事項

### 実装推奨度: **高**
- 技術的実現性: ✅ 高
- ユーザー価値: ✅ 高
- 実装コスト: ✅ 低〜中

### 次のステップ
1. UI/UXデザインの詳細設計
2. HistoryTableコンポーネントの拡張仕様策定
3. 実装計画の詳細化

## 11. 結論

経費申請一覧への編集機能追加は、既存のアーキテクチャと整合性が高く、技術的に実現可能です。バックエンドAPIは既に実装済みで、フロントエンドの変更のみで対応できます。実装コストも比較的低く、ユーザーの作業効率向上に大きく貢献する機能となります。

## チェックリスト

- ✅ 既存システムとの統合ポイント: 明確
- ✅ データモデルへの影響: なし
- ✅ API設計の方針: 既存API活用
- ✅ UI/UXの実装方針: アクション列追加
- ✅ 認証・認可の要件: 既存機能で対応
- ✅ パフォーマンス要件: 影響軽微
- ✅ テスト戦略: 単体・E2Eテスト必要
- ✅ 既存機能への影響範囲: 限定的