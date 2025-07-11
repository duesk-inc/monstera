package repository

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
)

var (
	// ErrInvalidID は無効なIDエラー
	ErrInvalidID = errors.New("無効なID")
)

// ValidateUUID はUUIDが有効かどうかを検証する
func ValidateUUID(id uuid.UUID) error {
	if id == uuid.Nil {
		return ErrInvalidID
	}
	return nil
}

// ParseUUID は文字列からUUIDを解析する
func ParseUUID(s string) (uuid.UUID, error) {
	if s == "" {
		return uuid.Nil, ErrInvalidID
	}

	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, fmt.Errorf("UUID解析エラー: %w", err)
	}

	if id == uuid.Nil {
		return uuid.Nil, ErrInvalidID
	}

	return id, nil
}

// NewUUID は新しいUUIDを生成する
func NewUUID() uuid.UUID {
	return uuid.New()
}

// UUIDToString はUUIDを文字列に変換する
func UUIDToString(id uuid.UUID) string {
	return id.String()
}

// EnsureUUID は既存のIDがnilの場合に新しいIDを生成する
func EnsureUUID(id uuid.UUID) uuid.UUID {
	if id == uuid.Nil {
		return NewUUID()
	}
	return id
}
