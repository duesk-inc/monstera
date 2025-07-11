# 共通ページネーションコンポーネント定義書

## 概要

共通ページネーションコンポーネント（`CommonPagination`）は、データ表示におけるページネーション機能を統一し、一貫したユーザー体験を提供するためのコンポーネントです。

## 目的

- フロントエンド全体でのページネーション機能の統一
- 保守性とアクセシビリティの向上
- レスポンシブデザインへの対応
- 開発効率の向上

## コンポーネント一覧

### 1. CommonPagination

**ファイルパス**: `frontend/src/components/common/CommonPagination.tsx`

統一されたページネーション機能を提供するメインコンポーネント。

#### 機能概要

- MUI Paginationをベースとした統一されたページネーション
- ページサイズ選択機能（オプション）
- 総件数表示機能
- アクセシビリティ対応（ARIA属性、キーボードナビゲーション）
- レスポンシブ対応（モバイル最適化）
- ローディング状態とディサブル状態の管理

#### プロパティ定義

```typescript
export interface CommonPaginationProps {
  /** 現在のページ番号 (1ベース) */
  page: number;
  /** 総ページ数 */
  totalPages: number;
  /** 総アイテム数 */
  totalCount: number;
  /** 1ページあたりの表示件数 */
  pageSize: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** ページサイズ変更時のコールバック */
  onPageSizeChange?: (pageSize: number) => void;
  /** ページサイズの選択肢 */
  pageSizeOptions?: number[];
  /** ページサイズセレクターを表示するかどうか */
  showPageSizeSelector?: boolean;
  /** 総件数表示を表示するかどうか */
  showTotalCount?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** 無効化状態 */
  disabled?: boolean;
  /** ページネーションのサイズ */
  size?: 'small' | 'medium' | 'large';
  /** ページネーションの色 */
  color?: 'primary' | 'secondary' | 'standard';
  /** ページネーションの形状 */
  variant?: 'text' | 'outlined';
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}
```

#### プロパティ詳細

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| `page` | `number` | ✅ | - | 現在のページ番号（1から始まる） |
| `totalPages` | `number` | ✅ | - | 総ページ数 |
| `totalCount` | `number` | ✅ | - | 総アイテム数 |
| `pageSize` | `number` | ✅ | - | 1ページあたりの表示件数 |
| `onPageChange` | `function` | ✅ | - | ページ変更時のコールバック関数 |
| `onPageSizeChange` | `function` | ❌ | `undefined` | ページサイズ変更時のコールバック関数 |
| `pageSizeOptions` | `number[]` | ❌ | `[10, 20, 50, 100]` | ページサイズの選択肢 |
| `showPageSizeSelector` | `boolean` | ❌ | `false` | ページサイズセレクターの表示制御 |
| `showTotalCount` | `boolean` | ❌ | `true` | 総件数表示の制御 |
| `loading` | `boolean` | ❌ | `false` | ローディング状態（操作無効化） |
| `disabled` | `boolean` | ❌ | `false` | 無効化状態 |
| `size` | `'small' \| 'medium' \| 'large'` | ❌ | `'medium'` | ページネーションのサイズ |
| `color` | `'primary' \| 'secondary' \| 'standard'` | ❌ | `'primary'` | ページネーションの色テーマ |
| `variant` | `'text' \| 'outlined'` | ❌ | `'text'` | ページネーションの表示形式 |
| `sx` | `SxProps<Theme>` | ❌ | - | Material-UIのsxプロパティ |
| `data-testid` | `string` | ❌ | - | テスト用のID |

#### 基本的な使用方法

```tsx
import { CommonPagination } from '@/components/common';

const MyComponent = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  return (
    <div>
      {/* データ表示部分 */}
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
    </div>
  );
};
```

#### 高度な使用方法（ページサイズ選択付き）

```tsx
import { CommonPagination } from '@/components/common';

const AdvancedListComponent = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // API呼び出しなど
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // ページサイズ変更時は1ページ目に戻る
    // API呼び出しなど
  };

  return (
    <div>
      <MyDataComponent data={data} loading={loading} />
      
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
        pageSizeOptions={[5, 10, 25, 50]}
      />
    </div>
  );
};
```

### 2. PaginationConfig（HistoryTable用）

**ファイルパス**: `frontend/src/components/common/HistoryTable.tsx`

`HistoryTable`コンポーネント内でページネーション機能を設定するためのインターフェース。

#### インターフェース定義

```typescript
export interface PaginationConfig {
  /** ページネーションを有効にするかどうか */
  enabled: boolean;
  /** 現在のページ番号 (1ベース) */
  page: number;
  /** 1ページあたりの表示件数 */
  pageSize: number;
  /** 総アイテム数 */
  totalCount: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** ページサイズ変更時のコールバック */
  onPageSizeChange?: (pageSize: number) => void;
  /** ページサイズの選択肢 */
  pageSizeOptions?: number[];
  /** ページサイズセレクターを表示するかどうか */
  showPageSizeSelector?: boolean;
  /** 総件数表示を表示するかどうか */
  showTotalCount?: boolean;
  /** ページネーションのローディング状態 */
  loading?: boolean;
}
```

#### HistoryTableでの使用方法

```tsx
import { HistoryTable, type PaginationConfig } from '@/components/common';

const HistoryPageComponent = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

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
      pagination={paginationConfig}
      keyField="id"
    />
  );
};
```

## 設計原則

### 1. 統一性
- すべてのリスト系ページで同じページネーション体験
- 一貫したビジュアルデザインとインタラクション

### 2. 再利用性
- 汎用的なプロパティ設計
- 複数のユースケースに対応

