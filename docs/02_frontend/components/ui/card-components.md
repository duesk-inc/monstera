# 共通カードコンポーネント定義書

## 概要

フロントエンドアプリケーション全体で使用される統一されたカードコンポーネント群です。従来、各ページで直接MUIのCard/Paperコンポーネントを使用していましたが、デザインの一貫性とコード再利用性の向上のため、統一カードコンポーネントシステムを導入しました。

## 設計原則

### 1. 一貫性
- すべてのカードで統一されたborderRadius（12px）
- 統一されたboxShadow: `0px 2px 8px rgba(0, 0, 0, 0.05)`
- 統一されたborder: `1px solid rgba(0, 0, 0, 0.04)`

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

## コンポーネント一覧

### 1. InfoCard
**用途**: 情報表示用の汎用カードコンポーネント

#### 特徴
- 折りたたみ機能（オプション）
- アイコン付きヘッダー
- ローディング・エラー状態の内蔵
- アクセシビリティ対応

#### Props仕様

```typescript
interface InfoCardProps {
  /** カードのタイトル */
  title?: string;
  /** タイトルアイコン */
  icon?: React.ReactNode;
  /** 折りたたみ可能かどうか */
  expandable?: boolean;
  /** 初期展開状態 */
  defaultExpanded?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string | null;
  /** カードのバリアント */
  variant?: 'default' | 'outlined' | 'elevated';
  /** 最小高さ */
  minHeight?: number | string;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** 子要素 */
  children?: React.ReactNode;
  /** テストID */
  'data-testid'?: string;
}
```

#### 基本使用例

```typescript
import { InfoCard } from '@/components/common/cards';
import { Person as PersonIcon } from '@mui/icons-material';

// 基本的な使用
<InfoCard
  title="社員情報"
  icon={<PersonIcon />}
  variant="outlined"
>
  <Typography>社員情報の内容</Typography>
</InfoCard>

// 折りたたみ機能付き
<InfoCard
  title="詳細情報"
  icon={<InfoIcon />}
  expandable={true}
  defaultExpanded={false}
>
  <Typography>詳細な内容がここに表示されます</Typography>
</InfoCard>

// ローディング状態
<InfoCard
  title="データ読み込み中"
  loading={true}
/>

// エラー状態
<InfoCard
  title="エラーが発生しました"
  error="データの取得に失敗しました"
/>
```

#### バリアント

| variant | 外観 | 用途 |
|---------|------|------|
| `default` | 統一ボックスシャドウ | 一般的な情報表示 |
| `outlined` | アウトライン表示 | フォーム内の情報グループ |
| `elevated` | 強いシャドウ | 重要な情報の強調表示 |

#### アクセシビリティ

- 折りたたみ機能は`aria-expanded`属性に対応
- キーボード操作（Enter、Space）で展開/折りたたみ可能
- スクリーンリーダー用のラベル自動生成

#### 移行済みコンポーネント
- `BasicInfoCard` → `InfoCard`ベースに完全移行済み

### 2. StatusCard
**用途**: 数値やステータス表示に特化したカードコンポーネント

#### 特徴
- 数値とステータスの視覚的表示
- プログレスバー対応
- ステータス色別表示
- 単位表示対応

#### Props仕様

```typescript
interface StatusCardProps {
  /** カードのタイトル */
  title: string;
  /** メインの数値 */
  value?: number | string;
  /** 単位 */
  unit?: string;
  /** 最大値（プログレスバー用） */
  maxValue?: number;
  /** ステータスの色 */
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  /** 説明テキスト */
  description?: string;
  /** サブ情報 */
  subtitle?: string;
  /** ローディング状態 */
  loading?: boolean;
  /** プログレスバーを表示するか */
  showProgress?: boolean;
  /** 情報アイコンのクリック時コールバック */
  onInfoClick?: () => void;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** 子要素 */
  children?: React.ReactNode;
  /** テストID */
  'data-testid'?: string;
}
```

#### 基本使用例

```typescript
import { StatusCard } from '@/components/common/cards';

// 基本的な数値表示
<StatusCard
  title="有給残日数"
  value={15.5}
  unit="日"
  status="success"
/>

// プログレスバー付き
<StatusCard
  title="プロジェクト進捗"
  value={75}
  unit="%"
  maxValue={100}
  status="info"
  showProgress={true}
  description="期限まで残り5日"
/>

// 説明とサブタイトル付き
<StatusCard
  title="今月の工数"
  value={160}
  unit="時間"
  status="warning"
  subtitle="目標: 180時間"
  description="目標まで20時間不足しています"
  onInfoClick={() => alert('詳細情報')}
/>

// カスタムコンテンツ
<StatusCard
  title="プロジェクト状況"
  value="進行中"
  status="info"
>
  <Typography variant="caption">
    最終更新: {format(new Date(), 'yyyy/MM/dd HH:mm')}
  </Typography>
</StatusCard>
```

