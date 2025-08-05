package dto

import (
	"time"

	"github.com/google/uuid"
)

// GetProposalsRequest 提案一覧取得リクエスト
type GetProposalsRequest struct {
	Status    *string `form:"status" binding:"omitempty,oneof=proposed proceed declined"`
	Page      int     `form:"page" binding:"omitempty,min=1"`
	Limit     int     `form:"limit" binding:"omitempty,min=1,max=100"`
	SortBy    *string `form:"sort_by" binding:"omitempty,oneof=created_at responded_at"`
	SortOrder *string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

// SetDefaults デフォルト値を設定
func (r *GetProposalsRequest) SetDefaults() {
	if r.Page == 0 {
		r.Page = 1
	}
	if r.Limit == 0 {
		r.Limit = 20
	}
	if r.SortBy == nil {
		sortBy := "created_at"
		r.SortBy = &sortBy
	}
	if r.SortOrder == nil {
		sortOrder := "desc"
		r.SortOrder = &sortOrder
	}
}

// UpdateProposalStatusRequest 提案ステータス更新リクエスト
type UpdateProposalStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=proceed declined"`
}

// ProposalListResponse 提案一覧レスポンス
type ProposalListResponse struct {
	Items []ProposalItemDTO `json:"items"`
	Total int64             `json:"total"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
}

// ProposalItemDTO 提案一覧アイテム
type ProposalItemDTO struct {
	ID                    uuid.UUID  `json:"id"`
	ProjectID             uuid.UUID  `json:"project_id"`
	ProjectName           string     `json:"project_name"`
	MinPrice              *int       `json:"min_price"`
	MaxPrice              *int       `json:"max_price"`
	WorkLocation          string     `json:"work_location"`
	RequiredSkills        string     `json:"required_skills"` // カンマ区切り文字列
	Status                string     `json:"status"`
	CreatedAt             time.Time  `json:"created_at"`
	RespondedAt           *time.Time `json:"responded_at"`
	PendingQuestionsCount int        `json:"pending_questions_count"`
}

// ProposalDetailResponse 提案詳細レスポンス
type ProposalDetailResponse struct {
	ID          uuid.UUID             `json:"id"`
	ProjectID   uuid.UUID             `json:"project_id"`
	Status      string                `json:"status"`
	RespondedAt *time.Time            `json:"responded_at"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
	Project     ProjectDetailDTO      `json:"project"`
	Questions   []ProposalQuestionDTO `json:"questions"`
}

// ProjectDetailDTO プロジェクト詳細（monstera-pocデータ統合）
type ProjectDetailDTO struct {
	ID              uuid.UUID         `json:"id"`
	ProjectName     string            `json:"project_name"`
	Description     string            `json:"description"`
	MinPrice        *int              `json:"min_price"`
	MaxPrice        *int              `json:"max_price"`
	WorkLocation    string            `json:"work_location"`
	RemoteWorkType  string            `json:"remote_work_type"`
	WorkingTime     string            `json:"working_time"`
	ContractPeriod  string            `json:"contract_period"`
	StartDate       *time.Time        `json:"start_date"`
	StartDateText   string            `json:"start_date_text"`
	RequiredSkills  []ProjectSkillDTO `json:"required_skills"`
	PreferredSkills []ProjectSkillDTO `json:"preferred_skills"`
}

// ProjectSkillDTO プロジェクトスキル
type ProjectSkillDTO struct {
	SkillName          string `json:"skill_name"`
	ExperienceYearsMin *int   `json:"experience_years_min"`
	ExperienceYearsMax *int   `json:"experience_years_max"`
	IsRequired         bool   `json:"is_required"`
}

// CreateQuestionRequest 質問投稿リクエスト
type CreateQuestionRequest struct {
	QuestionText string `json:"question_text" binding:"required,min=1,max=2000"`
}

// UpdateQuestionRequest 質問更新リクエスト
type UpdateQuestionRequest struct {
	QuestionText string `json:"question_text" binding:"required,min=1,max=2000"`
}

// RespondQuestionRequest 質問回答リクエスト（営業担当者用）
type RespondQuestionRequest struct {
	ResponseText string `json:"response_text" binding:"required,min=1,max=2000"`
}

