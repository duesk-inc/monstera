package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExpenseReceipt 経費領収書モデル
type ExpenseReceipt struct {
	ID           string    `gorm:"type:varchar(255);primary_key" json:"id"`
	ExpenseID    string    `gorm:"type:varchar(255);not null" json:"expense_id"`
	Expense      Expense   `gorm:"foreignKey:ExpenseID;references:ID" json:"-"`
	ReceiptURL   string    `gorm:"type:varchar(255);not null" json:"receipt_url"`
	S3Key        string    `gorm:"type:varchar(255);not null" json:"s3_key"`
	FileName     string    `gorm:"type:varchar(255);not null" json:"file_name"`
	FileSize     int       `gorm:"not null;default:0" json:"file_size"`
	ContentType  string    `gorm:"type:varchar(100);not null;default:'application/octet-stream'" json:"content_type"`
	DisplayOrder int       `gorm:"not null;default:0" json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TableName テーブル名を指定
func (ExpenseReceipt) TableName() string {
	return "expense_receipts"
}

// BeforeCreate 作成前の処理
func (r *ExpenseReceipt) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// ExpenseReceiptCreateInput 領収書作成入力
type ExpenseReceiptCreateInput struct {
	ReceiptURL  string `json:"receipt_url" validate:"required,url"`
	S3Key       string `json:"s3_key" validate:"required"`
	FileName    string `json:"file_name" validate:"required"`
	FileSize    int    `json:"file_size" validate:"min=0"`
	ContentType string `json:"content_type" validate:"required"`
}

// ExpenseReceiptUpdateOrderInput 領収書表示順更新入力
type ExpenseReceiptUpdateOrderInput struct {
	ReceiptID    string `json:"receipt_id" validate:"required"`
	DisplayOrder int    `json:"display_order" validate:"min=0"`
}
