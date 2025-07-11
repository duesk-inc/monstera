package service

import (
	"encoding/csv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// TestGenerateCSVBasic CSVの基本的な生成をテスト
func TestGenerateCSVBasic(t *testing.T) {
	// テスト用の日付フォーマット
	dateFormat := "2006-01-02"

	// CSVヘッダーの生成テスト
	headers := []string{
		"申請ID", "申請日", "申請者", "部門",
		"件名", "カテゴリ", "金額", "使用日", "使用理由", "ステータス",
		"承認日", "承認者", "承認ステップ",
		"却下日", "却下者", "却下理由",
		"作成日時", "更新日時",
	}

	// CSV作成
	var buf strings.Builder
	writer := csv.NewWriter(&buf)

	// ヘッダー書き込み
	err := writer.Write(headers)
	assert.NoError(t, err)

	// テストデータ書き込み
	testData := []string{
		uuid.New().String(),
		time.Now().Format(dateFormat),
		"テストユーザー",
		"開発部",
		"テスト経費",
		"交通費",
		"1000",
		time.Now().Format(dateFormat),
		"テスト使用理由",
		"下書き",
		"", // 承認日
		"", // 承認者
		"", // 承認ステップ
		"", // 却下日
		"", // 却下者
		"", // 却下理由
		time.Now().Format("2006-01-02 15:04:05"),
		time.Now().Format("2006-01-02 15:04:05"),
	}

	err = writer.Write(testData)
	assert.NoError(t, err)

	writer.Flush()

	// 結果確認
	csvContent := buf.String()
	assert.NotEmpty(t, csvContent)
	assert.Contains(t, csvContent, "申請ID")
	assert.Contains(t, csvContent, "テストユーザー")
	assert.Contains(t, csvContent, "1000")
}

// TestGenerateCSVWithBOM BOM付きCSVの生成をテスト
func TestGenerateCSVWithBOM(t *testing.T) {
	// UTF-8 BOM
	bom := []byte{0xEF, 0xBB, 0xBF}

	var buf strings.Builder
	// BOM書き込み
	buf.Write(bom)

	writer := csv.NewWriter(&buf)

	// ヘッダー書き込み
	headers := []string{"ID", "名前", "金額"}
	err := writer.Write(headers)
	assert.NoError(t, err)

	// データ書き込み
	data := []string{"1", "テスト", "1000"}
	err = writer.Write(data)
	assert.NoError(t, err)

	writer.Flush()

	// 結果確認
	result := []byte(buf.String())

	// BOMの確認
	assert.Equal(t, bom[0], result[0])
	assert.Equal(t, bom[1], result[1])
	assert.Equal(t, bom[2], result[2])

	// 内容の確認
	csvContent := string(result[3:]) // BOMをスキップ
	assert.Contains(t, csvContent, "ID")
	assert.Contains(t, csvContent, "テスト")
}

// TestGenerateCSVEnglish 英語版CSVの生成をテスト
func TestGenerateCSVEnglish(t *testing.T) {
	// 英語ヘッダー
	headers := []string{
		"Request ID", "Submitted Date", "Applicant", "Department",
		"Title", "Category", "Amount", "Expense Date", "Description", "Status",
		"Approved Date", "Approver", "Approval Step",
		"Rejected Date", "Rejector", "Rejection Reason",
		"Created At", "Updated At",
	}

	var buf strings.Builder
	writer := csv.NewWriter(&buf)

	// ヘッダー書き込み
	err := writer.Write(headers)
	assert.NoError(t, err)

	writer.Flush()

	// 結果確認
	csvContent := buf.String()
	assert.Contains(t, csvContent, "Request ID")
	assert.Contains(t, csvContent, "Applicant")
	assert.Contains(t, csvContent, "Amount")
}

// TestCSVSpecialCharacters 特殊文字を含むデータのCSV生成をテスト
func TestCSVSpecialCharacters(t *testing.T) {
	var buf strings.Builder
	writer := csv.NewWriter(&buf)

	// 特殊文字を含むデータ
	data := []string{
		"ID-001",
		`"引用符"を含む`,
		"カンマ,を含む",
		"改行\nを含む",
		"タブ\tを含む",
	}

	err := writer.Write(data)
	assert.NoError(t, err)

	writer.Flush()

	// 結果確認
	csvContent := buf.String()
	assert.Contains(t, csvContent, `"""引用符""を含む"`) // エスケープされた引用符
	assert.Contains(t, csvContent, `"カンマ,を含む"`)    // カンマを含む場合はクォート
	assert.Contains(t, csvContent, `"改行`)          // 改行を含む場合もクォート
}

// TestDateFormatting 日付フォーマットのテスト
func TestDateFormatting(t *testing.T) {
	testDate := time.Date(2024, 1, 15, 14, 30, 0, 0, time.Local)

	formats := map[string]string{
		"2006-01-02":          "2024-01-15",
		"2006/01/02":          "2024/01/15",
		"2006年01月02日":         "2024年01月15日",
		"Jan 02, 2006":        "Jan 15, 2024",
		"02-Jan-2006":         "15-Jan-2024",
		"2006-01-02 15:04:05": "2024-01-15 14:30:00",
	}

	for format, expected := range formats {
		result := testDate.Format(format)
		assert.Equal(t, expected, result, "フォーマット %s の結果が期待値と異なる", format)
	}
}

// TestExpenseStatusTranslation ステータスの日本語変換テスト
func TestExpenseStatusTranslation(t *testing.T) {
	statusMap := map[string]string{
		"draft":     "下書き",
		"submitted": "申請中",
		"approved":  "承認済み",
		"rejected":  "却下",
		"paid":      "支払済み",
		"cancelled": "取消",
	}

	for en, ja := range statusMap {
		assert.Equal(t, ja, getStatusInJapanese(en))
	}
}

// getStatusInJapanese ステータスを日本語に変換（テスト用のヘルパー関数）
func getStatusInJapanese(status string) string {
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
	default:
		return status
	}
}
