package service

import (
	"context"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MockWorkHistoryRepository モックリポジトリ
type MockWorkHistoryRepository struct {
	mock.Mock
}

func (m *MockWorkHistoryRepository) Create(ctx context.Context, workHistory *model.WorkHistory) error {
	args := m.Called(ctx, workHistory)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) Update(ctx context.Context, workHistory *model.WorkHistory) error {
	args := m.Called(ctx, workHistory)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) GetByID(ctx context.Context, id string) (*model.WorkHistory, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetByUserID(ctx context.Context, userID string) ([]*model.WorkHistory, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetWithTechnologies(ctx context.Context, id string) (*model.WorkHistory, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetByUserIDWithTechnologies(ctx context.Context, userID string) ([]*model.WorkHistory, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetUserSummary(ctx context.Context, userID string) (*dto.WorkHistorySummaryResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dto.WorkHistorySummaryResponse), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetUserTechnologySkills(ctx context.Context, userID string) ([]dto.TechnologySkillExperienceResponse, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]dto.TechnologySkillExperienceResponse), args.Error(1)
}

func (m *MockWorkHistoryRepository) Search(ctx context.Context, req dto.WorkHistoryQueryRequest) ([]*model.WorkHistory, int64, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*model.WorkHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockWorkHistoryRepository) GetByTechnologyName(ctx context.Context, technologyName string) ([]*model.WorkHistory, error) {
	args := m.Called(ctx, technologyName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetByIndustry(ctx context.Context, industry string) ([]*model.WorkHistory, error) {
	args := m.Called(ctx, industry)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetByDateRange(ctx context.Context, userID string, startDate, endDate time.Time) ([]*model.WorkHistory, error) {
	args := m.Called(ctx, userID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.WorkHistory), args.Error(1)
}

func (m *MockWorkHistoryRepository) CalculateITExperience(ctx context.Context, userID string) (int32, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int32), args.Error(1)
}

func (m *MockWorkHistoryRepository) CalculateTechnologySkills(ctx context.Context, userID string) (map[string]int32, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int32), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetProjectCount(ctx context.Context, userID string) (int32, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int32), args.Error(1)
}

func (m *MockWorkHistoryRepository) GetActiveProjectCount(ctx context.Context, userID string) (int32, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int32), args.Error(1)
}

func (m *MockWorkHistoryRepository) BulkCreate(ctx context.Context, workHistories []*model.WorkHistory) error {
	args := m.Called(ctx, workHistories)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) BulkUpdate(ctx context.Context, workHistories []*model.WorkHistory) error {
	args := m.Called(ctx, workHistories)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) BulkDelete(ctx context.Context, ids []string) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) CreateWithTechnologies(ctx context.Context, workHistory *model.WorkHistory, technologies []model.WorkHistoryTechnology) error {
	args := m.Called(ctx, workHistory, technologies)
	return args.Error(0)
}

func (m *MockWorkHistoryRepository) UpdateWithTechnologies(ctx context.Context, workHistory *model.WorkHistory, technologies []model.WorkHistoryTechnology) error {
	args := m.Called(ctx, workHistory, technologies)
	return args.Error(0)
}

// MockTechnologyCategoryRepository モック技術カテゴリリポジトリ
type MockTechnologyCategoryRepository struct {
	mock.Mock
}

func (m *MockTechnologyCategoryRepository) GetAll(ctx context.Context) ([]*model.TechnologyCategory, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TechnologyCategory), args.Error(1)
}

func (m *MockTechnologyCategoryRepository) GetByID(ctx context.Context, id string) (*model.TechnologyCategory, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TechnologyCategory), args.Error(1)
}

func (m *MockTechnologyCategoryRepository) GetByName(ctx context.Context, name string) (*model.TechnologyCategory, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TechnologyCategory), args.Error(1)
}

func (m *MockTechnologyCategoryRepository) Create(ctx context.Context, category *model.TechnologyCategory) error {
	args := m.Called(ctx, category)
	return args.Error(0)
}

func (m *MockTechnologyCategoryRepository) Update(ctx context.Context, category *model.TechnologyCategory) error {
	args := m.Called(ctx, category)
	return args.Error(0)
}

func (m *MockTechnologyCategoryRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// TestWorkHistoryCRUDService_Create 職務経歴作成のテスト
func TestWorkHistoryCRUDService_Create(t *testing.T) {
	// Setup
	mockRepo := new(MockWorkHistoryRepository)
	mockTechRepo := new(MockTechnologyCategoryRepository)
	logger := zap.NewNop()
	db := &gorm.DB{}
	
	service := NewWorkHistoryCRUDService(db, mockRepo, mockTechRepo, logger)
	
	// Test data
	ctx := context.Background()
	endDate := "2024-12-31"
	req := &dto.WorkHistoryCreateRequest{
		UserID:      "user-123",
		ProfileID:   "profile-123",
		ProjectName: "テストプロジェクト",
		StartDate:   "2024-01-01",
		EndDate:     &endDate,
		Industry:    3,
		Role:        "バックエンドエンジニア",
		Technologies: []dto.WorkHistoryTechnologyRequest{
			{
				CategoryID:     "cat-123",
				TechnologyName: "Go",
			},
		},
	}
	
	// Mock expectations
	mockRepo.On("CreateWithTechnologies", ctx, mock.AnythingOfType("*model.WorkHistory"), mock.AnythingOfType("[]model.WorkHistoryTechnology")).Return(nil)
	
	// Execute
	result, err := service.Create(ctx, req)
	
	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "user-123", result.UserID)
	assert.Equal(t, "profile-123", result.ProfileID)
	assert.Equal(t, "テストプロジェクト", result.ProjectName)
	assert.Equal(t, int32(3), result.Industry)
	assert.Equal(t, "バックエンドエンジニア", result.Role)
	
	// Verify mock expectations
	mockRepo.AssertExpectations(t)
}

