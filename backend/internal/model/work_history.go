package model

import (
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkHistory 職務経歴モデル
type WorkHistory struct {
	ID               uuid.UUID      `gorm:"type:varchar(36);primary_key" json:"id"`
	ProfileID        uuid.UUID      `gorm:"type:varchar(36);not null" json:"profile_id"`
	Profile          Profile        `gorm:"foreignKey:ProfileID" json:"-"`
	UserID           uuid.UUID      `gorm:"type:varchar(36);not null" json:"user_id"`
	User             User           `gorm:"foreignKey:UserID" json:"-"`
	ProjectName      string         `gorm:"size:255;not null" json:"project_name"`
	StartDate        time.Time      `gorm:"not null" json:"start_date"`
	EndDate          *time.Time     `json:"end_date"`
	Industry         int32          `gorm:"type:int;not null" json:"industry"`
	IndustryRef      Industry       `gorm:"foreignKey:Industry" json:"industry_ref,omitempty"` // マスタテーブルとの関連
	ProjectOverview  string         `gorm:"type:text;not null" json:"project_overview"`
	Responsibilities string         `gorm:"type:text;not null" json:"responsibilities"`
	Achievements     string         `gorm:"type:text" json:"achievements"`
	Notes            string         `gorm:"type:text" json:"notes"`
	Processes        string         `gorm:"type:text" json:"processes"`             // カンマ区切りで数値を保存
	Technologies     string         `gorm:"type:text;not null" json:"technologies"` // 後方互換性のため保持
	TeamSize         int32          `gorm:"type:int;not null" json:"team_size"`
	Role             string         `gorm:"size:255;not null" json:"role"`
	DurationMonths   int32          `gorm:"type:int;->;<-:false" json:"duration_months"` // 生成カラム（読み取り専用）
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// 新しい技術項目アソシエーション
	TechnologyItems []WorkHistoryTechnology `gorm:"foreignKey:WorkHistoryID;constraint:OnDelete:CASCADE" json:"technology_items,omitempty"`
}

// BeforeCreate UUIDを生成
func (wh *WorkHistory) BeforeCreate(tx *gorm.DB) error {
	if wh.ID == uuid.Nil {
		wh.ID = uuid.New()
	}

	// ProfileIDからUserIDを取得して設定する
	if wh.UserID == uuid.Nil && wh.ProfileID != uuid.Nil {
		var profile Profile
		if err := tx.Where("id = ?", wh.ProfileID).First(&profile).Error; err == nil {
			wh.UserID = profile.UserID
		}
	}

	return nil
}

// GetProcessesArray プロセス文字列を数値配列に変換
func (wh *WorkHistory) GetProcessesArray() []int32 {
	if wh.Processes == "" {
		return []int32{}
	}

	processStrings := SplitCSV(wh.Processes)
	processes := make([]int32, 0, len(processStrings))

	for _, processStr := range processStrings {
		if processInt, err := strconv.Atoi(strings.TrimSpace(processStr)); err == nil {
			processes = append(processes, int32(processInt))
		}
	}

	return processes
}

// SetProcessesArray プロセス数値配列を文字列に変換
func (wh *WorkHistory) SetProcessesArray(processes []int32) {
	processStrings := make([]string, len(processes))
	for i, process := range processes {
		processStrings[i] = strconv.Itoa(int(process))
	}
	wh.Processes = JoinCSV(processStrings)
}

// GetTechnologiesByCategory 技術項目をカテゴリ別に取得
func (wh *WorkHistory) GetTechnologiesByCategory() map[string][]string {
	result := make(map[string][]string)

	for _, tech := range wh.TechnologyItems {
		if tech.Category != nil {
			categoryName := tech.Category.Name
			if result[categoryName] == nil {
				result[categoryName] = []string{}
			}
			result[categoryName] = append(result[categoryName], tech.TechnologyName)
		}
	}

	return result
}

// GetProgrammingLanguages 使用言語／ライブラリを取得
func (wh *WorkHistory) GetProgrammingLanguages() []string {
	technologies := wh.GetTechnologiesByCategory()
	return technologies["programming_languages"]
}

// GetServersDatabases サーバーOS／DBサーバーを取得
func (wh *WorkHistory) GetServersDatabases() []string {
	technologies := wh.GetTechnologiesByCategory()
	return technologies["servers_databases"]
}

// GetTools ツール等を取得
func (wh *WorkHistory) GetTools() []string {
	technologies := wh.GetTechnologiesByCategory()
	return technologies["tools"]
}

// CalculateDuration 期間を計算（年月）
func (wh *WorkHistory) CalculateDuration() (years int, months int) {
	endDate := time.Now()
	if wh.EndDate != nil {
		endDate = *wh.EndDate
	}

	totalMonths := 0
	y1, m1, _ := wh.StartDate.Date()
	y2, m2, _ := endDate.Date()

	totalMonths = (y2-y1)*12 + int(m2-m1)

	// 日付の考慮
	if endDate.Day() < wh.StartDate.Day() {
		totalMonths--
	}

	// 負の値を防ぐ
	if totalMonths < 0 {
		totalMonths = 0
	}

	years = totalMonths / 12
	months = totalMonths % 12
	return years, months
}

// GetDurationText 期間を文字列で取得
func (wh *WorkHistory) GetDurationText() string {
	years, months := wh.CalculateDuration()

	if years == 0 && months == 0 {
		return "0ヶ月"
	}

	var parts []string
	if years > 0 {
		parts = append(parts, strconv.Itoa(years)+"年")
	}
	if months > 0 {
		parts = append(parts, strconv.Itoa(months)+"ヶ月")
	}

	return strings.Join(parts, "")
}
