package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SalesService 営業サービスのインターフェース
type SalesService interface {
	GetSalesActivities(ctx context.Context, req *dto.SalesActivitySearchRequest) ([]dto.SalesActivityDTO, int64, error)
	GetSalesActivityByID(ctx context.Context, activityID uuid.UUID) (*dto.SalesActivityDTO, error)
	CreateSalesActivity(ctx context.Context, userID string, req *dto.CreateSalesActivityRequest) (*dto.SalesActivityDTO, error)
	UpdateSalesActivity(ctx context.Context, activityID uuid.UUID, req *dto.UpdateSalesActivityRequest) (*dto.SalesActivityDTO, error)
	DeleteSalesActivity(ctx context.Context, activityID uuid.UUID) error
	GetSalesSummary(ctx context.Context, userID *string, dateFrom, dateTo *time.Time) (*dto.SalesSummaryDTO, error)
	GetSalesPipeline(ctx context.Context, userID *string) ([]dto.SalesPipelineDTO, error)
	GetExtensionTargets(ctx context.Context, days int) ([]dto.ExtensionTargetDTO, error)
	GetSalesTargets(ctx context.Context, month string) ([]dto.SalesTargetDTO, error)
}

// salesService 営業サービスの実装
type salesService struct {
	db                *gorm.DB
	salesActivityRepo repository.SalesActivityRepository
	clientRepo        repository.ClientRepository
	projectRepo       repository.ProjectRepository
	userRepo          repository.UserRepository
	logger            *zap.Logger
}

// NewSalesService 営業サービスのインスタンスを生成
func NewSalesService(
	db *gorm.DB,
	salesActivityRepo repository.SalesActivityRepository,
	clientRepo repository.ClientRepository,
	projectRepo repository.ProjectRepository,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) SalesService {
	return &salesService{
		db:                db,
		salesActivityRepo: salesActivityRepo,
		clientRepo:        clientRepo,
		projectRepo:       projectRepo,
		userRepo:          userRepo,
		logger:            logger,
	}
}

// GetSalesActivities 営業活動一覧を取得
func (s *salesService) GetSalesActivities(ctx context.Context, req *dto.SalesActivitySearchRequest) ([]dto.SalesActivityDTO, int64, error) {
	// デフォルト値設定
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}

	offset := (req.Page - 1) * req.Limit

	// クエリ構築
	query := s.db.WithContext(ctx).Model(&model.SalesActivity{}).
		Preload("Client").
		Preload("Project").
		Preload("User").
		Where("sales_activities.deleted_at IS NULL")

	// 検索条件
	if req.ClientID != nil {
		query = query.Where("client_id = ?", *req.ClientID)
	}

	if req.ProjectID != nil {
		query = query.Where("project_id = ?", *req.ProjectID)
	}

	if req.UserID != nil {
		query = query.Where("user_id = ?", *req.UserID)
	}

	if req.ActivityType != "" {
		query = query.Where("activity_type = ?", req.ActivityType)
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	if req.DateFrom != nil {
		query = query.Where("activity_date >= ?", *req.DateFrom)
	}

	if req.DateTo != nil {
		query = query.Where("activity_date <= ?", *req.DateTo)
	}

	// 総件数を取得
	var total int64
	if err := query.Count(&total).Error; err != nil {
		s.logger.Error("Failed to count sales activities", zap.Error(err))
		return nil, 0, err
	}

	// データを取得
	var activities []model.SalesActivity
	if err := query.
		Order("activity_date DESC").
		Limit(req.Limit).
		Offset(offset).
		Find(&activities).Error; err != nil {
		s.logger.Error("Failed to get sales activities", zap.Error(err))
		return nil, 0, err
	}

	// DTOに変換
	dtos := make([]dto.SalesActivityDTO, len(activities))
	for i, activity := range activities {
		dtos[i] = s.activityToDTO(&activity)
	}

	return dtos, total, nil
}

// GetSalesActivityByID 営業活動詳細を取得
func (s *salesService) GetSalesActivityByID(ctx context.Context, activityID uuid.UUID) (*dto.SalesActivityDTO, error) {
	var activity model.SalesActivity
	if err := s.db.WithContext(ctx).
		Preload("Client").
		Preload("Project").
		Preload("User").
		Where("id = ? AND deleted_at IS NULL", activityID).
		First(&activity).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("営業活動が見つかりません")
		}
		s.logger.Error("Failed to get sales activity", zap.Error(err))
		return nil, err
	}

	dto := s.activityToDTO(&activity)
	return &dto, nil
}

