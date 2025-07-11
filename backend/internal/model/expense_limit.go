package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LimitType 制限種別
type LimitType string

const (
	// LimitTypeMonthly 月次制限
	LimitTypeMonthly LimitType = "monthly"
	// LimitTypeYearly 年次制限
	LimitTypeYearly LimitType = "yearly"
)

// LimitScope 制限適用範囲
type LimitScope string

const (
	// LimitScopeCompany 全社レベル
	LimitScopeCompany LimitScope = "company"
	// LimitScopeDepartment 部門レベル
	LimitScopeDepartment LimitScope = "department"
	// LimitScopeUser 個人レベル
	LimitScopeUser LimitScope = "user"
)

// ExpenseLimit 経費申請上限モデル
type ExpenseLimit struct {
	ID            uuid.UUID  `gorm:"type:varchar(36);primary_key" json:"id"`
	LimitType     LimitType  `gorm:"type:enum('monthly','yearly');not null" json:"limit_type"`             // 制限種別
	LimitScope    LimitScope `gorm:"type:enum('company','department','user');not null" json:"limit_scope"` // 制限適用範囲
	Amount        int        `gorm:"not null" json:"amount"`                                               // 上限金額（円）
	UserID        *uuid.UUID `gorm:"type:varchar(36);index" json:"user_id"`                                // 個人制限の場合のユーザーID
	DepartmentID  *uuid.UUID `gorm:"type:varchar(36);index" json:"department_id"`                          // 部門制限の場合の部門ID
	EffectiveFrom time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP(3)" json:"effective_from"`          // 適用開始日時
	CreatedBy     uuid.UUID  `gorm:"type:varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"created_by"`
	Creator       User       `gorm:"foreignKey:CreatedBy" json:"creator"`     // 設定者
	User          *User      `gorm:"foreignKey:UserID" json:"user,omitempty"` // 対象ユーザー（個人制限の場合）
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// BeforeCreate UUIDを生成
func (el *ExpenseLimit) BeforeCreate(tx *gorm.DB) error {
	if el.ID == uuid.Nil {
		el.ID = uuid.New()
	}
	return nil
}

// IsMonthly 月次制限かチェック
func (el *ExpenseLimit) IsMonthly() bool {
	return el.LimitType == LimitTypeMonthly
}

// IsYearly 年次制限かチェック
func (el *ExpenseLimit) IsYearly() bool {
	return el.LimitType == LimitTypeYearly
}

// IsEffective 指定日時に有効かチェック
func (el *ExpenseLimit) IsEffective(targetTime time.Time) bool {
	return !el.EffectiveFrom.After(targetTime)
}

// IsCompanyScope 全社レベルの制限かチェック
func (el *ExpenseLimit) IsCompanyScope() bool {
	return el.LimitScope == LimitScopeCompany
}

// IsDepartmentScope 部門レベルの制限かチェック
func (el *ExpenseLimit) IsDepartmentScope() bool {
	return el.LimitScope == LimitScopeDepartment
}

// IsUserScope 個人レベルの制限かチェック
func (el *ExpenseLimit) IsUserScope() bool {
	return el.LimitScope == LimitScopeUser
}

// IsApplicableTo 指定されたユーザーに適用可能かチェック
func (el *ExpenseLimit) IsApplicableTo(userID uuid.UUID, departmentID *uuid.UUID) bool {
	switch el.LimitScope {
	case LimitScopeCompany:
		return true // 全社制限はすべてのユーザーに適用
	case LimitScopeDepartment:
		return el.DepartmentID != nil && departmentID != nil && *el.DepartmentID == *departmentID
	case LimitScopeUser:
		return el.UserID != nil && *el.UserID == userID
	default:
		return false
	}
}

// GetScopeDescription 制限範囲の説明を取得
func (el *ExpenseLimit) GetScopeDescription() string {
	switch el.LimitScope {
	case LimitScopeCompany:
		return "全社"
	case LimitScopeDepartment:
		return "部門"
	case LimitScopeUser:
		return "個人"
	default:
		return "不明"
	}
}

// GetCurrentEffectiveLimits 現在有効な制限を取得するためのヘルパー関数（全社レベルのみ）
func GetCurrentEffectiveLimits(db *gorm.DB) (monthlyLimit *ExpenseLimit, yearlyLimit *ExpenseLimit, err error) {
	now := time.Now()

	// 月次制限を取得（全社レベルの最新の有効なもの）
	err = db.Where("limit_type = ? AND limit_scope = ? AND effective_from <= ?", LimitTypeMonthly, LimitScopeCompany, now).
		Order("effective_from DESC").
		First(&monthlyLimit).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, nil, err
	}

	// 年次制限を取得（全社レベルの最新の有効なもの）
	err = db.Where("limit_type = ? AND limit_scope = ? AND effective_from <= ?", LimitTypeYearly, LimitScopeCompany, now).
		Order("effective_from DESC").
		First(&yearlyLimit).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return monthlyLimit, nil, err
	}

	return monthlyLimit, yearlyLimit, nil
}

