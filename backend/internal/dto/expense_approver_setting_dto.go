package dto

import (
	"time"

	"github.com/duesk/monstera/internal/model"
)

// ExpenseApproverSettingRequest 承認者設定リクエスト
type ExpenseApproverSettingRequest struct {
	ApprovalType string `json:"approval_type" binding:"required,oneof=manager executive"`
	ApproverID   string `json:"approver_id" binding:"required"`
	IsActive     *bool  `json:"is_active"`
	Priority     *int   `json:"priority" binding:"omitempty,min=1,max=99"`
}

// ExpenseApproverSettingResponse 承認者設定レスポンス
type ExpenseApproverSettingResponse struct {
	ID           string       `json:"id"`
	ApprovalType string       `json:"approval_type"`
	ApproverID   string       `json:"approver_id"`
	Approver     *UserSummary `json:"approver"`
	IsActive     bool         `json:"is_active"`
	Priority     int          `json:"priority"`
	CreatedBy    string       `json:"created_by"`
	Creator      *UserSummary `json:"creator"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

// ExpenseApproverSettingsResponse 承認者設定一覧レスポンス
type ExpenseApproverSettingsResponse struct {
	Settings []ExpenseApproverSettingResponse `json:"settings"`
}

// ExpenseApproverSettingHistoryResponse 承認者設定履歴レスポンス
type ExpenseApproverSettingHistoryResponse struct {
	ID           string                 `json:"id"`
	SettingID    string                 `json:"setting_id"`
	ApprovalType string                 `json:"approval_type"`
	ApproverID   string                 `json:"approver_id"`
	Action       string                 `json:"action"`
	ChangedBy    string                 `json:"changed_by"`
	Changer      *UserSummary           `json:"changer"`
	ChangedAt    time.Time              `json:"changed_at"`
	OldValue     map[string]interface{} `json:"old_value,omitempty"`
	NewValue     map[string]interface{} `json:"new_value,omitempty"`
}

// ExpenseApproverSettingHistoriesResponse 承認者設定履歴一覧レスポンス
type ExpenseApproverSettingHistoriesResponse struct {
	Histories []ExpenseApproverSettingHistoryResponse `json:"histories"`
	Total     int64                                   `json:"total"`
}

// FromModel モデルからレスポンスに変換
func (r *ExpenseApproverSettingResponse) FromModel(setting *model.ExpenseApproverSetting) {
	r.ID = setting.ID
	r.ApprovalType = string(setting.ApprovalType)
	r.ApproverID = setting.ApproverID
	r.IsActive = setting.IsActive
	r.Priority = setting.Priority
	r.CreatedBy = setting.CreatedBy
	r.CreatedAt = setting.CreatedAt
	r.UpdatedAt = setting.UpdatedAt

	// 承認者情報
	if setting.Approver.ID != "" {
		r.Approver = &UserSummary{
			ID:    setting.Approver.ID,
			Name:  setting.Approver.FullName(),
			Email: setting.Approver.Email,
		}
	}

	// 作成者情報
	if setting.Creator.ID != "" {
		r.Creator = &UserSummary{
			ID:    setting.Creator.ID,
			Name:  setting.Creator.FullName(),
			Email: setting.Creator.Email,
		}
	}
}

// FromHistoryModel 履歴モデルからレスポンスに変換
func (r *ExpenseApproverSettingHistoryResponse) FromHistoryModel(history *model.ExpenseApproverSettingHistory) {
	r.ID = history.ID
	r.SettingID = history.SettingID
	r.ApprovalType = string(history.ApprovalType)
	r.ApproverID = history.ApproverID
	r.Action = history.Action
	r.ChangedBy = history.ChangedBy
	r.ChangedAt = history.ChangedAt
	r.OldValue = history.OldValue
	r.NewValue = history.NewValue

	// 変更者情報
	if history.Changer.ID != "" {
		r.Changer = &UserSummary{
			ID:    history.Changer.ID,
			Name:  history.Changer.FullName(),
			Email: history.Changer.Email,
		}
	}
}
