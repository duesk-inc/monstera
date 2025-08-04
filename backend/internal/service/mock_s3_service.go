package service

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// mockS3Service 開発環境用のモックS3サービス
type mockS3Service struct {
	logger *zap.Logger
}

// NewMockS3Service 開発環境用のモックS3サービスを生成
func NewMockS3Service(logger *zap.Logger) S3Service {
	return &mockS3Service{
		logger: logger,
	}
}

// GenerateUploadURL モックのPre-signed URLを生成
func (s *mockS3Service) GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error) {
	// バリデーション
	if validationErrors := req.ValidateFileUpload(); len(validationErrors) > 0 {
		s.logger.Warn("Upload URL request validation failed",
			zap.Any("errors", validationErrors))
		return nil, fmt.Errorf("ファイルのバリデーションに失敗しました")
	}

	// S3キーを生成
	s3Key := req.GenerateS3Key(userID)

	// モックのURLを生成（バックエンドのモックアップロードエンドポイントを指定）
	uploadURL := fmt.Sprintf("http://localhost:8080/api/v1/mock-upload/%s?mock=true", s3Key)
	expiresAt := time.Now().Add(15 * time.Minute)

	response := &dto.UploadURLResponse{
		UploadURL: uploadURL,
		S3Key:     s3Key,
		ExpiresAt: expiresAt,
	}

	s.logger.Info("Mock pre-signed URL generated",
		zap.String("s3_key", s3Key),
		zap.String("user_id", userID.String()),
		zap.Time("expires_at", expiresAt))

	return response, nil
}

// GetFileURL モックのファイルURLを取得
func (s *mockS3Service) GetFileURL(ctx context.Context, s3Key string) (string, error) {
	if s3Key == "" {
		return "", fmt.Errorf("S3キーが指定されていません")
	}

	// モックのURLを返す
	return fmt.Sprintf("http://localhost:9000/mock-bucket/%s", s3Key), nil
}

// DeleteFile モックのファイル削除
func (s *mockS3Service) DeleteFile(ctx context.Context, s3Key string) error {
	if s3Key == "" {
		return fmt.Errorf("S3キーが指定されていません")
	}

	s.logger.Info("Mock file deleted",
		zap.String("s3_key", s3Key))

	return nil
}

// ValidateUploadedFile モックのファイル検証
func (s *mockS3Service) ValidateUploadedFile(ctx context.Context, s3Key string) error {
	if s3Key == "" {
		return fmt.Errorf("S3キーが指定されていません")
	}

	s.logger.Info("Mock file validation successful",
		zap.String("s3_key", s3Key))

	return nil
}

// GetFileInfo モックのファイル情報を取得
func (s *mockS3Service) GetFileInfo(ctx context.Context, s3Key string) (*dto.FileInfo, error) {
	if s3Key == "" {
		return nil, fmt.Errorf("S3キーが指定されていません")
	}

	fileInfo := &dto.FileInfo{
		S3Key:       s3Key,
		FileName:    "mock-file.pdf",
		ContentType: "application/pdf",
		FileSize:    1024 * 100, // 100KB
		UploadedAt:  &time.Time{},
	}

	return fileInfo, nil
}

// GeneratePresignedUploadURL モックのPre-signed URLを生成
func (s *mockS3Service) GeneratePresignedUploadURL(ctx context.Context, key string, contentType string, expiresIn time.Duration) (string, map[string]string, error) {
	// モックのURLを生成
	presignedURL := fmt.Sprintf("http://localhost:9000/mock-bucket/%s?mock=true&expires=%d", key, time.Now().Add(expiresIn).Unix())

	headers := map[string]string{
		"Content-Type": contentType,
	}

	s.logger.Info("Mock presigned URL generated",
		zap.String("s3_key", key),
		zap.String("content_type", contentType),
		zap.Duration("expires_in", expiresIn))

	return presignedURL, headers, nil
}
