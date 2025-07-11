# パフォーマンス最適化規則

このドキュメントはMonsteraプロジェクトのパフォーマンス最適化に関する規則とベストプラクティスを記載します。

## 更新履歴
- 2025-01-09: CLAUDE.mdから分離して作成

## パフォーマンス閾値

### システム設定値
```go
// config/performance.go
const (
    // データベース
    MaxDBConnections     = 30
    MaxIdleConnections   = 10
    ConnectionMaxLifetime = time.Hour
    
    // タイムアウト
    QueryTimeout         = 3 * time.Second
    QueryTimeoutBatch    = 30 * time.Second
    HTTPReadTimeout      = 30 * time.Second
    HTTPWriteTimeout     = 30 * time.Second
    
    // リソース制限
    MaxMemoryPerContainer = 1 * 1024 * 1024 * 1024 // 1GB
    MaxFileUploadSize     = 1 * 1024 * 1024        // 1MB
    
    // ページネーション
    DefaultPageSize      = 20
    MaxPageSize          = 100
)
```

### パフォーマンス目標
- API レスポンスタイム: 95%tile < 500ms
- データベースクエリ: 95%tile < 100ms
- ページロード時間: 3秒以内
- 同時接続数: 初期50、将来500

## N+1問題の回避

### 問題のあるコード
```go
// ❌ 悪い例
users, _ := userRepo.FindAll()
for _, user := range users {
    profile, _ := profileRepo.FindByUserID(user.ID) // N+1
}
```

### 解決方法1: Preload使用
```go
// ✅ 良い例（Preload使用）
var users []User
db.Preload("Profile").
   Preload("Department").
   Preload("WeeklyReports", "status = ?", "submitted").
   Find(&users)
```

### 解決方法2: カスタムJOIN
```go
// ✅ カスタムJOIN
var results []struct {
    User
    ProfileName string `gorm:"column:profile_name"`
    DepartmentName string `gorm:"column:department_name"`
}

db.Table("users").
   Select("users.*, profiles.name as profile_name, departments.name as department_name").
   Joins("LEFT JOIN profiles ON profiles.user_id = users.id").
   Joins("LEFT JOIN departments ON users.department_id = departments.id").
   Where("users.deleted_at IS NULL").
   Scan(&results)
```

### 解決方法3: バッチローディング
```go
// ユーザーIDのリストから関連データを一括取得
userIDs := []string{"id1", "id2", "id3"}

var profiles []Profile
db.Where("user_id IN ?", userIDs).Find(&profiles)

// メモリ上でマッピング
profileMap := make(map[string]*Profile)
for i := range profiles {
    profileMap[profiles[i].UserID] = &profiles[i]
}
```

## インデックス設計

### 必須インデックス
```sql
-- 1. 外部キー
CREATE INDEX idx_weekly_reports_user_id ON weekly_reports(user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_approved_by ON expenses(approved_by);

-- 2. ステータス + 論理削除
CREATE INDEX idx_weekly_reports_status_deleted 
ON weekly_reports(status) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_status_deleted
ON expenses(status)
WHERE deleted_at IS NULL;

-- 3. ソート用
CREATE INDEX idx_weekly_reports_created_at ON weekly_reports(created_at DESC);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);

-- 4. 複合検索
CREATE INDEX idx_weekly_reports_user_status_date 
ON weekly_reports(user_id, status, created_at) 
WHERE deleted_at IS NULL;

-- 5. 部分インデックス（特定ステータスのみ）
CREATE INDEX idx_weekly_reports_pending 
ON weekly_reports(created_at) 
WHERE status = 'submitted' AND deleted_at IS NULL;

-- 6. テキスト検索用
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
```

### インデックス使用状況の確認
```sql
-- インデックス使用統計
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- クエリ実行計画の確認
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM weekly_reports 
WHERE user_id = 'xxx' AND status = 'submitted'
ORDER BY created_at DESC;
```

## クエリ最適化

### バッチ処理
```go
// バッチ処理での効率的な更新
func BatchUpdateStatus(ids []string, status string) error {
    // 1000件ずつ処理
    batchSize := 1000
    for i := 0; i < len(ids); i += batchSize {
        end := i + batchSize
        if end > len(ids) {
            end = len(ids)
        }
        
        batch := ids[i:end]
        err := db.Model(&WeeklyReport{}).
            Where("id IN ?", batch).
            Update("status", status).Error
        
        if err != nil {
            return err
        }
    }
    return nil
}
```

