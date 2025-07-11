# コーディング規約

このドキュメントはMonsteraプロジェクトのコーディング規約を記載します。

## 更新履歴
- 2025-01-09: CLAUDE.mdから分離して作成
- 2025-07-11: naming-rules.mdから統合、実装に基づいて更新

## 基本原則

1. **一貫性を保つ**: 一度決めた命名規則はプロジェクト全体で統一して使用する
2. **適切な表現**: 名前は対象の目的や機能を明確に表現する
3. **シンプルさ**: 過度に長い名前や略語の乱用を避ける
4. **言語特性の尊重**: 各言語の標準的な命名規則に従う

## 命名規則

### JavaScript/TypeScript
```typescript
// 変数名: camelCase
const userName = "John";
const isActive = true;

// 定数名: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 5;
const API_TIMEOUT = 30000;

// 関数名: camelCase（動詞始まり）
function calculateTotal() {}
function getUserById() {}

// ファイル名: 
// コンポーネント: PascalCase
// WeeklyReportForm.tsx
// CommonTable.tsx
// フック: camelCase
// useAuth.ts
// useLeaveCalendar.ts
// その他: camelCase
// apiClient.ts
// utils.ts

// コンポーネント名: PascalCase
function WeeklyReportForm() {}
const CommonTable = () => {}

// 型名・インターフェース名: PascalCase
interface UserProfile {}
type WeeklyReportStatus = 'draft' | 'submitted' | 'approved';

// Enum: PascalCase（値はUPPER_SNAKE_CASE）
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  SUPER_ADMIN = 'SUPER_ADMIN'
}
```

### Go
```go
// パッケージ名: 小文字、単数形
package handler
package service
package model

// ファイル名: snake_case
// weekly_report_handler.go
// user_service.go
// auth_middleware.go

// 構造体名: PascalCase
type WeeklyReport struct {}
type UserService struct {}

// インターフェース名: PascalCase + er/able
type Repository interface {}
type Validator interface {}

// 関数名: PascalCase（エクスポート）、camelCase（非エクスポート）
func CreateWeeklyReport() {}
func validateInput() {}

// 定数: PascalCase（エクスポート）、camelCase（非エクスポート）
const MaxRetryCount = 5
const defaultTimeout = 30
```

### データベース
```sql
-- テーブル名: 複数形のsnake_case
users, weekly_reports, expense_categories

-- カラム名: snake_case
created_at, updated_at, deleted_at, user_id

-- インデックス名: idx_テーブル名_カラム名
idx_weekly_reports_user_id
idx_weekly_reports_status_deleted

-- 外部キー名: fk_子テーブル_親テーブル
fk_weekly_reports_user
fk_expenses_approver
```

## インポート順序

### TypeScript/JavaScript
```typescript
// 1. React/Next.js
import React from 'react';
import { useRouter } from 'next/navigation';

// 2. 外部ライブラリ
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// 3. 内部モジュール（絶対パス）
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common';
import { apiCall } from '@/lib/api/client';

// 4. 型定義
import type { WeeklyReport } from '@/types';
import type { ApiResponse } from '@/lib/api/types';

// 5. 相対パス
import { WeeklyReportSchema } from './schema';
import styles from './styles.module.css';
```

### Go
```go
import (
    // 1. 標準ライブラリ
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    
    // 2. 外部ライブラリ
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "go.uber.org/zap"
    
    // 3. 内部パッケージ
    "monstera/internal/model"
    "monstera/internal/service"
    "monstera/internal/repository"
)
```

## コメント規則

### Go
```go
// パッケージコメント
// Package service provides business logic implementation
// for the Monstera application.
package service

// エクスポートされる型・関数にはコメント必須
// WeeklyReportService handles business logic for weekly reports
type WeeklyReportService interface {
    // Create creates a new weekly report
    Create(ctx context.Context, input CreateInput) (*model.WeeklyReport, error)
    
    // FindByID retrieves a weekly report by its ID
    FindByID(ctx context.Context, id string) (*model.WeeklyReport, error)
}

// 複雑なロジックには説明コメント
// Calculate retry delay using exponential backoff
// Initial: 1s, then 2s, 4s, 8s, up to 16s
delay := calculateRetryDelay(attempt, strategy)

// TODOコメントは担当者と期限を明記
// TODO(yamada): implement email notification - 2024-03-01
```

### TypeScript/JavaScript
```typescript
/**
 * 週報フォームコンポーネント
 * 週報の作成・編集を行うフォーム
 */
export const WeeklyReportForm: React.FC<Props> = ({ initialData }) => {
  // ...
};

/**
 * APIコールのラッパー関数
 * @param endpoint - APIエンドポイント
 * @param options - fetchオプション
 * @returns APIレスポンス
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  // ...
}

// 複雑なロジックの説明
// 日付範囲の重複チェック
// 既存の期間と新規期間が重複していないか確認
const hasOverlap = existingPeriods.some(period => {
  return startDate < period.endDate && endDate > period.startDate;
});

// TODO: レスポンシブデザイン対応 - 2024-03-01
```