// GetEffectiveLimitsForUser 指定されたユーザーに適用される最も制限の厳しい制限を取得
func GetEffectiveLimitsForUser(db *gorm.DB, userID uuid.UUID, departmentID *uuid.UUID) (*ExpenseLimit, *ExpenseLimit, error) {
	now := time.Now()

	// 月次制限の候補を取得
	var monthlyLimits []ExpenseLimit
	query := db.Where("limit_type = ? AND effective_from <= ?", LimitTypeMonthly, now)

	// 適用可能な制限を取得（個人 > 部門 > 全社の優先順）
	if err := query.Where(
		"(limit_scope = ? AND user_id = ?) OR (limit_scope = ? AND department_id = ?) OR limit_scope = ?",
		LimitScopeUser, userID,
		LimitScopeDepartment, departmentID,
		LimitScopeCompany,
	).Order("effective_from DESC").Find(&monthlyLimits).Error; err != nil {
		return nil, nil, err
	}

	// 年次制限の候補を取得
	var yearlyLimits []ExpenseLimit
	if err := db.Where("limit_type = ? AND effective_from <= ?", LimitTypeYearly, now).Where(
		"(limit_scope = ? AND user_id = ?) OR (limit_scope = ? AND department_id = ?) OR limit_scope = ?",
		LimitScopeUser, userID,
		LimitScopeDepartment, departmentID,
		LimitScopeCompany,
	).Order("effective_from DESC").Find(&yearlyLimits).Error; err != nil {
		return nil, nil, err
	}

	// 最も制限の厳しい（金額の少ない）制限を選択
	var monthlyLimit, yearlyLimit *ExpenseLimit

	for _, limit := range monthlyLimits {
		if limit.IsApplicableTo(userID, departmentID) {
			if monthlyLimit == nil || limit.Amount < monthlyLimit.Amount {
				monthlyLimit = &limit
			}
		}
	}

	for _, limit := range yearlyLimits {
		if limit.IsApplicableTo(userID, departmentID) {
			if yearlyLimit == nil || limit.Amount < yearlyLimit.Amount {
				yearlyLimit = &limit
			}
		}
	}

	return monthlyLimit, yearlyLimit, nil
}

// DefaultLimits デフォルト制限値
const (
	DefaultMonthlyLimitAmount = 500000  // 50万円
	DefaultYearlyLimitAmount  = 2000000 // 200万円
)

// CreateDefaultLimits デフォルト制限を作成（全社レベル）
func CreateDefaultLimits(createdBy uuid.UUID) []ExpenseLimit {
	return []ExpenseLimit{
		{
			LimitType:     LimitTypeMonthly,
			LimitScope:    LimitScopeCompany,
			Amount:        DefaultMonthlyLimitAmount,
			EffectiveFrom: time.Now(),
			CreatedBy:     createdBy,
		},
		{
			LimitType:     LimitTypeYearly,
			LimitScope:    LimitScopeCompany,
			Amount:        DefaultYearlyLimitAmount,
			EffectiveFrom: time.Now(),
			CreatedBy:     createdBy,
		},
	}
}

// CreateUserLimit 個人制限を作成
func CreateUserLimit(limitType LimitType, amount int, userID uuid.UUID, createdBy uuid.UUID) ExpenseLimit {
	return ExpenseLimit{
		LimitType:     limitType,
		LimitScope:    LimitScopeUser,
		Amount:        amount,
		UserID:        &userID,
		EffectiveFrom: time.Now(),
		CreatedBy:     createdBy,
	}
}

// CreateDepartmentLimit 部門制限を作成
func CreateDepartmentLimit(limitType LimitType, amount int, departmentID uuid.UUID, createdBy uuid.UUID) ExpenseLimit {
	return ExpenseLimit{
		LimitType:     limitType,
		LimitScope:    LimitScopeDepartment,
		Amount:        amount,
		DepartmentID:  &departmentID,
		EffectiveFrom: time.Now(),
		CreatedBy:     createdBy,
	}
}

// CreateCompanyLimit 全社制限を作成
func CreateCompanyLimit(limitType LimitType, amount int, createdBy uuid.UUID) ExpenseLimit {
	return ExpenseLimit{
		LimitType:     limitType,
		LimitScope:    LimitScopeCompany,
		Amount:        amount,
		EffectiveFrom: time.Now(),
		CreatedBy:     createdBy,
	}
}
