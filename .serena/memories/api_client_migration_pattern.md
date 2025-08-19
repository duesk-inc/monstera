# APIクライアント移行パターン

## 新形式移行の標準パターン

### 1. 基本的な変換パターン

#### 旧形式（独自apiRequest使用）
```typescript
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, options);
  return await response.json();
}

export async function getExpenses(params) {
  return apiRequest(`/expenses?${params}`);
}
```

#### 新形式（createPresetApiClient使用）
```typescript
import { createPresetApiClient } from '@/lib/api';
import { handleApiError } from '@/lib/api/error';

export async function getExpenses(params) {
  try {
    const client = createPresetApiClient('auth');
    const response = await client.get('/expenses', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error, '経費一覧取得');
  }
}
```

### 2. プリセット選択ガイド

| 用途 | プリセット | タイムアウト |
|------|-----------|-------------|
| 一般的なAPI | `auth` | 30秒 |
| 管理者API | `admin` | 30秒 |
| ファイルアップロード | `upload` | 120秒 |
| バッチ処理 | `batch` | 300秒 |
| 公開API | `public` | 30秒 |

### 3. データ変換パターン

```typescript
// snake_case ⇔ camelCase変換
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';

// POST/PUTリクエスト
const requestData = convertCamelToSnake(data);
const response = await client.post('/endpoint', requestData);

// レスポンス処理
return convertSnakeToCamel(response.data.data);
```

### 4. FormData送信パターン

```typescript
const client = createPresetApiClient('upload');
const formData = new FormData();
formData.append('file', file);

const response = await client.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### 5. Blob取得パターン

```typescript
const client = createPresetApiClient('auth');
const response = await client.get('/reports', {
  params,
  responseType: 'blob'
});
return response.data;
```

## 移行時のチェックリスト

1. [ ] API_BASE_URLのハードコーディング削除
2. [ ] fetchの直接使用を排除
3. [ ] createPresetApiClientをインポート
4. [ ] 適切なプリセットを選択
5. [ ] handleApiErrorでエラーハンドリング統一
6. [ ] snake_case/camelCase変換を適用
7. [ ] /api/v1プレフィックスを削除（自動付与されるため）

## 注意事項

- モジュールレベルでクライアントを定義しない（関数内で作成）
- 旧シングルトンパターンは使用禁止
- エラーメッセージは日本語で統一