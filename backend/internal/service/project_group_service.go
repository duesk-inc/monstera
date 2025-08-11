package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// ProjectGroupTransactionManager エイリアス（重複回避のため別名）
type ProjectGroupTransactionManager = transaction.TransactionManager

// ProjectGroupServiceInterface プロジェクトグループサービスインターフェース
type ProjectGroupServiceInterface interface {
	// プロジェクトグループ管理
	CreateProjectGroup(ctx context.Context, req *dto.CreateProjectGroupRequest, creatorID string) (*dto.ProjectGroupDTO, error)
	GetProjectGroup(ctx context.Context, id string) (*dto.ProjectGroupDetailDTO, error)
	UpdateProjectGroup(ctx context.Context, id string, req *dto.UpdateProjectGroupRequest) (*dto.ProjectGroupDTO, error)
	DeleteProjectGroup(ctx context.Context, id string) error

	// プロジェクトグループ検索
	ListProjectGroups(ctx context.Context, req *dto.ProjectGroupFilterRequest) (*dto.ProjectGroupListResponse, error)
	SearchProjectGroups(ctx context.Context, req *dto.ProjectGroupFilterRequest) (*dto.ProjectGroupListResponse, error)

	// プロジェクト管理
	AddProjectsToGroup(ctx context.Context, groupID string, projectIDs []string) error
	RemoveProjectsFromGroup(ctx context.Context, groupID string, projectIDs []string) error
	GetGroupProjects(ctx context.Context, groupID string) ([]*dto.ProjectSummaryDTO, error)
	GetAvailableProjects(ctx context.Context, clientID string) ([]*dto.ProjectSummaryDTO, error)

	// 統計情報
	GetProjectGroupStats(ctx context.Context, clientID *string) (*dto.ProjectGroupStatsDTO, error)
	GetGroupRevenue(ctx context.Context, groupID string, startMonth, endMonth string) (map[string]interface{}, error)

	// バリデーション
	ValidateProjectsForGroup(ctx context.Context, groupID string, projectIDs []string) error
}

// projectGroupService プロジェクトグループサービス実装
type projectGroupService struct {
	db                 *gorm.DB
	logger             *zap.Logger
	groupRepo          repository.ProjectGroupRepositoryInterface
	projectRepo        repository.ProjectRepository
	invoiceRepo        repository.InvoiceRepository
	transactionManager ProjectGroupTransactionManager
}

// NewProjectGroupService プロジェクトグループサービスのコンストラクタ
func NewProjectGroupService(
	db *gorm.DB,
	logger *zap.Logger,
	groupRepo repository.ProjectGroupRepositoryInterface,
	projectRepo repository.ProjectRepository,
	invoiceRepo repository.InvoiceRepository,
	transactionManager ProjectGroupTransactionManager,
) ProjectGroupServiceInterface {
	return &projectGroupService{
		db:                 db,
		logger:             logger,
		groupRepo:          groupRepo,
		projectRepo:        projectRepo,
		invoiceRepo:        invoiceRepo,
		transactionManager: transactionManager,
	}
}

// CreateProjectGroup プロジェクトグループを作成
func (s *projectGroupService) CreateProjectGroup(ctx context.Context, req *dto.CreateProjectGroupRequest, creatorID string) (*dto.ProjectGroupDTO, error) {
	// 名前の重複チェック
	exists, err := s.groupRepo.ExistsByName(ctx, req.GroupName, req.ClientID, nil)
	if err != nil {
		s.logger.Error("Failed to check group name existence", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループ名の確認に失敗しました")
	}
	if exists {
		return nil, fmt.Errorf("同じ名前のプロジェクトグループが既に存在します")
	}

	// プロジェクトグループを作成
	group := &model.ProjectGroup{
		GroupName:   req.GroupName,
		ClientID:    req.ClientID,
		Description: req.Description,
		// BillingNotes: req.BillingNotes, // TODO: フィールド追加予定
		// IsActive:     true, // DeletedAtで管理
		CreatedBy: creatorID,
		// UpdatedBy:    creatorID, // TODO: フィールド追加予定
	}

	// トランザクション内で処理
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション用リポジトリを作成
		groupRepo := repository.NewProjectGroupRepository(tx, s.logger)
		// グループを作成
		if err := groupRepo.Create(ctx, group); err != nil {
			return err
		}

		// プロジェクトを追加
		if len(req.ProjectIDs) > 0 {
			if err := groupRepo.AddProjects(ctx, group.ID, req.ProjectIDs); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to create project group", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループの作成に失敗しました")
	}

	// レスポンスを作成
	return s.convertToResponse(group), nil
}

