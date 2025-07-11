package dto

import (
	"time"

	"github.com/google/uuid"
)

// ClientDTO 取引先DTO
type ClientDTO struct {
	ID              uuid.UUID `json:"id"`
	CompanyName     string    `json:"company_name"`
	CompanyNameKana string    `json:"company_name_kana"`
	BillingType     string    `json:"billing_type"`
	PaymentTerms    int       `json:"payment_terms"`
	ContactPerson   string    `json:"contact_person"`
	ContactEmail    string    `json:"contact_email"`
	ContactPhone    string    `json:"contact_phone"`
	Address         string    `json:"address"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ClientDetailDTO 取引先詳細DTO
type ClientDetailDTO struct {
	ClientDTO
	ActiveProjects  int        `json:"active_projects"`
	TotalInvoices   int        `json:"total_invoices"`
	LastInvoiceDate *time.Time `json:"last_invoice_date"`
}

// CreateClientRequest 取引先作成リクエスト
type CreateClientRequest struct {
	CompanyName     string `json:"company_name" binding:"required,max=200"`
	CompanyNameKana string `json:"company_name_kana" binding:"required,max=200"`
	BillingType     string `json:"billing_type" binding:"required,oneof=monthly hourly fixed"`
	PaymentTerms    int    `json:"payment_terms" binding:"min=0,max=365"`
	ContactPerson   string `json:"contact_person" binding:"max=100"`
	ContactEmail    string `json:"contact_email" binding:"omitempty,email,max=100"`
	ContactPhone    string `json:"contact_phone" binding:"max=20"`
	Address         string `json:"address" binding:"max=255"`
	Notes           string `json:"notes"`
}

// UpdateClientRequest 取引先更新リクエスト
type UpdateClientRequest struct {
	CompanyName     *string `json:"company_name" binding:"omitempty,max=200"`
	CompanyNameKana *string `json:"company_name_kana" binding:"omitempty,max=200"`
	BillingType     *string `json:"billing_type" binding:"omitempty,oneof=monthly hourly fixed"`
	PaymentTerms    *int    `json:"payment_terms" binding:"omitempty,min=0,max=365"`
	ContactPerson   *string `json:"contact_person" binding:"omitempty,max=100"`
	ContactEmail    *string `json:"contact_email" binding:"omitempty,email,max=100"`
	ContactPhone    *string `json:"contact_phone" binding:"omitempty,max=20"`
	Address         *string `json:"address" binding:"omitempty,max=255"`
	Notes           *string `json:"notes"`
}

// ProjectDTO 案件DTO
type ProjectDTO struct {
	ID            uuid.UUID  `json:"id"`
	ClientID      uuid.UUID  `json:"client_id"`
	ClientName    string     `json:"client_name,omitempty"`
	ProjectName   string     `json:"project_name"`
	ProjectCode   string     `json:"project_code"`
	Status        string     `json:"status"`
	StartDate     *time.Time `json:"start_date"`
	EndDate       *time.Time `json:"end_date"`
	MonthlyRate   float64    `json:"monthly_rate"`
	ContractType  string     `json:"contract_type"`
	WorkLocation  string     `json:"work_location"`
	Description   string     `json:"description"`
	Requirements  string     `json:"requirements"`
	AssignedCount int        `json:"assigned_count"`
	CreatedAt     time.Time  `json:"created_at"`
}
