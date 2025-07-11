# 経費申請機能 詳細設計書

## 1. 概要

本書は、エンジニア社員向け経費申請機能の詳細設計を定義する。基本設計書に基づき、具体的な実装方法、API仕様、画面仕様、データベース操作などの技術的詳細を記述する。

## 2. アーキテクチャ概要

### 2.1 システム構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   Database      │
│  (Next.js 15)   │     │   (Go + Gin)    │     │   (MySQL 8)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│    AWS S3       │     │     Redis       │
│ (領収書保存)    │     │  (キャッシュ)   │
└─────────────────┘     └─────────────────┘
```

### 2.2 レイヤー構成
- **フロントエンド**: Next.js App Router + TypeScript + MUI
- **バックエンド**: Handler → Service → Repository パターン
- **データベース**: MySQL 8.0 + GORM
- **ファイルストレージ**: AWS S3（Pre-signed URL方式）
- **キャッシュ**: Redis（カテゴリ・上限値）

## 3. データベース詳細設計

### 3.1 既存テーブル（expenses）の拡張

```sql
-- 既存のexpensesテーブルに以下のインデックスを追加
CREATE INDEX idx_expenses_user_status ON expenses(user_id, status);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_amount ON expenses(amount);
```

### 3.2 新規テーブル

#### 3.2.1 expense_approvals（承認履歴）
```sql
CREATE TABLE expense_approvals (
    id VARCHAR(36) PRIMARY KEY,
    expense_id VARCHAR(36) NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    approval_type ENUM('manager', 'executive') NOT NULL,
    approval_order INT NOT NULL DEFAULT 1,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
    comment TEXT,
    approved_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_expense_approvals_expense_id (expense_id),
    INDEX idx_expense_approvals_approver_status (approver_id, status),
    UNIQUE KEY uk_expense_approval (expense_id, approval_type, approval_order),
    
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### 3.2.2 expense_limits（申請上限）
```sql
CREATE TABLE expense_limits (
    id VARCHAR(36) PRIMARY KEY,
    limit_type ENUM('monthly', 'yearly') NOT NULL,
    amount INT NOT NULL,
    effective_from DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_expense_limits_type_date (limit_type, effective_from),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### 3.2.3 expense_categories（カテゴリマスタ）
```sql
CREATE TABLE expense_categories (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    requires_details BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3),
    
    INDEX idx_expense_categories_active (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 初期データ
INSERT INTO expense_categories (id, code, name, requires_details, is_active, display_order) VALUES
(UUID(), 'transport', '旅費交通費', false, true, 1),
(UUID(), 'entertainment', '交際費', false, true, 2),
(UUID(), 'supplies', '備品', false, true, 3),
(UUID(), 'books', '書籍', false, true, 4),
(UUID(), 'seminar', 'セミナー', false, true, 5),
(UUID(), 'other', 'その他', true, true, 6);
```

#### 3.2.4 expense_summaries（集計テーブル）
```sql
CREATE TABLE expense_summaries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    total_amount INT NOT NULL DEFAULT 0,
    approved_amount INT NOT NULL DEFAULT 0,
    pending_amount INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY uk_user_period (user_id, year, month),
    INDEX idx_expense_summaries_user (user_id),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

## 4. API詳細設計

### 4.1 エンドポイント仕様

#### 4.1.1 経費申請作成
```
POST /api/v1/expenses
```

**リクエストボディ**:
```json
{
  "title": "〇〇セミナー参加費",
  "category": "seminar",
  "amount": 15000,
  "expense_date": "2024-01-15T00:00:00Z",
  "description": "技術力向上のためのセミナー参加費用",
  "other_details": null
}
```

**レスポンス**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "〇〇セミナー参加費",
    "category": "seminar",
    "amount": 15000,
    "expense_date": "2024-01-15T00:00:00Z",
    "status": "draft",
    "description": "技術力向上のためのセミナー参加費用",
    "receipt_url": null,
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-10T10:00:00Z"
  }
}
```

#### 4.1.2 領収書アップロードURL取得
```
POST /api/v1/expenses/receipts/upload-url
```

**リクエストボディ**:
```json
{
  "expense_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_name": "receipt.jpg",
  "file_size": 2048000,
  "content_type": "image/jpeg"
}
```

**レスポンス**:
```json
{
  "data": {
    "upload_url": "https://s3.amazonaws.com/bucket/receipts/...",
    "key": "receipts/123e4567/550e8400_1704852000_receipt.jpg",
    "expires_at": "2024-01-10T10:15:00Z"
  }
}
```

#### 4.1.3 経費申請一覧取得
```
GET /api/v1/expenses?page=1&limit=20&status=submitted&start_date=2024-01-01&end_date=2024-01-31
```

**レスポンス**:
```json
{
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "〇〇セミナー参加費",
        "category": "seminar",
        "category_name": "セミナー",
        "amount": 15000,
        "expense_date": "2024-01-15T00:00:00Z",
        "status": "submitted",
        "created_at": "2024-01-10T10:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### 4.1.4 経費申請提出
```
POST /api/v1/expenses/{id}/submit
```

**レスポンス**:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "submitted",
    "submitted_at": "2024-01-10T11:00:00Z"
  }
}
```

#### 4.1.5 月次・年次集計取得
```
GET /api/v1/expenses/summary?year=2024&month=1
```

**レスポンス**:
```json
{
  "data": {
    "monthly": {
      "total_amount": 150000,
      "approved_amount": 100000,
      "pending_amount": 50000,
      "limit": 500000,
      "remaining": 350000
    },
    "yearly": {
      "total_amount": 1500000,
      "approved_amount": 1000000,
      "pending_amount": 500000,
      "limit": 2000000,
      "remaining": 500000
    }
  }
}
```

### 4.2 エラーレスポンス

```json
{
  "error": "申請金額が月間上限を超えています",
  "error_code": "EXP001",
  "details": {
    "current_total": 450000,
    "requested_amount": 100000,
    "monthly_limit": 500000
  }
}
```

## 5. バックエンド実装詳細

### 5.1 モデル定義

#### 5.1.1 Expense モデル（既存の拡張）
```go
// ExpenseWithDetails 詳細情報付き経費モデル
type ExpenseWithDetails struct {
    Expense
    CategoryName   string           `json:"category_name"`
    Approvals     []ExpenseApproval `json:"approvals,omitempty"`
    CanEdit       bool              `json:"can_edit"`
    CanSubmit     bool              `json:"can_submit"`
    CanCancel     bool              `json:"can_cancel"`
}
```

#### 5.1.2 ExpenseApproval モデル
```go
type ExpenseApproval struct {
    ID           uuid.UUID    `gorm:"type:varchar(36);primary_key" json:"id"`
    ExpenseID    uuid.UUID    `gorm:"type:varchar(36);not null" json:"expense_id"`
    ApproverID   uuid.UUID    `gorm:"type:varchar(36);not null" json:"approver_id"`
    ApprovalType string       `gorm:"type:enum('manager','executive');not null" json:"approval_type"`
    ApprovalOrder int         `gorm:"not null;default:1" json:"approval_order"`
    Status       string       `gorm:"type:enum('pending','approved','rejected');default:'pending'" json:"status"`
    Comment      string       `gorm:"type:text" json:"comment"`
    ApprovedAt   *time.Time   `json:"approved_at"`
    CreatedAt    time.Time    `json:"created_at"`
    UpdatedAt    time.Time    `json:"updated_at"`
    
    // Relations
    Expense  Expense `gorm:"foreignKey:ExpenseID" json:"-"`
    Approver User    `gorm:"foreignKey:ApproverID" json:"approver"`
}
```

### 5.2 リポジトリ層

#### 5.2.1 ExpenseRepository
```go
type ExpenseRepository interface {
    // 基本CRUD
    Create(ctx context.Context, expense *model.Expense) error
    GetByID(ctx context.Context, id uuid.UUID) (*model.Expense, error)
    Update(ctx context.Context, expense *model.Expense) error
    Delete(ctx context.Context, id uuid.UUID) error
    
    // 一覧・検索
    GetList(ctx context.Context, params ExpenseListParams) ([]*model.ExpenseWithDetails, int64, error)
    GetByUserID(ctx context.Context, userID uuid.UUID, params PaginationParams) ([]*model.Expense, error)
    
    // 集計
    GetUserSummary(ctx context.Context, userID uuid.UUID, year int, month int) (*model.ExpenseSummary, error)
    UpdateUserSummary(ctx context.Context, userID uuid.UUID, year int, month int) error
    
    // トランザクション用
    WithTx(tx *gorm.DB) ExpenseRepository
}

