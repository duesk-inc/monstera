# ページネーションコンポーネント ベストプラクティス

## 概要

本プロジェクトでは、データ表示におけるページネーション機能を統一するため、`CommonPagination` コンポーネントを標準として採用しています。

## 実装状況

### ✅ 統一済み
- **通知ページ**: `CommonPagination` コンポーネント使用
- **`HistoryTable`**: ページネーション機能内蔵（オプション）

### 🔄 今後の拡張対象
- 経費申請ページ
- 休暇申請ページ
- プロジェクトページ
- その他リスト系ページ

## 使用方法

### 1. CommonPagination（単体使用）

```tsx
import { CommonPagination } from '@/components/common';
import { PAGINATION } from '@/constants/pagination';

const MyListPage = () => {
  const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;

  return (
    <>
      {/* データ表示 */}
      <MyDataComponent data={data} />
      
      {/* ページネーション */}
      <CommonPagination
        page={page}
        totalPages={Math.ceil(totalCount / pageSize)}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        showTotalCount={true}
      />
    </>
  );
};
```

### 2. HistoryTable（ページネーション内蔵）

```tsx
import { HistoryTable, type PaginationConfig } from '@/components/common';
import { PAGINATION } from '@/constants/pagination';

const MyHistoryPage = () => {
  const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;

  const paginationConfig: PaginationConfig = {
    enabled: true,
    page,
    pageSize,
    totalCount,
    onPageChange: setPage,
    showTotalCount: true,
  };

  return (
    <HistoryTable
      data={data}
      columns={columns}
      keyField="id"
      pagination={paginationConfig}
    />
  );
};
```

### 3. DataTable + CommonPagination（推奨パターン）

```tsx
import { DataTable, CommonPagination } from '@/components/common';
import { Box } from '@mui/material';
import { PAGINATION } from '@/constants/pagination';

const MyDataTablePage = () => {
  // ... state management

  return (
    <Box>
      <DataTable
        data={data}
        columns={columns}
        keyField="id"
        loading={loading}
      />
      
      <CommonPagination
        page={page}
        totalPages={Math.ceil(totalCount / pageSize)}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        showPageSizeSelector={true}
        showTotalCount={true}
        loading={loading}
      />
    </Box>
  );
};
```

## 設計原則

### 1. 統一性
- すべてのリスト系ページで同じページネーション体験を提供
- 一貫したビジュアルデザインとユーザビリティ

### 2. 再利用性
- `CommonPagination` コンポーネントは汎用的で再利用可能
- プロップスでカスタマイズ可能

### 3. アクセシビリティ
- ARIA属性の適切な設定
- キーボードナビゲーション対応
- スクリーンリーダー対応

### 4. レスポンシブ対応
- モバイルデバイスでの適切な表示
- 画面サイズに応じたレイアウト調整

## 機能仕様

### CommonPagination プロパティ

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| `page` | `number` | ✅ | - | 現在のページ番号（1ベース） |
| `totalPages` | `number` | ✅ | - | 総ページ数 |
| `totalCount` | `number` | ✅ | - | 総アイテム数 |
| `pageSize` | `number` | ✅ | - | 1ページあたりの表示件数 |
| `onPageChange` | `(page: number) => void` | ✅ | - | ページ変更時のコールバック |
| `onPageSizeChange` | `(pageSize: number) => void` | ❌ | - | ページサイズ変更時のコールバック |
| `pageSizeOptions` | `number[]` | ❌ | `[10, 20, 50, 100]` | ページサイズの選択肢 |
| `showPageSizeSelector` | `boolean` | ❌ | `false` | ページサイズセレクターを表示するか |
| `showTotalCount` | `boolean` | ❌ | `true` | 総件数表示を表示するか |
| `loading` | `boolean` | ❌ | `false` | ローディング状態 |
| `disabled` | `boolean` | ❌ | `false` | 無効化状態 |

### 表示形式

- **総件数表示**: "1〜10件 / 全100件"
- **ページサイズ選択**: "表示件数" セレクトボックス
- **ページネーション**: First/Previous/Next/Last ボタン付き

