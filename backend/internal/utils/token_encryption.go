package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"

	"github.com/duesk/monstera/internal/errors"
)

// TokenEncryption トークン暗号化ユーティリティ
type TokenEncryption struct {
	key []byte
}

// NewTokenEncryption 新しいトークン暗号化インスタンスを作成
func NewTokenEncryption(secretKey string) (*TokenEncryption, error) {
	if secretKey == "" {
		return nil, errors.NewAccountingError(
			errors.ErrInvalidEncryptionKey,
			"暗号化キーが空です",
		)
	}

	// 32バイトのキーを生成（SHA256ハッシュを使用）
	hash := sha256.Sum256([]byte(secretKey))

	return &TokenEncryption{
		key: hash[:],
	}, nil
}

// Encrypt データを暗号化
func (te *TokenEncryption) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", errors.NewAccountingError(
			errors.ErrEncryptionFailed,
			"暗号化するデータが空です",
		)
	}

	// AES暗号化ブロックを作成
	block, err := aes.NewCipher(te.key)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"AES暗号化ブロックの作成に失敗しました",
			err,
		)
	}

	// GCMモードを使用
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"GCMモードの初期化に失敗しました",
			err,
		)
	}

	// ランダムなnonceを生成
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"nonceの生成に失敗しました",
			err,
		)
	}

	// データを暗号化
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Base64エンコードして返す
	encoded := base64.StdEncoding.EncodeToString(ciphertext)
	return encoded, nil
}

// Decrypt データを復号化
func (te *TokenEncryption) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"復号化するデータが空です",
		)
	}

	// Base64デコード
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"Base64デコードに失敗しました",
			err,
		)
	}

	// AES暗号化ブロックを作成
	block, err := aes.NewCipher(te.key)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"AES暗号化ブロックの作成に失敗しました",
			err,
		)
	}

	// GCMモードを使用
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"GCMモードの初期化に失敗しました",
			err,
		)
	}

	// nonceサイズをチェック
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"暗号化データが不正です（サイズが小さすぎます）",
		)
	}

	// nonceと暗号化データを分離
	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]

	// データを復号化
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"データの復号化に失敗しました",
			err,
		)
	}

	return string(plaintext), nil
}

// EncryptAccessToken アクセストークンを暗号化
func (te *TokenEncryption) EncryptAccessToken(accessToken string) (string, error) {
	if accessToken == "" {
		return "", errors.NewAccountingError(
			errors.ErrEncryptionFailed,
			"アクセストークンが空です",
		)
	}

	encrypted, err := te.Encrypt(accessToken)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"アクセストークンの暗号化に失敗しました",
			err,
		)
	}

	return encrypted, nil
}

// DecryptAccessToken アクセストークンを復号化
func (te *TokenEncryption) DecryptAccessToken(encryptedToken string) (string, error) {
	if encryptedToken == "" {
		return "", errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"暗号化されたアクセストークンが空です",
		)
	}

	decrypted, err := te.Decrypt(encryptedToken)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"アクセストークンの復号化に失敗しました",
			err,
		)
	}

	return decrypted, nil
}

// EncryptRefreshToken リフレッシュトークンを暗号化
func (te *TokenEncryption) EncryptRefreshToken(refreshToken string) (string, error) {
	if refreshToken == "" {
		return "", errors.NewAccountingError(
			errors.ErrEncryptionFailed,
			"リフレッシュトークンが空です",
		)
	}

	encrypted, err := te.Encrypt(refreshToken)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"リフレッシュトークンの暗号化に失敗しました",
			err,
		)
	}

	return encrypted, nil
}

// DecryptRefreshToken リフレッシュトークンを復号化
func (te *TokenEncryption) DecryptRefreshToken(encryptedToken string) (string, error) {
	if encryptedToken == "" {
		return "", errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"暗号化されたリフレッシュトークンが空です",
		)
	}

	decrypted, err := te.Decrypt(encryptedToken)
	if err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"リフレッシュトークンの復号化に失敗しました",
			err,
		)
	}

	return decrypted, nil
}

