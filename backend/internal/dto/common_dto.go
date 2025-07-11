package dto

// ErrorResponse 統一エラーレスポンス形式（仕様書に準拠）
type ErrorResponse struct {
	Error   string            `json:"error"`
	Code    string            `json:"code,omitempty"`
	Details map[string]string `json:"details,omitempty"`
}

// SuccessResponse 統一成功レスポンス形式
type SuccessResponse struct {
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// PaginationResponse ページネーション付きレスポンス
type PaginationResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

// UpdateDefaultRoleRequest デフォルトロール更新リクエスト
type UpdateDefaultRoleRequest struct {
	DefaultRole *int `json:"default_role" binding:"omitempty,min=1,max=4"`
}
