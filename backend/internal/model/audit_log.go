package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog 監査ログ
type AuditLog struct {
	ID           uuid.UUID `json:"id" gorm:"type:char(36);primaryKey;default:(UUID())"`
	UserID       uuid.UUID `json:"user_id" gorm:"type:char(36);not null;index"`
	Action       string    `json:"action" gorm:"type:varchar(100);not null;index"`
	ResourceType string    `json:"resource_type" gorm:"type:varchar(50);not null;index"`
	ResourceID   *string   `json:"resource_id" gorm:"type:varchar(100);index"`
	Method       string    `json:"method" gorm:"type:enum('GET','POST','PUT','DELETE','PATCH');not null"`
	Path         string    `json:"path" gorm:"type:varchar(255);not null"`
	StatusCode   int       `json:"status_code" gorm:"not null"`
	IPAddress    *string   `json:"ip_address" gorm:"type:varchar(45);index"`
	UserAgent    *string   `json:"user_agent" gorm:"type:text"`
	RequestBody  *string   `json:"request_body" gorm:"type:text"`
	ResponseBody *string   `json:"response_body" gorm:"type:text"`
	ErrorMessage *string   `json:"error_message" gorm:"type:text"`
	Duration     *int64    `json:"duration"` // マイクロ秒単位
	CreatedAt    time.Time `json:"created_at" gorm:"default:CURRENT_TIMESTAMP;index"`

	// リレーション
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
}

// TableName テーブル名を指定
func (AuditLog) TableName() string {
	return "audit_logs"
}

// BeforeCreate GORM作成前フック
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// AuditActionType 監査アクション種別
type AuditActionType string

const (
	// 認証関連
	AuditActionLogin        AuditActionType = "LOGIN"
	AuditActionLogout       AuditActionType = "LOGOUT"
	AuditActionLoginFailed  AuditActionType = "LOGIN_FAILED"
	AuditActionTokenRefresh AuditActionType = "TOKEN_REFRESH"

	// ユーザー管理
	AuditActionUserCreate AuditActionType = "USER_CREATE"
	AuditActionUserUpdate AuditActionType = "USER_UPDATE"
	AuditActionUserDelete AuditActionType = "USER_DELETE"
	AuditActionUserView   AuditActionType = "USER_VIEW"

	// 週報管理
	AuditActionWeeklyReportCreate AuditActionType = "WEEKLY_REPORT_CREATE"
	AuditActionWeeklyReportUpdate AuditActionType = "WEEKLY_REPORT_UPDATE"
	AuditActionWeeklyReportDelete AuditActionType = "WEEKLY_REPORT_DELETE"
	AuditActionWeeklyReportView   AuditActionType = "WEEKLY_REPORT_VIEW"
	AuditActionWeeklyReportSubmit AuditActionType = "WEEKLY_REPORT_SUBMIT"
	AuditActionWeeklyReportExport AuditActionType = "WEEKLY_REPORT_EXPORT"

	// アラート設定
	AuditActionAlertSettingsCreate AuditActionType = "ALERT_SETTINGS_CREATE"
	AuditActionAlertSettingsUpdate AuditActionType = "ALERT_SETTINGS_UPDATE"
	AuditActionAlertSettingsDelete AuditActionType = "ALERT_SETTINGS_DELETE"
	AuditActionAlertSettingsView   AuditActionType = "ALERT_SETTINGS_VIEW"

	// システム管理
	AuditActionSystemConfigUpdate AuditActionType = "SYSTEM_CONFIG_UPDATE"
	AuditActionSystemConfigView   AuditActionType = "SYSTEM_CONFIG_VIEW"
	AuditActionPermissionChange   AuditActionType = "PERMISSION_CHANGE"

	// データ操作
	AuditActionDataExport  AuditActionType = "DATA_EXPORT"
	AuditActionDataImport  AuditActionType = "DATA_IMPORT"
	AuditActionDataArchive AuditActionType = "DATA_ARCHIVE"
	AuditActionDataRestore AuditActionType = "DATA_RESTORE"
	AuditActionDataPurge   AuditActionType = "DATA_PURGE"

	// ファイル操作
	AuditActionFileUpload   AuditActionType = "FILE_UPLOAD"
	AuditActionFileDownload AuditActionType = "FILE_DOWNLOAD"
	AuditActionFileDelete   AuditActionType = "FILE_DELETE"

	// 経費申請関連
	AuditActionExpenseCreate       AuditActionType = "EXPENSE_CREATE"
	AuditActionExpenseUpdate       AuditActionType = "EXPENSE_UPDATE"
	AuditActionExpenseDelete       AuditActionType = "EXPENSE_DELETE"
	AuditActionExpenseView         AuditActionType = "EXPENSE_VIEW"
	AuditActionExpenseSubmit       AuditActionType = "EXPENSE_SUBMIT"
	AuditActionExpenseCancel       AuditActionType = "EXPENSE_CANCEL"
	AuditActionExpenseApprove      AuditActionType = "EXPENSE_APPROVE"
	AuditActionExpenseReject       AuditActionType = "EXPENSE_REJECT"
	AuditActionExpenseExport       AuditActionType = "EXPENSE_EXPORT"
	AuditActionExpenseLimitUpdate  AuditActionType = "EXPENSE_LIMIT_UPDATE"
	AuditActionExpenseCategoryEdit AuditActionType = "EXPENSE_CATEGORY_EDIT"
	AuditActionExpenseExpired      AuditActionType = "EXPENSE_EXPIRED"

	// 汎用アクション
	AuditActionCreate AuditActionType = "CREATE"
	AuditActionUpdate AuditActionType = "UPDATE"
	AuditActionDelete AuditActionType = "DELETE"
)

