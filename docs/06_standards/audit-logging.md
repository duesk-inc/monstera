# 監査・セキュリティログ

このドキュメントは、Monsteraプロジェクトにおける監査ログとセキュリティログの実装規則を定義します。

## 更新履歴
- 2025-01-10: CLAUDE.mdから分離して作成

## 監査ログ実装

### モデル定義
```go
// models/audit_log.go
type AuditLog struct {
    ID         string                 `gorm:"type:uuid;primary_key"`
    UserID     string                 `gorm:"type:uuid;not null"`
    Action     string                 `gorm:"type:varchar(50);not null"`
    TargetType string                 `gorm:"type:varchar(50);not null"`
    TargetID   string                 `gorm:"type:uuid"`
    Changes    datatypes.JSON         `gorm:"type:jsonb"`
    IPAddress  string                 `gorm:"type:inet"`
    UserAgent  string                 `gorm:"type:text"`
    CreatedAt  time.Time              `gorm:"not null"`
}
```

### 記録対象アクション
```go
const (
    // 認証系
    ActionLogin           = "LOGIN"
    ActionLogout          = "LOGOUT"
    ActionPasswordChange  = "PASSWORD_CHANGE"
    
    // 承認系
    ActionSubmitWeeklyReport  = "SUBMIT_WEEKLY_REPORT"
    ActionApproveWeeklyReport = "APPROVE_WEEKLY_REPORT"
    ActionRejectWeeklyReport  = "REJECT_WEEKLY_REPORT"
    ActionSubmitExpense       = "SUBMIT_EXPENSE"
    ActionApproveExpense      = "APPROVE_EXPENSE"
    
    // 権限系
    ActionChangeUserRole      = "CHANGE_USER_ROLE"
    ActionGrantPermission     = "GRANT_PERMISSION"
    
    // 個人情報系
    ActionViewProfile         = "VIEW_PROFILE"
    ActionUpdateProfile       = "UPDATE_PROFILE"
)
```

### ミドルウェアで自動記録
```go
func AuditMiddleware(action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        // レスポンスが成功の場合のみ記録
        if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
            go recordAudit(c, action)
        }
    }
}

func recordAudit(c *gin.Context, action string) {
    userID := getUserIDFromContext(c)
    if userID == "" {
        return
    }
    
    audit := AuditLog{
        ID:         uuid.New().String(),
        UserID:     userID,
        Action:     action,
        TargetType: getTargetType(c),
        TargetID:   getTargetID(c),
        IPAddress:  c.ClientIP(),
        UserAgent:  c.GetHeader("User-Agent"),
        CreatedAt:  time.Now(),
    }
    
    // 変更内容の記録（UPDATE系の場合）
    if changes := getChangesFromContext(c); changes != nil {
        audit.Changes = changes
    }
    
    if err := db.Create(&audit).Error; err != nil {
        logger.Error("failed to record audit log",
            zap.String("action", action),
            zap.Error(err))
    }
}
```

## セキュリティイベントログ

### 不正アクセス検知
```go
func DetectSuspiciousActivity(userID string, action string) {
    key := fmt.Sprintf("security:rate_limit:%s:%s", userID, action)
    
    count, _ := redis.Incr(ctx, key).Result()
    redis.Expire(ctx, key, time.Hour)
    
    if count > 10 { // 1時間に10回以上
        logger.Warn("suspicious activity detected",
            zap.String("user_id", userID),
            zap.String("action", action),
            zap.Int64("count", count))
        
        // アラート送信
        notifySecurityTeam(userID, action, count)
    }
}
```

### セキュリティイベントの種類
```go
const (
    // ログイン関連
    EventLoginSuccess         = "LOGIN_SUCCESS"
    EventLoginFailure         = "LOGIN_FAILURE"
    EventLoginBlocked         = "LOGIN_BLOCKED"
    EventPasswordReset        = "PASSWORD_RESET"
    
    // アクセス制御
    EventUnauthorizedAccess   = "UNAUTHORIZED_ACCESS"
    EventPrivilegeEscalation  = "PRIVILEGE_ESCALATION"
    EventDataExport           = "DATA_EXPORT"
    
    // 異常検知
    EventAnomalousActivity    = "ANOMALOUS_ACTIVITY"
    EventRateLimitExceeded    = "RATE_LIMIT_EXCEEDED"
    EventSQLInjectionAttempt  = "SQL_INJECTION_ATTEMPT"
    EventXSSAttempt           = "XSS_ATTEMPT"
)
```

