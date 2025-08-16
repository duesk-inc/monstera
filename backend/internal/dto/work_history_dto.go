package dto

import "time"

// WorkHistoryEnhancedResponse 拡張職務経歴レスポンス
type WorkHistoryEnhancedResponse struct {
	// 基本情報
	ID               string  `json:"id"`
	UserID           string  `json:"user_id"`
	ProfileID        string  `json:"profile_id"`
	ProjectName      string  `json:"project_name"`
	StartDate        string  `json:"start_date"`
	EndDate          *string `json:"end_date,omitempty"`
	Industry         int32   `json:"industry"`
	IndustryName     string  `json:"industry_name,omitempty"`
	CompanyName      *string `json:"company_name,omitempty"`
	ProjectOverview  *string `json:"project_overview,omitempty"`
	Responsibilities *string `json:"responsibilities,omitempty"`
	Achievements     *string `json:"achievements,omitempty"`
	Remarks          *string `json:"remarks,omitempty"`
	TeamSize         *int32  `json:"team_size,omitempty"`
	Role             string  `json:"role"`

	// 期間計算情報
	DurationMonths int32  `json:"duration_months"` // プロジェクト期間（月数）
	DurationText   string `json:"duration_text"`   // "1年6ヶ月" 形式
	IsActive       bool   `json:"is_active"`       // 現在進行中かどうか

	// 技術情報
	Processes    []string                        `json:"processes"`    // 担当工程
	Technologies []WorkHistoryTechnologyResponse `json:"technologies"` // 使用技術

	// 集計情報（新規追加）
	ITExperienceMonths int32  `json:"it_experience_months"` // IT経験年数（月数）
	ITExperienceText   string `json:"it_experience_text"`   // "3年2ヶ月" 形式
	ProjectCount       int32  `json:"project_count"`        // 関連プロジェクト数

	// 技術スキル経験年数（新規追加）
	TechnologySkills []TechnologySkillExperienceResponse `json:"technology_skills"` // 技術別経験年数

	// メタデータ
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// WorkHistoryTechnologyResponse 職務経歴技術レスポンス
type WorkHistoryTechnologyResponse struct {
	ID                    string  `json:"id"`
	CategoryID            string  `json:"category_id"`
	CategoryName          string  `json:"category_name"`
	CategoryDisplayName   string  `json:"category_display_name"`
	TechnologyName        string  `json:"technology_name"`
	TechnologyDisplayName *string `json:"technology_display_name,omitempty"`
	SortOrder             int32   `json:"sort_order"`
}

// TechnologySkillExperienceResponse 技術スキル経験レスポンス（新規追加）
type TechnologySkillExperienceResponse struct {
	TechnologyName        string    `json:"technology_name"`
	TechnologyDisplayName *string   `json:"technology_display_name,omitempty"`
	CategoryName          string    `json:"category_name"`
	CategoryDisplayName   string    `json:"category_display_name"`
	TotalExperienceMonths int32     `json:"total_experience_months"` // 総経験月数
	ExperienceYears       int32     `json:"experience_years"`        // 経験年数
	ExperienceMonths      int32     `json:"experience_months"`       // 経験月数（余り）
	ExperienceText        string    `json:"experience_text"`         // "1年6ヶ月" 形式
	ProjectCount          int32     `json:"project_count"`           // 使用プロジェクト数
	FirstUsedDate         time.Time `json:"first_used_date"`         // 初回使用日
	LastUsedDate          time.Time `json:"last_used_date"`          // 最終使用日
	IsRecentlyUsed        bool      `json:"is_recently_used"`        // 最近使用したか
	SkillLevel            string    `json:"skill_level"`             // 初級/中級/上級
}

// WorkHistoryListResponse 職務経歴一覧レスポンス
type WorkHistoryListResponse struct {
	// 集計情報
	Summary WorkHistorySummaryResponse `json:"summary"`

	// 職務経歴一覧
	WorkHistories []WorkHistoryEnhancedResponse `json:"work_histories"`

	// 技術スキルサマリー
	TechnologySkills []TechnologySkillExperienceResponse `json:"technology_skills"`

	// ページネーション
	Total   int32 `json:"total"`
	Page    int32 `json:"page"`
	Limit   int32 `json:"limit"`
	HasNext bool  `json:"has_next"`
}

// WorkHistorySummaryResponse 職務経歴サマリーレスポンス（新規追加）
type WorkHistorySummaryResponse struct {
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	UserEmail string `json:"user_email"`

	// IT経験総計
	TotalITExperienceMonths int32  `json:"total_it_experience_months"` // IT総経験月数
	ITExperienceYears       int32  `json:"it_experience_years"`        // IT経験年数
	ITExperienceMonths      int32  `json:"it_experience_months"`       // IT経験月数（余り）
	ITExperienceText        string `json:"it_experience_text"`         // "5年3ヶ月" 形式
	ITExperienceLevel       string `json:"it_experience_level"`        // 新人/ジュニア/ミドル/シニア

	// プロジェクト統計
	TotalProjectCount  int32      `json:"total_project_count"`           // 総プロジェクト数
	ActiveProjectCount int32      `json:"active_project_count"`          // 進行中プロジェクト数
	FirstProjectDate   *time.Time `json:"first_project_date,omitempty"`  // 初回プロジェクト開始日
	LastProjectDate    *time.Time `json:"last_project_date,omitempty"`   // 最終プロジェクト終了日
	LatestProjectName  *string    `json:"latest_project_name,omitempty"` // 最新プロジェクト名
	LatestRole         *string    `json:"latest_role,omitempty"`         // 最新の役割

	// 技術統計
	TotalTechnologyCount  int32    `json:"total_technology_count"`  // 総技術数
	RecentTechnologyCount int32    `json:"recent_technology_count"` // 最近使用技術数（1年以内）
	TopTechnologies       []string `json:"top_technologies"`        // 主要技術トップ5

	// 更新日時
	CalculatedAt time.Time `json:"calculated_at"` // 計算日時
}

// WorkHistoryCreateRequest 職務経歴作成リクエスト
type WorkHistoryCreateRequest struct {
	UserID           string                         `json:"user_id" validate:"required"`
	ProfileID        string                         `json:"profile_id" validate:"required"`
	ProjectName      string                         `json:"project_name" validate:"required,max=255"`
	StartDate        string                         `json:"start_date" validate:"required"`
	EndDate          *string                        `json:"end_date,omitempty"`
	Industry         int32                          `json:"industry" validate:"required,min=1,max=7"`
	CompanyName      *string                        `json:"company_name,omitempty" validate:"omitempty,max=255"`
	ProjectOverview  *string                        `json:"project_overview,omitempty" validate:"omitempty,max=2000"`
	Responsibilities *string                        `json:"responsibilities,omitempty" validate:"omitempty,max=2000"`
	Achievements     *string                        `json:"achievements,omitempty" validate:"omitempty,max=2000"`
	Remarks          *string                        `json:"remarks,omitempty" validate:"omitempty,max=1000"`
	TeamSize         *int32                         `json:"team_size,omitempty" validate:"omitempty,min=1,max=1000"`
	Role             string                         `json:"role" validate:"required,max=100"`
	Processes        []string                       `json:"processes" validate:"dive,required"`
	Technologies     []WorkHistoryTechnologyRequest `json:"technologies" validate:"dive,required"`
}

// WorkHistoryUpdateRequest 職務経歴更新リクエスト
type WorkHistoryUpdateRequest struct {
	ProjectName      *string                        `json:"project_name,omitempty" validate:"omitempty,max=255"`
	StartDate        *string                        `json:"start_date,omitempty"`
	EndDate          *string                        `json:"end_date,omitempty"`
	Industry         *string                        `json:"industry,omitempty"`
	CompanyName      *string                        `json:"company_name,omitempty" validate:"omitempty,max=255"`
	ProjectOverview  *string                        `json:"project_overview,omitempty" validate:"omitempty,max=2000"`
	Responsibilities *string                        `json:"responsibilities,omitempty" validate:"omitempty,max=2000"`
	Achievements     *string                        `json:"achievements,omitempty" validate:"omitempty,max=2000"`
	Remarks          *string                        `json:"remarks,omitempty" validate:"omitempty,max=1000"`
	TeamSize         *int32                         `json:"team_size,omitempty" validate:"omitempty,min=1,max=1000"`
	Role             *string                        `json:"role,omitempty"`
	Processes        []string                       `json:"processes,omitempty" validate:"dive,required"`
	Technologies     []WorkHistoryTechnologyRequest `json:"technologies,omitempty" validate:"dive,required"`
}

// WorkHistoryTechnologyRequest 職務経歴技術リクエスト
type WorkHistoryTechnologyRequest struct {
	CategoryID     string `json:"category_id" validate:"required,uuid"`
	TechnologyName string `json:"technology_name" validate:"required,max=100"`
}

// WorkHistoryTempSaveRequest 職務経歴一時保存リクエスト
type WorkHistoryTempSaveRequest struct {
	ProjectName      *string                        `json:"project_name,omitempty"`
	StartDate        *string                        `json:"start_date,omitempty"`
	EndDate          *string                        `json:"end_date,omitempty"`
	Industry         *string                        `json:"industry,omitempty"`
	CompanyName      *string                        `json:"company_name,omitempty"`
	ProjectOverview  *string                        `json:"project_overview,omitempty"`
	Responsibilities *string                        `json:"responsibilities,omitempty"`
	Achievements     *string                        `json:"achievements,omitempty"`
	Remarks          *string                        `json:"remarks,omitempty"`
	TeamSize         *int32                         `json:"team_size,omitempty"`
	Role             *string                        `json:"role,omitempty"`
	Processes        []string                       `json:"processes,omitempty"`
	Technologies     []WorkHistoryTechnologyRequest `json:"technologies,omitempty"`
	SavedAt          time.Time                      `json:"saved_at"`
}

// WorkHistoryPDFGenerateRequest PDF生成リクエスト（参画開始可能日付き）
type WorkHistoryPDFGenerateRequest struct {
	UserID                  string  `json:"user_id" validate:"required,uuid"`
	AvailableStartDate      *string `json:"available_start_date,omitempty"`         // 参画開始可能日
	IncludeSummary          bool    `json:"include_summary"`                        // サマリー情報を含むか
	IncludeTechnologySkills bool    `json:"include_technology_skills"`              // 技術スキル詳細を含むか
	Format                  string  `json:"format" validate:"required,oneof=A4 A3"` // PDF形式
	Template                string  `json:"template" validate:"required"`           // テンプレート名
}

// WorkHistoryPDFResponse PDF生成レスポンス
type WorkHistoryPDFResponse struct {
	FileURL     string    `json:"file_url"`     // PDFファイルURL
	FileName    string    `json:"file_name"`    // ファイル名
	FileSize    int64     `json:"file_size"`    // ファイルサイズ（バイト）
	GeneratedAt time.Time `json:"generated_at"` // 生成日時
	ExpiresAt   time.Time `json:"expires_at"`   // 有効期限
}

// TechnologySuggestionResponse 技術候補レスポンス
type TechnologySuggestionResponse struct {
	TechnologyName        string  `json:"technology_name"`
	TechnologyDisplayName *string `json:"technology_display_name,omitempty"`
	CategoryName          string  `json:"category_name"`
	CategoryDisplayName   string  `json:"category_display_name"`
	UsageCount            int32   `json:"usage_count"` // 使用回数
	IsPopular             bool    `json:"is_popular"`  // 人気技術かどうか
	MatchScore            float64 `json:"match_score"` // マッチスコア（0-1）
}

// TechnologySuggestionRequest 技術候補検索リクエスト
type TechnologySuggestionRequest struct {
	Query          string  `json:"query" validate:"required,min=1,max=100"`
	CategoryName   *string `json:"category_name,omitempty"`
	Limit          int32   `json:"limit" validate:"min=1,max=50"`
	IncludePopular bool    `json:"include_popular"` // 人気技術を優先するか
}

// ITExperienceResponse IT経験年数レスポンス
type ITExperienceResponse struct {
	TotalMonths  int32     `json:"total_months"`  // 総経験月数
	Years        int32     `json:"years"`         // 年数
	Months       int32     `json:"months"`        // 残り月数
	Text         string    `json:"text"`          // "3年2ヶ月" 形式
	Level        string    `json:"level"`         // 経験レベル（初級/ミドル/シニア/エキスパート）
	CalculatedAt time.Time `json:"calculated_at"` // 計算日時
}

// WorkHistoryAnalyticsResponse 職務経歴分析レスポンス
type WorkHistoryAnalyticsResponse struct {
	AnalysisTypes []string               `json:"analysis_types"` // 分析種別
	Data          map[string]interface{} `json:"data"`           // 分析データ
	GeneratedAt   time.Time              `json:"generated_at"`   // 生成日時
}