// CreateSalesActivity 営業活動を作成
func (s *salesService) CreateSalesActivity(ctx context.Context, userID string, req *dto.CreateSalesActivityRequest) (*dto.SalesActivityDTO, error) {
	// 取引先の存在確認
	exists, err := s.clientRepo.Exists(ctx, req.ClientID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("取引先が見つかりません")
	}

	// 案件の存在確認（指定されている場合）
	if req.ProjectID != nil {
		exists, err := s.projectRepo.Exists(ctx, *req.ProjectID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("案件が見つかりません")
		}
	}

	// モデルに変換
	// ステータスをDTOから営業活動用のステータスに変換
	var status model.SalesActivityStatus
	switch req.Status {
	case "planned":
		status = model.SalesActivityStatusPlanning
	case "completed":
		status = model.SalesActivityStatusWon
	case "cancelled":
		status = model.SalesActivityStatusLost
	default:
		status = model.SalesActivityStatusPlanning
	}

	activity := &model.SalesActivity{
		ClientID:       req.ClientID,
		ProjectID:      req.ProjectID,
		SalesRepID:     &userID,
		ActivityType:   model.SalesActivityType(req.ActivityType),
		Status:         status,
		NextAction:     req.NextActionTitle,
		NextActionDate: req.NextActionDate,
		Notes:          req.Description,
	}

	// 作成
	if err := s.salesActivityRepo.Create(ctx, activity); err != nil {
		s.logger.Error("Failed to create sales activity", zap.Error(err))
		return nil, err
	}

	// 作成した活動を取得して返す
	return s.GetSalesActivityByID(ctx, activity.ID)
}

