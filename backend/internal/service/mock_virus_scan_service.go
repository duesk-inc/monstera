package service

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// MockVirusScanService は開発環境用のモックウイルススキャンサービス
type MockVirusScanService struct {
	logger *zap.Logger
}

// NewMockVirusScanService は新しいモックウイルススキャンサービスを作成
func NewMockVirusScanService(logger *zap.Logger) VirusScanService {
	logger.Info("MockVirusScanService: 開発環境用のモックサービスを使用しています")
	return &MockVirusScanService{
		logger: logger,
	}
}

// ScanFile ファイルをスキャン（モック実装）
func (s *MockVirusScanService) ScanFile(ctx context.Context, fileID uuid.UUID, fileName string, reader io.Reader) (*VirusScanResult, error) {
	s.logger.Debug("MockVirusScanService: ファイルスキャンをスキップしました",
		zap.String("file_id", fileID.String()),
		zap.String("file_name", fileName),
		zap.String("result", "clean"))
	
	return &VirusScanResult{
		FileID:       fileID,
		FileName:     fileName,
		FileSize:     0,
		ScanStatus:   "clean",
		VirusName:    "",
		ScanEngine:   "mock",
		ScanDuration: 0,
		ScannedAt:    time.Now(),
		ErrorMessage: "",
	}, nil
}

// ScanFileByPath ファイルパスでスキャン（モック実装）
func (s *MockVirusScanService) ScanFileByPath(ctx context.Context, fileID uuid.UUID, filePath string) (*VirusScanResult, error) {
	s.logger.Debug("MockVirusScanService: ファイルパススキャンをスキップしました",
		zap.String("file_id", fileID.String()),
		zap.String("file_path", filePath),
		zap.String("result", "clean"))
	
	return &VirusScanResult{
		FileID:       fileID,
		FileName:     filePath,
		FileSize:     0,
		ScanStatus:   "clean",
		VirusName:    "",
		ScanEngine:   "mock",
		ScanDuration: 0,
		ScannedAt:    time.Now(),
		ErrorMessage: "",
	}, nil
}

// GetScanResult スキャン結果を取得（モック実装）
func (s *MockVirusScanService) GetScanResult(ctx context.Context, fileID uuid.UUID) (*VirusScanResult, error) {
	return &VirusScanResult{
		FileID:       fileID,
		FileName:     "mock-file",
		FileSize:     0,
		ScanStatus:   "clean",
		VirusName:    "",
		ScanEngine:   "mock",
		ScanDuration: 0,
		ScannedAt:    time.Now(),
		ErrorMessage: "",
	}, nil
}

// QuarantineFile 感染ファイルを隔離（モック実装）
func (s *MockVirusScanService) QuarantineFile(ctx context.Context, fileID uuid.UUID) error {
	s.logger.Debug("MockVirusScanService: ファイル隔離をスキップしました",
		zap.String("file_id", fileID.String()))
	return nil
}

// GetQuarantinedFiles 隔離されたファイル一覧を取得（モック実装）
func (s *MockVirusScanService) GetQuarantinedFiles(ctx context.Context, limit int) ([]*VirusScanResult, error) {
	return []*VirusScanResult{}, nil
}

// DeleteQuarantinedFile 隔離ファイルを削除（モック実装）
func (s *MockVirusScanService) DeleteQuarantinedFile(ctx context.Context, fileID uuid.UUID) error {
	s.logger.Debug("MockVirusScanService: 隔離ファイル削除をスキップしました",
		zap.String("file_id", fileID.String()))
	return nil
}

// GetScanStatistics スキャン統計を取得（モック実装）
func (s *MockVirusScanService) GetScanStatistics(ctx context.Context, from, to time.Time) (*ScanStatistics, error) {
	return &ScanStatistics{
		TotalScans:      0,
		CleanFiles:      0,
		InfectedFiles:   0,
		ErrorScans:      0,
		AverageScanTime: 0,
		TopViruses:      []VirusInfo{},
	}, nil
}