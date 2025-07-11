# 共通レイアウトコンポーネント仕様書

## 概要

このドキュメントでは、プロジェクト全体で使用される共通レイアウトコンポーネントの仕様を定義します。これらのコンポーネントは、画面デザインの統一性を保ち、開発効率を向上させることを目的として設計されています。

## 目次

1. [PageContainer](#pagecontainer)
2. [PageHeader](#pageheader)
3. [ContentCard](#contentcard)
4. [SectionHeader](#sectionheader)
5. [TabContainer](#tabcontainer)
6. [FilterBar](#filterbar)
7. [EmptyState](#emptystate)
8. [DetailInfoGrid](#detailinfogrid)
9. [StatusBadge](#statusbadge)

---

## PageContainer

### 概要
ページ全体のコンテナとして使用される基盤コンポーネント。統一されたレイアウトとスペーシングを提供します。

### ファイルパス
`frontend/src/components/common/layout/PageContainer.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| children | ReactNode | - | ✓ | コンテナ内に表示するコンテンツ |
| maxWidth | 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| false | 'lg' | - | コンテナの最大幅 |
| paddingY | number | 4 | - | 上下のパディング（theme.spacing単位） |
| paddingX | number | 2 | - | 左右のパディング（theme.spacing単位） |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### 使用例

```tsx
import { PageContainer } from '@/components/common/layout';

// 基本的な使用
<PageContainer>
  <h1>ページタイトル</h1>
  <p>ページコンテンツ</p>
</PageContainer>

// カスタマイズした使用
<PageContainer maxWidth="md" paddingY={6}>
  <h1>カスタムページ</h1>
</PageContainer>
```

### 特徴
- レスポンシブ対応
- 統一されたコンテナサイズ
- カスタマイズ可能なパディング
- Material-UIのContainerコンポーネントをベースに構築

---

## PageHeader

### 概要
ページのヘッダー部分を統一的に表示するコンポーネント。タイトル、サブタイトル、パンくずリスト、アクションボタンなどを配置できます。

### ファイルパス
`frontend/src/components/common/layout/PageHeader.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| title | string | - | ✓ | ページタイトル |
| subtitle | string | - | - | サブタイトル |
| breadcrumbs | ReactNode | - | - | パンくずリスト |
| actions | ReactNode | - | - | アクションボタンエリア |
| spacing | number | 3 | - | 要素間のスペーシング |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### 使用例

```tsx
import { PageHeader } from '@/components/common/layout';
import { Breadcrumbs, Link } from '@mui/material';
import ActionButton from '@/components/common/ActionButton';

<PageHeader
  title="ダッシュボード"
  subtitle="システムの概要と最新情報"
  breadcrumbs={
    <Breadcrumbs>
      <Link href="/">ホーム</Link>
      <Typography>ダッシュボード</Typography>
    </Breadcrumbs>
  }
  actions={
    <ActionButton buttonType="primary">
      新規作成
    </ActionButton>
  }
/>
```

### 特徴
- レスポンシブレイアウト
- フレキシブルなアクション配置
- 統一されたタイポグラフィ
- パンくずリスト対応

---

## ContentCard

### 概要
コンテンツを表示するためのカードコンポーネント。4つのバリアントを提供し、用途に応じて使い分けできます。

### ファイルパス
`frontend/src/components/common/layout/ContentCard.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| children | ReactNode | - | ✓ | カード内に表示するコンテンツ |
| variant | 'default' \| 'elevated' \| 'outlined' \| 'minimal' | 'default' | - | カードのバリアント |
| padding | number | 3 | - | 内側のパディング |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### バリアント

#### default
- 標準的なカードスタイル
- 軽いシャドウとボーダーラディウス

#### elevated
- より強調されたカードスタイル
- 深いシャドウで浮き上がった印象

#### outlined
- アウトライン付きカードスタイル
- ボーダーで区切られた印象

#### minimal
- ミニマルなカードスタイル
- 背景色のみでシンプル

### 使用例

```tsx
import { ContentCard } from '@/components/common/layout';

// 基本的な使用
<ContentCard>
  <h2>カードタイトル</h2>
  <p>カードコンテンツ</p>
</ContentCard>

// バリアント指定
<ContentCard variant="elevated" padding={4}>
  <h2>重要なコンテンツ</h2>
</ContentCard>
```

### 特徴
- 4つの異なるスタイルバリアント
- カスタマイズ可能なパディング
- 統一されたカードデザイン
- レスポンシブ対応

---

## SectionHeader

### 概要
セクション内のヘッダーを表示するコンポーネント。アイコンやアクションボタンを含めることができます。

### ファイルパス
`frontend/src/components/common/layout/SectionHeader.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| title | string | - | ✓ | セクションタイトル |
| subtitle | string | - | - | サブタイトル |
| icon | ReactNode | - | - | アイコン |
| actions | ReactNode | - | - | アクションボタンエリア |
| variant | 'h4' \| 'h5' \| 'h6' | 'h5' | - | タイトルのバリアント |
| spacing | number | 2 | - | 要素間のスペーシング |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### 使用例

```tsx
import { SectionHeader } from '@/components/common/layout';
import { Settings as SettingsIcon } from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';

<SectionHeader
  title="設定"
  subtitle="システム設定を管理"
  icon={<SettingsIcon />}
  actions={
    <ActionButton buttonType="secondary" size="small">
      編集
    </ActionButton>
  }
/>
```

### 特徴
- アイコン表示対応
- フレキシブルなアクション配置
- 複数のタイトルサイズ
- 統一されたスペーシング

---

## TabContainer

### 概要
タブ付きコンテナを提供するコンポーネント。タブナビゲーションとコンテンツエリアを統合的に管理します。

### ファイルパス
`frontend/src/components/common/layout/TabContainer.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| tabs | TabItem[] | - | ✓ | タブアイテムの配列 |
| value | string \| number | - | ✓ | 現在選択されているタブの値 |
| onChange | (event: SyntheticEvent, newValue: string \| number) => void | - | ✓ | タブ変更時のコールバック |
| children | ReactNode | - | ✓ | タブコンテンツ |
| variant | 'standard' \| 'scrollable' \| 'fullWidth' | 'standard' | - | タブのバリアント |
| headerActions | ReactNode | - | - | ヘッダーエリアのアクション |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### TabItem型

```tsx
interface TabItem {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: ReactNode;
}
```

### 使用例

```tsx
import { TabContainer } from '@/components/common/layout';
import { CommonTabPanel } from '@/components/common';

const tabs = [
  { label: '概要', value: 0 },
  { label: '詳細', value: 1 },
  { label: '設定', value: 2 }
];

<TabContainer
  tabs={tabs}
  value={currentTab}
  onChange={handleTabChange}
>
  <CommonTabPanel value={currentTab} index={0}>
    概要コンテンツ
  </CommonTabPanel>
  <CommonTabPanel value={currentTab} index={1}>
    詳細コンテンツ
  </CommonTabPanel>
  <CommonTabPanel value={currentTab} index={2}>
    設定コンテンツ
  </CommonTabPanel>
</TabContainer>
```

### 特徴
- 統一されたタブデザイン
- レスポンシブ対応
- ヘッダーアクション対応
- 複数のタブバリアント

---

## FilterBar

### 概要
フィルター機能と検索機能を提供するコンポーネント。リスト表示ページで使用されます。

### ファイルパス
`frontend/src/components/common/layout/FilterBar.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| searchValue | string | - | - | 検索フィールドの値 |
| onSearchChange | (value: string) => void | - | - | 検索値変更時のコールバック |
| searchPlaceholder | string | '検索...' | - | 検索フィールドのプレースホルダー |
| filters | FilterItem[] | - | - | フィルターアイテムの配列 |
| onRefresh | () => void | - | - | リフレッシュボタンのコールバック |
| actions | ReactNode | - | - | 追加のアクションボタン |
| spacing | number | 2 | - | 要素間のスペーシング |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### FilterItem型

```tsx
interface FilterItem {
  label: string;
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (value: string | number) => void;
}
```

### 使用例

```tsx
import { FilterBar } from '@/components/common/layout';

const filters = [
  {
    label: 'カテゴリ',
    value: selectedCategory,
    options: [
      { label: '全て', value: 'all' },
      { label: 'システム', value: 'system' },
      { label: 'プロジェクト', value: 'project' }
    ],
    onChange: setSelectedCategory
  }
];

<FilterBar
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="通知を検索..."
  filters={filters}
  onRefresh={handleRefresh}
/>
```

### 特徴
- 検索とフィルターの統合
- レスポンシブレイアウト
- カスタマイズ可能なフィルター
- リフレッシュ機能

---

## EmptyState

### 概要
データが存在しない状態を表示するコンポーネント。適切なメッセージとアクションを提供します。

### ファイルパス
`frontend/src/components/common/layout/EmptyState.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| type | 'noData' \| 'noResults' \| 'error' \| 'loading' | 'noData' | - | 空状態のタイプ |
| title | string | - | - | カスタムタイトル |
| message | string | - | - | カスタムメッセージ |
| icon | ReactNode | - | - | カスタムアイコン |
| action | ReactNode | - | - | アクションボタン |
| size | 'small' \| 'medium' \| 'large' | 'medium' | - | 表示サイズ |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### タイプ別デフォルト設定

#### noData
- アイコン: InboxIcon
- タイトル: "データがありません"
- メッセージ: "表示するデータがありません"

#### noResults
- アイコン: SearchOffIcon
- タイトル: "検索結果がありません"
- メッセージ: "検索条件を変更してお試しください"

#### error
- アイコン: ErrorOutlineIcon
- タイトル: "エラーが発生しました"
- メッセージ: "データの取得に失敗しました"

#### loading
- アイコン: CircularProgress
- タイトル: "読み込み中..."
- メッセージ: "しばらくお待ちください"

### 使用例

```tsx
import { EmptyState } from '@/components/common/layout';
import ActionButton from '@/components/common/ActionButton';

// 基本的な使用
<EmptyState type="noData" />

// カスタマイズした使用
<EmptyState
  type="noResults"
  title="通知がありません"
  message="新しい通知はありません"
  action={
    <ActionButton buttonType="primary">
      設定を確認
    </ActionButton>
  }
/>
```

### 特徴
- 4つの定義済みタイプ
- カスタマイズ可能なコンテンツ
- 統一されたデザイン
- アクションボタン対応

---

## DetailInfoGrid

### 概要
詳細情報を格子状に表示するコンポーネント。ラベルと値のペアを整理して表示します。

### ファイルパス
`frontend/src/components/common/layout/DetailInfoGrid.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| items | DetailInfoItem[] | - | ✓ | 表示する情報アイテムの配列 |
| spacing | number | 2 | - | グリッド間のスペーシング |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### DetailInfoItem型

```tsx
interface DetailInfoItem {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  gridSize?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  valueColor?: string;
  valueFontWeight?: string | number;
}
```

### 使用例

```tsx
import { DetailInfoGrid } from '@/components/common/layout';
import { Person as PersonIcon, Email as EmailIcon } from '@mui/icons-material';

const items = [
  {
    label: '名前',
    value: '田中太郎',
    icon: <PersonIcon fontSize="small" />,
    gridSize: { xs: 12, md: 6 }
  },
  {
    label: 'メールアドレス',
    value: 'tanaka@duesk.co.jp',
    icon: <EmailIcon fontSize="small" />,
    gridSize: { xs: 12, md: 6 }
  },
  {
    label: 'ステータス',
    value: 'アクティブ',
    valueColor: 'success.main',
    valueFontWeight: 'bold',
    gridSize: { xs: 12 }
  }
];

<DetailInfoGrid items={items} spacing={3} />
```

### 特徴
- レスポンシブグリッドレイアウト
- アイコン表示対応
- カスタマイズ可能なスタイリング
- フレキシブルなグリッドサイズ

---

## StatusBadge

### 概要
ステータスを視覚的に表示するバッジコンポーネント。定義済みのステータスタイプとカスタムステータスに対応します。

### ファイルパス
`frontend/src/components/common/layout/StatusBadge.tsx`

### Props

| プロパティ | 型 | デフォルト値 | 必須 | 説明 |
|-----------|----|-----------|----|-----|
| status | StatusType \| string | - | ✓ | ステータス値 |
| variant | 'filled' \| 'outlined' | 'filled' | - | バッジのバリアント |
| size | 'small' \| 'medium' | 'medium' | - | バッジのサイズ |
| customConfig | StatusConfig | - | - | カスタムステータス設定 |
| sx | SxProps<Theme> | - | - | 追加のスタイル |
| data-testid | string | - | - | テスト用ID |

### StatusType

```tsx
type StatusType = 
  | 'pending' | 'approved' | 'rejected' | 'cancelled'
  | 'active' | 'inactive' | 'suspended'
  | 'open' | 'closed' | 'in_progress'
  | 'success' | 'warning' | 'error' | 'info';
```

### StatusConfig型

```tsx
interface StatusConfig {
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  icon?: ReactNode;
  label?: string;
}
```

### 定義済みステータス

| ステータス | カラー | アイコン | ラベル |
|-----------|--------|----------|--------|
| pending | warning | HourglassEmptyIcon | 保留中 |
| approved | success | CheckCircleIcon | 承認済み |
| rejected | error | CancelIcon | 却下 |
| cancelled | error | CancelIcon | キャンセル |
| active | success | CheckCircleIcon | アクティブ |
| inactive | warning | PauseCircleIcon | 非アクティブ |
| suspended | error | BlockIcon | 停止中 |
| open | info | RadioButtonUncheckedIcon | 公開中 |
| closed | error | CancelIcon | 終了 |
| in_progress | primary | PlayCircleIcon | 進行中 |
| success | success | CheckCircleIcon | 成功 |
| warning | warning | WarningIcon | 警告 |
| error | error | ErrorIcon | エラー |
| info | info | InfoIcon | 情報 |

### 使用例

```tsx
import { StatusBadge } from '@/components/common/layout';

// 定義済みステータス
<StatusBadge status="approved" />
<StatusBadge status="pending" variant="outlined" />

// カスタムステータス
<StatusBadge
  status="custom"
  customConfig={{
    color: 'primary',
    icon: <CustomIcon />,
    label: 'カスタム状態'
  }}
/>
```

### 特徴
- 14種類の定義済みステータス
- カスタムステータス対応
- 2つのバリアント（filled/outlined）
- アイコン付きバッジ

---

## 使用ガイドライン

### 1. インポート方法

```tsx
// 個別インポート
import { PageContainer, PageHeader, ContentCard } from '@/components/common/layout';

// 全体インポート
import * as Layout from '@/components/common/layout';
```

### 2. 基本的なページ構成

```tsx
import { 
  PageContainer, 
  PageHeader, 
  ContentCard 
} from '@/components/common/layout';

function MyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="ページタイトル"
        subtitle="ページの説明"
      />
      
      <ContentCard>
        {/* ページコンテンツ */}
      </ContentCard>
    </PageContainer>
  );
}
```

### 3. タブ付きページの構成

```tsx
import { 
  PageContainer, 
  PageHeader, 
  TabContainer 
} from '@/components/common/layout';
import { CommonTabPanel } from '@/components/common';

function TabPage() {
  const [tabIndex, setTabIndex] = useState(0);
  
  const tabs = [
    { label: 'タブ1', value: 0 },
    { label: 'タブ2', value: 1 }
  ];

  return (
    <PageContainer>
      <PageHeader title="タブページ" />
      
      <TabContainer
        tabs={tabs}
        value={tabIndex}
        onChange={(_, newValue) => setTabIndex(newValue)}
      >
        <CommonTabPanel value={tabIndex} index={0}>
          タブ1のコンテンツ
        </CommonTabPanel>
        <CommonTabPanel value={tabIndex} index={1}>
          タブ2のコンテンツ
        </CommonTabPanel>
      </TabContainer>
    </PageContainer>
  );
}
```

### 4. フィルター付きリストページの構成

```tsx
import { 
  PageContainer, 
  PageHeader, 
  FilterBar,
  EmptyState 
} from '@/components/common/layout';

function ListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  return (
    <PageContainer>
      <PageHeader title="リストページ" />
      
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
      />
      
      {data.length === 0 ? (
        <EmptyState type="noData" />
      ) : (
        // データ表示
      )}
    </PageContainer>
  );
}
```

## 注意事項

1. **一貫性の維持**: 同じ用途には同じコンポーネントを使用してください
2. **カスタマイズ**: 必要に応じてsxプロパティでスタイルをカスタマイズできますが、デザインシステムの一貫性を保ってください
3. **アクセシビリティ**: data-testid属性を適切に設定してテストを容易にしてください
4. **レスポンシブ**: すべてのコンポーネントはレスポンシブ対応していますが、コンテンツに応じて適切な設定を行ってください

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2024-06-04 | 1.0.0 | 初版作成 | 