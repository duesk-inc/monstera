# CLAUDE.frontend.md

このファイルは、Monsteraフロントエンド開発におけるClaude Code (claude.ai/code)への仕様書です。
フロントエンド開発時は必ずこの仕様に従ってください。

## APIクライアント仕様（最重要）

### 必須使用パターン

```typescript
// ✅ 正しい使用方法
import { createPresetApiClient } from '@/lib/api';

// 関数内でクライアントを作成
export const fetchData = async () => {
  const client = createPresetApiClient('auth');
  return await client.get('/users'); // /api/v1は自動付与
};
```

### プリセット一覧

| プリセット | 用途 | ベースパス | 認証 | タイムアウト |
|-----------|------|-----------|------|-------------|
| `auth` | 一般認証API | /api/v1 | ✓ | 30秒 |
| `admin` | 管理者API | /api/v1/admin | ✓ | 30秒 |
| `upload` | ファイルアップロード | /api/v1 | ✓ | 120秒 |
| `batch` | バッチ処理 | /api/v1/batch | ✓ | 300秒 |
| `public` | 公開API | /api/v1/public | ✗ | 30秒 |

### 禁止事項

```typescript
// ❌ 以下のパターンは絶対に使用しない

// 1. 旧シングルトンパターン
import apiClient from '@/lib/api';

// 2. 廃止済み関数
const client = getAuthClient();

// 3. /api/v1のハードコーディング
await client.get('/api/v1/users');

// 4. モジュールレベルでのクライアント定義
const client = createPresetApiClient('auth'); // ❌ モジュールレベル
export const fetchData = async () => { ... };
```

## コンポーネント開発規約

### 基本原則
- **既存優先**: 新規作成前に必ず既存コンポーネントを確認
- **型安全**: TypeScriptの型定義を必須
- **エラーハンドリング**: `handleApiError`を使用

### ディレクトリ構造
```
src/
├── app/             # Next.js App Router
├── components/      
│   ├── common/      # 共通UIコンポーネント
│   ├── features/    # 機能固有コンポーネント
│   └── layouts/     # レイアウト
├── hooks/           # カスタムフック
├── lib/
│   └── api/         # APIクライアント
└── types/           # 型定義
```

## React Query使用規約

```typescript
// APIコールは必ずReact Query経由
import { useQuery, useMutation } from '@tanstack/react-query';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const client = createPresetApiClient('auth');
      const response = await client.get('/users');
      return response.data;
    }
  });
};
```

## エラーハンドリング

```typescript
import { handleApiError } from '@/lib/api/error';

try {
  const client = createPresetApiClient('auth');
  const response = await client.get('/users');
  return response.data;
} catch (error) {
  // 統一エラーハンドラーを使用
  throw handleApiError(error, 'ユーザー取得');
}
```

## テスト規約

```typescript
// APIクライアントのモック
jest.mock('@/lib/api', () => ({
  createPresetApiClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));
```

## パフォーマンス最適化

- **遅延ロード**: 大きなコンポーネントはdynamic importを使用
- **メモ化**: React.memo, useMemo, useCallbackを適切に使用
- **バンドルサイズ**: 不要なimportを避ける

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# リント
npm run lint

# テスト
npm test
```

## 重要リンク

- [APIクライアント移行ガイド](docs/API_CLIENT_MIGRATION_GUIDE.md)
- [プロジェクト全体ガイド](../CLAUDE.md)

---
最終更新: 2025-01-17
バージョン: 1.0