package userutil

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// GetUserIDFromContext はGinコンテキストからユーザーIDを取得します
// 取得に成功した場合はUUID型のユーザーIDと真を、失敗した場合は空のUUIDと偽を返します
func GetUserIDFromContext(c *gin.Context, logger *zap.Logger) (uuid.UUID, bool) {
	// コンテキストからユーザーIDを取得
	userIDValue, exists := c.Get("user_id")
	if !exists {
		if logger != nil {
			logger.Error("ユーザーIDがコンテキストに存在しません")
		}
		return uuid.Nil, false
	}

	// ユーザーIDをUUID型に変換
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		if logger != nil {
			logger.Error("ユーザーIDの型が無効です", zap.Any("userID", userIDValue))
		}
		return uuid.Nil, false
	}

	return userID, true
}

// UserIDToString はuuid.UUIDを文字列に変換します
func UserIDToString(userID uuid.UUID) string {
	return userID.String()
}

// StringToUserID は文字列をuuid.UUIDに変換します
// 変換に失敗した場合はエラーを返します
func StringToUserID(userIDStr string) (uuid.UUID, error) {
	return uuid.Parse(userIDStr)
}

// StringToUUID は文字列をuuid.UUIDに変換する汎用関数です
// 変換に失敗した場合はエラーを返します
func StringToUUID(idStr string) (uuid.UUID, error) {
	return uuid.Parse(idStr)
}

// UUIDToString はuuid.UUIDを文字列に変換する汎用関数です
func UUIDToString(id uuid.UUID) string {
	return id.String()
}

// GenerateUUID は新しいUUIDを生成します
func GenerateUUID() uuid.UUID {
	return uuid.New()
}

// IsValidUUID は文字列が有効なUUID形式かどうかを確認します
func IsValidUUID(idStr string) bool {
	_, err := uuid.Parse(idStr)
	return err == nil
}
