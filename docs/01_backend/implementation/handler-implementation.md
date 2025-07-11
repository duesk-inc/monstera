# ハンドラー層実装仕様書

## 概要

ハンドラー層はHTTPリクエストを受け付け、適切なサービス層のメソッドを呼び出し、レスポンスを生成する責務を持ちます。

## 実装規約

### 基本原則

- **インターフェースと実装の分離**: テスタビリティと拡張性の確保
- **リクエストのバリデーション**: 入力値の妥当性検証
- **適切なエラーハンドリング**: 統一されたエラーレスポンス
- **コンテキストの伝播**: リクエストコンテキストの適切な管理
- **認証・認可チェック**: セキュリティの確保
- **適切なステータスコードの返却**: HTTP標準の遵守

### 実装構造

```go
// インターフェース定義
type ExampleHandler interface {
    GetItems(c *gin.Context)
    GetItemByID(c *gin.Context)
    CreateItem(c *gin.Context)
    UpdateItem(c *gin.Context)
    DeleteItem(c *gin.Context)
}

// 実装構造体
type exampleHandler struct {
    exampleService service.ExampleService
    logger         *zap.Logger
}

// コンストラクタ
func NewExampleHandler(exampleService service.ExampleService, logger *zap.Logger) ExampleHandler {
    return &exampleHandler{
        exampleService: exampleService,
        logger:         logger,
    }
}
```

## 実装パターン

### 1. 基本的なCRUD操作

#### GET操作の実装例

```go
func (h *exampleHandler) GetItems(c *gin.Context) {
    ctx := c.Request.Context()
    
    // クエリパラメータの取得
    page := c.DefaultQuery("page", "1")
    limit := c.DefaultQuery("limit", "10")
    search := c.Query("search")
    
    // パラメータの変換とバリデーション
    pageInt, err := strconv.Atoi(page)
    if err != nil || pageInt < 1 {
        h.respondError(c, http.StatusBadRequest, "無効なページ番号です")
        return
    }
    
    limitInt, err := strconv.Atoi(limit)
    if err != nil || limitInt < 1 || limitInt > 100 {
        h.respondError(c, http.StatusBadRequest, "無効な件数です（1-100の範囲で指定してください）")
        return
    }
    
    // サービス呼び出し
    items, total, err := h.exampleService.GetItems(ctx, pageInt, limitInt, search)
    if err != nil {
        h.handleError(c, http.StatusInternalServerError, "データの取得に失敗しました", err)
        return
    }
    
    // 成功レスポンス
    c.JSON(http.StatusOK, gin.H{
        "items": items,
        "total": total,
        "page":  pageInt,
        "limit": limitInt,
    })
}
```

#### POST操作の実装例

```go
func (h *exampleHandler) CreateItem(c *gin.Context) {
    ctx := c.Request.Context()
    
    // 認証済みユーザーのIDを取得
    userID, exists := c.Get("user_id")
    if !exists {
        h.respondError(c, http.StatusUnauthorized, "認証が必要です")
        return
    }
    
    userUUID, ok := userID.(uuid.UUID)
    if !ok {
        h.handleError(c, http.StatusInternalServerError, "ユーザーIDが不正な形式です", errors.New("invalid user ID format"))
        return
    }
    
    // リクエストのバインディングとバリデーション
    var req dto.CreateItemRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        h.handleValidationError(c, err)
        return
    }
    
    // ユーザーIDを設定
    req.UserID = userUUID
    
    // サービス呼び出し
    response, err := h.exampleService.CreateItem(ctx, req)
    if err != nil {
        h.handleError(c, http.StatusBadRequest, "アイテムの作成に失敗しました", err)
        return
    }
    
    // 成功レスポンス
    c.JSON(http.StatusCreated, response)
}
```

#### PUT操作の実装例

```go
func (h *exampleHandler) UpdateItem(c *gin.Context) {
    ctx := c.Request.Context()
    
    // パスパラメータの取得
    itemID := c.Param("id")
    if itemID == "" {
        h.respondError(c, http.StatusBadRequest, "アイテムIDが必要です")
        return
    }
    
    // UUIDの妥当性確認
    itemUUID, err := uuid.Parse(itemID)
    if err != nil {
        h.respondError(c, http.StatusBadRequest, "無効なアイテムIDです")
        return
    }
    
    // 認証済みユーザーの取得
    userID, exists := c.Get("user_id")
    if !exists {
        h.respondError(c, http.StatusUnauthorized, "認証が必要です")
        return
    }
    
    userUUID, ok := userID.(uuid.UUID)
    if !ok {
        h.handleError(c, http.StatusInternalServerError, "ユーザーIDが不正な形式です", errors.New("invalid user ID format"))
        return
    }
    
    // リクエストのバインディング
    var req dto.UpdateItemRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        h.handleValidationError(c, err)
        return
    }
    
    // リクエストにIDを設定
    req.ID = itemUUID
    req.UserID = userUUID
    
    // サービス呼び出し
    response, err := h.exampleService.UpdateItem(ctx, req)
    if err != nil {
        h.handleError(c, http.StatusBadRequest, "アイテムの更新に失敗しました", err)
        return
    }
    
    // 成功レスポンス
    c.JSON(http.StatusOK, response)
}
```

