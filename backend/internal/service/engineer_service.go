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

// EngineerService エンジニアサービスのインターフェース
type EngineerService interface {
	// エンジニア情報の基本操作
	GetEngineers(ctx context.Context, filters repository.EngineerFilters) ([]*model.User, int64, error)
	GetEngineerByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	CreateEngineer(ctx context.Context, input CreateEngineerInput) (*model.User, error)
	UpdateEngineer(ctx context.Context, id uuid.UUID, input UpdateEngineerInput) (*model.User, error)
	DeleteEngineer(ctx context.Context, id uuid.UUID) error

	// ステータス管理
	UpdateEngineerStatus(ctx context.Context, id uuid.UUID, status string, reason string, changedBy uuid.UUID) error
	GetStatusHistory(ctx context.Context, userID uuid.UUID) ([]*model.EngineerStatusHistory, error)

	// スキル情報
	GetEngineerSkills(ctx context.Context, userID uuid.UUID) ([]*model.EngineerSkill, error)
	GetAllSkillCategories(ctx context.Context) ([]*model.EngineerSkillCategory, error)

	// プロジェクト履歴
	GetProjectHistory(ctx context.Context, userID uuid.UUID) ([]*model.EngineerProjectHistory, error)

	// システム利用状況
	GetSystemUsage(ctx context.Context, userID uuid.UUID) (*SystemUsage, error)
}

// CreateEngineerInput エンジニア作成入力
type CreateEngineerInput struct {
	Email          string
	Password       string
	FirstName      string
	LastName       string
	FirstNameKana  string
	LastNameKana   string
	Sei            string
	Mei            string
	SeiKana        string
	MeiKana        string
	PhoneNumber    string
	Department     string
	Position       string
	HireDate       *time.Time
	Education      string
	EngineerStatus string
	CreatedBy      uuid.UUID
}

// UpdateEngineerInput エンジニア更新入力
type UpdateEngineerInput struct {
	FirstName     string
	LastName      string
	FirstNameKana string
	LastNameKana  string
	Sei           string
	Mei           string
	SeiKana       string
	MeiKana       string
	PhoneNumber   string
	Department    string
	Position      string
	HireDate      *time.Time
	Education     string
	UpdatedBy     uuid.UUID
}

// SystemUsage システム利用状況
type SystemUsage struct {
	WeeklyReportSubmissionRate float64    `json:"weekly_report_submission_rate"`
	LastWeeklyReportDate       *time.Time `json:"last_weekly_report_date"`
	PendingExpenseCount        int        `json:"pending_expense_count"`
	PendingLeaveCount          int        `json:"pending_leave_count"`
}

// engineerService エンジニアサービスの実装
type engineerService struct {
	db               *gorm.DB
	engineerRepo     repository.EngineerRepository
	userRepo         repository.UserRepository
	weeklyReportRepo repository.WeeklyReportRepository
	expenseRepo      repository.ExpenseRepository
	leaveRequestRepo repository.LeaveRequestRepository
	logger           *zap.Logger
}

// NewEngineerService エンジニアサービスのインスタンスを生成
func NewEngineerService(
	db *gorm.DB,
	engineerRepo repository.EngineerRepository,
	userRepo repository.UserRepository,
	weeklyReportRepo repository.WeeklyReportRepository,
	expenseRepo repository.ExpenseRepository,
	leaveRequestRepo repository.LeaveRequestRepository,
	logger *zap.Logger,
) EngineerService {
	return &engineerService{
		db:               db,
		engineerRepo:     engineerRepo,
		userRepo:         userRepo,
		weeklyReportRepo: weeklyReportRepo,
		expenseRepo:      expenseRepo,
		leaveRequestRepo: leaveRequestRepo,
		logger:           logger,
	}
}

// GetEngineers エンジニア一覧を取得
func (s *engineerService) GetEngineers(ctx context.Context, filters repository.EngineerFilters) ([]*model.User, int64, error) {
	return s.engineerRepo.FindEngineers(ctx, filters)
}

// GetEngineerByID IDでエンジニアを取得
func (s *engineerService) GetEngineerByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	user, err := s.engineerRepo.FindEngineerByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// ロール情報を読み込み
	user.LoadRolesFromUserRoles()

	return user, nil
}

// CreateEngineer エンジニアを作成
func (s *engineerService) CreateEngineer(ctx context.Context, input CreateEngineerInput) (*model.User, error) {
	// メールアドレスの重複チェック
	exists, err := s.engineerRepo.ExistsByEmail(ctx, input.Email)
	if err != nil {
		return nil, fmt.Errorf("メールアドレスの確認中にエラーが発生しました: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("このメールアドレスは既に使用されています")
	}

	// 社員番号を生成
	employeeNumber, err := s.engineerRepo.GenerateEmployeeNumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("社員番号の生成に失敗しました: %w", err)
	}

	// トランザクション内で作成
	var user *model.User
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// ユーザー作成
		user = &model.User{
			Email:          input.Email,
			FirstName:      input.FirstName,
			LastName:       input.LastName,
			FirstNameKana:  input.FirstNameKana,
			LastNameKana:   input.LastNameKana,
			Sei:            input.Sei,
			Mei:            input.Mei,
			SeiKana:        input.SeiKana,
			MeiKana:        input.MeiKana,
			PhoneNumber:    input.PhoneNumber,
			EmployeeNumber: employeeNumber,
			Department:     input.Department,
			Position:       input.Position,
			HireDate:       input.HireDate,
			Education:      input.Education,
			EngineerStatus: input.EngineerStatus,
			Active:         true,
			Status:         "active",
		}

		// パスワード設定
		if input.Password != "" {
			if err := user.SetPassword(input.Password); err != nil {
				return fmt.Errorf("パスワードの設定に失敗しました: %w", err)
			}
		} else {
			// パスワードが未指定の場合はメールアドレスを使用
			if err := user.SetPassword(input.Email); err != nil {
				return fmt.Errorf("パスワードの設定に失敗しました: %w", err)
			}
		}

		// name フィールドを設定（互換性のため）
		user.Name = user.FullName()

		// ユーザー作成
		if err := tx.Create(user).Error; err != nil {
			return err
		}

		// デフォルトロール（Employee）を設定
		userRole := &model.UserRole{
			UserID: user.ID,
			Role:   model.RoleEmployee,
		}
		if err := tx.Create(userRole).Error; err != nil {
			return err
		}

		// ステータス履歴作成
		history := &model.EngineerStatusHistory{
			UserID:    user.ID,
			NewStatus: input.EngineerStatus,
			ChangedBy: input.CreatedBy,
			ChangedAt: time.Now(),
		}

		if err := tx.Create(history).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return user, nil
}

