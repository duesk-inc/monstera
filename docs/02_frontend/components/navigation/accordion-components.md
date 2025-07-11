# 共通アコーディオンコンポーネント定義書

## 概要

フロントエンドアプリケーション全体で使用される統一されたアコーディオンコンポーネントです。従来、各ページで個別のアコーディオン実装（ProfileAccordion、DailyRecordAccordionなど）が存在していましたが、デザインの一貫性とコード再利用性の向上のため、統一アコーディオンコンポーネントシステムを導入しました。

## 設計原則

### 1. 一貫性
- すべてのアコーディオンで統一されたアニメーション（300ms ease-in-out）
- 統一されたデザインパターンとスタイリング
- 一貫したキーボードナビゲーション
- 標準化されたアクセシビリティ対応

### 2. 再利用性
- 4つのバリアント（card、minimal、outlined、custom）で幅広いユースケースに対応
- プロパティによる柔軟なカスタマイズ
- 外部制御・内部制御の両方に対応
- TypeScriptによる型安全性

### 3. アクセシビリティ
- ARIA属性の完全対応（aria-expanded、aria-label等）
- キーボードナビゲーション（Enter、Space）対応
- スクリーンリーダー対応
- フォーカス管理

### 4. パフォーマンス
- 軽量な実装
- 不要な再レンダリングの回避
- スムーズなアニメーション
- 条件付きレンダリング

## コンポーネント仕様

### CommonAccordion

**用途**: 展開・収納可能なコンテンツ表示の統一コンポーネント

#### 特徴
- 4種類のバリアント対応
- カスタムヘッダー機能
- ローディング・エラー状態の内蔵
- アニメーション設定のカスタマイズ
- 外部制御・内部制御の切り替え可能

#### Props仕様

```typescript
interface CommonAccordionProps {
  /** アコーディオンのタイトル */
  title: string;
  /** タイトル横のアイコン */
  icon?: React.ReactNode;
  /** カスタムヘッダーコンテンツ */
  customHeader?: React.ReactNode;
  /** 子要素（コンテンツ） */
  children: React.ReactNode;
  /** 初期展開状態 */
  defaultExpanded?: boolean;
  /** 展開状態の外部制御 */
  expanded?: boolean;
  /** 展開状態変更時のコールバック */
  onToggle?: (expanded: boolean) => void;
  /** 無効化状態 */
  disabled?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string | null;
  /** アコーディオンのバリアント */
  variant?: 'card' | 'minimal' | 'outlined' | 'custom';
  /** アニメーション設定 */
  animation?: {
    duration?: number;
    easing?: string;
  };
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** ヘッダー部分のカスタムスタイル */
  headerSx?: SxProps<Theme>;
  /** コンテンツ部分のカスタムスタイル */
  contentSx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
  /** アクセシビリティ用のaria-label */
  'aria-label'?: string;
}
```

## バリアント仕様

### 1. card（デフォルト）
**用途**: 一般的な情報表示用アコーディオン

**特徴**:
- MUIのCardベース
- ボックスシャドウ付き
- 統一されたborderRadius（8px）
- アイコン付きヘッダー対応

**使用例**:
```typescript
<CommonAccordion
  title="基本プロフィール"
  icon={<PersonIcon />}
  variant="card"
>
  <Typography>プロフィール内容</Typography>
</CommonAccordion>
```

### 2. minimal
**用途**: フォーム内のセクション区切り（ProfileFormContent互換）

**特徴**:
- ボーダーのみのシンプルデザイン
- ホバー時の背景色変更
- コンパクトなヘッダー
- フォーム要素との統合性重視

**使用例**:
```typescript
<CommonAccordion
  title="職務経歴 #1"
  variant="minimal"
  expanded={isExpanded}
  onToggle={setIsExpanded}
>
  <TextField label="プロジェクト名" />
  {/* その他のフォーム要素 */}
</CommonAccordion>
```

