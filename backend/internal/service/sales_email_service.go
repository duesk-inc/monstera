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

// SalesEmailService 営業関連メール送信サービスのインターフェース
type SalesEmailService interface {
	// テンプレート管理
	CreateEmailTemplate(ctx context.Context, req *CreateEmailTemplateRequest) (*model.EmailTemplate, error)
	GetEmailTemplate(ctx context.Context, id string) (*model.EmailTemplate, error)
	GetEmailTemplateList(ctx context.Context, filter EmailTemplateFilter) (*EmailTemplateListResponse, error)
	UpdateEmailTemplate(ctx context.Context, id string, req *UpdateEmailTemplateRequest) (*model.EmailTemplate, error)
	DeleteEmailTemplate(ctx context.Context, id string, userID string) error

	// キャンペーン管理
	CreateEmailCampaign(ctx context.Context, req *CreateEmailCampaignRequest) (*model.EmailCampaign, error)
	GetEmailCampaign(ctx context.Context, id string) (*model.EmailCampaign, error)
	GetEmailCampaignList(ctx context.Context, filter EmailCampaignFilter) (*EmailCampaignListResponse, error)
	UpdateEmailCampaign(ctx context.Context, id string, req *UpdateEmailCampaignRequest) (*model.EmailCampaign, error)
	DeleteEmailCampaign(ctx context.Context, id string, userID string) error

	// メール送信
	SendCampaign(ctx context.Context, campaignID string) error
	SendProposalEmail(ctx context.Context, proposalID string, templateID string, customData map[string]interface{}) error
	SendInterviewConfirmation(ctx context.Context, interviewID string) error
	SendContractExtensionRequest(ctx context.Context, extensionID string) error

	// 統計・履歴
	GetCampaignStats(ctx context.Context, campaignID string) (*model.EmailCampaignStats, error)
	GetSentHistory(ctx context.Context, campaignID string) ([]*model.EmailSentHistory, error)
}

// salesEmailService 営業関連メール送信サービスの実装
type salesEmailService struct {
	db            *gorm.DB
	templateRepo  repository.EmailTemplateRepository
	campaignRepo  repository.EmailCampaignRepository
	proposalRepo  repository.ProposalRepository
	interviewRepo repository.InterviewScheduleRepository
	extensionRepo repository.ContractExtensionRepository
	userRepo      repository.UserRepository
	clientRepo    repository.ClientRepository
	emailSvc      EmailService
	logger        *zap.Logger
}

// NewSalesEmailService 営業関連メール送信サービスのインスタンスを生成
func NewSalesEmailService(
	db *gorm.DB,
	templateRepo repository.EmailTemplateRepository,
	campaignRepo repository.EmailCampaignRepository,
	proposalRepo repository.ProposalRepository,
	interviewRepo repository.InterviewScheduleRepository,
	extensionRepo repository.ContractExtensionRepository,
	userRepo repository.UserRepository,
	clientRepo repository.ClientRepository,
	emailSvc EmailService,
	logger *zap.Logger,
) SalesEmailService {
	return &salesEmailService{
		db:            db,
		templateRepo:  templateRepo,
		campaignRepo:  campaignRepo,
		proposalRepo:  proposalRepo,
		interviewRepo: interviewRepo,
		extensionRepo: extensionRepo,
		userRepo:      userRepo,
		clientRepo:    clientRepo,
		emailSvc:      emailSvc,
		logger:        logger,
	}
}

// CreateEmailTemplateRequest メールテンプレート作成リクエスト
type CreateEmailTemplateRequest struct {
	Name      string                   `json:"name" binding:"required"`
	Subject   string                   `json:"subject" binding:"required"`
	BodyHTML  string                   `json:"body_html" binding:"required"`
	BodyText  string                   `json:"body_text"`
	Category  string                   `json:"category"`
	Variables []model.TemplateVariable `json:"variables"`
	CreatedBy string                   `json:"-"`
}

// UpdateEmailTemplateRequest メールテンプレート更新リクエスト
type UpdateEmailTemplateRequest struct {
	Name      string                   `json:"name"`
	Subject   string                   `json:"subject"`
	BodyHTML  string                   `json:"body_html"`
	BodyText  string                   `json:"body_text"`
	Category  string                   `json:"category"`
	Variables []model.TemplateVariable `json:"variables"`
	UpdatedBy string                   `json:"-"`
}

