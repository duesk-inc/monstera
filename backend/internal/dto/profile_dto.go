package dto

// CertificationRequest 資格情報リクエスト
type CertificationRequest struct {
	Name       string `json:"name"`
	AcquiredAt string `json:"acquired_at"` // YYYY-MM形式（年月のみ）
}

// TechnologyItemRequest 技術項目リクエスト
type TechnologyItemRequest struct {
	CategoryName   string `json:"category_name"` // programming_languages, servers_databases, tools
	TechnologyName string `json:"technology_name"`
}

// WorkHistoryRequest 職務経歴リクエスト
type WorkHistoryRequest struct {
	ProjectName          string                  `json:"project_name"`
	StartDate            string                  `json:"start_date"`
	EndDate              string                  `json:"end_date"`
	Industry             int32                   `json:"industry"`
	ProjectOverview      string                  `json:"project_overview"`
	Responsibilities     string                  `json:"responsibilities"`
	Achievements         string                  `json:"achievements"`
	Notes                string                  `json:"notes"`
	Processes            []int32                 `json:"processes"`
	Technologies         string                  `json:"technologies"` // 後方互換性のため保持
	ProgrammingLanguages []string                `json:"programming_languages"`
	ServersDatabases     []string                `json:"servers_databases"`
	Tools                []string                `json:"tools"`
	TechnologyItems      []TechnologyItemRequest `json:"technology_items"`
	TeamSize             int32                   `json:"team_size"`
	Role                 string                  `json:"role"`
}

// ProfileSaveRequest プロフィール保存リクエスト
type ProfileSaveRequest struct {
	Education      string                 `json:"education"`
	NearestStation string                 `json:"nearest_station"`
	CanTravel      int32                  `json:"can_travel"`
	Certifications []CertificationRequest `json:"certifications"`
	AppealPoints   string                 `json:"appeal_points"`
	WorkHistory    []WorkHistoryRequest   `json:"work_history"`
}

// ProfileTempSaveRequest プロフィール一時保存リクエスト
type ProfileTempSaveRequest struct {
	Education      string                 `json:"education"`
	NearestStation string                 `json:"nearest_station"`
	CanTravel      int32                  `json:"can_travel"`
	Certifications []CertificationRequest `json:"certifications"`
	AppealPoints   string                 `json:"appeal_points"`
	WorkHistory    []WorkHistoryRequest   `json:"work_history"`
}

// TechnologyCategoryResponse 技術カテゴリレスポンス
type TechnologyCategoryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	SortOrder   int32  `json:"sort_order"`
}

// TechnologyItemResponse 技術項目レスポンス
type TechnologyItemResponse struct {
	ID             string                      `json:"id"`
	CategoryID     string                      `json:"category_id"`
	TechnologyName string                      `json:"technology_name"`
	Category       *TechnologyCategoryResponse `json:"category,omitempty"`
}

// ProfileResponse プロフィールレスポンス
type ProfileResponse struct {
	ID              string                   `json:"id"`
	UserID          string                   `json:"user_id"`
	Email           string                   `json:"email"`
	FirstName       string                   `json:"first_name"`
	LastName        string                   `json:"last_name"`
	FirstNameKana   string                   `json:"first_name_kana"`
	LastNameKana    string                   `json:"last_name_kana"`
	Birthdate       *string                  `json:"birthdate,omitempty"`
	Gender          string                   `json:"gender"`
	Address         string                   `json:"address"`
	PhoneNumber     string                   `json:"phone_number"`
	Education       string                   `json:"education"`
	NearestStation  string                   `json:"nearest_station"`
	CanTravel       int32                    `json:"can_travel"`
	HireDate        *string                  `json:"hire_date,omitempty"`
	Department      string                   `json:"department"`
	Position        string                   `json:"position"`
	AppealPoints    string                   `json:"appeal_points"`
	IsTempSaved     bool                     `json:"is_temp_saved"`
	TempSavedAt     *string                  `json:"temp_saved_at,omitempty"`
	LanguageSkills  []LanguageSkillResponse  `json:"language_skills"`
	FrameworkSkills []FrameworkSkillResponse `json:"framework_skills"`
	BusinessExps    []BusinessExpResponse    `json:"business_experiences"`
	Role            string                   `json:"role"`
}

// LanguageSkillResponse 言語スキルレスポンス
type LanguageSkillResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Level             int32  `json:"level"`
	YearsOfExperience int32  `json:"years_of_experience"`
	Months            int32  `json:"months"`
}

// FrameworkSkillResponse フレームワークスキルレスポンス
type FrameworkSkillResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Level             int32  `json:"level"`
	YearsOfExperience int32  `json:"years_of_experience"`
	Months            int32  `json:"months"`
}

// BusinessExpResponse 業務経験レスポンス
type BusinessExpResponse struct {
	ID                string `json:"id"`
	Industry          string `json:"industry"`
	ExperienceDetail  string `json:"experience_detail"`
	YearsOfExperience int32  `json:"years_of_experience"`
}

// WorkHistoryResponse 職務経歴レスポンス
type WorkHistoryResponse struct {
	ID                   string                   `json:"id"`
	ProjectName          string                   `json:"project_name"`
	StartDate            string                   `json:"start_date"`
	EndDate              *string                  `json:"end_date,omitempty"`
	Industry             int32                    `json:"industry"`
	ProjectOverview      string                   `json:"project_overview"`
	Responsibilities     string                   `json:"responsibilities"`
	Achievements         string                   `json:"achievements"`
	Notes                string                   `json:"notes"`
	Processes            []int32                  `json:"processes"`
	Technologies         string                   `json:"technologies"` // 後方互換性のため保持
	ProgrammingLanguages []string                 `json:"programming_languages"`
	ServersDatabases     []string                 `json:"servers_databases"`
	Tools                []string                 `json:"tools"`
	TechnologyItems      []TechnologyItemResponse `json:"technology_items"`
	TeamSize             int32                    `json:"team_size"`
	Role                 string                   `json:"role"`
}

// ProfileHistoryResponse プロフィール履歴レスポンス
type ProfileHistoryResponse struct {
	ID             string                       `json:"id"`
	ProfileID      string                       `json:"profile_id"`
	UserID         string                       `json:"user_id"`
	Education      string                       `json:"education"`
	NearestStation string                       `json:"nearest_station"`
	CanTravel      int32                        `json:"can_travel"`
	AppealPoints   string                       `json:"appeal_points"`
	Version        int32                        `json:"version"`
	CreatedAt      string                       `json:"created_at"`
	WorkHistories  []WorkHistoryHistoryResponse `json:"work_histories"`
}

// WorkHistoryHistoryResponse 職務経歴履歴レスポンス
type WorkHistoryHistoryResponse struct {
	ID               string  `json:"id"`
	HistoryID        string  `json:"history_id"`
	ProfileHistoryID string  `json:"profile_history_id"`
	UserID           string  `json:"user_id"`
	ProjectName      string  `json:"project_name"`
	StartDate        string  `json:"start_date"`
	EndDate          *string `json:"end_date"`
	Industry         int32   `json:"industry"`
	ProjectOverview  string  `json:"project_overview"`
	Role             string  `json:"role"`
	TeamSize         int32   `json:"team_size"`
	ProjectProcesses string  `json:"project_processes"`
	CreatedAt        string  `json:"created_at"`
}
