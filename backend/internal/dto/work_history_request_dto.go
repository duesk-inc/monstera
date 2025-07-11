package dto

import "time"

// WorkHistoryRequestV2 職務経歴リクエスト（バリデーター対応版）
type WorkHistoryRequestV2 struct {
	ProjectName      string                `json:"project_name" validate:"required,max=255"`
	StartDate        string                `json:"start_date" validate:"required"`
	EndDate          *string               `json:"end_date,omitempty"`
	Industry         string                `json:"industry" validate:"required"`
	CompanyName      *string               `json:"company_name,omitempty" validate:"omitempty,max=255"`
	TeamSize         *int                  `json:"team_size,omitempty" validate:"omitempty,min=1,max=1000"`
	Role             string                `json:"role" validate:"required"`
	ProjectOverview  *string               `json:"project_overview,omitempty" validate:"omitempty,max=2000"`
	Responsibilities *string               `json:"responsibilities,omitempty" validate:"omitempty,max=2000"`
	Achievements     *string               `json:"achievements,omitempty" validate:"omitempty,max=2000"`
	Remarks          *string               `json:"remarks,omitempty" validate:"omitempty,max=1000"`
	Processes        []string              `json:"processes" validate:"dive,required"`
	Technologies     []TechnologyRequestV2 `json:"technologies" validate:"dive,required"`
}

// TechnologyRequestV2 技術リクエスト（バリデーター対応版）
type TechnologyRequestV2 struct {
	CategoryID     string `json:"category_id" validate:"required,uuid"`
	TechnologyName string `json:"technology_name" validate:"required,max=100"`
}

// WorkHistoryBulkCreateRequest 職務経歴一括作成リクエスト
type WorkHistoryBulkCreateRequest struct {
	WorkHistories []WorkHistoryRequestV2 `json:"work_histories" validate:"required,min=1,max=20,dive,required"`
}

// WorkHistoryBulkUpdateRequest 職務経歴一括更新リクエスト
type WorkHistoryBulkUpdateRequest struct {
	WorkHistories []WorkHistoryUpdateRequestV2 `json:"work_histories" validate:"required,min=1,max=20,dive,required"`
}

// WorkHistoryUpdateRequestV2 職務経歴更新リクエスト（個別更新用）
type WorkHistoryUpdateRequestV2 struct {
	ID               string                `json:"id" validate:"required,uuid"`
	ProjectName      *string               `json:"project_name,omitempty" validate:"omitempty,max=255"`
	StartDate        *string               `json:"start_date,omitempty"`
	EndDate          *string               `json:"end_date,omitempty"`
	Industry         *string               `json:"industry,omitempty"`
	CompanyName      *string               `json:"company_name,omitempty" validate:"omitempty,max=255"`
	TeamSize         *int                  `json:"team_size,omitempty" validate:"omitempty,min=1,max=1000"`
	Role             *string               `json:"role,omitempty"`
	ProjectOverview  *string               `json:"project_overview,omitempty" validate:"omitempty,max=2000"`
	Responsibilities *string               `json:"responsibilities,omitempty" validate:"omitempty,max=2000"`
	Achievements     *string               `json:"achievements,omitempty" validate:"omitempty,max=2000"`
	Remarks          *string               `json:"remarks,omitempty" validate:"omitempty,max=1000"`
	Processes        []string              `json:"processes,omitempty" validate:"dive,required"`
	Technologies     []TechnologyRequestV2 `json:"technologies,omitempty" validate:"dive,required"`
}

// WorkHistoryTempSaveRequestV2 職務経歴一時保存リクエスト
type WorkHistoryTempSaveRequestV2 struct {
	// 基本情報（全て任意）
	ProjectName      *string               `json:"project_name,omitempty"`
	StartDate        *string               `json:"start_date,omitempty"`
	EndDate          *string               `json:"end_date,omitempty"`
	Industry         *string               `json:"industry,omitempty"`
	CompanyName      *string               `json:"company_name,omitempty"`
	TeamSize         *int                  `json:"team_size,omitempty"`
	Role             *string               `json:"role,omitempty"`
	ProjectOverview  *string               `json:"project_overview,omitempty"`
	Responsibilities *string               `json:"responsibilities,omitempty"`
	Achievements     *string               `json:"achievements,omitempty"`
	Remarks          *string               `json:"remarks,omitempty"`
	Processes        []string              `json:"processes,omitempty"`
	Technologies     []TechnologyRequestV2 `json:"technologies,omitempty"`

	// 一時保存メタデータ
	TempSaveKey *string   `json:"temp_save_key,omitempty"` // 一時保存識別キー
	AutoSave    bool      `json:"auto_save"`               // 自動保存かどうか
	SavedAt     time.Time `json:"saved_at"`                // 保存日時
}

