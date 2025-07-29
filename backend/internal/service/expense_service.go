package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/cache"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/metrics"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/utils"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpenseService 経費申請サービスのインターフェース
type ExpenseService interface {
	// 基本CRUD操作
	Create(ctx context.Context, userID uuid.UUID, req *dto.CreateExpenseRequest) (*model.Expense, error)
	GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.ExpenseWithDetails, error)
	Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateExpenseRequest) (*model.Expense, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error

	// 一覧取得
	List(ctx context.Context, userID uuid.UUID, filter *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error)
	ListAll(ctx context.Context, filter *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error)

	// カテゴリ管理
	GetCategories(ctx context.Context) ([]model.ExpenseCategoryMaster, error)
	GetActiveCategories(ctx context.Context) ([]model.ExpenseCategoryMaster, error)

	// カテゴリ管理（管理画面用）
	GetCategoriesWithFilter(ctx context.Context, filter *dto.ExpenseCategoryListRequest) (*dto.ExpenseCategoryListResponse, error)
	GetCategoryByID(ctx context.Context, id uuid.UUID) (*dto.ExpenseCategoryResponse, error)
	CreateCategory(ctx context.Context, req *dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error)
	UpdateCategory(ctx context.Context, id uuid.UUID, req *dto.UpdateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error)
	DeleteCategory(ctx context.Context, id uuid.UUID) error
	ReorderCategories(ctx context.Context, req *dto.ReorderCategoriesRequest) error
	BulkUpdateCategories(ctx context.Context, req *dto.BulkUpdateCategoriesRequest) error

	// 集計
	GetMonthlySummary(ctx context.Context, userID uuid.UUID, year int, month int) (*dto.ExpenseSummaryResponse, error)
	GetYearlySummary(ctx context.Context, userID uuid.UUID, year int) (*dto.ExpenseYearlySummaryResponse, error)
	GetFiscalYearSummary(ctx context.Context, userID uuid.UUID, fiscalYear int) (*dto.ExpenseYearlySummaryResponse, error)

	// 上限管理（レガシー）
	GetCurrentLimits(ctx context.Context) (*dto.ExpenseLimitResponse, error)
	CheckLimits(ctx context.Context, userID uuid.UUID, amount int, expenseDate time.Time) (*dto.LimitCheckResult, error)
	GetExpenseLimits(ctx context.Context) ([]model.ExpenseLimit, error)
	UpdateExpenseLimit(ctx context.Context, userID uuid.UUID, req *dto.UpdateExpenseLimitRequest) (*model.ExpenseLimit, error)

	// 上限管理（スコープ対応）
	GetExpenseLimitsWithScope(ctx context.Context, filter *dto.ExpenseLimitListRequest) (*dto.ExpenseLimitListResponse, error)
	GetExpenseLimitByID(ctx context.Context, id uuid.UUID) (*dto.ExpenseLimitDetailResponse, error)
	CreateExpenseLimitWithScope(ctx context.Context, createdBy uuid.UUID, req *dto.CreateExpenseLimitRequest) (*dto.ExpenseLimitDetailResponse, error)
	UpdateExpenseLimitWithScope(ctx context.Context, id uuid.UUID, createdBy uuid.UUID, req *dto.UpdateExpenseLimitV2Request) (*dto.ExpenseLimitDetailResponse, error)
	DeleteExpenseLimitWithScope(ctx context.Context, id uuid.UUID) error
	CheckLimitsWithScope(ctx context.Context, userID uuid.UUID, departmentID *uuid.UUID, amount int, expenseDate time.Time) (*dto.LimitCheckResult, error)
	GetExpenseLimitHistory(ctx context.Context, filter *dto.ExpenseLimitHistoryRequest) (*dto.ExpenseLimitHistoryResponse, error)

	// 申請提出・取消
	SubmitExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.SubmitExpenseRequest) (*model.Expense, error)
	CancelExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.CancelExpenseRequest) (*model.Expense, error)

	// 承認フロー
	ApproveExpense(ctx context.Context, id uuid.UUID, approverID uuid.UUID, req *dto.ApproveExpenseRequest) (*model.Expense, error)
	RejectExpense(ctx context.Context, id uuid.UUID, approverID uuid.UUID, req *dto.RejectExpenseRequest) (*model.Expense, error)
	GetPendingApprovals(ctx context.Context, approverID uuid.UUID, filter *dto.ApprovalFilterRequest) (*dto.ApprovalListResponse, error)

	// ファイルアップロード
	GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error)
	CompleteUpload(ctx context.Context, userID uuid.UUID, req *dto.CompleteUploadRequest) (*dto.CompleteUploadResponse, error)
	DeleteUploadedFile(ctx context.Context, userID uuid.UUID, req *dto.DeleteUploadRequest) error

	// 承認催促関連
	GetPendingExpenses(ctx context.Context, threshold time.Duration) ([]model.Expense, error)
	GetCurrentApprover(ctx context.Context, expenseID uuid.UUID) (*uuid.UUID, error)

	// 複数領収書対応
	CreateWithReceipts(ctx context.Context, userID uuid.UUID, req *dto.CreateExpenseWithReceiptsRequest) (*dto.ExpenseWithReceiptsResponse, error)
	UpdateWithReceipts(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateExpenseWithReceiptsRequest) (*dto.ExpenseWithReceiptsResponse, error)
	GetExpenseReceipts(ctx context.Context, expenseID uuid.UUID, userID uuid.UUID) ([]dto.ExpenseReceiptDTO, error)
	DeleteExpenseReceipt(ctx context.Context, expenseID uuid.UUID, receiptID uuid.UUID, userID uuid.UUID) error
	UpdateReceiptOrder(ctx context.Context, expenseID uuid.UUID, userID uuid.UUID, req *dto.UpdateReceiptOrderRequest) error
	GenerateReceiptUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateReceiptUploadURLRequest) (*dto.GenerateReceiptUploadURLResponse, error)

	// CSVエクスポート
	ExportExpensesCSV(ctx context.Context, userID uuid.UUID, filter *dto.ExpenseExportRequest) ([]byte, error)
	ExportExpensesCSVAdmin(ctx context.Context, filter *dto.ExpenseExportRequest) ([]byte, error)

	// 期限管理
	ProcessExpiredExpenses(ctx context.Context) error
	ProcessExpenseReminders(ctx context.Context) error
	GetDeadlineSettings(ctx context.Context) ([]*model.ExpenseDeadlineSetting, error)
	UpdateDeadlineSetting(ctx context.Context, setting *model.ExpenseDeadlineSetting) error
	CreateDeadlineSetting(ctx context.Context, setting *model.ExpenseDeadlineSetting) error
	DeleteDeadlineSetting(ctx context.Context, id uuid.UUID) error
}

// expenseService 経費申請サービスの実装
type expenseService struct {
	db                  *gorm.DB
	expenseRepo         repository.ExpenseRepository
	categoryRepo        repository.ExpenseCategoryRepository
	limitRepo           repository.ExpenseLimitRepository
	approvalRepo        repository.ExpenseApprovalRepository
	receiptRepo         repository.ExpenseReceiptRepository
	deadlineRepo        repository.ExpenseDeadlineSettingRepository
	s3Service           S3Service
	notificationService NotificationService
	userRepo            repository.UserRepository
	cacheManager        *cache.CacheManager
	auditService        AuditLogService
	virusScanService    VirusScanService
	logger              *zap.Logger
}

// NewExpenseService 経費申請サービスのインスタンスを生成
func NewExpenseService(
	db *gorm.DB,
	expenseRepo repository.ExpenseRepository,
	categoryRepo repository.ExpenseCategoryRepository,
	limitRepo repository.ExpenseLimitRepository,
	approvalRepo repository.ExpenseApprovalRepository,
	receiptRepo repository.ExpenseReceiptRepository,
	deadlineRepo repository.ExpenseDeadlineSettingRepository,
	s3Service S3Service,
	notificationService NotificationService,
	userRepo repository.UserRepository,
	cacheManager *cache.CacheManager,
	auditService AuditLogService,
	virusScanService VirusScanService,
	logger *zap.Logger,
) ExpenseService {
	return &expenseService{
		db:                  db,
		expenseRepo:         expenseRepo,
		categoryRepo:        categoryRepo,
		limitRepo:           limitRepo,
		approvalRepo:        approvalRepo,
		receiptRepo:         receiptRepo,
		deadlineRepo:        deadlineRepo,
		s3Service:           s3Service,
		notificationService: notificationService,
		userRepo:            userRepo,
		cacheManager:        cacheManager,
		auditService:        auditService,
		virusScanService:    virusScanService,
		logger:              logger,
	}
}

// ========================================
// 基本CRUD操作
// ========================================

// Create 新しい経費申請を作成
func (s *expenseService) Create(ctx context.Context, userID uuid.UUID, req *dto.CreateExpenseRequest) (*model.Expense, error) {
	// カテゴリの存在確認
	category, err := s.categoryRepo.GetByID(ctx, req.CategoryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, dto.NewExpenseError(dto.ErrCodeCategoryNotFound, "指定されたカテゴリが見つかりません")
		}
		s.logger.Error("Failed to get category", zap.Error(err), zap.String("category_id", req.CategoryID.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "カテゴリの取得に失敗しました")
	}

	// カテゴリが有効かチェック
	if !category.IsAvailable() {
		return nil, dto.NewExpenseError(dto.ErrCodeCategoryInactive, "指定されたカテゴリは利用できません")
	}

	// 期限チェック
	if !utils.IsAllowableForSubmission(req.ExpenseDate, time.Now()) {
		return nil, dto.NewExpenseError(dto.ErrCodeDeadlineExceeded, "申請期限を過ぎているため、この日付の経費は申請できません")
	}

	// 上限チェック
	limitCheck, err := s.CheckLimits(ctx, userID, req.Amount, req.ExpenseDate)
	if err != nil {
		s.logger.Error("Failed to check limits", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "上限チェックに失敗しました")
	}

	if !limitCheck.WithinMonthlyLimit {
		return nil, dto.NewExpenseError(dto.ErrCodeMonthlyLimitExceeded,
			fmt.Sprintf("月次上限を超過します（残り: %d円）", limitCheck.RemainingMonthly))
	}

	if !limitCheck.WithinYearlyLimit {
		return nil, dto.NewExpenseError(dto.ErrCodeYearlyLimitExceeded,
			fmt.Sprintf("年次上限を超過します（残り: %d円）", limitCheck.RemainingYearly))
	}

	// 経費申請を作成
	expense := &model.Expense{
		UserID:      userID,
		Title:       req.Title,
		Category:    model.ExpenseCategory(req.Category),
		CategoryID:  req.CategoryID,
		Amount:      req.Amount,
		ExpenseDate: req.ExpenseDate,
		Description: req.Description,
		ReceiptURL:  req.ReceiptURL,
		Status:      model.ExpenseStatusDraft,
		Version:     1,
	}

	// トランザクション内で作成
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txReceiptRepo := repository.NewExpenseReceiptRepository(tx, s.logger)

		if err := txExpenseRepo.Create(ctx, expense); err != nil {
			return err
		}

		// 複数レシートの保存処理
		if len(req.ReceiptURLs) > 0 {
			receipts := make([]*model.ExpenseReceipt, 0, len(req.ReceiptURLs))
			for i, url := range req.ReceiptURLs {
				receipt := &model.ExpenseReceipt{
					ExpenseID:    expense.ID,
					ReceiptURL:   url,
					S3Key:        fmt.Sprintf("expenses/%s/%s", expense.ID, uuid.New().String()),
					FileName:     fmt.Sprintf("receipt_%d.pdf", i+1),
					FileSize:     0,
					ContentType:  "application/pdf",
					DisplayOrder: i + 1,
				}
				receipts = append(receipts, receipt)
			}
			if err := txReceiptRepo.CreateBatch(ctx, receipts); err != nil {
				s.logger.Error("Failed to create expense receipts",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
				return err
			}
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to create expense",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の作成に失敗しました")
	}

	s.logger.Info("Expense created successfully",
		zap.String("expense_id", expense.ID.String()),
		zap.String("user_id", userID.String()))

	return expense, nil
}

// GetByID 指定されたIDの経費申請を取得
func (s *expenseService) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.ExpenseWithDetails, error) {
	expense, err := s.expenseRepo.GetDetailByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
		}
		s.logger.Error("Failed to get expense by ID",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
	}

	// アクセス権限チェック（本人の申請のみ取得可能）
	if expense.UserID != userID {
		return nil, dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を閲覧する権限がありません")
	}

	return expense, nil
}

// Update 経費申請を更新
func (s *expenseService) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateExpenseRequest) (*model.Expense, error) {
	// 既存の経費申請を取得
	expense, err := s.expenseRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
		}
		s.logger.Error("Failed to get expense for update",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
	}

	// アクセス権限チェック
	if expense.UserID != userID {
		return nil, dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を更新する権限がありません")
	}

	// 編集可能かチェック
	if !expense.CanEdit() {
		return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotEditable, "この経費申請は編集できません")
	}

	// カテゴリが変更される場合は存在確認
	if req.CategoryID != nil && *req.CategoryID != expense.CategoryID {
		category, err := s.categoryRepo.GetByID(ctx, *req.CategoryID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, dto.NewExpenseError(dto.ErrCodeCategoryNotFound, "指定されたカテゴリが見つかりません")
			}
			return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "カテゴリの取得に失敗しました")
		}

		if !category.IsAvailable() {
			return nil, dto.NewExpenseError(dto.ErrCodeCategoryInactive, "指定されたカテゴリは利用できません")
		}
	}

	// 金額または日付が変更される場合は期限・上限チェック
	newAmount := expense.Amount
	if req.Amount != nil {
		newAmount = *req.Amount
	}
	newDate := expense.ExpenseDate
	if req.ExpenseDate != nil {
		newDate = *req.ExpenseDate
		// 日付が変更される場合は期限チェック
		if !utils.IsAllowableForSubmission(newDate, time.Now()) {
			return nil, dto.NewExpenseError(dto.ErrCodeDeadlineExceeded, "申請期限を過ぎているため、この日付の経費は申請できません")
		}
	}

	if req.Amount != nil || req.ExpenseDate != nil {
		// 元の金額を引いてから新しい金額でチェック
		limitCheck, err := s.CheckLimits(ctx, userID, newAmount-expense.Amount, newDate)
		if err != nil {
			return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "上限チェックに失敗しました")
		}

		if !limitCheck.WithinMonthlyLimit {
			return nil, dto.NewExpenseError(dto.ErrCodeMonthlyLimitExceeded,
				fmt.Sprintf("月次上限を超過します（残り: %d円）", limitCheck.RemainingMonthly))
		}

		if !limitCheck.WithinYearlyLimit {
			return nil, dto.NewExpenseError(dto.ErrCodeYearlyLimitExceeded,
				fmt.Sprintf("年次上限を超過します（残り: %d円）", limitCheck.RemainingYearly))
		}
	}

	// 更新処理
	if req.CategoryID != nil {
		expense.CategoryID = *req.CategoryID
	}
	if req.Amount != nil {
		expense.Amount = *req.Amount
	}
	if req.ExpenseDate != nil {
		expense.ExpenseDate = *req.ExpenseDate
	}
	if req.Description != nil {
		expense.Description = *req.Description
	}
	// 複数レシートの更新は別途expense_receiptsテーブルで管理

	// バージョンチェック（楽観的ロック）
	if req.Version != expense.Version {
		return nil, dto.NewExpenseError(dto.ErrCodeVersionMismatch, "他のユーザーによって更新されています。最新のデータを取得してください")
	}
	expense.Version++

	// トランザクション内で更新
	err = s.db.Transaction(func(tx *gorm.DB) error {
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		return txExpenseRepo.Update(ctx, expense)
	})

	if err != nil {
		s.logger.Error("Failed to update expense",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の更新に失敗しました")
	}

	s.logger.Info("Expense updated successfully",
		zap.String("expense_id", expense.ID.String()),
		zap.String("user_id", userID.String()))

	return expense, nil
}

