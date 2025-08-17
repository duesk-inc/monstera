# APIクライアント移行Phase 3 - 管理者機能

## 完了日時
2025-08-17 23:30:00

## 移行パターン

### 管理者API共通関数パターン
```typescript
// src/lib/api/admin/index.ts
import { createPresetApiClient } from '@/lib/api';
const adminClient = createPresetApiClient('admin');
const ADMIN_BASE_PATH = '/admin'; // プリセットで/api/v1/adminが自動付与

export const adminGet = async <T>(path: string, params?: any): Promise<T> => {
  const response = await adminClient.get(`${ADMIN_BASE_PATH}${path}`, { params });
  return response.data;
};
```

### 利点
1. **最小限の変更**: index.tsのみ変更で全管理者APIに反映
2. **パス簡略化**: /api/v1/adminプレフィックスが自動付与
3. **一貫性**: 全管理者APIが同じプリセット使用

## 移行実績

### 変更ファイル（4ファイル）
- src/lib/api/admin/index.ts（共通関数）
- src/hooks/admin/useExportJob.ts
- src/hooks/admin/useMonthlySummary.ts
- src/hooks/admin/useUnsubmittedReports.ts

### 影響範囲
- 11の管理者APIモジュール（変更不要）
- 19の管理者フック（3つ以外は変更不要）

## 教訓
- 共通関数パターンは移行を大幅に簡略化
- プリセットによるパス自動付与は有効
- 移行コメント（// Migrated to new API client system）は追跡に有用

## 次のPhase 4への準備
- ビジネスロジックモジュール（約30ファイル）
- 個別のAPIファイルが多いため、移行スクリプトの活用を推奨