// GetProjectGroup プロジェクトグループを取得
func (s *projectGroupService) GetProjectGroup(ctx context.Context, id string) (*dto.ProjectGroupDetailDTO, error) {
	group, err := s.groupRepo.GetByIDWithDetails(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get project group", zap.Error(err), zap.String("id", id))
		return nil, fmt.Errorf("プロジェクトグループの取得に失敗しました")
	}
	if group == nil {
		return nil, fmt.Errorf("プロジェクトグループが見つかりません")
	}

	return s.convertToDetailResponse(group), nil
}

// UpdateProjectGroup プロジェクトグループを更新
func (s *projectGroupService) UpdateProjectGroup(ctx context.Context, id string, req *dto.UpdateProjectGroupRequest) (*dto.ProjectGroupDTO, error) {
	// 既存のグループを取得
	group, err := s.groupRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get project group for update", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループの取得に失敗しました")
	}
	if group == nil {
		return nil, fmt.Errorf("プロジェクトグループが見つかりません")
	}

	// 名前変更時の重複チェック
	if req.GroupName != nil && *req.GroupName != group.GroupName {
		exists, err := s.groupRepo.ExistsByName(ctx, *req.GroupName, group.ClientID, &id)
		if err != nil {
			s.logger.Error("Failed to check group name existence", zap.Error(err))
			return nil, fmt.Errorf("プロジェクトグループ名の確認に失敗しました")
		}
		if exists {
			return nil, fmt.Errorf("同じ名前のプロジェクトグループが既に存在します")
		}
		group.GroupName = *req.GroupName
	}

	// その他のフィールドを更新
	if req.Description != nil {
		group.Description = *req.Description
	}
	// if req.BillingNotes != nil {
	//	group.BillingNotes = req.BillingNotes // TODO: フィールド追加予定
	// }
	// if req.IsActive != nil {
	//	group.IsActive = *req.IsActive // TODO: DeletedAtで管理
	// }

	// 更新を実行
	if err := s.groupRepo.Update(ctx, group); err != nil {
		s.logger.Error("Failed to update project group", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループの更新に失敗しました")
	}

	return s.convertToResponse(group), nil
}

// DeleteProjectGroup プロジェクトグループを削除
func (s *projectGroupService) DeleteProjectGroup(ctx context.Context, id string) error {
	// 既存のグループを確認
	exists, err := s.groupRepo.ExistsByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to check project group existence", zap.Error(err))
		return fmt.Errorf("プロジェクトグループの確認に失敗しました")
	}
	if !exists {
		return fmt.Errorf("プロジェクトグループが見つかりません")
	}

	// 関連する請求書があるか確認
	invoices, err := s.invoiceRepo.FindByProjectGroupID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to check related invoices", zap.Error(err))
		return fmt.Errorf("関連請求書の確認に失敗しました")
	}
	if len(invoices) > 0 {
		return fmt.Errorf("このプロジェクトグループには%d件の請求書が関連付けられているため削除できません", len(invoices))
	}

	// 削除を実行
	if err := s.groupRepo.Delete(ctx, id); err != nil {
		s.logger.Error("Failed to delete project group", zap.Error(err))
		return fmt.Errorf("プロジェクトグループの削除に失敗しました")
	}

	return nil
}

