# 休暇申請機能 詳細設計書

## 1. システム構成

### 1.1 アーキテクチャ概要
```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド (Next.js)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   Pages     │  │ Components  │  │     Hooks       │   │
│  │  - leave    │  │ - features/ │  │  - useLeave     │   │
│  │  - admin/   │  │   leave/    │  │  - useLeaveData │   │
│  │    leave    │  │ - common/   │  │  - useLeave...  │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST API
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                      バックエンド (Go/Gin)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  Handlers   │→ │  Services   │→ │  Repositories   │   │
│  │  - leave_   │  │  - leave_   │  │  - leave_       │   │
│  │    handler  │  │    service  │  │    repository   │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ GORM
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                      データベース (PostgreSQL)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │leave_types  │  │leave_       │  │user_leave_      │   │
│  │            │  │ requests    │  │ balances        │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. フロントエンド詳細設計

### 2.1 ディレクトリ構造
```
frontend/src/
├── app/(authenticated)/(engineer)/leave/
│   └── page.tsx                    # 休暇申請画面
├── app/(authenticated)/(admin)/admin/leave/
│   └── page.tsx                    # 管理者向け休暇管理画面
├── components/
│   ├── features/leave/
│   │   ├── LeaveBalanceCard.tsx    # 休暇残日数表示カード
│   │   ├── LeaveTypeSelector.tsx   # 休暇種別選択
│   │   ├── LeaveDateCalendar.tsx   # 日付選択カレンダー
│   │   ├── LeaveTimeSelector.tsx   # 時間選択
│   │   ├── LeaveReasonField.tsx    # 理由入力
│   │   ├── LeaveUsageSummary.tsx   # 利用日数サマリー
│   │   └── LeaveRequestRow.tsx     # 申請履歴行
│   └── admin/leave/
│       ├── LeaveRequestList.tsx    # 休暇申請一覧（管理者）
│       └── LeaveStatistics.tsx     # 休暇統計
├── hooks/leave/
│   ├── useLeave.ts                 # メインフック
│   ├── useLeaveData.ts             # データ取得・更新
│   ├── useLeaveCalendar.ts         # カレンダー制御
│   ├── useLeaveCalculation.ts      # 日数計算
│   ├── useLeaveValidation.ts       # バリデーション
│   └── useLeaveState.ts            # 状態管理
├── lib/api/
│   └── leave.ts                    # API通信
├── types/
│   └── leave.ts                    # 型定義
├── constants/
│   └── leave.ts                    # 定数定義
└── utils/
    └── leaveUtils.ts               # ユーティリティ関数