// TestWorkHistoryCRUDService_GetByID 職務経歴取得のテスト
func TestWorkHistoryCRUDService_GetByID(t *testing.T) {
	// Setup
	mockRepo := new(MockWorkHistoryRepository)
	mockTechRepo := new(MockTechnologyCategoryRepository)
	logger := zap.NewNop()
	db := &gorm.DB{}
	
	service := NewWorkHistoryCRUDService(db, mockRepo, mockTechRepo, logger)
	
	// Test data
	ctx := context.Background()
	workHistoryID := "wh-123"
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	expectedWH := &model.WorkHistory{
		ID:          workHistoryID,
		UserID:      "user-123",
		ProfileID:   "profile-123",
		ProjectName: "テストプロジェクト",
		StartDate:   startDate,
		Industry:    3,
		Role:        "バックエンドエンジニア",
	}
	
	// Mock expectations
	mockRepo.On("GetWithTechnologies", ctx, workHistoryID).Return(expectedWH, nil)
	
	// Execute
	result, err := service.GetByID(ctx, workHistoryID)
	
	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, workHistoryID, result.ID)
	assert.Equal(t, "user-123", result.UserID)
	assert.Equal(t, "テストプロジェクト", result.ProjectName)
	
	// Verify mock expectations
	mockRepo.AssertExpectations(t)
}

// TestWorkHistoryCRUDService_Delete 職務経歴削除のテスト
func TestWorkHistoryCRUDService_Delete(t *testing.T) {
	// Setup
	mockRepo := new(MockWorkHistoryRepository)
	mockTechRepo := new(MockTechnologyCategoryRepository)
	logger := zap.NewNop()
	db := &gorm.DB{}
	
	service := NewWorkHistoryCRUDService(db, mockRepo, mockTechRepo, logger)
	
	// Test data
	ctx := context.Background()
	workHistoryID := "wh-123"
	existingWH := &model.WorkHistory{
		ID:          workHistoryID,
		UserID:      "user-123",
		ProjectName: "テストプロジェクト",
	}
	
	// Mock expectations
	mockRepo.On("GetByID", ctx, workHistoryID).Return(existingWH, nil)
	mockRepo.On("Delete", ctx, workHistoryID).Return(nil)
	
	// Execute
	err := service.Delete(ctx, workHistoryID)
	
	// Assert
	assert.NoError(t, err)
	
	// Verify mock expectations
	mockRepo.AssertExpectations(t)
}

// TestWorkHistoryCRUDService_ValidateWorkHistory バリデーションのテスト
func TestWorkHistoryCRUDService_ValidateWorkHistory(t *testing.T) {
	// Setup
	mockRepo := new(MockWorkHistoryRepository)
	mockTechRepo := new(MockTechnologyCategoryRepository)
	logger := zap.NewNop()
	db := &gorm.DB{}
	
	service := NewWorkHistoryCRUDService(db, mockRepo, mockTechRepo, logger)
	
	t.Run("有効なCreateRequest", func(t *testing.T) {
		req := &dto.WorkHistoryCreateRequest{
			UserID:      "user-123",
			ProfileID:   "profile-123",
			ProjectName: "テストプロジェクト",
			StartDate:   "2024-01-01",
			Role:        "エンジニア",
			Industry:    3,
		}
		
		err := service.ValidateWorkHistory(req)
		assert.NoError(t, err)
	})
	
	t.Run("必須フィールドが空のCreateRequest", func(t *testing.T) {
		req := &dto.WorkHistoryCreateRequest{
			UserID:    "",
			ProfileID: "profile-123",
		}
		
		err := service.ValidateWorkHistory(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "ユーザーIDは必須です")
	})
	
	t.Run("不正な日付形式", func(t *testing.T) {
		req := &dto.WorkHistoryCreateRequest{
			UserID:      "user-123",
			ProfileID:   "profile-123",
			ProjectName: "テストプロジェクト",
			StartDate:   "2024/01/01", // 不正な形式
			Role:        "エンジニア",
			Industry:    3,
		}
		
		err := service.ValidateWorkHistory(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "開始日の形式が不正です")
	})
	
	t.Run("文字数制限超過", func(t *testing.T) {
		longString := make([]byte, 256)
		for i := range longString {
			longString[i] = 'a'
		}
		
		req := &dto.WorkHistoryCreateRequest{
			UserID:      "user-123",
			ProfileID:   "profile-123",
			ProjectName: string(longString), // 256文字（255文字制限を超過）
			StartDate:   "2024-01-01",
			Role:        "エンジニア",
			Industry:    3,
		}
		
		err := service.ValidateWorkHistory(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "プロジェクト名は255文字以内")
	})
}