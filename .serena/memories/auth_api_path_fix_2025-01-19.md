# 認証APIパス重複修正パターン

## 修正日: 2025-01-19

## 問題のパターン
```typescript
// ❌ 誤ったパターン
const client = createPresetApiClient('auth');
client.post('/api/v1/auth/login', data);  // /api/v1が重複
```

## 正しいパターン
```typescript
// ✅ 正しいパターン
const client = createPresetApiClient('auth');
client.post('/auth/login', data);  // 相対パスを使用
```

## 修正箇所
- `frontend/src/lib/api/auth/index.ts`
  - Line 41: `/api/v1/auth/login` → `/auth/login`
  - Line 116: `/api/v1/auth/refresh` → `/auth/refresh`
  - Line 186: `/api/v1/auth/logout` → `/auth/logout`

## 重要な原則
1. `createPresetApiClient('auth')` は内部で `baseURL: http://localhost:8080/api/v1` を設定済み
2. APIパスは相対パス（`/auth/login`）を使用する
3. `/api/v1` プレフィックスは付けない

## 類似の修正
- 2025-01-18: 週報APIで同様の問題を修正（`weeklyReport.ts`）