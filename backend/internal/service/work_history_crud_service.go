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

// ヘルパー関数
func convertToString(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

func convertToInt32(ptr *int32) int32 {
	if ptr == nil {
		return 0
	}
	return *ptr
}

// WorkHistoryCRUDService 職務経歴個別管理サービスのインターフェース
type WorkHistoryCRUDService interface {
	GetByID(ctx context.Context, id string) (*model.WorkHistory, error)
	GetByUserID(ctx context.Context, userID string, page, limit int) ([]*model.WorkHistory, int64, error)
	Create(ctx context.Context, req *dto.WorkHistoryCreateRequest) (*model.WorkHistory, error)
	Update(ctx context.Context, id string, req *dto.WorkHistoryUpdateRequest) error
	Delete(ctx context.Context, id string) error
	ValidateWorkHistory(req interface{}) error
}

// workHistoryCRUDService 職務経歴個別管理サービスの実装
type workHistoryCRUDService struct {
	db                  *gorm.DB
	workHistoryRepo     repository.WorkHistoryRepository
	technologyCategoryRepo repository.TechnologyCategoryRepository
	logger              *zap.Logger
}

// NewWorkHistoryCRUDService 職務経歴個別管理サービスのコンストラクタ
func NewWorkHistoryCRUDService(
	db *gorm.DB,
	workHistoryRepo repository.WorkHistoryRepository,
	technologyCategoryRepo repository.TechnologyCategoryRepository,
	logger *zap.Logger,
) WorkHistoryCRUDService {
	return &workHistoryCRUDService{
		db:                  db,
		workHistoryRepo:     workHistoryRepo,
		technologyCategoryRepo: technologyCategoryRepo,
		logger:              logger,
	}
}

// GetByID IDで職務経歴を取得
func (s *workHistoryCRUDService) GetByID(ctx context.Context, id string) (*model.WorkHistory, error) {
	s.logger.Info("Getting work history by ID", zap.String("id", id))
	
	workHistory, err := s.workHistoryRepo.GetWithTechnologies(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get work history", zap.Error(err), zap.String("id", id))
		return nil, err
	}
	
	if workHistory == nil {
		s.logger.Warn("Work history not found", zap.String("id", id))
		return nil, fmt.Errorf("職務経歴が見つかりません")
	}
	
	return workHistory, nil
}

// GetByUserID ユーザーIDで職務経歴一覧を取得
func (s *workHistoryCRUDService) GetByUserID(ctx context.Context, userID string, page, limit int) ([]*model.WorkHistory, int64, error) {
	s.logger.Info("Getting work histories by user ID", 
		zap.String("user_id", userID),
		zap.Int("page", page),
		zap.Int("limit", limit))
	
	// ページネーション設定
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	// 検索条件を作成
	req := dto.WorkHistoryQueryRequest{
		UserID: &userID,
		Page:   int32(page),
		Limit:  int32(limit),
		SortBy: "start_date",
		SortOrder: "DESC",
	}
	
	workHistories, total, err := s.workHistoryRepo.Search(ctx, req)
	if err != nil {
		s.logger.Error("Failed to get work histories", zap.Error(err), zap.String("user_id", userID))
		return nil, 0, err
	}
	
	return workHistories, total, nil
}

// Create 職務経歴を作成
func (s *workHistoryCRUDService) Create(ctx context.Context, req *dto.WorkHistoryCreateRequest) (*model.WorkHistory, error) {
	s.logger.Info("Creating work history", 
		zap.String("user_id", req.UserID),
		zap.String("project_name", req.ProjectName))
	
	// バリデーション
	if err := s.ValidateWorkHistory(req); err != nil {
		s.logger.Error("Validation failed", zap.Error(err))
		return nil, err
	}
	
	// Industry値のバリデーション（1-7の範囲チェック）
	industry := req.Industry
	if industry < 1 || industry > 7 {
		industry = 7 // その他
		s.logger.Warn("Invalid industry value, setting to その他",
			zap.Int32("original_value", req.Industry),
			zap.Int32("new_value", industry))
	}
	
	// 日付のパース
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		s.logger.Error("Failed to parse start date", zap.Error(err))
		return nil, fmt.Errorf("開始日の形式が不正です")
	}
	
	var endDate *time.Time
	if req.EndDate != nil && *req.EndDate != "" {
		ed, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			s.logger.Error("Failed to parse end date", zap.Error(err))
			return nil, fmt.Errorf("終了日の形式が不正です")
		}
		endDate = &ed
	}
	
	// 職務経歴モデルを作成
	workHistory := &model.WorkHistory{
		ID:               uuid.New().String(),
		UserID:           req.UserID,
		ProfileID:        req.ProfileID,
		ProjectName:      req.ProjectName,
		StartDate:        startDate,
		EndDate:          endDate,
		Industry:         industry,
		ProjectOverview:  convertToString(req.ProjectOverview),
		Responsibilities: convertToString(req.Responsibilities),
		Achievements:     convertToString(req.Achievements),
		Notes:            convertToString(req.Remarks),
		TeamSize:         convertToInt32(req.TeamSize),
		Role:             req.Role,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	
	// 技術項目を作成
	var technologies []model.WorkHistoryTechnology
	for _, tech := range req.Technologies {
		technologies = append(technologies, model.WorkHistoryTechnology{
			ID:             uuid.New().String(),
			WorkHistoryID:  workHistory.ID,
			CategoryID:     tech.CategoryID,
			TechnologyName: tech.TechnologyName,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		})
	}
	
	// トランザクションで作成
	err = s.workHistoryRepo.CreateWithTechnologies(ctx, workHistory, technologies)
	if err != nil {
		s.logger.Error("Failed to create work history", zap.Error(err))
		return nil, err
	}
	
	s.logger.Info("Work history created successfully", 
		zap.String("id", workHistory.ID),
		zap.String("user_id", workHistory.UserID))
	
	return workHistory, nil
}

