# AWS Identity Center 一時認証情報取得ガイド

## 手順

### 1. ブラウザでAWS Identity Centerにアクセス
組織のSSO URLにアクセスします。URLは通常以下の形式です：
- `https://d-XXXXXXXXXX.awsapps.com/start`
- または `https://組織名.awsapps.com/start`

### 2. ログイン
- ユーザー名とパスワードでログイン
- MFA（多要素認証）が設定されている場合は認証コードを入力

### 3. アカウント選択画面
![アカウント一覧]
- 複数のアカウントが表示される場合があります
- 開発用アカウントを選択（通常は "Development" や "Dev" という名前）

### 4. 認証情報の取得
アカウント名の横にある「Command line or programmatic access」をクリック

### 5. 認証情報のコピー
表示される画面で「Option 2: Short-term credentials」セクションを確認：

```
AWS Access Key ID: ASIA4ZPZU5JGXXXXXXXX
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS Session Token: IQoJb3JpZ2luX2VjEJr...（非常に長い文字列）
```

### 6. 環境変数として設定
.env.cognitoファイルに以下の形式で追加：

```bash
# AWS認証情報（Cognito APIアクセス用）
AWS_ACCESS_KEY_ID=ASIA4ZPZU5JGXXXXXXXX
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEJr...
```

## 注意事項

### 有効期限
- 一時認証情報は**12時間**で期限切れになります
- 期限切れ後は再度取得が必要です

### セキュリティ
- これらの認証情報は機密情報です
- Gitにコミットしないでください
- 他人と共有しないでください

### トラブルシューティング

#### 「Invalid security token」エラーの場合
- 認証情報の有効期限が切れている可能性があります
- 新しい認証情報を取得してください

#### アカウントが表示されない場合
- 適切な権限が付与されていない可能性があります
- 管理者に問い合わせてください

#### Option 2が表示されない場合
- ブラウザの表示を更新してください
- 別のブラウザで試してください