package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExpenseCategoryMaster 経費カテゴリマスタモデル
type ExpenseCategoryMaster struct {
	ID              uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	Code            string         `gorm:"size:50;not null;unique" json:"code"`   // カテゴリコード（transport, entertainment, etc.）
	Name            string         `gorm:"size:100;not null" json:"name"`         // カテゴリ名（旅費交通費、交際費、etc.）
	RequiresDetails bool           `gorm:"default:false" json:"requires_details"` // 詳細入力が必要かどうか
	IsActive        bool           `gorm:"default:true" json:"is_active"`         // 有効フラグ
	DisplayOrder    int            `gorm:"not null" json:"display_order"`         // 表示順序
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate UUIDを生成
func (ec *ExpenseCategoryMaster) BeforeCreate(tx *gorm.DB) error {
	if ec.ID == uuid.Nil {
		ec.ID = uuid.New()
	}
	return nil
}

// TableName GORMに使用するテーブル名を指定
func (ExpenseCategoryMaster) TableName() string {
	return "expense_categories"
}

// IsAvailable 利用可能かチェック
func (ec *ExpenseCategoryMaster) IsAvailable() bool {
	return ec.IsActive && ec.DeletedAt.Time.IsZero()
}

// 定義済みカテゴリコード定数
const (
	CategoryCodeTransport     = "transport"     // 旅費交通費
	CategoryCodeEntertainment = "entertainment" // 交際費
	CategoryCodeSupplies      = "supplies"      // 備品
	CategoryCodeBooks         = "books"         // 書籍
	CategoryCodeSeminar       = "seminar"       // セミナー
	CategoryCodeOther         = "other"         // その他
)

// GetDefaultCategories デフォルトカテゴリ設定を取得
func GetDefaultCategories() []ExpenseCategoryMaster {
	return []ExpenseCategoryMaster{
		{
			Code:            CategoryCodeTransport,
			Name:            "旅費交通費",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    1,
		},
		{
			Code:            CategoryCodeEntertainment,
			Name:            "交際費",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    2,
		},
		{
			Code:            CategoryCodeSupplies,
			Name:            "備品",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    3,
		},
		{
			Code:            CategoryCodeBooks,
			Name:            "書籍",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    4,
		},
		{
			Code:            CategoryCodeSeminar,
			Name:            "セミナー",
			RequiresDetails: false,
			IsActive:        true,
			DisplayOrder:    5,
		},
		{
			Code:            CategoryCodeOther,
			Name:            "その他",
			RequiresDetails: true, // その他は詳細入力必須
			IsActive:        true,
			DisplayOrder:    6,
		},
	}
}
