package service

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WorkHistoryPDFService PDFサービスのインターフェース
type WorkHistoryPDFService interface {
	GeneratePDF(ctx context.Context, userID string, startDate *time.Time) ([]byte, string, error)
}

// workHistoryPDFService PDFサービスの実装
type workHistoryPDFService struct {
	db                   *gorm.DB
	workHistoryService   WorkHistoryService
	logger               *zap.Logger
	chromePath           string
	templateDir          string
	pdfGenerationTimeout time.Duration
}

// NewWorkHistoryPDFService PDFサービスのコンストラクタ
func NewWorkHistoryPDFService(
	db *gorm.DB,
	workHistoryService WorkHistoryService,
	logger *zap.Logger,
) WorkHistoryPDFService {
	chromePath := os.Getenv("CHROME_PATH")
	if chromePath == "" {
		chromePath = "/usr/bin/google-chrome"
	}

	templateDir := os.Getenv("TEMPLATE_DIR")
	if templateDir == "" {
		templateDir = "/app/templates"
	}

	timeoutStr := os.Getenv("PDF_GENERATION_TIMEOUT")
	timeout := 30 * time.Second
	if timeoutStr != "" {
		if t, err := time.ParseDuration(timeoutStr + "s"); err == nil {
			timeout = t
		}
	}

	return &workHistoryPDFService{
		db:                   db,
		workHistoryService:   workHistoryService,
		logger:               logger,
		chromePath:           chromePath,
		templateDir:          templateDir,
		pdfGenerationTimeout: timeout,
	}
}

// PDFTemplateData PDFテンプレート用データ構造
type PDFTemplateData struct {
	// 基本情報
	UserID        string
	Email         string
	LastName      string
	FirstName     string
	LastNameKana  string
	FirstNameKana string
	OutputDate    string
	StartDate     string // 参画開始可能日

	// IT経験
	ITExperience struct {
		Years       int
		Months      int
		TotalMonths int
	}

	// 職務経歴
	WorkHistories []PDFWorkHistory

	// 技術スキル
	TechnicalSkills []PDFTechnicalSkillCategory
}

// PDFWorkHistory PDF用職務経歴データ
type PDFWorkHistory struct {
	ID          string
	ProjectName string
	StartDate   string
	EndDate     string
	Duration    struct {
		Years       int
		Months      int
		TotalMonths int
	}
	Industry             int
	IndustryName         string
	ProjectOverview      string
	Responsibilities     string
	Achievements         string
	Notes                string
	Processes            []int
	ProcessNames         []string
	ProgrammingLanguages []string
	ServersDatabases     []string
	Tools                []string
	TeamSize             int
	Role                 string
}

// PDFTechnicalSkillCategory PDF用技術スキルカテゴリ
type PDFTechnicalSkillCategory struct {
	CategoryName string
	DisplayName  string
	Skills       []PDFTechnicalSkillItem
}

// PDFTechnicalSkillItem PDF用技術スキル項目
type PDFTechnicalSkillItem struct {
	Name       string
	Experience struct {
		Years       int
		Months      int
		TotalMonths int
	}
	ProjectCount int
}

// GeneratePDF PDFを生成
func (s *workHistoryPDFService) GeneratePDF(ctx context.Context, userID string, startDate *time.Time) ([]byte, string, error) {
	// 職務経歴データを取得
	workHistoryData, err := s.workHistoryService.GetWorkHistory(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get work history data", zap.Error(err))
		return nil, "", fmt.Errorf("職務経歴データの取得に失敗しました: %w", err)
	}

	// PDFテンプレートデータに変換
	templateData := s.convertToPDFData(workHistoryData, startDate)

	// HTMLを生成
	html, err := s.generateHTML(templateData)
	if err != nil {
		s.logger.Error("Failed to generate HTML", zap.Error(err))
		return nil, "", fmt.Errorf("HTMLの生成に失敗しました: %w", err)
	}

	// PDFを生成
	pdf, err := s.generatePDFFromHTML(ctx, html)
	if err != nil {
		s.logger.Error("Failed to generate PDF", zap.Error(err))
		return nil, "", fmt.Errorf("PDFの生成に失敗しました: %w", err)
	}

	// ファイル名を生成
	fileName := s.generateFileName(workHistoryData)

	return pdf, fileName, nil
}