```

### 2.2 コンポーネント詳細

#### 2.2.1 LeaveBalanceCard
**責務**: 各休暇種別の残日数を表示するカード

**Props**:
```typescript
interface LeaveBalanceCardProps {
  balance: {
    id: string;
    leaveTypeId: string;
    name: string;
    total: number;
    used: number;
    remaining: number;
    expireDate: string | '';
  };
  today: Date;
}
```

**実装詳細**:
- MUIのCard/CardContentを使用
- 残日数が0の場合は赤色で表示
- 有効期限が近い（30日以内）場合は警告表示
- 期限切れの場合はグレーアウト

#### 2.2.2 LeaveDateCalendar
**責務**: 休暇日を選択するカレンダーUI

**Props**:
```typescript
interface LeaveDateCalendarProps {
  control: Control<AttendanceFormData>;
  selectedDates: Date[];
  calendarMonths: CalendarMonth[];
  takenLeaveDates: string[];
  today: Date;
  errors: FieldErrors;
  onDateSelect: (date: Date) => void;
  onClearAll: () => void;
  onUpdateCalendars: (action: string) => void;
}
```

**実装詳細**:
- MUI X Date Pickersを使用
- 3ヶ月分のカレンダーを横並びで表示
- 選択済み日付はハイライト表示
- 申請済み日付は選択不可（グレーアウト）
- 土日祝日の色分け表示

#### 2.2.3 LeaveTypeSelector
**責務**: 休暇種別の選択と時間単位取得の切り替え

**実装詳細**:
- SelectコンポーネントとCheckboxを組み合わせ
- 性別制限がある休暇種別はフィルタリング
- 残日数を併記して表示
- 時間単位取得不可の休暇種別では自動的にチェックボックスを無効化

### 2.3 カスタムフック詳細

#### 2.3.1 useLeave（統合フック）
**責務**: 休暇申請機能の全体的な状態管理とロジック提供

**返却値**:
```typescript
interface UseLeaveReturn {
  leaveTypesData: LeaveType[];
  userLeaveBalances: UserLeaveBalance[];
  leaveRequests: LeaveRequestResponse[];
  loadingState: LoadingState;
  apiErrors: ApiErrors;
  LEAVE_TYPES: LeaveTypeOption[];
  REMAINING_LEAVES: Record<string, RemainingLeave>;
  submitLeaveRequest: (formData: AttendanceFormData, totalLeaveDays: number) => Promise<{success: boolean; error?: Error}>;
  isReasonRequired: (selectedLeaveType: string) => boolean;
  getLeaveTypeLabel: (leaveTypeValue: string) => string;
  getStatusChip: (status: string) => {color: string; label: string};
  // その他のメソッド...
}
```

#### 2.3.2 useLeaveData
**責務**: APIとの通信処理

**主要メソッド**:
- `loadInitialData`: 初期データ（休暇種別、残日数、申請履歴）の取得
- `submitLeaveRequest`: 休暇申請の送信
- `fetchLeaveRequests`: 申請履歴の取得

#### 2.3.3 useLeaveCalendar
**責務**: カレンダーUIの制御

**機能**:
- 3ヶ月分のカレンダー表示制御
- 日付選択/選択解除のハンドリング
- 重複日付のチェック
- カレンダーナビゲーション

#### 2.3.4 useLeaveCalculation
**責務**: 休暇日数の計算ロジック

**計算ルール**:
- 日単位: 選択した日数をそのまま計算
- 時間単位: (終了時刻 - 開始時刻 - 休憩時間) / 8時間
- 複数日選択時は合計を算出

#### 2.3.5 useLeaveValidation
**責務**: 入力値のバリデーション

**チェック項目**:
- 理由必須チェック（慶弔・特別休暇）
- 日付重複チェック
- 残日数超過チェック
- 時間単位の妥当性チェック

### 2.4 API通信詳細

#### 2.4.1 エラーハンドリング
```typescript
// API通信時のエラーハンドリングフロー
try {
  const response = await apiCall();
  return convertSnakeToCamel(response.data);
} catch (error) {
  if (error instanceof AbortError) {
    throw error; // キャンセルは再スロー
  }
  const handledError = handleApiError(error, '休暇申請');
  DebugLogger.apiError({category: '休暇', operation: '申請作成'}, {error});
  throw handledError;
}
```

#### 2.4.2 ケース変換
- リクエスト: camelCase → snake_case
- レスポンス: snake_case → camelCase
- 自動変換ユーティリティを使用

## 3. バックエンド詳細設計

### 3.1 レイヤー構成

#### 3.1.1 Handler層
**ファイル**: `internal/handler/leave_handler.go`

**責務**:
- HTTPリクエストの受信とレスポンスの返却
- リクエストのバリデーション
- 認証情報の取得
- エラーハンドリング

**主要メソッド**:
```go
type LeaveHandler interface {
    GetLeaveTypes(c *gin.Context)           // 休暇種別一覧取得
    GetUserLeaveBalances(c *gin.Context)    // 休暇残日数取得
    CreateLeaveRequest(c *gin.Context)      // 休暇申請作成
    GetLeaveRequests(c *gin.Context)        // 休暇申請履歴取得
    GetHolidays(c *gin.Context)             // 休日情報取得
}
```

#### 3.1.2 Service層
**ファイル**: `internal/service/leave_service.go`

**責務**:
- ビジネスロジックの実装
- トランザクション管理
- 複数リポジトリの協調

**主要メソッド**:
```go
type LeaveService interface {
    GetLeaveTypes(ctx context.Context) ([]dto.LeaveTypeResponse, error)
    GetUserLeaveBalances(ctx context.Context, userID uuid.UUID) ([]dto.UserLeaveBalanceResponse, error)
    CreateLeaveRequest(ctx context.Context, req dto.LeaveRequestRequest) (*dto.LeaveRequestResponse, error)
    GetLeaveRequestsByUserID(ctx context.Context, userID uuid.UUID) ([]dto.LeaveRequestResponse, error)
}
```

**トランザクション処理例**:
```go
func (s *leaveService) CreateLeaveRequest(ctx context.Context, req dto.LeaveRequestRequest) (*dto.LeaveRequestResponse, error) {
    var result *dto.LeaveRequestResponse
    
    err := s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 残日数チェック
        balance, err := s.checkBalance(ctx, tx, req.UserID, req.LeaveTypeID)
        if err != nil {
            return err
        }
        
        // 2. 重複チェック
        if err := s.checkDuplication(ctx, tx, req); err != nil {
            return err
        }
        
        // 3. 申請作成
        request, err := s.createRequest(ctx, tx, req)
        if err != nil {
            return err
        }
        
        // 4. 残日数更新
        if err := s.updateBalance(ctx, tx, balance, req.TotalDays); err != nil {
            return err
        }
        
        result = s.toResponse(request)
        return nil
    })
    
    return result, err
}
```

#### 3.1.3 Repository層
**ファイル**: 
- `internal/repository/leave_request_repository.go`
- `internal/repository/user_leave_balance_repository.go`

**責務**:
- データベースアクセス
- クエリの実行
- エンティティとモデルの変換

**実装パターン**:
```go
type LeaveRequestRepository interface {
    Create(ctx context.Context, request *model.LeaveRequest) error
    FindByID(ctx context.Context, id uuid.UUID) (*model.LeaveRequest, error)
    FindByUserID(ctx context.Context, userID uuid.UUID) ([]*model.LeaveRequest, error)
    Update(ctx context.Context, request *model.LeaveRequest) error
}
```

### 3.2 エラーハンドリング詳細

#### 3.2.1 エラー分類
```go
// ビジネスエラー
type BusinessError struct {
    Code    string
    Message string
}