// WorkHistoryPDFGenerateRequestV2 PDF生成リクエスト（参画開始可能日付き）
type WorkHistoryPDFGenerateRequestV2 struct {
	// 対象ユーザー
	UserID string `json:"user_id" validate:"required,uuid"`

	// PDF設定
	AvailableStartDate      *string `json:"available_start_date,omitempty"` // 参画開始可能日（YYYY-MM-DD）
	IncludeSummary          bool    `json:"include_summary"`                // サマリー情報を含むか
	IncludeTechnologySkills bool    `json:"include_technology_skills"`      // 技術スキル詳細を含むか
	IncludeProjectDetails   bool    `json:"include_project_details"`        // プロジェクト詳細を含むか

	// フォーマット設定
	Format   string `json:"format" validate:"required,oneof=A4 A3"`        // PDF形式
	Template string `json:"template" validate:"required"`                  // テンプレート名
	Language string `json:"language" validate:"oneof=ja en" default:"ja""` // 言語設定

	// フィルタ設定
	DateFrom            *string  `json:"date_from,omitempty"`            // 期間フィルタ開始日
	DateTo              *string  `json:"date_to,omitempty"`              // 期間フィルタ終了日
	IncludeIndustries   []string `json:"include_industries,omitempty"`   // 含める業種
	ExcludeIndustries   []string `json:"exclude_industries,omitempty"`   // 除外する業種
	IncludeTechnologies []string `json:"include_technologies,omitempty"` // 含める技術
	MinProjectDuration  *int32   `json:"min_project_duration,omitempty"` // 最小プロジェクト期間（月）

	// 出力オプション
	Watermark  *string `json:"watermark,omitempty"` // 透かし文字
	Password   *string `json:"password,omitempty"`  // PDFパスワード
	AllowPrint bool    `json:"allow_print"`         // 印刷許可
	AllowCopy  bool    `json:"allow_copy"`          // コピー許可
}

// WorkHistoryQueryRequest 職務経歴検索リクエスト
type WorkHistoryQueryRequest struct {
	// ページネーション
	Page  int32 `json:"page" validate:"min=1" default:"1"`
	Limit int32 `json:"limit" validate:"min=1,max=100" default:"10"`

	// ソート
	SortBy    string `json:"sort_by" validate:"oneof=start_date end_date project_name duration created_at updated_at" default:"start_date"`
	SortOrder string `json:"sort_order" validate:"oneof=asc desc" default:"desc"`

	// フィルタ
	UserID         *string `json:"user_id,omitempty" validate:"omitempty,uuid"`
	ProjectName    *string `json:"project_name,omitempty"`
	Industry       *string `json:"industry,omitempty"`
	Role           *string `json:"role,omitempty"`
	CompanyName    *string `json:"company_name,omitempty"`
	TechnologyName *string `json:"technology_name,omitempty"`
	CategoryName   *string `json:"category_name,omitempty"`

	// 日付範囲
	StartDateFrom *string `json:"start_date_from,omitempty"`
	StartDateTo   *string `json:"start_date_to,omitempty"`
	EndDateFrom   *string `json:"end_date_from,omitempty"`
	EndDateTo     *string `json:"end_date_to,omitempty"`

	// 期間フィルタ
	MinDurationMonths *int32 `json:"min_duration_months,omitempty" validate:"omitempty,min=1"`
	MaxDurationMonths *int32 `json:"max_duration_months,omitempty" validate:"omitempty,min=1"`

	// チーム規模フィルタ
	MinTeamSize *int32 `json:"min_team_size,omitempty" validate:"omitempty,min=1"`
	MaxTeamSize *int32 `json:"max_team_size,omitempty" validate:"omitempty,min=1"`

	// その他フィルタ
	IsActive        *bool `json:"is_active,omitempty"`        // 進行中のみ
	HasTechnologies *bool `json:"has_technologies,omitempty"` // 技術情報ありのみ
	HasAchievements *bool `json:"has_achievements,omitempty"` // 成果ありのみ

	// 検索
	SearchKeyword *string  `json:"search_keyword,omitempty"`                                                                                                       // 全文検索キーワード
	SearchFields  []string `json:"search_fields,omitempty" validate:"dive,oneof=project_name project_overview responsibilities achievements remarks company_name"` // 検索対象フィールド
}

