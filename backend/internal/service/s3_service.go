package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/duesk/monstera/internal/dto"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// S3Service S3に関するサービスのインターフェース
type S3Service interface {
	// Pre-signed URL生成
	GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error)
	GetFileURL(ctx context.Context, s3Key string) (string, error)
	DeleteFile(ctx context.Context, s3Key string) error

	// ファイル情報管理
	ValidateUploadedFile(ctx context.Context, s3Key string) error
	GetFileInfo(ctx context.Context, s3Key string) (*dto.FileInfo, error)

	// 領収書用のPresigned URL生成
	GeneratePresignedUploadURL(ctx context.Context, key string, contentType string, expiresIn time.Duration) (string, map[string]string, error)
}

// s3Service S3サービスの実装
type s3Service struct {
	s3Client   *s3.Client
	bucketName string
	baseURL    string
	logger     *zap.Logger
}

// NewS3Service S3サービスのインスタンスを生成
func NewS3Service(bucketName, region, baseURL string, logger *zap.Logger) (S3Service, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
	)
	if err != nil {
		logger.Error("Failed to load AWS config", zap.Error(err))
		return nil, err
	}

	s3Client := s3.NewFromConfig(cfg)

	return &s3Service{
		s3Client:   s3Client,
		bucketName: bucketName,
		baseURL:    baseURL,
		logger:     logger,
	}, nil
}

// GenerateUploadURL Pre-signed URLを生成
func (s *s3Service) GenerateUploadURL(ctx context.Context, userID uuid.UUID, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error) {
	// バリデーション
	if validationErrors := req.ValidateFileUpload(); len(validationErrors) > 0 {
		s.logger.Warn("Upload URL request validation failed",
			zap.Any("errors", validationErrors))
		return nil, fmt.Errorf("ファイルのバリデーションに失敗しました")
	}

	// S3キーを生成
	s3Key := req.GenerateS3Key(userID)

	// Pre-signed URL生成のための設定
	presigner := s3.NewPresignClient(s.s3Client)

	// PutObjectリクエストを作成
	putObjectInput := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(s3Key),
		ContentType: aws.String(req.ContentType),
	}

	// Pre-signed URLを生成（15分間有効）
	expiresAt := time.Now().Add(15 * time.Minute)
	presignedRequest, err := presigner.PresignPutObject(ctx, putObjectInput,
		func(opts *s3.PresignOptions) {
			opts.Expires = 15 * time.Minute
		})

	if err != nil {
		s.logger.Error("Failed to generate pre-signed URL",
			zap.Error(err),
			zap.String("s3_key", s3Key),
			zap.String("user_id", userID.String()))
		return nil, fmt.Errorf("Pre-signed URLの生成に失敗しました")
	}

	response := &dto.UploadURLResponse{
		UploadURL: presignedRequest.URL,
		S3Key:     s3Key,
		ExpiresAt: expiresAt,
	}

	s.logger.Info("Pre-signed URL generated successfully",
		zap.String("s3_key", s3Key),
		zap.String("user_id", userID.String()),
		zap.Time("expires_at", expiresAt))

	return response, nil
}

// GetFileURL ファイルの公開URLを取得
func (s *s3Service) GetFileURL(ctx context.Context, s3Key string) (string, error) {
	if s3Key == "" {
		return "", fmt.Errorf("S3キーが指定されていません")
	}

	// CloudFrontまたはS3の公開URLを生成
	if s.baseURL != "" {
		// CloudFront経由のURL
		return fmt.Sprintf("%s/%s", strings.TrimRight(s.baseURL, "/"), s3Key), nil
	} else {
		// S3直接アクセスURL
		region := s.s3Client.Options().Region
		return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucketName, region, s3Key), nil
	}
}

// DeleteFile S3からファイルを削除
func (s *s3Service) DeleteFile(ctx context.Context, s3Key string) error {
	if s3Key == "" {
		return fmt.Errorf("S3キーが指定されていません")
	}

	deleteInput := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(s3Key),
	}

	_, err := s.s3Client.DeleteObject(ctx, deleteInput)
	if err != nil {
		s.logger.Error("Failed to delete file from S3",
			zap.Error(err),
			zap.String("s3_key", s3Key))
		return fmt.Errorf("ファイルの削除に失敗しました")
	}

	s.logger.Info("File deleted successfully from S3",
		zap.String("s3_key", s3Key))

	return nil
}