type ExpenseListParams struct {
    UserID      *uuid.UUID
    Status      *string
    CategoryID  *uuid.UUID
    StartDate   *time.Time
    EndDate     *time.Time
    MinAmount   *int
    MaxAmount   *int
    EmployeeNo  *string
    EmployeeName *string
    Page        int
    Limit       int
    Sort        string
    Order       string
}
```

### 5.3 サービス層

#### 5.3.1 ExpenseService
```go
type ExpenseService interface {
    // 申請管理
    CreateExpense(ctx context.Context, userID uuid.UUID, req *dto.CreateExpenseRequest) (*model.Expense, error)
    UpdateExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateExpenseRequest) error
    DeleteExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
    SubmitExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
    CancelExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
    
    // 一覧・詳細
    GetExpenseList(ctx context.Context, params *dto.ExpenseListRequest) (*dto.ExpenseListResponse, error)
    GetExpenseDetail(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.ExpenseWithDetails, error)
    
    // ファイルアップロード
    GenerateUploadURL(ctx context.Context, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error)
    CompleteUpload(ctx context.Context, expenseID uuid.UUID, key string) error
    
    // 集計
    GetUserSummary(ctx context.Context, userID uuid.UUID, year, month int) (*dto.ExpenseSummaryResponse, error)
    
    // カテゴリ・上限
    GetCategories(ctx context.Context) ([]*model.ExpenseCategory, error)
    GetCurrentLimits(ctx context.Context) (*dto.ExpenseLimitsResponse, error)
}
```

#### 5.3.2 承認フロー実装
```go
func (s *expenseService) SubmitExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // リポジトリをトランザクション用に切り替え
        repo := s.expenseRepo.WithTx(tx)
        approvalRepo := s.approvalRepo.WithTx(tx)
        
        // 1. 経費申請を取得
        expense, err := repo.GetByID(ctx, id)
        if err != nil {
            return err
        }
        
        // 2. 権限チェック
        if expense.UserID != userID {
            return ErrUnauthorized
        }
        
        // 3. ステータスチェック
        if expense.Status != model.ExpenseStatusDraft {
            return ErrInvalidStatus
        }
        
        // 4. 必須項目チェック
        if expense.ReceiptURL == "" {
            return ErrReceiptRequired
        }
        
        // 5. 金額上限チェック
        if err := s.checkExpenseLimit(ctx, userID, expense.Amount); err != nil {
            return err
        }
        
        // 6. ステータス更新
        expense.Status = model.ExpenseStatusSubmitted
        if err := repo.Update(ctx, expense); err != nil {
            return err
        }
        
        // 7. 承認レコード作成
        approval := &model.ExpenseApproval{
            ExpenseID:    expense.ID,
            ApprovalType: "manager",
            ApprovalOrder: 1,
            Status:       "pending",
        }
        if err := approvalRepo.Create(ctx, approval); err != nil {
            return err
        }
        
        // 8. 通知作成
        notification := &model.Notification{
            RecipientID:      nil, // 管理部全員
            Title:           fmt.Sprintf("経費申請が提出されました: %s", expense.Title),
            Message:         fmt.Sprintf("%s円の経費申請が提出されました。承認をお願いします。", expense.Amount),
            NotificationType: model.NotificationTypeExpense,
            Priority:        model.NotificationPriorityNormal,
        }
        if err := s.notificationService.Create(ctx, notification); err != nil {
            // 通知エラーは無視（ログのみ）
            s.logger.Warn("通知作成エラー", zap.Error(err))
        }
        
        return nil
    })
}
```

### 5.4 ハンドラー層

#### 5.4.1 ExpenseHandler
```go
type ExpenseHandler struct {
    service ExpenseService
    logger  *zap.Logger
}

