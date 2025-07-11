package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
)

func TestRecordHTTPRequest(t *testing.T) {
	// カウンターをリセット
	HTTPRequestsTotal.Reset()

	// メトリクスを記録
	RecordHTTPRequest("GET", "/api/v1/expenses", "200", 0.5)
	RecordHTTPRequest("GET", "/api/v1/expenses", "200", 0.3)
	RecordHTTPRequest("POST", "/api/v1/expenses", "201", 1.2)
	RecordHTTPRequest("GET", "/api/v1/expenses", "500", 0.1)

	// カウンターの値を確認
	assert.Equal(t, float64(2), testutil.ToFloat64(HTTPRequestsTotal.WithLabelValues("GET", "/api/v1/expenses", "200")))
	assert.Equal(t, float64(1), testutil.ToFloat64(HTTPRequestsTotal.WithLabelValues("POST", "/api/v1/expenses", "201")))
	assert.Equal(t, float64(1), testutil.ToFloat64(HTTPRequestsTotal.WithLabelValues("GET", "/api/v1/expenses", "500")))
}

func TestRecordExpenseSubmission(t *testing.T) {
	// カウンターをリセット
	ExpenseSubmissionsTotal.Reset()
	ExpenseAmountTotal.Reset()

	// メトリクスを記録
	RecordExpenseSubmission("submitted", "transport", 5000)
	RecordExpenseSubmission("submitted", "transport", 3000)
	RecordExpenseSubmission("approved", "entertainment", 10000)
	RecordExpenseSubmission("rejected", "transport", 2000)

	// カウンターの値を確認
	assert.Equal(t, float64(2), testutil.ToFloat64(ExpenseSubmissionsTotal.WithLabelValues("submitted", "transport")))
	assert.Equal(t, float64(1), testutil.ToFloat64(ExpenseSubmissionsTotal.WithLabelValues("approved", "entertainment")))
	assert.Equal(t, float64(1), testutil.ToFloat64(ExpenseSubmissionsTotal.WithLabelValues("rejected", "transport")))

	// 金額の合計を確認
	assert.Equal(t, float64(8000), testutil.ToFloat64(ExpenseAmountTotal.WithLabelValues("submitted", "transport")))
	assert.Equal(t, float64(10000), testutil.ToFloat64(ExpenseAmountTotal.WithLabelValues("approved", "entertainment")))
}

func TestRecordCacheMetrics(t *testing.T) {
	// カウンターをリセット
	CacheHits.Reset()
	CacheMisses.Reset()

	// キャッシュヒット
	RecordCacheHit("expense", "by_id")
	RecordCacheHit("expense", "by_id")
	RecordCacheHit("category", "list")

	// キャッシュミス
	RecordCacheMiss("expense", "by_id")
	RecordCacheMiss("summary", "monthly")

	// カウンターの値を確認
	assert.Equal(t, float64(2), testutil.ToFloat64(CacheHits.WithLabelValues("expense", "by_id")))
	assert.Equal(t, float64(1), testutil.ToFloat64(CacheHits.WithLabelValues("category", "list")))
	assert.Equal(t, float64(1), testutil.ToFloat64(CacheMisses.WithLabelValues("expense", "by_id")))
	assert.Equal(t, float64(1), testutil.ToFloat64(CacheMisses.WithLabelValues("summary", "monthly")))
}

func TestRecordVirusScan(t *testing.T) {
	// カウンターをリセット
	VirusScanTotal.Reset()
	VirusDetectionsTotal.Reset()

	// ウイルススキャンを記録
	RecordVirusScan("clean", "pdf", 1.5)
	RecordVirusScan("clean", "jpg", 0.5)
	RecordVirusScan("infected", "exe", 2.0)
	RecordVirusScan("error", "pdf", 0.1)

	// ウイルス検出を記録
	RecordVirusDetection("EICAR-Test-File", "exe")
	RecordVirusDetection("Trojan.Generic", "exe")
	RecordVirusDetection("EICAR-Test-File", "zip")

	// カウンターの値を確認
	assert.Equal(t, float64(1), testutil.ToFloat64(VirusScanTotal.WithLabelValues("clean", "pdf")))
	assert.Equal(t, float64(1), testutil.ToFloat64(VirusScanTotal.WithLabelValues("clean", "jpg")))
	assert.Equal(t, float64(1), testutil.ToFloat64(VirusScanTotal.WithLabelValues("infected", "exe")))
	assert.Equal(t, float64(1), testutil.ToFloat64(VirusScanTotal.WithLabelValues("error", "pdf")))

	assert.Equal(t, float64(1), testutil.ToFloat64(VirusDetectionsTotal.WithLabelValues("EICAR-Test-File", "exe")))
	assert.Equal(t, float64(1), testutil.ToFloat64(VirusDetectionsTotal.WithLabelValues("EICAR-Test-File", "zip")))
	assert.Equal(t, float64(1), testutil.ToFloat64(VirusDetectionsTotal.WithLabelValues("Trojan.Generic", "exe")))
}

func TestRecordError(t *testing.T) {
	// カウンターをリセット
	ApplicationErrors.Reset()

	// エラーを記録
	RecordError("database", "expense_service", "high")
	RecordError("database", "expense_service", "high")
	RecordError("validation", "handler", "low")
	RecordError("network", "s3_service", "medium")

	// カウンターの値を確認
	assert.Equal(t, float64(2), testutil.ToFloat64(ApplicationErrors.WithLabelValues("database", "expense_service", "high")))
	assert.Equal(t, float64(1), testutil.ToFloat64(ApplicationErrors.WithLabelValues("validation", "handler", "low")))
	assert.Equal(t, float64(1), testutil.ToFloat64(ApplicationErrors.WithLabelValues("network", "s3_service", "medium")))
}
