# UUID to String移行 - handlerパッケージ修正パターン

## 概要
UUID to String移行により、handlerパッケージで`.String()`メソッド呼び出しエラーが発生。

## 修正パターン

### 1. ParseUUID関数の変更
```go
// Before (UUID型を返す)
func ParseUUID(c *gin.Context, paramName string, logger *zap.Logger) (uuid.UUID, error)

// After (string型を返す)
func ParseUUID(c *gin.Context, paramName string, logger *zap.Logger) (string, error)
```

### 2. 呼び出し側の修正
```go
// Before (エラー)
categoryID, err := ParseUUID(c, "id", h.logger)
zap.String("category_id", categoryID.String())  // string型に.String()は存在しない

// After (正常)
categoryID, err := ParseUUID(c, "id", h.logger)
zap.String("category_id", categoryID)  // string型をそのまま使用
```

### 3. 主な修正箇所
- admin_category_handler.go: 7箇所
- admin_expense_limit_handler.go: 3箇所以上

## 関連情報
- 実装日: 2025-01-11
- 計画書: refactor-plan_20250111_154000.md
- 影響: handlerパッケージのビルドエラー解消