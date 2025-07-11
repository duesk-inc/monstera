# ActionButtonコンポーネント定義書

## 概要

ActionButtonコンポーネントは、アプリケーション全体で統一されたボタンUIを提供するための共通コンポーネントです。Material-UIのButtonコンポーネントをベースに、プロジェクト固有のデザインシステムに合わせたプリセット化されたボタンバリエーションを提供します。

## 設計原則

### 1. **デザインシステムの統一**
- 8つの明確なボタンタイプで用途別の統一
- MUIテーマとの完全な連携
- 一貫したビジュアル言語の維持

### 2. **開発者体験の向上**
- プリセット化による実装効率化
- MUIのButtonプロパティとの完全な互換性
- TypeScriptによる型安全性

### 3. **保守性とスケーラビリティ**
- 中央集約による変更影響範囲の制御
- 段階的移行対応
- 既存コードとの共存

## API仕様

### Props

| プロパティ | 型 | デフォルト値 | 説明 |
|------------|----|--------------|----|
| `buttonType` | `ActionButtonVariant` | `'default'` | ボタンの種類を指定 |
| `icon` | `React.ReactNode` | `undefined` | ボタンのアイコン |
| `loading` | `boolean` | `false` | ローディング状態の制御 |
| `size` | `ActionButtonSize` | `'medium'` | ボタンのサイズ |
| `fullWidth` | `boolean` | `false` | 幅100%表示の制御 |
| `children` | `React.ReactNode` | - | ボタンのテキストまたは内容 |
| その他 | `ButtonProps` | - | MUIのButtonコンポーネントの全プロパティ |

### 型定義

```typescript
export type ActionButtonVariant = 
  | 'submit' 
  | 'save' 
  | 'cancel' 
  | 'default' 
  | 'primary' 
  | 'secondary' 
  | 'danger' 
  | 'ghost';

export type ActionButtonSize = 'small' | 'medium' | 'large';

interface ActionButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  buttonType?: ActionButtonVariant;
  icon?: React.ReactNode;
  loading?: boolean;
  size?: ActionButtonSize;
  fullWidth?: boolean;
}
```

## ボタンタイプ仕様

### 1. `primary` / `submit`
- **外観**: Contained、Primary色
- **用途**: メインアクション、フォーム送信
- **例**: 申請する、ログイン、保存して送信

```tsx
<ActionButton buttonType="primary">申請する</ActionButton>
<ActionButton buttonType="submit">送信</ActionButton>
```

### 2. `secondary` / `save`
- **外観**: Outlined、Primary色
- **用途**: セカンダリアクション、保存操作
- **例**: 下書き保存、設定変更、フィルタリング

```tsx
<ActionButton buttonType="secondary">下書き保存</ActionButton>
<ActionButton buttonType="save">設定を保存</ActionButton>
```

### 3. `danger`
- **外観**: Contained、Error色
- **用途**: 削除や破壊的操作
- **例**: 削除、リセット、アカウント無効化

```tsx
<ActionButton buttonType="danger">削除する</ActionButton>
```

### 4. `ghost`
- **外観**: Text、Primary色
- **用途**: 軽微なアクション、ナビゲーション
- **例**: 戻る、キャンセル、詳細表示

```tsx
<ActionButton buttonType="ghost">戻る</ActionButton>
```

### 5. `cancel`
- **外観**: Outlined、Inherit色
- **用途**: キャンセル操作、モーダル閉じる
- **例**: キャンセル、閉じる

```tsx
<ActionButton buttonType="cancel">キャンセル</ActionButton>
```

### 6. `default`
- **外観**: Outlined、Primary色
- **用途**: 汎用的な操作
- **例**: 確認、変更、その他

```tsx
<ActionButton buttonType="default">確認</ActionButton>
```

## 使用例

### 基本的な使用方法

```tsx
import ActionButton from '@/components/common/ActionButton';

// 基本的なプライマリボタン
<ActionButton buttonType="primary">
  申請する
</ActionButton>

// アイコン付きボタン
<ActionButton 
  buttonType="secondary" 
  icon={<SaveIcon />}
>
  保存
</ActionButton>

// ローディング状態
<ActionButton 
  buttonType="primary" 
  loading={isSubmitting}
>
  送信中...
</ActionButton>

// フルサイズボタン
<ActionButton 
  buttonType="primary" 
  fullWidth
  size="large"
>
  続行
</ActionButton>
```

### 実践的な使用パターン

#### 1. フォーム送信パターン

```tsx
// 申請フォーム
<Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
  <ActionButton 
    buttonType="secondary"
    onClick={handleReset}
  >
    全てクリア
  </ActionButton>
  <ActionButton 
    buttonType="primary"
    loading={isSubmitting}
    onClick={handleSubmit}
  >
    申請する
  </ActionButton>
</Box>
```

#### 2. モーダルダイアログパターン