// GetQuestionsRequest 質問一覧取得リクエスト
type GetQuestionsRequest struct {
	Page      int     `form:"page" binding:"omitempty,min=1"`
	Limit     int     `form:"limit" binding:"omitempty,min=1,max=100"`
	SortBy    *string `form:"sort_by" binding:"omitempty,oneof=created_at responded_at"`
	SortOrder *string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

// SetDefaults デフォルト値を設定
func (r *GetQuestionsRequest) SetDefaults() {
	if r.Page == 0 {
		r.Page = 1
	}
	if r.Limit == 0 {
		r.Limit = 20
	}
	if r.SortBy == nil {
		sortBy := "created_at"
		r.SortBy = &sortBy
	}
	if r.SortOrder == nil {
		sortOrder := "desc"
		r.SortOrder = &sortOrder
	}
}

// GetPendingQuestionsRequest 未回答質問一覧取得リクエスト（営業担当者用）
type GetPendingQuestionsRequest struct {
	Page      int     `form:"page" binding:"omitempty,min=1"`
	Limit     int     `form:"limit" binding:"omitempty,min=1,max=100"`
	SortBy    *string `form:"sort_by" binding:"omitempty,oneof=created_at"`
	SortOrder *string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

// SetDefaults デフォルト値を設定
func (r *GetPendingQuestionsRequest) SetDefaults() {
	if r.Page == 0 {
		r.Page = 1
	}
	if r.Limit == 0 {
		r.Limit = 20
	}
	if r.SortBy == nil {
		sortBy := "created_at"
		r.SortBy = &sortBy
	}
	if r.SortOrder == nil {
		sortOrder := "asc"
		r.SortOrder = &sortOrder
	}
}

// ProposalQuestionDTO 質問情報
type ProposalQuestionDTO struct {
	ID           uuid.UUID               `json:"id"`
	QuestionText string                  `json:"question_text"`
	ResponseText *string                 `json:"response_text"`
	IsResponded  bool                    `json:"is_responded"`
	RespondedAt  *time.Time              `json:"responded_at"`
	CreatedAt    time.Time               `json:"created_at"`
	UpdatedAt    time.Time               `json:"updated_at"`
	SalesUser    *ProposalUserSummaryDTO `json:"sales_user,omitempty"`
}

// ProposalUserSummaryDTO 提案関連ユーザー概要
type ProposalUserSummaryDTO struct {
	ID        uuid.UUID `json:"id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
}

// QuestionsListResponse 質問一覧レスポンス
type QuestionsListResponse struct {
	Items []ProposalQuestionDTO `json:"items"`
	Total int                   `json:"total"`
}

// PendingQuestionsListResponse 未回答質問一覧レスポンス（営業担当者用）
type PendingQuestionsListResponse struct {
	Items []PendingQuestionDTO `json:"items"`
	Total int                  `json:"total"`
}

// PendingQuestionDTO 未回答質問情報（営業担当者向け）
type PendingQuestionDTO struct {
	ID           uuid.UUID               `json:"id"`
	ProposalID   uuid.UUID               `json:"proposal_id"`
	ProjectID    uuid.UUID               `json:"project_id"`
	ProjectName  string                  `json:"project_name"`
	QuestionText string                  `json:"question_text"`
	Engineer     *ProposalUserSummaryDTO `json:"engineer"`
	CreatedAt    time.Time               `json:"created_at"`
}

// ProposalSummaryResponse 提案サマリーレスポンス（ダッシュボード用）
type ProposalSummaryResponse struct {
	TotalProposals        int `json:"total_proposals"`
	PendingProposals      int `json:"pending_proposals"`
	RespondedProposals    int `json:"responded_proposals"`
	ProceedProposals      int `json:"proceed_proposals"`
	DeclinedProposals     int `json:"declined_proposals"`
	PendingQuestionsCount int `json:"pending_questions_count"`
}

// AssignQuestionRequest 質問割り当てリクエスト
type AssignQuestionRequest struct {
	SalesUserID string `json:"sales_user_id" binding:"required"`
}

// NotificationPayloadDTO 通知ペイロード（営業担当者向け）
type NotificationPayloadDTO struct {
	ProposalID   uuid.UUID `json:"proposal_id"`
	ProjectID    uuid.UUID `json:"project_id"`
	ProjectName  string    `json:"project_name"`
	EngineerID   uuid.UUID `json:"engineer_id"`
	EngineerName string    `json:"engineer_name"`
	Action       string    `json:"action"`           // "responded", "questioned"
	Status       string    `json:"status,omitempty"` // proceed/declined（respondedの場合のみ）
}

// GetDefaults デフォルト値取得（設定画面用）
type ProposalDefaultsResponse struct {
	MaxQuestionLength  int `json:"max_question_length"`
	MaxResponseLength  int `json:"max_response_length"`
	ProposalExpireDays int `json:"proposal_expire_days"`
	DefaultPageSize    int `json:"default_page_size"`
}
