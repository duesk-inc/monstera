# 共通通知・フィードバックコンポーネント仕様書

## 概要

フロントエンドアプリケーション全体で統一された通知・フィードバック機能を提供するコンポーネント群です。ユーザーアクションの結果や重要な情報を一貫性のあるUIで表示します。

## アーキテクチャ

### システム構成

```
ToastProvider (Context Provider)
├── useToast Hook (API提供)
├── UnifiedAlert系 (Alert基盤コンポーネント)
│   ├── ErrorAlert
│   ├── SuccessAlert  
│   ├── WarningAlert
│   └── InfoAlert
└── 後方互換V2系 (段階的移行用)
    ├── SuccessSnackbarV2
    └── ErrorDisplayV2
```

### 設計思想

- **一元管理**: 通知状態を中央集約し、アプリケーション全体で統一
- **型安全性**: TypeScriptによる厳密な型定義
- **後方互換性**: 既存コンポーネントを残しつつ段階的移行
- **デザイン統一**: MaterialUI Alert標準デザインで全画面統一

## コンポーネント詳細

### 1. ToastProvider

アプリケーション全体の通知状態を管理するContextプロバイダー。

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|----|----|----------|-----|
| children | ReactNode | ✓ | - | プロバイダー配下のコンポーネント |

#### 提供する状態

```typescript
interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  position?: 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';
}
```

#### 使用例

```typescript
// providers.tsx
import { ToastProvider } from '@/components/common';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
```

### 2. useToast Hook

通知機能にアクセスするためのカスタムフック。

#### API

```typescript
interface UseToastReturn {
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}

interface ToastOptions {
  title?: string;
  duration?: number;
  position?: 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';
}
```

#### 使用例

```typescript
import { useToast } from '@/components/common';

function MyComponent() {
  const { showSuccess, showError } = useToast();
  
  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('保存が完了しました');
    } catch (error) {
      showError('保存に失敗しました');
    }
  };
}
```

### 3. UnifiedAlert

汎用的なアラート表示の基盤コンポーネント。

#### Props

```typescript
interface UnifiedAlertProps {
  open: boolean;
  onClose?: () => void;
  severity: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  details?: string;
  actions?: React.ReactNode;
  retryAction?: {
    label: string;
    onClick: () => void;
  };
  sx?: SxProps<Theme>;
}
```

#### 使用例

```typescript
<UnifiedAlert
  open={showAlert}
  onClose={() => setShowAlert(false)}
  severity="error"
  title="エラー"
  message="処理に失敗しました"
  details="ネットワーク接続を確認してください"
  retryAction={{
    label: "再試行",
    onClick: handleRetry
  }}
/>
```

### 4. 特化型Alertコンポーネント

#### ErrorAlert

エラー表示専用のコンポーネント。

```typescript
interface ErrorAlertProps {
  open: boolean;
  onClose?: () => void;
  message: string;
  title?: string;
  details?: string;
  retryAction?: {
    label: string;
    onClick: () => void;
  };
  sx?: SxProps<Theme>;
}
```

#### SuccessAlert

成功表示専用のコンポーネント。

```typescript
interface SuccessAlertProps {
  open: boolean;
  onClose?: () => void;
  message: string;
  title?: string;
  sx?: SxProps<Theme>;
}
```

#### WarningAlert

警告表示専用のコンポーネント。

```typescript
interface WarningAlertProps {
  open: boolean;
  onClose?: () => void;
  message: string;
  title?: string;
  details?: string;
  sx?: SxProps<Theme>;
}
```

#### InfoAlert

情報表示専用のコンポーネント。

```typescript
interface InfoAlertProps {
  open: boolean;
  onClose?: () => void;
  message: string;
  title?: string;
  details?: string;
  sx?: SxProps<Theme>;
}
```

## デザイン仕様

### Toast仕様

- **位置**: bottom-center（画面下部中央）
- **幅**: 100%（コンテナ幅）
- **表示時間**: 6秒（デフォルト）
- **スタイル**: MaterialUI Alert標準デザイン
- **アニメーション**: フェードイン・フェードアウト

### Alert仕様

- **スタイル**: MaterialUI Alert標準デザイン
- **アイコン**: 各severityに対応した標準アイコン
- **カラー**: MaterialUIテーマカラー準拠
- **レスポンシブ**: 全画面サイズ対応

