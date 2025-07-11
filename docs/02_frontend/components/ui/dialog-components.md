# 共通ダイアログコンポーネント定義書

## 概要

本書は、プロジェクト全体で統一されたダイアログUIを実現するために実装された4つの共通ダイアログコンポーネントの定義書です。Gmail風のシンプルで洗練されたUIデザインを基準として設計されており、一貫性のあるユーザーエクスペリエンスを提供します。

## 設計原則

### 統一デザインシステム
- **Gmail風UI**: Googleのデザインガイドラインに基づくシンプルで直感的な操作性
- **カラーパレット統一**: 定義された色合いで一貫性を保持
- **適切なサイズ設定**: 用途に応じた最適なダイアログサイズ
- **レスポンシブ対応**: デバイスサイズに応じた最適な表示

### ユーザビリティ原則
- **明確な階層構造**: 視覚的に理解しやすい情報の配置
- **適切なスペーシング**: 読みやすさとクリック/タップのしやすさを両立
- **統一されたボタンスタイル**: ActionButtonコンポーネントとの完全統合

## 共通テーマシステム（DialogTheme）

### DIALOG_THEME定数

```tsx
export const DIALOG_THEME = {
  // 基本サイズ設定
  sizes: {
    xs: { minWidth: 320, maxWidth: 400 },   // 確認ダイアログ
    sm: { minWidth: 480, maxWidth: 600 },   // フォームダイアログ
    md: { minWidth: 600, maxWidth: 800 },   // 情報表示ダイアログ
    lg: { minWidth: 800, maxWidth: 1000 },  // 大型コンテンツ
  },
  
  // タイトルスタイル
  title: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.3,
    color: 'text.primary',
  },
  
  // 本文スタイル
  content: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    color: 'text.secondary',
  },
  
  // ボタンスタイル
  button: {
    minWidth: 80,
    height: 36,
    fontSize: '0.875rem',
  },
}
```

### GMAIL_COLORS カラーパレット

```tsx
export const GMAIL_COLORS = {
  primary: { main: '#1a73e8', light: '#e8f0fe', dark: '#1557b0' },
  success: { main: '#34a853', light: '#e6f4ea', dark: '#137333' },
  warning: { main: '#fbbc04', light: '#fef7e0', dark: '#f09300' },
  error: { main: '#ea4335', light: '#fce8e6', dark: '#c5221f' },
  text: { primary: '#202124', secondary: '#5f6368' },
}
```

## コンポーネント一覧

| コンポーネント | 用途 | ファイル | 主な特徴 |
|---|---|---|---|
| `ConfirmDialog` | 確認ダイアログ | `ConfirmDialog.tsx` | 警告レベル対応、アイコン表示 |
| `InfoDialog` | 情報表示ダイアログ | `InfoDialog.tsx` | リッチコンテンツ、カスタムアクション |
| `FormDialog` | フォーム設定ダイアログ | `FormDialog.tsx` | 送信/キャンセル、ローディング状態 |
| `SimpleDialog` | シンプル通知ダイアログ | `SimpleDialog.tsx` | 最小限の要素、基本的な確認 |

---

## 1. ConfirmDialog（確認ダイアログ）

### 概要
ユーザーの重要な操作に対する確認を求める際に使用するダイアログコンポーネントです。削除、送信、重要な変更操作などの確認に適用されます。

### Props定義

```tsx
export interface ConfirmDialogProps {
  open: boolean;                    // ダイアログの表示状態
  title: string;                    // ダイアログタイトル
  message: string;                  // 確認メッセージ
  confirmText?: string;             // 確認ボタンテキスト（デフォルト: "確認"）
  cancelText?: string;              // キャンセルボタンテキスト（デフォルト: "キャンセル"）
  severity?: 'info' | 'warning' | 'error'; // 警告レベル（デフォルト: 'info'）
  onConfirm: () => void;           // 確認ボタンクリック時の処理
  onCancel: () => void;            // キャンセルボタンクリック時の処理
  loading?: boolean;               // ローディング状態（デフォルト: false）
  maxWidth?: Breakpoint | false;   // 最大幅設定（デフォルト: 'xs'）
}
```

