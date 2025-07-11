# 実装パターンとベストプラクティス

このドキュメントはMonsteraプロジェクトで使用される実装パターンとベストプラクティスを記録します。

## 更新履歴
- 2025-01-09: 初版作成

## バックエンド実装パターン

### 1. エラーハンドリングパターン

#### ビジネスエラーの定義
```go
// internal/errors/errors.go
type BusinessError struct {
    Code    string                 `json:"code"`
    Message string                 `json:"message"`
    Details map[string]interface{} `json:"details,omitempty"`
}

// 使用例
var ErrWeeklyReportAlreadySubmitted = BusinessError{
    Code:    "BIZ_WEEKLY_001",
    Message: "週報は既に提出済みです",
}
```

### 2. リポジトリパターン

#### 基本的な構造
```go
type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
    return &Repository{db: db}
}

// トランザクション対応
func (r *Repository) WithTx(tx *gorm.DB) *Repository {
    return &Repository{db: tx}
}
```

### 3. サービス層でのトランザクション管理
```go
func (s *Service) CreateWithTransaction(ctx context.Context, input CreateInput) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // リポジトリをトランザクション対応に
        repo := s.repo.WithTx(tx)
        
        // ビジネスロジック実行
        if err := repo.Create(ctx, model); err != nil {
            return err
        }
        
        // 監査ログ記録
        if err := s.auditRepo.WithTx(tx).Log(ctx, action); err != nil {
            return err
        }
        
        return nil
    })
}
```

## フロントエンド実装パターン

### 1. API呼び出しパターン

#### 基本的な構造
```typescript
// lib/api/client.ts
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.code, error.message);
    }

    return await response.json();
  } catch (error) {
    // エラーハンドリング
    throw error;
  }
}
```

### 2. カスタムフックパターン

#### データ取得フック
```typescript
export function useWeeklyReports() {
  const [data, setData] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiCall<WeeklyReport[]>('/weekly-reports');
        setData(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
```

### 3. フォームバリデーションパターン

#### Yupを使用したスキーマ定義
```typescript
const weeklyReportSchema = yup.object({
  title: yup.string()
    .required('タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  startDate: yup.date()
    .required('開始日は必須です'),
  endDate: yup.date()
    .required('終了日は必須です')
    .min(yup.ref('startDate'), '終了日は開始日より後の日付を指定してください'),
});
```

## 共通パターン

### 1. ページネーション

#### バックエンド
```go
type PaginationParams struct {
    Page     int `form:"page" binding:"min=1"`
    PageSize int `form:"pageSize" binding:"min=1,max=100"`
}

func (p *PaginationParams) GetOffset() int {
    return (p.Page - 1) * p.PageSize
}
```

#### フロントエンド
```typescript
interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number) => void;
}
```

### 2. 楽観的ロック実装
```go
// モデル
type Model struct {
    ID        string    `gorm:"type:uuid;primary_key"`
    Version   int       `gorm:"not null;default:0"`
    UpdatedAt time.Time
}

// 更新処理
result := db.Model(&model).
    Where("id = ? AND version = ?", id, version).
    Updates(map[string]interface{}{
        "field": newValue,
        "version": version + 1,
    })

if result.RowsAffected == 0 {
    return ErrConcurrentUpdate
}
```

## テストパターン

### 1. テーブル駆動テスト（Go）
```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid email", "test@duesk.co.jp", false},
        {"invalid email", "invalid", true},
        {"empty email", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### 2. React Testing Library パターン
```typescript
describe('WeeklyReportForm', () => {
  it('should display validation errors', async () => {
    render(<WeeklyReportForm />);
    
    const submitButton = screen.getByRole('button', { name: '提出' });
    await userEvent.click(submitButton);
    
    expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
  });
});
```

## パフォーマンス最適化パターン

### 1. N+1問題の回避（GORM）
```go
// Preloadを使用
var users []User
db.Preload("Profile").
   Preload("Department").
   Find(&users)
```

### 2. React.memoを使用した再レンダリング最適化
```typescript
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // 重い計算処理
  const processedData = useMemo(() => {
    return heavyProcessing(data);
  }, [data]);

  return <div>{processedData}</div>;
});
```

## セキュリティパターン

### 1. 入力サニタイゼーション
```go
// SQLインジェクション対策
db.Where("user_id = ? AND status = ?", userID, status).Find(&reports)

// XSS対策（フロントエンド）
const sanitizedHtml = DOMPurify.sanitize(userInput);
```

### 2. 認証ミドルウェアパターン
```go
func AuthMiddleware(publicEndpoints []string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 公開エンドポイントはスキップ
        for _, endpoint := range publicEndpoints {
            if c.Request.URL.Path == endpoint {
                c.Next()
                return
            }
        }
        
        // トークン検証
        token, err := c.Cookie("access_token")
        if err != nil {
            c.JSON(401, gin.H{"error": "認証が必要です"})
            c.Abort()
            return
        }
        
        // トークン検証ロジック...
        c.Next()
    }
}
```

---

*このドキュメントは開発中に発見された効果的なパターンを随時追加していきます。*