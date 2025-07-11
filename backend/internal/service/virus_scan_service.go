package service

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/metrics"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// VirusScanResult ウイルススキャンの結果
type VirusScanResult struct {
	FileID       uuid.UUID
	FileName     string
	FileSize     int64
	ScanStatus   string // clean, infected, error
	VirusName    string // 検出されたウイルス名
	ScanEngine   string // 使用したスキャンエンジン
	ScanDuration time.Duration
	ScannedAt    time.Time
	ErrorMessage string // エラーの詳細
}

// VirusScanService ウイルススキャンサービスのインターフェース
type VirusScanService interface {
	// ScanFile ファイルをスキャン
	ScanFile(ctx context.Context, fileID uuid.UUID, fileName string, reader io.Reader) (*VirusScanResult, error)

	// ScanFileByPath ファイルパスでスキャン
	ScanFileByPath(ctx context.Context, fileID uuid.UUID, filePath string) (*VirusScanResult, error)

	// GetScanResult スキャン結果を取得
	GetScanResult(ctx context.Context, fileID uuid.UUID) (*VirusScanResult, error)

	// QuarantineFile 感染ファイルを隔離
	QuarantineFile(ctx context.Context, fileID uuid.UUID) error

	// GetQuarantinedFiles 隔離されたファイル一覧を取得
	GetQuarantinedFiles(ctx context.Context, limit int) ([]*VirusScanResult, error)

	// DeleteQuarantinedFile 隔離ファイルを削除
	DeleteQuarantinedFile(ctx context.Context, fileID uuid.UUID) error

	// GetScanStatistics スキャン統計を取得
	GetScanStatistics(ctx context.Context, from, to time.Time) (*ScanStatistics, error)
}

// ScanStatistics スキャン統計情報
type ScanStatistics struct {
	TotalScans      int64
	CleanFiles      int64
	InfectedFiles   int64
	ErrorScans      int64
	AverageScanTime time.Duration
	TopViruses      []VirusInfo
}

// VirusInfo ウイルス情報
type VirusInfo struct {
	VirusName string
	Count     int64
	LastSeen  time.Time
}

// virusScanService ウイルススキャンサービスの実装
type virusScanService struct {
	logger        *zap.Logger
	scanEngine    ScanEngine
	quarantineDir string
	maxFileSize   int64
}

// ScanEngine スキャンエンジンのインターフェース
type ScanEngine interface {
	Scan(reader io.Reader) (bool, string, error)
	ScanFile(filePath string) (bool, string, error)
	GetEngineInfo() (string, string) // エンジン名、バージョン
	UpdateDefinitions() error
}

// NewVirusScanService ウイルススキャンサービスのインスタンスを生成
func NewVirusScanService(logger *zap.Logger, scanEngine ScanEngine, quarantineDir string, maxFileSize int64) VirusScanService {
	return &virusScanService{
		logger:        logger,
		scanEngine:    scanEngine,
		quarantineDir: quarantineDir,
		maxFileSize:   maxFileSize,
	}
}

// ScanFile ファイルをスキャン
func (s *virusScanService) ScanFile(ctx context.Context, fileID uuid.UUID, fileName string, reader io.Reader) (*VirusScanResult, error) {
	startTime := time.Now()
	engineName, _ := s.scanEngine.GetEngineInfo()

	result := &VirusScanResult{
		FileID:     fileID,
		FileName:   fileName,
		ScanEngine: engineName,
		ScannedAt:  startTime,
	}

	// ファイルサイズをチェック（リーダーから読み取る必要がある場合）
	// 実際の実装では、io.TeeReaderを使用してサイズを計算

	// スキャン実行
	isClean, virusName, err := s.scanEngine.Scan(reader)
	if err != nil {
		s.logger.Error("Failed to scan file",
			zap.String("file_id", fileID.String()),
			zap.String("file_name", fileName),
			zap.Error(err))

		result.ScanStatus = "error"
		result.ErrorMessage = err.Error()
		result.ScanDuration = time.Since(startTime)
		return result, err
	}

	result.ScanDuration = time.Since(startTime)

	// ファイルタイプを取得
	fileType := getFileType(fileName)

	if isClean {
		result.ScanStatus = "clean"
		s.logger.Info("File scanned: clean",
			zap.String("file_id", fileID.String()),
			zap.String("file_name", fileName),
			zap.Duration("scan_duration", result.ScanDuration))

		// メトリクスを記録
		metrics.RecordVirusScan("clean", fileType, result.ScanDuration.Seconds())
	} else {
		result.ScanStatus = "infected"
		result.VirusName = virusName
		s.logger.Warn("Virus detected in file",
			zap.String("file_id", fileID.String()),
			zap.String("file_name", fileName),
			zap.String("virus_name", virusName),
			zap.Duration("scan_duration", result.ScanDuration))

		// メトリクスを記録
		metrics.RecordVirusScan("infected", fileType, result.ScanDuration.Seconds())
		metrics.RecordVirusDetection(virusName, fileType)
	}

	return result, nil
}

