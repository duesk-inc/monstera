# 共通ローディングコンポーネント定義書

## 概要

プロジェクト全体でのローディング表示の統一化を図るため、用途別に3つの共通ローディングコンポーネントを提供します。

## 統一化の背景

### 改修前の課題
- ページローディング、セクションローディング、オーバーレイローディングが個別実装されていた
- 同じ機能でもサイズ、色、レイアウトが不統一
- 保守性と一貫性に欠ける

### 改修後の効果
- **デザインの統一性**: 全ローディング表示で一貫したデザイン
- **開発効率の向上**: 再利用可能なコンポーネントで実装工数削減
- **保守性の改善**: 一箇所でのデザイン変更が全体に反映

## コンポーネント一覧

### 1. PageLoader（ページローディング）

**用途**: 画面全体のローディング状態表示

**使用シーン**:
- 初期データ読み込み時
- Suspenseのfallback
- ページ遷移時

**基本使用方法**:
```tsx
import { PageLoader } from '@/components/common';

// 基本使用
<PageLoader />

// メッセージ付き
<PageLoader message="データを読み込み中..." />

// 高さ調整
<PageLoader fullHeight={false} />

// Suspenseでの使用
<Suspense fallback={<PageLoader />}>
  <YourPageContent />
</Suspense>
```

**Props仕様**:
```tsx
export interface PageLoaderProps {
  message?: string;                                    // 表示メッセージ（オプション）
  fullHeight?: boolean;                               // 画面全体の高さを使用（デフォルト: true）
  containerMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false; // コンテナ最大幅（デフォルト: 'lg'）
}
```

**デザイン仕様**:
- **レイアウト**: Container + 中央揃え
- **高さ**: fullHeight=true時は100vh、false時は400px
- **アイコン**: CircularProgress（32px、primaryカラー）
- **メッセージ**: h6サイズ、text.secondaryカラー

### 2. SectionLoader（セクションローディング）

**用途**: 画面の一部分（セクション内）のローディング状態表示

**使用シーン**:
- カード内のデータ読み込み
- リスト更新時
- フォーム処理中

**基本使用方法**:
```tsx
import { SectionLoader } from '@/components/common';

// 基本使用
<SectionLoader />

// サイズ指定
<SectionLoader size="small" message="読み込み中..." />
<SectionLoader size="large" message="処理中..." />

// レイアウト調整
<SectionLoader 
  size="medium" 
  padding={4} 
  minHeight={200} 
  centerContent={false}
/>
```

**Props仕様**:
```tsx
export interface SectionLoaderProps {
  message?: string;                    // 表示メッセージ（オプション）
  size?: 'small' | 'medium' | 'large'; // アイコンサイズ（デフォルト: 'medium'）
  padding?: number | string;           // 内側余白（デフォルト: 3）
  minHeight?: number | string;         // 最小高さ（オプション）
  centerContent?: boolean;             // 中央揃え（デフォルト: true）
}
```

**サイズ仕様**:
| size | CircularProgress | Typography | マージン |
|------|------------------|------------|----------|
| small | 16px | body2 | mt: 1 |
| medium | 24px | body1 | mt: 2 |
| large | 32px | h6 | mt: 2 |

**デザイン仕様**:
- **レイアウト**: Flexbox（縦方向中央揃え）
- **アイコン**: CircularProgress（サイズ可変、primaryカラー）
- **メッセージ**: サイズに応じたTypography、text.secondaryカラー

### 3. LoadingOverlay（オーバーレイローディング）

**用途**: モーダル的なオーバーレイローディング表示

**使用シーン**:
- フォーム送信中
- ファイルアップロード中
- 重要な処理実行中

**基本使用方法**:
```tsx
import { LoadingOverlay } from '@/components/common';

// 基本使用
<LoadingOverlay open={loading} />

// メッセージ付き
<LoadingOverlay 
  open={loading} 
  message="申請を送信中..." 
/>

// カスタマイズ
<LoadingOverlay 
  open={loading}
  message="ファイルをアップロード中..."
  size="large"
  position="absolute"
  backgroundColor="rgba(255, 255, 255, 0.8)"
  zIndex={1000}
/>
```

**Props仕様**:
```tsx
export interface LoadingOverlayProps {
  open: boolean;                       // オーバーレイ表示状態（必須）
  message?: string;                    // 表示メッセージ（オプション）
  size?: 'small' | 'medium' | 'large'; // アイコンサイズ（デフォルト: 'large'）
  position?: 'fixed' | 'absolute';    // ポジション指定（デフォルト: 'fixed'）
  backgroundColor?: string;            // 背景色（デフォルト: 'rgba(0, 0, 0, 0.5)'）
  zIndex?: number;                     // z-index値（デフォルト: 9999）
}
```

