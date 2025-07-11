# 共通ステータスチップコンポーネント定義書

## 概要

このドキュメントでは、フロントエンド全体で統一されたステータス表示を実現するための共通ステータスチップコンポーネントについて説明します。

### 統一化の背景

従来、アプリケーション内の各画面で個別にステータス表示が実装されており、以下の問題が発生していました：

- **ステータスラベルの不統一**：「承認」vs「承認済」、「申請中」vs「審査中」など
- **スタイルの統一性不足**：色、形状、サイズがページごとに異なる
- **保守性の低下**：変更時に複数箇所を修正する必要
- **型安全性の欠如**：文字列ベースの実装によるタイポリスク

これらの問題を解決するため、以下の3つの統一コンポーネントを設計・実装しました。

## コンポーネント一覧

### 1. StatusChip - 申請ステータス用
申請の状態（承認済、申請中、却下など）を表示

### 2. TypeChip - 通知・カテゴリタイプ用
通知タイプ（休暇、経費、週報、プロジェクトなど）を表示

### 3. CategoryChip - 汎用カテゴリ用
プロジェクトカテゴリなど、汎用的なカテゴリ分類を表示

## 1. StatusChip - 申請ステータス用

### 基本仕様

申請の進行状況を視覚的に表示するためのコンポーネントです。

```tsx
import { StatusChip } from '@/components/common';

// 基本的な使用例
<StatusChip status="approved" />
<StatusChip status="pending" />
<StatusChip status="rejected" />
```

### 対応ステータス

| status値 | 表示ラベル | 色 | 説明 |
|----------|-----------|----|----|
| `approved` | 承認済 | 緑色 | 申請が承認された状態 |
| `pending` | 申請中 | 黄色 | 申請中・審査中の状態 |
| `rejected` | 却下 | 赤色 | 申請が却下された状態 |
| `submitted` | 提出済 | 青色 | 提出済み（週報など） |
| `draft` | 下書き | グレー | 下書き保存済み |
| `not_submitted` | 未提出 | グレー | 未提出状態 |

### TypeScript型定義

```tsx
export type ApplicationStatus = 
  | 'approved' 
  | 'pending' 
  | 'rejected' 
  | 'submitted' 
  | 'draft' 
  | 'not_submitted';

interface StatusChipProps {
  status: ApplicationStatus;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  sx?: SxProps<Theme>;
}
```

### プロパティ詳細

- **status** (必須): 表示するステータス
- **size**: チップのサイズ（デフォルト: 'medium'）
- **variant**: 表示スタイル（デフォルト: 'filled'）
- **sx**: カスタムスタイル

### 使用例

#### 基本的な使用

```tsx
// 休暇申請一覧での使用
{leaves.map(leave => (
  <TableRow key={leave.id}>
    <TableCell>{leave.title}</TableCell>
    <TableCell>
      <StatusChip status={leave.status} />
    </TableCell>
  </TableRow>
))}
```

#### サイズとバリアントの指定

```tsx
// 小さいサイズのアウトライン表示
<StatusChip 
  status="pending" 
  size="small" 
  variant="outlined" 
/>
```

#### 数字ベースステータスの変換

```tsx
// 週報などの数字ベースステータスを変換して使用
const convertWeeklyStatusToApplicationStatus = (status: number): ApplicationStatus => {
  switch (status) {
    case WEEKLY_REPORT_STATUS.NOT_SUBMITTED:
      return 'not_submitted';
    case WEEKLY_REPORT_STATUS.DRAFT:
      return 'draft';
    case WEEKLY_REPORT_STATUS.SUBMITTED:
      return 'submitted';
    default:
      return 'not_submitted';
  }
};

<StatusChip status={convertWeeklyStatusToApplicationStatus(report.status)} />
```

## 2. TypeChip - 通知・カテゴリタイプ用

### 基本仕様

通知タイプや申請タイプなどの分類を表示するコンポーネントです。

```tsx
import { TypeChip } from '@/components/common';

// 基本的な使用例
<TypeChip type="leave" />
<TypeChip type="expense" />
<TypeChip type="weekly" />
```

### 対応タイプ

| type値 | 表示ラベル | 色 | アイコン | 説明 |
|--------|-----------|----|---------|----|
| `leave` | 休暇 | プライマリ | EventNoteIcon | 休暇申請関連 |
| `expense` | 経費 | 警告色 | ReceiptIcon | 経費申請関連 |
| `weekly` | 週報 | 情報色 | AssignmentIcon | 週報関連 |
| `project` | プロジェクト | 成功色 | WorkIcon | プロジェクト関連 |
| `system` | システム | セカンダリ | NotificationsIcon | システム通知 |

### TypeScript型定義

```tsx
export type NotificationType = 
  | 'leave' 
  | 'expense' 
  | 'weekly' 
  | 'project' 
  | 'system';

interface TypeChipProps {
  type: NotificationType;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showIcon?: boolean;
  sx?: SxProps<Theme>;
}
```

