package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// AuthFactory 認証・権限チェックミドルウェアのファクトリー
type AuthFactory struct {
	cfg                        *config.Config
	logger                     *zap.Logger
	userRepo                   repository.UserRepository
	departmentRepo             repository.DepartmentRepository
	weeklyReportRepo           repository.WeeklyReportRepository
	weeklyReportRefactoredRepo repository.WeeklyReportRefactoredRepository
}

// NewAuthFactory AuthFactoryのインスタンスを作成
func NewAuthFactory(
	cfg *config.Config,
	logger *zap.Logger,
	userRepo repository.UserRepository,
	departmentRepo repository.DepartmentRepository,
	weeklyReportRepo repository.WeeklyReportRepository,
	weeklyReportRefactoredRepo repository.WeeklyReportRefactoredRepository,
) *AuthFactory {
	return &AuthFactory{
		cfg:                        cfg,
		logger:                     logger,
		userRepo:                   userRepo,
		departmentRepo:             departmentRepo,
		weeklyReportRepo:           weeklyReportRepo,
		weeklyReportRefactoredRepo: weeklyReportRefactoredRepo,
	}
}

// CreateAuthMiddleware 基本認証ミドルウェアを作成
func (f *AuthFactory) CreateAuthMiddleware() *AuthRefactoredMiddleware {
	return NewAuthRefactoredMiddleware(f.cfg, f.logger, f.userRepo)
}

// CreateWeeklyReportAuthMiddleware 週報認証ミドルウェアを作成
func (f *AuthFactory) CreateWeeklyReportAuthMiddleware() *WeeklyReportAuthMiddleware {
	authMiddleware := f.CreateAuthMiddleware()
	return NewWeeklyReportAuthMiddleware(
		f.logger,
		f.weeklyReportRepo,
		f.weeklyReportRefactoredRepo,
		f.userRepo,
		f.departmentRepo,
		authMiddleware,
	)
}

// AuthMiddlewareConfig 認証ミドルウェアの設定
type AuthMiddlewareConfig struct {
	// レート制限設定
	RateLimitEnabled  bool
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// セッション設定
	SessionTimeout        time.Duration
	MaxConcurrentSessions int

	// セキュリティ設定
	StrictSecurityMode bool
	RequireHTTPS       bool
	AllowedOrigins     []string

	// ログ設定
	LogAuthEvents     bool
	LogSecurityEvents bool
}

// DefaultAuthMiddlewareConfig デフォルトの認証ミドルウェア設定
func DefaultAuthMiddlewareConfig() *AuthMiddlewareConfig {
	return &AuthMiddlewareConfig{
		RateLimitEnabled:      true,
		RateLimitRequests:     100,
		RateLimitWindow:       time.Minute,
		SessionTimeout:        15 * time.Minute,
		MaxConcurrentSessions: 5,
		StrictSecurityMode:    false,
		RequireHTTPS:          false,
		AllowedOrigins:        []string{"*"},
		LogAuthEvents:         true,
		LogSecurityEvents:     true,
	}
}

// AuthBundle 認証関連ミドルウェアのバンドル
type AuthBundle struct {
	BaseAuth         *AuthRefactoredMiddleware
	WeeklyReportAuth *WeeklyReportAuthMiddleware
	Config           *AuthMiddlewareConfig
}

// CreateAuthBundle 認証ミドルウェアバンドルを作成
func (f *AuthFactory) CreateAuthBundle(config *AuthMiddlewareConfig) *AuthBundle {
	if config == nil {
		config = DefaultAuthMiddlewareConfig()
	}

	baseAuth := f.CreateAuthMiddleware()
	weeklyReportAuth := f.CreateWeeklyReportAuthMiddleware()

	return &AuthBundle{
		BaseAuth:         baseAuth,
		WeeklyReportAuth: weeklyReportAuth,
		Config:           config,
	}
}

// ValidationConfig バリデーション設定
type ValidationConfig struct {
	ValidateWeekRange bool
	ValidateWorkHours bool
	ValidateMood      bool
	ValidateDeadlines bool
}

