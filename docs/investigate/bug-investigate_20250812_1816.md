# ログインエラー調査報告書

**調査日時**: 2025-08-12 18:16  
**調査者**: Claude Code  
**問題**: ログイン時にユーザーデータベース同期エラーが発生

## 1. エラー概要

### 症状
- Cognito認証は成功（トークン取得済み）
- しかしデータベースへのユーザー同期で失敗
- エラーメッセージ: `failed to parse 'employee' as default value for int`

### 影響範囲
- 全ユーザーのログインが失敗
- 新規ユーザーの作成も失敗
- 監査ログの記録も失敗

## 2. 根本原因

**型定義の不整合**が原因です：

### Go側の定義
```go
// backend/internal/model/role.go
type Role int  // int型として定義

// backend/internal/model/user.go
Role        Role  `gorm:"type:varchar(20);not null;default:'employee'" json:"role"`
DefaultRole *Role `gorm:"type:varchar(20);default:null" json:"default_role"`
```

### データベース側の定義
```sql
-- backend/migrations/cognito-based/000000_initial_setup.up.sql
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'employee');

-- backend/migrations/cognito-based/000001_create_users_table.up.sql
role user_role NOT NULL DEFAULT 'employee',
```

### 問題の詳細
1. Go側: Role型は`int`型
2. GORMタグ: `type:varchar(20);default:'employee'`（文字列型）
3. データベース: `user_role` ENUM型（文字列の列挙型）

GORMが`default:'employee'`という文字列をint型にパースしようとして失敗しています。

## 3. エラー発生の流れ

1. ユーザーがログイン試行
2. Cognito認証成功
3. `syncUserWithDB`関数でDBとの同期を試みる
4. `GetByCognitoSub`でユーザー検索 → **エラー**
5. `GetByEmail`でユーザー検索 → **エラー**
6. `Create`で新規ユーザー作成 → **エラー**
7. ログイン失敗（401エラー）

## 4. 修正案

### 方法1: GORMタグを修正（推奨）
```go
// backend/internal/model/user.go
type User struct {
    // ...
    Role        Role  `gorm:"type:int;not null;default:4" json:"role"`  // 4 = RoleEmployee
    DefaultRole *Role `gorm:"type:int;default:null" json:"default_role"`
    // ...
}
```

### 方法2: データベース側を修正
```sql
ALTER TABLE users 
ALTER COLUMN role TYPE SMALLINT USING (
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'employee' THEN 4
    END
),
ALTER COLUMN role SET DEFAULT 4;
```

### 方法3: カスタムGORMスキャナーを実装
Role型の`Scan`メソッドを改良して、データベースのENUM型と適切にマッピングする。

## 5. 推奨される修正手順

1. **即座の対応**（方法1）
   - `user.go`のGORMタグを修正
   - テストを実行
   - ローカルで動作確認

2. **本格的な対応**
   - データベーススキーマとGoモデルの整合性を完全に取る
   - マイグレーションスクリプトを作成
   - 既存データの移行を考慮

## 6. 影響を受けるファイル

- `backend/internal/model/user.go` - GORMタグの修正が必要
- `backend/internal/model/audit_log.go` - 同様の問題の可能性
- その他Role型を使用している全てのモデル

## 7. テスト項目

修正後に確認すべき項目：
- [ ] 新規ユーザーのログイン
- [ ] 既存ユーザーのログイン
- [ ] ユーザー作成機能
- [ ] ロール変更機能
- [ ] 監査ログの記録

## 8. 関連する過去の問題

UUID→String移行の際に、Role型の処理が漏れていた可能性があります。
全体的な型整合性の見直しが必要かもしれません。