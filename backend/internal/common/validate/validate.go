package validate

import (
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/common/logger"
)

// ParseUUID はUUID文字列をパースします
func ParseUUID(id string) (uuid.UUID, error) {
	if id == "" {
		return uuid.Nil, fmt.Errorf("UUIDが空です")
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("無効なUUID形式: %s: %w", id, err)
	}

	if parsedID == uuid.Nil {
		return uuid.Nil, fmt.Errorf("Nil UUIDは許可されていません")
	}

	return parsedID, nil
}

// ParseUUIDWithLogging はUUID文字列をパースし、エラーをログに記録します
func ParseUUIDWithLogging(loggerInstance *zap.Logger, id string, fieldName string) (uuid.UUID, error) {
	parsedID, err := ParseUUID(id)
	if err != nil {
		return uuid.Nil, logger.LogAndWrapError(loggerInstance, err, fmt.Sprintf("無効な%s", fieldName),
			zap.String(fieldName, id))
	}
	return parsedID, nil
}

// ValidateRequired は必須項目のバリデーションを行います
func ValidateRequired(value string, fieldName string) error {
	if value == "" {
		return fmt.Errorf("%sは必須項目です", fieldName)
	}
	return nil
}

// ValidateMinValue は最小値バリデーションを行います
func ValidateMinValue(value float64, minValue float64, fieldName string) error {
	if value < minValue {
		return fmt.Errorf("%sは%.1f以上である必要があります", fieldName, minValue)
	}
	return nil
}

// FindByCode は指定されたコードを持つエンティティをスライスから探します
func FindByCode[T any](items []T, code string, getCode func(T) string) (T, bool) {
	var empty T
	for _, item := range items {
		if getCode(item) == code {
			return item, true
		}
	}
	return empty, false
}
