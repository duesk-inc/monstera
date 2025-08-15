# 経費申請履歴機能削除計画

## 概要
2025年1月15日に策定された、プロフィール画面から経費申請履歴機能を削除するリファクタリング計画。

## 削除対象
1. **完全削除**
   - `frontend/src/components/profile/ExpenseProfileSection.tsx`

2. **部分修正**
   - `frontend/src/components/features/profile/ProfileTabbedContent.tsx`
     - WalletIconのimport削除
     - ExpenseProfileSectionのimport削除
     - 経費申請履歴タブ定義削除（line 79-87）
     - 経費申請履歴タブパネル削除（line 144-149）

## 実装フェーズ
- **Phase 1**: コード削除と修正（15分）
- **Phase 2**: ビルドとテスト（10分）
- **Phase 3**: クリーンアップ（5分）

## 注意事項
- `useExpenseSummary`と`expenseSummary.ts`は他機能でも使用されているため削除しない
- `ExpenseSummaryCard`も同様に削除しない
- 削除後は必ずTypeScriptの型チェックとビルドテストを実行

## ロールバック手順
```bash
git checkout -- frontend/src/components/features/profile/ProfileTabbedContent.tsx
git checkout -- frontend/src/components/profile/ExpenseProfileSection.tsx
```

## 計画ファイル
`docs/plan/refactor-plan_20250115_remove_expense_history.md`