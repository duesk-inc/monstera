package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/common/logger"
	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ProposalService 提案サービスのインターフェース
type ProposalService interface {
	// 提案情報管理
	GetProposals(ctx context.Context, userID string, req *dto.GetProposalsRequest) (*dto.ProposalListResponse, error)
	GetProposalDetail(ctx context.Context, id string, userID string) (*dto.ProposalDetailResponse, error)
	UpdateProposalStatus(ctx context.Context, id string, userID string, req *dto.UpdateProposalStatusRequest) error

	// 質問機能
	CreateQuestion(ctx context.Context, proposalID string, userID string, req *dto.CreateQuestionRequest) (*dto.ProposalQuestionDTO, error)
	GetQuestions(ctx context.Context, proposalID string, userID string, req *dto.GetQuestionsRequest) (*dto.QuestionsListResponse, error)
	UpdateQuestion(ctx context.Context, questionID string, userID string, req *dto.UpdateQuestionRequest) error
	DeleteQuestion(ctx context.Context, questionID string, userID string) error

	// 営業担当者向け機能
	RespondToQuestion(ctx context.Context, questionID string, salesUserID string, req *dto.RespondQuestionRequest) error
	GetPendingQuestions(ctx context.Context, salesUserID string, req *dto.GetPendingQuestionsRequest) (*dto.PendingQuestionsListResponse, error)
	AssignQuestionToSales(ctx context.Context, questionID string, assignerID string, salesUserID string) error

	// 統計・分析機能
	GetProposalStats(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error)
	GetProposalDashboard(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error)
	GetQuestionStatistics(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error)

	// 管理者向け機能
	GetSystemProposalSummary(ctx context.Context) (*dto.ProposalSummaryResponse, error)
	GetProposalTrends(ctx context.Context, months int) (*dto.ProposalSummaryResponse, error)
	GetUserProposalRanking(ctx context.Context, limit int) (*dto.ProposalSummaryResponse, error)

	// 内部処理
	CreateProposal(ctx context.Context, projectID string, userID string) (*model.EngineerProposal, error)
	CheckProposalPermission(ctx context.Context, proposalID string, userID string) error
	CheckQuestionPermission(ctx context.Context, questionID string, userID string) error
	GetSalesUserForProject(ctx context.Context, projectID string) (*model.User, error)

	// バッチ処理・メンテナンス
	ExpireOldProposals(ctx context.Context, expireDays int) error
	NotifyPendingResponses(ctx context.Context) error
	CleanupOldQuestions(ctx context.Context, retentionDays int) error

	// 通知連携
	SendProposalStatusNotification(ctx context.Context, proposal *model.EngineerProposal, previousStatus string) error
	SendQuestionNotification(ctx context.Context, question *model.EngineerProposalQuestion) error
	SendResponseNotification(ctx context.Context, question *model.EngineerProposalQuestion) error
}

// proposalService 提案サービスの実装
type proposalService struct {
	txManager           transaction.TransactionManager
	proposalRepo        repository.EngineerProposalRepository
	questionRepo        repository.EngineerProposalQuestionRepository
	pocProjectRepo      repository.PocProjectRefRepository
	userRepo            repository.UserRepository
	salesRepo           repository.SalesTeamRepository
	notificationService NotificationService
	logger              *zap.Logger
}

// NewProposalService 提案サービスのインスタンスを生成
func NewProposalService(
	db *gorm.DB,
	proposalRepo repository.EngineerProposalRepository,
	questionRepo repository.EngineerProposalQuestionRepository,
	pocProjectRepo repository.PocProjectRefRepository,
	userRepo repository.UserRepository,
	salesRepo repository.SalesTeamRepository,
	notificationService NotificationService,
	logger *zap.Logger,
) ProposalService {
	return &proposalService{
		txManager:           transaction.NewTransactionManager(db, logger),
		proposalRepo:        proposalRepo,
		questionRepo:        questionRepo,
		pocProjectRepo:      pocProjectRepo,
		userRepo:            userRepo,
		salesRepo:           salesRepo,
		notificationService: notificationService,
		logger:              logger,
	}
}

// executeInTransaction トランザクション内で関数を実行するヘルパーメソッド
func (s *proposalService) executeInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return s.txManager.ExecuteInTransaction(ctx, fn)
}

// ==========================================
// 提案情報管理
// ==========================================

// GetProposals 提案一覧を取得
func (s *proposalService) GetProposals(ctx context.Context, userID string, req *dto.GetProposalsRequest) (*dto.ProposalListResponse, error) {
	logger.LogInfo(s.logger, "提案一覧取得開始", zap.String("user_id", userID))

	// デフォルト値設定
	req.SetDefaults()

	// フィルター構築
	filter := repository.EngineerProposalFilter{
		Status:    req.Status,
		Page:      req.Page,
		Limit:     req.Limit,
		SortBy:    req.SortBy,
		SortOrder: req.SortOrder,
	}

	// リポジトリから提案一覧を取得
	proposals, total, err := s.proposalRepo.GetByUserID(ctx, userID, filter)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "提案一覧の取得に失敗しました")
	}

	// DTOに変換
	items := make([]dto.ProposalItemDTO, len(proposals))
	for i, proposal := range proposals {
		item, err := s.convertToProposalItemDTO(ctx, proposal)
		if err != nil {
			s.logger.Error("提案アイテムDTO変換に失敗", zap.Error(err), zap.String("proposal_id", proposal.ID))
			continue
		}
		items[i] = *item
	}

	response := &dto.ProposalListResponse{
		Items: items,
		Total: total,
		Page:  req.Page,
		Limit: req.Limit,
	}

	logger.LogInfo(s.logger, "提案一覧取得完了", zap.Int64("total", total), zap.Int("returned", len(items)))
	return response, nil
}

