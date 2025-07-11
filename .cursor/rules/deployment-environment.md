# デプロイメント・環境管理

Monsteraプロジェクトのデプロイメントと環境管理に関するガイドライン。

## 環境構成

### 環境別設定ファイル
```bash
.env.development    # ローカル開発
.env.staging       # ステージング  
.env.production    # 本番

# 環境変数の優先順位
1. システム環境変数
2. .envファイル
3. デフォルト値（config/default.go）
```

### 環境別設定
```go
// 環境変数で設定: ポート、DB接続、JWT、Redis、メール送信
// 開発環境では認証スキップモードあり
// .env.development/.env.staging/.env.productionで管理
```

## CI/CDパイプライン

### GitHub Actions
```yaml
# GitHub Actionsでテスト、ビルド、デプロイを自動化
# テストカバレッジ80%以上を必須
# ECSへのデプロイ
```

### パイプラインステージ
1. **Test Stage**
   - ユニットテスト実行
   - カバレッジチェック
   - リンター実行

2. **Build Stage**
   - Dockerイメージビルド
   - ECRへのプッシュ

3. **Deploy Stage**
   - ECSタスク定義更新
   - サービス更新
   - ヘルスチェック

## デプロイメント戦略

### Blue-Greenデプロイメント
1. Green環境に新バージョンをデプロイ
2. ヘルスチェック実施
3. 一部トラフィックをGreenに切り替え
4. 問題なければ全トラフィック切り替え
5. Blue環境を次回用に保持

### ロールバック手順
```bash
# ECSサービスのタスク定義を前バージョンに戻す
aws ecs update-service \
  --cluster monstera-cluster \
  --service monstera-backend \
  --task-definition monstera-backend:前のバージョン番号

# マイグレーションのロールバックが必要な場合
docker-compose exec backend migrate \
  -path migrations \
  -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" \
  down 1
```

## 環境変数管理

### 必須環境変数
```bash
# データベース
DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=disable"

# JWT認証
JWT_SECRET="your-secret-key"
JWT_EXPIRY_HOURS=24

# AWS Cognito
COGNITO_REGION="ap-northeast-1"
COGNITO_USER_POOL_ID="ap-northeast-1_xxxxx"
COGNITO_CLIENT_ID="xxxxx"

# Redis（Phase 2以降）
REDIS_URL="redis://localhost:6379"

# 環境識別
GO_ENV="development"    # development/staging/production
NODE_ENV="development"  # development/production
```

### シークレット管理
- AWS Systems Manager Parameter Store使用
- 環境ごとにパラメータを分離
- アプリケーション起動時に取得

```go
// パラメータストアからの取得例
func GetSecretFromParameterStore(name string) (string, error) {
    sess := session.Must(session.NewSession())
    svc := ssm.New(sess)
    
    param := fmt.Sprintf("/monstera/%s/%s", os.Getenv("GO_ENV"), name)
    result, err := svc.GetParameter(&ssm.GetParameterInput{
        Name:           aws.String(param),
        WithDecryption: aws.Bool(true),
    })
    
    if err != nil {
        return "", err
    }
    
    return *result.Parameter.Value, nil
}
```

## インフラストラクチャ

### AWS構成
```
VPC
├── Public Subnet
│   ├── ALB
│   └── NAT Gateway
└── Private Subnet
    ├── ECS Cluster
    │   ├── Backend Service
    │   └── Frontend Service
    ├── RDS (PostgreSQL)
    └── ElastiCache (Redis)
```

### セキュリティグループ
- ALB: 80, 443 (インターネットから)
- ECS: 8080, 3000 (ALBから)
- RDS: 5432 (ECSから)
- Redis: 6379 (ECSから)

## モニタリング

### CloudWatch設定
```yaml
# アラーム設定
- ECSサービスのタスク数
- ALBのターゲットヘルス
- RDSのCPU/メモリ使用率
- アプリケーションログのエラー率

# ログ保持期間
- アプリケーションログ: 30日
- アクセスログ: 90日
- 監査ログ: 1年
```

### メトリクス収集
```go
// Prometheusメトリクス例
httpRequestDuration := prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name: "http_request_duration_seconds",
        Help: "Duration of HTTP requests in seconds",
    },
    []string{"method", "endpoint", "status"},
)
```

## デプロイメントチェックリスト

### 本番デプロイ前
- [ ] すべてのテストがパスしている
- [ ] コードレビュー完了
- [ ] データベースマイグレーション準備完了
- [ ] 環境変数の確認
- [ ] ロールバック手順の確認
- [ ] 関係者への通知

### デプロイ後
- [ ] ヘルスチェック確認
- [ ] ログにエラーがないか確認
- [ ] 主要機能の動作確認
- [ ] パフォーマンスメトリクス確認
- [ ] アラートの確認

---

*このドキュメントはデプロイメント手順の変更時に更新してください。*