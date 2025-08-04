package test

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// E2ETestConfig E2Eテスト設定
type E2ETestConfig struct {
	// データベース設定
	DatabaseURL      string
	TestDatabaseName string
	CleanupAfterTest bool

	// サーバー設定
	ServerPort     int
	ServerHost     string
	RequestTimeout time.Duration

	// パフォーマンステスト設定
	MaxConcurrentRequests int
	PerformanceThreshold  time.Duration

	// ログ設定
	LogLevel       string
	EnableDebugLog bool

	// テストデータ設定
	TestDataSize    int
	CleanupTestData bool
}

// LoadE2ETestConfig E2Eテスト設定を環境変数から読み込み
func LoadE2ETestConfig() *E2ETestConfig {
	config := &E2ETestConfig{
		// デフォルト値
		DatabaseURL:      getEnv("E2E_DATABASE_URL", "mysql://root:password@localhost:3306/monstera_test"),
		TestDatabaseName: getEnv("E2E_TEST_DB_NAME", "monstera_e2e_test"),
		CleanupAfterTest: getBoolEnv("E2E_CLEANUP_AFTER_TEST", true),

		ServerPort:     getIntEnv("E2E_SERVER_PORT", 8080),
		ServerHost:     getEnv("E2E_SERVER_HOST", "localhost"),
		RequestTimeout: getDurationEnv("E2E_REQUEST_TIMEOUT", 30*time.Second),

		MaxConcurrentRequests: getIntEnv("E2E_MAX_CONCURRENT_REQUESTS", 50),
		PerformanceThreshold:  getDurationEnv("E2E_PERFORMANCE_THRESHOLD", 2*time.Second),

		LogLevel:       getEnv("E2E_LOG_LEVEL", "info"),
		EnableDebugLog: getBoolEnv("E2E_ENABLE_DEBUG_LOG", false),

		TestDataSize:    getIntEnv("E2E_TEST_DATA_SIZE", 100),
		CleanupTestData: getBoolEnv("E2E_CLEANUP_TEST_DATA", true),
	}

	return config
}

// getEnv 環境変数を取得、存在しない場合はデフォルト値を返す
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getIntEnv 環境変数を整数として取得
func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getBoolEnv 環境変数をbooleanとして取得
func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

// getDurationEnv 環境変数をDurationとして取得
func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// E2ETestResult E2Eテスト結果
type E2ETestResult struct {
	TestName     string        `json:"test_name"`
	Status       string        `json:"status"` // "PASS", "FAIL", "SKIP"
	Duration     time.Duration `json:"duration"`
	ErrorMessage string        `json:"error_message,omitempty"`
	RequestCount int           `json:"request_count"`
	ResponseTime time.Duration `json:"response_time"`
	MemoryUsage  int64         `json:"memory_usage"`
	CPUUsage     float64       `json:"cpu_usage"`
}

// E2ETestSuiteResult E2Eテストスイート結果
type E2ETestSuiteResult struct {
	SuiteName     string          `json:"suite_name"`
	StartTime     time.Time       `json:"start_time"`
	EndTime       time.Time       `json:"end_time"`
	TotalDuration time.Duration   `json:"total_duration"`
	TotalTests    int             `json:"total_tests"`
	PassedTests   int             `json:"passed_tests"`
	FailedTests   int             `json:"failed_tests"`
	SkippedTests  int             `json:"skipped_tests"`
	TestResults   []E2ETestResult `json:"test_results"`
	Configuration *E2ETestConfig  `json:"configuration"`
	SystemInfo    *SystemInfo     `json:"system_info"`
}

// SystemInfo システム情報
type SystemInfo struct {
	OS              string    `json:"os"`
	Architecture    string    `json:"architecture"`
	GoVersion       string    `json:"go_version"`
	Timestamp       time.Time `json:"timestamp"`
	DatabaseVersion string    `json:"database_version"`
	ServerVersion   string    `json:"server_version"`
}

// E2ETestMetrics E2Eテストメトリクス
type E2ETestMetrics struct {
	TotalRequests       int           `json:"total_requests"`
	SuccessfulRequests  int           `json:"successful_requests"`
	FailedRequests      int           `json:"failed_requests"`
	AverageResponseTime time.Duration `json:"average_response_time"`
	MinResponseTime     time.Duration `json:"min_response_time"`
	MaxResponseTime     time.Duration `json:"max_response_time"`
	ThroughputPerSecond float64       `json:"throughput_per_second"`
	ErrorRate           float64       `json:"error_rate"`
}

