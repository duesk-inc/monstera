package model

import (
	"database/sql/driver"
	"fmt"
)

// Role ユーザーロール（数値型）
type Role int

const (
	// RoleSuperAdmin 最高権限
	RoleSuperAdmin Role = 1
	// RoleAdmin 管理者
	RoleAdmin Role = 2
	// RoleManager マネージャー
	RoleManager Role = 3
	// RoleEngineer エンジニア（デフォルト）
	RoleEngineer Role = 4
	// RoleEmployee 後方互換性のためのエイリアス（非推奨）
	// Deprecated: Use RoleEngineer instead
	RoleEmployee = RoleEngineer
)

// String ロールを文字列に変換
func (r Role) String() string {
	switch r {
	case RoleSuperAdmin:
		return "super_admin"
	case RoleAdmin:
		return "admin"
	case RoleManager:
		return "manager"
	case RoleEngineer:
		return "engineer"
	default:
		return "unknown"
	}
}

// DisplayName ロールの表示名を取得
func (r Role) DisplayName() string {
	switch r {
	case RoleSuperAdmin:
		return "スーパー管理者"
	case RoleAdmin:
		return "管理者"
	case RoleManager:
		return "マネージャー"
	case RoleEngineer:
		return "エンジニア"
	default:
		return "不明"
	}
}

// HasPermission 権限階層をチェック（数値が小さいほど権限が高い）
func (r Role) HasPermission(required Role) bool {
	return r <= required
}

// IsAdmin 管理者権限以上かチェック
func (r Role) IsAdmin() bool {
	return r <= RoleAdmin
}

// IsManager マネージャー権限以上かチェック
func (r Role) IsManager() bool {
	return r <= RoleManager
}

// Valid ロールが有効かチェック
func (r Role) Valid() bool {
	return r >= RoleSuperAdmin && r <= RoleEngineer
}

// Scan データベースから読み取り
func (r *Role) Scan(value interface{}) error {
	if value == nil {
		*r = RoleEngineer
		return nil
	}

	switch v := value.(type) {
	case int64:
		*r = Role(v)
	case int:
		*r = Role(v)
	case string:
		// 互換性のため文字列からの変換もサポート
		parsed, err := ParseRole(v)
		if err != nil {
			return err
		}
		*r = parsed
	default:
		return fmt.Errorf("cannot scan %T into Role", value)
	}

	if !r.Valid() {
		return fmt.Errorf("invalid role value: %d", *r)
	}

	return nil
}

// Value データベースへの書き込み
func (r Role) Value() (driver.Value, error) {
	if !r.Valid() {
		return nil, fmt.Errorf("invalid role value: %d", r)
	}
	return int64(r), nil
}

// ParseRole 文字列からロールを解析
func ParseRole(s string) (Role, error) {
	switch s {
	case "super_admin":
		return RoleSuperAdmin, nil
	case "admin":
		return RoleAdmin, nil
	case "manager":
		return RoleManager, nil
	case "engineer", "employee", "user": // 互換性のため"employee"と"user"も受け入れる
		return RoleEngineer, nil
	default:
		return 0, fmt.Errorf("unknown role: %s", s)
	}
}

// AllRoles すべてのロールを取得
func AllRoles() []Role {
	return []Role{
		RoleSuperAdmin,
		RoleAdmin,
		RoleManager,
		RoleEngineer,
	}
}

// RoleNames すべてのロール名を取得
func RoleNames() []string {
	roles := AllRoles()
	names := make([]string, len(roles))
	for i, role := range roles {
		names[i] = role.String()
	}
	return names
}
