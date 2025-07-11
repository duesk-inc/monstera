package validator

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestValidateWorkHistory(t *testing.T) {
	validator := NewWorkHistoryValidator()

	// 有効なリクエスト
	validReq := WorkHistoryRequest{
		ProjectName:      "Webアプリケーション開発",
		StartDate:        "2023-01-01",
		EndDate:          stringPtr("2023-12-31"),
		Industry:         "IT・Web",
		CompanyName:      stringPtr("株式会社サンプル"),
		TeamSize:         intPtr(5),
		Role:             "SE",
		ProjectOverview:  stringPtr("ECサイトの開発プロジェクト"),
		Responsibilities: stringPtr("要件定義、基本設計、詳細設計"),
		Achievements:     stringPtr("期日通りのリリース"),
		Remarks:          stringPtr("特になし"),
		Processes:        []string{"要件定義", "基本設計", "詳細設計"},
		Technologies: []TechnologyRequest{
			{CategoryID: "550e8400-e29b-41d4-a716-446655440000", TechnologyName: "Java"},
			{CategoryID: "550e8400-e29b-41d4-a716-446655440001", TechnologyName: "MySQL"},
		},
	}

	errors := validator.ValidateWorkHistory(validReq)
	assert.Empty(t, errors, "有効なリクエストでエラーが発生しました")
}

func TestValidateRequired(t *testing.T) {
	validator := NewWorkHistoryValidator()

	// 必須項目が空のリクエスト
	emptyReq := WorkHistoryRequest{
		ProjectName: "",
		StartDate:   "",
		Industry:    "",
		Role:        "",
	}

	errors := validator.ValidateWorkHistory(emptyReq)

	// 必須項目のエラーが含まれていることを確認
	assert.True(t, containsFieldError(errors, "project_name", "REQUIRED"))
	assert.True(t, containsFieldError(errors, "start_date", "REQUIRED"))
	assert.True(t, containsFieldError(errors, "industry", "REQUIRED"))
	assert.True(t, containsFieldError(errors, "role", "REQUIRED"))
}

func TestValidateProjectName(t *testing.T) {
	tests := []struct {
		name          string
		projectName   string
		expectedError string
		expectedCode  string
	}{
		{
			name:        "正常なプロジェクト名",
			projectName: "Webアプリケーション開発",
		},
		{
			name:          "255文字を超える",
			projectName:   strings.Repeat("あ", 256),
			expectedError: "project_name",
			expectedCode:  "MAX_LENGTH",
		},
		{
			name:          "SQLインジェクション文字",
			projectName:   "Project'; DROP TABLE users; --",
			expectedError: "project_name",
			expectedCode:  "INVALID_CHARS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := NewWorkHistoryValidator()
			req := WorkHistoryRequest{
				ProjectName: tt.projectName,
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
			}

			errors := validator.ValidateWorkHistory(req)

			if tt.expectedError != "" {
				assert.True(t, containsFieldError(errors, tt.expectedError, tt.expectedCode))
			} else {
				assert.False(t, containsFieldError(errors, "project_name", ""))
			}
		})
	}
}

func TestValidateDateRange(t *testing.T) {
	validator := NewWorkHistoryValidator()

	tests := []struct {
		name         string
		startDate    string
		endDate      *string
		expectedCode string
	}{
		{
			name:      "正常な日付範囲",
			startDate: "2023-01-01",
			endDate:   stringPtr("2023-12-31"),
		},
		{
			name:         "無効な開始日形式",
			startDate:    "2023/01/01",
			expectedCode: "INVALID_FORMAT",
		},
		{
			name:         "未来の開始日",
			startDate:    time.Now().AddDate(0, 0, 1).Format("2006-01-02"),
			expectedCode: "FUTURE_DATE",
		},
		{
			name:         "50年以上前の開始日",
			startDate:    time.Now().AddDate(-51, 0, 0).Format("2006-01-02"),
			expectedCode: "TOO_OLD",
		},
		{
			name:         "終了日が開始日より前",
			startDate:    "2023-12-31",
			endDate:      stringPtr("2023-01-01"),
			expectedCode: "INVALID_RANGE",
		},
		{
			name:         "1年以上未来の終了日",
			startDate:    "2023-01-01",
			endDate:      stringPtr(time.Now().AddDate(2, 0, 0).Format("2006-01-02")),
			expectedCode: "TOO_FUTURE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := WorkHistoryRequest{
				ProjectName: "Test Project",
				StartDate:   tt.startDate,
				EndDate:     tt.endDate,
				Industry:    "IT・Web",
				Role:        "SE",
			}

			errors := validator.ValidateWorkHistory(req)

			if tt.expectedCode != "" {
				found := false
				for _, err := range errors {
					if err.Code == tt.expectedCode {
						found = true
						break
					}
				}
				assert.True(t, found, "期待されるエラーコードが見つかりませんでした: %s", tt.expectedCode)
			}
		})
	}
}

