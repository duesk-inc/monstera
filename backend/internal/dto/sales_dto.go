package dto

import (
	"time"

	"github.com/google/uuid"
)

// SalesActivityDTO 営業活動DTO
type SalesActivityDTO struct {
	ID              uuid.UUID  `json:"id"`
	ClientID        uuid.UUID  `json:"client_id"`
	ClientName      string     `json:"client_name"`
	ProjectID       *uuid.UUID `json:"project_id"`
	ProjectName     string     `json:"project_name,omitempty"`
	UserID          uuid.UUID  `json:"user_id"`
	UserName        string     `json:"user_name"`
	ActivityType    string     `json:"activity_type"`
	ActivityDate    time.Time  `json:"activity_date"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	NextActionDate  *time.Time `json:"next_action_date"`
	NextActionTitle string     `json:"next_action_title"`
	Status          string     `json:"status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// CreateSalesActivityRequest 営業活動作成リクエスト
type CreateSalesActivityRequest struct {
	ClientID        uuid.UUID  `json:"client_id" binding:"required"`
	ProjectID       *uuid.UUID `json:"project_id"`
	ActivityType    string     `json:"activity_type" binding:"required,oneof=visit call email meeting proposal contract other"`
	ActivityDate    time.Time  `json:"activity_date" binding:"required"`
	Title           string     `json:"title" binding:"required,max=200"`
	Description     string     `json:"description"`
	NextActionDate  *time.Time `json:"next_action_date"`
	NextActionTitle string     `json:"next_action_title" binding:"max=200"`
	Status          string     `json:"status" binding:"required,oneof=planned completed cancelled"`
}

// UpdateSalesActivityRequest 営業活動更新リクエスト
type UpdateSalesActivityRequest struct {
	ActivityType    *string    `json:"activity_type" binding:"omitempty,oneof=visit call email meeting proposal contract other"`
	ActivityDate    *time.Time `json:"activity_date"`
	Title           *string    `json:"title" binding:"omitempty,max=200"`
	Description     *string    `json:"description"`
	NextActionDate  *time.Time `json:"next_action_date"`
	NextActionTitle *string    `json:"next_action_title" binding:"omitempty,max=200"`
	Status          *string    `json:"status" binding:"omitempty,oneof=planned completed cancelled"`
}

// SalesActivitySearchRequest 営業活動検索リクエスト
type SalesActivitySearchRequest struct {
	ClientID     *uuid.UUID `form:"client_id"`
	ProjectID    *uuid.UUID `form:"project_id"`
	UserID       *uuid.UUID `form:"user_id"`
	ActivityType string     `form:"activity_type"`
	Status       string     `form:"status"`
	DateFrom     *time.Time `form:"date_from"`
	DateTo       *time.Time `form:"date_to"`
	Page         int        `form:"page"`
	Limit        int        `form:"limit"`
}

// SalesPipelineDTO 営業パイプラインDTO
type SalesPipelineDTO struct {
	ID            uuid.UUID  `json:"id"`
	ClientID      uuid.UUID  `json:"client_id"`
	ClientName    string     `json:"client_name"`
	ProjectName   string     `json:"project_name"`
	Stage         string     `json:"stage"`
	Probability   int        `json:"probability"`
	ExpectedValue float64    `json:"expected_value"`
	ExpectedDate  *time.Time `json:"expected_date"`
	LastActivity  *time.Time `json:"last_activity"`
	NextAction    string     `json:"next_action"`
	Owner         string     `json:"owner"`
}

// SalesSummaryDTO 営業サマリDTO
type SalesSummaryDTO struct {
	TotalActivities     int                      `json:"total_activities"`
	CompletedActivities int                      `json:"completed_activities"`
	PlannedActivities   int                      `json:"planned_activities"`
	OverdueActivities   int                      `json:"overdue_activities"`
	ActivityByType      map[string]int           `json:"activity_by_type"`
	ActivityByUser      map[string]int           `json:"activity_by_user"`
	PipelineStages      map[string]PipelineStage `json:"pipeline_stages"`
}

// PipelineStage パイプラインステージ
type PipelineStage struct {
	Count         int     `json:"count"`
	TotalValue    float64 `json:"total_value"`
	ExpectedValue float64 `json:"expected_value"`
}

// ExtensionTargetDTO 契約延長確認対象DTO
type ExtensionTargetDTO struct {
	ProjectID     uuid.UUID  `json:"project_id"`
	ProjectName   string     `json:"project_name"`
	ClientID      uuid.UUID  `json:"client_id"`
	ClientName    string     `json:"client_name"`
	EndDate       *time.Time `json:"end_date"`
	DaysRemaining int        `json:"days_remaining"`
	AssignedUsers []string   `json:"assigned_users"`
	LastContact   *time.Time `json:"last_contact"`
	Status        string     `json:"status"`
}

// SalesTargetDTO 営業目標DTO
type SalesTargetDTO struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	UserName         string    `json:"user_name"`
	TargetMonth      string    `json:"target_month"`
	TargetAmount     float64   `json:"target_amount"`
	AchievedAmount   float64   `json:"achieved_amount"`
	AchievementRate  float64   `json:"achievement_rate"`
	NewClients       int       `json:"new_clients"`
	TargetNewClients int       `json:"target_new_clients"`
}