**サイズ仕様**:
| size | CircularProgress | Typography |
|------|------------------|------------|
| small | 24px | body1 |
| medium | 32px | h6 |
| large | 40px | h5 |

**デザイン仕様**:
- **ポジション**: fixed/absolute（全画面覆い）
- **背景**: 半透明オーバーレイ
- **アイコン**: CircularProgress（サイズ可変、primaryカラー）
- **メッセージ**: 白色テキスト、中央揃え

## 実装パターンと使い分け

### ページ全体のローディング
```tsx
// Next.js Suspense境界での使用
export default function MyPage() {
  return (
    <Suspense fallback={<PageLoader message="ページを読み込み中..." />}>
      <MyPageContent />
    </Suspense>
  );
}

// 条件付きローディング
const MyPageContent = () => {
  const { data, loading } = useMyData();
  
  if (loading) {
    return <PageLoader message="データを取得中..." />;
  }
  
  return <div>{/* page content */}</div>;
};
```

### セクション内のローディング
```tsx
// リスト表示での使用
const MyList = () => {
  const { items, loading } = useItems();
  
  return (
    <Paper>
      <Typography variant="h6">アイテム一覧</Typography>
      {loading ? (
        <SectionLoader message="アイテムを読み込み中..." />
      ) : (
        <List>
          {items.map(item => <ListItem key={item.id}>{item.name}</ListItem>)}
        </List>
      )}
    </Paper>
  );
};

// カード内での使用
const StatusCard = () => {
  const { status, loading } = useStatus();
  
  return (
    <Card>
      <CardHeader title="システム状態" />
      <CardContent>
        {loading ? (
          <SectionLoader size="small" message="状態確認中..." />
        ) : (
          <Typography>{status}</Typography>
        )}
      </CardContent>
    </Card>
  );
};
```

### オーバーレイローディング
```tsx
// フォーム送信での使用
const MyForm = () => {
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      await submitData(data);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* form fields */}
        <ActionButton type="submit" loading={submitting}>
          送信
        </ActionButton>
      </form>
      
      <LoadingOverlay 
        open={submitting} 
        message="申請を送信中..."
      />
    </>
  );
};
```

## 技術仕様

### 依存関係
- Material-UI (@mui/material)
  - CircularProgress
  - Typography
  - Box
  - Container（PageLoaderのみ）

### TypeScript対応
- 完全な型定義
- Props型のエクスポート
- ジェネリクス対応

### テーマ対応
- MUIテーマシステム完全対応
- primaryカラーの統一使用
- text.secondaryカラーでのメッセージ表示

### レスポンシブ対応
- 全コンポーネントでレスポンシブ対応
- 適切なbreak point設定

## 移行ガイドライン

### 既存コードからの移行

**Before（個別実装）**:
```tsx
// 個別のローディング実装
{loading && (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
    <CircularProgress size={24} />
    <Typography sx={{ ml: 2 }}>読み込み中...</Typography>
  </Box>
)}
```

**After（統一コンポーネント）**:
```tsx
// 統一ローディングコンポーネント
{loading && (
  <SectionLoader message="読み込み中..." />
)}
```

### 段階的移行戦略

1. **新規実装**: 必ず統一コンポーネントを使用
2. **既存修正時**: 修正対象ページで統一コンポーネントに置き換え
3. **一括置換**: プロジェクト完了後に残存個別実装を一括置換

## エクスポート

```tsx
// components/common/index.tsでの一括エクスポート
export { default as PageLoader, type PageLoaderProps } from './PageLoader';
export { default as SectionLoader, type SectionLoaderProps } from './SectionLoader';
export { default as LoadingOverlay, type LoadingOverlayProps } from './LoadingOverlay';
```

## 使用上の注意事項

### パフォーマンス考慮事項
- LoadingOverlayは必要時のみ表示（open=falseで非表示）
- 過度なローディング表示は避ける
- 適切なローディング粒度の選択

### アクセシビリティ
- CircularProgressはaria-labelを自動設定
- メッセージは適切なaria-live属性で読み上げ対応
- キーボードナビゲーションに配慮

### デザイン一貫性
- 独自のローディング実装は禁止
- 統一されたカラーパレットの使用
- 一貫したサイズ・余白設定

## まとめ

共通ローディングコンポーネントの導入により、以下を実現します：

- **統一されたUX**: 一貫したローディング体験
- **開発効率**: 再利用可能なコンポーネントで高速開発
- **保守性**: 一箇所での変更で全体改善
- **品質向上**: 標準化されたローディング処理

全ての新規実装および既存コード修正時は、これらの統一ローディングコンポーネントの使用を必須とします。 