// ResourceType リソース種別
type ResourceType string

const (
	ResourceTypeUser            ResourceType = "USER"
	ResourceTypeWeeklyReport    ResourceType = "WEEKLY_REPORT"
	ResourceTypeDailyRecord     ResourceType = "DAILY_RECORD"
	ResourceTypeAlertSettings   ResourceType = "ALERT_SETTINGS"
	ResourceTypeAlertHistory    ResourceType = "ALERT_HISTORY"
	ResourceTypeSystemConfig    ResourceType = "SYSTEM_CONFIG"
	ResourceTypeNotification    ResourceType = "NOTIFICATION"
	ResourceTypeRole            ResourceType = "ROLE"
	ResourceTypePermission      ResourceType = "PERMISSION"
	ResourceTypeExportJob       ResourceType = "EXPORT_JOB"
	ResourceTypeFile            ResourceType = "FILE"
	ResourceTypeSession         ResourceType = "SESSION"
	ResourceTypeExpense         ResourceType = "EXPENSE"
	ResourceTypeExpenseCategory ResourceType = "EXPENSE_CATEGORY"
	ResourceTypeExpenseLimit    ResourceType = "EXPENSE_LIMIT"
	ResourceTypeExpenseApproval ResourceType = "EXPENSE_APPROVAL"
)

// ShouldAudit 監査対象かどうかを判定
func (action AuditActionType) ShouldAudit() bool {
	// 読み取り系は基本的に監査対象外（ただし重要なものは除く）
	readOnlyActions := map[AuditActionType]bool{
		AuditActionUserView:          false, // 一般的な閲覧は監査対象外
		AuditActionWeeklyReportView:  false, // 一般的な閲覧は監査対象外
		AuditActionSystemConfigView:  true,  // システム設定の閲覧は監査対象
		AuditActionAlertSettingsView: true,  // アラート設定の閲覧は監査対象
		AuditActionExpenseView:       false, // 経費申請の閲覧は監査対象外
	}

	if shouldAudit, exists := readOnlyActions[action]; exists {
		return shouldAudit
	}

	// 上記以外は基本的に監査対象
	return true
}

// GetSeverity アクションの重要度を取得
func (action AuditActionType) GetSeverity() string {
	highSeverityActions := map[AuditActionType]bool{
		AuditActionUserDelete:          true,
		AuditActionSystemConfigUpdate:  true,
		AuditActionPermissionChange:    true,
		AuditActionDataPurge:           true,
		AuditActionLoginFailed:         true,
		AuditActionExpenseApprove:      true, // 経費承認は高重要度
		AuditActionExpenseReject:       true, // 経費却下は高重要度
		AuditActionExpenseLimitUpdate:  true, // 上限変更は高重要度
		AuditActionExpenseCategoryEdit: true, // カテゴリ編集は高重要度
	}

	mediumSeverityActions := map[AuditActionType]bool{
		AuditActionUserCreate:    true,
		AuditActionUserUpdate:    true,
		AuditActionDataExport:    true,
		AuditActionDataArchive:   true,
		AuditActionFileDelete:    true,
		AuditActionLogin:         true,
		AuditActionLogout:        true,
		AuditActionExpenseSubmit: true, // 経費申請提出は中重要度
		AuditActionExpenseCancel: true, // 経費申請キャンセルは中重要度
		AuditActionExpenseUpdate: true, // 経費申請更新は中重要度
		AuditActionExpenseDelete: true, // 経費申請削除は中重要度
	}

	if highSeverityActions[action] {
		return "HIGH"
	}
	if mediumSeverityActions[action] {
		return "MEDIUM"
	}
	return "LOW"
}