// WorkHistoryImportRequest 職務経歴インポートリクエスト
type WorkHistoryImportRequest struct {
	// インポート設定
	FileFormat string `json:"file_format" validate:"required,oneof=csv excel json"`
	FileData   string `json:"file_data" validate:"required"` // Base64エンコードされたファイルデータ
	FileName   string `json:"file_name" validate:"required"`

	// インポートオプション
	OverwriteExisting    bool `json:"overwrite_existing"`     // 既存データを上書きするか
	SkipValidationErrors bool `json:"skip_validation_errors"` // バリデーションエラーをスキップするか
	DryRun               bool `json:"dry_run"`                // テスト実行（実際にはインポートしない）

	// マッピング設定（CSVの場合）
	ColumnMapping map[string]string `json:"column_mapping,omitempty"`                    // カラムマッピング
	HeaderRow     int32             `json:"header_row" validate:"min=1" default:"1"`     // ヘッダー行番号
	DataStartRow  int32             `json:"data_start_row" validate:"min=1" default:"2"` // データ開始行番号

	// 技術正規化設定
	NormalizeTechnologies     bool `json:"normalize_technologies"`      // 技術名を正規化するか
	CreateMissingTechnologies bool `json:"create_missing_technologies"` // 存在しない技術を作成するか
}

// WorkHistoryExportRequest 職務経歴エクスポートリクエスト
type WorkHistoryExportRequest struct {
	// エクスポート対象
	UserIDs        []string `json:"user_ids,omitempty" validate:"dive,uuid"`         // 特定ユーザーのみ
	WorkHistoryIDs []string `json:"work_history_ids,omitempty" validate:"dive,uuid"` // 特定職務経歴のみ

	// エクスポート設定
	FileFormat              string `json:"file_format" validate:"required,oneof=csv excel json pdf"`
	IncludeHeaders          bool   `json:"include_headers"`           // ヘッダー行を含むか
	IncludeTechnologies     bool   `json:"include_technologies"`      // 技術情報を含むか
	IncludeCalculatedFields bool   `json:"include_calculated_fields"` // 計算フィールドを含むか

	// フィルタ（WorkHistoryQueryRequestと同じ）
	Query WorkHistoryQueryRequest `json:"query,omitempty"`

	// PDF固有設定
	PDFTemplate *string `json:"pdf_template,omitempty"`                           // PDFテンプレート
	PDFLanguage string  `json:"pdf_language" validate:"oneof=ja en" default:"ja"` // PDF言語
}

// WorkHistoryAnalyticsRequest 職務経歴分析リクエスト
type WorkHistoryAnalyticsRequest struct {
	// 分析対象
	UserIDs  []string `json:"user_ids,omitempty" validate:"dive,uuid"` // 特定ユーザーのみ
	DateFrom *string  `json:"date_from,omitempty"`                     // 期間開始日
	DateTo   *string  `json:"date_to,omitempty"`                       // 期間終了日

	// 分析種別
	AnalysisTypes []string `json:"analysis_types" validate:"required,dive,oneof=skill_trend industry_trend role_trend team_size_trend duration_trend technology_popularity project_count_trend"`

	// グループ化
	GroupBy string `json:"group_by" validate:"oneof=month quarter year industry role team_size_range" default:"month"`

	// その他オプション
	IncludeComparison bool  `json:"include_comparison"`                          // 前期比較を含むか
	TopN              int32 `json:"top_n" validate:"min=1,max=100" default:"10"` // Top N件
}
