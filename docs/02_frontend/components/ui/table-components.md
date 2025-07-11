# 共通テーブルコンポーネント定義書

## 目次

1. [概要](#概要)
2. [アーキテクチャと設計原則](#アーキテクチャと設計原則)
3. [DataTableコンポーネント](#datatableコンポーネント)
4. [HistoryTableコンポーネント](#historytableコンポーネント)
5. [プリセット列定義](#プリセット列定義)
6. [実装ガイドライン](#実装ガイドライン)
7. [移行ガイド](#移行ガイド)
8. [ベストプラクティス](#ベストプラクティス)
9. [トラブルシューティング](#トラブルシューティング)

## 概要

### 背景と目的

Monsteraプロジェクトでは、フロントエンド全体でのテーブルコンポーネントの統一化を図り、一貫したUI/UX、保守性の向上、開発効率の向上を目指しています。

### 共通テーブルコンポーネントの利点

- **UI/UXの統一**: 全画面で一貫したテーブル表示
- **開発効率向上**: 再利用可能なコンポーネントによる開発時間短縮
- **保守性向上**: 中央集約された実装による変更の影響範囲最小化
- **TypeScript対応**: 型安全なテーブル実装
- **レスポンシブ対応**: モバイル・デスクトップ両対応
- **アクセシビリティ**: ARIA対応とキーボードナビゲーション

### コンポーネント構成

```
共通テーブルコンポーネント
├── DataTable           # 汎用データテーブル
├── HistoryTable        # 申請履歴専用テーブル
├── CommonPagination    # 統一ページネーションコンポーネント
└── プリセット列定義    # 頻繁に使用される列定義
```

## アーキテクチャと設計原則

### 設計原則

1. **単一責任の原則**: 各コンポーネントは明確な責任を持つ
2. **拡張性**: 新しい要件に柔軟に対応可能
3. **型安全性**: TypeScriptによる厳格な型チェック
4. **再利用性**: 複数の画面で利用可能
5. **アクセシビリティ**: WCAG 2.1準拠

### コンポーネント階層

```
DataTable (基底コンポーネント)
    ↓ 拡張・特化
HistoryTable (申請履歴特化)
    ↓ 活用
プリセット列定義 (頻用パターン)
```

## DataTableコンポーネント

### 基本概要

`DataTable`は汎用的なデータテーブルコンポーネントで、あらゆる種類のテーブル表示に使用できます。

### Props仕様

```typescript
export interface DataTableProps<T = Record<string, unknown>> {
  columns: DataTableColumn<T>[];      // 列定義（必須）
  data: T[];                          // データ配列（必須）
  keyField: keyof T;                  // 一意キーフィールド（必須）
  loading?: boolean;                  // ローディング状態
  emptyMessage?: string;              // 空データ時メッセージ
  onRowClick?: (row: T) => void;      // 行クリックハンドラ
  stickyHeader?: boolean;             // ヘッダー固定
  maxHeight?: number | string;        // 最大高さ
  minWidth?: number;                  // 最小幅
  variant?: 'elevation' | 'outlined'; // Paper variant
  sx?: SxProps<Theme>;               // スタイリング
}

export interface DataTableColumn<T = Record<string, unknown>> {
  id: keyof T;                        // データフィールドID
  label: string;                      // 列ヘッダーラベル
  align?: 'left' | 'center' | 'right'; // セル配置
  minWidth?: number;                  // 最小幅
  format?: (value: T[keyof T], row: T) => React.ReactNode; // カスタムフォーマット
  sortable?: boolean;                 // ソート可能（将来拡張）
}
```

### 基本使用例

```typescript
import { DataTable, DataTableColumn } from '@/components/common/DataTable';

// データ型定義
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

// 列定義
const columns: DataTableColumn<User>[] = [
  { id: 'name', label: '名前' },
  { id: 'email', label: 'メールアドレス' },
  { 
    id: 'createdAt', 
    label: '作成日',
    format: (value) => format(new Date(value), 'yyyy/MM/dd')
  },
];

// コンポーネント実装
export const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <DataTable<User>
      columns={columns}
      data={users}
      keyField="id"
      loading={loading}
      emptyMessage="ユーザーが見つかりません"
      onRowClick={(user) => console.log('選択:', user)}
      variant="outlined"
      sx={{ minWidth: 650 }}
    />
  );
};
```

### レスポンシブ対応

```typescript
// モバイル対応の列定義例
const responsiveColumns: DataTableColumn<User>[] = [
  { id: 'name', label: '名前', minWidth: 120 },
  { 
    id: 'email', 
    label: 'メール', 
    minWidth: 200,
    format: (value) => (
      <Typography variant="body2" noWrap title={String(value)}>
        {String(value)}
      </Typography>
    )
  },
];
```

### カスタムフォーマットの活用

```typescript
const advancedColumns: DataTableColumn<User>[] = [
  {
    id: 'status',
    label: 'ステータス',
    format: (value) => (
      <Chip 
        label={value} 
        color={value === 'active' ? 'success' : 'default'}
        size="small"
      />
    )
  },
  {
    id: 'actions',
    label: '操作',
    format: (_, row) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <ActionButton buttonType="ghost" size="small">
          編集
        </ActionButton>
        <ActionButton buttonType="danger" size="small">
          削除
        </ActionButton>
      </Box>
    )
  },
];
```

## HistoryTableコンポーネント

### 基本概要

`HistoryTable`は申請履歴表示に特化したテーブルコンポーネントで、日付フォーマット、ステータス表示、処理日の自動表示などの機能を内蔵しています。

### Props仕様

```typescript
export interface HistoryItem {
  id: string | number;           // 一意ID
  date: Date | string;          // 申請日
  status: string;               // ステータス
  processedAt?: Date | string | null; // 処理日（オプション）
  [key: string]: unknown;       // その他フィールド
}

export interface PaginationConfig {
  enabled: boolean;                       // ページネーション有効化
  page: number;                          // 現在のページ
  pageSize: number;                      // ページサイズ
  totalCount: number;                    // 総件数
  onPageChange: (page: number) => void;  // ページ変更ハンドラ
  onPageSizeChange?: (size: number) => void; // ページサイズ変更ハンドラ
  showTotalCount?: boolean;              // 総件数表示
  showPageSizeSelector?: boolean;        // ページサイズ選択
}

export interface HistoryTableProps<T extends HistoryItem> extends Omit<DataTableProps<T>, 'columns'> {
  columns: DataTableColumn<T>[];          // 列定義
  dateFormat?: string;                    // 日付フォーマット
  statusConverter?: (status: string) => ApplicationStatus; // ステータス変換
  showProcessedDate?: boolean;            // 処理日表示制御
  processedDateLabel?: string;            // 処理日列ラベル
  pagination?: PaginationConfig;          // ページネーション設定
}
```

### 基本使用例

```typescript
import { HistoryTable, createExpenseHistoryColumns } from '@/components/common/HistoryTable';
import { ApplicationStatus } from '@/components/common/StatusChip';

// データ型定義（HistoryItemを拡張）
interface ExpenseHistoryItem extends HistoryItem {
  category: string;
  amount: number;
  processedAt: Date | null;
}

// ステータス変換関数
const statusConverter = (status: string): ApplicationStatus => {
  switch (status) {
    case 'approved': return 'approved';
    case 'pending': return 'pending';
    case 'rejected': return 'rejected';
    default: return 'pending';
  }
};

// コンポーネント実装
export const ExpenseHistory = () => {
  const [history, setHistory] = useState<ExpenseHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  
  // プリセット列定義を使用
  const columns = createExpenseHistoryColumns<ExpenseHistoryItem>();

  // ページネーション設定
  const paginationConfig: PaginationConfig = {
    enabled: true,
    page,
    pageSize,
    totalCount,
    onPageChange: setPage,
    showTotalCount: true,
  };

  return (
    <HistoryTable<ExpenseHistoryItem>
      data={history}
      columns={columns}
      keyField="id"
      emptyMessage="経費申請履歴がありません"
      statusConverter={statusConverter}
      showProcessedDate={true}
      processedDateLabel="処理日"
      dateFormat="yyyy/MM/dd"
      pagination={paginationConfig}
      variant="outlined"
      sx={{ minWidth: 650 }}
    />
  );
};
```

### 自動機能

1. **日付フォーマット**: `date`フィールドを自動でフォーマット
2. **ステータス表示**: `StatusChip`コンポーネントを自動適用
3. **処理日表示**: `processedAt`列を自動追加（オプション）
4. **空データ処理**: 専用の空メッセージ表示

## プリセット列定義

### 概要

頻繁に使用される列定義をプリセットとして提供し、開発効率と一貫性を向上します。

### 利用可能なプリセット

#### 1. 基本申請履歴列

```typescript
import { createHistoryColumns } from '@/components/common/HistoryTable';

const columns = createHistoryColumns<MyHistoryItem>();
// 生成される列: [申請日, ステータス]
```

#### 2. 経費申請履歴列

```typescript
import { createExpenseHistoryColumns } from '@/components/common/HistoryTable';

const columns = createExpenseHistoryColumns<ExpenseHistoryItem>();
// 生成される列: [申請日, カテゴリ, 金額, 状態]
```

#### 3. 休暇申請履歴列

```typescript
import { createLeaveHistoryColumns } from '@/components/common/HistoryTable';

const columns = createLeaveHistoryColumns<LeaveHistoryItem>();
// 生成される列: [申請日, 休暇種別, 休暇日, ステータス]
```

### カスタマイズ例

```typescript
// プリセットをベースにカスタマイズ
const customColumns = [
  ...createExpenseHistoryColumns<ExpenseHistoryItem>(),
  {
    id: 'reason',
    label: '理由',
    format: (value) => (
      <Typography variant="body2" noWrap title={String(value)}>
        {String(value)}
      </Typography>
    )
  }
];
```

## 実装ガイドライン

### 1. 新規テーブル実装時

#### Step 1: データ型定義

```typescript
// HistoryTableを使用する場合
interface MyHistoryItem extends HistoryItem {
  customField: string;
  // 追加フィールド
}

// DataTableを使用する場合
interface MyDataItem {
  id: string;
  name: string;
  // 任意のフィールド
}
```

#### Step 2: 列定義作成

```typescript
// プリセットを活用
const columns = createExpenseHistoryColumns<MyHistoryItem>();

// または手動定義
const columns: DataTableColumn<MyDataItem>[] = [
  { id: 'name', label: '名前' },
  { 
    id: 'status', 
    label: 'ステータス',
    format: (value) => <StatusChip status={value as ApplicationStatus} />
  },
];
```

#### Step 3: コンポーネント実装

```typescript
export const MyTableComponent = () => {
  const [data, setData] = useState<MyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 申請履歴の場合
  return (
    <HistoryTable<MyHistoryItem>
      data={data}
      columns={columns}
      keyField="id"
      loading={loading}
      statusConverter={myStatusConverter}
    />
  );
};
```

### 2. 既存テーブルの移行

#### Before: MUI Table直接使用

```typescript
// 移行前（非推奨）
<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>申請日</TableCell>
        <TableCell>ステータス</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {data.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{format(row.date, 'yyyy/MM/dd')}</TableCell>
          <TableCell>
            <StatusChip status={convertStatus(row.status)} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

#### After: 共通コンポーネント使用

```typescript
// 移行後（推奨）
<HistoryTable<MyHistoryItem>
  data={data}
  columns={createHistoryColumns<MyHistoryItem>()}
  keyField="id"
  statusConverter={convertStatus}
  dateFormat="yyyy/MM/dd"
/>
```

### 3. 型安全性の確保

```typescript
// 正しい型定義の例
interface StrictExpenseItem extends HistoryItem {
  category: 'transportation' | 'meal' | 'accommodation';
  amount: number;
  receiptUrl?: string;
}

// 列定義での型安全性
const typedColumns: DataTableColumn<StrictExpenseItem>[] = [
  {
    id: 'category', // TypeScriptが型チェック
    label: 'カテゴリ',
    format: (value) => getCategoryLabel(value) // valueの型が推論される
  },
];
```

## 移行ガイド

### 段階的移行戦略

#### Phase 1: 新規実装での採用
- 新しく作成するテーブルは必ず共通コンポーネントを使用
- プリセット列定義の活用

#### Phase 2: 既存テーブルの順次移行
1. **経費申請画面** ✅ 完了
2. **プロジェクト画面** - DataTable活用で改善済み
3. **休暇申請画面** - 複合データ構造のため要検討
4. **その他画面** - 順次対応

#### Phase 3: 統一化完了
- 全画面での共通コンポーネント使用
- MUI Table直接使用の廃止

### 移行チェックリスト

- [ ] データ型がHistoryItem互換かの確認
- [ ] 既存の列定義の共通コンポーネント対応確認
- [ ] ステータス変換ロジックの移行
- [ ] 日付フォーマットの統一
- [ ] レスポンシブ対応の確認
- [ ] エラーハンドリングの移行
- [ ] テストケースの更新

## ベストプラクティス

### 1. パフォーマンス最適化

```typescript
// useMemoを活用した列定義の最適化
const columns = useMemo(() => 
  createExpenseHistoryColumns<ExpenseHistoryItem>(), 
  []
);

// 大量データの仮想化（将来拡張）
const VirtualizedTable = () => {
  return (
    <DataTable
      data={largeDataset}
      columns={columns}
      keyField="id"
      maxHeight={400} // 高さ制限でスクロール
    />
  );
};
```

### 2. エラーハンドリング

```typescript
const TableWithErrorHandling = () => {
  const [data, setData] = useState<ExpenseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <Alert severity="error">
        データの読み込みに失敗しました: {error}
      </Alert>
    );
  }

  return (
    <HistoryTable<ExpenseHistoryItem>
      data={data}
      columns={columns}
      keyField="id"
      loading={loading}
      emptyMessage="データがありません"
    />
  );
};
```

### 3. アクセシビリティ対応

```typescript
// ARIA対応の実装例
<HistoryTable<ExpenseHistoryItem>
  data={data}
  columns={columns}
  keyField="id"
  onRowClick={(row) => {
    // キーボードナビゲーション対応
    announce(`${row.category}の申請を選択しました`);
  }}
  sx={{
    '& .MuiTableRow-root': {
      '&:focus': {
        outline: '2px solid',
        outlineColor: 'primary.main',
      },
    },
  }}
/>
```

### 4. 国際化対応

```typescript
// 多言語対応の列定義
const getLocalizedColumns = (t: TFunction) => [
  { id: 'date', label: t('table.applicationDate') },
  { id: 'status', label: t('table.status') },
  { id: 'amount', label: t('table.amount') },
];
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 型エラー: 'Property does not exist on type'

```typescript
// 問題: フィールドが型定義に存在しない
interface MyItem extends HistoryItem {
  customField: string;
}

// 解決: 型定義を正しく拡張
const columns: DataTableColumn<MyItem>[] = [
  { id: 'customField', label: 'カスタム' }, // 型チェック通過
];
```

#### 2. データが表示されない

```typescript
// 確認事項
// 1. keyFieldが正しく設定されているか
<DataTable keyField="id" /> // dataの各アイテムにidフィールドが存在するか

// 2. データ形式が正しいか
const data = [
  { id: 1, name: 'test' }, // keyFieldに対応するフィールドが必要
];

// 3. loading状態が正しく管理されているか
const [loading, setLoading] = useState(false); // 初期値をfalseに
```

#### 3. ステータス表示が正しくない

```typescript
// ステータス変換関数の確認
const statusConverter = (status: string): ApplicationStatus => {
  // すべてのstatusパターンをハンドリング
  switch (status) {
    case 'approved': return 'approved';
    case 'pending': return 'pending';
    case 'rejected': return 'rejected';
    default: 
      console.warn(`未知のステータス: ${status}`);
      return 'pending';
  }
};
```

#### 4. レスポンシブ対応の問題

```typescript
// モバイル対応の改善
<DataTable
  minWidth={300} // モバイル向けに最小幅を調整
  sx={{
    '& .MuiTableCell-root': {
      padding: { xs: 1, md: 2 }, // モバイルでパディング調整
      fontSize: { xs: '0.875rem', md: '1rem' },
    },
  }}
/>
```

### デバッグ方法

```typescript
// 開発環境でのデバッグログ
const DebugTable = () => {
  console.log('Table data:', data);
  console.log('Table columns:', columns);
  
  return (
    <HistoryTable
      data={data}
      columns={columns}
      // ... other props
    />
  );
};
```

---

## ページネーション統合

### CommonPaginationコンポーネント

共通テーブルコンポーネントと統合されたページネーション機能を提供します。

#### 基本使用例

```typescript
import { DataTable, CommonPagination } from '@/components/common';

const MyTableWithPagination = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

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
        onPageChange={setPage}
        showTotalCount={true}
      />
    </Box>
  );
};
```

#### HistoryTableとの統合

```typescript
// HistoryTableでページネーションを有効化
const paginationConfig: PaginationConfig = {
  enabled: true,
  page,
  pageSize,
  totalCount,
  onPageChange: handlePageChange,
  showTotalCount: true,
  showPageSizeSelector: true,
  onPageSizeChange: handlePageSizeChange,
};

<HistoryTable
  data={paginatedData}
  columns={columns}
  keyField="id"
  pagination={paginationConfig}
/>
```

### ページネーションベストプラクティス

1. **統一性**: すべてのリスト系ページで`CommonPagination`を使用
2. **総件数表示**: ユーザーがデータ全体の規模を把握できるよう`showTotalCount={true}`を推奨
3. **ページサイズ変更**: データ量が多い場合は`showPageSizeSelector={true}`を検討
4. **レスポンシブ対応**: モバイルでも適切に表示されることを確認

詳細は[ページネーションコンポーネント ベストプラクティス](./pagination-best-practices.md)を参照してください。

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2024/12/XX | 1.1.0 | CommonPaginationとの統合を追加 |
| 2024/12/XX | 1.0.0 | 初版作成 |

---

この定義書は共通テーブルコンポーネントの利用を促進し、Monsteraプロジェクト全体でのテーブル統一化を支援します。 