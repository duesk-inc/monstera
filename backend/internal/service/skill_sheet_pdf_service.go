package service

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"gorm.io/gorm"
	"go.uber.org/zap"
)

// SkillSheetPDFService スキルシートPDFサービスのインターフェース
type SkillSheetPDFService interface {
	GenerateSkillSheetPDF(ctx context.Context, userID string) ([]byte, error)
}

// skillSheetPDFService スキルシートPDFサービスの実装
type skillSheetPDFService struct {
	db             *gorm.DB
	userRepo       repository.UserRepository
	profileRepo    repository.ProfileRepository
	skillSheetRepo repository.SkillSheetRepository
	logger         *zap.Logger
}

// NewSkillSheetPDFService スキルシートPDFサービスのインスタンスを生成
func NewSkillSheetPDFService(
	db *gorm.DB,
	userRepo repository.UserRepository,
	profileRepo repository.ProfileRepository,
	skillSheetRepo repository.SkillSheetRepository,
	logger *zap.Logger,
) SkillSheetPDFService {
	return &skillSheetPDFService{
		db:             db,
		userRepo:       userRepo,
		profileRepo:    profileRepo,
		skillSheetRepo: skillSheetRepo,
		logger:         logger,
	}
}

// GenerateSkillSheetPDF スキルシートPDFを生成
func (s *skillSheetPDFService) GenerateSkillSheetPDF(ctx context.Context, userID string) ([]byte, error) {
	// userIDをuuid.UUIDに変換
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		s.logger.Error("Invalid user ID", zap.Error(err))
		return nil, fmt.Errorf("無効なユーザーID")
	}
	
	// ユーザー情報を取得
	user, err := s.userRepo.FindByID(parsedUserID)
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

	// 作業履歴を取得
	var workHistories []model.WorkHistory
	if err := s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&workHistories).Error; err != nil {
		s.logger.Error("Failed to find work histories", zap.Error(err))
		return nil, fmt.Errorf("作業履歴の取得に失敗しました")
	}

	// PDF生成
	pdf := gofpdf.New("P", "mm", "A4", "")

	// 日本語フォントの設定
	pdf.AddUTF8Font("NotoSans", "", "NotoSansCJKjp-Regular.ttf")
	pdf.SetFont("NotoSans", "", 10)

	// ページ追加
	pdf.AddPage()

	// ヘッダー
	s.addHeader(pdf)

	// 基本情報
	s.addBasicInfo(pdf, user, profile)

	// スキル情報
	s.addSkillInfo(pdf, skillSheet)

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
func (s *skillSheetPDFService) addHeader(pdf *gofpdf.Fpdf) {
	pdf.SetFont("NotoSans", "B", 18)
	pdf.Cell(0, 10, "スキルシート")
	pdf.Ln(15)
}

// addBasicInfo 基本情報を追加
func (s *skillSheetPDFService) addBasicInfo(pdf *gofpdf.Fpdf, user *model.User, profile *model.Profile) {
	pdf.SetFont("NotoSans", "B", 14)
	pdf.Cell(0, 8, "基本情報")
	pdf.Ln(10)

	pdf.SetFont("NotoSans", "", 10)

	// 表形式で基本情報を表示
	s.addLabelValue(pdf, "氏名", user.FirstName+" "+user.LastName, 40)
	s.addLabelValue(pdf, "フリガナ", user.FirstNameKana+" "+user.LastNameKana, 40)
	if user.Birthdate != nil {
		s.addLabelValue(pdf, "生年月日", user.Birthdate.Format("2006年1月2日"), 40)
		s.addLabelValue(pdf, "年齢", fmt.Sprintf("%d歳", s.calculateAge(*user.Birthdate)), 40)
	} else {
		s.addLabelValue(pdf, "生年月日", "-", 40)
		s.addLabelValue(pdf, "年齢", "-", 40)
	}
	s.addLabelValue(pdf, "性別", s.getGenderLabel(user.Gender), 40)
	s.addLabelValue(pdf, "最寄駅", profile.NearestStation, 40)
	s.addLabelValue(pdf, "最終学歴", s.formatEducation(profile), 40)

	pdf.Ln(10)
}

