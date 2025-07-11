package service

import (
	"context"
	"fmt"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ClientService 取引先サービスのインターフェース
type ClientService interface {
	GetClients(ctx context.Context, page, limit int, search string) ([]dto.ClientDTO, int64, error)
	GetClientByID(ctx context.Context, clientID uuid.UUID) (*dto.ClientDetailDTO, error)
	CreateClient(ctx context.Context, req *dto.CreateClientRequest) (*dto.ClientDTO, error)
	UpdateClient(ctx context.Context, clientID uuid.UUID, req *dto.UpdateClientRequest) (*dto.ClientDTO, error)
	DeleteClient(ctx context.Context, clientID uuid.UUID) error
	GetClientProjects(ctx context.Context, clientID uuid.UUID) ([]dto.ProjectDTO, error)
}

// clientService 取引先サービスの実装
type clientService struct {
	db         *gorm.DB
	clientRepo repository.ClientRepository
	logger     *zap.Logger
}

// NewClientService 取引先サービスのインスタンスを生成
func NewClientService(
	db *gorm.DB,
	clientRepo repository.ClientRepository,
	logger *zap.Logger,
) ClientService {
	return &clientService{
		db:         db,
		clientRepo: clientRepo,
		logger:     logger,
	}
}

// GetClients 取引先一覧を取得
func (s *clientService) GetClients(ctx context.Context, page, limit int, search string) ([]dto.ClientDTO, int64, error) {
	// オフセットを計算
	offset := (page - 1) * limit

	// クエリ構築
	query := s.db.WithContext(ctx).Model(&model.Client{}).
		Where("deleted_at IS NULL")

	// 検索条件
	if search != "" {
		query = query.Where("company_name LIKE ? OR company_name_kana LIKE ? OR contact_person LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		s.logger.Error("Failed to count clients", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	var clients []model.Client
	if err := query.
		Order("company_name_kana ASC").
		Limit(limit).
		Offset(offset).
		Find(&clients).Error; err != nil {
		s.logger.Error("Failed to get clients", zap.Error(err))
		return nil, 0, err
	}

	// DTOに変換
	dtos := make([]dto.ClientDTO, len(clients))
	for i, client := range clients {
		dtos[i] = s.modelToDTO(&client)
	}

	return dtos, total, nil
}

// GetClientByID 取引先詳細を取得
func (s *clientService) GetClientByID(ctx context.Context, clientID uuid.UUID) (*dto.ClientDetailDTO, error) {
	var client model.Client
	if err := s.db.WithContext(ctx).
		Preload("Projects", "deleted_at IS NULL").
		Preload("Invoices", "deleted_at IS NULL").
		Where("id = ? AND deleted_at IS NULL", clientID).
		First(&client).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("取引先が見つかりません")
		}
		s.logger.Error("Failed to get client", zap.Error(err))
		return nil, err
	}

	// DTOに変換
	dto := &dto.ClientDetailDTO{
		ClientDTO:       s.modelToDTO(&client),
		ActiveProjects:  len(client.Projects),
		TotalInvoices:   len(client.Invoices),
		LastInvoiceDate: nil,
	}

	// 最新の請求書日付を取得
	if len(client.Invoices) > 0 {
		lastInvoice := client.Invoices[0]
		for _, invoice := range client.Invoices {
			if invoice.InvoiceDate.After(lastInvoice.InvoiceDate) {
				lastInvoice = invoice
			}
		}
		dto.LastInvoiceDate = &lastInvoice.InvoiceDate
	}

	return dto, nil
}

// CreateClient 取引先を作成
func (s *clientService) CreateClient(ctx context.Context, req *dto.CreateClientRequest) (*dto.ClientDTO, error) {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// モデルに変換
	client := &model.Client{
		CompanyName:     req.CompanyName,
		CompanyNameKana: req.CompanyNameKana,
		BillingType:     model.BillingType(req.BillingType),
		PaymentTerms:    req.PaymentTerms,
		ContactPerson:   req.ContactPerson,
		ContactEmail:    req.ContactEmail,
		ContactPhone:    req.ContactPhone,
		Address:         req.Address,
		Notes:           req.Notes,
	}

	// 作成
	if err := tx.Create(client).Error; err != nil {
		tx.Rollback()
		s.logger.Error("Failed to create client", zap.Error(err))
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	clientDTO := s.modelToDTO(client)
	return &clientDTO, nil
}

// UpdateClient 取引先を更新
func (s *clientService) UpdateClient(ctx context.Context, clientID uuid.UUID, req *dto.UpdateClientRequest) (*dto.ClientDTO, error) {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 既存の取引先を取得
	var client model.Client
	if err := tx.Where("id = ? AND deleted_at IS NULL", clientID).First(&client).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("取引先が見つかりません")
		}
		return nil, err
	}

	// 更新
	updates := map[string]interface{}{}
	if req.CompanyName != nil {
		updates["company_name"] = *req.CompanyName
	}
	if req.CompanyNameKana != nil {
		updates["company_name_kana"] = *req.CompanyNameKana
	}
	if req.BillingType != nil {
		updates["billing_type"] = *req.BillingType
	}
	if req.PaymentTerms != nil {
		updates["payment_terms"] = *req.PaymentTerms
	}
	if req.ContactPerson != nil {
		updates["contact_person"] = *req.ContactPerson
	}
	if req.ContactEmail != nil {
		updates["contact_email"] = *req.ContactEmail
	}
	if req.ContactPhone != nil {
		updates["contact_phone"] = *req.ContactPhone
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}

	if err := tx.Model(&client).Updates(updates).Error; err != nil {
		tx.Rollback()
		s.logger.Error("Failed to update client", zap.Error(err))
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 更新後のデータを取得
	if err := s.db.WithContext(ctx).Where("id = ?", clientID).First(&client).Error; err != nil {
		return nil, err
	}

	clientDTO := s.modelToDTO(&client)
	return &clientDTO, nil
}

// DeleteClient 取引先を削除
func (s *clientService) DeleteClient(ctx context.Context, clientID uuid.UUID) error {
	// アクティブな案件があるか確認
	var activeProjectCount int64
	if err := s.db.WithContext(ctx).Model(&model.Project{}).
		Where("client_id = ? AND status = ? AND deleted_at IS NULL", clientID, model.ProjectStatusActive).
		Count(&activeProjectCount).Error; err != nil {
		s.logger.Error("Failed to check active projects", zap.Error(err))
		return err
	}

	if activeProjectCount > 0 {
		return fmt.Errorf("アクティブな案件が存在するため削除できません")
	}

	// 論理削除
	if err := s.db.WithContext(ctx).Where("id = ?", clientID).Delete(&model.Client{}).Error; err != nil {
		s.logger.Error("Failed to delete client", zap.Error(err))
		return err
	}

	return nil
}

// GetClientProjects 取引先の案件一覧を取得
func (s *clientService) GetClientProjects(ctx context.Context, clientID uuid.UUID) ([]dto.ProjectDTO, error) {
	var projects []model.Project
	if err := s.db.WithContext(ctx).
		Preload("Assignments.User").
		Where("client_id = ? AND deleted_at IS NULL", clientID).
		Order("start_date DESC").
		Find(&projects).Error; err != nil {
		s.logger.Error("Failed to get client projects", zap.Error(err))
		return nil, err
	}

	// DTOに変換
	dtos := make([]dto.ProjectDTO, len(projects))
	for i, project := range projects {
		dtos[i] = dto.ProjectDTO{
			ID:            project.ID,
			ClientID:      project.ClientID,
			ProjectName:   project.ProjectName,
			ProjectCode:   project.ProjectCode,
			Status:        string(project.Status),
			StartDate:     project.StartDate,
			EndDate:       project.EndDate,
			MonthlyRate:   project.MonthlyRate,
			ContractType:  string(project.ContractType),
			WorkLocation:  project.WorkLocation,
			AssignedCount: len(project.Assignments),
			CreatedAt:     project.CreatedAt,
		}
	}

	return dtos, nil
}

// modelToDTO モデルをDTOに変換
func (s *clientService) modelToDTO(client *model.Client) dto.ClientDTO {
	return dto.ClientDTO{
		ID:              client.ID,
		CompanyName:     client.CompanyName,
		CompanyNameKana: client.CompanyNameKana,
		BillingType:     string(client.BillingType),
		PaymentTerms:    client.PaymentTerms,
		ContactPerson:   client.ContactPerson,
		ContactEmail:    client.ContactEmail,
		ContactPhone:    client.ContactPhone,
		Address:         client.Address,
		Notes:           client.Notes,
		CreatedAt:       client.CreatedAt,
		UpdatedAt:       client.UpdatedAt,
	}
}
