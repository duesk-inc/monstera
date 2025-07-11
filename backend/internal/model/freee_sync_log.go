package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FreeSyncType freee同期タイプ
type FreeSyncType string

const (
	// FreeSyncTypeInvoiceCreate 請求書作成
	FreeSyncTypeInvoiceCreate FreeSyncType = "invoice_create"
	// FreeSyncTypeInvoiceUpdate 請求書更新
	FreeSyncTypeInvoiceUpdate FreeSyncType = "invoice_update"
	// FreeSyncTypePaymentSync 入金情報同期
	FreeSyncTypePaymentSync FreeSyncType = "payment_sync"
	// FreeSyncTypeClientSync 取引先同期
	FreeSyncTypeClientSync FreeSyncType = "client_sync"
)

const (
	// FreeSyncStatusSuccess 成功
	FreeSyncStatusSuccess FreeSyncStatus = "success"
)

// FreeSyncRequestData リクエストデータ構造体
type FreeSyncRequestData map[string]interface{}

// FreeSyncResponseData レスポンスデータ構造体
type FreeSyncResponseData map[string]interface{}

// FreeSyncLog freee同期ログモデル
type FreeSyncLog struct {
	ID           uuid.UUID             `gorm:"type:varchar(36);primary_key" json:"id"`
	SyncType     FreeSyncType          `gorm:"type:enum('invoice_create','invoice_update','payment_sync','client_sync');not null" json:"sync_type"`
	TargetID     *uuid.UUID            `gorm:"type:varchar(36)" json:"target_id"`
	FreeeID      *int                  `json:"freee_id"`
	Status       FreeSyncStatus        `gorm:"type:enum('success','failed','pending');not null" json:"status"`
	ErrorMessage *string               `gorm:"type:text" json:"error_message"`
	RequestData  *FreeSyncRequestData  `gorm:"type:json" json:"request_data"`
	ResponseData *FreeSyncResponseData `gorm:"type:json" json:"response_data"`
	CreatedAt    time.Time             `json:"created_at"`
}

// BeforeCreate UUIDを生成
func (fsl *FreeSyncLog) BeforeCreate(tx *gorm.DB) error {
	if fsl.ID == uuid.Nil {
		fsl.ID = uuid.New()
	}
	return nil
}

// TableName テーブル名を明示的に指定
func (FreeSyncLog) TableName() string {
	return "freee_sync_logs"
}

// Scan FreeSyncRequestDataのスキャン実装
func (frd *FreeSyncRequestData) Scan(value interface{}) error {
	if value == nil {
		*frd = make(FreeSyncRequestData)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, frd)
	case string:
		return json.Unmarshal([]byte(v), frd)
	default:
		return fmt.Errorf("cannot scan %T into FreeSyncRequestData", value)
	}
}

// Value FreeSyncRequestDataの値取得実装
func (frd FreeSyncRequestData) Value() (driver.Value, error) {
	if frd == nil {
		return nil, nil
	}
	return json.Marshal(frd)
}

// Scan FreeSyncResponseDataのスキャン実装
func (frd *FreeSyncResponseData) Scan(value interface{}) error {
	if value == nil {
		*frd = make(FreeSyncResponseData)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, frd)
	case string:
		return json.Unmarshal([]byte(v), frd)
	default:
		return fmt.Errorf("cannot scan %T into FreeSyncResponseData", value)
	}
}

// Value FreeSyncResponseDataの値取得実装
func (frd FreeSyncResponseData) Value() (driver.Value, error) {
	if frd == nil {
		return nil, nil
	}
	return json.Marshal(frd)
}

// FreeSyncLogSummary freee同期ログサマリー
type FreeSyncLogSummary struct {
	SyncType     FreeSyncType `json:"sync_type"`
	TotalCount   int          `json:"total_count"`
	SuccessCount int          `json:"success_count"`
	FailedCount  int          `json:"failed_count"`
	PendingCount int          `json:"pending_count"`
	LastSyncAt   *time.Time   `json:"last_sync_at"`
}

// FreeSyncLogStats freee同期統計
type FreeSyncLogStats struct {
	TotalSyncs      int        `json:"total_syncs"`
	SuccessRate     float64    `json:"success_rate"`
	TodaysSyncs     int        `json:"todays_syncs"`
	RecentFailures  int        `json:"recent_failures"`
	LastSuccessSync *time.Time `json:"last_success_sync"`
	LastFailedSync  *time.Time `json:"last_failed_sync"`
}

// IsSuccess 同期が成功したかチェック
func (fsl *FreeSyncLog) IsSuccess() bool {
	return fsl.Status == FreeSyncStatusSuccess
}

// IsFailed 同期が失敗したかチェック
func (fsl *FreeSyncLog) IsFailed() bool {
	return fsl.Status == FreeSyncStatusFailed
}

// IsPending 同期が処理中かチェック
func (fsl *FreeSyncLog) IsPending() bool {
	return fsl.Status == FreeSyncStatusPending
}

// HasError エラーメッセージがあるかチェック
func (fsl *FreeSyncLog) HasError() bool {
	return fsl.ErrorMessage != nil && *fsl.ErrorMessage != ""
}

// GetErrorMessage エラーメッセージを安全に取得
func (fsl *FreeSyncLog) GetErrorMessage() string {
	if fsl.ErrorMessage == nil {
		return ""
	}
	return *fsl.ErrorMessage
}

// SetErrorMessage エラーメッセージを設定
func (fsl *FreeSyncLog) SetErrorMessage(message string) {
	fsl.ErrorMessage = &message
}

// GetRequestDataAsString リクエストデータを文字列として取得
func (fsl *FreeSyncLog) GetRequestDataAsString() string {
	if fsl.RequestData == nil {
		return ""
	}
	data, err := json.MarshalIndent(*fsl.RequestData, "", "  ")
	if err != nil {
		return ""
	}
	return string(data)
}

// GetResponseDataAsString レスポンスデータを文字列として取得
func (fsl *FreeSyncLog) GetResponseDataAsString() string {
	if fsl.ResponseData == nil {
		return ""
	}
	data, err := json.MarshalIndent(*fsl.ResponseData, "", "  ")
	if err != nil {
		return ""
	}
	return string(data)
}
