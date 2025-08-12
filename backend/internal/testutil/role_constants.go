package testutil

import "github.com/duesk/monstera/internal/model"

// ロール定数（テスト用）
const (
	// ロール文字列定数
	RoleStringSuperAdmin = "super_admin"
	RoleStringAdmin      = "admin"
	RoleStringManager    = "manager"
	RoleStringEngineer   = "engineer"

	// ロール数値定数
	RoleValueSuperAdmin = 1
	RoleValueAdmin      = 2
	RoleValueManager    = 3
	RoleValueEngineer   = 4
)

// GetRoleString はロール型から文字列を取得
func GetRoleString(role model.Role) string {
	switch role {
	case model.RoleSuperAdmin:
		return RoleStringSuperAdmin
	case model.RoleAdmin:
		return RoleStringAdmin
	case model.RoleManager:
		return RoleStringManager
	case model.RoleEngineer:
		return RoleStringEngineer
	default:
		return ""
	}
}

// GetRoleFromString は文字列からロール型を取得
func GetRoleFromString(roleStr string) model.Role {
	switch roleStr {
	case RoleStringSuperAdmin:
		return model.RoleSuperAdmin
	case RoleStringAdmin:
		return model.RoleAdmin
	case RoleStringManager:
		return model.RoleManager
	case RoleStringEngineer:
		return model.RoleEngineer
	default:
		return model.RoleEngineer // デフォルト
	}
}

// GetRoleValue はロール型から数値を取得
func GetRoleValue(role model.Role) int {
	return int(role)
}

// GetRoleFromValue は数値からロール型を取得
func GetRoleFromValue(value int) model.Role {
	return model.Role(value)
}