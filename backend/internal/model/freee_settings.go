package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FreeeSettings freee設定モデル
type FreeeSettings struct {
	ID                   uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	CreatedAt            time.Time      `gorm:"not null;default:current_timestamp" json:"created_at"`
	UpdatedAt            time.Time      `gorm:"not null;default:current_timestamp on update current_timestamp" json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	UserID               uuid.UUID      `gorm:"type:varchar(36);not null;uniqueIndex:idx_freee_settings_user" json:"user_id"`
	CompanyID            int            `gorm:"not null" json:"company_id"`
	CompanyName          string         `gorm:"size:255;not null" json:"company_name"`
	AccessToken          string         `gorm:"type:text;not null" json:"-"` // 暗号化されたトークン
	RefreshToken         string         `gorm:"type:text;not null" json:"-"` // 暗号化されたトークン
	TokenExpiresAt       time.Time      `gorm:"not null" json:"token_expires_at"`
	LastSyncAt           *time.Time     `json:"last_sync_at"`
	AutoSyncEnabled      bool           `gorm:"default:false" json:"auto_sync_enabled"`
	SyncInterval         int            `gorm:"default:60" json:"sync_interval"` // 分単位
	DefaultAccountItemID *int           `json:"default_account_item_id"`
	DefaultTaxCode       int            `gorm:"default:8" json:"default_tax_code"` // デフォルト消費税コード
	InvoiceLayout        string         `gorm:"size:50;default:'default_layout'" json:"invoice_layout"`
	TaxEntryMethod       string         `gorm:"size:50;default:'inclusive'" json:"tax_entry_method"` // inclusive, exclusive
	LastSyncStatus       *string        `gorm:"size:20" json:"last_sync_status"`                     // success, failed
	LastSyncError        *string        `gorm:"type:text" json:"last_sync_error"`
	SyncRetryCount       int            `gorm:"default:0" json:"sync_retry_count"`

	// リレーション
	User     *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	SyncLogs []*FreeSyncLog `gorm:"foreignKey:UserID;references:UserID" json:"sync_logs,omitempty"`
}

// BeforeCreate 作成前のフック
func (fs *FreeeSettings) BeforeCreate(tx *gorm.DB) error {
	// IDが未設定の場合は新規生成
	if fs.ID == uuid.Nil {
		fs.ID = uuid.New()
	}

	// デフォルト値を設定
	if fs.InvoiceLayout == "" {
		fs.InvoiceLayout = "default_layout"
	}
	if fs.TaxEntryMethod == "" {
		fs.TaxEntryMethod = "inclusive"
	}
	if fs.DefaultTaxCode == 0 {
		fs.DefaultTaxCode = 8 // 軽減税率対象外の消費税
	}
	if fs.SyncInterval == 0 {
		fs.SyncInterval = 60 // 60分
	}

	return nil
}

// IsTokenExpired トークンが期限切れかチェック
func (fs *FreeeSettings) IsTokenExpired() bool {
	// 5分のバッファを設ける
	return time.Now().Add(5 * time.Minute).After(fs.TokenExpiresAt)
}

// IsConnected freeeに接続されているかチェック
func (fs *FreeeSettings) IsConnected() bool {
	return !fs.IsTokenExpired()
}

// GetExpiresInSeconds トークンの残り有効時間を秒で取得
func (fs *FreeeSettings) GetExpiresInSeconds() int64 {
	if fs.IsTokenExpired() {
		return 0
	}
	return int64(time.Until(fs.TokenExpiresAt).Seconds())
}

// NeedsSyncRetry 同期リトライが必要かチェック
func (fs *FreeeSettings) NeedsSyncRetry() bool {
	if fs.LastSyncStatus == nil {
		return false
	}
	return *fs.LastSyncStatus == "failed" && fs.SyncRetryCount < 3
}

// CanAutoSync 自動同期可能かチェック
func (fs *FreeeSettings) CanAutoSync() bool {
	if !fs.AutoSyncEnabled {
		return false
	}
	if fs.IsTokenExpired() {
		return false
	}
	if fs.LastSyncAt == nil {
		return true
	}

	// 設定されたインターバル時間が経過しているかチェック
	nextSyncTime := fs.LastSyncAt.Add(time.Duration(fs.SyncInterval) * time.Minute)
	return time.Now().After(nextSyncTime)
}

// UpdateSyncStatus 同期ステータスを更新
func (fs *FreeeSettings) UpdateSyncStatus(status string, errorMessage *string) {
	now := time.Now()
	fs.LastSyncAt = &now
	fs.LastSyncStatus = &status
	fs.LastSyncError = errorMessage

	if status == "success" {
		fs.SyncRetryCount = 0
	} else if status == "failed" {
		fs.SyncRetryCount++
	}
}

// ResetSyncRetry 同期リトライ回数をリセット
func (fs *FreeeSettings) ResetSyncRetry() {
	fs.SyncRetryCount = 0
	fs.LastSyncError = nil
}

// GetSyncIntervalDuration 同期間隔をDurationで取得
func (fs *FreeeSettings) GetSyncIntervalDuration() time.Duration {
	return time.Duration(fs.SyncInterval) * time.Minute
}

// IsValidTaxEntryMethod 税額計算方法が有効かチェック
func (fs *FreeeSettings) IsValidTaxEntryMethod() bool {
	validMethods := []string{"inclusive", "exclusive"}
	for _, method := range validMethods {
		if fs.TaxEntryMethod == method {
			return true
		}
	}
	return false
}

// IsValidInvoiceLayout 請求書レイアウトが有効かチェック
func (fs *FreeeSettings) IsValidInvoiceLayout() bool {
	validLayouts := []string{"default_layout", "standard_layout", "custom_layout"}
	for _, layout := range validLayouts {
		if fs.InvoiceLayout == layout {
			return true
		}
	}
	return false
}

// GetSyncStatusDisplay 同期ステータスの表示用文字列を取得
func (fs *FreeeSettings) GetSyncStatusDisplay() string {
	if fs.LastSyncStatus == nil {
		return "未同期"
	}

	switch *fs.LastSyncStatus {
	case "success":
		return "同期済み"
	case "failed":
		return "同期失敗"
	case "in_progress":
		return "同期中"
	default:
		return "不明"
	}
}

// GetConnectionStatusDisplay 接続ステータスの表示用文字列を取得
func (fs *FreeeSettings) GetConnectionStatusDisplay() string {
	if fs.IsConnected() {
		return "接続中"
	}
	return "未接続"
}

// Validate freee設定のバリデーション
func (fs *FreeeSettings) Validate() error {
	if fs.UserID == uuid.Nil {
		return gorm.ErrInvalidData
	}
	if fs.CompanyID <= 0 {
		return gorm.ErrInvalidData
	}
	if fs.CompanyName == "" {
		return gorm.ErrInvalidData
	}
	if fs.AccessToken == "" {
		return gorm.ErrInvalidData
	}
	if fs.RefreshToken == "" {
		return gorm.ErrInvalidData
	}
	if !fs.IsValidTaxEntryMethod() {
		return gorm.ErrInvalidData
	}
	if !fs.IsValidInvoiceLayout() {
		return gorm.ErrInvalidData
	}
	if fs.SyncInterval <= 0 {
		return gorm.ErrInvalidData
	}

	return nil
}
