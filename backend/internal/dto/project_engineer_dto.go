package dto

import "time"

// ProjectMinimalDTO Engineer向け最小DTO（契約: docs/spec/contracts/project.md）
type ProjectMinimalDTO struct {
    ID          string     `json:"id"`
    ProjectName string     `json:"project_name"`
    Status      string     `json:"status"` // 'draft'|'active'|'archived' (FE表記)
    StartDate   *time.Time `json:"start_date,omitempty"`
    EndDate     *time.Time `json:"end_date,omitempty"`
    Description string     `json:"description,omitempty"`
    ClientID    string     `json:"client_id"`
    ClientName  string     `json:"client_name,omitempty"`
    CreatedAt   time.Time  `json:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at"`
}

// ProjectListResponse レスポンス（ページング）
type ProjectListResponse struct {
    Items      []ProjectMinimalDTO `json:"items"`
    Total      int64               `json:"total"`
    Page       int                 `json:"page"`
    Limit      int                 `json:"limit"`
    TotalPages int                 `json:"total_pages"`
}

// ProjectCreate リクエスト
type ProjectCreate struct {
    ProjectName string  `json:"project_name" binding:"required,min=1,max=200"`
    ClientID    string  `json:"client_id" binding:"required"`
    Status      *string `json:"status" binding:"omitempty,oneof=draft active"`
    StartDate   *string `json:"start_date" binding:"omitempty"` // 形式検証はハンドラ側で実施
    EndDate     *string `json:"end_date" binding:"omitempty"`
    Description *string `json:"description" binding:"omitempty,max=1000"`
}

// ProjectUpdate リクエスト
type ProjectUpdate struct {
    ProjectName *string `json:"project_name" binding:"omitempty,min=1,max=200"`
    ClientID    *string `json:"client_id" binding:"omitempty"`
    Status      *string `json:"status" binding:"omitempty,oneof=draft active archived"`
    StartDate   *string `json:"start_date" binding:"omitempty"`
    EndDate     *string `json:"end_date" binding:"omitempty"`
    Description *string `json:"description" binding:"omitempty,max=1000"`
    Version     *int64  `json:"version" binding:"omitempty"`
}

// ProjectListQuery クエリ
type ProjectListQuery struct {
    Q         string `form:"q" binding:"omitempty,max=200"`
    Status    string `form:"status" binding:"omitempty,oneof=draft active archived"`
    Page      int    `form:"page" binding:"omitempty,min=1"`
    Limit     int    `form:"limit" binding:"omitempty,min=1,max=100"`
    SortBy    string `form:"sort_by" binding:"omitempty,oneof=created_at status project_name"`
    SortOrder string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