// GetProposalDetail 提案詳細を取得
func (s *proposalService) GetProposalDetail(ctx context.Context, id string, userID string) (*dto.ProposalDetailResponse, error) {
	logger.LogInfo(s.logger, "提案詳細取得開始", zap.String("proposal_id", id), zap.String("user_id", userID))

	// 権限チェック
	if err := s.CheckProposalPermission(ctx, id, userID); err != nil {
		return nil, err
	}

	// 提案を取得
	proposal, err := s.proposalRepo.GetByID(ctx, id)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "提案の取得に失敗しました")
	}

	if proposal == nil {
		return nil, message.NewBusinessError(message.ErrCodeProposalNotFound, "提案が見つかりません")
	}

	// プロジェクト詳細を取得
	projectDetail, err := s.pocProjectRepo.GetProjectWithSkills(ctx, proposal.ProjectID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "プロジェクト詳細の取得に失敗しました")
	}

	// 質問一覧を取得
	questions, err := s.questionRepo.GetByProposalIDSimple(ctx, id)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "質問一覧の取得に失敗しました")
	}

	// DTOに変換
	response := &dto.ProposalDetailResponse{
		ID:          proposal.ID,
		ProjectID:   proposal.ProjectID,
		Status:      string(proposal.Status),
		RespondedAt: proposal.RespondedAt,
		CreatedAt:   proposal.CreatedAt,
		UpdatedAt:   proposal.UpdatedAt,
		Project:     s.convertToProjectDetailDTO(projectDetail),
		Questions:   s.convertToProposalQuestionDTOs(questions),
	}

	logger.LogInfo(s.logger, "提案詳細取得完了", zap.String("proposal_id", id))
	return response, nil
}

// UpdateProposalStatus 提案ステータスを更新
func (s *proposalService) UpdateProposalStatus(ctx context.Context, id string, userID string, req *dto.UpdateProposalStatusRequest) error {
	logger.LogInfo(s.logger, "提案ステータス更新開始",
		zap.String("proposal_id", id),
		zap.String("user_id", userID),
		zap.String("new_status", req.Status))

	// 権限チェック
	if err := s.CheckProposalPermission(ctx, id, userID); err != nil {
		return err
	}

	// トランザクション内で実行
	return s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// 提案を取得
		proposal, err := s.proposalRepo.GetByID(ctx, id)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "提案の取得に失敗しました")
		}

		if proposal == nil {
			return message.NewBusinessError(message.ErrCodeProposalNotFound, "提案が見つかりません")
		}

		// ビジネスルールチェック
		if err := s.validateStatusUpdate(proposal, req.Status); err != nil {
			return err
		}

		// ステータス更新
		previousStatus := string(proposal.Status)
		now := time.Now()
		err = s.proposalRepo.UpdateStatus(ctx, id, req.Status, &now)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "ステータス更新に失敗しました")
		}

		// 通知送信（非同期で実行される想定）
		updatedProposal := *proposal
		updatedProposal.Status = model.EngineerProposalStatus(req.Status)
		updatedProposal.RespondedAt = &now

		go func() {
			if err := s.SendProposalStatusNotification(context.Background(), &updatedProposal, previousStatus); err != nil {
				s.logger.Error("通知送信に失敗", zap.Error(err), zap.String("proposal_id", id))
			}
		}()

		logger.LogInfo(s.logger, "提案ステータス更新完了",
			zap.String("proposal_id", id),
			zap.String("old_status", previousStatus),
			zap.String("new_status", req.Status))

		return nil
	})
}

// ==========================================
// 内部処理・ヘルパーメソッド
// ==========================================

// CheckProposalPermission 提案に対する権限をチェック
func (s *proposalService) CheckProposalPermission(ctx context.Context, proposalID string, userID string) error {
	// 提案がユーザーのものかチェック
	proposal, err := s.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "提案の取得に失敗しました")
	}

	if proposal == nil {
		return message.NewBusinessError(message.ErrCodeProposalNotFound, "提案が見つかりません")
	}

	if proposal.UserID != userID {
		return message.NewBusinessError(message.ErrCodeProposalAccessDenied, "この提案にアクセスする権限がありません")
	}

	return nil
}

// validateStatusUpdate ステータス更新のビジネスルールをチェック
func (s *proposalService) validateStatusUpdate(proposal *model.EngineerProposal, newStatus string) error {
	// 既に回答済みの場合は更新不可
	if string(proposal.Status) != "proposed" {
		return message.NewBusinessError(message.ErrCodeProposalAlreadyResponded, "この提案は既に回答済みです")
	}

	// 有効なステータス遷移かチェック
	validStatuses := []string{"proceed", "declined"}
	isValid := false
	for _, status := range validStatuses {
		if newStatus == status {
			isValid = true
			break
		}
	}

	if !isValid {
		return message.NewBusinessError(message.ErrCodeProposalInvalidTransition, "無効なステータス遷移です")
	}

	return nil
}

