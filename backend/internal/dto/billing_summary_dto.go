package dto

// BillingSummaryResponse 請求サマリーレスポンス
type BillingSummaryResponse struct {
	Year            int                    `json:"year"`
	Month           int                    `json:"month"`
	TotalAmount     float64                `json:"total_amount"`
	TotalInvoices   int                    `json:"total_invoices"`
	PaidInvoices    int                    `json:"paid_invoices"`
	UnpaidInvoices  int                    `json:"unpaid_invoices"`
	OverdueInvoices int                    `json:"overdue_invoices"`
	TotalClients    int                    `json:"total_clients"`
	ActiveProjects  int                    `json:"active_projects"`
	BillingByClient []ClientBillingSummary `json:"billing_by_client"`
	BillingByType   []BillingTypeSummary   `json:"billing_by_type"`
}

// ClientBillingSummary クライアント別請求サマリー
type ClientBillingSummary struct {
	ClientID     string  `json:"client_id"`
	ClientName   string  `json:"client_name"`
	TotalAmount  float64 `json:"total_amount"`
	InvoiceCount int     `json:"invoice_count"`
	Status       string  `json:"status"`
}

// BillingTypeSummary 請求タイプ別サマリー
type BillingTypeSummary struct {
	BillingType   string  `json:"billing_type"`
	TotalAmount   float64 `json:"total_amount"`
	InvoiceCount  int     `json:"invoice_count"`
	AverageAmount float64 `json:"average_amount"`
}
