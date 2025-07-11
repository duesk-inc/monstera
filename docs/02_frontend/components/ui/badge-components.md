# 共通バッジコンポーネント定義書

## 概要

プロジェクト全体でのバッジ表示の統一を図るため、**共通バッジコンポーネントの使用を必須**とします。従来のMaterial-UIのBadgeやChipの直接使用に代わり、統一されたデザインシステムに基づく2つのバッジコンポーネントを提供します。

## 設計思想

### 統一化の背景
- 従来は通知カウント、ステータス表示等がページごとに異なる実装で分散
- Material-UIのBadge、Chip、インラインスタイルが混在していた状況を改善
- デザインの一貫性とメンテナンス性の向上を目的とした統一化

### 基本方針
- **MUIのBadge/Chip直接使用を禁止**：全てのバッジ表示は共通コンポーネントを使用
- **用途別の明確な分離**：通知系とステータス系で責任を分離
- **段階的移行戦略**：既存コードから段階的に統一化

## コンポーネント一覧

| コンポーネント名 | 用途 | 対象要素 |
|------------------|------|----------|
| **NotificationBadge** | 通知・カウント表示 | 通知件数、未読ドット、カウント表示 |
| **StatusBadge** | ステータス表示 | 選択状態、取得済み状態、利用可能状態 |

## NotificationBadge - 通知・カウント表示用

### 基本概念
通知カウント、未読状態、数値表示等を統一的に表現するコンポーネントです。

### Props定義

```typescript
interface NotificationBadgeProps {
  /** 通知カウント数 */
  count?: number;
  /** 未読ドット表示フラグ */
  showDot?: boolean;
  /** 表示タイプ */
  variant?: 'count' | 'dot' | 'chip';
  /** 表示位置 */
  position?: 'top-right' | 'inline';
  /** 子要素（バッジを付ける対象） */
  children?: React.ReactNode;
  /** 最大表示カウント数 */
  max?: number;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}
```

### Variant別の表示パターン

#### 1. count - カウント表示（デフォルト）
数値を表示する基本的なバッジです。

```tsx
// top-right position（子要素の右上に配置）
<NotificationBadge count={5} variant="count" position="top-right">
  <NotificationsIcon />
</NotificationBadge>

// inline position（インライン表示）
<NotificationBadge count={3} variant="count" position="inline" />
```

**表示仕様:**
- top-right: Material-UIのBadgeコンポーネントを使用
- inline: Chipコンポーネントとして表示
- maxプロパティで最大表示数を制御（デフォルト99）

#### 2. dot - ドット表示
未読状態やシンプルな通知を示すドット表示です。

```tsx
// top-right position（子要素にドット付与）
<NotificationBadge variant="dot" position="top-right" showDot={true}>
  <Avatar />
</NotificationBadge>

// inline position（単独ドット表示）
<NotificationBadge variant="dot" position="inline" showDot={true} />
```

**表示仕様:**
- top-right: Material-UIのBadge variant="dot"を使用
- inline: 10px x 10px の円形要素を表示

#### 3. chip - チップ表示
件数を含む文字列を表示するチップ形式です。

```tsx
// 通知件数表示
<NotificationBadge count={12} variant="chip" />
// 表示結果: "12件" のチップ
```

**表示仕様:**
- Material-UIのChipコンポーネントを使用
- サイズ: small、高さ22px
- カラー: secondary
- 0件以下の場合は非表示

### 使用例

#### ダッシュボードでの通知表示
```tsx
// 最新通知セクションのタイトル横
<Box sx={{ display: 'flex', alignItems: 'center' }}>
  <NotificationsIcon color="secondary" sx={{ mr: 1 }} />
  <Typography variant="h6">最新の通知</Typography>
  <NotificationBadge 
    count={notifications.length} 
    variant="chip" 
    sx={{ ml: 1.5 }}
  />
</Box>

// 未読ドット表示
{!notification.isRead && (
  <NotificationBadge 
    variant="dot" 
    position="inline" 
    showDot={true}
    sx={{ ml: 1 }}
  />
)}
```

