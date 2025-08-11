package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// ========== モック実装 ==========

// MockWorkRecordRepository モック勤務記録リポジトリ
type MockWorkRecordRepository struct {
	mock.Mock
}

func (m *MockWorkRecordRepository) FindByUserAndProject(ctx context.Context, userID, projectID string, startDate, endDate time.Time) ([]*model.WorkRecord, error) {
	args := m.Called(ctx, userID, projectID, startDate, endDate)
	return args.Get(0).([]*model.WorkRecord), args.Error(1)
}

func (m *MockWorkRecordRepository) FindByDate(ctx context.Context, userID, projectID string, date time.Time) (*model.WorkRecord, error) {
	args := m.Called(ctx, userID, projectID, date)
	return args.Get(0).(*model.WorkRecord), args.Error(1)
}

// MockHolidayRepository モック祝日リポジトリ
type MockHolidayRepository struct {
	mock.Mock
}

func (m *MockHolidayRepository) FindByMonth(ctx context.Context, year, month int) ([]*model.Holiday, error) {
	args := m.Called(ctx, year, month)
	return args.Get(0).([]*model.Holiday), args.Error(1)
}

// MockProjectAssignmentRepositoryForCalculator モックプロジェクトアサインメントリポジトリ（計算専用）
type MockProjectAssignmentRepositoryForCalculator struct {
	mock.Mock
}

func (m *MockProjectAssignmentRepositoryForCalculator) FindByUserAndProject(ctx context.Context, userID, projectID string) (*model.ProjectAssignment, error) {
	args := m.Called(ctx, userID, projectID)
	return args.Get(0).(*model.ProjectAssignment), args.Error(1)
}

// ========== テストセットアップ ==========

func setupBillingCalculatorService() (BillingCalculatorServiceInterface, *MockWorkRecordRepository, *MockHolidayRepository, *MockProjectAssignmentRepositoryForCalculator) {
	workRecordRepo := &MockWorkRecordRepository{}
	holidayRepo := &MockHolidayRepository{}
	assignmentRepo := &MockProjectAssignmentRepositoryForCalculator{}
	logger := zap.NewNop()

	service := NewBillingCalculatorService(
		&gorm.DB{}, // 実際のDBインスタンスは使用しない
		logger,
		workRecordRepo,
		holidayRepo,
		assignmentRepo,
	)

	return service, workRecordRepo, holidayRepo, assignmentRepo
}

// ========== 実稼働時間計算のテスト ==========

func TestCalculateActualHours_Normal(t *testing.T) {
	service, workRecordRepo, holidayRepo, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	year, month := 2024, 1

	// テストデータ: 平日8時間勤務x5日
	startTime1 := time.Date(2024, 1, 8, 9, 0, 0, 0, time.UTC)
	endTime1 := time.Date(2024, 1, 8, 18, 0, 0, 0, time.UTC)
	startTime2 := time.Date(2024, 1, 9, 9, 0, 0, 0, time.UTC)
	endTime2 := time.Date(2024, 1, 9, 18, 0, 0, 0, time.UTC)

	workRecords := []*model.WorkRecord{
		{
			WorkDate:     time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC),
			StartTime:    &startTime1,
			EndTime:      &endTime1,
			BreakMinutes: 60, // 1時間休憩
		},
		{
			WorkDate:     time.Date(2024, 1, 9, 0, 0, 0, 0, time.UTC),
			StartTime:    &startTime2,
			EndTime:      &endTime2,
			BreakMinutes: 60,
		},
	}

	holidays := []*model.Holiday{
		{
			Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), // 元日
		},
	}

	workRecordRepo.On("FindByUserAndProject", ctx, userID, projectID, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return(workRecords, nil)
	holidayRepo.On("FindByMonth", ctx, year, month).Return(holidays, nil)

	result, err := service.CalculateActualHours(ctx, userID, projectID, year, month)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 16.0, result.TotalHours)
	assert.Equal(t, 16.0, result.RegularHours)
	assert.Equal(t, 0.0, result.OvertimeHours)
	assert.Equal(t, 16.0, result.WeekdayHours)
	assert.Equal(t, 0.0, result.WeekendHours)
	assert.Equal(t, 0.0, result.HolidayHours)
	assert.Equal(t, 2, result.WorkDays)
	assert.Equal(t, 2, len(result.DailyBreakdown))
	assert.Equal(t, 8.0, result.DailyBreakdown["2024-01-08"])
	assert.Equal(t, 8.0, result.DailyBreakdown["2024-01-09"])
}

