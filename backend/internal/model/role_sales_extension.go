package model

// 営業関連ロールの定義
const (
	// RoleSalesManager 営業管理者
	RoleSalesManager Role = 5
	// RoleSalesRep 営業担当者
	RoleSalesRep Role = 6
)

// 営業ロール拡張メソッド

// IsSalesManager 営業管理者かチェック
func (r Role) IsSalesManager() bool {
	return r == RoleSalesManager
}

// IsSalesRep 営業担当者かチェック
func (r Role) IsSalesRep() bool {
	return r == RoleSalesRep
}

// IsSalesRole 営業関連ロールかチェック
func (r Role) IsSalesRole() bool {
	return r == RoleSalesManager || r == RoleSalesRep
}

// HasSalesPermission 営業権限階層をチェック
// 営業管理者は営業担当者の権限も持つ
func (r Role) HasSalesPermission(required Role) bool {
	// 通常の管理者権限でも営業権限を持つ
	if r.IsAdmin() {
		return true
	}

	// 営業管理者は営業担当者の権限も持つ
	if r == RoleSalesManager && required == RoleSalesRep {
		return true
	}

	// 同じロールの場合
	return r == required
}

// UpdateRoleString 営業ロールを含む文字列変換（既存のString()を拡張）
func (r Role) StringExtended() string {
	switch r {
	case RoleSalesManager:
		return "sales_manager"
	case RoleSalesRep:
		return "sales_rep"
	default:
		return r.String()
	}
}

// UpdateRoleDisplayName 営業ロールを含む表示名取得（既存のDisplayName()を拡張）
func (r Role) DisplayNameExtended() string {
	switch r {
	case RoleSalesManager:
		return "営業管理者"
	case RoleSalesRep:
		return "営業担当者"
	default:
		return r.DisplayName()
	}
}

// ValidExtended 営業ロールを含む有効性チェック
func (r Role) ValidExtended() bool {
	return r >= RoleSuperAdmin && r <= RoleSalesRep
}

// ParseRoleExtended 営業ロールを含む文字列解析
func ParseRoleExtended(s string) (Role, error) {
	switch s {
	case "sales_manager":
		return RoleSalesManager, nil
	case "sales_rep":
		return RoleSalesRep, nil
	default:
		return ParseRole(s)
	}
}

// AllRolesExtended 営業ロールを含むすべてのロールを取得
func AllRolesExtended() []Role {
	return []Role{
		RoleSuperAdmin,
		RoleAdmin,
		RoleManager,
		RoleEmployee,
		RoleSalesManager,
		RoleSalesRep,
	}
}
