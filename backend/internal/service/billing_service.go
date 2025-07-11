package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
)

// TransactionManager エイリアス
type TransactionManager = transaction.TransactionManager

// ProjectAssignmentRepository プロジェクトアサインメントリポジトリ（仮定義）
type ProjectAssignmentRepository interface {
	repository.CrudRepository[model.ProjectAssignment]
	FindActiveByProjectID(ctx context.Context, projectID uuid.UUID, date time.Time) ([]*model.ProjectAssignment, error)
}

// BillingServiceInterface 請求サービスインターフェース
type BillingServiceInterface interface {
	// 請求プレビュー
	PreviewBilling(ctx context.Context, req *dto.BillingPreviewRequest) (*dto.BillingPreviewResponse, error)
	PreviewClientBilling(ctx context.Context, clientID uuid.UUID, billingYear, billingMonth int) (*dto.ClientBillingPreview, error)
	PreviewGroupBilling(ctx context.Context, groupID uuid.UUID, billingYear, billingMonth int) (*dto.GroupBillingPreview, error)

	// 請求計算
	CalculateProjectBilling(ctx context.Context, assignment *model.ProjectAssignment, year, month int) (*dto.ProjectBillingDetail, error)
	CalculateBillingAmount(billingType model.ProjectBillingType, monthlyRate float64, actualHours, lowerLimit, upperLimit *float64) (float64, error)

	// 請求履歴
	GetBillingHistory(ctx context.Context, req *dto.BillingHistoryRequest) (*dto.BillingHistoryResponse, error)
	GetClientBillingHistory(ctx context.Context, clientID uuid.UUID, limit int) ([]dto.BillingHistoryItemDTO, error)

	// バリデーション
	ValidateBillingPeriod(year, month int) error
	CheckDuplicateBilling(ctx context.Context, clientID uuid.UUID, billingMonth string) (bool, error)

	// 請求処理実行
	ExecuteBilling(ctx context.Context, req *dto.ExecuteBillingRequest, executorID uuid.UUID) (*dto.ExecuteBillingResponse, error)
	ExecuteClientBilling(ctx context.Context, clientID uuid.UUID, billingYear, billingMonth int, executorID uuid.UUID) (*dto.InvoiceResponse, error)
	ExecuteBatchBilling(ctx context.Context, req *dto.BatchBillingRequest, executorID uuid.UUID) (*dto.BatchBillingResponse, error)

	// 請求書操作
	RegenerateInvoice(ctx context.Context, invoiceID uuid.UUID, executorID uuid.UUID) (*dto.InvoiceResponse, error)
	CancelInvoice(ctx context.Context, invoiceID uuid.UUID, reason string, executorID uuid.UUID) error
	UpdateInvoiceStatus(ctx context.Context, invoiceID uuid.UUID, status model.InvoiceStatus, executorID uuid.UUID) error

	// 一括操作
	GenerateMonthlyInvoices(ctx context.Context, year, month int, executorID uuid.UUID) (*dto.MonthlyInvoiceGenerationResult, error)
	RetryFailedBillings(ctx context.Context, billingMonth string) (*dto.RetryBillingResult, error)

	// サマリー取得
	GetBillingSummary(ctx context.Context, year, month int) (*dto.BillingSummaryResponse, error)
}

// billingService 請求サービス実装
type billingService struct {
	db                 *gorm.DB
	logger             *zap.Logger
	clientRepo         repository.ClientRepository
	projectRepo        repository.ProjectRepository
	assignmentRepo     ProjectAssignmentRepository
	invoiceRepo        repository.InvoiceRepository
	groupRepo          repository.ProjectGroupRepositoryInterface
	transactionManager TransactionManager
}

