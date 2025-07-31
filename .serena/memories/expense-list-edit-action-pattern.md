# 経費申請一覧への編集アクション追加パターン

## 概要
経費申請一覧画面に編集ボタンを追加する際の実装パターン。

## 実装方法

### 1. ExpenseHistoryViewの拡張
```typescript
// 必要なインポート
import { useRouter } from 'next/navigation';
import { IconButton } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

// コンポーネント内でルーターを使用
const router = useRouter();

// アクション列を追加したカラム定義
const historyColumns = useMemo(() => {
  const baseColumns = createExpenseHistoryColumns<ExpenseHistoryItem>();
  return [
    ...baseColumns,
    {
      id: 'actions' as keyof ExpenseHistoryItem,
      label: 'アクション',
      align: 'center' as const,
      format: (_: unknown, row: ExpenseHistoryItem) => {
        if (row.status === 'draft') {
          return (
            <IconButton
              size="small"
              onClick={() => router.push(`/expenses/${row.id}/edit`)}
              title="編集"
              aria-label="編集"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          );
        }
        return null;
      },
    },
  ];
}, [router]);
```

### 2. 重要ポイント
- DataTableの`format`プロパティを使用してカスタムレンダリング
- 条件付きレンダリング（`status === 'draft'`）で編集可能性を制御
- アクセシビリティ対応（`aria-label`、`title`）
- `useMemo`でパフォーマンス最適化

### 3. テストの観点
- 編集ボタンが下書き状態の経費のみに表示されること
- クリック時に正しい編集ページへ遷移すること
- アクション列が正しく表示されること