### プロパティ詳細

- **type** (必須): 表示するタイプ
- **size**: チップのサイズ（デフォルト: 'medium'）
- **variant**: 表示スタイル（デフォルト: 'filled'）
- **showIcon**: アイコンの表示有無（デフォルト: false）
- **sx**: カスタムスタイル

### 使用例

#### 通知一覧での使用

```tsx
// 通知一覧でのタイプ表示
{notifications.map(notification => (
  <ListItem key={notification.id}>
    <ListItemText
      primary={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TypeChip 
            type={notification.type}
            size="small"
            showIcon={true}
          />
          <Typography>{notification.title}</Typography>
        </Box>
      }
    />
  </ListItem>
))}
```

#### 設定画面での使用

```tsx
// 通知設定画面での使用
<TypeChip 
  type="leave"
  size="small"
  showIcon={true}
  variant="outlined"
/>
```

## 3. CategoryChip - 汎用カテゴリ用

### 基本仕様

プロジェクトカテゴリなど、汎用的なカテゴリ分類を表示するコンポーネントです。

```tsx
import { CategoryChip } from '@/components/common';

// 基本的な使用例
<CategoryChip category="development" />
<CategoryChip category="design" />
<CategoryChip category="maintenance" />
```

### 対応カテゴリ

| category値 | 表示ラベル | 色 | 説明 |
|------------|-----------|----|----|
| `development` | 開発 | プライマリ | 開発プロジェクト |
| `design` | デザイン | セカンダリ | デザインプロジェクト |
| `maintenance` | 保守・運用 | 警告色 | 保守・運用プロジェクト |
| `research` | 調査・検証 | 情報色 | 調査・検証プロジェクト |
| `other` | その他 | グレー | その他のプロジェクト |

### TypeScript型定義

```tsx
export type ProjectCategory = 
  | 'development' 
  | 'design' 
  | 'maintenance' 
  | 'research' 
  | 'other';

interface CategoryChipProps {
  category: ProjectCategory | string;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  sx?: SxProps<Theme>;
}
```

### プロパティ詳細

- **category** (必須): 表示するカテゴリ
- **size**: チップのサイズ（デフォルト: 'medium'）
- **variant**: 表示スタイル（デフォルト: 'filled'）
- **sx**: カスタムスタイル

### 使用例

#### プロジェクト一覧での使用

```tsx
// プロジェクト一覧でのカテゴリ表示
{projects.map(project => (
  <TableRow key={project.id}>
    <TableCell>{project.name}</TableCell>
    <TableCell>
      <CategoryChip category={project.category} />
    </TableCell>
  </TableRow>
))}
```

## 統一ユーティリティ関数

### chipUtils.ts

共通のユーティリティ関数を提供します。

```tsx
// frontend/src/utils/chipUtils.ts

// ステータス変換関数
export const convertStatusToApplicationStatus = (
  status: string | number,
  statusMap?: Record<string | number, ApplicationStatus>
): ApplicationStatus => {
  if (statusMap && statusMap[status]) {
    return statusMap[status];
  }
  
  // デフォルトマッピング
  if (typeof status === 'string') {
    switch (status.toLowerCase()) {
      case 'approved':
      case '承認':
      case '承認済':
        return 'approved';
      case 'pending':
      case '申請中':
      case '審査中':
        return 'pending';
      case 'rejected':
      case '却下':
      case '否認':
        return 'rejected';
      default:
        return 'pending';
    }
  }
  
  return 'pending';
};

// タイプ名取得関数
export const getTypeName = (type: NotificationType): string => {
  switch (type) {
    case 'leave':
      return '休暇';
    case 'expense':
      return '経費';
    case 'weekly':
      return '週報';
    case 'project':
      return 'プロジェクト';
    case 'system':
      return 'システム';
    default:
      return '不明';
  }
};

// カテゴリ名取得関数
export const getCategoryName = (category: ProjectCategory | string): string => {
  switch (category) {
    case 'development':
      return '開発';
    case 'design':
      return 'デザイン';
    case 'maintenance':
      return '保守・運用';
    case 'research':
      return '調査・検証';
    case 'other':
      return 'その他';
    default:
      return typeof category === 'string' ? category : 'その他';
  }
};
```

## インポートとエクスポート

### 統一エクスポートファイル

```tsx
// frontend/src/components/common/index.ts
export { default as ActionButton } from './ActionButton';
export { StatusChip, type ApplicationStatus } from './StatusChip';
export { TypeChip, type NotificationType } from './TypeChip';
export { CategoryChip, type ProjectCategory } from './CategoryChip';
```

### 使用時のインポート

```tsx
// 推奨：統一インポート
import { StatusChip, TypeChip, CategoryChip } from '@/components/common';

// 個別インポートも可能
import { StatusChip } from '@/components/common/StatusChip';
```

