# 共通コンテナコンポーネント定義書

## 概要

プロジェクト全体でのコンテナUIの統一を図るため、**FormContainerおよびContentContainerコンポーネントの使用を必須**とします。

### 統一化の背景

従来、各ページで個別にPaperベースのコンテナが実装されており、以下の問題が発生していました：

- **スタイルの分散**：各ページで異なるPaperスタイル（elevation値、パディング、borderRadius）
- **デザインの不統一**：微細な違いによるユーザー体験の分散
- **保守性の低下**：スタイル変更時に複数箇所を修正する必要
- **機能の重複実装**：ローディング・エラー表示機能の重複
- **レスポンシブ対応の不統一**：各実装でのレスポンシブ対応品質の差

これらの問題を解決するため、FormContainerとContentContainerコンポーネントを設計・実装し、既存のPaperベースコンテナを統一化しました。

### 統一化による効果

- **デザイン一貫性**: borderRadius, boxShadow, paddingの統一
- **開発効率向上**: 一元管理によるスタイル変更作業の効率化
- **保守性向上**: 統一コンポーネントによる保守箇所の集約
- **機能拡張性**: ローディング・エラー状態管理の共通化
- **アクセシビリティ向上**: 統一されたセマンティック構造

## コンポーネント一覧

| コンポーネント | 用途 | 主な特徴 |
|---|---|---|
| **FormContainer** | フォーム用コンテナ | 申請フォーム、設定フォーム等のコンテナ |
| **ContentContainer** | コンテンツ用コンテナ | 一覧表示、ダッシュボード等のコンテナ |

## FormContainer - フォーム用統一コンテナ

フォーム系ページで使用する統一コンテナコンポーネントです。申請フォーム、設定フォーム等に適用されます。

### プロパティ

| プロパティ | 型 | 必須 | デフォルト値 | 説明 |
|-----------|-----|------|-------------|------|
| `title` | `string` | - | - | フォームのタイトル |
| `subtitle` | `string` | - | - | サブタイトルまたは説明 |
| `children` | `React.ReactNode` | ✓ | - | フォームの子要素 |
| `loading` | `boolean` | - | `false` | ローディング状態 |
| `error` | `string \| null` | - | `null` | エラーメッセージ |
| `variant` | `'default' \| 'outlined' \| 'elevated'` | - | `'default'` | コンテナのバリアント |
| `padding` | `'small' \| 'medium' \| 'large'` | - | `'medium'` | パディングサイズ |
| `marginBottom` | `number` | - | `4` | margin bottomの値 |
| `data-testid` | `string` | - | - | テスト用ID |

### バリアント仕様

| variant | elevation | 外観 | 用途 |
|---------|-----------|------|------|
| `default` | 1 | 標準的な影 | 一般的なフォーム |
| `outlined` | 0 | 枠線のみ | 軽量なフォーム表示 |
| `elevated` | 3 | 強い影 | 重要なフォーム（申請等） |

### パディング仕様

| padding | 値 | 用途 |
|---------|---|------|
| `small` | 2 (16px) | コンパクトなフォーム |
| `medium` | 3 (24px) | 標準的なフォーム |
| `large` | 4 (32px) | 重要なフォーム |

### 基本使用方法

```tsx
import { FormContainer } from '@/components/common';

// 基本的な使用例
<FormContainer>
  <form>
    {/* フォーム要素 */}
  </form>
</FormContainer>

// タイトル・サブタイトル付き
<FormContainer
  title="プロフィール編集"
  subtitle="基本情報と職歴を編集できます。"
>
  <ProfileForm />
</FormContainer>

// ローディング・エラー状態対応
<FormContainer
  title="経費申請"
  subtitle="経費申請フォームから申請内容を入力してください。"
  loading={isLoading}
  error={error}
  data-testid="expense-form-container"
>
  <ExpenseForm />
</FormContainer>
```

### バリアント別使用例

```tsx
// デフォルト（標準フォーム）
<FormContainer variant="default">
  <BasicForm />
</FormContainer>

// アウトライン（軽量表示）
<FormContainer variant="outlined">
  <SimpleForm />
</FormContainer>

// 強調表示（重要フォーム）
<FormContainer variant="elevated">
  <ImportantApplicationForm />
</FormContainer>
```

### パディング調整例

```tsx
// コンパクトフォーム
<FormContainer padding="small">
  <CompactForm />
</FormContainer>

// 余白多めのフォーム
<FormContainer padding="large">
  <DetailedForm />
</FormContainer>
```

