# テスト用メールアドレス規約

## 概要

本ドキュメントは、Monsteraプロジェクトにおけるテスト用メールアドレスの命名規則、使用方法、および管理方針を定めたものです。

## テスト用メールアドレス一覧

### 1. ロール別テストユーザー（必須）

| メールアドレス | 用途 | パスワード | 備考 |
|---|---|---|---|
| admin@duesk.co.jp | 管理者ロール | admin123 | pgAdmin、Cognito管理者としても使用 |
| manager_test@duesk.co.jp | マネージャーロール | Test1234! | E2Eテスト用 |
| engineer_test@duesk.co.jp | エンジニアロール | Test1234! | E2Eテスト用 |
| sales_test@duesk.co.jp | 営業ロール | Test1234! | E2Eテスト用 |

### 2. 汎用テストユーザー

| メールアドレス | 用途 | パスワード | 備考 |
|---|---|---|---|
| test@duesk.co.jp | 汎用テストアカウント | Test1234! | 最も使用頻度が高い |

### 3. 特殊用途

| メールアドレス | 用途 | パスワード | 備考 |
|---|---|---|---|
| unique_test1@duesk.co.jp | DB制約テスト用1 | - | UNIQUE制約のテスト |
| unique_test2@duesk.co.jp | DB制約テスト用2 | - | UNIQUE制約のテスト |

### 4. モックデータ

| メールアドレス | 用途 | パスワード | 備考 |
|---|---|---|---|
| yamada@duesk.co.jp | 男性名の代表 | - | 山田太郎 |
| sato@duesk.co.jp | 女性名の代表 | - | 佐藤花子 |

## 使用ガイドライン

### 1. 新規テスト作成時

- **原則**: 上記のテストメールアドレスを使用すること
- **新規作成禁止**: 特別な理由がない限り、新しいテストメールアドレスを作成しない
- **ロール別選択**: テスト対象の機能に応じて適切なロールのメールアドレスを選択

### 2. 既存テストの修正時

- **段階的移行**: 既存テストは段階的に新しいメールアドレスに移行
- **優先度**: 頻繁に更新されるテストから優先的に移行

### 3. 特殊なテストケース

- **動的生成**: 重複チェックなどの特殊なケースでは、テスト内で動的にメールアドレスを生成
- **例**: `test_${timestamp}@duesk.co.jp`

## 実装方法

### バックエンド（Go）

```go
import "backend/internal/testdata"

// 使用例
email := testdata.EngineerEmail
password := testdata.DefaultTestPassword
```

### フロントエンド（TypeScript）

```typescript
import { TEST_EMAILS, TEST_PASSWORDS } from '@/test-utils/test-emails';

// 使用例
const email = TEST_EMAILS.engineer;
const password = TEST_PASSWORDS.default;
```

### 環境変数

`.env.e2e`ファイルで定義：

```bash
E2E_ADMIN_EMAIL=admin@duesk.co.jp
E2E_ADMIN_PASSWORD=admin123
E2E_ENGINEER_EMAIL=engineer_test@duesk.co.jp
E2E_ENGINEER_PASSWORD=Test1234!
# ... 他のロール
```

## 削除予定のメールアドレス

以下のメールアドレスは段階的に削除予定です：

- engineer@duesk.co.jp → engineer_test@duesk.co.jp に統合
- employee@duesk.co.jp → engineer_test@duesk.co.jp に統合
- sales.manager@duesk.co.jp → manager_test@duesk.co.jp に統合
- user1@duesk.co.jp, user2@duesk.co.jp → test@duesk.co.jp に統合
- testuser001@duesk.co.jp → test@duesk.co.jp に統合
- 機能別テストメール（test.engineer@, search.test@ など） → test@duesk.co.jp に統合
- 日本人名メール（suzuki@, tanaka@, takahashi@） → yamada@, sato@ のみ残す

## クリーンアップ方法

### データベースからテストデータを削除

```sql
-- テストメールアドレスを持つユーザーを削除
DELETE FROM users WHERE email LIKE '%_test@duesk.co.jp';
DELETE FROM users WHERE email IN (
  'test@duesk.co.jp',
  'admin@duesk.co.jp',
  'yamada@duesk.co.jp',
  'sato@duesk.co.jp',
  'unique_test1@duesk.co.jp',
  'unique_test2@duesk.co.jp'
);
```

### E2Eテスト後のクリーンアップ

```bash
# scripts/e2e-testing/cleanup-e2e-test.sh を実行
make e2e-cleanup
```

## 注意事項

1. **本番環境での使用禁止**: これらのメールアドレスは開発・テスト環境でのみ使用
2. **パスワードの管理**: テスト用パスワードは定期的に変更し、本番環境では絶対に使用しない
3. **データの分離**: テストデータと本番データは完全に分離すること

## 更新履歴

- 2025-01-11: 初版作成（メールアドレスを35種類から10種類に削減）