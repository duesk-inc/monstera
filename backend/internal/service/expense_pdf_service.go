package service

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/repository"
	"github.com/jung-kurt/gofpdf"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ExpensePDFService 経費申請PDFサービスのインターフェース
type ExpensePDFService interface {
	GenerateExpensePDF(ctx context.Context, expenseID string) ([]byte, error)
	GenerateExpenseListPDF(ctx context.Context, filter *dto.ExpenseFilterRequest) ([]byte, error)
}

// expensePDFService 経費申請PDFサービスの実装
type expensePDFService struct {
	db           *gorm.DB
	expenseRepo  repository.ExpenseRepository
	userRepo     repository.UserRepository
	categoryRepo repository.ExpenseCategoryRepository
	logger       *zap.Logger
}

// NewExpensePDFService 経費申請PDFサービスのインスタンスを生成
func NewExpensePDFService(
	db *gorm.DB,
	expenseRepo repository.ExpenseRepository,
	userRepo repository.UserRepository,
	categoryRepo repository.ExpenseCategoryRepository,
	logger *zap.Logger,
) ExpensePDFService {
	return &expensePDFService{
		db:           db,
		expenseRepo:  expenseRepo,
		userRepo:     userRepo,
		categoryRepo: categoryRepo,
		logger:       logger,
	}
}

// GenerateExpensePDF 単一の経費申請PDFを生成
func (s *expensePDFService) GenerateExpensePDF(ctx context.Context, expenseID string) ([]byte, error) {
	// 経費申請情報を取得
	expense, err := s.expenseRepo.GetByID(ctx, expenseID)
	if err != nil {
		s.logger.Error("Failed to find expense", zap.Error(err), zap.String("expense_id", expenseID))
		return nil, fmt.Errorf("経費申請が見つかりません")
	}

	// 申請者情報を取得
	user, err := s.userRepo.FindByID(expense.UserID)
	if err != nil {
		s.logger.Error("Failed to find user", zap.Error(err), zap.String("user_id", expense.UserID))
		return nil, fmt.Errorf("ユーザーが見つかりません")
	}

	// PDF生成
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// 日本語フォントの設定（将来的に実装）
	// 現在は英語フォントで代替
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "Expense Report")
	pdf.Ln(15)

	// ヘッダー情報
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(40, 8, "Report ID:")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 8, expense.ID)
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(40, 8, "Date:")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 8, expense.CreatedAt.Format("2006-01-02"))
	pdf.Ln(8)

	pdf.Cell(40, 8, "Employee:")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 8, fmt.Sprintf("%s %s", user.LastName, user.FirstName))
	pdf.Ln(8)

	pdf.Cell(40, 8, "Status:")
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(0, 8, string(expense.Status))
	pdf.Ln(15)

	// 経費詳細
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 8, "Expense Details")
	pdf.Ln(10)

	// テーブルヘッダー
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(80, 8, "Description", "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 8, "Category", "1", 0, "L", true, 0, "")
	pdf.CellFormat(30, 8, "Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, "Amount", "1", 0, "R", true, 0, "")
	pdf.Ln(8)

	// 経費項目
	pdf.SetFont("Arial", "", 10)
	pdf.SetFillColor(255, 255, 255)

	// 単一の経費として表示
	pdf.CellFormat(80, 8, expense.Title, "1", 0, "L", false, 0, "")
	pdf.CellFormat(40, 8, string(expense.Category), "1", 0, "L", false, 0, "")
	pdf.CellFormat(30, 8, expense.ExpenseDate.Format("2006-01-02"), "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 8, fmt.Sprintf("%d", expense.Amount), "1", 0, "R", false, 0, "")
	pdf.Ln(8)

	// 説明がある場合は追加
	if expense.Description != "" {
		pdf.Ln(5)
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 8, "Description:")
		pdf.Ln(8)
		pdf.SetFont("Arial", "", 10)
		pdf.MultiCell(0, 6, expense.Description, "", "L", false)
	}

	// 合計
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(150, 8, "Total", "1", 0, "R", true, 0, "")
	pdf.CellFormat(30, 8, fmt.Sprintf("%d", expense.Amount), "1", 0, "R", true, 0, "")
	pdf.Ln(15)

	// 承認情報
	if expense.ApproverID != nil {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 8, "Approval Information")
		pdf.Ln(10)

		pdf.SetFont("Arial", "", 10)
		pdf.Cell(40, 8, "Approved By:")
		approver, _ := s.userRepo.FindByID(*expense.ApproverID)
		if approver != nil {
			pdf.Cell(0, 8, fmt.Sprintf("%s %s", approver.LastName, approver.FirstName))
		}
		pdf.Ln(8)

		if expense.ApprovedAt != nil {
			pdf.Cell(40, 8, "Approved Date:")
			pdf.Cell(0, 8, expense.ApprovedAt.Format("2006-01-02 15:04:05"))
			pdf.Ln(8)
		}
	}

	// PDFをバッファに出力
	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		s.logger.Error("Failed to generate PDF", zap.Error(err))
		return nil, fmt.Errorf("PDF生成に失敗しました")
	}

	return buf.Bytes(), nil
}

