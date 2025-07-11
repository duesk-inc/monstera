package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TechCategory 技術カテゴリ
type TechCategory string

const (
	// TechCategoryProgrammingLanguages プログラミング言語
	TechCategoryProgrammingLanguages TechCategory = "programming_languages"
	// TechCategoryServersDatabases サーバー・データベース
	TechCategoryServersDatabases TechCategory = "servers_databases"
	// TechCategoryTools ツール
	TechCategoryTools TechCategory = "tools"
)

// TechnologyMaster 技術マスタ
type TechnologyMaster struct {
	ID          uuid.UUID    `gorm:"type:char(36);primaryKey" json:"id"`
	Category    TechCategory `gorm:"type:enum('programming_languages','servers_databases','tools');not null" json:"category"`
	Name        string       `gorm:"type:varchar(100);not null" json:"name"`
	DisplayName string       `gorm:"type:varchar(100)" json:"display_name"`
	Aliases     string       `gorm:"type:text" json:"aliases"`
	Description string       `gorm:"type:text" json:"description"`
	UsageCount  int          `gorm:"default:0" json:"usage_count"`
	IsActive    bool         `gorm:"default:true" json:"is_active"`
	SortOrder   int          `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time    `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time    `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName テーブル名を指定
func (TechnologyMaster) TableName() string {
	return "technology_master"
}

// BeforeCreate UUID自動生成
func (t *TechnologyMaster) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// GetAliasesList エイリアスのリストを取得
func (t *TechnologyMaster) GetAliasesList() []string {
	return SplitCSV(t.Aliases)
}

// SetAliasesList エイリアスのリストを設定
func (t *TechnologyMaster) SetAliasesList(aliases []string) {
	t.Aliases = JoinCSV(aliases)
}

// IncrementUsageCount 使用回数をインクリメント
func (t *TechnologyMaster) IncrementUsageCount(tx *gorm.DB) error {
	return tx.Model(t).Update("usage_count", gorm.Expr("usage_count + ?", 1)).Error
}

// TechnologyCategoryInfo カテゴリ情報
type TechnologyCategoryInfo struct {
	Name        string `json:"name"`         // カテゴリ名（内部値）
	DisplayName string `json:"display_name"` // 表示名
	Description string `json:"description"`  // 説明
	Count       int32  `json:"count"`        // 技術数
	SortOrder   int32  `json:"sort_order"`   // ソート順
}
