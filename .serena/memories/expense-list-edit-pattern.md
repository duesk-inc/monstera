# 経費申請一覧編集機能パターン

## パターン概要
経費申請一覧画面から直接編集機能へアクセスするパターン

## 実装パターン

### 1. 編集可能条件
```typescript
// 編集可能チェック（バックエンド）
func (e *Expense) CanEdit() bool {
    return e.Status == ExpenseStatusDraft
}
```

### 2. 一覧テーブルへのアクション列追加
```typescript
// HistoryTableにアクション列を追加
export const createExpenseHistoryColumns = (): DataTableColumn[] => [
  // 既存の列...
  { 
    id: 'actions',
    label: 'アクション',
    render: (item) => item.status === 'draft' ? (
      <IconButton onClick={() => router.push(`/expenses/${item.id}/edit`)}>
        <EditIcon />
      </IconButton>
    ) : null
  }
];
```

### 3. 既存APIの活用
- 編集API: `PUT /api/v1/expenses/{id}`
- 編集ページ: `/expenses/[id]/edit`

## 設計原則
1. **条件付き表示**: 編集可能な項目のみにアクションを表示
2. **既存機能の再利用**: 既存の編集ページとAPIを活用
3. **視覚的フィードバック**: 編集可能/不可を明確に区別

## 関連ファイル
- `backend/internal/handler/expense_handler.go` - UpdateExpense
- `backend/internal/service/expense_service.go` - Update
- `frontend/src/components/common/HistoryTable.tsx`
- `frontend/src/app/(authenticated)/(engineer)/expenses/[id]/edit/page.tsx`