// addSkillInfo スキル情報を追加
func (s *skillSheetPDFService) addSkillInfo(pdf *gofpdf.Fpdf, skillSheet *model.SkillSheet) {
	pdf.SetFont("NotoSans", "B", 14)
	pdf.Cell(0, 8, "スキル情報")
	pdf.Ln(10)

	pdf.SetFont("NotoSans", "", 10)

	// 経験年数
	s.addLabelValue(pdf, "IT経験年数", fmt.Sprintf("%d年%dヶ月", skillSheet.ITExperienceYears, skillSheet.ITExperienceMonths), 40)

	// 得意分野
	if skillSheet.Specialties != "" {
		pdf.SetFont("NotoSans", "B", 10)
		pdf.Cell(40, 6, "得意分野：")
		pdf.SetFont("NotoSans", "", 10)
		pdf.MultiCell(0, 6, skillSheet.Specialties, "0", "L", false)
		pdf.Ln(2)
	}

	// 自己PR
	if skillSheet.SelfPR != "" {
		pdf.SetFont("NotoSans", "B", 10)
		pdf.Cell(40, 6, "自己PR：")
		pdf.Ln(6)
		pdf.SetFont("NotoSans", "", 10)
		pdf.MultiCell(0, 6, skillSheet.SelfPR, "0", "L", false)
		pdf.Ln(2)
	}

	pdf.Ln(10)
}

// addWorkHistory 作業履歴を追加
func (s *skillSheetPDFService) addWorkHistory(pdf *gofpdf.Fpdf, workHistories []model.WorkHistory) {
	pdf.SetFont("NotoSans", "B", 14)
	pdf.Cell(0, 8, "作業履歴")
	pdf.Ln(10)

	for i, history := range workHistories {
		if i > 0 {
			pdf.Ln(8)
		}

		pdf.SetFont("NotoSans", "B", 12)
		pdf.Cell(0, 6, fmt.Sprintf("案件%d: %s", i+1, history.ProjectName))
		pdf.Ln(8)

		pdf.SetFont("NotoSans", "", 10)

		// 期間
		period := fmt.Sprintf("%s 〜 %s",
			history.StartDate.Format("2006年1月"),
			s.formatEndDate(history.EndDate))
		s.addLabelValue(pdf, "期間", period, 30)

		// 業種・役割
		s.addLabelValue(pdf, "業種", fmt.Sprintf("%d", history.Industry), 30)
		s.addLabelValue(pdf, "役割", history.Role, 30)
		s.addLabelValue(pdf, "規模", fmt.Sprintf("%d人", history.TeamSize), 30)

		// 業務内容
		if history.ProjectOverview != "" {
			pdf.SetFont("NotoSans", "B", 10)
			pdf.Cell(30, 6, "業務内容：")
			pdf.SetFont("NotoSans", "", 10)
			pdf.MultiCell(0, 6, history.ProjectOverview, "0", "L", false)
			pdf.Ln(2)
		}

		// 使用技術
		if history.Technologies != "" {
			pdf.SetFont("NotoSans", "B", 10)
			pdf.Cell(30, 6, "使用技術：")
			pdf.SetFont("NotoSans", "", 10)
			pdf.MultiCell(0, 6, history.Technologies, "0", "L", false)
		}
	}
}

// addFooter フッターを追加
func (s *skillSheetPDFService) addFooter(pdf *gofpdf.Fpdf) {
	pdf.SetY(-15)
	pdf.SetFont("NotoSans", "", 8)
	pdf.Cell(0, 10, fmt.Sprintf("作成日: %s", time.Now().Format("2006年1月2日")))
}

// addLabelValue ラベルと値のペアを追加
func (s *skillSheetPDFService) addLabelValue(pdf *gofpdf.Fpdf, label, value string, labelWidth float64) {
	pdf.SetFont("NotoSans", "B", 10)
	pdf.Cell(labelWidth, 6, label+"：")
	pdf.SetFont("NotoSans", "", 10)
	pdf.Cell(0, 6, value)
	pdf.Ln(6)
}

// calculateAge 年齢を計算
func (s *skillSheetPDFService) calculateAge(birthDate time.Time) int {
	now := time.Now()
	age := now.Year() - birthDate.Year()
	if now.Month() < birthDate.Month() || (now.Month() == birthDate.Month() && now.Day() < birthDate.Day()) {
		age--
	}
	return age
}

// getGenderLabel 性別ラベルを取得
func (s *skillSheetPDFService) getGenderLabel(gender string) string {
	switch gender {
	case "male":
		return "男性"
	case "female":
		return "女性"
	default:
		return "その他"
	}
}

// formatEducation 学歴をフォーマット
func (s *skillSheetPDFService) formatEducation(profile *model.Profile) string {
	if profile.Education == "" {
		return "-"
	}

	return profile.Education
}

// formatEndDate 終了日をフォーマット
func (s *skillSheetPDFService) formatEndDate(endDate *time.Time) string {
	if endDate == nil {
		return "現在"
	}
	return endDate.Format("2006年1月")
}
