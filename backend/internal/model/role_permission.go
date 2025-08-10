package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RolePermission ロール権限管理モデル
type RolePermission struct {
	ID         string         `gorm:"type:varchar(255);primary_key" json:"id"`
	Role       string         `gorm:"size:50;not null" json:"role"`
	Permission string         `gorm:"size:100;not null" json:"permission"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (rp *RolePermission) BeforeCreate(tx *gorm.DB) error {
	if rp.ID == "" {
		rp.ID = uuid.New().String()
	}
	return nil
}

// 権限定数
const (
	// 週報関連権限
	PermissionWeeklyReportsViewAll = "weekly_reports.view_all"
	PermissionWeeklyReportsViewOwn = "weekly_reports.view_own"
	PermissionWeeklyReportsComment = "weekly_reports.comment"

	// 勤怠関連権限
	PermissionAttendanceApprove = "attendance.approve"
	PermissionAttendanceSubmit  = "attendance.submit"
	PermissionAttendanceViewAll = "attendance.view_all"

	// 経費関連権限
	PermissionExpensesApprove = "expenses.approve"
	PermissionExpensesSubmit  = "expenses.submit"
	PermissionExpensesViewAll = "expenses.view_all"

	// 請求関連権限
	PermissionInvoicesManage = "invoices.manage"
	PermissionInvoicesView   = "invoices.view"

	// 営業関連権限
	PermissionSalesManage = "sales.manage"
	PermissionSalesView   = "sales.view"

	// エンジニア管理権限
	PermissionEngineersViewAll = "engineers.view_all"
	PermissionEngineersEdit    = "engineers.edit"
	PermissionEngineersExport  = "engineers.export"

	// ダッシュボード権限
	PermissionDashboardView = "dashboard.view"

	// 管理者権限
	PermissionAdminAll = "admin.all"
)