// convertToProposalItemDTO 提案をProposalItemDTOに変換
func (s *proposalService) convertToProposalItemDTO(ctx context.Context, proposal *model.EngineerProposal) (*dto.ProposalItemDTO, error) {
	// プロジェクト詳細を取得
	project, err := s.pocProjectRepo.GetByID(ctx, proposal.ProjectID)
	if err != nil {
		return nil, err
	}

	if project == nil {
		return nil, fmt.Errorf("プロジェクトが見つかりません: %s", proposal.ProjectID)
	}

	// 未回答質問数を取得
	pendingCount, err := s.questionRepo.CountPendingQuestionsByProposal(ctx, proposal.ID)
	if err != nil {
		s.logger.Warn("未回答質問数の取得に失敗", zap.Error(err), zap.String("proposal_id", proposal.ID))
		pendingCount = 0
	}

	// スキル名を取得（簡略化）
	skillNames := project.GetSkillNames()
	requiredSkillsStr := strings.Join(skillNames, ", ")

	return &dto.ProposalItemDTO{
		ID:                    proposal.ID,
		ProjectID:             proposal.ProjectID,
		ProjectName:           project.ProjectName,
		MinPrice:              project.MinPrice,
		MaxPrice:              project.MaxPrice,
		WorkLocation:          project.GetWorkLocationDisplay(),
		RequiredSkills:        requiredSkillsStr,
		Status:                string(proposal.Status),
		CreatedAt:             proposal.CreatedAt,
		RespondedAt:           proposal.RespondedAt,
		PendingQuestionsCount: int(pendingCount),
	}, nil
}

// convertToProjectDetailDTO プロジェクトをProjectDetailDTOに変換
func (s *proposalService) convertToProjectDetailDTO(project *model.PocProjectRef) dto.ProjectDetailDTO {
	if project == nil {
		return dto.ProjectDetailDTO{}
	}

	// 必須スキルを変換
	requiredSkills := make([]dto.ProjectSkillDTO, len(project.RequiredSkills))
	for i, skill := range project.RequiredSkills {
		requiredSkills[i] = dto.ProjectSkillDTO{
			SkillName:          skill.Skill.Name,
			ExperienceYearsMin: skill.Level, // 仮でレベルを経験年数として使用
			ExperienceYearsMax: skill.Level,
			IsRequired:         true,
		}
	}

	description := ""
	if project.Description != nil {
		description = *project.Description
	}

	startDateText := project.GetStartDateDisplay()

	return dto.ProjectDetailDTO{
		ID:              project.ID,
		ProjectName:     project.ProjectName,
		Description:     description,
		MinPrice:        project.MinPrice,
		MaxPrice:        project.MaxPrice,
		WorkLocation:    project.GetWorkLocationDisplay(),
		RemoteWorkType:  project.GetRemoteWorkTypeDisplay(),
		WorkingTime:     project.GetWorkingTimeDisplay(),
		ContractPeriod:  project.GetContractPeriodDisplay(),
		StartDate:       project.StartDate,
		StartDateText:   startDateText,
		RequiredSkills:  requiredSkills,
		PreferredSkills: []dto.ProjectSkillDTO{}, // 優先スキルは後で実装
	}
}

// convertToProposalQuestionDTOs 質問をProposalQuestionDTOsに変換
func (s *proposalService) convertToProposalQuestionDTOs(questions []*model.EngineerProposalQuestion) []dto.ProposalQuestionDTO {
	if len(questions) == 0 {
		return []dto.ProposalQuestionDTO{}
	}

	dtos := make([]dto.ProposalQuestionDTO, len(questions))
	for i, q := range questions {
		dtos[i] = dto.ProposalQuestionDTO{
			ID:           q.ID,
			QuestionText: q.QuestionText,
			ResponseText: q.ResponseText,
			IsResponded:  q.IsResponded,
			RespondedAt:  q.RespondedAt,
			CreatedAt:    q.CreatedAt,
			UpdatedAt:    q.UpdatedAt,
			SalesUser:    s.convertToProposalUserSummaryDTO(q.SalesUser),
		}
	}
	return dtos
}

// convertToProposalUserSummaryDTO ユーザーをProposalUserSummaryDTOに変換
func (s *proposalService) convertToProposalUserSummaryDTO(user *model.User) *dto.ProposalUserSummaryDTO {
	if user == nil {
		return nil
	}

	return &dto.ProposalUserSummaryDTO{
		ID:        user.ID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
	}
}

// ==========================================
// 未実装メソッドのスタブ（次のタスクで実装予定）
// ==========================================

