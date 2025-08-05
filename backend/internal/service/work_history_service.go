package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WorkHistoryService 職務経歴サービスのインターフェース
type WorkHistoryService interface {
	GetWorkHistory(ctx context.Context, userID string) (*WorkHistoryData, error)
	UpdateWorkHistory(ctx context.Context, userID string, data *WorkHistoryUpdateData) error
	SaveTemporary(ctx context.Context, userID string, data *WorkHistoryUpdateData) error
}

// workHistoryService 職務経歴サービスの実装
type workHistoryService struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewWorkHistoryService 職務経歴サービスのコンストラクタ
func NewWorkHistoryService(db *gorm.DB, logger *zap.Logger) WorkHistoryService {
	return &workHistoryService{
		db:     db,
		logger: logger,
	}
}

// WorkHistoryData 職務経歴データ
type WorkHistoryData struct {
	UserID        uuid.UUID
	Email         string
	LastName      string
	FirstName     string
	LastNameKana  string
	FirstNameKana string
	ITExperience  struct {
		Years       int
		Months      int
		TotalMonths int
	}
	WorkHistories   []WorkHistoryItem
	TechnicalSkills []TechnicalSkillCategory
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// WorkHistoryItem 職務経歴項目
type WorkHistoryItem struct {
	ID                   uuid.UUID
	ProjectName          string
	StartDate            time.Time
	EndDate              *time.Time
	Duration             *Duration
	Industry             int
	IndustryName         string
	ProjectOverview      string
	Responsibilities     string
	Achievements         string
	Notes                string
	Processes            []int
	ProcessNames         []string
	ProgrammingLanguages []string
	ServersDatabases     []string
	Tools                []string
	TeamSize             int
	Role                 string
}

// Duration 期間
type Duration struct {
	Years       int
	Months      int
	TotalMonths int
}

// TechnicalSkillCategory 技術スキルカテゴリ
type TechnicalSkillCategory struct {
	CategoryName string
	DisplayName  string
	Skills       []TechnicalSkillItem
}

// TechnicalSkillItem 技術スキル項目
type TechnicalSkillItem struct {
	Name       string
	Experience struct {
		Years       int
		Months      int
		TotalMonths int
	}
	ProjectCount int
}

// WorkHistoryUpdateData 職務経歴更新データ
type WorkHistoryUpdateData struct {
	WorkHistory []WorkHistoryUpdateItem
}

// WorkHistoryUpdateItem 職務経歴更新項目
type WorkHistoryUpdateItem struct {
	ProjectName          string
	StartDate            string
	EndDate              string
	Industry             int
	ProjectOverview      string
	Responsibilities     string
	Achievements         string
	Notes                string
	Processes            []int
	ProgrammingLanguages []string
	ServersDatabases     []string
	Tools                []string
	TeamSize             int
	Role                 string
}

// GetWorkHistory 職務経歴を取得（スタブ実装）
func (s *workHistoryService) GetWorkHistory(ctx context.Context, userID string) (*WorkHistoryData, error) {
	// TODO: 実装予定
	return &WorkHistoryData{
		UserID: userID,
	}, nil
}

// UpdateWorkHistory 職務経歴を更新（スタブ実装）
func (s *workHistoryService) UpdateWorkHistory(ctx context.Context, userID string, data *WorkHistoryUpdateData) error {
	// TODO: 実装予定
	return nil
}

// SaveTemporary 一時保存（スタブ実装）
func (s *workHistoryService) SaveTemporary(ctx context.Context, userID string, data *WorkHistoryUpdateData) error {
	// TODO: 実装予定
	return nil
}