// Delete 経費申請を削除
func (s *expenseService) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// 既存の経費申請を取得
	expense, err := s.expenseRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
		}
		s.logger.Error("Failed to get expense for delete",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
	}

	// アクセス権限チェック
	if expense.UserID != userID {
		return dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を削除する権限がありません")
	}

	// 削除可能かチェック
	if !expense.CanEdit() {
		return dto.NewExpenseError(dto.ErrCodeExpenseNotDeletable, "この経費申請は削除できません")
	}

	// トランザクション内で削除
	err = s.db.Transaction(func(tx *gorm.DB) error {
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		return txExpenseRepo.Delete(ctx, id)
	})

	if err != nil {
		s.logger.Error("Failed to delete expense",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の削除に失敗しました")
	}

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := id.String()
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       userID,
			Action:       model.AuditActionExpenseDelete,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceIDStr,
			Method:       "DELETE",
			Path:         fmt.Sprintf("/api/v1/expenses/%s", id.String()),
			StatusCode:   200,
		}); err != nil {
			s.logger.Error("Failed to log audit for expense deletion",
				zap.Error(err),
				zap.String("expense_id", id.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("Expense deleted successfully",
		zap.String("expense_id", id.String()),
		zap.String("user_id", userID.String()))

	return nil
}

// ========================================
// 一覧取得
// ========================================

// List ユーザーの経費申請一覧を取得
func (s *expenseService) List(ctx context.Context, userID uuid.UUID, filter *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error) {
	// ユーザーIDをフィルターに設定
	filter.UserID = &userID

	expenses, total, err := s.expenseRepo.List(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to list expenses",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請一覧の取得に失敗しました")
	}

	// レスポンス作成
	response := &dto.ExpenseListResponse{
		Items:      make([]dto.ExpenseResponse, len(expenses)),
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: int((total + int64(filter.Limit) - 1) / int64(filter.Limit)),
	}

	for i, expense := range expenses {
		response.Items[i] = dto.ExpenseToResponse(&expense)
	}

	return response, nil
}

// ListAll 全ユーザーの経費申請一覧を取得（管理者用）
func (s *expenseService) ListAll(ctx context.Context, filter *dto.ExpenseFilterRequest) (*dto.ExpenseListResponse, error) {
	expenses, total, err := s.expenseRepo.List(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to list all expenses", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請一覧の取得に失敗しました")
	}

	// レスポンス作成
	response := &dto.ExpenseListResponse{
		Items:      make([]dto.ExpenseResponse, len(expenses)),
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: int((total + int64(filter.Limit) - 1) / int64(filter.Limit)),
	}

	for i, expense := range expenses {
		response.Items[i] = dto.ExpenseToResponse(&expense)
	}

	return response, nil
}

// ========================================
// カテゴリ管理
// ========================================

// GetCategories 全カテゴリを取得
func (s *expenseService) GetCategories(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	// キャッシュが有効な場合はキャッシュから取得を試みる
	if s.cacheManager != nil {
		// DTOに変換してキャッシュから取得
		cachedCategories, err := s.cacheManager.Category().GetCategoryList(ctx)
		if err == nil && cachedCategories != nil {
			// DTOからモデルに変換
			categories := make([]model.ExpenseCategoryMaster, len(cachedCategories))
			for i, dto := range cachedCategories {
				categories[i] = model.ExpenseCategoryMaster{
					ID:              dto.ID,
					Name:            dto.Name,
					Code:            dto.Code,
					RequiresDetails: dto.RequiresDetails,
					IsActive:        dto.IsActive,
					DisplayOrder:    dto.DisplayOrder,
				}
			}
			s.logger.Debug("Categories loaded from cache")
			return categories, nil
		}
	}

	// キャッシュがない場合はデータベースから取得
	categories, err := s.categoryRepo.GetAll(ctx)
	if err != nil {
		s.logger.Error("Failed to get categories", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "カテゴリ一覧の取得に失敗しました")
	}

	// キャッシュに保存
	if s.cacheManager != nil && len(categories) > 0 {
		categoryDTOs := make([]*dto.ExpenseCategoryResponse, len(categories))
		for i, cat := range categories {
			categoryDTOs[i] = &dto.ExpenseCategoryResponse{
				ID:              cat.ID,
				Name:            cat.Name,
				Code:            cat.Code,
				RequiresDetails: cat.RequiresDetails,
				IsActive:        cat.IsActive,
				DisplayOrder:    cat.DisplayOrder,
			}
		}
		if err := s.cacheManager.Category().SetCategoryList(ctx, categoryDTOs); err != nil {
			s.logger.Warn("Failed to cache categories", zap.Error(err))
		}
	}

	return categories, nil
}

// GetActiveCategories 有効なカテゴリのみを取得
func (s *expenseService) GetActiveCategories(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
	// キャッシュが有効な場合はキャッシュから取得を試みる
	if s.cacheManager != nil {
		cachedCategories, err := s.cacheManager.Category().GetActiveCategories(ctx)
		if err == nil && cachedCategories != nil {
			// DTOからモデルに変換
			categories := make([]model.ExpenseCategoryMaster, len(cachedCategories))
			for i, dto := range cachedCategories {
				categories[i] = model.ExpenseCategoryMaster{
					ID:              dto.ID,
					Name:            dto.Name,
					Code:            dto.Code,
					RequiresDetails: dto.RequiresDetails,
					IsActive:        dto.IsActive,
					DisplayOrder:    dto.DisplayOrder,
				}
			}
			s.logger.Debug("Active categories loaded from cache")
			return categories, nil
		}
	}

	// キャッシュがない場合はデータベースから取得
	categories, err := s.categoryRepo.GetActiveOrderByDisplayOrder(ctx)
	if err != nil {
		s.logger.Error("Failed to get active categories", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "カテゴリ一覧の取得に失敗しました")
	}

	// キャッシュに保存
	if s.cacheManager != nil && len(categories) > 0 {
		categoryDTOs := make([]*dto.ExpenseCategoryResponse, len(categories))
		for i, cat := range categories {
			categoryDTOs[i] = &dto.ExpenseCategoryResponse{
				ID:              cat.ID,
				Name:            cat.Name,
				Code:            cat.Code,
				RequiresDetails: cat.RequiresDetails,
				IsActive:        cat.IsActive,
				DisplayOrder:    cat.DisplayOrder,
			}
		}
		if err := s.cacheManager.Category().SetActiveCategories(ctx, categoryDTOs); err != nil {
			s.logger.Warn("Failed to cache active categories", zap.Error(err))
		}
	}

	return categories, nil
}

// ========================================
// 集計
// ========================================

// GetMonthlySummary 月次集計を取得
func (s *expenseService) GetMonthlySummary(ctx context.Context, userID uuid.UUID, year int, month int) (*dto.ExpenseSummaryResponse, error) {
	summary, err := s.expenseRepo.GetMonthlySummary(ctx, userID, year, month)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// サマリーが存在しない場合は0で返す
			summary = &model.ExpenseSummary{
				UserID:      userID,
				Year:        year,
				Month:       month,
				TotalAmount: 0,
			}
		} else {
			s.logger.Error("Failed to get monthly summary",
				zap.Error(err),
				zap.String("user_id", userID.String()),
				zap.Int("year", year),
				zap.Int("month", month))
			return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "月次集計の取得に失敗しました")
		}
	}

	// 月次上限を取得
	monthlyLimit, err := s.limitRepo.GetCurrentMonthlyLimit(ctx)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		s.logger.Warn("Failed to get monthly limit", zap.Error(err))
	}

	monthlyLimitAmount := 0
	if monthlyLimit != nil {
		monthlyLimitAmount = monthlyLimit.Amount
	}

	// レスポンスを作成
	remaining := monthlyLimitAmount - summary.TotalAmount
	if remaining < 0 {
		remaining = 0
	}
	usageRate := 0.0
	if monthlyLimitAmount > 0 {
		usageRate = float64(summary.TotalAmount) / float64(monthlyLimitAmount) * 100
	}

	response := &dto.ExpenseSummaryResponse{
		Monthly: dto.ExpensePeriodSummary{
			Period:         fmt.Sprintf("%d-%02d", year, month),
			TotalAmount:    summary.TotalAmount,
			ApprovedAmount: summary.ApprovedAmount,
			PendingAmount:  summary.PendingAmount,
			RejectedAmount: summary.TotalAmount - summary.ApprovedAmount - summary.PendingAmount,
			Limit:          monthlyLimitAmount,
			Remaining:      remaining,
			UsageRate:      usageRate,
		},
	}

	return response, nil
}

// GetYearlySummary 年次集計を取得
func (s *expenseService) GetYearlySummary(ctx context.Context, userID uuid.UUID, year int) (*dto.ExpenseYearlySummaryResponse, error) {
	// 月別内訳を取得
	monthlyBreakdown := make([]dto.MonthlyBreakdown, 0, 12)
	totalAmount := 0
	totalCount := 0

	for month := 1; month <= 12; month++ {
		monthlySummary, err := s.expenseRepo.GetMonthlySummary(ctx, userID, year, month)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warn("Failed to get monthly breakdown",
				zap.Error(err),
				zap.Int("month", month))
			continue
		}

		if monthlySummary != nil {
			monthlyBreakdown = append(monthlyBreakdown, dto.MonthlyBreakdown{
				Month:  month,
				Amount: monthlySummary.TotalAmount,
				Count:  monthlySummary.ExpenseCount,
			})
			totalAmount += monthlySummary.TotalAmount
			totalCount += monthlySummary.ExpenseCount
		}
	}

	// 年次集計レスポンスを作成
	response := &dto.ExpenseYearlySummaryResponse{
		UserID:           userID,
		Year:             year,
		IsFiscalYear:     false, // カレンダー年度
		TotalAmount:      totalAmount,
		TotalCount:       totalCount,
		MonthlyBreakdown: monthlyBreakdown,
	}

	return response, nil
}

// GetFiscalYearSummary 会計年度集計を取得（4月〜翌年3月）
func (s *expenseService) GetFiscalYearSummary(ctx context.Context, userID uuid.UUID, fiscalYear int) (*dto.ExpenseYearlySummaryResponse, error) {
	// 会計年度の月別内訳を取得（4月〜翌年3月）
	monthlyBreakdown := make([]dto.MonthlyBreakdown, 0, 12)
	totalAmount := 0
	totalCount := 0

	// 4月〜12月（当年）
	for month := 4; month <= 12; month++ {
		monthlySummary, err := s.expenseRepo.GetMonthlySummary(ctx, userID, fiscalYear, month)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warn("Failed to get monthly breakdown",
				zap.Error(err),
				zap.Int("fiscal_year", fiscalYear),
				zap.Int("month", month))
			continue
		}

		if monthlySummary != nil {
			monthlyBreakdown = append(monthlyBreakdown, dto.MonthlyBreakdown{
				Month:  month,
				Amount: monthlySummary.TotalAmount,
				Count:  monthlySummary.ExpenseCount,
			})
			totalAmount += monthlySummary.TotalAmount
			totalCount += monthlySummary.ExpenseCount
		}
	}

	// 1月〜3月（翌年）
	for month := 1; month <= 3; month++ {
		monthlySummary, err := s.expenseRepo.GetMonthlySummary(ctx, userID, fiscalYear+1, month)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warn("Failed to get monthly breakdown",
				zap.Error(err),
				zap.Int("fiscal_year", fiscalYear+1),
				zap.Int("month", month))
			continue
		}

		if monthlySummary != nil {
			monthlyBreakdown = append(monthlyBreakdown, dto.MonthlyBreakdown{
				Month:  month,
				Amount: monthlySummary.TotalAmount,
				Count:  monthlySummary.ExpenseCount,
			})
			totalAmount += monthlySummary.TotalAmount
			totalCount += monthlySummary.ExpenseCount
		}
	}

	// 年次集計レスポンスを作成
	response := &dto.ExpenseYearlySummaryResponse{
		UserID:           userID,
		Year:             fiscalYear,
		IsFiscalYear:     true, // 会計年度であることを示すフラグ
		TotalAmount:      totalAmount,
		TotalCount:       totalCount,
		MonthlyBreakdown: monthlyBreakdown,
	}

	return response, nil
}

// ========================================
// 上限管理
// ========================================

// GetCurrentLimits 現在の上限設定を取得
func (s *expenseService) GetCurrentLimits(ctx context.Context) (*dto.ExpenseLimitResponse, error) {
	monthlyLimit, err := s.limitRepo.GetCurrentMonthlyLimit(ctx)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		s.logger.Error("Failed to get monthly limit", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "月次上限の取得に失敗しました")
	}

	yearlyLimit, err := s.limitRepo.GetCurrentYearlyLimit(ctx)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		s.logger.Error("Failed to get yearly limit", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "年次上限の取得に失敗しました")
	}

	response := &dto.ExpenseLimitResponse{
		MonthlyLimit: 0,
		YearlyLimit:  0,
	}

	if monthlyLimit != nil {
		response.MonthlyLimit = monthlyLimit.Amount
	}
	if yearlyLimit != nil {
		response.YearlyLimit = yearlyLimit.Amount
	}

	return response, nil
}