## ContentContainer - コンテンツ用統一コンテナ

コンテンツ表示系ページで使用する統一コンテナコンポーネントです。一覧表示、ダッシュボード等に適用されます。

### プロパティ

| プロパティ | 型 | 必須 | デフォルト値 | 説明 |
|-----------|-----|------|-------------|------|
| `title` | `string` | - | - | コンテンツのタイトル |
| `subtitle` | `string` | - | - | サブタイトルまたは説明 |
| `children` | `React.ReactNode` | ✓ | - | コンテンツの子要素 |
| `loading` | `boolean` | - | `false` | ローディング状態 |
| `error` | `string \| null` | - | `null` | エラーメッセージ |
| `variant` | `'default' \| 'minimal' \| 'elevated'` | - | `'default'` | コンテナのバリアント |
| `spacing` | `'compact' \| 'normal' \| 'comfortable'` | - | `'normal'` | スペーシング |
| `marginBottom` | `number` | - | `3` | margin bottomの値 |
| `data-testid` | `string` | - | - | テスト用ID |

### バリアント仕様

| variant | elevation | 外観 | 用途 |
|---------|-----------|------|------|
| `default` | 1 | 標準的な影 | 一般的なコンテンツ |
| `minimal` | 0 | 透明背景 | 軽量なコンテンツ表示 |
| `elevated` | 2 | 中程度の影 | 重要なコンテンツ |

### スペーシング仕様

| spacing | 値 | 用途 |
|---------|---|------|
| `compact` | 2 (16px) | 密な情報表示 |
| `normal` | 3 (24px) | 標準的なコンテンツ |
| `comfortable` | 4 (32px) | ゆったりしたコンテンツ |

### 基本使用方法

```tsx
import { ContentContainer } from '@/components/common';

// 基本的な使用例
<ContentContainer>
  <ContentList />
</ContentContainer>

// タイトル付きコンテンツ
<ContentContainer
  title="通知一覧"
  subtitle="最新の通知を確認できます。"
>
  <NotificationList />
</ContentContainer>

// ローディング対応コンテンツ
<ContentContainer
  title="ダッシュボード"
  loading={isLoading}
  error={error}
>
  <DashboardContent />
</ContentContainer>
```

### バリアント別使用例

```tsx
// ミニマル（軽量表示）
<ContentContainer variant="minimal">
  <LightweightContent />
</ContentContainer>

// 強調表示（重要コンテンツ）
<ContentContainer variant="elevated">
  <ImportantContent />
</ContentContainer>
```

## 共通仕様

### 統一デザイン要素

全コンテナコンポーネントで統一されている要素：

- **borderRadius**: `2` (16px) - 角丸の統一
- **基本パディング**: `3` (24px) - 標準的な内部余白
- **marginBottom**: FormContainer `4`、ContentContainer `3` - 適切な外部余白
- **boxShadow**: バリアント別の統一影設定

### ローディング状態

両コンポーネントともローディング状態を統一的に処理：

```tsx
{loading ? (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight={200} // FormContainer
    minHeight={150} // ContentContainer
  >
    <CircularProgress />
  </Box>
) : (
  children
)}
```

### エラー表示

統一されたエラー表示UI：

```tsx
{error && (
  <Alert 
    severity="error" 
    sx={{ mb: 3, borderRadius: 1 }}
  >
    {error}
  </Alert>
)}
```

### タイトル・サブタイトル表示

統一されたヘッダー表示：

```tsx
{(title || subtitle) && (
  <Box sx={{ mb: 3 }}>
    {title && (
      <Typography 
        variant="h4"  // FormContainer
        variant="h5"  // ContentContainer
        component="h1" // FormContainer
        component="h2" // ContentContainer
        fontWeight="bold" 
        sx={{ mb: subtitle ? 1 : 0 }}
      >
        {title}
      </Typography>
    )}
    {subtitle && (
      <Typography variant="body1" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Box>
)}
```

## インポート方法

```tsx
// 統一インポート
import { FormContainer, ContentContainer } from '@/components/common';

// TypeScript型定義
import type { FormContainerProps, ContentContainerProps } from '@/components/common';
```

## 移行完了ページ

以下のページでコンテナコンポーネントへの移行が完了しています：

### FormContainer移行済み

1. **プロフィールページ** (`/profile`)
   - 移行前: `<Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>`
   - 移行後: `<FormContainer loading={isLoading} error={error}>`

