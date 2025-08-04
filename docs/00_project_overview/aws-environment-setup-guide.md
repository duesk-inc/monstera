# MonsteraプロジェクトAWS環境準備手順書

**作成日**: 2025-08-01  
**対象**: MonsteraプロジェクトのAWS環境構築  
**前提条件**: 既存のCognito実装（Phase 2完了済み）を活用  

## 📋 目次

1. [AWS環境の選択肢](#aws環境の選択肢)
2. [必要なAWSリソースと料金見積もり](#必要なawsリソースと料金見積もり)
3. [セキュリティ考慮事項](#セキュリティ考慮事項)
4. [環境構築手順](#環境構築手順)
5. [開発チーム向け考慮事項](#開発チーム向け考慮事項)
6. [運用・保守](#運用保守)

## AWS環境の選択肢

### 1. 個人AWSアカウント（推奨：スタートアップ・小規模チーム）

**適用ケース**: 初期開発（10-50名）、迅速なスタート、予算制約あり

**メリット**:
- セットアップが最も簡単
- 無料枠を最大限活用可能
- 管理オーバーヘッドが最小
- 開発者1-3名での開発に最適

**デメリット**:
- 本番環境での信頼性に課題
- 組織的な権限管理が困難
- 請求が個人名義になる

**構成**:
```
個人AWSアカウント
├── 開発環境（us-east-1 無料枠活用）
├── ステージング環境（ap-northeast-1）
└── 本番環境（ap-northeast-1）
```

**月額コスト見積もり**:
- 開発環境: 無料枠内（$0-20/月）
- ステージング: $50-150/月
- 本番: $300-800/月（初期50名想定）

### 2. 組織のAWSアカウント（推奨：中規模展開）

**適用ケース**: 中期展開（50-200名）、組織的管理が必要、予算承認済み

**メリット**:
- 組織的な管理とガバナンス
- 請求の一元化
- IAMポリシーの統一管理
- セキュリティベースラインの適用

**デメリット**:
- 既存システムとの調整が必要
- セットアップに時間を要する
- 組織ポリシーの制約を受ける

**構成**:
```
組織AWSアカウント
├── VPC分離による環境管理
│   ├── monstera-dev-vpc
│   ├── monstera-staging-vpc
│   └── monstera-prod-vpc
└── 統一IAMポリシー適用
```

**月額コスト見積もり**:
- 全環境合計: $800-2,000/月（中期200名想定）

### 3. AWS Organizations（推奨：大規模展開）

**適用ケース**: 長期展開（200名以上）、複数プロジェクト、エンタープライズ要件

**メリット**:
- アカウント単位での完全分離
- 組織単位（OU）による柔軟な管理
- 一括請求と詳細な原価管理
- セキュリティ統制の強化

**デメリット**:
- 最も複雑なセットアップ
- 管理リソースが必要
- 初期投資が大きい

**構成**:
```
AWS Organizations
├── Monstera OU
│   ├── monstera-dev-account
│   ├── monstera-staging-account
│   └── monstera-prod-account
├── Security OU
│   └── security-account
└── Shared Services OU
    └── logging-account
```

**月額コスト見積もり**:
- 全環境合計: $2,000-5,000/月（長期500名想定）

## 必要なAWSリソースと料金見積もり

### Cognitoの詳細料金見積もり

**Cognito User Pool**:
- 月間アクティブユーザー（MAU）課金
- 無料枠: 50,000 MAU
- 超過分: $0.0055/MAU

**利用者規模別コスト**:
```
初期（50名）: $0/月（無料枠内）
中期（200名）: $0/月（無料枠内）
長期（500名）: $0/月（無料枠内）
大規模（50,000名超）: $0.0055 × 超過分

# 実質的に無料で運用可能（Monsteraの規模では）
```

**Cognito Advanced Security**（オプション）:
- $0.05/MAU（高度なセキュリティ機能）
- 推奨: 本番環境のみ有効化

### その他の必要リソース

**必須リソース**:
```
1. IAMユーザー/ロール: 無料
2. Cognito User Pool: 50,000MAU以下無料
3. Systems Manager Parameter Store: 標準パラメータ無料
4. CloudWatch Logs: 5GB無料、以後$0.50/GB

月額基本コスト: $0-30/月
```

**推奨リソース**:
```
1. ECS Fargate: $0.04048/vCPU時間、$0.004445/GB時間
   - 開発: $50-100/月
   - 本番: $200-500/月

2. RDS PostgreSQL: 
   - db.t3.micro（開発）: $15/月
   - db.t3.medium（本番）: $60/月

3. Application Load Balancer: $22.50/月

4. ElastiCache Redis（Phase 2以降）:
   - cache.t3.micro: $15/月

月額推定コスト合計:
- 開発環境: $100-200/月
- 本番環境: $350-800/月
```

## セキュリティ考慮事項

### 1. IAM設計原則

**最小権限の原則**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminAddUserToGroup"
      ],
      "Resource": "arn:aws:cognito-idp:ap-northeast-1:ACCOUNT:userpool/ap-northeast-1_*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-northeast-1"
        }
      }
    }
  ]
}
```

**開発者向けIAMロール**:
```json
{
  "RoleName": "MonsteraDevRole",
  "Policies": [
    "AmazonCognitoPowerUser",
    "CloudWatchLogsReadOnlyAccess",
    "AmazonECS_ReadOnlyAccess"
  ],
  "ManagedPolicies": [
    "ReadOnlyAccess"
  ]
}
```

### 2. ネットワークセキュリティ

**VPC設計**:
```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24)
│   └── Application Load Balancer only
├── Private Subnet App (10.0.2.0/24)
│   └── ECS Tasks
└── Private Subnet DB (10.0.3.0/24)
    └── RDS, ElastiCache