// NewBillingService 請求サービスのコンストラクタ
func NewBillingService(
	db *gorm.DB,
	logger *zap.Logger,
	clientRepo repository.ClientRepository,
	projectRepo repository.ProjectRepository,
	assignmentRepo ProjectAssignmentRepository,
	invoiceRepo repository.InvoiceRepository,
	groupRepo repository.ProjectGroupRepositoryInterface,
	transactionManager TransactionManager,
) BillingServiceInterface {
	return &billingService{
		db:                 db,
		logger:             logger,
		clientRepo:         clientRepo,
		projectRepo:        projectRepo,
		assignmentRepo:     assignmentRepo,
		invoiceRepo:        invoiceRepo,
		groupRepo:          groupRepo,
		transactionManager: transactionManager,
	}
}

// PreviewBilling 請求プレビューを生成
func (s *billingService) PreviewBilling(ctx context.Context, req *dto.BillingPreviewRequest) (*dto.BillingPreviewResponse, error) {
	// バリデーション
	if err := s.ValidateBillingPeriod(req.BillingYear, req.BillingMonth); err != nil {
		return nil, err
	}

	response := &dto.BillingPreviewResponse{
		BillingYear:  req.BillingYear,
		BillingMonth: req.BillingMonth,
		Clients:      make([]dto.ClientBillingPreview, 0),
		TotalAmount:  0,
		TotalClients: 0,
		CreatedAt:    time.Now(),
	}

	// クライアントごとにプレビューを生成
	for _, clientID := range req.ClientIDs {
		clientPreview, err := s.PreviewClientBilling(ctx, clientID, req.BillingYear, req.BillingMonth)
		if err != nil {
			s.logger.Error("Failed to preview client billing",
				zap.Error(err),
				zap.String("client_id", clientID.String()))
			// エラーがあってもスキップして続行
			clientPreview = &dto.ClientBillingPreview{
				ClientID:   clientID,
				ClientName: "エラー",
				Status:     "error",
				Error:      err.Error(),
				Amount:     0,
			}
		}

		response.Clients = append(response.Clients, *clientPreview)
		if clientPreview.Status != "error" {
			response.TotalAmount += clientPreview.Amount
			response.TotalClients++
		}
	}

	// 警告とエラーをカウント
	for _, client := range response.Clients {
		if client.Error != "" {
			// エラーカウント（TotalErrorsフィールドが存在しないのでコメント化）
			// response.TotalErrors++
		}
	}

	return response, nil
}

// PreviewClientBilling クライアント単位の請求プレビューを生成
func (s *billingService) PreviewClientBilling(ctx context.Context, clientID uuid.UUID, billingYear, billingMonth int) (*dto.ClientBillingPreview, error) {
	// クライアント情報を取得
	client, err := s.clientRepo.FindByID(ctx, clientID)
	if err != nil {
		return nil, fmt.Errorf("クライアント情報の取得に失敗しました: %w", err)
	}
	if client == nil {
		return nil, fmt.Errorf("クライアントが見つかりません")
	}

	preview := &dto.ClientBillingPreview{
		ClientID:     client.ID,
		ClientName:   client.CompanyName,
		Amount:       0,
		ProjectCount: 0,
		Status:       "ready",
		Error:        "",
	}

	// 請求月の文字列を生成
	billingMonthStr := fmt.Sprintf("%04d-%02d", billingYear, billingMonth)

	// 重複チェック
	isDuplicate, err := s.CheckDuplicateBilling(ctx, clientID, billingMonthStr)
	if err != nil {
		preview.Error = "重複チェックに失敗しました"
	} else if isDuplicate {
		preview.Status = "duplicate"
		preview.Error = "この月の請求書は既に作成されています"
	}

	// プロジェクトグループを取得
	groups, err := s.groupRepo.List(ctx, &clientID, 100, 0)
	if err != nil {
		s.logger.Error("Failed to get project groups", zap.Error(err))
	}

	// グループごとに請求を計算
	// プロジェクトグループの処理をスキップ（ClientBillingPreviewにGroupsフィールドがないため）
	// TODO: ClientBillingPreviewを拡張してグループ情報を含める
	_ = groups

	// グループに属さないプロジェクトを取得
	projects, err := s.projectRepo.FindByClientID(ctx, clientID)
	if err != nil {
		s.logger.Error("Failed to get client projects", zap.Error(err))
	}

	// グループに属さないプロジェクトの請求を計算
	for _, project := range projects {
		// グループに属しているかチェック
		projectGroups, err := s.groupRepo.GetGroupsByProjectID(ctx, project.ID)
		if err != nil || len(projectGroups) > 0 {
			continue // グループに属している場合はスキップ
		}

		// アクティブなアサインメントを取得
		assignments, err := s.assignmentRepo.FindActiveByProjectID(ctx, project.ID, time.Now())
		if err != nil {
			s.logger.Error("Failed to get project assignments", zap.Error(err))
			continue
		}

		// アサインメントごとに請求を計算
		for _, assignment := range assignments {
			detail, err := s.CalculateProjectBilling(ctx, assignment, billingYear, billingMonth)
			if err != nil {
				s.logger.Error("Failed to calculate project billing", zap.Error(err))
				preview.Warnings = append(preview.Warnings,
					fmt.Sprintf("プロジェクト「%s」の請求計算に失敗しました", project.ProjectName))
				continue
			}
			preview.Projects = append(preview.Projects, detail)
			preview.TotalAmount += detail.BillingAmount
		}
	}

	// ステータスの最終判定
	if preview.TotalAmount == 0 {
		preview.Status = "no_billing"
		preview.Warnings = append(preview.Warnings, "請求対象のプロジェクトがありません")
	}

	return preview, nil
}

