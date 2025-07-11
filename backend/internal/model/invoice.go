package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// InvoiceStatus 請求書ステータス
type InvoiceStatus string

const (
	// InvoiceStatusDraft 下書き
	InvoiceStatusDraft InvoiceStatus = "draft"
	// InvoiceStatusSent 送付済み
	InvoiceStatusSent InvoiceStatus = "sent"
	// InvoiceStatusPaid 支払済み
	InvoiceStatusPaid InvoiceStatus = "paid"
	// InvoiceStatusOverdue 支払期限超過
	InvoiceStatusOverdue InvoiceStatus = "overdue"
	// InvoiceStatusCancelled キャンセル
	InvoiceStatusCancelled InvoiceStatus = "cancelled"
)

// Invoice 請求管理モデル
type Invoice struct {
	ID            uuid.UUID     `gorm:"type:varchar(36);primary_key" json:"id"`
	ClientID      uuid.UUID     `gorm:"type:varchar(36);not null" json:"client_id"`
	InvoiceNumber string        `gorm:"size:50;not null;unique" json:"invoice_number"`
	InvoiceDate   time.Time     `gorm:"not null" json:"invoice_date"`
	DueDate       time.Time     `gorm:"not null" json:"due_date"`
	BillingMonth  string        `gorm:"size:7;not null" json:"billing_month"`
	Subtotal      float64       `gorm:"type:decimal(10,2);not null" json:"subtotal"`
	TaxRate       float64       `gorm:"type:decimal(5,2);default:10.00" json:"tax_rate"`
	TaxAmount     float64       `gorm:"type:decimal(10,2);not null" json:"tax_amount"`
	TotalAmount   float64       `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	Status        InvoiceStatus `gorm:"size:50;default:'draft'" json:"status"`
	PaidDate      *time.Time    `json:"paid_date"`
	PaymentMethod string        `gorm:"size:50" json:"payment_method"`
	Notes         string        `gorm:"type:text" json:"notes"`
	CreatedBy     uuid.UUID     `gorm:"type:varchar(36)" json:"created_by"`

	// 経理機能拡張フィールド
	FreeeInvoiceID *int           `json:"freee_invoice_id"`
	ProjectGroupID *uuid.UUID     `gorm:"type:varchar(36)" json:"project_group_id"`
	FreeSyncStatus FreeSyncStatus `gorm:"type:enum('not_synced','synced','failed','pending');default:'not_synced'" json:"freee_sync_status"`
	FreeSyncedAt   *time.Time     `json:"freee_synced_at"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Client       Client          `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	Creator      User            `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Details      []InvoiceDetail `gorm:"foreignKey:InvoiceID" json:"details,omitempty"`
	ProjectGroup *ProjectGroup   `gorm:"foreignKey:ProjectGroupID" json:"project_group,omitempty"`
}

// InvoiceDetail 請求明細モデル
type InvoiceDetail struct {
	ID          uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	InvoiceID   uuid.UUID      `gorm:"type:varchar(36);not null" json:"invoice_id"`
	ProjectID   *uuid.UUID     `gorm:"type:varchar(36)" json:"project_id"`
	UserID      *uuid.UUID     `gorm:"type:varchar(36)" json:"user_id"`
	Description string         `gorm:"size:255;not null" json:"description"`
	Quantity    float64        `gorm:"type:decimal(10,2);default:1" json:"quantity"`
	UnitPrice   float64        `gorm:"type:decimal(10,2);not null" json:"unit_price"`
	Amount      float64        `gorm:"type:decimal(10,2);not null" json:"amount"`
	OrderIndex  int            `gorm:"default:0" json:"order_index"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Invoice Invoice  `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	User    *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// BeforeCreate UUIDを生成
func (i *Invoice) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// IsFreeSynced freeと同期済みかチェック
func (i *Invoice) IsFreeSynced() bool {
	return i.FreeSyncStatus == FreeSyncStatusSynced
}

// ShouldSyncToFreee freeに同期が必要かチェック
func (i *Invoice) ShouldSyncToFreee() bool {
	return i.FreeSyncStatus == FreeSyncStatusNotSynced || i.FreeSyncStatus == FreeSyncStatusFailed
}

// HasFreeeInvoiceID freeの請求書IDが設定されているかチェック
func (i *Invoice) HasFreeeInvoiceID() bool {
	return i.FreeeInvoiceID != nil && *i.FreeeInvoiceID > 0
}

// IsGroupInvoice プロジェクトグループの請求書かチェック
func (i *Invoice) IsGroupInvoice() bool {
	return i.ProjectGroupID != nil
}

// IsPaid 支払済みかチェック
func (i *Invoice) IsPaid() bool {
	return i.Status == InvoiceStatusPaid
}

// IsOverdue 支払期限を過ぎているかチェック
func (i *Invoice) IsOverdue() bool {
	return i.Status != InvoiceStatusPaid && i.Status != InvoiceStatusCancelled && time.Now().After(i.DueDate)
}

// GetDaysUntilDue 支払期限まで日数を取得
func (i *Invoice) GetDaysUntilDue() int {
	if i.IsPaid() {
		return 0
	}
	duration := time.Until(i.DueDate)
	return int(duration.Hours() / 24)
}

// CanCancel キャンセル可能かチェック
func (i *Invoice) CanCancel() bool {
	return i.Status == InvoiceStatusDraft || i.Status == InvoiceStatusSent
}

// CanMarkAsPaid 支払済みにできるかチェック
func (i *Invoice) CanMarkAsPaid() bool {
	return i.Status == InvoiceStatusSent || i.Status == InvoiceStatusOverdue
}

// BeforeCreate UUIDを生成
func (id *InvoiceDetail) BeforeCreate(tx *gorm.DB) error {
	if id.ID == uuid.Nil {
		id.ID = uuid.New()
	}
	return nil
}
