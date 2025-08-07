# Cognito移行の現在状況（2025-08-06）

## 移行完了状況

### 認証システム
- ✅ JWT認証からAWS Cognito認証へ完全移行済み
- ✅ HTTPOnly Cookieによるセッション管理実装済み
- ✅ パスワードカラムは削除済み（migration 200074）

### データベース構造
- ✅ UserモデルのIDフィールドはstring型（Cognito Sub形式）
- ✅ 全ての外部キー関係もstring型に統一
- ✅ UUIDからCognito Sub形式への移行完了

### 現在のUserモデル構造
```go
type User struct {
    ID    string `gorm:"type:varchar(255);primary_key" json:"id"` // Cognito Sub
    Email string `gorm:"size:255;not null;unique" json:"email"`
    // Passwordフィールドは削除済み（Cognito認証のみ）
    // その他のフィールド...
}
```

### 認証フロー
1. Frontend → Backend: ログインリクエスト
2. Backend → Cognito: 認証
3. Cognito → Backend: トークン
4. Backend → Frontend: HTTPOnly Cookieを設定
5. 以降の全てのリクエストに認証用Cookieを含む

### 関連ファイル
- 認証ミドルウェア: `backend/internal/middleware/cognito_auth.go`
- 認証サービス: `backend/internal/service/cognito_auth_service.go`
- ユーザーリポジトリ: `backend/internal/repository/user_repository.go`

### 移行完了事項
- ✅ 全モデルのユーザーID参照をstring型に統一
- ✅ Cognito認証の実装と統合
- ✅ セッション管理の実装
- ✅ 旧JWT関連コードの削除

### 注意事項
- 新規開発時は必ずCognito認証を前提とする
- ユーザーIDは常にstring型（Cognito Sub）を使用
- ローカルパスワード管理は行わない