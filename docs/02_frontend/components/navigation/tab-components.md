# 共通タブコンポーネント仕様書

## 概要

フロントエンドアプリケーション全体で統一されたタブコンポーネントの実装と使用方法について定義します。
このドキュメントでは、CommonTabPanel コンポーネントとその関連機能について詳述します。

## 目的

- タブUIの実装を全ページで統一
- アクセシビリティ対応の標準化
- メンテナンス性の向上
- デザインシステムの一貫性確保

## コンポーネント一覧

### 1. CommonTabPanel

統一されたタブパネルコンポーネント。全ページで一貫したタブUIを提供します。

#### プロパティ

| プロパティ | 型 | 必須 | デフォルト値 | 説明 |
|-----------|-----|------|-------------|------|
| `children` | `React.ReactNode` | - | - | タブパネル内に表示するコンテンツ |
| `value` | `number` | ✓ | - | 現在選択されているタブのインデックス |
| `index` | `number` | ✓ | - | このタブパネルのインデックス |
| `prefix` | `string` | - | `'common'` | タブのIDプレフィックス（ページ固有の識別子） |
| `padding` | `number` | - | `3` | タブパネル内のパディング値（theme.spacing単位） |

#### 使用例

```tsx
import { CommonTabPanel } from '@/components/common';

// 基本的な使用方法
<CommonTabPanel value={tabIndex} index={0}>
  <Typography>タブ1のコンテンツ</Typography>
</CommonTabPanel>

// プレフィックスとパディングをカスタマイズ
<CommonTabPanel 
  value={tabIndex} 
  index={1} 
  prefix="leave"
  padding={2}
>
  <LeaveForm />
</CommonTabPanel>
```

#### 生成されるHTML構造

```html
<div
  role="tabpanel"
  hidden={value !== index}
  id="{prefix}-tabpanel-{index}"
  aria-labelledby="{prefix}-tab-{index}"
>
  <div class="MuiBox-root css-xxx" style="padding: {padding * 8}px 0;">
    {children}
  </div>
</div>
```

### 2. createA11yProps

アクセシビリティ属性を生成するヘルパー関数。Tabコンポーネントと組み合わせて使用します。

#### 関数シグネチャ

```tsx
createA11yProps(prefix: string) => (index: number) => {
  id: string;
  'aria-controls': string;
}
```

#### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `prefix` | `string` | タブのIDプレフィックス |

#### 戻り値

インデックスを受け取り、以下のプロパティを持つオブジェクトを返す関数：

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| `id` | `{prefix}-tab-{index}` | タブボタンのID |
| `aria-controls` | `{prefix}-tabpanel-{index}` | 対応するタブパネルのID |

#### 使用例

```tsx
import { createA11yProps } from '@/components/common';

const a11yProps = createA11yProps('leave');

<Tabs value={tabIndex} onChange={handleChange}>
  <Tab label="申請フォーム" {...a11yProps(0)} />
  <Tab label="申請履歴" {...a11yProps(1)} />
</Tabs>
```

## ページ別実装例

### 1. 休暇申請ページ

```tsx
import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { CommonTabPanel, createA11yProps } from '@/components/common';

const a11yProps = createA11yProps('leave');

export default function LeavePage() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Box>
      <Tabs value={tabIndex} onChange={handleTabChange}>
        <Tab label="申請フォーム" {...a11yProps(0)} />
        <Tab label="申請履歴" {...a11yProps(1)} />
      </Tabs>

      <CommonTabPanel value={tabIndex} index={0} prefix="leave">
        {/* 申請フォームのコンテンツ */}
      </CommonTabPanel>

      <CommonTabPanel value={tabIndex} index={1} prefix="leave">
        {/* 申請履歴のコンテンツ */}
      </CommonTabPanel>
    </Box>
  );
}
```

### 2. 経費申請ページ

```tsx
import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { CommonTabPanel, createA11yProps } from '@/components/common';

const a11yProps = createA11yProps('expense');

export default function ExpensePage() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Box>
      <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)}>
        <Tab label="経費申請" {...a11yProps(0)} />
        <Tab label="申請履歴" {...a11yProps(1)} />
      </Tabs>

      <CommonTabPanel value={tabIndex} index={0} prefix="expense">
        {/* 経費申請フォーム */}
      </CommonTabPanel>

      <CommonTabPanel value={tabIndex} index={1} prefix="expense">
        {/* 申請履歴 */}
      </CommonTabPanel>
    </Box>
  );
}
```

### 3. プロジェクトページ

```tsx
import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { CommonTabPanel, createA11yProps } from '@/components/common';

const a11yProps = createA11yProps('project');

export default function ProjectPage() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Box>
      <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)}>
        <Tab label="検索可能案件" {...a11yProps(0)} />
        <Tab label="過去参画案件" {...a11yProps(1)} />
        <Tab label="参画予定案件" {...a11yProps(2)} />
      </Tabs>

      <CommonTabPanel value={tabIndex} index={0} prefix="project" padding={2}>
        {/* 検索可能案件 */}
      </CommonTabPanel>

      <CommonTabPanel value={tabIndex} index={1} prefix="project" padding={2}>
        {/* 過去参画案件 */}
      </CommonTabPanel>

      <CommonTabPanel value={tabIndex} index={2} prefix="project" padding={2}>
        {/* 参画予定案件 */}
      </CommonTabPanel>
    </Box>
  );
}
```

## アクセシビリティ対応

### ARIA属性

- `role="tabpanel"`: タブパネルであることを明示
- `aria-labelledby`: 対応するタブボタンのIDを参照
- `id`: 一意なタブパネルID
- `hidden`: 非アクティブなタブパネルを非表示化