// エラーコード定義
const (
    ErrCodeInsufficientBalance = "LEAVE_001"
    ErrCodeDuplicateRequest    = "LEAVE_002"
    ErrCodeInvalidDate         = "LEAVE_003"
    ErrCodeRequestNotFound     = "LEAVE_004"
    ErrCodeUnauthorized        = "LEAVE_005"
)
```

#### 3.2.2 エラーレスポンス
```go
func (h *leaveHandler) handleError(c *gin.Context, statusCode int, message string, err error, keyValues ...interface{}) {
    // ログ出力
    h.logger.Error(message, 
        zap.Error(err),
        zap.Any("additional_info", keyValues))
    
    // レスポンス返却
    c.JSON(statusCode, gin.H{
        "error": message,
        "code": extractErrorCode(err),
    })
}
```

### 3.3 認証・認可

#### 3.3.1 JWT検証ミドルウェア
```go
// リクエストヘッダーからJWTトークンを取得し検証
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            token, _ = c.Cookie("access_token")
        }
        
        claims, err := validateToken(token)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "認証エラー"})
            return
        }
        
        c.Set("user_id", claims.UserID)
        c.Set("role", claims.Role)
        c.Next()
    }
}
```

#### 3.3.2 ロールベースアクセス制御
```go
func RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole, _ := c.Get("role")
        
        for _, role := range roles {
            if userRole == role {
                c.Next()
                return
            }
        }
        
        c.AbortWithStatusJSON(403, gin.H{"error": "権限がありません"})
    }
}
```

## 4. データベース詳細設計

### 4.1 インデックス設計

```sql
-- leave_requests テーブル
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_request_date ON leave_requests(request_date);
CREATE INDEX idx_leave_requests_composite ON leave_requests(user_id, status, request_date);

-- leave_request_details テーブル
CREATE INDEX idx_leave_request_details_leave_date ON leave_request_details(leave_date);

-- user_leave_balances テーブル
CREATE INDEX idx_user_leave_balances_user_leave ON user_leave_balances(user_id, leave_type_id, fiscal_year);
```

### 4.2 制約とトリガー

#### 4.2.1 CHECK制約
```sql
-- 休暇日数は0以上
ALTER TABLE leave_requests 
ADD CONSTRAINT chk_total_days CHECK (total_days >= 0);

