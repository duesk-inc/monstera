package dto

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// FreeeOAuthRequest freee OAuth認証リクエスト
type FreeeOAuthRequest struct {
	Code        string `json:"code" binding:"required"`
	State       string `json:"state" binding:"required"`
	RedirectURI string `json:"redirect_uri" binding:"required,url"`
}

// FreeeOAuthResponse freee OAuth認証レスポンス
type FreeeOAuthResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresIn    int       `json:"expires_in"`
	TokenType    string    `json:"token_type"`
	Scope        string    `json:"scope"`
	ExpiresAt    time.Time `json:"expires_at"`
	CompanyID    int       `json:"company_id"`
	CompanyName  string    `json:"company_name"`
}

// FreeeTokenRefreshRequest freeeトークン更新リクエスト
type FreeeTokenRefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// FreeeCompanyDTO freee会社情報DTO
type FreeeCompanyDTO struct {
	ID                     int    `json:"id"`
	Name                   string `json:"name"`
	NameKana               string `json:"name_kana,omitempty"`
	DisplayName            string `json:"display_name,omitempty"`
	TaxAtSourceCalcType    int    `json:"tax_at_source_calc_type,omitempty"`
	ContactName            string `json:"contact_name,omitempty"`
	HeadCount              int    `json:"head_count,omitempty"`
	CorporateNumber        string `json:"corporate_number,omitempty"`
	TxnNumberFormat        string `json:"txn_number_format,omitempty"`
	DefaultWalletAccountID *int   `json:"default_wallet_account_id,omitempty"`
	PrivateSettlement      bool   `json:"private_settlement,omitempty"`
	MinusFormat            int    `json:"minus_format,omitempty"`
	Role                   string `json:"role,omitempty"`
}

// FreeePartnerDTO freee取引先DTO
type FreeePartnerDTO struct {
	ID                                 int                      `json:"id"`
	CompanyID                          int                      `json:"company_id"`
	Name                               string                   `json:"name"`
	NameKana                           string                   `json:"name_kana,omitempty"`
	Shortcut                           string                   `json:"shortcut,omitempty"`
	PartnerDocSettingAttributes        *FreeePartnerDocSettings `json:"partner_doc_setting_attributes,omitempty"`
	LongName                           string                   `json:"long_name,omitempty"`
	OrgCode                            *int                     `json:"org_code,omitempty"`
	CountryCode                        string                   `json:"country_code,omitempty"`
	QualifiedInvoiceRegistrationNumber string                   `json:"qualified_invoice_registration_number,omitempty"`
	AddressAttributes                  *FreeeAddressDTO         `json:"address_attributes,omitempty"`
	ContactName                        string                   `json:"contact_name,omitempty"`
	Email                              string                   `json:"email,omitempty"`
	Phone                              string                   `json:"phone,omitempty"`
	TransferFeeHandlingSide            string                   `json:"transfer_fee_handling_side,omitempty"`
	PayerWalletAccountID               *int                     `json:"payer_wallet_account_id,omitempty"`
	TransferAccountID                  *int                     `json:"transfer_account_id,omitempty"`
}

// FreeePartnerDocSettings freee取引先書類設定DTO
type FreeePartnerDocSettings struct {
	SendingMethod int `json:"sending_method,omitempty"` // 0: 郵送, 1: メール
}

// FreeeAddressDTO freee住所DTO
type FreeeAddressDTO struct {
	Zipcode     string `json:"zipcode,omitempty"`
	Prefecture  string `json:"prefecture,omitempty"`
	StreetName1 string `json:"street_name1,omitempty"`
	StreetName2 string `json:"street_name2,omitempty"`
}