// PreviewGroupBilling グループ単位の請求プレビューを生成
func (s *billingService) PreviewGroupBilling(ctx context.Context, groupID uuid.UUID, billingYear, billingMonth int) (*dto.GroupBillingPreview, error) {
	// グループ情報を取得
	group, err := s.groupRepo.GetByIDWithDetails(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("グループ情報の取得に失敗しました: %w", err)
	}
	if group == nil {
		return nil, fmt.Errorf("グループが見つかりません")
	}

	preview := &dto.GroupBillingPreview{
		GroupID:      group.ID,
		GroupName:    group.GroupName,
		Projects:     make([]*dto.ProjectBillingDetail, 0),
		TotalAmount:  0,
		ProjectCount: 0,
	}

	// グループ内のプロジェクトを処理
	for _, project := range group.Projects {
		// アクティブなアサインメントを取得
		assignments, err := s.assignmentRepo.FindActiveByProjectID(ctx, project.ID, time.Now())
		if err != nil {
			s.logger.Error("Failed to get project assignments", zap.Error(err))
			continue
		}

		// アサインメントごとに請求を計算
		for _, assignment := range assignments {
			detail, err := s.CalculateProjectBilling(ctx, assignment, billingYear, billingMonth)
			if err != nil {
				s.logger.Error("Failed to calculate project billing", zap.Error(err))
				continue
			}
			preview.Projects = append(preview.Projects, detail)
			preview.TotalAmount += detail.BillingAmount
			preview.ProjectCount++
		}
	}

	return preview, nil
}