// CheckLimits 上限チェック
func (s *expenseService) CheckLimits(ctx context.Context, userID uuid.UUID, amount int, expenseDate time.Time) (*dto.LimitCheckResult, error) {
	// 月次上限チェック
	withinMonthly, remainingMonthly, err := s.limitRepo.CheckMonthlyLimit(ctx, userID, amount, expenseDate)
	if err != nil {
		s.logger.Error("Failed to check monthly limit",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	// 年次上限チェック
	withinYearly, remainingYearly, err := s.limitRepo.CheckYearlyLimit(ctx, userID, amount, expenseDate.Year())
	if err != nil {
		s.logger.Error("Failed to check yearly limit",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	return &dto.LimitCheckResult{
		WithinMonthlyLimit: withinMonthly,
		WithinYearlyLimit:  withinYearly,
		RemainingMonthly:   remainingMonthly,
		RemainingYearly:    remainingYearly,
	}, nil
}

// ========================================
// 申請提出・取消
// ========================================

// SubmitExpense 経費申請を提出
func (s *expenseService) SubmitExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.SubmitExpenseRequest) (*model.Expense, error) {
	// 既存の経費申請を取得
	expense, err := s.expenseRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
		}
		s.logger.Error("Failed to get expense for submit",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
	}

	// アクセス権限チェック
	if expense.UserID != userID {
		return nil, dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を提出する権限がありません")
	}

	// 提出可能かチェック
	if !expense.CanSubmit() {
		return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotSubmittable, "この経費申請は提出できません。ステータス: "+string(expense.Status))
	}

	// 領収書が添付されているかチェック
	receipts, err := s.receiptRepo.GetByExpenseID(ctx, expense.ID)
	if err != nil {
		s.logger.Error("Failed to get expense receipts", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
	}
	if len(receipts) == 0 && expense.ReceiptURL == "" {
		return nil, dto.NewExpenseError(dto.ErrCodeReceiptRequired, "領収書の添付が必要です")
	}

	// 最終的な上限チェック
	limitCheck, err := s.CheckLimits(ctx, userID, expense.Amount, expense.ExpenseDate)
	if err != nil {
		s.logger.Error("Failed to check limits on submit", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "上限チェックに失敗しました")
	}

	if !limitCheck.WithinMonthlyLimit {
		return nil, dto.NewExpenseError(dto.ErrCodeMonthlyLimitExceeded,
			fmt.Sprintf("月次上限を超過します（残り: %d円）", limitCheck.RemainingMonthly))
	}

	if !limitCheck.WithinYearlyLimit {
		return nil, dto.NewExpenseError(dto.ErrCodeYearlyLimitExceeded,
			fmt.Sprintf("年次上限を超過します（残り: %d円）", limitCheck.RemainingYearly))
	}

	// トランザクション内で処理
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txApprovalRepo := repository.NewExpenseApprovalRepository(tx, s.logger)
		txApproverSettingRepo := repository.NewExpenseApproverSettingRepository(tx, s.logger)

		// ステータスを「申請中」に更新
		expense.Status = model.ExpenseStatusSubmitted
		expense.Version++

		// 期限を設定
		// ユーザーの有効な期限設定を取得
		user, err := s.userRepo.GetByID(ctx, userID)
		if err != nil {
			return fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
		}

		var departmentID *uuid.UUID
		if user.DepartmentID != nil {
			departmentID = user.DepartmentID
		}

		deadlineSetting, err := s.deadlineRepo.GetEffectiveSetting(ctx, userID, departmentID)
		if err != nil {
			s.logger.Warn("Failed to get deadline setting, using default",
				zap.Error(err),
				zap.String("user_id", userID.String()))
			// エラーの場合はデフォルト値を使用
			deadlineSetting = &model.ExpenseDeadlineSetting{
				DefaultDeadlineDays: 30,
			}
		}

		// 期限を計算して設定
		deadline := deadlineSetting.CalculateDeadline(time.Now())
		expense.SetDeadline(deadline)

		// 経費申請を更新
		if err := txExpenseRepo.Update(ctx, expense); err != nil {
			return fmt.Errorf("経費申請の更新に失敗しました: %w", err)
		}

		// 承認フローを作成
		s.logger.Info("Creating approval flow",
			zap.String("expense_id", expense.ID.String()),
			zap.Int("amount", expense.Amount))
		
		if err := txApprovalRepo.CreateApprovalFlow(ctx, expense.ID, expense.Amount, txApproverSettingRepo); err != nil {
			s.logger.Error("CreateApprovalFlow failed",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
			
			// 承認者未設定エラーの場合は、ユーザーフレンドリーなメッセージをそのまま返す
			var expenseErr *dto.ExpenseError
			if errors.As(err, &expenseErr) && expenseErr.Code == dto.ErrCodeNoApproversConfigured {
				return err
			}
			return fmt.Errorf("承認フローの作成に失敗しました: %w", err)
		}

		// 月次集計を更新
		if err := s.updateMonthlySummary(ctx, tx, expense.UserID, expense.ExpenseDate, expense.Amount, "submit"); err != nil {
			s.logger.Warn("Failed to update monthly summary",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
			// エラーでもトランザクションは継続（集計は非クリティカル）
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to submit expense",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		// 承認者未設定エラーの場合は、そのエラーをそのまま返す
		var expenseErr *dto.ExpenseError
		if errors.As(err, &expenseErr) {
			return nil, err
		}
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の提出に失敗しました")
	}

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := id.String()
		additionalInfo := map[string]interface{}{
			"amount":      expense.Amount,
			"status":      expense.Status,
			"category_id": expense.CategoryID,
		}
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       userID,
			Action:       model.AuditActionExpenseSubmit,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceIDStr,
			Method:       "POST",
			Path:         fmt.Sprintf("/api/v1/expenses/%s/submit", id.String()),
			StatusCode:   200,
			RequestBody:  additionalInfo,
		}); err != nil {
			s.logger.Error("Failed to log audit for expense submission",
				zap.Error(err),
				zap.String("expense_id", id.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("Expense submitted successfully",
		zap.String("expense_id", expense.ID.String()),
		zap.String("user_id", userID.String()))

	// 承認者を取得して通知を送信
	pendingApprovals, err := s.approvalRepo.GetPendingApprovals(ctx, expense.ID)
	if err != nil {
		s.logger.Error("Failed to get pending approvals for notification",
			zap.Error(err),
			zap.String("expense_id", expense.ID.String()))
		// 通知エラーは無視して続行
	} else {
		approverIDs := make([]uuid.UUID, 0, len(pendingApprovals))
		for _, approval := range pendingApprovals {
			if approval.ApproverID != uuid.Nil {
				approverIDs = append(approverIDs, approval.ApproverID)
			}
		}

		// 承認者に通知を送信
		if len(approverIDs) > 0 {
			// ユーザー情報を含む経費申請を取得
			expenseWithDetails, err := s.expenseRepo.GetByIDWithDetails(ctx, expense.ID)
			if err != nil {
				s.logger.Error("Failed to get expense details for notification",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			} else {
				if err := s.notificationService.NotifyExpenseSubmitted(ctx, &expenseWithDetails.Expense, approverIDs); err != nil {
					s.logger.Error("Failed to send expense submitted notification",
						zap.Error(err),
						zap.String("expense_id", expense.ID.String()))
					// 通知エラーは無視して続行
				}
			}
		}
	}

	// 上限警告通知の送信（残額が少ない場合）
	// 月次上限の警告（残額が20%以下の場合）
	currentLimits, err := s.GetCurrentLimits(ctx)
	if err == nil && currentLimits.MonthlyLimit > 0 {
		monthlyUsed := currentLimits.MonthlyLimit - limitCheck.RemainingMonthly
		monthlyUsageRate := float64(monthlyUsed) / float64(currentLimits.MonthlyLimit) * 100
		if monthlyUsageRate >= 80 {
			if err := s.notificationService.NotifyExpenseLimitWarning(ctx, userID, "monthly", monthlyUsageRate); err != nil {
				s.logger.Error("Failed to send monthly limit warning notification",
					zap.Error(err),
					zap.String("user_id", userID.String()))
			}
		}
	}

	// 年次上限の警告（残額が20%以下の場合）
	if err == nil && currentLimits.YearlyLimit > 0 {
		yearlyUsed := currentLimits.YearlyLimit - limitCheck.RemainingYearly
		yearlyUsageRate := float64(yearlyUsed) / float64(currentLimits.YearlyLimit) * 100
		if yearlyUsageRate >= 80 {
			if err := s.notificationService.NotifyExpenseLimitWarning(ctx, userID, "yearly", yearlyUsageRate); err != nil {
				s.logger.Error("Failed to send yearly limit warning notification",
					zap.Error(err),
					zap.String("user_id", userID.String()))
			}
		}
	}

	// メトリクスを記録
	metrics.RecordExpenseSubmission("submitted", string(expense.Category), float64(expense.Amount))
	metrics.ExpenseProcessingTime.WithLabelValues("submit").Observe(time.Since(time.Now()).Seconds())

	return expense, nil
}

// CancelExpense 経費申請を取消
func (s *expenseService) CancelExpense(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.CancelExpenseRequest) (*model.Expense, error) {
	// 既存の経費申請を取得
	expense, err := s.expenseRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
		}
		s.logger.Error("Failed to get expense for cancel",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
	}

	// アクセス権限チェック
	if expense.UserID != userID {
		return nil, dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を取消する権限がありません")
	}

	// 取消可能かチェック
	if !expense.CanCancel() {
		return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotCancelable, "この経費申請は取消できません。ステータス: "+string(expense.Status))
	}

	// トランザクション内で処理
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txApprovalRepo := repository.NewExpenseApprovalRepository(tx, s.logger)

		// 承認履歴を取得
		approvals, err := txApprovalRepo.GetByExpenseID(ctx, expense.ID)
		if err != nil {
			return fmt.Errorf("承認履歴の取得に失敗しました: %w", err)
		}

		// 承認済みがあるかチェック
		for _, approval := range approvals {
			if approval.Status == model.ApprovalStatusApproved {
				return fmt.Errorf("既に承認されているため取消できません")
			}
		}

		// ステータスを「下書き」に戻す
		expense.Status = model.ExpenseStatusDraft
		expense.Version++

		// 経費申請を更新
		if err := txExpenseRepo.Update(ctx, expense); err != nil {
			return fmt.Errorf("経費申請の更新に失敗しました: %w", err)
		}

		// 承認履歴を削除（物理削除）
		for _, approval := range approvals {
			if err := txApprovalRepo.Delete(ctx, approval.ID); err != nil {
				s.logger.Warn("Failed to delete approval",
					zap.Error(err),
					zap.String("approval_id", approval.ID.String()))
			}
		}

		// 月次集計を更新
		if err := s.updateMonthlySummary(ctx, tx, expense.UserID, expense.ExpenseDate, -expense.Amount, "cancel"); err != nil {
			s.logger.Warn("Failed to update monthly summary",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
			// エラーでもトランザクションは継続（集計は非クリティカル）
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to cancel expense",
			zap.Error(err),
			zap.String("expense_id", id.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取消に失敗しました: "+err.Error())
	}

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := id.String()
		additionalInfo := map[string]interface{}{
			"reason": req.Reason,
			"amount": expense.Amount,
			"status": expense.Status,
		}
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       userID,
			Action:       model.AuditActionExpenseCancel,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceIDStr,
			Method:       "POST",
			Path:         fmt.Sprintf("/api/v1/expenses/%s/cancel", id.String()),
			StatusCode:   200,
			RequestBody:  additionalInfo,
		}); err != nil {
			s.logger.Error("Failed to log audit for expense cancellation",
				zap.Error(err),
				zap.String("expense_id", id.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("Expense cancelled successfully",
		zap.String("expense_id", expense.ID.String()),
		zap.String("user_id", userID.String()),
		zap.String("reason", req.Reason))

	// TODO: 通知処理（承認者への取消通知）

	return expense, nil
}

// updateMonthlySummary 月次集計を更新（内部ヘルパー関数）
func (s *expenseService) updateMonthlySummary(ctx context.Context, tx *gorm.DB, userID uuid.UUID, expenseDate time.Time, amountDelta int, action string) error {
	// 対象月を特定
	year := expenseDate.Year()
	month := int(expenseDate.Month())

	// 集計リポジトリを作成
	summaryRepo := repository.NewExpenseRepository(tx, s.logger)

	// 既存の集計を取得または新規作成
	summary, err := summaryRepo.GetMonthlySummary(ctx, userID, year, month)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 新規作成
			summary = &model.ExpenseSummary{
				UserID:      userID,
				Year:        year,
				Month:       month,
				TotalAmount: 0,
			}
		} else {
			return err
		}
	}

	// 金額を更新
	switch action {
	case "submit":
		summary.PendingAmount += amountDelta
		summary.TotalAmount += amountDelta
		summary.ExpenseCount++
	case "cancel":
		summary.PendingAmount += amountDelta // マイナス値
		summary.TotalAmount += amountDelta   // マイナス値
		if summary.ExpenseCount > 0 {
			summary.ExpenseCount--
		}
	case "approve":
		summary.PendingAmount -= amountDelta
		summary.ApprovedAmount += amountDelta
	case "reject":
		summary.PendingAmount -= amountDelta
		summary.TotalAmount -= amountDelta
		if summary.ExpenseCount > 0 {
			summary.ExpenseCount--
		}
	}

	// 保存
	if summary.ID == uuid.Nil {
		// 新規作成
		if err := tx.Create(summary).Error; err != nil {
			return err
		}
	} else {
		// 更新
		if err := tx.Save(summary).Error; err != nil {
			return err
		}
	}

	return nil
}

// ========================================
// 承認フロー
// ========================================

// ApproveExpense 経費申請を承認
func (s *expenseService) ApproveExpense(ctx context.Context, id uuid.UUID, approverID uuid.UUID, req *dto.ApproveExpenseRequest) (*model.Expense, error) {
	// トランザクション内で処理
	var expense *model.Expense
	var isFullyApproved bool
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txApprovalRepo := repository.NewExpenseApprovalRepository(tx, s.logger)

		// 経費申請を取得（排他ロック）
		var err error
		expense, err = txExpenseRepo.GetByIDForUpdate(ctx, id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
			}
			return fmt.Errorf("経費申請の取得に失敗しました: %w", err)
		}

		// バージョンチェック（楽観的ロック）
		if req.Version != expense.Version {
			return dto.NewExpenseError(dto.ErrCodeVersionMismatch, "他のユーザーによって更新されています。最新のデータを取得してください")
		}

		// ステータスチェック
		if expense.Status != model.ExpenseStatusSubmitted {
			return dto.NewExpenseError(dto.ErrCodeExpenseNotApprovable, "この経費申請は承認できません。ステータス: "+string(expense.Status))
		}

		// 承認者の承認履歴を取得
		approvals, err := txApprovalRepo.GetByExpenseID(ctx, expense.ID)
		if err != nil {
			return fmt.Errorf("承認履歴の取得に失敗しました: %w", err)
		}

		// 承認者が承認権限を持っているかチェック
		var targetApproval *model.ExpenseApproval
		for i := range approvals {
			if approvals[i].ApproverID == approverID && approvals[i].Status == model.ApprovalStatusPending {
				targetApproval = &approvals[i]
				break
			}
		}

		if targetApproval == nil {
			return dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を承認する権限がありません")
		}

		// 前の承認が完了しているかチェック（順序承認の場合）
		for _, approval := range approvals {
			if approval.ApprovalOrder < targetApproval.ApprovalOrder && approval.Status == model.ApprovalStatusPending {
				return dto.NewExpenseError(dto.ErrCodeApprovalOrderViolation, "前の承認が完了していません")
			}
		}

		// 承認処理
		targetApproval.Approve(req.Comment)
		if err := txApprovalRepo.UpdateApprovalStatus(ctx, targetApproval.ID, targetApproval.Status, req.Comment, approverID); err != nil {
			return fmt.Errorf("承認ステータスの更新に失敗しました: %w", err)
		}

		// 全ての承認が完了したかチェック
		allApproved := true
		for _, approval := range approvals {
			if approval.ID != targetApproval.ID && approval.Status == model.ApprovalStatusPending {
				allApproved = false
				break
			}
		}

		// 全承認完了の場合は経費申請のステータスを更新
		if allApproved {
			expense.Status = model.ExpenseStatusApproved
			expense.ApproverID = &approverID
			now := time.Now()
			expense.ApprovedAt = &now
			expense.Version++

			if err := txExpenseRepo.Update(ctx, expense); err != nil {
				return fmt.Errorf("経費申請の更新に失敗しました: %w", err)
			}

			// 月次集計を更新（承認済み金額に移動）
			if err := s.updateMonthlySummary(ctx, tx, expense.UserID, expense.ExpenseDate, expense.Amount, "approve"); err != nil {
				s.logger.Warn("Failed to update monthly summary",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			}

			// フラグを設定
			isFullyApproved = true
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to approve expense",
			zap.Error(err),
			zap.String("expense_id", id.String()),
			zap.String("approver_id", approverID.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の承認に失敗しました")
	}

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := id.String()
		additionalInfo := map[string]interface{}{
			"comment": req.Comment,
			"amount":  expense.Amount,
			"status":  expense.Status,
		}
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       approverID,
			Action:       model.AuditActionExpenseApprove,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceIDStr,
			Method:       "PUT",
			Path:         fmt.Sprintf("/api/v1/admin/expenses/%s/approve", id.String()),
			StatusCode:   200,
			RequestBody:  additionalInfo,
		}); err != nil {
			s.logger.Error("Failed to log audit for expense approval",
				zap.Error(err),
				zap.String("expense_id", id.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("Expense approved successfully",
		zap.String("expense_id", expense.ID.String()),
		zap.String("approver_id", approverID.String()))

	// 承認者の情報を取得
	approver, err := s.userRepo.GetByID(ctx, approverID)
	if err != nil {
		s.logger.Error("Failed to get approver for notification",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		// 通知エラーは無視して続行
	} else {
		// ユーザー情報を含む経費申請を取得
		expenseWithDetails, err := s.expenseRepo.GetByIDWithDetails(ctx, expense.ID)
		if err != nil {
			s.logger.Error("Failed to get expense details for notification",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
		} else {
			// 申請者に承認通知を送信
			isFullyApproved := expense.Status == model.ExpenseStatusApproved
			if err := s.notificationService.NotifyExpenseApproved(ctx, &expenseWithDetails.Expense, approver.Name, isFullyApproved); err != nil {
				s.logger.Error("Failed to send expense approved notification",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			}

			// 次の承認者に通知を送信（全承認完了でない場合）
			if !isFullyApproved {
				pendingApprovals, err := s.approvalRepo.GetPendingApprovals(ctx, expense.ID)
				if err != nil {
					s.logger.Error("Failed to get pending approvals for notification",
						zap.Error(err),
						zap.String("expense_id", expense.ID.String()))
				} else if len(pendingApprovals) > 0 {
					nextApproverIDs := make([]uuid.UUID, 0, len(pendingApprovals))
					for _, approval := range pendingApprovals {
						if approval.ApproverID != uuid.Nil {
							nextApproverIDs = append(nextApproverIDs, approval.ApproverID)
						}
					}

					if len(nextApproverIDs) > 0 {
						if err := s.notificationService.NotifyExpenseSubmitted(ctx, &expenseWithDetails.Expense, nextApproverIDs); err != nil {
							s.logger.Error("Failed to send notification to next approver",
								zap.Error(err),
								zap.String("expense_id", expense.ID.String()))
						}
					}
				}
			}
		}
	}

	// メトリクスを記録
	if isFullyApproved {
		metrics.RecordExpenseSubmission("approved", string(expense.Category), float64(expense.Amount))
		// 承認までの時間を記録（提出時刻から計算）
		approvalDuration := time.Since(expense.UpdatedAt).Seconds()
		metrics.ExpenseApprovalDuration.WithLabelValues("final", string(expense.Category)).Observe(approvalDuration)
	}
	metrics.ExpenseProcessingTime.WithLabelValues("approve").Observe(time.Since(time.Now()).Seconds())

	return expense, nil
}

// RejectExpense 経費申請を却下
func (s *expenseService) RejectExpense(ctx context.Context, id uuid.UUID, approverID uuid.UUID, req *dto.RejectExpenseRequest) (*model.Expense, error) {
	// トランザクション内で処理
	var expense *model.Expense
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// リポジトリをトランザクション用に作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txApprovalRepo := repository.NewExpenseApprovalRepository(tx, s.logger)

		// 経費申請を取得（排他ロック）
		var err error
		expense, err = txExpenseRepo.GetByIDForUpdate(ctx, id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
			}
			return fmt.Errorf("経費申請の取得に失敗しました: %w", err)
		}

		// バージョンチェック（楽観的ロック）
		if req.Version != expense.Version {
			return dto.NewExpenseError(dto.ErrCodeVersionMismatch, "他のユーザーによって更新されています。最新のデータを取得してください")
		}

		// ステータスチェック
		if expense.Status != model.ExpenseStatusSubmitted {
			return dto.NewExpenseError(dto.ErrCodeExpenseNotRejectable, "この経費申請は却下できません。ステータス: "+string(expense.Status))
		}

		// 承認者の承認履歴を取得
		approvals, err := txApprovalRepo.GetByExpenseID(ctx, expense.ID)
		if err != nil {
			return fmt.Errorf("承認履歴の取得に失敗しました: %w", err)
		}

		// 承認者が却下権限を持っているかチェック
		var targetApproval *model.ExpenseApproval
		for i := range approvals {
			if approvals[i].ApproverID == approverID && approvals[i].Status == model.ApprovalStatusPending {
				targetApproval = &approvals[i]
				break
			}
		}

		if targetApproval == nil {
			return dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を却下する権限がありません")
		}

		// 却下処理
		targetApproval.Reject(req.Comment)
		if err := txApprovalRepo.UpdateApprovalStatus(ctx, targetApproval.ID, targetApproval.Status, req.Comment, approverID); err != nil {
			return fmt.Errorf("承認ステータスの更新に失敗しました: %w", err)
		}

		// 経費申請のステータスを却下に更新
		expense.Status = model.ExpenseStatusRejected
		expense.ApproverID = &approverID
		now := time.Now()
		expense.ApprovedAt = &now
		expense.Version++

		if err := txExpenseRepo.Update(ctx, expense); err != nil {
			return fmt.Errorf("経費申請の更新に失敗しました: %w", err)
		}

		// 月次集計を更新（申請額を減算）
		if err := s.updateMonthlySummary(ctx, tx, expense.UserID, expense.ExpenseDate, expense.Amount, "reject"); err != nil {
			s.logger.Warn("Failed to update monthly summary",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
		}

		// 他の承認履歴も却下扱いにする
		for i := range approvals {
			if approvals[i].ID != targetApproval.ID && approvals[i].Status == model.ApprovalStatusPending {
				approvals[i].Status = model.ApprovalStatusRejected
				if err := txApprovalRepo.UpdateApprovalStatus(ctx, approvals[i].ID, approvals[i].Status, "他の承認者により却下", approvals[i].ApproverID); err != nil {
					s.logger.Warn("Failed to update other approval status",
						zap.Error(err),
						zap.String("approval_id", approvals[i].ID.String()))
				}
			}
		}

		return nil
	})

	if err != nil {
		s.logger.Error("Failed to reject expense",
			zap.Error(err),
			zap.String("expense_id", id.String()),
			zap.String("approver_id", approverID.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の却下に失敗しました")
	}

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := id.String()
		additionalInfo := map[string]interface{}{
			"comment": req.Comment,
			"amount":  expense.Amount,
			"status":  expense.Status,
		}
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       approverID,
			Action:       model.AuditActionExpenseReject,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceIDStr,
			Method:       "PUT",
			Path:         fmt.Sprintf("/api/v1/admin/expenses/%s/reject", id.String()),
			StatusCode:   200,
			RequestBody:  additionalInfo,
		}); err != nil {
			s.logger.Error("Failed to log audit for expense rejection",
				zap.Error(err),
				zap.String("expense_id", id.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("Expense rejected successfully",
		zap.String("expense_id", expense.ID.String()),
		zap.String("approver_id", approverID.String()),
		zap.String("reason", req.Comment))

	// 却下者の情報を取得
	rejector, err := s.userRepo.GetByID(ctx, approverID)
	if err != nil {
		s.logger.Error("Failed to get rejector for notification",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		// 通知エラーは無視して続行
	} else {
		// ユーザー情報を含む経費申請を取得
		expenseWithDetails, err := s.expenseRepo.GetByIDWithDetails(ctx, expense.ID)
		if err != nil {
			s.logger.Error("Failed to get expense details for notification",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
		} else {
			// 申請者に却下通知を送信
			if err := s.notificationService.NotifyExpenseRejected(ctx, &expenseWithDetails.Expense, rejector.Name, req.Comment); err != nil {
				s.logger.Error("Failed to send expense rejected notification",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			}
		}
	}

	return expense, nil
}

// GetPendingApprovals 承認待ち一覧を取得
func (s *expenseService) GetPendingApprovals(ctx context.Context, approverID uuid.UUID, filter *dto.ApprovalFilterRequest) (*dto.ApprovalListResponse, error) {
	// 承認待ちステータスに固定
	pendingStatus := string(model.ApprovalStatusPending)
	filter.Status = &pendingStatus

	// 承認待ち一覧を取得
	approvals, total, err := s.approvalRepo.GetPendingByApproverID(ctx, approverID, filter)
	if err != nil {
		s.logger.Error("Failed to get pending approvals",
			zap.Error(err),
			zap.String("approver_id", approverID.String()))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "承認待ち一覧の取得に失敗しました")
	}

	// レスポンスを構築
	items := make([]dto.ApprovalItemResponse, 0, len(approvals))
	for _, approval := range approvals {
		// 経費申請詳細を取得
		expense, err := s.expenseRepo.GetDetailByID(ctx, approval.ExpenseID)
		if err != nil {
			s.logger.Warn("Failed to get expense detail",
				zap.Error(err),
				zap.String("expense_id", approval.ExpenseID.String()))
			continue
		}

		item := dto.ApprovalItemResponse{
			ApprovalID:    approval.ID,
			ExpenseID:     expense.ID,
			Title:         expense.Title,
			Amount:        expense.Amount,
			ExpenseDate:   expense.ExpenseDate,
			Category:      string(expense.Category),
			ApprovalType:  string(approval.ApprovalType),
			ApprovalOrder: approval.ApprovalOrder,
			RequestedAt:   expense.CreatedAt,
			Description:   expense.Description,
			ReceiptURLs:   []string{}, // expense_receiptsテーブルから取得する必要あり（TODO）
		}

		// 申請者情報を設定
		if expense.User.ID != uuid.Nil {
			item.User = &dto.UserSummary{
				ID:   expense.User.ID,
				Name: expense.User.Name,
			}
		}

		// 前の承認情報を取得（2段階承認の場合）
		if approval.ApprovalOrder > 1 {
			for _, prevApproval := range expense.Approvals {
				if prevApproval.ApprovalOrder < approval.ApprovalOrder && prevApproval.Status == model.ApprovalStatusApproved {
					item.PreviousApproval = &dto.PreviousApprovalInfo{
						ApproverName: prevApproval.Approver.Name,
						ApprovedAt:   *prevApproval.ApprovedAt,
						Comment:      prevApproval.Comment,
					}
					break
				}
			}
		}

		items = append(items, item)
	}

	response := &dto.ApprovalListResponse{
		Items:      items,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: int((total + int64(filter.Limit) - 1) / int64(filter.Limit)),
	}

	return response, nil
}

// ========================================
// ファイルアップロード
// ========================================

// GenerateUploadURL ファイルアップロード用のPre-signed URLを生成
func (s *expenseService) GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error) {
	// S3Serviceにリクエストをdelegate
	return s.s3Service.GenerateUploadURL(ctx, userID, req)
}

// CompleteUpload ファイルアップロードの完了処理
func (s *expenseService) CompleteUpload(ctx context.Context, userID uuid.UUID, req *dto.CompleteUploadRequest) (*dto.CompleteUploadResponse, error) {
	// S3キーの形式をバリデーション
	if !IsValidS3Key(req.S3Key) {
		return nil, dto.NewExpenseError(dto.ErrCodeInvalidS3Key, "無効なS3キーです")
	}

	// S3キーからユーザーIDを抽出して権限確認
	extractedUserID, err := ExtractUserIDFromS3Key(req.S3Key)
	if err != nil {
		s.logger.Warn("Failed to extract user ID from S3 key",
			zap.Error(err),
			zap.String("s3_key", req.S3Key))
		return nil, dto.NewExpenseError(dto.ErrCodeInvalidS3Key, "無効なS3キー形式です")
	}

	if extractedUserID != userID {
		s.logger.Warn("User ID mismatch in S3 key",
			zap.String("expected_user_id", userID.String()),
			zap.String("extracted_user_id", extractedUserID.String()),
			zap.String("s3_key", req.S3Key))
		return nil, dto.NewExpenseError(dto.ErrCodeUnauthorized, "このファイルへのアクセス権限がありません")
	}

	// アップロードされたファイルを検証
	if err := s.s3Service.ValidateUploadedFile(ctx, req.S3Key); err != nil {
		return nil, err
	}

	// ファイル情報を取得
	fileInfo, err := s.s3Service.GetFileInfo(ctx, req.S3Key)
	if err != nil {
		return nil, err
	}

	// ウイルススキャンを実行（VirusScanServiceが設定されている場合）
	if s.virusScanService != nil {
		s.logger.Info("Starting virus scan",
			zap.String("s3_key", req.S3Key),
			zap.String("file_name", fileInfo.FileName))

		// ファイルIDを生成
		fileID := uuid.New()

		// S3からファイルを取得してスキャン
		scanResult, err := s.virusScanService.ScanFileByPath(ctx, fileID, req.S3Key)
		if err != nil {
			s.logger.Error("Virus scan failed",
				zap.Error(err),
				zap.String("s3_key", req.S3Key))
			// スキャンエラーの場合は続行（設定により変更可能）
		} else if scanResult != nil && scanResult.ScanStatus == "infected" {
			// ウイルスが検出された場合
			s.logger.Warn("Virus detected in uploaded file",
				zap.String("s3_key", req.S3Key),
				zap.String("virus_name", scanResult.VirusName))

			// ファイルを削除
			if err := s.s3Service.DeleteFile(ctx, req.S3Key); err != nil {
				s.logger.Error("Failed to delete infected file",
					zap.Error(err),
					zap.String("s3_key", req.S3Key))
			}

			// 監査ログに記録
			s.auditService.LogActivity(ctx, LogActivityParams{
				UserID:       userID,
				Action:       "FILE_VIRUS_DETECTED",
				ResourceType: model.ResourceTypeFile,
				ResourceID:   &req.S3Key,
				Method:       "POST",
				Path:         "/api/v1/expenses/upload/complete",
				StatusCode:   400,
				RequestBody: map[string]interface{}{
					"virus_name": scanResult.VirusName,
					"file_name":  fileInfo.FileName,
				},
			})

			return nil, dto.NewExpenseError(dto.ErrCodeVirusDetected,
				fmt.Sprintf("アップロードされたファイルからウイルスが検出されました: %s", scanResult.VirusName))
		}
	}

	// 公開URLを生成
	receiptURL, err := s.s3Service.GetFileURL(ctx, req.S3Key)
	if err != nil {
		return nil, err
	}

	response := &dto.CompleteUploadResponse{
		ReceiptURL: receiptURL,
		S3Key:      req.S3Key,
		FileSize:   fileInfo.FileSize,
		CreatedAt:  time.Now(),
	}

	s.logger.Info("File upload completed successfully",
		zap.String("s3_key", req.S3Key),
		zap.String("user_id", userID.String()),
		zap.Int64("file_size", fileInfo.FileSize))

	return response, nil
}

// DeleteUploadedFile アップロード済みファイルを削除
func (s *expenseService) DeleteUploadedFile(ctx context.Context, userID uuid.UUID, req *dto.DeleteUploadRequest) error {
	// S3キーの形式をバリデーション
	if !IsValidS3Key(req.S3Key) {
		return dto.NewExpenseError(dto.ErrCodeInvalidS3Key, "無効なS3キーです")
	}

	// S3キーからユーザーIDを抽出して権限確認
	extractedUserID, err := ExtractUserIDFromS3Key(req.S3Key)
	if err != nil {
		s.logger.Warn("Failed to extract user ID from S3 key for deletion",
			zap.Error(err),
			zap.String("s3_key", req.S3Key))
		return dto.NewExpenseError(dto.ErrCodeInvalidS3Key, "無効なS3キー形式です")
	}

	if extractedUserID != userID {
		s.logger.Warn("User ID mismatch in S3 key for deletion",
			zap.String("expected_user_id", userID.String()),
			zap.String("extracted_user_id", extractedUserID.String()),
			zap.String("s3_key", req.S3Key))
		return dto.NewExpenseError(dto.ErrCodeUnauthorized, "このファイルを削除する権限がありません")
	}

	// ファイルが経費申請で使用中でないかチェック
	// TODO: 実際の実装では、経費申請でファイルが使用されているかチェック
	// 現在は基本的な削除のみ実装

	// S3からファイルを削除
	if err := s.s3Service.DeleteFile(ctx, req.S3Key); err != nil {
		return err
	}

	s.logger.Info("File deleted successfully",
		zap.String("s3_key", req.S3Key),
		zap.String("user_id", userID.String()))

	return nil
}

// ========================================
// ヘルパー関数
// ========================================

// IsValidS3Key S3キーの形式が正しいかチェック
func IsValidS3Key(s3Key string) bool {
	if s3Key == "" {
		return false
	}

	// 基本的な形式チェック
	if strings.Contains(s3Key, "..") || strings.HasPrefix(s3Key, "/") {
		return false
	}

	// 期待されるプレフィックスチェック
	return strings.HasPrefix(s3Key, "expenses/")
}

// ExtractUserIDFromS3Key S3キーからユーザーIDを抽出
func ExtractUserIDFromS3Key(s3Key string) (uuid.UUID, error) {
	// expenses/{user_id}/{year}/{month}/{filename} の形式を期待
	parts := strings.Split(s3Key, "/")
	if len(parts) < 2 || parts[0] != "expenses" {
		return uuid.Nil, fmt.Errorf("invalid S3 key format: %s", s3Key)
	}

	userID, err := uuid.Parse(parts[1])
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user ID in S3 key: %s", parts[1])
	}

	return userID, nil
}

// GetExpenseLimits 経費申請上限一覧を取得
func (s *expenseService) GetExpenseLimits(ctx context.Context) ([]model.ExpenseLimit, error) {
	s.logger.Info("経費申請上限一覧取得開始")

	// リポジトリから上限一覧を取得
	limits, err := s.limitRepo.GetAllLimits(ctx)
	if err != nil {
		s.logger.Error("Failed to get expense limits", zap.Error(err))
		return nil, fmt.Errorf("経費申請上限の取得に失敗しました: %v", err)
	}

	s.logger.Info("経費申請上限一覧取得成功", zap.Int("count", len(limits)))
	return limits, nil
}

// UpdateExpenseLimit 経費申請上限を更新
func (s *expenseService) UpdateExpenseLimit(ctx context.Context, userID uuid.UUID, req *dto.UpdateExpenseLimitRequest) (*model.ExpenseLimit, error) {
	s.logger.Info("経費申請上限更新開始",
		zap.String("user_id", userID.String()),
		zap.String("limit_type", req.LimitType),
		zap.Int("amount", req.Amount))

	// バリデーション
	if req.LimitType != "monthly" && req.LimitType != "yearly" {
		s.logger.Error("Invalid limit type", zap.String("limit_type", req.LimitType))
		return nil, errors.New("無効な上限種別です")
	}

	if req.Amount <= 0 {
		s.logger.Error("Invalid limit amount", zap.Int("amount", req.Amount))
		return nil, errors.New("上限金額は1以上である必要があります")
	}

	// 現在時刻より前の有効開始日時は許可しない
	now := time.Now()
	if req.EffectiveFrom.Before(now) {
		s.logger.Error("Effective from date is in the past",
			zap.Time("effective_from", req.EffectiveFrom),
			zap.Time("now", now))
		return nil, errors.New("有効開始日時は現在時刻以降である必要があります")
	}

	// データベーストランザクション内で実行
	var newLimit *model.ExpenseLimit
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション内でリポジトリを作成
		limitRepo := repository.NewExpenseLimitRepository(tx, s.logger)

		// 新しい上限を作成（履歴として保持）
		limitType := model.LimitType(req.LimitType)
		limit := &model.ExpenseLimit{
			ID:            uuid.New(),
			LimitType:     limitType,
			Amount:        req.Amount,
			EffectiveFrom: req.EffectiveFrom,
			CreatedBy:     userID,
		}

		// 上限を保存
		if err := limitRepo.CreateLimit(ctx, limit); err != nil {
			s.logger.Error("Failed to create expense limit", zap.Error(err))
			return fmt.Errorf("経費申請上限の作成に失敗しました: %v", err)
		}

		newLimit = limit
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.logger.Info("経費申請上限更新成功",
		zap.String("user_id", userID.String()),
		zap.String("limit_id", newLimit.ID.String()),
		zap.String("limit_type", req.LimitType),
		zap.Int("amount", req.Amount))

	return newLimit, nil
}

// ========================================
// 上限管理（スコープ対応）
// ========================================

// GetExpenseLimitsWithScope スコープ対応の上限一覧を取得
func (s *expenseService) GetExpenseLimitsWithScope(ctx context.Context, filter *dto.ExpenseLimitListRequest) (*dto.ExpenseLimitListResponse, error) {
	s.logger.Info("経費申請上限一覧取得（スコープ対応）開始")

	// リポジトリから取得
	limits, total, err := s.limitRepo.GetLimitsWithScope(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to get expense limits with scope", zap.Error(err))
		return nil, err
	}

	// DTOに変換
	items := make([]dto.ExpenseLimitDetailResponse, 0, len(limits))
	for _, limit := range limits {
		item := dto.ExpenseLimitDetailResponse{}
		item.FromModel(&limit)

		// リレーション情報を設定
		if limit.Creator.ID != uuid.Nil {
			item.Creator = &dto.UserSummary{
				ID:    limit.Creator.ID,
				Name:  limit.Creator.FullName(),
				Email: limit.Creator.Email,
			}
		}
		if limit.User != nil && limit.User.ID != uuid.Nil {
			item.User = &dto.UserSummary{
				ID:    limit.User.ID,
				Name:  limit.User.FullName(),
				Email: limit.User.Email,
			}
		}

		items = append(items, item)
	}

	response := &dto.ExpenseLimitListResponse{
		Items: items,
		Total: int(total),
		Page:  filter.Page,
		Limit: filter.Limit,
	}

	s.logger.Info("経費申請上限一覧取得（スコープ対応）成功",
		zap.Int("total", int(total)),
		zap.Int("page", filter.Page))

	return response, nil
}

// GetExpenseLimitByID 指定IDの上限を取得
func (s *expenseService) GetExpenseLimitByID(ctx context.Context, id uuid.UUID) (*dto.ExpenseLimitDetailResponse, error) {
	s.logger.Info("経費申請上限詳細取得開始",
		zap.String("limit_id", id.String()))

	// リポジトリから取得
	limit, err := s.limitRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			s.logger.Warn("Expense limit not found",
				zap.String("limit_id", id.String()))
			return nil, err
		}
		s.logger.Error("Failed to get expense limit by ID",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return nil, err
	}

	// DTOに変換
	response := &dto.ExpenseLimitDetailResponse{}
	response.FromModel(limit)

	s.logger.Info("経費申請上限詳細取得成功",
		zap.String("limit_id", id.String()))

	return response, nil
}

// CreateExpenseLimitWithScope スコープ対応の上限作成
func (s *expenseService) CreateExpenseLimitWithScope(ctx context.Context, createdBy uuid.UUID, req *dto.CreateExpenseLimitRequest) (*dto.ExpenseLimitDetailResponse, error) {
	s.logger.Info("経費申請上限作成（スコープ対応）開始",
		zap.String("limit_type", req.LimitType),
		zap.String("limit_scope", req.LimitScope),
		zap.Int("amount", req.Amount))

	// リクエストをバリデーション
	if err := req.Validate(); err != nil {
		s.logger.Error("Invalid request", zap.Error(err))
		return nil, err
	}

	// モデルに変換
	limit := req.ToModel(createdBy)

	// トランザクション内で作成
	var createdLimit *model.ExpenseLimit
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		limitRepo := repository.NewExpenseLimitRepository(tx, s.logger)

		// 作成
		if err := limitRepo.CreateWithScope(ctx, limit); err != nil {
			return err
		}

		createdLimit = limit
		return nil
	})

	if err != nil {
		s.logger.Error("Failed to create expense limit with scope",
			zap.Error(err),
			zap.String("limit_type", req.LimitType),
			zap.String("limit_scope", req.LimitScope))
		return nil, err
	}

	// レスポンスを作成
	response := &dto.ExpenseLimitDetailResponse{}
	response.FromModel(createdLimit)

	s.logger.Info("経費申請上限作成（スコープ対応）成功",
		zap.String("limit_id", createdLimit.ID.String()),
		zap.String("limit_type", req.LimitType),
		zap.String("limit_scope", req.LimitScope))

	return response, nil
}

// UpdateExpenseLimitWithScope スコープ対応の上限更新
func (s *expenseService) UpdateExpenseLimitWithScope(ctx context.Context, id uuid.UUID, createdBy uuid.UUID, req *dto.UpdateExpenseLimitV2Request) (*dto.ExpenseLimitDetailResponse, error) {
	s.logger.Info("経費申請上限更新（スコープ対応）開始",
		zap.String("limit_id", id.String()),
		zap.String("limit_type", req.LimitType),
		zap.String("limit_scope", req.LimitScope))

	// リクエストをバリデーション
	if err := req.Validate(); err != nil {
		s.logger.Error("Invalid request", zap.Error(err))
		return nil, err
	}

	// 既存のレコードを取得（存在チェック用）
	_, err := s.limitRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			s.logger.Warn("Expense limit not found for update",
				zap.String("limit_id", id.String()))
			return nil, err
		}
		s.logger.Error("Failed to get existing expense limit",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return nil, err
	}

	// 新しい制限レコードを作成（履歴として保持）
	newLimit := &model.ExpenseLimit{
		LimitType:     model.LimitType(req.LimitType),
		LimitScope:    model.LimitScope(req.LimitScope),
		Amount:        req.Amount,
		UserID:        req.UserID,
		DepartmentID:  req.DepartmentID,
		EffectiveFrom: req.EffectiveFrom,
		CreatedBy:     createdBy,
	}

	// トランザクション内で作成
	var createdLimit *model.ExpenseLimit
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		limitRepo := repository.NewExpenseLimitRepository(tx, s.logger)

		// 新しいレコードを作成
		if err := limitRepo.CreateWithScope(ctx, newLimit); err != nil {
			return err
		}

		createdLimit = newLimit
		return nil
	})

	if err != nil {
		s.logger.Error("Failed to update expense limit with scope",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return nil, err
	}

	// レスポンスを作成
	response := &dto.ExpenseLimitDetailResponse{}
	response.FromModel(createdLimit)

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := createdLimit.ID.String()
		additionalInfo := map[string]interface{}{
			"limit_type":     req.LimitType,
			"limit_scope":    req.LimitScope,
			"amount":         req.Amount,
			"user_id":        req.UserID,
			"department_id":  req.DepartmentID,
			"effective_from": req.EffectiveFrom,
		}
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       createdBy,
			Action:       model.AuditActionExpenseLimitUpdate,
			ResourceType: model.ResourceTypeExpenseLimit,
			ResourceID:   &resourceIDStr,
			Method:       "PUT",
			Path:         fmt.Sprintf("/api/v1/admin/expense-limits/%s", id.String()),
			StatusCode:   200,
			RequestBody:  additionalInfo,
		}); err != nil {
			s.logger.Error("Failed to log audit for expense limit update",
				zap.Error(err),
				zap.String("limit_id", createdLimit.ID.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("経費申請上限更新（スコープ対応）成功",
		zap.String("old_limit_id", id.String()),
		zap.String("new_limit_id", createdLimit.ID.String()),
		zap.String("limit_type", req.LimitType),
		zap.String("limit_scope", req.LimitScope))

	return response, nil
}

// DeleteExpenseLimitWithScope スコープ対応の上限削除
func (s *expenseService) DeleteExpenseLimitWithScope(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("経費申請上限削除（スコープ対応）開始",
		zap.String("limit_id", id.String()))

	// 存在チェック
	exists, err := s.limitRepo.ExistsByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to check expense limit existence",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return err
	}

	if !exists {
		s.logger.Warn("Expense limit not found for deletion",
			zap.String("limit_id", id.String()))
		return gorm.ErrRecordNotFound
	}

	// 削除実行
	if err := s.limitRepo.DeleteWithScope(ctx, id); err != nil {
		s.logger.Error("Failed to delete expense limit with scope",
			zap.Error(err),
			zap.String("limit_id", id.String()))
		return err
	}

	s.logger.Info("経費申請上限削除（スコープ対応）成功",
		zap.String("limit_id", id.String()))

	return nil
}

// CheckLimitsWithScope スコープ対応の上限チェック
func (s *expenseService) CheckLimitsWithScope(ctx context.Context, userID uuid.UUID, departmentID *uuid.UUID, amount int, expenseDate time.Time) (*dto.LimitCheckResult, error) {
	s.logger.Info("経費申請上限チェック（スコープ対応）開始",
		zap.String("user_id", userID.String()),
		zap.Int("amount", amount))

	// リポジトリを使って上限チェック
	result, err := s.limitRepo.CheckLimitsForUser(ctx, userID, departmentID, amount, expenseDate)
	if err != nil {
		s.logger.Error("Failed to check limits with scope",
			zap.Error(err),
			zap.String("user_id", userID.String()))
		return nil, err
	}

	s.logger.Info("経費申請上限チェック（スコープ対応）完了",
		zap.String("user_id", userID.String()),
		zap.Bool("within_monthly_limit", result.WithinMonthlyLimit),
		zap.Bool("within_yearly_limit", result.WithinYearlyLimit))

	return result, nil
}

// GetExpenseLimitHistory 経費申請上限履歴を取得
func (s *expenseService) GetExpenseLimitHistory(ctx context.Context, filter *dto.ExpenseLimitHistoryRequest) (*dto.ExpenseLimitHistoryResponse, error) {
	s.logger.Info("経費申請上限履歴取得開始",
		zap.Int("page", filter.Page),
		zap.Int("limit", filter.Limit))

	// リポジトリから履歴を取得
	limits, total, err := s.limitRepo.GetLimitHistoryWithScope(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to get expense limit history",
			zap.Error(err))
		return nil, err
	}

	// レスポンス用に変換
	items := make([]dto.ExpenseLimitHistoryItem, 0, len(limits))
	var previousLimits map[string]*model.ExpenseLimit

	// 変更前の値を取得するために、同じスコープ・タイプの前の履歴を取得
	if len(limits) > 0 {
		previousLimits = s.getPreviousLimits(ctx, limits)
	}

	for _, limit := range limits {
		item := dto.ExpenseLimitHistoryItem{
			ID:                limit.ID,
			LimitType:         string(limit.LimitType),
			LimitScope:        string(limit.LimitScope),
			Amount:            limit.Amount,
			UserID:            limit.UserID,
			DepartmentID:      limit.DepartmentID,
			EffectiveFrom:     limit.EffectiveFrom,
			CreatedBy:         limit.CreatedBy,
			CreatedAt:         limit.CreatedAt,
			TypeDescription:   s.getLimitTypeDescription(limit.LimitType),
			ScopeDescription:  limit.GetScopeDescription(),
			ChangeType:        "create", // デフォルトは作成
			ChangeDescription: s.generateChangeDescription(&limit, previousLimits),
		}

		// 変更前の金額を設定
		if prevLimit := s.findPreviousLimit(&limit, previousLimits); prevLimit != nil {
			item.PreviousAmount = &prevLimit.Amount
			if prevLimit.Amount != limit.Amount {
				item.ChangeType = "update"
			}
		}

		// リレーション情報を設定
		if limit.Creator.ID != uuid.Nil {
			item.Creator = &dto.UserSummary{
				ID:   limit.Creator.ID,
				Name: limit.Creator.Name,
			}
		}

		if limit.User.ID != uuid.Nil {
			item.User = &dto.UserSummary{
				ID:   limit.User.ID,
				Name: limit.User.Name,
			}
		}

		items = append(items, item)
	}

	// ページ数を計算
	totalPages := int((total + int64(filter.Limit) - 1) / int64(filter.Limit))

	response := &dto.ExpenseLimitHistoryResponse{
		Items:      items,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}

	s.logger.Info("経費申請上限履歴取得成功",
		zap.Int64("total", total),
		zap.Int("page", filter.Page),
		zap.Int("items", len(items)))

	return response, nil
}

// getPreviousLimits 前の制限値を取得するヘルパーメソッド
func (s *expenseService) getPreviousLimits(ctx context.Context, currentLimits []model.ExpenseLimit) map[string]*model.ExpenseLimit {
	previousLimits := make(map[string]*model.ExpenseLimit)

	for _, limit := range currentLimits {
		// より前の時点での同じスコープ・タイプの制限を検索
		key := s.getLimitKey(&limit)
		if _, exists := previousLimits[key]; !exists {
			// 現在の制限より前の時点での制限を取得
			var previousLimit model.ExpenseLimit
			err := s.db.WithContext(ctx).
				Where("limit_type = ? AND limit_scope = ? AND effective_from < ?",
					limit.LimitType, limit.LimitScope, limit.EffectiveFrom).
				Where("user_id = ? AND department_id = ?", limit.UserID, limit.DepartmentID).
				Order("effective_from DESC").
				First(&previousLimit).Error

			if err == nil {
				previousLimits[key] = &previousLimit
			}
		}
	}

	return previousLimits
}

// findPreviousLimit 指定された制限の前の制限を見つける
func (s *expenseService) findPreviousLimit(current *model.ExpenseLimit, previousLimits map[string]*model.ExpenseLimit) *model.ExpenseLimit {
	key := s.getLimitKey(current)
	return previousLimits[key]
}

// getLimitKey 制限の識別キーを生成
func (s *expenseService) getLimitKey(limit *model.ExpenseLimit) string {
	userID := ""
	if limit.UserID != nil {
		userID = limit.UserID.String()
	}
	deptID := ""
	if limit.DepartmentID != nil {
		deptID = limit.DepartmentID.String()
	}
	return fmt.Sprintf("%s_%s_%s_%s", limit.LimitType, limit.LimitScope, userID, deptID)
}

// getLimitTypeDescription 制限種別の説明を取得
func (s *expenseService) getLimitTypeDescription(limitType model.LimitType) string {
	switch limitType {
	case model.LimitTypeMonthly:
		return "月次制限"
	case model.LimitTypeYearly:
		return "年次制限"
	default:
		return "不明"
	}
}

// generateChangeDescription 変更内容の説明を生成
func (s *expenseService) generateChangeDescription(current *model.ExpenseLimit, previousLimits map[string]*model.ExpenseLimit) string {
	prevLimit := s.findPreviousLimit(current, previousLimits)

	if prevLimit == nil {
		return fmt.Sprintf("%s%sを新規作成（%s）",
			s.getLimitTypeDescription(current.LimitType),
			current.GetScopeDescription(),
			s.formatAmount(current.Amount))
	}

	if prevLimit.Amount != current.Amount {
		return fmt.Sprintf("%s%sを変更（%s → %s）",
			s.getLimitTypeDescription(current.LimitType),
			current.GetScopeDescription(),
			s.formatAmount(prevLimit.Amount),
			s.formatAmount(current.Amount))
	}

	return fmt.Sprintf("%s%sの設定を更新",
		s.getLimitTypeDescription(current.LimitType),
		current.GetScopeDescription())
}

// formatAmount 金額をフォーマット
func (s *expenseService) formatAmount(amount int) string {
	return fmt.Sprintf("%s円", s.addCommas(amount))
}

// addCommas 金額にカンマを追加
func (s *expenseService) addCommas(amount int) string {
	str := fmt.Sprintf("%d", amount)
	if len(str) <= 3 {
		return str
	}

	var result string
	for i, r := range str {
		if i > 0 && (len(str)-i)%3 == 0 {
			result += ","
		}
		result += string(r)
	}
	return result
}

// ========================================
// カテゴリ管理（管理画面用）
// ========================================

// GetCategoriesWithFilter フィルター機能付きのカテゴリ一覧を取得
func (s *expenseService) GetCategoriesWithFilter(ctx context.Context, filter *dto.ExpenseCategoryListRequest) (*dto.ExpenseCategoryListResponse, error) {
	s.logger.Info("経費カテゴリ一覧取得開始",
		zap.Int("page", filter.Page),
		zap.Int("limit", filter.Limit))

	// リポジトリからカテゴリを取得
	categories, total, err := s.categoryRepo.GetCategoriesWithFilter(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to get categories with filter",
			zap.Error(err))
		return nil, err
	}

	// レスポンス用に変換
	items := make([]dto.ExpenseCategoryResponse, 0, len(categories))
	for _, category := range categories {
		item := dto.ExpenseCategoryResponse{}
		item.FromModel(&category)
		items = append(items, item)
	}

	// ページ数を計算
	totalPages := int((total + int64(filter.Limit) - 1) / int64(filter.Limit))

	response := &dto.ExpenseCategoryListResponse{
		Items:      items,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}

	s.logger.Info("経費カテゴリ一覧取得成功",
		zap.Int64("total", total),
		zap.Int("page", filter.Page),
		zap.Int("items", len(items)))

	return response, nil
}

// GetCategoryByID カテゴリ詳細を取得
func (s *expenseService) GetCategoryByID(ctx context.Context, id uuid.UUID) (*dto.ExpenseCategoryResponse, error) {
	s.logger.Info("経費カテゴリ詳細取得開始",
		zap.String("category_id", id.String()))

	// リポジトリからカテゴリを取得
	category, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			s.logger.Warn("Category not found", zap.String("category_id", id.String()))
			return nil, fmt.Errorf("経費カテゴリが見つかりません")
		}
		s.logger.Error("Failed to get category by ID",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return nil, err
	}

	// レスポンス用に変換
	response := &dto.ExpenseCategoryResponse{}
	response.FromModel(category)

	s.logger.Info("経費カテゴリ詳細取得成功",
		zap.String("category_id", id.String()),
		zap.String("code", category.Code))

	return response, nil
}

// CreateCategory カテゴリを作成
func (s *expenseService) CreateCategory(ctx context.Context, req *dto.CreateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error) {
	s.logger.Info("経費カテゴリ作成開始",
		zap.String("code", req.Code),
		zap.String("name", req.Name))

	// コードのバリデーション
	if err := req.ValidateCode(); err != nil {
		s.logger.Warn("Invalid category code", zap.String("code", req.Code), zap.Error(err))
		return nil, err
	}

	// コードの重複チェック
	isUnique, err := s.categoryRepo.IsCodeUnique(ctx, req.Code, nil)
	if err != nil {
		s.logger.Error("Failed to check code uniqueness",
			zap.Error(err),
			zap.String("code", req.Code))
		return nil, err
	}
	if !isUnique {
		return nil, fmt.Errorf("カテゴリコード '%s' は既に使用されています", req.Code)
	}

	// 表示順序が指定されていない場合、最大値+1を設定
	if req.DisplayOrder == 0 {
		maxOrder, err := s.categoryRepo.GetMaxDisplayOrder(ctx)
		if err != nil {
			s.logger.Error("Failed to get max display order", zap.Error(err))
			return nil, err
		}
		req.DisplayOrder = maxOrder + 1
	}

	// モデルに変換
	category := req.ToModel()

	// データベースに保存
	if err := s.categoryRepo.Create(ctx, category); err != nil {
		s.logger.Error("Failed to create category",
			zap.Error(err),
			zap.String("code", req.Code))
		return nil, err
	}

	// レスポンス用に変換
	response := &dto.ExpenseCategoryResponse{}
	response.FromModel(category)

	// カテゴリ一覧キャッシュを無効化
	if s.cacheManager != nil {
		if err := s.cacheManager.Category().InvalidateCategoryList(ctx); err != nil {
			s.logger.Warn("Failed to invalidate category list cache", zap.Error(err))
		}
	}

	s.logger.Info("経費カテゴリ作成成功",
		zap.String("category_id", category.ID.String()),
		zap.String("code", category.Code))

	return response, nil
}

// UpdateCategory カテゴリを更新
func (s *expenseService) UpdateCategory(ctx context.Context, id uuid.UUID, req *dto.UpdateExpenseCategoryRequest) (*dto.ExpenseCategoryResponse, error) {
	s.logger.Info("経費カテゴリ更新開始",
		zap.String("category_id", id.String()))

	// 既存のカテゴリを取得
	category, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			s.logger.Warn("Category not found for update", zap.String("category_id", id.String()))
			return nil, fmt.Errorf("経費カテゴリが見つかりません")
		}
		s.logger.Error("Failed to get category for update",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return nil, err
	}

	// 更新項目を適用
	if req.Name != nil {
		category.Name = *req.Name
	}
	if req.RequiresDetails != nil {
		category.RequiresDetails = *req.RequiresDetails
	}
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}
	if req.DisplayOrder != nil {
		category.DisplayOrder = *req.DisplayOrder
	}

	// データベースに保存
	if err := s.categoryRepo.Update(ctx, category); err != nil {
		s.logger.Error("Failed to update category",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return nil, err
	}

	// レスポンス用に変換
	response := &dto.ExpenseCategoryResponse{}
	response.FromModel(category)

	// カテゴリ関連キャッシュを無効化
	if s.cacheManager != nil {
		if err := s.cacheManager.Category().InvalidateCategory(ctx, id); err != nil {
			s.logger.Warn("Failed to invalidate category cache", zap.Error(err))
		}
	}

	// 監査ログを記録
	if s.auditService != nil {
		resourceIDStr := id.String()
		additionalInfo := map[string]interface{}{
			"code":             category.Code,
			"name":             category.Name,
			"requires_details": category.RequiresDetails,
			"is_active":        category.IsActive,
		}
		if err := s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       uuid.Nil, // TODO: 操作者IDを渡すように引数を追加
			Action:       model.AuditActionExpenseCategoryEdit,
			ResourceType: model.ResourceTypeExpenseCategory,
			ResourceID:   &resourceIDStr,
			Method:       "PUT",
			Path:         fmt.Sprintf("/api/v1/expense-categories/%s", id.String()),
			StatusCode:   200,
			RequestBody:  additionalInfo,
		}); err != nil {
			s.logger.Error("Failed to log audit for category update",
				zap.Error(err),
				zap.String("category_id", id.String()))
			// 監査ログのエラーは無視して処理を続行
		}
	}

	s.logger.Info("経費カテゴリ更新成功",
		zap.String("category_id", id.String()),
		zap.String("code", category.Code))

	return response, nil
}

