package dto

import (
	"time"
)

// NotificationResponse は通知のレスポンスDTO
type NotificationResponse struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Message          string     `json:"message"`
	NotificationType string     `json:"notification_type"`
	Priority         string     `json:"priority"`
	CreatedAt        time.Time  `json:"created_at"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	ReferenceID      *string    `json:"reference_id,omitempty"`
	ReferenceType    *string    `json:"reference_type,omitempty"`
}

// UserNotificationResponse はユーザー通知のレスポンスDTO
type UserNotificationResponse struct {
	ID           string               `json:"id"`
	Notification NotificationResponse `json:"notification"`
	IsRead       bool                 `json:"is_read"`
	ReadAt       *time.Time           `json:"read_at,omitempty"`
	CreatedAt    time.Time            `json:"created_at"`
}

// UserNotificationListResponse はユーザー通知一覧のレスポンスDTO
type UserNotificationListResponse struct {
	Notifications []UserNotificationResponse `json:"notifications"`
	UnreadCount   int                        `json:"unread_count"`
	TotalCount    int                        `json:"total_count"`
}

// NotificationSettingResponse は通知設定のレスポンスDTO
type NotificationSettingResponse struct {
	ID               string    `json:"id"`
	NotificationType string    `json:"notification_type"`
	IsEnabled        bool      `json:"is_enabled"`
	EmailEnabled     bool      `json:"email_enabled"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// NotificationSettingsListResponse は通知設定一覧のレスポンスDTO
type NotificationSettingsListResponse struct {
	Settings []NotificationSettingResponse `json:"settings"`
}

// MarkAsReadRequest は通知を既読にするリクエストDTO
type MarkAsReadRequest struct {
	NotificationIDs []string `json:"notification_ids" binding:"required"`
}

// UpdateNotificationSettingRequest は通知設定を更新するリクエストDTO
type UpdateNotificationSettingRequest struct {
	NotificationType string `json:"notification_type" binding:"required,oneof=leave expense weekly project system"`
	IsEnabled        bool   `json:"is_enabled"`
	EmailEnabled     bool   `json:"email_enabled"`
}

// CreateNotificationRequest は通知を作成するリクエストDTO
type CreateNotificationRequest struct {
	Title            string     `json:"title" binding:"required"`
	Message          string     `json:"message" binding:"required"`
	NotificationType string     `json:"notification_type" binding:"required,oneof=leave expense weekly project system"`
	Priority         string     `json:"priority" binding:"omitempty,oneof=low medium high"`
	UserIDs          []string   `json:"user_ids" binding:"required"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	ReferenceID      *string    `json:"reference_id,omitempty"`
	ReferenceType    *string    `json:"reference_type,omitempty"`
}