// Update 職務経歴を更新
func (s *workHistoryCRUDService) Update(ctx context.Context, id string, req *dto.WorkHistoryUpdateRequest) error {
	s.logger.Info("Updating work history", zap.String("id", id))
	
	// バリデーション
	if err := s.ValidateWorkHistory(req); err != nil {
		s.logger.Error("Validation failed", zap.Error(err))
		return err
	}
	
	// 既存の職務経歴を取得
	existing, err := s.workHistoryRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get existing work history", zap.Error(err))
		return err
	}
	if existing == nil {
		s.logger.Warn("Work history not found", zap.String("id", id))
		return fmt.Errorf("職務経歴が見つかりません")
	}
	
	// 更新フィールドを適用
	if req.ProjectName != nil {
		existing.ProjectName = *req.ProjectName
	}
	if req.StartDate != nil {
		startDate, err := time.Parse("2006-01-02", *req.StartDate)
		if err != nil {
			return fmt.Errorf("開始日の形式が不正です")
		}
		existing.StartDate = startDate
	}
	if req.EndDate != nil {
		if *req.EndDate == "" {
			existing.EndDate = nil
		} else {
			endDate, err := time.Parse("2006-01-02", *req.EndDate)
			if err != nil {
				return fmt.Errorf("終了日の形式が不正です")
			}
			existing.EndDate = &endDate
		}
	}
	if req.Industry != nil {
		// Industry値のバリデーション（*stringから数値に変換）
		industryInt := int32(0)
		// 文字列から数値への変換を試みる
		fmt.Sscanf(*req.Industry, "%d", &industryInt)
		
		if industryInt < 1 || industryInt > 7 {
			industryInt = 7 // その他
			s.logger.Warn("Invalid industry value, setting to その他",
				zap.String("original_value", *req.Industry),
				zap.Int32("new_value", industryInt))
		}
		existing.Industry = industryInt
	}
	if req.ProjectOverview != nil {
		existing.ProjectOverview = *req.ProjectOverview
	}
	if req.Responsibilities != nil {
		existing.Responsibilities = *req.Responsibilities
	}
	if req.Achievements != nil {
		existing.Achievements = *req.Achievements
	}
	if req.Remarks != nil {
		existing.Notes = *req.Remarks
	}
	if req.TeamSize != nil {
		existing.TeamSize = *req.TeamSize
	}
	if req.Role != nil {
		existing.Role = *req.Role
	}
	
	existing.UpdatedAt = time.Now()
	
	// 技術項目を更新
	var technologies []model.WorkHistoryTechnology
	if len(req.Technologies) > 0 {
		for _, tech := range req.Technologies {
			technologies = append(technologies, model.WorkHistoryTechnology{
				ID:             uuid.New().String(),
				WorkHistoryID:  id,
				CategoryID:     tech.CategoryID,
				TechnologyName: tech.TechnologyName,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			})
		}
	}
	
	// トランザクションで更新
	err = s.workHistoryRepo.UpdateWithTechnologies(ctx, existing, technologies)
	if err != nil {
		s.logger.Error("Failed to update work history", zap.Error(err))
		return err
	}
	
	s.logger.Info("Work history updated successfully", zap.String("id", id))
	
	return nil
}

// Delete 職務経歴を削除
func (s *workHistoryCRUDService) Delete(ctx context.Context, id string) error {
	s.logger.Info("Deleting work history", zap.String("id", id))
	
	// 存在確認
	existing, err := s.workHistoryRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get work history", zap.Error(err))
		return err
	}
	if existing == nil {
		s.logger.Warn("Work history not found", zap.String("id", id))
		return fmt.Errorf("職務経歴が見つかりません")
	}
	
	// 削除実行（論理削除）
	err = s.workHistoryRepo.Delete(ctx, id)
	if err != nil {
		s.logger.Error("Failed to delete work history", zap.Error(err))
		return err
	}
	
	s.logger.Info("Work history deleted successfully", zap.String("id", id))
	
	return nil
}