// DeleteCategory カテゴリを削除
func (s *expenseService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("経費カテゴリ削除開始",
		zap.String("category_id", id.String()))

	// 既存のカテゴリを取得
	category, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			s.logger.Warn("Category not found for delete", zap.String("category_id", id.String()))
			return fmt.Errorf("経費カテゴリが見つかりません")
		}
		s.logger.Error("Failed to get category for delete",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return err
	}

	// デフォルトカテゴリの削除を防ぐ
	defaultCodes := []string{
		model.CategoryCodeTransport,
		model.CategoryCodeEntertainment,
		model.CategoryCodeSupplies,
		model.CategoryCodeBooks,
		model.CategoryCodeSeminar,
		model.CategoryCodeOther,
	}
	for _, code := range defaultCodes {
		if category.Code == code {
			return fmt.Errorf("デフォルトカテゴリ '%s' は削除できません", category.Name)
		}
	}

	// データベースから削除
	if err := s.categoryRepo.Delete(ctx, id); err != nil {
		s.logger.Error("Failed to delete category",
			zap.Error(err),
			zap.String("category_id", id.String()))
		return err
	}

	// カテゴリ関連キャッシュを無効化
	if s.cacheManager != nil {
		if err := s.cacheManager.Category().InvalidateCategory(ctx, id); err != nil {
			s.logger.Warn("Failed to invalidate category cache", zap.Error(err))
		}
	}

	s.logger.Info("経費カテゴリ削除成功",
		zap.String("category_id", id.String()),
		zap.String("code", category.Code))

	return nil
}

