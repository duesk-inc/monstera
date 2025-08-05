package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProposalStatus 提案ステータス
type ProposalStatus string

const (
	ProposalStatusDraft     ProposalStatus = "draft"     // 下書き
	ProposalStatusSubmitted ProposalStatus = "submitted" // 提出済み
	ProposalStatusAccepted  ProposalStatus = "accepted"  // 承認
	ProposalStatusRejected  ProposalStatus = "rejected"  // 却下
	ProposalStatusExpired   ProposalStatus = "expired"   // 期限切れ
)

// ContractExtensionStatus 契約延長ステータス
type ContractExtensionStatus string

const (
	ContractExtensionStatusPending   ContractExtensionStatus = "pending"   // 確認待ち
	ContractExtensionStatusExtended  ContractExtensionStatus = "extended"  // 延長決定
	ContractExtensionStatusDeclined  ContractExtensionStatus = "declined"  // 延長なし
	ContractExtensionStatusCompleted ContractExtensionStatus = "completed" // 完了
)

// InterviewStatus 面談ステータス
type InterviewStatus string

const (
	InterviewStatusScheduled   InterviewStatus = "scheduled"   // 予定
	InterviewStatusCompleted   InterviewStatus = "completed"   // 完了
	InterviewStatusCancelled   InterviewStatus = "cancelled"   // キャンセル
	InterviewStatusRescheduled InterviewStatus = "rescheduled" // 再調整
)

// PocStatus POCプロジェクトステータス
type PocStatus string

const (
	PocStatusActive    PocStatus = "active"    // アクティブ
	PocStatusCompleted PocStatus = "completed" // 完了
	PocStatusCancelled PocStatus = "cancelled" // キャンセル
	PocStatusOnHold    PocStatus = "on_hold"   // 保留
)

// PocSyncStatus POC同期ステータス
type PocSyncStatus string

const (
	PocSyncStatusPending   PocSyncStatus = "pending"   // 同期待ち
	PocSyncStatusSyncing   PocSyncStatus = "syncing"   // 同期中
	PocSyncStatusCompleted PocSyncStatus = "completed" // 完了
	PocSyncStatusFailed    PocSyncStatus = "failed"    // 失敗
)

