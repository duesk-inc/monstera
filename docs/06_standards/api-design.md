# API設計規則

このドキュメントはMonsteraプロジェクトのAPI設計規則を記載します。

## 更新履歴
- 2025-01-09: CLAUDE.mdから分離して作成

## エンドポイント設計

### RESTful設計基本
```
GET    /api/v1/weekly-reports      # 一覧取得
GET    /api/v1/weekly-reports/:id  # 詳細取得
POST   /api/v1/weekly-reports      # 作成
PUT    /api/v1/weekly-reports/:id  # 全体更新
PATCH  /api/v1/weekly-reports/:id  # 部分更新
DELETE /api/v1/weekly-reports/:id  # 削除
```

### ビジネスアクション（副作用を伴う操作）
```
POST   /api/v1/weekly-reports/:id/submit   # 提出
POST   /api/v1/weekly-reports/:id/approve  # 承認
POST   /api/v1/weekly-reports/:id/reject   # 却下
POST   /api/v1/expenses/:id/approve        # 経費承認
POST   /api/v1/expenses/:id/reject         # 経費却下
POST   /api/v1/leave-requests/:id/approve  # 休暇承認
POST   /api/v1/leave-requests/:id/cancel   # 休暇取消
```

### 検索・フィルタリング
```
# クエリパラメータによるフィルタリング
GET    /api/v1/weekly-reports?status=submitted&start_date=2024-01-01
GET    /api/v1/expenses?status=pending&category=transportation
GET    /api/v1/users?department=engineering&role=admin

# 検索エンドポイント
GET    /api/v1/weekly-reports/search?q=keyword
GET    /api/v1/users/search?q=yamada
```

### 集計・統計
```
GET    /api/v1/weekly-reports/statistics
GET    /api/v1/weekly-reports/summary
GET    /api/v1/expenses/monthly-summary
GET    /api/v1/dashboard/metrics
```

### 命名規則
- リソース名は複数形（weekly-reports, expenses, users）
- kebab-caseを使用
- 動詞は使わない（/get-user ❌ → /users ✅）
- 階層関係を表現（/users/:id/expenses）

## リクエスト/レスポンス形式

### リクエスト（camelCase）
```json
{
  "title": "今週の進捗",
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "achievements": [
    {
      "description": "機能Aの実装完了",
      "progress": 100
    }
  ],
  "issues": ["課題1", "課題2"],
  "nextWeekPlan": "機能Bの実装"
}
```

### 成功レスポンス（単一リソース）
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "今週の進捗",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 成功レスポンス（リスト）
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "今週の進捗",
      "status": "draft"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### エラーレスポンス
```json
{
  "error": "週報は既に提出済みです",
  "code": "BIZ_WEEKLY_001",
  "details": {
    "submittedAt": "2024-01-01T10:00:00Z"
  }
}
```

### バリデーションエラー
```json
{
  "error": "バリデーションエラー",
  "code": "VAL_REQUIRED_001",
  "details": {
    "fields": {
      "title": "タイトルは必須です",
      "startDate": "開始日は必須です"
    }
  }
}
```

### 一括操作レスポンス
```json
{
  "succeeded": 8,
  "failed": 2,
  "errors": [
    {
      "id": "123",
      "error": "既に承認済みです"
    },
    {
      "id": "456",
      "error": "権限がありません"
    }
  ]
}
```

## ステータスコード使用規則

### 2xx Success
- `200 OK`: 取得・更新成功
- `201 Created`: 作成成功（Locationヘッダーに新規リソースのURL）
- `202 Accepted`: 非同期処理受付
- `204 No Content`: 削除成功、更新成功（レスポンスボディなし）

### 4xx Client Error
- `400 Bad Request`: バリデーションエラー、不正なリクエスト形式
- `401 Unauthorized`: 認証エラー（トークン無効、期限切れ）
- `403 Forbidden`: 権限エラー（認証済みだが権限不足）
- `404 Not Found`: リソース不在
- `409 Conflict`: 競合（楽観的ロック、重複登録）
- `422 Unprocessable Entity`: ビジネスロジックエラー
- `429 Too Many Requests`: レート制限

### 5xx Server Error
- `500 Internal Server Error`: システムエラー
- `502 Bad Gateway`: 外部サービスエラー
- `503 Service Unavailable`: メンテナンス中

## APIバージョニング

### URLパスによるバージョニング
```go
// router/v1/routes.go
func SetupV1Routes(r *gin.Engine) {
    v1 := r.Group("/api/v1")
    
    // 認証
    auth := v1.Group("/auth")
    {
        auth.POST("/login", handlers.Login)
        auth.POST("/refresh", handlers.RefreshToken)
        auth.POST("/logout", middleware.Auth(), handlers.Logout)
    }
    
    // 週報
    reports := v1.Group("/weekly-reports", middleware.Auth())
    {
        reports.GET("", handlers.ListWeeklyReports)
        reports.POST("", handlers.CreateWeeklyReport)
        reports.GET("/:id", handlers.GetWeeklyReport)
        reports.PUT("/:id", handlers.UpdateWeeklyReport)
        reports.DELETE("/:id", handlers.DeleteWeeklyReport)
        reports.POST("/:id/submit", handlers.SubmitWeeklyReport)
    }
}
```

### 廃止予定APIの通知
```go
func DeprecationMiddleware(deprecatedDate string) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("X-API-Deprecation-Date", deprecatedDate)
        c.Header("X-API-Deprecation-Info", "https://docs.example.com/api/migration")
        c.Next()
    }
}
```

### バージョン移行期間
- 新バージョンリリース後、旧バージョンは3ヶ月間維持
- 廃止1ヶ月前から警告ヘッダーを返す
- クライアントへの通知とドキュメント更新

## ページネーション

### リクエストパラメータ
```
GET /api/v1/weekly-reports?page=2&pageSize=20
```

### レスポンス形式
```json
{
  "items": [...],
  "pagination": {
    "total": 100,
    "page": 2,
    "pageSize": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### カーソルベースページネーション（大規模データ用）
```
GET /api/v1/activities?cursor=eyJpZCI6MTIzfQ&limit=20
```

## 認証・認可

### 認証ヘッダー
```
Authorization: Bearer <token>
```

### Cookie認証（内部API）
```
Cookie: access_token=<cognito-token>
```

### 公開エンドポイント
```go
publicEndpoints := []string{
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/health",
}
```

## レート制限

### ヘッダー情報
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

### エンドポイント別制限
```go
// 一般API: 100リクエスト/分
// 認証API: 10リクエスト/分
// 検索API: 30リクエスト/分
```

## CORS設定

```go
config := cors.DefaultConfig()
config.AllowOrigins = []string{
    "http://localhost:3000",
    "https://app.monstera.com",
}
config.AllowCredentials = true
config.AllowHeaders = []string{
    "Origin", "Content-Type", "Accept",
    "Authorization", "X-CSRF-Token",
}
```

## API設計のベストプラクティス

### 1. 一貫性
- 命名規則の統一
- レスポンス形式の統一
- エラー形式の統一

### 2. 予測可能性
- RESTful原則の遵守
- 標準的なHTTPメソッドの使用
- 適切なステータスコード

### 3. 拡張性
- バージョニング戦略
- 後方互換性の維持
- 段階的な機能追加

### 4. セキュリティ
- 認証・認可の実装
- レート制限
- 入力検証

### 5. パフォーマンス
- 適切なキャッシュヘッダー
- ページネーション
- 部分レスポンス（fields パラメータ）

---

*このドキュメントはAPI設計の変更時に更新してください。*