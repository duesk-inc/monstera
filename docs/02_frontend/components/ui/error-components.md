# 共通エラーコンポーネント定義書

## 概要

本ドキュメントでは、フロントエンドアプリケーションで使用する統一されたエラーハンドリングコンポーネントの仕様と使用方法を定義します。

## アーキテクチャ

### エラーハンドリング階層

```
GlobalErrorBoundary (アプリケーション全体)
├── PartialErrorBoundary (部分的保護)
├── FullScreenErrorDisplay (全画面エラー)
├── ErrorAlert (一般的なエラー表示)
├── ValidationErrorAlert (バリデーションエラー)
└── FieldValidationError (フィールド固有エラー)
```

## コンポーネント仕様

### 1. GlobalErrorBoundary

**目的**: アプリケーション全体のJavaScriptエラーをキャッチし、ユーザーフレンドリーなエラー画面を表示

**ファイル**: `src/components/common/ErrorBoundary.tsx`

#### Props

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}
```

#### 使用例

```tsx
import { GlobalErrorBoundary } from '@/components/common';

// アプリケーション全体を保護
<GlobalErrorBoundary>
  <App />
</GlobalErrorBoundary>

// カスタムfallbackを使用
<GlobalErrorBoundary 
  fallback={({ error, retry }) => (
    <CustomErrorPage error={error} onRetry={retry} />
  )}
>
  <App />
</GlobalErrorBoundary>
```

#### 機能

- **自動エラーキャッチ**: 予期しないJavaScriptエラーを自動的に捕捉
- **開発者向けログ**: 開発環境でのデバッグ情報出力
- **再試行機能**: エラー状態からの復旧機能
- **全画面表示**: `FullScreenErrorDisplay`を使用したユーザーフレンドリーな表示

### 2. PartialErrorBoundary

**目的**: 特定のコンポーネント範囲でのエラー保護

#### Props

```typescript
interface PartialErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

#### 使用例

```tsx
import { PartialErrorBoundary } from '@/components/common';

// 部分的なコンポーネントを保護
<PartialErrorBoundary
  fallback={<div>この部分でエラーが発生しました</div>}
  onError={(error, errorInfo) => {
    console.error('Partial error:', error);
    // エラーログ送信など
  }}
>
  <RiskyComponent />
</PartialErrorBoundary>
```

### 3. FullScreenErrorDisplay

**目的**: クリティカルエラー時の全画面エラー表示

**ファイル**: `src/components/common/FullScreenErrorDisplay.tsx`

#### Props

```typescript
interface FullScreenErrorDisplayProps {
  error: {
    title: string;
    message: string;
    details?: string;
    retryAction?: () => void;
  };
  showHomeButton?: boolean;
  containerMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}
```

#### 使用例

```tsx
import { FullScreenErrorDisplay } from '@/components/common';

<FullScreenErrorDisplay
  error={{
    title: 'システムエラーが発生しました',
    message: '予期しないエラーが発生しました。ページを再読み込みするか、しばらく時間をおいてから再度お試しください。',
    details: 'Error: Network timeout',
    retryAction: () => window.location.reload(),
  }}
  showHomeButton={true}
  containerMaxWidth="md"
/>
```

#### 機能

- **統一デザイン**: Material-UIベースの一貫したデザイン
- **アクションボタン**: 再読み込み、ホーム遷移ボタン
- **レスポンシブ**: モバイル対応
- **詳細情報**: 開発環境での詳細エラー情報表示

### 4. ErrorAlert

**目的**: APIエラーやシステムエラーの統一表示

**ファイル**: `src/components/common/Alert.tsx`

#### Props

```typescript
interface ErrorAlertProps {
  message: string;              // エラーメッセージ（必須）
  title?: string;               // エラータイトル
  details?: string;             // 詳細情報
  onClose?: () => void;         // 閉じるハンドラー
  retryAction?: () => void;     // 再試行ハンドラー
  sx?: SxProps<Theme>;          // カスタムスタイル
}
```