// ValidateWorkHistory 職務経歴のバリデーション
func (s *workHistoryCRUDService) ValidateWorkHistory(req interface{}) error {
	switch r := req.(type) {
	case *dto.WorkHistoryCreateRequest:
		// 必須フィールドのチェック
		if r.UserID == "" {
			return fmt.Errorf("ユーザーIDは必須です")
		}
		if r.ProfileID == "" {
			return fmt.Errorf("プロフィールIDは必須です")
		}
		if r.ProjectName == "" {
			return fmt.Errorf("プロジェクト名は必須です")
		}
		if r.StartDate == "" {
			return fmt.Errorf("開始日は必須です")
		}
		if r.Role == "" {
			return fmt.Errorf("役割は必須です")
		}
		
		// 日付の妥当性チェック
		startDate, err := time.Parse("2006-01-02", r.StartDate)
		if err != nil {
			return fmt.Errorf("開始日の形式が不正です（YYYY-MM-DD）")
		}
		
		if r.EndDate != nil && *r.EndDate != "" {
			endDate, err := time.Parse("2006-01-02", *r.EndDate)
			if err != nil {
				return fmt.Errorf("終了日の形式が不正です（YYYY-MM-DD）")
			}
			if endDate.Before(startDate) {
				return fmt.Errorf("終了日は開始日より後である必要があります")
			}
		}
		
		// 文字数制限チェック
		if len(r.ProjectName) > 255 {
			return fmt.Errorf("プロジェクト名は255文字以内にしてください")
		}
		if r.CompanyName != nil && len(*r.CompanyName) > 255 {
			return fmt.Errorf("会社名は255文字以内にしてください")
		}
		if r.ProjectOverview != nil && len(*r.ProjectOverview) > 2000 {
			return fmt.Errorf("プロジェクト概要は2000文字以内にしてください")
		}
		if r.Responsibilities != nil && len(*r.Responsibilities) > 2000 {
			return fmt.Errorf("担当業務は2000文字以内にしてください")
		}
		if r.Achievements != nil && len(*r.Achievements) > 2000 {
			return fmt.Errorf("成果・実績は2000文字以内にしてください")
		}
		if r.Remarks != nil && len(*r.Remarks) > 1000 {
			return fmt.Errorf("備考は1000文字以内にしてください")
		}
		if len(r.Role) > 100 {
			return fmt.Errorf("役割は100文字以内にしてください")
		}
		
		// チーム規模の範囲チェック
		if r.TeamSize != nil && (*r.TeamSize < 1 || *r.TeamSize > 1000) {
			return fmt.Errorf("チーム規模は1〜1000の範囲で入力してください")
		}
		
	case *dto.WorkHistoryUpdateRequest:
		// 更新の場合は、提供されたフィールドのみをチェック
		if r.ProjectName != nil && *r.ProjectName == "" {
			return fmt.Errorf("プロジェクト名は空にできません")
		}
		if r.StartDate != nil && *r.StartDate == "" {
			return fmt.Errorf("開始日は空にできません")
		}
		if r.Role != nil && *r.Role == "" {
			return fmt.Errorf("役割は空にできません")
		}
		
		// 日付の妥当性チェック（提供された場合）
		if r.StartDate != nil && r.EndDate != nil && *r.EndDate != "" {
			startDate, err := time.Parse("2006-01-02", *r.StartDate)
			if err != nil {
				return fmt.Errorf("開始日の形式が不正です（YYYY-MM-DD）")
			}
			endDate, err := time.Parse("2006-01-02", *r.EndDate)
			if err != nil {
				return fmt.Errorf("終了日の形式が不正です（YYYY-MM-DD）")
			}
			if endDate.Before(startDate) {
				return fmt.Errorf("終了日は開始日より後である必要があります")
			}
		}
		
		// 文字数制限チェック（提供された場合）
		if r.ProjectName != nil && len(*r.ProjectName) > 255 {
			return fmt.Errorf("プロジェクト名は255文字以内にしてください")
		}
		if r.CompanyName != nil && len(*r.CompanyName) > 255 {
			return fmt.Errorf("会社名は255文字以内にしてください")
		}
		if r.ProjectOverview != nil && len(*r.ProjectOverview) > 2000 {
			return fmt.Errorf("プロジェクト概要は2000文字以内にしてください")
		}
		if r.Responsibilities != nil && len(*r.Responsibilities) > 2000 {
			return fmt.Errorf("担当業務は2000文字以内にしてください")
		}
		if r.Achievements != nil && len(*r.Achievements) > 2000 {
			return fmt.Errorf("成果・実績は2000文字以内にしてください")
		}
		if r.Remarks != nil && len(*r.Remarks) > 1000 {
			return fmt.Errorf("備考は1000文字以内にしてください")
		}
		if r.Role != nil && len(*r.Role) > 100 {
			return fmt.Errorf("役割は100文字以内にしてください")
		}
		
		// チーム規模の範囲チェック（提供された場合）
		if r.TeamSize != nil && (*r.TeamSize < 1 || *r.TeamSize > 1000) {
			return fmt.Errorf("チーム規模は1〜1000の範囲で入力してください")
		}
		
	default:
		return fmt.Errorf("不正なリクエストタイプです")
	}
	
	return nil
}