// CalculateProjectBilling プロジェクトの請求金額を計算
func (s *billingService) CalculateProjectBilling(ctx context.Context, assignment *model.ProjectAssignment, year, month int) (*dto.ProjectBillingDetail, error) {
	// プロジェクト情報を取得
	project, err := s.projectRepo.GetByID(ctx, assignment.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("プロジェクト情報の取得に失敗しました: %w", err)
	}
	if project == nil {
		return nil, fmt.Errorf("プロジェクトが見つかりません")
	}

	// ユーザー情報を取得（必要に応じて）
	// user, err := s.userRepo.GetByID(ctx, assignment.UserID)

	detail := &dto.ProjectBillingDetail{
		ProjectID:     project.ID,
		ProjectName:   project.ProjectName,
		AssignmentID:  assignment.ID,
		UserID:        assignment.UserID,
		UserName:      "", // ユーザー名は別途取得
		BillingType:   string(assignment.GetBillingType()),
		MonthlyRate:   assignment.BillingRate,
		ActualHours:   nil,
		BillingAmount: 0,
		Notes:         "",
	}

	// 請求タイプに応じて金額を計算
	var actualHours float64
	// TODO: 実際の稼働時間を取得する処理を実装
	// actualHours = s.getActualHours(ctx, assignment.UserID, project.ID, year, month)

	if assignment.GetBillingType() != model.ProjectBillingTypeFixed {
		detail.ActualHours = &actualHours
	}

	amount, err := s.CalculateBillingAmount(
		assignment.GetBillingType(),
		assignment.BillingRate,
		detail.ActualHours,
		assignment.MinHours,
		assignment.MaxHours,
	)
	if err != nil {
		return nil, fmt.Errorf("請求金額の計算に失敗しました: %w", err)
	}

	detail.BillingAmount = amount

	// 計算メモを生成
	switch assignment.GetBillingType() {
	case model.ProjectBillingTypeFixed:
		detail.Notes = "固定額請求"
	case model.ProjectBillingTypeVariableUpperLower:
		if assignment.MinHours != nil && assignment.MaxHours != nil {
			detail.Notes = fmt.Sprintf("上下割請求（下限: %.1fh, 上限: %.1fh, 実績: %.1fh）",
				*assignment.MinHours, *assignment.MaxHours, actualHours)
		}
	case model.ProjectBillingTypeVariableMiddle:
		if assignment.MinHours != nil && assignment.MaxHours != nil {
			detail.Notes = fmt.Sprintf("中間値請求（基準: %.1fh, 実績: %.1fh）",
				(*assignment.MinHours+*assignment.MaxHours)/2, actualHours)
		}
	}

	return detail, nil
}

// CalculateBillingAmount 請求金額を計算
func (s *billingService) CalculateBillingAmount(billingType model.ProjectBillingType, monthlyRate float64, actualHours, lowerLimit, upperLimit *float64) (float64, error) {
	switch billingType {
	case model.ProjectBillingTypeFixed:
		// 固定額請求
		return monthlyRate, nil

	case model.ProjectBillingTypeVariableUpperLower:
		// 上下割請求
		if actualHours == nil || lowerLimit == nil || upperLimit == nil {
			return 0, fmt.Errorf("上下割請求に必要なパラメータが不足しています")
		}

		if *actualHours < *lowerLimit {
			// 下限を下回る場合
			hourlyRate := monthlyRate / *lowerLimit
			return hourlyRate * *actualHours, nil
		} else if *actualHours > *upperLimit {
			// 上限を上回る場合
			hourlyRate := monthlyRate / *upperLimit
			return hourlyRate * *actualHours, nil
		} else {
			// 範囲内の場合は固定額
			return monthlyRate, nil
		}

	case model.ProjectBillingTypeVariableMiddle:
		// 中間値請求
		if actualHours == nil || lowerLimit == nil || upperLimit == nil {
			return 0, fmt.Errorf("中間値請求に必要なパラメータが不足しています")
		}

		middleHours := (*lowerLimit + *upperLimit) / 2
		hourlyRate := monthlyRate / middleHours
		return hourlyRate * *actualHours, nil

	default:
		return 0, fmt.Errorf("不明な請求タイプ: %s", billingType)
	}
}

// GetBillingHistory 請求履歴を取得
func (s *billingService) GetBillingHistory(ctx context.Context, req *dto.BillingHistoryRequest) (*dto.BillingHistoryResponse, error) {
	// デフォルト値の設定
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Page < 1 {
		req.Page = 1
	}

	// 日付範囲の設定（デフォルトは過去6ヶ月）
	if req.EndDate == nil {
		now := time.Now()
		req.EndDate = &now
	}
	if req.StartDate == nil {
		sixMonthsAgo := req.EndDate.AddDate(0, -6, 0)
		req.StartDate = &sixMonthsAgo
	}

	// 統計情報を取得
	_, err := s.invoiceRepo.GetBillingStats(ctx, *req.StartDate, *req.EndDate)
	if err != nil {
		s.logger.Error("Failed to get billing stats", zap.Error(err))
		return nil, fmt.Errorf("請求統計の取得に失敗しました")
	}

	response := &dto.BillingHistoryResponse{
		Items: make([]dto.BillingHistoryItemDTO, 0),
		Total: 0,
		Page:  req.Page,
		Limit: req.Limit,
	}

	// 請求履歴を取得
	_ = (req.Page - 1) * req.Limit // offset（現在未使用）

	// TODO: 実際の請求履歴取得処理を実装
	// invoices, err := s.invoiceRepo.FindWithFilters(ctx, query, req.Limit, offset)

	return response, nil
}

