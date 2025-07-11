# セキュリティ実装規則

このドキュメントは、Monsteraプロジェクトにおけるセキュリティ実装の規則とベストプラクティスを定義します。

## 更新履歴
- 2025-01-10: CLAUDE.mdから分離して作成

## 認証・認可

### 公開エンドポイント設定
```go
// 公開エンドポイント（これ以外は全て認証必須）
publicEndpoints := []string{
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/health",
}

// ミドルウェア適用
router.Use(middleware.Auth(publicEndpoints))

// ロールベース制御
router.POST("/admin/users", 
    middleware.RequireRole("admin", "super_admin"),
    handler.CreateUser)
```

### セキュリティ原則
- **ホワイトリスト方式**: デフォルトで全APIエンドポイント認証必須
- **両層検証**: フロントエンド・バックエンド両方で入力検証
- **最小権限**: RBAC（一般/管理者/スーパー管理者）を厳格適用

## 入力検証

### フロントエンド（yup）
```typescript
const schema = yup.object({
  title: yup.string()
    .required('タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  amount: yup.number()
    .required('金額は必須です')
    .positive('金額は0より大きい値を入力してください')
    .max(1000000, '金額は100万円以下で入力してください')
});
```

### バックエンド（バリデータタグ）
```go
type CreateExpenseRequest struct {
    Title  string `json:"title" binding:"required,max=100"`
    Amount int    `json:"amount" binding:"required,min=1,max=1000000"`
}
```

## SQLインジェクション対策

```go
// 必ずプレースホルダを使用
db.Where("user_id = ? AND status = ?", userID, status).Find(&reports)

// 動的クエリの場合も安全に構築
query := db.Model(&WeeklyReport{})
if filter.Status != "" {
    query = query.Where("status = ?", filter.Status)
}

// 生のSQLを使う場合
db.Raw("SELECT * FROM users WHERE email = ?", email).Scan(&users)
```

## 認証トークン管理

### JWT設定
- トークン有効期限: アクセストークン15分、リフレッシュトークン7日
- HTTPOnly Cookieで管理
- Secure属性は本番環境で必須
- SameSite属性でCSRF対策

### セッション管理
- Redis使用時はセッション情報を暗号化
- セッションタイムアウト: 30分（更新可能）
- 同時ログイン制限の実装

## CORS設定

```go
// 開発環境と本番環境で異なる設定
config := cors.Config{
    AllowOrigins:     []string{"https://app.example.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
    ExposeHeaders:    []string{"Content-Length"},
    AllowCredentials: true,
    MaxAge:          12 * time.Hour,
}
```

## セキュリティヘッダー

```go
// セキュリティヘッダーミドルウェア
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Header("Content-Security-Policy", "default-src 'self'")
        c.Next()
    }
}
```

## レート制限

```go
// IPアドレスベースのレート制限
rateLimiter := middleware.NewRateLimiter(
    middleware.RateLimiterConfig{
        RequestsPerMinute: 60,
        BurstSize:         10,
    },
)
```

## 暗号化

### パスワード
- bcryptを使用（コスト係数: 12）
- 最小8文字、大文字・小文字・数字・記号を含む

### 機密データ
- AES-256-GCMで暗号化
- 環境変数で暗号化キーを管理
- キーローテーション戦略の実装

## 監査とログ

セキュリティイベントは必ず記録:
- ログイン試行（成功/失敗）
- 権限昇格
- 機密データへのアクセス
- 設定変更

詳細は[監査・セキュリティログ](.cursor/rules/audit-logging.md)を参照。

## セキュリティチェックリスト

### 開発時
- [ ] 入力検証の実装（フロント/バック両方）
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] CSRF対策
- [ ] 認証・認可の適切な実装

### デプロイ前
- [ ] セキュリティヘッダーの設定
- [ ] HTTPS強制
- [ ] 環境変数の適切な管理
- [ ] ログ出力から機密情報を除外
- [ ] レート制限の設定

### 運用時
- [ ] セキュリティパッチの適用
- [ ] ログの定期的な監視
- [ ] 侵入検知システムの導入
- [ ] 定期的なセキュリティ監査