-- 残日数は0以上
ALTER TABLE user_leave_balances 
ADD CONSTRAINT chk_remaining_days CHECK (remaining_days >= 0);

-- 開始時刻と終了時刻の整合性
ALTER TABLE leave_request_details 
ADD CONSTRAINT chk_time_range CHECK (
    (start_time IS NULL AND end_time IS NULL) OR 
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
);
```

#### 4.2.2 トリガー（参考実装）
```sql
-- 残日数自動計算トリガー
DELIMITER //
CREATE TRIGGER update_remaining_days 
BEFORE UPDATE ON user_leave_balances
FOR EACH ROW
BEGIN
    SET NEW.remaining_days = NEW.total_days - NEW.used_days;
END//
DELIMITER ;
```

### 4.3 データ整合性保証

#### 4.3.1 外部キー制約
```sql
-- カスケード削除の設定
ALTER TABLE leave_request_details
ADD CONSTRAINT fk_leave_request_cascade
FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id)
ON DELETE CASCADE;
```

#### 4.3.2 ユニーク制約
```sql
-- 同一日に複数の申請を防ぐ
ALTER TABLE leave_request_details
ADD CONSTRAINT uk_user_date UNIQUE (leave_request_id, leave_date);
```

## 5. 非機能要件詳細

### 5.1 パフォーマンス要件

#### 5.1.1 レスポンスタイム目標
- 休暇種別一覧取得: 200ms以内
- 休暇申請作成: 500ms以内
- 申請履歴取得（100件）: 300ms以内

#### 5.1.2 同時実行制御
```go
// 楽観的ロックの実装
type LeaveRequest struct {
    ID        uuid.UUID
    Version   int       `gorm:"default:0"`
    UpdatedAt time.Time
}

// 更新時のバージョンチェック
result := db.Model(&request).
    Where("id = ? AND version = ?", id, oldVersion).
    Updates(map[string]interface{}{
        "status": newStatus,
        "version": oldVersion + 1,
    })
    
if result.RowsAffected == 0 {
    return errors.New("更新競合が発生しました")
}
```

### 5.2 セキュリティ詳細

#### 5.2.1 入力値サニタイズ
```go
// SQLインジェクション対策（GORMで自動的に処理）
db.Where("user_id = ? AND status = ?", userID, status).Find(&requests)

// XSS対策（HTMLエスケープ）
func sanitizeHTML(input string) string {
    return html.EscapeString(input)
}
```

#### 5.2.2 レート制限
```go
// IPアドレスベースのレート制限
rateLimiter := NewRateLimiter(
    100,              // 1時間あたりのリクエスト数
    time.Hour,        // 時間窓
    "leave_request",  // キープレフィックス
)

middleware.Use(rateLimiter.Limit())
```

### 5.3 ログ設計

#### 5.3.1 ログレベルと出力内容
```go
// INFOレベル: 正常系の操作ログ
logger.Info("休暇申請作成",
    zap.String("user_id", userID),
    zap.String("leave_type", leaveType),
    zap.Float64("days", totalDays))

// WARNレベル: 業務エラー
logger.Warn("休暇残日数不足",
    zap.String("user_id", userID),
    zap.Float64("requested", requested),
    zap.Float64("remaining", remaining))

// ERRORレベル: システムエラー
logger.Error("データベースエラー",
    zap.Error(err),
    zap.String("operation", "CreateLeaveRequest"))
