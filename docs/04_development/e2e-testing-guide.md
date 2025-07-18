# E2Eテスト実行ガイド

## 概要

MonsteraプロジェクトのE2Eテストは、Docker環境で完全に隔離された環境で実行されます。これにより、一貫性のあるテスト結果と本番環境に近い条件でのテストが可能になります。

## アーキテクチャ

### テスト環境構成
```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│   (3001)    │     │   (8081)     │     │   (5433)     │
└─────────────┘     └──────────────┘     └──────────────┘
                            │                     
                            ├─────────────────────┐
                            ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │    Redis     │     │   Cognito    │
                    │   (6380)     │     │   (9230)     │
                    └──────────────┘     └──────────────┘
```

### ポート割り当て
- Frontend: 3001（開発: 3000）
- Backend API: 8081（開発: 8080）
- PostgreSQL: 5433（開発: 5432）
- Redis: 6380（開発: 6379）
- Cognito Local: 9230（開発: 9230）

## クイックスタート

### 1. Makeコマンドを使用した実行（推奨）
```bash
# E2E環境を起動してテストを実行
make test-e2e-setup

# テスト実行後のクリーンアップ
make test-e2e-cleanup
```

### 2. スクリプトを使用した実行
```bash
# E2Eテストを実行（環境構築→テスト実行→環境破棄）
./scripts/e2e-testing/run-e2e-docker.sh

# 環境を残したままテスト実行
./scripts/e2e-testing/run-e2e-docker.sh test true
```

### 3. 手動での実行方法
```bash
# E2E環境の起動
docker-compose -f docker-compose.e2e.yml up -d

# テストの実行
cd frontend
npm run test:e2e

# E2E環境の停止
docker-compose -f docker-compose.e2e.yml down
```

## 詳細な使用方法

### Makeコマンド

| コマンド | 説明 |
|---------|------|
| `make test-e2e-setup` | E2E環境を起動してテストを実行 |
| `make test-e2e` | E2Eテストのみ実行（環境は起動済み前提） |
| `make test-e2e-ui` | PlaywrightのUIモードでテストを実行 |
| `make test-e2e-debug` | デバッグモードでテストを実行 |
| `make test-e2e-cleanup` | E2E環境を停止・削除 |
| `make test-e2e-logs` | E2E環境のログを表示 |

### スクリプトコマンド

```bash
# テスト実行（デフォルト）
./scripts/e2e-testing/run-e2e-docker.sh test

# 環境の起動のみ
./scripts/e2e-testing/run-e2e-docker.sh up

# 環境の停止
./scripts/e2e-testing/run-e2e-docker.sh down

# ログの表示
./scripts/e2e-testing/run-e2e-docker.sh logs

# 完全なクリーンアップ
./scripts/e2e-testing/run-e2e-docker.sh clean

# テストランナーのシェルに入る
./scripts/e2e-testing/run-e2e-docker.sh shell
```

### 環境変数設定

E2Eテストでは統合された`.env.e2e`ファイルを使用します：

```env
# データベース（PostgreSQL）
DB_HOST=postgres-e2e
DB_PORT=5432
DB_NAME=monstera_e2e
DB_DRIVER=postgres

# Redis
REDIS_HOST=redis-e2e
REDIS_DB=1

# API URLs
BACKEND_PORT=8081
FRONTEND_PORT=3001
```

## テストデータ

### テストユーザー
```
エンジニア: engineer_test@duesk.co.jp / Test1234!
営業: sales_test@duesk.co.jp / Test1234!
マネージャー: manager_test@duesk.co.jp / Test1234!
```

### データプレフィックス
E2Eテストデータは`e2e`プレフィックスで識別されます：
- ユーザーID: `e2e00001-*`
- クライアントID: `e2e00002-*`
- プロジェクトID: `e2e00004-*`

## CI/CD環境での実行

### GitHub Actions
```yaml
- name: Run E2E tests
  run: |
    ./scripts/e2e-testing/run-e2e-docker.sh test
  env:
    CI: true
```

### Jenkins
```groovy
stage('E2E Tests') {
    steps {
        sh './scripts/e2e-testing/run-e2e-docker.sh test'
    }
}
```

## トラブルシューティング

### 1. ポート競合
```bash
# 使用中のポートを確認
lsof -i :3001,8081,5433,6380,9230

# 別のポートを使用する場合は.env.e2eを編集
```

### 2. ヘルスチェック失敗
```bash
# 各サービスの状態を確認
docker-compose -f docker-compose.e2e.yml ps

# ログを確認
docker-compose -f docker-compose.e2e.yml logs [service-name]
```

### 3. テストデータの問題
```bash
# データベースに直接接続
docker-compose -f docker-compose.e2e.yml exec postgres-e2e psql -U postgres -d monstera_e2e

# Redisに接続
docker-compose -f docker-compose.e2e.yml exec redis-e2e redis-cli
```

### 4. 完全リセット
```bash
# すべてを削除して最初から
./scripts/e2e-testing/run-e2e-docker.sh clean
./scripts/e2e-testing/run-e2e-docker.sh test
```

## ベストプラクティス

### 1. テスト隔離
- 各テストは独立して実行可能にする
- テスト間でデータを共有しない
- afterEachでクリーンアップを行う

### 2. 待機戦略
```javascript
// 要素の出現を待つ
await page.waitForSelector('.element', { timeout: 5000 });

// APIレスポンスを待つ
await page.waitForResponse(response => 
  response.url().includes('/api/v1/users')
);
```

### 3. データ管理
- テストデータは`e2e`プレフィックスを使用
- テスト終了後は自動クリーンアップ
- 本番データとの混在を防ぐ

### 4. デバッグ
```javascript
// スクリーンショットを撮る
await page.screenshot({ path: 'debug.png' });

// ブラウザを表示してデバッグ
// PLAYWRIGHT_HEADLESS=false を設定
```

## パフォーマンス最適化

### 1. 並列実行
```javascript
// playwright.config.js
module.exports = {
  workers: process.env.CI ? 2 : 4,
};
```

### 2. リトライ戦略
```javascript
// 不安定なテストのリトライ
retries: process.env.CI ? 2 : 0,
```

### 3. タイムアウト調整
```javascript
// グローバルタイムアウト
timeout: 30000,
// アクションタイムアウト
actionTimeout: 10000,
```

## 開発のヒント

### ローカルでのデバッグ
```bash
# ヘッドレスモードを無効化
PLAYWRIGHT_HEADLESS=false npm run test:e2e

# 特定のテストのみ実行
npm run test:e2e -- --grep "login"

# デバッグモード
npm run test:e2e -- --debug
```

### VSCode設定
```json
{
  "playwright.reuseBrowser": true,
  "playwright.showTrace": true
}
```

## 関連ドキュメント

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Docker Compose リファレンス](https://docs.docker.com/compose/)
- [E2Eテストベストプラクティス](https://testautomationu.applitools.com/)
- [E2Eテスト詳細](../../frontend/e2e/README.md)

---

最終更新: 2025-01-10