// EmailTemplateFilter メールテンプレートフィルター
type EmailTemplateFilter struct {
	Category string
	Page     int
	Limit    int
}

// EmailTemplateListResponse メールテンプレート一覧レスポンス
type EmailTemplateListResponse struct {
	Templates []*model.EmailTemplate `json:"templates"`
	Total     int64                  `json:"total"`
	Page      int                    `json:"page"`
	Limit     int                    `json:"limit"`
}

// CreateEmailCampaignRequest メールキャンペーン作成リクエスト
type CreateEmailCampaignRequest struct {
	Name             string                 `json:"name" binding:"required"`
	TemplateID       string                 `json:"template_id" binding:"required"`
	ScheduledAt      time.Time              `json:"scheduled_at" binding:"required"`
	Recipients       []model.EmailRecipient `json:"recipients"`
	TargetRole       string                 `json:"target_role"`
	TargetStatus     string                 `json:"target_status"`
	CustomConditions map[string]interface{} `json:"custom_conditions"`
	CreatedBy        string                 `json:"-"`
}

// UpdateEmailCampaignRequest メールキャンペーン更新リクエスト
type UpdateEmailCampaignRequest struct {
	Name             string                 `json:"name"`
	ScheduledAt      time.Time              `json:"scheduled_at"`
	Recipients       []model.EmailRecipient `json:"recipients"`
	TargetRole       string                 `json:"target_role"`
	TargetStatus     string                 `json:"target_status"`
	CustomConditions map[string]interface{} `json:"custom_conditions"`
	UpdatedBy        string                 `json:"-"`
}

// EmailCampaignFilter メールキャンペーンフィルター
type EmailCampaignFilter struct {
	TemplateID    string
	Status        []model.CampaignStatus
	ScheduledFrom *time.Time
	ScheduledTo   *time.Time
	CreatedBy     string
	Page          int
	Limit         int
}

// EmailCampaignListResponse メールキャンペーン一覧レスポンス
type EmailCampaignListResponse struct {
	Campaigns []*model.EmailCampaign `json:"campaigns"`
	Total     int64                  `json:"total"`
	Page      int                    `json:"page"`
	Limit     int                    `json:"limit"`
}

// CreateEmailTemplate メールテンプレートを作成
func (s *salesEmailService) CreateEmailTemplate(ctx context.Context, req *CreateEmailTemplateRequest) (*model.EmailTemplate, error) {
	template := &model.EmailTemplate{
		Name:      req.Name,
		Subject:   req.Subject,
		BodyHTML:  req.BodyHTML,
		BodyText:  req.BodyText,
		Category:  req.Category,
		IsActive:  true,
		CreatedBy: req.CreatedBy,
		UpdatedBy: req.CreatedBy,
	}

	if err := template.SetVariables(req.Variables); err != nil {
		return nil, fmt.Errorf("変数の設定に失敗しました: %w", err)
	}

	err := s.templateRepo.Create(ctx, template)
	if err != nil {
		s.logger.Error("Failed to create email template",
			zap.Error(err),
			zap.String("name", req.Name))
		return nil, fmt.Errorf("メールテンプレートの作成に失敗しました: %w", err)
	}

	return template, nil
}

// GetEmailTemplate メールテンプレートを取得
func (s *salesEmailService) GetEmailTemplate(ctx context.Context, id string) (*model.EmailTemplate, error) {
	template, err := s.templateRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get email template", zap.Error(err), zap.String("id", id))
		return nil, fmt.Errorf("メールテンプレートの取得に失敗しました: %w", err)
	}
	return template, nil
}

