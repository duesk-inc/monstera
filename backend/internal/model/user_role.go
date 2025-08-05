package model

import (
	"time"

	"github.com/google/uuid"
)

// UserRole ユーザーとロールの多対多関係を管理
type UserRole struct {
	ID        uuid.UUID `gorm:"type:varchar(255);primaryKey" json:"id"` // テストで必要なIDフィールド
	UserID string `gorm:"type:varchar(255);primaryKey" json:"user_id"`
	RoleID    int       `gorm:"type:tinyint;primaryKey" json:"role_id"` // テストで必要なRoleIDフィールド
	Role      Role      `gorm:"type:tinyint;primaryKey" json:"role"`
	CreatedAt time.Time `json:"created_at"`

	// リレーション
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName テーブル名を指定
func (UserRole) TableName() string {
	return "user_roles"
}
