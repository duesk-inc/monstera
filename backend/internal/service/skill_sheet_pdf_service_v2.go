package service

import (
	"context"

	"github.com/duesk/monstera/internal/repository"
	"gorm.io/gorm"
	"go.uber.org/zap"
)

// SkillSheetPDFServiceV2 スキルシートPDFサービスのインターフェース（改良版）
type SkillSheetPDFServiceV2 interface {
	GenerateSkillSheetPDF(ctx context.Context, userID string) ([]byte, error)
}

// skillSheetPDFServiceV2 スキルシートPDFサービスの実装（改良版）
type skillSheetPDFServiceV2 struct {
	db             *gorm.DB
	userRepo       repository.UserRepository
	profileRepo    repository.ProfileRepository
	skillSheetRepo repository.SkillSheetRepository
	logger         *zap.Logger
}

// NewSkillSheetPDFServiceV2 スキルシートPDFサービスのインスタンスを生成（改良版）
func NewSkillSheetPDFServiceV2(
	db *gorm.DB,
	userRepo repository.UserRepository,
	profileRepo repository.ProfileRepository,
	skillSheetRepo repository.SkillSheetRepository,
	logger *zap.Logger,
) SkillSheetPDFServiceV2 {
	return &skillSheetPDFServiceV2{
		db:             db,
		userRepo:       userRepo,
		profileRepo:    profileRepo,
		skillSheetRepo: skillSheetRepo,
		logger:         logger,
	}
}

// GenerateSkillSheetPDF スキルシートPDFを生成
func (s *skillSheetPDFServiceV2) GenerateSkillSheetPDF(ctx context.Context, userID string) ([]byte, error) {
	// ユーザー情報を取得
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		s.logger.Error("Failed to find user", zap.Error(err))
		return nil, fmt.Errorf("ユーザーが見つかりません")
	}

	// プロフィール情報を取得
	profile, err := s.profileRepo.FindByUserID(userID)
	if err != nil {
		s.logger.Error("Failed to find profile", zap.Error(err))
		return nil, fmt.Errorf("プロフィールが見つかりません")
	}

	// スキルシート情報を取得
	skillSheet, err := s.skillSheetRepo.FindByUserID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to find skill sheet", zap.Error(err))
		return nil, fmt.Errorf("スキルシートが見つかりません")
	}

	// 作業履歴を取得（技術情報も含む）
	var workHistories []model.WorkHistory
	if err := s.db.WithContext(ctx).
		Preload("TechnologyItems.Category").
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		s.logger.Error("Failed to find work histories", zap.Error(err))
		return nil, fmt.Errorf("作業履歴の取得に失敗しました")
	}

	// 資格情報を取得
	var certifications []model.ProfileCertification
	if err := s.db.WithContext(ctx).
		Preload("Certification").
		Where("profile_id = ?", profile.ID).
		Order("acquired_date DESC").
		Find(&certifications).Error; err != nil {
		s.logger.Error("Failed to find certifications", zap.Error(err))
		// エラーでも続行
	}

	// PDF生成（英語フォントで基本実装）
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)

	// ページ追加
	pdf.AddPage()

	// ヘッダー
	s.addHeader(pdf)

	// 基本情報
	s.addBasicInfo(pdf, user, profile)

	// スキル情報
	s.addSkillInfo(pdf, skillSheet)

	// 資格情報
	if len(certifications) > 0 {
		s.addCertifications(pdf, certifications)
	}

	// 作業履歴
	s.addWorkHistory(pdf, workHistories)

	// フッター
	s.addFooter(pdf)

	// PDFをバイト配列に変換
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		s.logger.Error("Failed to generate PDF", zap.Error(err))
		return nil, fmt.Errorf("PDF生成に失敗しました")
	}

	return buf.Bytes(), nil
}

// addHeader ヘッダーを追加
func (s *skillSheetPDFServiceV2) addHeader(pdf *gofpdf.Fpdf) {
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(33, 33, 33)
	pdf.Cell(0, 12, "SKILL SHEET")
	pdf.Ln(20)
}

