package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExpenseSummary 経費集計モデル
type ExpenseSummary struct {
	ID             uuid.UUID `gorm:"type:varchar(36);primary_key" json:"id"`
	UserID         uuid.UUID `gorm:"type:varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;not null" json:"user_id"`
	User           User      `gorm:"foreignKey:UserID" json:"user"`
	Year           int       `gorm:"not null" json:"year"`                      // 集計年
	Month          int       `gorm:"not null" json:"month"`                     // 集計月
	TotalAmount    int       `gorm:"not null;default:0" json:"total_amount"`    // 申請総額
	ApprovedAmount int       `gorm:"not null;default:0" json:"approved_amount"` // 承認済み金額
	PendingAmount  int       `gorm:"not null;default:0" json:"pending_amount"`  // 承認待ち金額
	ExpenseCount   int       `gorm:"not null;default:0" json:"expense_count"`   // 申請件数
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// BeforeCreate UUIDを生成
func (es *ExpenseSummary) BeforeCreate(tx *gorm.DB) error {
	if es.ID == uuid.Nil {
		es.ID = uuid.New()
	}
	return nil
}

// GetMonthPeriod 集計期間の開始・終了日時を取得
func (es *ExpenseSummary) GetMonthPeriod() (start time.Time, end time.Time) {
	start = time.Date(es.Year, time.Month(es.Month), 1, 0, 0, 0, 0, time.UTC)
	end = start.AddDate(0, 1, 0).Add(-time.Nanosecond) // 翌月の1日前まで
	return start, end
}

// GetYearPeriod 年次集計期間の開始・終了日時を取得
func GetYearPeriod(year int) (start time.Time, end time.Time) {
	start = time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	end = time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC).Add(-time.Nanosecond)
	return start, end
}

// CalculateYearlyTotal 年次合計を計算
func (es *ExpenseSummary) CalculateYearlyTotal(db *gorm.DB) (totalAmount, approvedAmount, pendingAmount int, err error) {
	var summaries []ExpenseSummary
	err = db.Where("user_id = ? AND year = ?", es.UserID, es.Year).Find(&summaries).Error
	if err != nil {
		return 0, 0, 0, err
	}

	for _, summary := range summaries {
		totalAmount += summary.TotalAmount
		approvedAmount += summary.ApprovedAmount
		pendingAmount += summary.PendingAmount
	}

	return totalAmount, approvedAmount, pendingAmount, nil
}

// UpdateAmounts 金額を更新
func (es *ExpenseSummary) UpdateAmounts(totalAmount, approvedAmount, pendingAmount int) {
	es.TotalAmount = totalAmount
	es.ApprovedAmount = approvedAmount
	es.PendingAmount = pendingAmount
}

// IsOverMonthlyLimit 月次制限を超過しているかチェック
func (es *ExpenseSummary) IsOverMonthlyLimit(monthlyLimit int) bool {
	return es.TotalAmount > monthlyLimit
}

// GetRemainingMonthlyLimit 月次制限の残り額を取得
func (es *ExpenseSummary) GetRemainingMonthlyLimit(monthlyLimit int) int {
	remaining := monthlyLimit - es.TotalAmount
	if remaining < 0 {
		return 0
	}
	return remaining
}

// ExpenseSummaryQuery 集計クエリ用の構造体
type ExpenseSummaryQuery struct {
	UserID    uuid.UUID
	Year      int
	Month     int
	StartDate *time.Time
	EndDate   *time.Time
}

// FindOrCreateSummary 集計レコードを取得または作成
func FindOrCreateSummary(db *gorm.DB, userID uuid.UUID, year, month int) (*ExpenseSummary, error) {
	var summary ExpenseSummary

	// 既存レコードを検索
	err := db.Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		First(&summary).Error

	if err == gorm.ErrRecordNotFound {
		// 新規作成
		summary = ExpenseSummary{
			UserID:         userID,
			Year:           year,
			Month:          month,
			TotalAmount:    0,
			ApprovedAmount: 0,
			PendingAmount:  0,
		}
		err = db.Create(&summary).Error
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	return &summary, nil
}

// RecalculateSummary 指定ユーザー・期間の集計を再計算
func RecalculateSummary(db *gorm.DB, userID uuid.UUID, year, month int) error {
	// 集計レコードを取得または作成
	summary, err := FindOrCreateSummary(db, userID, year, month)
	if err != nil {
		return err
	}

	// 期間の開始・終了日時を取得
	start, end := summary.GetMonthPeriod()

	// 経費データから集計を計算
	var totalAmount, approvedAmount, pendingAmount int

	// 総額を計算
	err = db.Model(&Expense{}).
		Where("user_id = ? AND expense_date BETWEEN ? AND ? AND deleted_at IS NULL", userID, start, end).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount).Error
	if err != nil {
		return err
	}

	// 承認済み金額を計算
	err = db.Model(&Expense{}).
		Where("user_id = ? AND expense_date BETWEEN ? AND ? AND status IN (?, ?) AND deleted_at IS NULL",
			userID, start, end, ExpenseStatusApproved, ExpenseStatusPaid).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&approvedAmount).Error
	if err != nil {
		return err
	}

	// 承認待ち金額を計算
	err = db.Model(&Expense{}).
		Where("user_id = ? AND expense_date BETWEEN ? AND ? AND status = ? AND deleted_at IS NULL",
			userID, start, end, ExpenseStatusSubmitted).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&pendingAmount).Error
	if err != nil {
		return err
	}

	// 集計を更新
	summary.UpdateAmounts(totalAmount, approvedAmount, pendingAmount)
	return db.Save(summary).Error
}
