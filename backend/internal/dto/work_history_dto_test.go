package dto

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestWorkHistoryEnhancedResponse_JSONSerialization(t *testing.T) {
	// テスト用のレスポンスデータを作成
	endDate := "2023-12-31"
	companyName := "株式会社テスト"
	overview := "テストプロジェクトの概要"
	responsibilities := "設計・開発・テスト"
	achievements := "期日通りの完了"
	remarks := "特になし"
	teamSize := int32(5)
	displayName := "Java"

	response := WorkHistoryEnhancedResponse{
		ID:               "test-id-123",
		UserID:           "user-id-456",
		ProjectName:      "テストプロジェクト",
		StartDate:        "2023-01-01",
		EndDate:          &endDate,
		Industry:         1, // IT・Web industry ID
		CompanyName:      &companyName,
		ProjectOverview:  &overview,
		Responsibilities: &responsibilities,
		Achievements:     &achievements,
		Remarks:          &remarks,
		TeamSize:         &teamSize,
		Role:             "SE",
		DurationMonths:   12,
		DurationText:     "1年",
		IsActive:         false,
		Processes:        []string{"要件定義", "基本設計", "詳細設計"},
		Technologies: []WorkHistoryTechnologyResponse{
			{
				ID:                    "tech-id-1",
				CategoryID:            "cat-id-1",
				CategoryName:          "programming_languages",
				CategoryDisplayName:   "プログラミング言語",
				TechnologyName:        "Java",
				TechnologyDisplayName: &displayName,
				SortOrder:             1,
			},
		},
		ITExperienceMonths: 36,
		ITExperienceText:   "3年",
		ProjectCount:       3,
		TechnologySkills: []TechnologySkillExperienceResponse{
			{
				TechnologyName:        "Java",
				TechnologyDisplayName: &displayName,
				CategoryName:          "programming_languages",
				CategoryDisplayName:   "プログラミング言語",
				TotalExperienceMonths: 24,
				ExperienceYears:       2,
				ExperienceMonths:      0,
				ExperienceText:        "2年",
				ProjectCount:          3,
				FirstUsedDate:         time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC),
				LastUsedDate:          time.Date(2023, 12, 31, 0, 0, 0, 0, time.UTC),
				IsRecentlyUsed:        true,
				SkillLevel:            "上級",
			},
		},
		CreatedAt: "2023-01-01T00:00:00Z",
		UpdatedAt: "2023-12-31T23:59:59Z",
	}

	// JSONシリアライゼーションテスト
	jsonData, err := json.Marshal(response)
	assert.NoError(t, err)
	assert.NotEmpty(t, jsonData)

	// JSONデシリアライゼーションテスト
	var decoded WorkHistoryEnhancedResponse
	err = json.Unmarshal(jsonData, &decoded)
	assert.NoError(t, err)

	// 主要フィールドの検証
	assert.Equal(t, response.ID, decoded.ID)
	assert.Equal(t, response.ProjectName, decoded.ProjectName)
	assert.Equal(t, response.ITExperienceMonths, decoded.ITExperienceMonths)
	assert.Equal(t, response.ITExperienceText, decoded.ITExperienceText)
	assert.Equal(t, response.ProjectCount, decoded.ProjectCount)
	assert.Len(t, decoded.TechnologySkills, 1)
	assert.Equal(t, "Java", decoded.TechnologySkills[0].TechnologyName)
}

func TestWorkHistorySummaryResponse_JSONSerialization(t *testing.T) {
	firstProject := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	lastProject := time.Date(2023, 12, 31, 0, 0, 0, 0, time.UTC)
	latestProjectName := "最新プロジェクト"
	latestRole := "PL"

	summary := WorkHistorySummaryResponse{
		UserID:                  "user-123",
		UserName:                "テスト 太郎",
		UserEmail:               "test@duesk.co.jp",
		TotalITExperienceMonths: 48,
		ITExperienceYears:       4,
		ITExperienceMonths:      0,
		ITExperienceText:        "4年",
		ITExperienceLevel:       "ミドル",
		TotalProjectCount:       5,
		ActiveProjectCount:      1,
		FirstProjectDate:        &firstProject,
		LastProjectDate:         &lastProject,
		LatestProjectName:       &latestProjectName,
		LatestRole:              &latestRole,
		TotalTechnologyCount:    15,
		RecentTechnologyCount:   8,
		TopTechnologies:         []string{"Java", "MySQL", "Spring Boot", "React", "Docker"},
		CalculatedAt:            time.Now(),
	}

	// JSONシリアライゼーションテスト
	jsonData, err := json.Marshal(summary)
	assert.NoError(t, err)
	assert.NotEmpty(t, jsonData)

	// JSONデシリアライゼーションテスト
	var decoded WorkHistorySummaryResponse
	err = json.Unmarshal(jsonData, &decoded)
	assert.NoError(t, err)

	// 主要フィールドの検証
	assert.Equal(t, summary.UserID, decoded.UserID)
	assert.Equal(t, summary.TotalITExperienceMonths, decoded.TotalITExperienceMonths)
	assert.Equal(t, summary.ITExperienceLevel, decoded.ITExperienceLevel)
	assert.Len(t, decoded.TopTechnologies, 5)
}

