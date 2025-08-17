# APIクライアントファクトリパターン

## 設計パターン
### 目的
APIクライアントの生成を統一し、バージョン管理と環境別設定を柔軟に行う

### 実装
```typescript
interface ApiConfig {
  version?: string;
  timeout?: number;
  customPath?: string;
}

export const createApiClient = (config: ApiConfig = {}) => {
  const host = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
  const version = config.version || process.env.NEXT_PUBLIC_API_VERSION || 'v1';
  const basePath = config.customPath || '/api';
  
  const baseURL = `${host}${basePath}/${version}`;
  
  return axios.create({
    baseURL,
    timeout: config.timeout || 30000,
    withCredentials: true,
  });
};
```

## 利点
1. **統一性**: 全APIで同じ実装パターン
2. **柔軟性**: バージョン別、環境別の設定が容易
3. **保守性**: 設定変更が1箇所で完結
4. **拡張性**: 新しいオプションの追加が容易

## 使用例
```typescript
// デフォルト（v1）
const apiClient = createApiClient();

// v2 API
const v2Client = createApiClient({ version: 'v2' });

// カスタムパス
const adminClient = createApiClient({ customPath: '/admin/api' });

// タイムアウト設定
const longClient = createApiClient({ timeout: 60000 });
```

## 環境変数
```bash
NEXT_PUBLIC_API_HOST=http://localhost:8080
NEXT_PUBLIC_API_VERSION=v1
```

## 移行戦略
1. Phase 1: 環境変数の修正（即座）
2. Phase 2: 環境変数の分離（1時間）
3. Phase 3: ハードコード削除（2時間）
4. Phase 4: ファクトリ導入（3時間）

## テスト方法
```typescript
describe('createApiClient', () => {
  it('should create client with default config', () => {
    const client = createApiClient();
    expect(client.defaults.baseURL).toBe('http://localhost:8080/api/v1');
  });
  
  it('should support version override', () => {
    const client = createApiClient({ version: 'v2' });
    expect(client.defaults.baseURL).toBe('http://localhost:8080/api/v2');
  });
});
```