### 3. outlined
**用途**: アウトライン表示が必要な場合（ProfileAccordion互換）

**特徴**:
- アウトラインボーダー
- ボックスシャドウなし
- 軽量な外観
- 情報グループ化に最適

**使用例**:
```typescript
<CommonAccordion
  title="職務経歴"
  icon={<WorkIcon />}
  variant="outlined"
  defaultExpanded={true}
>
  <Box sx={{ p: 2 }}>
    <Typography>職務経歴の詳細</Typography>
  </Box>
</CommonAccordion>
```

### 4. custom
**用途**: 完全カスタムヘッダーが必要な場合（DailyRecordAccordion互換）

**特徴**:
- customHeaderプロパティでヘッダーを完全制御
- 複雑なレイアウト対応
- 既存コンポーネントとの互換性優先
- スタイルの外部制御

**使用例**:
```typescript
const customHeader = (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
    <Typography variant="h6">カスタムヘッダー</Typography>
    <Chip label="ステータス" color="primary" />
  </Box>
);

<CommonAccordion
  title="" // カスタムヘッダー使用時は空文字
  customHeader={customHeader}
  variant="custom"
  expanded={isExpanded}
  onToggle={setIsExpanded}
>
  <Box sx={{ p: 2 }}>
    <Typography>カスタムコンテンツ</Typography>
  </Box>
</CommonAccordion>
```

## 制御モード

### 1. 内部制御モード（Uncontrolled）
**用途**: 単純なアコーディオン

```typescript
<CommonAccordion
  title="自動制御アコーディオン"
  defaultExpanded={false}
>
  <Typography>コンテンツ</Typography>
</CommonAccordion>
```

### 2. 外部制御モード（Controlled）
**用途**: 複数アコーディオンの協調動作、状態管理が必要な場合

```typescript
const [expanded, setExpanded] = useState(false);

<CommonAccordion
  title="外部制御アコーディオン"
  expanded={expanded}
  onToggle={setExpanded}
>
  <Typography>コンテンツ</Typography>
</CommonAccordion>
```

## 状態管理

### ローディング状態
```typescript
<CommonAccordion
  title="データ読み込み中"
  loading={true}
>
  <Typography>読み込み完了後に表示される内容</Typography>
</CommonAccordion>
```

### エラー状態
```typescript
<CommonAccordion
  title="エラーが発生しました"
  error="データの取得に失敗しました"
>
  <Typography>正常時のコンテンツ</Typography>
</CommonAccordion>
```

### 無効化状態
```typescript
<CommonAccordion
  title="無効化されたアコーディオン"
  disabled={true}
>
  <Typography>無効化時は展開できません</Typography>
</CommonAccordion>
```

## アニメーション設定

### デフォルト設定
```typescript
{
  duration: 300,
  easing: 'ease-in-out'
}
```

### カスタムアニメーション
```typescript
<CommonAccordion
  title="カスタムアニメーション"
  animation={{
    duration: 500,
    easing: 'ease-out'
  }}
>
  <Typography>ゆっくりと展開されるコンテンツ</Typography>
</CommonAccordion>
```

## アクセシビリティ機能

### キーボードナビゲーション
- **Enter**: アコーディオンの展開/収納
- **Space**: アコーディオンの展開/収納
- **Tab**: フォーカス移動

### ARIA属性
- `role="button"`: ヘッダーがボタンとして機能
- `aria-expanded`: 展開状態の通知
- `aria-label`: スクリーンリーダー用の説明
- `tabindex`: キーボードフォーカス制御

### 実装例
```typescript
<CommonAccordion
  title="アクセシブルなアコーディオン"
  aria-label="詳細情報を表示・非表示する"
  data-testid="accessible-accordion"
>
  <Typography>アクセシブルなコンテンツ</Typography>
</CommonAccordion>
```

## スタイルカスタマイズ