// FreeeInvoiceDTO freee請求書DTO
type FreeeInvoiceDTO struct {
	ID                 int                      `json:"id"`
	CompanyID          int                      `json:"company_id"`
	IssueDate          string                   `json:"issue_date"`
	PartnerID          int                      `json:"partner_id"`
	PartnerCode        string                   `json:"partner_code,omitempty"`
	InvoiceNumber      string                   `json:"invoice_number"`
	Title              string                   `json:"title,omitempty"`
	DueDate            string                   `json:"due_date"`
	TotalAmount        int                      `json:"total_amount"`
	TotalVat           int                      `json:"total_vat"`
	SubTotal           int                      `json:"sub_total"`
	BookingDate        string                   `json:"booking_date,omitempty"`
	Description        string                   `json:"description,omitempty"`
	InvoiceStatus      string                   `json:"invoice_status"` // draft, applying, remanded, rejected, approved, issued
	PaymentStatus      string                   `json:"payment_status"` // unsettled, settled
	PaymentDate        string                   `json:"payment_date,omitempty"`
	WebPublishedAt     string                   `json:"web_published_at,omitempty"`
	WebDownloadedAt    string                   `json:"web_downloaded_at,omitempty"`
	WebConfirmedAt     string                   `json:"web_confirmed_at,omitempty"`
	MailSentAt         string                   `json:"mail_sent_at,omitempty"`
	PartnerName        string                   `json:"partner_name,omitempty"`
	PartnerDisplayName string                   `json:"partner_display_name,omitempty"`
	PartnerTitle       string                   `json:"partner_title,omitempty"`
	PartnerZipcode     string                   `json:"partner_zipcode,omitempty"`
	PartnerPrefecture  string                   `json:"partner_prefecture,omitempty"`
	PartnerAddress1    string                   `json:"partner_address1,omitempty"`
	PartnerAddress2    string                   `json:"partner_address2,omitempty"`
	PartnerContactInfo string                   `json:"partner_contact_info,omitempty"`
	CompanyName        string                   `json:"company_name,omitempty"`
	CompanyZipcode     string                   `json:"company_zipcode,omitempty"`
	CompanyPrefecture  string                   `json:"company_prefecture,omitempty"`
	CompanyAddress1    string                   `json:"company_address1,omitempty"`
	CompanyAddress2    string                   `json:"company_address2,omitempty"`
	CompanyContactInfo string                   `json:"company_contact_info,omitempty"`
	PaymentType        string                   `json:"payment_type,omitempty"`
	PaymentBankInfo    string                   `json:"payment_bank_info,omitempty"`
	Message            string                   `json:"message,omitempty"`
	Notes              string                   `json:"notes,omitempty"`
	InvoiceLayout      string                   `json:"invoice_layout,omitempty"`
	TaxEntryMethod     string                   `json:"tax_entry_method,omitempty"`
	InvoiceContents    []FreeeInvoiceContentDTO `json:"invoice_contents,omitempty"`
}

// FreeeInvoiceContentDTO freee請求書明細DTO
type FreeeInvoiceContentDTO struct {
	ID            int     `json:"id,omitempty"`
	Order         int     `json:"order"`
	Type          string  `json:"type"` // normal, discount, text
	Qty           float64 `json:"qty,omitempty"`
	Unit          string  `json:"unit,omitempty"`
	UnitPrice     int     `json:"unit_price,omitempty"`
	Amount        int     `json:"amount,omitempty"`
	Vat           int     `json:"vat,omitempty"`
	ReducedVat    bool    `json:"reduced_vat,omitempty"`
	Description   string  `json:"description"`
	AccountItemID *int    `json:"account_item_id,omitempty"`
	TaxCode       int     `json:"tax_code,omitempty"`
	ItemID        *int    `json:"item_id,omitempty"`
	SectionID     *int    `json:"section_id,omitempty"`
	Segment1TagID *int    `json:"segment_1_tag_id,omitempty"`
	Segment2TagID *int    `json:"segment_2_tag_id,omitempty"`
	Segment3TagID *int    `json:"segment_3_tag_id,omitempty"`
}