## Gitコミット規則

### フォーマット
```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Type一覧
- `feat`: 新機能追加
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正や機能追加を伴わないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスや補助ツールの変更

### Scope例
- `frontend`: フロントエンド関連
- `backend`: バックエンド関連
- `db`: データベース関連
- `deps`: 依存関係
- `ci`: CI/CD関連

### 例
```bash
# 新機能
feat(frontend): 週報一覧のフィルター機能を追加

# バグ修正
fix(backend): 週報提出時の権限チェックを修正

# パフォーマンス改善
perf(backend): 週報一覧のN+1問題を解消

Preloadを使用して関連データを事前読み込みすることで、
クエリ数を削減し、レスポンス時間を50%改善

Closes #123

# ドキュメント
docs: API仕様書を更新

# リファクタリング
refactor(frontend): 共通コンポーネントを統合

CommonTableとDataTableを統合し、
再利用性を向上
```

## API通信における命名規則

### URIパス
- ケバブケース使用: `/api/v1/weekly-reports`, `/api/v1/user-profiles`

### クエリパラメータ
- スネークケース使用: `?user_id=123&order_status=pending`

### リクエスト/レスポンスボディ
- JSONフィールド名はスネークケース: `{ "user_id": "123", "first_name": "Taro" }`

## 特定の命名パターン

### ID関連
- バックエンドのモデルフィールド: `UserID`, `OrderID`
- JSONレスポンスフィールド: `user_id`, `order_id`
- フロントエンド変数名: `userId`, `orderId`
- データベースカラム: `user_id`, `order_id`

### エンティティ命名
- **単一エンティティ**: 単数形: `user`, `leaveRequest`, `profile`
- **エンティティリスト**: 複数形: `users`, `leaveRequests`, `profiles`

### ブール値フィールド
- 肯定的な意味を持つ名前を使用: `isActive` (× `isNotActive`)
- 疑問形式で命名: `isValid`, `hasPermission`

### 日時フィールド
- 明確な接尾辞を使用: `createdAt`, `updatedAt`, `expiresAt`
- JSON/DB: `created_at`, `updated_at`, `expires_at`

## メソッド・関数命名パターン

### Go - 取得・作成・更新・削除
- **取得操作**: `Get...`, `Find...`, `List...` プレフィックス
- **作成操作**: `Create...` プレフィックス
- **更新操作**: `Update...` プレフィックス
- **削除操作**: `Delete...` プレフィックス

### TypeScript/JavaScript
- **データ取得**: `fetch/get/load` プレフィックス: `fetchUserData`, `getLeaveTypes`
- **状態変更**: `handle/update/set` プレフィックス: `handleSubmit`, `updateUserProfile`
- **イベント処理**: `on` + 動詞: `onSubmit`, `onChange`, `onLeaveRequestCreated`

## コードスタイル

### インデント
- TypeScript/JavaScript: スペース2つ
- Go: タブ
- SQL: スペース2つ
- YAML: スペース2つ

### 行の長さ
- 最大120文字を推奨
- URLやインポート文は例外

### 空行
- 関数間: 1行
- インポートグループ間: 1行
- ファイル末尾: 1行

### 括弧とスペース
```typescript
// TypeScript/JavaScript
if (condition) {
  // ...
}

function calculate(a: number, b: number): number {
  return a + b;
}

const obj = { key: 'value' };
const arr = [1, 2, 3];
```

```go
// Go
if condition {
    // ...
}

func calculate(a, b int) int {
    return a + b
}

obj := map[string]string{"key": "value"}
arr := []int{1, 2, 3}
```

## エラーハンドリング

### Go
```go
// エラーは必ず返り値の最後
func CreateUser(input CreateUserInput) (*User, error) {
    // ...
}

// エラーチェックは即座に
user, err := CreateUser(input)
if err != nil {
    return nil, fmt.Errorf("failed to create user: %w", err)
}
```

### TypeScript
```typescript
// try-catchで適切にエラーハンドリング
try {
  const result = await apiCall('/users', { method: 'POST' });
  return result;
} catch (error) {
  // エラーの型を確認
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
  throw error;
}
```

## リファクタリングガイドライン

既存コードを本規約に合わせる際は、以下の点に注意してください：

1. 一度に大規模な変更を行わず、小さな単位で段階的に適用する
2. 変更前に十分なテストカバレッジを確保する
3. API互換性に影響を与える変更は適切な移行期間を設ける
4. 命名変更の際はIDEのリネーム機能を活用し、参照漏れを防止する

---

*このドキュメントはコーディング規約の変更時に更新してください。*