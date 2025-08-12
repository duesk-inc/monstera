# バグ調査レポート: ロール文字列（マジックナンバー）使用箇所

## 調査日時
2025-08-12 22:07

## 調査対象
フロントエンド・バックエンドでロールが文字列リテラルやマジックナンバーとして直接使用されている箇所

## 調査方法
- Serenaのsearch_for_patternツールを使用
- 対象: TypeScript/TSX/Go/SQLファイル
- 検索パターン: ロール文字列（'engineer', 'admin', 'manager', 'super_admin'）および数値（1, 2, 3, 4）

## 調査結果

### 1. フロントエンド（TypeScript/TSX）

#### 文字列リテラルの使用箇所

**src/context/ActiveRoleContext.tsx**
- `export type RoleType = 'super_admin' | 'admin' | 'manager' | 'engineer';`
- 配列での直接使用: `['super_admin', 'admin', 'manager', 'engineer'].includes(role)`
- 数値マッピング:
  ```typescript
  1: 'super_admin',
  2: 'admin',
  3: 'manager',
  4: 'engineer',
  ```

**src/app/(authenticated)/layout.tsx**
- 条件判定: `const isEngineer = activeRole === 'engineer';`

**src/app/(admin)/layout.tsx**
- 権限チェック: `role === 'admin' || role === 'manager' || role === 'super_admin'`

**src/components/ui/RoleSwitcher.tsx**
- switch文での使用:
  ```typescript
  case 'super_admin':
  case 'admin':
  case 'manager':
  case 'engineer':
  ```
- 条件判定: `if (newRole === 'super_admin' || newRole === 'admin' || newRole === 'manager')`

**src/components/features/profile/AccountSettingsSection.tsx**
- 数値マッピング（両方向）:
  ```typescript
  'super_admin': 1,
  'admin': 2,
  'manager': 3,
  'engineer': 4
  ```

**src/components/common/layout/SharedUserMenu.tsx**
- switch文でのロール表示名マッピング

**その他**
- notification関連: ロール選択肢の定義
- expense関連: 承認タイプの文字列使用 ('manager' | 'executive')
- sales関連: 参加者タイプ ('client' | 'engineer')

### 2. バックエンド（Go）

#### 文字列リテラルの使用箇所

**internal/model/role.go** ✅ 適切に定数化
- String()メソッドで文字列返却（OK）
- ParseRole()で文字列受け入れ（OK）

**internal/common/roleutil/role_converter.go** ✅ 適切に定数化
- マッピングテーブルで使用（OK）

**internal/handler/sales_team_handler.go**
- case文: `case "manager":`

**internal/middleware/security.go** ⚠️ 問題
- 文字列判定: `if strings.Contains(token, "admin")`

**テストコード**
- 多数のテストファイルで文字列リテラル使用
- 例: `"admin"`, `"manager"`, `"engineer"`

### 3. データベース（SQL）

#### 数値の直接使用箇所

**migrations/100000_seed_initial_data.up.sql**
- `role = 2` (admin)
- `role = 4` (engineer)

**migrations/300000_seed_cognito_users.up.sql**
- `0,  -- Employee` (コメント付きだが数値使用)
- `2,  -- Admin`

**migrations/200061_add_cognito_local_users.up.sql**
- `2,  -- admin role`
- `4,  -- employee role`

**migrations/200042_add_accounting_permissions.up.sql**
- `(gen_random_uuid()::text, 1, 'accounting.all')` (role = 1)
- `(gen_random_uuid()::text, 2, 'accounting.dashboard.view')` (role = 2)
- `(gen_random_uuid()::text, 3, 'accounting.dashboard.view')` (role = 3)
- `(gen_random_uuid()::text, 7, 'accounting.all')` (role = 7)
- `(gen_random_uuid()::text, 8, 'accounting.dashboard.view')` (role = 8)

## 問題点の分析

### 1. 保守性の問題
- ロール名や値が変更された場合、多数の箇所を修正する必要がある
- 文字列のタイポリスクが高い
- 新しいロール追加時の影響範囲が広い

### 2. 型安全性の欠如
- TypeScriptでは文字列リテラルユニオン型を使用しているが、定数化されていない
- Goでは一部で文字列判定を行っている

### 3. 一貫性の欠如
- フロントエンドとバックエンドで表現が異なる場合がある
- 数値と文字列の変換ロジックが分散している

## 推奨される改善案

### フロントエンド
1. **ロール定数の作成**
   ```typescript
   // constants/roles.ts
   export const ROLES = {
     SUPER_ADMIN: 'super_admin',
     ADMIN: 'admin',
     MANAGER: 'manager',
     ENGINEER: 'engineer'
   } as const;
   
   export const ROLE_VALUES = {
     [ROLES.SUPER_ADMIN]: 1,
     [ROLES.ADMIN]: 2,
     [ROLES.MANAGER]: 3,
     [ROLES.ENGINEER]: 4
   } as const;
   ```

2. **型定義の統一**
   ```typescript
   export type RoleType = typeof ROLES[keyof typeof ROLES];
   ```

### バックエンド
1. **middleware/security.goの修正**
   - 文字列判定を削除し、適切な型を使用

2. **テストコードの改善**
   - テストでも定数を使用

### データベース
1. **マイグレーション変数の使用**
   ```sql
   DO $$
   DECLARE
     ROLE_SUPER_ADMIN CONSTANT INT := 1;
     ROLE_ADMIN CONSTANT INT := 2;
     ROLE_MANAGER CONSTANT INT := 3;
     ROLE_ENGINEER CONSTANT INT := 4;
   BEGIN
     -- 変数を使用
   END $$;
   ```

## 影響度評価

### 高優先度（本番環境に影響）
1. `internal/middleware/security.go` - セキュリティ判定に影響
2. ロール権限チェック箇所 - アクセス制御に影響

### 中優先度（機能に影響）
1. フロントエンドのロール判定 - UI表示に影響
2. switch文での分岐 - 機能の動作に影響

### 低優先度（開発効率）
1. テストコード - テストの保守性
2. マイグレーションファイル - 初期データの設定

## 結論

現在のコードベースでは、ロールが文字列リテラルやマジックナンバーとして広範囲に使用されています。これは技術的債務となっており、以下のリスクがあります：

1. **保守性の低下**: 変更時の影響範囲が広い
2. **バグの温床**: タイポや値の不一致が起きやすい
3. **開発効率の低下**: 新機能追加時の考慮事項が多い

段階的な改善を推奨します：
1. Phase 1: 定数定義の作成と新規コードでの使用
2. Phase 2: 既存コードの段階的な置き換え
3. Phase 3: テストコードとマイグレーションの改善