// UpdateSalesActivity 営業活動を更新
func (s *salesService) UpdateSalesActivity(ctx context.Context, activityID uuid.UUID, req *dto.UpdateSalesActivityRequest) (*dto.SalesActivityDTO, error) {
	// トランザクション開始
	tx := s.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 既存の活動を取得
	var activity model.SalesActivity
	if err := tx.Where("id = ? AND deleted_at IS NULL", activityID).First(&activity).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("営業活動が見つかりません")
		}
		return nil, err
	}

	// 更新
	updates := map[string]interface{}{}
	if req.ActivityType != nil {
		updates["activity_type"] = *req.ActivityType
	}
	if req.ActivityDate != nil {
		updates["activity_date"] = *req.ActivityDate
	}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.NextActionDate != nil {
		updates["next_action_date"] = *req.NextActionDate
	}
	if req.NextActionTitle != nil {
		updates["next_action_title"] = *req.NextActionTitle
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if err := tx.Model(&activity).Updates(updates).Error; err != nil {
		tx.Rollback()
		s.logger.Error("Failed to update sales activity", zap.Error(err))
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 更新後のデータを取得
	return s.GetSalesActivityByID(ctx, activityID)
}

// DeleteSalesActivity 営業活動を削除
func (s *salesService) DeleteSalesActivity(ctx context.Context, activityID uuid.UUID) error {
	// 既存の活動を取得
	activity, err := s.salesActivityRepo.FindByID(ctx, activityID)
	if err != nil {
		return err
	}
	if activity == nil {
		return fmt.Errorf("営業活動が見つかりません")
	}

	// 論理削除
	if err := s.salesActivityRepo.Delete(ctx, activity); err != nil {
		s.logger.Error("Failed to delete sales activity", zap.Error(err))
		return err
	}

	return nil
}

// GetSalesSummary 営業サマリを取得
func (s *salesService) GetSalesSummary(ctx context.Context, userID *string, dateFrom, dateTo *time.Time) (*dto.SalesSummaryDTO, error) {
	summary, err := s.salesActivityRepo.GetActivitySummary(ctx, userID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}

	// パイプラインステージの取得
	pipelineStages := make(map[string]dto.PipelineStage)
	// TODO: パイプラインステージの実装

	return &dto.SalesSummaryDTO{
		TotalActivities:     summary.TotalActivities,
		CompletedActivities: summary.CompletedActivities,
		PlannedActivities:   summary.PlannedActivities,
		OverdueActivities:   summary.OverdueActivities,
		ActivityByType:      summary.ActivityByType,
		ActivityByUser:      summary.ActivityByUser,
		PipelineStages:      pipelineStages,
	}, nil
}

// GetSalesPipeline 営業パイプラインを取得
func (s *salesService) GetSalesPipeline(ctx context.Context, userID *string) ([]dto.SalesPipelineDTO, error) {
	// アクティブな案件を取得
	query := s.db.WithContext(ctx).Model(&model.Project{}).
		Preload("Client").
		Where("projects.status = ? AND projects.deleted_at IS NULL", model.ProjectStatusActive)

	var projects []model.Project
	if err := query.Find(&projects).Error; err != nil {
		s.logger.Error("Failed to get projects for pipeline", zap.Error(err))
		return nil, err
	}

	// DTOに変換
	pipelines := make([]dto.SalesPipelineDTO, 0)
	for _, project := range projects {
		// 最新の営業活動を取得
		var lastActivity model.SalesActivity
		s.db.WithContext(ctx).
			Where("project_id = ? AND deleted_at IS NULL", project.ID).
			Order("created_at DESC").
			First(&lastActivity)

		var lastActivityDate *time.Time
		if lastActivity.ID != uuid.Nil {
			lastActivityDate = &lastActivity.CreatedAt
		}

		pipeline := dto.SalesPipelineDTO{
			ID:            project.ID,
			ClientID:      project.ClientID,
			ClientName:    project.Client.CompanyName,
			ProjectName:   project.ProjectName,
			Stage:         "active", // TODO: ステージ管理の実装
			Probability:   80,       // TODO: 確率計算の実装
			ExpectedValue: project.MonthlyRate,
			ExpectedDate:  project.EndDate,
			LastActivity:  lastActivityDate,
			NextAction:    "", // TODO: 次のアクションの実装
			Owner:         "", // TODO: オーナー管理の実装
		}

		pipelines = append(pipelines, pipeline)
	}

	return pipelines, nil
}

// GetExtensionTargets 契約延長確認対象を取得
func (s *salesService) GetExtensionTargets(ctx context.Context, days int) ([]dto.ExtensionTargetDTO, error) {
	// 指定日数以内に終了する案件を取得
	targetDate := time.Now().AddDate(0, 0, days)

	var projects []model.Project
	if err := s.db.WithContext(ctx).
		Preload("Client").
		Preload("Assignments.User").
		Where("projects.status = ? AND projects.end_date <= ? AND projects.deleted_at IS NULL",
			model.ProjectStatusActive, targetDate).
		Find(&projects).Error; err != nil {
		s.logger.Error("Failed to get extension targets", zap.Error(err))
		return nil, err
	}

	// DTOに変換
	targets := make([]dto.ExtensionTargetDTO, len(projects))
	for i, project := range projects {
		// 最新の営業活動を取得
		var lastActivity model.SalesActivity
		s.db.WithContext(ctx).
			Where("project_id = ? AND deleted_at IS NULL", project.ID).
			Order("created_at DESC").
			First(&lastActivity)

		var lastContact *time.Time
		if lastActivity.ID != uuid.Nil {
			lastContact = &lastActivity.CreatedAt
		}

		// アサインされているユーザー名を取得
		assignedUsers := make([]string, len(project.Assignments))
		for j, assignment := range project.Assignments {
			assignedUsers[j] = fmt.Sprintf("%s %s", assignment.User.LastName, assignment.User.FirstName)
		}

		// 残日数を計算
		daysRemaining := 0
		if project.EndDate != nil {
			daysRemaining = int(time.Until(*project.EndDate).Hours() / 24)
		}

		targets[i] = dto.ExtensionTargetDTO{
			ProjectID:     project.ID,
			ProjectName:   project.ProjectName,
			ClientID:      project.ClientID,
			ClientName:    project.Client.CompanyName,
			EndDate:       project.EndDate,
			DaysRemaining: daysRemaining,
			AssignedUsers: assignedUsers,
			LastContact:   lastContact,
			Status:        "pending", // TODO: ステータス管理の実装
		}
	}

	return targets, nil
}

// GetSalesTargets 営業目標を取得
func (s *salesService) GetSalesTargets(ctx context.Context, month string) ([]dto.SalesTargetDTO, error) {
	// TODO: 営業目標の実装
	// 現在は仮実装として空の配列を返す
	return []dto.SalesTargetDTO{}, nil
}

// activityToDTO 活動をDTOに変換
func (s *salesService) activityToDTO(activity *model.SalesActivity) dto.SalesActivityDTO {
	// ステータスを営業活動用からDTOに変換
	var status string
	switch activity.Status {
	case model.SalesActivityStatusPlanning:
		status = "planned"
	case model.SalesActivityStatusWon:
		status = "completed"
	case model.SalesActivityStatusLost:
		status = "cancelled"
	default:
		status = "planned"
	}

	dto := dto.SalesActivityDTO{
		ID:        activity.ID,
		ClientID:  activity.ClientID,
		ProjectID: activity.ProjectID,
		UserID: func() uuid.UUID {
			if activity.SalesRepID != nil {
				return *activity.SalesRepID
			}
			return uuid.Nil
		}(),
		ActivityType:    string(activity.ActivityType),
		ActivityDate:    activity.CreatedAt,  // ActivityDateフィールドがないのでCreatedAtを使用
		Title:           activity.NextAction, // Titleフィールドがないので代替
		Description:     activity.Notes,
		NextActionDate:  activity.NextActionDate,
		NextActionTitle: activity.NextAction,
		Status:          status,
		CreatedAt:       activity.CreatedAt,
		UpdatedAt:       activity.UpdatedAt,
	}

	// ClientがPreloadされている場合、会社名を設定
	if activity.Client.ID != uuid.Nil {
		dto.ClientName = activity.Client.CompanyName
	}

	if activity.Project != nil {
		dto.ProjectName = activity.Project.ProjectName
	}

	if activity.SalesRep != nil {
		dto.UserName = fmt.Sprintf("%s %s", activity.SalesRep.LastName, activity.SalesRep.FirstName)
	}

	return dto
}