// FreeePaymentDTO freee入金DTO
type FreeePaymentDTO struct {
	ID                  int    `json:"id"`
	CompanyID           int    `json:"company_id"`
	InvoiceID           int    `json:"invoice_id"`
	Date                string `json:"date"`
	Amount              int    `json:"amount"`
	FromWalletAccountID int    `json:"from_wallet_account_id"`
	Description         string `json:"description,omitempty"`
}

// CreateFreeePartnerRequest freee取引先作成リクエスト
type CreateFreeePartnerRequest struct {
	CompanyID                          int                      `json:"company_id" binding:"required"`
	Name                               string                   `json:"name" binding:"required,max=255"`
	NameKana                           string                   `json:"name_kana,omitempty"`
	Shortcut                           string                   `json:"shortcut,omitempty"`
	LongName                           string                   `json:"long_name,omitempty"`
	OrgCode                            *int                     `json:"org_code,omitempty"`
	CountryCode                        string                   `json:"country_code,omitempty"`
	QualifiedInvoiceRegistrationNumber string                   `json:"qualified_invoice_registration_number,omitempty"`
	AddressAttributes                  *FreeeAddressDTO         `json:"address_attributes,omitempty"`
	ContactName                        string                   `json:"contact_name,omitempty"`
	Email                              string                   `json:"email,omitempty"`
	Phone                              string                   `json:"phone,omitempty"`
	TransferFeeHandlingSide            string                   `json:"transfer_fee_handling_side,omitempty"`
	PayerWalletAccountID               *int                     `json:"payer_wallet_account_id,omitempty"`
	TransferAccountID                  *int                     `json:"transfer_account_id,omitempty"`
	PartnerDocSettingAttributes        *FreeePartnerDocSettings `json:"partner_doc_setting_attributes,omitempty"`
}

// CreateFreeeInvoiceRequest freee請求書作成リクエスト
type CreateFreeeInvoiceRequest struct {
	CompanyID          int                      `json:"company_id" binding:"required"`
	IssueDate          string                   `json:"issue_date" binding:"required"`
	PartnerID          int                      `json:"partner_id" binding:"required"`
	InvoiceNumber      string                   `json:"invoice_number,omitempty"`
	Title              string                   `json:"title,omitempty"`
	DueDate            string                   `json:"due_date,omitempty"`
	BookingDate        string                   `json:"booking_date,omitempty"`
	Description        string                   `json:"description,omitempty"`
	InvoiceStatus      string                   `json:"invoice_status,omitempty"`
	PartnerDisplayName string                   `json:"partner_display_name,omitempty"`
	PartnerTitle       string                   `json:"partner_title,omitempty"`
	PartnerContactInfo string                   `json:"partner_contact_info,omitempty"`
	CompanyContactInfo string                   `json:"company_contact_info,omitempty"`
	PaymentType        string                   `json:"payment_type,omitempty"`
	PaymentBankInfo    string                   `json:"payment_bank_info,omitempty"`
	Message            string                   `json:"message,omitempty"`
	Notes              string                   `json:"notes,omitempty"`
	InvoiceLayout      string                   `json:"invoice_layout,omitempty"`
	TaxEntryMethod     string                   `json:"tax_entry_method,omitempty"`
	InvoiceContents    []FreeeInvoiceContentDTO `json:"invoice_contents" binding:"required,min=1"`
}

