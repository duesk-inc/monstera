# 経費申請画面APIクライアント移行問題

## 問題の概要
`frontend/src/lib/api/expense.ts`が旧形式APIクライアント実装を使用しており、frontend/CLAUDE.mdで定義された新形式仕様に違反している。

## 主な違反内容
1. **独自apiRequest関数**: fetchを直接使用する独自実装
2. **API_BASE_URLハードコーディング**: 環境変数を直接参照
3. **createPresetApiClient未使用**: 新形式APIクライアントを全く使用していない

## 正しい実装パターン
```typescript
// ✅ 新形式（frontend/CLAUDE.md準拠）
import { createPresetApiClient } from '@/lib/api';

export async function getExpenses(params) {
  const client = createPresetApiClient('auth');
  const response = await client.get('/expenses', { params });
  return response.data;
}
```

## 関連ファイル
- 問題: `frontend/src/lib/api/expense.ts`
- 正常: `frontend/src/lib/api/expenseApproverSetting.ts`
- 正常: `frontend/src/lib/api/expenseSummary.ts`
- 正常: `frontend/src/lib/api/expenseLimit.ts`

## 影響範囲
- 経費CRUD操作全般
- 領収書アップロード
- レポート生成
- 承認フロー

## 修正時の注意点
- snake_case/camelCase変換処理の維持
- エラーハンドリングの統一（handleApiError使用）
- アップロード処理は`upload`プリセット使用
- 既存のAPIレスポンスマッピング処理を維持