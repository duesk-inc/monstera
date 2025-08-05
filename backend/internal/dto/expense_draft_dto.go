package dto

import (
	"time"

	"github.com/google/uuid"
)

// ExpenseDraftRequest 経費申請下書き保存リクエスト
type ExpenseDraftRequest struct {
	CategoryID   *uuid.UUID `json:"category_id,omitempty"`
	Amount       *int       `json:"amount,omitempty"`
	ExpenseDate  *time.Time `json:"expense_date,omitempty"`
	Description  *string    `json:"description,omitempty"`
	ReceiptURL   *string    `json:"receipt_url,omitempty"`
	ReceiptS3Key *string    `json:"receipt_s3_key,omitempty"`
}

// ExpenseDraftResponse 経費申請下書きレスポンス
type ExpenseDraftResponse struct {
	ID           uuid.UUID  `json:"id"`
	UserID string  `json:"user_id"`
	CategoryID   *uuid.UUID `json:"category_id,omitempty"`
	Amount       *int       `json:"amount,omitempty"`
	ExpenseDate  *time.Time `json:"expense_date,omitempty"`
	Description  *string    `json:"description,omitempty"`
	ReceiptURL   *string    `json:"receipt_url,omitempty"`
	ReceiptS3Key *string    `json:"receipt_s3_key,omitempty"`
	SavedAt      time.Time  `json:"saved_at"`
	ExpiresAt    time.Time  `json:"expires_at"`
}
