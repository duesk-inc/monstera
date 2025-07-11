package dto

import "time"

// FreeeConnectionStatusDTO freee接続状態DTO（一時的な定義）
type FreeeConnectionStatusDTO struct {
	IsConnected    bool       `json:"is_connected"`
	CompanyID      *int       `json:"company_id,omitempty"`
	CompanyName    *string    `json:"company_name,omitempty"`
	TokenExpiresAt *time.Time `json:"token_expires_at,omitempty"`
	LastSyncAt     *time.Time `json:"last_sync_at,omitempty"`
}