// GetEmailTemplateList メールテンプレート一覧を取得
func (s *salesEmailService) GetEmailTemplateList(ctx context.Context, filter EmailTemplateFilter) (*EmailTemplateListResponse, error) {
	repoFilter := repository.EmailTemplateFilter{
		Category: filter.Category,
		Page:     filter.Page,
		Limit:    filter.Limit,
	}

	if repoFilter.Page == 0 {
		repoFilter.Page = 1
	}
	if repoFilter.Limit == 0 {
		repoFilter.Limit = 20
	}

	templates, total, err := s.templateRepo.GetList(ctx, repoFilter)
	if err != nil {
		s.logger.Error("Failed to get email template list", zap.Error(err))
		return nil, fmt.Errorf("メールテンプレート一覧の取得に失敗しました: %w", err)
	}

	templatePtrs := make([]*model.EmailTemplate, len(templates))
	for i := range templates {
		templatePtrs[i] = &templates[i]
	}

	return &EmailTemplateListResponse{
		Templates: templatePtrs,
		Total:     total,
		Page:      repoFilter.Page,
		Limit:     repoFilter.Limit,
	}, nil
}

// UpdateEmailTemplate メールテンプレートを更新
func (s *salesEmailService) UpdateEmailTemplate(ctx context.Context, id string, req *UpdateEmailTemplateRequest) (*model.EmailTemplate, error) {
	template, err := s.templateRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("メールテンプレートが見つかりません: %w", err)
	}

	template.Name = req.Name
	template.Subject = req.Subject
	template.BodyHTML = req.BodyHTML
	template.BodyText = req.BodyText
	template.Category = req.Category
	template.UpdatedBy = req.UpdatedBy

	if err := template.SetVariables(req.Variables); err != nil {
		return nil, fmt.Errorf("変数の設定に失敗しました: %w", err)
	}

	err = s.templateRepo.Update(ctx, template)
	if err != nil {
		s.logger.Error("Failed to update email template",
			zap.Error(err),
			zap.String("id", id))
		return nil, fmt.Errorf("メールテンプレートの更新に失敗しました: %w", err)
	}

	return template, nil
}

// DeleteEmailTemplate メールテンプレートを削除
func (s *salesEmailService) DeleteEmailTemplate(ctx context.Context, id string, userID string) error {
	err := s.templateRepo.Delete(ctx, id, userID)
	if err != nil {
		s.logger.Error("Failed to delete email template",
			zap.Error(err),
			zap.String("id", id))
		return fmt.Errorf("メールテンプレートの削除に失敗しました: %w", err)
	}
	return nil
}

// CreateEmailCampaign メールキャンペーンを作成
func (s *salesEmailService) CreateEmailCampaign(ctx context.Context, req *CreateEmailCampaignRequest) (*model.EmailCampaign, error) {
	// テンプレート存在確認
	_, err := s.templateRepo.GetByID(ctx, req.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("テンプレートが見つかりません: %w", err)
	}

	campaign := &model.EmailCampaign{
		Name:         req.Name,
		TemplateID:   uuid.MustParse(req.TemplateID),
		ScheduledAt:  req.ScheduledAt,
		TargetRole:   req.TargetRole,
		TargetStatus: req.TargetStatus,
		Status:       model.CampaignStatusDraft,
		CreatedBy:    req.CreatedBy,
		UpdatedBy:    req.CreatedBy,
	}

	if err := campaign.SetRecipients(req.Recipients); err != nil {
		return nil, fmt.Errorf("受信者の設定に失敗しました: %w", err)
	}

	if err := campaign.SetCustomConditions(req.CustomConditions); err != nil {
		return nil, fmt.Errorf("カスタム条件の設定に失敗しました: %w", err)
	}

	err = s.campaignRepo.Create(ctx, campaign)
	if err != nil {
		s.logger.Error("Failed to create email campaign",
			zap.Error(err),
			zap.String("name", req.Name))
		return nil, fmt.Errorf("メールキャンペーンの作成に失敗しました: %w", err)
	}

	return campaign, nil
}

// GetEmailCampaign メールキャンペーンを取得
func (s *salesEmailService) GetEmailCampaign(ctx context.Context, id string) (*model.EmailCampaign, error) {
	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get email campaign", zap.Error(err), zap.String("id", id))
		return nil, fmt.Errorf("メールキャンペーンの取得に失敗しました: %w", err)
	}
	return campaign, nil
}