// DefaultValidationConfig デフォルトのバリデーション設定
func DefaultValidationConfig() *ValidationConfig {
	return &ValidationConfig{
		ValidateWeekRange: true,
		ValidateWorkHours: true,
		ValidateMood:      true,
		ValidateDeadlines: true,
	}
}

// PermissionConfig 権限設定
type PermissionConfig struct {
	// 週報関連権限
	AllowSelfEdit        bool
	AllowManagerView     bool
	AllowAdminFullAccess bool
	AllowCrossDepart     bool // 部署を跨いだアクセス

	// 統計・分析権限
	AllowStatsView       bool
	AllowDepartmentStats bool
	AllowExport          bool

	// 通知・リマインド権限
	AllowReminderSend    bool
	AllowBulkReminder    bool
	MaxBulkReminderCount int
}

// DefaultPermissionConfig デフォルトの権限設定
func DefaultPermissionConfig() *PermissionConfig {
	return &PermissionConfig{
		AllowSelfEdit:        true,
		AllowManagerView:     true,
		AllowAdminFullAccess: true,
		AllowCrossDepart:     false,
		AllowStatsView:       true,
		AllowDepartmentStats: true,
		AllowExport:          true,
		AllowReminderSend:    true,
		AllowBulkReminder:    true,
		MaxBulkReminderCount: 100,
	}
}

// SecurityAuditConfig セキュリティ監査設定
type SecurityAuditConfig struct {
	LogFailedAttempts       bool
	LogSuccessfulAuth       bool
	LogPermissionDenials    bool
	LogSuspiciousActivity   bool
	AlertOnMultipleFailures bool
	FailureThreshold        int
	AuditRetentionDays      int
}

// DefaultSecurityAuditConfig デフォルトのセキュリティ監査設定
func DefaultSecurityAuditConfig() *SecurityAuditConfig {
	return &SecurityAuditConfig{
		LogFailedAttempts:       true,
		LogSuccessfulAuth:       false,
		LogPermissionDenials:    true,
		LogSuspiciousActivity:   true,
		AlertOnMultipleFailures: true,
		FailureThreshold:        5,
		AuditRetentionDays:      90,
	}
}

// CreateSecurityMiddleware セキュリティミドルウェアを作成
func (f *AuthFactory) CreateSecurityMiddleware(config *SecurityAuditConfig) *SecurityMiddleware {
	if config == nil {
		config = DefaultSecurityAuditConfig()
	}

	return NewSecurityMiddleware(f.logger, config)
}

// SecurityMiddleware セキュリティ監査ミドルウェア
type SecurityMiddleware struct {
	logger *zap.Logger
	config *SecurityAuditConfig
}

// NewSecurityMiddleware SecurityMiddlewareのインスタンスを作成
func NewSecurityMiddleware(logger *zap.Logger, config *SecurityAuditConfig) *SecurityMiddleware {
	return &SecurityMiddleware{
		logger: logger,
		config: config,
	}
}

// LogSecurityEvent セキュリティイベントをログに記録
func (s *SecurityMiddleware) LogSecurityEvent(eventType, userID, details string) {
	if !s.config.LogSuspiciousActivity && eventType == "suspicious" {
		return
	}

	s.logger.Info("Security event",
		zap.String("event_type", eventType),
		zap.String("user_id", userID),
		zap.String("details", details),
		zap.Time("timestamp", time.Now()),
	)
}

// MiddlewareChain ミドルウェアチェーンビルダー
type MiddlewareChain struct {
	middlewares []interface{}
}

// NewMiddlewareChain ミドルウェアチェーンを作成
func NewMiddlewareChain() *MiddlewareChain {
	return &MiddlewareChain{
		middlewares: make([]interface{}, 0),
	}
}

// Add ミドルウェアを追加
func (m *MiddlewareChain) Add(middleware interface{}) *MiddlewareChain {
	m.middlewares = append(m.middlewares, middleware)
	return m
}

// Build ミドルウェアチェーンを構築
func (m *MiddlewareChain) Build() []interface{} {
	return m.middlewares
}

// 週報管理用の事前定義されたミドルウェアチェーン