// CreateQuestion 質問を作成
func (s *proposalService) CreateQuestion(ctx context.Context, proposalID string, userID string, req *dto.CreateQuestionRequest) (*dto.ProposalQuestionDTO, error) {
	logger.LogInfo(s.logger, "質問作成開始",
		zap.String("proposal_id", proposalID),
		zap.String("user_id", userID))

	// 権限チェック
	if err := s.CheckProposalPermission(ctx, proposalID, userID); err != nil {
		return nil, err
	}

	// トランザクション内で実行
	var createdQuestion *model.EngineerProposalQuestion
	err := s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// 提案を取得してステータスチェック
		proposal, err := s.proposalRepo.GetByID(ctx, proposalID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "提案の取得に失敗しました")
		}
		if proposal == nil {
			return message.NewBusinessError(message.ErrCodeProposalNotFound, "提案が見つかりません")
		}

		// 回答済みの場合は質問不可
		if string(proposal.Status) != "proposed" {
			return message.NewBusinessError(message.ErrCodeQuestionNotAnswerable, "この提案は既に回答済みのため質問できません")
		}

		// 質問数上限チェック（例：1提案あたり10質問まで）
		count, err := s.questionRepo.CountQuestionsByProposal(ctx, proposalID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問数の取得に失敗しました")
		}
		if count >= 10 {
			return message.NewBusinessError(message.ErrCodeQuestionMaxLimitExceeded, "質問数の上限（10件）を超えています")
		}

		// 営業担当者を自動割り当て
		var salesUserID *string
		salesUser, err := s.GetSalesUserForProject(ctx, proposal.ProjectID)
		if err != nil {
			// エラーがあってもログを記録して続行
			s.logger.Warn("営業担当者の自動割り当てに失敗しました",
				zap.Error(err),
				zap.String("project_id", proposal.ProjectID))
		} else if salesUser != nil {
			salesUserID = &salesUser.ID
		}

		// 質問を作成
		question := &model.EngineerProposalQuestion{
			ProposalID:   proposalID,
			QuestionText: req.QuestionText,
			IsResponded:  false,
			SalesUserID:  salesUserID,
		}

		err = s.questionRepo.Create(ctx, question)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の作成に失敗しました")
		}

		createdQuestion = question

		// 通知送信（非同期）
		go func() {
			if err := s.SendQuestionNotification(context.Background(), question); err != nil {
				s.logger.Error("質問通知送信に失敗", zap.Error(err), zap.String("question_id", question.ID))
			}
		}()

		return nil
	})

	if err != nil {
		return nil, err
	}

	// DTOに変換
	dto := &dto.ProposalQuestionDTO{
		ID:           createdQuestion.ID,
		QuestionText: createdQuestion.QuestionText,
		ResponseText: nil,
		IsResponded:  false,
		RespondedAt:  nil,
		CreatedAt:    createdQuestion.CreatedAt,
		UpdatedAt:    createdQuestion.UpdatedAt,
		SalesUser:    nil,
	}

	logger.LogInfo(s.logger, "質問作成完了", zap.String("question_id", createdQuestion.ID))
	return dto, nil
}

// GetQuestions 質問一覧を取得
func (s *proposalService) GetQuestions(ctx context.Context, proposalID string, userID string, req *dto.GetQuestionsRequest) (*dto.QuestionsListResponse, error) {
	logger.LogInfo(s.logger, "質問一覧取得開始",
		zap.String("proposal_id", proposalID),
		zap.String("user_id", userID))

	// 権限チェック
	if err := s.CheckProposalPermission(ctx, proposalID, userID); err != nil {
		return nil, err
	}

	// デフォルト値設定
	req.SetDefaults()

	// フィルター構築
	filter := repository.QuestionFilter{
		Page:      req.Page,
		Limit:     req.Limit,
		SortBy:    req.SortBy,
		SortOrder: req.SortOrder,
	}

	// 質問一覧を取得
	questions, total, err := s.questionRepo.GetByProposalID(ctx, proposalID, filter)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "質問一覧の取得に失敗しました")
	}

	// DTOに変換
	items := s.convertToProposalQuestionDTOs(questions)

	response := &dto.QuestionsListResponse{
		Items: items,
		Total: int(total),
	}

	logger.LogInfo(s.logger, "質問一覧取得完了",
		zap.String("proposal_id", proposalID),
		zap.Int("count", len(items)))
	return response, nil
}

// UpdateQuestion 質問を更新
func (s *proposalService) UpdateQuestion(ctx context.Context, questionID string, userID string, req *dto.UpdateQuestionRequest) error {
	logger.LogInfo(s.logger, "質問更新開始",
		zap.String("question_id", questionID),
		zap.String("user_id", userID))

	// 権限チェック
	if err := s.CheckQuestionPermission(ctx, questionID, userID); err != nil {
		return err
	}

	// トランザクション内で実行
	return s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// 質問を取得
		question, err := s.questionRepo.GetByID(ctx, questionID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の取得に失敗しました")
		}
		if question == nil {
			return message.NewBusinessError(message.ErrCodeQuestionNotFound, "質問が見つかりません")
		}

		// 既に回答済みの場合は編集不可
		if question.IsResponded {
			return message.NewBusinessError(message.ErrCodeQuestionAlreadyAnswered, "回答済みの質問は編集できません")
		}

		// 編集期限チェック（作成から24時間以内）
		if time.Since(question.CreatedAt) > 24*time.Hour {
			return message.NewBusinessError(message.ErrCodeQuestionEditTimeExpired, "質問の編集期限（24時間）が過ぎています")
		}

		// 質問内容を更新
		question.QuestionText = req.QuestionText
		question.UpdatedAt = time.Now()

		err = s.questionRepo.Update(ctx, question)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の更新に失敗しました")
		}

		logger.LogInfo(s.logger, "質問更新完了", zap.String("question_id", questionID))
		return nil
	})
}