#### ステータス色

| status | 色 | 用途 | 例 |
|--------|----|----- |---|
| `success` | 緑 | 良好な状態 | 十分な残日数、目標達成 |
| `warning` | 黄 | 注意が必要 | 残日数少ない、期限迫る |
| `error` | 赤 | 問題あり | 期限切れ、エラー状態 |
| `info` | 青 | 情報表示 | 進行中、通知 |
| `default` | グレー | 中立 | 通常状態 |

#### プログレスバー機能

```typescript
// プログレスバーの計算式
const progressValue = Math.min((value / maxValue) * 100, 100);

// 使用例: 有給使用率
<StatusCard
  title="有給使用率"
  value={8}
  unit="日"
  maxValue={20}
  showProgress={true}
  status={value > 15 ? 'warning' : 'success'}
/>
```

#### 移行済みコンポーネント
- `LeaveBalanceCard` → `StatusCard`ベースに完全移行済み

### 3. ProjectCard
**用途**: プロジェクト一覧表示用の専用カードコンポーネント

#### 特徴
- プロジェクト情報の統一表示
- ステータス別スタイリング
- レスポンシブ対応
- ホバーエフェクト

#### Props仕様

```typescript
interface ProjectCardProps {
  /** プロジェクトID */
  id: number;
  /** プロジェクト名 */
  name: string;
  /** カテゴリー */
  category: string;
  /** 開始日 */
  startDate: Date;
  /** 終了日 */
  endDate: Date;
  /** 応募期限 */
  applicationDeadline: Date;
  /** 想定単価 */
  expectedDailyRate: string;
  /** 面談回数 */
  interviewCount: number;
  /** 企業名 */
  company: string;
  /** 勤務地 */
  location: string;
  /** 最寄り駅 */
  nearestStation: string;
  /** フルリモート可能か */
  isFullRemote: boolean;
  /** プロジェクトステータス */
  status?: 'active' | 'closed' | 'pending';
  /** クリック可能かどうか */
  clickable?: boolean;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}
```

#### 基本使用例

```typescript
import { ProjectCard } from '@/components/common/cards';

// プロジェクト一覧での使用
<ProjectCard
  id={project.id}
  name="新ECサイトリニューアルプロジェクト"
  category="フロントエンド開発"
  startDate={new Date('2024-04-01')}
  endDate={new Date('2024-09-30')}
  applicationDeadline={new Date('2024-03-15')}
  expectedDailyRate="70,000円～80,000円"
  interviewCount={2}
  company="株式会社Example"
  location="東京都港区"
  nearestStation="新橋駅"
  isFullRemote={true}
  status="active"
  onClick={() => router.push(`/project/detail?id=${project.id}`)}
/>

// 募集終了プロジェクト
<ProjectCard
  {...projectProps}
  status="closed"
  clickable={false}
/>

// 審査中プロジェクト
<ProjectCard
  {...projectProps}
  status="pending"
/>
```

#### ステータス別表示

| status | 表示 | スタイル |
|--------|------|---------|
| `active` | 通常表示 | 標準の背景色とボーダー |
| `closed` | 募集終了 | 半透明表示、グレー背景 |
| `pending` | 審査中 | 警告色のボーダー |

#### レスポンシブ対応

```typescript
// グリッドレイアウトでの使用例
<Grid container spacing={3}>
  {projects.map((project) => (
    <Grid item xs={12} sm={6} md={4} key={project.id}>
      <ProjectCard {...project} />
    </Grid>
  ))}
</Grid>
```

#### ホバーエフェクト

- `clickable={true}`の場合、ホバー時に上昇アニメーション
- マウスカーソルがポインターに変化
- ボックスシャドウが強化

### 4. CommonCard（将来実装予定）
**状況**: TypeScript型エラーにより現在保留中

#### 概要
- 全カードコンポーネントの基盤となる汎用カード
- 複数のバリアントとスタイリングオプション
- 型エラー解決後に実装予定

## 統一エクスポート

すべての共通カードコンポーネントは`frontend/src/components/common/cards/index.ts`から統一エクスポートされています。