func TestCalculateActualHours_WithOvertime(t *testing.T) {
	service, workRecordRepo, holidayRepo, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	year, month := 2024, 1

	// テストデータ: 10時間勤務（残業2時間）
	startTime := time.Date(2024, 1, 8, 9, 0, 0, 0, time.UTC)
	endTime := time.Date(2024, 1, 8, 20, 0, 0, 0, time.UTC)

	workRecords := []*model.WorkRecord{
		{
			WorkDate:     time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC),
			StartTime:    &startTime,
			EndTime:      &endTime,
			BreakMinutes: 60,
		},
	}

	workRecordRepo.On("FindByUserAndProject", ctx, userID, projectID, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return(workRecords, nil)
	holidayRepo.On("FindByMonth", ctx, year, month).Return([]*model.Holiday{}, nil)

	result, err := service.CalculateActualHours(ctx, userID, projectID, year, month)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 10.0, result.TotalHours)
	assert.Equal(t, 8.0, result.RegularHours)
	assert.Equal(t, 2.0, result.OvertimeHours)
}

func TestCalculateActualHours_WeekendAndHoliday(t *testing.T) {
	service, workRecordRepo, holidayRepo, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	year, month := 2024, 1

	// テストデータ: 土曜日と祝日の勤務
	startTime1 := time.Date(2024, 1, 6, 9, 0, 0, 0, time.UTC) // 土曜日
	endTime1 := time.Date(2024, 1, 6, 17, 0, 0, 0, time.UTC)
	startTime2 := time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC) // 元日（祝日）
	endTime2 := time.Date(2024, 1, 1, 17, 0, 0, 0, time.UTC)

	workRecords := []*model.WorkRecord{
		{
			WorkDate:     time.Date(2024, 1, 6, 0, 0, 0, 0, time.UTC), // 土曜日
			StartTime:    &startTime1,
			EndTime:      &endTime1,
			BreakMinutes: 0,
		},
		{
			WorkDate:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), // 元日
			StartTime:    &startTime2,
			EndTime:      &endTime2,
			BreakMinutes: 0,
		},
	}

	holidays := []*model.Holiday{
		{
			Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	workRecordRepo.On("FindByUserAndProject", ctx, userID, projectID, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return(workRecords, nil)
	holidayRepo.On("FindByMonth", ctx, year, month).Return(holidays, nil)

	result, err := service.CalculateActualHours(ctx, userID, projectID, year, month)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 16.0, result.TotalHours)
	assert.Equal(t, 0.0, result.WeekdayHours)
	assert.Equal(t, 8.0, result.WeekendHours)
	assert.Equal(t, 8.0, result.HolidayHours)
}

// ========== 営業日数計算のテスト ==========

func TestGetBusinessDaysInMonth(t *testing.T) {
	service, _, holidayRepo, _ := setupBillingCalculatorService()

	// 2024年1月のテスト（1月1日が祝日）
	holidays := []*model.Holiday{
		{
			Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Date: time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC), // 成人の日
		},
	}

	holidayRepo.On("FindByMonth", mock.Anything, 2024, 1).Return(holidays, nil)

	businessDays := service.GetBusinessDaysInMonth(2024, 1)

	// 2024年1月: 31日 - 8日（土日） - 2日（祝日） = 21日
	assert.Equal(t, 21, businessDays)
}

func TestGetMonthlyWorkDays(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	// 2024年1月のテスト
	workDays := service.GetMonthlyWorkDays(2024, 1)
	assert.Equal(t, 31, workDays)

	// 2024年2月のテスト（うるう年）
	workDays = service.GetMonthlyWorkDays(2024, 2)
	assert.Equal(t, 29, workDays)
}

// ========== 請求額計算のテスト ==========

func TestCalculateFixedBilling(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateFixedBilling(500000)
	assert.Equal(t, 500000.0, result)
}

func TestCalculateUpperLowerBilling_InRange(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateUpperLowerBilling(500000, 170, 160, 180)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 500000.0, result.BillingAmount)
	assert.Equal(t, "fixed", result.BillingType)
	assert.Equal(t, 170.0, result.ActualHours)
	assert.Contains(t, result.Explanation, "範囲内")
}

func TestCalculateUpperLowerBilling_BelowLower(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateUpperLowerBilling(500000, 150, 160, 180)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 468750.0, result.BillingAmount) // (500000/160)*150
	assert.Equal(t, "lower", result.BillingType)
	assert.Equal(t, 160.0, result.ThresholdHours)
	assert.Equal(t, 3125.0, result.HourlyRate) // 500000/160
	assert.Contains(t, result.Explanation, "下限")
}

func TestCalculateUpperLowerBilling_AboveUpper(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateUpperLowerBilling(500000, 190, 160, 180)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 527777.7777777778, result.BillingAmount) // (500000/180)*190
	assert.Equal(t, "upper", result.BillingType)
	assert.Equal(t, 180.0, result.ThresholdHours)
	assert.Contains(t, result.Explanation, "上限")
}

