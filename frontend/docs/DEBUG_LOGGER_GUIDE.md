# DebugLogger使用ガイドライン

## 概要
`DebugLogger`は、フロントエンド開発環境でのデバッグログ出力を管理するユーティリティクラスです。
本番環境では自動的に無効化され、パフォーマンスへの影響を防ぎます。

## 重要な注意事項

### ⚠️ `log()`メソッドは存在しません
`DebugLogger.log()`メソッドは実装されていません。以下の正しいメソッドを使用してください：
- `info()` - 一般的な情報ログ
- `debug()` - デバッグ情報
- `error()` - エラー情報
- `apiStart()` - API呼び出し開始
- `apiSuccess()` - API呼び出し成功
- `apiError()` - API呼び出しエラー

## 基本的な使用方法

### 1. インポート
```typescript
import { DebugLogger } from '@/lib/debug/logger';
```

### 2. 一般的な情報ログ
```typescript
// ✅ 正しい使用方法
DebugLogger.info(
  { category: 'API', operation: 'GetUser' },
  'ユーザー情報を取得しました',
  { userId: '123', userName: 'John' }
);

// ❌ 間違った使用方法（動作しません）
DebugLogger.log('API', 'ユーザー情報を取得しました', data);
```

### 3. デバッグ情報
```typescript
DebugLogger.debug(
  { category: 'UI', operation: 'Render' },
  'コンポーネントがレンダリングされました',
  { componentName: 'UserProfile' }
);
```

### 4. エラー情報
```typescript
DebugLogger.error(
  'API',
  'データ取得に失敗しました',
  error
);
```

## API呼び出しのログ

### API開始時
```typescript
DebugLogger.apiStart(
  { 
    category: 'API', 
    operation: 'CreateExpense',
    description: '経費申請作成'
  },
  { 
    url: '/api/v1/expenses',
    method: 'POST',
    requestData: expenseData
  }
);
```

### API成功時
```typescript
DebugLogger.apiSuccess(
  { category: 'API', operation: 'CreateExpense' },
  { 
    status: 200,
    responseData: response.data
  }
);
```

### APIエラー時
```typescript
DebugLogger.apiError(
  { category: 'API', operation: 'CreateExpense' },
  { 
    error: error,
    status: error.response?.status
  }
);
```

## カテゴリとオペレーション

### 推奨カテゴリ
- `'API'` - API関連の操作
- `'UI'` - UIコンポーネント関連
- `'Validation'` - バリデーション処理
- `'DataConversion'` - データ変換処理
- `'Authentication'` - 認証関連
- `'Routing'` - ルーティング関連
- `'StateManagement'` - 状態管理

### 推奨オペレーション名
- `'Create'` - 作成処理
- `'Read'` / `'Get'` - 取得処理
- `'Update'` - 更新処理
- `'Delete'` - 削除処理
- `'List'` - 一覧取得
- `'Submit'` - 送信処理
- `'Validate'` - 検証処理
- `'Convert'` - 変換処理

## ベストプラクティス

### 1. 一貫性のあるカテゴリ名を使用
```typescript
// Good: 一貫したカテゴリ名
DebugLogger.info({ category: 'API', operation: 'GetUsers' }, '...');
DebugLogger.info({ category: 'API', operation: 'CreateUser' }, '...');

// Bad: 不統一なカテゴリ名
DebugLogger.info({ category: 'API_CALL', operation: 'GetUsers' }, '...');
DebugLogger.info({ category: 'ApiRequest', operation: 'CreateUser' }, '...');
```

### 2. 意味のあるオペレーション名を使用
```typescript
// Good: 具体的で理解しやすい
DebugLogger.info({ category: 'API', operation: 'GetExpenseSummary' }, '...');

// Bad: 曖昧
DebugLogger.info({ category: 'API', operation: 'Process' }, '...');
```

### 3. 機密情報をログに含めない
```typescript
// Bad: パスワードやトークンを含める
DebugLogger.info(
  { category: 'Auth', operation: 'Login' },
  'ログイン試行',
  { username: 'john', password: 'secret123' } // ❌ パスワードを含めない
);

// Good: 機密情報を除外
DebugLogger.info(
  { category: 'Auth', operation: 'Login' },
  'ログイン試行',
  { username: 'john' } // ✅ ユーザー名のみ
);
```

### 4. 必要な情報のみをログに記録
```typescript
// Good: 必要な情報のみ
DebugLogger.info(
  { category: 'API', operation: 'UpdateUser' },
  'ユーザー更新',
  { userId: user.id, updatedFields: ['name', 'email'] }
);

// Bad: 大量のデータをそのまま記録
DebugLogger.info(
  { category: 'API', operation: 'UpdateUser' },
  'ユーザー更新',
  entireUserObject // 大量のデータ
);
```

## TypeScriptによる型安全性

DebugLoggerクラスには`log()`メソッドが存在しないことが型定義で明示されています：

```typescript
export class DebugLogger {
  /**
   * @deprecated This method does not exist. Use info(), debug(), or error() instead.
   * @throws {Error} Always throws an error when called
   */
  private static log?: never;
  
  // 実際に使用可能なメソッド
  static info(...) { ... }
  static debug(...) { ... }
  static error(...) { ... }
}
```

## ESLintによる自動チェック

プロジェクトのESLint設定により、`DebugLogger.log()`の使用は自動的に警告されます：

```javascript
// .eslintrc.hardcoding.js
'no-restricted-syntax': [
  'warn',
  {
    selector: 'CallExpression[callee.property.name="log"][callee.object.name="DebugLogger"]',
    message: 'DebugLogger.log()は存在しません。info(), debug(), error()を使用してください。',
  }
]
```

## トラブルシューティング

### Q: DebugLogger.log()を使用したらエラーになる
**A:** `log()`メソッドは存在しません。`info()`, `debug()`, `error()`のいずれかを使用してください。

### Q: 本番環境でログが出力される
**A:** `process.env.NODE_ENV`が正しく設定されているか確認してください。本番環境では`'production'`である必要があります。

### Q: ログが見やすくない
**A:** ブラウザの開発者ツールのコンソールフィルター機能を使用して、特定のカテゴリのログのみを表示できます。

## 関連ドキュメント
- [APIクライアント仕様](./API_CLIENT_MIGRATION_GUIDE.md)
- [エラーハンドリングガイド](../docs/06_standards/error-handling.md)

---
最終更新: 2025-01-18
バージョン: 1.0