// CreateExpense 経費申請作成
func (h *ExpenseHandler) CreateExpense(c *gin.Context) {
    userID, _ := utils.GetUserIDFromContext(c)
    
    var req dto.CreateExpenseRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondError(c, http.StatusBadRequest, "入力データが不正です")
        return
    }
    
    // バリデーション
    if err := h.validateCreateRequest(&req); err != nil {
        utils.RespondError(c, http.StatusBadRequest, err.Error())
        return
    }
    
    expense, err := h.service.CreateExpense(c.Request.Context(), userID, &req)
    if err != nil {
        utils.HandleError(c, err, "経費申請の作成")
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{"data": expense})
}
```

### 5.5 承認処理の競合制御（楽観的ロック）

```go
func (s *approvalService) ApproveExpense(ctx context.Context, expenseID, approverID uuid.UUID, comment string) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 承認レコードを取得（行ロック）
        var approval model.ExpenseApproval
        if err := tx.Set("gorm:query_option", "FOR UPDATE").
            Where("expense_id = ? AND status = ?", expenseID, "pending").
            Order("approval_order ASC").
            First(&approval).Error; err != nil {
            if errors.Is(err, gorm.ErrRecordNotFound) {
                return ErrAlreadyProcessed
            }
            return err
        }
        
        // 2. 承認権限チェック（管理部権限）
        if !s.hasApprovalPermission(ctx, approverID, approval.ApprovalType) {
            return ErrNoPermission
        }
        
        // 3. 承認処理
        now := time.Now()
        approval.ApproverID = approverID
        approval.Status = "approved"
        approval.Comment = comment
        approval.ApprovedAt = &now
        
        if err := tx.Save(&approval).Error; err != nil {
            return err
        }
        
        // 4. 次の承認段階チェック
        var expense model.Expense
        if err := tx.First(&expense, expenseID).Error; err != nil {
            return err
        }
        
        if expense.Amount >= 50000 && approval.ApprovalType == "manager" {
            // 役員承認が必要
            executiveApproval := &model.ExpenseApproval{
                ExpenseID:    expenseID,
                ApprovalType: "executive",
                ApprovalOrder: 2,
                Status:       "pending",
            }
            if err := tx.Create(executiveApproval).Error; err != nil {
                return err
            }
        } else {
            // 承認完了
            expense.Status = model.ExpenseStatusApproved
            expense.ApproverID = &approverID
            expense.ApprovedAt = &now
            if err := tx.Save(&expense).Error; err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

## 6. フロントエンド実装詳細

### 6.1 コンポーネント構成

```
src/
├── app/(authenticated)/(engineer)/expenses/
│   ├── page.tsx                    # 経費申請一覧
│   ├── new/page.tsx               # 新規作成
│   ├── [id]/page.tsx              # 詳細表示
│   └── [id]/edit/page.tsx         # 編集
├── components/features/expense/
│   ├── ExpenseForm.tsx            # 申請フォーム
│   ├── ExpenseList.tsx            # 一覧表示
│   ├── ExpenseDetail.tsx          # 詳細表示
│   ├── ExpenseSummary.tsx         # 集計表示
│   ├── ReceiptUploader.tsx        # 領収書アップロード
│   └── ExpenseFilters.tsx         # 検索フィルター
├── hooks/expense/
│   ├── useExpenses.ts             # 一覧取得
│   ├── useExpenseDetail.ts        # 詳細取得
│   ├── useExpenseSubmit.ts        # 申請処理
│   └── useReceiptUpload.ts        # ファイルアップロード
└── lib/api/expense.ts             # API通信
```

### 6.2 主要コンポーネント実装

#### 6.2.1 ExpenseForm（申請フォーム）
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCategories } from '@/hooks/expense/useCategories';
import { useExpenseSubmit } from '@/hooks/expense/useExpenseSubmit';
import { ReceiptUploader } from './ReceiptUploader';