// GetEmailCampaignList メールキャンペーン一覧を取得
func (s *salesEmailService) GetEmailCampaignList(ctx context.Context, filter EmailCampaignFilter) (*EmailCampaignListResponse, error) {
	repoFilter := repository.EmailCampaignFilter{
		TemplateID:    filter.TemplateID,
		Status:        filter.Status,
		ScheduledFrom: filter.ScheduledFrom,
		ScheduledTo:   filter.ScheduledTo,
		CreatedBy:     filter.CreatedBy,
		Page:          filter.Page,
		Limit:         filter.Limit,
	}

	if repoFilter.Page == 0 {
		repoFilter.Page = 1
	}
	if repoFilter.Limit == 0 {
		repoFilter.Limit = 20
	}

	campaigns, total, err := s.campaignRepo.GetList(ctx, repoFilter)
	if err != nil {
		s.logger.Error("Failed to get email campaign list", zap.Error(err))
		return nil, fmt.Errorf("メールキャンペーン一覧の取得に失敗しました: %w", err)
	}

	campaignPtrs := make([]*model.EmailCampaign, len(campaigns))
	for i := range campaigns {
		campaignPtrs[i] = &campaigns[i]
	}

	return &EmailCampaignListResponse{
		Campaigns: campaignPtrs,
		Total:     total,
		Page:      repoFilter.Page,
		Limit:     repoFilter.Limit,
	}, nil
}

// UpdateEmailCampaign メールキャンペーンを更新
func (s *salesEmailService) UpdateEmailCampaign(ctx context.Context, id string, req *UpdateEmailCampaignRequest) (*model.EmailCampaign, error) {
	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("メールキャンペーンが見つかりません: %w", err)
	}

	campaign.Name = req.Name
	campaign.ScheduledAt = req.ScheduledAt
	campaign.TargetRole = req.TargetRole
	campaign.TargetStatus = req.TargetStatus
	campaign.UpdatedBy = req.UpdatedBy

	if err := campaign.SetRecipients(req.Recipients); err != nil {
		return nil, fmt.Errorf("受信者の設定に失敗しました: %w", err)
	}

	if err := campaign.SetCustomConditions(req.CustomConditions); err != nil {
		return nil, fmt.Errorf("カスタム条件の設定に失敗しました: %w", err)
	}

	err = s.campaignRepo.Update(ctx, campaign)
	if err != nil {
		s.logger.Error("Failed to update email campaign",
			zap.Error(err),
			zap.String("id", id))
		return nil, fmt.Errorf("メールキャンペーンの更新に失敗しました: %w", err)
	}

	return campaign, nil
}

// DeleteEmailCampaign メールキャンペーンを削除
func (s *salesEmailService) DeleteEmailCampaign(ctx context.Context, id string, userID string) error {
	err := s.campaignRepo.Delete(ctx, id, userID)
	if err != nil {
		s.logger.Error("Failed to delete email campaign",
			zap.Error(err),
			zap.String("id", id))
		return fmt.Errorf("メールキャンペーンの削除に失敗しました: %w", err)
	}
	return nil
}

// SendCampaign キャンペーンを送信
func (s *salesEmailService) SendCampaign(ctx context.Context, campaignID string) error {
	// キャンペーン取得
	campaign, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("キャンペーンが見つかりません: %w", err)
	}

	// ステータス確認
	if campaign.Status != model.CampaignStatusScheduled {
		return fmt.Errorf("送信可能なステータスではありません: %s", campaign.Status)
	}

	// テンプレート取得
	template, err := s.templateRepo.GetByID(ctx, campaign.TemplateID.String())
	if err != nil {
		return fmt.Errorf("テンプレートの取得に失敗しました: %w", err)
	}

	// 受信者取得
	recipients, err := campaign.GetRecipients()
	if err != nil {
		return fmt.Errorf("受信者の取得に失敗しました: %w", err)
	}

	// ステータスを送信中に更新
	err = s.campaignRepo.UpdateStatus(ctx, campaignID, model.CampaignStatusSending, "system")
	if err != nil {
		return fmt.Errorf("ステータスの更新に失敗しました: %w", err)
	}

	// 各受信者にメール送信
	successCount := 0
	for _, recipient := range recipients {
		// メール送信
		err := s.emailSvc.SendHTMLEmail(ctx, []string{recipient.Email}, template.Subject, template.BodyHTML)
		if err != nil {
			s.logger.Error("Failed to send email",
				zap.Error(err),
				zap.String("campaign_id", campaignID),
				zap.String("recipient", recipient.Email))

			// 送信履歴にエラーを記録
			history := &model.EmailSentHistory{
				CampaignID:     campaign.ID,
				RecipientEmail: recipient.Email,
				RecipientName:  recipient.Name,
				SentAt:         time.Now(),
				DeliveryStatus: model.EmailDeliveryStatusFailed,
				ErrorMessage:   err.Error(),
			}
			s.campaignRepo.AddSentHistory(ctx, history)
			continue
		}

		// 送信履歴を記録
		history := &model.EmailSentHistory{
			CampaignID:     campaign.ID,
			RecipientEmail: recipient.Email,
			RecipientName:  recipient.Name,
			SentAt:         time.Now(),
			DeliveryStatus: model.EmailDeliveryStatusSent,
		}
		s.campaignRepo.AddSentHistory(ctx, history)

		successCount++
	}

	// 送信数を更新
	err = s.campaignRepo.UpdateSentCount(ctx, campaignID, successCount)
	if err != nil {
		s.logger.Warn("Failed to update sent count", zap.Error(err))
	}

	// ステータスを完了に更新
	err = s.campaignRepo.UpdateStatus(ctx, campaignID, model.CampaignStatusCompleted, "system")
	if err != nil {
		s.logger.Warn("Failed to update status to completed", zap.Error(err))
	}

	s.logger.Info("Campaign sent successfully",
		zap.String("campaign_id", campaignID),
		zap.Int("success_count", successCount),
		zap.Int("total_recipients", len(recipients)))

	return nil
}

