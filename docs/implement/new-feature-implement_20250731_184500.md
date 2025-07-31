# 新機能実装記録: 経費申請一覧の編集機能追加

**実装日時**: 2025-07-31 18:45:00  
**実装者**: Claude Code  
**ブランチ**: feature/expense-list-edit-action

## 実装内容

### Phase 1: 基本機能実装

#### T1.1: HistoryTableコンポーネントの拡張 ✅
- **結果**: DataTableコンポーネントが既に`format`関数をサポートしているため、追加変更は不要
- **確認内容**: 
  - DataTableColumn型の`format`プロパティでカスタムレンダリングが可能
  - 任意のReactNodeを返却可能

#### T1.2: ExpenseHistoryViewの更新 ✅
**実装内容**:
1. 必要な依存関係をインポート
   ```typescript
   import { useRouter } from 'next/navigation';
   import { IconButton } from '@mui/material';
   import { Edit as EditIcon } from '@mui/icons-material';
   ```

2. ルーターフックの追加
   ```typescript
   const router = useRouter();
   ```

3. アクション列を含むカラム配列の作成
   ```typescript
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

#### T1.3: 基本的な統合テスト 🚧 (進行中)
- 開発サーバーを起動して動作確認中
- 編集ボタンの表示と遷移を確認予定

## 技術的詳細

### アーキテクチャ決定
1. **最小限の変更**: 既存のDataTable/HistoryTableコンポーネントの仕組みを活用
2. **条件付きレンダリング**: ステータスが'draft'の場合のみ編集ボタンを表示
3. **アクセシビリティ**: aria-labelとtitle属性を追加

### パフォーマンス考慮
- `useMemo`でカラム定義をメモ化し、不要な再レンダリングを防止
- ルーターインスタンスを依存配列に含めて適切な更新を保証

## 次のステップ
1. ブラウザでの動作確認
2. 編集ページへの正常な遷移を確認
3. 単体テストの作成
4. E2Eテストの追加

## 課題と対応
- 現時点で特になし

## コミット履歴
- `bb9c0c9`: feat: 経費申請一覧に編集アクション列を追加