func TestValidateIndustry(t *testing.T) {
	validator := NewWorkHistoryValidator()

	validIndustries := []string{
		"金融", "製造", "流通", "通信", "医療", "教育", "官公庁",
		"IT・Web", "不動産", "エネルギー", "建設", "運輸", "その他",
	}

	// 有効な業種のテスト
	for _, industry := range validIndustries {
		t.Run("有効な業種_"+industry, func(t *testing.T) {
			req := WorkHistoryRequest{
				ProjectName: "Test Project",
				StartDate:   "2023-01-01",
				Industry:    industry,
				Role:        "SE",
			}

			errors := validator.ValidateWorkHistory(req)
			assert.False(t, containsFieldError(errors, "industry", "INVALID_VALUE"))
		})
	}

	// 無効な業種のテスト
	t.Run("無効な業種", func(t *testing.T) {
		req := WorkHistoryRequest{
			ProjectName: "Test Project",
			StartDate:   "2023-01-01",
			Industry:    "無効な業種",
			Role:        "SE",
		}

		errors := validator.ValidateWorkHistory(req)
		assert.True(t, containsFieldError(errors, "industry", "INVALID_VALUE"))
	})
}

func TestValidateTeamSize(t *testing.T) {
	tests := []struct {
		name         string
		teamSize     *int
		expectedCode string
	}{
		{
			name:     "正常なチーム規模",
			teamSize: intPtr(5),
		},
		{
			name:     "nil (任意項目)",
			teamSize: nil,
		},
		{
			name:         "範囲外 (小)",
			teamSize:     intPtr(0),
			expectedCode: "OUT_OF_RANGE",
		},
		{
			name:         "範囲外 (大)",
			teamSize:     intPtr(1001),
			expectedCode: "OUT_OF_RANGE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := NewWorkHistoryValidator()
			req := WorkHistoryRequest{
				ProjectName: "Test Project",
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
				TeamSize:    tt.teamSize,
			}

			errors := validator.ValidateWorkHistory(req)

			if tt.expectedCode != "" {
				assert.True(t, containsFieldError(errors, "team_size", tt.expectedCode))
			} else {
				assert.False(t, containsFieldError(errors, "team_size", ""))
			}
		})
	}
}

func TestValidateRole(t *testing.T) {
	validator := NewWorkHistoryValidator()

	validRoles := []string{"PG", "SE", "PL", "PM", "SA", "DB", "NW", "OP", "TEST", "その他"}

	// 有効な役割のテスト
	for _, role := range validRoles {
		t.Run("有効な役割_"+role, func(t *testing.T) {
			req := WorkHistoryRequest{
				ProjectName: "Test Project",
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        role,
			}

			errors := validator.ValidateWorkHistory(req)
			assert.False(t, containsFieldError(errors, "role", "INVALID_VALUE"))
		})
	}

	// 無効な役割のテスト
	t.Run("無効な役割", func(t *testing.T) {
		req := WorkHistoryRequest{
			ProjectName: "Test Project",
			StartDate:   "2023-01-01",
			Industry:    "IT・Web",
			Role:        "無効な役割",
		}

		errors := validator.ValidateWorkHistory(req)
		assert.True(t, containsFieldError(errors, "role", "INVALID_VALUE"))
	})
}