#### 使用例

```tsx
import { ErrorAlert } from '@/components/common';

// 基本的な使用方法
<ErrorAlert
  message="データの取得に失敗しました"
  title="エラーが発生しました"
  onClose={() => setError(null)}
/>

// 再試行機能付き
<ErrorAlert
  message="サーバーとの通信に失敗しました"
  title="通信エラー"
  retryAction={() => retryApiCall()}
  onClose={() => setError(null)}
/>

// 詳細情報付き
<ErrorAlert
  message="プロフィールの更新に失敗しました"
  title="更新エラー"
  details="入力された情報に問題がある可能性があります"
  onClose={() => setError(null)}
/>
```

#### 機能

- **統一デザイン**: Material-UI Alertベース
- **閉じる機能**: ユーザーが手動で閉じることが可能
- **再試行機能**: オプションの再試行ボタン
- **詳細表示**: 折りたたみ可能な詳細情報
- **アクセシビリティ**: スクリーンリーダー対応

### 5. ValidationErrorAlert

**目的**: フォームバリデーションエラーの統一表示

**ファイル**: `src/components/common/ValidationErrorAlert.tsx`

#### Props

```typescript
interface ValidationErrorAlertProps {
  errors?: FieldErrors;                    // react-hook-formエラー
  error?: string | null;                   // 単一エラーメッセージ
  fieldError?: FieldError;                 // 単一フィールドエラー
  customErrors?: Record<string, string>;   // カスタムエラー
  title?: string;                          // エラータイトル
  onClose?: () => void;                    // 閉じるハンドラー
  fieldLabels?: Record<string, string>;    // フィールド名マップ
  maxErrors?: number;                      // 最大表示エラー数
  showDetails?: boolean;                   // 詳細表示フラグ
}
```

#### 使用例

```tsx
import { ValidationErrorAlert } from '@/components/common';

// react-hook-formのエラーオブジェクトを使用
<ValidationErrorAlert
  errors={errors}
  fieldLabels={{
    email: 'メールアドレス',
    password: 'パスワード',
    name: '氏名'
  }}
/>

// カスタムエラーメッセージ
<ValidationErrorAlert
  customErrors={{
    general: '入力内容に問題があります',
    network: 'ネットワークエラーが発生しました'
  }}
/>

// 単一エラー
<ValidationErrorAlert
  error="必須項目が入力されていません"
/>
```

#### 機能

- **複数エラー対応**: 複数のバリデーションエラーを整理して表示
- **フィールドラベル**: 日本語フィールド名での表示
- **重複除去**: 同一エラーメッセージの重複を自動除去
- **表示制限**: 最大表示エラー数の制限機能
- **react-hook-form連携**: react-hook-formとの完全な互換性

### 6. FieldValidationError

**目的**: 個別フォームフィールドの下に表示する軽量エラー

#### Props

```typescript
interface FieldValidationErrorProps {
  error?: FieldError | string;
  show?: boolean;
}
```

#### 使用例

```tsx
import { FieldValidationError } from '@/components/common';

// react-hook-formのフィールドエラー
<TextField {...register('email')} />
<FieldValidationError error={errors.email} />

// 文字列エラー
<TextField />
<FieldValidationError error="この項目は必須です" />
```

## Toast通知システム

### ToastProvider

**目的**: アプリケーション全体で統一されたToast通知を提供

**ファイル**: `src/components/common/Toast/ToastProvider.tsx`

#### セットアップ

ToastProviderは`app/providers.tsx`で既に設定されています：

```tsx
<ToastProvider>
  <App />
</ToastProvider>
```

#### 使用方法

```tsx
import { useToast } from '@/components/common';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  return (
    <Button onClick={() => showSuccess('保存しました')}>
      保存
    </Button>
  );
}
```