// ValidateEncryptionKey 暗号化キーの妥当性をチェック
func ValidateEncryptionKey(key string) error {
	if len(key) < 16 {
		return errors.NewAccountingError(
			errors.ErrInvalidEncryptionKey,
			"暗号化キーは16文字以上である必要があります",
		).WithDetail("key_length", len(key))
	}

	if len(key) > 256 {
		return errors.NewAccountingError(
			errors.ErrInvalidEncryptionKey,
			"暗号化キーは256文字以下である必要があります",
		).WithDetail("key_length", len(key))
	}

	return nil
}

// GenerateSecureRandomKey セキュアなランダムキーを生成（開発・テスト用）
func GenerateSecureRandomKey(length int) (string, error) {
	if length < 16 {
		return "", errors.NewAccountingError(
			errors.ErrInvalidEncryptionKey,
			"キー長は16文字以上である必要があります",
		).WithDetail("requested_length", length)
	}

	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"ランダムキーの生成に失敗しました",
			err,
		)
	}

	// Base64エンコードしてプリンタブル文字列にする
	key := base64.URLEncoding.EncodeToString(bytes)

	// 指定された長さに調整
	if len(key) > length {
		key = key[:length]
	}

	return key, nil
}

// TokenPair トークンペア構造体
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// EncryptTokenPair トークンペアを暗号化
func (te *TokenEncryption) EncryptTokenPair(tokens *TokenPair) (*TokenPair, error) {
	if tokens == nil {
		return nil, errors.NewAccountingError(
			errors.ErrEncryptionFailed,
			"トークンペアがnullです",
		)
	}

	encryptedAccessToken, err := te.EncryptAccessToken(tokens.AccessToken)
	if err != nil {
		return nil, err
	}

	encryptedRefreshToken, err := te.EncryptRefreshToken(tokens.RefreshToken)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  encryptedAccessToken,
		RefreshToken: encryptedRefreshToken,
	}, nil
}

// DecryptTokenPair トークンペアを復号化
func (te *TokenEncryption) DecryptTokenPair(encryptedTokens *TokenPair) (*TokenPair, error) {
	if encryptedTokens == nil {
		return nil, errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"暗号化されたトークンペアがnullです",
		)
	}

	decryptedAccessToken, err := te.DecryptAccessToken(encryptedTokens.AccessToken)
	if err != nil {
		return nil, err
	}

	decryptedRefreshToken, err := te.DecryptRefreshToken(encryptedTokens.RefreshToken)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  decryptedAccessToken,
		RefreshToken: decryptedRefreshToken,
	}, nil
}

// SecureTokenStorage セキュアなトークンストレージインターフェース
type SecureTokenStorage interface {
	// StoreTokens トークンを安全に保存
	StoreTokens(userID string, tokens *TokenPair) error

	// RetrieveTokens トークンを取得
	RetrieveTokens(userID string) (*TokenPair, error)

	// DeleteTokens トークンを削除
	DeleteTokens(userID string) error

	// IsTokensExpired トークンの有効期限をチェック
	IsTokensExpired(userID string) (bool, error)
}

// InMemoryTokenStorage メモリ内トークンストレージ（開発・テスト用）
type InMemoryTokenStorage struct {
	encryption *TokenEncryption
	tokens     map[string]*TokenPair
}

// NewInMemoryTokenStorage 新しいメモリ内トークンストレージを作成
func NewInMemoryTokenStorage(encryption *TokenEncryption) *InMemoryTokenStorage {
	return &InMemoryTokenStorage{
		encryption: encryption,
		tokens:     make(map[string]*TokenPair),
	}
}

// StoreTokens トークンを保存
func (s *InMemoryTokenStorage) StoreTokens(userID string, tokens *TokenPair) error {
	if userID == "" {
		return errors.NewAccountingError(
			errors.ErrEncryptionFailed,
			"ユーザーIDが空です",
		)
	}

	encryptedTokens, err := s.encryption.EncryptTokenPair(tokens)
	if err != nil {
		return errors.NewAccountingErrorWithCause(
			errors.ErrEncryptionFailed,
			"トークンの暗号化に失敗しました",
			err,
		)
	}

	s.tokens[userID] = encryptedTokens
	return nil
}

