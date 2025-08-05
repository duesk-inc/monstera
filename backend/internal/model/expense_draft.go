package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ExpenseDraft 経費申請下書きモデル
type ExpenseDraft struct {
	ID        uuid.UUID      `gorm:"type:varchar(255);primaryKey" json:"id"`
	UserID string      `gorm:"type:varchar(255);not null;index" json:"user_id"`
	Data      datatypes.JSON `gorm:"type:json;not null" json:"data"`   // 下書きデータをJSON形式で保存
	SavedAt   time.Time      `gorm:"not null" json:"saved_at"`         // 保存日時
	ExpiresAt time.Time      `gorm:"not null;index" json:"expires_at"` // 有効期限
	CreatedAt time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// リレーション
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName テーブル名を指定
func (ExpenseDraft) TableName() string {
	return "expense_drafts"
}

// BeforeCreate 作成前のフック
func (d *ExpenseDraft) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	now := time.Now()
	d.SavedAt = now
	if d.ExpiresAt.IsZero() {
		// デフォルトで24時間後に有効期限を設定
		d.ExpiresAt = now.Add(24 * time.Hour)
	}
	return nil
}

// BeforeSave 保存前のフック
func (d *ExpenseDraft) BeforeSave(tx *gorm.DB) error {
	d.SavedAt = time.Now()
	return nil
}

// IsExpired 有効期限切れかどうかを判定
func (d *ExpenseDraft) IsExpired() bool {
	return time.Now().After(d.ExpiresAt)
}

// DraftData 下書きデータの構造
type DraftData struct {
	CategoryID   *uuid.UUID `json:"category_id,omitempty"`
	Amount       *int       `json:"amount,omitempty"`
	ExpenseDate  *time.Time `json:"expense_date,omitempty"`
	Description  *string    `json:"description,omitempty"`
	ReceiptURL   *string    `json:"receipt_url,omitempty"`
	ReceiptS3Key *string    `json:"receipt_s3_key,omitempty"`
}
