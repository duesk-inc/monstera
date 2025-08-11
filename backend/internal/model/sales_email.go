package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CampaignStatus キャンペーンステータス
type CampaignStatus string

const (
	CampaignStatusDraft     CampaignStatus = "draft"     // 下書き
	CampaignStatusScheduled CampaignStatus = "scheduled" // 予約済み
	CampaignStatusSending   CampaignStatus = "sending"   // 送信中
	CampaignStatusCompleted CampaignStatus = "completed" // 完了
	CampaignStatusFailed    CampaignStatus = "failed"    // 失敗
	CampaignStatusCancelled CampaignStatus = "cancelled" // キャンセル
)

// EmailDeliveryStatus メール配信ステータス
type EmailDeliveryStatus string

const (
	EmailDeliveryStatusPending EmailDeliveryStatus = "pending" // 送信待ち
	EmailDeliveryStatusSent    EmailDeliveryStatus = "sent"    // 送信済み
	EmailDeliveryStatusOpened  EmailDeliveryStatus = "opened"  // 開封済み
	EmailDeliveryStatusClicked EmailDeliveryStatus = "clicked" // クリック済み
	EmailDeliveryStatusBounced EmailDeliveryStatus = "bounced" // バウンス
	EmailDeliveryStatusFailed  EmailDeliveryStatus = "failed"  // 失敗
)

// TemplateVariable テンプレート変数
type TemplateVariable struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description"`
}

// EmailRecipient メール受信者
type EmailRecipient struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Type  string `json:"type"` // client, engineer, admin
}