const expenseSchema = z.object({
  title: z.string().min(1, '件名を入力してください'),
  category: z.string().min(1, 'カテゴリを選択してください'),
  amount: z.number()
    .min(1, '金額は1円以上で入力してください')
    .max(10000000, '金額は1000万円以下で入力してください'),
  expenseDate: z.date(),
  description: z.string().min(10, '使用理由は10文字以上で入力してください'),
  otherDetails: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export const ExpenseForm: React.FC = () => {
  const { data: categories } = useCategories();
  const { submitExpense, isSubmitting } = useExpenseSubmit();
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date(),
    },
  });
  
  const selectedCategory = form.watch('category');
  const requiresDetails = categories?.find(c => c.code === selectedCategory)?.requiresDetails;
  
  const handleSubmit = async (data: ExpenseFormData) => {
    if (!receiptKey) {
      toast.error('領収書をアップロードしてください');
      return;
    }
    
    await submitExpense({
      ...data,
      receiptKey,
    });
  };
  
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Stack spacing={3}>
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="件名"
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          
          <Controller
            name="category"
            control={form.control}
            render={({ field }) => (
              <FormControl required error={!!form.formState.errors.category}>
                <InputLabel>カテゴリ</InputLabel>
                <Select {...field} label="カテゴリ">
                  {categories?.map(cat => (
                    <MenuItem key={cat.id} value={cat.code}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {form.formState.errors.category?.message}
                </FormHelperText>
              </FormControl>
            )}
          />
          
          {requiresDetails && (
            <Controller
              name="otherDetails"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="詳細"
                  multiline
                  rows={2}
                  required
                  placeholder="その他の詳細を入力してください"
                />
              )}
            />
          )}
          
          <ReceiptUploader
            onUploadComplete={setReceiptKey}
            maxSize={5 * 1024 * 1024}
          />
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => router.back()}>
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !receiptKey}
            >
              {isSubmitting ? <CircularProgress size={24} /> : '申請する'}
            </Button>
          </Box>
        </Stack>
      </form>
    </FormProvider>
  );
};
```

#### 6.2.2 ReceiptUploader（領収書アップロード）
```tsx
interface ReceiptUploaderProps {
  onUploadComplete: (key: string) => void;
  maxSize: number;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  onUploadComplete,
  maxSize,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showError } = useToast();
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    // ファイルサイズチェック
    if (selectedFile.size > maxSize) {
      showError('ファイルサイズは5MB以下にしてください');
      return;
    }
    
    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      showError('対応形式: JPEG, PNG, PDF');
      return;
    }
    
    setFile(selectedFile);
    uploadFile(selectedFile);
  };
  
  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    
    try {
      // 1. Pre-signed URL取得
      const { data } = await api.post('/expenses/receipts/upload-url', {
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      });
      
      // 2. S3へ直接アップロード
      await axios.put(data.upload_url, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(progress);
        },
      });
      
      // 3. アップロード完了を通知
      onUploadComplete(data.key);
      toast.success('領収書をアップロードしました');
    } catch (error) {
      showError('アップロードに失敗しました');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };
  
  const handleRetry = () => {
    if (file) {
      uploadFile(file);
    }
  };
  
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        領収書 *
      </Typography>
      
      {!file ? (
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUploadIcon />}
          fullWidth
          sx={{ py: 2 }}
        >
          ファイルを選択
          <input
            type="file"
            hidden
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={handleFileSelect}
          />
        </Button>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsertDriveFileIcon />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {file.name}
              </Typography>
              {!uploading && (
                <IconButton size="small" onClick={() => setFile(null)}>
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
            
            {uploading && (
              <Box>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary">
                  アップロード中... {progress}%
                </Typography>
              </Box>
            )}
            
            {!uploading && progress === 0 && (
              <Button
                size="small"
                onClick={handleRetry}
                startIcon={<RefreshIcon />}
              >
                再試行
              </Button>
            )}
          </Stack>
        </Paper>
      )}
      
      <FormHelperText>
        対応形式: JPEG, PNG, PDF（最大5MB）
      </FormHelperText>
    </Box>
  );
};
```

### 6.3 API通信層

```typescript
// lib/api/expense.ts
export const expenseApi = {
  // 一覧取得
  getList: async (params: ExpenseListParams) => {
    const { data } = await apiClient.get('/expenses', { params });
    return convertSnakeToCamel<ExpenseListResponse>(data);
  },
  
  // 作成
  create: async (payload: CreateExpenseRequest) => {
    const { data } = await apiClient.post('/expenses', 
      convertCamelToSnake(payload)
    );
    return convertSnakeToCamel<Expense>(data);
  },
  
  // Pre-signed URL取得
  getUploadUrl: async (payload: UploadUrlRequest) => {
    const { data } = await apiClient.post('/expenses/receipts/upload-url',
      convertCamelToSnake(payload)
    );
    return convertSnakeToCamel<UploadUrlResponse>(data);
  },
  
  // 提出
  submit: async (id: string) => {
    const { data } = await apiClient.post(`/expenses/${id}/submit`);
    return convertSnakeToCamel<Expense>(data);
  },
};
```

### 6.4 React Queryフック

```typescript
// hooks/expense/useExpenses.ts
export const useExpenses = (params: ExpenseListParams) => {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expenseApi.getList(params),
    staleTime: 5 * 60 * 1000, // 5分
  });
};