#### Toast通知の種類

| メソッド | 用途 | 表示色 |
|---------|------|-------|
| `showSuccess` | 成功通知 | 緑色 |
| `showError` | エラー通知 | 赤色 |
| `showWarning` | 警告通知 | オレンジ色 |
| `showInfo` | 情報通知 | 青色 |

### useErrorHandler統合

**目的**: バックエンドエラーメッセージを自動的にToast通知で表示

**ファイル**: `src/hooks/common/useErrorHandler.ts`

#### 使用方法

```tsx
import { useErrorHandler } from '@/hooks/common/useErrorHandler';

function MyComponent() {
  const { handleApiError, handleSubmissionError } = useErrorHandler();
  
  const saveData = async () => {
    try {
      await api.saveProfile(data);
      // 成功時は直接useToastを使用
      const { showSuccess } = useToast();
      showSuccess('プロフィールを更新しました');
    } catch (error) {
      // エラーハンドラーが自動的にToast通知を表示
      // バックエンドのerrorフィールドのメッセージが優先的に使用される
      handleSubmissionError(error, 'プロフィール更新');
    }
  };
}
```

#### バックエンドエラーレスポンス形式

useErrorHandlerは以下の形式のバックエンドレスポンスから自動的にエラーメッセージを抽出します：

```go
// Go Backendの標準エラーレスポンス
c.JSON(http.StatusBadRequest, gin.H{
  "error": "プロフィール情報の更新に失敗しました: 必須項目が入力されていません"
})

// または
c.JSON(http.StatusInternalServerError, gin.H{
  "message": "サーバーエラーが発生しました"
})
```

#### エラーハンドラーの種類

| メソッド | 用途 | 使用例 |
|---------|------|-------|
| `handleError` | 汎用エラー処理 | `handleError(error, '操作')` |
| `handleApiError` | API通信エラー | `handleApiError(error, 'データ取得')` |
| `handleValidationError` | バリデーションエラー | `handleValidationError(error, 'プロフィールフォーム')` |
| `handleSubmissionError` | フォーム送信エラー | `handleSubmissionError(error, 'プロフィール更新')` |

## 使用パターン

### 1. APIエラーハンドリング（Toast通知版）

```tsx
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common';

function DataFetcher() {
  const { handleApiError } = useErrorHandler();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getData();
      showSuccess('データを取得しました');
      return data;
    } catch (error) {
      // バックエンドのエラーメッセージが自動的にToastで表示される
      handleApiError(error, 'データ取得');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button onClick={fetchData} disabled={loading}>
      データ取得
    </Button>
  );
}
```

### 2. フォーム送信エラーハンドリング

```tsx
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common';

function ProfileForm() {
  const { handleSubmissionError } = useErrorHandler();
  const { showSuccess } = useToast();
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      await api.updateProfile(data);
      showSuccess('プロフィールを更新しました');
    } catch (error) {
      // エラーの種類に応じて適切なToast通知が表示される
      handleSubmissionError(error, 'プロフィール更新');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* フォームフィールド */}
    </form>
  );
}
```

### 3. エラー状態管理パターン

```tsx
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const handleApiCall = async () => {
  setLoading(true);
  setError(null);
  
  try {
    await apiCall();
  } catch (err) {
    setError('データの取得に失敗しました');
  } finally {
    setLoading(false);
  }
};

return (
  <>
    {error && (
      <ErrorAlert
        message={error}
        title="エラーが発生しました"
        onClose={() => setError(null)}
        retryAction={handleApiCall}
      />
    )}
    {loading && <CircularProgress />}
  </>
);
```

### 2. フォームバリデーション

```tsx
const { register, handleSubmit, formState: { errors } } = useForm();

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <ValidationErrorAlert
      errors={errors}
      fieldLabels={{
        email: 'メールアドレス',
        password: 'パスワード'
      }}
    />
    
    <TextField
      {...register('email', { required: 'メールアドレスは必須です' })}
    />
    <FieldValidationError error={errors.email} />
    
    <TextField
      {...register('password', { required: 'パスワードは必須です' })}
    />
    <FieldValidationError error={errors.password} />
  </form>
);
```

