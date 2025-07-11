# エラーコード移行実装サンプル

## 1. バックエンド移行サンプル

### 1.1 Handler層の移行

#### Before（現在の実装）
```go
// backend/internal/handler/admin_weekly_report_handler.go
func (h *AdminWeeklyReportHandler) GetWeeklyReports(c *gin.Context) {
    reports, total, err := h.service.GetWeeklyReports(ctx, page, limit, status, userID, dateFrom, dateTo)
    if err != nil {
        h.util.handleError(c, err, "週報一覧の取得に失敗しました")
        return
    }
}
```

#### After（エラーコード対応）
```go
// backend/internal/handler/admin_weekly_report_handler.go
func (h *AdminWeeklyReportHandler) GetWeeklyReports(c *gin.Context) {
    reports, total, err := h.service.GetWeeklyReports(ctx, page, limit, status, userID, dateFrom, dateTo)
    if err != nil {
        // AppErrorの場合はそのまま使用
        if appErr, ok := err.(*message.AppError); ok {
            h.util.RespondErrorWithCode(c, appErr)
            return
        }
        // 通常のエラーの場合は変換
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

### 1.2 Service層の移行

#### Before（現在の実装）
```go
// backend/internal/service/admin_weekly_report_service.go
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
```

#### After（エラーコード対応）
```go
// backend/internal/service/admin_weekly_report_service.go
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

### 1.3 Repository層の移行

#### Before（現在の実装）
```go
// backend/internal/repository/weekly_report_repository.go
func (r *WeeklyReportRepository) Create(ctx context.Context, report *model.WeeklyReport) error {
    if err := r.db.WithContext(ctx).Create(report).Error; err != nil {
        r.logger.Error("Failed to create weekly report", zap.Error(err))
        return fmt.Errorf("週報の作成に失敗しました: %w", err)
    }
    return nil
}
```

#### After（エラーコード対応）
```go
// backend/internal/repository/weekly_report_repository.go
func (r *WeeklyReportRepository) Create(ctx context.Context, report *model.WeeklyReport) error {
    if err := r.db.WithContext(ctx).Create(report).Error; err != nil {
        r.logger.Error("Failed to create weekly report", 
            zap.Error(err),
            zap.String("user_id", report.UserID.String()),
            zap.Time("start_date", report.StartDate),
            zap.Time("end_date", report.EndDate))
        
        // 重複キーエラーの判定
        if strings.Contains(err.Error(), "Duplicate entry") {
            return message.NewAppError("W001V004",
                "この期間の週報は既に存在します",
                map[string]interface{}{
                    "user_id": report.UserID.String(),
                    "start_date": report.StartDate.Format("2006-01-02"),
                    "end_date": report.EndDate.Format("2006-01-02"),
                })
        }
        
        return message.NewAppError("W001V001",
            "週報の作成に失敗しました",
            map[string]interface{}{
                "user_id": report.UserID.String(),
                "error_detail": err.Error(),
            })
    }
    return nil
}
```

## 2. フロントエンド移行サンプル

### 2.1 API呼び出しの更新

#### Before（現在の実装）
```typescript
// frontend/src/hooks/useWeeklyReports.ts
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
```

#### After（エラーコード対応）
```typescript
// frontend/src/hooks/useWeeklyReports.ts
import { getEnhancedError } from '@/utils/errorUtils';

const fetchWeeklyReports = async () => {
  try {
    const response = await apiClient.get('/admin/weekly-reports');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data;
      
      // エラーコードが含まれている場合
      if (errorData.code) {
        const enhancedError = getEnhancedError(
          errorData.code,
          errorData.details
        );
        
        // カテゴリ別の処理
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
        
        // 開発環境ではデバッグ情報も表示
        if (process.env.NODE_ENV === 'development') {
          console.error('Error Details:', {
            code: errorData.code,
            details: errorData.details,
            suggestion: enhancedError.suggestion
          });
        }
      } else {
        // 従来のエラー処理（移行期間中）
        showError(errorData.error || 'エラーが発生しました');
      }
    }
    throw error;
  }
};
```

### 2.2 エラーハンドラーの更新