// hooks/expense/useExpenseSubmit.ts
export const useExpenseSubmit = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async (data: CreateExpenseRequest) => {
      // 1. 経費申請作成
      const expense = await expenseApi.create(data);
      
      // 2. 領収書関連付け
      if (data.receiptKey) {
        await expenseApi.completeUpload(expense.id, data.receiptKey);
      }
      
      // 3. 提出
      return expenseApi.submit(expense.id);
    },
    onSuccess: () => {
      showSuccess('経費申請を提出しました');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      router.push('/expenses');
    },
  });
};
```

## 7. キャッシュ戦略

### 7.1 Redis実装

```go
// キャッシュキー定義
const (
    CacheKeyCategories = "expense:categories"
    CacheKeyLimits     = "expense:limits:%s" // %s = monthly/yearly
    CacheTTLCategories = 24 * time.Hour
    CacheTTLLimits     = 24 * time.Hour
)

// カテゴリキャッシュ
func (s *expenseService) GetCategories(ctx context.Context) ([]*model.ExpenseCategory, error) {
    // キャッシュから取得
    var categories []*model.ExpenseCategory
    if err := s.cache.Get(ctx, CacheKeyCategories, &categories); err == nil {
        return categories, nil
    }
    
    // DBから取得
    categories, err := s.categoryRepo.GetActiveCategories(ctx)
    if err != nil {
        return nil, err
    }
    
    // キャッシュに保存
    _ = s.cache.Set(ctx, CacheKeyCategories, categories, CacheTTLCategories)
    
    return categories, nil
}