// DeleteQuestion 質問を削除
func (s *proposalService) DeleteQuestion(ctx context.Context, questionID string, userID string) error {
	logger.LogInfo(s.logger, "質問削除開始",
		zap.String("question_id", questionID),
		zap.String("user_id", userID))

	// 権限チェック
	if err := s.CheckQuestionPermission(ctx, questionID, userID); err != nil {
		return err
	}

	// トランザクション内で実行
	return s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// 質問を取得
		question, err := s.questionRepo.GetByID(ctx, questionID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の取得に失敗しました")
		}
		if question == nil {
			return message.NewBusinessError(message.ErrCodeQuestionNotFound, "質問が見つかりません")
		}

		// 既に回答済みの場合は削除不可
		if question.IsResponded {
			return message.NewBusinessError(message.ErrCodeQuestionAlreadyAnswered, "回答済みの質問は削除できません")
		}

		// 削除期限チェック（作成から24時間以内）
		if time.Since(question.CreatedAt) > 24*time.Hour {
			return message.NewBusinessError(message.ErrCodeQuestionEditTimeExpired, "質問の削除期限（24時間）が過ぎています")
		}

		// 質問を削除
		err = s.questionRepo.Delete(ctx, questionID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の削除に失敗しました")
		}

		logger.LogInfo(s.logger, "質問削除完了", zap.String("question_id", questionID))
		return nil
	})
}

// RespondToQuestion 質問に回答（営業担当者用）
func (s *proposalService) RespondToQuestion(ctx context.Context, questionID string, salesUserID string, req *dto.RespondQuestionRequest) error {
	logger.LogInfo(s.logger, "質問回答開始",
		zap.String("question_id", questionID),
		zap.String("sales_user_id", salesUserID))

	// トランザクション内で実行
	return s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// 質問を取得
		question, err := s.questionRepo.GetByID(ctx, questionID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の取得に失敗しました")
		}
		if question == nil {
			return message.NewBusinessError(message.ErrCodeQuestionNotFound, "質問が見つかりません")
		}

		// 既に回答済みの場合はエラー
		if question.IsResponded {
			return message.NewBusinessError(message.ErrCodeQuestionAlreadyAnswered, "この質問は既に回答済みです")
		}

		// 営業担当者権限チェック（service_005で実装予定のロジックを使用）
		// 現時点では営業チームメンバーかどうかのチェックのみ
		salesMember, err := s.salesRepo.GetByUserID(ctx, salesUserID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "営業担当者情報の取得に失敗しました")
		}
		if salesMember == nil || !salesMember.IsActive {
			return message.NewBusinessError(message.ErrCodeSalesUserInvalidRole, "営業担当者権限がありません")
		}

		// 回答を更新
		err = s.questionRepo.UpdateResponse(ctx, questionID, req.ResponseText, salesUserID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "回答の更新に失敗しました")
		}

		// 通知送信（非同期）
		go func() {
			// 最新の質問情報を取得して通知
			updatedQuestion, _ := s.questionRepo.GetByID(context.Background(), questionID)
			if updatedQuestion != nil {
				if err := s.SendResponseNotification(context.Background(), updatedQuestion); err != nil {
					s.logger.Error("回答通知送信に失敗", zap.Error(err), zap.String("question_id", questionID))
				}
			}
		}()

		logger.LogInfo(s.logger, "質問回答完了", zap.String("question_id", questionID))
		return nil
	})
}

// GetPendingQuestions 未回答質問一覧を取得（営業担当者用）
func (s *proposalService) GetPendingQuestions(ctx context.Context, salesUserID string, req *dto.GetPendingQuestionsRequest) (*dto.PendingQuestionsListResponse, error) {
	logger.LogInfo(s.logger, "未回答質問一覧取得開始", zap.String("sales_user_id", salesUserID))

	// 営業担当者権限チェック
	salesMember, err := s.salesRepo.GetByUserID(ctx, salesUserID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "営業担当者情報の取得に失敗しました")
	}
	if salesMember == nil || !salesMember.IsActive {
		return nil, message.NewBusinessError(message.ErrCodeSalesUserInvalidRole, "営業担当者権限がありません")
	}

	// デフォルト値設定
	req.SetDefaults()

	// フィルター構築
	filter := repository.PendingQuestionFilter{
		SalesUserID: &salesUserID,
		Page:        req.Page,
		Limit:       req.Limit,
		SortBy:      req.SortBy,
		SortOrder:   req.SortOrder,
	}

	// 未回答質問一覧を取得
	questions, total, err := s.questionRepo.GetPendingQuestions(ctx, filter)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "未回答質問一覧の取得に失敗しました")
	}

	// DTOに変換
	items := make([]dto.PendingQuestionDTO, 0, len(questions))
	for _, q := range questions {
		// 提案情報を取得
		proposal, err := s.proposalRepo.GetByID(ctx, q.ProposalID)
		if err != nil || proposal == nil {
			s.logger.Warn("提案情報の取得に失敗", zap.Error(err), zap.String("proposal_id", q.ProposalID))
			continue
		}

		// プロジェクト情報を取得
		project, err := s.pocProjectRepo.GetByID(ctx, proposal.ProjectID)
		if err != nil || project == nil {
			s.logger.Warn("プロジェクト情報の取得に失敗", zap.Error(err), zap.String("project_id", proposal.ProjectID))
			continue
		}

		// エンジニア情報を取得
		engineer, err := s.userRepo.GetByID(ctx, proposal.UserID)
		if err != nil || engineer == nil {
			s.logger.Warn("エンジニア情報の取得に失敗", zap.Error(err), zap.String("user_id", proposal.UserID))
			continue
		}

		item := dto.PendingQuestionDTO{
			ID:           q.ID,
			ProposalID:   q.ProposalID,
			ProjectID:    proposal.ProjectID,
			ProjectName:  project.ProjectName,
			QuestionText: q.QuestionText,
			Engineer:     s.convertToProposalUserSummaryDTO(engineer),
			CreatedAt:    q.CreatedAt,
		}
		items = append(items, item)
	}

	response := &dto.PendingQuestionsListResponse{
		Items: items,
		Total: int(total),
	}

	logger.LogInfo(s.logger, "未回答質問一覧取得完了",
		zap.String("sales_user_id", salesUserID),
		zap.Int("count", len(items)))
	return response, nil
}

