# Monstera Performance Test Makefile

.PHONY: all setup generate-data test clean report help

# デフォルトターゲット
all: setup generate-data test report

# ツールのセットアップ
setup:
	@echo "Setting up performance test environment..."
	@if ! command -v vegeta >/dev/null 2>&1; then \
		echo "Installing Vegeta..."; \
		go install github.com/tsenart/vegeta@latest; \
	fi
	@mkdir -p targets results reports
	@echo "Setup completed!"

# テストデータの生成
generate-data:
	@echo "Generating test data for 500 users..."
	@go run test_data_generator.go
	@echo "Test data generation completed!"

# 負荷テストの実行
test: test-unsubmitted test-weekly-reports test-monthly-summary test-reminders

# 未提出者管理APIテスト
test-unsubmitted:
	@echo "Testing unsubmitted reports API..."
	@./scripts/run_test.sh unsubmitted-reports

# 週次レポート一覧取得テスト
test-weekly-reports:
	@echo "Testing weekly reports API..."
	@./scripts/run_test.sh weekly-reports

# 月次サマリー集計テスト
test-monthly-summary:
	@echo "Testing monthly summary API..."
	@./scripts/run_test.sh monthly-summary

# リマインダー一括送信テスト
test-reminders:
	@echo "Testing reminder API..."
	@./scripts/run_test.sh reminders

# レポート生成
report:
	@echo "Generating performance test report..."
	@./scripts/generate_report.sh
	@echo "Report generated in reports/ directory"

# テスト結果のクリーンアップ
clean:
	@echo "Cleaning up test results..."
	@rm -rf results/*.bin
	@rm -rf reports/*.html
	@echo "Cleanup completed!"

# ヘルプ
help:
	@echo "Monstera Performance Test Commands:"
	@echo "  make setup          - Setup test environment"
	@echo "  make generate-data  - Generate test data for 500 users"
	@echo "  make test          - Run all performance tests"
	@echo "  make test-unsubmitted - Test unsubmitted reports API"
	@echo "  make test-weekly-reports - Test weekly reports API"
	@echo "  make test-monthly-summary - Test monthly summary API"
	@echo "  make test-reminders - Test reminder API"
	@echo "  make report        - Generate performance report"
	@echo "  make clean         - Clean up test results"
	@echo "  make all           - Run complete test cycle"