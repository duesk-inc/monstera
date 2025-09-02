# エラーコード標準

## 概要
Monsteraプロジェクトにおけるエラーコード体系の標準仕様を定義します。

## エラーコードフォーマット
`[カテゴリ][番号]` の形式で構成
- カテゴリ: 3-4文字の英字
- 番号: 3桁の数字

例: `AUTH001`, `VAL002`, `W001V003`

## エラーコード体系

### カテゴリコード
- **AUTH**: 認証・認可関連
- **VAL**: バリデーション関連
- **RES**: リソース関連
- **BIZ**: ビジネスロジック関連
- **SYS**: システムエラー関連
- **DAT**: データアクセス関連
- **W**: 週報固有
- **U**: ユーザー管理固有
- **E**: 経費申請固有

### HTTPステータスコードとの対応
- 400: クライアントエラー（入力値不正、ビジネスルール違反）
- 401: 認証エラー
- 403: 認可エラー
- 404: リソースが見つからない
- 409: 競合（重複、楽観的ロック）
- 500: サーバーエラー
- 502: 外部サービスエラー
- 503: サービス利用不可
- 504: タイムアウト

## マッピング表

### 認証関連（AUTH）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgAuthRequired | 認証が必要です | AUTH001 | 401 |
| MsgInvalidCredentials | メールアドレスまたはパスワードが正しくありません | AUTH002 | 401 |
| MsgTokenExpired | 認証トークンの有効期限が切れています | AUTH003 | 401 |
| MsgTokenInvalid | 無効な認証トークンです | AUTH004 | 401 |
| MsgRefreshTokenExpired | リフレッシュトークンの有効期限が切れています | AUTH005 | 401 |
| MsgRefreshTokenInvalid | 無効なリフレッシュトークンです | AUTH006 | 401 |
| MsgPermissionDenied | この操作を実行する権限がありません | AUTH007 | 403 |
| MsgAccessDenied | アクセスが拒否されました | AUTH008 | 403 |

### バリデーション関連（VAL）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgInvalidRequest | 無効なリクエストデータです | VAL001 | 400 |
| MsgRequiredField | 必須項目です | VAL002 | 400 |
| MsgInvalidFormat | 形式が正しくありません | VAL003 | 400 |
| MsgInvalidDateFormat | 日付の形式が正しくありません | VAL004 | 400 |
| MsgInvalidTimeRange | 時間の範囲が正しくありません | VAL005 | 400 |
| MsgInvalidEmailFormat | メールアドレスの形式が正しくありません | VAL006 | 400 |
| MsgPasswordTooShort | パスワードは8文字以上で入力してください | VAL007 | 400 |
| MsgInvalidStatus | 無効なステータスです | VAL008 | 400 |

### リソース関連（RES）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgResourceNotFound | リソースが見つかりません | RES001 | 404 |
| MsgWeeklyReportNotFound | 週報が見つかりません | RES002 | 404 |
| MsgUserNotFound | ユーザーが見つかりません | RES003 | 404 |
| MsgAlreadyExists | 既に存在します | RES004 | 409 |
| MsgWeeklyReportAlreadyExists | この期間の週報は既に存在します | RES005 | 409 |
| MsgEmailAlreadyExists | このメールアドレスは既に使用されています | RES006 | 409 |
| MsgDataConflict | データの競合が発生しました | RES007 | 409 |
| MsgOptimisticLockError | 他のユーザーによって更新されています | RES008 | 409 |

### ビジネスロジック関連（BIZ）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgAlreadySubmitted | 既に提出済みです | BIZ001 | 400 |
| MsgCannotEditSubmitted | 提出済みの週報は編集できません | BIZ002 | 400 |
| MsgInvalidDateRange | 無効な日付範囲です | BIZ003 | 400 |
| MsgExceedsLimit | 制限を超えています | BIZ004 | 400 |
| MsgInvalidOperation | 無効な操作です | BIZ005 | 400 |
| MsgStatusTransitionError | ステータスの変更ができません | BIZ006 | 400 |
| MsgDependencyError | 依存関係エラーです | BIZ007 | 400 |

### システムエラー関連（SYS）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgInternalServerError | サーバー内部エラーが発生しました | SYS001 | 500 |
| MsgServiceUnavailable | サービスが一時的に利用できません | SYS002 | 503 |
| MsgTimeout | タイムアウトが発生しました | SYS003 | 504 |
| MsgExternalServiceError | 外部サービスでエラーが発生しました | SYS004 | 502 |
| MsgConfigurationError | 設定エラーが発生しました | SYS005 | 500 |
| MsgNetworkError | ネットワークエラーが発生しました | SYS006 | 500 |

### データアクセス関連（DAT）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgDatabaseError | データベースエラーが発生しました | DAT001 | 500 |
| MsgTransactionError | トランザクション処理中にエラーが発生しました | DAT002 | 500 |
| MsgConnectionError | データベース接続エラーが発生しました | DAT003 | 500 |
| MsgQueryError | クエリ実行エラーが発生しました | DAT004 | 500 |
| MsgDataIntegrityError | データ整合性エラーが発生しました | DAT005 | 500 |
| MsgDuplicateKeyError | 重複キーエラーが発生しました | DAT006 | 409 |