#### DELETE操作の実装例

```go
func (h *exampleHandler) DeleteItem(c *gin.Context) {
    ctx := c.Request.Context()
    
    // パスパラメータの取得と検証
    itemID := c.Param("id")
    itemUUID, err := uuid.Parse(itemID)
    if err != nil {
        h.respondError(c, http.StatusBadRequest, "無効なアイテムIDです")
        return
    }
    
    // 認証済みユーザーの取得
    userID, exists := c.Get("user_id")
    if !exists {
        h.respondError(c, http.StatusUnauthorized, "認証が必要です")
        return
    }
    
    userUUID, ok := userID.(uuid.UUID)
    if !ok {
        h.handleError(c, http.StatusInternalServerError, "ユーザーIDが不正な形式です", errors.New("invalid user ID format"))
        return
    }
    
    // サービス呼び出し
    err = h.exampleService.DeleteItem(ctx, itemUUID, userUUID)
    if err != nil {
        h.handleError(c, http.StatusBadRequest, "アイテムの削除に失敗しました", err)
        return
    }
    
    // 成功レスポンス
    c.JSON(http.StatusOK, gin.H{"message": "アイテムを削除しました"})
}
```

### 2. エラーハンドリング

#### エラーレスポンス標準化

バックエンドのエラーレスポンスは、フロントエンドのToast通知システムと連携するため、以下の形式で統一します：

```go
// 標準エラーレスポンス形式
c.JSON(statusCode, gin.H{
    "error": "具体的なエラーメッセージ"
})
```

フロントエンドの`useErrorHandler`フックは、この`error`フィールドを自動的に抽出してToast通知として表示します。

#### エラーメッセージのガイドライン

1. **ユーザーフレンドリー**: 技術的な詳細ではなく、ユーザーが理解できる日本語を使用
2. **具体的**: 何が問題で、どうすれば解決できるかを明示
3. **一貫性**: 同じ種類のエラーには同じ表現を使用

```go
// 良い例
c.JSON(http.StatusBadRequest, gin.H{
    "error": "プロフィール情報の更新に失敗しました: 必須項目が入力されていません"
})

// 悪い例
c.JSON(http.StatusBadRequest, gin.H{
    "error": "Bad Request"
})
```

#### 共通エラーハンドリング関数

```go
// エラーハンドリング共通化
func (h *exampleHandler) handleError(c *gin.Context, statusCode int, message string, err error, keyValues ...interface{}) {
    // ログ記録
    if h.logger != nil {
        fields := []zap.Field{
            zap.String("endpoint", c.Request.URL.Path),
            zap.String("method", c.Request.Method),
            zap.Error(err),
        }
        
        // 追加情報があれば追加
        for i := 0; i < len(keyValues); i += 2 {
            if i+1 < len(keyValues) {
                fields = append(fields, zap.Any(keyValues[i].(string), keyValues[i+1]))
            }
        }
        h.logger.Error(message, fields...)
    }
    
    // エラーレスポンス
    c.JSON(statusCode, gin.H{"error": message})
}

// シンプルなエラーレスポンス
func (h *exampleHandler) respondError(c *gin.Context, statusCode int, message string) {
    c.JSON(statusCode, gin.H{"error": message})
}

// バリデーションエラーの処理
func (h *exampleHandler) handleValidationError(c *gin.Context, err error) {
    if h.logger != nil {
        h.logger.Warn("バリデーションエラー",
            zap.String("endpoint", c.Request.URL.Path),
            zap.Error(err))
    }
    
    // バリデーションエラーの詳細を整理
    var errorDetails map[string]string
    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        errorDetails = make(map[string]string)
        for _, fieldError := range validationErrors {
            errorDetails[fieldError.Field()] = getValidationErrorMessage(fieldError)
        }
    }
    
    response := gin.H{
        "error": "入力値に誤りがあります",
    }
    
    if errorDetails != nil {
        response["details"] = errorDetails
    }
    
    c.JSON(http.StatusBadRequest, response)
}

// バリデーションエラーメッセージの生成
func getValidationErrorMessage(fieldError validator.FieldError) string {
    switch fieldError.Tag() {
    case "required":
        return "必須項目です"
    case "email":
        return "有効なメールアドレスを入力してください"
    case "min":
        return fmt.Sprintf("最小%s文字以上入力してください", fieldError.Param())
    case "max":
        return fmt.Sprintf("最大%s文字以下で入力してください", fieldError.Param())
    default:
        return "入力値が不正です"
    }
}
```

