# エンジニアCognito連携パターン

## 概要
エンジニア新規登録時にCognitoユーザーを同時に作成するパターン

## 実装パターン

### サービス層での連携
```go
// EngineerServiceにCognitoAuthServiceを注入
type engineerService struct {
    cognitoAuth CognitoAuthService
    config      *config.Config
    // 既存の依存...
}
```

### トランザクション管理
1. Cognito作成（トランザクション外）
2. DB保存（トランザクション内）
3. DBエラー時はCognitoユーザーを手動削除

### 環境別処理
- 本番環境（COGNITO_ENABLED=true）: Cognito連携
- 開発環境（COGNITO_ENABLED=false）: DBのみ、UUID生成

### エラーハンドリング
```go
if err != nil && cognitoSub != "" {
    // Cognitoユーザーのロールバック
    s.cognitoAuth.DeleteUser(ctx, email)
}
```

## 注意点
- Cognito操作はロールバック不可
- 初期パスワードの管理（メールアドレスまたは指定値）
- 既存データの移行が必要な場合は別途対応

## 関連ファイル
- `backend/internal/service/engineer_service.go`
- `backend/internal/service/cognito_auth_service.go`
- `backend/cmd/server/main.go`