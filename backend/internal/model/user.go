package model

import (
	"time"

	"gorm.io/gorm"
)

// User ユーザーモデル（Cognito Sub主キー版）
type User struct {
	// Cognito Sub を主キーとして使用
	ID    string `gorm:"type:varchar(255);primary_key" json:"id"` // Cognito Sub
	Email string `gorm:"size:255;not null;unique" json:"email"`
	// Passwordフィールドは削除（Cognito認証のみ）

	// 基本情報
	FirstName     string     `gorm:"size:100;not null" json:"first_name"`
	LastName      string     `gorm:"size:100;not null" json:"last_name"`
	Name          string     `gorm:"size:255" json:"name"` // Cognito連携用フルネーム
	FirstNameKana string     `gorm:"size:100" json:"first_name_kana"`
	LastNameKana  string     `gorm:"size:100" json:"last_name_kana"`
	Birthdate     *time.Time `gorm:"default:null" json:"birthdate"`
	Gender        string     `gorm:"size:10" json:"gender"`
	Address       string     `gorm:"size:500" json:"address"`
	PhoneNumber   string     `gorm:"size:20" json:"phone_number"`

	// 権限・ロール
	Role        Role  `gorm:"type:int;not null;default:4" json:"role"`        // 4 = RoleEngineer
	DefaultRole *Role `gorm:"type:int;default:null" json:"default_role"`

	// 組織情報
	DepartmentID *string `gorm:"type:varchar(36);column:department_id" json:"department_id"`
	ManagerID    *string `gorm:"type:varchar(255)" json:"manager_id"` // Cognito Sub

	// ステータス
	Active           bool       `gorm:"default:true" json:"active"`
	Status           string     `gorm:"size:20;default:'active'" json:"status"`
	FollowUpRequired bool       `gorm:"default:false" json:"follow_up_required"`
	FollowUpReason   *string    `gorm:"type:text" json:"follow_up_reason"`
	LastFollowUpDate *time.Time `json:"last_follow_up_date"`

	// エンジニア関連フィールド
	Sei            string     `gorm:"size:50" json:"sei"`
	Mei            string     `gorm:"size:50" json:"mei"`
	SeiKana        string     `gorm:"size:50" json:"sei_kana"`
	MeiKana        string     `gorm:"size:50" json:"mei_kana"`
	EmployeeNumber string     `gorm:"size:6;unique" json:"employee_number"`
	Department     string     `gorm:"size:100" json:"department"`
	Position       string     `gorm:"size:100" json:"position"`
	HireDate       *time.Time `json:"hire_date"`
	Education      string     `gorm:"size:200" json:"education"`
	EngineerStatus string     `gorm:"column:engineer_status;type:varchar(20);default:'active'" json:"engineer_status"`

	// タイムスタンプ
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーションシップ
	DepartmentRelation *Department `gorm:"foreignKey:DepartmentID" json:"department_relation,omitempty"`
	Manager            *User       `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
}

// TableName テーブル名を指定
func (User) TableName() string {
	return "users"
}

// BeforeCreateフックは削除（UUID生成不要）

// FullName 氏名を取得
func (u *User) FullName() string {
	if u.Name != "" {
		return u.Name
	}
	return u.LastName + " " + u.FirstName
}

// FullNameKana カナ氏名を取得
func (u *User) FullNameKana() string {
	return u.LastNameKana + " " + u.FirstNameKana
}

// IsAdmin 管理者権限を持っているかチェック
func (u *User) IsAdmin() bool {
	return u.Role == RoleSuperAdmin || u.Role == RoleAdmin
}

// IsManager マネージャー権限を持っているかチェック
func (u *User) IsManager() bool {
	return u.Role == RoleManager || u.IsAdmin()
}

// HasRole 指定されたロールを持っているかチェック
func (u *User) HasRole(role Role) bool {
	return u.Role == role
}

// CanManage 指定されたユーザーを管理できるかチェック
func (u *User) CanManage(targetUser *User) bool {
	// スーパー管理者は全員を管理可能
	if u.Role == RoleSuperAdmin {
		return true
	}

	// 管理者は一般ユーザーとマネージャーを管理可能
	if u.Role == RoleAdmin {
		return targetUser.Role == RoleEngineer || targetUser.Role == RoleManager
	}

	// マネージャーは自分の部下のみ管理可能
	if u.Role == RoleManager && targetUser.ManagerID != nil {
		return *targetUser.ManagerID == u.ID
	}

	return false
}

// IsActive アクティブなユーザーかチェック
func (u *User) IsActive() bool {
	return u.Active && u.Status == "active" && u.DeletedAt.Time.IsZero()
}

// NeedsFollowUp フォローアップが必要かチェック
func (u *User) NeedsFollowUp() bool {
	return u.FollowUpRequired && u.IsActive()
}

// GetJapaneseName 日本語名を取得（姓名が設定されている場合は優先）
func (u *User) GetJapaneseName() string {
	if u.Sei != "" && u.Mei != "" {
		return u.Sei + " " + u.Mei
	}
	return u.FullName()
}

// GetJapaneseNameKana 日本語カナ名を取得
func (u *User) GetJapaneseNameKana() string {
	if u.SeiKana != "" && u.MeiKana != "" {
		return u.SeiKana + " " + u.MeiKana
	}
	return u.FullNameKana()
}
