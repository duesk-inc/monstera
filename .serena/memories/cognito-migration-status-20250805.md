# Cognito移行の実装状況（2025-08-05）

## 現在の状況

### データベース側
- **本番環境**: passwordカラムあり、id=UUID(varchar(36))、cognito_subカラムあり（別カラム）
- **移行用マイグレーション作成済み**: `cognito-based/000001_create_users_table.up.sql`
  - passwordカラムなし
  - id=VARCHAR(255)でCognito Sub用
  - ただし未適用

### モデル側
- **user.go（使用中）**: 
  - ID: UUID型
  - Passwordフィールドあり
  - CognitoSubフィールドあり（別フィールド）
- **user_cognito.go（未使用）**: 
  - ID: string型（Cognito Sub）
  - Passwordフィールドなし

### リポジトリ側
- **user_repository.go（使用中）**: UUID版インターフェース
- **user_repository_cognito.go（未使用）**: Cognito Sub版インターフェース

### サービス側の実装
- CognitoAuthService: Cognito認証後、CognitoSubフィールドにSubを保存
- UserService: まだPasswordフィールドを参照している箇所あり

### スクリプト
- `update_user_id_fields.sh`: 関連テーブルのUserIDをUUID→stringに変更するスクリプト作成済み

## 移行に必要な作業

1. **フェーズ1: 準備**
   - user_cognito.goを正式なuser.goとして採用
   - リポジトリ実装の切り替え
   - サービス層のPassword参照削除

2. **フェーズ2: データベース移行**
   - 既存データのバックアップ
   - cognito_sub → id へのデータ移行
   - 関連テーブルの外部キー更新

3. **フェーズ3: コード更新**
   - UUID→string型への全面的な変更
   - GetByCognitoSub→GetByIDへの統一
   - テストコードの更新

## 重要な考慮事項
- 既存ユーザーのCognito Sub設定が必要
- 外部キー制約の更新が必要（256箇所以上）
- フロントエンドへの影響調査が必要