# APIクライアントアーキテクチャパターン

## 成功パターン（正常動作）
### 実装方法
```typescript
// 1. @/lib/axiosを使用
import apiClient from '@/lib/axios';  // = getAuthClient()

// 2. パスに/api/v1をハードコード
await apiClient.get('/api/v1/weekly-reports');
await apiClient.post('/api/v1/leave/apply');

// 3. または定数でパスを管理
import { SKILL_SHEET_API } from '@/constants/api';
await apiClient.get(SKILL_SHEET_API.GET);  // = '/api/v1/skill-sheet'
```

### 使用実績
- 週報API ✅
- 休暇申請API ✅
- スキルシートAPI ✅
- 管理画面API ✅
- 通知API ✅

## 失敗パターン（404エラー）
### 実装方法
```typescript
// 独自のapiClientを使用
import { apiClient } from './config';

// 相対パスでbaseURLに依存
await apiClient.post('/work-history', data);
// 実際: http://localhost:8080/work-history → 404
```

### 問題の原因
1. 環境変数に`/api/v1`が含まれていない
2. 独自実装のAPIクライアント
3. 相対パスの使用

## 推奨アーキテクチャ
### 統一方針
1. **APIクライアント**: `@/lib/axios` (getAuthClient)のみを使用
2. **パス管理**: `/api/v1`を必ず含める（ハードコードまたは定数）
3. **環境変数**: `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`

### ファイル構成
```
frontend/src/
├── lib/
│   ├── axios.ts         # 統一APIクライアント
│   └── api/
│       └── index.ts     # getAuthClient定義
├── constants/
│   └── api.ts          # APIパス定数（/api/v1含む）
└── [各API実装]         # 全て@/lib/axiosを使用
```

### 削除対象
- `/lib/api/config.ts`のapiClient実装
- 重複するAPI_BASE_URL定義

## 検証方法
```bash
# APIクライアントの使用状況確認
grep -r "from.*@/lib/axios" frontend/src
grep -r "from.*\./config" frontend/src/lib/api

# 環境変数の確認
cat frontend/.env.local | grep NEXT_PUBLIC_API_URL
```