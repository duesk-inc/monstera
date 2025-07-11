package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTPリクエストメトリクス
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	HTTPRequestsInFlight = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Current number of HTTP requests being served",
		},
	)

	// 経費申請メトリクス
	ExpenseSubmissionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "expense_submissions_total",
			Help: "Total number of expense submissions",
		},
		[]string{"status", "category"},
	)

	ExpenseApprovalDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "expense_approval_duration_seconds",
			Help:    "Duration from submission to final approval in seconds",
			Buckets: []float64{3600, 7200, 14400, 28800, 57600, 86400, 172800, 259200, 604800}, // 1h, 2h, 4h, 8h, 16h, 1d, 2d, 3d, 7d
		},
		[]string{"approval_level", "category"},
	)

	ExpenseAmountTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "expense_amount_total",
			Help: "Total amount of expenses in yen",
		},
		[]string{"status", "category"},
	)

	ExpenseLimitExceededTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "expense_limit_exceeded_total",
			Help: "Total number of expense limit exceeded events",
		},
		[]string{"limit_type", "category"},
	)

	// データベースメトリクス
	DBConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_active",
			Help: "Current number of active database connections",
		},
	)

	DBConnectionsIdle = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_idle",
			Help: "Current number of idle database connections",
		},
	)

	DBQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Duration of database queries in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"query_type", "table"},
	)

	DBQueryErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "db_query_errors_total",
			Help: "Total number of database query errors",
		},
		[]string{"query_type", "table", "error_type"},
	)

	// キャッシュメトリクス
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache_type", "key_type"},
	)

	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache_type", "key_type"},
	)

	CacheEvictions = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_evictions_total",
			Help: "Total number of cache evictions",
		},
		[]string{"cache_type", "reason"},
	)

	CacheSize = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "cache_size_bytes",
			Help: "Current size of cache in bytes",
		},
		[]string{"cache_type"},
	)

	// ウイルススキャンメトリクス
	VirusScanTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "virus_scan_total",
			Help: "Total number of virus scans performed",
		},
		[]string{"result", "file_type"},
	)

	VirusScanDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "virus_scan_duration_seconds",
			Help:    "Duration of virus scans in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"result", "file_type"},
	)

	VirusDetectionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "virus_detections_total",
			Help: "Total number of virus detections",
		},
		[]string{"virus_name", "file_type"},
	)

	// 通知メトリクス
	NotificationsSentTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "notifications_sent_total",
			Help: "Total number of notifications sent",
		},
		[]string{"type", "channel", "status"},
	)

	NotificationDeliveryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "notification_delivery_duration_seconds",
			Help:    "Duration of notification delivery in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"type", "channel"},
	)

	// ビジネスメトリクス
	ActiveUsersGauge = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_users_total",
			Help: "Current number of active users",
		},
	)

	PendingApprovalsGauge = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "pending_approvals_total",
			Help: "Current number of pending approvals",
		},
		[]string{"approval_level"},
	)

	ExpenseProcessingTime = promauto.NewSummaryVec(
		prometheus.SummaryOpts{
			Name:       "expense_processing_time_seconds",
			Help:       "Time taken to process expense requests",
			Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
		},
		[]string{"operation"},
	)

	// エラーメトリクス
	ApplicationErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "application_errors_total",
			Help: "Total number of application errors",
		},
		[]string{"error_type", "component", "severity"},
	)

	// 監査ログメトリクス
	AuditLogsCreated = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "audit_logs_created_total",
			Help: "Total number of audit logs created",
		},
		[]string{"action", "resource_type", "status"},
	)

	// S3メトリクス
	S3OperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "s3_operations_total",
			Help: "Total number of S3 operations",
		},
		[]string{"operation", "status"},
	)

	S3OperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "s3_operation_duration_seconds",
			Help:    "Duration of S3 operations in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)

	S3StorageBytes = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "s3_storage_bytes",
			Help: "Total bytes stored in S3",
		},
	)
)

// RecordHTTPRequest HTTPリクエストのメトリクスを記録
func RecordHTTPRequest(method, path, status string, duration float64) {
	HTTPRequestDuration.WithLabelValues(method, path, status).Observe(duration)
	HTTPRequestsTotal.WithLabelValues(method, path, status).Inc()
}

// RecordExpenseSubmission 経費申請のメトリクスを記録
func RecordExpenseSubmission(status, category string, amount float64) {
	ExpenseSubmissionsTotal.WithLabelValues(status, category).Inc()
	ExpenseAmountTotal.WithLabelValues(status, category).Add(amount)
}

// RecordCacheHit キャッシュヒットを記録
func RecordCacheHit(cacheType, keyType string) {
	CacheHits.WithLabelValues(cacheType, keyType).Inc()
}

// RecordCacheMiss キャッシュミスを記録
func RecordCacheMiss(cacheType, keyType string) {
	CacheMisses.WithLabelValues(cacheType, keyType).Inc()
}

// RecordVirusScan ウイルススキャンのメトリクスを記録
func RecordVirusScan(result, fileType string, duration float64) {
	VirusScanTotal.WithLabelValues(result, fileType).Inc()
	VirusScanDuration.WithLabelValues(result, fileType).Observe(duration)
}

// RecordVirusDetection ウイルス検出を記録
func RecordVirusDetection(virusName, fileType string) {
	VirusDetectionsTotal.WithLabelValues(virusName, fileType).Inc()
}

// RecordNotification 通知送信を記録
func RecordNotification(notificationType, channel, status string, duration float64) {
	NotificationsSentTotal.WithLabelValues(notificationType, channel, status).Inc()
	NotificationDeliveryDuration.WithLabelValues(notificationType, channel).Observe(duration)
}

// RecordError エラーを記録
func RecordError(errorType, component, severity string) {
	ApplicationErrors.WithLabelValues(errorType, component, severity).Inc()
}