### 使用例

#### 基本的な確認ダイアログ
```tsx
import { ConfirmDialog } from '@/components/common';

const [confirmOpen, setConfirmOpen] = useState(false);

<ConfirmDialog
  open={confirmOpen}
  title="プロフィール削除の確認"
  message="この操作は取り消せません。本当に削除しますか？"
  confirmText="削除する"
  cancelText="キャンセル"
  severity="error"
  onConfirm={handleDelete}
  onCancel={() => setConfirmOpen(false)}
/>
```

#### 週報提出確認
```tsx
<ConfirmDialog
  open={submitDialogOpen}
  title="週報の提出"
  message="週報を提出します。提出後は編集できません。よろしいですか？"
  confirmText="提出する"
  severity="warning"
  onConfirm={handleSubmit}
  onCancel={() => setSubmitDialogOpen(false)}
  loading={isSubmitting}
/>
```

### 警告レベル（severity）

| レベル | アイコン | 背景色 | 用途 |
|---|---|---|---|
| `info` | Info | Primary Light | 一般的な確認 |
| `warning` | Warning | Warning Light | 注意が必要な操作 |
| `error` | Error | Error Light | 破壊的な操作 |

---

## 2. InfoDialog（情報表示ダイアログ）

### 概要
詳細情報の表示や複雑なコンテンツを含む情報ダイアログです。プロジェクト詳細、休暇申請の詳細確認などに使用されます。

### Props定義

```tsx
export interface InfoDialogProps {
  open: boolean;                    // ダイアログの表示状態
  title: string;                    // ダイアログタイトル
  subtitle?: string;                // サブタイトル（オプション）
  icon?: React.ReactNode;          // カスタムアイコン（オプション）
  children: React.ReactNode;       // 表示するコンテンツ
  onClose: () => void;             // 閉じる処理
  maxWidth?: Breakpoint | false;   // 最大幅設定（デフォルト: 'sm'）
  actions?: React.ReactNode;       // カスタムアクションボタン（オプション）
  showCloseButton?: boolean;       // 閉じるボタンの表示（デフォルト: true）
  fullScreen?: boolean;            // フルスクリーン表示（デフォルト: false）
}
```

### 使用例

#### プロジェクト詳細表示
```tsx
import { InfoDialog } from '@/components/common';
import ActionButton from '@/components/common/ActionButton';

<InfoDialog
  open={detailOpen}
  title={project.name}
  subtitle="プロジェクト詳細"
  onClose={() => setDetailOpen(false)}
  actions={
    <ActionButton 
      buttonType="primary" 
      onClick={() => router.push(`/project/${project.id}/edit`)}
    >
      編集する
    </ActionButton>
  }
>
  <Typography variant="body2" color="text.secondary" gutterBottom>
    {project.description}
  </Typography>
  <Typography variant="body2">
    <strong>期間:</strong> {project.startDate} ～ {project.endDate}
  </Typography>
  <Typography variant="body2">
    <strong>メンバー:</strong> {project.memberCount}名
  </Typography>
</InfoDialog>
```

#### 休暇申請確認（リッチコンテンツ）
```tsx
<InfoDialog
  open={confirmOpen}
  title="休暇申請の確認"
  subtitle="以下の内容で申請します"
  onClose={() => setConfirmOpen(false)}
  actions={
    <>
      <ActionButton buttonType="cancel" onClick={() => setConfirmOpen(false)}>
        戻る
      </ActionButton>
      <ActionButton 
        buttonType="primary" 
        onClick={handleSubmit}
        loading={isSubmitting}
      >
        申請する
      </ActionButton>
    </>
  }
>
  <Stack spacing={2}>
    <Box>
      <Typography variant="body2" color="text.secondary">休暇種別</Typography>
      <Typography variant="body1">{leaveData.type}</Typography>
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary">期間</Typography>
      <Typography variant="body1">
        {leaveData.startDate} ～ {leaveData.endDate} ({leaveData.days}日間)
      </Typography>
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary">理由</Typography>
      <Typography variant="body1">{leaveData.reason}</Typography>
    </Box>
  </Stack>
</InfoDialog>
```

