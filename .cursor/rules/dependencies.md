# 依存関係とAPI使用例

このドキュメントはMonsteraプロジェクトで使用する外部ライブラリとAPIの使用方法を記録します。

## 更新履歴
- 2025-01-09: 初版作成

## バックエンド依存関係

### Gin (Webフレームワーク)
```go
// go.mod
require github.com/gin-gonic/gin v1.9.1

// 基本的な使用例
router := gin.Default()
router.Use(middleware.Logger())
router.Use(middleware.Auth())

// ルーティング
v1 := router.Group("/api/v1")
{
    v1.GET("/weekly-reports", handler.ListWeeklyReports)
    v1.POST("/weekly-reports", handler.CreateWeeklyReport)
}
```

### GORM (ORM)
```go
// go.mod
require gorm.io/gorm v1.25.5
require gorm.io/driver/postgres v1.5.3

// データベース接続
dsn := "host=localhost user=postgres password=postgres dbname=monstera port=5432 sslmode=disable"
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
    Logger: logger.Default.LogMode(logger.Info),
})

// マイグレーション
db.AutoMigrate(&User{}, &WeeklyReport{})

// クエリ例
var reports []WeeklyReport
db.Where("user_id = ? AND status = ?", userID, "submitted").
   Order("created_at DESC").
   Limit(20).
   Find(&reports)
```

### golang-migrate (マイグレーション)
```bash
# インストール
go install -github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# マイグレーション実行
migrate -path migrations -database "postgres://..." up

# ロールバック
migrate -path migrations -database "postgres://..." down 1
```

### Zap (ロギング)
```go
// go.mod
require go.uber.org/zap v1.26.0

// 初期化
logger, _ := zap.NewProduction()
defer logger.Sync()

// 使用例
logger.Info("server started",
    zap.String("port", "8080"),
    zap.String("env", "development"),
)

logger.Error("failed to process request",
    zap.Error(err),
    zap.String("user_id", userID),
)
```

### JWT-Go (認証)
```go
// go.mod
require github.com/golang-jwt/jwt/v5 v5.0.0

// トークン生成
claims := jwt.MapClaims{
    "user_id": userID,
    "email":   email,
    "exp":     time.Now().Add(time.Hour * 24).Unix(),
}

token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
tokenString, err := token.SignedString([]byte(secretKey))

// トークン検証
token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
    return []byte(secretKey), nil
})

if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
    userID := claims["user_id"].(string)
}
```

### AWS SDK (S3, Cognito)
```go
// go.mod
require github.com/aws/aws-sdk-go v1.45.0

// S3使用例
sess := session.Must(session.NewSession(&aws.Config{
    Region: aws.String("ap-northeast-1"),
}))

svc := s3.New(sess)
_, err := svc.PutObject(&s3.PutObjectInput{
    Bucket: aws.String("monstera-uploads"),
    Key:    aws.String("receipts/" + filename),
    Body:   file,
})

// Cognito使用例
cognitoClient := cognito.New(sess)
result, err := cognitoClient.AdminGetUser(&cognito.AdminGetUserInput{
    UserPoolId: aws.String(userPoolID),
    Username:   aws.String(username),
})
```

## フロントエンド依存関係

### Next.js
```json
// package.json
"dependencies": {
  "next": "14.0.0",
  "react": "18.2.0",
  "react-dom": "18.2.0"
}

// 基本的な使用例
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

// app/page.tsx
export default function Home() {
  return <h1>Welcome to Monstera</h1>
}
```

### React Hook Form
```typescript
// package.json
"dependencies": {
  "react-hook-form": "^7.45.0",
  "@hookform/resolvers": "^3.3.0"
}

// 使用例
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(schema),
  defaultValues: {
    title: '',
    content: '',
  }
});

const onSubmit = async (data: FormData) => {
  try {
    await apiCall('/weekly-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(error);
  }
};
```

### Yup (バリデーション)
```typescript
// package.json
"dependencies": {
  "yup": "^1.2.0"
}

// スキーマ定義
import * as yup from 'yup';

const weeklyReportSchema = yup.object({
  title: yup.string()
    .required('タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  startDate: yup.date()
    .required('開始日は必須です'),
  endDate: yup.date()
    .required('終了日は必須です')
    .min(yup.ref('startDate'), '終了日は開始日より後の日付を指定してください'),
  achievements: yup.array().of(
    yup.object({
      description: yup.string().required('成果内容は必須です'),
      progress: yup.number().min(0).max(100),
    })
  ),
});
```

### React Query (データフェッチング)
```typescript
// package.json
"dependencies": {
  "@tanstack/react-query": "^5.0.0"
}

// 使用例
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// データ取得
const { data, isLoading, error } = useQuery({
  queryKey: ['weeklyReports'],
  queryFn: () => apiCall<WeeklyReport[]>('/weekly-reports'),
});

// データ更新
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (data: CreateWeeklyReportDto) => 
    apiCall('/weekly-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
    toast.success('週報を作成しました');
  },
});
```

### Tailwind CSS
```json
// package.json
"devDependencies": {
  "tailwindcss": "^3.3.0",
  "autoprefixer": "^10.4.14",
  "postcss": "^8.4.24"
}

// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        secondary: '#f1f3f4',
      },
    },
  },
}

// 使用例
<button className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors">
  提出
</button>
```

### React Hot Toast (通知)
```typescript
// package.json
"dependencies": {
  "react-hot-toast": "^2.4.1"
}

// 使用例
import toast, { Toaster } from 'react-hot-toast';

// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}

// 通知表示
toast.success('保存しました');
toast.error('エラーが発生しました');
toast.loading('処理中...');
```

## 外部API

### AWS Cognito
```typescript
// 認証フロー
const authenticateUser = async (email: string, password: string) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('認証に失敗しました');
  }
  
  return response.json();
};
```

### Freee API
```go
// 会計連携
type FreeeClient struct {
    accessToken string
    baseURL     string
}

func (c *FreeeClient) CreateInvoice(invoice Invoice) error {
    url := fmt.Sprintf("%s/api/1/invoices", c.baseURL)
    
    body, _ := json.Marshal(map[string]interface{}{
        "company_id": invoice.CompanyID,
        "issue_date": invoice.IssueDate,
        "due_date":   invoice.DueDate,
        "amount":     invoice.Amount,
    })
    
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer " + c.accessToken)
    req.Header.Set("Content-Type", "application/json")
    
    // リクエスト実行...
}
```

## テスト用ライブラリ

### Go
```go
// gomock
//go:generate mockgen -source=repository.go -destination=mocks/mock_repository.go

// testify
import "github.com/stretchr/testify/assert"

func TestCreateUser(t *testing.T) {
    assert.NoError(t, err)
    assert.Equal(t, "test@duesk.co.jp", user.Email)
}
```

### JavaScript/TypeScript
```typescript
// Jest
"devDependencies": {
  "jest": "^29.5.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^5.16.5"
}

// MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v1/weekly-reports', (req, res, ctx) => {
    return res(ctx.json({ data: mockWeeklyReports }));
  })
);
```

## 開発ツール

### Air (Go ホットリロード)
```bash
# インストール
go install github.com/cosmtrek/air@latest

# air.toml
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/main ./cmd/server"
bin = "tmp/main"
```

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
    depends_on:
      - postgres
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

*このドキュメントは新しい依存関係を追加した際に更新してください。*