// ReorderCategories カテゴリの表示順序を変更
func (s *expenseService) ReorderCategories(ctx context.Context, req *dto.ReorderCategoriesRequest) error {
	s.logger.Info("経費カテゴリ順序変更開始",
		zap.Int("count", len(req.CategoryOrders)))

	// カテゴリオーダーマップを作成
	categoryOrders := make(map[uuid.UUID]int)
	for _, order := range req.CategoryOrders {
		categoryOrders[order.ID] = order.DisplayOrder
	}

	// リポジトリで一括更新
	if err := s.categoryRepo.ReorderCategories(ctx, categoryOrders); err != nil {
		s.logger.Error("Failed to reorder categories",
			zap.Error(err),
			zap.Int("count", len(req.CategoryOrders)))
		return err
	}

	s.logger.Info("経費カテゴリ順序変更成功",
		zap.Int("count", len(req.CategoryOrders)))

	return nil
}

// BulkUpdateCategories カテゴリの一括更新
func (s *expenseService) BulkUpdateCategories(ctx context.Context, req *dto.BulkUpdateCategoriesRequest) error {
	s.logger.Info("経費カテゴリ一括更新開始",
		zap.String("action", req.Action),
		zap.Int("count", len(req.CategoryIDs)))

	switch req.Action {
	case "activate":
		if err := s.categoryRepo.BulkUpdateActive(ctx, req.CategoryIDs, true); err != nil {
			s.logger.Error("Failed to bulk activate categories",
				zap.Error(err),
				zap.Int("count", len(req.CategoryIDs)))
			return err
		}

	case "deactivate":
		if err := s.categoryRepo.BulkUpdateActive(ctx, req.CategoryIDs, false); err != nil {
			s.logger.Error("Failed to bulk deactivate categories",
				zap.Error(err),
				zap.Int("count", len(req.CategoryIDs)))
			return err
		}

	case "delete":
		// 各カテゴリの削除可能性をチェック
		for _, id := range req.CategoryIDs {
			category, err := s.categoryRepo.GetByID(ctx, id)
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					continue // 既に削除済み
				}
				return err
			}

			// デフォルトカテゴリの削除を防ぐ
			defaultCodes := []string{
				model.CategoryCodeTransport,
				model.CategoryCodeEntertainment,
				model.CategoryCodeSupplies,
				model.CategoryCodeBooks,
				model.CategoryCodeSeminar,
				model.CategoryCodeOther,
			}
			for _, code := range defaultCodes {
				if category.Code == code {
					return fmt.Errorf("デフォルトカテゴリ '%s' は削除できません", category.Name)
				}
			}
		}

		// 一括削除実行
		for _, id := range req.CategoryIDs {
			if err := s.categoryRepo.Delete(ctx, id); err != nil {
				s.logger.Error("Failed to delete category in bulk",
					zap.Error(err),
					zap.String("category_id", id.String()))
				return err
			}
		}

	default:
		return fmt.Errorf("無効な操作です: %s", req.Action)
	}

	s.logger.Info("経費カテゴリ一括更新成功",
		zap.String("action", req.Action),
		zap.Int("count", len(req.CategoryIDs)))

	return nil
}