// キャッシュクリア（管理画面での更新時）
func (s *expenseService) InvalidateCache(ctx context.Context, keys ...string) error {
    for _, key := range keys {
        if err := s.cache.Delete(ctx, key); err != nil {
            s.logger.Warn("キャッシュ削除エラー", zap.String("key", key), zap.Error(err))
        }
    }
    return nil
}
```

## 8. セキュリティ実装

### 8.1 アクセス制御

```go
// ミドルウェア
func ExpenseAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("userID")
        if !exists {
            c.JSON(401, gin.H{"error": "認証が必要です"})
            c.Abort()
            return
        }
        
        // エンジニア権限チェック
        user, _ := c.Get("user")
        if u, ok := user.(*model.User); ok {
            if u.Role != model.RoleEngineer && u.Role != model.RoleAdmin {
                c.JSON(403, gin.H{"error": "権限がありません"})
                c.Abort()
                return
            }
        }
        
        c.Next()
    }
}
```

### 8.2 ファイルアップロードセキュリティ

```go
// S3バケットポリシー
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"AWS": "arn:aws:iam::ACCOUNT:role/expense-upload"},
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::expense-receipts/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-content-type": [
                        "image/jpeg",
                        "image/png",
                        "application/pdf"
                    ]
                },
                "NumericLessThanEquals": {
                    "s3:content-length": 5242880
                }
            }
        }
    ]
}
```

## 9. 監視・ログ

### 9.1 ログ出力

```go
// 申請提出時のログ
s.logger.Info("経費申請提出",
    zap.String("expense_id", expense.ID.String()),
    zap.String("user_id", userID.String()),
    zap.Int("amount", expense.Amount),
    zap.String("category", expense.Category),
)

