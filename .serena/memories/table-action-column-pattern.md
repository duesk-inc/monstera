# テーブルアクション列実装パターン

## パターン概要
データテーブルに条件付きアクション列を追加する汎用的なパターン

## 実装パターン

### 1. 型定義の拡張
```typescript
interface DataTableColumn<T> {
  id: keyof T | 'actions';
  label: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  format?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
  actions?: TableAction<T>[];
}

interface TableAction<T> {
  icon: React.ReactNode;
  label: string;
  condition?: (item: T) => boolean;
  onClick: (item: T) => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}
```

### 2. アクション列の実装例
```typescript
const columns = useMemo(() => [
  ...baseColumns,
  {
    id: 'actions' as const,
    label: 'アクション',
    align: 'center' as const,
    format: (_, row) => {
      if (row.status === 'draft') {
        return (
          <IconButton
            size="small"
            onClick={() => router.push(`/path/${row.id}/edit`)}
            title="編集"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        );
      }
      return null;
    },
  },
], [router]);
```

## 設計原則
1. **条件付き表示**: conditionプロパティで表示制御
2. **汎用性**: 他のテーブルでも再利用可能
3. **拡張性**: 新しいアクションの追加が容易
4. **セキュリティ**: 表示制御のみ（実際の権限はバックエンド）

## ベストプラクティス
- アクションは最小限に抑える（1-3個程度）
- アイコンは直感的なものを選択
- ツールチップで操作を説明
- モバイル対応を考慮
- キーボードアクセシビリティを確保

## 関連コンポーネント
- `DataTable`: 基本テーブルコンポーネント
- `HistoryTable`: 履歴表示用テーブル
- `IconButton`: Material-UIのアイコンボタン