```

**セキュリティグループ**:
```bash
# ALB Security Group
aws ec2 create-security-group \
  --group-name monstera-alb-sg \
  --description "ALB Security Group" \
  --vpc-id vpc-xxxxxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# ECS Security Group
aws ec2 create-security-group \
  --group-name monstera-ecs-sg \
  --description "ECS Tasks Security Group" \
  --vpc-id vpc-xxxxxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-yyyyyy \
  --protocol tcp \
  --port 8080 \
  --source-group sg-xxxxxx
```

### 3. データ保護

**暗号化設定**:
- RDS: 保存時暗号化有効
- S3: デフォルト暗号化有効
- Systems Manager: SecureString使用
- CloudWatch Logs: KMS暗号化

**パスワードポリシー**:
```typescript
// Cognito User Pool設定（既存実装を活用）
const passwordPolicy = {
  minimumLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  temporaryPasswordValidityDays: 7
};
```

## 環境構築手順

### Phase 1: AWS基盤セットアップ（1-2日）

#### 1.1 AWSアカウントの準備

**個人アカウントの場合**:
```bash
# 1. AWSアカウント作成（以下のURLから）
# https://aws.amazon.com/jp/free/

# 2. 請求アラートの設定
# AWS Console → Billing → Budgets
# - 月額$100のアラート設定（開発環境用）
# - 月額$500のアラート設定（本番環境用）

# 3. MFA有効化
# IAM → Users → Security credentials → Assigned MFA device
```

**組織アカウントの場合**:
```bash
# 1. 組織のAWSアカウント管理者と調整
# 2. MonsteraプロジェクトのIAMロール申請
# 3. 必要な権限の申請:
#    - CognitoFullAccess
#    - ECSFullAccess
#    - RDSFullAccess
#    - VPCFullAccess
```

#### 1.2 AWS CLI設定

```bash
# AWS CLI インストール
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 認証情報設定
aws configure
# AWS Access Key ID: [アクセスキー]
# AWS Secret Access Key: [シークレットキー]
# Default region name: ap-northeast-1
# Default output format: json

# 設定確認
aws sts get-caller-identity
```

#### 1.3 CDKセットアップ

```bash
# CDK CLI インストール
npm install -g aws-cdk

# CDK バージョン確認
cdk --version

# CDK ブートストラップ（初回のみ）
cdk bootstrap aws://ACCOUNT-NUMBER/ap-northeast-1
```

### Phase 2: Cognito環境構築（既存実装活用）（1日）

Monsteraプロジェクトでは既にPhase 2のCognito実装が完了しているため、既存のコードを活用します。

#### 2.1 既存インフラコードの実行

```bash
# プロジェクトルートから
cd infrastructure/cognito

# 依存関係インストール
npm install