// EmailTemplate メールテンプレート
type EmailTemplate struct {
	ID        string     `gorm:"type:varchar(255);primaryKey" json:"id"`
	Name      string     `gorm:"size:100;not null" json:"name"`
	Subject   string     `gorm:"size:200;not null" json:"subject"`
	BodyHTML  string     `gorm:"type:text" json:"body_html"`
	BodyText  string     `gorm:"type:text" json:"body_text"`
	Category  string     `gorm:"size:50" json:"category"`
	Variables string     `gorm:"type:text" json:"variables_raw"`
	IsActive  bool       `gorm:"default:true" json:"is_active"`
	CreatedBy string     `gorm:"size:36;not null" json:"created_by"`
	UpdatedBy string     `gorm:"size:36;not null" json:"updated_by"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName テーブル名を指定
func (EmailTemplate) TableName() string {
	return "email_templates"
}

// BeforeCreate UUIDを自動生成
func (e *EmailTemplate) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// GetVariables Variables JSONを取得
func (e *EmailTemplate) GetVariables() ([]TemplateVariable, error) {
	if e.Variables == "" {
		return nil, nil
	}
	var vars []TemplateVariable
	if err := json.Unmarshal([]byte(e.Variables), &vars); err != nil {
		return nil, err
	}
	return vars, nil
}

// SetVariables Variables JSONを設定
func (e *EmailTemplate) SetVariables(vars []TemplateVariable) error {
	if vars == nil {
		e.Variables = ""
		return nil
	}
	data, err := json.Marshal(vars)
	if err != nil {
		return err
	}
	e.Variables = string(data)
	return nil
}

// EmailCampaign メールキャンペーン
type EmailCampaign struct {
	ID               string         `gorm:"type:varchar(255);primaryKey" json:"id"`
	Name             string         `gorm:"size:100;not null" json:"name"`
	TemplateID       string         `gorm:"type:varchar(255);not null" json:"template_id"`
	Template         *EmailTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	Status           CampaignStatus `gorm:"type:enum('draft','scheduled','sending','completed','failed','cancelled');default:'draft'" json:"status"`
	ScheduledAt      time.Time      `json:"scheduled_at"`
	StartedAt        *time.Time     `json:"started_at,omitempty"`
	CompletedAt      *time.Time     `json:"completed_at,omitempty"`
	Recipients       string         `gorm:"type:text" json:"recipients_raw"` // JSON配列として保存
	TargetRole       string         `gorm:"size:50" json:"target_role"`
	TargetStatus     string         `gorm:"size:50" json:"target_status"`
	CustomConditions string         `gorm:"type:text" json:"custom_conditions_raw"` // JSON保存
	TotalRecipients  int            `gorm:"default:0" json:"total_recipients"`
	SentCount        int            `gorm:"default:0" json:"sent_count"`
	OpenCount        int            `gorm:"default:0" json:"open_count"`
	ClickCount       int            `gorm:"default:0" json:"click_count"`
	ErrorCount       int            `gorm:"default:0" json:"error_count"`
	CreatedBy        string         `gorm:"size:36;not null" json:"created_by"`
	UpdatedBy        string         `gorm:"size:36;not null" json:"updated_by"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        *time.Time     `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName テーブル名を指定
func (EmailCampaign) TableName() string {
	return "email_campaigns"
}

// BeforeCreate UUIDを自動生成
func (e *EmailCampaign) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// GetRecipients Recipients JSONを取得
func (e *EmailCampaign) GetRecipients() ([]EmailRecipient, error) {
	if e.Recipients == "" {
		return nil, nil
	}
	var recipients []EmailRecipient
	if err := json.Unmarshal([]byte(e.Recipients), &recipients); err != nil {
		return nil, err
	}
	return recipients, nil
}

// SetRecipients Recipients JSONを設定
func (e *EmailCampaign) SetRecipients(recipients []EmailRecipient) error {
	if recipients == nil {
		e.Recipients = "[]"
		return nil
	}
	data, err := json.Marshal(recipients)
	if err != nil {
		return err
	}
	e.Recipients = string(data)
	return nil
}

// GetCustomConditions CustomConditions JSONを取得
func (e *EmailCampaign) GetCustomConditions() (map[string]interface{}, error) {
	if e.CustomConditions == "" {
		return nil, nil
	}
	var conditions map[string]interface{}
	if err := json.Unmarshal([]byte(e.CustomConditions), &conditions); err != nil {
		return nil, err
	}
	return conditions, nil
}

// SetCustomConditions CustomConditions JSONを設定
func (e *EmailCampaign) SetCustomConditions(conditions map[string]interface{}) error {
	if conditions == nil {
		e.CustomConditions = "{}"
		return nil
	}
	data, err := json.Marshal(conditions)
	if err != nil {
		return err
	}
	e.CustomConditions = string(data)
	return nil
}

// EmailSentHistory メール送信履歴
type EmailSentHistory struct {
	ID             string              `gorm:"type:varchar(255);primaryKey" json:"id"`
	CampaignID     string              `gorm:"type:varchar(255);not null" json:"campaign_id"`
	Campaign       *EmailCampaign      `gorm:"foreignKey:CampaignID" json:"campaign,omitempty"`
	RecipientEmail string              `gorm:"size:255;not null" json:"recipient_email"`
	RecipientName  string              `gorm:"size:100" json:"recipient_name"`
	SentAt         time.Time           `json:"sent_at"`
	OpenedAt       *time.Time          `json:"opened_at,omitempty"`
	ClickedAt      *time.Time          `json:"clicked_at,omitempty"`
	DeliveryStatus EmailDeliveryStatus `gorm:"type:enum('pending','sent','opened','clicked','bounced','failed');default:'pending'" json:"delivery_status"`
	ErrorMessage   string              `gorm:"type:text" json:"error_message"`
	CreatedAt      time.Time           `json:"created_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

// TableName テーブル名を指定
func (EmailSentHistory) TableName() string {
	return "email_sent_histories"
}

// BeforeCreate UUIDを自動生成
func (e *EmailSentHistory) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EmailCampaignStats キャンペーン統計
type EmailCampaignStats struct {
	TotalRecipients int     `json:"total_recipients"`
	SentCount       int     `json:"sent_count"`
	OpenCount       int     `json:"open_count"`
	ClickCount      int     `json:"click_count"`
	DeliveryRate    float64 `json:"delivery_rate"`
	OpenRate        float64 `json:"open_rate"`
	ClickRate       float64 `json:"click_rate"`
}

// Value Driver.Valuer interface
func (c CampaignStatus) Value() (driver.Value, error) {
	return string(c), nil
}

// Scan sql.Scanner interface
func (c *CampaignStatus) Scan(value interface{}) error {
	if value == nil {
		*c = ""
		return nil
	}
	if v, ok := value.([]byte); ok {
		*c = CampaignStatus(v)
		return nil
	}
	if v, ok := value.(string); ok {
		*c = CampaignStatus(v)
		return nil
	}
	return nil
}

// Value Driver.Valuer interface
func (d EmailDeliveryStatus) Value() (driver.Value, error) {
	return string(d), nil
}

// Scan sql.Scanner interface
func (d *EmailDeliveryStatus) Scan(value interface{}) error {
	if value == nil {
		*d = ""
		return nil
	}
	if v, ok := value.([]byte); ok {
		*d = EmailDeliveryStatus(v)
		return nil
	}
	if v, ok := value.(string); ok {
		*d = EmailDeliveryStatus(v)
		return nil
	}
	return nil
}