// GetMetrics メトリクスを計算
func (result *E2ETestSuiteResult) GetMetrics() *E2ETestMetrics {
	metrics := &E2ETestMetrics{}

	if len(result.TestResults) == 0 {
		return metrics
	}

	var totalResponseTime time.Duration
	var minResponseTime time.Duration = time.Hour // 初期値として大きな値
	var maxResponseTime time.Duration

	for _, testResult := range result.TestResults {
		metrics.TotalRequests += testResult.RequestCount

		if testResult.Status == "PASS" {
			metrics.SuccessfulRequests += testResult.RequestCount
		} else {
			metrics.FailedRequests += testResult.RequestCount
		}

		totalResponseTime += testResult.ResponseTime

		if testResult.ResponseTime < minResponseTime {
			minResponseTime = testResult.ResponseTime
		}

		if testResult.ResponseTime > maxResponseTime {
			maxResponseTime = testResult.ResponseTime
		}
	}

	if metrics.TotalRequests > 0 {
		metrics.AverageResponseTime = totalResponseTime / time.Duration(len(result.TestResults))
		metrics.ErrorRate = float64(metrics.FailedRequests) / float64(metrics.TotalRequests) * 100
	}

	if result.TotalDuration > 0 {
		metrics.ThroughputPerSecond = float64(metrics.TotalRequests) / result.TotalDuration.Seconds()
	}

	metrics.MinResponseTime = minResponseTime
	metrics.MaxResponseTime = maxResponseTime

	return metrics
}

// IsCI CI環境かどうかを判定
func IsCI() bool {
	ciFlags := []string{"CI", "CONTINUOUS_INTEGRATION", "GITHUB_ACTIONS", "GITLAB_CI", "JENKINS"}

	for _, flag := range ciFlags {
		if os.Getenv(flag) != "" {
			return true
		}
	}

	return false
}

// ShouldRunE2ETests E2Eテストを実行するかどうかを判定
func ShouldRunE2ETests() bool {
	// CI環境では明示的に指定された場合のみ実行
	if IsCI() {
		return getBoolEnv("RUN_E2E_TESTS", false)
	}

	// ローカル環境では基本的に実行（ただし環境変数で無効化可能）
	return getBoolEnv("SKIP_E2E_TESTS", false) == false
}

// PrintTestSummary テスト結果のサマリーを出力
func PrintTestSummary(result *E2ETestSuiteResult) {
	fmt.Printf("\n" + strings.Repeat("=", 80) + "\n")
	fmt.Printf("E2E Test Suite Summary: %s\n", result.SuiteName)
	fmt.Printf(strings.Repeat("=", 80) + "\n")
	fmt.Printf("Total Tests:    %d\n", result.TotalTests)
	fmt.Printf("Passed:         %d\n", result.PassedTests)
	fmt.Printf("Failed:         %d\n", result.FailedTests)
	fmt.Printf("Skipped:        %d\n", result.SkippedTests)
	fmt.Printf("Duration:       %v\n", result.TotalDuration)
	fmt.Printf("Success Rate:   %.2f%%\n", float64(result.PassedTests)/float64(result.TotalTests)*100)

	metrics := result.GetMetrics()
	fmt.Printf("\nPerformance Metrics:\n")
	fmt.Printf("Total Requests:     %d\n", metrics.TotalRequests)
	fmt.Printf("Avg Response Time:  %v\n", metrics.AverageResponseTime)
	fmt.Printf("Min Response Time:  %v\n", metrics.MinResponseTime)
	fmt.Printf("Max Response Time:  %v\n", metrics.MaxResponseTime)
	fmt.Printf("Throughput:         %.2f req/s\n", metrics.ThroughputPerSecond)
	fmt.Printf("Error Rate:         %.2f%%\n", metrics.ErrorRate)

	if result.FailedTests > 0 {
		fmt.Printf("\nFailed Tests:\n")
		for _, testResult := range result.TestResults {
			if testResult.Status == "FAIL" {
				fmt.Printf("- %s: %s\n", testResult.TestName, testResult.ErrorMessage)
			}
		}
	}

	fmt.Printf("\n" + strings.Repeat("=", 80) + "\n")
}
