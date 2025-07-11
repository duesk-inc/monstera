package utils

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/message"
)

// FileUtils ファイル処理関連のユーティリティ
type FileUtils struct {
	maxFileSize      int64
	allowedMimeTypes []string
	uploadPath       string
}

// NewFileUtils FileUtilsのインスタンスを作成
func NewFileUtils(maxFileSize int64, allowedMimeTypes []string, uploadPath string) *FileUtils {
	return &FileUtils{
		maxFileSize:      maxFileSize,
		allowedMimeTypes: allowedMimeTypes,
		uploadPath:       uploadPath,
	}
}

// FileInfo ファイル情報
type FileInfo struct {
	Name       string    `json:"name"`
	Size       int64     `json:"size"`
	MimeType   string    `json:"mime_type"`
	Extension  string    `json:"extension"`
	MD5Hash    string    `json:"md5_hash"`
	Path       string    `json:"path"`
	UploadedAt time.Time `json:"uploaded_at"`
	IsImage    bool      `json:"is_image"`
	IsDocument bool      `json:"is_document"`
}

// UploadResult ファイルアップロード結果
type UploadResult struct {
	FileInfo     *FileInfo         `json:"file_info"`
	RelativePath string            `json:"relative_path"`
	FullPath     string            `json:"full_path"`
	URL          string            `json:"url"`
	Success      bool              `json:"success"`
	ErrorCode    message.ErrorCode `json:"error_code,omitempty"`
	ErrorMessage string            `json:"error_message,omitempty"`
}

// ValidateFile ファイルのバリデーション
func (f *FileUtils) ValidateFile(file io.Reader, fileName string, fileSize int64) error {
	// ファイルサイズチェック
	if fileSize > f.maxFileSize {
		return fmt.Errorf("ファイルサイズが上限(%s)を超えています", formatFileSize(f.maxFileSize))
	}

	// ファイル拡張子チェック
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == "" {
		return fmt.Errorf("ファイルに拡張子がありません")
	}

	// MIMEタイプチェック
	mimeType := mime.TypeByExtension(ext)
	if !f.isAllowedMimeType(mimeType) {
		return fmt.Errorf("許可されていないファイル形式です")
	}

	return nil
}

// isAllowedMimeType 許可されたMIMEタイプかチェック
func (f *FileUtils) isAllowedMimeType(mimeType string) bool {
	if len(f.allowedMimeTypes) == 0 {
		return true // 制限なし
	}

	for _, allowed := range f.allowedMimeTypes {
		if mimeType == allowed {
			return true
		}
	}
	return false
}

// GenerateFileName 一意のファイル名を生成
func (f *FileUtils) GenerateFileName(originalName string) string {
	ext := filepath.Ext(originalName)
	baseName := strings.TrimSuffix(originalName, ext)

	// 危険な文字を除去
	safeName := sanitizeFileName(baseName)

	// タイムスタンプとランダム文字列を追加
	timestamp := time.Now().Format("20060102_150405")
	randomStr := generateRandomString(8)

	return fmt.Sprintf("%s_%s_%s%s", safeName, timestamp, randomStr, ext)
}

// sanitizeFileName ファイル名のサニタイズ
func sanitizeFileName(fileName string) string {
	// 危険な文字を除去
	forbidden := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	safe := fileName

	for _, char := range forbidden {
		safe = strings.ReplaceAll(safe, char, "_")
	}

	// 連続するアンダースコアを単一に
	safe = strings.ReplaceAll(safe, "__", "_")

	// 前後のアンダースコアを除去
	safe = strings.Trim(safe, "_")

	// 長すぎる場合は切り詰め
	if len(safe) > 100 {
		safe = safe[:100]
	}

	return safe
}

// generateRandomString ランダム文字列を生成
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)

	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}

	return string(b)
}

// SaveFile ファイルを保存
func (f *FileUtils) SaveFile(file io.Reader, fileName string, fileSize int64) (*UploadResult, error) {
	// バリデーション
	if err := f.ValidateFile(file, fileName, fileSize); err != nil {
		return &UploadResult{
			Success:      false,
			ErrorCode:    message.ErrCodeInvalidFileType,
			ErrorMessage: err.Error(),
		}, err
	}

	// ファイル名生成
	uniqueFileName := f.GenerateFileName(fileName)

	// 保存パス生成（年/月のディレクトリ構造）
	now := time.Now()
	relativePath := filepath.Join(
		fmt.Sprintf("%04d", now.Year()),
		fmt.Sprintf("%02d", now.Month()),
		uniqueFileName,
	)
	fullPath := filepath.Join(f.uploadPath, relativePath)

	// ディレクトリ作成
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return &UploadResult{
			Success:      false,
			ErrorCode:    message.ErrCodeInternalError,
			ErrorMessage: "ディレクトリの作成に失敗しました",
		}, err
	}

	// ファイル作成
	dst, err := os.Create(fullPath)
	if err != nil {
		return &UploadResult{
			Success:      false,
			ErrorCode:    message.ErrCodeInternalError,
			ErrorMessage: "ファイルの作成に失敗しました",
		}, err
	}
	defer dst.Close()

	// ファイルコピーとMD5ハッシュ計算
	hash := md5.New()
	multiWriter := io.MultiWriter(dst, hash)

	_, err = io.Copy(multiWriter, file)
	if err != nil {
		// 失敗した場合はファイルを削除
		os.Remove(fullPath)
		return &UploadResult{
			Success:      false,
			ErrorCode:    message.ErrCodeInternalError,
			ErrorMessage: "ファイルの保存に失敗しました",
		}, err
	}

	// ファイル情報作成
	fileInfo := &FileInfo{
		Name:       fileName,
		Size:       fileSize,
		MimeType:   mime.TypeByExtension(filepath.Ext(fileName)),
		Extension:  filepath.Ext(fileName),
		MD5Hash:    hex.EncodeToString(hash.Sum(nil)),
		Path:       fullPath,
		UploadedAt: now,
		IsImage:    f.isImageFile(fileName),
		IsDocument: f.isDocumentFile(fileName),
	}

	return &UploadResult{
		FileInfo:     fileInfo,
		RelativePath: relativePath,
		FullPath:     fullPath,
		URL:          "/uploads/" + strings.ReplaceAll(relativePath, "\\", "/"),
		Success:      true,
	}, nil
}