// CreateWeeklyReportListChain 週報一覧用ミドルウェアチェーン
func (f *AuthFactory) CreateWeeklyReportListChain(config *AuthMiddlewareConfig) *MiddlewareChain {
	auth := f.CreateAuthMiddleware()
	_ = f.CreateWeeklyReportAuthMiddleware() // 将来的に使用予定

	chain := NewMiddlewareChain()

	if config.RateLimitEnabled {
		chain.Add(auth.RateLimitMiddleware(config.RateLimitRequests, config.RateLimitWindow))
	}

	chain.Add(auth.JWTAuth())
	chain.Add(auth.RequireManager()) // 管理者またはマネージャー権限

	return chain
}

// CreateWeeklyReportEditChain 週報編集用ミドルウェアチェーン
func (f *AuthFactory) CreateWeeklyReportEditChain(config *AuthMiddlewareConfig) *MiddlewareChain {
	auth := f.CreateAuthMiddleware()
	weeklyAuth := f.CreateWeeklyReportAuthMiddleware()

	chain := NewMiddlewareChain()

	if config.RateLimitEnabled {
		chain.Add(auth.RateLimitMiddleware(config.RateLimitRequests, config.RateLimitWindow))
	}

	chain.Add(auth.JWTAuth())
	chain.Add(weeklyAuth.RequireWeeklyReportAccess())
	chain.Add(weeklyAuth.RequireWeeklyReportEdit())

	return chain
}

// CreateUnsubmittedUsersChain 未提出者管理用ミドルウェアチェーン
func (f *AuthFactory) CreateUnsubmittedUsersChain(config *AuthMiddlewareConfig) *MiddlewareChain {
	auth := f.CreateAuthMiddleware()
	weeklyAuth := f.CreateWeeklyReportAuthMiddleware()

	chain := NewMiddlewareChain()

	if config.RateLimitEnabled {
		chain.Add(auth.RateLimitMiddleware(config.RateLimitRequests, config.RateLimitWindow))
	}

	chain.Add(auth.JWTAuth())
	chain.Add(weeklyAuth.RequireUnsubmittedUsersAccess())
	chain.Add(weeklyAuth.RequireDepartmentManagement())

	return chain
}

// CreateReminderSendChain リマインド送信用ミドルウェアチェーン
func (f *AuthFactory) CreateReminderSendChain(config *AuthMiddlewareConfig) *MiddlewareChain {
	auth := f.CreateAuthMiddleware()
	weeklyAuth := f.CreateWeeklyReportAuthMiddleware()

	chain := NewMiddlewareChain()

	// リマインド送信は厳しいレート制限
	chain.Add(auth.RateLimitMiddleware(10, time.Minute))
	chain.Add(auth.JWTAuth())
	chain.Add(weeklyAuth.RequireReminderSend())

	return chain
}

// CreateStatsAccessChain 統計アクセス用ミドルウェアチェーン
func (f *AuthFactory) CreateStatsAccessChain(config *AuthMiddlewareConfig) *MiddlewareChain {
	auth := f.CreateAuthMiddleware()
	weeklyAuth := f.CreateWeeklyReportAuthMiddleware()

	chain := NewMiddlewareChain()

	if config.RateLimitEnabled {
		chain.Add(auth.RateLimitMiddleware(config.RateLimitRequests, config.RateLimitWindow))
	}

	chain.Add(auth.JWTAuth())
	chain.Add(weeklyAuth.RequireStatsAccess())

	return chain
}

// NewWeeklyReportAuthorization 指定されたロール以上の権限を要求するミドルウェアを作成
func (f *AuthFactory) NewWeeklyReportAuthorization(allowedRoles []model.Role) gin.HandlerFunc {
	// 最小のロール（最も高い権限）を見つける
	minRole := model.RoleEmployee
	for _, role := range allowedRoles {
		if role < minRole {
			minRole = role
		}
	}

	// RoleManagerが含まれている場合はRequireManagerRoleを使用
	for _, role := range allowedRoles {
		if role == model.RoleManager {
			return RequireManagerRole(f.logger)
		}
	}

	// それ以外の場合はRequireRoleを使用
	return RequireRole(minRole, f.logger)
}
