# バッチ・非同期処理

このドキュメントは、Monsteraプロジェクトにおけるバッチ処理と非同期処理の実装パターンを定義します。

## 更新履歴
- 2025-01-10: CLAUDE.mdから分離して作成

## ジョブキュー実装（DBベース）

### ジョブモデル定義
```go
// models/job.go
type Job struct {
    ID          string         `gorm:"type:uuid;primary_key"`
    Type        string         `gorm:"type:varchar(50);not null"`
    Payload     datatypes.JSON `gorm:"type:jsonb"`
    Status      string         `gorm:"type:varchar(20);not null"` // pending, processing, completed, failed
    Attempts    int            `gorm:"default:0"`
    MaxAttempts int            `gorm:"default:5"`
    ScheduledAt time.Time      `gorm:"not null"`
    StartedAt   *time.Time
    CompletedAt *time.Time
    Error       string         `gorm:"type:text"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

### ジョブ設定
```go
type JobConfig struct {
    MaxRetries    int
    RetryStrategy RetryStrategy
    Timeout       time.Duration
}

// リトライ戦略
type RetryStrategy struct {
    Type      string // "exponential" or "fixed"
    InitialDelay time.Duration
    MaxDelay     time.Duration
}

// デフォルト設定
var DefaultJobConfig = JobConfig{
    MaxRetries: 5,
    RetryStrategy: RetryStrategy{
        Type:         "exponential",
        InitialDelay: 1 * time.Second,
        MaxDelay:     16 * time.Second,
    },
    Timeout: 5 * time.Minute,
}
```

### リトライ間隔計算
```go
func calculateRetryDelay(attempt int, strategy RetryStrategy) time.Duration {
    if strategy.Type == "fixed" {
        return strategy.InitialDelay
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    delay := strategy.InitialDelay * time.Duration(1<<(attempt-1))
    if delay > strategy.MaxDelay {
        delay = strategy.MaxDelay
    }
    
    // Jitter追加（±10%）
    jitter := time.Duration(rand.Float64() * float64(delay) * 0.2)
    return delay + jitter - jitter/2
}
```

## ジョブワーカー実装

### WorkerPool構造
```go
type Worker struct {
    ID       int
    JobQueue chan Job
    Quit     chan bool
    Pool     *WorkerPool
}

type WorkerPool struct {
    Workers   []*Worker
    JobQueue  chan Job
    DB        *gorm.DB
    Processor JobProcessor
}

type JobProcessor interface {
    Process(ctx context.Context, job *Job) error
}
```

### ワーカーの実装
```go
func (w *Worker) Start() {
    go func() {
        for {
            select {
            case job := <-w.JobQueue:
                w.processJob(job)
            case <-w.Quit:
                return
            }
        }
    }()
}

func (w *Worker) processJob(job Job) {
    ctx, cancel := context.WithTimeout(context.Background(), DefaultJobConfig.Timeout)
    defer cancel()
    
    // ジョブを処理中に更新
    job.Status = "processing"
    job.StartedAt = ptr(time.Now())
    w.Pool.DB.Save(&job)
    
    // 実際の処理
    err := w.Pool.Processor.Process(ctx, &job)
    
    if err != nil {
        w.handleJobError(&job, err)
    } else {
        w.handleJobSuccess(&job)
    }
}

func (w *Worker) handleJobError(job *Job, err error) {
    job.Attempts++
    job.Error = err.Error()
    
    if job.Attempts >= job.MaxAttempts {
        job.Status = "failed"
        job.CompletedAt = ptr(time.Now())
    } else {
        // リトライをスケジュール
        delay := calculateRetryDelay(job.Attempts, DefaultJobConfig.RetryStrategy)
        job.Status = "pending"
        job.ScheduledAt = time.Now().Add(delay)
    }
    
    w.Pool.DB.Save(job)
}

func (w *Worker) handleJobSuccess(job *Job) {
    job.Status = "completed"
    job.CompletedAt = ptr(time.Now())
    job.Error = ""
    w.Pool.DB.Save(job)
}
```

### ジョブの取得（FOR UPDATE SKIP LOCKED）
```go
func (p *WorkerPool) FetchPendingJobs(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            var jobs []Job
            
            // 排他制御でジョブを取得
            err := p.DB.Raw(`
                SELECT * FROM jobs 
                WHERE status = 'pending' 
                AND scheduled_at <= NOW()
                ORDER BY scheduled_at
                LIMIT 10
                FOR UPDATE SKIP LOCKED
            `).Scan(&jobs).Error
            
            if err != nil {
                log.Printf("Error fetching jobs: %v", err)
                continue
            }
            
            for _, job := range jobs {
                p.JobQueue <- job
            }
        }
    }
}
```