### 週報固有エラー（W）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgWeeklyReportCreateFailed | 週報の作成に失敗しました | W001V001 | 400 |
| MsgWeeklyReportUpdateFailed | 週報の更新に失敗しました | W001V002 | 400 |
| MsgWeeklyReportDeleteFailed | 週報の削除に失敗しました | W001V003 | 400 |
| MsgWeeklyReportGetFailed | 週報の取得に失敗しました | W001R001 | 404 |
| MsgWeeklyReportListGetFailed | 週報一覧の取得に失敗しました | W001R002 | 500 |
| MsgDailyRecordCreateFailed | 日次勤怠記録の作成に失敗しました | W002V001 | 400 |
| MsgDailyRecordUpdateFailed | 日次勤怠記録の更新に失敗しました | W002V002 | 400 |
| MsgDailyRecordDeleteFailed | 日次勤怠記録の削除に失敗しました | W002V003 | 400 |
| MsgWorkHoursCalculationFailed | 作業時間の計算に失敗しました | W003B001 | 500 |
| MsgTotalWorkHoursUpdateFailed | 合計作業時間の更新に失敗しました | W003B002 | 500 |

### ユーザー管理関連（U）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgUserCreateFailed | ユーザーの作成に失敗しました | U001V001 | 400 |
| MsgUserUpdateFailed | ユーザーの更新に失敗しました | U001V002 | 400 |
| MsgUserDeleteFailed | ユーザーの削除に失敗しました | U001V003 | 400 |
| MsgUserGetFailed | ユーザーの取得に失敗しました | U001R001 | 404 |
| MsgUserListGetFailed | ユーザー一覧の取得に失敗しました | U001R002 | 500 |
| MsgPasswordChangeFailed | パスワードの変更に失敗しました | U002V001 | 400 |
| MsgProfileUpdateFailed | プロフィールの更新に失敗しました | U002V002 | 400 |

## 実装例

### バックエンド（Go）

```go
// 従来の実装
if user == nil {
    return fmt.Errorf(message.MsgUserNotFound)
}

// 新しい実装
if user == nil {
    return message.NewAppError("RES003", message.MsgUserNotFound, 
        map[string]interface{}{"user_id": userID})
}
```

### フロントエンド（TypeScript）

```typescript
// エラーレスポンスの処理
if (error.code === 'RES003') {
    // ユーザーが見つからない場合の処理
    showError('指定されたユーザーが見つかりません');
    router.push('/users');
}
```

## 実装ガイドライン

### エラーコード定数（バックエンド）

```go
const (
    // 認証関連
    ErrCodeAuthRequired = "AUTH001"
    ErrCodeInvalidCredentials = "AUTH002"
    
    // バリデーション関連
    ErrCodeInvalidRequest = "VAL001"
    ErrCodeRequiredField = "VAL002"
)
```

### エラーレスポンス構造体

```go
type ErrorResponse struct {
    Error   string                 `json:"error"`
    Code    string                 `json:"code"`
    Details map[string]interface{} `json:"details,omitempty"`
}
```

### フロントエンドエラーハンドリング

```typescript
interface ApiErrorResponse {
    error: string;
    code: string;
    details?: Record<string, any>;
}

export const handleApiError = (error: ApiErrorResponse) => {
    const enhancedError = getEnhancedError(error.code, error.details);
    
    switch (enhancedError.category) {
        case 'AUTH':
            showError(enhancedError.userMessage);
            router.push('/login');
            break;
        case 'VAL':
            showWarning(enhancedError.userMessage);
            break;
        default:
            showError(enhancedError.userMessage);
    }
};
```

## 移行サンプル

### バックエンド

#### Handler層の移行

```go
// Before
func (h *AdminWeeklyReportHandler) GetWeeklyReports(c *gin.Context) {
    reports, total, err := h.service.GetWeeklyReports(ctx, page, limit, status, userID, dateFrom, dateTo)
    if err != nil {
        h.util.handleError(c, err, "週報一覧の取得に失敗しました")
        return
    }
}

// After
func (h *AdminWeeklyReportHandler) GetWeeklyReports(c *gin.Context) {
    reports, total, err := h.service.GetWeeklyReports(ctx, page, limit, status, userID, dateFrom, dateTo)
    if err != nil {
        if appErr, ok := err.(*message.AppError); ok {
            h.util.RespondErrorWithCode(c, appErr)
            return
        }
        appErr := message.NewAppError(message.ErrCodeInternalServer, 
            "週報一覧の取得に失敗しました", 
            map[string]interface{}{
                "original_error": err.Error(),
                "filters": map[string]interface{}{
                    "status": status,
                    "user_id": userID,
                    "date_from": dateFrom,
                    "date_to": dateTo,
                },
            })
        h.util.RespondErrorWithCode(c, appErr)
        return
    }
}
```

