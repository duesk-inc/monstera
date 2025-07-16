# 統一カードコンポーネント

フロントエンドアプリケーション全体で使用される統一されたカードコンポーネント群です。

## 概要

従来、各ページで直接MUIのCard/Paperコンポーネントを使用していましたが、デザインの一貫性とコード再利用性の向上のため、統一カードコンポーネントシステムを導入しました。

## コンポーネント一覧

### 1. InfoCard
情報表示用の汎用カードコンポーネント

**特徴:**
- 折りたたみ機能（オプション）
- アイコン付きヘッダー
- ローディング・エラー状態の内蔵
- アクセシビリティ対応

**使用例:**
```typescript
import { InfoCard } from '@/components/common/cards';

<InfoCard
  title="社員情報"
  icon={<PersonIcon />}
  expandable={true}
  defaultExpanded={false}
>
  {/* コンテンツ */}
</InfoCard>
```

**移行済みコンポーネント:**
- `BasicInfoCard` → `InfoCard`ベース

### 2. StatusCard
数値やステータス表示に特化したカードコンポーネント

**特徴:**
- 数値とステータスの視覚的表示
- プログレスバー対応
- ステータス色別表示
- 単位表示対応

**使用例:**
```typescript
import { StatusCard } from '@/components/common/cards';

<StatusCard
  title="有給残日数"
  value={15.5}
  unit="日"
  maxValue={20}
  status="success"
  showProgress={true}
/>
```

**移行済みコンポーネント:**
- `LeaveBalanceCard` → `StatusCard`ベース

### 3. ProjectCard
プロジェクト一覧表示用の専用カードコンポーネント

**特徴:**
- プロジェクト情報の統一表示
- ステータス別スタイリング
- レスポンシブ対応
- ホバーエフェクト

**使用例:**
```typescript
import { ProjectCard } from '@/components/common/cards';

<ProjectCard
  id={project.id}
  name={project.name}
  category={project.category}
  startDate={project.startDate}
  endDate={project.endDate}
  // ... その他のプロパティ
  onClick={() => router.push(`/project/detail?id=${project.id}`)}
/>
```

## 設計原則

### 1. 一貫性
- すべてのカードで統一されたborderRadius（12px）
- 統一されたboxShadow
- 統一されたborder色

### 2. 再利用性
- プロパティによる柔軟なカスタマイズ
- 共通機能の内蔵（ローディング、エラー表示）
- TypeScriptによる型安全性

### 3. アクセシビリティ
- 適切なARIA属性
- キーボードナビゲーション対応
- スクリーンリーダー対応

### 4. パフォーマンス
- 軽量な実装
- 不要な再レンダリングの回避
- 遅延ローディング対応

## 移行ガイド

### 既存のCard/Paperからの移行

**Before:**
```typescript
<Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.paper' }}>
  <CardContent>
    <Typography variant="h6">タイトル</Typography>
    {/* コンテンツ */}
  </CardContent>
</Card>
```

**After:**
```typescript
<InfoCard title="タイトル" variant="outlined">
  {/* コンテンツ */}
</InfoCard>
```

### 推奨される使い分け

- **情報表示**: `InfoCard`
- **数値・ステータス表示**: `StatusCard`
- **プロジェクト一覧**: `ProjectCard`
- **その他の汎用カード**: MUIの`Card`を直接使用（将来的に`CommonCard`に移行予定）

## 今後の予定

1. **CommonCard**の実装（TypeScript型エラー解決後）
2. ダッシュボードカードの統一化
3. 通知カードの専用コンポーネント化
4. より多くの既存コンポーネントの移行

## 注意事項

- 既存機能にデグレードが発生しないよう、既存のpropsとの互換性を最大限保持
- 新しいコンポーネントは段階的に導入
- 既存のテストケースは全て動作することを確認済み 