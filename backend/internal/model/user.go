package model

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User ユーザーモデル
type User struct {
	ID               uuid.UUID  `gorm:"type:varchar(36);primary_key" json:"id"`
	Email            string     `gorm:"size:255;not null;unique" json:"email"`
	Password         string     `gorm:"size:255;not null" json:"-"`
	FirstName        string     `gorm:"size:255;not null" json:"first_name"`
	LastName         string     `gorm:"size:255;not null" json:"last_name"`
	Name             string     `gorm:"size:255" json:"name"` // テストで必要なNameフィールド
	FirstNameKana    string     `gorm:"size:255" json:"first_name_kana"`
	LastNameKana     string     `gorm:"size:255" json:"last_name_kana"`
	Birthdate        *time.Time `gorm:"default:null" json:"birthdate"`
	Gender           string     `gorm:"size:50" json:"gender"`
	Address          string     `gorm:"size:500" json:"address"`
	PhoneNumber      string     `gorm:"size:20" json:"phone_number"`
	Role             Role       `gorm:"type:tinyint;not null;default:4" json:"role"`                // 互換性のため一時的に残す
	Roles            []Role     `gorm:"-" json:"roles"`                                             // 複数ロール対応
	UserRoles        []UserRole `gorm:"foreignKey:UserID" json:"-"`                                 // リレーション
	DefaultRole      *Role      `gorm:"type:tinyint;default:null" json:"default_role"`              // デフォルトロール
	DepartmentID     *uuid.UUID `gorm:"type:varchar(36);column:department_id" json:"department_id"` // 所属部署
	ManagerID        *uuid.UUID `gorm:"type:varchar(36)" json:"manager_id"`                         // 上司
	Active           bool       `gorm:"default:true" json:"active"`
	Status           string     `gorm:"size:20;default:'active'" json:"status"` // ユーザーステータス
	CognitoSub       string     `gorm:"size:255" json:"cognito_sub"`            // Cognito Sub ID
	FollowUpRequired bool       `gorm:"default:false" json:"follow_up_required"`
	FollowUpReason   *string    `gorm:"type:text" json:"follow_up_reason"`
	LastFollowUpDate *time.Time `json:"last_follow_up_date"`

	// エンジニア関連フィールド
	Sei            string         `gorm:"size:50" json:"sei"`                                                   // 姓
	Mei            string         `gorm:"size:50" json:"mei"`                                                   // 名
	SeiKana        string         `gorm:"size:50" json:"sei_kana"`                                              // 姓カナ
	MeiKana        string         `gorm:"size:50" json:"mei_kana"`                                              // 名カナ
	EmployeeNumber string         `gorm:"size:20;unique" json:"employee_number"`                                // 社員番号
	Department     string         `gorm:"size:100" json:"department"`                                           // 部署名
	Position       string         `gorm:"size:100" json:"position"`                                             // 役職
	HireDate       *time.Time     `json:"hire_date"`                                                            // 入社日
	Education      string         `gorm:"size:200" json:"education"`                                            // 学歴
	EngineerStatus string         `gorm:"column:engineer_status;size:20;default:active" json:"engineer_status"` // ステータス
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーションシップ
	DepartmentRelation *Department `gorm:"foreignKey:DepartmentID" json:"department_relation,omitempty"`
	Manager            *User       `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
}

// BeforeCreate UUIDを生成
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// SetPassword パスワードをハッシュ化して設定
func (u *User) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword パスワードが正しいか確認
func (u *User) CheckPassword(password string) bool {
	// デバッグ用に比較内容の文字数を出力（セキュリティ上、実際の内容は出力しない）
	fmt.Printf("Input password length: %d, Stored hash length: %d\n", len(password), len(u.Password))

	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	// エラーの場合もデバッグ情報として記録
	if err != nil {
		fmt.Printf("Password check failed: %v\n", err)
	}
	return err == nil
}

// FullName 氏名を取得
func (u *User) FullName() string {
	return u.LastName + " " + u.FirstName
}

// HasRole 指定されたロールを持っているかチェック
func (u *User) HasRole(role Role) bool {
	for _, r := range u.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// IsAdmin 管理者権限を持っているかチェック（複数ロール対応）
func (u *User) IsAdmin() bool {
	for _, r := range u.Roles {
		if r.IsAdmin() {
			return true
		}
	}
	return false
}

// IsManager マネージャー権限を持っているかチェック（複数ロール対応）
func (u *User) IsManager() bool {
	for _, r := range u.Roles {
		if r.IsManager() {
			return true
		}
	}
	return false
}

// GetHighestRole 最も高い権限のロールを取得
func (u *User) GetHighestRole() Role {
	if len(u.Roles) == 0 {
		return RoleEmployee // デフォルト
	}

	highest := u.Roles[0]
	for _, r := range u.Roles {
		if r < highest { // 数値が小さいほど権限が高い
			highest = r
		}
	}
	return highest
}

// LoadRolesFromUserRoles UserRolesリレーションからRoles配列を構築
func (u *User) LoadRolesFromUserRoles() {
	u.Roles = make([]Role, len(u.UserRoles))
	for i, ur := range u.UserRoles {
		u.Roles[i] = ur.Role
	}
}

// GetEffectiveDefaultRole 有効なデフォルトロールを取得（設定されていない場合は最高権限ロールを返す）
func (u *User) GetEffectiveDefaultRole() Role {
	// デフォルトロールが設定されており、かつそのロールを持っている場合
	if u.DefaultRole != nil && u.HasRole(*u.DefaultRole) {
		return *u.DefaultRole
	}
	// それ以外の場合は最高権限ロールを返す
	return u.GetHighestRole()
}