// addBasicInfo 基本情報を追加
func (s *skillSheetPDFServiceV2) addBasicInfo(pdf *gofpdf.Fpdf, user *model.User, profile *model.Profile) {
	s.addSectionTitle(pdf, "BASIC INFORMATION")

	// 背景色を設定
	pdf.SetFillColor(245, 245, 245)

	// 表形式で基本情報を表示
	s.addTableRow(pdf, "Name", user.FirstName+" "+user.LastName, true)
	s.addTableRow(pdf, "Name (Kana)", user.FirstNameKana+" "+user.LastNameKana, false)
	if user.Birthdate != nil {
		s.addTableRow(pdf, "Date of Birth", user.Birthdate.Format("2006/01/02"), true)
		s.addTableRow(pdf, "Age", fmt.Sprintf("%d years old", s.calculateAge(*user.Birthdate)), false)
	} else {
		s.addTableRow(pdf, "Date of Birth", "-", true)
		s.addTableRow(pdf, "Age", "-", false)
	}
	s.addTableRow(pdf, "Gender", s.getGenderLabel(user.Gender), true)
	s.addTableRow(pdf, "Nearest Station", profile.NearestStation, false)
	s.addTableRow(pdf, "Education", s.formatEducation(profile), true)

	pdf.Ln(10)
}

// addSkillInfo スキル情報を追加
func (s *skillSheetPDFServiceV2) addSkillInfo(pdf *gofpdf.Fpdf, skillSheet *model.SkillSheet) {
	s.addSectionTitle(pdf, "SKILL INFORMATION")

	// 経験年数
	pdf.SetFillColor(245, 245, 245)
	s.addTableRow(pdf, "IT Experience", fmt.Sprintf("%d years %d months", skillSheet.ITExperienceYears, skillSheet.ITExperienceMonths), true)

	// 得意分野
	if skillSheet.Specialties != "" {
		pdf.Ln(5)
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "Specialties:")
		pdf.Ln(6)
		pdf.SetFont("Arial", "", 9)
		pdf.MultiCell(0, 5, skillSheet.Specialties, "", "L", false)
	}

	// 自己PR
	if skillSheet.SelfPR != "" {
		pdf.Ln(5)
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "Self PR:")
		pdf.Ln(6)
		pdf.SetFont("Arial", "", 9)
		pdf.MultiCell(0, 5, skillSheet.SelfPR, "", "L", false)
	}

	pdf.Ln(10)
}

// addCertifications 資格情報を追加
func (s *skillSheetPDFServiceV2) addCertifications(pdf *gofpdf.Fpdf, certifications []model.ProfileCertification) {
	s.addSectionTitle(pdf, "CERTIFICATIONS")

	pdf.SetFont("Arial", "", 9)
	for i, cert := range certifications {
		if i%2 == 0 {
			pdf.SetFillColor(245, 245, 245)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		var certName string
		if cert.IsCustom && cert.CustomName != nil {
			certName = *cert.CustomName
		} else if cert.Certification != nil {
			certName = cert.Certification.Name
			if cert.Certification.Issuer != nil && *cert.Certification.Issuer != "" {
				certName += " (" + *cert.Certification.Issuer + ")"
			}
		} else {
			certName = "Unknown"
		}
		dateStr := cert.AcquiredDate.Format("2006/01")

		pdf.CellFormat(140, 8, certName, "LR", 0, "L", true, 0, "")
		pdf.CellFormat(40, 8, dateStr, "LR", 0, "R", true, 0, "")
		pdf.Ln(8)
	}

	// 下線
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(10)
}

// addWorkHistory 作業履歴を追加
func (s *skillSheetPDFServiceV2) addWorkHistory(pdf *gofpdf.Fpdf, workHistories []model.WorkHistory) {
	s.addSectionTitle(pdf, "WORK HISTORY")

	for i, history := range workHistories {
		if i > 0 {
			pdf.Ln(8)
		}

		// プロジェクト番号とタイトル
		pdf.SetFont("Arial", "B", 11)
		pdf.SetTextColor(0, 102, 204)
		pdf.Cell(0, 7, fmt.Sprintf("Project %d: %s", i+1, history.ProjectName))
		pdf.Ln(8)
		pdf.SetTextColor(33, 33, 33)

		// プロジェクト詳細
		pdf.SetFillColor(245, 245, 245)
		pdf.SetFont("Arial", "", 9)

		// 期間
		period := fmt.Sprintf("%s - %s",
			history.StartDate.Format("2006/01"),
			s.formatEndDate(history.EndDate))
		s.addProjectDetail(pdf, "Period", period)

		// 業種・役割・規模
		s.addProjectDetail(pdf, "Industry", fmt.Sprintf("%d", history.Industry))
		s.addProjectDetail(pdf, "Role", history.Role)
		s.addProjectDetail(pdf, "Team Size", fmt.Sprintf("%d members", history.TeamSize))

		// 業務内容
		if history.ProjectOverview != "" {
			pdf.Ln(3)
			pdf.SetFont("Arial", "B", 9)
			pdf.Cell(35, 5, "Description:")
			pdf.SetFont("Arial", "", 9)

			// 長いテキストを改行
			lines := s.splitText(history.ProjectOverview, 140)
			for j, line := range lines {
				if j == 0 {
					pdf.Cell(0, 5, line)
				} else {
					pdf.Ln(5)
					pdf.Cell(35, 5, "")
					pdf.Cell(0, 5, line)
				}
			}
			pdf.Ln(5)
		}

		// 使用技術
		if len(history.TechnologyItems) > 0 {
			pdf.SetFont("Arial", "B", 9)
			pdf.Cell(35, 5, "Technologies:")
			pdf.SetFont("Arial", "", 9)

			techNames := make([]string, len(history.TechnologyItems))
			for j, tech := range history.TechnologyItems {
				techNames[j] = tech.TechnologyName
			}
			techStr := strings.Join(techNames, ", ")

			// 長いテキストを改行
			lines := s.splitText(techStr, 140)
			for j, line := range lines {
				if j == 0 {
					pdf.Cell(0, 5, line)
				} else {
					pdf.Ln(5)
					pdf.Cell(35, 5, "")
					pdf.Cell(0, 5, line)
				}
			}
			pdf.Ln(5)
		}
	}
}

// addFooter フッターを追加
func (s *skillSheetPDFServiceV2) addFooter(pdf *gofpdf.Fpdf) {
	pdf.SetY(-20)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(128, 128, 128)
	pdf.Cell(0, 10, fmt.Sprintf("Generated on %s", time.Now().Format("2006/01/02")))
}

// Helper functions

func (s *skillSheetPDFServiceV2) addSectionTitle(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 102, 204)
	pdf.Cell(0, 10, title)
	pdf.Ln(12)
	pdf.SetTextColor(33, 33, 33)
}