# 開発環境用Cognitoプールのデプロイ
./scripts/setup-dev-cognito.sh

# デプロイ状況確認
cdk list
cdk diff
```

#### 2.2 環境変数の設定

```bash
# デプロイ完了後、生成された設定をコピー
cp infrastructure/cognito/.env.development .env

# 以下の変数が自動設定されます：
# COGNITO_ENABLED=true
# COGNITO_REGION=ap-northeast-1
# COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
# COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
# COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2.3 テストユーザー作成

```bash
# 管理者ユーザー作成（既存のテスト仕様に従う）
aws cognito-idp admin-create-user \
  --user-pool-id $(grep COGNITO_USER_POOL_ID .env | cut -d'=' -f2) \
  --username admin@duesk.co.jp \
  --user-attributes \
    Name=email,Value=admin@duesk.co.jp \
    Name=given_name,Value=Admin \
    Name=family_name,Value=User \
    Name=custom:role,Value=2 \
    Name=custom:department_id,Value=dept-001 \
    Name=custom:employee_id,Value=emp-001 \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# パスワード設定
aws cognito-idp admin-set-user-password \
  --user-pool-id $(grep COGNITO_USER_POOL_ID .env | cut -d'=' -f2) \
  --username admin@duesk.co.jp \
  --password admin123 \
  --permanent

# 管理者グループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $(grep COGNITO_USER_POOL_ID .env | cut -d'=' -f2) \
  --username admin@duesk.co.jp \
  --group-name admins
```

### Phase 3: 予算・セキュリティ設定（半日）

#### 3.1 予算アラート設定

```bash
# 予算作成（CLI）
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "Monstera-Monthly-Budget",
    "BudgetLimit": {
      "Amount": "500",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "TimePeriod": {
      "Start": "'$(date +%Y-%m-01)'",
      "End": "2087-06-15"
    },
    "BudgetType": "COST",
    "CostFilters": {
      "TagKey": ["Project"],
      "TagValue": ["Monstera"]
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "admin@duesk.co.jp"
        }
      ]
    }
  ]'
```

#### 3.2 CloudTrail設定

```bash
# CloudTrail有効化（セキュリティ監査用）
aws cloudtrail create-trail \
  --name monstera-cloudtrail \
  --s3-bucket-name monstera-cloudtrail-logs-$(date +%s) \
  --include-global-service-events \
  --is-multi-region-trail \
  --enable-log-file-validation

# ロギング開始
aws cloudtrail start-logging \
  --name monstera-cloudtrail
```

### Phase 4: 本番準備（1-2日）

#### 4.1 本番環境用リソース作成

```bash
# 本番用Cognitoプール作成（production環境用）
export AWS_ENV=production
cd infrastructure/cognito

# 本番用設定でデプロイ
cdk deploy MonsteraCognitoProd

# 本番用環境変数設定
cp .env.production.template .env.production
# 必要な値を設定
```

#### 4.2 本番用セキュリティ強化

```bash
# WAF設定（本番環境）
aws wafv2 create-web-acl \
  --name monstera-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --description "Monstera WAF" \
  --rules '[
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      }
    }
  ]'
```

## 開発チーム向け考慮事項

### 1. 複数開発者のアクセス管理

#### IAMユーザー戦略

**開発者ロール定義**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLog*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-northeast-1"
        }
      }
    }
  ]
}
```

**アクセス管理手順**:
```bash
# 1. 開発者用IAMグループ作成
aws iam create-group --group-name MonsteraDevelopers

# 2. ポリシーアタッチ
aws iam attach-group-policy \
  --group-name MonsteraDevelopers \
  --policy-arn arn:aws:iam::ACCOUNT:policy/MonsteraDevPolicy

# 3. 各開発者のIAMユーザー作成
aws iam create-user --user-name developer1
aws iam add-user-to-group \
  --user-name developer1 \
  --group-name MonsteraDevelopers

# 4. アクセスキー生成
aws iam create-access-key --user-name developer1
```

### 2. 環境分離戦略

#### VPCベース分離（推奨）

```
開発環境VPC (10.0.0.0/16)
├── monstera-dev-subnet-public (10.0.1.0/24)
└── monstera-dev-subnet-private (10.0.2.0/24)