## ジョブタイプ別の実装

### 週報リマインダー
```go
type WeeklyReportReminderJob struct{}

func (j *WeeklyReportReminderJob) Process(ctx context.Context, job *Job) error {
    var payload struct {
        UserID string `json:"user_id"`
        Week   string `json:"week"`
    }
    
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    
    // ユーザーの週報提出状況を確認
    var count int64
    db.Model(&WeeklyReport{}).
        Where("user_id = ? AND week = ?", payload.UserID, payload.Week).
        Count(&count)
    
    if count == 0 {
        // リマインダーメールを送信
        return sendReminderEmail(payload.UserID, payload.Week)
    }
    
    return nil
}
```

### バッチレポート生成
```go
type MonthlyReportGeneratorJob struct{}

func (j *MonthlyReportGeneratorJob) Process(ctx context.Context, job *Job) error {
    var payload struct {
        Month string `json:"month"` // "2024-01"
    }
    
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    
    // 月次レポートの生成
    report, err := generateMonthlyReport(ctx, payload.Month)
    if err != nil {
        return err
    }
    
    // S3にアップロード
    return uploadToS3(ctx, report)
}
```

### データクリーンアップ
```go
type DataCleanupJob struct{}

func (j *DataCleanupJob) Process(ctx context.Context, job *Job) error {
    var payload struct {
        DaysToKeep int `json:"days_to_keep"`
    }
    
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    
    cutoffDate := time.Now().AddDate(0, 0, -payload.DaysToKeep)
    
    // 古いログを削除
    return db.Where("created_at < ?", cutoffDate).Delete(&AuditLog{}).Error
}
```

## ジョブのスケジューリング

### 定期実行ジョブの登録
```go
func ScheduleRecurringJobs() {
    // 毎週月曜日に週報リマインダー
    cron.Schedule("0 9 * * MON", func() {
        users := getActiveUsers()
        for _, user := range users {
            CreateJob("weekly_report_reminder", map[string]interface{}{
                "user_id": user.ID,
                "week":    getCurrentWeek(),
            })
        }
    })
    
    // 毎月1日に月次レポート生成
    cron.Schedule("0 0 1 * *", func() {
        CreateJob("monthly_report_generator", map[string]interface{}{
            "month": time.Now().AddDate(0, -1, 0).Format("2006-01"),
        })
    })
    
    // 毎日深夜にデータクリーンアップ
    cron.Schedule("0 2 * * *", func() {
        CreateJob("data_cleanup", map[string]interface{}{
            "days_to_keep": 90,
        })
    })
}
```

### ジョブの作成
```go
func CreateJob(jobType string, payload interface{}) (*Job, error) {
    payloadJSON, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }
    
    job := &Job{
        ID:          uuid.New().String(),
        Type:        jobType,
        Payload:     payloadJSON,
        Status:      "pending",
        MaxAttempts: DefaultJobConfig.MaxRetries,
        ScheduledAt: time.Now(),
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
    
    return job, db.Create(job).Error
}
```

## 監視とメトリクス

### ジョブメトリクス
```go
var (
    jobProcessedCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "jobs_processed_total",
            Help: "Total number of processed jobs",
        },
        []string{"job_type", "status"},
    )
    
    jobDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "job_duration_seconds",
            Help: "Duration of job processing",
        },
        []string{"job_type"},
    )
)
```

### ジョブ状態の監視
```sql
-- 失敗ジョブの確認
SELECT type, COUNT(*) as failed_count
FROM jobs
WHERE status = 'failed'
AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY type;

-- 処理待ちジョブの確認
SELECT type, COUNT(*) as pending_count
FROM jobs
WHERE status = 'pending'
GROUP BY type
ORDER BY pending_count DESC;

-- 長時間実行ジョブの検出
SELECT id, type, started_at
FROM jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '1 hour';
```

## ベストプラクティス

1. **冪等性の確保**: ジョブは何度実行しても同じ結果になるように設計
2. **タイムアウト設定**: 長時間実行を防ぐため必ずタイムアウトを設定
3. **エラーハンドリング**: 一時的なエラーと永続的なエラーを区別
4. **監視**: ジョブの実行状況を常に監視し、異常を早期に検出
5. **スケーラビリティ**: ワーカー数を動的に調整できる設計

## 関連ドキュメント
- [並行処理・排他制御](.cursor/rules/concurrency-control.md)
- [パフォーマンス最適化](.cursor/rules/performance-optimization.md)