// Proposal 提案
type Proposal struct {
	ID               uuid.UUID      `gorm:"type:varchar(255);primaryKey" json:"id"`
	EngineerID       uuid.UUID      `gorm:"type:varchar(255);not null" json:"engineer_id"`
	Engineer         *User          `gorm:"foreignKey:EngineerID" json:"engineer,omitempty"`
	ClientID         uuid.UUID      `gorm:"type:varchar(255);not null" json:"client_id"`
	Client           *Client        `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	ProjectID        *uuid.UUID     `gorm:"type:varchar(255)" json:"project_id,omitempty"`
	Project          *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Status           ProposalStatus `gorm:"type:enum('draft','submitted','accepted','rejected','expired');default:'draft'" json:"status"`
	ProposalAmount   int            `json:"proposal_amount"`
	AmountType       string         `gorm:"size:20" json:"amount_type"` // hourly, monthly, fixed
	WorkingHours     string         `gorm:"size:50" json:"working_hours"`
	SkillSheetURL    string         `gorm:"size:500" json:"skill_sheet_url"`
	ProposalDate     time.Time      `json:"proposal_date"`
	ResponseDeadline time.Time      `json:"response_deadline"`
	ResponseDate     *time.Time     `json:"response_date,omitempty"`
	Notes            string         `gorm:"type:text" json:"notes"`
	CreatedBy        string         `gorm:"size:36;not null" json:"created_by"`
	UpdatedBy        string         `gorm:"size:36;not null" json:"updated_by"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        *time.Time     `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName テーブル名を指定
func (Proposal) TableName() string {
	return "proposals"
}

// BeforeCreate UUIDを自動生成
func (p *Proposal) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// ContractExtension 契約延長確認
type ContractExtension struct {
	ID                     uuid.UUID               `gorm:"type:varchar(255);primaryKey" json:"id"`
	EngineerID             uuid.UUID               `gorm:"type:varchar(255);not null" json:"engineer_id"`
	Engineer               *User                   `gorm:"foreignKey:EngineerID" json:"engineer,omitempty"`
	ProjectID              uuid.UUID               `gorm:"type:varchar(255);not null" json:"project_id"`
	Project                *Project                `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Status                 ContractExtensionStatus `gorm:"type:enum('pending','extended','declined','completed');default:'pending'" json:"status"`
	CurrentContractEndDate time.Time               `json:"current_contract_end_date"`
	ExtensionCheckDate     time.Time               `json:"extension_check_date"`
	ExtensionPeriodMonths  int                     `json:"extension_period_months"`
	NewContractEndDate     *time.Time              `json:"new_contract_end_date,omitempty"`
	ClientResponse         string                  `gorm:"type:text" json:"client_response"`
	EngineerResponse       string                  `gorm:"type:text" json:"engineer_response"`
	Notes                  string                  `gorm:"type:text" json:"notes"`
	CheckedBy              string                  `gorm:"size:36" json:"checked_by"`
	CheckedAt              *time.Time              `json:"checked_at,omitempty"`
	CreatedBy              string                  `gorm:"size:36;not null" json:"created_by"`
	UpdatedBy              string                  `gorm:"size:36;not null" json:"updated_by"`
	CreatedAt              time.Time               `json:"created_at"`
	UpdatedAt              time.Time               `json:"updated_at"`
	DeletedAt              *time.Time              `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName テーブル名を指定
func (ContractExtension) TableName() string {
	return "contract_extensions"
}

// BeforeCreate UUIDを自動生成
func (c *ContractExtension) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// InterviewSchedule 面談スケジュール
type InterviewSchedule struct {
	ID                uuid.UUID       `gorm:"type:varchar(255);primaryKey" json:"id"`
	ProposalID        uuid.UUID       `gorm:"type:varchar(255);not null" json:"proposal_id"`
	Proposal          *Proposal       `gorm:"foreignKey:ProposalID" json:"proposal,omitempty"`
	Status            InterviewStatus `gorm:"type:enum('scheduled','completed','cancelled','rescheduled');default:'scheduled'" json:"status"`
	ScheduledDate     time.Time       `json:"scheduled_date"`
	DurationMinutes   int             `json:"duration_minutes"`
	Location          string          `gorm:"size:255" json:"location"`
	MeetingType       string          `gorm:"size:50" json:"meeting_type"` // online, offline
	MeetingURL        string          `gorm:"size:500" json:"meeting_url"`
	ClientAttendees   string          `gorm:"type:text" json:"client_attendees"`   // JSON配列
	EngineerAttendees string          `gorm:"type:text" json:"engineer_attendees"` // JSON配列
	Notes             string          `gorm:"type:text" json:"notes"`
	Result            string          `gorm:"type:text" json:"result"`
	CompletedAt       *time.Time      `json:"completed_at,omitempty"`
	CreatedBy         string          `gorm:"size:36;not null" json:"created_by"`
	UpdatedBy         string          `gorm:"size:36;not null" json:"updated_by"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	DeletedAt         *time.Time      `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName テーブル名を指定
func (InterviewSchedule) TableName() string {
	return "interview_schedules"
}

// BeforeCreate UUIDを自動生成
func (i *InterviewSchedule) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// GetClientAttendees クライアント参加者を取得
func (i *InterviewSchedule) GetClientAttendees() ([]map[string]string, error) {
	if i.ClientAttendees == "" {
		return nil, nil
	}
	var attendees []map[string]string
	if err := json.Unmarshal([]byte(i.ClientAttendees), &attendees); err != nil {
		return nil, err
	}
	return attendees, nil
}

// GetEngineerAttendees エンジニア参加者を取得
func (i *InterviewSchedule) GetEngineerAttendees() ([]map[string]string, error) {
	if i.EngineerAttendees == "" {
		return nil, nil
	}
	var attendees []map[string]string
	if err := json.Unmarshal([]byte(i.EngineerAttendees), &attendees); err != nil {
		return nil, err
	}
	return attendees, nil
}

// PocProject POCプロジェクト
type PocProject struct {
	ID           uuid.UUID     `gorm:"type:varchar(255);primaryKey" json:"id"`
	ExternalID   string        `gorm:"size:100;unique" json:"external_id"`
	Name         string        `gorm:"size:200;not null" json:"name"`
	ClientName   string        `gorm:"size:200" json:"client_name"`
	Status       string        `gorm:"size:50" json:"status"`
	StartDate    *time.Time    `json:"start_date,omitempty"`
	EndDate      *time.Time    `json:"end_date,omitempty"`
	SyncStatus   PocSyncStatus `gorm:"type:enum('pending','syncing','completed','failed');default:'pending'" json:"sync_status"`
	LastSyncedAt *time.Time    `json:"last_synced_at,omitempty"`
	SyncError    string        `gorm:"type:text" json:"sync_error"`
	RawData      string        `gorm:"type:text" json:"raw_data"` // 生のAPIレスポンスをJSON保存
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

// TableName テーブル名を指定
func (PocProject) TableName() string {
	return "poc_projects"
}

// BeforeCreate UUIDを自動生成
func (p *PocProject) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// SalesTeam 営業チーム
type SalesTeam struct {
	ID          uuid.UUID  `gorm:"type:varchar(255);primaryKey" json:"id"`
	UserID string  `gorm:"type:varchar(255);not null;unique" json:"user_id"`
	User        *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TeamRole    string     `gorm:"size:50;not null" json:"team_role"` // leader, member
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	JoinedAt    time.Time  `json:"joined_at"`
	LeftAt      *time.Time `json:"left_at,omitempty"`
	Permissions string     `gorm:"type:text" json:"permissions"` // JSON配列で権限を保存
	CreatedBy   string     `gorm:"size:36;not null" json:"created_by"`
	UpdatedBy   string     `gorm:"size:36;not null" json:"updated_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName テーブル名を指定
func (SalesTeam) TableName() string {
	return "sales_teams"
}

// BeforeCreate UUIDを自動生成
func (s *SalesTeam) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
