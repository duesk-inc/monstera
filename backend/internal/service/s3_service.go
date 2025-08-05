package service

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/duesk/monstera/internal/dto"
	"go.uber.org/zap"
)

// S3Service S3に関するサービスのインターフェース
type S3Service interface {
	// Pre-signed URL生成
	GenerateUploadURL(ctx context.Context, userID string, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error)
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
	s3Client         *s3.Client
	s3ClientExternal *s3.Client // 外部アクセス用のクライアント（Pre-signed URL生成用）
	bucketName       string
	baseURL          string
	externalEndpoint string
	logger           *zap.Logger
}

// NewS3Service S3サービスのインスタンスを生成（MinIO対応版）
func NewS3Service(bucketName, region, baseURL string, logger *zap.Logger) (S3Service, error) {
	// MinIO用のエンドポイントとパススタイルの設定を取得
	endpoint := os.Getenv("AWS_S3_ENDPOINT")
	externalEndpoint := os.Getenv("AWS_S3_ENDPOINT_EXTERNAL")
	if externalEndpoint == "" {
		externalEndpoint = endpoint // 外部エンドポイントが設定されていない場合は内部エンドポイントを使用
	}
	pathStyle := os.Getenv("AWS_S3_PATH_STYLE") == "true"
	disableSSL := os.Getenv("AWS_S3_DISABLE_SSL") == "true"

	// AWS設定のオプションを構築
	configOptions := []func(*config.LoadOptions) error{
		config.WithRegion(region),
	}

	// カスタムエンドポイントが設定されている場合（MinIOなど）
	if endpoint != "" {
		configOptions = append(configOptions, config.WithEndpointResolverWithOptions(
			aws.EndpointResolverWithOptionsFunc(
				func(service, region string, options ...interface{}) (aws.Endpoint, error) {
					if service == s3.ServiceID {
						return aws.Endpoint{
							URL:               endpoint,
							HostnameImmutable: true,
							Source:            aws.EndpointSourceCustom,
						}, nil
					}
					return aws.Endpoint{}, &aws.EndpointNotFoundError{}
				})),
		)
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(), configOptions...)
	if err != nil {
		logger.Error("Failed to load AWS config",
			zap.Error(err),
			zap.String("endpoint", endpoint),
			zap.String("region", region),
			zap.Bool("path_style", pathStyle),
			zap.Bool("disable_ssl", disableSSL))
		return nil, fmt.Errorf("AWS config load failed: %w", err)
	}

	// S3クライアントを作成（MinIO用の設定を適用）
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = pathStyle
		if disableSSL {
			o.EndpointOptions.DisableHTTPS = true
		}
		// MinIOの場合、署名バージョンv4を強制
		if endpoint != "" {
			o.UseAccelerate = false
			o.UseARNRegion = false
		}
	})

	// 接続テスト（バケットの存在確認）
	ctx, cancel := context.WithTimeout(context.TODO(), 5*time.Second)
	defer cancel()

	_, err = s3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		logger.Error("Failed to connect to S3/MinIO bucket",
			zap.Error(err),
			zap.String("bucket", bucketName),
			zap.String("endpoint", endpoint))
		return nil, fmt.Errorf("S3 bucket connection test failed: %w", err)
	}

	logger.Info("S3 service initialized successfully",
		zap.String("bucket", bucketName),
		zap.String("region", region),
		zap.String("endpoint", endpoint),
		zap.Bool("path_style", pathStyle),
		zap.Bool("disable_ssl", disableSSL))

	return &s3Service{
		s3Client:         s3Client,
		bucketName:       bucketName,
		baseURL:          baseURL,
		externalEndpoint: externalEndpoint,
		logger:           logger,
	}, nil
}

// GenerateUploadURL Pre-signed URLを生成
func (s *s3Service) GenerateUploadURL(ctx context.Context, userID string, req *dto.GenerateUploadURLRequest) (*dto.UploadURLResponse, error) {
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
			zap.String("user_id", userID))
		return nil, fmt.Errorf("Pre-signed URLの生成に失敗しました")
	}

	// URLの内部エンドポイントを外部エンドポイントに置換
	uploadURL := presignedRequest.URL
	if s.externalEndpoint != "" {
		// エンドポイントのURLから内部ホストを抽出
		endpoint := os.Getenv("AWS_S3_ENDPOINT")
		if endpoint != "" && strings.Contains(uploadURL, endpoint) {
			// 内部エンドポイントを外部エンドポイントに置換
			uploadURL = strings.Replace(uploadURL, endpoint, s.externalEndpoint, 1)
			s.logger.Debug("Replaced internal endpoint with external",
				zap.String("original_url", presignedRequest.URL),
				zap.String("new_url", uploadURL))
		}
	}

	response := &dto.UploadURLResponse{
		UploadURL: uploadURL,
		S3Key:     s3Key,
		ExpiresAt: expiresAt,
	}

	s.logger.Info("Pre-signed URL generated successfully",
		zap.String("s3_key", s3Key),
		zap.String("user_id", userID),
		zap.Time("expires_at", expiresAt),
		zap.String("upload_url", uploadURL))

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