// GetClientBillingHistory クライアントの請求履歴を取得
func (s *billingService) GetClientBillingHistory(ctx context.Context, clientID uuid.UUID, limit int) ([]dto.BillingHistoryItemDTO, error) {
	invoices, err := s.invoiceRepo.FindByClientID(ctx, clientID)
	if err != nil {
		return nil, fmt.Errorf("請求履歴の取得に失敗しました: %w", err)
	}

	// 最新のものから指定件数だけ取得
	if len(invoices) > limit {
		invoices = invoices[:limit]
	}

	items := make([]dto.BillingHistoryItemDTO, len(invoices))
	for i, invoice := range invoices {
		items[i] = dto.BillingHistoryItemDTO{
			ExecutionID:   uuid.New(), // 仮のID
			BillingPeriod: invoice.BillingMonth,
			ClientCount:   1,
			InvoiceCount:  1,
			TotalAmount:   invoice.TotalAmount,
			Status:        string(invoice.Status),
			ExecutionType: "individual",
			ExecutedAt:    invoice.CreatedAt,
			ExecutionTime: 0,
		}
	}

	return items, nil
}

// ValidateBillingPeriod 請求期間のバリデーション
func (s *billingService) ValidateBillingPeriod(year, month int) error {
	if year < 2020 || year > 2050 {
		return fmt.Errorf("年は2020年から2050年の間で指定してください")
	}
	if month < 1 || month > 12 {
		return fmt.Errorf("月は1から12の間で指定してください")
	}

	// 未来の請求は作成不可
	now := time.Now()
	billingDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	if billingDate.After(now) {
		return fmt.Errorf("未来の請求書は作成できません")
	}

	return nil
}

// CheckDuplicateBilling 重複請求のチェック
func (s *billingService) CheckDuplicateBilling(ctx context.Context, clientID uuid.UUID, billingMonth string) (bool, error) {
	invoices, err := s.invoiceRepo.FindByBillingMonth(ctx, billingMonth, &clientID)
	if err != nil {
		return false, fmt.Errorf("重複チェックに失敗しました: %w", err)
	}

	// キャンセル以外のステータスの請求書があれば重複とみなす
	for _, invoice := range invoices {
		if invoice.Status != model.InvoiceStatusCancelled {
			return true, nil
		}
	}

	return false, nil
}

// calculateBillingDeadline 請求締め日を計算
func (s *billingService) calculateBillingDeadline(year, month int, closingDay *int) time.Time {
	// デフォルトは月末
	if closingDay == nil {
		// 翌月の1日から1日引いて月末を取得
		return time.Date(year, time.Month(month)+1, 0, 23, 59, 59, 0, time.UTC)
	}

	// 指定された締め日
	deadline := time.Date(year, time.Month(month), *closingDay, 23, 59, 59, 0, time.UTC)

	// 締め日が月末を超える場合は月末に調整
	lastDay := time.Date(year, time.Month(month)+1, 0, 23, 59, 59, 0, time.UTC).Day()
	if *closingDay > lastDay {
		deadline = time.Date(year, time.Month(month), lastDay, 23, 59, 59, 0, time.UTC)
	}

	return deadline
}