// ScanFileByPath ファイルパスでスキャン
func (s *virusScanService) ScanFileByPath(ctx context.Context, fileID uuid.UUID, filePath string) (*VirusScanResult, error) {
	startTime := time.Now()
	engineName, _ := s.scanEngine.GetEngineInfo()

	result := &VirusScanResult{
		FileID:     fileID,
		FileName:   filePath,
		ScanEngine: engineName,
		ScannedAt:  startTime,
	}

	// スキャン実行
	isClean, virusName, err := s.scanEngine.ScanFile(filePath)
	if err != nil {
		s.logger.Error("Failed to scan file",
			zap.String("file_id", fileID.String()),
			zap.String("file_path", filePath),
			zap.Error(err))

		result.ScanStatus = "error"
		result.ErrorMessage = err.Error()
		result.ScanDuration = time.Since(startTime)
		return result, err
	}

	result.ScanDuration = time.Since(startTime)

	if isClean {
		result.ScanStatus = "clean"
	} else {
		result.ScanStatus = "infected"
		result.VirusName = virusName
	}

	return result, nil
}

// GetScanResult スキャン結果を取得
func (s *virusScanService) GetScanResult(ctx context.Context, fileID uuid.UUID) (*VirusScanResult, error) {
	// 実際の実装では、データベースから結果を取得
	return nil, fmt.Errorf("not implemented")
}

// QuarantineFile 感染ファイルを隔離
func (s *virusScanService) QuarantineFile(ctx context.Context, fileID uuid.UUID) error {
	// 実際の実装では、ファイルを隔離ディレクトリに移動
	s.logger.Info("Quarantining infected file",
		zap.String("file_id", fileID.String()),
		zap.String("quarantine_dir", s.quarantineDir))

	return fmt.Errorf("not implemented")
}

// GetQuarantinedFiles 隔離されたファイル一覧を取得
func (s *virusScanService) GetQuarantinedFiles(ctx context.Context, limit int) ([]*VirusScanResult, error) {
	// 実際の実装では、データベースから隔離ファイル一覧を取得
	return nil, fmt.Errorf("not implemented")
}

// DeleteQuarantinedFile 隔離ファイルを削除
func (s *virusScanService) DeleteQuarantinedFile(ctx context.Context, fileID uuid.UUID) error {
	s.logger.Info("Deleting quarantined file",
		zap.String("file_id", fileID.String()))

	// 実際の実装では、隔離ファイルを完全に削除
	return fmt.Errorf("not implemented")
}

// GetScanStatistics スキャン統計を取得
func (s *virusScanService) GetScanStatistics(ctx context.Context, from, to time.Time) (*ScanStatistics, error) {
	// 実際の実装では、データベースから統計情報を集計
	return &ScanStatistics{
		TotalScans:      0,
		CleanFiles:      0,
		InfectedFiles:   0,
		ErrorScans:      0,
		AverageScanTime: 0,
		TopViruses:      []VirusInfo{},
	}, nil
}

// getFileType ファイル名から拡張子を取得
func getFileType(fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == "" {
		return "unknown"
	}
	// ドットを除去
	return strings.TrimPrefix(ext, ".")
}