---

## 3. FormDialog（フォーム設定ダイアログ）

### 概要
フォーム入力を伴う設定変更やデータ入力用のダイアログコンポーネントです。一括設定、デフォルト設定などの操作に使用されます。

### Props定義

```tsx
export interface FormDialogProps {
  open: boolean;                    // ダイアログの表示状態
  title: string;                    // ダイアログタイトル
  icon?: React.ReactNode;          // アイコン（オプション）
  children: React.ReactNode;       // フォームコンテンツ
  onClose: () => void;             // 閉じる処理
  onSubmit?: () => void;           // 送信処理（オプション）
  submitText?: string;             // 送信ボタンテキスト（デフォルト: "保存"）
  cancelText?: string;             // キャンセルボタンテキスト（デフォルト: "キャンセル"）
  loading?: boolean;               // ローディング状態（デフォルト: false）
  maxWidth?: Breakpoint | false;   // 最大幅設定（デフォルト: 'sm'）
  submitButtonType?: 'primary' | 'submit' | 'save'; // 送信ボタンタイプ（デフォルト: 'submit'）
  submitDisabled?: boolean;        // 送信ボタン無効化（デフォルト: false）
  showCloseButton?: boolean;       // 閉じるボタンの表示（デフォルト: true）
}
```

### 使用例

#### 一括設定ダイアログ
```tsx
import { FormDialog } from '@/components/common';
import { Settings as SettingsIcon } from '@mui/icons-material';

<FormDialog
  open={batchSettingOpen}
  title="一括設定"
  icon={<SettingsIcon />}
  onClose={() => setBatchSettingOpen(false)}
  onSubmit={handleBatchSetting}
  submitText="一括設定"
  loading={isBatchSetting}
  submitDisabled={!selectedWeeks.length}
>
  <Stack spacing={3}>
    <FormControl fullWidth>
      <InputLabel>プロジェクト</InputLabel>
      <Select
        value={batchSettings.projectId}
        onChange={(e) => setBatchSettings({
          ...batchSettings,
          projectId: e.target.value
        })}
      >
        {projects.map(project => (
          <MenuItem key={project.id} value={project.id}>
            {project.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    
    <TextField
      label="作業時間（時間）"
      type="number"
      value={batchSettings.workHours}
      onChange={(e) => setBatchSettings({
        ...batchSettings,
        workHours: e.target.value
      })}
      fullWidth
    />
  </Stack>
</FormDialog>
```

#### デフォルト設定ダイアログ
```tsx
<FormDialog
  open={defaultSettingOpen}
  title="デフォルト設定"
  icon={<SettingsIcon />}
  onClose={() => setDefaultSettingOpen(false)}
  onSubmit={handleDefaultSetting}
  submitText="設定を保存"
  loading={isDefaultSetting}
>
  <TextField
    label="デフォルト作業時間"
    type="number"
    value={defaultWorkHours}
    onChange={(e) => setDefaultWorkHours(e.target.value)}
    fullWidth
    helperText="新しい週報作成時に自動入力される時間"
  />
</FormDialog>
```

---

## 4. SimpleDialog（シンプル通知ダイアログ）

### 概要
最もシンプルな形式の通知・確認ダイアログです。基本的な情報表示や簡単な確認操作に使用されます。

### Props定義

```tsx
export interface SimpleDialogProps {
  open: boolean;                    // ダイアログの表示状態
  title?: string;                   // ダイアログタイトル（オプション）
  message: string;                  // 表示メッセージ
  confirmText?: string;             // 確認ボタンテキスト（デフォルト: "OK"）
  cancelText?: string;              // キャンセルボタンテキスト（デフォルト: "キャンセル"）
  onConfirm?: () => void;          // 確認ボタンクリック時の処理（オプション）
  onCancel: () => void;            // キャンセル/閉じる処理
  loading?: boolean;               // ローディング状態（デフォルト: false）
  maxWidth?: Breakpoint | false;   // 最大幅設定（デフォルト: 'xs'）
  showCancel?: boolean;            // キャンセルボタンの表示（デフォルト: false）
}
```

