# IAM Identity CenterでCognito権限を設定する方法

## 概要
IAM Identity Center（旧AWS SSO）を使用している場合、従来のIAMユーザーとは異なる方法で権限を管理します。

## 権限追加の手順

### 方法1: 権限セットに追加（推奨）

1. **AWS IAM Identity Centerコンソール**にアクセス
   - https://console.aws.amazon.com/singlesignon/

2. **権限セット**を選択
   - 現在使用している権限セットを特定

3. **権限セットを編集**
   - 「AWS管理ポリシー」タブで「ポリシーをアタッチ」
   - `AmazonCognitoPowerUser` を検索して追加
   - または「インラインポリシー」で以下を追加：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*"
      ],
      "Resource": "*"
    }
  ]
}
```

4. **変更を保存**

5. **権限の再プロビジョニング**
   - アカウントの割り当てページで「再プロビジョニング」を実行

### 方法2: 新しい権限セットを作成

1. **新しい権限セットを作成**
   - 名前: `CognitoDeveloper`
   - 説明: Cognito開発用権限

2. **ポリシーを追加**
   - `AmazonCognitoPowerUser`
   - その他必要なポリシー

3. **ユーザーに割り当て**
   - daichiro.uesaka に新しい権限セットを割り当て

## SSO認証の更新

権限追加後、SSOセッションを更新：

```bash
# 現在のSSO設定を確認
aws configure list-profiles

# SSOログインを更新
aws sso login --profile your-sso-profile

# または、デフォルトプロファイルの場合
aws sso login
```

## 一時的な回避策

### AssumeRoleを使用
権限セットの更新を待つ間、一時的にロールを引き受ける：

```bash
# 管理者ロールがある場合
aws sts assume-role \
  --role-arn arn:aws:iam::879381244492:role/YourAdminRole \
  --role-session-name CognitoSetup
```

### 直接認証情報を使用
一時的にアクセスキーとシークレットキーを生成：

1. IAM Identity Centerで「AWS アカウント」を選択
2. アカウントを選択して「コマンドラインまたはプログラムによるアクセス」
3. 「Option 2: 短期認証情報」をコピー
4. ターミナルに貼り付けて実行

## 確認方法

権限が正しく設定されたか確認：

```bash
# Cognito権限をテスト
aws cognito-idp list-user-pools --max-results 1

# 成功すれば権限が付与されている
```

## 注意事項

- IAM Identity Centerの権限変更は即座に反映されない場合があります
- 最大15分程度かかることがあります
- ブラウザのキャッシュをクリアすると反映が早くなることがあります