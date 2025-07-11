# デバッグログ機能

プロジェクト内で統一されたデバッグログ機能を提供します。開発環境でのみ動作し、本番環境では何も出力しません。

## 概要

- **フロントエンド**: `frontend/src/lib/debug/logger.ts`
- **バックエンド**: `backend/pkg/debug/logger.go`

両方とも同様のインターフェースを提供し、以下の機能をサポートします：

- API操作のログ（開始、成功、エラー）
- データ変換のログ
- バリデーションのログ
- 汎用デバッグログ
- 処理時間測定

## フロントエンド使用方法

### 基本的な使用例

```typescript
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

// API呼び出しの開始ログ
DebugLogger.apiStart(
  { 
    category: DEBUG_CATEGORIES.API, 
    operation: DEBUG_OPERATIONS.CREATE, 
    description: '週報作成' 
  },
  { 
    url: '/api/v1/weekly-reports', 
    method: 'POST', 
    requestData: weeklyReport,
    convertedRequestData: snakeCaseData
  }
);

// API呼び出しの成功ログ
DebugLogger.apiSuccess(
  { 
    category: DEBUG_CATEGORIES.API, 
    operation: DEBUG_OPERATIONS.CREATE 
  },
  { 
    status: 201, 
    responseData: response.data,
    convertedResponseData: camelCaseData
  }
);

// API呼び出しのエラーログ
DebugLogger.apiError(
  { 
    category: DEBUG_CATEGORIES.API, 
    operation: DEBUG_OPERATIONS.CREATE 
  },
  { 
    error: axiosError,
    metadata: { userId: 'user123' }
  }
);
```

### データ変換のログ

```typescript
// データ変換のログ
DebugLogger.dataConversion(
  { 
    category: DEBUG_CATEGORIES.DATA_CONVERSION, 
    operation: DEBUG_OPERATIONS.CONVERT 
  },
  camelCaseData,
  snakeCaseData,
  'CamelToSnake'
);
```

### バリデーションのログ

```typescript
// バリデーションのログ
DebugLogger.validation(
  { 
    category: DEBUG_CATEGORIES.VALIDATION, 
    operation: DEBUG_OPERATIONS.VALIDATE 
  },
  isValid,
  errors,
  formData
);
```

### 処理時間測定

```typescript
// 処理時間測定
DebugLogger.time('週報データ処理');
// ... 処理 ...
DebugLogger.timeEnd('週報データ処理');
```

## バックエンド使用方法

### 初期化

```go
import "github.com/duesk/monstera/pkg/debug"

// デバッグロガーの初期化
debugLogger := debug.NewDebugLogger(logger)
```

### API操作のログ

```go
// リクエスト開始ログ
debugLogger.RequestStart(
    debug.DebugLogConfig{
        Category:    debug.CategoryAPI,
        Operation:   debug.OperationCreate,
        Description: "週報作成",
    },
    debug.RequestDebugData{
        Method:     "POST",
        URL:        "/api/v1/weekly-reports",
        RawBody:    string(bodyBytes),
        ParsedBody: req,
        UserID:     userID.String(),
        UserRole:   userRole,
    },
)

// リクエスト成功ログ
debugLogger.RequestSuccess(
    debug.DebugLogConfig{
        Category:  debug.CategoryAPI,
        Operation: debug.OperationCreate,
    },
    debug.ResponseDebugData{
        StatusCode:   201,
        ResponseBody: response,
        ProcessTime:  "15.2ms",
    },
)

// リクエストエラーログ
debugLogger.RequestError(
    debug.DebugLogConfig{
        Category:  debug.CategoryAPI,
        Operation: debug.OperationCreate,
    },
    debug.ErrorDebugData{
        Error:       err,
        ErrorType:   "ValidationError",
        RequestData: req,
    },
)
```

### データ処理のログ

```go
// データ処理ログ
debugLogger.DataProcess(
    debug.DebugLogConfig{
        Category:  debug.CategoryService,
        Operation: debug.OperationConvert,
    },
    debug.DataProcessDebugData{
        InputData:   inputDTO,
        OutputData:  outputModel,
        ProcessType: "DTOToModel",
    },
)
```

### バリデーションのログ

```go
// バリデーションログ
debugLogger.Validation(
    debug.DebugLogConfig{
        Category:  debug.CategoryValidation,
        Operation: debug.OperationValidate,
    },
    isValid,
    errors,
    data,
)
```

### 処理時間測定

```go
// タイマー使用例
timer := debugLogger.StartTimer(
    debug.DebugLogConfig{
        Category:  debug.CategoryRepository,
        Operation: debug.OperationCreate,
    },
    "週報作成処理",
)
defer timer.End()
```

## 利用可能なカテゴリと操作

### カテゴリ

**フロントエンド**:
- `API`, `UI`, `Validation`, `DataConversion`, `Authentication`, `Routing`, `StateManagement`

**バックエンド**:
- `API`, `Service`, `Repository`, `Middleware`, `Auth`, `Validation`, `Database`, `External`

### 操作

**共通**:
- `Create`, `Read`, `Update`, `Delete`, `List`, `Submit`, `Validate`, `Convert`, `Login`, `Logout`

**バックエンド追加**:
- `Bind`, `Query`

## 環境設定

### フロントエンド
- `NODE_ENV=development` の場合のみログが出力されます

### バックエンド
- `GO_ENV=development` または `GIN_MODE=debug` の場合のみログが出力されます

## ログ出力例

### フロントエンド
```
=== API Create API 開始 ===
説明: 週報作成
URL: /api/v1/weekly-reports
メソッド: POST
送信データ(変換前): { startDate: "2024-01-01", ... }
送信データ(変換後): { start_date: "2024-01-01", ... }
=== API Create API 送信データ確認終了 ===
```

### バックエンド
```json
{
  "level": "info",
  "ts": "2024-01-01T12:00:00.000Z",
  "msg": "=== API Create リクエスト開始 ===",
  "category": "API",
  "operation": "Create",
  "description": "週報作成",
  "method": "POST",
  "url": "/api/v1/weekly-reports",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_role": "engineer"
}
```

## 注意事項

1. **本番環境では無効**: 環境変数により自動的に無効化されます
2. **パフォーマンス**: 開発環境でのみ動作するため、本番環境のパフォーマンスに影響しません
3. **機密情報**: パスワードやトークンなどの機密情報はログに含めないよう注意してください
4. **ログサイズ**: 大量のデータをログ出力する際は、必要な部分のみを抽出してください

## 既存コードへの適用

週報機能で使用していた個別のデバッグログを、この共通機能に置き換えることができます：

```typescript
// 置き換え前
console.log('=== createWeeklyReport API 送信 ===');
console.log('送信データ(キャメルケース):', weeklyReport);

// 置き換え後
DebugLogger.apiStart(
  { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: '週報作成' },
  { requestData: weeklyReport, url: WEEKLY_REPORT_API.CREATE, method: 'POST' }
);
``` 