// GenerateExpenseListPDF 経費申請一覧のPDFを生成
func (s *expensePDFService) GenerateExpenseListPDF(ctx context.Context, filter *dto.ExpenseFilterRequest) ([]byte, error) {
	// 経費申請一覧を取得
	expenses, _, err := s.expenseRepo.List(ctx, filter)
	if err != nil {
		s.logger.Error("Failed to list expenses", zap.Error(err))
		return nil, fmt.Errorf("経費申請一覧の取得に失敗しました")
	}

	// PDF生成
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// タイトル
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "Expense List Report")
	pdf.Ln(8)

	// 生成日時
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 8, fmt.Sprintf("Generated: %s", time.Now().Format("2006-01-02 15:04:05")))
	pdf.Ln(12)

	// テーブルヘッダー
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(35, 7, "Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(50, 7, "Employee", "1", 0, "L", true, 0, "")
	pdf.CellFormat(25, 7, "Status", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 7, "Amount", "1", 0, "R", true, 0, "")
	pdf.CellFormat(45, 7, "Description", "1", 0, "L", true, 0, "")
	pdf.Ln(7)

	// データ行
	pdf.SetFont("Arial", "", 9)
	pdf.SetFillColor(255, 255, 255)

	var totalAmount float64
	for _, expense := range expenses {
		// ユーザー情報を取得
		user, _ := s.userRepo.FindByID(expense.UserID)
		userName := "Unknown"
		if user != nil {
			userName = fmt.Sprintf("%s %s", user.LastName, user.FirstName)
		}

		// 経費の金額を取得
		amount := float64(expense.Amount)
		totalAmount += amount

		// 行を出力
		pdf.CellFormat(35, 7, expense.CreatedAt.Format("2006-01-02"), "1", 0, "C", false, 0, "")
		pdf.CellFormat(50, 7, userName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 7, string(expense.Status), "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", amount), "1", 0, "R", false, 0, "")

		// 説明（タイトルを表示）
		description := expense.Title
		if len(description) > 20 {
			description = description[:20] + "..."
		}
		pdf.CellFormat(45, 7, description, "1", 0, "L", false, 0, "")
		pdf.Ln(7)

		// ページが満杯になったら新しいページを追加
		if pdf.GetY() > 260 {
			pdf.AddPage()
			// ヘッダーを再描画
			pdf.SetFont("Arial", "B", 9)
			pdf.SetFillColor(240, 240, 240)
			pdf.CellFormat(35, 7, "Date", "1", 0, "C", true, 0, "")
			pdf.CellFormat(50, 7, "Employee", "1", 0, "L", true, 0, "")
			pdf.CellFormat(25, 7, "Status", "1", 0, "C", true, 0, "")
			pdf.CellFormat(25, 7, "Amount", "1", 0, "R", true, 0, "")
			pdf.CellFormat(45, 7, "Description", "1", 0, "L", true, 0, "")
			pdf.Ln(7)
			pdf.SetFont("Arial", "", 9)
			pdf.SetFillColor(255, 255, 255)
		}
	}

	// 合計行
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(110, 7, "Total", "1", 0, "R", true, 0, "")
	pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", totalAmount), "1", 0, "R", true, 0, "")
	pdf.CellFormat(45, 7, "", "1", 0, "L", true, 0, "")

	// PDFをバッファに出力
	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		s.logger.Error("Failed to generate PDF", zap.Error(err))
		return nil, fmt.Errorf("PDF生成に失敗しました")
	}

	return buf.Bytes(), nil
}
