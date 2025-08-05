package service

import (
	"context"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/google/uuid"
)

// FreeeServiceInterface freeeサービスインターフェース（一時的な定義）
type FreeeServiceInterface interface {
	// OAuth認証
	GenerateAuthURL(ctx context.Context, redirectURI string) (*dto.FreeeAuthURLResponse, error)
	ExchangeCodeForToken(ctx context.Context, req *dto.FreeeOAuthRequest) (*dto.FreeeOAuthResponse, error)
	RefreshAccessToken(ctx context.Context, userID string) error
	RevokeToken(ctx context.Context, userID string) error

	// 設定管理
	GetFreeeSettings(ctx context.Context, userID string) (*dto.FreeeSettingsDTO, error)
	UpdateFreeeSettings(ctx context.Context, userID string, req *dto.UpdateFreeeSettingsRequest) error
	DeleteFreeeSettings(ctx context.Context, userID string) error

	// 接続管理
	GetConnectionStatus(ctx context.Context, userID string) (*dto.FreeeConnectionStatusDTO, error)
	TestConnection(ctx context.Context, userID string) (*dto.FreeeConnectionTestResult, error)

	// トークン管理
	GetValidAccessToken(ctx context.Context, userID string) (string, error)
	IsTokenExpired(tokenExpiresAt time.Time) bool
	ScheduleTokenRefresh(ctx context.Context, userID string) error

	// freee API クライアント
	// 取引先管理
	GetPartners(ctx context.Context, userID string) ([]*dto.FreeePartnerDTO, error)
	CreatePartner(ctx context.Context, userID string, req *dto.CreateFreeePartnerRequest) (*dto.FreeePartnerDTO, error)
	UpdatePartner(ctx context.Context, userID string, partnerID int, req *dto.UpdateFreeePartnerRequest) (*dto.FreeePartnerDTO, error)
	SyncPartner(ctx context.Context, userID string, clientID uuid.UUID) (*dto.FreeePartnerDTO, error)

	// 請求書管理
	GetInvoices(ctx context.Context, userID string, from, to *time.Time) ([]*dto.FreeeInvoiceDTO, error)
	CreateInvoice(ctx context.Context, userID string, req *dto.CreateFreeeInvoiceRequest) (*dto.FreeeInvoiceDTO, error)
	UpdateInvoice(ctx context.Context, userID string, invoiceID int, req *dto.UpdateFreeeInvoiceRequest) (*dto.FreeeInvoiceDTO, error)
	DeleteInvoice(ctx context.Context, userID string, invoiceID int) error
	SyncInvoice(ctx context.Context, userID string, invoiceID uuid.UUID) (*dto.FreeeInvoiceDTO, error)

	// 支払い情報管理
	GetPayments(ctx context.Context, userID string, from, to *time.Time) ([]*dto.FreeePaymentDTO, error)
	GetInvoicePayments(ctx context.Context, userID string, invoiceID int) ([]*dto.FreeePaymentDTO, error)

	// データ同期
	SyncAllData(ctx context.Context, userID string) (*dto.FreeSyncResult, error)
	SyncClients(ctx context.Context, userID string) (*dto.FreeSyncResult, error)
	SyncInvoices(ctx context.Context, userID string) (*dto.FreeSyncResult, error)

	// バッチ処理
	ProcessBatchSync(ctx context.Context, userIDs []string) ([]*dto.FreeBatchSyncResult, error)
}