## 移行ガイドライン

### 既存コードからの移行手順

#### 1. 既存の個別実装を特定

```bash
# 既存のステータス表示を検索
grep -r "getStatusChip\|StatusChip\|ステータス" frontend/src/
```

#### 2. 統一コンポーネントのインポート

```tsx
// 旧実装
import { getStatusChip } from '@/utils/leaveUtils';

// 新実装
import { StatusChip } from '@/components/common';
```

#### 3. 関数呼び出しをコンポーネントに変更

```tsx
// 旧実装
{getStatusChip(leave.status)}

// 新実装
<StatusChip status={leave.status} />
```

#### 4. ステータス変換が必要な場合

```tsx
// 数字ベースのステータスを変換
import { convertStatusToApplicationStatus } from '@/utils/chipUtils';

const status = convertStatusToApplicationStatus(report.status, {
  0: 'not_submitted',
  1: 'draft',
  2: 'submitted'
});

<StatusChip status={status} />
```

### 段階的移行戦略

1. **Phase 1**: 統一コンポーネントの作成（完了）
2. **Phase 2**: 新規開発での必須使用
3. **Phase 3**: 既存コードの段階的移行
4. **Phase 4**: 個別実装の削除
5. **Phase 5**: 統合テストとドキュメント更新

## 品質管理

### 必須チェックポイント

新規コンポーネント実装時は以下を確認してください：

- [ ] 適切な統一コンポーネントを使用している
- [ ] 型安全性が確保されている
- [ ] ステータス変換が適切に実装されている
- [ ] アクセシビリティ属性が適切に設定されている
- [ ] 一貫したスタイリングが適用されている

### TypeScriptエラーの対応

#### 型エラーの解決例

```tsx
// エラー：型 'string' を型 'ApplicationStatus' に割り当てることはできません
// 解決：適切な型変換を実装
const status: ApplicationStatus = leave.status as ApplicationStatus;

// または変換関数を使用
const status = convertStatusToApplicationStatus(leave.status);
```

#### variant競合の解決

```tsx
// エラー：Chipのvariantプロパティとの競合
// 解決：独自variantを削除または名前変更
interface StatusChipProps {
  status: ApplicationStatus;
  chipVariant?: 'filled' | 'outlined'; // variantから変更
}
```

## テスト方針

### 単体テスト

```tsx
// StatusChip.test.tsx
import { render, screen } from '@testing-library/react';
import { StatusChip } from './StatusChip';

describe('StatusChip', () => {
  test('承認済ステータスが正しく表示される', () => {
    render(<StatusChip status="approved" />);
    expect(screen.getByText('承認済')).toBeInTheDocument();
  });

  test('適切な色が適用される', () => {
    render(<StatusChip status="approved" />);
    const chip = screen.getByText('承認済').closest('div');
    expect(chip).toHaveClass('MuiChip-colorSuccess');
  });
});
```

### ビジュアルテスト

```tsx
// Storybook設定例
export default {
  title: 'Common/StatusChip',
  component: StatusChip,
} as Meta;

export const AllStatuses: Story = () => (
  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
    <StatusChip status="approved" />
    <StatusChip status="pending" />
    <StatusChip status="rejected" />
    <StatusChip status="submitted" />
    <StatusChip status="draft" />
    <StatusChip status="not_submitted" />
  </Box>
);
```

## パフォーマンス考慮事項

### メモ化

```tsx
// 大量のリストで使用する場合はメモ化を検討
const MemoizedStatusChip = React.memo(StatusChip);

// または条件付きメモ化
const statusChip = useMemo(
  () => <StatusChip status={item.status} />,
  [item.status]
);
```

### バンドルサイズ最適化

```tsx
// 必要なアイコンのみをインポート
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
```

## 今後の拡張計画

### 追加予定機能

1. **アニメーション効果**: ステータス変更時のトランジション
2. **カスタムテーマ対応**: 企業ブランドカラーへの対応
3. **多言語対応**: 国際化対応
4. **アクセシビリティ強化**: スクリーンリーダー対応の向上

### 長期的な改善

1. **デザインシステム統合**: より包括的なデザインシステムへの発展
2. **自動テスト拡充**: ビジュアルリグレッションテストの導入
3. **パフォーマンス最適化**: 仮想化対応
4. **開発者体験向上**: より良いTypeScript型推論

## まとめ

共通ステータスチップコンポーネントの導入により、以下の効果を実現しました：

- **一貫性の確保**: 全画面で統一されたステータス表示
- **保守性の向上**: 変更時の影響範囲を最小化
- **型安全性の向上**: TypeScriptによる厳密な型チェック
- **開発効率の向上**: 再利用可能なコンポーネントによる開発速度向上

これらのコンポーネントを適切に使用することで、品質の高いユーザーインターフェースを効率的に開発することができます。 