func TestCalculateUpperLowerBilling_InvalidRange(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateUpperLowerBilling(500000, 170, 180, 160) // 下限 > 上限

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "下限値は上限値より小さくなければなりません")
}

func TestCalculateMiddleValueBilling_AtMiddle(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateMiddleValueBilling(500000, 170, 160, 180)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 170.0, result.ActualHours)
	assert.Equal(t, 170.0, result.MiddleHours) // (160+180)/2
	assert.Equal(t, 0.0, result.Variance)
	assert.Equal(t, 0.0, result.VariancePercent)
	assert.Contains(t, result.Explanation, "一致しています")
}

func TestCalculateMiddleValueBilling_AboveMiddle(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateMiddleValueBilling(500000, 180, 160, 180)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 180.0, result.ActualHours)
	assert.Equal(t, 170.0, result.MiddleHours)
	assert.Equal(t, 10.0, result.Variance)
	assert.InDelta(t, 5.88, result.VariancePercent, 0.01) // 10/170*100
	assert.Contains(t, result.Explanation, "上回っています")
}

func TestCalculateMiddleValueBilling_BelowMiddle(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result, err := service.CalculateMiddleValueBilling(500000, 160, 160, 180)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 160.0, result.ActualHours)
	assert.Equal(t, 170.0, result.MiddleHours)
	assert.Equal(t, -10.0, result.Variance)
	assert.InDelta(t, -5.88, result.VariancePercent, 0.01)
	assert.Contains(t, result.Explanation, "下回っています")
}

// ========== 精算調整計算のテスト ==========

func TestCalculateAdjustment_Increase(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateAdjustment(500000, 10, AdjustmentTypeIncrease)
	assert.Equal(t, 550000.0, result) // 500000 + (500000 * 0.1)
}

func TestCalculateAdjustment_Decrease(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateAdjustment(500000, 10, AdjustmentTypeDecrease)
	assert.Equal(t, 450000.0, result) // 500000 - (500000 * 0.1)
}

func TestCalculateOvertime(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateOvertime(8, 2, 3000, 125) // 8時間通常勤務、2時間残業、時給3000円、残業率125%
	// expected := (8 * 3000) + (2 * 3000 * 1.25) // 24000 + 7500 = 31500
	assert.Equal(t, 31500.0, result)
}

func TestCalculateDeduction(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateDeduction(500000, 2, 20) // 基本額50万円、欠勤2日、営業日20日
	// expected := 500000 - (500000/20)*2 // 500000 - 50000 = 450000
	assert.Equal(t, 450000.0, result)
}

func TestCalculateDeduction_NoAbsence(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateDeduction(500000, 0, 20)
	assert.Equal(t, 500000.0, result)
}

func TestCalculateDeduction_InvalidDays(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateDeduction(500000, 2, 0) // 営業日0日
	assert.Equal(t, 500000.0, result)
}

// ========== 税額計算のテスト ==========

func TestCalculateTax(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateTax(500000, 10) // 50万円、税率10%
	assert.Equal(t, 50000.0, result)
}

func TestCalculateTaxIncluded(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.CalculateTaxIncluded(500000, 10) // 50万円、税率10%
	assert.Equal(t, 550000.0, result)
}

// ========== 端数処理のテスト ==========

func TestRoundAmount_Floor(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.RoundAmount(123.789, RoundingTypeFloor)
	assert.Equal(t, 123.0, result)
}

func TestRoundAmount_Ceil(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.RoundAmount(123.123, RoundingTypeCeil)
	assert.Equal(t, 124.0, result)
}

func TestRoundAmount_Round(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.RoundAmount(123.456, RoundingTypeRound)
	assert.Equal(t, 123.0, result)

	result = service.RoundAmount(123.567, RoundingTypeRound)
	assert.Equal(t, 124.0, result)
}

func TestRoundAmount_NoRound(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	result := service.RoundAmount(123.456789, RoundingTypeNoRound)
	assert.Equal(t, 123.456789, result)
}

// ========== エラーケースのテスト ==========

func TestCalculateActualHours_WorkRecordError(t *testing.T) {
	service, workRecordRepo, _, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	year, month := 2024, 1

	workRecordRepo.On("FindByUserAndProject", ctx, userID, projectID, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return([]*model.WorkRecord{}, assert.AnError)

	result, err := service.CalculateActualHours(ctx, userID, projectID, year, month)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "勤務記録の取得に失敗しました")
}

