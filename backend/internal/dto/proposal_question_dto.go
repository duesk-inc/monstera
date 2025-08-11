package dto

import (
	"time"
)

// QuestionUserSummaryDTO 質問関連ユーザー概要
type QuestionUserSummaryDTO struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}

// QuestionDetailResponse 質問詳細レスポンス
type QuestionDetailResponse struct {
	ID           string                      `json:"id"`
	ProposalID   string                      `json:"proposal_id"`
	QuestionText string                      `json:"question_text"`
	ResponseText *string                     `json:"response_text"`
	IsResponded  bool                        `json:"is_responded"`
	RespondedAt  *time.Time                  `json:"responded_at"`
	CreatedAt    time.Time                   `json:"created_at"`
	UpdatedAt    time.Time                   `json:"updated_at"`
	SalesUser    *QuestionUserSummaryDTO     `json:"sales_user,omitempty"`
	Proposal     *QuestionProposalSummaryDTO `json:"proposal,omitempty"`
}

// QuestionProposalSummaryDTO 質問画面用提案サマリー
type QuestionProposalSummaryDTO struct {
	ID          string `json:"id"`
	ProjectID   string `json:"project_id"`
	ProjectName string `json:"project_name"`
	Status      string `json:"status"`
}

// PendingQuestionItemDTO 営業担当者向け未回答質問アイテム
type PendingQuestionItemDTO struct {
	ID           string                      `json:"id"`
	ProposalID   string                      `json:"proposal_id"`
	QuestionText string                      `json:"question_text"`
	CreatedAt    time.Time                   `json:"created_at"`
	Engineer     *QuestionUserSummaryDTO     `json:"engineer"`
	Project      *QuestionProposalSummaryDTO `json:"project"`
	Priority     string                      `json:"priority"` // "high", "medium", "low"
	DaysWaiting  int                         `json:"days_waiting"`
}

// QuestionStatisticsResponse 質問統計レスポンス（管理者用）
type QuestionStatisticsResponse struct {
	TotalQuestions      int                     `json:"total_questions"`
	PendingQuestions    int                     `json:"pending_questions"`
	AnsweredQuestions   int                     `json:"answered_questions"`
	AverageResponseTime float64                 `json:"average_response_time_hours"`
	QuestionsByMonth    []QuestionMonthlyStats  `json:"questions_by_month"`
	TopEngineersByCount []EngineerQuestionStats `json:"top_engineers_by_count"`
	ResponseTimeByUser  []SalesResponseStats    `json:"response_time_by_user"`
}

// QuestionMonthlyStats 月別質問統計
type QuestionMonthlyStats struct {
	Month     string `json:"month"` // "2024-01"
	Questions int    `json:"questions"`
	Answered  int    `json:"answered"`
}

// EngineerQuestionStats エンジニア別質問統計
type EngineerQuestionStats struct {
	Engineer      *QuestionUserSummaryDTO `json:"engineer"`
	QuestionCount int                     `json:"question_count"`
	AnsweredCount int                     `json:"answered_count"`
	PendingCount  int                     `json:"pending_count"`
}

// SalesResponseStats 営業担当者別回答統計
type SalesResponseStats struct {
	SalesUser           *QuestionUserSummaryDTO `json:"sales_user"`
	ResponseCount       int                     `json:"response_count"`
	AverageResponseTime float64                 `json:"average_response_time_hours"`
	PendingCount        int                     `json:"pending_count"`
}

// QuestionActivityResponse 質問活動レスポンス（ダッシュボード用）
type QuestionActivityResponse struct {
	RecentQuestions []QuestionActivityItem `json:"recent_questions"`
	TodayStats      QuestionDailyStats     `json:"today_stats"`
	WeeklyTrend     []QuestionDailyStats   `json:"weekly_trend"`
}

// QuestionActivityItem 質問活動アイテム
type QuestionActivityItem struct {
	ID           string                      `json:"id"`
	Type         string                      `json:"type"` // "created", "answered"
	QuestionText string                      `json:"question_text"`
	Engineer     *QuestionUserSummaryDTO     `json:"engineer,omitempty"`
	SalesUser    *QuestionUserSummaryDTO     `json:"sales_user,omitempty"`
	Project      *QuestionProposalSummaryDTO `json:"project"`
	CreatedAt    time.Time                   `json:"created_at"`
}

// QuestionDailyStats 日別質問統計
type QuestionDailyStats struct {
	Date     string `json:"date"` // "2024-01-15"
	Created  int    `json:"created"`
	Answered int    `json:"answered"`
	Pending  int    `json:"pending"`
}

// QuestionBulkOperationRequest 質問一括操作リクエスト
type QuestionBulkOperationRequest struct {
	QuestionIDs []string `json:"question_ids" binding:"required,min=1"`
	Operation   string   `json:"operation" binding:"required,oneof=mark_urgent mark_normal delete"`
	SalesUserID *string  `json:"sales_user_id" binding:"omitempty"` // assign用
}

// QuestionBulkOperationResponse 質問一括操作レスポンス
type QuestionBulkOperationResponse struct {
	ProcessedCount int      `json:"processed_count"`
	FailedCount    int      `json:"failed_count"`
	FailedIDs      []string `json:"failed_ids,omitempty"`
}

// QuestionTemplateDTO 質問テンプレート（よく使われる質問）
type QuestionTemplateDTO struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	QuestionText string `json:"question_text"`
	Category     string `json:"category"`
	UsageCount   int    `json:"usage_count"`
	IsActive     bool   `json:"is_active"`
}

// QuestionTemplatesResponse 質問テンプレート一覧レスポンス
type QuestionTemplatesResponse struct {
	Items []QuestionTemplateDTO `json:"items"`
	Total int                   `json:"total"`
}

// QuestionNotificationPreferences 質問通知設定
type QuestionNotificationPreferences struct {
	EmailEnabled  bool `json:"email_enabled"`
	SlackEnabled  bool `json:"slack_enabled"`
	PushEnabled   bool `json:"push_enabled"`
	UrgentOnly    bool `json:"urgent_only"`
	BusinessHours bool `json:"business_hours_only"`
}

// UpdateNotificationPreferencesRequest 通知設定更新リクエスト
type UpdateNotificationPreferencesRequest struct {
	Preferences QuestionNotificationPreferences `json:"preferences" binding:"required"`
}