ステージング環境VPC (10.1.0.0/16)
├── monstera-staging-subnet-public (10.1.1.0/24)
└── monstera-staging-subnet-private (10.1.2.0/24)

本番環境VPC (10.2.0.0/16)
├── monstera-prod-subnet-public (10.2.1.0/24)
└── monstera-prod-subnet-private (10.2.2.0/24)
```

#### タグベース管理

```bash
# リソースタグ戦略
Project=Monstera
Environment=development|staging|production
Owner=TeamLead
CostCenter=Engineering
Backup=required|not-required
```

### 3. コスト管理

#### タグベース課金追跡

```bash
# コスト配分タグの設定
aws ce create-cost-category-definition \
  --name "MonsteraEnvironments" \
  --rules '[
    {
      "Value": "Development",
      "Rule": {
        "Tags": {
          "Key": "Environment",
          "Values": ["development"]
        }
      }
    },
    {
      "Value": "Production",
      "Rule": {
        "Tags": {
          "Key": "Environment",
          "Values": ["production"]
        }
      }
    }
  ]' \
  --rule-version "CostCategoryExpression.v1"
```

#### 自動リソース停止

```bash
# 開発環境の夜間停止（コスト削減）
# EventBridge Rule + Lambda

# Lambda関数例（ECS停止）
import boto3

def lambda_handler(event, context):
    ecs = boto3.client('ecs')
    
    # 開発環境のECSサービスを停止
    ecs.update_service(
        cluster='monstera-dev-cluster',
        service='monstera-dev-backend',
        desiredCount=0
    )
    
    return {'statusCode': 200, 'body': 'Services stopped'}
```

## 運用・保守

### 1. モニタリング設定

#### CloudWatch Alarms

```bash
# CPU使用率アラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "Monstera-High-CPU" \
  --alarm-description "ECS CPU usage > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "arn:aws:sns:ap-northeast-1:ACCOUNT:monstera-alerts"

# エラー率アラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "Monstera-High-Error-Rate" \
  --alarm-description "Error rate > 5%" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:ap-northeast-1:ACCOUNT:monstera-alerts"
```

### 2. バックアップ戦略

#### RDSバックアップ

```bash
# 自動バックアップ設定（CDKで設定済み）
# - バックアップ保持期間: 7日
# - バックアップウィンドウ: 3:00-4:00 JST
# - メンテナンスウィンドウ: 日曜 4:00-5:00 JST

# 手動スナップショット
aws rds create-db-snapshot \
  --db-instance-identifier monstera-prod-db \
  --db-snapshot-identifier monstera-prod-db-$(date +%Y%m%d-%H%M%S)
```

### 3. セキュリティ更新

#### 定期的なセキュリティ監査

```bash
# 1. AWS Config Rules適用
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "root-mfa-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ROOT_MFA_ENABLED"
    }
  }'

# 2. セキュリティハブ有効化
aws securityhub enable-security-hub

# 3. GuardDuty有効化
aws guardduty create-detector
```

## 完了チェックリスト

### 基盤構築完了チェック
- [ ] AWSアカウント作成・設定完了
- [ ] IAMユーザー・ロール作成完了
- [ ] 予算アラート設定完了
- [ ] CDKブートストラップ完了

### Cognito環境構築完了チェック
- [ ] 既存CDKコード実行完了
- [ ] Cognitoユーザープール作成完了
- [ ] テストユーザー作成・動作確認完了
- [ ] 環境変数設定完了

### セキュリティ設定完了チェック
- [ ] CloudTrail有効化完了
- [ ] セキュリティグループ設定完了
- [ ] WAF設定完了（本番環境）
- [ ] 暗号化設定完了

### 運用準備完了チェック
- [ ] モニタリング設定完了
- [ ] バックアップ設定完了
- [ ] 開発者アクセス権限設定完了
- [ ] ドキュメント整備完了

---

## 参考資料

- [MonsteraプロジェクトCognito実装](../../infrastructure/cognito/README.md)
- [AWS Organizations ベストプラクティス](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Amazon Cognito 料金](https://aws.amazon.com/jp/cognito/pricing/)
- [AWS 無料枠](https://aws.amazon.com/jp/free/)

**注意**: この手順書は2025年8月時点の情報に基づいています。AWSサービスの料金や機能は変更される可能性があるため、実行前に最新情報を確認してください。