func TestCalculateDailyHours_Success(t *testing.T) {
	service, workRecordRepo, _, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	date := time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC)

	startTime := time.Date(2024, 1, 8, 9, 0, 0, 0, time.UTC)
	endTime := time.Date(2024, 1, 8, 18, 0, 0, 0, time.UTC)

	workRecord := &model.WorkRecord{
		WorkDate:     date,
		StartTime:    &startTime,
		EndTime:      &endTime,
		BreakMinutes: 60,
	}

	workRecordRepo.On("FindByDate", ctx, userID, projectID, date).Return(workRecord, nil)

	result, err := service.CalculateDailyHours(ctx, userID, projectID, date)

	assert.NoError(t, err)
	assert.Equal(t, 8.0, result)
}

func TestCalculateDailyHours_NoRecord(t *testing.T) {
	service, workRecordRepo, _, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	date := time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC)

	workRecordRepo.On("FindByDate", ctx, userID, projectID, date).Return((*model.WorkRecord)(nil), nil)

	result, err := service.CalculateDailyHours(ctx, userID, projectID, date)

	assert.NoError(t, err)
	assert.Equal(t, 0.0, result)
}

// ========== calculateDailyHoursFromRecord のテスト ==========

func TestCalculateDailyHoursFromRecord_Normal(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	startTime := time.Date(2024, 1, 8, 9, 0, 0, 0, time.UTC)
	endTime := time.Date(2024, 1, 8, 18, 0, 0, 0, time.UTC)

	record := &model.WorkRecord{
		StartTime:    &startTime,
		EndTime:      &endTime,
		BreakMinutes: 60, // 1時間休憩
	}

	// プライベートメソッドのテストのため、リフレクションまたは公開メソッド経由でテスト
	billingService := service.(*billingCalculatorService)
	result := billingService.calculateDailyHoursFromRecord(record)

	assert.Equal(t, 8.0, result)
}

func TestCalculateDailyHoursFromRecord_NilTimes(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	record := &model.WorkRecord{
		StartTime:    nil,
		EndTime:      nil,
		BreakMinutes: 0,
	}

	billingService := service.(*billingCalculatorService)
	result := billingService.calculateDailyHoursFromRecord(record)

	assert.Equal(t, 0.0, result)
}

func TestCalculateDailyHoursFromRecord_NegativeHours(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	// 終了時刻が開始時刻より早い（異常データ）
	startTime := time.Date(2024, 1, 8, 18, 0, 0, 0, time.UTC)
	endTime := time.Date(2024, 1, 8, 9, 0, 0, 0, time.UTC)

	record := &model.WorkRecord{
		StartTime:    &startTime,
		EndTime:      &endTime,
		BreakMinutes: 0,
	}

	billingService := service.(*billingCalculatorService)
	result := billingService.calculateDailyHoursFromRecord(record)

	assert.Equal(t, 0.0, result)
}

func TestCalculateDailyHoursFromRecord_WithBreak(t *testing.T) {
	service, _, _, _ := setupBillingCalculatorService()

	startTime := time.Date(2024, 1, 8, 9, 0, 0, 0, time.UTC)
	endTime := time.Date(2024, 1, 8, 19, 30, 0, 0, time.UTC) // 10.5時間

	record := &model.WorkRecord{
		StartTime:    &startTime,
		EndTime:      &endTime,
		BreakMinutes: 90, // 1.5時間休憩
	}

	billingService := service.(*billingCalculatorService)
	result := billingService.calculateDailyHoursFromRecord(record)

	assert.Equal(t, 9.0, result) // 10.5 - 1.5 = 9.0
}

// ========== ベンチマークテスト ==========

func BenchmarkCalculateActualHours(b *testing.B) {
	service, workRecordRepo, holidayRepo, _ := setupBillingCalculatorService()

	ctx := context.Background()
	userID := uuid.New().String()
	projectID := uuid.New().String()
	year, month := 2024, 1

	// 1ヶ月分のサンプルデータを作成
	workRecords := make([]*model.WorkRecord, 22) // 22営業日
	for i := 0; i < 22; i++ {
		date := time.Date(2024, 1, i+1, 0, 0, 0, 0, time.UTC)
		startTime := time.Date(2024, 1, i+1, 9, 0, 0, 0, time.UTC)
		endTime := time.Date(2024, 1, i+1, 18, 0, 0, 0, time.UTC)

		workRecords[i] = &model.WorkRecord{
			WorkDate:     date,
			StartTime:    &startTime,
			EndTime:      &endTime,
			BreakMinutes: 60,
		}
	}

	workRecordRepo.On("FindByUserAndProject", ctx, userID, projectID, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return(workRecords, nil)
	holidayRepo.On("FindByMonth", ctx, year, month).Return([]*model.Holiday{}, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.CalculateActualHours(ctx, userID, projectID, year, month)
	}
}
