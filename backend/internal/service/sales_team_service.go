package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SalesTeamService 営業チームサービスのインターフェース
type SalesTeamService interface {
	// メンバー管理
	CreateMember(ctx context.Context, req *CreateSalesTeamMemberRequest) (*model.SalesTeam, error)
	GetMemberByID(ctx context.Context, id string) (*model.SalesTeam, error)
	GetMemberByUserID(ctx context.Context, userID string) (*model.SalesTeam, error)
	UpdateMember(ctx context.Context, id string, req *UpdateSalesTeamMemberRequest) (*model.SalesTeam, error)
	DeleteMember(ctx context.Context, id string, deletedBy string) error

	// ステータス管理
	ActivateMember(ctx context.Context, id string, activatedBy string) error
	DeactivateMember(ctx context.Context, id string, deactivatedBy string) error

	// 一覧・検索
	GetMemberList(ctx context.Context, filter GetSalesTeamMemberFilter) (*SalesTeamMemberListResponse, error)
	GetActiveMembers(ctx context.Context) ([]*model.SalesTeam, error)
	GetMembersByRole(ctx context.Context, role string) ([]*model.SalesTeam, error)

	// 統計・分析
	GetTeamStatistics(ctx context.Context) (*SalesTeamStatistics, error)
}

// CreateSalesTeamMemberRequest 営業チームメンバー作成リクエスト
type CreateSalesTeamMemberRequest struct {
	UserID      string   `json:"user_id" binding:"required"`
	TeamRole    string   `json:"team_role" binding:"required"`
	Permissions []string `json:"permissions"`
	CreatedBy   string   `json:"created_by" binding:"required"`
}

// UpdateSalesTeamMemberRequest 営業チームメンバー更新リクエスト
type UpdateSalesTeamMemberRequest struct {
	TeamRole    string   `json:"team_role"`
	Permissions []string `json:"permissions"`
	UpdatedBy   string   `json:"updated_by" binding:"required"`
}

// GetSalesTeamMemberFilter 営業チームメンバー取得フィルター
type GetSalesTeamMemberFilter struct {
	TeamRole string `json:"team_role"`
	IsActive *bool  `json:"is_active"`
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
}

// SalesTeamMemberListResponse 営業チームメンバー一覧レスポンス
type SalesTeamMemberListResponse struct {
	Members []*model.SalesTeam `json:"members"`
	Total   int64              `json:"total"`
	Page    int                `json:"page"`
	Limit   int                `json:"limit"`
}

// SalesTeamStatistics 営業チーム統計
type SalesTeamStatistics struct {
	TotalMembers     int                `json:"total_members"`
	ActiveMembers    int                `json:"active_members"`
	InactiveMembers  int                `json:"inactive_members"`
	RoleDistribution map[string]int     `json:"role_distribution"`
	RecentJoins      []*model.SalesTeam `json:"recent_joins"`
	RecentLeaves     []*model.SalesTeam `json:"recent_leaves"`
}

// salesTeamService 営業チームサービスの実装
type salesTeamService struct {
	db        *gorm.DB
	salesRepo repository.SalesTeamRepository
	userRepo  repository.UserRepository
	logger    *zap.Logger
}

// NewSalesTeamService 営業チームサービスのインスタンスを生成
func NewSalesTeamService(db *gorm.DB, salesRepo repository.SalesTeamRepository, userRepo repository.UserRepository, logger *zap.Logger) SalesTeamService {
	return &salesTeamService{
		db:        db,
		salesRepo: salesRepo,
		userRepo:  userRepo,
		logger:    logger,
	}
}