## 実装ガイドライン

### DO ✅

1. **統一されたページネーションを使用**
   ```tsx
   // ✅ CommonPaginationを使用
   <CommonPagination {...paginationProps} />
   ```

2. **適切なローディング状態の管理**
   ```tsx
   // ✅ ローディング状態を渡す
   <CommonPagination loading={isLoading} {...props} />
   ```

3. **アクセシビリティを考慮**
   ```tsx
   // ✅ テストIDを設定
   <CommonPagination data-testid="my-pagination" {...props} />
   ```

4. **定数の使用**
   ```tsx
   // ✅ 定数を使用
   import { PAGINATION } from '@/constants/pagination';
   const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE);
   ```

### DON'T ❌

1. **MUI Paginationを直接使用しない**
   ```tsx
   // ❌ 直接MUI Paginationを使用
   <Pagination count={10} page={1} onChange={handleChange} />
   ```

2. **独自のページネーション実装を作らない**
   ```tsx
   // ❌ 独自実装
   <CustomPagination {...props} />
   ```

3. **統一性を破る独自スタイルの適用**
   ```tsx
   // ❌ 統一性を破るスタイル
   <CommonPagination sx={{ backgroundColor: 'red' }} {...props} />
   ```

4. **ハードコーディングされた値の使用**
   ```tsx
   // ❌ ハードコーディング
   const [page, setPage] = useState(1);
   const pageSize = 20;
   ```

## 移行ガイド

### 既存実装の移行手順

1. **現在の実装を確認**
   - MUI Paginationの直接使用箇所を特定
   - ページング処理のロジックを確認

2. **CommonPaginationに置き換え**
   - インポートを変更
   - プロップスを適切に設定
   - ページング処理を統一

3. **動作確認**
   - ページ遷移が正常に動作することを確認
   - 既存機能に影響がないことを確認

### 既存コードの例

```tsx
// Before: MUI Paginationの直接使用
import { Pagination } from '@mui/material';

<Pagination 
  count={Math.ceil(totalCount / pageSize)} 
  page={page} 
  onChange={(e, newPage) => setPage(newPage)} 
  color="primary" 
/>

// After: CommonPaginationの使用
import { CommonPagination } from '@/components/common';

<CommonPagination
  page={page}
  totalPages={Math.ceil(totalCount / pageSize)}
  totalCount={totalCount}
  pageSize={pageSize}
  onPageChange={setPage}
  showTotalCount={true}
/>
```

## トラブルシューティング

### よくある問題

1. **ページネーションが表示されない**
   - `totalPages` が1以下の場合は表示されません
   - `showTotalCount={false}` かつ `totalPages <= 1` の場合は表示されません

2. **ページサイズセレクターが表示されない**
   - `showPageSizeSelector={true}` を設定してください
   - `onPageSizeChange` コールバックが必要です

3. **ローディング中もページング操作ができる**
   - `loading={true}` を設定してください

## 今後の拡張予定

- [ ] 経費申請ページでの `HistoryTable` ページネーション有効化
- [ ] 休暇申請ページでの `HistoryTable` ページネーション有効化
- [ ] プロジェクトページでのページネーション実装
- [ ] 無限スクロール対応の検討
- [ ] ページネーション設定の永続化

## 関連ファイル

- `frontend/src/components/common/CommonPagination.tsx` - メインコンポーネント
- `frontend/src/components/common/HistoryTable.tsx` - ページネーション内蔵テーブル
- `frontend/src/app/(authenticated)/(engineer)/notifications/page.tsx` - 実装例
- `frontend/src/components/common/index.ts` - エクスポート設定
- `frontend/src/constants/pagination.ts` - ページネーション定数

## 関連ドキュメント

- [共通テーブルコンポーネント定義書](./table-components.md)
- [ハードコーディング削減 移行ガイド](./hardcoding-migration-guide.md)

---

**最終更新**: 2024年12月
**責任者**: フロントエンド開発チーム