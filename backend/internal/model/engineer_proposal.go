package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EngineerProposalStatus エンジニア提案ステータス
type EngineerProposalStatus string

const (
	EngineerProposalStatusProposed EngineerProposalStatus = "proposed" // 提案済み
	EngineerProposalStatusProceed  EngineerProposalStatus = "proceed"  // 選考希望
	EngineerProposalStatusDeclined EngineerProposalStatus = "declined" // 辞退
)

// IsValid ステータスが有効かチェック
func (s EngineerProposalStatus) IsValid() bool {
	switch s {
	case EngineerProposalStatusProposed, EngineerProposalStatusProceed, EngineerProposalStatusDeclined:
		return true
	default:
		return false
	}
}

// String ステータスを文字列に変換
func (s EngineerProposalStatus) String() string {
	return string(s)
}

// ToJapanese ステータスを日本語に変換
func (s EngineerProposalStatus) ToJapanese() string {
	switch s {
	case EngineerProposalStatusProposed:
		return "提案済み"
	case EngineerProposalStatusProceed:
		return "選考希望"
	case EngineerProposalStatusDeclined:
		return "辞退"
	default:
		return "不明"
	}
}

// EngineerProposal エンジニア向け提案情報モデル
type EngineerProposal struct {
	ID          uuid.UUID              `gorm:"type:varchar(255);primary_key" json:"id"`
	ProjectID   uuid.UUID              `gorm:"type:varchar(255);not null" json:"project_id"`
	UserID string              `gorm:"type:varchar(255);not null" json:"user_id"`
	Status      EngineerProposalStatus `gorm:"type:enum('proposed','proceed','declined');not null;default:'proposed'" json:"status"`
	RespondedAt *time.Time             `json:"responded_at"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	DeletedAt   gorm.DeletedAt         `gorm:"index" json:"-"`

	// リレーション
	User      User                       `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"user,omitempty"`
	Questions []EngineerProposalQuestion `gorm:"foreignKey:ProposalID" json:"questions,omitempty"`
}

// TableName テーブル名を指定
func (EngineerProposal) TableName() string {
	return "proposals"
}

// BeforeCreate UUIDを生成
func (p *EngineerProposal) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// CanRespond エンジニアが回答可能かチェック
func (p *EngineerProposal) CanRespond() bool {
	return p.Status == EngineerProposalStatusProposed
}

// Respond エンジニアの回答を記録
func (p *EngineerProposal) Respond(status EngineerProposalStatus) error {
	if !p.CanRespond() {
		return gorm.ErrInvalidData
	}

	if status != EngineerProposalStatusProceed && status != EngineerProposalStatusDeclined {
		return gorm.ErrInvalidData
	}

	now := time.Now()
	p.Status = status
	p.RespondedAt = &now
	p.UpdatedAt = now

	return nil
}

// IsResponded 回答済みかチェック
func (p *EngineerProposal) IsResponded() bool {
	return p.RespondedAt != nil && p.Status != EngineerProposalStatusProposed
}

// HasPendingQuestions 未回答の質問があるかチェック
func (p *EngineerProposal) HasPendingQuestions() bool {
	for _, q := range p.Questions {
		if !q.IsResponded {
			return true
		}
	}
	return false
}

// GetPendingQuestionsCount 未回答質問数を取得
func (p *EngineerProposal) GetPendingQuestionsCount() int {
	count := 0
	for _, q := range p.Questions {
		if !q.IsResponded {
			count++
		}
	}
	return count
}

// IsOwnedBy 指定ユーザーの提案かチェック
func (p *EngineerProposal) IsOwnedBy(userID string) bool {
	return p.UserID == userID
}
