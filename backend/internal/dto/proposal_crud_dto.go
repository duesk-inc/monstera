package dto

import (
	"time"
)

// CreateProposalRequest 提案作成リクエスト
type CreateProposalRequest struct {
	ProjectID    string   `json:"project_id" binding:"required"`
	Title        string   `json:"title" binding:"required,max=200"`
	Description  string   `json:"description" binding:"required,max=2000"`
	ProposalType string   `json:"proposal_type" binding:"required,oneof=technology skill_match schedule other"`
	Priority     string   `json:"priority" binding:"required,oneof=high medium low"`
	Tags         []string `json:"tags"`
}

// UpdateProposalRequest 提案更新リクエスト
type UpdateProposalRequest struct {
	Title        *string   `json:"title,omitempty" binding:"omitempty,max=200"`
	Description  *string   `json:"description,omitempty" binding:"omitempty,max=2000"`
	ProposalType *string   `json:"proposal_type,omitempty" binding:"omitempty,oneof=technology skill_match schedule other"`
	Priority     *string   `json:"priority,omitempty" binding:"omitempty,oneof=high medium low"`
	Tags         *[]string `json:"tags,omitempty"`
}

// ProposalResponse 提案レスポンス
type ProposalResponse struct {
	ID              string     `json:"id"`
	ProjectID       string     `json:"project_id"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	ProposalType    string     `json:"proposal_type"`
	Priority        string     `json:"priority"`
	Status          string     `json:"status"`
	Tags            []string   `json:"tags"`
	CreatedByID     string     `json:"created_by_id"`
	CreatedByName   string     `json:"created_by_name"`
	AssignedToID    *string    `json:"assigned_to_id,omitempty"`
	AssignedToName  *string    `json:"assigned_to_name,omitempty"`
	ResponseMessage *string    `json:"response_message,omitempty"`
	RespondedAt     *time.Time `json:"responded_at,omitempty"`
	QuestionCount   int        `json:"question_count"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// ProposalListItemResponse 提案一覧アイテムレスポンス
type ProposalListItemResponse struct {
	ID             string    `json:"id"`
	ProjectID      string    `json:"project_id"`
	ProjectName    string    `json:"project_name"`
	Title          string    `json:"title"`
	ProposalType   string    `json:"proposal_type"`
	Priority       string    `json:"priority"`
	Status         string    `json:"status"`
	Tags           []string  `json:"tags"`
	CreatedByName  string    `json:"created_by_name"`
	QuestionCount  int       `json:"question_count"`
	HasUnreadReply bool      `json:"has_unread_reply"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