```

#### 5.3.2 監査ログ
```go
type AuditLog struct {
    ID          uuid.UUID
    UserID      uuid.UUID
    Action      string    // CREATE, UPDATE, DELETE
    TargetType  string    // LEAVE_REQUEST
    TargetID    uuid.UUID
    OldValue    string    // JSON形式
    NewValue    string    // JSON形式
    IPAddress   string
    UserAgent   string
    CreatedAt   time.Time
}
```

## 6. バッチ処理設計

### 6.1 定期実行バッチ

#### 6.1.1 有効期限切れ休暇の処理
```go
// 毎日午前2時に実行
func ExpireOldLeaves() error {
    return db.Transaction(func(tx *gorm.DB) error {
        // 期限切れの休暇を検索
        var balances []model.UserLeaveBalance
        err := tx.Where("expire_date < ? AND remaining_days > 0", time.Now()).
            Find(&balances).Error
        if err != nil {
            return err
        }
        
        // 残日数を0にリセット
        for _, balance := range balances {
            balance.RemainingDays = 0
            if err := tx.Save(&balance).Error; err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

#### 6.1.2 年度更新処理
```go
// 毎年4月1日に実行
func CreateNewFiscalYearBalances() error {
    currentYear := time.Now().Year()
    
    return db.Transaction(func(tx *gorm.DB) error {
        // 全ユーザーの新年度分休暇残高を作成
        var users []model.User
        if err := tx.Find(&users).Error; err != nil {
            return err
        }
        
        for _, user := range users {
            if err := createUserBalances(tx, user.ID, currentYear); err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

## 7. テスト設計詳細

### 7.1 単体テスト

#### 7.1.1 フロントエンドテスト
```typescript
// コンポーネントテスト例
describe('LeaveBalanceCard', () => {
  it('残日数が0の場合、赤色で表示される', () => {
    const balance = {
      remaining: 0,
      // その他のプロパティ
    };
    
    const { getByText } = render(<LeaveBalanceCard balance={balance} />);
    const element = getByText('0.0日');
    
    expect(element).toHaveStyle('color: red');
  });
});

// フックテスト例
describe('useLeaveCalculation', () => {
  it('時間単位休暇の日数を正しく計算する', () => {
    const { result } = renderHook(() => useLeaveCalculation());
    
    const days = result.current.calculateHourlyDays('09:00', '12:00');
    
    expect(days).toBe(0.375); // 3時間 / 8時間
  });
});
```

#### 7.1.2 バックエンドテスト
```go
// サービス層テスト例
func TestCreateLeaveRequest(t *testing.T) {
    // モックの準備
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    
    mockRepo := mock_repository.NewMockLeaveRequestRepository(ctrl)
    service := NewLeaveService(mockRepo)
    
    // テストケース
    t.Run("正常系: 休暇申請作成", func(t *testing.T) {
        req := dto.LeaveRequestRequest{
            LeaveTypeID: "paid_leave_id",
            TotalDays:   2.0,
            // その他のフィールド
        }
        
        mockRepo.EXPECT().Create(gomock.Any(), gomock.Any()).Return(nil)
        mockRepo.EXPECT().FindBalance(gomock.Any(), gomock.Any()).Return(&model.UserLeaveBalance{
            RemainingDays: 10.0,
        }, nil)
        
        _, err := service.CreateLeaveRequest(context.Background(), req)
        
        assert.NoError(t, err)
    })
    
    t.Run("異常系: 残日数不足", func(t *testing.T) {
        // 残日数0のケースをテスト
    })
}
```

### 7.2 結合テスト

#### 7.2.1 API結合テスト
```go
func TestLeaveRequestAPI(t *testing.T) {
    // テスト用サーバーの起動
    router := setupTestRouter()
    
    t.Run("休暇申請の作成から承認まで", func(t *testing.T) {
        // 1. 休暇申請作成
        createReq := map[string]interface{}{
            "leave_type_id": "test_type_id",
            "total_days":    1.0,
            // その他
        }
        
        w := httptest.NewRecorder()
        req, _ := http.NewRequest("POST", "/api/v1/leave/requests", toJSON(createReq))
        router.ServeHTTP(w, req)
        
        assert.Equal(t, 201, w.Code)
        
        var response map[string]interface{}
        json.Unmarshal(w.Body.Bytes(), &response)
        requestID := response["id"].(string)
        
        // 2. 申請承認（管理者として）
        w = httptest.NewRecorder()
        req, _ = http.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/leave/requests/%s/approve", requestID), nil)
        router.ServeHTTP(w, req)
        
        assert.Equal(t, 200, w.Code)
    })
}
```

### 7.3 E2Eテスト

#### 7.3.1 Playwrightによる自動テスト
```typescript
test('休暇申請の一連のフロー', async ({ page }) => {
  // ログイン
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@duesk.co.jp');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');
  
  // 休暇申請画面へ遷移
  await page.goto('/leave');
  
  // 休暇種別選択
  await page.selectOption('[name="leaveTypeId"]', 'paid');
  
  // 日付選択
  await page.click('[data-testid="calendar-date-2024-12-25"]');
  
  // 申請送信
  await page.click('[data-testid="submit-button"]');
  
  // 成功メッセージ確認
  await expect(page.locator('[role="alert"]')).toContainText('休暇申請が完了しました');
  
  // 履歴タブで確認
  await page.click('[data-testid="history-tab"]');
  await expect(page.locator('table')).toContainText('2024-12-25');
});
```

## 8. デプロイメント設計

### 8.1 Docker構成

#### 8.1.1 Dockerfile（バックエンド）
```dockerfile
# ビルドステージ
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main cmd/server/main.go

# 実行ステージ
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
EXPOSE 8080
CMD ["./main"]
```

#### 8.1.2 docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PORT=3306
      - DB_NAME=monstera
      - DB_USER=root
      - DB_PASSWORD=password
    depends_on:
      postgres:
        condition: service_healthy
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    depends_on:
      - backend
    
  postgres:
    image: postgres:latest
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=monstera
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 8.2 環境変数管理

#### 8.2.1 環境別設定
```bash
# .env.development
DB_HOST=localhost
DB_PORT=3306
LOG_LEVEL=debug
JWT_SECRET=dev-secret

# .env.production
DB_HOST=prod-db-server
DB_PORT=3306
LOG_LEVEL=info
JWT_SECRET=${SECRET_JWT_KEY}  # CI/CDで注入
```

## 9. 運用・保守設計

### 9.1 モニタリング

#### 9.1.1 メトリクス収集
```go
// Prometheusメトリクス定義
var (
    leaveRequestTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "leave_request_total",
            Help: "Total number of leave requests",
        },
        []string{"status", "leave_type"},
    )
    
    leaveRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "leave_request_duration_seconds",
            Help: "Duration of leave request processing",
        },
        []string{"operation"},
    )
)
```

#### 9.1.2 ヘルスチェック
```go
// ヘルスチェックエンドポイント
func HealthCheck(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        // データベース接続確認
        var result int
        err := db.Raw("SELECT 1").Scan(&result).Error
        
        if err != nil {
            c.JSON(500, gin.H{
                "status": "unhealthy",
                "database": "disconnected",
            })
            return
        }
        
        c.JSON(200, gin.H{
            "status": "healthy",
            "database": "connected",
            "version": "1.0.0",
        })
    }
}
```

### 9.2 バックアップ・リカバリ

#### 9.2.1 データベースバックアップ
```bash
#!/bin/bash
# daily-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/postgres"
DB_NAME="monstera"

