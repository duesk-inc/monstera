package dto

// SkillSheetResponse スキルシートレスポンス
type SkillSheetResponse struct {
	UserID          string                   `json:"user_id"`
	Email           string                   `json:"email"`
	FirstName       string                   `json:"first_name"`
	LastName        string                   `json:"last_name"`
	FirstNameKana   string                   `json:"first_name_kana"`
	LastNameKana    string                   `json:"last_name_kana"`
	WorkHistories   []WorkHistoryResponse    `json:"work_histories"`
	TechnicalSkills []TechnicalSkillResponse `json:"technical_skills"`
	CreatedAt       string                   `json:"created_at"`
	UpdatedAt       string                   `json:"updated_at"`
}

// TechnicalSkillResponse 技術スキルレスポンス
type TechnicalSkillResponse struct {
	CategoryID   string   `json:"category_id"`
	CategoryName string   `json:"category_name"`
	DisplayName  string   `json:"display_name"`
	Technologies []string `json:"technologies"`
}

// SkillSheetSaveRequest スキルシート保存リクエスト
type SkillSheetSaveRequest struct {
	WorkHistory []WorkHistoryRequest `json:"work_history"`
}

// SkillSheetTempSaveRequest スキルシート一時保存リクエスト
type SkillSheetTempSaveRequest struct {
	WorkHistory []WorkHistoryRequest `json:"work_history"`
}

// WorkHistoryOnlyResponse 職務経歴のみのレスポンス（既存のWorkHistoryResponseを活用）
type WorkHistoryOnlyResponse struct {
	UserID        string                `json:"user_id"`
	WorkHistories []WorkHistoryResponse `json:"work_histories"`
	CreatedAt     string                `json:"created_at"`
	UpdatedAt     string                `json:"updated_at"`
}
