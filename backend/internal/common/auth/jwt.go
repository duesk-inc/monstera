package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTClaims JWTトークンのクレーム
type JWTClaims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	Role   string    `json:"role"`  // 互換性のため残す（最高権限のロール）
	Roles  []string  `json:"roles"` // 複数ロール対応
	jwt.RegisteredClaims
}

// GenerateToken JWTトークンを生成する
func GenerateToken(userID uuid.UUID, email string, role string, secret string, expiresIn time.Duration) (string, error) {
	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(), // JTI (JWT ID) - トークンの一意性を保証
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "monstera-api",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return signedToken, nil
}

// GenerateTokenWithRoles 複数ロール対応のJWTトークンを生成する
func GenerateTokenWithRoles(userID uuid.UUID, email string, roles []string, secret string, expiresIn time.Duration) (string, error) {
	// 最高権限のロールを決定（互換性のため）
	highestRole := "employee"
	if len(roles) > 0 {
		highestRole = roles[0]
		// TODO: ロールの優先順位を考慮して最高権限を選択
	}

	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   highestRole,
		Roles:  roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(), // JTI (JWT ID) - トークンの一意性を保証
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "monstera-api",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return signedToken, nil
}

// ValidateToken JWTトークンを検証する
func ValidateToken(tokenString string, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
