package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AuditLogService 監査ログサービスインターフェース
type AuditLogService interface {
	LogActivity(ctx context.Context, params LogActivityParams) error
	LogHTTPRequest(ctx context.Context, c *gin.Context, userID string, action model.AuditActionType, resourceType model.ResourceType, resourceID *string, duration time.Duration) error
	GetAuditLogs(ctx context.Context, filters repository.AuditLogFilters) ([]*model.AuditLog, int64, error)
	GetUserAuditLogs(ctx context.Context, userID string, page, limit int) ([]*model.AuditLog, error)
	GetResourceAuditLogs(ctx context.Context, resourceType model.ResourceType, resourceID string, page, limit int) ([]*model.AuditLog, error)
	GetSuspiciousActivities(ctx context.Context, filters repository.SuspiciousActivityFilters) ([]*repository.SuspiciousActivity, error)
	CleanupOldLogs(ctx context.Context, retentionDays int) (int64, error)
}

// LogActivityParams アクティビティログパラメータ
type LogActivityParams struct {
	UserID       string                `json:"user_id"`
	Action       model.AuditActionType `json:"action"`
	ResourceType model.ResourceType    `json:"resource_type"`
	ResourceID   *string               `json:"resource_id"`
	Method       string                `json:"method"`
	Path         string                `json:"path"`
	StatusCode   int                   `json:"status_code"`
	IPAddress    *string               `json:"ip_address"`
	UserAgent    *string               `json:"user_agent"`
	RequestBody  interface{}           `json:"request_body"`
	ResponseBody interface{}           `json:"response_body"`
	ErrorMessage *string               `json:"error_message"`
	Duration     *time.Duration        `json:"duration"`
}

// auditLogService 監査ログサービス実装
type auditLogService struct {
	db        *gorm.DB
	logger    *zap.Logger
	auditRepo repository.AuditLogRepository
}

// NewAuditLogService 監査ログサービスの生成
func NewAuditLogService(db *gorm.DB, logger *zap.Logger, auditRepo repository.AuditLogRepository) AuditLogService {
	return &auditLogService{
		db:        db,
		logger:    logger,
		auditRepo: auditRepo,
	}
}

// LogActivity アクティビティをログに記録
func (s *auditLogService) LogActivity(ctx context.Context, params LogActivityParams) error {
	// 監査対象でない場合はスキップ
	if !params.Action.ShouldAudit() {
		return nil
	}

	auditLog := &model.AuditLog{
		UserID:       params.UserID,
		Action:       string(params.Action),
		ResourceType: string(params.ResourceType),
		ResourceID:   params.ResourceID,
		Method:       params.Method,
		Path:         params.Path,
		StatusCode:   params.StatusCode,
		IPAddress:    params.IPAddress,
		UserAgent:    params.UserAgent,
		ErrorMessage: params.ErrorMessage,
		CreatedAt:    time.Now(),
	}

	// リクエストボディのJSON化
	if params.RequestBody != nil {
		if bodyBytes, err := json.Marshal(params.RequestBody); err == nil {
			bodyStr := string(bodyBytes)
			// 機密情報をマスク
			bodyStr = s.maskSensitiveData(bodyStr)
			auditLog.RequestBody = &bodyStr
		}
	}

	// レスポンスボディのJSON化
	if params.ResponseBody != nil {
		if bodyBytes, err := json.Marshal(params.ResponseBody); err == nil {
			bodyStr := string(bodyBytes)
			// 機密情報をマスク
			bodyStr = s.maskSensitiveData(bodyStr)
			auditLog.ResponseBody = &bodyStr
		}
	}

	// 実行時間（マイクロ秒）
	if params.Duration != nil {
		durationMicros := params.Duration.Nanoseconds() / 1000
		auditLog.Duration = &durationMicros
	}

	if err := s.auditRepo.Create(ctx, auditLog); err != nil {
		s.logger.Error("Failed to create audit log",
			zap.Error(err),
			zap.String("user_id", params.UserID),
			zap.String("action", string(params.Action)),
		)

		// 外部キー制約違反の場合は警告として記録し、エラーを返さない
		if strings.Contains(err.Error(), "foreign key constraint") ||
			strings.Contains(err.Error(), "fk_audit_logs_user") {
			s.logger.Warn("Audit log creation failed due to foreign key constraint - user may not exist",
				zap.String("user_id", params.UserID),
				zap.String("action", string(params.Action)),
			)
			return nil // エラーを返さず、監査ログの失敗がメイン処理をブロックしないようにする
		}

		return fmt.Errorf("監査ログの作成に失敗しました: %w", err)
	}

	return nil
}

