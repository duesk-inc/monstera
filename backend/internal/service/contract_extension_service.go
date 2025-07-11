package service

import (
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ContractExtensionService 契約延長サービスのインターフェース
type ContractExtensionService interface {
	// TODO: メソッドを実装時に追加
}

// contractExtensionService 契約延長サービスの実装
type contractExtensionService struct {
	db            *gorm.DB
	extensionRepo repository.ContractExtensionRepository
	userRepo      repository.UserRepository
	logger        *zap.Logger
}

// NewContractExtensionService 契約延長サービスのインスタンスを生成
func NewContractExtensionService(db *gorm.DB, extensionRepo repository.ContractExtensionRepository, userRepo repository.UserRepository, logger *zap.Logger) ContractExtensionService {
	return &contractExtensionService{
		db:            db,
		extensionRepo: extensionRepo,
		userRepo:      userRepo,
		logger:        logger,
	}
}