func TestWorkHistoryRequestV2_JSONDeserialization(t *testing.T) {
	jsonStr := `{
		"project_name": "テストプロジェクト",
		"start_date": "2023-01-01",
		"end_date": "2023-12-31",
		"industry": "IT・Web",
		"company_name": "株式会社テスト",
		"team_size": 5,
		"role": "SE",
		"project_overview": "システム開発プロジェクト",
		"responsibilities": "設計・開発・テスト",
		"achievements": "期日通り完了",
		"remarks": "特になし",
		"processes": ["要件定義", "基本設計", "詳細設計"],
		"technologies": [
			{
				"category_id": "550e8400-e29b-41d4-a716-446655440000",
				"technology_name": "Java"
			},
			{
				"category_id": "550e8400-e29b-41d4-a716-446655440001",
				"technology_name": "MySQL"
			}
		]
	}`

	var request WorkHistoryRequestV2
	err := json.Unmarshal([]byte(jsonStr), &request)
	assert.NoError(t, err)

	// フィールドの検証
	assert.Equal(t, "テストプロジェクト", request.ProjectName)
	assert.Equal(t, "2023-01-01", request.StartDate)
	assert.NotNil(t, request.EndDate)
	assert.Equal(t, "2023-12-31", *request.EndDate)
	assert.Equal(t, "IT・Web", request.Industry)
	assert.NotNil(t, request.CompanyName)
	assert.Equal(t, "株式会社テスト", *request.CompanyName)
	assert.NotNil(t, request.TeamSize)
	assert.Equal(t, 5, *request.TeamSize)
	assert.Equal(t, "SE", request.Role)
	assert.Len(t, request.Processes, 3)
	assert.Len(t, request.Technologies, 2)
	assert.Equal(t, "Java", request.Technologies[0].TechnologyName)
	assert.Equal(t, "MySQL", request.Technologies[1].TechnologyName)
}

func TestWorkHistoryPDFGenerateRequestV2_JSONDeserialization(t *testing.T) {
	jsonStr := `{
		"user_id": "550e8400-e29b-41d4-a716-446655440000",
		"available_start_date": "2024-04-01",
		"include_summary": true,
		"include_technology_skills": true,
		"include_project_details": true,
		"format": "A4",
		"template": "standard",
		"language": "ja",
		"date_from": "2020-01-01",
		"date_to": "2023-12-31",
		"include_industries": ["IT・Web", "金融"],
		"include_technologies": ["Java", "Python"],
		"min_project_duration": 3,
		"watermark": "機密情報",
		"allow_print": true,
		"allow_copy": false
	}`

	var request WorkHistoryPDFGenerateRequestV2
	err := json.Unmarshal([]byte(jsonStr), &request)
	assert.NoError(t, err)

	// フィールドの検証
	assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", request.UserID)
	assert.NotNil(t, request.AvailableStartDate)
	assert.Equal(t, "2024-04-01", *request.AvailableStartDate)
	assert.True(t, request.IncludeSummary)
	assert.True(t, request.IncludeTechnologySkills)
	assert.True(t, request.IncludeProjectDetails)
	assert.Equal(t, "A4", request.Format)
	assert.Equal(t, "standard", request.Template)
	assert.Equal(t, "ja", request.Language)
	assert.Len(t, request.IncludeIndustries, 2)
	assert.Len(t, request.IncludeTechnologies, 2)
	assert.NotNil(t, request.MinProjectDuration)
	assert.Equal(t, int32(3), *request.MinProjectDuration)
	assert.NotNil(t, request.Watermark)
	assert.Equal(t, "機密情報", *request.Watermark)
	assert.True(t, request.AllowPrint)
	assert.False(t, request.AllowCopy)
}

func TestWorkHistoryQueryRequest_DefaultValues(t *testing.T) {
	// 空のリクエストでのデフォルト値テスト
	var request WorkHistoryQueryRequest

	// JSON文字列から最小限のリクエストをデシリアライズ
	jsonStr := `{}`
	err := json.Unmarshal([]byte(jsonStr), &request)
	assert.NoError(t, err)

	// デフォルト値は構造体では設定されないため、
	// アプリケーション側で設定されることを想定
	assert.Equal(t, int32(0), request.Page)
	assert.Equal(t, int32(0), request.Limit)
	assert.Equal(t, "", request.SortBy)
	assert.Equal(t, "", request.SortOrder)
}