```typescript
// frontend/src/hooks/useErrorHandler.ts
export const useErrorHandler = () => {
  const { showError, showWarning } = useToast();
  const router = useRouter();
  
  const handleApiError = useCallback((error: unknown, context?: string) => {
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data as ApiErrorResponse;
      
      // エラーコード対応
      if (errorData.code) {
        const enhancedError = getEnhancedError(
          errorData.code,
          errorData.details
        );
        
        // エラーログ収集（本番環境）
        if (process.env.NODE_ENV === 'production') {
          logError({
            code: errorData.code,
            message: errorData.error,
            details: errorData.details,
            context,
            timestamp: new Date().toISOString(),
          });
        }
        
        // カテゴリ別の処理
        handleErrorByCategory(enhancedError);
      } else {
        // 従来のエラー処理
        handleLegacyError(errorData.error || 'エラーが発生しました');
      }
    } else {
      showError('予期しないエラーが発生しました');
    }
  }, [showError, showWarning, router]);
  
  const handleErrorByCategory = (error: EnhancedError) => {
    switch (error.category) {
      case 'AUTH':
        if (error.code === 'AUTH003' || error.code === 'AUTH005') {
          // トークン期限切れの場合は自動リフレッシュを試行
          refreshToken().catch(() => {
            showError(error.userMessage);
            router.push('/login');
          });
        } else {
          showError(error.userMessage);
          router.push('/login');
        }
        break;
      
      case 'VAL':
        showWarning(error.userMessage);
        break;
      
      case 'RES':
        if (error.code === 'RES001' || error.code === 'RES002') {
          showWarning(error.userMessage);
          router.push('/admin/weekly-reports');
        } else {
          showError(error.userMessage);
        }
        break;
      
      case 'BIZ':
        showWarning(error.userMessage);
        break;
      
      default:
        showError(error.userMessage);
    }
  };
  
  return { handleApiError };
};
```

## 3. 移行用ヘルパー関数

### 3.1 バックエンド移行ヘルパー

```go
// backend/internal/helper/error_migration.go
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
    // ... 他のマッピング
}

// ConvertToAppError 既存のエラーをAppErrorに変換
func ConvertToAppError(err error, defaultCode string, details map[string]interface{}) *message.AppError {
    if err == nil {
        return nil
    }
    
    // 既にAppErrorの場合はそのまま返す
    if appErr, ok := err.(*message.AppError); ok {
        return appErr
    }
    
    errMsg := err.Error()
    
    // メッセージからエラーコードを特定
    for msg, code := range errorMessageToCode {
        if strings.Contains(errMsg, msg) {
            return message.NewAppError(code, msg, details)
        }
    }
    
    // デフォルトコードを使用
    return message.NewAppError(defaultCode, errMsg, details)
}

// IsBusinessError ビジネスエラーかどうか判定
func IsBusinessError(err error) bool {
    appErr, ok := err.(*message.AppError)
    if !ok {
        return false
    }
    
    return strings.HasPrefix(appErr.Code, "BIZ") || 
           strings.HasPrefix(appErr.Code, "VAL") ||
           strings.HasPrefix(appErr.Code, "RES")
}
```

### 3.2 フロントエンド移行ヘルパー

```typescript
// frontend/src/utils/errorMigration.ts

// レガシーエラーメッセージからエラーコードを推定
const legacyMessageToCode: Record<string, string> = {
  '認証が必要です': 'AUTH001',
  'メールアドレスまたはパスワードが正しくありません': 'AUTH002',
  '週報が見つかりません': 'W001R001',
  'ユーザーが見つかりません': 'RES003',
  // ... 他のマッピング
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
    // 既に新形式
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

## 4. テストコード例

### 4.1 バックエンドテスト

```go
// backend/internal/handler/admin_weekly_report_handler_test.go
func TestGetWeeklyReports_ErrorHandling(t *testing.T) {
    tests := []struct {
        name           string
        serviceError   error
        expectedCode   string
        expectedStatus int
    }{
        {
            name:           "週報が見つからない場合",
            serviceError:   message.NewAppError("W001R001", "週報が見つかりません", nil),
            expectedCode:   "W001R001",
            expectedStatus: 404,
        },
        {
            name:           "データベースエラーの場合",
            serviceError:   message.NewAppError("DAT001", "データベースエラー", nil),
            expectedCode:   "DAT001",
            expectedStatus: 500,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // モックサービスの設定
            mockService.EXPECT().GetWeeklyReports(gomock.Any()).Return(nil, 0, tt.serviceError)
            
            // リクエスト実行
            w := httptest.NewRecorder()
            c, _ := gin.CreateTestContext(w)
            
            handler.GetWeeklyReports(c)
            
            // レスポンス検証
            assert.Equal(t, tt.expectedStatus, w.Code)
            
            var response map[string]interface{}
            json.Unmarshal(w.Body.Bytes(), &response)
            assert.Equal(t, tt.expectedCode, response["code"])
        })
    }
}
```

### 4.2 フロントエンドテスト

```typescript
// frontend/src/hooks/__tests__/useErrorHandler.test.ts
describe('useErrorHandler', () => {
  it('エラーコードに基づいて適切に処理される', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const mockError = {
      response: {
        data: {
          error: '週報が見つかりません',
          code: 'W001R001',
          details: { report_id: '123' }
        }
      }
    };
    
    act(() => {
      result.current.handleApiError(mockError);
    });
    
    // Toast通知が表示されることを確認
    expect(mockShowWarning).toHaveBeenCalledWith(
      '指定された週報が見つかりません'
    );
    
    // リダイレクトされることを確認
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/weekly-reports');
  });
});
```

---

**文書情報**
- 作成日：2024年1月
- 作成者：システム開発部
- バージョン：1.0