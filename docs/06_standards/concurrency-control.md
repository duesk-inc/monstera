# 並行処理・排他制御

このドキュメントは、Monsteraプロジェクトにおける並行処理と排他制御の実装パターンを定義します。

## 更新履歴
- 2025-01-10: CLAUDE.mdから分離して作成

## 楽観的ロック実装

### モデル定義
```go
type WeeklyReport struct {
    ID        string    `gorm:"type:uuid;primary_key"`
    Version   int       `gorm:"not null;default:0"`
    UpdatedAt time.Time
    // ...
}
```

### 更新処理
```go
func (r *Repository) UpdateWithLock(ctx context.Context, report *WeeklyReport) error {
    result := r.db.Model(report).
        Where("id = ? AND version = ?", report.ID, report.Version).
        Updates(map[string]interface{}{
            "status":    report.Status,
            "version":   report.Version + 1,
            "updated_at": time.Now(),
        })
    
    if result.RowsAffected == 0 {
        return ErrConcurrentUpdate
    }
    
    return result.Error
}
```

### 使用例
```go
const maxRetries = 3
for i := 0; i < maxRetries; i++ {
    report, err := repo.FindByID(id)
    if err != nil {
        return err
    }
    
    report.Status = "submitted"
    err = repo.UpdateWithLock(ctx, report)
    if err == nil {
        return nil
    }
    
    if !errors.Is(err, ErrConcurrentUpdate) {
        return err
    }
    
    // 競合時は少し待ってリトライ
    time.Sleep(time.Millisecond * 100 * time.Duration(i+1))
}
return ErrMaxRetriesExceeded
```

## Goroutine管理

### WorkerPool実装
```go
// internal/worker/pool.go
import "golang.org/x/sync/semaphore"

type WorkerPool struct {
    sem *semaphore.Weighted
}

func NewWorkerPool(maxWorkers int64) *WorkerPool {
    return &WorkerPool{
        sem: semaphore.NewWeighted(maxWorkers), // 最大20
    }
}

func (p *WorkerPool) Execute(ctx context.Context, fn func() error) error {
    if err := p.sem.Acquire(ctx, 1); err != nil {
        return err
    }
    defer p.sem.Release(1)
    
    return fn()
}
```

### 使用例（バッチ処理）
```go
pool := NewWorkerPool(20)
for _, task := range tasks {
    task := task // capture
    
    go func() {
        err := pool.Execute(ctx, func() error {
            return processTask(task)
        })
        if err != nil {
            logger.Error("task failed", zap.Error(err))
        }
    }()
}
```

## 排他制御パターン

### 1. データベースレベルのロック

#### 悲観的ロック（FOR UPDATE）
```go
// トランザクション内で排他ロック
tx := db.Begin()
var report WeeklyReport
if err := tx.Set("gorm:query_option", "FOR UPDATE").
    Where("id = ?", id).
    First(&report).Error; err != nil {
    tx.Rollback()
    return err
}

// 更新処理
report.Status = "approved"
if err := tx.Save(&report).Error; err != nil {
    tx.Rollback()
    return err
}

return tx.Commit().Error
```

#### SKIP LOCKED（ジョブキュー用）
```go
// 処理待ちジョブを取得（他のワーカーと競合しない）
var job Job
err := db.Raw(`
    SELECT * FROM jobs 
    WHERE status = 'pending' 
    AND scheduled_at <= NOW()
    ORDER BY scheduled_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
`).Scan(&job).Error
```

### 2. アプリケーションレベルのロック

#### 分散ロック（Redis使用時）
```go
// Redis を使った分散ロック
type DistributedLock struct {
    redis *redis.Client
    key   string
    value string
    ttl   time.Duration
}

func (l *DistributedLock) Acquire(ctx context.Context) (bool, error) {
    return l.redis.SetNX(ctx, l.key, l.value, l.ttl).Result()
}

func (l *DistributedLock) Release(ctx context.Context) error {
    // Lua スクリプトで安全に削除
    script := `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `
    return l.redis.Eval(ctx, script, []string{l.key}, l.value).Err()
}
```

### 3. 同期プリミティブ

#### sync.Mutex（単一プロセス内）
```go
type Cache struct {
    mu    sync.RWMutex
    items map[string]interface{}
}

func (c *Cache) Get(key string) (interface{}, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    
    item, found := c.items[key]
    return item, found
}

func (c *Cache) Set(key string, value interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    c.items[key] = value
}
```

## 並行処理のベストプラクティス

### 1. Context を使ったキャンセレーション
```go
func processWithTimeout(ctx context.Context, timeout time.Duration) error {
    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()
    
    done := make(chan error, 1)
    go func() {
        done <- doWork(ctx)
    }()
    
    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

### 2. エラーグループ
```go
import "golang.org/x/sync/errgroup"

func processMultiple(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    
    for _, item := range items {
        item := item // capture
        g.Go(func() error {
            return processItem(ctx, item)
        })
    }
    
    return g.Wait()
}
```

### 3. チャネルを使った Producer-Consumer パターン
```go
func pipeline(ctx context.Context) {
    // Producer
    jobs := make(chan Job, 100)
    go func() {
        defer close(jobs)
        for {
            job, err := fetchJob(ctx)
            if err != nil {
                return
            }
            select {
            case jobs <- job:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // Consumers
    var wg sync.WaitGroup
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                processJob(ctx, job)
            }
        }()
    }
    
    wg.Wait()
}
```

## 注意事項

1. **デッドロックの回避**
   - ロックの取得順序を統一する
   - タイムアウトを設定する
   - 必要最小限の範囲でロックする

2. **パフォーマンス考慮**
   - 読み取り専用の場合は RWMutex を使用
   - ロックの粒度を適切に設計
   - 長時間のロックは避ける

3. **エラーハンドリング**
   - goroutine 内のエラーを適切に処理
   - パニックからの回復
   - リソースのクリーンアップ

## 関連ドキュメント
- [バッチ・非同期処理](.cursor/rules/batch-processing.md)
- [パフォーマンス最適化](.cursor/rules/performance-optimization.md)