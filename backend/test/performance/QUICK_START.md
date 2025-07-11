# パフォーマンステスト クイックスタート

## 前提条件
- Docker & Docker Compose
- Go 1.22+
- Vegeta (自動インストール可能)

## 1. 環境セットアップ

```bash
# パフォーマンステスト環境のセットアップ
./setup_perf_env.sh
```

この一つのコマンドで以下が実行されます：
- Vegeta の自動インストール
- Docker 環境の起動
- データベースマイグレーション
- 500名分のテストデータ生成

## 2. 基本的な負荷テスト実行

```bash
# 全テスト実行
make test

# 個別テスト実行
make test-unsubmitted     # 未提出者管理API
make test-weekly-reports  # 週次レポート一覧
make test-monthly-summary # 月次サマリー
make test-reminders       # リマインダー機能
```

## 3. 高度なテスト実行

```bash
# スパイクテスト（負荷急増）
./scripts/advanced_test.sh spike

# ストレステスト（限界探索）
./scripts/advanced_test.sh stress

# ソークテスト（長時間安定性）
./scripts/advanced_test.sh soak

# 同時実行テスト
./scripts/advanced_test.sh concurrent
```

## 4. 結果確認

```bash
# レポート生成
make report

# 結果ファイルの場所
ls -la reports/        # HTMLレポート
ls -la results/        # 生データ
```

## パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| レスポンスタイム (P95) | < 2秒 |
| スループット | > 100 req/s |
| エラー率 | < 0.1% |

## トラブルシューティング

### 認証エラー
```bash
# 管理者ユーザーでログインしてトークン取得
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser001@duesk.co.jp","password":"password123"}'
```

### MySQL接続エラー
```bash
# コンテナ状態確認
docker-compose -f docker-compose.perf.yml ps

# ログ確認
docker-compose -f docker-compose.perf.yml logs mysql-perf
```

### メモリ不足
```bash
# Docker リソース確認
docker stats

# 不要なコンテナ削除
docker system prune
```

## CI/CD統合

### GitHub Actions
```yaml
# .github/workflows/performance.yml
- name: Run Performance Tests
  run: |
    cd backend/test/performance
    ./scripts/ci_performance_test.sh
```

### GitLab CI
```yaml
# .gitlab-ci.yml
performance:
  stage: test
  script:
    - cd backend/test/performance
    - ./scripts/ci_performance_test.sh
  artifacts:
    reports:
      junit: backend/test/performance/reports/performance_junit.xml
```

## 環境情報

起動後のアクセス先：
- **Backend API**: http://localhost:8081
- **MySQL**: localhost:3307
- **Redis**: localhost:6380
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## ファイル構成

```
performance/
├── README.md                    # 詳細仕様
├── QUICK_START.md              # このファイル
├── PERFORMANCE_TUNING_GUIDE.md # チューニングガイド
├── Makefile                    # 基本コマンド
├── test_data_generator.go      # テストデータ生成
├── docker-compose.perf.yml     # パフォーマンステスト環境
├── setup_perf_env.sh           # 環境セットアップ
├── scripts/                    # テスト実行スクリプト
│   ├── run_test.sh
│   ├── advanced_test.sh
│   ├── generate_report.sh
│   └── ci_performance_test.sh
├── targets/                    # Vegeta ターゲット定義
├── results/                    # テスト結果（.bin）
└── reports/                    # レポート（HTML/JSON）
```