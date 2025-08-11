package dto

import (
	"time"
)

// InvoiceDTO 請求書DTO
type InvoiceDTO struct {
	ID            string     `json:"id"`
	ClientID      string     `json:"client_id"`
	ClientName    string     `json:"client_name"`
	InvoiceNumber string     `json:"invoice_number"`
	InvoiceDate   time.Time  `json:"invoice_date"`
	DueDate       time.Time  `json:"due_date"`
	Status        string     `json:"status"`
	Subtotal      float64    `json:"subtotal"`
	Tax           float64    `json:"tax"`
	TotalAmount   float64    `json:"total_amount"`
	Notes         string     `json:"notes"`
	PaymentDate   *time.Time `json:"payment_date"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// InvoiceDetailDTO 請求書詳細DTO
type InvoiceDetailDTO struct {
	InvoiceDTO
	Details []InvoiceItemDTO `json:"details"`
}

// InvoiceItemDTO 請求明細DTO
type InvoiceItemDTO struct {
	ID          string  `json:"id"`
	InvoiceID   string  `json:"invoice_id"`
	ProjectID   *string `json:"project_id"`
	ProjectName string  `json:"project_name,omitempty"`
	UserID      *string `json:"user_id"`
	UserName    string  `json:"user_name,omitempty"`
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	Amount      float64 `json:"amount"`
	OrderIndex  int     `json:"order_index"`
}

// CreateInvoiceRequest 請求書作成リクエスト
type CreateInvoiceRequest struct {
	ClientID      string                     `json:"client_id" binding:"required"`
	InvoiceNumber string                     `json:"invoice_number" binding:"required,max=50"`
	InvoiceDate   time.Time                  `json:"invoice_date" binding:"required"`
	DueDate       time.Time                  `json:"due_date" binding:"required"`
	Notes         string                     `json:"notes"`
	Details       []CreateInvoiceItemRequest `json:"details" binding:"required,min=1"`
}

// CreateInvoiceItemRequest 請求明細作成リクエスト
type CreateInvoiceItemRequest struct {
	ProjectID   *string `json:"project_id"`
	UserID      *string `json:"user_id"`
	Description string  `json:"description" binding:"required,max=200"`
	Quantity    float64 `json:"quantity" binding:"required,min=0"`
	UnitPrice   float64 `json:"unit_price" binding:"required,min=0"`
}

// UpdateInvoiceRequest 請求書更新リクエスト
type UpdateInvoiceRequest struct {
	InvoiceDate *time.Time `json:"invoice_date"`
	DueDate     *time.Time `json:"due_date"`
	Notes       *string    `json:"notes"`
}

// UpdateInvoiceStatusRequest 請求書ステータス更新リクエスト
type UpdateInvoiceStatusRequest struct {
	Status      string     `json:"status" binding:"required,oneof=draft sent paid overdue cancelled"`
	PaymentDate *time.Time `json:"payment_date"`
}

// InvoiceSearchRequest 請求書検索リクエスト
type InvoiceSearchRequest struct {
	ClientID *string    `form:"client_id"`
	Status   string     `form:"status"`
	DateFrom *time.Time `form:"date_from"`
	DateTo   *time.Time `form:"date_to"`
	Page     int        `form:"page"`
	Limit    int        `form:"limit"`
}

// InvoiceSummaryDTO 請求書サマリDTO
type InvoiceSummaryDTO struct {
	TotalAmount   float64 `json:"total_amount"`
	PaidAmount    float64 `json:"paid_amount"`
	UnpaidAmount  float64 `json:"unpaid_amount"`
	OverdueAmount float64 `json:"overdue_amount"`
	DraftCount    int     `json:"draft_count"`
	SentCount     int     `json:"sent_count"`
	PaidCount     int     `json:"paid_count"`
	OverdueCount  int     `json:"overdue_count"`
}