// GetPendingExpenses 指定期間以上承認待ちの経費申請を取得
func (s *expenseService) GetPendingExpenses(ctx context.Context, threshold time.Duration) ([]model.Expense, error) {
	// 承認待ちステータスの経費申請を取得
	cutoffTime := time.Now().Add(-threshold)

	var expenses []model.Expense
	err := s.db.WithContext(ctx).
		Preload("User").
		Preload("Category").
		Where("status = ?", model.ExpenseStatusSubmitted).
		Where("updated_at <= ?", cutoffTime).
		Find(&expenses).Error

	if err != nil {
		s.logger.Error("Failed to get pending expenses",
			zap.Error(err),
			zap.Duration("threshold", threshold),
		)
		return nil, err
	}

	s.logger.Info("Retrieved pending expenses for reminder",
		zap.Int("count", len(expenses)),
		zap.Duration("threshold", threshold),
	)

	return expenses, nil
}

// GetCurrentApprover 経費申請の現在の承認者を取得
func (s *expenseService) GetCurrentApprover(ctx context.Context, expenseID uuid.UUID) (*uuid.UUID, error) {
	// 経費申請を取得
	expense, err := s.expenseRepo.GetByID(ctx, expenseID)
	if err != nil {
		return nil, err
	}

	// 申請中以外は承認者なし
	if expense.Status != model.ExpenseStatusSubmitted {
		return nil, nil
	}

	// 承認履歴を取得して現在の承認段階を判定
	approvals, err := s.approvalRepo.GetByExpenseID(ctx, expenseID)
	if err != nil {
		return nil, err
	}

	// 承認待ちのレコードから現在の承認者を取得
	for _, approval := range approvals {
		if approval.Status == model.ApprovalStatusPending {
			return &approval.ApproverID, nil
		}
	}

	// 承認待ちレコードがない場合はnilを返す
	return nil, nil
}

