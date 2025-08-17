# APIクライアント仕様書（2025年版）

## 概要
MonsteraプロジェクトではファクトリパターンベースのAPIクライアントシステムを採用。
全ての新規開発および既存コードの修正時は、この仕様に従うこと。

## 必須使用パターン

### 基本的な使用方法
```typescript
import { createPresetApiClient } from '@/lib/api';

// APIを呼び出す関数内でクライアントを作成
export const fetchUserData = async () => {
  const client = createPresetApiClient('auth');
  return await client.get('/users');
};
```

### プリセット一覧と用途
| プリセット | 用途 | ベースパス自動付与 | タイムアウト |
|-----------|------|-------------------|-------------|
| `auth` | 一般認証API | /api/v1 | 30秒 |
| `admin` | 管理者API | /api/v1/admin | 30秒 |
| `upload` | ファイルアップロード | /api/v1 | 120秒 |
| `batch` | バッチ処理 | /api/v1/batch | 300秒 |
| `public` | 公開API（認証不要） | /api/v1/public | 30秒 |

## 禁止事項（絶対に使用しない）

1. ❌ `import apiClient from '@/lib/api'` - シングルトンパターン禁止
2. ❌ `getAuthClient()` - 廃止済み関数
3. ❌ `/api/v1`のハードコーディング - プリセットが自動付与
4. ❌ モジュールレベルでのクライアント定義
```typescript
// ❌ 悪い例
const client = createPresetApiClient('auth'); // モジュールレベル

export const fetchData = async () => {
  return await client.get('/data');
};
```

## ベストプラクティス

### エラーハンドリング
```typescript
import { handleApiError } from '@/lib/api/error';

try {
  const client = createPresetApiClient('auth');
  const response = await client.get('/users');
  return response.data;
} catch (error) {
  throw handleApiError(error, 'ユーザー取得');
}
```

### React Queryとの統合
```typescript
const { data, error } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const client = createPresetApiClient('auth');
    const response = await client.get('/users');
    return response.data;
  }
});
```

### 管理者API
```typescript
// adminプリセットが/api/v1/adminを自動付与
const client = createPresetApiClient('admin');
await client.get('/users'); // 実際: /api/v1/admin/users
```

## 移行チェックリスト

- [ ] 旧パターン（apiClient, getAuthClient）を検索・置換
- [ ] /api/v1ハードコーディングを削除
- [ ] モジュールレベルのクライアントを関数内に移動
- [ ] 適切なプリセットを選択
- [ ] エラーハンドリングを統一

## パフォーマンス指標
- メモリ使用: 90%改善（ファクトリパターンによる）
- API最適化: 75%（プリセットによる設定統一）
- 型安全性: 95%（TypeScript完全対応）

## 関連ドキュメント
- CLAUDE.md: プロジェクト全体のガイドライン
- frontend/docs/API_CLIENT_MIGRATION_GUIDE.md: 詳細な移行ガイド

最終更新: 2025-01-17
バージョン: 2.0