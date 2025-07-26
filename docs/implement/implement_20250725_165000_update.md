# 実装詳細（追加修正）：モック環境でのファイルアップロードエラー修正

## 実装概要
- **実装日時**: 2025-07-25 16:50:00
- **実装担当**: Claude
- **対象問題**: モック環境でのファイルアップロード時のlocalhost:9000接続エラー
- **対象ブランチ**: fix/receipt-upload-s3key-error（同一ブランチで継続作業）
- **PR番号**: #51（更新）

## 問題の詳細
初回の修正後、以下のエラーが発生：
```
PUT http://localhost:9000/mock-bucket/expenses/.../Receipt-2518-2457-9434.pdf?mock=true net::ERR_CONNECTION_REFUSED
```

### 原因
- モックS3サービスが`http://localhost:9000/mock-bucket/...`というURLを返していた
- しかし、localhost:9000にはMinIOサーバーが起動していない
- docker-compose.ymlにもMinIOの設定がない

## 実装内容

### 1. モックS3サービスの修正
`/backend/internal/service/mock_s3_service.go`
```go
// 変更前
uploadURL := fmt.Sprintf("http://localhost:9000/mock-bucket/%s?mock=true", s3Key)

// 変更後
uploadURL := fmt.Sprintf("http://localhost:8080/api/v1/mock-upload/%s?mock=true", s3Key)
```

### 2. モックアップロードエンドポイントの追加
`/backend/cmd/server/main.go`
```go
// 開発環境用のモックアップロードエンドポイント
if os.Getenv("USE_MOCK_S3") == "true" || os.Getenv("GO_ENV") == "development" {
    mockUpload := api.Group("/mock-upload")
    {
        // モックアップロードハンドラー（PUTリクエストを受け取って成功を返す）
        mockUpload.PUT("/*filepath", func(c *gin.Context) {
            logger.Info("Mock upload received",
                zap.String("path", c.Param("filepath")),
                zap.String("method", c.Request.Method))
            
            // 成功レスポンスを返す
            c.Status(http.StatusOK)
        })
    }
}
```

## 実装のポイント

### 1. 開発環境の考慮
- `USE_MOCK_S3`環境変数または`GO_ENV=development`の場合のみモックエンドポイントを有効化
- 本番環境には影響しない

### 2. シンプルなモック実装
- PUTリクエストを受け取って常に成功（200 OK）を返す
- 実際のファイル保存は行わない（開発環境では不要）

### 3. 既存のフローを維持
- フロントエンドのコード変更は不要
- 既存のアップロードフローをそのまま使用可能

## コミット情報
- コミットハッシュ: f017765
- コミットメッセージ: `fix(backend): モック環境でのファイルアップロードエラーを修正`

## 次のステップ
1. 開発環境での動作確認
2. 領収書アップロードの全体フローをテスト
3. PRのレビューとマージ

## 関連ドキュメント
- [初回実装詳細](./implement_20250725_164000.md)
- [Pull Request #51](https://github.com/duesk-inc/monstera/pull/51)