# フルバックアップ
pg_dump -U postgres \
  --single-transaction \
  --routines \
  --triggers \
  $DB_NAME > $BACKUP_DIR/full_backup_$DATE.sql

# 過去7日分のみ保持
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

#### 9.2.2 ディザスタリカバリ手順
1. 最新のバックアップファイルを特定
2. 新しいデータベースインスタンスを起動
3. バックアップをリストア
4. アプリケーションの接続先を変更
5. 動作確認

## 10. 移行計画

### 10.1 既存システムからの移行

#### 10.1.1 データ移行スクリプト
```sql
-- 既存の休暇データを新形式に変換
INSERT INTO leave_requests (
    id,
    user_id,
    leave_type_id,
    request_date,
    total_days,
    status
)
SELECT 
    UUID(),
    old_user_id,
    CASE old_leave_type 
        WHEN 1 THEN 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'  -- 有給
        WHEN 2 THEN 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'  -- 夏季
    END,
    old_request_date,
    old_days,
    CASE old_status
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'approved'
        WHEN 2 THEN 'rejected'
    END
FROM old_leave_table;
```

### 10.2 段階的リリース計画

1. **Phase 1**: 参照系機能のみリリース
   - 休暇残日数表示
   - 申請履歴閲覧

2. **Phase 2**: 申請機能リリース
   - 新規申請作成
   - 既存システムとの並行運用

3. **Phase 3**: 管理機能リリース
   - 承認・却下機能
   - 統計情報表示

4. **Phase 4**: 旧システム停止
   - データ完全移行
   - 旧システムの廃止