func TestValidateTextFields(t *testing.T) {
	tests := []struct {
		name         string
		field        string
		text         string
		maxLength    int
		expectedCode string
	}{
		{
			name:      "プロジェクト概要_正常",
			field:     "project_overview",
			text:      "テストプロジェクト",
			maxLength: 2000,
		},
		{
			name:         "プロジェクト概要_長すぎる",
			field:        "project_overview",
			text:         strings.Repeat("あ", 2001),
			maxLength:    2000,
			expectedCode: "MAX_LENGTH",
		},
		{
			name:      "担当業務_正常",
			field:     "responsibilities",
			text:      "設計・開発",
			maxLength: 2000,
		},
		{
			name:      "成果実績_正常",
			field:     "achievements",
			text:      "期日通り完了",
			maxLength: 2000,
		},
		{
			name:         "備考_長すぎる",
			field:        "remarks",
			text:         strings.Repeat("あ", 1001),
			maxLength:    1000,
			expectedCode: "MAX_LENGTH",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := NewWorkHistoryValidator()
			req := WorkHistoryRequest{
				ProjectName: "Test Project",
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
			}

			// フィールドに応じて値を設定
			switch tt.field {
			case "project_overview":
				req.ProjectOverview = &tt.text
			case "responsibilities":
				req.Responsibilities = &tt.text
			case "achievements":
				req.Achievements = &tt.text
			case "remarks":
				req.Remarks = &tt.text
			}

			errors := validator.ValidateWorkHistory(req)

			if tt.expectedCode != "" {
				assert.True(t, containsFieldError(errors, tt.field, tt.expectedCode))
			} else {
				assert.False(t, containsFieldError(errors, tt.field, ""))
			}
		})
	}
}

func TestValidateProcesses(t *testing.T) {
	tests := []struct {
		name         string
		processes    []string
		expectedCode string
	}{
		{
			name:      "正常な工程",
			processes: []string{"要件定義", "基本設計", "詳細設計"},
		},
		{
			name:      "空配列",
			processes: []string{},
		},
		{
			name:         "無効な工程",
			processes:    []string{"要件定義", "無効な工程"},
			expectedCode: "INVALID_VALUE",
		},
		{
			name:         "重複工程",
			processes:    []string{"要件定義", "要件定義"},
			expectedCode: "DUPLICATE",
		},
		{
			name:         "工程数上限超過",
			processes:    []string{"要件定義", "基本設計", "詳細設計", "実装", "単体テスト", "結合テスト", "システムテスト", "運用・保守", "その他", "要件定義", "基本設計"},
			expectedCode: "TOO_MANY",
		},
		{
			name:         "空文字の工程",
			processes:    []string{"要件定義", ""},
			expectedCode: "EMPTY",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := NewWorkHistoryValidator()
			req := WorkHistoryRequest{
				ProjectName: "Test Project",
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
				Processes:   tt.processes,
			}

			errors := validator.ValidateWorkHistory(req)

			if tt.expectedCode != "" {
				found := false
				for _, err := range errors {
					if err.Code == tt.expectedCode {
						found = true
						break
					}
				}
				assert.True(t, found, "期待されるエラーコードが見つかりませんでした: %s", tt.expectedCode)
			}
		})
	}
}

