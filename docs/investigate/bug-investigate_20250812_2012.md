# バグ調査レポート: employee/userロールのengineer統一調査

## 調査日時
2025-08-12 20:12

## 調査概要
employee/userロールがengineerに統一されているかコードベース全体を調査

## 調査結果サマリー
フロントエンドは概ね統一されているが、バックエンドとデータベースではemployeeが広範囲に残存している。

## 詳細調査結果

### 1. フロントエンド (TypeScript/React)

#### ✅ 統一済み
- `SharedUserMenu.tsx`: engineerケースが追加済み
- `useAuth.ts`: デフォルトロールがengineerに変更済み
- `utils/auth.ts`: ロール変換処理でengineerを使用
- `ActiveRoleContext.tsx`: RoleTypeにengineerが定義済み
- `RoleSwitcher.tsx`: engineer判定に統一済み
- 主要コンポーネントでemployee/userの直接参照なし

#### ❌ 残存箇所
なし（主要ロール関連は統一済み）

### 2. バックエンド (Go)

#### ❌ 広範囲に残存
**モデル定義 (`backend/internal/model/role.go`)**:
```go
const (
    RoleSuperAdmin Role = 1
    RoleAdmin Role = 2
    RoleManager Role = 3
    RoleEmployee Role = 4  // engineerではなくemployeeのまま
)

func (r Role) String() string {
    case RoleEmployee:
        return "employee"  // engineerではない
}
```

**ロールユーティリティ (`backend/internal/common/roleutil/role_converter.go`)**:
```go
"employee": model.RoleEmployee,
"user":     model.RoleEmployee, // 旧仕様の"user"は"employee"にマッピング
```

**その他多数のファイル**:
- テストファイル: `model.RoleEmployee`を広範囲で使用
- サービス層: `model.RoleEmployee`を参照
- ハンドラー層: employee文字列を使用

### 3. データベース

#### ❌ ENUM定義で残存
**マイグレーション (`backend/migrations/cognito-based/000000_initial_setup.up.sql`)**:
```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'employee');
```

**ユーザーテーブル定義 (`backend/migrations/cognito-based/000001_create_users_table.up.sql`)**:
```sql
role user_role NOT NULL DEFAULT 'employee',
```

### 4. 影響範囲分析

#### 現在の状態
- **フロントエンド**: engineer使用（統一済み）
- **バックエンド**: employee使用（未統一）
- **データベース**: employee使用（未統一）
- **API通信**: 数値（4）で通信するため動作に問題なし

#### 動作への影響
- **現状動作**: 問題なし（数値ベースの通信のため）
- **保守性**: 混在により混乱の可能性あり
- **新規開発**: 命名規則の不統一により開発効率低下

## 統一が必要な箇所

### バックエンド（優先度：高）
1. `backend/internal/model/role.go`
   - `RoleEmployee` → `RoleEngineer`
   - String()メソッドの返却値変更

2. `backend/internal/common/roleutil/role_converter.go`
   - マッピングをengineerに変更

3. 全テストファイル
   - `model.RoleEmployee` → `model.RoleEngineer`

### データベース（優先度：中）
1. ENUM型定義の変更
   - `'employee'` → `'engineer'`
   
2. 既存データの移行
   - 既存の'employee'データを'engineer'に更新

### ドキュメント（優先度：低）
- 各種設計書・実装ガイドの更新

## リスク評価

### 変更リスク
- **低**: API通信は数値ベースのため影響小
- **中**: テストコードの大量修正が必要
- **高**: データベース移行時のダウンタイム発生可能性

### 変更しないリスク
- 命名規則の不統一による混乱
- 新規開発者の学習コスト増加
- 将来的な技術的負債の蓄積

## 推奨アクション

### 段階的移行アプローチ
1. **Phase 1**: バックエンドコードの統一
   - model定数名の変更
   - 後方互換性を保ちつつ移行

2. **Phase 2**: テストコードの更新
   - 自動置換による一括更新

3. **Phase 3**: データベース移行
   - メンテナンスウィンドウでの実施
   - ロールバック計画の準備

### 即時対応（最小限）
- ドキュメントに現状を明記
- 新規開発では数値（4）を使用することを徹底
- フロントエンド/バックエンド間の差異を認識

## 結論
フロントエンドは統一済みだが、バックエンドとデータベースにemployeeが広範囲に残存。
動作上の問題はないが、保守性向上のため段階的な統一を推奨。