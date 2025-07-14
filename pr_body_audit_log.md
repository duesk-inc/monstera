## 概要
監査ログ記録時に発生している`context canceled`エラーを修正しました。

## 問題
HTTPレスポンス返却後にgoroutineで監査ログを記録する際、元のリクエストコンテキストがキャンセルされているため、データベース操作でエラーが発生していました。

## 変更内容
- [x] ミドルウェアでバックグラウンドコンテキストを作成
- [x] サービスインターフェースを更新してコンテキストを受け取るように変更
- [x] 単体テストを追加

## 技術的詳細
### 修正前
```go
go func() {
    if err := auditService.LogHTTPRequest(
        c,  // HTTPリクエストのGinコンテキスト
        userID.(uuid.UUID),
        // ...
    ); err != nil {
        // context canceled エラーが発生
    }
}()
```

### 修正後
```go
go func() {
    ctx := context.Background()  // 新しいコンテキストを作成
    if err := auditService.LogHTTPRequest(
        ctx,
        c,
        userID.(uuid.UUID),
        // ...
    ); err != nil {
        // エラーが解消される
    }
}()
```

## テスト
- [x] 単体テスト追加
- [ ] 統合テスト実施
- [ ] 手動テスト実施

## 確認項目
- [x] コーディング規約に準拠
- [x] エラーハンドリング実装
- [x] 既存機能への影響なし

## 関連Issue
- なし

## 関連ドキュメント
- 調査結果: `docs/investigate/investigate_20250713_153253.md`
- 実装計画: `docs/plan/plan_20250713_155631.md`