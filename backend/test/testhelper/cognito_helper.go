package testhelper

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/duesk/monstera/internal/model"
)

// GenerateCognitoSub テスト用のCognito Sub IDを生成
func GenerateCognitoSub() string {
	// Cognito Subの形式: リージョン:UUID形式
	// 例: us-east-1:12345678-1234-1234-1234-123456789012
	return fmt.Sprintf("ap-northeast-1:%s", generateUUIDString())
}

// generateUUIDString UUID形式の文字列を生成（テスト用簡易版）
func generateUUIDString() string {
	// 実際のUUIDではなく、テスト用の簡易的なUUID風文字列を生成
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		rand.Uint32(),
		rand.Uint32()&0xffff,
		rand.Uint32()&0xffff,
		rand.Uint32()&0xffff,
		rand.Uint64()&0xffffffffffff,
	)
}

// CreateTestUser テスト用ユーザーを作成（Cognito対応版）
func CreateTestUser(email, firstName, lastName string, role model.Role) *model.User {
	cognitoSub := GenerateCognitoSub()
	return &model.User{
		ID:            cognitoSub,
		Email:         email,
		FirstName:     firstName,
		LastName:      lastName,
		Name:          fmt.Sprintf("%s %s", lastName, firstName),
		FirstNameKana: "テスト",
		LastNameKana:  "ユーザー",
		Role:          role,
		Active:        true,
		Status:        "active",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

// CreateTestUsers 複数のテストユーザーを作成
func CreateTestUsers(count int, rolePrefix string, role model.Role) []*model.User {
	users := make([]*model.User, count)
	for i := 0; i < count; i++ {
		users[i] = CreateTestUser(
			fmt.Sprintf("%s%d@example.com", rolePrefix, i+1),
			fmt.Sprintf("%s%d", rolePrefix, i+1),
			"User",
			role,
		)
	}
	return users
}

// CreateTestEngineer テスト用エンジニアを作成
func CreateTestEngineer(employeeNumber string) *model.User {
	user := CreateTestUser(
		fmt.Sprintf("engineer%s@example.com", employeeNumber),
		"太郎",
		"山田",
		model.RoleEngineer,
	)

	// エンジニア固有のフィールドを設定
	user.Sei = "山田"
	user.Mei = "太郎"
	user.SeiKana = "ヤマダ"
	user.MeiKana = "タロウ"
	user.EmployeeNumber = employeeNumber
	user.Department = "開発部"
	user.Position = "エンジニア"
	user.EngineerStatus = "active"

	hireDate := time.Now().AddDate(-2, 0, 0) // 2年前
	user.HireDate = &hireDate

	return user
}

// CreateTestManager テスト用マネージャーを作成
func CreateTestManager(departmentID string) *model.User {
	user := CreateTestUser(
		"manager@example.com",
		"管理",
		"太郎",
		model.RoleManager,
	)

	if departmentID != "" {
		user.DepartmentID = &departmentID
	}

	return user
}

// CreateTestAdmin テスト用管理者を作成
func CreateTestAdmin() *model.User {
	return CreateTestUser(
		"admin@example.com",
		"Admin",
		"User",
		model.RoleAdmin,
	)
}

// CreateTestSuperAdmin テスト用スーパー管理者を作成
func CreateTestSuperAdmin() *model.User {
	return CreateTestUser(
		"superadmin@example.com",
		"Super",
		"Admin",
		model.RoleSuperAdmin,
	)
}

// TestUserWithDepartment 部署情報付きのテストユーザーを作成
type TestUserWithDepartment struct {
	User       *model.User
	Department *model.Department
}

// CreateTestUserWithDepartment 部署情報付きのテストユーザーを作成
func CreateTestUserWithDepartment(role model.Role) *TestUserWithDepartment {
	dept := &model.Department{
		ID:   generateUUIDString(),
		Name: "テスト部署",
	}

	user := CreateTestUser(
		"user-with-dept@example.com",
		"部署",
		"太郎",
		role,
	)
	user.DepartmentID = &dept.ID

	return &TestUserWithDepartment{
		User:       user,
		Department: dept,
	}
}

// CreateTestUserWithManager マネージャー付きのテストユーザーを作成
func CreateTestUserWithManager() (*model.User, *model.User) {
	manager := CreateTestManager("")

	user := CreateTestUser(
		"user-with-manager@example.com",
		"部下",
		"太郎",
		model.RoleEngineer,
	)
	user.ManagerID = &manager.ID

	return user, manager
}
