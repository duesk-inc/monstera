package roleutil

import (
	"fmt"

	"github.com/duesk/monstera/internal/model"
)

// LegacyRoleMapping 旧ロール名から新ロールへのマッピング
var LegacyRoleMapping = map[string]model.Role{
	"admin":    model.RoleAdmin,
	"manager":  model.RoleManager,
	"employee": model.RoleEmployee,
	"user":     model.RoleEmployee, // 旧仕様の"user"は"employee"にマッピング
}

// ConvertLegacyRole 旧ロール文字列を新ロール型に変換
func ConvertLegacyRole(legacy string) (model.Role, error) {
	if role, ok := LegacyRoleMapping[legacy]; ok {
		return role, nil
	}
	return 0, fmt.Errorf("unknown legacy role: %s", legacy)
}

// ConvertToLegacyRole 新ロール型を旧ロール文字列に変換（互換性のため）
func ConvertToLegacyRole(role model.Role) string {
	switch role {
	case model.RoleSuperAdmin:
		return "admin" // super_adminは旧システムではadminとして扱う
	case model.RoleAdmin:
		return "admin"
	case model.RoleManager:
		return "manager"
	case model.RoleEmployee:
		return "employee"
	default:
		return "employee" // デフォルト
	}
}

// MigrationRoleMap データベース移行用のマッピング
var MigrationRoleMap = map[string]int{
	"admin":    int(model.RoleAdmin),
	"manager":  int(model.RoleManager),
	"employee": int(model.RoleEmployee),
	"user":     int(model.RoleEmployee),
}

// GetRoleValue データベース保存用の数値を取得
func GetRoleValue(roleStr string) (int, error) {
	if val, ok := MigrationRoleMap[roleStr]; ok {
		return val, nil
	}
	return 0, fmt.Errorf("invalid role string: %s", roleStr)
}

// IsHigherOrEqualRole 権限レベルの比較（後方互換性）
func IsHigherOrEqualRole(userRole, requiredRole model.Role) bool {
	return userRole.HasPermission(requiredRole)
}

// CanAccessResource リソースアクセス権限のチェック
func CanAccessResource(userRole model.Role, resourceOwnerRole model.Role) bool {
	// 自分と同じか、より低い権限のリソースにアクセス可能
	return userRole <= resourceOwnerRole
}

// GetHighestRole 複数のロールから最高権限を取得
func GetHighestRole(roles []model.Role) model.Role {
	if len(roles) == 0 {
		return model.RoleEmployee
	}

	highest := roles[0]
	for _, role := range roles[1:] {
		if role < highest {
			highest = role
		}
	}
	return highest
}
