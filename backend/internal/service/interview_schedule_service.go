package service

import (
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// InterviewScheduleService 面談スケジュールサービスのインターフェース
type InterviewScheduleService interface {
	// TODO: メソッドを実装時に追加
}

// interviewScheduleService 面談スケジュールサービスの実装
type interviewScheduleService struct {
	db            *gorm.DB
	interviewRepo repository.InterviewScheduleRepository
	proposalRepo  repository.ProposalRepository
	logger        *zap.Logger
}

// NewInterviewScheduleService 面談スケジュールサービスのインスタンスを生成
func NewInterviewScheduleService(db *gorm.DB, interviewRepo repository.InterviewScheduleRepository, proposalRepo repository.ProposalRepository, logger *zap.Logger) InterviewScheduleService {
	return &interviewScheduleService{
		db:            db,
		interviewRepo: interviewRepo,
		proposalRepo:  proposalRepo,
		logger:        logger,
	}
}