// UpdateFreeeInvoiceRequest freee請求書更新リクエスト
type UpdateFreeeInvoiceRequest struct {
	IssueDate          *string                  `json:"issue_date,omitempty"`
	PartnerID          *int                     `json:"partner_id,omitempty"`
	InvoiceNumber      *string                  `json:"invoice_number,omitempty"`
	Title              *string                  `json:"title,omitempty"`
	DueDate            *string                  `json:"due_date,omitempty"`
	BookingDate        *string                  `json:"booking_date,omitempty"`
	Description        *string                  `json:"description,omitempty"`
	InvoiceStatus      *string                  `json:"invoice_status,omitempty"`
	PartnerDisplayName *string                  `json:"partner_display_name,omitempty"`
	PartnerTitle       *string                  `json:"partner_title,omitempty"`
	PartnerContactInfo *string                  `json:"partner_contact_info,omitempty"`
	CompanyContactInfo *string                  `json:"company_contact_info,omitempty"`
	PaymentType        *string                  `json:"payment_type,omitempty"`
	PaymentBankInfo    *string                  `json:"payment_bank_info,omitempty"`
	Message            *string                  `json:"message,omitempty"`
	Notes              *string                  `json:"notes,omitempty"`
	InvoiceLayout      *string                  `json:"invoice_layout,omitempty"`
	TaxEntryMethod     *string                  `json:"tax_entry_method,omitempty"`
	InvoiceContents    []FreeeInvoiceContentDTO `json:"invoice_contents,omitempty"`
}

// FreeeClientSyncRequest freee取引先同期リクエスト
type FreeeClientSyncRequest struct {
	ClientIDs []uuid.UUID `json:"client_ids" binding:"required,min=1"`
	CompanyID int         `json:"company_id" binding:"required"`
	SyncMode  string      `json:"sync_mode" binding:"oneof=create_only update_only create_update"` // create_only, update_only, create_update
}

// FreeeClientSyncResponse freee取引先同期レスポンス
type FreeeClientSyncResponse struct {
	TotalClients  int                        `json:"total_clients"`
	SyncedClients int                        `json:"synced_clients"`
	FailedClients int                        `json:"failed_clients"`
	Results       []FreeeClientSyncResultDTO `json:"results"`
	SyncedAt      time.Time                  `json:"synced_at"`
	SyncMode      string                     `json:"sync_mode"`
}

// FreeeClientSyncResultDTO freee取引先同期結果DTO
type FreeeClientSyncResultDTO struct {
	ClientID       uuid.UUID `json:"client_id"`
	ClientName     string    `json:"client_name"`
	Status         string    `json:"status"`    // success, failed, skipped
	Operation      string    `json:"operation"` // created, updated, skipped
	FreeePartnerID *int      `json:"freee_partner_id,omitempty"`
	Error          *string   `json:"error,omitempty"`
	Details        *string   `json:"details,omitempty"`
}

// FreeeInvoiceSyncRequest freee請求書同期リクエスト
type FreeeInvoiceSyncRequest struct {
	InvoiceIDs []uuid.UUID `json:"invoice_ids" binding:"required,min=1"`
	CompanyID  int         `json:"company_id" binding:"required"`
	SyncMode   string      `json:"sync_mode" binding:"oneof=create_only update_only create_update"`
	AutoIssue  bool        `json:"auto_issue"` // 自動で発行状態にするか
}

// FreeeInvoiceSyncResponse freee請求書同期レスポンス
type FreeeInvoiceSyncResponse struct {
	TotalInvoices  int                         `json:"total_invoices"`
	SyncedInvoices int                         `json:"synced_invoices"`
	FailedInvoices int                         `json:"failed_invoices"`
	Results        []FreeeInvoiceSyncResultDTO `json:"results"`
	SyncedAt       time.Time                   `json:"synced_at"`
	SyncMode       string                      `json:"sync_mode"`
}

// FreeeInvoiceSyncResultDTO freee請求書同期結果DTO
type FreeeInvoiceSyncResultDTO struct {
	InvoiceID       uuid.UUID `json:"invoice_id"`
	InvoiceNumber   string    `json:"invoice_number"`
	ClientName      string    `json:"client_name"`
	Status          string    `json:"status"`    // success, failed, skipped
	Operation       string    `json:"operation"` // created, updated, issued, skipped
	FreeeInvoiceID  *int      `json:"freee_invoice_id,omitempty"`
	FreeeInvoiceURL *string   `json:"freee_invoice_url,omitempty"`
	Error           *string   `json:"error,omitempty"`
	Details         *string   `json:"details,omitempty"`
}

