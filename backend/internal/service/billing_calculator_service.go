package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// BillingCalculatorServiceInterface 精算計算サービスインターフェース
type BillingCalculatorServiceInterface interface {
	// 稼働時間計算
	CalculateActualHours(ctx context.Context, userID, projectID uuid.UUID, year, month int) (*ActualHoursResult, error)
	CalculateDailyHours(ctx context.Context, userID, projectID uuid.UUID, date time.Time) (float64, error)
	GetMonthlyWorkDays(year, month int) int
	GetBusinessDaysInMonth(year, month int) int

	// 請求額計算
	CalculateFixedBilling(monthlyRate float64) float64
	CalculateUpperLowerBilling(monthlyRate, actualHours, lowerLimit, upperLimit float64) (*UpperLowerBillingResult, error)
	CalculateMiddleValueBilling(monthlyRate, actualHours, lowerLimit, upperLimit float64) (*MiddleValueBillingResult, error)

	// 精算調整計算
	CalculateAdjustment(baseAmount, adjustmentRate float64, adjustmentType AdjustmentType) float64
	CalculateOvertime(regularHours, overtimeHours, hourlyRate, overtimeRate float64) float64
	CalculateDeduction(baseAmount float64, absenceDays, totalDays int) float64

	// 税額計算
	CalculateTax(amount, taxRate float64) float64
	CalculateTaxIncluded(amount, taxRate float64) float64
	RoundAmount(amount float64, roundingType RoundingType) float64
}

// ActualHoursResult 実稼働時間計算結果
type ActualHoursResult struct {
	TotalHours     float64
	RegularHours   float64
	OvertimeHours  float64
	WeekdayHours   float64
	WeekendHours   float64
	HolidayHours   float64
	DailyBreakdown map[string]float64 // 日付ごとの稼働時間
	WorkDays       int
	AbsenceDays    int
}

// UpperLowerBillingResult 上下割請求計算結果
type UpperLowerBillingResult struct {
	BillingAmount  float64
	BillingType    string // "fixed", "lower", "upper"
	ActualHours    float64
	ThresholdHours float64
	HourlyRate     float64
	Explanation    string
}

// MiddleValueBillingResult 中間値請求計算結果
type MiddleValueBillingResult struct {
	BillingAmount   float64
	ActualHours     float64
	MiddleHours     float64
	HourlyRate      float64
	Variance        float64 // 中間値からの差異
	VariancePercent float64
	Explanation     string
}

// AdjustmentType 調整タイプ
type AdjustmentType string

const (
	AdjustmentTypeIncrease AdjustmentType = "increase" // 増額
	AdjustmentTypeDecrease AdjustmentType = "decrease" // 減額
)

// RoundingType 端数処理タイプ
type RoundingType string

const (
	RoundingTypeFloor   RoundingType = "floor"    // 切り捨て
	RoundingTypeCeil    RoundingType = "ceil"     // 切り上げ
	RoundingTypeRound   RoundingType = "round"    // 四捨五入
	RoundingTypeNoRound RoundingType = "no_round" // 端数処理なし
)

// billingCalculatorService 精算計算サービス実装
type billingCalculatorService struct {
	db             *gorm.DB
	logger         *zap.Logger
	workRecordRepo WorkRecordRepositoryInterface
	holidayRepo    HolidayRepositoryInterface
	assignmentRepo ProjectAssignmentRepositoryInterface
}

// NewBillingCalculatorService 精算計算サービスのコンストラクタ
func NewBillingCalculatorService(
	db *gorm.DB,
	logger *zap.Logger,
	workRecordRepo WorkRecordRepositoryInterface,
	holidayRepo HolidayRepositoryInterface,
	assignmentRepo ProjectAssignmentRepositoryInterface,
) BillingCalculatorServiceInterface {
	return &billingCalculatorService{
		db:             db,
		logger:         logger,
		workRecordRepo: workRecordRepo,
		holidayRepo:    holidayRepo,
		assignmentRepo: assignmentRepo,
	}
}

