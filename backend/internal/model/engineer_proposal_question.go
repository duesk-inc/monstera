package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EngineerProposalQuestion エンジニア提案質問モデル
type EngineerProposalQuestion struct {
	ID           uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	ProposalID   uuid.UUID      `gorm:"type:varchar(36);not null" json:"proposal_id"`
	QuestionText string         `gorm:"type:text;not null" json:"question_text"`
	ResponseText *string        `gorm:"type:text" json:"response_text"`
	SalesUserID  *string     `gorm:"type:varchar(255)" json:"sales_user_id"`
	IsResponded  bool           `gorm:"default:false;not null" json:"is_responded"`
	RespondedAt  *time.Time     `json:"responded_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// リレーション
	Proposal  EngineerProposal `gorm:"foreignKey:ProposalID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"proposal,omitempty"`
	SalesUser *User            `gorm:"foreignKey:SalesUserID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"sales_user,omitempty"`
}

// TableName テーブル名を指定
func (EngineerProposalQuestion) TableName() string {
	return "proposal_questions"
}

// BeforeCreate UUIDを生成
func (q *EngineerProposalQuestion) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}

// CanRespond 営業担当者が回答可能かチェック
func (q *EngineerProposalQuestion) CanRespond() bool {
	return !q.IsResponded
}

// Respond 営業担当者の回答を記録
func (q *EngineerProposalQuestion) Respond(responseText string, salesUserID string) error {
	if !q.CanRespond() {
		return gorm.ErrInvalidData
	}

	if responseText == "" {
		return gorm.ErrInvalidData
	}

	now := time.Now()
	q.ResponseText = &responseText
	q.SalesUserID = &salesUserID
	q.IsResponded = true
	q.RespondedAt = &now
	q.UpdatedAt = now

	return nil
}

// GetQuestionLength 質問文の文字数を取得
func (q *EngineerProposalQuestion) GetQuestionLength() int {
	return len([]rune(q.QuestionText))
}

// GetResponseLength 回答文の文字数を取得
func (q *EngineerProposalQuestion) GetResponseLength() int {
	if q.ResponseText == nil {
		return 0
	}
	return len([]rune(*q.ResponseText))
}

// IsRespondedBySalesUser 特定の営業担当者が回答したかチェック
func (q *EngineerProposalQuestion) IsRespondedBySalesUser(salesUserID string) bool {
	return q.IsResponded && q.SalesUserID != nil && *q.SalesUserID == salesUserID
}