// SendProposalEmail 提案メールを送信
func (s *salesEmailService) SendProposalEmail(ctx context.Context, proposalID string, templateID string, customData map[string]interface{}) error {
	// 提案取得
	proposal, err := s.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return fmt.Errorf("提案が見つかりません: %w", err)
	}

	// テンプレート取得
	template, err := s.templateRepo.GetByID(ctx, templateID)
	if err != nil {
		return fmt.Errorf("テンプレートが見つかりません: %w", err)
	}

	// テンプレートデータ準備
	data := map[string]interface{}{
		"EngineerName":     proposal.Engineer.FirstName + " " + proposal.Engineer.LastName,
		"ClientName":       proposal.Client.CompanyName,
		"ProposalAmount":   proposal.ProposalAmount,
		"AmountType":       proposal.AmountType,
		"WorkingHours":     proposal.WorkingHours,
		"SkillSheetURL":    proposal.SkillSheetURL,
		"ProposalDate":     proposal.ProposalDate.Format("2006年01月02日"),
		"ResponseDeadline": proposal.ResponseDeadline.Format("2006年01月02日"),
	}

	// カスタムデータをマージ
	for k, v := range customData {
		data[k] = v
	}

	// メール送信
	// TODO: Add Email field to Client model or fetch from another source
	var clientEmail string
	if proposal.Client != nil {
		// clientEmail = proposal.Client.Email // Email field needs to be added to Client model
		clientEmail = "" // Placeholder
	}

	if clientEmail != "" {
		err = s.emailSvc.SendTemplatedEmail(ctx, []string{clientEmail}, template.Subject, template.Name, data)
	} else {
		err = fmt.Errorf("client email not found")
	}
	if err != nil {
		s.logger.Error("Failed to send proposal email",
			zap.Error(err),
			zap.String("proposal_id", proposalID))
		return fmt.Errorf("提案メールの送信に失敗しました: %w", err)
	}

	return nil
}