// エラーログ
s.logger.Error("経費申請エラー",
    zap.Error(err),
    zap.String("user_id", userID.String()),
    zap.Any("request", req),
)
```

### 9.2 メトリクス

```go
// Prometheusメトリクス
var (
    expenseSubmitTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "expense_submit_total",
            Help: "Total number of expense submissions",
        },
        []string{"status", "category"},
    )
    
    expenseAmountHistogram = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "expense_amount",
            Help: "Expense amount distribution",
            Buckets: []float64{1000, 5000, 10000, 50000, 100000, 500000},
        },
        []string{"category"},
    )
)
```

## 10. テスト実装

### 10.1 バックエンドテスト

```go
// service_test.go
func TestExpenseService_SubmitExpense(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    
    mockRepo := mocks.NewMockExpenseRepository(ctrl)
    mockNotification := mocks.NewMockNotificationService(ctrl)
    
    service := NewExpenseService(mockRepo, mockNotification, logger)
    
    t.Run("正常系：申請提出成功", func(t *testing.T) {
        expense := &model.Expense{
            ID:         uuid.New(),
            UserID:     uuid.New(),
            Status:     model.ExpenseStatusDraft,
            Amount:     10000,
            ReceiptURL: "receipts/test.jpg",
        }
        
        mockRepo.EXPECT().GetByID(gomock.Any(), expense.ID).Return(expense, nil)
        mockRepo.EXPECT().Update(gomock.Any(), gomock.Any()).Return(nil)
        mockNotification.EXPECT().Create(gomock.Any(), gomock.Any()).Return(nil)
        
        err := service.SubmitExpense(context.Background(), expense.ID, expense.UserID)
        assert.NoError(t, err)
    })
    
    t.Run("異常系：領収書未アップロード", func(t *testing.T) {
        expense := &model.Expense{
            ID:         uuid.New(),
            UserID:     uuid.New(),
            Status:     model.ExpenseStatusDraft,
            ReceiptURL: "",
        }
        
        mockRepo.EXPECT().GetByID(gomock.Any(), expense.ID).Return(expense, nil)
        
        err := service.SubmitExpense(context.Background(), expense.ID, expense.UserID)
        assert.Error(t, err)
        assert.Equal(t, ErrReceiptRequired, err)
    })
}
```

### 10.2 フロントエンドテスト

```tsx
// ExpenseForm.test.tsx
describe('ExpenseForm', () => {
  it('必須項目が未入力の場合エラーが表示される', async () => {
    render(<ExpenseForm />);
    
    const submitButton = screen.getByText('申請する');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('件名を入力してください')).toBeInTheDocument();
      expect(screen.getByText('カテゴリを選択してください')).toBeInTheDocument();
    });
  });
  
  it('領収書アップロード後に申請可能になる', async () => {
    const mockFile = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    
    render(<ExpenseForm />);
    
    const fileInput = screen.getByLabelText('ファイルを選択');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    
    await waitFor(() => {
      const submitButton = screen.getByText('申請する');
      expect(submitButton).not.toBeDisabled();
    });
  });
});
```

## 11. マイグレーション計画

### 11.1 マイグレーションファイル

```sql
-- 000011_add_expense_tables.up.sql
-- 承認履歴テーブル
CREATE TABLE expense_approvals (...);

-- カテゴリマスタ
CREATE TABLE expense_categories (...);
INSERT INTO expense_categories ...;

-- 申請上限
CREATE TABLE expense_limits (...);
INSERT INTO expense_limits (limit_type, amount, created_by) VALUES
('monthly', 500000, (SELECT id FROM users WHERE email = 'admin@duesk.co.jp')),
('yearly', 2000000, (SELECT id FROM users WHERE email = 'admin@duesk.co.jp'));

-- 集計テーブル
CREATE TABLE expense_summaries (...);

-- インデックス追加
CREATE INDEX idx_expenses_user_status ON expenses(user_id, status);
```

### 11.2 ロールバック

```sql
-- 000011_add_expense_tables.down.sql
DROP TABLE IF EXISTS expense_summaries;
DROP TABLE IF EXISTS expense_limits;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS expense_approvals;
DROP INDEX IF EXISTS idx_expenses_user_status ON expenses;
```

---

作成日: 2025-06-29
バージョン: 1.0