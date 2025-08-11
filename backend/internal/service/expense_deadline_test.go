package service

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockExpenseDeadlineSettingRepository モックリポジトリ
type MockExpenseDeadlineSettingRepository struct {
	mock.Mock
}

func (m *MockExpenseDeadlineSettingRepository) Create(ctx context.Context, setting *model.ExpenseDeadlineSetting) error {
	args := m.Called(ctx, setting)
	return args.Error(0)
}

func (m *MockExpenseDeadlineSettingRepository) GetByID(ctx context.Context, id string) (*model.ExpenseDeadlineSetting, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ExpenseDeadlineSetting), args.Error(1)
}

func (m *MockExpenseDeadlineSettingRepository) Update(ctx context.Context, setting *model.ExpenseDeadlineSetting) error {
	args := m.Called(ctx, setting)
	return args.Error(0)
}

func (m *MockExpenseDeadlineSettingRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockExpenseDeadlineSettingRepository) List(ctx context.Context) ([]*model.ExpenseDeadlineSetting, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ExpenseDeadlineSetting), args.Error(1)
}

func (m *MockExpenseDeadlineSettingRepository) GetEffectiveSetting(ctx context.Context, userID string, departmentID *string) (*model.ExpenseDeadlineSetting, error) {
	args := m.Called(ctx, userID, departmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ExpenseDeadlineSetting), args.Error(1)
}

func TestExpenseDeadlineSetting_CalculateDeadline(t *testing.T) {
	tests := []struct {
		name     string
		setting  model.ExpenseDeadlineSetting
		baseTime time.Time
		expected time.Time
	}{
		{
			name: "7日後の期限",
			setting: model.ExpenseDeadlineSetting{
				DefaultDeadlineDays: 7,
			},
			baseTime: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "30日後の期限",
			setting: model.ExpenseDeadlineSetting{
				DefaultDeadlineDays: 30,
			},
			baseTime: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			expected: time.Date(2024, 1, 31, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.setting.CalculateDeadline(tt.baseTime)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExpenseDeadlineSetting_CalculateReminderDate(t *testing.T) {
	deadline := time.Date(2024, 1, 10, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		setting  model.ExpenseDeadlineSetting
		expected time.Time
	}{
		{
			name: "3日前のリマインダー",
			setting: model.ExpenseDeadlineSetting{
				ReminderDaysBefore: 3,
			},
			expected: time.Date(2024, 1, 7, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "7日前のリマインダー",
			setting: model.ExpenseDeadlineSetting{
				ReminderDaysBefore: 7,
			},
			expected: time.Date(2024, 1, 3, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.setting.CalculateReminderDate(deadline)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExpense_ShouldExpire(t *testing.T) {
	deadline := time.Date(2024, 1, 10, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		expense  model.Expense
		now      time.Time
		expected bool
	}{
		{
			name: "期限切れ対象（期限過ぎ）",
			expense: model.Expense{
				Status:            model.ExpenseStatusSubmitted,
				AutoExpireEnabled: true,
				DeadlineAt:        &deadline,
			},
			now:      time.Date(2024, 1, 11, 0, 0, 0, 0, time.UTC),
			expected: true,
		},
		{
			name: "期限切れ対象外（期限前）",
			expense: model.Expense{
				Status:            model.ExpenseStatusSubmitted,
				AutoExpireEnabled: true,
				DeadlineAt:        &deadline,
			},
			now:      time.Date(2024, 1, 9, 0, 0, 0, 0, time.UTC),
			expected: false,
		},
		{
			name: "期限切れ対象外（自動期限切れ無効）",
			expense: model.Expense{
				Status:            model.ExpenseStatusSubmitted,
				AutoExpireEnabled: false,
				DeadlineAt:        &deadline,
			},
			now:      time.Date(2024, 1, 11, 0, 0, 0, 0, time.UTC),
			expected: false,
		},
		{
			name: "期限切れ対象外（ステータスが提出済みでない）",
			expense: model.Expense{
				Status:            model.ExpenseStatusDraft,
				AutoExpireEnabled: true,
				DeadlineAt:        &deadline,
			},
			now:      time.Date(2024, 1, 11, 0, 0, 0, 0, time.UTC),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.expense.ShouldExpire(tt.now)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExpense_NeedsReminder(t *testing.T) {
	deadline := time.Date(2024, 1, 10, 0, 0, 0, 0, time.UTC)
	reminderDate := time.Date(2024, 1, 7, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		expense      model.Expense
		reminderDate time.Time
		now          time.Time
		expected     bool
	}{
		{
			name: "リマインダー必要（リマインダー日を過ぎた）",
			expense: model.Expense{
				Status:                 model.ExpenseStatusSubmitted,
				DeadlineAt:             &deadline,
				ExpiryNotificationSent: false,
			},
			reminderDate: reminderDate,
			now:          time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC),
			expected:     true,
		},
		{
			name: "リマインダー不要（リマインダー日前）",
			expense: model.Expense{
				Status:                 model.ExpenseStatusSubmitted,
				DeadlineAt:             &deadline,
				ExpiryNotificationSent: false,
			},
			reminderDate: reminderDate,
			now:          time.Date(2024, 1, 6, 0, 0, 0, 0, time.UTC),
			expected:     false,
		},
		{
			name: "リマインダー不要（既に送信済み）",
			expense: model.Expense{
				Status:                 model.ExpenseStatusSubmitted,
				DeadlineAt:             &deadline,
				ExpiryNotificationSent: true,
			},
			reminderDate: reminderDate,
			now:          time.Date(2024, 1, 8, 0, 0, 0, 0, time.UTC),
			expected:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.expense.NeedsReminder(tt.reminderDate, tt.now)
			assert.Equal(t, tt.expected, result)
		})
	}
}
