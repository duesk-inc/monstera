package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExpenseStatus 経費申請ステータス
type ExpenseStatus string

const (
	// ExpenseStatusDraft 下書き
	ExpenseStatusDraft ExpenseStatus = "draft"
	// ExpenseStatusSubmitted 申請中
	ExpenseStatusSubmitted ExpenseStatus = "submitted"
	// ExpenseStatusApproved 承認済み
	ExpenseStatusApproved ExpenseStatus = "approved"
	// ExpenseStatusRejected 却下
	ExpenseStatusRejected ExpenseStatus = "rejected"
	// ExpenseStatusPaid 支払済み
	ExpenseStatusPaid ExpenseStatus = "paid"
	// ExpenseStatusCancelled 取消
	ExpenseStatusCancelled ExpenseStatus = "cancelled"
	// ExpenseStatusExpired 期限切れ
	ExpenseStatusExpired ExpenseStatus = "expired"
	// ExpenseStatusClosed 締め済み
	ExpenseStatusClosed ExpenseStatus = "closed"
)

// ExpenseCategory 経費カテゴリ
type ExpenseCategory string

const (
	// ExpenseCategoryTransport 交通費
	ExpenseCategoryTransport ExpenseCategory = "transport"
	// ExpenseCategoryMeal 食費
	ExpenseCategoryMeal ExpenseCategory = "meal"
	// ExpenseCategoryAccommodation 宿泊費
	ExpenseCategoryAccommodation ExpenseCategory = "accommodation"
	// ExpenseCategoryEntertainment 接待費
	ExpenseCategoryEntertainment ExpenseCategory = "entertainment"
	// ExpenseCategoryOfficeSupplies 備品
	ExpenseCategoryOfficeSupplies ExpenseCategory = "office_supplies"
	// ExpenseCategoryBook 書籍
	ExpenseCategoryBook ExpenseCategory = "book"
	// ExpenseCategorySeminar セミナー・研修
	ExpenseCategorySeminar ExpenseCategory = "seminar"
	// ExpenseCategoryOther その他
	ExpenseCategoryOther ExpenseCategory = "other"
)

