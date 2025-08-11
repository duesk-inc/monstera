package dto

import (
	"fmt"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/model"
)

// ExpenseExportRequest CSVエクスポートリクエスト
type ExpenseExportRequest struct {
	// フィルター条件
	UserID       *string    `json:"user_id,omitempty"`       // ユーザーID（管理者用）
	DepartmentID *string    `json:"department_id,omitempty"` // 部門ID（管理者用）
	Status       *string    `json:"status,omitempty"`        // ステータス
	CategoryID   *string    `json:"category_id,omitempty"`   // カテゴリID
	DateFrom     *time.Time `json:"date_from,omitempty"`     // 期間From
	DateTo       *time.Time `json:"date_to,omitempty"`       // 期間To
	AmountMin    *int       `json:"amount_min,omitempty"`    // 金額下限
	AmountMax    *int       `json:"amount_max,omitempty"`    // 金額上限
	Keyword      *string    `json:"keyword,omitempty"`       // キーワード検索
	FiscalYear   *int       `json:"fiscal_year,omitempty"`   // 会計年度
	Month        *int       `json:"month,omitempty"`         // 月
	Year         *int       `json:"year,omitempty"`          // 年

	// エクスポート設定
	IncludeReceipts  bool   `json:"include_receipts"`  // 領収書URLを含む
	IncludeApprovals bool   `json:"include_approvals"` // 承認履歴を含む
	DateFormat       string `json:"date_format"`       // 日付フォーマット（デフォルト: 2006-01-02）
	Encoding         string `json:"encoding"`          // 文字エンコーディング（デフォルト: UTF-8）
	Language         string `json:"language"`          // 言語（ja/en）
}

// ExpenseCSVRecord CSV出力用レコード
type ExpenseCSVRecord struct {
	// 基本情報
	ID            string `csv:"申請ID"`
	SubmittedDate string `csv:"申請日"`
	UserName      string `csv:"申請者"`
	Department    string `csv:"部門"`

	// 経費情報
	Title       string `csv:"件名"`
	Category    string `csv:"カテゴリ"`
	Amount      string `csv:"金額"`
	ExpenseDate string `csv:"使用日"`
	Description string `csv:"使用理由"`
	Status      string `csv:"ステータス"`

	// 承認情報
	ApprovedDate string `csv:"承認日"`
	ApproverName string `csv:"承認者"`
	ApprovalStep string `csv:"承認ステップ"`

	// 却下情報
	RejectedDate    string `csv:"却下日"`
	RejectorName    string `csv:"却下者"`
	RejectionReason string `csv:"却下理由"`

	// 領収書情報
	ReceiptCount string `csv:"領収書数"`
	ReceiptURLs  string `csv:"領収書URL"`

	// システム情報
	CreatedAt string `csv:"作成日時"`
	UpdatedAt string `csv:"更新日時"`
}

// ExpenseCSVRecordEN CSV出力用レコード（英語版）
type ExpenseCSVRecordEN struct {
	// Basic Info
	ID            string `csv:"Request ID"`
	SubmittedDate string `csv:"Submitted Date"`
	UserName      string `csv:"Applicant"`
	Department    string `csv:"Department"`

	// Expense Info
	Title       string `csv:"Title"`
	Category    string `csv:"Category"`
	Amount      string `csv:"Amount"`
	ExpenseDate string `csv:"Expense Date"`
	Description string `csv:"Description"`
	Status      string `csv:"Status"`

	// Approval Info
	ApprovedDate string `csv:"Approved Date"`
	ApproverName string `csv:"Approver"`
	ApprovalStep string `csv:"Approval Step"`

	// Rejection Info
	RejectedDate    string `csv:"Rejected Date"`
	RejectorName    string `csv:"Rejector"`
	RejectionReason string `csv:"Rejection Reason"`

	// Receipt Info
	ReceiptCount string `csv:"Receipt Count"`
	ReceiptURLs  string `csv:"Receipt URLs"`

	// System Info
	CreatedAt string `csv:"Created At"`
	UpdatedAt string `csv:"Updated At"`
}

// ToCSVRecord ExpenseWithDetailsからCSVレコードに変換
func ToCSVRecord(expense *model.ExpenseWithDetails, dateFormat string, includeReceipts bool, includeApprovals bool, receipts []model.ExpenseReceipt) ExpenseCSVRecord {
	record := ExpenseCSVRecord{
		ID:          expense.ID,
		UserName:    expense.User.Name,
		Department:  "", // 部門情報は別途設定
		Title:       expense.Title,
		Category:    string(expense.Category),
		Amount:      fmt.Sprintf("%d", expense.Amount),
		ExpenseDate: expense.ExpenseDate.Format(dateFormat),
		Description: expense.Description,
		Status:      GetStatusDisplayName(string(expense.Status)),
		CreatedAt:   expense.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   expense.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// カテゴリマスタから名前を取得
	if expense.CategoryMaster != nil {
		record.Category = expense.CategoryMaster.Name
	}

	// 承認情報
	if includeApprovals && expense.ApprovedAt != nil {
		record.ApprovedDate = expense.ApprovedAt.Format(dateFormat)
		if expense.Approver != nil {
			record.ApproverName = expense.Approver.Name
		}
	}

	// 承認履歴から却下情報を取得
	if includeApprovals && len(expense.Approvals) > 0 {
		for _, approval := range expense.Approvals {
			if approval.Status == model.ApprovalStatusRejected {
				if approval.ApprovedAt != nil {
					record.RejectedDate = approval.ApprovedAt.Format(dateFormat)
				}
				record.RejectorName = approval.Approver.Name
				record.RejectionReason = approval.Comment
				record.ApprovalStep = fmt.Sprintf("%d", approval.ApprovalOrder)
				break
			}
		}
	}

	// 領収書情報
	if includeReceipts && len(receipts) > 0 {
		record.ReceiptCount = fmt.Sprintf("%d", len(receipts))
		urls := []string{}
		for _, receipt := range receipts {
			urls = append(urls, receipt.ReceiptURL)
		}
		record.ReceiptURLs = strings.Join(urls, ", ")
	}

	return record
}

// GetStatusDisplayName ステータスの表示名を取得
func GetStatusDisplayName(status string) string {
	switch status {
	case "draft":
		return "下書き"
	case "submitted":
		return "申請中"
	case "approved":
		return "承認済み"
	case "rejected":
		return "却下"
	case "paid":
		return "支払済み"
	case "cancelled":
		return "取消"
	case "expired":
		return "期限切れ"
	default:
		return status
	}
}

// GetStatusDisplayNameEN ステータスの表示名を取得（英語）
func GetStatusDisplayNameEN(status string) string {
	switch status {
	case "draft":
		return "Draft"
	case "submitted":
		return "Submitted"
	case "approved":
		return "Approved"
	case "rejected":
		return "Rejected"
	case "paid":
		return "Paid"
	case "cancelled":
		return "Cancelled"
	case "expired":
		return "Expired"
	default:
		return status
	}
}
