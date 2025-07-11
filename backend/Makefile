# Makefile for Monstera Backend

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=monstera-backend
BINARY_UNIX=$(BINARY_NAME)_unix

# Test parameters
TEST_TIMEOUT=30s
TEST_COVERAGE_FILE=coverage.out

.PHONY: all build clean test test-coverage test-notification run deps help

# Default target
all: test build

# Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/server

# Build batch jobs
build-batch:
	@echo "Building batch jobs..."
	$(GOBUILD) -o leave_conversion_batch -v ./cmd/batch/leave_conversion

# Build all
build-all: build build-batch

# Clean build files
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)
	rm -f $(TEST_COVERAGE_FILE)
	rm -f leave_conversion_batch

# Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -coverprofile=$(TEST_COVERAGE_FILE) ./...
	@echo "Coverage report generated: $(TEST_COVERAGE_FILE)"
	$(GOCMD) tool cover -html=$(TEST_COVERAGE_FILE) -o coverage.html
	@echo "HTML coverage report: coverage.html"

# Run notification-specific tests
test-notification:
	@echo "Running notification-related tests..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./test/handler/notification_handler_test.go ./test/service/notification_service_test.go
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./internal/service/notification_service.go
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./internal/handler/notification_handler.go

# Run notification tests with coverage
test-notification-coverage:
	@echo "Running notification tests with coverage..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -coverprofile=notification_coverage.out -v \
		./test/handler/notification_handler_test.go \
		./test/service/notification_service_test.go
	$(GOCMD) tool cover -html=notification_coverage.out -o notification_coverage.html
	@echo "Notification coverage report: notification_coverage.html"

# Run tests for specific packages
test-handler:
	@echo "Running handler tests..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./test/handler/...

test-service:
	@echo "Running service tests..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./test/service/...

test-repository:
	@echo "Running repository tests..."
	$(GOTEST) -timeout $(TEST_TIMEOUT) -v ./test/repository/...

# Run the application
run: build
	@echo "Starting $(BINARY_NAME)..."
	./$(BINARY_NAME)

# Install dependencies
deps:
	@echo "Installing dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy

# Update dependencies
deps-update:
	@echo "Updating dependencies..."
	$(GOMOD) get -u ./...
	$(GOMOD) tidy

# Verify dependencies
deps-verify:
	@echo "Verifying dependencies..."
	$(GOMOD) verify

# Format code
fmt:
	@echo "Formatting code..."
	$(GOCMD) fmt ./...

# Lint code (requires golangci-lint)
lint:
	@echo "Running linter..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not installed. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi

# Generate code (if using go generate)
generate:
	@echo "Generating code..."
	$(GOCMD) generate ./...

# Validate API contract between frontend and backend
validate-api:
	@echo "Validating API contract..."
	@if command -v node >/dev/null 2>&1; then \
		node tools/api-validation/validate_api_contract.js; \
	else \
		echo "Node.js not installed. Cannot run API validation."; \
	fi

# API Tests
test-api-basic:
	@echo "Running basic API tests..."
	./tools/api-tests/basic/api-basic-test.sh

test-api-proposal:
	@echo "Running proposal API tests..."
	./tools/api-tests/features/test_proposal_api.sh

test-api-notification:
	@echo "Running notification integration tests..."
	./tools/api-tests/features/test_notification_integration.sh

test-api-all: test-api-basic test-api-proposal test-api-notification
	@echo "All API tests completed."

# Build for Linux
build-linux:
	@echo "Building for Linux..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v ./cmd/server

# Database migrations (requires migrate tool)
migrate-up:
	@echo "Running database migrations up..."
	@if command -v migrate >/dev/null 2>&1; then \
		migrate -path migrations -database "mysql://root:password@tcp(localhost:3306)/monstera" up; \
	else \
		echo "migrate tool not installed. Install with: go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

migrate-down:
	@echo "Running database migrations down..."
	@if command -v migrate >/dev/null 2>&1; then \
		migrate -path migrations -database "mysql://root:password@tcp(localhost:3306)/monstera" down; \
	else \
		echo "migrate tool not installed. Install with: go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

# PostgreSQL migrations
migrate-pg-up:
	@echo "Running PostgreSQL migrations up..."
	@if command -v migrate >/dev/null 2>&1; then \
		migrate -path migrations/postgresql-versions -database "postgres://postgres:postgres@localhost:5432/monstera?sslmode=disable" up; \
	else \
		echo "migrate tool not installed. Install with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

migrate-pg-down:
	@echo "Running PostgreSQL migrations down..."
	@if command -v migrate >/dev/null 2>&1; then \
		migrate -path migrations/postgresql-versions -database "postgres://postgres:postgres@localhost:5432/monstera?sslmode=disable" down; \
	else \
		echo "migrate tool not installed. Install with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

migrate-pg-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations/postgresql-versions -seq $$name -format "{{.Version}}_{{.Name}}.{{.Direction}}.postgresql.sql"

# Docker commands
docker-build:
	@echo "Building Docker image..."
	docker build -t monstera-backend .

docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 monstera-backend

docker-compose-up:
	@echo "Starting Docker Compose..."
	docker-compose up -d

docker-compose-down:
	@echo "Stopping Docker Compose..."
	docker-compose down

# Development helpers
dev: deps fmt test run

dev-watch:
	@echo "Starting development with file watching..."
	@if command -v air >/dev/null 2>&1; then \
		air; \
	else \
		echo "air not installed. Install with: go install github.com/cosmtrek/air@latest"; \
		echo "Falling back to normal run..."; \
		make run; \
	fi

# Help
help:
	@echo "Available targets:"
	@echo "  build               Build the application"
	@echo "  clean               Clean build files"
	@echo "  test                Run all tests"
	@echo "  test-coverage       Run tests with coverage report"
	@echo "  test-notification   Run notification-specific tests"
	@echo "  test-handler        Run handler tests"
	@echo "  test-service        Run service tests"
	@echo "  test-repository     Run repository tests"
	@echo "  run                 Build and run the application"
	@echo "  deps                Install dependencies"
	@echo "  deps-update         Update dependencies"
	@echo "  fmt                 Format code"
	@echo "  lint                Run linter"
	@echo "  generate            Generate code"
	@echo "  build-linux         Build for Linux"
	@echo "  migrate-up          Run database migrations up (MySQL)"
	@echo "  migrate-down        Run database migrations down (MySQL)"
	@echo "  migrate-create      Create new migration"
	@echo "  migrate-pg-up       Run PostgreSQL migrations up"
	@echo "  migrate-pg-down     Run PostgreSQL migrations down"
	@echo "  migrate-pg-create   Create new PostgreSQL migration"
	@echo "  docker-build        Build Docker image"
	@echo "  docker-run          Run Docker container"
	@echo "  docker-compose-up   Start with Docker Compose"
	@echo "  docker-compose-down Stop Docker Compose"
	@echo "  dev                 Development mode (deps + fmt + test + run)"
	@echo "  dev-watch           Development with file watching"
	@echo "  validate-api        Validate API contract between frontend and backend"
	@echo "  test-api-basic      Run basic API tests (health, auth, profile)"
	@echo "  test-api-proposal   Run proposal API tests"
	@echo "  test-api-notification Run notification integration tests"
	@echo "  test-api-all        Run all API tests"
	@echo "  help                Show this help message"