// LogHTTPRequest HTTPリクエストをログに記録
func (s *auditLogService) LogHTTPRequest(ctx context.Context, c *gin.Context, userID string, action model.AuditActionType, resourceType model.ResourceType, resourceID *string, duration time.Duration) error {
	// 監査対象でない場合はスキップ
	if !action.ShouldAudit() {
		return nil
	}

	ipAddress := s.getClientIP(c)
	userAgent := c.GetHeader("User-Agent")

	params := LogActivityParams{
		UserID:       userID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Method:       c.Request.Method,
		Path:         c.Request.URL.Path,
		StatusCode:   c.Writer.Status(),
		IPAddress:    &ipAddress,
		UserAgent:    &userAgent,
		Duration:     &duration,
	}

	// リクエストボディの取得（POSTやPUTの場合）
	if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
		if bodyData, exists := c.Get("request_body"); exists {
			params.RequestBody = bodyData
		}
	}

	// エラーメッセージの取得
	if errors := c.Errors; len(errors) > 0 {
		errorMsg := errors.String()
		params.ErrorMessage = &errorMsg
	}

	// バックグラウンドコンテキストを使用してログを記録
	return s.LogActivity(ctx, params)
}

// GetAuditLogs 監査ログを取得
func (s *auditLogService) GetAuditLogs(ctx context.Context, filters repository.AuditLogFilters) ([]*model.AuditLog, int64, error) {
	// デフォルト値の設定
	if filters.Limit <= 0 {
		filters.Limit = 50
	}
	if filters.Limit > 1000 {
		filters.Limit = 1000
	}

	return s.auditRepo.GetByFilters(ctx, filters)
}

// GetUserAuditLogs ユーザーの監査ログを取得
func (s *auditLogService) GetUserAuditLogs(ctx context.Context, userID string, page, limit int) ([]*model.AuditLog, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	return s.auditRepo.GetByUserID(ctx, userID, limit, offset)
}

// GetResourceAuditLogs リソースの監査ログを取得
func (s *auditLogService) GetResourceAuditLogs(ctx context.Context, resourceType model.ResourceType, resourceID string, page, limit int) ([]*model.AuditLog, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	return s.auditRepo.GetByResourceID(ctx, resourceType, resourceID, limit, offset)
}

// GetSuspiciousActivities 不審なアクティビティを検出
func (s *auditLogService) GetSuspiciousActivities(ctx context.Context, filters repository.SuspiciousActivityFilters) ([]*repository.SuspiciousActivity, error) {
	// デフォルト値の設定
	if filters.MinAttempts <= 0 {
		filters.MinAttempts = 5
	}
	if filters.TimeWindowMin <= 0 {
		filters.TimeWindowMin = 60 // 1時間
	}

	return s.auditRepo.GetSuspiciousActivities(ctx, filters)
}

// CleanupOldLogs 古い監査ログを削除
func (s *auditLogService) CleanupOldLogs(ctx context.Context, retentionDays int) (int64, error) {
	if retentionDays <= 0 {
		retentionDays = 365 // デフォルト1年
	}

	deletedCount, err := s.auditRepo.DeleteOldLogs(ctx, retentionDays)
	if err != nil {
		s.logger.Error("Failed to cleanup old audit logs",
			zap.Error(err),
			zap.Int("retention_days", retentionDays),
		)
		return 0, fmt.Errorf("古い監査ログの削除に失敗しました: %w", err)
	}

	s.logger.Info("Cleaned up old audit logs",
		zap.Int64("deleted_count", deletedCount),
		zap.Int("retention_days", retentionDays),
	)

	return deletedCount, nil
}

// getClientIP クライアントIPアドレスを取得
func (s *auditLogService) getClientIP(c *gin.Context) string {
	// プロキシ経由の場合の実IPを取得
	if ip := c.GetHeader("X-Forwarded-For"); ip != "" {
		ips := strings.Split(ip, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}
	if ip := c.GetHeader("X-Real-IP"); ip != "" {
		return ip
	}
	return c.ClientIP()
}

// maskSensitiveData 機密情報をマスク
func (s *auditLogService) maskSensitiveData(data string) string {
	// パスワード、トークン、秘密鍵などをマスク
	sensitiveFields := []string{
		"password", "token", "secret", "key", "auth",
		"credential", "private", "confidential",
	}

	maskedData := data
	for _, field := range sensitiveFields {
		// JSON形式の値をマスク
		pattern := fmt.Sprintf(`"%s":\s*"[^"]*"`, field)
		maskedData = strings.ReplaceAll(maskedData, pattern, fmt.Sprintf(`"%s":"***MASKED***"`, field))

		// 大文字小文字区別なし
		pattern = fmt.Sprintf(`"(?i)%s":\s*"[^"]*"`, field)
		maskedData = strings.ReplaceAll(maskedData, pattern, fmt.Sprintf(`"%s":"***MASKED***"`, field))
	}

	return maskedData
}
