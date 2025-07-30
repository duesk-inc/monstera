# 職務経歴機能 詳細設計書

## 1. システム概要

### 1.1 アーキテクチャ
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│     (Go)        │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ ・職務経歴画面    │    │ ・REST API      │    │ ・profiles      │
│ ・PDF出力画面    │    │ ・PDF生成       │    │ ・work_histories│
│ ・技術入力UI     │    │ ・計算ロジック   │    │ ・technologies  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                     ┌─────────────────┐
                     │ Chrome headless │
                     │  (PDF生成)      │
                     └─────────────────┘
```

### 1.2 技術スタック
- **フロントエンド**: Next.js 15.3.2, TypeScript, MUI v7
- **バックエンド**: Go 1.22, Gin v1.8.1, GORM
- **PDF生成**: Chrome headless + HTMLテンプレート
- **データベース**: PostgreSQL

## 2. API設計詳細

### 2.1 エンドポイント仕様

#### 2.1.1 職務経歴取得 API
```
GET /api/v1/work-history
Authorization: Bearer <token>
```

**レスポンス:**
```json
{
  "user_id": "12345678-1234-1234-1234-123456789012",
  "email": "yamada@duesk.co.jp",
  "first_name": "太郎",
  "last_name": "山田",
  "first_name_kana": "タロウ",
  "last_name_kana": "ヤマダ",
  "it_experience": {
    "years": 5,
    "months": 6,
    "total_months": 66
  },
  "work_histories": [
    {
      "id": "abcd1234-5678-9012-3456-789012345678",
      "project_name": "ECサイト構築プロジェクト",
      "start_date": "2023-04-01",
      "end_date": "2024-03-31",
      "duration": {
        "years": 1,
        "months": 0,
        "total_months": 12
      },
      "industry": 5,
      "industry_name": "小売・流通",
      "project_overview": "大手小売企業のECサイト刷新プロジェクト...",
      "responsibilities": "フロントエンド開発、API設計...",
      "achievements": "売上20%向上、レスポンス時間50%改善...",
      "notes": "初回のフルスタック開発経験",
      "processes": [1, 2, 3, 4, 5],
      "process_names": ["要件定義", "基本設計", "詳細設計", "製造・実装", "テスト"],
      "programming_languages": ["Java", "JavaScript", "TypeScript"],
      "servers_databases": ["PostgreSQL", "Redis", "AWS EC2"],
      "tools": ["Git", "Docker", "Jenkins", "JIRA"],
      "team_size": 10,
      "role": "フロントエンドリード"
    }
  ],
  "technical_skills": [
    {
      "category_name": "programming_languages",
      "display_name": "プログラミング言語",
      "skills": [
        {
          "name": "Java",
          "experience": {
            "years": 3,
            "months": 6,
            "total_months": 42
          },
          "project_count": 5
        },
        {
          "name": "JavaScript",
          "experience": {
            "years": 2,
            "months": 8,
            "total_months": 32
          },
          "project_count": 3
        }
      ]
    },
    {
      "category_name": "servers_databases",
      "display_name": "サーバー・DB",
      "skills": [
        {
          "name": "PostgreSQL",
          "experience": {
            "years": 4,
            "months": 2,
            "total_months": 50
          },
          "project_count": 6
        }
      ]
    },
    {
      "category_name": "tools",
      "display_name": "ツール",
      "skills": [
        {
          "name": "Git",
          "experience": {
            "years": 5,
            "months": 0,
            "total_months": 60
          },
          "project_count": 8
        }
      ]
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 2.1.2 職務経歴更新 API
```
PUT /api/v1/work-history
Authorization: Bearer <token>
Content-Type: application/json
```

**リクエスト:**
```json
{
  "work_history": [
    {
      "project_name": "ECサイト構築プロジェクト",
      "start_date": "2023-04-01",
      "end_date": "2024-03-31",
      "industry": 5,
      "project_overview": "大手小売企業のECサイト刷新プロジェクト",
      "responsibilities": "フロントエンド開発、API設計",
      "achievements": "売上20%向上、レスポンス時間50%改善",
      "notes": "初回のフルスタック開発経験",
      "processes": [1, 2, 3, 4, 5],
      "programming_languages": ["Java", "JavaScript", "TypeScript"],
      "servers_databases": ["PostgreSQL", "Redis", "AWS EC2"],
      "tools": ["Git", "Docker", "Jenkins", "JIRA"],
      "team_size": 10,
      "role": "フロントエンドリード"
    }
  ]
}
```

#### 2.1.3 PDF生成 API
```
GET /api/v1/work-history/pdf?start_date=2024-04-01
Authorization: Bearer <token>
```

**パラメータ:**
- `start_date` (optional): 参画開始可能日 (YYYY-MM-DD形式)

**レスポンス:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="職務経歴_山田太郎_20240315143052.pdf"
```

#### 2.1.4 技術候補取得 API
```
GET /api/v1/work-history/technology-suggestions?category=programming_languages&query=java
Authorization: Bearer <token>
```

**レスポンス:**
```json
{
  "suggestions": [
    "Java",
    "JavaScript",
    "Java EE"
  ]
}
```

### 2.2 エラーレスポンス
```json
{
  "error": "バリデーションエラー",
  "details": {
    "start_date": "開始日は必須です",
    "end_date": "終了日は開始日以降の日付を入力してください",
    "project_name": "プロジェクト名は255文字以内で入力してください"
  }
}
```

## 3. データベース設計詳細

### 3.1 テーブル構造

#### 3.1.1 technology_master (新規作成)
```sql
CREATE TABLE IF NOT EXISTS technology_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL, -- 正規化された名称
  category VARCHAR(50) NOT NULL,
  usage_count INT DEFAULT 0, -- 使用回数
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID, -- 作成者（管理者）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_normalized_name (normalized_name),
  INDEX idx_usage_count (usage_count DESC)
);
```

#### 3.1.2 work_histories (既存テーブル拡張)
```sql
-- 新規カラム追加
ALTER TABLE work_histories 
ADD COLUMN duration_months INT GENERATED ALWAYS AS (
  CASE 
    WHEN end_date IS NULL THEN 
      TIMESTAMPDIFF(MONTH, start_date, CURDATE())
    ELSE 
      TIMESTAMPDIFF(MONTH, start_date, end_date)
  END
) STORED;

-- インデックス追加
CREATE INDEX idx_work_histories_start_date ON work_histories(start_date);
CREATE INDEX idx_work_histories_duration ON work_histories(duration_months);
```

### 3.2 ビュー作成

#### 3.2.1 ユーザー技術スキル集計ビュー
```sql
CREATE VIEW user_skill_summary AS
SELECT 
  wh.user_id,
  wht.technology_name,
  tc.name as category_name,
  tc.display_name as category_display_name,
  SUM(
    CASE 
      WHEN wh.end_date IS NULL THEN 
        TIMESTAMPDIFF(MONTH, wh.start_date, CURDATE())
      ELSE 
        TIMESTAMPDIFF(MONTH, wh.start_date, wh.end_date)
    END
  ) as total_experience_months,
  COUNT(*) as project_count
FROM work_histories wh
JOIN work_history_technologies wht ON wh.id = wht.work_history_id
JOIN technology_categories tc ON wht.category_id = tc.id
WHERE wh.deleted_at IS NULL
GROUP BY wh.user_id, wht.technology_name, tc.name, tc.display_name;
```

#### 3.2.2 ユーザーIT経験年数ビュー
```sql
CREATE VIEW user_it_experience AS
SELECT 
  user_id,
  SUM(
    CASE 
      WHEN end_date IS NULL THEN 
        TIMESTAMPDIFF(MONTH, start_date, CURDATE())
      ELSE 
        TIMESTAMPDIFF(MONTH, start_date, end_date)
    END
  ) as total_experience_months
FROM work_histories
WHERE deleted_at IS NULL
GROUP BY user_id;
```

## 4. バックエンド実装詳細

### 4.1 サービス層実装

#### 4.1.1 計算ロジック実装
```go
// pkg/calculator/experience_calculator.go
package calculator

import (
    "time"
    "github.com/duesk/monstera/internal/model"
)

type ExperienceCalculator struct{}

// CalculateITExperience IT経験年数を計算
func (c *ExperienceCalculator) CalculateITExperience(workHistories []model.WorkHistory) (int, int, int) {
    totalMonths := 0
    
    for _, wh := range workHistories {
        months := c.calculateMonthsBetween(wh.StartDate, wh.EndDate)
        totalMonths += months
    }
    
    years := totalMonths / 12
    remainingMonths := totalMonths % 12
    
    return years, remainingMonths, totalMonths
}

// CalculateSkillExperience スキル別経験年数を計算
func (c *ExperienceCalculator) CalculateSkillExperience(workHistories []model.WorkHistory) map[string]map[string]SkillExperience {
    skillMap := make(map[string]map[string]SkillExperience)
    
    for _, wh := range workHistories {
        duration := c.calculateMonthsBetween(wh.StartDate, wh.EndDate)
        
        // 各技術カテゴリの処理
        for _, tech := range wh.TechnologyItems {
            if tech.Category == nil {
                continue
            }
            
            categoryName := tech.Category.Name
            techName := tech.TechnologyName
            
            if skillMap[categoryName] == nil {
                skillMap[categoryName] = make(map[string]SkillExperience)
            }
            
            existing := skillMap[categoryName][techName]
            existing.TotalMonths += duration
            existing.ProjectCount++
            skillMap[categoryName][techName] = existing
        }
    }
    
    return skillMap
}

// calculateMonthsBetween 期間の月数を計算（端数切り捨て）
func (c *ExperienceCalculator) calculateMonthsBetween(start time.Time, end *time.Time) int {
    endDate := time.Now()
    if end != nil {
        endDate = *end
    }
    
    if endDate.Before(start) {
        return 0
    }
    
    months := (endDate.Year()-start.Year())*12 + int(endDate.Month()-start.Month())
    
    // 日付の調整（開始日が終了日より後の場合は1ヶ月減算）
    if endDate.Day() < start.Day() {
        months--
    }
    
    if months < 0 {
        return 0
    }
    
    return months
}

type SkillExperience struct {
    TotalMonths  int `json:"total_months"`
    ProjectCount int `json:"project_count"`
}
```

#### 4.1.2 技術名正規化処理
```go
// pkg/normalizer/technology_normalizer.go
package normalizer

import (
    "strings"
    "unicode"
)

type TechnologyNormalizer struct{}

// Normalize 技術名を正規化
func (n *TechnologyNormalizer) Normalize(name string) string {
    // 前後の空白除去
    normalized := strings.TrimSpace(name)
    
    // 小文字に変換
    normalized = strings.ToLower(normalized)
    
    // 特殊文字の正規化
    normalized = n.normalizeSpecialChars(normalized)
    
    // よくある表記ゆれの統一
    normalized = n.unifyCommonVariations(normalized)
    
    return normalized
}

// normalizeSpecialChars 特殊文字の正規化
func (n *TechnologyNormalizer) normalizeSpecialChars(s string) string {
    var result strings.Builder
    for _, r := range s {
        if unicode.IsLetter(r) || unicode.IsNumber(r) {
            result.WriteRune(r)
        } else if unicode.IsSpace(r) || r == '-' || r == '_' {
            result.WriteRune(' ')
        }
    }
    return strings.Join(strings.Fields(result.String()), " ")
}

// unifyCommonVariations よくある表記ゆれの統一
func (n *TechnologyNormalizer) unifyCommonVariations(s string) string {
    variations := map[string]string{
        "javascript": "javascript",
        "js":         "javascript",
        "typescript": "typescript",
        "ts":         "typescript",
        "java":       "java",
        "c#":         "csharp",
        "c sharp":    "csharp",
        "c++":        "cpp",
        "c plus plus": "cpp",
        "python":     "python",
        "python3":    "python",
        "mysql":      "postgresql",
        "my sql":     "postgresql",
        "postgresql": "postgresql",
        "postgres":   "postgresql",
        "aws":        "aws",
        "amazon web services": "aws",
    }
    
    if unified, exists := variations[s]; exists {
        return unified
    }
    
    return s
}
```

### 4.2 PDF生成実装

#### 4.2.1 HTMLテンプレート
```html
<!-- templates/work_history.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>職務経歴書</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body {
            font-family: 'MS Gothic', monospace;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .basic-info {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        
        .basic-info-row {
            display: table-row;
        }
        
        .basic-info-cell {
            display: table-cell;
            padding: 3px 10px;
            border: 1px solid #000;
            vertical-align: middle;
        }
        
        .label {
            background-color: #f0f0f0;
            font-weight: bold;
            width: 120px;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            background-color: #d0d0d0;
            padding: 5px 10px;
            margin: 20px 0 10px 0;
            border: 1px solid #000;
        }
        
        .work-history-item {
            border: 1px solid #000;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        
        .project-header {
            background-color: #f5f5f5;
            padding: 8px;
            border-bottom: 1px solid #000;
            font-weight: bold;
        }
        
        .project-details {
            padding: 8px;
        }
        
        .detail-row {
            margin-bottom: 8px;
        }
        
        .detail-label {
            font-weight: bold;
            display: inline-block;
            width: 100px;
            vertical-align: top;
        }
        
        .detail-value {
            display: inline-block;
            width: calc(100% - 110px);
            white-space: pre-wrap;
        }
        
        .skills-section {
            display: table;
            width: 100%;
            margin-top: 20px;
        }
        
        .skills-category {
            display: table-row;
        }
        
        .skills-category-header {
            display: table-cell;
            background-color: #e0e0e0;
            border: 1px solid #000;
            padding: 5px;
            font-weight: bold;
            width: 150px;
            vertical-align: top;
        }
        
        .skills-list {
            display: table-cell;
            border: 1px solid #000;
            padding: 5px;
            vertical-align: top;
        }
        
        .skill-item {
            margin-bottom: 3px;
        }
        
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 9pt;
            color: #666;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">職務経歴書</div>
        <div>出力日: {{.OutputDate}}</div>
    </div>
    
    <!-- 基本情報 -->
    <div class="basic-info">
        <div class="basic-info-row">
            <div class="basic-info-cell label">氏名</div>
            <div class="basic-info-cell">{{.User.LastName}} {{.User.FirstName}}</div>
            <div class="basic-info-cell label">フリガナ</div>
            <div class="basic-info-cell">{{.User.LastNameKana}} {{.User.FirstNameKana}}</div>
        </div>
        <div class="basic-info-row">
            <div class="basic-info-cell label">年齢</div>
            <div class="basic-info-cell">{{.User.Age}}歳</div>
            <div class="basic-info-cell label">性別</div>
            <div class="basic-info-cell">{{.User.Gender}}</div>
        </div>
        <div class="basic-info-row">
            <div class="basic-info-cell label">最寄り駅</div>
            <div class="basic-info-cell">{{.Profile.NearestStation}}</div>
            <div class="basic-info-cell label">出張可否</div>
            <div class="basic-info-cell">{{.Profile.CanTravelText}}</div>
        </div>
        <div class="basic-info-row">
            <div class="basic-info-cell label">IT経験年数</div>
            <div class="basic-info-cell">{{.ITExperience.Years}}年{{.ITExperience.Months}}ヶ月</div>
            <div class="basic-info-cell label">参画開始可能日</div>
            <div class="basic-info-cell">{{.StartDate}}</div>
        </div>
    </div>
    
    <!-- アピールポイント -->
    {{if .Profile.AppealPoints}}
    <div class="section-title">アピールポイント</div>
    <div style="border: 1px solid #000; padding: 10px; white-space: pre-wrap;">{{.Profile.AppealPoints}}</div>
    {{end}}
    
    <!-- 職務経歴 -->
    <div class="section-title">職務経歴</div>
    {{range .WorkHistories}}
    <div class="work-history-item">
        <div class="project-header">
            {{.ProjectName}} ({{.StartDateFormatted}} ～ {{.EndDateFormatted}}) {{.DurationText}}
        </div>
        <div class="project-details">
            <div class="detail-row">
                <span class="detail-label">業種:</span>
                <span class="detail-value">{{.IndustryName}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">規模:</span>
                <span class="detail-value">{{.TeamSize}}名</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">役割:</span>
                <span class="detail-value">{{.Role}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">担当工程:</span>
                <span class="detail-value">{{.ProcessNames}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">概要:</span>
                <span class="detail-value">{{.ProjectOverview}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">担当業務:</span>
                <span class="detail-value">{{.Responsibilities}}</span>
            </div>
            {{if .Achievements}}
            <div class="detail-row">
                <span class="detail-label">成果・実績:</span>
                <span class="detail-value">{{.Achievements}}</span>
            </div>
            {{end}}
            {{if .Notes}}
            <div class="detail-row">
                <span class="detail-label">備考:</span>
                <span class="detail-value">{{.Notes}}</span>
            </div>
            {{end}}
            
            <!-- 使用技術 -->
            {{if or .ProgrammingLanguages .ServersDatabases .Tools}}
            <div style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px;">使用技術</div>
                {{if .ProgrammingLanguages}}
                <div class="detail-row">
                    <span class="detail-label">言語:</span>
                    <span class="detail-value">{{.ProgrammingLanguagesText}}</span>
                </div>
                {{end}}
                {{if .ServersDatabases}}
                <div class="detail-row">
                    <span class="detail-label">サーバー・DB:</span>
                    <span class="detail-value">{{.ServersDatabasesText}}</span>
                </div>
                {{end}}
                {{if .Tools}}
                <div class="detail-row">
                    <span class="detail-label">ツール:</span>
                    <span class="detail-value">{{.ToolsText}}</span>
                </div>
                {{end}}
            </div>
            {{end}}
        </div>
    </div>
    {{end}}
    
    <!-- 技術スキルサマリー -->
    {{if .TechnicalSkills}}
    <div class="section-title">技術スキルサマリー</div>
    <div class="skills-section">
        {{range .TechnicalSkills}}
        <div class="skills-category">
            <div class="skills-category-header">{{.DisplayName}}</div>
            <div class="skills-list">
                {{range .Skills}}
                <div class="skill-item">{{.Name}} ({{.ExperienceText}}, {{.ProjectCount}}プロジェクト)</div>
                {{end}}
            </div>
        </div>
        {{end}}
    </div>
    {{end}}
    
    <!-- 保有資格 -->
    {{if .Certifications}}
    <div class="section-title">保有資格</div>
    <div style="border: 1px solid #000;">
        {{range .Certifications}}
        <div style="border-bottom: 1px solid #ccc; padding: 5px;">
            <strong>{{.Name}}</strong>
            （取得日: {{.AcquiredDate}}{{if .ExpiryDate}}、有効期限: {{.ExpiryDate}}{{end}}）
        </div>
        {{end}}
    </div>
    {{end}}
    
    <div class="footer">
        このドキュメントは {{.OutputDateTime}} に生成されました
    </div>
</body>
</html>
```

#### 4.2.2 PDF生成サービス
```go
// internal/service/work_history_pdf_service.go
package service

import (
    "bytes"
    "context"
    "fmt"
    "html/template"
    "os/exec"
    "path/filepath"
    "time"
    
    "github.com/duesk/monstera/internal/model"
    "github.com/duesk/monstera/pkg/calculator"
    "go.uber.org/zap"
)

type WorkHistoryPDFService struct {
    templatePath string
    logger       *zap.Logger
    calculator   *calculator.ExperienceCalculator
}

type PDFData struct {
    User             *model.User
    Profile          *model.Profile
    WorkHistories    []WorkHistoryPDFItem
    TechnicalSkills  []TechnicalSkillPDFItem
    Certifications   []CertificationPDFItem
    ITExperience     ExperienceInfo
    StartDate        string
    OutputDate       string
    OutputDateTime   string
}

type WorkHistoryPDFItem struct {
    ProjectName             string
    StartDateFormatted      string
    EndDateFormatted        string
    DurationText           string
    IndustryName           string
    TeamSize               int
    Role                   string
    ProcessNames           string
    ProjectOverview        string
    Responsibilities       string
    Achievements           string
    Notes                  string
    ProgrammingLanguages   []string
    ServersDatabases       []string
    Tools                  []string
    ProgrammingLanguagesText string
    ServersDatabasesText    string
    ToolsText              string
}

type TechnicalSkillPDFItem struct {
    DisplayName string
    Skills      []SkillPDFItem
}

type SkillPDFItem struct {
    Name           string
    ExperienceText string
    ProjectCount   int
}

type CertificationPDFItem struct {
    Name         string
    AcquiredDate string
    ExpiryDate   string
}

type ExperienceInfo struct {
    Years  int
    Months int
}

func NewWorkHistoryPDFService(templatePath string, logger *zap.Logger) *WorkHistoryPDFService {
    return &WorkHistoryPDFService{
        templatePath: templatePath,
        logger:       logger,
        calculator:   &calculator.ExperienceCalculator{},
    }
}

func (s *WorkHistoryPDFService) GeneratePDF(ctx context.Context, userID string, startDate *time.Time) ([]byte, error) {
    // データ取得
    data, err := s.collectPDFData(ctx, userID, startDate)
    if err != nil {
        return nil, fmt.Errorf("PDF用データ収集に失敗: %w", err)
    }
    
    // HTMLテンプレート生成
    htmlContent, err := s.generateHTML(data)
    if err != nil {
        return nil, fmt.Errorf("HTML生成に失敗: %w", err)
    }
    
    // PDF生成
    pdfData, err := s.convertHTMLToPDF(ctx, htmlContent)
    if err != nil {
        return nil, fmt.Errorf("PDF変換に失敗: %w", err)
    }
    
    return pdfData, nil
}

func (s *WorkHistoryPDFService) generateHTML(data *PDFData) (string, error) {
    tmpl, err := template.ParseFiles(s.templatePath)
    if err != nil {
        return "", fmt.Errorf("テンプレート読み込みエラー: %w", err)
    }
    
    var buf bytes.Buffer
    if err := tmpl.Execute(&buf, data); err != nil {
        return "", fmt.Errorf("テンプレート実行エラー: %w", err)
    }
    
    return buf.String(), nil
}

func (s *WorkHistoryPDFService) convertHTMLToPDF(ctx context.Context, htmlContent string) ([]byte, error) {
    // 一時HTMLファイル作成
    tempDir := "/tmp"
    htmlFile := filepath.Join(tempDir, fmt.Sprintf("work_history_%d.html", time.Now().UnixNano()))
    
    if err := os.WriteFile(htmlFile, []byte(htmlContent), 0644); err != nil {
        return nil, fmt.Errorf("一時HTMLファイル作成エラー: %w", err)
    }
    defer os.Remove(htmlFile)
    
    // Chrome headless実行
    cmd := exec.CommandContext(ctx, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "--headless",
        "--disable-gpu",
        "--print-to-pdf=-", // stdout出力
        "--print-to-pdf-no-header",
        "--run-all-compositor-stages-before-draw",
        htmlFile,
    )
    
    var stdout, stderr bytes.Buffer
    cmd.Stdout = &stdout
    cmd.Stderr = &stderr
    
    // 30秒でタイムアウト
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    if err := cmd.Run(); err != nil {
        s.logger.Error("Chrome headless実行エラー",
            zap.Error(err),
            zap.String("stderr", stderr.String()))
        return nil, fmt.Errorf("PDF生成エラー: %w", err)
    }
    
    return stdout.Bytes(), nil
}
```

## 5. フロントエンド実装詳細

### 5.1 コンポーネント設計

#### 5.1.1 職務経歴管理画面
```typescript
// src/app/(authenticated)/(engineer)/work-history/page.tsx
'use client';

import React, { useState } from 'react';
import { useWorkHistory } from '@/hooks/workHistory/useWorkHistory';
import { useWorkHistoryForm } from '@/hooks/workHistory/useWorkHistoryForm';
import { WorkHistoryHeader } from '@/components/features/workHistory/WorkHistoryHeader';
import { WorkHistoryList } from '@/components/features/workHistory/WorkHistoryList';
import { WorkHistoryStats } from '@/components/features/workHistory/WorkHistoryStats';
import { PDFOutputDialog } from '@/components/features/workHistory/PDFOutputDialog';
import { FormContainer, useToast, PageContainer } from '@/components/common';

export default function WorkHistoryPage() {
  const { showSuccess, showError } = useToast();
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  
  // 職務経歴データ取得
  const { workHistory, isLoading, error, refetch } = useWorkHistory();
  
  // フォーム管理
  const formMethods = useWorkHistoryForm(workHistory, {
    onSuccess: () => {
      showSuccess('職務経歴を保存しました');
      refetch();
    },
    onError: (error) => {
      showError(error.message);
    }
  });

  const handlePDFOutput = () => {
    setPdfDialogOpen(true);
  };

  return (
    <PageContainer>
      <FormContainer
        loading={isLoading}
        error={error}
        data-testid="work-history-container"
      >
        <WorkHistoryHeader 
          onPDFOutput={handlePDFOutput}
          onSave={formMethods.handleSubmit}
          onTempSave={formMethods.handleTempSave}
          isSubmitting={formMethods.isSubmitting}
          isDirty={formMethods.isDirty}
          isTempSaved={formMethods.isTempSaved}
        />
        
        {workHistory && (
          <>
            <WorkHistoryStats 
              itExperience={workHistory.itExperience}
              technicalSkills={workHistory.technicalSkills}
            />
            
            <WorkHistoryList 
              workHistories={workHistory.workHistories}
              formMethods={formMethods}
            />
          </>
        )}
        
        <PDFOutputDialog
          open={pdfDialogOpen}
          onClose={() => setPdfDialogOpen(false)}
          userName={workHistory?.lastName + ' ' + workHistory?.firstName}
        />
      </FormContainer>
    </PageContainer>
  );
}
```

#### 5.1.2 技術入力コンポーネント
```typescript
// src/components/features/workHistory/TechnologyInput.tsx
import React, { useState, useCallback } from 'react';
import { 
  Autocomplete, 
  TextField, 
  Chip, 
  Box,
  CircularProgress 
} from '@mui/material';
import { useTechnologySuggestions } from '@/hooks/workHistory/useTechnologySuggestions';
import { useDebouncedCallback } from '@/hooks/common/useDebouncedCallback';

interface TechnologyInputProps {
  category: 'programming_languages' | 'servers_databases' | 'tools';
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  placeholder?: string;
}

export const TechnologyInput: React.FC<TechnologyInputProps> = ({
  category,
  values,
  onChange,
  label,
  placeholder
}) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  
  // 技術候補の取得
  const { 
    suggestions, 
    isLoading, 
    fetchSuggestions 
  } = useTechnologySuggestions(category);
  
  // デバウンス処理
  const debouncedFetch = useDebouncedCallback(
    useCallback((query: string) => {
      if (query.length >= 1) {
        fetchSuggestions(query);
      }
    }, [fetchSuggestions]),
    300
  );
  
  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
    debouncedFetch(newInputValue);
  };
  
  const handleChange = (event: React.SyntheticEvent, newValues: string[]) => {
    // 重複除去
    const uniqueValues = Array.from(new Set(newValues.filter(v => v.trim())));
    onChange(uniqueValues);
  };
  
  return (
    <Autocomplete
      multiple
      freeSolo
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={values}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={suggestions}
      loading={isLoading}
      filterOptions={(options, { inputValue }) => {
        // 入力値も選択肢に含める
        const filtered = options.filter(option => 
          option.toLowerCase().includes(inputValue.toLowerCase())
        );
        
        if (inputValue && !filtered.includes(inputValue)) {
          filtered.push(inputValue);
        }
        
        return filtered;
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="outlined"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            key={index}
            label={option}
            {...getTagProps({ index })}
            size="small"
            color="primary"
            variant="outlined"
          />
        ))
      }
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          {option}
        </Box>
      )}
      noOptionsText={inputValue ? `"${inputValue}" を追加` : '入力して技術を検索'}
    />
  );
};
```

### 5.2 カスタムフック実装

#### 5.2.1 職務経歴データ管理
```typescript
// src/hooks/workHistory/useWorkHistory.ts
import { useState, useEffect } from 'react';
import { WorkHistory } from '@/types/workHistory';
import { fetchWorkHistory } from '@/lib/api/workHistory';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';

export const useWorkHistory = () => {
  const [workHistory, setWorkHistory] = useState<WorkHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { handleApiError } = useErrorHandler();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchWorkHistory();
      setWorkHistory(data);
    } catch (err) {
      const errorMessage = handleApiError(err, '職務経歴の取得');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    workHistory,
    isLoading,
    error,
    refetch
  };
};
```

#### 5.2.2 技術候補取得
```typescript
// src/hooks/workHistory/useTechnologySuggestions.ts
import { useState, useCallback } from 'react';
import { fetchTechnologySuggestions } from '@/lib/api/workHistory';

export const useTechnologySuggestions = (category: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchTechnologySuggestions(category, query);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('技術候補取得エラー:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  return {
    suggestions,
    isLoading,
    fetchSuggestions
  };
};
```

## 6. バリデーション設計

### 6.1 フロントエンドバリデーション
```typescript
// src/utils/validation/workHistoryValidation.ts
import * as yup from 'yup';

export const workHistoryValidationSchema = yup.object({
  workHistory: yup.array().of(
    yup.object({
      projectName: yup
        .string()
        .required('プロジェクト名は必須です')
        .max(255, 'プロジェクト名は255文字以内で入力してください'),
      
      startDate: yup
        .date()
        .required('開始日は必須です')
        .max(new Date(), '未来の日付は入力できません'),
      
      endDate: yup
        .date()
        .nullable()
        .when('startDate', (startDate, schema) => {
          return startDate ? schema.min(startDate, '終了日は開始日以降の日付を入力してください') : schema;
        })
        .max(new Date(), '未来の日付は入力できません'),
      
      industry: yup
        .number()
        .required('業種は必須です')
        .min(1, '有効な業種を選択してください')
        .max(7, '有効な業種を選択してください'),
      
      projectOverview: yup
        .string()
        .required('プロジェクト概要は必須です')
        .max(2000, 'プロジェクト概要は2000文字以内で入力してください'),
      
      responsibilities: yup
        .string()
        .required('担当業務は必須です')
        .max(2000, '担当業務は2000文字以内で入力してください'),
      
      achievements: yup
        .string()
        .max(2000, '成果・実績は2000文字以内で入力してください'),
      
      notes: yup
        .string()
        .max(2000, '備考は2000文字以内で入力してください'),
      
      processes: yup
        .array()
        .of(yup.number())
        .min(1, '担当工程を選択してください'),
      
      programmingLanguages: yup
        .array()
        .of(yup.string()),
      
      serversDatabases: yup
        .array()
        .of(yup.string()),
      
      tools: yup
        .array()
        .of(yup.string()),
      
      teamSize: yup
        .number()
        .required('チーム規模は必須です')
        .min(1, 'チーム規模は1名以上で入力してください')
        .max(1000, 'チーム規模は1000名以下で入力してください'),
      
      role: yup
        .string()
        .required('役割は必須です')
        .max(255, '役割は255文字以内で入力してください')
    })
  )
});
```

### 6.2 バックエンドバリデーション
```go
// internal/validator/work_history_validator.go
package validator

import (
    "fmt"
    "time"
    "unicode/utf8"
    
    "github.com/duesk/monstera/internal/dto"
)

type WorkHistoryValidator struct{}

func NewWorkHistoryValidator() *WorkHistoryValidator {
    return &WorkHistoryValidator{}
}

func (v *WorkHistoryValidator) ValidateWorkHistoryRequest(req dto.WorkHistorySaveRequest) map[string]string {
    errors := make(map[string]string)
    
    for i, wh := range req.WorkHistory {
        prefix := fmt.Sprintf("work_history[%d]", i)
        
        // プロジェクト名
        if wh.ProjectName == "" {
            errors[prefix+".project_name"] = "プロジェクト名は必須です"
        } else if utf8.RuneCountInString(wh.ProjectName) > 255 {
            errors[prefix+".project_name"] = "プロジェクト名は255文字以内で入力してください"
        }
        
        // 開始日
        startDate, err := time.Parse("2006-01-02", wh.StartDate)
        if err != nil {
            errors[prefix+".start_date"] = "開始日の形式が正しくありません"
        } else if startDate.After(time.Now()) {
            errors[prefix+".start_date"] = "未来の日付は入力できません"
        }
        
        // 終了日
        if wh.EndDate != "" {
            endDate, err := time.Parse("2006-01-02", wh.EndDate)
            if err != nil {
                errors[prefix+".end_date"] = "終了日の形式が正しくありません"
            } else {
                if endDate.After(time.Now()) {
                    errors[prefix+".end_date"] = "未来の日付は入力できません"
                } else if !startDate.IsZero() && endDate.Before(startDate) {
                    errors[prefix+".end_date"] = "終了日は開始日以降の日付を入力してください"
                }
            }
        }
        
        // 業種
        if wh.Industry < 1 || wh.Industry > 7 {
            errors[prefix+".industry"] = "有効な業種を選択してください"
        }
        
        // プロジェクト概要
        if wh.ProjectOverview == "" {
            errors[prefix+".project_overview"] = "プロジェクト概要は必須です"
        } else if utf8.RuneCountInString(wh.ProjectOverview) > 2000 {
            errors[prefix+".project_overview"] = "プロジェクト概要は2000文字以内で入力してください"
        }
        
        // 担当業務
        if wh.Responsibilities == "" {
            errors[prefix+".responsibilities"] = "担当業務は必須です"
        } else if utf8.RuneCountInString(wh.Responsibilities) > 2000 {
            errors[prefix+".responsibilities"] = "担当業務は2000文字以内で入力してください"
        }
        
        // 成果・実績
        if utf8.RuneCountInString(wh.Achievements) > 2000 {
            errors[prefix+".achievements"] = "成果・実績は2000文字以内で入力してください"
        }
        
        // 備考
        if utf8.RuneCountInString(wh.Notes) > 2000 {
            errors[prefix+".notes"] = "備考は2000文字以内で入力してください"
        }
        
        // 担当工程
        if len(wh.Processes) == 0 {
            errors[prefix+".processes"] = "担当工程を選択してください"
        }
        
        // チーム規模
        if wh.TeamSize < 1 {
            errors[prefix+".team_size"] = "チーム規模は1名以上で入力してください"
        } else if wh.TeamSize > 1000 {
            errors[prefix+".team_size"] = "チーム規模は1000名以下で入力してください"
        }
        
        // 役割
        if wh.Role == "" {
            errors[prefix+".role"] = "役割は必須です"
        } else if utf8.RuneCountInString(wh.Role) > 255 {
            errors[prefix+".role"] = "役割は255文字以内で入力してください"
        }
    }
    
    return errors
}
```

## 7. テスト設計

### 7.1 ユニットテスト

#### 7.1.1 計算ロジックテスト
```go
// pkg/calculator/experience_calculator_test.go
package calculator

import (
    "testing"
    "time"
    
    "github.com/duesk/monstera/internal/model"
    "github.com/stretchr/testify/assert"
)

func TestCalculateITExperience(t *testing.T) {
    calculator := &ExperienceCalculator{}
    
    tests := []struct {
        name           string
        workHistories  []model.WorkHistory
        expectedYears  int
        expectedMonths int
        expectedTotal  int
    }{
        {
            name: "連続した2つのプロジェクト",
            workHistories: []model.WorkHistory{
                {
                    StartDate: time.Date(2020, 4, 1, 0, 0, 0, 0, time.UTC),
                    EndDate:   &time.Time{time.Date(2021, 3, 31, 0, 0, 0, 0, time.UTC)},
                },
                {
                    StartDate: time.Date(2021, 4, 1, 0, 0, 0, 0, time.UTC),
                    EndDate:   &time.Time{time.Date(2023, 3, 31, 0, 0, 0, 0, time.UTC)},
                },
            },
            expectedYears:  3,
            expectedMonths: 0,
            expectedTotal:  36,
        },
        {
            name: "空白期間があるプロジェクト",
            workHistories: []model.WorkHistory{
                {
                    StartDate: time.Date(2020, 4, 1, 0, 0, 0, 0, time.UTC),
                    EndDate:   &time.Time{time.Date(2021, 3, 31, 0, 0, 0, 0, time.UTC)},
                },
                {
                    StartDate: time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC),
                    EndDate:   &time.Time{time.Date(2023, 6, 30, 0, 0, 0, 0, time.UTC)},
                },
            },
            expectedYears:  2,
            expectedMonths: 6,
            expectedTotal:  30,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            years, months, total := calculator.CalculateITExperience(tt.workHistories)
            assert.Equal(t, tt.expectedYears, years)
            assert.Equal(t, tt.expectedMonths, months)
            assert.Equal(t, tt.expectedTotal, total)
        })
    }
}
```

#### 7.1.2 API テスト
```go
// internal/handler/work_history_handler_test.go
package handler

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestWorkHistoryHandler_GetWorkHistory(t *testing.T) {
    // モックの設定
    mockService := new(MockWorkHistoryService)
    handler := NewWorkHistoryHandler(mockService, zap.NewNop())
    
    // テストデータ
    userID := uuid.New()
    expectedResponse := &dto.WorkHistoryResponse{
        UserID: userID.String(),
        // ... その他のフィールド
    }
    
    mockService.On("GetUserWorkHistory", userID).Return(expectedResponse, nil)
    
    // リクエスト作成
    gin.SetMode(gin.TestMode)
    router := gin.New()
    router.GET("/api/v1/work-history", func(c *gin.Context) {
        c.Set("user_id", userID)
        handler.GetWorkHistory(c)
    })
    
    req := httptest.NewRequest("GET", "/api/v1/work-history", nil)
    w := httptest.NewRecorder()
    
    // テスト実行
    router.ServeHTTP(w, req)
    
    // 検証
    assert.Equal(t, http.StatusOK, w.Code)
    
    var response dto.WorkHistoryResponse
    err := json.Unmarshal(w.Body.Bytes(), &response)
    assert.NoError(t, err)
    assert.Equal(t, expectedResponse.UserID, response.UserID)
    
    mockService.AssertExpectations(t)
}
```

### 7.2 統合テスト

#### 7.2.1 PDF生成テスト
```go
// integration/pdf_generation_test.go
package integration

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestPDFGeneration_CompleteWorkflow(t *testing.T) {
    // テスト用データベースセットアップ
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    // テストユーザー作成
    user := createTestUser(t, db)
    profile := createTestProfile(t, db, user.ID)
    workHistories := createTestWorkHistories(t, db, profile.ID, user.ID)
    
    // PDFサービス初期化
    pdfService := service.NewWorkHistoryPDFService(
        "../../templates/work_history.html",
        zap.NewNop(),
    )
    
    // PDF生成実行
    ctx := context.Background()
    startDate := time.Date(2024, 4, 1, 0, 0, 0, 0, time.UTC)
    
    pdfData, err := pdfService.GeneratePDF(ctx, user.ID.String(), &startDate)
    
    // 検証
    require.NoError(t, err)
    assert.NotEmpty(t, pdfData)
    assert.True(t, len(pdfData) > 1000) // 最小サイズチェック
    
    // PDFヘッダーチェック
    assert.Equal(t, []byte("%PDF"), pdfData[:4])
    
    // 一時ファイルに保存して内容確認（デバッグ用）
    if testing.Verbose() {
        err := os.WriteFile("test_output.pdf", pdfData, 0644)
        assert.NoError(t, err)
    }
}
```

### 7.3 フロントエンドテスト

#### 7.3.1 コンポーネントテスト
```typescript
// src/components/features/workHistory/__tests__/WorkHistoryList.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkHistoryList } from '../WorkHistoryList';
import { mockWorkHistoryData } from '@/tests/mocks/workHistoryMocks';

describe('WorkHistoryList', () => {
  const mockFormMethods = {
    handleSubmit: jest.fn(),
    handleTempSave: jest.fn(),
    isDirty: false,
    isSubmitting: false,
    isTempSaved: false
  };

  it('職務経歴一覧が正しく表示される', () => {
    render(
      <WorkHistoryList 
        workHistories={mockWorkHistoryData} 
        formMethods={mockFormMethods}
      />
    );

    // プロジェクト名が表示されること
    expect(screen.getByText('ECサイト構築プロジェクト')).toBeInTheDocument();
    
    // 期間が表示されること
    expect(screen.getByText(/2023年04月 - 2024年03月/)).toBeInTheDocument();
    
    // 技術スタックが表示されること
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });

  it('編集ボタンクリックで編集ダイアログが開く', async () => {
    render(
      <WorkHistoryList 
        workHistories={mockWorkHistoryData} 
        formMethods={mockFormMethods}
      />
    );

    const editButton = screen.getByLabelText('編集');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('削除ボタンクリックで確認ダイアログが表示される', async () => {
    render(
      <WorkHistoryList 
        workHistories={mockWorkHistoryData} 
        formMethods={mockFormMethods}
      />
    );

    const deleteButton = screen.getByLabelText('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('職務経歴の削除')).toBeInTheDocument();
      expect(screen.getByText('この職務経歴を削除してもよろしいですか？')).toBeInTheDocument();
    });
  });
});
```

## 8. パフォーマンス最適化

### 8.1 データベース最適化

#### 8.1.1 インデックス設計
```sql
-- 職務経歴検索用インデックス
CREATE INDEX idx_work_histories_user_start_date 
ON work_histories(user_id, start_date DESC);

-- 技術スキル集計用インデックス
CREATE INDEX idx_work_history_technologies_lookup 
ON work_history_technologies(work_history_id, category_id, technology_name);

-- 技術候補検索用インデックス
CREATE INDEX idx_technology_master_search 
ON technology_master(category, normalized_name, usage_count DESC);
```

#### 8.1.2 クエリ最適化
```go
// 技術スキル集計の最適化クエリ
func (r *workHistoryRepository) GetUserSkillSummaryOptimized(ctx context.Context, userID uuid.UUID) ([]SkillSummary, error) {
    query := `
        SELECT 
            tc.name as category_name,
            tc.display_name as category_display_name,
            wht.technology_name,
            SUM(
                CASE 
                    WHEN wh.end_date IS NULL THEN 
                        TIMESTAMPDIFF(MONTH, wh.start_date, CURDATE())
                    ELSE 
                        TIMESTAMPDIFF(MONTH, wh.start_date, wh.end_date)
                END
            ) as total_months,
            COUNT(*) as project_count
        FROM work_histories wh
        INNER JOIN work_history_technologies wht ON wh.id = wht.work_history_id
        INNER JOIN technology_categories tc ON wht.category_id = tc.id
        WHERE wh.user_id = ? AND wh.deleted_at IS NULL
        GROUP BY tc.name, tc.display_name, wht.technology_name
        ORDER BY tc.sort_order, total_months DESC
    `
    
    var results []SkillSummary
    err := r.db.WithContext(ctx).Raw(query, userID).Scan(&results).Error
    return results, err
}
```

### 8.2 フロントエンド最適化

#### 8.2.1 メモ化とパフォーマンス最適化
```typescript
// src/hooks/workHistory/useWorkHistoryOptimized.ts
import { useMemo } from 'react';
import { WorkHistory } from '@/types/workHistory';

export const useWorkHistoryStats = (workHistory: WorkHistory | null) => {
  // IT経験年数の計算（メモ化）
  const itExperienceStats = useMemo(() => {
    if (!workHistory?.workHistories) return null;
    
    const totalMonths = workHistory.workHistories.reduce((total, wh) => {
      return total + (wh.duration?.total_months || 0);
    }, 0);
    
    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      totalMonths
    };
  }, [workHistory?.workHistories]);
  
  // 技術スキル統計（メモ化）
  const skillStats = useMemo(() => {
    if (!workHistory?.technicalSkills) return [];
    
    return workHistory.technicalSkills.map(category => ({
      ...category,
      skillCount: category.skills.length,
      totalExperience: category.skills.reduce((total, skill) => 
        total + skill.experience.total_months, 0
      )
    }));
  }, [workHistory?.technicalSkills]);
  
  return {
    itExperienceStats,
    skillStats
  };
};
```

#### 8.2.2 仮想化による大量データ対応
```typescript
// src/components/features/workHistory/VirtualizedWorkHistoryList.tsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { WorkHistoryCard } from './WorkHistoryCard';

interface VirtualizedWorkHistoryListProps {
  workHistories: WorkHistory[];
  height: number;
}

const ITEM_HEIGHT = 300; // カードの高さ

export const VirtualizedWorkHistoryList: React.FC<VirtualizedWorkHistoryListProps> = ({
  workHistories,
  height
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <WorkHistoryCard workHistory={workHistories[index]} />
    </div>
  );

  return (
    <List
      height={height}
      itemCount={workHistories.length}
      itemSize={ITEM_HEIGHT}
      overscanCount={5} // 事前レンダリング数
    >
      {Row}
    </List>
  );
};
```

## 9. セキュリティ設計

### 9.1 アクセス制御
```go
// internal/middleware/work_history_auth.go
package middleware

func WorkHistoryAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
            c.Abort()
            return
        }
        
        // 管理者以外は自分の職務経歴のみアクセス可能
        role, _ := c.Get("user_role")
        if role != "admin" {
            // パスパラメータのユーザーIDをチェック
            if pathUserID := c.Param("user_id"); pathUserID != "" {
                if pathUserID != userID.(uuid.UUID).String() {
                    c.JSON(http.StatusForbidden, gin.H{"error": "アクセス権限がありません"})
                    c.Abort()
                    return
                }
            }
        }
        
        c.Next()
    }
}
```

### 9.2 データサニタイゼーション
```go
// pkg/sanitizer/text_sanitizer.go
package sanitizer