### キーボード操作

- **Tab**: フォーカス移動
- **左右矢印キー**: タブ間の移動（MUI Tabsコンポーネントによる）
- **Enter/Space**: タブの選択（MUI Tabsコンポーネントによる）

### スクリーンリーダー対応

- タブとタブパネルの関連付けが適切に行われ、スクリーンリーダーが正しく読み上げます
- `aria-labelledby`によりタブとパネルの関係が明確になります

## 設計思想

### 統一性の確保

- 全ページで同一のタブコンポーネントを使用
- 一貫したデザインとUX
- アクセシビリティ対応の標準化

### 柔軟性の提供

- `prefix`プロパティによるページ固有の識別
- `padding`プロパティによるレイアウト調整
- `children`による自由なコンテンツ配置

### メンテナンス性

- 単一のコンポーネントで全タブ機能を管理
- 修正時の影響範囲を最小化
- TypeScriptによる型安全性

## ベストプラクティス

### 1. prefix の命名規則

```tsx
// ✅ 良い例: ページ名を明確に示す
const a11yProps = createA11yProps('leave');    // 休暇申請ページ
const a11yProps = createA11yProps('expense');  // 経費申請ページ
const a11yProps = createA11yProps('project');  // プロジェクトページ

// ❌ 悪い例: 汎用的すぎる
const a11yProps = createA11yProps('tab');
const a11yProps = createA11yProps('form');
```

### 2. タブの順序管理

```tsx
// ✅ 良い例: 0から連続した番号を使用
<Tab label="タブ1" {...a11yProps(0)} />
<Tab label="タブ2" {...a11yProps(1)} />
<Tab label="タブ3" {...a11yProps(2)} />

<CommonTabPanel value={tabIndex} index={0}>...</CommonTabPanel>
<CommonTabPanel value={tabIndex} index={1}>...</CommonTabPanel>
<CommonTabPanel value={tabIndex} index={2}>...</CommonTabPanel>

// ❌ 悪い例: 不連続な番号
<Tab label="タブ1" {...a11yProps(1)} />
<Tab label="タブ2" {...a11yProps(3)} />
```

### 3. 状態管理

```tsx
// ✅ 良い例: シンプルな状態管理
const [tabIndex, setTabIndex] = useState(0);

const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  setTabIndex(newValue);
};

// タブの状態をURLクエリパラメータと同期する場合
const searchParams = useSearchParams();
const initialTab = parseInt(searchParams.get('tab') || '0');
const [tabIndex, setTabIndex] = useState(initialTab);
```

### 4. エラーハンドリング

```tsx
// ✅ 良い例: タブインデックスの範囲チェック
const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  if (newValue >= 0 && newValue < TAB_COUNT) {
    setTabIndex(newValue);
  }
};
```

## 移行ガイド

### 既存のTabPanelコンポーネントからの移行

#### 1. インポートの変更

```tsx
// 変更前
import { TabPanel } from '@/components/features/leave/TabPanel';

// 変更後
import { CommonTabPanel } from '@/components/common';
```

#### 2. コンポーネントの置換

```tsx
// 変更前
<TabPanel value={value} index={index}>
  {children}
</TabPanel>

// 変更後
<CommonTabPanel value={value} index={index} prefix="leave">
  {children}
</CommonTabPanel>
```

#### 3. a11yPropsの統一

```tsx
// 変更前（各ページで独自実装）
function a11yProps(index: number) {
  return {
    id: `leave-tab-${index}`,
    'aria-controls': `leave-tabpanel-${index}`,
  };
}

// 変更後（共通関数を使用）
import { createA11yProps } from '@/components/common';
const a11yProps = createA11yProps('leave');
```

## トラブルシューティング

### 問題: タブパネルが表示されない

**原因**: `value` と `index` の値が一致していない

**解決方法**:
```tsx
// value と index が一致するタブパネルのみ表示される
<CommonTabPanel value={0} index={0}>表示される</CommonTabPanel>
<CommonTabPanel value={0} index={1}>表示されない</CommonTabPanel>
```

### 問題: アクセシビリティエラー

**原因**: TabとTabPanelのIDが一致していない

**解決方法**:
```tsx
// 同じprefixを使用する
const a11yProps = createA11yProps('leave');

<Tab {...a11yProps(0)} />
<CommonTabPanel prefix="leave" index={0}>...</CommonTabPanel>
```

### 問題: パディングが期待通りでない

**原因**: `padding` プロパティがMUIのtheme.spacing()と連動している

**解決方法**:
```tsx
// padding={2} は theme.spacing(2) = 16px
<CommonTabPanel padding={2}>...</CommonTabPanel>

// カスタムパディングが必要な場合はBoxでラップ
<CommonTabPanel padding={0}>
  <Box sx={{ p: 3 }}>
    {children}
  </Box>
</CommonTabPanel>
```

## 今後の拡張予定

### 1. テーマ対応
- ダークモード対応
- カスタムカラーパレット

### 2. アニメーション
- タブ切り替え時のトランジション
- ローディング状態の表示

### 3. 追加機能
- タブの無効化状態
- タブのバッジ表示
- 縦型タブレイアウト

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2024-06-XX | 1.0.0 | 初版リリース - CommonTabPanel実装 |

---

## 関連ドキュメント

- [フロントエンド仕様書](./frontend-specification.md)
- [共通コンポーネント設計思想](./UI_Design_Guidelines.md)
- [アクセシビリティガイドライン](./frontend-specification.md#アクセシビリティ) 