### カラー仕様

| Severity | カラー | 用途 |
|----------|--------|------|
| success | #4caf50 | 成功通知 |
| error | #f44336 | エラー通知 |
| warning | #ff9800 | 警告通知 |
| info | #2196f3 | 情報通知 |

## 移行ガイド

### Phase 1: 並行運用（完了）

既存コンポーネントと新システムの並行運用。

```typescript
// 旧システム（非推奨、動作継続）
import { SuccessSnackbar } from '@/components/common';

// 新システム（推奨）
import { useToast } from '@/components/common';
```

### Phase 2: 段階的移行（完了）

各画面での新システムへの段階的移行。

**移行完了画面:**
- ✅ 通知設定画面
- ✅ プロフィール画面  
- ✅ 休暇申請画面
- ✅ 週報画面

### Phase 3: 完全移行（今後予定）

旧システムの完全削除と新システム統一。

## 実装例

### 基本的な使用パターン

```typescript
// 1. 成功通知
const { showSuccess } = useToast();
showSuccess('データが正常に保存されました');

// 2. エラー通知（タイトル付き）
const { showError } = useToast();
showError('保存に失敗しました', {
  title: 'エラー',
  duration: 8000
});

// 3. 警告通知（カスタム位置）
const { showWarning } = useToast();
showWarning('一部データが更新できませんでした', {
  position: 'top-right'
});

// 4. アラート表示
const [showAlert, setShowAlert] = useState(false);

<ErrorAlert
  open={showAlert}
  onClose={() => setShowAlert(false)}
  message="ネットワークエラーが発生しました"
  retryAction={{
    label: "再試行",
    onClick: handleRetry
  }}
/>
```

### フォーム送信での使用例

```typescript
const { showSuccess, showError } = useToast();

const handleSubmit = async (data: FormData) => {
  try {
    await submitForm(data);
    showSuccess('フォームが正常に送信されました');
    
    // フォームリセット等の後続処理
    reset();
    router.push('/success');
  } catch (error) {
    if (error instanceof ValidationError) {
      showWarning('入力内容を確認してください', {
        title: '入力エラー'
      });
    } else {
      showError('送信に失敗しました。時間をおいて再度お試しください');
    }
  }
};
```

### API呼び出しでの使用例

```typescript
const { showSuccess, showError, showInfo } = useToast();

const handleApiCall = async () => {
  showInfo('データを読み込み中...');
  
  try {
    const result = await fetchData();
    showSuccess(`${result.count}件のデータを取得しました`);
    setData(result.data);
  } catch (error) {
    showError('データの取得に失敗しました');
  }
};
```

## トラブルシューティング

### よくある問題

1. **Toastが表示されない**
   - ToastProviderがアプリケーションルートで設定されているか確認
   - useToastがToastProviderの配下で使用されているか確認

2. **複数のToastが重複表示される**
   - 短時間での連続呼び出しを避ける
   - hideToast()で明示的に非表示にする

3. **スタイルが適用されない**
   - MaterialUIテーマが正しく設定されているか確認
   - sx propsで上書きされていないか確認

### デバッグ方法

```typescript
// Toast状態の確認
const { showSuccess } = useToast();

// デバッグ用の表示確認
const handleDebug = () => {
  console.log('Toast表示テスト');
  showSuccess('テストメッセージ', {
    title: 'デバッグ',
    duration: 10000
  });
};
```

## パフォーマンス

### メモリ使用量

- Toast状態: 軽量（文字列のみ）
- Provider: 最小限のContext状態
- アニメーション: CSS Transitionによる軽量実装

### レンダリング最適化

- Toast表示時のみDOM要素作成
- 不要な再レンダリング防止
- useCallback/useMemoによる最適化済み

## 今後の拡張予定

1. **音声通知**: アクセシビリティ向上
2. **アニメーションカスタマイズ**: より豊富な表示効果
3. **通知履歴**: 過去の通知確認機能
4. **プッシュ通知連携**: ブラウザ通知との統合

## 関連ドキュメント

- [ActionButton Component](./action-button-component.md)
- [Dialog Components](./dialog-components.md)
- [Common Form Components](./common-form-components.md)
- [Frontend Specification](./frontend-specification.md) 