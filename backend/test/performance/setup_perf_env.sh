#!/bin/bash

# パフォーマンステスト環境のセットアップスクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Monstera Performance Test Environment Setup ==="

# 1. Vegetaのインストール確認
check_vegeta() {
    if ! command -v vegeta >/dev/null 2>&1; then
        echo "Vegeta is not installed. Installing..."
        if command -v go >/dev/null 2>&1; then
            go install github.com/tsenart/vegeta@latest
        elif command -v brew >/dev/null 2>&1; then
            brew install vegeta
        else
            echo "Error: Neither Go nor Homebrew is available. Please install Vegeta manually."
            echo "Visit: https://github.com/tsenart/vegeta"
            exit 1
        fi
    else
        echo "✓ Vegeta is installed: $(vegeta -version)"
    fi
}

# 2. 必要なツールの確認
check_dependencies() {
    echo "Checking dependencies..."
    
    local deps=("docker" "docker-compose" "jq" "bc")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            missing+=("$dep")
        else
            echo "✓ $dep is installed"
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo "Error: Missing dependencies: ${missing[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
}

# 3. パフォーマンステスト用のDocker環境起動
start_perf_environment() {
    echo ""
    echo "Starting performance test environment..."
    
    cd "$SCRIPT_DIR"
    
    # 既存のコンテナを停止
    docker-compose -f docker-compose.perf.yml down
    
    # パフォーマンステスト環境を起動
    docker-compose -f docker-compose.perf.yml up -d
    
    echo "Waiting for services to be ready..."
    
    # MySQLの準備待ち
    echo -n "Waiting for MySQL..."
    for i in {1..30}; do
        if docker exec monstera-mysql-perf mysqladmin ping -h localhost --silent; then
            echo " Ready!"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # バックエンドの準備待ち
    echo -n "Waiting for Backend API..."
    for i in {1..30}; do
        if curl -s http://localhost:8081/api/v1/health >/dev/null 2>&1; then
            echo " Ready!"
            break
        fi
        echo -n "."
        sleep 2
    done
}

# 4. データベースマイグレーション実行
run_migrations() {
    echo ""
    echo "Running database migrations..."
    
    # マイグレーションの実行
    docker exec monstera-backend-perf migrate \
        -path /app/migrations \
        -database "mysql://monstera:password@tcp(mysql-perf:3306)/monstera_perf" \
        up
    
    if [ $? -eq 0 ]; then
        echo "✓ Migrations completed successfully"
    else
        echo "✗ Migration failed"
        exit 1
    fi
}

# 5. モニタリングディレクトリの作成
setup_monitoring() {
    echo ""
    echo "Setting up monitoring configuration..."
    
    mkdir -p "$SCRIPT_DIR/monitoring/prometheus"
    mkdir -p "$SCRIPT_DIR/monitoring/grafana/dashboards"
    mkdir -p "$SCRIPT_DIR/monitoring/grafana/datasources"
    
    # Prometheus設定
    cat > "$SCRIPT_DIR/monitoring/prometheus.yml" <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend-perf:8080']
    metrics_path: '/metrics'
  
  - job_name: 'mysql'
    static_configs:
      - targets: ['mysql-perf:3306']
EOF
    
    # Grafanaデータソース設定
    cat > "$SCRIPT_DIR/monitoring/grafana/datasources/prometheus.yml" <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    echo "✓ Monitoring configuration created"
}

# 6. テストデータ生成
generate_test_data() {
    echo ""
    echo "Generating test data..."
    
    # Go環境の確認
    if ! command -v go >/dev/null 2>&1; then
        echo "Go is not installed. Skipping test data generation."
        echo "Please run 'go run test_data_generator.go' manually after installing Go."
        return
    fi
    
    # 環境変数の設定
    export DB_HOST=localhost
    export DB_PORT=3307
    export DB_NAME=monstera_perf
    export DB_USER=monstera
    export DB_PASSWORD=password
    
    # テストデータ生成の実行
    cd "$SCRIPT_DIR"
    go run test_data_generator.go
    
    if [ $? -eq 0 ]; then
        echo "✓ Test data generated successfully"
    else
        echo "✗ Test data generation failed"
    fi
}

# 7. 環境情報の表示
show_environment_info() {
    echo ""
    echo "=== Performance Test Environment Info ==="
    echo "Backend API: http://localhost:8081"
    echo "MySQL: localhost:3307"
    echo "Redis: localhost:6380"
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3001 (admin/admin)"
    echo ""
    echo "To run performance tests:"
    echo "  make test"
    echo ""
    echo "To run advanced tests:"
    echo "  ./scripts/advanced_test.sh"
}

# メイン処理
main() {
    check_dependencies
    check_vegeta
    setup_monitoring
    start_perf_environment
    run_migrations
    generate_test_data
    show_environment_info
    
    echo ""
    echo "✓ Performance test environment is ready!"
}

# エラーハンドリング
set -e
trap 'echo "Error occurred at line $LINENO"' ERR

# 実行
main