// CalculateActualHours 実稼働時間を計算
func (s *billingCalculatorService) CalculateActualHours(ctx context.Context, userID, projectID uuid.UUID, year, month int) (*ActualHoursResult, error) {
	result := &ActualHoursResult{
		DailyBreakdown: make(map[string]float64),
	}

	// 月の開始日と終了日を取得
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	// 勤務記録を取得
	workRecords, err := s.workRecordRepo.FindByUserAndProject(ctx, userID, projectID, startDate, endDate)
	if err != nil {
		s.logger.Error("Failed to get work records", zap.Error(err))
		return nil, fmt.Errorf("勤務記録の取得に失敗しました: %w", err)
	}

	// 祝日情報を取得
	holidays, err := s.holidayRepo.FindByMonth(ctx, year, month)
	if err != nil {
		s.logger.Error("Failed to get holidays", zap.Error(err))
		// エラーでも処理を継続（祝日なしとして扱う）
		holidays = make([]*model.Holiday, 0)
	}

	// 祝日マップを作成
	holidayMap := make(map[string]bool)
	for _, holiday := range holidays {
		holidayMap[holiday.Date.Format("2006-01-02")] = true
	}

	// 各日の稼働時間を計算
	for _, record := range workRecords {
		dateStr := record.WorkDate.Format("2006-01-02")
		hours := s.calculateDailyHoursFromRecord(record)

		result.DailyBreakdown[dateStr] = hours
		result.TotalHours += hours

		// 曜日と祝日の判定
		weekday := record.WorkDate.Weekday()
		isHoliday := holidayMap[dateStr]

		if isHoliday {
			result.HolidayHours += hours
		} else if weekday == time.Saturday || weekday == time.Sunday {
			result.WeekendHours += hours
		} else {
			result.WeekdayHours += hours
		}

		// 通常勤務時間と残業時間の計算（8時間を基準）
		if hours > 8.0 {
			result.RegularHours += 8.0
			result.OvertimeHours += hours - 8.0
		} else {
			result.RegularHours += hours
		}

		if hours > 0 {
			result.WorkDays++
		}
	}

	// 欠勤日数を計算（営業日 - 勤務日数）
	businessDays := s.GetBusinessDaysInMonth(year, month)
	result.AbsenceDays = businessDays - result.WorkDays
	if result.AbsenceDays < 0 {
		result.AbsenceDays = 0
	}

	return result, nil
}

// CalculateDailyHours 日次稼働時間を計算
func (s *billingCalculatorService) CalculateDailyHours(ctx context.Context, userID, projectID uuid.UUID, date time.Time) (float64, error) {
	record, err := s.workRecordRepo.FindByDate(ctx, userID, projectID, date)
	if err != nil {
		return 0, fmt.Errorf("勤務記録の取得に失敗しました: %w", err)
	}

	if record == nil {
		return 0, nil
	}

	return s.calculateDailyHoursFromRecord(record), nil
}

// GetMonthlyWorkDays 月の総日数を取得
func (s *billingCalculatorService) GetMonthlyWorkDays(year, month int) int {
	// 翌月の1日から1日引いて月末日を取得
	lastDay := time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC)
	return lastDay.Day()
}

// GetBusinessDaysInMonth 月の営業日数を取得
func (s *billingCalculatorService) GetBusinessDaysInMonth(year, month int) int {
	businessDays := 0
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	// 祝日を取得（エラーの場合は無視）
	holidays, _ := s.holidayRepo.FindByMonth(context.Background(), year, month)
	holidayMap := make(map[string]bool)
	for _, holiday := range holidays {
		holidayMap[holiday.Date.Format("2006-01-02")] = true
	}

	// 各日をチェック
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		weekday := d.Weekday()
		dateStr := d.Format("2006-01-02")

		// 平日かつ祝日でない場合
		if weekday != time.Saturday && weekday != time.Sunday && !holidayMap[dateStr] {
			businessDays++
		}
	}

	return businessDays
}

// CalculateFixedBilling 固定額請求を計算
func (s *billingCalculatorService) CalculateFixedBilling(monthlyRate float64) float64 {
	return monthlyRate
}

// CalculateUpperLowerBilling 上下割請求を計算
func (s *billingCalculatorService) CalculateUpperLowerBilling(monthlyRate, actualHours, lowerLimit, upperLimit float64) (*UpperLowerBillingResult, error) {
	if lowerLimit >= upperLimit {
		return nil, fmt.Errorf("下限値は上限値より小さくなければなりません")
	}

	result := &UpperLowerBillingResult{
		ActualHours: actualHours,
	}

	if actualHours < lowerLimit {
		// 下限を下回る場合
		hourlyRate := monthlyRate / lowerLimit
		result.BillingAmount = hourlyRate * actualHours
		result.BillingType = "lower"
		result.ThresholdHours = lowerLimit
		result.HourlyRate = hourlyRate
		result.Explanation = fmt.Sprintf("実績（%.1fh）が下限（%.1fh）を下回るため、時間単価（¥%.0f）で計算",
			actualHours, lowerLimit, hourlyRate)

	} else if actualHours > upperLimit {
		// 上限を上回る場合
		hourlyRate := monthlyRate / upperLimit
		result.BillingAmount = hourlyRate * actualHours
		result.BillingType = "upper"
		result.ThresholdHours = upperLimit
		result.HourlyRate = hourlyRate
		result.Explanation = fmt.Sprintf("実績（%.1fh）が上限（%.1fh）を上回るため、時間単価（¥%.0f）で計算",
			actualHours, upperLimit, hourlyRate)

	} else {
		// 範囲内の場合は固定額
		result.BillingAmount = monthlyRate
		result.BillingType = "fixed"
		result.ThresholdHours = 0
		result.HourlyRate = 0
		result.Explanation = fmt.Sprintf("実績（%.1fh）が範囲内（%.1fh〜%.1fh）のため、固定額を適用",
			actualHours, lowerLimit, upperLimit)
	}

	return result, nil
}