// FreeePaymentSyncRequest freee入金同期リクエスト
type FreeePaymentSyncRequest struct {
	CompanyID        int         `json:"company_id" binding:"required"`
	StartDate        *time.Time  `json:"start_date,omitempty"`
	EndDate          *time.Time  `json:"end_date,omitempty"`
	InvoiceIDs       []uuid.UUID `json:"invoice_ids,omitempty"` // 指定した請求書のみ同期
	AutoUpdateStatus bool        `json:"auto_update_status"`    // 入金情報に基づいて請求書ステータスを自動更新
}

// FreeePaymentSyncResponse freee入金同期レスポンス
type FreeePaymentSyncResponse struct {
	TotalPayments     int                         `json:"total_payments"`
	ProcessedPayments int                         `json:"processed_payments"`
	UpdatedInvoices   int                         `json:"updated_invoices"`
	Results           []FreeePaymentSyncResultDTO `json:"results"`
	SyncedAt          time.Time                   `json:"synced_at"`
}

// FreeePaymentSyncResultDTO freee入金同期結果DTO
type FreeePaymentSyncResultDTO struct {
	FreeePaymentID int        `json:"freee_payment_id"`
	InvoiceID      *uuid.UUID `json:"invoice_id,omitempty"`
	InvoiceNumber  *string    `json:"invoice_number,omitempty"`
	ClientName     string     `json:"client_name"`
	Amount         int        `json:"amount"`
	PaymentDate    string     `json:"payment_date"`
	Status         string     `json:"status"`    // matched, unmatched, processed
	Operation      string     `json:"operation"` // updated, created, skipped
	Error          *string    `json:"error,omitempty"`
	Details        *string    `json:"details,omitempty"`
}