// ValidateUploadedFile アップロードされたファイルを検証
func (s *s3Service) ValidateUploadedFile(ctx context.Context, s3Key string) error {
	if s3Key == "" {
		return fmt.Errorf("S3キーが指定されていません")
	}

	// ファイルの存在確認
	headInput := &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(s3Key),
	}

	headOutput, err := s.s3Client.HeadObject(ctx, headInput)
	if err != nil {
		s.logger.Error("Failed to validate uploaded file",
			zap.Error(err),
			zap.String("s3_key", s3Key))
		return fmt.Errorf("アップロードされたファイルが見つかりません")
	}

	// ファイルサイズチェック（5MB制限）
	const maxFileSize = 5 * 1024 * 1024 // 5MB
	if headOutput.ContentLength != nil && *headOutput.ContentLength > maxFileSize {
		s.logger.Warn("Uploaded file exceeds size limit",
			zap.Int64("file_size", *headOutput.ContentLength),
			zap.String("s3_key", s3Key))
		return fmt.Errorf("ファイルサイズが制限を超えています（最大5MB）")
	}

	// Content-Typeチェック
	allowedTypes := map[string]bool{
		"image/jpeg":      true,
		"image/jpg":       true,
		"image/png":       true,
		"application/pdf": true,
	}

	if headOutput.ContentType != nil {
		if !allowedTypes[*headOutput.ContentType] {
			s.logger.Warn("Invalid file type uploaded",
				zap.String("content_type", *headOutput.ContentType),
				zap.String("s3_key", s3Key))
			return fmt.Errorf("サポートされていないファイル形式です")
		}
	}

	s.logger.Info("File validation successful",
		zap.String("s3_key", s3Key),
		zap.String("content_type", aws.ToString(headOutput.ContentType)),
		zap.Int64("file_size", aws.ToInt64(headOutput.ContentLength)))

	return nil
}

// GetFileInfo ファイル情報を取得
func (s *s3Service) GetFileInfo(ctx context.Context, s3Key string) (*dto.FileInfo, error) {
	if s3Key == "" {
		return nil, fmt.Errorf("S3キーが指定されていません")
	}

	headInput := &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(s3Key),
	}

	headOutput, err := s.s3Client.HeadObject(ctx, headInput)
	if err != nil {
		s.logger.Error("Failed to get file info",
			zap.Error(err),
			zap.String("s3_key", s3Key))
		return nil, fmt.Errorf("ファイル情報の取得に失敗しました")
	}

	// ファイル名をS3キーから抽出
	parts := strings.Split(s3Key, "/")
	fileName := parts[len(parts)-1]

	fileInfo := &dto.FileInfo{
		S3Key:       s3Key,
		FileName:    fileName,
		ContentType: aws.ToString(headOutput.ContentType),
		FileSize:    aws.ToInt64(headOutput.ContentLength),
		UploadedAt:  headOutput.LastModified,
	}

	return fileInfo, nil
}

// ========================================
// ヘルパー関数
// ========================================

// GetBucketName バケット名を取得
func (s *s3Service) GetBucketName() string {
	return s.bucketName
}

// GeneratePresignedUploadURL Pre-signed URLを生成（領収書アップロード用）
func (s *s3Service) GeneratePresignedUploadURL(ctx context.Context, key string, contentType string, expiresIn time.Duration) (string, map[string]string, error) {
	// Pre-signed URL生成のための設定
	presignClient := s3.NewPresignClient(s.s3Client)
	putObjectInput := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	// Pre-signed URLを生成
	presignRequest, err := presignClient.PresignPutObject(ctx, putObjectInput, func(opts *s3.PresignOptions) {
		opts.Expires = expiresIn
	})
	if err != nil {
		s.logger.Error("Failed to generate presigned URL",
			zap.Error(err),
			zap.String("s3_key", key))
		return "", nil, fmt.Errorf("アップロードURLの生成に失敗しました")
	}

	// 必要なヘッダー情報
	headers := map[string]string{
		"Content-Type": contentType,
	}

	s.logger.Info("Presigned URL generated successfully",
		zap.String("s3_key", key),
		zap.String("content_type", contentType),
		zap.Duration("expires_in", expiresIn))

	return presignRequest.URL, headers, nil
}

// GetBaseURL ベースURLを取得
func (s *s3Service) GetBaseURL() string {
	return s.baseURL
}
