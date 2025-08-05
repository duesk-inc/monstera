package testdata

// TestEmails テスト用メールアドレスの定数定義
// これらのメールアドレスはテスト専用で、実際のユーザーには使用しないこと
const (
	// ロール別テストユーザー
	AdminEmail     = "admin@duesk.co.jp"          // 管理者ロール
	ManagerEmail   = "manager_test@duesk.co.jp"   // マネージャーロール
	EngineerEmail  = "engineer_test@duesk.co.jp"  // エンジニアロール
	SalesEmail     = "sales_test@duesk.co.jp"     // 営業ロール

	// 汎用テストユーザー
	DefaultTestEmail = "test@duesk.co.jp" // 最も使用頻度が高い汎用アカウント

	// 特殊用途
	UniqueTest1Email = "unique_test1@duesk.co.jp" // DB制約テスト用1
	UniqueTest2Email = "unique_test2@duesk.co.jp" // DB制約テスト用2

	// モックデータ用日本人名
	MockMaleEmail   = "yamada@duesk.co.jp" // 男性名の代表（山田太郎）
	MockFemaleEmail = "sato@duesk.co.jp"   // 女性名の代表（佐藤花子）
)


// TestUsers テスト用ユーザー情報の構造体
type TestUser struct {
	Email string
	Role  string
	Name  string
}

// GetTestUsers 標準的なテストユーザーのリストを返す
func GetTestUsers() []TestUser {
	return []TestUser{
		{
			Email: AdminEmail,
			Role:  "admin",
			Name:  "テスト管理者",
		},
		{
			Email: ManagerEmail,
			Role:  "manager",
			Name:  "テスト マネージャー",
		},
		{
			Email: EngineerEmail,
			Role:  "engineer",
			Name:  "テスト エンジニア",
		},
		{
			Email: SalesEmail,
			Role:  "sales",
			Name:  "テスト 営業",
		},
		{
			Email: DefaultTestEmail,
			Role:  "user",
			Name:  "テストユーザー",
		},
	}
}

// GetTestUserByEmail メールアドレスからテストユーザー情報を取得
func GetTestUserByEmail(email string) *TestUser {
	users := GetTestUsers()
	for _, user := range users {
		if user.Email == email {
			return &user
		}
	}
	return nil
}