```tsx
// 削除確認ダイアログ
<DialogActions>
  <ActionButton buttonType="cancel" onClick={onClose}>
    キャンセル
  </ActionButton>
  <ActionButton 
    buttonType="danger" 
    loading={isDeleting}
    onClick={handleDelete}
  >
    削除する
  </ActionButton>
</DialogActions>
```

#### 3. ナビゲーションパターン

```tsx
// ページヘッダー
<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
  <ActionButton 
    buttonType="ghost"
    icon={<ArrowBackIcon />}
    onClick={() => router.back()}
  >
    戻る
  </ActionButton>
  
  <ActionButton 
    buttonType="primary"
    icon={<AddIcon />}
    onClick={handleCreate}
  >
    新規作成
  </ActionButton>
</Box>
```

#### 4. 条件付きスタイリング

```tsx
// 選択状態に応じたボタン表示
{items.map((item) => (
  <ActionButton
    key={item.id}
    buttonType={selectedItem === item.id ? 'primary' : 'secondary'}
    onClick={() => setSelectedItem(item.id)}
  >
    {item.name}
  </ActionButton>
))}
```

## レスポンシブ対応

```tsx
// モバイル・デスクトップでサイズ調整
<ActionButton 
  buttonType="primary"
  size={{ xs: 'small', sm: 'medium', md: 'large' }}
  fullWidth={{ xs: true, sm: false }}
>
  応募する
</ActionButton>
```

## アクセシビリティ配慮

ActionButtonは、MUIのButtonコンポーネントをベースにしているため、以下のアクセシビリティ機能を自動的に継承します：

- キーボードナビゲーション対応
- ARIAラベルサポート
- フォーカス管理
- スクリーンリーダー対応

```tsx
// アクセシビリティ強化の例
<ActionButton 
  buttonType="danger"
  aria-label="プロフィール写真を削除"
  title="この操作は取り消せません"
>
  削除
</ActionButton>
```

## 移行ガイドライン

### 既存MUIボタンからの移行

```tsx
// 移行前（MUI Button直接使用）
<Button variant="contained" color="primary">
  送信
</Button>

// 移行後（ActionButton使用）
<ActionButton buttonType="primary">
  送信
</ActionButton>
```

### 段階的移行戦略

1. **Phase 1**: 新規機能でActionButton使用開始
2. **Phase 2**: 既存ページの主要ボタンを優先移行
3. **Phase 3**: 残りのボタンを順次移行
4. **Phase 4**: MUIのButton直接使用を禁止

### 移行チェックリスト

- [ ] ボタンの用途に適したbuttonTypeを選択
- [ ] ローディング状態を適切に管理
- [ ] アイコンが必要な場合は適切に設定
- [ ] アクセシビリティ属性を適切に設定
- [ ] レスポンシブ対応が必要な場合は適切に設定

## ベストプラクティス

### 1. ボタンタイプの選択基準

- **primary**: ページで最も重要なアクション（1つまで）
- **secondary**: 重要だが主要でないアクション
- **danger**: 不可逆な破壊的操作
- **ghost**: 軽微なアクションやナビゲーション
- **cancel**: 明確なキャンセル操作

### 2. ローディング状態の管理

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await submitForm();
  } finally {
    setIsSubmitting(false);
  }
};

<ActionButton 
  buttonType="primary"
  loading={isSubmitting}
  onClick={handleSubmit}
>
  {isSubmitting ? '送信中...' : '送信'}
</ActionButton>
```

### 3. アイコンの適切な使用

```tsx
// 推奨: Material-UIアイコンの使用
import { SaveIcon, SendIcon, DeleteIcon } from '@mui/icons-material';

<ActionButton buttonType="secondary" icon={<SaveIcon />}>
  保存
</ActionButton>
```

## パフォーマンス考慮事項

- **メモ化**: 必要に応じて`React.memo`でラップ
- **イベントハンドラー**: `useCallback`でメモ化
- **条件付きレンダリング**: 不要な再レンダリングを避ける

```tsx
const MemoizedActionButton = React.memo(ActionButton);

const handleClick = useCallback(() => {
  // イベント処理
}, [dependencies]);
```

## トラブルシューティング

### よくある問題と解決方法

1. **ボタンが正しくスタイリングされない**
   - MUIテーマの設定を確認
   - buttonTypeの値が正しいか確認

2. **ローディング状態が機能しない**
   - loading propsが正しく渡されているか確認
   - 状態管理ロジックを確認

3. **アイコンが表示されない**
   - React.ReactNode型のアイコンを渡しているか確認
   - Material-UIアイコンのインポートを確認

## 今後の拡張予定

- **テーマ連携強化**: カスタムカラーパレット対応
- **アニメーション**: ホバー・クリックアニメーション追加
- **バリアント追加**: 新しいボタンタイプの検討
- **サイズ拡張**: さらなるサイズオプション

## 関連ドキュメント

- [フロントエンド開発標準仕様書](./frontend-specification.md)
- [コンポーネント設計ガイドライン](./frontend-specification.md#コンポーネント設計)
- [Material-UI公式ドキュメント](https://mui.com/material-ui/react-button/) 