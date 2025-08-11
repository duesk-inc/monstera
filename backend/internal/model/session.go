package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Session セッション情報
type Session struct {
	ID           string         `gorm:"type:varchar(255);primary_key" json:"id"`
	UserID       string         `gorm:"type:varchar(255);not null;index" json:"user_id"`
	RefreshToken string         `gorm:"type:text;not null;unique" json:"refresh_token"`
	UserAgent    string         `gorm:"type:varchar(255)" json:"user_agent"`
	IPAddress    string         `gorm:"type:varchar(45)" json:"ip_address"`
	ExpiresAt    time.Time      `gorm:"not null;index" json:"expires_at"`
	LastUsedAt   time.Time      `gorm:"not null" json:"last_used_at"`
	CreatedAt    time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"not null" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// リレーション
	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"user,omitempty"`
}

// BeforeCreate UUIDを自動生成
func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	if s.CreatedAt.IsZero() {
		s.CreatedAt = time.Now()
	}
	if s.UpdatedAt.IsZero() {
		s.UpdatedAt = time.Now()
	}
	if s.LastUsedAt.IsZero() {
		s.LastUsedAt = time.Now()
	}
	return nil
}

// BeforeUpdate 更新時刻を自動設定
func (s *Session) BeforeUpdate(tx *gorm.DB) error {
	s.UpdatedAt = time.Now()
	return nil
}

// IsExpired セッションが期限切れかチェック
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// UpdateLastUsed 最終使用時刻を更新
func (s *Session) UpdateLastUsed() {
	s.LastUsedAt = time.Now()
}