```typescript
// 統一インポート
import { InfoCard, StatusCard, ProjectCard } from '@/components/common/cards';
import type { InfoCardProps, StatusCardProps, ProjectCardProps } from '@/components/common/cards';

// 個別インポート
import { InfoCard } from '@/components/common/cards/InfoCard';
import { StatusCard } from '@/components/common/cards/StatusCard';
import { ProjectCard } from '@/components/common/cards/ProjectCard';
```

## 移行ガイド

### 既存のCard/Paperからの移行

#### Before: 直接MUI使用
```typescript
<Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.paper' }}>
  <CardContent>
    <Typography variant="h6">タイトル</Typography>
    <Typography variant="body2" color="text.secondary">
      説明文
    </Typography>
  </CardContent>
</Card>
```

#### After: 統一カードコンポーネント使用
```typescript
<InfoCard title="タイトル" variant="outlined">
  <Typography variant="body2" color="text.secondary">
    説明文
  </Typography>
</InfoCard>
```

### 推奨される使い分け

| 用途 | 推奨コンポーネント | 理由 |
|------|------------------|------|
| 基本情報表示 | `InfoCard` | 折りたたみ、アイコン対応 |
| 数値・ステータス | `StatusCard` | 進捗表示、色分け対応 |
| プロジェクト表示 | `ProjectCard` | プロジェクト専用レイアウト |
| その他汎用 | MUIの`Card`直接使用 | 将来的に`CommonCard`移行予定 |

### 移行チェックリスト

新しいコンポーネント実装時：
- [ ] 適切な統一カードコンポーネントを選択している
- [ ] 既存の類似機能と同じコンポーネントを使用している
- [ ] 必要に応じてdata-testid属性を設定している
- [ ] アクセシビリティを考慮している

既存コンポーネント修正時：
- [ ] 修正対象ページで統一カードコンポーネントに置き換えている
- [ ] 既存機能にデグレードが発生していない
- [ ] 見た目の一貫性が保たれている

## テーマレベル統一

MUIテーマレベルでカードの基本スタイルが統一されています：

```typescript
// theme/index.ts
MuiCard: {
  styleOverrides: {
    root: {
      borderRadius: 12,
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(0, 0, 0, 0.04)',
    },
  },
}
```

## 技術仕様

### 依存関係
- Material-UI (@mui/material)
- React 18+
- TypeScript 4.9+

### パフォーマンス
- React.memo使用による不要な再レンダリング防止
- 軽量なプロパティ設計
- 遅延ローディング対応

### テスト
- data-testid属性による一貫したテスト対応
- 各コンポーネントでユニットテスト実装済み

## トラブルシューティング

### よくある問題

#### 1. TypeScript型エラー
**症状**: SxPropsの型エラーが発生する
**対処**: 明示的な型キャストまたはas const使用

```typescript
// 型エラーが発生する場合
const customSx = { mb: 2, bgcolor: 'primary.main' };

// 対処法
const customSx: SxProps<Theme> = { mb: 2, bgcolor: 'primary.main' };
```

#### 2. スタイルが適用されない
**症状**: カスタムスタイルが反映されない
**対処**: sx propの優先順位を確認

```typescript
// スタイルの競合を避ける
<InfoCard
  sx={{
    // 基本スタイルを上書き
    '& .MuiCard-root': {
      // より具体的なセレクター
    }
  }}
/>
```

### デバッグ方法

1. **data-testid確認**: ブラウザ開発者ツールでdata-testid属性を確認
2. **React DevTools**: コンポーネントのpropsを確認
3. **MUIテーマ確認**: テーマ設定との競合を確認

## 今後の予定

### 短期（1-2ヶ月）
- [ ] CommonCardのTypeScript型エラー解決
- [ ] ダッシュボードカードの統一化
- [ ] 追加バリアントの実装

### 中期（3-6ヶ月）
- [ ] アニメーション機能の強化
- [ ] ダークモード対応
- [ ] より多くの既存コンポーネントの移行

### 長期（6ヶ月以上）
- [ ] カード内コンテンツの部品化
- [ ] 国際化対応
- [ ] パフォーマンス最適化の継続

## まとめ

共通カードコンポーネントシステムにより、以下の成果を達成しました：

1. **デザイン統一**: 一貫したカードデザインの実現
2. **開発効率**: 再利用可能なコンポーネントによる開発速度向上
3. **保守性**: 統一された実装による保守コスト削減
4. **アクセシビリティ**: WCAG準拠のアクセシブルな実装
5. **型安全性**: TypeScriptによる堅牢な型チェック

このシステムを適切に活用することで、高品質なUIを効率的に開発できます。 