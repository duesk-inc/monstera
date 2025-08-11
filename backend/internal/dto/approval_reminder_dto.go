package dto

import (
	"time"
)

// ApprovalReminderConfig 承認催促設定
type ApprovalReminderConfig struct {
	Enabled           bool          `json:"enabled"`            // 有効/無効
	ReminderThreshold time.Duration `json:"reminder_threshold"` // 催促を送る閾値（例：3日）
	ReminderInterval  time.Duration `json:"reminder_interval"`  // 催促間隔（例：1日）
	MaxReminders      int           `json:"max_reminders"`      // 最大催促回数
	Schedule          string        `json:"schedule"`           // Cronスケジュール（例："0 9 * * *"）
}

// ApprovalReminderStatus 承認催促ステータス
type ApprovalReminderStatus struct {
	IsRunning      bool      `json:"is_running"`      // 実行中かどうか
	LastExecuted   time.Time `json:"last_executed"`   // 最終実行日時
	NextScheduled  time.Time `json:"next_scheduled"`  // 次回実行予定
	PendingCount   int       `json:"pending_count"`   // 承認待ち件数
	RemindersCount int       `json:"reminders_count"` // 送信済み催促数
}

// PendingExpenseWithApprover 承認者情報付き承認待ち経費申請
type PendingExpenseWithApprover struct {
	ExpenseID      string     `json:"expense_id"`
	ExpenseTitle   string     `json:"expense_title"`
	ExpenseAmount  int        `json:"expense_amount"`
	SubmitterName  string     `json:"submitter_name"`
	SubmittedAt    time.Time  `json:"submitted_at"`
	DaysPending    int        `json:"days_pending"` // 承認待ち日数
	ApproverID     string     `json:"approver_id"`
	ApproverName   string     `json:"approver_name"`
	ApproverEmail  string     `json:"approver_email"`
	RemindersSent  int        `json:"reminders_sent"`   // 送信済み催促回数
	LastReminderAt *time.Time `json:"last_reminder_at"` // 最終催促日時
}

// ApprovalReminderReport 承認催促レポート
type ApprovalReminderReport struct {
	GeneratedAt      time.Time                    `json:"generated_at"`
	TotalPending     int                          `json:"total_pending"`
	RemindersNeeded  int                          `json:"reminders_needed"`
	RemindersSent    int                          `json:"reminders_sent"`
	Errors           int                          `json:"errors"`
	ApproversSummary []ApproverReminderSummary    `json:"approvers_summary"`
	PendingExpenses  []PendingExpenseWithApprover `json:"pending_expenses"`
}

// ApproverReminderSummary 承認者別催促サマリー
type ApproverReminderSummary struct {
	ApproverID     string     `json:"approver_id"`
	ApproverName   string     `json:"approver_name"`
	PendingCount   int        `json:"pending_count"`
	OldestPending  time.Time  `json:"oldest_pending"`
	TotalAmount    int        `json:"total_amount"`
	ReminderSent   bool       `json:"reminder_sent"`
	LastReminderAt *time.Time `json:"last_reminder_at"`
}

// UpdateApprovalReminderConfigRequest 承認催促設定更新リクエスト
type UpdateApprovalReminderConfigRequest struct {
	Enabled               *bool   `json:"enabled"`
	ReminderThresholdDays *int    `json:"reminder_threshold_days"` // 日数で指定
	ReminderIntervalDays  *int    `json:"reminder_interval_days"`  // 日数で指定
	MaxReminders          *int    `json:"max_reminders"`
	Schedule              *string `json:"schedule"`
}

// GetApprovalReminderConfigResponse 承認催促設定取得レスポンス
type GetApprovalReminderConfigResponse struct {
	Config ApprovalReminderConfig `json:"config"`
	Status ApprovalReminderStatus `json:"status"`
}

// ExecuteApprovalReminderRequest 承認催促実行リクエスト
type ExecuteApprovalReminderRequest struct {
	DryRun bool `json:"dry_run"` // ドライラン（実際には送信しない）
}

// ExecuteApprovalReminderResponse 承認催促実行レスポンス
type ExecuteApprovalReminderResponse struct {
	Success bool                   `json:"success"`
	Report  ApprovalReminderReport `json:"report"`
	Message string                 `json:"message"`
}