func TestWorkHistoryListResponse_JSONSerialization(t *testing.T) {
	// テスト用の一覧レスポンスを作成
	endDate := "2023-12-31"
	companyName := "株式会社テスト"

	listResponse := WorkHistoryListResponse{
		Summary: WorkHistorySummaryResponse{
			UserID:                  "user-123",
			UserName:                "テスト 太郎",
			UserEmail:               "test@duesk.co.jp",
			TotalITExperienceMonths: 36,
			ITExperienceYears:       3,
			ITExperienceMonths:      0,
			ITExperienceText:        "3年",
			ITExperienceLevel:       "ミドル",
			TotalProjectCount:       3,
			ActiveProjectCount:      1,
			TotalTechnologyCount:    10,
			RecentTechnologyCount:   5,
			TopTechnologies:         []string{"Java", "MySQL", "Spring Boot"},
			CalculatedAt:            time.Now(),
		},
		WorkHistories: []WorkHistoryEnhancedResponse{
			{
				ID:                 "work-1",
				UserID:             "user-123",
				ProjectName:        "プロジェクト1",
				StartDate:          "2023-01-01",
				EndDate:            &endDate,
				Industry:           1, // IT・Web industry ID
				CompanyName:        &companyName,
				Role:               "SE",
				DurationMonths:     12,
				DurationText:       "1年",
				IsActive:           false,
				ITExperienceMonths: 36,
				ITExperienceText:   "3年",
				ProjectCount:       3,
				CreatedAt:          "2023-01-01T00:00:00Z",
				UpdatedAt:          "2023-12-31T23:59:59Z",
			},
		},
		TechnologySkills: []TechnologySkillExperienceResponse{},
		Total:            1,
		Page:             1,
		Limit:            10,
		HasNext:          false,
	}

	// JSONシリアライゼーションテスト
	jsonData, err := json.Marshal(listResponse)
	assert.NoError(t, err)
	assert.NotEmpty(t, jsonData)

	// JSONデシリアライゼーションテスト
	var decoded WorkHistoryListResponse
	err = json.Unmarshal(jsonData, &decoded)
	assert.NoError(t, err)

	// 主要フィールドの検証
	assert.Equal(t, listResponse.Summary.UserID, decoded.Summary.UserID)
	assert.Len(t, decoded.WorkHistories, 1)
	assert.Equal(t, "プロジェクト1", decoded.WorkHistories[0].ProjectName)
	assert.Equal(t, int32(1), decoded.Total)
	assert.False(t, decoded.HasNext)
}

func TestTechnologySuggestionResponse_JSONSerialization(t *testing.T) {
	displayName := "Java"

	suggestion := TechnologySuggestionResponse{
		TechnologyName:        "Java",
		TechnologyDisplayName: &displayName,
		CategoryName:          "programming_languages",
		CategoryDisplayName:   "プログラミング言語",
		UsageCount:            150,
		IsPopular:             true,
		MatchScore:            0.95,
	}

	// JSONシリアライゼーションテスト
	jsonData, err := json.Marshal(suggestion)
	assert.NoError(t, err)
	assert.NotEmpty(t, jsonData)

	// JSONデシリアライゼーションテスト
	var decoded TechnologySuggestionResponse
	err = json.Unmarshal(jsonData, &decoded)
	assert.NoError(t, err)

	// 主要フィールドの検証
	assert.Equal(t, suggestion.TechnologyName, decoded.TechnologyName)
	assert.Equal(t, suggestion.UsageCount, decoded.UsageCount)
	assert.Equal(t, suggestion.IsPopular, decoded.IsPopular)
	assert.Equal(t, suggestion.MatchScore, decoded.MatchScore)
}

func TestWorkHistoryTempSaveRequestV2_JSONDeserialization(t *testing.T) {
	jsonStr := `{
		"project_name": "一時保存プロジェクト",
		"start_date": "2023-01-01",
		"industry": "IT・Web",
		"temp_save_key": "temp_key_123",
		"auto_save": true,
		"saved_at": "2023-06-15T10:30:00Z"
	}`

	var request WorkHistoryTempSaveRequestV2
	err := json.Unmarshal([]byte(jsonStr), &request)
	assert.NoError(t, err)

	// フィールドの検証
	assert.NotNil(t, request.ProjectName)
	assert.Equal(t, "一時保存プロジェクト", *request.ProjectName)
	assert.NotNil(t, request.StartDate)
	assert.Equal(t, "2023-01-01", *request.StartDate)
	assert.NotNil(t, request.Industry)
	assert.Equal(t, "IT・Web", *request.Industry)
	assert.NotNil(t, request.TempSaveKey)
	assert.Equal(t, "temp_key_123", *request.TempSaveKey)
	assert.True(t, request.AutoSave)
	assert.False(t, request.SavedAt.IsZero())
}