import (
    "html"
    "regexp"
    "strings"
)

type TextSanitizer struct {
    sqlInjectionPattern *regexp.Regexp
    xssPattern         *regexp.Regexp
}

func NewTextSanitizer() *TextSanitizer {
    return &TextSanitizer{
        sqlInjectionPattern: regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|exec|script)`),
        xssPattern:         regexp.MustCompile(`<[^>]*>`),
    }
}

func (s *TextSanitizer) SanitizeWorkHistoryText(text string) string {
    // HTMLエスケープ
    sanitized := html.EscapeString(text)
    
    // SQLインジェクション対策
    if s.sqlInjectionPattern.MatchString(sanitized) {
        // 危険なパターンを除去または置換
        sanitized = s.sqlInjectionPattern.ReplaceAllString(sanitized, "***")
    }
    
    // 前後の空白除去
    sanitized = strings.TrimSpace(sanitized)
    
    return sanitized
}
```

## 10. 監視・ログ設計

### 10.1 ログ出力設計
```go
// internal/middleware/work_history_logging.go
package middleware

func WorkHistoryLoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
        // 職務経歴関連のAPIアクセスログ
        if strings.Contains(param.Path, "/work-history") {
            logger.Info("職務経歴API呼び出し",
                zap.String("method", param.Method),
                zap.String("path", param.Path),
                zap.String("user_id", param.Request.Header.Get("X-User-ID")),
                zap.Int("status", param.StatusCode),
                zap.Duration("latency", param.Latency),
                zap.String("user_agent", param.Request.UserAgent()),
            )
        }
        return ""
    })
}
```

### 10.2 メトリクス収集
```go
// internal/metrics/work_history_metrics.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    WorkHistoryOperations = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "work_history_operations_total",
            Help: "職務経歴操作の総数",
        },
        []string{"operation", "status"},
    )
    
    PDFGenerationDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "pdf_generation_duration_seconds",
            Help:    "PDF生成時間",
            Buckets: []float64{1, 5, 10, 15, 30, 60},
        },
        []string{"status"},
    )
    
    WorkHistoryCount = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "work_history_count",
            Help: "ユーザーあたりの職務経歴数",
        },
        []string{"user_id"},
    )
)
```

この詳細設計書により、職務経歴機能の実装に必要なすべての技術的詳細が網羅されています。実装チームはこの設計書に基づいて効率的に開発を進めることができます。

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "\u8a73\u7d30\u8a2d\u8a08\u66f8\u4f5c\u6210\u306e\u305f\u3081\u306e\u8cea\u554f\u53ce\u96c6", "status": "completed", "priority": "high"}, {"id": "2", "content": "\u8a73\u7d30\u8a2d\u8a08\u66f8\u306e\u4f5c\u6210", "status": "completed", "priority": "high"}]