func TestValidateTechnologies(t *testing.T) {
	validUUID := "550e8400-e29b-41d4-a716-446655440000"

	tests := []struct {
		name         string
		technologies []TechnologyRequest
		expectedCode string
	}{
		{
			name: "正常な技術情報",
			technologies: []TechnologyRequest{
				{CategoryID: validUUID, TechnologyName: "Java"},
				{CategoryID: validUUID, TechnologyName: "MySQL"},
			},
		},
		{
			name:         "空配列",
			technologies: []TechnologyRequest{},
		},
		{
			name: "カテゴリID空",
			technologies: []TechnologyRequest{
				{CategoryID: "", TechnologyName: "Java"},
			},
			expectedCode: "REQUIRED",
		},
		{
			name: "無効なUUID形式",
			technologies: []TechnologyRequest{
				{CategoryID: "invalid-uuid", TechnologyName: "Java"},
			},
			expectedCode: "INVALID_FORMAT",
		},
		{
			name: "技術名空",
			technologies: []TechnologyRequest{
				{CategoryID: validUUID, TechnologyName: ""},
			},
			expectedCode: "REQUIRED",
		},
		{
			name: "技術名長すぎる",
			technologies: []TechnologyRequest{
				{CategoryID: validUUID, TechnologyName: strings.Repeat("a", 101)},
			},
			expectedCode: "MAX_LENGTH",
		},
		{
			name: "技術名無効文字",
			technologies: []TechnologyRequest{
				{CategoryID: validUUID, TechnologyName: "Java<script>"},
			},
			expectedCode: "INVALID_CHARS",
		},
		{
			name: "重複技術",
			technologies: []TechnologyRequest{
				{CategoryID: validUUID, TechnologyName: "Java"},
				{CategoryID: validUUID, TechnologyName: "Java"},
			},
			expectedCode: "DUPLICATE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := NewWorkHistoryValidator()
			req := WorkHistoryRequest{
				ProjectName:  "Test Project",
				StartDate:    "2023-01-01",
				Industry:     "IT・Web",
				Role:         "SE",
				Technologies: tt.technologies,
			}

			errors := validator.ValidateWorkHistory(req)

			if tt.expectedCode != "" {
				found := false
				for _, err := range errors {
					if err.Code == tt.expectedCode {
						found = true
						break
					}
				}
				assert.True(t, found, "期待されるエラーコードが見つかりませんでした: %s", tt.expectedCode)
			}
		})
	}
}

func TestValidatorHelperMethods(t *testing.T) {
	validator := NewWorkHistoryValidator()

	t.Run("containsInvalidChars", func(t *testing.T) {
		tests := []struct {
			input    string
			expected bool
		}{
			{"正常なテキスト", false},
			{"Normal text", false},
			{"Text with 'quote", true},
			{"Text with ; semicolon", true},
			{"Text with -- comment", true},
			{"Text with SELECT", true},
		}

		for _, tt := range tests {
			result := validator.containsInvalidChars(tt.input)
			assert.Equal(t, tt.expected, result, "Input: %s", tt.input)
		}
	})

	t.Run("isValidUUID", func(t *testing.T) {
		tests := []struct {
			input    string
			expected bool
		}{
			{"550e8400-e29b-41d4-a716-446655440000", true},
			{"invalid-uuid", false},
			{"", false},
			{"550e8400e29b41d4a716446655440000", false},
		}

		for _, tt := range tests {
			result := validator.isValidUUID(tt.input)
			assert.Equal(t, tt.expected, result, "Input: %s", tt.input)
		}
	})

	t.Run("isValidTechnologyName", func(t *testing.T) {
		tests := []struct {
			input    string
			expected bool
		}{
			{"Java", true},
			{"JavaScript", true},
			{"C++", true},
			{"C#", true},
			{".NET", true},
			{"Node.js", true},
			{"Spring Boot", true},
			{"プログラミング言語", true},
			{"Java<script>", false},
			{"Test&Invalid", false},
		}

		for _, tt := range tests {
			result := validator.isValidTechnologyName(tt.input)
			assert.Equal(t, tt.expected, result, "Input: %s", tt.input)
		}
	})
}

func TestValidatorErrorHandling(t *testing.T) {
	validator := NewWorkHistoryValidator()

	// エラーを追加
	validator.addError("test_field", "TEST_CODE", "テストエラー")

	t.Run("HasErrors", func(t *testing.T) {
		assert.True(t, validator.HasErrors())
	})

	t.Run("GetErrorMessages", func(t *testing.T) {
		messages := validator.GetErrorMessages()
		assert.Len(t, messages, 1)
		assert.Equal(t, "テストエラー", messages[0])
	})

	t.Run("GetErrorsByField", func(t *testing.T) {
		errors := validator.GetErrorsByField("test_field")
		assert.Len(t, errors, 1)
		assert.Equal(t, "TEST_CODE", errors[0].Code)
	})
}

// ヘルパー関数
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func containsFieldError(errors []ValidationError, field, code string) bool {
	for _, err := range errors {
		if err.Field == field && (code == "" || err.Code == code) {
			return true
		}
	}
	return false
}