// getApproverSetting 承認者設定を取得（内部メソッド）
func (s *expenseService) getApproverSetting(ctx context.Context) (*model.ExpenseApproverSetting, error) {
	var setting model.ExpenseApproverSetting
	err := s.db.WithContext(ctx).
		Order("created_at DESC").
		First(&setting).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("承認者が設定されていません")
		}
		return nil, err
	}

	return &setting, nil
}

// ========================================
// 複数領収書対応機能
// ========================================

// CreateWithReceipts 複数領収書を含む経費申請を作成
func (s *expenseService) CreateWithReceipts(ctx context.Context, userID uuid.UUID, req *dto.CreateExpenseWithReceiptsRequest) (*dto.ExpenseWithReceiptsResponse, error) {
	// トランザクション開始
	var result *dto.ExpenseWithReceiptsResponse
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// カテゴリの存在確認
		category, err := s.categoryRepo.GetByID(ctx, req.CategoryID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeCategoryNotFound, "指定されたカテゴリが見つかりません")
			}
			s.logger.Error("Failed to get category", zap.Error(err), zap.String("category_id", req.CategoryID.String()))
			return dto.NewExpenseError(dto.ErrCodeInternalError, "カテゴリの取得に失敗しました")
		}

		// カテゴリが有効かチェック
		if !category.IsAvailable() {
			return dto.NewExpenseError(dto.ErrCodeCategoryInactive, "指定されたカテゴリは利用できません")
		}

		// 上限チェック
		limitCheck, err := s.CheckLimits(ctx, userID, req.Amount, req.ExpenseDate)
		if err != nil {
			return err
		}

		if limitCheck.MonthlyExceeded || limitCheck.YearlyExceeded || limitCheck.FiscalYearExceeded {
			return dto.NewExpenseError(dto.ErrCodeMonthlyLimitExceeded, "申請上限を超えています")
		}

		// 経費申請を作成
		expense := &model.Expense{
			UserID:      userID,
			Title:       req.Title,
			CategoryID:  req.CategoryID,
			Amount:      req.Amount,
			ExpenseDate: req.ExpenseDate,
			Description: req.Description,
			Status:      model.ExpenseStatusDraft,
			Version:     1,
		}

		// トランザクション用のリポジトリを作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txReceiptRepo := repository.NewExpenseReceiptRepository(tx, s.logger)

		if err := txExpenseRepo.Create(ctx, expense); err != nil {
			s.logger.Error("Failed to create expense", zap.Error(err))
			return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の作成に失敗しました")
		}

		// 領収書を作成
		receipts := make([]*model.ExpenseReceipt, len(req.Receipts))
		for i, receiptReq := range req.Receipts {
			receipts[i] = &model.ExpenseReceipt{
				ExpenseID:    expense.ID,
				ReceiptURL:   receiptReq.ReceiptURL,
				S3Key:        receiptReq.S3Key,
				FileName:     receiptReq.FileName,
				FileSize:     receiptReq.FileSize,
				ContentType:  receiptReq.ContentType,
				DisplayOrder: i + 1,
			}
		}

		if err := txReceiptRepo.CreateBatch(ctx, receipts); err != nil {
			s.logger.Error("Failed to create expense receipts", zap.Error(err))
			return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の保存に失敗しました")
		}

		// レスポンスを作成
		receiptDTOs := make([]dto.ExpenseReceiptDTO, len(receipts))
		for i, receipt := range receipts {
			receiptDTOs[i] = dto.ExpenseReceiptDTO{
				ID:           receipt.ID,
				ExpenseID:    receipt.ExpenseID,
				ReceiptURL:   receipt.ReceiptURL,
				S3Key:        receipt.S3Key,
				FileName:     receipt.FileName,
				FileSize:     receipt.FileSize,
				ContentType:  receipt.ContentType,
				DisplayOrder: receipt.DisplayOrder,
				CreatedAt:    receipt.CreatedAt,
				UpdatedAt:    receipt.UpdatedAt,
			}
		}

		// ユーザー情報を取得
		user, _ := s.userRepo.GetByID(ctx, userID)

		result = &dto.ExpenseWithReceiptsResponse{
			ID:           expense.ID,
			UserID:       expense.UserID,
			UserName:     user.Name,
			Title:        expense.Title,
			CategoryID:   expense.CategoryID,
			CategoryName: category.Name,
			CategoryCode: category.Code,
			Amount:       expense.Amount,
			ExpenseDate:  expense.ExpenseDate,
			Description:  expense.Description,
			Status:       string(expense.Status),
			ReceiptURL:   receipts[0].ReceiptURL, // 後方互換性のため最初の領収書URLを設定
			Receipts:     receiptDTOs,
			Version:      expense.Version,
			CreatedAt:    expense.CreatedAt,
			UpdatedAt:    expense.UpdatedAt,
		}

		// キャッシュをクリア
		if s.cacheManager != nil && s.cacheManager.IsEnabled() {
			s.cacheManager.DeleteByPrefix(ctx, fmt.Sprintf("expense:user:%s:", userID.String()))
		}

		// 監査ログ記録
		resourceID := expense.ID.String()
		s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       userID,
			Action:       model.AuditActionExpenseCreate,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceID,
			Method:       "POST",
			Path:         "/api/v1/expenses/with-receipts",
			StatusCode:   201,
			RequestBody:  req,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// UpdateWithReceipts 複数領収書を含む経費申請を更新
func (s *expenseService) UpdateWithReceipts(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateExpenseWithReceiptsRequest) (*dto.ExpenseWithReceiptsResponse, error) {
	var result *dto.ExpenseWithReceiptsResponse
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 既存の経費申請を取得
		expense, err := s.expenseRepo.GetByID(ctx, id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
			}
			return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
		}

		// 権限チェック
		if expense.UserID != userID {
			return dto.NewExpenseError(dto.ErrCodeUnauthorized, "この経費申請を更新する権限がありません")
		}

		// ステータスチェック
		if expense.Status != model.ExpenseStatusDraft {
			return dto.NewExpenseError(dto.ErrCodeExpenseNotEditable, "下書き状態の経費申請のみ更新できます")
		}

		// 楽観的ロックのチェック
		if expense.Version != req.Version {
			return dto.NewExpenseError(dto.ErrCodeVersionMismatch, "他のユーザーによって更新されています。最新のデータを取得してください")
		}

		// 更新フィールドの適用
		if req.Title != nil {
			expense.Title = *req.Title
		}
		if req.CategoryID != nil {
			expense.CategoryID = *req.CategoryID
		}
		if req.Amount != nil {
			expense.Amount = *req.Amount
		}
		if req.ExpenseDate != nil {
			expense.ExpenseDate = *req.ExpenseDate
		}
		if req.Description != nil {
			expense.Description = *req.Description
		}

		// バージョンをインクリメント
		expense.Version++

		// トランザクション用のリポジトリを作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)
		txReceiptRepo := repository.NewExpenseReceiptRepository(tx, s.logger)

		// 経費申請を更新
		if err := txExpenseRepo.Update(ctx, expense); err != nil {
			return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の更新に失敗しました")
		}

		// 領収書が指定されている場合は更新
		if req.Receipts != nil && len(req.Receipts) > 0 {
			// 既存の領収書を削除
			if err := txReceiptRepo.DeleteByExpenseID(ctx, id); err != nil {
				return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の削除に失敗しました")
			}

			// 新しい領収書を作成
			receipts := make([]*model.ExpenseReceipt, len(req.Receipts))
			for i, receiptReq := range req.Receipts {
				receipts[i] = &model.ExpenseReceipt{
					ExpenseID:    expense.ID,
					ReceiptURL:   receiptReq.ReceiptURL,
					S3Key:        receiptReq.S3Key,
					FileName:     receiptReq.FileName,
					FileSize:     receiptReq.FileSize,
					ContentType:  receiptReq.ContentType,
					DisplayOrder: i + 1,
				}
			}

			if err := txReceiptRepo.CreateBatch(ctx, receipts); err != nil {
				return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の保存に失敗しました")
			}
		}

		// 最新の領収書を取得
		receipts, err := txReceiptRepo.GetByExpenseID(ctx, id)
		if err != nil {
			return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
		}

		// レスポンスを作成
		receiptDTOs := make([]dto.ExpenseReceiptDTO, len(receipts))
		for i, receipt := range receipts {
			receiptDTOs[i] = dto.ExpenseReceiptDTO{
				ID:           receipt.ID,
				ExpenseID:    receipt.ExpenseID,
				ReceiptURL:   receipt.ReceiptURL,
				S3Key:        receipt.S3Key,
				FileName:     receipt.FileName,
				FileSize:     receipt.FileSize,
				ContentType:  receipt.ContentType,
				DisplayOrder: receipt.DisplayOrder,
				CreatedAt:    receipt.CreatedAt,
				UpdatedAt:    receipt.UpdatedAt,
			}
		}

		// カテゴリ情報を取得
		category, _ := s.categoryRepo.GetByID(ctx, expense.CategoryID)
		// ユーザー情報を取得
		user, _ := s.userRepo.GetByID(ctx, userID)

		result = &dto.ExpenseWithReceiptsResponse{
			ID:           expense.ID,
			UserID:       expense.UserID,
			UserName:     user.Name,
			Title:        expense.Title,
			CategoryID:   expense.CategoryID,
			CategoryName: category.Name,
			CategoryCode: category.Code,
			Amount:       expense.Amount,
			ExpenseDate:  expense.ExpenseDate,
			Description:  expense.Description,
			Status:       string(expense.Status),
			Receipts:     receiptDTOs,
			Version:      expense.Version,
			CreatedAt:    expense.CreatedAt,
			UpdatedAt:    expense.UpdatedAt,
		}

		// 後方互換性のため最初の領収書URLを設定
		if len(receipts) > 0 {
			result.ReceiptURL = receipts[0].ReceiptURL
		}

		// キャッシュをクリア
		if s.cacheManager != nil && s.cacheManager.IsEnabled() {
			s.cacheManager.DeleteByPrefix(ctx, fmt.Sprintf("expense:user:%s:", userID.String()))
			s.cacheManager.Delete(ctx, fmt.Sprintf("expense:%s", id.String()))
		}

		// 監査ログ記録
		resourceID := expense.ID.String()
		s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       userID,
			Action:       model.AuditActionExpenseUpdate,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceID,
			Method:       "PUT",
			Path:         fmt.Sprintf("/api/v1/expenses/%s/with-receipts", id.String()),
			StatusCode:   200,
			RequestBody:  req,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// GetExpenseReceipts 経費申請の領収書一覧を取得
func (s *expenseService) GetExpenseReceipts(ctx context.Context, expenseID uuid.UUID, userID uuid.UUID) ([]dto.ExpenseReceiptDTO, error) {
	// 経費申請の存在確認と権限チェック
	expense, err := s.expenseRepo.GetByID(ctx, expenseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
		}
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
	}

	// 権限チェック
	if expense.UserID != userID {
		return nil, dto.NewExpenseError(dto.ErrCodeForbidden, "この経費申請の領収書を閲覧する権限がありません")
	}

	// 領収書を取得
	receipts, err := s.receiptRepo.GetByExpenseID(ctx, expenseID)
	if err != nil {
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
	}

	// DTOに変換
	receiptDTOs := make([]dto.ExpenseReceiptDTO, len(receipts))
	for i, receipt := range receipts {
		receiptDTOs[i] = dto.ExpenseReceiptDTO{
			ID:           receipt.ID,
			ExpenseID:    receipt.ExpenseID,
			ReceiptURL:   receipt.ReceiptURL,
			S3Key:        receipt.S3Key,
			FileName:     receipt.FileName,
			FileSize:     receipt.FileSize,
			ContentType:  receipt.ContentType,
			DisplayOrder: receipt.DisplayOrder,
			CreatedAt:    receipt.CreatedAt,
			UpdatedAt:    receipt.UpdatedAt,
		}
	}

	return receiptDTOs, nil
}

// DeleteExpenseReceipt 経費申請の領収書を削除
func (s *expenseService) DeleteExpenseReceipt(ctx context.Context, expenseID uuid.UUID, receiptID uuid.UUID, userID uuid.UUID) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 経費申請の存在確認と権限チェック
		expense, err := s.expenseRepo.GetByID(ctx, expenseID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
			}
			return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
		}

		// 権限チェック
		if expense.UserID != userID {
			return dto.NewExpenseError(dto.ErrCodeForbidden, "この経費申請の領収書を削除する権限がありません")
		}

		// ステータスチェック
		if expense.Status != model.ExpenseStatusDraft {
			return dto.NewExpenseError(dto.ErrCodeInvalidStatus, "下書き状態の経費申請のみ領収書を削除できます")
		}

		// 領収書の存在確認
		receipt, err := s.receiptRepo.GetByID(ctx, receiptID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "領収書が見つかりません")
			}
			return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
		}

		// 領収書が該当の経費申請に属しているか確認
		if receipt.ExpenseID != expenseID {
			return dto.NewExpenseError(dto.ErrCodeForbidden, "指定された領収書はこの経費申請に属していません")
		}

		// 領収書が1つしかない場合は削除不可
		receipts, err := s.receiptRepo.GetByExpenseID(ctx, expenseID)
		if err != nil {
			return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
		}
		if len(receipts) <= 1 {
			return dto.NewExpenseError(dto.ErrCodeInvalidOperation, "最後の領収書は削除できません")
		}

		// S3から削除
		if err := s.s3Service.DeleteFile(ctx, receipt.S3Key); err != nil {
			s.logger.Error("Failed to delete file from S3", zap.Error(err), zap.String("s3_key", receipt.S3Key))
			// S3削除エラーは続行
		}

		// 領収書を削除
		txReceiptRepo := repository.NewExpenseReceiptRepository(tx, s.logger)
		if err := txReceiptRepo.Delete(ctx, receiptID); err != nil {
			return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の削除に失敗しました")
		}

		// 表示順序を再調整
		remainingReceipts, err := txReceiptRepo.GetByExpenseID(ctx, expenseID)
		if err != nil {
			return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
		}

		for i, r := range remainingReceipts {
			if err := txReceiptRepo.UpdateDisplayOrder(ctx, r.ID, i+1); err != nil {
				return dto.NewExpenseError(dto.ErrCodeInternalError, "表示順序の更新に失敗しました")
			}
		}

		// 監査ログ記録
		resourceID := expenseID.String()
		s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       userID,
			Action:       model.AuditActionExpenseDelete,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceID,
			Method:       "DELETE",
			Path:         fmt.Sprintf("/api/v1/expenses/%s/receipts/%s", expenseID.String(), receiptID.String()),
			StatusCode:   200,
		})

		return nil
	})
}

// UpdateReceiptOrder 領収書の表示順序を更新
func (s *expenseService) UpdateReceiptOrder(ctx context.Context, expenseID uuid.UUID, userID uuid.UUID, req *dto.UpdateReceiptOrderRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 経費申請の存在確認と権限チェック
		expense, err := s.expenseRepo.GetByID(ctx, expenseID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "経費申請が見つかりません")
			}
			return dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請の取得に失敗しました")
		}

		// 権限チェック
		if expense.UserID != userID {
			return dto.NewExpenseError(dto.ErrCodeForbidden, "この経費申請の領収書順序を変更する権限がありません")
		}

		// ステータスチェック
		if expense.Status != model.ExpenseStatusDraft {
			return dto.NewExpenseError(dto.ErrCodeInvalidStatus, "下書き状態の経費申請のみ領収書順序を変更できます")
		}

		// 全ての領収書が該当の経費申請に属しているか確認
		txReceiptRepo := repository.NewExpenseReceiptRepository(tx, s.logger)
		for _, order := range req.Orders {
			receipt, err := txReceiptRepo.GetByID(ctx, order.ReceiptID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return dto.NewExpenseError(dto.ErrCodeExpenseNotFound, "領収書が見つかりません")
				}
				return dto.NewExpenseError(dto.ErrCodeInternalError, "領収書の取得に失敗しました")
			}
			if receipt.ExpenseID != expenseID {
				return dto.NewExpenseError(dto.ErrCodeForbidden, "指定された領収書はこの経費申請に属していません")
			}
		}

		// 表示順序を更新
		for _, order := range req.Orders {
			if err := txReceiptRepo.UpdateDisplayOrder(ctx, order.ReceiptID, order.DisplayOrder); err != nil {
				return dto.NewExpenseError(dto.ErrCodeInternalError, "表示順序の更新に失敗しました")
			}
		}

		return nil
	})
}