// CalculateMiddleValueBilling 中間値請求を計算
func (s *billingCalculatorService) CalculateMiddleValueBilling(monthlyRate, actualHours, lowerLimit, upperLimit float64) (*MiddleValueBillingResult, error) {
	if lowerLimit >= upperLimit {
		return nil, fmt.Errorf("下限値は上限値より小さくなければなりません")
	}

	// 中間値を計算
	middleHours := (lowerLimit + upperLimit) / 2
	hourlyRate := monthlyRate / middleHours

	result := &MiddleValueBillingResult{
		ActualHours:   actualHours,
		MiddleHours:   middleHours,
		HourlyRate:    hourlyRate,
		BillingAmount: hourlyRate * actualHours,
		Variance:      actualHours - middleHours,
	}

	// 差異率を計算
	if middleHours > 0 {
		result.VariancePercent = (result.Variance / middleHours) * 100
	}

	// 説明文を生成
	if result.Variance > 0 {
		result.Explanation = fmt.Sprintf("実績（%.1fh）が中間値（%.1fh）を%.1f%%上回っています",
			actualHours, middleHours, result.VariancePercent)
	} else if result.Variance < 0 {
		result.Explanation = fmt.Sprintf("実績（%.1fh）が中間値（%.1fh）を%.1f%%下回っています",
			actualHours, middleHours, math.Abs(result.VariancePercent))
	} else {
		result.Explanation = fmt.Sprintf("実績（%.1fh）が中間値（%.1fh）と一致しています",
			actualHours, middleHours)
	}

	return result, nil
}

// CalculateAdjustment 精算調整を計算
func (s *billingCalculatorService) CalculateAdjustment(baseAmount, adjustmentRate float64, adjustmentType AdjustmentType) float64 {
	adjustment := baseAmount * (adjustmentRate / 100)

	switch adjustmentType {
	case AdjustmentTypeIncrease:
		return baseAmount + adjustment
	case AdjustmentTypeDecrease:
		return baseAmount - adjustment
	default:
		return baseAmount
	}
}

// CalculateOvertime 残業代を計算
func (s *billingCalculatorService) CalculateOvertime(regularHours, overtimeHours, hourlyRate, overtimeRate float64) float64 {
	regularAmount := regularHours * hourlyRate
	overtimeAmount := overtimeHours * hourlyRate * (overtimeRate / 100)
	return regularAmount + overtimeAmount
}

// CalculateDeduction 欠勤控除を計算
func (s *billingCalculatorService) CalculateDeduction(baseAmount float64, absenceDays, totalDays int) float64 {
	if totalDays == 0 || absenceDays <= 0 {
		return baseAmount
	}

	dailyRate := baseAmount / float64(totalDays)
	deduction := dailyRate * float64(absenceDays)
	return baseAmount - deduction
}

// CalculateTax 税額を計算（税抜き金額から）
func (s *billingCalculatorService) CalculateTax(amount, taxRate float64) float64 {
	return amount * (taxRate / 100)
}

// CalculateTaxIncluded 税込み金額を計算
func (s *billingCalculatorService) CalculateTaxIncluded(amount, taxRate float64) float64 {
	return amount * (1 + taxRate/100)
}

// RoundAmount 金額の端数処理
func (s *billingCalculatorService) RoundAmount(amount float64, roundingType RoundingType) float64 {
	switch roundingType {
	case RoundingTypeFloor:
		return math.Floor(amount)
	case RoundingTypeCeil:
		return math.Ceil(amount)
	case RoundingTypeRound:
		return math.Round(amount)
	case RoundingTypeNoRound:
		return amount
	default:
		return amount
	}
}

// calculateDailyHoursFromRecord 勤務記録から日次稼働時間を計算
func (s *billingCalculatorService) calculateDailyHoursFromRecord(record *model.WorkRecord) float64 {
	if record.StartTime == nil || record.EndTime == nil {
		return 0
	}

	// 開始時刻と終了時刻の差を計算
	duration := record.EndTime.Sub(*record.StartTime)
	hours := duration.Hours()

	// 休憩時間を減算
	if record.BreakMinutes > 0 {
		hours -= float64(record.BreakMinutes) / 60
	}

	// マイナスにならないように調整
	if hours < 0 {
		hours = 0
	}

	// 小数点第2位で四捨五入
	return math.Round(hours*100) / 100
}

// WorkRecordRepositoryInterface 勤務記録リポジトリインターフェース（仮定）
type WorkRecordRepositoryInterface interface {
	FindByUserAndProject(ctx context.Context, userID, projectID uuid.UUID, startDate, endDate time.Time) ([]*model.WorkRecord, error)
	FindByDate(ctx context.Context, userID, projectID uuid.UUID, date time.Time) (*model.WorkRecord, error)
}

// HolidayRepositoryInterface 祝日リポジトリインターフェース（仮定）
type HolidayRepositoryInterface interface {
	FindByMonth(ctx context.Context, year, month int) ([]*model.Holiday, error)
}

// ProjectAssignmentRepositoryInterface プロジェクトアサインメントリポジトリインターフェース（仮定）
type ProjectAssignmentRepositoryInterface interface {
	FindByUserAndProject(ctx context.Context, userID, projectID uuid.UUID) (*model.ProjectAssignment, error)
}
