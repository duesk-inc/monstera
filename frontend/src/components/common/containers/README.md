# 統一コンテナコンポーネントガイド

## 概要

フロントエンドアプリケーション全体のペーパーコンテナを統一化し、一貫性のあるデザインとUXを提供するコンポーネント群です。

## コンポーネント一覧

### FormContainer

フォーム系ページに最適化されたコンテナコンポーネント

```tsx
import { FormContainer } from '@/components/common';

<FormContainer
  title="ページタイトル"
  subtitle="ページの説明文"
  loading={isLoading}
  error={errorMessage}
  variant="default"
  padding="medium"
  data-testid="form-container"
>
  {/* フォームコンテンツ */}
</FormContainer>
```

#### Props

| プロパティ | 型 | デフォルト | 説明 |
|-----------|----|-----------|----|
| title | string? | - | フォームのタイトル |
| subtitle | string? | - | サブタイトル・説明文 |
| children | ReactNode | - | コンテンツ（必須） |
| loading | boolean | false | ローディング状態 |
| error | string \| null | null | エラーメッセージ |
| variant | 'default' \| 'outlined' \| 'elevated' | 'default' | 見た目のバリエーション |
| padding | 'small' \| 'medium' \| 'large' | 'medium' | パディングサイズ |
| marginBottom | number | 4 | 下マージン |
| data-testid | string? | - | テスト用ID |

### ContentContainer

コンテンツエリア系ページに最適化されたコンテナコンポーネント

```tsx
import { ContentContainer } from '@/components/common';

<ContentContainer
  title="コンテンツタイトル"
  subtitle="コンテンツの説明"
  variant="default"
  spacing="normal"
  data-testid="content-container"
>
  {/* コンテンツ */}
</ContentContainer>
```

#### Props

| プロパティ | 型 | デフォルト | 説明 |
|-----------|----|-----------|----|
| title | string? | - | コンテンツのタイトル |
| subtitle | string? | - | サブタイトル・説明文 |
| children | ReactNode | - | コンテンツ（必須） |
| loading | boolean | false | ローディング状態 |
| error | string \| null | null | エラーメッセージ |
| variant | 'default' \| 'minimal' \| 'elevated' | 'default' | 見た目のバリエーション |
| spacing | 'compact' \| 'normal' \| 'comfortable' | 'normal' | スペーシング |
| marginBottom | number | 3 | 下マージン |
| data-testid | string? | - | テスト用ID |

## 移行実績

以下のページが新しい統一コンテナに移行済みです：

### ✅ 移行完了ページ

1. **プロフィールページ** (`/profile`)
   - 移行前: `<Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>`
   - 移行後: `<FormContainer>` 
   - 状態: ✅ 完了・動作確認済み

2. **経費申請ページ** (`/expense`)
   - 移行前: `<Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>`
   - 移行後: `<FormContainer title="経費申請" subtitle="...">`
   - 状態: ✅ 完了・動作確認済み

3. **プロジェクトページ** (`/project`)
   - 移行前: `<Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>`
   - 移行後: `<FormContainer title="案件情報" subtitle="...">`
   - 状態: ✅ 完了・動作確認済み

4. **休暇申請ページ** (`/leave`)
   - 移行前: `<Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>`
   - 移行後: `<FormContainer title="休暇申請" subtitle="...">`
   - 状態: ✅ 完了・動作確認済み

### 🔄 移行対象外ページ

以下のページは移行対象外または別途対応予定：

- **ログインページ** - 特殊なスタイリング要件のため現状維持
- **ダッシュボードページ** - 複数コンテナ要素があるため個別検討
- **通知ページ** - 特殊なレイアウト要件のため個別検討

## ベストプラクティス

### 🎯 使用指針

1. **新規ページ作成時**
   - フォーム中心 → `FormContainer`を使用
   - 表示中心 → `ContentContainer`を使用

2. **既存ページ改修時**
   - Paperコンテナを見つけたら統一コンテナへの移行を検討
   - デグレード防止のため段階的に移行

3. **スタイルカスタマイズ**
   - 基本的にpropsで制御
   - 特殊要件がある場合のみsxプロップを併用

### ⚠️ 注意事項

1. **後方互換性**
   - 既存のPaperコンポーネントと完全に互換性を保持
   - 既存機能への影響は一切なし

2. **デグレード防止**
   - 移行前に必ず動作確認
   - テストIDを設定してE2Eテスト対応

3. **パフォーマンス**
   - コンポーネント内でローディング・エラー状態を一元管理
   - 不要な再レンダリングを防止

## 統一されたデザイン仕様

### 共通スタイル

- **borderRadius**: 2 (12px)
- **基本パディング**: 3 (24px)
- **マージンボトム**: 3-4 (24-32px)
- **elevation**: 1（テーマデフォルト）

### バリアント別スタイル

| バリアント | 用途 | 特徴 |
|-----------|------|------|
| default | 標準 | テーマデフォルトの影とボーダー |
| outlined | 軽量表示 | ボーダーのみ、影なし |
| elevated | 強調表示 | より強い影とエレベーション |
| minimal | 最小限 | 透明背景、装飾最小限 |

## トラブルシューティング

### よくある問題

1. **TypeScriptエラー**
   ```tsx
   // ❌ 間違い
   import FormContainer from '@/components/common/FormContainer';
   
   // ✅ 正しい
   import { FormContainer } from '@/components/common';
   ```

2. **レイアウト崩れ**
   - marginBottomプロップでスペーシング調整
   - paddingプロップでコンテンツ内スペース調整

3. **既存スタイルとの競合**
   - ContainerコンポーネントのsxプロップはFormContainer内で使用可能
   - 子要素のスタイルは引き続き適用される

## 改修効果

### ✅ 達成した統一化

1. **デザイン統一性**
   - 全ページで一貫したコンテナスタイル
   - 統一されたパディング・マージン・角丸

2. **開発効率向上**
   - ローディング・エラー状態の一元管理
   - テストIDの標準化

3. **保守性向上**
   - コンテナスタイルの一箇所管理
   - プロップベースでの柔軟なカスタマイズ

4. **アクセシビリティ**
   - 適切な見出し構造
   - 一貫したエラー表示

### 🚀 今後の展開

1. **段階的拡張**
   - 週報ページなど残りページへの適用
   - ダイアログコンテナの統一化

2. **機能拡張**
   - アニメーション効果の追加
   - ダークテーマ対応

3. **パフォーマンス最適化**
   - レイジーローディング対応
   - メモ化の導入

---

**改修担当**: AI Assistant  
**改修日**: 2024年12月  
**品質保証**: デグレード防止・段階的移行・動作確認済み 