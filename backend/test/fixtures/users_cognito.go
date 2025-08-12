package fixtures

import (
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
)

// Cognito Sub形式のテストID
var (
	// 固定のCognito Sub（テスト用）
	CognitoSubSuperAdmin = "ap-northeast-1:00000000-0000-0000-0000-000000000001"
	CognitoSubAdmin      = "ap-northeast-1:00000000-0000-0000-0000-000000000002"
	CognitoSubManager1   = "ap-northeast-1:00000000-0000-0000-0000-000000000003"
	CognitoSubManager2   = "ap-northeast-1:00000000-0000-0000-0000-000000000004"
	CognitoSubEmployee1  = "ap-northeast-1:00000000-0000-0000-0000-000000000005"
	CognitoSubEmployee2  = "ap-northeast-1:00000000-0000-0000-0000-000000000006"
	CognitoSubEmployee3  = "ap-northeast-1:00000000-0000-0000-0000-000000000007"
	CognitoSubEmployee4  = "ap-northeast-1:00000000-0000-0000-0000-000000000008"
	CognitoSubEmployee5  = "ap-northeast-1:00000000-0000-0000-0000-000000000009"
)

// GetTestUsers テスト用ユーザーデータを取得（Cognito対応版）
func GetTestUsers() []model.User {
	now := time.Now()
	hireDate := now.AddDate(-2, 0, 0) // 2年前

	return []model.User{
		// スーパー管理者
		{
			ID:             CognitoSubSuperAdmin,
			Email:          "superadmin@example.com",
			FirstName:      "Super",
			LastName:       "Admin",
			Name:           "Super Admin",
			FirstNameKana:  "スーパー",
			LastNameKana:   "アドミン",
			Role:           model.RoleSuperAdmin,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "SA0001",
			Department:     "システム管理部",
			Position:       "システム管理者",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// 管理者
		{
			ID:             CognitoSubAdmin,
			Email:          "admin@example.com",
			FirstName:      "Admin",
			LastName:       "User",
			Name:           "Admin User",
			FirstNameKana:  "アドミン",
			LastNameKana:   "ユーザー",
			Role:           model.RoleAdmin,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "AD0001",
			Department:     "管理部",
			Position:       "管理者",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// マネージャー1
		{
			ID:             CognitoSubManager1,
			Email:          "manager1@example.com",
			FirstName:      "太郎",
			LastName:       "山田",
			Name:           "山田 太郎",
			FirstNameKana:  "タロウ",
			LastNameKana:   "ヤマダ",
			Sei:            "山田",
			Mei:            "太郎",
			SeiKana:        "ヤマダ",
			MeiKana:        "タロウ",
			Role:           model.RoleManager,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "MG0001",
			Department:     "開発部",
			Position:       "マネージャー",
			HireDate:       &hireDate,
			EngineerStatus: "active",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// マネージャー2
		{
			ID:             CognitoSubManager2,
			Email:          "manager2@example.com",
			FirstName:      "花子",
			LastName:       "鈴木",
			Name:           "鈴木 花子",
			FirstNameKana:  "ハナコ",
			LastNameKana:   "スズキ",
			Sei:            "鈴木",
			Mei:            "花子",
			SeiKana:        "スズキ",
			MeiKana:        "ハナコ",
			Role:           model.RoleManager,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "MG0002",
			Department:     "営業部",
			Position:       "マネージャー",
			HireDate:       &hireDate,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// 一般社員1（エンジニア）
		{
			ID:             CognitoSubEmployee1,
			Email:          "employee1@example.com",
			FirstName:      "一郎",
			LastName:       "田中",
			Name:           "田中 一郎",
			FirstNameKana:  "イチロウ",
			LastNameKana:   "タナカ",
			Sei:            "田中",
			Mei:            "一郎",
			SeiKana:        "タナカ",
			MeiKana:        "イチロウ",
			Role:           model.RoleEngineer,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "EMP001",
			Department:     "開発部",
			Position:       "エンジニア",
			HireDate:       &hireDate,
			EngineerStatus: "active",
			ManagerID:      &CognitoSubManager1,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// 一般社員2（エンジニア）
		{
			ID:             CognitoSubEmployee2,
			Email:          "employee2@example.com",
			FirstName:      "二郎",
			LastName:       "佐藤",
			Name:           "佐藤 二郎",
			FirstNameKana:  "ジロウ",
			LastNameKana:   "サトウ",
			Sei:            "佐藤",
			Mei:            "二郎",
			SeiKana:        "サトウ",
			MeiKana:        "ジロウ",
			Role:           model.RoleEngineer,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "EMP002",
			Department:     "開発部",
			Position:       "シニアエンジニア",
			HireDate:       &hireDate,
			EngineerStatus: "active",
			ManagerID:      &CognitoSubManager1,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// 一般社員3（営業）
		{
			ID:             CognitoSubEmployee3,
			Email:          "employee3@example.com",
			FirstName:      "三郎",
			LastName:       "高橋",
			Name:           "高橋 三郎",
			FirstNameKana:  "サブロウ",
			LastNameKana:   "タカハシ",
			Sei:            "高橋",
			Mei:            "三郎",
			SeiKana:        "タカハシ",
			MeiKana:        "サブロウ",
			Role:           model.RoleEngineer,
			Active:         true,
			Status:         "active",
			EmployeeNumber: "EMP003",
			Department:     "営業部",
			Position:       "営業担当",
			HireDate:       &hireDate,
			ManagerID:      &CognitoSubManager2,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// 一般社員4（休職中）
		{
			ID:             CognitoSubEmployee4,
			Email:          "employee4@example.com",
			FirstName:      "四郎",
			LastName:       "伊藤",
			Name:           "伊藤 四郎",
			FirstNameKana:  "シロウ",
			LastNameKana:   "イトウ",
			Sei:            "伊藤",
			Mei:            "四郎",
			SeiKana:        "イトウ",
			MeiKana:        "シロウ",
			Role:           model.RoleEngineer,
			Active:         false,
			Status:         "inactive",
			EmployeeNumber: "EMP004",
			Department:     "開発部",
			Position:       "エンジニア",
			HireDate:       &hireDate,
			EngineerStatus: "long_leave",
			ManagerID:      &CognitoSubManager1,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		// 一般社員5（フォローアップ必要）
		{
			ID:               CognitoSubEmployee5,
			Email:            "employee5@example.com",
			FirstName:        "五郎",
			LastName:         "渡辺",
			Name:             "渡辺 五郎",
			FirstNameKana:    "ゴロウ",
			LastNameKana:     "ワタナベ",
			Sei:              "渡辺",
			Mei:              "五郎",
			SeiKana:          "ワタナベ",
			MeiKana:          "ゴロウ",
			Role:             model.RoleEngineer,
			Active:           true,
			Status:           "active",
			EmployeeNumber:   "EMP005",
			Department:       "開発部",
			Position:         "ジュニアエンジニア",
			HireDate:         &hireDate,
			EngineerStatus:   "active",
			ManagerID:        &CognitoSubManager1,
			FollowUpRequired: true,
			FollowUpReason:   &[]string{"新人教育中"}[0],
			CreatedAt:        now,
			UpdatedAt:        now,
		},
	}
}

// GetUserByID IDでユーザーを取得
func GetUserByID(id string) *model.User {
	users := GetTestUsers()
	for _, user := range users {
		if user.ID == id {
			return &user
		}
	}
	return nil
}

// GetUserByEmail メールアドレスでユーザーを取得
func GetUserByEmail(email string) *model.User {
	users := GetTestUsers()
	for _, user := range users {
		if user.Email == email {
			return &user
		}
	}
	return nil
}

// GetUsersByRole ロールでユーザーを取得
func GetUsersByRole(role model.Role) []model.User {
	users := GetTestUsers()
	var result []model.User
	for _, user := range users {
		if user.Role == role {
			result = append(result, user)
		}
	}
	return result
}

// CreateBulkTestUsers 大量のテストユーザーを生成
func CreateBulkTestUsers(count int, roleDistribution map[model.Role]int) []model.User {
	var users []model.User
	now := time.Now()
	userIndex := 10 // 既存のテストユーザーの後から開始

	for role, roleCount := range roleDistribution {
		for i := 0; i < roleCount; i++ {
			cognitoSub := fmt.Sprintf("ap-northeast-1:00000000-0000-0000-0000-%012d", userIndex)
			user := model.User{
				ID:             cognitoSub,
				Email:          fmt.Sprintf("user%d@example.com", userIndex),
				FirstName:      fmt.Sprintf("User%d", userIndex),
				LastName:       "Test",
				Name:           fmt.Sprintf("Test User%d", userIndex),
				FirstNameKana:  "テスト",
				LastNameKana:   fmt.Sprintf("ユーザー%d", userIndex),
				Role:           role,
				Active:         true,
				Status:         "active",
				EmployeeNumber: fmt.Sprintf("EMP%03d", userIndex),
				Department:     "テスト部",
				Position:       "テスト職",
				CreatedAt:      now,
				UpdatedAt:      now,
			}
			users = append(users, user)
			userIndex++
		}
	}

	return users
}