// Expense 経費申請モデル
type Expense struct {
	ID                     uuid.UUID       `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID                 uuid.UUID       `gorm:"type:varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"user_id"`
	User                   User            `gorm:"foreignKey:UserID" json:"user"`
	Title                  string          `gorm:"size:255;not null" json:"title"`
	Category               ExpenseCategory `gorm:"size:50;not null" json:"category"`
	CategoryID             uuid.UUID       `gorm:"type:varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"category_id"`
	Amount                 int             `gorm:"not null" json:"amount"` // 金額（円）
	ExpenseDate            time.Time       `gorm:"not null" json:"expense_date"`
	Status                 ExpenseStatus   `gorm:"type:enum('draft','submitted','approved','rejected','paid','cancelled','expired');default:'draft';not null" json:"status"`
	Description            string          `gorm:"type:text" json:"description"`
	ReceiptURL             string          `gorm:"size:255" json:"receipt_url"`   // 領収書画像のURL
	ReceiptURLs            []string        `gorm:"type:json" json:"receipt_urls"` // 複数の領収書画像URL
	ApproverID             *uuid.UUID      `gorm:"type:varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci" json:"approver_id"`
	Approver               *User           `gorm:"foreignKey:ApproverID;references:ID" json:"approver"`
	ApprovedAt             *time.Time      `json:"approved_at"`
	PaidAt                 *time.Time      `json:"paid_at"`
	DeadlineAt             *time.Time      `json:"deadline_at"`                                   // 申請期限
	ExpiredAt              *time.Time      `json:"expired_at"`                                    // 期限切れ日時
	AutoExpireEnabled      bool            `gorm:"default:true" json:"auto_expire_enabled"`       // 自動期限切れ有効化
	ExpiryNotificationSent bool            `gorm:"default:false" json:"expiry_notification_sent"` // 期限切れ通知送信済み
	ReminderSentAt         *time.Time      `json:"reminder_sent_at"`                              // リマインダー送信日時
	Version                int             `gorm:"default:1;not null" json:"version"`             // 楽観的ロック用
	CreatedAt              time.Time       `json:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at"`
	DeletedAt              gorm.DeletedAt  `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (e *Expense) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

// 既存のVARCHAR型との互換性を保つための変換関数（移行期間中のみ使用）
func NormalizeExpenseStatus(status string) ExpenseStatus {
	switch status {
	case "draft":
		return ExpenseStatusDraft
	case "submitted":
		return ExpenseStatusSubmitted
	case "approved":
		return ExpenseStatusApproved
	case "rejected":
		return ExpenseStatusRejected
	case "paid":
		return ExpenseStatusPaid
	case "cancelled":
		return ExpenseStatusCancelled
	case "expired":
		return ExpenseStatusExpired
	default:
		return ExpenseStatusDraft
	}
}

// ExpenseWithDetails 詳細情報付き経費申請モデル（API応答用）
type ExpenseWithDetails struct {
	Expense
	// 承認履歴
	Approvals []ExpenseApproval `json:"approvals,omitempty"`
	// カテゴリマスタ情報
	CategoryMaster *ExpenseCategoryMaster `json:"category_master,omitempty"`
	// 月次集計情報
	MonthlySummary *ExpenseSummary `json:"monthly_summary,omitempty"`
	// 現在有効な制限
	CurrentLimits *ExpenseLimits `json:"current_limits,omitempty"`
}

// ExpenseLimits 現在有効な制限情報
type ExpenseLimits struct {
	MonthlyLimit *ExpenseLimit `json:"monthly_limit,omitempty"`
	YearlyLimit  *ExpenseLimit `json:"yearly_limit,omitempty"`
}

// LoadDetails 詳細情報をロード
func (e *ExpenseWithDetails) LoadDetails(db *gorm.DB) error {
	// 承認履歴をロード
	err := db.Where("expense_id = ?", e.ID).
		Preload("Approver").
		Order("approval_order ASC").
		Find(&e.Approvals).Error
	if err != nil {
		return err
	}

	// カテゴリマスタ情報をロード
	var categoryMaster ExpenseCategoryMaster
	err = db.Where("code = ? AND is_active = true", e.Category).
		First(&categoryMaster).Error
	if err == nil {
		e.CategoryMaster = &categoryMaster
	}

	// 月次集計情報をロード
	expenseTime := e.ExpenseDate
	var monthlySummary ExpenseSummary
	err = db.Where("user_id = ? AND year = ? AND month = ?",
		e.UserID, expenseTime.Year(), int(expenseTime.Month())).
		First(&monthlySummary).Error
	if err == nil {
		e.MonthlySummary = &monthlySummary
	}

	// 現在有効な制限をロード
	monthlyLimit, yearlyLimit, err := GetCurrentEffectiveLimits(db)
	if err == nil {
		e.CurrentLimits = &ExpenseLimits{
			MonthlyLimit: monthlyLimit,
			YearlyLimit:  yearlyLimit,
		}
	}

	return nil
}

// GetCurrentApprovalStep 現在の承認段階を取得
func (e *ExpenseWithDetails) GetCurrentApprovalStep() *ExpenseApproval {
	for _, approval := range e.Approvals {
		if approval.Status == ApprovalStatusPending {
			return &approval
		}
	}
	return nil
}

// GetCompletedApprovals 完了済み承認を取得
func (e *ExpenseWithDetails) GetCompletedApprovals() []ExpenseApproval {
	var completed []ExpenseApproval
	for _, approval := range e.Approvals {
		if approval.Status == ApprovalStatusApproved || approval.Status == ApprovalStatusRejected {
			completed = append(completed, approval)
		}
	}
	return completed
}

// IsFullyApproved 全ての承認が完了しているかチェック
func (e *ExpenseWithDetails) IsFullyApproved() bool {
	if len(e.Approvals) == 0 {
		return false
	}

	for _, approval := range e.Approvals {
		if approval.Status != ApprovalStatusApproved {
			return false
		}
	}
	return true
}

// IsRejected 却下されているかチェック
func (e *ExpenseWithDetails) IsRejected() bool {
	for _, approval := range e.Approvals {
		if approval.Status == ApprovalStatusRejected {
			return true
		}
	}
	return false
}

// CanEdit 編集可能かチェック
func (e *Expense) CanEdit() bool {
	// 下書き状態のみ編集可能
	return e.Status == ExpenseStatusDraft
}

// CanSubmit 提出可能かチェック
func (e *Expense) CanSubmit() bool {
	// 下書き状態のみ提出可能
	return e.Status == ExpenseStatusDraft
}

// CanCancel キャンセル可能かチェック
func (e *Expense) CanCancel() bool {
	// 申請中のみキャンセル可能
	return e.Status == ExpenseStatusSubmitted
}

// CanEdit 編集可能かチェック（ExpenseWithDetails版）
func (e *ExpenseWithDetails) CanEdit() bool {
	return e.Expense.CanEdit()
}

// CanSubmit 提出可能かチェック（ExpenseWithDetails版）
func (e *ExpenseWithDetails) CanSubmit() bool {
	return e.Expense.CanSubmit()
}

// CanCancel キャンセル可能かチェック（ExpenseWithDetails版）
func (e *ExpenseWithDetails) CanCancel() bool {
	return e.Expense.CanCancel()
}

// IsExpired 期限切れかチェック
func (e *Expense) IsExpired() bool {
	return e.Status == ExpenseStatusExpired
}

// ShouldExpire 期限切れにすべきかチェック
func (e *Expense) ShouldExpire(now time.Time) bool {
	// 申請中で、自動期限切れが有効で、期限が設定されており、期限を過ぎている場合
	return e.Status == ExpenseStatusSubmitted &&
		e.AutoExpireEnabled &&
		e.DeadlineAt != nil &&
		now.After(*e.DeadlineAt)
}

// NeedsReminder リマインダーが必要かチェック
func (e *Expense) NeedsReminder(reminderDate time.Time) bool {
	// 申請中で、期限が設定されており、リマインダーがまだ送信されていない場合
	return e.Status == ExpenseStatusSubmitted &&
		e.DeadlineAt != nil &&
		e.ReminderSentAt == nil &&
		time.Now().After(reminderDate)
}

// SetDeadline 期限を設定
func (e *Expense) SetDeadline(deadline time.Time) {
	e.DeadlineAt = &deadline
}

// MarkAsExpired 期限切れとしてマーク
func (e *Expense) MarkAsExpired() {
	e.Status = ExpenseStatusExpired
	now := time.Now()
	e.ExpiredAt = &now
}

// MarkReminderSent リマインダー送信済みとしてマーク
func (e *Expense) MarkReminderSent() {
	now := time.Now()
	e.ReminderSentAt = &now
}

// MarkExpiryNotificationSent 期限切れ通知送信済みとしてマーク
func (e *Expense) MarkExpiryNotificationSent() {
	e.ExpiryNotificationSent = true
}

// MonthlyCloseStatus 月次締め状態
type MonthlyCloseStatus struct {
	ID                    uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Year                  int       `gorm:"not null" json:"year"`
	Month                 int       `gorm:"not null" json:"month"`
	Status                MonthlyCloseStatusType `gorm:"type:varchar(20);not null" json:"status"`
	ClosedAt              *time.Time            `json:"closed_at"`
	ClosedBy              *uuid.UUID            `gorm:"type:uuid" json:"closed_by"`
	TotalExpenseCount     int                   `json:"total_expense_count"`
	TotalExpenseAmount    float64               `json:"total_expense_amount"`
	PendingExpenseCount   int                   `json:"pending_expense_count"`
	CreatedAt             time.Time             `json:"created_at"`
	UpdatedAt             time.Time             `json:"updated_at"`
}

// MonthlyCloseStatusType 月次締め状態タイプ
type MonthlyCloseStatusType string

const (
	// MonthlyCloseStatusOpen 未締め
	MonthlyCloseStatusOpen MonthlyCloseStatusType = "open"
	// MonthlyCloseStatusClosed 締め済み
	MonthlyCloseStatusClosed MonthlyCloseStatusType = "closed"
)

// MonthlyCloseSummary 月次締めサマリー
type MonthlyCloseSummary struct {
	ID                 uuid.UUID                `gorm:"type:uuid;primary_key" json:"id"`
	Year               int                      `gorm:"not null" json:"year"`
	Month              int                      `gorm:"not null" json:"month"`
	TotalExpenseCount  int                      `json:"total_expense_count"`
	TotalExpenseAmount float64                  `json:"total_expense_amount"`
	UserSummaries      []UserExpenseSummary     `gorm:"foreignKey:MonthlySummaryID" json:"user_summaries"`
	CategorySummaries  []CategoryExpenseSummary `gorm:"foreignKey:MonthlySummaryID" json:"category_summaries"`
	CreatedAt          time.Time                `json:"created_at"`
	UpdatedAt          time.Time                `json:"updated_at"`
}

// UserExpenseSummary ユーザー別経費サマリー
type UserExpenseSummary struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	MonthlySummaryID uuid.UUID `gorm:"type:uuid;not null" json:"monthly_summary_id"`
	UserID           uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	UserName         string    `gorm:"type:varchar(255)" json:"user_name"`
	ExpenseCount     int       `json:"expense_count"`
	TotalAmount      float64   `json:"total_amount"`
}

// CategoryExpenseSummary カテゴリー別経費サマリー
type CategoryExpenseSummary struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	MonthlySummaryID uuid.UUID `gorm:"type:uuid;not null" json:"monthly_summary_id"`
	CategoryID       uint      `gorm:"not null" json:"category_id"`
	CategoryName     string    `gorm:"type:varchar(255)" json:"category_name"`
	ExpenseCount     int       `json:"expense_count"`
	TotalAmount      float64   `json:"total_amount"`
}