// FreeeSettingsDTO freee設定DTO
type FreeeSettingsDTO struct {
	CompanyID            int        `json:"company_id"`
	CompanyName          string     `json:"company_name"`
	AccessToken          string     `json:"access_token,omitempty"`  // セキュリティ上、実際の値は返さない
	RefreshToken         string     `json:"refresh_token,omitempty"` // セキュリティ上、実際の値は返さない
	TokenExpiresAt       time.Time  `json:"token_expires_at"`
	IsConnected          bool       `json:"is_connected"`
	LastSyncAt           *time.Time `json:"last_sync_at,omitempty"`
	AutoSyncEnabled      bool       `json:"auto_sync_enabled"`
	SyncInterval         int        `json:"sync_interval"` // 分単位
	DefaultAccountItemID *int       `json:"default_account_item_id,omitempty"`
	DefaultTaxCode       int        `json:"default_tax_code"`
	InvoiceLayout        string     `json:"invoice_layout"`
	TaxEntryMethod       string     `json:"tax_entry_method"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// UpdateFreeeSettingsRequest freee設定更新リクエスト
type UpdateFreeeSettingsRequest struct {
	AutoSyncEnabled      *bool   `json:"auto_sync_enabled,omitempty"`
	SyncInterval         *int    `json:"sync_interval,omitempty"`
	DefaultAccountItemID *int    `json:"default_account_item_id,omitempty"`
	DefaultTaxCode       *int    `json:"default_tax_code,omitempty"`
	InvoiceLayout        *string `json:"invoice_layout,omitempty"`
	TaxEntryMethod       *string `json:"tax_entry_method,omitempty"`
}

// FreeeStatusDTO freee接続状態DTO
type FreeeStatusDTO struct {
	IsConnected         bool       `json:"is_connected"`
	CompanyID           *int       `json:"company_id,omitempty"`
	CompanyName         *string    `json:"company_name,omitempty"`
	TokenExpiresAt      *time.Time `json:"token_expires_at,omitempty"`
	TokenExpiresIn      *int64     `json:"token_expires_in,omitempty"` // 秒単位
	IsTokenExpired      bool       `json:"is_token_expired"`
	LastSyncAt          *time.Time `json:"last_sync_at,omitempty"`
	LastSyncStatus      *string    `json:"last_sync_status,omitempty"` // success, failed
	PendingSyncs        int        `json:"pending_syncs"`
	TotalSyncedClients  int        `json:"total_synced_clients"`
	TotalSyncedInvoices int        `json:"total_synced_invoices"`
	SyncErrors          []string   `json:"sync_errors,omitempty"`
}

// FreeeWebhookRequest freeeWebhookリクエスト
type FreeeWebhookRequest struct {
	CompanyID    int                    `json:"company_id"`
	EventType    string                 `json:"event_type"` // invoice.created, invoice.updated, payment.created, etc.
	ResourceID   int                    `json:"resource_id"`
	ResourceType string                 `json:"resource_type"` // invoice, payment, partner
	OccurredAt   time.Time              `json:"occurred_at"`
	Data         map[string]interface{} `json:"data,omitempty"`
}

// FreeeWebhookResponse freeeWebhookレスポンス
type FreeeWebhookResponse struct {
	Status      string    `json:"status"` // processed, ignored, error
	Message     string    `json:"message,omitempty"`
	ProcessedAt time.Time `json:"processed_at"`
}

// FreeeErrorResponse freeeエラーレスポンス
type FreeeErrorResponse struct {
	StatusCode int                  `json:"status_code"`
	Type       string               `json:"type"`
	Messages   []string             `json:"messages"`
	Errors     []FreeeFieldErrorDTO `json:"errors,omitempty"`
	RequestID  string               `json:"request_id,omitempty"`
}

// FreeeFieldErrorDTO freeeフィールドエラーDTO
type FreeeFieldErrorDTO struct {
	Type     string   `json:"type"`
	Messages []string `json:"messages"`
	Code     string   `json:"code,omitempty"`
}

// Validate CreateFreeePartnerRequestのバリデーション
func (r *CreateFreeePartnerRequest) Validate() error {
	if r.CompanyID <= 0 {
		return fmt.Errorf("CompanyIDが不正です")
	}
	if len(r.Name) == 0 {
		return fmt.Errorf("取引先名は必須です")
	}
	if len(r.Name) > 255 {
		return fmt.Errorf("取引先名は255文字以内で入力してください")
	}
	return nil
}

// Validate CreateFreeeInvoiceRequestのバリデーション
func (r *CreateFreeeInvoiceRequest) Validate() error {
	if r.CompanyID <= 0 {
		return fmt.Errorf("CompanyIDが不正です")
	}
	if r.PartnerID <= 0 {
		return fmt.Errorf("PartnerIDが不正です")
	}
	if len(r.IssueDate) == 0 {
		return fmt.Errorf("発行日は必須です")
	}
	if len(r.InvoiceContents) == 0 {
		return fmt.Errorf("請求明細は最低1件必要です")
	}

	// 明細のバリデーション
	for i, content := range r.InvoiceContents {
		if content.Type == "normal" {
			if content.Qty <= 0 {
				return fmt.Errorf("明細%d: 数量は0より大きい値を入力してください", i+1)
			}
			if content.UnitPrice < 0 {
				return fmt.Errorf("明細%d: 単価は0以上の値を入力してください", i+1)
			}
		}
		if len(content.Description) == 0 {
			return fmt.Errorf("明細%d: 内容は必須です", i+1)
		}
	}

	return nil
}

// Validate FreeeClientSyncRequestのバリデーション
func (r *FreeeClientSyncRequest) Validate() error {
	if len(r.ClientIDs) == 0 {
		return fmt.Errorf("少なくとも1つのクライアントIDが必要です")
	}
	if len(r.ClientIDs) > 100 {
		return fmt.Errorf("一度に同期できるクライアント数は100件までです")
	}
	if r.CompanyID <= 0 {
		return fmt.Errorf("CompanyIDが不正です")
	}
	validSyncModes := map[string]bool{
		"create_only":   true,
		"update_only":   true,
		"create_update": true,
	}
	if !validSyncModes[r.SyncMode] {
		return fmt.Errorf("SyncModeが不正です")
	}
	return nil
}

// Validate FreeeInvoiceSyncRequestのバリデーション
func (r *FreeeInvoiceSyncRequest) Validate() error {
	if len(r.InvoiceIDs) == 0 {
		return fmt.Errorf("少なくとも1つの請求書IDが必要です")
	}
	if len(r.InvoiceIDs) > 50 {
		return fmt.Errorf("一度に同期できる請求書数は50件までです")
	}
	if r.CompanyID <= 0 {
		return fmt.Errorf("CompanyIDが不正です")
	}
	return nil
}

// FreeeAuthURLResponse freee認証URL生成レスポンス
type FreeeAuthURLResponse struct {
	AuthURL string `json:"auth_url"`
	State   string `json:"state"`
}

// FreeeConnectionTestResult freee接続テスト結果
type FreeeConnectionTestResult struct {
	IsConnected bool      `json:"is_connected"`
	CompanyID   *int      `json:"company_id,omitempty"`
	CompanyName *string   `json:"company_name,omitempty"`
	TestResult  string    `json:"test_result"` // success, failed, unauthorized
	Message     string    `json:"message,omitempty"`
	TestedAt    time.Time `json:"tested_at"`
}

// UpdateFreeePartnerRequest freee取引先更新リクエスト
type UpdateFreeePartnerRequest struct {
	Name                               *string                  `json:"name,omitempty"`
	NameKana                           *string                  `json:"name_kana,omitempty"`
	Shortcut                           *string                  `json:"shortcut,omitempty"`
	LongName                           *string                  `json:"long_name,omitempty"`
	OrgCode                            *int                     `json:"org_code,omitempty"`
	CountryCode                        *string                  `json:"country_code,omitempty"`
	QualifiedInvoiceRegistrationNumber *string                  `json:"qualified_invoice_registration_number,omitempty"`
	AddressAttributes                  *FreeeAddressDTO         `json:"address_attributes,omitempty"`
	ContactName                        *string                  `json:"contact_name,omitempty"`
	Email                              *string                  `json:"email,omitempty"`
	Phone                              *string                  `json:"phone,omitempty"`
	TransferFeeHandlingSide            *string                  `json:"transfer_fee_handling_side,omitempty"`
	PayerWalletAccountID               *int                     `json:"payer_wallet_account_id,omitempty"`
	TransferAccountID                  *int                     `json:"transfer_account_id,omitempty"`
	PartnerDocSettingAttributes        *FreeePartnerDocSettings `json:"partner_doc_setting_attributes,omitempty"`
}

// FreeSyncResult freee同期結果
type FreeSyncResult struct {
	Success     bool      `json:"success"`
	Message     string    `json:"message"`
	SyncedItems int       `json:"synced_items"`
	FailedItems int       `json:"failed_items"`
	TotalItems  int       `json:"total_items"`
	SyncedAt    time.Time `json:"synced_at"`
	Details     []string  `json:"details,omitempty"`
	Errors      []string  `json:"errors,omitempty"`
}

// FreeBatchSyncResult freee一括同期結果
type FreeBatchSyncResult struct {
	BatchID         string           `json:"batch_id"`
	Status          string           `json:"status"` // completed, failed, partial
	TotalRequests   int              `json:"total_requests"`
	SuccessfulSyncs int              `json:"successful_syncs"`
	FailedSyncs     int              `json:"failed_syncs"`
	StartedAt       time.Time        `json:"started_at"`
	CompletedAt     time.Time        `json:"completed_at"`
	SyncResults     []FreeSyncResult `json:"sync_results"`
	Summary         map[string]int   `json:"summary"`
}
