package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/batch"
	"github.com/duesk/monstera/internal/common/logger"
	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/service"
)

func main() {
	// ロガーの初期化
	log, err := logger.InitLogger(true)
	if err != nil {
		panic(err)
	}
	defer log.Sync()

	// 設定の読み込み
	// バッチコンテナでは環境変数から設定を読み込むため、.envファイルは不要
	cfg, err := config.Load("")
	if err != nil {
		// バッチは環境変数で動作するため、.envファイルが無くても問題ない
		log.Info("No .env file found, using environment variables")
	}

	// データベース接続
	database, err := config.InitDatabase(cfg, log)
	if err != nil {
		log.Fatal("Failed to connect to database", zap.Error(err))
	}

	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("Failed to get database connection", zap.Error(err))
	}
	defer sqlDB.Close()

	// リポジトリの初期化
	userRepo := repository.NewUserRepository(database)
	userRepo.SetLogger(log)
	alertRepo := repository.NewAlertRepository(database, log)
	weeklyReportRepo := repository.NewWeeklyReportRepository(database, log)
	alertHistoryRepo := repository.NewAlertHistoryRepository(database, log)
	alertSettingsRepo := repository.NewAlertSettingsRepository(database, log)

	// サービスの初期化
	notificationService := service.NewNotificationService(database, log)

	alertService := service.NewAlertService(
		database,
		alertRepo,
		alertHistoryRepo,
		alertSettingsRepo,
		*weeklyReportRepo,
		userRepo,
		log,
	)

	alertDetectionBatchService := service.NewAlertDetectionBatchService(
		database,
		alertService,
		*weeklyReportRepo,
		userRepo,
		alertSettingsRepo,
		alertHistoryRepo,
		log,
	)

	archiveService := service.NewArchiveService(database, log)

	// バッチスケジューラーの作成
	scheduler := batch.NewScheduler(
		database,
		notificationService,
		alertService,
		alertDetectionBatchService,
		archiveService,
		log,
	)

	// バッチスケジューラーを起動
	if err := scheduler.Start(); err != nil {
		log.Fatal("Failed to start batch scheduler", zap.Error(err))
	}

	log.Info("Batch scheduler started successfully")

	// シグナル待機
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	log.Info("Shutting down batch scheduler...")

	// グレースフルシャットダウン
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	scheduler.Stop()

	// 少し待つ
	select {
	case <-ctx.Done():
		log.Warn("Shutdown timeout exceeded")
	case <-time.After(2 * time.Second):
		log.Info("Batch scheduler shutdown completed")
	}
}
