# 開発モードログイン修正パターン

## 修正日
2025-08-13

## 問題パターン
開発モードでユーザーIDやトークンに特別な接頭辞や形式を使用すると、データベース制約やフロントエンド検証で問題が発生する。

## 修正パターン

### 1. ユーザーID形式の統一
**原則**: 開発モードでも本番と同じID形式（36文字UUID）を使用する

```go
// NG: 開発モード専用の接頭辞
userID = "dev-00000000-0000-0000-0000-000000000004"  // 44文字

// OK: 標準的なUUID形式
userID = "17a40a68-a061-7028-e5a0-db2da1ee6e6d"  // 36文字
```

### 2. トークン形式の統一
**原則**: フロントエンドがJWT形式を期待する場合、開発モードでも3セグメント形式を使用

```go
// NG: 単一セグメント
accessToken := fmt.Sprintf("dev-access-token-%s-%d", userID, timestamp)

// OK: JWT風3セグメント形式
accessToken := fmt.Sprintf("dev.%s.%d", userID, timestamp)
```

### 3. シードデータとの整合性
**原則**: 開発モードのハードコードされたIDは、シードデータと一致させる

```sql
-- シードデータ
test_user_id VARCHAR(255) := '17a40a68-a061-7028-e5a0-db2da1ee6e6d';
```

```go
// コード内のID
case "engineer_test@duesk.co.jp":
    userID = "17a40a68-a061-7028-e5a0-db2da1ee6e6d"  // シードデータと同一
```

## チェックリスト
- [ ] データベースのカラム定義（CHAR(36)など）を確認
- [ ] フロントエンドのトークン検証ロジックを確認
- [ ] シードデータとの整合性を確認
- [ ] 開発/本番で共通のデータ形式を使用

## 関連ファイル
- `backend/internal/service/cognito_auth_service.go` - 開発モード認証
- `backend/migrations/300000_seed_cognito_users.up.sql` - シードデータ
- `frontend/src/middleware.ts` - トークン検証

## 教訓
開発モードでも本番に近い形式を使用することで、予期しない不整合を防げる。特にデータベース制約やフロントエンド検証に注意。