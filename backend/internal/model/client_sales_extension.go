package model

import (
	"time"

	"github.com/google/uuid"
)

// BusinessStatus 取引ステータス
type BusinessStatus string

const (
	BusinessStatusActive    BusinessStatus = "active"    // 活発
	BusinessStatusInactive  BusinessStatus = "inactive"  // 非活発
	BusinessStatusSuspended BusinessStatus = "suspended" // 中断
)

// CompanySize 企業規模
type CompanySize string

const (
	CompanySizeSmall      CompanySize = "small"      // 小規模
	CompanySizeMedium     CompanySize = "medium"     // 中規模
	CompanySizeLarge      CompanySize = "large"      // 大規模
	CompanySizeEnterprise CompanySize = "enterprise" // エンタープライズ
)

// ClientSalesExtension 営業管理用のClient拡張フィールド
// 実際のデータベーススキーマに合わせて、Clientモデルにこれらのフィールドを追加する必要があります
type ClientSalesExtension struct {
	// 営業管理情報
	PrimarySalesRepID *uuid.UUID     `gorm:"type:varchar(36)" json:"primary_sales_rep_id,omitempty"`
	BusinessStatus    BusinessStatus `gorm:"type:enum('active','inactive','suspended');default:'active'" json:"business_status"`
	CompanySize       *CompanySize   `gorm:"type:enum('small','medium','large','enterprise')" json:"company_size,omitempty"`
	IndustryType      *string        `gorm:"size:100" json:"industry_type,omitempty"`

	// 取引履歴
	BusinessStartDate   *time.Time `json:"business_start_date,omitempty"`
	LastTransactionDate *time.Time `json:"last_transaction_date,omitempty"`
	AnnualRevenue       *int       `json:"annual_revenue,omitempty"` // 年間売上（万円）

	// 企業詳細
	WebsiteURL    *string `gorm:"size:255" json:"website_url,omitempty"`
	EmployeeCount *int    `json:"employee_count,omitempty"`
	CapitalAmount *int64  `json:"capital_amount,omitempty"`                // 資本金
	StockExchange *string `gorm:"size:50" json:"stock_exchange,omitempty"` // 上場取引所

	// Virtual fields（実際のDBカラムではない）
	ActiveProposalCount int        `gorm:"-" json:"active_proposal_count,omitempty"`
	TotalRevenue        int        `gorm:"-" json:"total_revenue,omitempty"`
	LastContactDate     *time.Time `gorm:"-" json:"last_contact_date,omitempty"`
	IsHighPriority      bool       `gorm:"-" json:"is_high_priority,omitempty"`
}

// GetCompanySizeByEmployeeCount 従業員数から企業規模を判定
func GetCompanySizeByEmployeeCount(count int) CompanySize {
	switch {
	case count < 50:
		return CompanySizeSmall
	case count < 300:
		return CompanySizeMedium
	case count < 1000:
		return CompanySizeLarge
	default:
		return CompanySizeEnterprise
	}
}

// IsActiveClient アクティブな取引先かチェック
func (c *ClientSalesExtension) IsActiveClient() bool {
	return c.BusinessStatus == BusinessStatusActive
}

// GetBusinessDuration 取引期間を取得（月数）
func (c *ClientSalesExtension) GetBusinessDuration() int {
	if c.BusinessStartDate == nil {
		return 0
	}

	endDate := time.Now()
	if c.LastTransactionDate != nil && c.LastTransactionDate.Before(endDate) {
		endDate = *c.LastTransactionDate
	}

	months := int(endDate.Sub(*c.BusinessStartDate).Hours() / 24 / 30)
	return months
}

// ShouldContactSoon 連絡が必要かチェック（最終取引から3ヶ月以上経過）
func (c *ClientSalesExtension) ShouldContactSoon() bool {
	if c.LastTransactionDate == nil {
		return false
	}

	threeMonthsAgo := time.Now().AddDate(0, -3, 0)
	return c.LastTransactionDate.Before(threeMonthsAgo)
}