#### 通知一覧ページでのタブ表示
```tsx
<Tab 
  label={
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      未読
      <NotificationBadge 
        count={unreadCount} 
        variant="chip" 
        sx={{ height: 18, fontSize: '0.7rem' }}
      />
    </Box>
  } 
  value="unread" 
/>
```

## StatusBadge - ステータス表示用

### 基本概念
選択状態、取得済み状態、利用可能状態等のステータスを視覚的に表現するコンポーネントです。

### Props定義

```typescript
interface StatusBadgeProps {
  /** ステータスタイプ */
  status: 'selected' | 'taken' | 'available' | 'disabled';
  /** 表示バリアント */
  variant?: 'dot' | 'outline';
  /** サイズ */
  size?: 'small' | 'medium';
  /** 子要素（バッジを付ける対象） */
  children?: React.ReactNode;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}
```

### Status別の色定義

| Status | 色 | 用途 | 使用例 |
|--------|-----|------|--------|
| `selected` | #2196f3（青色） | 選択済み状態 | カレンダーの選択日 |
| `taken` | #f44336（赤色） | 取得済み/申請済み | 休暇申請済みの日付 |
| `available` | #4caf50（緑色） | 利用可能状態 | 申請可能な日付（通常非表示） |
| `disabled` | #9e9e9e（グレー） | 無効状態 | 申請不可の日付 |

### Variant別の表示パターン

#### 1. dot - ドット表示（デフォルト）
小さなドットでステータスを表現します。

```tsx
// 子要素付きドット表示
<StatusBadge status="selected" variant="dot" size="small">
  <CalendarDay />
</StatusBadge>

// 単独ドット表示
<StatusBadge status="taken" variant="dot" size="medium" />
```

#### 2. outline - アウトライン表示
枠線でステータスを表現します。

```tsx
<StatusBadge status="disabled" variant="outline" size="medium">
  <CalendarDay />
</StatusBadge>
```

### サイズ別の仕様

| Size | ドットサイズ | アウトライン幅 | 用途 |
|------|-------------|---------------|------|
| `small` | 6px | 2px | 小さなカレンダー、リスト項目 |
| `medium` | 8px | 3px | 通常のカレンダー、カード |

### 使用例

#### カレンダーでの日付ステータス表示
```tsx
// カレンダーユーティリティでの使用
export const CustomPickersDay = (props: PickersDayProps) => {
  const { day, selectedDates, takenLeaveDates, ...other } = props;
  
  // ステータス判定ロジック
  let status: 'selected' | 'taken' | 'available' = 'available';
  if (isSelected) {
    status = 'selected';
  } else if (isTakenLeaveDate) {
    status = 'taken';
  }
  
  const dayElement = <PickersDay {...other} day={day} />;
  
  // ステータスバッジを適用
  if (status !== 'available') {
    return (
      <StatusBadge
        status={status}
        variant="dot"
        size="small"
      >
        {dayElement}
      </StatusBadge>
    );
  }
  
  return dayElement;
};
```

#### 申請状況の視覚表示
```tsx
// 申請一覧での状況表示
<StatusBadge status="taken" variant="outline" size="medium">
  <Typography variant="body2">2024/03/15</Typography>
</StatusBadge>
```

## 移行ガイドライン

### 置き換え対象の特定

#### 既存の実装パターンと対応表

| 既存実装 | 置き換え先 | 変更例 |
|----------|------------|--------|
| `<Chip size="small" label={...} />` | `NotificationBadge variant="chip"` | 通知件数表示 |
| `<Badge badgeContent={count} />` | `NotificationBadge variant="count"` | カウントバッジ |
| `<Badge variant="dot" />` | `NotificationBadge variant="dot"` | 未読ドット |
| インラインBox円形要素 | `NotificationBadge variant="dot" position="inline"` | 未読表示 |
| Material-UI Badge（カレンダー） | `StatusBadge` | 日付ステータス |

### 段階的移行手順

1. **新規実装**: 新しく作成するコンポーネントでは必ず共通バッジを使用
2. **既存修正時**: 既存コンポーネントを修正する際に合わせて移行
3. **一括変換**: 機能単位での一括移行を実施

### 移行前後の比較例