### 基本スタイルのオーバーライド
```typescript
<CommonAccordion
  title="カスタムスタイル"
  sx={{
    borderRadius: 4,
    backgroundColor: '#f5f5f5'
  }}
  headerSx={{
    backgroundColor: '#e0e0e0'
  }}
  contentSx={{
    padding: 3
  }}
>
  <Typography>カスタマイズされたコンテンツ</Typography>
</CommonAccordion>
```

## 既存コンポーネントからの移行

### ProfileAccordion → CommonAccordion
**Before:**
```typescript
<ProfileAccordion sections={sections} />
```

**After:**
```typescript
<CommonAccordion
  title="基本プロフィール"
  icon={<PersonIcon />}
  variant="outlined"
  defaultExpanded={true}
>
  {/* セクション内容 */}
</CommonAccordion>
```

### DailyRecordAccordion → CommonAccordion
**Before:**
```typescript
<DailyRecordAccordion
  record={record}
  isExpanded={expanded}
  onToggleExpand={toggle}
/>
```

**After:**
```typescript
<CommonAccordion
  title=""
  customHeader={customHeaderComponent}
  variant="custom"
  expanded={expanded}
  onToggle={toggle}
>
  {/* 記録入力フォーム */}
</CommonAccordion>
```

### ProfileFormContent内アコーディオン → CommonAccordion
**Before:**
```typescript
<Box sx={{ border: '1px solid #d1d9e0' }}>
  <Box onClick={handleToggle}>
    <Typography>{title}</Typography>
  </Box>
  {expanded && <Box>{content}</Box>}
</Box>
```

**After:**
```typescript
<CommonAccordion
  title={title}
  variant="minimal"
  expanded={expanded}
  onToggle={setExpanded}
>
  {content}
</CommonAccordion>
```

## 使用ガイドライン

### 推奨パターン

1. **単純な情報表示**: `variant="card"`
2. **フォーム内セクション**: `variant="minimal"`
3. **軽量表示**: `variant="outlined"`
4. **複雑なヘッダー**: `variant="custom"`

### 非推奨パターン

1. **MUIのAccordionコンポーネントの直接使用**
2. **カスタムアコーディオンの個別実装**
3. **一貫性のないアニメーション設定**

### パフォーマンス考慮事項

1. **大量のアコーディオン**: 仮想化の検討
2. **重いコンテンツ**: 遅延ローディングの活用
3. **頻繁な状態変更**: useCallbackによる最適化

## テスト

### 基本テスト例
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CommonAccordion } from '@/components/common/CommonAccordion';

test('アコーディオンの展開・収納', () => {
  render(
    <CommonAccordion
      title="テストアコーディオン"
      data-testid="test-accordion"
    >
      <div>テストコンテンツ</div>
    </CommonAccordion>
  );

  const accordion = screen.getByTestId('test-accordion');
  const header = screen.getByRole('button');

  // 初期状態は収納
  expect(header).toHaveAttribute('aria-expanded', 'false');

  // クリックで展開
  fireEvent.click(header);
  expect(header).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
});
```

### キーボードナビゲーションテスト
```typescript
test('キーボードでの操作', () => {
  render(
    <CommonAccordion title="キーボードテスト">
      <div>コンテンツ</div>
    </CommonAccordion>
  );

  const header = screen.getByRole('button');
  
  // Enterキーで展開
  fireEvent.keyDown(header, { key: 'Enter' });
  expect(header).toHaveAttribute('aria-expanded', 'true');
  
  // Spaceキーで収納
  fireEvent.keyDown(header, { key: ' ' });
  expect(header).toHaveAttribute('aria-expanded', 'false');
});
```

## 今後の拡張予定

### 近期計画
1. **グループアコーディオン機能**: 相互排他的な展開制御
2. **ネストアコーディオン対応**: 階層構造のサポート
3. **パフォーマンス最適化**: 大量データ対応

### 長期計画
1. **アニメーション効果の拡張**: フェード、スライド等
2. **テーマ連携強化**: ダークモード等
3. **国際化対応**: 多言語での使用 