// SendInterviewConfirmation 面談確認メールを送信
func (s *salesEmailService) SendInterviewConfirmation(ctx context.Context, interviewID string) error {
	// 面談取得
	interview, err := s.interviewRepo.GetByID(ctx, interviewID)
	if err != nil {
		return fmt.Errorf("面談が見つかりません: %w", err)
	}

	// 面談確認用テンプレートを取得（デフォルトテンプレート）
	template, err := s.templateRepo.GetByCategory(ctx, "interview_confirmation")
	if err != nil {
		return fmt.Errorf("面談確認テンプレートが見つかりません: %w", err)
	}

	// テンプレートデータ準備
	data := map[string]interface{}{
		"EngineerName":  interview.Proposal.Engineer.FirstName + " " + interview.Proposal.Engineer.LastName,
		"ClientName":    interview.Proposal.Client.CompanyName,
		"ScheduledDate": interview.ScheduledDate.Format("2006年01月02日 15:04"),
		"Duration":      interview.DurationMinutes,
		"Location":      interview.Location,
		"MeetingType":   interview.MeetingType,
		"MeetingURL":    interview.MeetingURL,
	}

	// 参加者への通知
	clientAttendees, _ := interview.GetClientAttendees()
	engineerAttendees, _ := interview.GetEngineerAttendees()

	// クライアント参加者にメール送信
	for _, attendee := range clientAttendees {
		if email, ok := attendee["email"]; ok && email != "" {
			err := s.emailSvc.SendTemplatedEmail(ctx, []string{email}, template.Subject, template.Name, data)
			if err != nil {
				s.logger.Error("Failed to send interview confirmation to client",
					zap.Error(err),
					zap.String("email", email))
			}
		}
	}

	// エンジニア参加者にメール送信
	for _, attendee := range engineerAttendees {
		if email, ok := attendee["email"]; ok && email != "" {
			err := s.emailSvc.SendTemplatedEmail(ctx, []string{email}, template.Subject, template.Name, data)
			if err != nil {
				s.logger.Error("Failed to send interview confirmation to engineer",
					zap.Error(err),
					zap.String("email", email))
			}
		}
	}

	return nil
}

// SendContractExtensionRequest 契約延長依頼メールを送信
func (s *salesEmailService) SendContractExtensionRequest(ctx context.Context, extensionID string) error {
	// 延長確認取得
	extension, err := s.extensionRepo.GetByID(ctx, extensionID)
	if err != nil {
		return fmt.Errorf("延長確認が見つかりません: %w", err)
	}

	// 契約延長用テンプレートを取得
	template, err := s.templateRepo.GetByCategory(ctx, "contract_extension")
	if err != nil {
		return fmt.Errorf("契約延長テンプレートが見つかりません: %w", err)
	}

	// テンプレートデータ準備
	var newContractEndStr string
	if extension.NewContractEndDate != nil {
		newContractEndStr = extension.NewContractEndDate.Format("2006年01月02日")
	} else {
		newContractEndStr = "未定"
	}

	data := map[string]interface{}{
		"EngineerName":       extension.Engineer.FirstName + " " + extension.Engineer.LastName,
		"CurrentContractEnd": extension.CurrentContractEndDate.Format("2006年01月02日"),
		"ExtensionCheckDate": extension.ExtensionCheckDate.Format("2006年01月02日"),
		"ExtensionPeriod":    extension.ExtensionPeriodMonths,
		"NewContractEnd":     newContractEndStr,
		"Notes":              extension.Notes,
	}

	// エンジニアにメール送信
	err = s.emailSvc.SendTemplatedEmail(ctx, []string{extension.Engineer.Email}, template.Subject, template.Name, data)
	if err != nil {
		s.logger.Error("Failed to send contract extension request",
			zap.Error(err),
			zap.String("extension_id", extensionID))
		return fmt.Errorf("契約延長依頼メールの送信に失敗しました: %w", err)
	}

	return nil
}

// GetCampaignStats キャンペーン統計を取得
func (s *salesEmailService) GetCampaignStats(ctx context.Context, campaignID string) (*model.EmailCampaignStats, error) {
	stats, err := s.campaignRepo.GetCampaignStats(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("統計の取得に失敗しました: %w", err)
	}

	return &model.EmailCampaignStats{
		TotalRecipients: stats.TotalRecipients,
		SentCount:       stats.SentCount,
		OpenCount:       stats.OpenCount,
		ClickCount:      stats.ClickCount,
		DeliveryRate:    stats.DeliveryRate,
		OpenRate:        stats.OpenRate,
		ClickRate:       stats.ClickRate,
	}, nil
}

// GetSentHistory 送信履歴を取得
func (s *salesEmailService) GetSentHistory(ctx context.Context, campaignID string) ([]*model.EmailSentHistory, error) {
	history, err := s.campaignRepo.GetSentHistory(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("送信履歴の取得に失敗しました: %w", err)
	}

	historyPtrs := make([]*model.EmailSentHistory, len(history))
	for i := range history {
		historyPtrs[i] = &history[i]
	}

	return historyPtrs, nil
}