// CreateMember 営業チームメンバーを作成
func (s *salesTeamService) CreateMember(ctx context.Context, req *CreateSalesTeamMemberRequest) (*model.SalesTeam, error) {
	// ユーザーの存在確認
	userUUID := req.UserID
	_, err := s.userRepo.FindByID(userUUID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("ユーザーが見つかりません")
		}
		return nil, fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
	}

	// 既存メンバーチェック
	_, err = s.salesRepo.GetByUserID(ctx, req.UserID)
	if err == nil {
		return nil, fmt.Errorf("このユーザーは既に営業チームのメンバーです")
	}
	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("既存メンバーの確認に失敗しました: %w", err)
	}

	// 権限をJSON文字列に変換
	permissionsJSON := `[]`
	if len(req.Permissions) > 0 {
		permBytes, err := json.Marshal(req.Permissions)
		if err != nil {
			return nil, fmt.Errorf("権限データの変換に失敗しました: %w", err)
		}
		permissionsJSON = string(permBytes)
	}

	member := &model.SalesTeam{
		ID:          uuid.New().String(),
		UserID:      userUUID,
		TeamRole:    req.TeamRole,
		IsActive:    true,
		JoinedAt:    time.Now(),
		Permissions: permissionsJSON,
		CreatedBy:   req.CreatedBy,
		UpdatedBy:   req.CreatedBy,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.salesRepo.Create(ctx, member); err != nil {
		s.logger.Error("Failed to create sales team member", zap.Error(err))
		return nil, fmt.Errorf("営業チームメンバーの作成に失敗しました: %w", err)
	}

	// 作成されたメンバーを返す前にUserをPreload
	return s.salesRepo.GetByID(ctx, member.ID)
}

// GetMemberByID IDで営業チームメンバーを取得
func (s *salesTeamService) GetMemberByID(ctx context.Context, id string) (*model.SalesTeam, error) {
	member, err := s.salesRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("営業チームメンバーが見つかりません")
		}
		return nil, fmt.Errorf("営業チームメンバーの取得に失敗しました: %w", err)
	}
	return member, nil
}

// GetMemberByUserID ユーザーIDで営業チームメンバーを取得
func (s *salesTeamService) GetMemberByUserID(ctx context.Context, userID string) (*model.SalesTeam, error) {
	member, err := s.salesRepo.GetByUserID(ctx, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("営業チームメンバーが見つかりません")
		}
		return nil, fmt.Errorf("営業チームメンバーの取得に失敗しました: %w", err)
	}
	return member, nil
}

// UpdateMember 営業チームメンバーを更新
func (s *salesTeamService) UpdateMember(ctx context.Context, id string, req *UpdateSalesTeamMemberRequest) (*model.SalesTeam, error) {
	member, err := s.salesRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("営業チームメンバーが見つかりません")
		}
		return nil, fmt.Errorf("営業チームメンバーの取得に失敗しました: %w", err)
	}

	// 更新内容を反映
	if req.TeamRole != "" {
		member.TeamRole = req.TeamRole
	}

	if req.Permissions != nil {
		permBytes, err := json.Marshal(req.Permissions)
		if err != nil {
			return nil, fmt.Errorf("権限データの変換に失敗しました: %w", err)
		}
		member.Permissions = string(permBytes)
	}

	member.UpdatedBy = req.UpdatedBy
	member.UpdatedAt = time.Now()

	if err := s.salesRepo.Update(ctx, member); err != nil {
		s.logger.Error("Failed to update sales team member", zap.Error(err))
		return nil, fmt.Errorf("営業チームメンバーの更新に失敗しました: %w", err)
	}

	return s.salesRepo.GetByID(ctx, id)
}

// DeleteMember 営業チームメンバーを削除
func (s *salesTeamService) DeleteMember(ctx context.Context, id string, deletedBy string) error {
	if err := s.salesRepo.Delete(ctx, id, deletedBy); err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("営業チームメンバーが見つかりません")
		}
		s.logger.Error("Failed to delete sales team member", zap.Error(err))
		return fmt.Errorf("営業チームメンバーの削除に失敗しました: %w", err)
	}
	return nil
}

// ActivateMember 営業チームメンバーをアクティブ化
func (s *salesTeamService) ActivateMember(ctx context.Context, id string, activatedBy string) error {
	if err := s.salesRepo.UpdateStatus(ctx, id, true, activatedBy); err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("営業チームメンバーが見つかりません")
		}
		s.logger.Error("Failed to activate sales team member", zap.Error(err))
		return fmt.Errorf("営業チームメンバーのアクティブ化に失敗しました: %w", err)
	}
	return nil
}

