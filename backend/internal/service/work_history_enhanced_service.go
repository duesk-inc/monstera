package service

import (
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WorkHistoryEnhancedService 職務経歴拡張サービスのインターフェース
type WorkHistoryEnhancedService interface {
	// TODO: 必要なメソッドを定義
}

// workHistoryEnhancedService 職務経歴拡張サービスの実装
type workHistoryEnhancedService struct {
	db                   *gorm.DB
	workHistoryRepo      repository.WorkHistoryEnhancedRepository
	workHistoryTechRepo  repository.WorkHistoryTechnologyRepository
	technologyMasterRepo repository.TechnologyMasterRepository
	logger               *zap.Logger
}

// NewWorkHistoryEnhancedService 職務経歴拡張サービスのインスタンスを生成
func NewWorkHistoryEnhancedService(
	db *gorm.DB,
	workHistoryRepo repository.WorkHistoryEnhancedRepository,
	workHistoryTechRepo repository.WorkHistoryTechnologyRepository,
	technologyMasterRepo repository.TechnologyMasterRepository,
	logger *zap.Logger,
) WorkHistoryEnhancedService {
	return &workHistoryEnhancedService{
		db:                   db,
		workHistoryRepo:      workHistoryRepo,
		workHistoryTechRepo:  workHistoryTechRepo,
		technologyMasterRepo: technologyMasterRepo,
		logger:               logger,
	}
}
