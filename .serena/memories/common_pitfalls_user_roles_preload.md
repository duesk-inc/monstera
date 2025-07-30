# UserRepository Preload エラーパターン

## 問題
UserRepositoryのGetByEmail/GetByCognitoSubメソッドでPreload("UserRoles")を使用しているが、user_rolesテーブルが存在しない場合、ユーザー検索自体が失敗する。

## エラー例
```
ERROR: relation "user_roles" does not exist (SQLSTATE 42P01)
```

## 影響
- 認証済みユーザーでも「ユーザーが見つかりません」エラーが発生
- 全ての認証必須APIが利用不可能になる

## 対策
1. **即時対応**: マイグレーションを確実に実行してuser_rolesテーブルを作成
2. **長期対応**: Preloadのエラーハンドリング追加を検討
   ```go
   // エラーを無視してユーザー情報だけ取得
   err := r.DB.WithContext(ctx).First(&user, "email = ?", email).Error
   if err == nil {
       // UserRolesは別途取得
       r.DB.Preload("UserRoles").First(&user, "email = ?", email)
   }
   ```

## 関連ファイル
- `/backend/internal/repository/user_repository.go`
- `/backend/migrations/postgresql-versions/200001_create_user_roles_table.up.postgresql.sql`