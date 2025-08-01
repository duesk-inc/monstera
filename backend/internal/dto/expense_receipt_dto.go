package dto

import (
	"time"

	"github.com/google/uuid"
)

// ExpenseReceiptDTO 経費領収書DTO
type ExpenseReceiptDTO struct {
	ID           uuid.UUID `json:"id"`
	ExpenseID    uuid.UUID `json:"expense_id"`
	ReceiptURL   string    `json:"receipt_url"`
	S3Key        string    `json:"s3_key"`
	FileName     string    `json:"file_name"`
	FileSize     int       `json:"file_size"`
	ContentType  string    `json:"content_type"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreateExpenseReceiptRequest 領収書作成リクエスト
type CreateExpenseReceiptRequest struct {
	ReceiptURL  string `json:"receipt_url" binding:"required,url"`
	S3Key       string `json:"s3_key" binding:"required"`
	FileName    string `json:"file_name" binding:"required,max=255"`
	FileSize    int    `json:"file_size" binding:"required,min=0"`
	ContentType string `json:"content_type" binding:"required,max=100"`
}

// CreateExpenseWithReceiptsRequest 複数領収書を含む経費申請作成リクエスト
type CreateExpenseWithReceiptsRequest struct {
	Title         string                        `json:"title" binding:"required,min=1,max=255"`
	Category      string                        `json:"category" binding:"required,oneof=transport entertainment supplies books seminar other"` // カテゴリコード
	CategoryID    *uuid.UUID                    `json:"category_id" binding:"omitempty"`                                                        // オプショナルに変更（後方互換性）
	Amount        int                           `json:"amount" binding:"required,min=1,max=10000000"`
	ExpenseDate   time.Time                     `json:"expense_date" binding:"required"`
	Description   string                        `json:"description" binding:"required,min=10,max=1000"`
	OtherCategory string                        `json:"other_category,omitempty" binding:"omitempty,max=100"`
	Receipts      []CreateExpenseReceiptRequest `json:"receipts" binding:"required,min=1,max=10,dive"`
}

// UpdateExpenseWithReceiptsRequest 複数領収書を含む経費申請更新リクエスト
type UpdateExpenseWithReceiptsRequest struct {
	Title         *string                       `json:"title,omitempty" binding:"omitempty,min=1,max=255"`
	Category      *string                       `json:"category,omitempty" binding:"omitempty,oneof=transport entertainment supplies books seminar other"` // カテゴリコード
	CategoryID    *uuid.UUID                    `json:"category_id,omitempty" binding:"omitempty"`
	Amount        *int                          `json:"amount,omitempty" binding:"omitempty,min=1,max=10000000"`
	ExpenseDate   *time.Time                    `json:"expense_date,omitempty" binding:"omitempty"`
	Description   *string                       `json:"description,omitempty" binding:"omitempty,min=10,max=1000"`
	OtherCategory *string                       `json:"other_category,omitempty" binding:"omitempty,max=100"`
	Receipts      []CreateExpenseReceiptRequest `json:"receipts,omitempty" binding:"omitempty,max=10,dive"`
	Version       int                           `json:"version" binding:"required,min=1"`
}

// UpdateReceiptOrderRequest 領収書表示順更新リクエスト
type UpdateReceiptOrderRequest struct {
	Orders []ReceiptOrderItem `json:"orders" binding:"required,min=1,dive"`
}

// ReceiptOrderItem 領収書表示順項目
type ReceiptOrderItem struct {
	ReceiptID    uuid.UUID `json:"receipt_id" binding:"required"`
	DisplayOrder int       `json:"display_order" binding:"required,min=0"`
}

// GenerateReceiptUploadURLRequest 領収書アップロードURL生成リクエスト
type GenerateReceiptUploadURLRequest struct {
	FileName    string `json:"file_name" binding:"required,max=255"`
	ContentType string `json:"content_type" binding:"required,max=100"`
	FileSize    int    `json:"file_size" binding:"required,min=1,max=52428800"` // 最大50MB
}

// GenerateReceiptUploadURLResponse 領収書アップロードURL生成レスポンス
type GenerateReceiptUploadURLResponse struct {
	UploadURL string            `json:"upload_url"`
	S3Key     string            `json:"s3_key"`
	Headers   map[string]string `json:"headers"`
}

// ExpenseWithReceiptsResponse 複数領収書を含む経費申請レスポンス
type ExpenseWithReceiptsResponse struct {
	ID              uuid.UUID           `json:"id"`
	UserID          uuid.UUID           `json:"user_id"`
	UserName        string              `json:"user_name"`
	DepartmentID    *uuid.UUID          `json:"department_id,omitempty"`
	DepartmentName  string              `json:"department_name,omitempty"`
	Title           string              `json:"title"`
	CategoryID      uuid.UUID           `json:"category_id"`
	CategoryName    string              `json:"category_name"`
	CategoryCode    string              `json:"category_code"`
	Amount          int                 `json:"amount"`
	ExpenseDate     time.Time           `json:"expense_date"`
	Description     string              `json:"description"`
	Status          string              `json:"status"`
	SubmittedAt     *time.Time          `json:"submitted_at,omitempty"`
	ApprovedAt      *time.Time          `json:"approved_at,omitempty"`
	ApprovedBy      *uuid.UUID          `json:"approved_by,omitempty"`
	ApproverName    string              `json:"approver_name,omitempty"`
	RejectedAt      *time.Time          `json:"rejected_at,omitempty"`
	RejectedBy      *uuid.UUID          `json:"rejected_by,omitempty"`
	RejectionReason string              `json:"rejection_reason,omitempty"`
	ReceiptURL      string              `json:"receipt_url,omitempty"` // 後方互換性のため保持
	Receipts        []ExpenseReceiptDTO `json:"receipts"`              // 複数領収書
	Version         int                 `json:"version"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`

	// 承認フロー情報
	CurrentApprovalStep string `json:"current_approval_step,omitempty"`
	RequiresExecutive   bool   `json:"requires_executive"`
}