// RetrieveTokens トークンを取得
func (s *InMemoryTokenStorage) RetrieveTokens(userID string) (*TokenPair, error) {
	if userID == "" {
		return nil, errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"ユーザーIDが空です",
		)
	}

	encryptedTokens, exists := s.tokens[userID]
	if !exists {
		return nil, errors.NewAccountingError(
			errors.ErrFreeeNotConnected,
			"トークンが見つかりません",
		).WithDetail("user_id", userID)
	}

	tokens, err := s.encryption.DecryptTokenPair(encryptedTokens)
	if err != nil {
		return nil, errors.NewAccountingErrorWithCause(
			errors.ErrDecryptionFailed,
			"トークンの復号化に失敗しました",
			err,
		)
	}

	return tokens, nil
}

// DeleteTokens トークンを削除
func (s *InMemoryTokenStorage) DeleteTokens(userID string) error {
	if userID == "" {
		return errors.NewAccountingError(
			errors.ErrDecryptionFailed,
			"ユーザーIDが空です",
		)
	}

	delete(s.tokens, userID)
	return nil
}

// IsTokensExpired トークンの有効期限をチェック（簡易実装）
func (s *InMemoryTokenStorage) IsTokensExpired(userID string) (bool, error) {
	_, exists := s.tokens[userID]
	return !exists, nil
}

// TokenEncryptionConfig 暗号化設定
type TokenEncryptionConfig struct {
	SecretKey string `json:"secret_key"`
	Algorithm string `json:"algorithm"` // "AES-256-GCM"
}

// Validate 設定の妥当性をチェック
func (c *TokenEncryptionConfig) Validate() error {
	if err := ValidateEncryptionKey(c.SecretKey); err != nil {
		return err
	}

	if c.Algorithm != "" && c.Algorithm != "AES-256-GCM" {
		return errors.NewAccountingError(
			errors.ErrInvalidEncryptionKey,
			"サポートされていない暗号化アルゴリズムです",
		).WithDetail("algorithm", c.Algorithm)
	}

	return nil
}

// TokenEncryptionMiddleware トークン暗号化のミドルウェア機能
type TokenEncryptionMiddleware struct {
	encryption *TokenEncryption
}

// NewTokenEncryptionMiddleware 新しいトークン暗号化ミドルウェアを作成
func NewTokenEncryptionMiddleware(encryption *TokenEncryption) *TokenEncryptionMiddleware {
	return &TokenEncryptionMiddleware{
		encryption: encryption,
	}
}

// EncryptSensitiveData 機密データを暗号化
func (tm *TokenEncryptionMiddleware) EncryptSensitiveData(data map[string]interface{}) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	sensitiveFields := []string{"access_token", "refresh_token", "api_key", "secret", "password"}

	for key, value := range data {
		if strValue, ok := value.(string); ok {
			// 機密フィールドかチェック
			isSensitive := false
			for _, field := range sensitiveFields {
				if key == field {
					isSensitive = true
					break
				}
			}

			if isSensitive && strValue != "" {
				encrypted, err := tm.encryption.Encrypt(strValue)
				if err != nil {
					return nil, errors.NewAccountingErrorWithCause(
						errors.ErrEncryptionFailed,
						fmt.Sprintf("フィールド %s の暗号化に失敗しました", key),
						err,
					)
				}
				result[key] = encrypted
			} else {
				result[key] = value
			}
		} else {
			result[key] = value
		}
	}

	return result, nil
}

// DecryptSensitiveData 機密データを復号化
func (tm *TokenEncryptionMiddleware) DecryptSensitiveData(data map[string]interface{}) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	sensitiveFields := []string{"access_token", "refresh_token", "api_key", "secret", "password"}

	for key, value := range data {
		if strValue, ok := value.(string); ok {
			// 機密フィールドかチェック
			isSensitive := false
			for _, field := range sensitiveFields {
				if key == field {
					isSensitive = true
					break
				}
			}

			if isSensitive && strValue != "" {
				decrypted, err := tm.encryption.Decrypt(strValue)
				if err != nil {
					return nil, errors.NewAccountingErrorWithCause(
						errors.ErrDecryptionFailed,
						fmt.Sprintf("フィールド %s の復号化に失敗しました", key),
						err,
					)
				}
				result[key] = decrypted
			} else {
				result[key] = value
			}
		} else {
			result[key] = value
		}
	}

	return result, nil
}