// ListProjectGroups プロジェクトグループ一覧を取得
func (s *projectGroupService) ListProjectGroups(ctx context.Context, req *dto.ProjectGroupFilterRequest) (*dto.ProjectGroupListResponse, error) {
	// デフォルト値の設定
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Page < 1 {
		req.Page = 1
	}
	offset := (req.Page - 1) * req.Limit

	// 統計情報付きで取得
	groups, err := s.groupRepo.ListWithStats(ctx, req.ClientID, req.Limit, offset)
	if err != nil {
		s.logger.Error("Failed to list project groups", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループ一覧の取得に失敗しました")
	}

	// 総数を取得
	total, err := s.groupRepo.Count(ctx, req.ClientID)
	if err != nil {
		s.logger.Error("Failed to count project groups", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループ数の取得に失敗しました")
	}

	// レスポンスを作成
	items := make([]*dto.ProjectGroupWithStatsResponse, len(groups))
	for i, group := range groups {
		items[i] = s.convertToStatsResponse(group)
	}

	return &dto.ProjectGroupListResponse{
		Items: items,
		Total: int(total),
		Page:  req.Page,
		Limit: req.Limit,
	}, nil
}

// SearchProjectGroups プロジェクトグループを検索
func (s *projectGroupService) SearchProjectGroups(ctx context.Context, req *dto.ProjectGroupFilterRequest) (*dto.ProjectGroupListResponse, error) {
	// デフォルト値の設定
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Page < 1 {
		req.Page = 1
	}
	offset := (req.Page - 1) * req.Limit

	// 検索を実行
	// TODO: QueryDTOフィールドの追加が必要
	groups, err := s.groupRepo.Search(ctx, "", req.ClientID, req.Limit, offset)
	if err != nil {
		s.logger.Error("Failed to search project groups", zap.Error(err))
		return nil, fmt.Errorf("プロジェクトグループの検索に失敗しました")
	}

	// レスポンスを作成
	items := make([]*dto.ProjectGroupWithStatsResponse, len(groups))
	for i, group := range groups {
		// 簡易的な統計情報を作成
		stats := &model.ProjectGroupWithProjects{
			ProjectGroup: *group,
			ProjectCount: 0, // 検索時は詳細統計を含めない
		}
		items[i] = s.convertToStatsResponse(stats)
	}

	return &dto.ProjectGroupListResponse{
		Items: items,
		Total: len(items), // 検索結果の件数
		Page:  req.Page,
		Limit: req.Limit,
	}, nil
}

// AddProjectsToGroup プロジェクトをグループに追加
func (s *projectGroupService) AddProjectsToGroup(ctx context.Context, groupID string, projectIDs []string) error {
	// バリデーション
	if err := s.groupRepo.CanAddProjects(ctx, groupID, projectIDs); err != nil {
		return err
	}

	// プロジェクトを追加
	if err := s.groupRepo.AddProjects(ctx, groupID, projectIDs); err != nil {
		s.logger.Error("Failed to add projects to group", zap.Error(err))
		return fmt.Errorf("プロジェクトの追加に失敗しました")
	}

	return nil
}

// RemoveProjectsFromGroup プロジェクトをグループから削除
func (s *projectGroupService) RemoveProjectsFromGroup(ctx context.Context, groupID string, projectIDs []string) error {
	// グループの存在確認
	exists, err := s.groupRepo.ExistsByID(ctx, groupID)
	if err != nil {
		s.logger.Error("Failed to check project group existence", zap.Error(err))
		return fmt.Errorf("プロジェクトグループの確認に失敗しました")
	}
	if !exists {
		return fmt.Errorf("プロジェクトグループが見つかりません")
	}

	// プロジェクトを削除
	if err := s.groupRepo.RemoveProjects(ctx, groupID, projectIDs); err != nil {
		s.logger.Error("Failed to remove projects from group", zap.Error(err))
		return fmt.Errorf("プロジェクトの削除に失敗しました")
	}

	return nil
}

// GetGroupProjects グループのプロジェクト一覧を取得
func (s *projectGroupService) GetGroupProjects(ctx context.Context, groupID string) ([]*dto.ProjectSummaryDTO, error) {
	projects, err := s.groupRepo.GetProjectsByGroupID(ctx, groupID)
	if err != nil {
		s.logger.Error("Failed to get group projects", zap.Error(err))
		return nil, fmt.Errorf("プロジェクト一覧の取得に失敗しました")
	}

	// DTOに変換
	responses := make([]*dto.ProjectSummaryDTO, len(projects))
	for i, project := range projects {
		responses[i] = s.convertProjectToResponse(project)
	}

	return responses, nil
}

// GetAvailableProjects グループに追加可能なプロジェクト一覧を取得
func (s *projectGroupService) GetAvailableProjects(ctx context.Context, clientID string) ([]*dto.ProjectSummaryDTO, error) {
	// クライアントの全プロジェクトを取得
	projects, err := s.projectRepo.FindByClientID(ctx, clientID)
	if err != nil {
		s.logger.Error("Failed to get client projects", zap.Error(err))
		return nil, fmt.Errorf("プロジェクト一覧の取得に失敗しました")
	}

	// 既にグループに属しているプロジェクトを除外
	availableProjects := make([]*dto.ProjectSummaryDTO, 0)
	for _, project := range projects {
		groups, err := s.groupRepo.GetGroupsByProjectID(ctx, project.ID)
		if err != nil {
			s.logger.Warn("Failed to get project groups", zap.Error(err), zap.String("project_id", project.ID))
			continue
		}

		// グループに属していないプロジェクトのみ追加
		if len(groups) == 0 {
			availableProjects = append(availableProjects, s.convertProjectToResponse(project))
		}
	}

	return availableProjects, nil
}

// GetProjectGroupStats プロジェクトグループの統計情報を取得
func (s *projectGroupService) GetProjectGroupStats(ctx context.Context, clientID *string) (*dto.ProjectGroupStatsDTO, error) {
	stats, err := s.groupRepo.GetStats(ctx, clientID)
	if err != nil {
		s.logger.Error("Failed to get project group stats", zap.Error(err))
		return nil, fmt.Errorf("統計情報の取得に失敗しました")
	}

	return &dto.ProjectGroupStatsDTO{
		TotalGroups:    stats.TotalGroups,
		ActiveGroups:   stats.ActiveGroups,
		TotalProjects:  stats.TotalProjects,
		TotalRevenue:   stats.TotalRevenue,
		AverageRevenue: stats.AverageRevenue,
	}, nil
}

// GetGroupRevenue グループの収益を取得
func (s *projectGroupService) GetGroupRevenue(ctx context.Context, groupID string, startMonth, endMonth string) (map[string]interface{}, error) {
	revenue, err := s.groupRepo.GetGroupRevenue(ctx, groupID, startMonth, endMonth)
	if err != nil {
		s.logger.Error("Failed to get group revenue", zap.Error(err))
		return nil, fmt.Errorf("グループ収益の取得に失敗しました")
	}

	return map[string]interface{}{
		"group_id":    groupID,
		"start_month": startMonth,
		"end_month":   endMonth,
		"revenue":     revenue,
	}, nil
}

// ValidateProjectsForGroup プロジェクトのグループ追加可否を検証
func (s *projectGroupService) ValidateProjectsForGroup(ctx context.Context, groupID string, projectIDs []string) error {
	return s.groupRepo.CanAddProjects(ctx, groupID, projectIDs)
}

// convertToResponse ProjectGroupをレスポンスDTOに変換
func (s *projectGroupService) convertToResponse(group *model.ProjectGroup) *dto.ProjectGroupDTO {
	return &dto.ProjectGroupDTO{
		ID:          group.ID,
		GroupName:   group.GroupName,
		ClientID:    group.ClientID,
		ClientName:  "", // 必要に応じてクライアント情報を取得
		Description: group.Description,
		// BillingNotes: group.BillingNotes, // TODO: フィールド追加予定
		// IsActive:     group.IsActive, // TODO: DeletedAtで管理
		CreatedAt: group.CreatedAt,
		UpdatedAt: group.UpdatedAt,
	}
}

// convertToDetailResponse ProjectGroupを詳細レスポンスDTOに変換
func (s *projectGroupService) convertToDetailResponse(group *model.ProjectGroup) *dto.ProjectGroupDetailDTO {
	response := &dto.ProjectGroupDetailDTO{
		ProjectGroupDTO: dto.ProjectGroupDTO{
			ID:          group.ID,
			GroupName:   group.GroupName,
			ClientID:    group.ClientID,
			ClientName:  "", // 必要に応じてクライアント情報を設定
			Description: group.Description,
			CreatedBy:   group.CreatedBy,
			CreatedAt:   group.CreatedAt,
			UpdatedAt:   group.UpdatedAt,
		},
		ProjectCount:    0,
		ActiveProjects:  0,
		TotalRevenue:    0,
		LastInvoiceDate: nil,
		Projects:        make([]dto.ProjectSummaryDTO, 0),
		RecentInvoices:  make([]dto.InvoiceListSummaryDTO, 0),
	}

	// クライアント名を設定
	if group.Client.ID != "" {
		response.ProjectGroupDTO.ClientName = group.Client.CompanyName
	}

	// プロジェクトを設定
	for _, project := range group.Projects {
		response.Projects = append(response.Projects, *s.convertProjectToResponse(&project))
	}

	return response
}

// convertToStatsResponse ProjectGroupWithProjectsを統計付きレスポンスDTOに変換
func (s *projectGroupService) convertToStatsResponse(stats *model.ProjectGroupWithProjects) *dto.ProjectGroupWithStatsResponse {
	response := &dto.ProjectGroupWithStatsResponse{
		ProjectGroupResponse: dto.ProjectGroupDTO{
			ID:          stats.ID,
			GroupName:   stats.GroupName,
			ClientID:    stats.ClientID,
			ClientName:  "", // 必要に応じてクライアント情報を設定
			Description: stats.Description,
			// BillingNotes: stats.BillingNotes, // TODO: フィールド追加予定
			// IsActive:     stats.IsActive, // TODO: DeletedAtで管理
			CreatedBy: uuid.New().String(), // TODO: 実際のCreatedBy
			CreatedAt: stats.CreatedAt,
			UpdatedAt: stats.UpdatedAt,
		},
		ProjectCount:    stats.ProjectCount,
		TotalRevenue:    stats.TotalRevenue,
		LastInvoiceDate: stats.LastInvoiceDate,
	}

	// クライアント名を設定
	if stats.Client.ID != "" {
		response.ClientName = stats.Client.CompanyName
	}

	return response
}

// convertProjectToResponse ProjectをレスポンスDTOに変換
func (s *projectGroupService) convertProjectToResponse(project *model.Project) *dto.ProjectSummaryDTO {
	return &dto.ProjectSummaryDTO{
		ID:            project.ID,
		ProjectName:   project.ProjectName,
		ProjectCode:   project.ProjectCode,
		Status:        string(project.Status),
		StartDate:     project.StartDate,
		EndDate:       project.EndDate,
		MonthlyRate:   project.MonthlyRate,
		AssignedCount: 0, // TODO: 実際のアサイン数を取得
		IsActive:      project.DeletedAt.Time.IsZero(),
	}
}