// ExecuteBilling 請求処理を実行
func (s *billingService) ExecuteBilling(ctx context.Context, req *dto.ExecuteBillingRequest, executorID uuid.UUID) (*dto.ExecuteBillingResponse, error) {
	// バリデーション
	if err := s.ValidateBillingPeriod(req.BillingYear, req.BillingMonth); err != nil {
		return nil, err
	}

	response := &dto.ExecuteBillingResponse{
		BillingYear:      req.BillingYear,
		BillingMonth:     req.BillingMonth,
		ProcessedClients: make([]*dto.ProcessedClientResult, 0),
		SuccessCount:     0,
		FailureCount:     0,
		TotalAmount:      0,
		ProcessedAt:      time.Now(),
	}

	// クライアントごとに請求処理を実行
	for _, clientID := range req.ClientIDs {
		result := &dto.ProcessedClientResult{
			ClientID:   clientID,
			ClientName: "", // 後で設定
			Status:     "processing",
			Errors:     make([]string, 0),
		}

		// クライアント請求を実行
		invoice, err := s.ExecuteClientBilling(ctx, clientID, req.BillingYear, req.BillingMonth, executorID)
		if err != nil {
			result.Status = "failed"
			result.Errors = append(result.Errors, err.Error())
			response.FailureCount++
		} else {
			result.Status = "success"
			result.InvoiceID = &invoice.ID
			result.InvoiceNumber = &invoice.InvoiceNumber
			result.TotalAmount = &invoice.TotalAmount
			response.SuccessCount++
			response.TotalAmount += invoice.TotalAmount

			// クライアント名を設定
			result.ClientName = invoice.ClientName
		}

		response.ProcessedClients = append(response.ProcessedClients, result)
	}

	return response, nil
}

// ExecuteClientBilling クライアント単位の請求処理を実行
func (s *billingService) ExecuteClientBilling(ctx context.Context, clientID uuid.UUID, billingYear, billingMonth int, executorID uuid.UUID) (*dto.InvoiceResponse, error) {
	// TODO: 実装予定
	return nil, fmt.Errorf("未実装")
}

// 残りのメソッドは未実装として定義

// ExecuteBatchBilling バッチ請求処理を実行
func (s *billingService) ExecuteBatchBilling(ctx context.Context, req *dto.BatchBillingRequest, executorID uuid.UUID) (*dto.BatchBillingResponse, error) {
	return nil, fmt.Errorf("未実装")
}

// RegenerateInvoice 請求書を再生成
func (s *billingService) RegenerateInvoice(ctx context.Context, invoiceID uuid.UUID, executorID uuid.UUID) (*dto.InvoiceResponse, error) {
	return nil, fmt.Errorf("未実装")
}

// CancelInvoice 請求書をキャンセル
func (s *billingService) CancelInvoice(ctx context.Context, invoiceID uuid.UUID, reason string, executorID uuid.UUID) error {
	return fmt.Errorf("未実装")
}

// UpdateInvoiceStatus 請求書ステータスを更新
func (s *billingService) UpdateInvoiceStatus(ctx context.Context, invoiceID uuid.UUID, status model.InvoiceStatus, executorID uuid.UUID) error {
	return fmt.Errorf("未実装")
}

// GenerateMonthlyInvoices 月次請求書を一括生成
func (s *billingService) GenerateMonthlyInvoices(ctx context.Context, year, month int, executorID uuid.UUID) (*dto.MonthlyInvoiceGenerationResult, error) {
	return nil, fmt.Errorf("未実装")
}

// RetryFailedBillings 失敗した請求処理を再試行
func (s *billingService) RetryFailedBillings(ctx context.Context, billingMonth string) (*dto.RetryBillingResult, error) {
	return nil, fmt.Errorf("未実装")
}

// GetBillingSummary 請求サマリーを取得
func (s *billingService) GetBillingSummary(ctx context.Context, year, month int) (*dto.BillingSummaryResponse, error) {
	// TODO: 実装予定
	return &dto.BillingSummaryResponse{
		Year:            year,
		Month:           month,
		TotalAmount:     0,
		TotalInvoices:   0,
		PaidInvoices:    0,
		UnpaidInvoices:  0,
		OverdueInvoices: 0,
		TotalClients:    0,
		ActiveProjects:  0,
		BillingByClient: []dto.ClientBillingSummary{},
		BillingByType:   []dto.BillingTypeSummary{},
	}, nil
}