### 3. アクセシビリティ
- ARIA属性の適切な設定
- キーボードナビゲーション対応
- スクリーンリーダー対応

### 4. レスポンシブ対応
- モバイルデバイスでの最適化
- 画面サイズに応じたレイアウト調整

### 5. パフォーマンス
- 不要な再レンダリングの回避
- メモ化の適切な使用

## 表示仕様

### デスクトップ表示
```
[1〜10件 / 全100件]    [<<] [<] [1] [2] [3] [4] [5] [>] [>>]    [表示件数 ▼]
```

### モバイル表示
```
        [1〜10件 / 全100件]
    [<<] [<] [1] [2] [3] [>] [>>]
        [表示件数 ▼]
```

### 構成要素
1. **総件数表示**: 現在の表示範囲と総件数を表示
2. **ページネーション本体**: First/Previous/Page Numbers/Next/Last ボタン
3. **ページサイズセレクター**: 表示件数の選択（オプション）

## ユースケース

### 1. 基本的なページネーション
- 通知ページ
- 検索結果ページ

### 2. ページサイズ選択付きページネーション
- 管理者向け一覧ページ
- 大量データの表示ページ

### 3. テーブル内蔵ページネーション
- 申請履歴ページ（HistoryTable使用）
- データテーブルページ

## 実装パターン

### パターン1: DataTable + CommonPagination

```tsx
import { DataTable, CommonPagination } from '@/components/common';
import { Box } from '@mui/material';

const DataTableWithPagination = () => {
  // state management...

  return (
    <Box>
      <DataTable
        data={data}
        columns={columns}
        keyField="id"
        loading={loading}
      />
      <CommonPagination {...paginationProps} />
    </Box>
  );
};
```

### パターン2: HistoryTable（内蔵ページネーション）

```tsx
import { HistoryTable } from '@/components/common';

const HistoryWithPagination = () => {
  const paginationConfig = {
    enabled: true,
    page,
    pageSize,
    totalCount,
    onPageChange: handlePageChange,
  };

  return (
    <HistoryTable
      data={data}
      columns={columns}
      pagination={paginationConfig}
      keyField="id"
    />
  );
};
```

### パターン3: カスタムリスト + CommonPagination

```tsx
import { CommonPagination } from '@/components/common';

const CustomListWithPagination = () => {
  return (
    <>
      <CustomListComponent data={data} />
      <CommonPagination {...paginationProps} />
    </>
  );
};
```

## アクセシビリティ対応

### 実装されている機能
1. **ARIA属性**
   - `aria-label="ページネーション"` でページネーション全体をラベル付け
   - ページボタンには適切なaria-labelが自動設定

2. **キーボードナビゲーション**
   - Tabキーでの要素間移動
   - EnterキーとSpaceキーでのアクション実行

3. **スクリーンリーダー対応**
   - 現在のページ状態の読み上げ
   - 総件数情報の読み上げ

### 推奨事項
1. `data-testid` の設定でテスト容易性を向上
2. ローディング状態の適切な管理
3. エラー状態の適切なハンドリング

## レスポンシブ対応

### ブレークポイント
- **デスクトップ（md以上）**: 横並びレイアウト
- **モバイル（sm以下）**: 縦並びレイアウト

### モバイル最適化
- ページネーションサイズを自動的に`small`に変更
- `siblingCount`と`boundaryCount`を調整してボタン数を制限
- 総件数表示とページサイズセレクターを中央配置

## エラーハンドリング

### 想定されるエラーケース
1. **不正なページ番号**: 1未満またはtotalPagesを超える値
2. **0以下の総件数**: 空データの適切な表示
3. **ネットワークエラー**: ローディング状態の管理

### 対策
1. プロパティバリデーション
2. 境界値の適切な処理
3. エラー状態の適切な表示

## パフォーマンス考慮事項

### 最適化された実装
1. **メモ化**: `React.useMemo`での計算結果キャッシュ
2. **条件レンダリング**: 不要な要素の非表示
3. **イベントハンドラー最適化**: 不要な再レンダリング防止

### 推奨事項
1. ページ変更時のAPI呼び出し最適化
2. 大量データ処理時の仮想化検討
3. ページ遷移状態の適切な管理

## テスト戦略

### 単体テスト項目
1. プロパティの正常値/異常値テスト
2. ページ変更操作のテスト
3. ページサイズ変更操作のテスト
4. レスポンシブ表示のテスト

### 統合テスト項目
1. データテーブルとの連携テスト
2. API呼び出しとの連携テスト
3. ユーザーインタラクションテスト

### E2Eテスト項目
1. ページネーション操作のフローテスト
2. アクセシビリティテスト
3. レスポンシブテスト

## 今後の拡張予定

### 短期的な改善
- [ ] 無限スクロール対応の検討
- [ ] ページネーション設定の永続化
- [ ] カスタムページサイズ入力機能

### 長期的な改善
- [ ] 仮想化による大量データ対応
- [ ] ページネーション履歴機能
- [ ] 高度なフィルタリング連携

## 関連ファイル

### コンポーネントファイル
- `frontend/src/components/common/CommonPagination.tsx` - メインコンポーネント
- `frontend/src/components/common/HistoryTable.tsx` - ページネーション内蔵テーブル
- `frontend/src/components/common/DataTable.tsx` - データテーブル
- `frontend/src/components/common/index.ts` - エクスポート設定

### 実装例
- `frontend/src/app/(authenticated)/(engineer)/notifications/page.tsx` - 通知ページでの使用例

### ドキュメント
- `frontend/docs/pagination-best-practices.md` - ベストプラクティスガイド

---

**作成日**: 2024年12月
**最終更新**: 2024年12月
**責任者**: フロントエンド開発チーム 