// AssignQuestionToSales 質問を営業担当者に割り当て
func (s *proposalService) AssignQuestionToSales(ctx context.Context, questionID string, assignerID string, salesUserID string) error {
	logger.LogInfo(s.logger, "質問割り当て開始",
		zap.String("question_id", questionID),
		zap.String("assigner_id", assignerID),
		zap.String("sales_user_id", salesUserID))

	// 割り当て者の権限チェック（管理者またはマネージャー）
	assigner, err := s.userRepo.GetByID(ctx, assignerID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "割り当て者情報の取得に失敗しました")
	}
	if assigner == nil || (assigner.Role != model.RoleAdmin && assigner.Role != model.RoleManager) {
		return message.NewBusinessError(message.ErrCodeAdminRoleRequired, "質問の割り当てには管理者権限が必要です")
	}

	// 営業担当者の確認
	salesMember, err := s.salesRepo.GetByUserID(ctx, salesUserID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "営業担当者情報の取得に失敗しました")
	}
	if salesMember == nil || !salesMember.IsActive {
		return message.NewBusinessError(message.ErrCodeSalesUserNotFound, "指定された営業担当者が見つかりません")
	}

	// トランザクション内で実行
	return s.executeInTransaction(ctx, func(tx *gorm.DB) error {
		// 質問を取得
		question, err := s.questionRepo.GetByID(ctx, questionID)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "質問の取得に失敗しました")
		}
		if question == nil {
			return message.NewBusinessError(message.ErrCodeQuestionNotFound, "質問が見つかりません")
		}

		// 既に回答済みの場合は割り当て不可
		if question.IsResponded {
			return message.NewBusinessError(message.ErrCodeQuestionAlreadyAnswered, "回答済みの質問には営業担当者を割り当てできません")
		}

		// 営業担当者を更新
		question.SalesUserID = &salesUserID
		question.UpdatedAt = time.Now()

		err = s.questionRepo.Update(ctx, question)
		if err != nil {
			return logger.LogAndWrapError(s.logger, err, "営業担当者の割り当てに失敗しました")
		}

		logger.LogInfo(s.logger, "質問割り当て完了", zap.String("question_id", questionID))
		return nil
	})
}

// GetProposalStats 提案統計を取得（service_002で基本実装）
func (s *proposalService) GetProposalStats(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error) {
	logger.LogInfo(s.logger, "提案統計取得開始", zap.String("user_id", userID))

	// 基本的な統計を取得
	summary, err := s.proposalRepo.GetProposalSummary(ctx, userID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "提案統計の取得に失敗しました")
	}

	response := &dto.ProposalSummaryResponse{
		TotalProposals:        summary.TotalProposals,
		PendingProposals:      summary.PendingProposals,
		RespondedProposals:    summary.RespondedProposals,
		ProceedProposals:      summary.ProceedProposals,
		DeclinedProposals:     summary.DeclinedProposals,
		PendingQuestionsCount: summary.PendingQuestionsCount,
	}

	logger.LogInfo(s.logger, "提案統計取得完了", zap.String("user_id", userID))
	return response, nil
}

// GetProposalDashboard ダッシュボード用データを取得（暫定実装）
func (s *proposalService) GetProposalDashboard(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error) {
	// 暫定的にGetProposalStatsと同じ実装
	return s.GetProposalStats(ctx, userID)
}

// GetQuestionStatistics 質問統計を取得（暫定実装）
func (s *proposalService) GetQuestionStatistics(ctx context.Context, userID string) (*dto.ProposalSummaryResponse, error) {
	// 暫定的にGetProposalStatsと同じ実装
	return s.GetProposalStats(ctx, userID)
}

// 管理者向け機能（暫定実装）
func (s *proposalService) GetSystemProposalSummary(ctx context.Context) (*dto.ProposalSummaryResponse, error) {
	return nil, fmt.Errorf("GetSystemProposalSummary: implementation pending")
}

func (s *proposalService) GetProposalTrends(ctx context.Context, months int) (*dto.ProposalSummaryResponse, error) {
	return nil, fmt.Errorf("GetProposalTrends: implementation pending")
}

func (s *proposalService) GetUserProposalRanking(ctx context.Context, limit int) (*dto.ProposalSummaryResponse, error) {
	return nil, fmt.Errorf("GetUserProposalRanking: implementation pending")
}

// CreateProposal 提案を作成（内部処理）
func (s *proposalService) CreateProposal(ctx context.Context, projectID string, userID string) (*model.EngineerProposal, error) {
	logger.LogInfo(s.logger, "提案作成開始", zap.String("project_id", projectID), zap.String("user_id", userID))

	// 重複チェック
	exists, err := s.proposalRepo.CheckDuplicateProposal(ctx, projectID, userID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "重複チェックに失敗しました")
	}

	if exists {
		return nil, message.NewBusinessError(message.ErrCodeProposalAlreadyExists, "この案件への提案は既に存在します")
	}

	// 新しい提案を作成
	proposal := &model.EngineerProposal{
		ProjectID: projectID,
		UserID:    userID,
		Status:    model.EngineerProposalStatusProposed,
	}

	err = s.proposalRepo.Create(ctx, proposal)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "提案の作成に失敗しました")
	}

	logger.LogInfo(s.logger, "提案作成完了", zap.String("proposal_id", proposal.ID))
	return proposal, nil
}