// UpdateEngineer エンジニア情報を更新
func (s *engineerService) UpdateEngineer(ctx context.Context, id uuid.UUID, input UpdateEngineerInput) (*model.User, error) {
	// 既存のユーザーを取得
	user, err := s.engineerRepo.FindEngineerByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 更新フィールドの設定
	user.FirstName = input.FirstName
	user.LastName = input.LastName
	user.FirstNameKana = input.FirstNameKana
	user.LastNameKana = input.LastNameKana
	user.Sei = input.Sei
	user.Mei = input.Mei
	user.SeiKana = input.SeiKana
	user.MeiKana = input.MeiKana
	user.PhoneNumber = input.PhoneNumber
	user.Department = input.Department
	user.Position = input.Position
	user.HireDate = input.HireDate
	user.Education = input.Education

	// name フィールドを更新（互換性のため）
	user.Name = user.FullName()

	// 更新実行
	if err := s.engineerRepo.UpdateEngineer(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteEngineer エンジニアを削除
func (s *engineerService) DeleteEngineer(ctx context.Context, id uuid.UUID) error {
	return s.engineerRepo.DeleteEngineer(ctx, id)
}

// UpdateEngineerStatus エンジニアのステータスを更新
func (s *engineerService) UpdateEngineerStatus(ctx context.Context, id uuid.UUID, status string, reason string, changedBy uuid.UUID) error {
	// ステータスの妥当性チェック
	if !model.IsValidEngineerStatus(status) {
		return fmt.Errorf("無効なステータスです: %s", status)
	}

	// 既存のユーザーを取得
	user, err := s.engineerRepo.FindEngineerByID(ctx, id)
	if err != nil {
		return err
	}

	// 同じステータスへの変更はスキップ
	if user.EngineerStatus == status {
		return nil
	}

	// トランザクション内で更新
	return s.db.Transaction(func(tx *gorm.DB) error {
		// ステータス履歴を作成
		history := &model.EngineerStatusHistory{
			UserID:         id,
			PreviousStatus: &user.EngineerStatus,
			NewStatus:      status,
			ChangeReason:   reason,
			ChangedBy:      changedBy,
			ChangedAt:      time.Now(),
		}

		if err := tx.Create(history).Error; err != nil {
			return err
		}

		// ユーザーのステータスを更新
		if err := tx.Model(&model.User{}).
			Where("id = ?", id).
			Update("engineer_status", status).Error; err != nil {
			return err
		}

		return nil
	})
}

// GetStatusHistory ステータス履歴を取得
func (s *engineerService) GetStatusHistory(ctx context.Context, userID uuid.UUID) ([]*model.EngineerStatusHistory, error) {
	return s.engineerRepo.FindStatusHistory(ctx, userID)
}

// GetEngineerSkills エンジニアのスキル情報を取得
func (s *engineerService) GetEngineerSkills(ctx context.Context, userID uuid.UUID) ([]*model.EngineerSkill, error) {
	return s.engineerRepo.FindSkillsByUserID(ctx, userID)
}

// GetAllSkillCategories 全スキルカテゴリを取得
func (s *engineerService) GetAllSkillCategories(ctx context.Context) ([]*model.EngineerSkillCategory, error) {
	return s.engineerRepo.FindAllSkillCategories(ctx)
}

// GetProjectHistory プロジェクト履歴を取得
func (s *engineerService) GetProjectHistory(ctx context.Context, userID uuid.UUID) ([]*model.EngineerProjectHistory, error) {
	return s.engineerRepo.FindProjectHistoryByUserID(ctx, userID)
}

// GetSystemUsage システム利用状況を取得
func (s *engineerService) GetSystemUsage(ctx context.Context, userID uuid.UUID) (*SystemUsage, error) {
	usage := &SystemUsage{}

	// 週報提出率の計算（簡易版）
	// TODO: 実際の提出率計算ロジックを実装
	usage.WeeklyReportSubmissionRate = 0.85 // 85%

	// 最終週報提出日
	// TODO: 実際の最終提出日を取得
	lastDate := time.Now().AddDate(0, 0, -7)
	usage.LastWeeklyReportDate = &lastDate

	// 未処理経費申請数
	// TODO: 実際の未処理数を取得
	usage.PendingExpenseCount = 2

	// 未処理休暇申請数
	// TODO: 実際の未処理数を取得
	usage.PendingLeaveCount = 1

	return usage, nil
}
