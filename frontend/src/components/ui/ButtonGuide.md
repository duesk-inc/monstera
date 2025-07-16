# ActionButton 統一ボタンコンポーネント使用ガイド

## 概要

`ActionButton`は、アプリケーション全体で統一されたボタンUIを提供するコンポーネントです。
Material-UIのButtonコンポーネントをベースに、プロジェクト固有のデザインシステムに対応しています。

## 基本的な使用方法

```tsx
import ActionButton from '@/components/common/ActionButton';
// または
import { ActionButton } from '@/components/ui';

// 基本的な使用例
<ActionButton buttonType="primary">
  メインアクション
</ActionButton>
```

## ボタンタイプ（buttonType）

### primary / submit
メインアクション用。データの提出、申請、ログインなど最も重要なアクションに使用。

```tsx
<ActionButton buttonType="primary">更新する</ActionButton>
<ActionButton buttonType="submit">申請する</ActionButton>
```

### secondary / save
セカンダリアクション用。一時保存、設定、準備的なアクションに使用。

```tsx
<ActionButton buttonType="secondary">設定</ActionButton>
<ActionButton buttonType="save">一時保存</ActionButton>
```

### cancel
キャンセルアクション用。操作の取り消し、ダイアログの閉じるボタンなどに使用。

```tsx
<ActionButton buttonType="cancel">キャンセル</ActionButton>
```

### danger
危険なアクション用。削除、リセットなど取り返しのつかない操作に使用。

```tsx
<ActionButton buttonType="danger">削除する</ActionButton>
```

### ghost
軽微なアクション用。詳細表示、展開・折りたたみなどに使用。

```tsx
<ActionButton buttonType="ghost">詳細を見る</ActionButton>
```

### default
デフォルトアクション用。一般的な操作に使用。

```tsx
<ActionButton buttonType="default">確認</ActionButton>
```

## プロパティ

| プロパティ | 型 | デフォルト値 | 説明 |
|-----------|----|---------|----|
| buttonType | ActionButtonVariant | 'default' | ボタンの種類 |
| size | ResponsiveSize | 'medium' | ボタンのサイズ（固定値またはレスポンシブオブジェクト） |
| loading | boolean | false | ローディング状態 |
| icon | React.ReactNode | - | アイコン（startIcon） |
| fullWidth | boolean \| ResponsiveFullWidth | false | 幅を100%にするか（固定値またはレスポンシブオブジェクト） |
| disabled | boolean | false | 無効状態 |

## レスポンシブ対応

### レスポンシブサイズ
```tsx
// レスポンシブサイズの使用例
<ActionButton 
  buttonType="primary"
  size={{ xs: 'small', sm: 'medium', md: 'large' }}
>
  レスポンシブボタン
</ActionButton>
```

### レスポンシブ幅
```tsx
// モバイルでフル幅、デスクトップで通常幅
<ActionButton 
  buttonType="primary"
  fullWidth={{ xs: true, sm: false }}
>
  応募する
</ActionButton>
```

### 実用的なレスポンシブパターン
```tsx
// 完全レスポンシブボタン
<ActionButton 
  buttonType="primary"
  size={{ xs: 'small', sm: 'medium', lg: 'large' }}
  fullWidth={{ xs: true, sm: true, md: false }}
  icon={<SendIcon />}
>
  送信
</ActionButton>
```

## 使用例

### ローディング状態
```tsx
<ActionButton 
  buttonType="primary" 
  loading={isSubmitting}
>
  {isSubmitting ? '送信中...' : '送信'}
</ActionButton>
```

### アイコン付き
```tsx
import { Save as SaveIcon } from '@mui/icons-material';

<ActionButton 
  buttonType="save" 
  icon={<SaveIcon />}
>
  保存
</ActionButton>
```

### サイズバリエーション
```tsx
<ActionButton size="small" buttonType="secondary">小</ActionButton>
<ActionButton size="medium" buttonType="primary">中</ActionButton>
<ActionButton size="large" buttonType="primary">大</ActionButton>
```

### フル幅
```tsx
<ActionButton 
  buttonType="primary" 
  fullWidth
>
  フル幅ボタン
</ActionButton>
```

## 移行ガイド

### 既存のMUI Buttonから移行

**Before:**
```tsx
import { Button } from '@mui/material';

<Button variant="contained" color="primary">
  更新
</Button>
```

**After:**
```tsx
import ActionButton from '@/components/common/ActionButton';

<ActionButton buttonType="primary">
  更新
</ActionButton>
```

### 既存のActionButtonから移行

既存のActionButtonは完全に後方互換性があるため、追加作業は不要です。
新しい機能（size、fullWidth、拡張されたbuttonType）を必要に応じて活用してください。

## 注意事項

1. **デグレード防止**: 既存のbuttonType（submit, save, cancel, default）は完全に同じ動作を保持
2. **MUIプロパティ**: MUIのButtonプロパティ（sx、onClick等）はそのまま使用可能
3. **テーマ連携**: プロジェクトのMUIテーマが自動適用される
4. **アクセシビリティ**: MUIのButtonベースなので、アクセシビリティ機能は継承

## 開発時の推奨事項

1. 新規開発では必ずActionButtonを使用
2. 既存コードの修正時に可能な範囲でActionButtonに移行
3. カスタムスタイリング（sx）を多用する場合は、新しいbuttonTypeの追加を検討 