// CheckQuestionPermission 質問に対する権限をチェック
func (s *proposalService) CheckQuestionPermission(ctx context.Context, questionID string, userID string) error {
	// 質問を取得
	question, err := s.questionRepo.GetByID(ctx, questionID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "質問の取得に失敗しました")
	}
	if question == nil {
		return message.NewBusinessError(message.ErrCodeQuestionNotFound, "質問が見つかりません")
	}

	// 提案を取得
	proposal, err := s.proposalRepo.GetByID(ctx, question.ProposalID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "提案の取得に失敗しました")
	}
	if proposal == nil {
		return message.NewBusinessError(message.ErrCodeProposalNotFound, "提案が見つかりません")
	}

	// 質問がユーザーの提案に属しているかチェック
	if proposal.UserID != userID {
		return message.NewBusinessError(message.ErrCodeQuestionAccessDenied, "この質問にアクセスする権限がありません")
	}

	return nil
}

// GetSalesUserForProject プロジェクトの営業担当者を取得
func (s *proposalService) GetSalesUserForProject(ctx context.Context, projectID string) (*model.User, error) {
	logger.LogInfo(s.logger, "営業担当者特定開始", zap.String("project_id", projectID))

	// 営業チームのアクティブなメンバーを取得
	activeMembers, err := s.salesRepo.GetActiveMembers(ctx)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "営業チームメンバーの取得に失敗しました")
	}

	if len(activeMembers) == 0 {
		return nil, message.NewBusinessError(message.ErrCodeSalesUserNotFound, "アクティブな営業担当者が見つかりません")
	}

	// リーダーを優先的に選択
	var leaders []model.SalesTeam
	var members []model.SalesTeam

	for _, member := range activeMembers {
		if member.TeamRole == "leader" {
			leaders = append(leaders, member)
		} else {
			members = append(members, member)
		}
	}

	// 営業担当者を選択（負荷分散を考慮）
	var selectedMember *model.SalesTeam

	// プロジェクトIDをハッシュ化して営業担当者を決定（簡易的な負荷分散）
	hashValue := projectID[0] + projectID[1] + projectID[2] // UUIDの最初の3バイトを使用

	if len(leaders) > 0 {
		index := int(hashValue) % len(leaders)
		selectedMember = &leaders[index]
	} else if len(members) > 0 {
		index := int(hashValue) % len(members)
		selectedMember = &members[index]
	} else {
		return nil, message.NewBusinessError(message.ErrCodeSalesUserNotFound, "適切な営業担当者が見つかりません")
	}

	// ユーザー情報を取得
	user, err := s.userRepo.GetByID(ctx, selectedMember.UserID)
	if err != nil {
		return nil, logger.LogAndWrapError(s.logger, err, "営業担当者のユーザー情報取得に失敗しました")
	}
	if user == nil {
		return nil, message.NewBusinessError(message.ErrCodeSalesUserNotFound, "営業担当者のユーザー情報が見つかりません")
	}

	logger.LogInfo(s.logger, "営業担当者特定完了",
		zap.String("project_id", projectID),
		zap.String("sales_user_id", user.ID),
		zap.String("sales_user_name", fmt.Sprintf("%s %s", user.LastName, user.FirstName)))

	return user, nil
}

// バッチ処理・メンテナンス（後で実装予定）
func (s *proposalService) ExpireOldProposals(ctx context.Context, expireDays int) error {
	return fmt.Errorf("ExpireOldProposals: implementation pending")
}

func (s *proposalService) NotifyPendingResponses(ctx context.Context) error {
	return fmt.Errorf("NotifyPendingResponses: implementation pending")
}

func (s *proposalService) CleanupOldQuestions(ctx context.Context, retentionDays int) error {
	return fmt.Errorf("CleanupOldQuestions: implementation pending")
}

// 通知連携（service_004で実装）
func (s *proposalService) SendProposalStatusNotification(ctx context.Context, proposal *model.EngineerProposal, previousStatus string) error {
	logger.LogInfo(s.logger, "提案ステータス変更通知送信開始",
		zap.String("proposal_id", proposal.ID),
		zap.String("previous_status", previousStatus),
		zap.String("new_status", string(proposal.Status)))

	// プロジェクト情報を取得
	project, err := s.pocProjectRepo.GetByID(ctx, proposal.ProjectID)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "プロジェクト情報の取得に失敗しました")
	}
	if project == nil {
		return message.NewBusinessError(message.ErrCodePocProjectNotFound, "プロジェクトが見つかりません")
	}

	// ステータスの日本語表記を取得
	previousStatusJP := s.getStatusDisplayName(previousStatus)
	newStatusJP := s.getStatusDisplayName(string(proposal.Status))

	// 通知を送信
	err = s.notificationService.NotifyProposalStatusChange(
		ctx,
		proposal.ID,
		proposal.ProjectID,
		proposal.UserID,
		project.ProjectName,
		previousStatusJP,
		newStatusJP,
	)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "通知の送信に失敗しました")
	}

	logger.LogInfo(s.logger, "提案ステータス変更通知送信完了", zap.String("proposal_id", proposal.ID))
	return nil
}

