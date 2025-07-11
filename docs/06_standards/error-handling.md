# エラーハンドリング実装規則

このドキュメントは、Monsteraプロジェクトにおけるエラーハンドリングの実装規則を定義します。

## 更新履歴
- 2025-01-10: CLAUDE.mdから分離して作成

## エラー定義（エラーコード付きパターン）

```go
// internal/errors/errors.go
package errors

type BusinessError struct {
    Code    string                 `json:"code"`
    Message string                 `json:"message"`
    Details map[string]interface{} `json:"details,omitempty"`
}

func (e BusinessError) Error() string {
    return e.Message
}

// エラー定義
var (
    // 認証関連 (401)
    ErrAuthInvalidCredentials = BusinessError{
        Code:    "AUTH_LOGIN_001",
        Message: "認証に失敗しました",
    }
    ErrAuthTokenExpired = BusinessError{
        Code:    "AUTH_TOKEN_002",
        Message: "トークンの有効期限が切れています",
    }
    
    // 権限関連 (403)
    ErrPermissionDenied = BusinessError{
        Code:    "PERM_ROLE_001",
        Message: "この操作を行う権限がありません",
    }
    
    // バリデーション (400)
    ErrValidationRequired = BusinessError{
        Code:    "VAL_REQUIRED_001",
        Message: "必須項目が入力されていません",
    }
    
    // ビジネスロジック (422)
    ErrWeeklyReportAlreadySubmitted = BusinessError{
        Code:    "BIZ_WEEKLY_001",
        Message: "週報は既に提出済みです",
    }
)
```

## ログ出力規則

```go
// 個人情報のマスキング
func sanitizeForLog(data interface{}) interface{} {
    // 以下のフィールドは[REDACTED]に置換
    sensitiveFields := []string{
        "password", "token", "apiKey", "email", 
        "phone", "address", "name", "creditCard",
    }
    // 実装...
}

// ログ出力
logger.Info("user action",
    zap.String("action", "login"),
    zap.String("user_id", userID),
    zap.String("ip", c.ClientIP()),
    // 個人情報は含めない
)

// 開発環境のみスタックトレース
if os.Getenv("GO_ENV") == "development" {
    logger.Error("error with stack",
        zap.Error(err),
        zap.Stack("stacktrace"))
}
```

## エラーコード体系

エラーコードは以下の形式で構成されます：
```
{カテゴリ}_{サブカテゴリ}_{連番}
```

### カテゴリ一覧
- `AUTH`: 認証関連
- `PERM`: 権限関連
- `VAL`: バリデーション関連
- `BIZ`: ビジネスロジック関連
- `SYS`: システムエラー関連

### HTTPステータスコードとの対応
- 400 Bad Request: `VAL_*`
- 401 Unauthorized: `AUTH_*`
- 403 Forbidden: `PERM_*`
- 422 Unprocessable Entity: `BIZ_*`
- 500 Internal Server Error: `SYS_*`

## エラーレスポンス形式

```json
{
  "error": "エラーメッセージ",
  "code": "エラーコード",
  "details": {
    "field": "詳細情報"
  }
}
```

## 実装ガイドライン

1. **ユーザー向けメッセージ**: エラーメッセージは日本語で、ユーザーが理解しやすい内容にする
2. **詳細情報の提供**: `details`フィールドにデバッグに役立つ情報を含める
3. **一貫性の維持**: 同じ種類のエラーには同じエラーコードを使用する
4. **セキュリティ考慮**: システム内部の情報を露出しないように注意する

## 関連ドキュメント
- [エラーコード標準](../../docs/06_standards/error-code-standards.md)