# UI/UX改善実装パターン

## 視覚的フィードバック

### 1. DataTableコンポーネントの拡張
```typescript
// DataTablePropsに追加
getRowStyles?: (row: T) => SxProps<Theme>;
getRowClassName?: (row: T) => string;

// TableRowで使用
<TableRow
  className={getRowClassName?.(row)}
  sx={{
    ...defaultStyles,
    ...(getRowStyles?.(row) || {}),
  }}
>
```

### 2. 編集可能行の強調表示
```typescript
const getRowStyles = (row: ItemType) => ({
  ...(row.status === 'draft' && {
    backgroundColor: 'primary.50',
    '&:hover': {
      backgroundColor: 'primary.100',
    },
  }),
});
```

## レスポンシブ対応

### 1. モバイル検出
```typescript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
```

### 2. タッチターゲット最適化
```typescript
<IconButton
  size={isMobile ? "medium" : "small"}
  sx={{
    ...(isMobile && {
      minWidth: 48,
      minHeight: 48,
    }),
  }}
>
```

### 3. タッチフィードバック
```typescript
'@media (hover: none)': {
  '&:active': {
    transform: 'scale(0.95)',
    backgroundColor: 'action.selected',
  },
}
```

## アクセシビリティ

### 1. キーボードナビゲーション
```typescript
<IconButton
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  }}
>
```

### 2. フォーカス表示
```typescript
'&:focus, &:focus-visible': {
  outline: '2px solid',
  outlineColor: 'primary.main',
  outlineOffset: 2,
}
```

### 3. 具体的なaria-label
```typescript
aria-label={`${item.title || 'アイテム'}を編集`}
title={`${item.title || 'アイテム'}を編集`}
```

## パフォーマンス考慮
- useMemoでカラム定義をメモ化
- 依存配列に必要な値を含める（router, isMobile等）
- 条件付きレンダリングで不要な計算を回避