### セキュリティログの実装
```go
type SecurityLog struct {
    ID          string                 `gorm:"type:uuid;primary_key"`
    EventType   string                 `gorm:"type:varchar(50);not null"`
    UserID      string                 `gorm:"type:uuid"`
    IPAddress   string                 `gorm:"type:inet;not null"`
    UserAgent   string                 `gorm:"type:text"`
    RequestPath string                 `gorm:"type:text"`
    Details     datatypes.JSON         `gorm:"type:jsonb"`
    Severity    string                 `gorm:"type:varchar(20);not null"` // LOW, MEDIUM, HIGH, CRITICAL
    CreatedAt   time.Time              `gorm:"not null"`
}

func LogSecurityEvent(eventType string, severity string, details map[string]interface{}) {
    log := SecurityLog{
        ID:        uuid.New().String(),
        EventType: eventType,
        Severity:  severity,
        Details:   details,
        CreatedAt: time.Now(),
    }
    
    // コンテキストから情報を取得
    if c, ok := details["context"].(*gin.Context); ok {
        log.UserID = getUserIDFromContext(c)
        log.IPAddress = c.ClientIP()
        log.UserAgent = c.GetHeader("User-Agent")
        log.RequestPath = c.Request.URL.Path
    }
    
    if err := db.Create(&log).Error; err != nil {
        logger.Error("failed to record security log",
            zap.String("event_type", eventType),
            zap.Error(err))
    }
    
    // 高重要度イベントは即座にアラート
    if severity == "HIGH" || severity == "CRITICAL" {
        notifySecurityTeam(eventType, log)
    }
}
```

## ログの保管とローテーション

### 保管期間
```yaml
audit_logs:
  retention_days: 365    # 1年間保持
  archive_after: 30      # 30日後にアーカイブ

security_logs:
  retention_days: 730    # 2年間保持
  archive_after: 7       # 7日後にアーカイブ
```

### アーカイブ処理
```go
func ArchiveOldLogs() error {
    // 30日以上前の監査ログをアーカイブ
    cutoffDate := time.Now().AddDate(0, 0, -30)
    
    var logs []AuditLog
    if err := db.Where("created_at < ?", cutoffDate).Find(&logs).Error; err != nil {
        return err
    }
    
    // S3などの外部ストレージに保存
    for _, log := range logs {
        if err := archiveToS3(log); err != nil {
            return err
        }
    }
    
    // アーカイブ済みのログを削除
    return db.Where("created_at < ?", cutoffDate).Delete(&AuditLog{}).Error
}
```

## ログの検索と分析

### 検索インターフェース
```go
type LogSearchParams struct {
    UserID      string
    Action      string
    StartDate   time.Time
    EndDate     time.Time
    IPAddress   string
    TargetType  string
    TargetID    string
}

func SearchAuditLogs(params LogSearchParams) ([]AuditLog, error) {
    query := db.Model(&AuditLog{})
    
    if params.UserID != "" {
        query = query.Where("user_id = ?", params.UserID)
    }
    if params.Action != "" {
        query = query.Where("action = ?", params.Action)
    }
    if !params.StartDate.IsZero() {
        query = query.Where("created_at >= ?", params.StartDate)
    }
    if !params.EndDate.IsZero() {
        query = query.Where("created_at <= ?", params.EndDate)
    }
    
    var logs []AuditLog
    return logs, query.Order("created_at DESC").Find(&logs).Error
}
```

### 分析用の集計
```sql
-- ユーザー別アクション集計
SELECT user_id, action, COUNT(*) as count
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, action
ORDER BY count DESC;

-- 時間帯別ログイン分析
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as login_count
FROM audit_logs
WHERE action = 'LOGIN'
AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## コンプライアンス対応

### GDPR対応
```go
// 個人データの匿名化
func AnonymizeUserLogs(userID string) error {
    return db.Model(&AuditLog{}).
        Where("user_id = ?", userID).
        Updates(map[string]interface{}{
            "user_id":   "ANONYMIZED",
            "ip_address": "0.0.0.0",
            "user_agent": "ANONYMIZED",
        }).Error
}
```

### 監査レポート生成
```go
func GenerateAuditReport(startDate, endDate time.Time) (*AuditReport, error) {
    report := &AuditReport{
        Period: fmt.Sprintf("%s - %s", 
            startDate.Format("2006-01-02"),
            endDate.Format("2006-01-02")),
    }
    
    // 各種統計情報を集計
    // ...
    
    return report, nil
}
```

## ベストプラクティス

1. **非同期記録**: ログ記録は非同期で行い、APIレスポンスを遅延させない
2. **構造化ログ**: JSON形式で構造化し、検索・分析を容易にする
3. **機密情報の除外**: パスワードやトークンなどの機密情報は記録しない
4. **タイムスタンプ**: UTC時刻で統一して記録
5. **インデックス**: 検索頻度の高いカラムにインデックスを設定

## 関連ドキュメント
- [セキュリティ実装規則](.cursor/rules/security-implementation.md)
- [エラーハンドリング実装規則](.cursor/rules/error-handling.md)