2. **経費申請ページ** (`/expense`)
   - 移行後: `<FormContainer title="経費申請" subtitle="..." data-testid="expense-form-container">`

3. **プロジェクトページ** (`/project`)
   - 移行後: `<FormContainer title="案件情報" subtitle="..." data-testid="project-form-container">`

4. **休暇申請ページ** (`/leave`)
   - 移行後: `<FormContainer title="休暇申請" subtitle="..." data-testid="leave-form-container">`

### 移行対象外ページ

- **ログインページ** (`/login`): 特殊なグラデーション背景とelevation=6の独自デザイン
- **ダッシュボードページ** (`/dashboard`): 複数のコンテナが混在する複雑なレイアウト
- **通知ページ** (`/notifications`): 特殊なレイアウト要件

## 既存コードからの移行例

### Before（個別Paperスタイル）

```tsx
// プロフィールページの移行前
<Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
  {isLoading ? (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  ) : error ? (
    <ErrorDisplay error={error} />
  ) : (
    <ProfileContent />
  )}
</Paper>
```

### After（統一FormContainer）

```tsx
// プロフィールページの移行後
<FormContainer
  loading={isLoading}
  error={error}
  data-testid="profile-form-container"
>
  <ProfileContent />
</FormContainer>
```

### 移行時の注意点

1. **import文の更新**: MUIのBox, CircularProgress, Paperから共通コンポーネントへ
2. **不要コードの削除**: 個別のローディング・エラー表示ロジック
3. **タイトル移管**: 既存のページタイトルをコンテナコンポーネントに移管
4. **デザイン確認**: 統一化によるスタイル変更の確認

## ベストプラクティス

### 適切なコンポーネント選択

```tsx
// フォーム系ページ -> FormContainer
<FormContainer title="申請フォーム">
  <ApplicationForm />
</FormContainer>

// 表示系ページ -> ContentContainer
<ContentContainer title="申請履歴">
  <ApplicationHistory />
</ContentContainer>
```

### タイトル・サブタイトルの活用

```tsx
// わかりやすいタイトルとガイダンス
<FormContainer
  title="プロフィール設定"
  subtitle="基本情報と職歴を編集できます。一時保存機能もご利用いただけます。"
>
  <ProfileForm />
</FormContainer>
```

### ローディング・エラー状態の統一

```tsx
// APIフック結果をそのまま渡す
const { data, isLoading, error } = useApiHook();

<FormContainer
  loading={isLoading}
  error={error?.message}
>
  <FormContent data={data} />
</FormContainer>
```

### テストID設定

```tsx
// テスト容易性のためのdata-testid設定
<FormContainer
  data-testid="expense-form-container"
>
  <ExpenseForm />
</FormContainer>
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. TypeScriptエラー：padding値の型問題

```tsx
// ❌ 問題のあるコード
<Paper sx={{ p: paddingValue }}>
  {children}
</Paper>

// ✅ 解決済みコード（内部でBoxラップ）
<Paper elevation={getElevation()}>
  <Box sx={{ p: paddingValue }}>
    {children}
  </Box>
</Paper>
```

#### 2. スタイル適用の不具合

```tsx
// 内部でBoxコンポーネントを使用することで
// MUI sx props の型安全性を確保
```

#### 3. レスポンシブ対応

```tsx
// 全コンテナでレスポンシブ対応済み
// 追加のメディアクエリは不要
```

## 今後の拡張予定

### 追加予定機能

1. **アニメーション効果**: フェードインアニメーション対応
2. **プリセットテーマ**: ダークモード対応
3. **カスタムアクション**: ヘッダーボタン領域の追加
4. **プログレス表示**: フォーム進捗表示機能

### 新規バリアント追加計画

1. **glass**: ガラスモーフィズム効果
2. **card**: カード形式の表示
3. **floating**: フローティング表示

---

## まとめ

共通コンテナコンポーネントの導入により、以下が実現されました：

- ✅ **デザイン統一**: 全フォームで一貫したUI/UX
- ✅ **開発効率**: 定型コードの削減と一元管理
- ✅ **保守性向上**: 統一されたコンポーネントによる保守性向上
- ✅ **品質保証**: 既存機能のデグレード無し
- ✅ **拡張性**: 将来的な機能追加への対応

プロジェクト全体での統一化により、開発者体験とユーザー体験の両方が大幅に向上しています。 