### 3. 認証・認可の実装

#### 認証情報の取得

```go
// 認証済みユーザー情報の取得
func (h *exampleHandler) getAuthenticatedUser(c *gin.Context) (uuid.UUID, error) {
    userID, exists := c.Get("user_id")
    if !exists {
        return uuid.Nil, errors.New("認証が必要です")
    }
    
    userUUID, ok := userID.(uuid.UUID)
    if !ok {
        return uuid.Nil, errors.New("ユーザーIDが不正な形式です")
    }
    
    return userUUID, nil
}

// ロール情報の取得
func (h *exampleHandler) getUserRole(c *gin.Context) (string, error) {
    role, exists := c.Get("user_role")
    if !exists {
        return "", errors.New("ロール情報が見つかりません")
    }
    
    roleStr, ok := role.(string)
    if !ok {
        return "", errors.New("ロール情報が不正な形式です")
    }
    
    return roleStr, nil
}

// 管理者権限の確認
func (h *exampleHandler) requireAdminRole(c *gin.Context) error {
    role, err := h.getUserRole(c)
    if err != nil {
        return err
    }
    
    if role != "admin" {
        return errors.New("管理者権限が必要です")
    }
    
    return nil
}
```

### 4. レスポンス形式の統一

#### 成功レスポンス

```go
// 標準的な成功レスポンス
func (h *exampleHandler) respondSuccess(c *gin.Context, statusCode int, data interface{}, message ...string) {
    response := gin.H{
        "success": true,
        "data":    data,
    }
    
    if len(message) > 0 {
        response["message"] = message[0]
    }
    
    c.JSON(statusCode, response)
}

// リスト形式のレスポンス
func (h *exampleHandler) respondList(c *gin.Context, items interface{}, total int, page, limit int) {
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "items": items,
            "pagination": gin.H{
                "total":       total,
                "page":        page,
                "limit":       limit,
                "total_pages": (total + limit - 1) / limit,
            },
        },
    })
}
```

#### エラーレスポンス

```go
// 統一されたエラーレスポンス形式
type ErrorResponse struct {
    Success bool              `json:"success"`
    Error   ErrorDetail       `json:"error"`
}

type ErrorDetail struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

// エラーレスポンスの生成
func (h *exampleHandler) respondErrorWithCode(c *gin.Context, statusCode int, code, message string, details map[string]string) {
    response := ErrorResponse{
        Success: false,
        Error: ErrorDetail{
            Code:    code,
            Message: message,
            Details: details,
        },
    }
    
    c.JSON(statusCode, response)
}
```

### 5. パフォーマンス最適化

#### ページネーション

```go
// ページネーション処理
func (h *exampleHandler) parsePaginationParams(c *gin.Context) (page, limit int, err error) {
    pageStr := c.DefaultQuery("page", "1")
    limitStr := c.DefaultQuery("limit", "10")
    
    page, err = strconv.Atoi(pageStr)
    if err != nil || page < 1 {
        return 0, 0, errors.New("無効なページ番号です")
    }
    
    limit, err = strconv.Atoi(limitStr)
    if err != nil || limit < 1 || limit > 100 {
        return 0, 0, errors.New("無効な件数です（1-100の範囲で指定してください）")
    }
    
    return page, limit, nil
}
```

#### キャッシュ制御

```go
// キャッシュヘッダーの設定
func (h *exampleHandler) setCacheHeaders(c *gin.Context, maxAge int) {
    c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
    c.Header("ETag", generateETag(c.Request.URL.Path))
}

// ETLタグの生成
func generateETag(path string) string {
    hash := sha256.Sum256([]byte(path + time.Now().Format("2006-01-02")))
    return fmt.Sprintf(`"%x"`, hash)
}
```

## 実装時の注意点

### セキュリティ

1. **入力値の検証**: すべての入力値を適切に検証する
2. **SQLインジェクション対策**: パラメータバインディングを使用
3. **XSS対策**: 出力時のエスケープ処理
4. **認証・認可**: 適切な権限チェック

### パフォーマンス

1. **データベースアクセス**: 不要なクエリの削減
2. **メモリ使用量**: 大量データ処理時の注意
3. **レスポンス時間**: 適切なタイムアウト設定
4. **ログ出力**: 本番環境でのログレベル調整

### 保守性

1. **コードの可読性**: 明確な変数名と関数名
2. **エラーメッセージ**: 分かりやすいメッセージ
3. **ログ記録**: 適切なレベルでの詳細なログ
4. **テスト容易性**: モック化しやすい設計

---

## 関連ドキュメント

- [バックエンド仕様書](./backend-specification.md)
- [サービス実装仕様書](./backend-service-implementation.md)
- [リポジトリ実装仕様書](./backend-repository-implementation.md)
- [認証実装仕様書](./backend-auth-implementation.md)
- [テスト実装ガイド](./backend-testing-guide.md) 