#### Service層の移行

```go
// Before
func (s *adminWeeklyReportService) GetWeeklyReportDetail(ctx context.Context, reportID uuid.UUID) (*dto.AdminWeeklyReportDetailDTO, error) {
    var report model.WeeklyReport
    if err := s.db.WithContext(ctx).First(&report).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, fmt.Errorf("週報が見つかりません")
        }
        s.logger.Error("Failed to get weekly report detail", zap.Error(err))
        return nil, err
    }
}

// After
func (s *adminWeeklyReportService) GetWeeklyReportDetail(ctx context.Context, reportID uuid.UUID) (*dto.AdminWeeklyReportDetailDTO, error) {
    var report model.WeeklyReport
    if err := s.db.WithContext(ctx).First(&report).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, message.NewAppError("W001R001", 
                "週報が見つかりません",
                map[string]interface{}{"report_id": reportID.String()})
        }
        s.logger.Error("Failed to get weekly report detail", 
            zap.Error(err),
            zap.String("report_id", reportID.String()))
        return nil, message.NewAppError("DAT001",
            "データベースエラーが発生しました",
            map[string]interface{}{
                "operation": "get_weekly_report_detail",
                "report_id": reportID.String(),
            })
    }
}
```

### フロントエンド

#### API呼び出しの更新

```typescript
// Before
const fetchWeeklyReports = async () => {
  try {
    const response = await apiClient.get('/admin/weekly-reports');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      showError(error.response?.data?.error || 'エラーが発生しました');
    }
    throw error;
  }
};

// After
const fetchWeeklyReports = async () => {
  try {
    const response = await apiClient.get('/admin/weekly-reports');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data;
      
      if (errorData.code) {
        const enhancedError = getEnhancedError(
          errorData.code,
          errorData.details
        );
        
        switch (enhancedError.category) {
          case 'AUTH':
            showError(enhancedError.userMessage);
            router.push('/login');
            break;
          case 'RES':
            showWarning(enhancedError.userMessage);
            break;
          default:
            showError(enhancedError.userMessage);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.error('Error Details:', {
            code: errorData.code,
            details: errorData.details,
            suggestion: enhancedError.suggestion
          });
        }
      } else {
        showError(errorData.error || 'エラーが発生しました');
      }
    }
    throw error;
  }
};
```

## 移行用ヘルパー関数

### バックエンド

```go
package helper

import (
    "strings"
    "github.com/duesk/monstera/internal/message"
)

// エラーメッセージとコードのマッピング
var errorMessageToCode = map[string]string{
    "認証が必要です": "AUTH001",
    "メールアドレスまたはパスワードが正しくありません": "AUTH002",
    "週報が見つかりません": "W001R001",
    "ユーザーが見つかりません": "RES003",
}

// ConvertToAppError 既存のエラーをAppErrorに変換
func ConvertToAppError(err error, defaultCode string, details map[string]interface{}) *message.AppError {
    if err == nil {
        return nil
    }
    
    if appErr, ok := err.(*message.AppError); ok {
        return appErr
    }
    
    errMsg := err.Error()
    
    for msg, code := range errorMessageToCode {
        if strings.Contains(errMsg, msg) {
            return message.NewAppError(code, msg, details)
        }
    }
    
    return message.NewAppError(defaultCode, errMsg, details)
}
```

### フロントエンド

```typescript
// レガシーエラーメッセージからエラーコードを推定
const legacyMessageToCode: Record<string, string> = {
  '認証が必要です': 'AUTH001',
  'メールアドレスまたはパスワードが正しくありません': 'AUTH002',
  '週報が見つかりません': 'W001R001',
  'ユーザーが見つかりません': 'RES003',
};

export const inferErrorCode = (errorMessage: string): string | null => {
  for (const [message, code] of Object.entries(legacyMessageToCode)) {
    if (errorMessage.includes(message)) {
      return code;
    }
  }
  return null;
};

// レガシーエラーレスポンスを新形式に変換
export const convertLegacyError = (error: any): ApiErrorResponse => {
  if (error.code) {
    return error;
  }
  
  const errorMessage = error.error || error.message || 'エラーが発生しました';
  const inferredCode = inferErrorCode(errorMessage);
  
  return {
    error: errorMessage,
    code: inferredCode || 'SYS001',
    details: {
      legacy: true,
      originalError: error
    }
  };
};
```

## 更新履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|------------|----------|--------|
| 2024-01 | 1.0 | 初版作成 | システム開発部 |
| 2025-01-30 | 1.1 | error-code-migration-samples.mdとerror-code-mapping.mdの内容を統合 | Claude Code |

---

**注意事項**
- エラーコードは一度リリース後は変更しないこと
- 新機能追加時は事前にエラーコードを定義すること
- エラーコード追加時は必ずこの仕様書を更新すること