### 効率的なカウント
```go
// ❌ 悪い例
var reports []WeeklyReport
db.Find(&reports)
count := len(reports)

// ✅ 良い例
var count int64
db.Model(&WeeklyReport{}).
   Where("status = ?", "submitted").
   Count(&count)
```

### ページネーション最適化
```go
// OFFSET/LIMIT（小〜中規模データ）
func GetReportsPaginated(page, pageSize int) ([]WeeklyReport, error) {
    var reports []WeeklyReport
    offset := (page - 1) * pageSize
    
    err := db.Where("deleted_at IS NULL").
        Order("created_at DESC").
        Offset(offset).
        Limit(pageSize).
        Find(&reports).Error
        
    return reports, err
}

// カーソルベース（大規模データ）
func GetReportsCursor(cursor string, limit int) ([]WeeklyReport, error) {
    var reports []WeeklyReport
    query := db.Where("deleted_at IS NULL")
    
    if cursor != "" {
        query = query.Where("created_at < ?", cursor)
    }
    
    err := query.Order("created_at DESC").
        Limit(limit).
        Find(&reports).Error
        
    return reports, err
}
```

## キャッシュ戦略

### Redisキャッシュ
```go
// キャッシュキー設計
func getCacheKey(prefix string, id string) string {
    return fmt.Sprintf("%s:%s", prefix, id)
}

// キャッシュ付き取得
func GetUserWithCache(ctx context.Context, userID string) (*User, error) {
    cacheKey := getCacheKey("user", userID)
    
    // キャッシュチェック
    cached, err := redis.Get(ctx, cacheKey).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // DBから取得
    user, err := userRepo.FindByID(userID)
    if err != nil {
        return nil, err
    }
    
    // キャッシュ保存（TTL: 1時間）
    data, _ := json.Marshal(user)
    redis.Set(ctx, cacheKey, data, time.Hour)
    
    return user, nil
}
```

### キャッシュ無効化
```go
// 更新時のキャッシュクリア
func UpdateUser(ctx context.Context, user *User) error {
    err := userRepo.Update(user)
    if err != nil {
        return err
    }
    
    // キャッシュクリア
    cacheKey := getCacheKey("user", user.ID)
    redis.Del(ctx, cacheKey)
    
    return nil
}
```

## フロントエンド最適化

### コンポーネントの最適化
```typescript
// React.memoでの再レンダリング防止
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // 重い計算処理をメモ化
  const processedData = useMemo(() => {
    return heavyProcessing(data);
  }, [data]);

  return <div>{processedData}</div>;
});

// useCallbackでの関数メモ化
const handleClick = useCallback((id: string) => {
  // 処理
}, [dependency]);
```

### 遅延ローディング
```typescript
// 動的インポート
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Suspenseで囲む
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 画像最適化
```typescript
import Image from 'next/image';

// Next.js Image コンポーネント使用
<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

## モニタリングと計測

### パフォーマンスメトリクス
```go
// Prometheusメトリクス
var (
    httpDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests.",
        },
        []string{"path", "method"},
    )
    
    dbQueryDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "db_query_duration_seconds",
            Help: "Duration of database queries.",
        },
        []string{"query_type"},
    )
)
```

### スロークエリ検出
```sql
-- スロークエリログ有効化
ALTER SYSTEM SET log_min_duration_statement = 100; -- 100ms以上

-- 実行中のクエリ確認
SELECT pid, now() - query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;
```

## パフォーマンスチューニングチェックリスト

### データベース
- [ ] 適切なインデックスが作成されているか
- [ ] N+1問題が解決されているか
- [ ] 不要なデータを取得していないか（SELECT *を避ける）
- [ ] 適切なコネクションプール設定か
- [ ] バッチ処理が最適化されているか

### アプリケーション
- [ ] キャッシュが適切に実装されているか
- [ ] 非同期処理が活用されているか
- [ ] メモリリークがないか
- [ ] 適切なタイムアウト設定か

### フロントエンド
- [ ] バンドルサイズが最適化されているか
- [ ] 画像が最適化されているか
- [ ] 不要な再レンダリングが防げているか
- [ ] 遅延ローディングが実装されているか

---

*このドキュメントはパフォーマンス改善の知見が得られた際に更新してください。*