### 3. Error Boundary保護

```tsx
// アプリケーション全体
function App() {
  return (
    <GlobalErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
    </GlobalErrorBoundary>
  );
}

// 部分的保護
function Dashboard() {
  return (
    <div>
      <Header />
      <PartialErrorBoundary fallback={<div>データの読み込みに失敗しました</div>}>
        <DataTable />
      </PartialErrorBoundary>
    </div>
  );
}
```

## ベストプラクティス

### 1. エラーメッセージの書き方

- **ユーザーフレンドリー**: 技術的な詳細ではなく、ユーザーが理解しやすい言葉を使用
- **建設的**: 問題だけでなく、解決方法も提示
- **簡潔**: 冗長な説明は避け、要点を明確に

```tsx
// ❌ 悪い例
<ErrorAlert message="HTTP 500 Internal Server Error" />

// ✅ 良い例
<ErrorAlert 
  message="サーバーで問題が発生しました。しばらく時間をおいてから再度お試しください。"
  retryAction={retry}
/>
```

### 2. エラーの分類と対応

| エラータイプ | 使用コンポーネント | 対応方法 |
|------------|------------------|----------|
| APIエラー | ErrorAlert | 再試行ボタン提供 |
| バリデーションエラー | ValidationErrorAlert | 具体的な修正方法を案内 |
| システムエラー | GlobalErrorBoundary | 全画面表示、ページ再読み込み |
| 部分的エラー | PartialErrorBoundary | 部分的なfallback表示 |

### 3. パフォーマンス考慮事項

- **エラー状態の適切なクリア**: 不要な再レンダリングを避ける
- **メモ化**: 複雑なエラー処理ロジックのメモ化
- **遅延読み込み**: 大きなエラー表示コンポーネントの遅延読み込み

```tsx
const memoizedErrorAlert = useMemo(() => (
  error ? (
    <ErrorAlert
      message={error}
      onClose={() => setError(null)}
    />
  ) : null
), [error]);
```

## 移行ガイド

### 非推奨コンポーネントからの移行

```tsx
// ❌ 削除済み
// ErrorNotificationコンポーネントは削除されました

// ❌ 非推奨
import { ErrorDisplay } from '@/components/common';

// ✅ 推奨
import { ErrorAlert } from '@/components/common';
```

## テスト

### 単体テスト例

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorAlert } from '@/components/common';

describe('ErrorAlert', () => {
  it('エラーメッセージを表示する', () => {
    render(<ErrorAlert message="テストエラー" />);
    expect(screen.getByText('テストエラー')).toBeInTheDocument();
  });

  it('閉じるボタンが機能する', () => {
    const onClose = jest.fn();
    render(<ErrorAlert message="テストエラー" onClose={onClose} />);
    
    fireEvent.click(screen.getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('再試行ボタンが機能する', () => {
    const retryAction = jest.fn();
    render(<ErrorAlert message="テストエラー" retryAction={retryAction} />);
    
    fireEvent.click(screen.getByText('再試行'));
    expect(retryAction).toHaveBeenCalled();
  });
});
```

## 今後の拡張予定

1. **国際化対応**: 多言語エラーメッセージのサポート
2. **エラー分析**: エラー発生頻度の分析機能
3. **カスタムテーマ**: エラー表示のテーマカスタマイズ
4. **アニメーション**: エラー表示時のアニメーション効果

## 関連ドキュメント

- [フロントエンド仕様書](./frontend-specification.md)
- [コンポーネント設計ガイド](./COMPONENT_DESIGN_GUIDE.md)
- [ハードコーディング削減 移行ガイド](./hardcoding-migration-guide.md) 