func (s *skillSheetPDFServiceV2) addTableRow(pdf *gofpdf.Fpdf, label, value string, fill bool) {
	pdf.SetFont("Arial", "B", 9)
	if fill {
		pdf.SetFillColor(245, 245, 245)
	} else {
		pdf.SetFillColor(255, 255, 255)
	}
	pdf.CellFormat(50, 8, label+":", "L", 0, "L", fill, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(130, 8, value, "R", 0, "L", fill, 0, "")
	pdf.Ln(8)
}

func (s *skillSheetPDFServiceV2) addProjectDetail(pdf *gofpdf.Fpdf, label, value string) {
	pdf.SetFont("Arial", "B", 9)
	pdf.Cell(35, 5, label+":")
	pdf.SetFont("Arial", "", 9)
	pdf.Cell(0, 5, value)
	pdf.Ln(5)
}

func (s *skillSheetPDFServiceV2) calculateAge(birthDate time.Time) int {
	now := time.Now()
	age := now.Year() - birthDate.Year()
	if now.Month() < birthDate.Month() || (now.Month() == birthDate.Month() && now.Day() < birthDate.Day()) {
		age--
	}
	return age
}

func (s *skillSheetPDFServiceV2) getGenderLabel(gender string) string {
	switch gender {
	case "male":
		return "Male"
	case "female":
		return "Female"
	default:
		return "Other"
	}
}

func (s *skillSheetPDFServiceV2) formatEducation(profile *model.Profile) string {
	if profile.Education == "" {
		return "-"
	}

	education := profile.Education
	return education
}

func (s *skillSheetPDFServiceV2) formatEndDate(endDate *time.Time) string {
	if endDate == nil {
		return "Present"
	}
	return endDate.Format("2006/01")
}

// splitText 長いテキストを指定の幅で分割
func (s *skillSheetPDFServiceV2) splitText(text string, maxWidth float64) []string {
	// 簡易的な実装（実際にはPDFのフォントメトリクスを考慮する必要がある）
	maxChars := int(maxWidth / 2) // おおよその文字数
	var lines []string

	words := strings.Fields(text)
	currentLine := ""

	for _, word := range words {
		if len(currentLine)+len(word)+1 > maxChars {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = word
			} else {
				lines = append(lines, word)
			}
		} else {
			if currentLine != "" {
				currentLine += " "
			}
			currentLine += word
		}
	}

	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}