// isImageFile 画像ファイルかどうかチェック
func (f *FileUtils) isImageFile(fileName string) bool {
	imageExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"}
	ext := strings.ToLower(filepath.Ext(fileName))

	for _, imgExt := range imageExtensions {
		if ext == imgExt {
			return true
		}
	}
	return false
}

// isDocumentFile ドキュメントファイルかどうかチェック
func (f *FileUtils) isDocumentFile(fileName string) bool {
	docExtensions := []string{".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"}
	ext := strings.ToLower(filepath.Ext(fileName))

	for _, docExt := range docExtensions {
		if ext == docExt {
			return true
		}
	}
	return false
}

// DeleteFile ファイルを削除
func (f *FileUtils) DeleteFile(filePath string) error {
	// パスの安全性チェック
	if !strings.HasPrefix(filePath, f.uploadPath) {
		return fmt.Errorf("無効なファイルパスです")
	}

	// ファイル存在チェック
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("ファイルが見つかりません")
	}

	// ファイル削除
	return os.Remove(filePath)
}

// GetFileInfo ファイル情報を取得
func (f *FileUtils) GetFileInfo(filePath string) (*FileInfo, error) {
	// ファイル存在チェック
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("ファイルが見つかりません")
	}

	// MD5ハッシュ計算
	hash, err := f.calculateMD5(filePath)
	if err != nil {
		return nil, fmt.Errorf("ファイルハッシュの計算に失敗しました")
	}

	fileName := filepath.Base(filePath)

	return &FileInfo{
		Name:       fileName,
		Size:       info.Size(),
		MimeType:   mime.TypeByExtension(filepath.Ext(fileName)),
		Extension:  filepath.Ext(fileName),
		MD5Hash:    hash,
		Path:       filePath,
		UploadedAt: info.ModTime(),
		IsImage:    f.isImageFile(fileName),
		IsDocument: f.isDocumentFile(fileName),
	}, nil
}

// calculateMD5 ファイルのMD5ハッシュを計算
func (f *FileUtils) calculateMD5(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// CleanupOldFiles 古いファイルをクリーンアップ
func (f *FileUtils) CleanupOldFiles(maxAge time.Duration) error {
	cutoff := time.Now().Add(-maxAge)

	return filepath.Walk(f.uploadPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// ディレクトリはスキップ
		if info.IsDir() {
			return nil
		}

		// 古いファイルを削除
		if info.ModTime().Before(cutoff) {
			fmt.Printf("古いファイルを削除: %s\n", path)
			return os.Remove(path)
		}

		return nil
	})
}

// GetDirectorySize ディレクトリのサイズを取得
func (f *FileUtils) GetDirectorySize(dirPath string) (int64, error) {
	var size int64

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			size += info.Size()
		}

		return nil
	})

	return size, err
}

// formatFileSize ファイルサイズを人間が読みやすい形式にフォーマット
func formatFileSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/GB)
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/MB)
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/KB)
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

// CreateBackup ファイルのバックアップを作成
func (f *FileUtils) CreateBackup(filePath string) (string, error) {
	// バックアップファイル名生成
	dir := filepath.Dir(filePath)
	name := filepath.Base(filePath)
	ext := filepath.Ext(name)
	baseName := strings.TrimSuffix(name, ext)

	timestamp := time.Now().Format("20060102_150405")
	backupName := fmt.Sprintf("%s_backup_%s%s", baseName, timestamp, ext)
	backupPath := filepath.Join(dir, backupName)

	// ファイルコピー
	src, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.Create(backupPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		os.Remove(backupPath) // 失敗時はクリーンアップ
		return "", err
	}

	return backupPath, nil
}

// ValidateImageDimensions 画像の寸法をバリデーション
func (f *FileUtils) ValidateImageDimensions(filePath string, maxWidth, maxHeight int) error {
	// この実装では基本的なチェックのみ
	// 実際の画像処理ライブラリ（例：github.com/disintegration/imaging）を使用することを推奨

	if !f.isImageFile(filePath) {
		return fmt.Errorf("画像ファイルではありません")
	}

	// ここで実際の画像寸法チェックを実装
	// 簡略化のため、サイズのみチェック
	info, err := os.Stat(filePath)
	if err != nil {
		return err
	}

	// 仮の実装：ファイルサイズによる概算チェック
	if info.Size() > 10*1024*1024 { // 10MB以上は大きすぎると仮定
		return fmt.Errorf("画像ファイルが大きすぎます")
	}

	return nil
}

// GetMimeTypeByContent ファイル内容からMIMEタイプを判定
func (f *FileUtils) GetMimeTypeByContent(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// 最初の512バイトを読み取り
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	// Go標準のDetectContentTypeを使用
	mimeType := http.DetectContentType(buffer[:n])
	return mimeType, nil
}