#### Before（従来実装）
```tsx
// ダッシュボード通知件数
<Chip
  size="small"
  label={`${notifications.length}件`}
  color="secondary"
  sx={{ ml: 1.5 }}
/>

// 未読ドット
<Box
  sx={{
    width: 10,
    height: 10,
    borderRadius: '50%',
    bgcolor: 'primary.main',
    ml: 1
  }}
/>

// カレンダー日付バッジ
<Badge
  badgeContent={
    <Box sx={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      backgroundColor: isSelected ? '#2196f3' : '#f44336'
    }} />
  }
>
  <PickersDay {...props} />
</Badge>
```

#### After（統一実装）
```tsx
// ダッシュボード通知件数
<NotificationBadge 
  count={notifications.length} 
  variant="chip" 
  sx={{ ml: 1.5 }}
/>

// 未読ドット
<NotificationBadge 
  variant="dot" 
  position="inline" 
  showDot={true}
  sx={{ ml: 1 }}
/>

// カレンダー日付バッジ
<StatusBadge
  status={isSelected ? 'selected' : 'taken'}
  variant="dot"
  size="small"
>
  <PickersDay {...props} />
</StatusBadge>
```

## インポート・エクスポート

### コンポーネントのエクスポート
```typescript
// frontend/src/components/common/index.ts
export { NotificationBadge, type NotificationVariant, type NotificationPosition } from './NotificationBadge';
export { StatusBadge, type StatusType, type StatusVariant, type StatusSize } from './StatusBadge';
```

### 使用時のインポート
```typescript
import { NotificationBadge, StatusBadge } from '@/components/common';
```

## テスト方針

### 単体テストの観点
- 各variantでの正しい表示確認
- propsの変更による適切な反映
- 境界値テスト（count=0, max値等）
- アクセシビリティ属性の確認

### テスト例
```typescript
describe('NotificationBadge', () => {
  it('count variantで正しい数値を表示する', () => {
    render(<NotificationBadge count={5} variant="count" data-testid="badge" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('5');
  });
  
  it('count=0の場合は非表示になる', () => {
    render(<NotificationBadge count={0} variant="count" data-testid="badge" />);
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });
  
  it('max値を超えた場合は"+"付きで表示する', () => {
    render(<NotificationBadge count={150} max={99} variant="count" data-testid="badge" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('99+');
  });
});
```

## パフォーマンス考慮事項

### 最適化ポイント
- React.memoによる不要な再レンダリング防止
- sx propsの適切な使用でスタイル最適化
- 条件分岐による不要なDOMノード生成の回避

### 実装例
```typescript
export const NotificationBadge = React.memo<NotificationBadgeProps>(({
  count = 0,
  showDot = false,
  variant = 'count',
  // ... other props
}) => {
  // 表示条件の早期判定
  const hasNotification = count > 0 || showDot;
  
  if (!hasNotification && variant !== 'chip') {
    return children ? <>{children}</> : null;
  }
  
  // ... component logic
});
```

## アクセシビリティ対応

### ARIA属性の適用
- 適切なrole属性の設定
- スクリーンリーダー対応のlabel提供
- 色だけでない情報伝達の確保

### 実装例
```typescript
<Badge
  badgeContent={count > max ? `${max}+` : count}
  color="primary"
  max={max}
  sx={sx}
  data-testid={testId}
  aria-label={`${count}件の未読通知があります`}
>
  {children}
</Badge>
```

## 今後の拡張性

### 将来的な機能追加
- カスタムアイコン対応
- アニメーション効果の追加
- テーマ切り替え対応
- 多言語対応（件数表示の単位等）

### 拡張時の考慮事項
- 既存APIの後方互換性維持
- パフォーマンスへの影響評価
- デザインシステムとの整合性確認

## まとめ

共通バッジコンポーネントの導入により以下の効果が期待されます：

1. **デザインの統一性**: 全画面で一貫したバッジ表示
2. **保守性の向上**: 仕様変更時の影響範囲を限定
3. **開発効率の向上**: 実装パターンの標準化
4. **品質の向上**: テストされた安定コンポーネントの利用

プロジェクト全体でのUI統一を推進するため、新規開発・既存修正時には必ず共通バッジコンポーネントの使用を徹底してください。 