### 使用例

#### 基本的な通知ダイアログ
```tsx
import { SimpleDialog } from '@/components/common';

<SimpleDialog
  open={notificationOpen}
  title="保存完了"
  message="データが正常に保存されました。"
  onCancel={() => setNotificationOpen(false)}
/>
```

#### 確認付き通知ダイアログ
```tsx
<SimpleDialog
  open={confirmOpen}
  title="ログアウト確認"
  message="ログアウトしますか？"
  showCancel={true}
  confirmText="ログアウト"
  onConfirm={handleLogout}
  onCancel={() => setConfirmOpen(false)}
/>
```

---

## 共通実装パターン

### 1. ダイアログ状態管理

```tsx
// 推奨: カスタムフックでの状態管理
const useDialog = (initialState = false) => {
  const [open, setOpen] = useState(initialState);
  
  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);
  
  return { open, openDialog, closeDialog };
};

// 使用例
const confirmDialog = useDialog();
const infoDialog = useDialog();

<ConfirmDialog
  open={confirmDialog.open}
  onCancel={confirmDialog.closeDialog}
  // ...その他のprops
/>
```

### 2. ローディング状態管理

```tsx
// 推奨: 適切なローディング状態管理
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await submitData();
    closeDialog();
  } catch (error) {
    // エラーハンドリング
  } finally {
    setIsLoading(false);
  }
};

<FormDialog
  loading={isLoading}
  onSubmit={handleSubmit}
  // ...その他のprops
/>
```

### 3. 条件付きレンダリング

```tsx
// 推奨: 条件に基づく適切なダイアログ選択
const renderConfirmDialog = () => {
  if (operationType === 'delete') {
    return (
      <ConfirmDialog
        severity="error"
        title="削除確認"
        message="この操作は取り消せません。"
        // ...
      />
    );
  }
  
  return (
    <ConfirmDialog
      severity="info"
      title="保存確認"
      message="変更を保存しますか？"
      // ...
    />
  );
};
```

## インポート方法

```tsx
// 個別インポート
import { ConfirmDialog, InfoDialog, FormDialog, SimpleDialog } from '@/components/common';

// 型定義のインポート
import type { 
  ConfirmDialogProps, 
  InfoDialogProps, 
  FormDialogProps, 
  SimpleDialogProps 
} from '@/components/common';

// テーマシステムのインポート
import { DIALOG_THEME, GMAIL_COLORS, createDialogStyles } from '@/components/common';
```

## 移行ガイドライン

### 既存ダイアログからの移行

1. **段階的移行**: 一度に全てを変更せず、機能単位で段階的に移行
2. **デグレード防止**: 既存機能に影響を与えないよう慎重に実装
3. **テスト実施**: 移行後は必ず動作確認を実施
4. **TypeScriptエラー対応**: 型安全性を保持しながら移行

### 移行チェックリスト

- [ ] MUIのDialog直接使用からの変更
- [ ] DialogTitle、DialogContent、DialogActionsの削除
- [ ] ActionButtonへの統一
- [ ] 適切なダイアログタイプの選択
- [ ] Props型定義の更新
- [ ] 動作確認とテスト実施

## 保守・更新指針

### 1. 一貫性の維持
- 新しいダイアログは必ず4つの共通コンポーネントのいずれかを使用
- カスタムダイアログの作成は避け、既存コンポーネントの拡張で対応

### 2. デザインシステムの発展
- Gmail風UIを基準とした継続的な改善
- ユーザビリティフィードバックの反映
- アクセシビリティの継続的向上

### 3. TypeScript対応
- 厳格な型チェックの維持
- 新しいPropsの追加時は型定義の更新も必須
- 後方互換性の考慮

## 関連ドキュメント

- [ActionButton コンポーネント定義書](./action-button-component.md)
- [フロントエンド開発標準仕様書](./frontend-specification.md)
- [ステータスチップコンポーネント定義書](./status-chip-components.md) 