// DeactivateMember 営業チームメンバーを非アクティブ化
func (s *salesTeamService) DeactivateMember(ctx context.Context, id string, deactivatedBy string) error {
	if err := s.salesRepo.UpdateStatus(ctx, id, false, deactivatedBy); err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("営業チームメンバーが見つかりません")
		}
		s.logger.Error("Failed to deactivate sales team member", zap.Error(err))
		return fmt.Errorf("営業チームメンバーの非アクティブ化に失敗しました: %w", err)
	}
	return nil
}

// GetMemberList 営業チームメンバー一覧を取得
func (s *salesTeamService) GetMemberList(ctx context.Context, filter GetSalesTeamMemberFilter) (*SalesTeamMemberListResponse, error) {
	repoFilter := repository.SalesTeamFilter{
		TeamRole: filter.TeamRole,
		IsActive: filter.IsActive,
		Page:     filter.Page,
		Limit:    filter.Limit,
	}

	members, total, err := s.salesRepo.GetList(ctx, repoFilter)
	if err != nil {
		s.logger.Error("Failed to get sales team member list", zap.Error(err))
		return nil, fmt.Errorf("営業チームメンバー一覧の取得に失敗しました: %w", err)
	}

	// スライスをポインタのスライスに変換
	memberPtrs := make([]*model.SalesTeam, len(members))
	for i := range members {
		memberPtrs[i] = &members[i]
	}

	return &SalesTeamMemberListResponse{
		Members: memberPtrs,
		Total:   total,
		Page:    filter.Page,
		Limit:   filter.Limit,
	}, nil
}

// GetActiveMembers アクティブな営業チームメンバーを取得
func (s *salesTeamService) GetActiveMembers(ctx context.Context) ([]*model.SalesTeam, error) {
	members, err := s.salesRepo.GetActiveMembers(ctx)
	if err != nil {
		s.logger.Error("Failed to get active sales team members", zap.Error(err))
		return nil, fmt.Errorf("アクティブメンバーの取得に失敗しました: %w", err)
	}

	// スライスをポインタのスライスに変換
	memberPtrs := make([]*model.SalesTeam, len(members))
	for i := range members {
		memberPtrs[i] = &members[i]
	}

	return memberPtrs, nil
}

// GetMembersByRole ロールで営業チームメンバーを取得
func (s *salesTeamService) GetMembersByRole(ctx context.Context, role string) ([]*model.SalesTeam, error) {
	members, err := s.salesRepo.GetByRole(ctx, role)
	if err != nil {
		s.logger.Error("Failed to get sales team members by role", zap.Error(err))
		return nil, fmt.Errorf("ロール別メンバーの取得に失敗しました: %w", err)
	}

	// スライスをポインタのスライスに変換
	memberPtrs := make([]*model.SalesTeam, len(members))
	for i := range members {
		memberPtrs[i] = &members[i]
	}

	return memberPtrs, nil
}

// GetTeamStatistics 営業チームの統計情報を取得
func (s *salesTeamService) GetTeamStatistics(ctx context.Context) (*SalesTeamStatistics, error) {
	// 全メンバーを取得
	allMembers, totalCount, err := s.salesRepo.GetList(ctx, repository.SalesTeamFilter{})
	if err != nil {
		s.logger.Error("Failed to get all sales team members for statistics", zap.Error(err))
		return nil, fmt.Errorf("統計情報の取得に失敗しました: %w", err)
	}

	stats := &SalesTeamStatistics{
		TotalMembers:     int(totalCount),
		RoleDistribution: make(map[string]int),
	}

	// アクティブ/非アクティブメンバー数を計算
	activeCount := 0
	for _, member := range allMembers {
		if member.IsActive {
			activeCount++
		}

		// ロール分布を計算
		stats.RoleDistribution[member.TeamRole]++
	}

	stats.ActiveMembers = activeCount
	stats.InactiveMembers = stats.TotalMembers - activeCount

	// 最近の参加者（過去30日）
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	recentJoins := []*model.SalesTeam{}
	recentLeaves := []*model.SalesTeam{}

	for _, member := range allMembers {
		if member.JoinedAt.After(thirtyDaysAgo) {
			recentJoins = append(recentJoins, &member)
		}
		if member.LeftAt != nil && member.LeftAt.After(thirtyDaysAgo) {
			recentLeaves = append(recentLeaves, &member)
		}
	}

	stats.RecentJoins = recentJoins
	stats.RecentLeaves = recentLeaves

	return stats, nil
}