// convertToPDFData WorkHistoryDataをPDFテンプレート用データに変換
func (s *workHistoryPDFService) convertToPDFData(data *WorkHistoryData, startDate *time.Time) PDFTemplateData {
	result := PDFTemplateData{
		UserID:        data.UserID,
		Email:         data.Email,
		LastName:      data.LastName,
		FirstName:     data.FirstName,
		LastNameKana:  data.LastNameKana,
		FirstNameKana: data.FirstNameKana,
		OutputDate:    time.Now().Format("2006年1月2日"),
	}

	// 参画開始可能日
	if startDate != nil {
		result.StartDate = startDate.Format("2006年1月2日")
	}

	// IT経験年数
	result.ITExperience.Years = data.ITExperience.Years
	result.ITExperience.Months = data.ITExperience.Months
	result.ITExperience.TotalMonths = data.ITExperience.TotalMonths

	// 職務経歴を変換
	for _, wh := range data.WorkHistories {
		pdfWH := PDFWorkHistory{
			ID:               wh.ID,
			ProjectName:      wh.ProjectName,
			StartDate:        wh.StartDate.Format("2006年1月"),
			Industry:         wh.Industry,
			IndustryName:     wh.IndustryName,
			ProjectOverview:  wh.ProjectOverview,
			Responsibilities: wh.Responsibilities,
			Achievements:     wh.Achievements,
			Notes:            wh.Notes,
			Processes:        wh.Processes,
			ProcessNames:     wh.ProcessNames,
			TeamSize:         wh.TeamSize,
			Role:             wh.Role,
		}

		// 終了日
		if wh.EndDate != nil {
			pdfWH.EndDate = wh.EndDate.Format("2006年1月")
		}

		// 期間
		if wh.Duration != nil {
			pdfWH.Duration.Years = wh.Duration.Years
			pdfWH.Duration.Months = wh.Duration.Months
			pdfWH.Duration.TotalMonths = wh.Duration.TotalMonths
		}

		// 技術スタック
		pdfWH.ProgrammingLanguages = wh.ProgrammingLanguages
		pdfWH.ServersDatabases = wh.ServersDatabases
		pdfWH.Tools = wh.Tools

		result.WorkHistories = append(result.WorkHistories, pdfWH)
	}

	// 技術スキルを変換
	for _, category := range data.TechnicalSkills {
		pdfCategory := PDFTechnicalSkillCategory{
			CategoryName: category.CategoryName,
			DisplayName:  category.DisplayName,
		}

		for _, skill := range category.Skills {
			pdfSkill := PDFTechnicalSkillItem{
				Name:         skill.Name,
				ProjectCount: skill.ProjectCount,
			}
			pdfSkill.Experience.Years = skill.Experience.Years
			pdfSkill.Experience.Months = skill.Experience.Months
			pdfSkill.Experience.TotalMonths = skill.Experience.TotalMonths

			pdfCategory.Skills = append(pdfCategory.Skills, pdfSkill)
		}

		result.TechnicalSkills = append(result.TechnicalSkills, pdfCategory)
	}

	return result
}

// generateHTML HTMLを生成
func (s *workHistoryPDFService) generateHTML(data PDFTemplateData) (string, error) {
	templatePath := filepath.Join(s.templateDir, "work_history.html")

	// テンプレートを読み込み
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		return "", fmt.Errorf("テンプレートの読み込みに失敗しました: %w", err)
	}

	// HTMLを生成
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("HTMLの生成に失敗しました: %w", err)
	}

	return buf.String(), nil
}

// generatePDFFromHTML HTMLからPDFを生成
func (s *workHistoryPDFService) generatePDFFromHTML(ctx context.Context, html string) ([]byte, error) {
	// タイムアウト付きコンテキストを作成
	ctx, cancel := context.WithTimeout(ctx, s.pdfGenerationTimeout)
	defer cancel()

	// 一時HTMLファイルを作成
	tmpFile, err := os.CreateTemp("", "work_history_*.html")
	if err != nil {
		return nil, fmt.Errorf("一時ファイルの作成に失敗しました: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	// HTMLを書き込み
	if _, err := tmpFile.WriteString(html); err != nil {
		return nil, fmt.Errorf("HTMLの書き込みに失敗しました: %w", err)
	}
	tmpFile.Close()

	// Chrome headlessコマンドを実行
	cmd := exec.CommandContext(ctx, s.chromePath,
		"--headless",
		"--disable-gpu",
		"--print-to-pdf-no-header",
		"--no-sandbox",
		"--disable-setuid-sandbox",
		"--disable-dev-shm-usage",
		"--print-to-pdf="+tmpFile.Name()+".pdf",
		tmpFile.Name(),
	)

	// エラー出力をキャプチャ
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	// コマンド実行
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("PDF生成コマンドの実行に失敗しました: %w, stderr: %s", err, stderr.String())
	}

	// 生成されたPDFを読み込み
	pdfPath := tmpFile.Name() + ".pdf"
	defer os.Remove(pdfPath)

	pdfData, err := os.ReadFile(pdfPath)
	if err != nil {
		return nil, fmt.Errorf("PDFファイルの読み込みに失敗しました: %w", err)
	}

	return pdfData, nil
}

// generateFileName ファイル名を生成
func (s *workHistoryPDFService) generateFileName(data *WorkHistoryData) string {
	// 職務経歴_姓名_YYYYMMDD.pdf
	now := time.Now()
	return fmt.Sprintf("職務経歴_%s%s_%s.pdf",
		data.LastName,
		data.FirstName,
		now.Format("20060102"),
	)
}
