package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/duesk/monstera/internal/batch"
	"github.com/duesk/monstera/internal/cache"
	"github.com/duesk/monstera/internal/common/logger"
	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/middleware"
	"github.com/duesk/monstera/internal/model"
	internalRepo "github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/routes"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/utils"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// 設定の読み込み
	cfg, err := config.Load(".env")
	if err != nil {
		fmt.Printf("Error loading configuration: %v\n", err)
		os.Exit(1)
	}

	// ロガーの初期化
	logger, err := logger.InitLogger(gin.Mode() == gin.ReleaseMode)
	if err != nil {
		fmt.Printf("Error initializing logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Ginのモードを設定
	if gin.Mode() == gin.ReleaseMode {
		gin.SetMode(gin.ReleaseMode)
	}

	// デバッグログ追加
	logger.Info("Starting application with debug logging enabled")
	logger.Info("Environment variables",
		zap.String("GO_ENV", os.Getenv("GO_ENV")),
		zap.String("USE_MOCK_S3", os.Getenv("USE_MOCK_S3")),
		zap.String("AWS_REGION", os.Getenv("AWS_REGION")),
		zap.String("AWS_S3_BUCKET_NAME", os.Getenv("AWS_S3_BUCKET_NAME")))

	// データベース接続
	db, err := config.InitDatabase(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	// Redisクライアントの初期化
	redisClient, err := cache.NewRedisClient(&cfg.Redis, logger)
	if err != nil {
		logger.Error("Failed to initialize Redis client", zap.Error(err))
		// Redisが利用できない場合もアプリケーションは続行
	}

	// キャッシュマネージャーの初期化
	cacheManager := cache.NewCacheManager(redisClient, logger)
	defer func() {
		if cacheManager != nil {
			if err := cacheManager.Close(); err != nil {
				logger.Error("Failed to close cache manager", zap.Error(err))
			}
		}
	}()

	// データベースマイグレーション - 一時的に無効化
	/*
		if err := config.MigrateDatabase(db, logger); err != nil {
			logger.Fatal("Failed to migrate database", zap.Error(err))
		}
	*/

	// リポジトリの作成
	userRepo := internalRepo.NewUserRepository(db)
	// デバッグ: ユーザーリポジトリ作成の確認
	logger.Info("User repository created")
	// ロガーをユーザーリポジトリに設定
	userRepo.SetLogger(logger)
	sessionRepo := internalRepo.NewSessionRepository(db, logger)
	profileRepo := internalRepo.NewProfileRepository(db)
	reportRepo := internalRepo.NewWeeklyReportRepository(db, logger)
	workHoursRepo := internalRepo.NewWorkHoursRepository(db)
	dailyRecordRepo := internalRepo.NewDailyRecordRepository(db, logger)
	leaveRepo := internalRepo.NewLeaveRepository(db, logger)
	// 通知リポジトリを追加
	notificationRepo := internalRepo.NewNotificationRepository(db, logger)
	// 週報管理リファクタリングリポジトリを追加
	weeklyReportRefactoredRepo := internalRepo.NewWeeklyReportRefactoredRepository(db, logger)
	departmentRepo := internalRepo.NewDepartmentRepository(db)
	reminderSettingsRepo := internalRepo.NewReminderSettingsRepository(db)

	// BaseRepositoryの作成（共通リポジトリ）
	commonBaseRepo := repository.NewBaseRepository(db, logger)
	internalBaseRepo := internalRepo.NewBaseRepository(db, logger)
	// 新しい技術関連リポジトリを追加
	techCategoryRepo := internalRepo.NewTechnologyCategoryRepository(commonBaseRepo)
	workHistoryTechRepo := internalRepo.NewWorkHistoryTechnologyRepository(commonBaseRepo)
	// 管理者用リポジトリを追加
	rolePermissionRepo := internalRepo.NewRolePermissionRepository(internalBaseRepo)
	// ビジネス系リポジトリを追加
	clientRepo := internalRepo.NewClientRepository(internalBaseRepo)
	invoiceRepo := internalRepo.NewInvoiceRepository(internalBaseRepo)
	salesActivityRepo := internalRepo.NewSalesActivityRepository(internalBaseRepo)
	// プロジェクトリポジトリを追加
	projectRepo := internalRepo.NewProjectRepository(internalBaseRepo)
	// エンジニアリポジトリを追加
	engineerRepo := internalRepo.NewEngineerRepository(db, logger)
	// スキルシートリポジトリを追加
	skillSheetRepo := internalRepo.NewSkillSheetRepository(commonBaseRepo)
	// セッションリポジトリを追加
	// TODO: SessionRepository implementation is pending
	// sessionRepo := internalRepo.NewSessionRepository(db, logger)
	// 休暇申請管理用リポジトリを追加
	leaveRequestRepo := internalRepo.NewLeaveRequestRepository(db, logger)
	// leaveAdminRepo := internalRepo.NewLeaveRequestAdminRepository(db, logger) // TODO: 実装予定
	// userLeaveBalanceRepo := internalRepo.NewUserLeaveBalanceRepository(db, logger) // TODO: 使用予定

	// 経費申請管理用リポジトリを追加
	expenseRepo := internalRepo.NewExpenseRepository(db, logger)
	expenseDeadlineSettingRepo := internalRepo.NewExpenseDeadlineSettingRepository(db, logger)
	expenseCategoryRepo := internalRepo.NewExpenseCategoryRepository(db, logger)
	expenseLimitRepo := internalRepo.NewExpenseLimitRepository(db, logger)
	expenseApprovalRepo := internalRepo.NewExpenseApprovalRepository(db, logger)
	expenseApproverSettingRepo := internalRepo.NewExpenseApproverSettingRepository(db, logger)

	// 営業関連リポジトリを追加
	proposalRepo := internalRepo.NewProposalRepository(internalBaseRepo)
	contractExtensionRepo := internalRepo.NewContractExtensionRepository(internalBaseRepo)
	interviewScheduleRepo := internalRepo.NewInterviewScheduleRepository(internalBaseRepo)
	emailCampaignRepo := internalRepo.NewEmailCampaignRepository(internalBaseRepo)
	pocProjectRepo := internalRepo.NewPocProjectRepository(internalBaseRepo)
	salesTeamRepo := internalRepo.NewSalesTeamRepository(internalBaseRepo)
	// エンジニア提案関連リポジトリを追加
	engineerProposalRepo := internalRepo.NewEngineerProposalRepository(db, logger)
	engineerProposalQuestionRepo := internalRepo.NewEngineerProposalQuestionRepository(db, logger)
	pocProjectRefRepo := internalRepo.NewPocProjectRefRepository(db, logger)
	emailTemplateRepo := internalRepo.NewEmailTemplateRepository(internalBaseRepo)

	// 監査ログリポジトリを追加
	auditLogRepo := internalRepo.NewAuditLogRepository(db, logger)

	// 職務経歴関連リポジトリを追加
	technologyMasterRepo := internalRepo.NewTechnologyMasterRepository(db, logger)
	technologyMasterEnhancedRepo := internalRepo.NewTechnologyMasterEnhancedRepository(db, logger)
	workHistoryRepo := internalRepo.NewWorkHistoryRepository(db, logger)
	workHistoryEnhancedRepo := internalRepo.NewWorkHistoryEnhancedRepository(commonBaseRepo)

	// サービスの作成
	var authSvc service.AuthService
	// Cognito認証サービスは常に作成する（有効/無効は内部で判定）
	if true {
		if !cfg.Cognito.Enabled {
			logger.Info("開発モード（COGNITO_ENABLEDがfalse）が有効です")
		} else {
			logger.Info("Cognito認証が有効です")
		}
		cognitoAuthSvc, err := service.NewCognitoAuthService(
			cfg,
			db,
			userRepo,
			sessionRepo,
			logger,
		)
		if err != nil {
			logger.Fatal("Cognito認証サービスの作成に失敗しました", zap.Error(err))
		}
		authSvc = cognitoAuthSvc
	} else {
		logger.Fatal("Cognito認証が無効になっています。Cognito認証を有効にしてください。")
	}
	// デバッグ: 認証サービス作成の確認
	logger.Info("Auth service created")
	profileService := service.NewProfileService(profileRepo, userRepo, techCategoryRepo, workHistoryTechRepo, db, logger)
	// スキルシートサービスを追加
	skillSheetService := service.NewSkillSheetService(profileRepo, userRepo, techCategoryRepo, workHistoryTechRepo, db, logger)
	// 職務経歴関連サービスを追加
	workHistoryEnhancedService := service.NewWorkHistoryEnhancedService(db, workHistoryEnhancedRepo, workHistoryTechRepo, technologyMasterRepo, logger)
	technologySuggestionService := service.NewTechnologySuggestionService(db, technologyMasterEnhancedRepo, workHistoryRepo, logger)
	reportService := service.NewWeeklyReportService(db, reportRepo, workHoursRepo, dailyRecordRepo, logger)
	leaveService := service.NewLeaveService(db, leaveRepo, userRepo, logger)
	// 通知サービスを追加
	notificationService := service.NewNotificationService(db, logger)

	// アラート関連リポジトリ
	alertHistoryRepo := internalRepo.NewAlertHistoryRepository(db, logger)
	alertSettingsRepo := internalRepo.NewAlertSettingsRepository(db, logger)
	// notificationHistoryRepo := internalRepo.NewNotificationHistoryRepository(db, logger) // TODO: 使用予定

	// アラートリポジトリを作成（AlertRepositoryインターフェースの実装）
	alertRepo := internalRepo.NewAlertRepository(db, logger)

	// 拡張通知サービス（将来的に使用予定）
	// enhancedNotificationService := service.NewEnhancedNotificationService(
	// 	db,
	// 	notificationRepo,
	// 	alertRepo,
	// 	alertHistoryRepo,
	// 	alertSettingsRepo,
	// 	notificationHistoryRepo,
	// 	logger,
	// )

	// メール・Slack通知サービス
	emailService, err := service.NewEmailService(&cfg.Email, logger)
	if err != nil {
		logger.Error("Failed to initialize email service", zap.Error(err))
		// メールサービスの初期化に失敗してもアプリケーションは継続
	}

	// slackService := service.NewSlackService(&cfg.Slack, logger) // TODO: 使用予定

	// DatabaseUtilsの初期化（メトリクスハンドラー用にsetupRouter内で使用）
	// dbUtils := utils.NewDatabaseUtils(db)

	// 管理者メールアドレスとSlackチャンネルの取得（将来的に使用予定）
	// adminEmails := []string{}
	// if emails := os.Getenv("ADMIN_EMAILS"); emails != "" {
	// 	adminEmails = strings.Split(emails, ",")
	// }
	// adminSlackChannel := os.Getenv("ADMIN_SLACK_CHANNEL")

	// 統合通知サービスは enhancedNotificationService を使用
	// integratedNotificationService := enhancedNotificationService
	// 管理者用サービスを追加
	adminWeeklyReportService := service.NewAdminWeeklyReportService(db, *reportRepo, userRepo, departmentRepo, cacheManager, logger)
	adminDashboardService := service.NewAdminDashboardService(db, logger)
	// ビジネス系サービスを追加
	clientService := service.NewClientService(db, clientRepo, logger)
	invoiceService := service.NewInvoiceService(db, invoiceRepo, clientRepo, projectRepo, userRepo, logger)
	salesService := service.NewSalesService(db, salesActivityRepo, clientRepo, projectRepo, userRepo, logger)
	// エンジニアサービスを追加
	engineerService := service.NewEngineerService(db, engineerRepo, userRepo, *reportRepo, expenseRepo, leaveRequestRepo, logger)
	// スキルシートPDFサービスを追加
	skillSheetPDFService := service.NewSkillSheetPDFServiceV2(db, userRepo, profileRepo, skillSheetRepo, logger)
	// 休暇申請管理サービスを追加
	// leaveAdminService := service.NewLeaveAdminService(db, leaveRequestRepo, leaveAdminRepo, userLeaveBalanceRepo, notificationService, logger) // TODO: 実装予定
	// エクスポートサービスを追加
	exportDir := os.Getenv("EXPORT_DIR")
	if exportDir == "" {
		exportDir = "./exports"
	}
	exportURLPrefix := os.Getenv("EXPORT_URL_PREFIX")
	if exportURLPrefix == "" {
		exportURLPrefix = "/exports"
	}
	exportService := service.NewExportService(db, logger)
	// 未提出者管理サービスを追加
	unsubmittedReportService := service.NewUnsubmittedReportService(db, weeklyReportRefactoredRepo, userRepo, departmentRepo, notificationRepo, reminderSettingsRepo, logger)
	// リマインドバッチサービスを追加
	reminderBatchService := service.NewReminderBatchService(db, weeklyReportRefactoredRepo, userRepo, notificationRepo, reminderSettingsRepo, logger)

	// アラートサービス
	alertService := service.NewAlertService(
		db,
		alertRepo,
		alertHistoryRepo,
		alertSettingsRepo,
		*reportRepo,
		userRepo,
		logger,
	)

	// アラート検知バッチサービス
	alertDetectionBatchService := service.NewAlertDetectionBatchService(
		db,
		alertService,
		*reportRepo,
		userRepo,
		alertSettingsRepo,
		alertHistoryRepo,
		logger,
	)

	// 営業関連サービスを追加
	proposalService := service.NewProposalService(db, engineerProposalRepo, engineerProposalQuestionRepo, pocProjectRefRepo, userRepo, salesTeamRepo, notificationService, logger)
	// contractExtensionService := service.NewContractExtensionService(db, contractExtensionRepo, userRepo, logger) // TODO: ハンドラー実装時に使用
	// interviewScheduleService := service.NewInterviewScheduleService(db, interviewScheduleRepo, proposalRepo, logger) // TODO: ハンドラー実装時に使用
	salesEmailService := service.NewSalesEmailService(db, emailTemplateRepo, emailCampaignRepo, proposalRepo, interviewScheduleRepo, contractExtensionRepo, userRepo, clientRepo, emailService, logger)
	pocSyncService := service.NewPocSyncService(db, pocProjectRepo, projectRepo, proposalRepo, logger)
	salesTeamService := service.NewSalesTeamService(db, salesTeamRepo, userRepo, logger)

	// 監査ログサービスを追加
	auditLogService := service.NewAuditLogService(db, logger, auditLogRepo)

	// アーカイブサービスを追加
	archiveService := service.NewArchiveService(db, logger)

	// S3サービスを先に初期化
	var s3Service service.S3Service
	logger.Info("Initializing S3 service",
		zap.Bool("use_mock", os.Getenv("USE_MOCK_S3") == "true"),
		zap.Bool("is_development", os.Getenv("GO_ENV") == "development"),
		zap.String("endpoint", os.Getenv("AWS_S3_ENDPOINT")))

	if os.Getenv("USE_MOCK_S3") == "true" {
		// モックS3サービスを使用
		logger.Info("Using mock S3 service")
		s3Service = service.NewMockS3Service(logger)
	} else {
		// 実際のS3サービスまたはMinIOを使用
		bucketName := os.Getenv("AWS_S3_BUCKET_NAME")
		if bucketName == "" {
			bucketName = "monstera-files"
		}

		region := os.Getenv("AWS_REGION")
		if region == "" {
			region = "us-east-1"
		}

		baseURL := os.Getenv("AWS_S3_BASE_URL")

		s3Svc, err := service.NewS3Service(bucketName, region, baseURL, logger)
		if err != nil {
			logger.Error("Failed to initialize S3 service",
				zap.Error(err),
				zap.String("bucket", bucketName),
				zap.String("region", region),
				zap.String("base_url", baseURL),
				zap.String("endpoint", os.Getenv("AWS_S3_ENDPOINT")),
				zap.String("aws_access_key_id", os.Getenv("AWS_ACCESS_KEY_ID")),
				zap.Bool("path_style", os.Getenv("AWS_S3_PATH_STYLE") == "true"),
				zap.Bool("disable_ssl", os.Getenv("AWS_S3_DISABLE_SSL") == "true"))
			// S3サービスの初期化に失敗したらモックを使用
			logger.Warn("Falling back to mock S3 service")
			s3Service = service.NewMockS3Service(logger)
		} else {
			logger.Info("S3 service initialized successfully",
				zap.String("bucket", bucketName),
				zap.String("region", region),
				zap.String("endpoint", os.Getenv("AWS_S3_ENDPOINT")))
			s3Service = s3Svc
		}
	}

	// 経費申請サービスを追加（s3Service, notificationService, userRepo, cacheManager, auditLogServiceを含む）
	// 経費領収書リポジトリを初期化
	expenseReceiptRepo := internalRepo.NewExpenseReceiptRepository(db, logger)

	expenseService := service.NewExpenseService(db, expenseRepo, expenseCategoryRepo, expenseLimitRepo, expenseApprovalRepo, expenseReceiptRepo, expenseDeadlineSettingRepo, s3Service, notificationService, userRepo, cacheManager, auditLogService, logger)
	// 経費承認者設定サービスを追加
	expenseApproverSettingService := service.NewExpenseApproverSettingService(db, expenseApproverSettingRepo, userRepo, logger)
	// スケジューラーサービスを追加
	schedulerService := service.NewSchedulerService(logger)

	// ハンドラーの作成
	authHandler := handler.NewAuthHandler(cfg, authSvc, logger)
	profileHandler := handler.NewProfileHandler(cfg, profileService, logger)
	// スキルシートハンドラーを追加
	skillSheetHandler := handler.NewSkillSheetHandler(cfg, skillSheetService, logger)
	reportHandler := handler.NewWeeklyReportHandler(reportService, logger)
	leaveHandler := handler.NewLeaveHandler(leaveService, logger)
	// 通知ハンドラーを追加
	notificationHandler := handler.NewNotificationHandler(notificationService, *reportRepo, userRepo, departmentRepo, logger)
	// 管理者用ハンドラーを追加
	adminWeeklyReportHandler := handler.NewAdminWeeklyReportHandler(adminWeeklyReportService, exportService, logger)
	adminDashboardHandler := handler.NewAdminDashboardHandler(adminDashboardService, logger)
	// ビジネス系ハンドラーを追加
	clientHandler := handler.NewClientHandler(clientService, logger)
	invoiceHandler := handler.NewInvoiceHandler(invoiceService, logger)
	salesHandler := handler.NewSalesHandler(salesService, logger)
	// エンジニアハンドラーを追加
	engineerHandler := handler.NewAdminEngineerHandler(engineerService, logger)
	// スキルシートPDFハンドラーを追加
	skillSheetPDFHandler := handler.NewSkillSheetPDFHandler(skillSheetPDFService, logger)
	// ユーザーロールハンドラーを追加
	userRoleHandler := handler.NewUserRoleHandler(userRepo, logger)
	// 休暇申請管理サービスとハンドラーを追加
	// 必要なリポジトリを作成
	leaveAdminRepo := internalRepo.NewLeaveRequestAdminRepository(db, logger)
	userLeaveBalanceRepo := internalRepo.NewUserLeaveBalanceRepository(db, logger)
	leaveAdminService := service.NewLeaveAdminService(db, leaveRequestRepo, leaveAdminRepo, userLeaveBalanceRepo, logger)
	leaveAdminHandler := handler.NewLeaveAdminHandler(leaveAdminService, logger)
	// 未提出者管理ハンドラーを追加
	// unsubmittedReportHandler := handler.NewUnsubmittedReportHandler(unsubmittedReportService, logger)
	// リマインドハンドラーを追加
	reminderHandler := handler.NewReminderHandler(unsubmittedReportService, reminderBatchService, logger)
	// アラート設定ハンドラー
	alertSettingsHandler := handler.NewAlertSettingsHandler(alertSettingsRepo, alertHistoryRepo, alertService, logger)
	// アラートハンドラー
	alertHandler := handler.NewAlertHandler(alertService, logger)

	// 営業関連ハンドラーを追加
	proposalHandler := handler.NewProposalHandler(proposalService, logger)
	contractExtensionHandler := handler.NewContractExtensionHandler(logger)
	interviewScheduleHandler := handler.NewInterviewScheduleHandler(logger)
	salesEmailHandler := handler.NewSalesEmailHandler(salesEmailService, salesTeamService, logger)
	pocSyncHandler := handler.NewPocSyncHandler(pocSyncService, logger)
	salesTeamHandler := handler.NewSalesTeamHandler(salesTeamService, logger)

	// 監査ログハンドラーを追加
	auditLogHandler := handler.NewAuditLogHandler(auditLogService, logger)

	// 経費申請ハンドラーを追加
	expenseHandler := handler.NewExpenseHandler(expenseService, s3Service, logger)
	// 経費申請PDFハンドラーを追加
	expensePDFHandler := handler.NewExpensePDFHandler(
		service.NewExpensePDFService(db, expenseRepo, userRepo, expenseCategoryRepo, logger),
		logger,
	)
	// 経費承認者設定ハンドラーを追加
	expenseApproverSettingHandler := handler.NewExpenseApproverSettingHandler(expenseApproverSettingService, logger)
	// 経費期限設定ハンドラーを追加
	// expenseDeadlineHandler := handler.NewExpenseDeadlineHandler(expenseService, logger) // setupRouter内で使用
	// 承認催促ハンドラーを追加
	approvalReminderHandler := handler.NewApprovalReminderHandler(schedulerService, expenseService, notificationService, logger)
	// 承認催促ハンドラーを初期化
	if err := approvalReminderHandler.Initialize(); err != nil {
		logger.Error("Failed to initialize approval reminder handler", zap.Error(err))
	}
	// 職務経歴ハンドラーを追加
	workHistoryHandler := handler.NewWorkHistoryHandler(workHistoryEnhancedService, technologySuggestionService, logger)
	// 未提出者管理ハンドラー（ダミー）
	unsubmittedReportHandler := &handler.UnsubmittedReportHandler{}

	// ルーターの設定
	salesHandlers := &routes.SalesHandlers{
		ProposalHandler:          proposalHandler,
		ContractExtensionHandler: *contractExtensionHandler,
		InterviewScheduleHandler: *interviewScheduleHandler,
		SalesEmailHandler:        salesEmailHandler,
		PocSyncHandler:           *pocSyncHandler,
		SalesTeamHandler:         *salesTeamHandler,
	}
	router := setupRouter(cfg, logger, authHandler, profileHandler, skillSheetHandler, reportHandler, leaveHandler, notificationHandler, adminWeeklyReportHandler, adminDashboardHandler, clientHandler, invoiceHandler, salesHandler, skillSheetPDFHandler, userRoleHandler, leaveAdminHandler, *unsubmittedReportHandler, reminderHandler, alertSettingsHandler, *alertHandler, auditLogHandler, salesHandlers, expenseHandler, expensePDFHandler, expenseApproverSettingHandler, approvalReminderHandler, workHistoryHandler, engineerHandler, rolePermissionRepo, userRepo, departmentRepo, reportRepo, weeklyReportRefactoredRepo, auditLogService)

	// HTTPサーバーの設定
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// バッチスケジューラーの作成と起動
	scheduler := batch.NewScheduler(
		db,
		notificationService,
		alertService,
		alertDetectionBatchService,
		archiveService,
		logger,
	)
	scheduler.Start()
	defer scheduler.Stop()

	// 経費申請期限処理バッチの起動
	expenseDeadlineProcessor := batch.NewExpenseDeadlineProcessor(expenseService, logger)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1時間ごとに実行
	go expenseDeadlineProcessor.Run(ctx, 1*time.Hour)

	// 期限切れセッションクリーンアップの停止チャネル
	cleanupStop := make(chan struct{})

	// 期限切れセッションの定期的なクリーンアップ
	go func() {
		ticker := time.NewTicker(1 * time.Hour) // 1時間ごとに実行
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				// ctx := context.Background() // TODO: uncomment when SessionRepository is implemented
				// TODO: uncomment when SessionRepository is implemented
				// deletedCount, err := sessionRepo.DeleteExpiredSessions(ctx)
				deletedCount := 0
				var err error
				if err != nil {
					logger.Error("Failed to delete expired sessions", zap.Error(err))
				} else if deletedCount > 0 {
					logger.Info("Deleted expired sessions", zap.Int("count", deletedCount))
				}
			case <-cleanupStop:
				logger.Info("Stopping session cleanup routine")
				return
			}
		}
	}()

	// サーバーの起動（ゴルーチンで非同期に）
	go func() {
		logger.Info("Starting server", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// シグナル処理（Ctrl+C等）
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	// クリーンアップゴルーチンの停止
	close(cleanupStop)

	// グレースフルシャットダウン
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited properly")
}

// setupRouter ルーターのセットアップ
func setupRouter(cfg *config.Config, logger *zap.Logger, authHandler *handler.AuthHandler, profileHandler *handler.ProfileHandler, skillSheetHandler *handler.SkillSheetHandler, reportHandler *handler.WeeklyReportHandler, leaveHandler handler.LeaveHandler, notificationHandler handler.NotificationHandler, adminWeeklyReportHandler handler.AdminWeeklyReportHandler, adminDashboardHandler handler.AdminDashboardHandler, clientHandler handler.ClientHandler, invoiceHandler handler.InvoiceHandler, salesHandler handler.SalesHandler, skillSheetPDFHandler handler.SkillSheetPDFHandler, userRoleHandler *handler.UserRoleHandler, leaveAdminHandler handler.LeaveAdminHandler, unsubmittedReportHandler handler.UnsubmittedReportHandler, reminderHandler handler.ReminderHandler, alertSettingsHandler *handler.AlertSettingsHandler, alertHandler handler.AlertHandler, auditLogHandler *handler.AuditLogHandler, salesHandlers *routes.SalesHandlers, expenseHandler *handler.ExpenseHandler, expensePDFHandler handler.ExpensePDFHandler, expenseApproverSettingHandler *handler.ExpenseApproverSettingHandler, approvalReminderHandler *handler.ApprovalReminderHandler, workHistoryHandler *handler.WorkHistoryHandler, engineerHandler handler.AdminEngineerHandler, rolePermissionRepo internalRepo.RolePermissionRepository, userRepo internalRepo.UserRepository, departmentRepo internalRepo.DepartmentRepository, reportRepo *internalRepo.WeeklyReportRepository, weeklyReportRefactoredRepo internalRepo.WeeklyReportRefactoredRepository, auditLogService service.AuditLogService) *gin.Engine {
	router := gin.New()

	// DatabaseUtilsの初期化（メトリクスハンドラー用）
	db := reportRepo.BaseRepository.GetDB()
	dbUtils := utils.NewDatabaseUtils(db)
	metricsHandler := handler.NewMetricsHandler(dbUtils, logger)

	// ミドルウェアの設定
	router.Use(gin.Recovery())
	router.Use(middleware.LoggerMiddleware(logger))

	// 監査ログミドルウェアの設定（重要なエンドポイントのみ）
	auditConfig := middleware.DefaultAuditLogConfig()
	router.Use(middleware.AuditLogMiddleware(auditLogService, logger, auditConfig))

	// CORSの設定
	corsConfig := cors.Config{
		AllowOrigins:     cfg.Cors.AllowOrigins,
		AllowMethods:     cfg.Cors.AllowMethods,
		AllowHeaders:     cfg.Cors.AllowHeaders,
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           cfg.Cors.MaxAge,
		AllowWildcard:    true,
	}
	router.Use(cors.New(corsConfig))

	// ルートパスのハンドラー
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Welcome to Monstera API",
		})
	})

	// ヘルスチェックエンドポイント
	router.GET("/health", metricsHandler.HealthCheck)
	router.GET("/ready", metricsHandler.ReadinessCheck)

	// エクスポートファイルの静的配信
	exportDir := os.Getenv("EXPORT_DIR")
	if exportDir == "" {
		exportDir = "./exports"
	}
	// エクスポートディレクトリの作成
	if err := os.MkdirAll(exportDir, 0755); err != nil {
		logger.Error("Failed to create export directory", zap.Error(err))
	}
	router.Static("/exports", exportDir)

	// 認証関連のエンドポイント
	// レートリミッターの作成
	rateLimiter := middleware.NewInMemoryRateLimiter(logger)

	// 認証ミドルウェアの初期化 - Cognito認証に統一
	logger.Info("Initializing CognitoAuthMiddleware",
		zap.Bool("Cognito.Enabled", cfg.Cognito.Enabled))
	cognitoMiddleware := middleware.NewCognitoAuthMiddleware(cfg, userRepo, logger)
	if cognitoMiddleware == nil {
		logger.Fatal("Failed to initialize CognitoAuthMiddleware")
	}
	authMiddlewareFunc := cognitoMiddleware.AuthRequired()
	if authMiddlewareFunc == nil {
		logger.Fatal("Failed to get AuthRequired function")
	}
	logger.Info("CognitoAuthMiddleware initialized successfully")

	if !cfg.Cognito.Enabled {
		logger.Warn("Cognito is disabled. Please enable Cognito authentication.")
	}

	api := router.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			// デバッグログの追加
			auth.POST("/register", func(c *gin.Context) {
				logger.Info("Register endpoint called")
				authHandler.Register(c)
			})
			// ログインエンドポイントにレート制限を適用（仕様書準拠）
			auth.POST("/login", middleware.LoginRateLimitMiddleware(rateLimiter), func(c *gin.Context) {
				logger.Info("Login endpoint called")
				// リクエストボディのログ記録部分を削除
				authHandler.Login(c)
			})
			auth.POST("/refresh", authHandler.RefreshToken)

			// 認証が必要なエンドポイント
			authRequired := auth.Group("/")
			authRequired.Use(authMiddlewareFunc)
			{
				authRequired.GET("/me", authHandler.Me)
				authRequired.POST("/logout", authHandler.Logout)
			}
		}

		// プロフィール関連のエンドポイント
		profile := api.Group("/profile")
		profile.Use(authMiddlewareFunc)
		{
			profile.GET("", profileHandler.GetProfile)
			profile.GET("/with-work-history", profileHandler.GetProfileWithWorkHistory)
			profile.POST("", profileHandler.SaveProfile)
			profile.POST("/temp-save", profileHandler.TempSaveProfile)
			profile.GET("/history", profileHandler.GetProfileHistory)
			profile.GET("/history/latest", profileHandler.GetProfileHistory)
			profile.GET("/common-certifications", profileHandler.GetCommonCertifications)
			profile.GET("/technology-categories", profileHandler.GetTechnologyCategories)
		}

		// スキルシート関連のエンドポイント
		skillSheet := api.Group("/skill-sheet")
		skillSheet.Use(authMiddlewareFunc)
		{
			skillSheet.GET("", skillSheetHandler.GetSkillSheet)
			skillSheet.PUT("", skillSheetHandler.SaveSkillSheet)
			skillSheet.POST("/temp-save", skillSheetHandler.TempSaveSkillSheet)
			skillSheet.GET("/pdf", skillSheetPDFHandler.GenerateSkillSheetPDF)
		}

		// 職務経歴関連のエンドポイント
		workHistory := api.Group("/work-history")
		workHistory.Use(authMiddlewareFunc)
		{
			// 基本CRUD
			workHistory.GET("", workHistoryHandler.GetWorkHistories)         // 一覧取得
			workHistory.GET("/:id", workHistoryHandler.GetWorkHistory)       // 個別取得
			workHistory.POST("", workHistoryHandler.CreateWorkHistory)       // 作成
			workHistory.PUT("/:id", workHistoryHandler.UpdateWorkHistory)    // 更新
			workHistory.DELETE("/:id", workHistoryHandler.DeleteWorkHistory) // 削除

			// 検索・エクスポート
			workHistory.GET("/search", workHistoryHandler.SearchWorkHistories)        // 検索
			workHistory.GET("/summary", workHistoryHandler.GetUserWorkHistorySummary) // ユーザーサマリー
			workHistory.GET("/export", workHistoryHandler.ExportWorkHistory)          // エクスポート
			workHistory.GET("/template", workHistoryHandler.GetWorkHistoryTemplate)   // テンプレート取得
		}

		// ユーザー関連のエンドポイント
		users := api.Group("/users")
		users.Use(authMiddlewareFunc)
		{
			// デフォルトロール更新
			users.PUT("/default-role", userRoleHandler.UpdateDefaultRole)
		}

		// 週報関連のエンドポイント
		weeklyReports := api.Group("/weekly-reports")
		weeklyReports.Use(authMiddlewareFunc)
		{
			weeklyReports.GET("", reportHandler.List)
			weeklyReports.GET("/by-date-range", reportHandler.GetWeeklyReportByDateRange)
			weeklyReports.GET("/:id", reportHandler.Get)
			weeklyReports.POST("", reportHandler.Create)
			weeklyReports.PUT("/:id", reportHandler.Update)
			weeklyReports.DELETE("/:id", reportHandler.Delete)
			weeklyReports.POST("/:id/submit", reportHandler.Submit)
			weeklyReports.POST("/:id/copy", reportHandler.Copy)
			// 統合された週報の下書き保存と提出エンドポイントを追加
			weeklyReports.POST("/draft", reportHandler.SaveAsDraft)
			weeklyReports.POST("/submit", reportHandler.SaveAndSubmit)

			// デフォルト勤務時間設定のエンドポイント
			weeklyReports.GET("/default-settings", reportHandler.GetUserDefaultWorkSettings)
			weeklyReports.POST("/default-settings", reportHandler.SaveUserDefaultWorkSettings)
		}

		// 休暇関連のエンドポイント
		leave := api.Group("/leave")
		leave.Use(authMiddlewareFunc)
		{
			// 休暇種別一覧
			leave.GET("/types", leaveHandler.GetLeaveTypes)
			// 休暇残日数
			leave.GET("/balances", leaveHandler.GetUserLeaveBalances)
			// 休暇申請一覧
			leave.GET("/requests", leaveHandler.GetLeaveRequests)
			// 休暇申請作成
			leave.POST("/requests", leaveHandler.CreateLeaveRequest)
		}

		// 勤怠関連のエンドポイント
		attendances := api.Group("/leave")
		attendances.Use(authMiddlewareFunc)
		{
			// 休日情報のエンドポイントは残す
			attendances.GET("/holidays", leaveHandler.GetHolidays)
		}

		// 経費関連のエンドポイント
		expenses := api.Group("/expenses")
		expenses.Use(authMiddlewareFunc)
		{
			// 基本CRUD操作
			expenses.POST("", expenseHandler.CreateExpense)
			expenses.GET("/categories", expenseHandler.GetCategories)
			expenses.GET("", expenseHandler.GetExpenseList)
			expenses.GET("/:id", expenseHandler.GetExpense)
			expenses.PUT("/:id", expenseHandler.UpdateExpense)
			expenses.DELETE("/:id", expenseHandler.DeleteExpense)

			// 申請提出・取消
			expenses.POST("/:id/submit", expenseHandler.SubmitExpense)
			expenses.POST("/:id/cancel", expenseHandler.CancelExpense)

			// ファイルアップロード関連
			expenses.POST("/upload-url", expenseHandler.GenerateUploadURL)
			expenses.POST("/upload-complete", expenseHandler.CompleteUpload)
			expenses.DELETE("/upload", expenseHandler.DeleteUploadedFile)

			// 上限チェック
			expenses.GET("/check-limits", expenseHandler.CheckExpenseLimits)

			// 集計
			expenses.GET("/summary", expenseHandler.GetExpenseSummary)

			// 複数領収書対応
			expenses.POST("/with-receipts", expenseHandler.CreateExpenseWithReceipts)
			expenses.PUT("/:id/with-receipts", expenseHandler.UpdateExpenseWithReceipts)
			expenses.GET("/:id/receipts", expenseHandler.GetExpenseReceipts)
			expenses.DELETE("/:id/receipts/:receipt_id", expenseHandler.DeleteExpenseReceipt)
			expenses.PUT("/:id/receipts/order", expenseHandler.UpdateReceiptOrder)
			expenses.POST("/receipts/upload-url", expenseHandler.GenerateReceiptUploadURL)

			// CSVエクスポート
			expenses.GET("/export", expenseHandler.ExportExpensesCSV)

			// PDFエクスポート
			expenses.GET("/:id/pdf", expensePDFHandler.GenerateExpensePDF)
			expenses.GET("/pdf", expensePDFHandler.GenerateExpenseListPDF)
		}

		// プロジェクト関連のエンドポイント
		projects := api.Group("/projects")
		projects.Use(authMiddlewareFunc)
		{
			// プロジェクトエンドポイントのハンドラー追加予定
		}

		// 通知関連のエンドポイント
		notifications := api.Group("/notifications")
		notifications.Use(authMiddlewareFunc)
		{
			notifications.GET("", notificationHandler.GetUserNotifications)
			notifications.GET("/unread", notificationHandler.GetUnreadNotifications)
			notifications.PUT("/:id/read", notificationHandler.MarkAsReadSingle)
			notifications.PUT("/read", notificationHandler.MarkAsRead)
			notifications.PUT("/read-all", notificationHandler.MarkAllAsRead)
			notifications.GET("/settings", notificationHandler.GetUserNotificationSettings)
			notifications.PUT("/settings", notificationHandler.UpdateNotificationSetting)
		}

		// 管理者用の通知作成エンドポイント
		adminNotifications := api.Group("/admin/notifications")
		adminNotifications.Use(authMiddlewareFunc)
		{
			adminNotifications.POST("", notificationHandler.CreateNotification)
		}

		// 週報認証ミドルウェアを作成（現在未使用）
		// TODO: 週報関連ルートで使用予定
		// weeklyReportAuthMiddleware := middleware.NewWeeklyReportAuthMiddleware(logger, *reportRepo, weeklyReportRefactoredRepo, userRepo, departmentRepo, cognitoMiddleware)

		// 管理者用ルートの設定
		adminHandlers := &routes.AdminHandlers{
			WeeklyReportHandler:           adminWeeklyReportHandler,
			DashboardHandler:              adminDashboardHandler,
			ClientHandler:                 clientHandler,
			InvoiceHandler:                invoiceHandler,
			SalesHandler:                  salesHandler,
			SkillSheetPDFHandler:          skillSheetPDFHandler,
			LeaveAdminHandler:             leaveAdminHandler,
			ExpenseHandler:                expenseHandler,
			ExpenseApproverSettingHandler: expenseApproverSettingHandler,
			ApprovalReminderHandler:       approvalReminderHandler,
			EngineerHandler:               engineerHandler,
		}
		routes.SetupAdminRoutes(api, cfg, adminHandlers, logger, rolePermissionRepo, cognitoMiddleware, userRepo)

		// アラートルートの登録
		// routes.RegisterAlertRoutes(api, alertHandler, authMiddleware) // TODO: 実装予定

		// アラート設定ルートの登録（設計書通りのパスで有効化）
		// 管理者・マネージャー権限チェックミドルウェアを作成
		adminManagerAuthMiddleware := func(c *gin.Context) {
			// ユーザー情報を取得
			userInterface, exists := c.Get("user")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザー情報が見つかりません"})
				c.Abort()
				return
			}

			user, ok := userInterface.(*model.User)
			if !ok {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の形式が無効です"})
				c.Abort()
				return
			}

			// 管理者またはマネージャー権限をチェック
			if user.Role != model.RoleSuperAdmin && user.Role != model.RoleAdmin && user.Role != model.RoleManager {
				logger.Warn("権限なしでのアクセス試行",
					zap.String("user_id", user.ID),
					zap.Int("role", int(user.Role)),
				)
				c.JSON(http.StatusForbidden, gin.H{"error": "管理者またはマネージャー権限が必要です"})
				c.Abort()
				return
			}

			c.Next()
		}
		routes.SetupAlertSettingsRoutes(api, alertSettingsHandler, authMiddlewareFunc, adminManagerAuthMiddleware, logger)

		// 未提出者管理ルートの登録（既存）
		// routes.SetupUnsubmittedReportRoutes(router, unsubmittedReportHandler, authMiddleware, authFactory)

		// 管理者用週報管理拡張ルートの登録（設計書準拠の新規エンドポイント）
		// routes.SetupAdminWeeklyReportExtendedRoutes(router, adminWeeklyReportHandler, unsubmittedReportHandler, authMiddleware, authFactory)

		// リマインドルートの登録
		// TODO: RequireRolesミドルウェアもCognito対応が必要
		routes.RegisterReminderRoutes(api, reminderHandler, authMiddlewareFunc, cognitoMiddleware.AdminRequired())

		// 営業関連ルートの登録
		routes.SetupSalesRoutes(api, cfg, salesHandlers, logger, rolePermissionRepo, cognitoMiddleware)
		routes.SetupAdminSalesRoutes(api, cfg, salesHandlers, logger, rolePermissionRepo, cognitoMiddleware)

		// 監査ログルートの登録（管理者のみアクセス可能）
		adminAudit := api.Group("/admin")
		adminAudit.Use(authMiddlewareFunc)
		adminAudit.Use(cognitoMiddleware.AdminRequired()) // 管理者のみ
		handler.SetupAuditLogRoutes(adminAudit, auditLogHandler)

		// 管理者用経費エクスポート（管理者のみアクセス可能）
		adminExpenses := api.Group("/admin/expenses")
		adminExpenses.Use(authMiddlewareFunc)
		adminExpenses.Use(cognitoMiddleware.AdminRequired()) // 管理者のみ
		{
			adminExpenses.GET("/export", expenseHandler.ExportExpensesCSVAdmin)
		}

		// 管理者用経費期限設定（管理者のみアクセス可能）
		adminExpenseDeadline := api.Group("/admin/expense-deadline-settings")
		adminExpenseDeadline.Use(authMiddlewareFunc)
		adminExpenseDeadline.Use(cognitoMiddleware.AdminRequired()) // 管理者のみ
		{
			// 経費期限設定ハンドラーは一時的に無効化（ExpenseServiceへの参照が必要）
			// TODO: ExpenseServiceをsetupRouterに渡すか、別の方法で実装
			// expenseDeadlineHandler := handler.NewExpenseDeadlineHandler(expenseService, logger)
			// adminExpenseDeadline.GET("", expenseDeadlineHandler.GetDeadlineSettings)
			// adminExpenseDeadline.POST("", expenseDeadlineHandler.CreateDeadlineSetting)
			// adminExpenseDeadline.PUT("/:id", expenseDeadlineHandler.UpdateDeadlineSetting)
			// adminExpenseDeadline.DELETE("/:id", expenseDeadlineHandler.DeleteDeadlineSetting)
		}

		// 開発環境用のモックアップロードエンドポイント
		if os.Getenv("USE_MOCK_S3") == "true" || os.Getenv("GO_ENV") == "development" {
			mockUpload := api.Group("/mock-upload")
			{
				// モックアップロードハンドラー（PUTリクエストを受け取って成功を返す）
				mockUpload.PUT("/*filepath", func(c *gin.Context) {
					logger.Info("Mock upload received",
						zap.String("path", c.Param("filepath")),
						zap.String("method", c.Request.Method))

					// 成功レスポンスを返す
					c.Status(http.StatusOK)
				})
			}
		}
	}

	return router
}