// GenerateReceiptUploadURL 領収書アップロード用のURLを生成
func (s *expenseService) GenerateReceiptUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateReceiptUploadURLRequest) (*dto.GenerateReceiptUploadURLResponse, error) {
	// ファイル名のバリデーション
	if strings.Contains(req.FileName, "..") || strings.Contains(req.FileName, "/") {
		return nil, dto.NewExpenseError(dto.ErrCodeInvalidRequest, "不正なファイル名です")
	}

	// S3キーを生成
	s3Key := fmt.Sprintf("receipts/%s/%s/%s", userID.String(), uuid.New().String(), req.FileName)

	// アップロードURLを生成
	uploadURL, headers, err := s.s3Service.GeneratePresignedUploadURL(ctx, s3Key, req.ContentType, time.Hour)
	if err != nil {
		s.logger.Error("Failed to generate upload URL", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "アップロードURLの生成に失敗しました")
	}

	return &dto.GenerateReceiptUploadURLResponse{
		UploadURL: uploadURL,
		S3Key:     s3Key,
		Headers:   headers,
	}, nil
}

// ExportExpensesCSV ユーザーの経費申請をCSVエクスポート
func (s *expenseService) ExportExpensesCSV(ctx context.Context, userID uuid.UUID, filter *dto.ExpenseExportRequest) ([]byte, error) {
	// デフォルト値設定
	if filter.DateFormat == "" {
		filter.DateFormat = "2006-01-02"
	}
	if filter.Language == "" {
		filter.Language = "ja"
	}

	// データ取得
	expenses, err := s.expenseRepo.GetByUserIDForExport(ctx, userID, filter)
	if err != nil {
		s.logger.Error("Failed to get expenses for CSV export", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請データの取得に失敗しました")
	}

	// CSV生成
	return s.generateCSV(ctx, expenses, filter, userID)
}

// ExportExpensesCSVAdmin 管理者用の経費申請CSVエクスポート
func (s *expenseService) ExportExpensesCSVAdmin(ctx context.Context, filter *dto.ExpenseExportRequest) ([]byte, error) {
	// 管理者のユーザーIDをコンテキストから取得（監査ログ用）
	var adminUserID uuid.UUID
	if userIDValue := ctx.Value("user_id"); userIDValue != nil {
		if uid, ok := userIDValue.(uuid.UUID); ok {
			adminUserID = uid
		}
	}

	// デフォルト値設定
	if filter.DateFormat == "" {
		filter.DateFormat = "2006-01-02"
	}
	if filter.Language == "" {
		filter.Language = "ja"
	}

	// データ取得
	expenses, err := s.expenseRepo.GetAllForExport(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to get all expenses for CSV export", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "経費申請データの取得に失敗しました")
	}

	// CSV生成
	return s.generateCSV(ctx, expenses, filter, adminUserID)
}

// generateCSV CSV生成処理
func (s *expenseService) generateCSV(ctx context.Context, expenses []*model.Expense, filter *dto.ExpenseExportRequest, userID uuid.UUID) ([]byte, error) {
	// CSVレコードのスライスを作成
	records := []dto.ExpenseCSVRecord{}

	for _, expense := range expenses {
		// 詳細情報を含むデータを作成
		expenseWithDetails := &model.ExpenseWithDetails{
			Expense: *expense,
		}

		// 詳細情報をロード
		if err := expenseWithDetails.LoadDetails(s.db); err != nil {
			s.logger.Warn("Failed to load expense details for CSV",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
		}

		// 領収書情報を取得
		var receipts []model.ExpenseReceipt
		if filter.IncludeReceipts {
			receiptList, err := s.receiptRepo.GetByExpenseID(ctx, expense.ID)
			if err != nil {
				s.logger.Warn("Failed to load receipts for CSV",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			} else {
				// ポインタスライスを値スライスに変換
				for _, r := range receiptList {
					receipts = append(receipts, *r)
				}
			}
		}

		// CSVレコードに変換
		record := dto.ToCSVRecord(expenseWithDetails, filter.DateFormat, filter.IncludeReceipts, filter.IncludeApprovals, receipts)

		// 部門情報を設定
		if expense.User.DepartmentRelation != nil {
			record.Department = expense.User.DepartmentRelation.Name
		} else if expense.User.Department != "" {
			record.Department = expense.User.Department
		}

		records = append(records, record)
	}

	// CSVバイト配列に変換
	buf := &bytes.Buffer{}

	// BOMを追加（ExcelでのUTF-8対応）
	if filter.Encoding == "UTF-8-BOM" || filter.Encoding == "" {
		buf.Write([]byte{0xEF, 0xBB, 0xBF})
	}

	// CSVライターを作成
	writer := csv.NewWriter(buf)
	writer.Comma = ','

	// ヘッダー行を書き込み
	if filter.Language == "en" {
		headers := []string{
			"Request ID", "Submitted Date", "Applicant", "Department",
			"Title", "Category", "Amount", "Expense Date", "Description", "Status",
			"Approved Date", "Approver", "Approval Step",
			"Rejected Date", "Rejector", "Rejection Reason",
		}
		if filter.IncludeReceipts {
			headers = append(headers, "Receipt Count", "Receipt URLs")
		}
		headers = append(headers, "Created At", "Updated At")
		writer.Write(headers)
	} else {
		headers := []string{
			"申請ID", "申請日", "申請者", "部門",
			"件名", "カテゴリ", "金額", "使用日", "使用理由", "ステータス",
			"承認日", "承認者", "承認ステップ",
			"却下日", "却下者", "却下理由",
		}
		if filter.IncludeReceipts {
			headers = append(headers, "領収書数", "領収書URL")
		}
		headers = append(headers, "作成日時", "更新日時")
		writer.Write(headers)
	}

	// データ行を書き込み
	for _, record := range records {
		row := []string{
			record.ID, record.SubmittedDate, record.UserName, record.Department,
			record.Title, record.Category, record.Amount, record.ExpenseDate, record.Description, record.Status,
			record.ApprovedDate, record.ApproverName, record.ApprovalStep,
			record.RejectedDate, record.RejectorName, record.RejectionReason,
		}
		if filter.IncludeReceipts {
			row = append(row, record.ReceiptCount, record.ReceiptURLs)
		}
		row = append(row, record.CreatedAt, record.UpdatedAt)
		writer.Write(row)
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		s.logger.Error("Failed to write CSV", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "CSV生成に失敗しました")
	}

	// 監査ログ記録
	s.auditService.LogActivity(ctx, LogActivityParams{
		UserID:       userID,
		Action:       model.AuditActionDataExport,
		ResourceType: model.ResourceTypeExpense,
		Method:       "GET",
		Path:         "/api/v1/expenses/export",
		StatusCode:   200,
		RequestBody:  filter,
	})

	return buf.Bytes(), nil
}

// ========================================
// 期限管理機能
// ========================================

// ProcessExpiredExpenses 期限切れ経費を処理
func (s *expenseService) ProcessExpiredExpenses(ctx context.Context) error {
	now := time.Now()

	// 期限切れになるべき経費申請を取得
	expenses, err := s.expenseRepo.GetExpiredExpenses(ctx, now)
	if err != nil {
		s.logger.Error("Failed to get expired expenses", zap.Error(err))
		return err
	}

	s.logger.Info("Processing expired expenses", zap.Int("count", len(expenses)))

	// 各経費申請を期限切れにする
	for _, expense := range expenses {
		if err := s.processExpiredExpense(ctx, expense); err != nil {
			s.logger.Error("Failed to process expired expense",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
			continue
		}
	}

	return nil
}

// processExpiredExpense 個別の期限切れ経費を処理
func (s *expenseService) processExpiredExpense(ctx context.Context, expense *model.Expense) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// トランザクション用のリポジトリを作成
		txExpenseRepo := repository.NewExpenseRepository(tx, s.logger)

		// 期限切れとしてマーク
		if err := txExpenseRepo.MarkAsExpired(ctx, expense.ID); err != nil {
			return err
		}

		// 通知送信
		if !expense.ExpiryNotificationSent {
			notification := &model.Notification{
				Title:            "経費申請が期限切れになりました",
				Message:          fmt.Sprintf("経費申請「%s」（金額: %d円）が期限切れになりました。", expense.Title, expense.Amount),
				NotificationType: "expense_expired",
				Priority:         model.NotificationPriorityHigh,
				ExpiresAt:        nil, // 期限なし
				ReferenceID:      &expense.ID,
				ReferenceType:    stringPtr("expense"),
			}

			if err := s.notificationService.CreateNotification(ctx, notification); err != nil {
				s.logger.Error("Failed to send expiry notification",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			}

			// ユーザーへの通知割り当て
			userNotification := &model.UserNotification{
				UserID:         expense.UserID,
				NotificationID: notification.ID,
			}
			if err := s.db.Create(userNotification).Error; err != nil {
				s.logger.Error("Failed to create user notification",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			}

			// 通知送信済みフラグを更新
			if err := txExpenseRepo.MarkExpiryNotificationSent(ctx, expense.ID); err != nil {
				s.logger.Error("Failed to mark expiry notification sent",
					zap.Error(err),
					zap.String("expense_id", expense.ID.String()))
			}
		}

		// 監査ログ記録
		resourceID := expense.ID.String()
		s.auditService.LogActivity(ctx, LogActivityParams{
			UserID:       expense.UserID,
			Action:       model.AuditActionExpenseExpired,
			ResourceType: model.ResourceTypeExpense,
			ResourceID:   &resourceID,
			Method:       "SYSTEM",
			Path:         "/system/expense-expiry",
			StatusCode:   200,
		})

		return nil
	})
}

// ProcessExpenseReminders リマインダーを処理
func (s *expenseService) ProcessExpenseReminders(ctx context.Context) error {
	// グローバル設定を取得
	globalSetting, err := s.deadlineRepo.GetGlobalSetting(ctx)
	if err != nil {
		s.logger.Error("Failed to get global deadline setting", zap.Error(err))
		return err
	}

	// リマインダー日付を計算（現在日時 + リマインダー日数）
	reminderDate := time.Now().AddDate(0, 0, globalSetting.ReminderDaysBefore)

	// リマインダーが必要な経費申請を取得
	expenses, err := s.expenseRepo.GetExpensesNeedingReminder(ctx, reminderDate)
	if err != nil {
		s.logger.Error("Failed to get expenses needing reminder", zap.Error(err))
		return err
	}

	s.logger.Info("Processing expense reminders", zap.Int("count", len(expenses)))

	// 各経費申請にリマインダーを送信
	for _, expense := range expenses {
		if err := s.sendExpenseReminder(ctx, expense); err != nil {
			s.logger.Error("Failed to send expense reminder",
				zap.Error(err),
				zap.String("expense_id", expense.ID.String()))
			continue
		}
	}

	return nil
}

// sendExpenseReminder 個別のリマインダーを送信
func (s *expenseService) sendExpenseReminder(ctx context.Context, expense *model.Expense) error {
	// 期限までの日数を計算
	daysUntilDeadline := int(time.Until(*expense.DeadlineAt).Hours() / 24)

	// 通知を作成
	notification := &model.Notification{
		RecipientID:      &expense.UserID,
		Title:            "経費申請の期限が近づいています",
		Message:          fmt.Sprintf("経費申請「%s」の期限まであと%d日です。早めの処理をお願いします。", expense.Title, daysUntilDeadline),
		NotificationType: model.NotificationTypeExpense,
		Priority:         model.NotificationPriorityNormal,
		Status:           model.NotificationStatusUnread,
		ReferenceID:      &expense.ID,
		ReferenceType:    stringPtr("expense_deadline_reminder"),
		Metadata: &model.NotificationMetadata{
			AdditionalData: map[string]interface{}{
				"expense_id":          expense.ID.String(),
				"expense_title":       expense.Title,
				"days_until_deadline": daysUntilDeadline,
			},
		},
	}

	if err := s.notificationService.CreateNotification(ctx, notification); err != nil {
		return err
	}

	// リマインダー送信済みフラグを更新
	if err := s.expenseRepo.MarkReminderSent(ctx, expense.ID); err != nil {
		return err
	}

	return nil
}

// GetDeadlineSettings 期限設定一覧を取得
func (s *expenseService) GetDeadlineSettings(ctx context.Context) ([]*model.ExpenseDeadlineSetting, error) {
	settings, err := s.deadlineRepo.List(ctx)
	if err != nil {
		s.logger.Error("Failed to get deadline settings", zap.Error(err))
		return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "期限設定の取得に失敗しました")
	}
	return settings, nil
}

// UpdateDeadlineSetting 期限設定を更新
func (s *expenseService) UpdateDeadlineSetting(ctx context.Context, setting *model.ExpenseDeadlineSetting) error {
	if err := s.deadlineRepo.Update(ctx, setting); err != nil {
		s.logger.Error("Failed to update deadline setting",
			zap.Error(err),
			zap.String("setting_id", setting.ID.String()))
		return dto.NewExpenseError(dto.ErrCodeInternalError, "期限設定の更新に失敗しました")
	}

	// 監査ログ記録
	resourceID := setting.ID.String()
	s.auditService.LogActivity(ctx, LogActivityParams{
		UserID:       setting.CreatedBy,
		Action:       model.AuditActionUpdate,
		ResourceType: model.ResourceTypeExpense,
		ResourceID:   &resourceID,
		Method:       "PUT",
		Path:         fmt.Sprintf("/api/v1/admin/expense-deadline-settings/%s", setting.ID.String()),
		StatusCode:   200,
		RequestBody:  setting,
	})

	return nil
}

// CreateDeadlineSetting 期限設定を作成
func (s *expenseService) CreateDeadlineSetting(ctx context.Context, setting *model.ExpenseDeadlineSetting) error {
	if err := s.deadlineRepo.Create(ctx, setting); err != nil {
		s.logger.Error("Failed to create deadline setting", zap.Error(err))
		return dto.NewExpenseError(dto.ErrCodeInternalError, "期限設定の作成に失敗しました")
	}

	// 監査ログ記録
	resourceID := setting.ID.String()
	s.auditService.LogActivity(ctx, LogActivityParams{
		UserID:       setting.CreatedBy,
		Action:       model.AuditActionCreate,
		ResourceType: model.ResourceTypeExpense,
		ResourceID:   &resourceID,
		Method:       "POST",
		Path:         "/api/v1/admin/expense-deadline-settings",
		StatusCode:   201,
		RequestBody:  setting,
	})

	return nil
}

// DeleteDeadlineSetting 期限設定を削除
func (s *expenseService) DeleteDeadlineSetting(ctx context.Context, id uuid.UUID) error {
	if err := s.deadlineRepo.Delete(ctx, id); err != nil {
		s.logger.Error("Failed to delete deadline setting",
			zap.Error(err),
			zap.String("setting_id", id.String()))
		return dto.NewExpenseError(dto.ErrCodeInternalError, "期限設定の削除に失敗しました")
	}

	// 監査ログ記録
	resourceID := id.String()
	userID := uuid.UUID{} // TODO: 実際の実装では認証情報から取得
	s.auditService.LogActivity(ctx, LogActivityParams{
		UserID:       userID,
		Action:       model.AuditActionDelete,
		ResourceType: model.ResourceTypeExpense,
		ResourceID:   &resourceID,
		Method:       "DELETE",
		Path:         fmt.Sprintf("/api/v1/admin/expense-deadline-settings/%s", id.String()),
		StatusCode:   200,
	})

	return nil
}
