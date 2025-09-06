package dto

// ClientLightItem 軽量クライアントDTO（Engineer用）
type ClientLightItem struct {
    ID          string `json:"id"`
    CompanyName string `json:"company_name"`
}

// ClientLightResponse 軽量クライアント一覧レスポンス
type ClientLightResponse struct {
    Items      []ClientLightItem `json:"items"`
    Total      int64             `json:"total"`
    Page       int               `json:"page"`
    Limit      int               `json:"limit"`
    TotalPages int               `json:"total_pages"`
}

// ClientLightQuery クエリ
type ClientLightQuery struct {
    Q     string `form:"q" binding:"omitempty,max=200"`
    Page  int    `form:"page" binding:"omitempty,min=1"`
    Limit int    `form:"limit" binding:"omitempty,min=1,max=100"`
}