func (s *proposalService) SendQuestionNotification(ctx context.Context, question *model.EngineerProposalQuestion) error {
	logger.LogInfo(s.logger, "質問通知送信開始", zap.String("question_id", question.ID))

	// 提案情報を取得
	proposal, err := s.proposalRepo.GetByID(ctx, question.ProposalID)
	if err != nil || proposal == nil {
		return logger.LogAndWrapError(s.logger, err, "提案情報の取得に失敗しました")
	}

	// プロジェクト情報を取得
	project, err := s.pocProjectRepo.GetByID(ctx, proposal.ProjectID)
	if err != nil || project == nil {
		return logger.LogAndWrapError(s.logger, err, "プロジェクト情報の取得に失敗しました")
	}

	// エンジニア情報を取得
	engineer, err := s.userRepo.GetByID(ctx, proposal.UserID)
	if err != nil || engineer == nil {
		return logger.LogAndWrapError(s.logger, err, "エンジニア情報の取得に失敗しました")
	}

	// 営業担当者を特定
	salesUser, err := s.GetSalesUserForProject(ctx, proposal.ProjectID)
	if err != nil {
		// 営業担当者が見つからない場合でも通知自体は続行（全体通知として処理）
		s.logger.Warn("営業担当者の特定に失敗しました", zap.Error(err), zap.String("project_id", proposal.ProjectID))
	}

	// 通知を送信
	err = s.notificationService.NotifyNewQuestion(
		ctx,
		question.ID,
		question.ProposalID,
		proposal.ProjectID,
		project.ProjectName,
		question.QuestionText,
		proposal.UserID,
		fmt.Sprintf("%s %s", engineer.LastName, engineer.FirstName),
	)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "通知の送信に失敗しました")
	}

	// 特定の営業担当者が見つかった場合は個別通知も送信
	if salesUser != nil {
		// 営業担当者用の通知を作成
		notification := &model.Notification{
			RecipientID:      &salesUser.ID,
			Title:            "新しい質問が投稿されました",
			Message:          fmt.Sprintf("%s %sさんから案件「%s」について質問があります。", engineer.LastName, engineer.FirstName, project.ProjectName),
			NotificationType: model.NotificationTypeProject,
			Priority:         model.NotificationPriorityHigh,
			Status:           model.NotificationStatusUnread,
			ReferenceID:      &question.ID,
			ReferenceType:    proposalStringPtr("question"),
			Metadata: &model.NotificationMetadata{
				AdditionalData: map[string]interface{}{
					"question_id":   question.ID,
					"proposal_id":   question.ProposalID,
					"project_id":    proposal.ProjectID,
					"project_name":  project.ProjectName,
					"question_text": question.QuestionText,
					"engineer_id":   proposal.UserID,
					"engineer_name": fmt.Sprintf("%s %s", engineer.LastName, engineer.FirstName),
				},
			},
		}

		if err := s.notificationService.CreateNotification(ctx, notification); err != nil {
			s.logger.Error("営業担当者への個別通知送信に失敗", zap.Error(err), zap.String("sales_user_id", salesUser.ID))
			// エラーがあっても処理は続行
		}
	}

	logger.LogInfo(s.logger, "質問通知送信完了", zap.String("question_id", question.ID))
	return nil
}

func (s *proposalService) SendResponseNotification(ctx context.Context, question *model.EngineerProposalQuestion) error {
	logger.LogInfo(s.logger, "回答通知送信開始", zap.String("question_id", question.ID))

	// 回答者（営業担当者）情報を取得
	if question.SalesUserID == nil {
		return message.NewBusinessError(message.ErrCodeSalesUserNotFound, "回答者情報がありません")
	}

	salesUser, err := s.userRepo.GetByID(ctx, *question.SalesUserID)
	if err != nil || salesUser == nil {
		return logger.LogAndWrapError(s.logger, err, "営業担当者情報の取得に失敗しました")
	}

	// 提案情報を取得してエンジニアIDを特定
	proposal, err := s.proposalRepo.GetByID(ctx, question.ProposalID)
	if err != nil || proposal == nil {
		return logger.LogAndWrapError(s.logger, err, "提案情報の取得に失敗しました")
	}

	// 通知を送信
	responseText := ""
	if question.ResponseText != nil {
		responseText = *question.ResponseText
	}
	err = s.notificationService.NotifyQuestionAnswered(
		ctx,
		question.ID,
		question.ProposalID,
		proposal.UserID,
		question.QuestionText,
		responseText,
		fmt.Sprintf("%s %s", salesUser.LastName, salesUser.FirstName),
	)
	if err != nil {
		return logger.LogAndWrapError(s.logger, err, "通知の送信に失敗しました")
	}

	logger.LogInfo(s.logger, "回答通知送信完了", zap.String("question_id", question.ID))
	return nil
}

// getStatusDisplayName ステータスの表示名を取得
func (s *proposalService) getStatusDisplayName(status string) string {
	switch status {
	case "pending":
		return "確認中"
	case "responded":
		return "回答済み"
	case "proceed":
		return "進める"
	case "declined":
		return "見送り"
	default:
		return status
	}
}

// proposalStringPtr 文字列のポインタを返すヘルパー関数
func proposalStringPtr(s string) *string {
	return &s
}
