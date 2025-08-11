package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// PocSyncService POC同期サービスのインターフェース
type PocSyncService interface {
	// 同期処理
	SyncAllProjects(ctx context.Context) (*SyncResult, error)
	SyncProjectByID(ctx context.Context, pocProjectID string) error
	ForceSync(ctx context.Context, pocProjectID string) error
	RunScheduledSync(ctx context.Context) (*SyncResult, error)

	// 同期状況管理
	GetSyncStatus(ctx context.Context) (*SyncStatusResponse, error)
	GetUnsyncedProjects(ctx context.Context) ([]*model.PocProject, error)
	GetSyncHistory(ctx context.Context, filter SyncHistoryFilter) ([]*SyncHistoryEntry, int64, error)

	// 手動操作
	CreateProjectFromPoc(ctx context.Context, pocProjectID string) (*model.Project, error)
	UpdateProjectFromPoc(ctx context.Context, projectID string, pocProjectID string) (*model.Project, error)

	// 設定管理
	GetSyncSettings(ctx context.Context) (*SyncSettings, error)
	UpdateSyncSettings(ctx context.Context, settings *SyncSettings) error
}

// SyncResult 同期結果
type SyncResult struct {
	TotalProjects int       `json:"total_projects"`
	SuccessCount  int       `json:"success_count"`
	FailureCount  int       `json:"failure_count"`
	SkippedCount  int       `json:"skipped_count"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	Errors        []string  `json:"errors,omitempty"`
}

// SyncStatusResponse 同期ステータスレスポンス
type SyncStatusResponse struct {
	IsRunning        bool       `json:"is_running"`
	LastSyncTime     *time.Time `json:"last_sync_time,omitempty"`
	NextScheduledRun *time.Time `json:"next_scheduled_run,omitempty"`
	PendingCount     int        `json:"pending_count"`
	FailedCount      int        `json:"failed_count"`
}

// SyncHistoryFilter 同期履歴フィルター
type SyncHistoryFilter struct {
	StartDate *time.Time
	EndDate   *time.Time
	Status    string
	Page      int
	Limit     int
}

// SyncHistoryEntry 同期履歴エントリ
type SyncHistoryEntry struct {
	ID           string    `json:"id"`
	PocProjectID string    `json:"poc_project_id"`
	ProjectName  string    `json:"project_name"`
	SyncType     string    `json:"sync_type"`
	Status       string    `json:"status"`
	ErrorMessage string    `json:"error_message,omitempty"`
	SyncedAt     time.Time `json:"synced_at"`
}

// SyncSettings 同期設定
type SyncSettings struct {
	AutoSyncEnabled    bool     `json:"auto_sync_enabled"`
	SyncInterval       int      `json:"sync_interval_hours"`
	MaxRetryAttempts   int      `json:"max_retry_attempts"`
	NotifyOnError      bool     `json:"notify_on_error"`
	NotificationEmails []string `json:"notification_emails,omitempty"`
}

// pocSyncService POC同期サービスの実装
type pocSyncService struct {
	db           *gorm.DB
	pocRepo      repository.PocProjectRepository
	projectRepo  repository.ProjectRepository
	proposalRepo repository.ProposalRepository
	logger       *zap.Logger
	settings     *SyncSettings
}

// NewPocSyncService POC同期サービスのインスタンスを生成
func NewPocSyncService(
	db *gorm.DB,
	pocRepo repository.PocProjectRepository,
	projectRepo repository.ProjectRepository,
	proposalRepo repository.ProposalRepository,
	logger *zap.Logger,
) PocSyncService {
	return &pocSyncService{
		db:           db,
		pocRepo:      pocRepo,
		projectRepo:  projectRepo,
		proposalRepo: proposalRepo,
		logger:       logger,
		settings: &SyncSettings{
			AutoSyncEnabled:  true,
			SyncInterval:     24,
			MaxRetryAttempts: 3,
			NotifyOnError:    true,
		},
	}
}

// SyncAllProjects 全プロジェクトを同期
func (s *pocSyncService) SyncAllProjects(ctx context.Context) (*SyncResult, error) {
	result := &SyncResult{
		StartTime: time.Now(),
	}

	// 同期待ちプロジェクトを取得
	pendingProjects, err := s.pocRepo.GetPendingSync(ctx)
	if err != nil {
		s.logger.Error("Failed to get pending sync projects", zap.Error(err))
		return nil, fmt.Errorf("同期待ちプロジェクトの取得に失敗しました: %w", err)
	}

	result.TotalProjects = len(pendingProjects)

	// 各プロジェクトを同期
	for _, pocProject := range pendingProjects {
		if err := s.syncSingleProject(ctx, &pocProject); err != nil {
			result.FailureCount++
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", pocProject.Name, err))
			s.logger.Error("Failed to sync project",
				zap.String("poc_project_id", pocProject.ID),
				zap.Error(err))
		} else {
			result.SuccessCount++
		}
	}

	result.EndTime = time.Now()
	return result, nil
}

// SyncProjectByID 指定されたPOCプロジェクトを同期
func (s *pocSyncService) SyncProjectByID(ctx context.Context, pocProjectID string) error {
	pocProject, err := s.pocRepo.GetByID(ctx, pocProjectID)
	if err != nil {
		return fmt.Errorf("POCプロジェクトが見つかりません: %w", err)
	}

	return s.syncSingleProject(ctx, pocProject)
}

// ForceSync 強制同期
func (s *pocSyncService) ForceSync(ctx context.Context, pocProjectID string) error {
	pocProject, err := s.pocRepo.GetByID(ctx, pocProjectID)
	if err != nil {
		return fmt.Errorf("POCプロジェクトが見つかりません: %w", err)
	}

	// ステータスを強制的に同期待ちに変更
	pocProject.SyncStatus = model.PocSyncStatusPending
	if err := s.pocRepo.Update(ctx, pocProject); err != nil {
		return fmt.Errorf("同期ステータスの更新に失敗しました: %w", err)
	}

	return s.syncSingleProject(ctx, pocProject)
}

// RunScheduledSync スケジュール同期を実行
func (s *pocSyncService) RunScheduledSync(ctx context.Context) (*SyncResult, error) {
	if !s.settings.AutoSyncEnabled {
		return &SyncResult{
			StartTime:    time.Now(),
			EndTime:      time.Now(),
			SkippedCount: 1,
		}, nil
	}

	return s.SyncAllProjects(ctx)
}

// GetSyncStatus 同期ステータスを取得
func (s *pocSyncService) GetSyncStatus(ctx context.Context) (*SyncStatusResponse, error) {
	// 同期待ちプロジェクト数を取得
	pendingProjects, err := s.pocRepo.GetPendingSync(ctx)
	if err != nil {
		return nil, fmt.Errorf("同期待ちプロジェクトの取得に失敗しました: %w", err)
	}

	// 失敗プロジェクト数を取得
	failedFilter := repository.PocProjectFilter{
		SyncStatus: model.PocSyncStatusFailed,
	}
	failedProjects, _, err := s.pocRepo.GetList(ctx, failedFilter)
	if err != nil {
		return nil, fmt.Errorf("失敗プロジェクトの取得に失敗しました: %w", err)
	}

	// 最後の同期時刻を取得
	recentlySynced, err := s.pocRepo.GetRecentlySynced(ctx, 1)
	var lastSyncTime *time.Time
	if err == nil && len(recentlySynced) > 0 {
		lastSyncTime = recentlySynced[0].LastSyncedAt
	}

	// 次回実行予定時刻を計算
	var nextRun *time.Time
	if s.settings.AutoSyncEnabled && lastSyncTime != nil {
		next := lastSyncTime.Add(time.Duration(s.settings.SyncInterval) * time.Hour)
		nextRun = &next
	}

	return &SyncStatusResponse{
		IsRunning:        false, // TODO: 実行中フラグの実装
		LastSyncTime:     lastSyncTime,
		NextScheduledRun: nextRun,
		PendingCount:     len(pendingProjects),
		FailedCount:      len(failedProjects),
	}, nil
}

// GetUnsyncedProjects 未同期プロジェクトを取得
func (s *pocSyncService) GetUnsyncedProjects(ctx context.Context) ([]*model.PocProject, error) {
	pendingProjects, err := s.pocRepo.GetPendingSync(ctx)
	if err != nil {
		return nil, fmt.Errorf("未同期プロジェクトの取得に失敗しました: %w", err)
	}

	result := make([]*model.PocProject, len(pendingProjects))
	for i := range pendingProjects {
		result[i] = &pendingProjects[i]
	}
	return result, nil
}

// GetSyncHistory 同期履歴を取得
func (s *pocSyncService) GetSyncHistory(ctx context.Context, filter SyncHistoryFilter) ([]*SyncHistoryEntry, int64, error) {
	// TODO: 同期履歴の実装（別テーブルが必要）
	return []*SyncHistoryEntry{}, 0, nil
}

// CreateProjectFromPoc POCプロジェクトから案件を作成
func (s *pocSyncService) CreateProjectFromPoc(ctx context.Context, pocProjectID string) (*model.Project, error) {
	pocProject, err := s.pocRepo.GetByID(ctx, pocProjectID)
	if err != nil {
		return nil, fmt.Errorf("POCプロジェクトが見つかりません: %w", err)
	}

	// トランザクション内で処理
	var project *model.Project
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 新しいプロジェクトを作成
		project = &model.Project{
			ID:          uuid.New().String(),
			ProjectName: pocProject.Name,
			Status:      model.ProjectStatusProposal,
			StartDate:   pocProject.StartDate,
			EndDate:     pocProject.EndDate,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// TODO: ClientIDの取得ロジック実装
		// pocProject.ClientNameからClientを検索または作成

		if err := s.projectRepo.Create(ctx, project); err != nil {
			return fmt.Errorf("プロジェクトの作成に失敗しました: %w", err)
		}

		// POCプロジェクトの同期ステータスを更新
		if err := s.pocRepo.UpdateSyncStatus(ctx, pocProjectID, model.PocSyncStatusCompleted, ""); err != nil {
			return fmt.Errorf("同期ステータスの更新に失敗しました: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return project, nil
}

// UpdateProjectFromPoc POCプロジェクトから案件を更新
func (s *pocSyncService) UpdateProjectFromPoc(ctx context.Context, projectID string, pocProjectID string) (*model.Project, error) {
	pocProject, err := s.pocRepo.GetByID(ctx, pocProjectID)
	if err != nil {
		return nil, fmt.Errorf("POCプロジェクトが見つかりません: %w", err)
	}

	projectUUID := projectID
	project, err := s.projectRepo.FindByID(ctx, projectUUID)
	if err != nil {
		return nil, fmt.Errorf("プロジェクトが見つかりません: %w", err)
	}

	// プロジェクト情報を更新
	project.ProjectName = pocProject.Name
	project.StartDate = pocProject.StartDate
	project.EndDate = pocProject.EndDate
	project.UpdatedAt = time.Now()

	if err := s.projectRepo.Update(ctx, project); err != nil {
		return nil, fmt.Errorf("プロジェクトの更新に失敗しました: %w", err)
	}

	// POCプロジェクトの同期ステータスを更新
	if err := s.pocRepo.UpdateSyncStatus(ctx, pocProjectID, model.PocSyncStatusCompleted, ""); err != nil {
		s.logger.Warn("Failed to update sync status", zap.Error(err))
	}

	return project, nil
}

// GetSyncSettings 同期設定を取得
func (s *pocSyncService) GetSyncSettings(ctx context.Context) (*SyncSettings, error) {
	// TODO: データベースから設定を読み込む
	return s.settings, nil
}

// UpdateSyncSettings 同期設定を更新
func (s *pocSyncService) UpdateSyncSettings(ctx context.Context, settings *SyncSettings) error {
	// TODO: データベースに設定を保存
	s.settings = settings
	return nil
}

// syncSingleProject 単一プロジェクトを同期（内部メソッド）
func (s *pocSyncService) syncSingleProject(ctx context.Context, pocProject *model.PocProject) error {
	// 同期開始
	if err := s.pocRepo.UpdateSyncStatus(ctx, pocProject.ID, model.PocSyncStatusSyncing, ""); err != nil {
		return fmt.Errorf("同期ステータスの更新に失敗しました: %w", err)
	}

	// TODO: 実際の同期処理をここに実装
	// 例: 外部APIからデータを取得し、プロジェクトを作成/更新

	// 同期成功として処理
	if err := s.pocRepo.UpdateSyncStatus(ctx, pocProject.ID, model.PocSyncStatusCompleted, ""); err != nil {
		return fmt.Errorf("同期完了ステータスの更新に失敗しました: %w", err)
	}

	return nil
}
