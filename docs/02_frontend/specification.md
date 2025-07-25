# フロントエンド開発標準仕様書

## 目次

1. [アーキテクチャの原則](#アーキテクチャの原則)
2. [ディレクトリ構造](#ディレクトリ構造)
3. [コンポーネント設計](#コンポーネント設計)
4. [共通コンポーネント概要](#共通コンポーネント概要)
5. [状態管理](#状態管理)
6. [APIクライアント実装](#apiクライアント実装)
7. [エラーハンドリング](#エラーハンドリング)
8. [Abort処理とキャンセル制御](#abort処理とキャンセル制御)
9. [型定義](#型定義)
10. [命名規則](#命名規則)
11. [パフォーマンス最適化](#パフォーマンス最適化)
12. [環境別の処理](#環境別の処理)
13. [テスト方針](#テスト方針)
14. [アクセシビリティ](#アクセシビリティ)
15. [テーマカラーの管理](#テーマカラーの管理)
16. [新機能追加ガイドライン](#新機能追加ガイドライン)
17. [ファイル作成・配置基準](#ファイル作成配置基準)
18. [実装統一ルール](#実装統一ルール)
19. [無限ループ防止ガイドライン](#無限ループ防止ガイドライン)

## 技術スタック

### 主要フレームワーク・ライブラリ
- **Next.js**: 15.3.2 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.5.4
- **Material-UI**: 7.1.0

### 状態管理・データフェッチング
- **TanStack Query**: 5.80.7 (React Query)
- **React Context API**: グローバル状態管理

### フォーム・バリデーション
- **React Hook Form**: 7.56.3
- **Yup**: 1.6.1

### その他の主要ライブラリ
- **Axios**: HTTP クライアント
- **date-fns**: 日付処理（メイン）
- **dayjs**: 日付処理（サブ）
- **jsPDF**: PDF生成
- **XLSX**: Excel処理

### 開発ツール
- **Jest**: テストフレームワーク
- **Playwright**: E2Eテスト
- **MSW**: APIモッキング
- **ESLint**: コード品質管理
- **Prettier**: コードフォーマット

## アーキテクチャの原則

当プロジェクトでは以下の原則に基づいたフロントエンド開発を行います：

- **関心の分離**: ビジネスロジック、UI、APIアクセスなどの関心事を明確に分離
- **単一責任の原則**: 各コンポーネント・ファイルは単一の責任を持つ
- **型安全性**: TypeScriptによる厳格な型チェックを徹底
- **再利用性**: コンポーネントやロジックの再利用を促進
- **テスト容易性**: テストしやすいコード構造を維持
- **一貫性**: 命名規則や実装パターンの一貫性を保持

## ディレクトリ構造

```
src/
├── app/                # Next.js App Router
│   ├── (auth)/         # 認証ページ
│   ├── (authenticated)/ # 認証後のページ
│   │   ├── (admin)/    # 管理者用ページ
│   │   ├── (engineer)/ # エンジニア用ページ
│   │   └── (sales)/    # 営業用ページ
│   ├── api/            # API Routes
│   └── layout.tsx      # ルートレイアウト
├── components/         # React コンポーネント
│   ├── admin/          # 管理者用コンポーネント
│   ├── common/         # 共通コンポーネント
│   │   ├── layout/     # レイアウト関連
│   │   ├── form/       # フォーム関連
│   │   └── ui/         # 基本UI要素
│   ├── features/       # 機能別コンポーネント
│   └── ui/             # 追加UI要素
├── hooks/              # カスタムフック
│   ├── auth/           # 認証関連フック
│   ├── common/         # 共通フック
│   └── [feature]/      # 機能別フック
├── lib/                # ライブラリとユーティリティ
│   ├── api/            # API クライアント
│   ├── auth/           # 認証ユーティリティ
│   └── utils/          # ユーティリティ関数
├── types/              # 型定義
├── constants/          # 定数定義
├── styles/             # グローバルスタイル
└── workers/            # Web Workers
```

### ディレクトリ配置の原則

- **機能単位のグループ化**: 関連するファイルは機能単位でまとめる
- **共通と固有の分離**: 共通機能と機能固有のファイルを明確に分離
- **階層の浅さ**: 過度なネストを避け、3層以下を基本とする

## コンポーネント設計

### 設計原則

1. **単一責任**: 各コンポーネントは単一の責任を持つ
2. **Props インターフェース**: 明確で一貫性のあるProps設計
3. **拡張性**: 将来の要件変更に対応できる柔軟な設計
4. **テスト容易性**: テストしやすいコンポーネント構造

### コンポーネント分類

- **ページコンポーネント**: ルーティングに対応するトップレベルコンポーネント
- **機能コンポーネント**: 特定の機能を担うコンポーネント
- **共通コンポーネント**: 複数の場所で再利用されるコンポーネント
- **UIコンポーネント**: 純粋なUI表示を担うコンポーネント

### 大型コンポーネント分離の実装方針

#### 分離対象の判定基準

以下のいずれかに該当するコンポーネントは分離を検討してください：

1. **行数による判定**
   - 500行を超えるコンポーネント：分離を検討
   - 800行を超えるコンポーネント：分離を推奨
   - 1000行を超えるコンポーネント：必須で分離

2. **責任範囲による判定**
   - 複数の関心事（UI表示、フォーム処理、データ取得など）が混在している
   - 独立したUIブロックが複数存在する
   - 特定の機能に関連するロジックがまとまって存在する

#### 分離の実装手順

##### 1. 責任範囲の特定

```tsx
// 分離前の大型コンポーネント例
function LargeComponent() {
  // 複数の関心事が混在
  const [formData, setFormData] = useState(); // フォーム管理
  const [calendarData, setCalendarData] = useState(); // カレンダー管理
  const [dialogData, setDialogData] = useState(); // ダイアログ管理
  
  return (
    <Box>
      {/* UIブロック1: フォーム部分（200行） */}
      <Paper>
        {/* フォーム関連のJSX */}
      </Paper>
      
      {/* UIブロック2: カレンダー部分（300行） */}
      <Paper>
        {/* カレンダー関連のJSX */}
      </Paper>
      
      {/* UIブロック3: ダイアログ部分（200行） */}
      <Dialog>
        {/* ダイアログ関連のJSX */}
      </Dialog>
    </Box>
  );
}
```

##### 2. 子コンポーネントの作成

各責任範囲を独立したコンポーネントに分離：

```tsx
// 1. フォーム部分の分離
interface FormSectionProps {
  formData: FormData;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

function FormSection({ formData, onSubmit, isLoading }: FormSectionProps) {
  return (
    <Paper>
      {/* フォーム関連のJSX */}
    </Paper>
  );
}

// 2. カレンダー部分の分離
interface CalendarSectionProps {
  selectedDates: Date[];
  onDateSelect: (date: Date) => void;
  disabledDates: string[];
}

function CalendarSection({ selectedDates, onDateSelect, disabledDates }: CalendarSectionProps) {
  return (
    <Paper>
      {/* カレンダー関連のJSX */}
    </Paper>
  );
}

// 3. ダイアログ部分の分離
interface ConfirmDialogProps {
  open: boolean;
  data: ConfirmData;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, data, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open}>
      {/* ダイアログ関連のJSX */}
    </Dialog>
  );
}
```

##### 3. 親コンポーネントの更新

分離したコンポーネントを使用して親コンポーネントを簡潔化：

```tsx
// 分離後の親コンポーネント
function RefactoredComponent() {
  // 状態管理は保持（既存のカスタムフックも維持）
  const { formData, handleSubmit, isLoading } = useFormLogic();
  const { selectedDates, handleDateSelect, disabledDates } = useCalendarLogic();
  const { dialogOpen, dialogData, handleConfirm, handleCancel } = useDialogLogic();
  
  return (
    <Box>
      <FormSection
        formData={formData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
      
      <CalendarSection
        selectedDates={selectedDates}
        onDateSelect={handleDateSelect}
        disabledDates={disabledDates}
      />
      
      <ConfirmDialog
        open={dialogOpen}
        data={dialogData}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
```

#### 分離時の重要な注意点

##### 1. 既存機能の保持

```tsx
// ❌ 悪い例：既存のカスタムフックを削除
function RefactoredComponent() {
  // 既存のuseCustomHookを削除して新しい実装に変更
  const newLogic = useNewLogic(); // デグレードのリスク
}

// ✅ 良い例：既存のカスタムフックを保持
function RefactoredComponent() {
  // 既存のカスタムフックは必ず保持
  const { data, handleAction } = useExistingCustomHook();
  
  return (
    <NewComponent
      data={data}
      onAction={handleAction}
    />
  );
}
```

##### 2. Props設計

```tsx
// ❌ 悪い例：過度に複雑なProps
interface ComponentProps {
  // 10個以上のPropsは避ける
  prop1: string;
  prop2: number;
  // ... 15個のProps
}

// ✅ 良い例：関連するPropsをオブジェクトでグループ化
interface ComponentProps {
  formConfig: {
    data: FormData;
    validation: ValidationRules;
    onSubmit: SubmitHandler;
  };
  uiState: {
    isLoading: boolean;
    isDisabled: boolean;
  };
}
```

##### 3. ファイル配置

```
components/
├── features/
│   └── [機能名]/
│       ├── [主要コンポーネント].tsx          # 分離前の大型コンポーネント
│       ├── [機能名]FormSection.tsx           # 分離した子コンポーネント1
│       ├── [機能名]CalendarSection.tsx       # 分離した子コンポーネント2
│       └── [機能名]ConfirmDialog.tsx         # 分離した子コンポーネント3
```

#### 分離完了後のメリット

1. **保守性向上**: 各コンポーネントが単一責任を持ち、修正影響範囲が明確
2. **テスト容易性**: 個別コンポーネントのユニットテストが容易
3. **再利用性**: 分離したコンポーネントの他機能での再利用可能性
4. **開発効率**: 複数人での並行開発が可能
5. **可読性**: コードの理解とレビューが容易

#### チェックリスト

分離実装時は以下を確認してください：

- [ ] 既存のカスタムフック・状態管理を保持している
- [ ] 分離したコンポーネントが単一責任を持っている
- [ ] Props設計が明確で過度に複雑でない
- [ ] 既存機能にデグレードが発生していない
- [ ] 適切なディレクトリに配置されている
- [ ] TypeScript型定義が適切に設定されている
- [ ] 共通コンポーネント（ActionButton、PageContainer等）を活用している

## 共通コンポーネント概要

### レイアウトコンポーネント

標準化されたページレイアウトを提供するコンポーネント群です。

- **PageContainer**: ページ全体のコンテナ
- **PageHeader**: ページヘッダー
- **ContentCard**: コンテンツカード
- **TabContainer**: タブコンテナ
- **FilterBar**: フィルターバー
- **EmptyState**: 空状態表示
- **DetailInfoGrid**: 詳細情報グリッド
- **StatusBadge**: ステータスバッジ
- **SectionHeader**: セクションヘッダー

詳細仕様: [共通レイアウトコンポーネント](./common-layout-components.md)

### フォームコンポーネント

React Hook Formと連携したフォーム要素を提供します。

- **FormSelect**: セレクトボックス
- **FormDatePicker**: 日付ピッカー
- **FormTimePicker**: 時刻ピッカー
- **FormRadioGroup**: ラジオボタングループ
- **FormCheckboxGroup**: チェックボックスグループ
- **FormTextArea**: テキストエリア
- **FormAutocomplete**: オートコンプリート
- **FormSwitch**: スイッチコントロール

※ テキストフィールドはMaterial-UIのTextFieldをReact Hook FormのControllerと組み合わせて直接使用

詳細仕様: [共通フォームフィールドコンポーネント](./common-form-field-components.md)

### UIコンポーネント

基本的なUI要素を提供するコンポーネント群です。

- **ActionButton**: 統一ボタンコンポーネント
- **CommonTable**: テーブルコンポーネント
- **CommonPagination**: ページネーションコンポーネント
- **DialogComponents**: ダイアログコンポーネント
- **StatusChip**: ステータスチップ
- **CommonBadge**: バッジコンポーネント
- **ErrorComponents**: エラー表示コンポーネント
- **LoadingComponents**: ローディング表示コンポーネント

詳細仕様:
- [アクションボタンコンポーネント](./action-button-component.md)
- [共通テーブルコンポーネント](./common-table-components.md)
- [共通ページネーションコンポーネント](./common-pagination-components.md)
- [ダイアログコンポーネント](./dialog-components.md)
- [ステータスチップコンポーネント](./status-chip-components.md)
- [共通バッジコンポーネント](./common-badge-components.md)
- [共通エラーコンポーネント](./COMMON_ERROR_COMPONENTS.md)
- [共通ローディングコンポーネント](./common-loading-components.md)
- [共通コンテナコンポーネント](./common-container-components.md)
- [共通カードコンポーネント](./common-card-components.md)

## アイコンの実装方針

### 使用ライブラリ

Material-UIのアイコンライブラリ（`@mui/icons-material`）を標準として使用します。

### アイコンの命名規則

- インポート時にはMaterial-UIの名前に`Icon`サフィックスを付与
- 一貫性のあるアイコン選択（同じ概念には同じアイコンを使用）
- アクセシビリティを考慮したaria-label設定

## 状態管理

### カスタムフックによる状態管理

ビジネスロジックと状態管理はカスタムフックに分離し、UIとロジックの分離を徹底します。

### 状態管理の原則

1. **局所的な状態**: コンポーネント固有の状態は `useState` で管理
2. **共有状態**: 複数コンポーネントで共有する状態はカスタムフックに分離
3. **グローバル状態**: アプリケーション全体で必要な状態はReactコンテキストで管理
4. **サーバー状態**: TanStack Query（React Query）でAPIデータをキャッシュ管理
5. **メモ化**: 不要な再計算を防ぐために `useMemo` と `useCallback` を適切に使用
6. **副作用管理**: APIリクエストなどの副作用は `useEffect` で適切に管理

## APIクライアント実装

### API通信の基本方針

- APIクライアント関数を `lib/api/` ディレクトリに集約
- エンドポイントURIは定数として `constants/api.ts` で管理
- 型定義は `types/` ディレクトリに集約し、APIクライアントから再エクスポート
- エラーハンドリングを統一されたパターンで実装

### 認証済みAPIクライアントの共通化

認証済みAPIクライアントは、以下の特徴を持ちます：

1. **アクセストークン**: メモリ内で管理（セキュリティ強化）
2. **リフレッシュトークン**: HTTPOnly属性付きクッキーで保存（XSS対策）
3. **ユーザー情報**: ローカルストレージに保存（UI表示用）
4. **認証状態**: React Context + ローカルストレージで管理
5. **APIリクエスト**: Authorizationヘッダーにベアラートークンを付与

### データ変換と型管理

- バックエンドとのデータ形式の差異（スネークケース⇔キャメルケース）は一貫したユーティリティで解決
- リクエスト/レスポンスの型定義は厳密に行い、型安全性を確保
- 必要に応じてバックエンドのデータ構造をフロントエンド向けに最適化

### ステータス値の管理

#### 基本原則
- データベースのENUM値と完全に一致する文字列定数を定義
- 既存のINT型ステータスは段階的に文字列型へ移行
- 型安全性を確保するため、文字列リテラル型を活用

#### 実装例

```typescript
// constants/status.ts
// データベースのENUM値と完全一致させる
export const ITEM_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const;

// 型定義
export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS];

// 既存INT型との互換性維持（移行期間中のみ）
export const LEGACY_ITEM_STATUS_MAP = {
  1: ITEM_STATUS.DRAFT,
  2: ITEM_STATUS.ACTIVE,
  3: ITEM_STATUS.INACTIVE,
  4: ITEM_STATUS.ARCHIVED
} as const;

// 変換ユーティリティ
export const convertLegacyItemStatus = (status: number | string): ItemStatus => {
  if (typeof status === 'number') {
    return LEGACY_ITEM_STATUS_MAP[status as keyof typeof LEGACY_ITEM_STATUS_MAP] || ITEM_STATUS.DRAFT;
  }
  return status as ItemStatus;
};

// StatusChipコンポーネントでの使用例
import { StatusChip } from '@/components/common';
import { ITEM_STATUS } from '@/constants/status';

function ItemCard({ item }) {
  // APIレスポンスが数値の場合も文字列の場合も対応
  const normalizedStatus = convertLegacyItemStatus(item.status);
  
  return (
    <Card>
      <StatusChip 
        status={normalizedStatus}
        statusConfig={{
          [ITEM_STATUS.DRAFT]: { label: '下書き', color: 'default' },
          [ITEM_STATUS.ACTIVE]: { label: 'アクティブ', color: 'success' },
          [ITEM_STATUS.INACTIVE]: { label: '非アクティブ', color: 'warning' },
          [ITEM_STATUS.ARCHIVED]: { label: 'アーカイブ済み', color: 'error' }
        }}
      />
    </Card>
  );
}
```

## エラーハンドリング

### エラー処理の原則

1. **一貫性**: 統一されたエラーハンドリングパターンの適用
2. **段階的な処理**: APIエラー、バリデーションエラー、アプリケーションエラーの階層化
3. **ユーザー体験**: エンドユーザーに適切なエラーメッセージを表示
4. **ログ記録**: 開発環境での詳細なログ記録

### エラー種別

- **APIエラー**: バックエンドAPIからのエラーレスポンス
- **バリデーションエラー**: フォーム入力検証エラー
- **ネットワークエラー**: 通信障害やタイムアウト
- **アプリケーションエラー**: アプリケーション内部のロジックエラー

詳細仕様: [共通エラーコンポーネント](./COMMON_ERROR_COMPONENTS.md)

## Abort処理とキャンセル制御

### Abort処理の統一方針

アプリケーション全体で一貫したAbort処理を実装し、ユーザー体験の向上とリソースの適切な管理を行います。

#### 基本原則

1. **統一されたエラーハンドリング**: 全画面で同一のAbort処理パターンを適用
2. **ユーザー体験の向上**: 画面遷移時のキャンセルエラーを表示しない
3. **リソース管理**: 不要なAPIリクエストの適切なキャンセル
4. **一貫性**: APIクライアント層とフック層での統一されたパターン

### AbortErrorクラスとユーティリティ

Abort関連のエラーを統一的に管理するためのクラスとユーティリティ関数を提供します。

## 型定義

### 型定義の原則

1. **厳密性**: 可能な限り厳密な型定義を行う
2. **再利用性**: 共通する型は再利用可能な形で定義
3. **可読性**: 型名は用途が明確に分かる命名を採用
4. **拡張性**: 将来の変更に対応できる柔軟な型設計

### 型定義ファイルの配置

- **共通型**: `types/common.ts`
- **API型**: `types/api.ts`
- **機能別型**: `types/[feature].ts`
- **Props型**: 各コンポーネントファイル内で定義

## 命名規則

### ファイル命名

- **コンポーネント**: PascalCase（例: `UserProfile.tsx`）
- **フック**: camelCase with `use` prefix（例: `useUserData.ts`）
- **ユーティリティ**: camelCase（例: `dateUtils.ts`）
- **型定義**: camelCase（例: `user.types.ts`）
- **定数**: camelCase（例: `api.constants.ts`）
- **Worker**: camelCase with `.worker` suffix（例: `dataProcessor.worker.ts`）

### 変数・関数命名

- **変数**: camelCase（例: `userData`）
- **関数**: camelCase（例: `fetchUserData`）
- **定数**: SCREAMING_SNAKE_CASE（例: `API_BASE_URL`）
- **型**: PascalCase（例: `UserData`）

### コンポーネント命名

- **Props**: `ComponentNameProps`
- **状態**: `ComponentNameState`
- **イベントハンドラー**: `handleActionName`

## パフォーマンス最適化

### 最適化手法

1. **メモ化**: `React.memo`, `useMemo`, `useCallback`の適切な使用
2. **遅延読み込み**: `React.lazy`とDynamic Importの活用
3. **バンドル最適化**: 不要なライブラリの除去とTree Shaking
4. **キャッシュ戦略**: APIレスポンスの適切なキャッシュ

### パフォーマンス監視

- **Core Web Vitals**: LCP, FID, CLSの監視
- **バンドルサイズ**: webpack-bundle-analyzerでの定期的な分析
- **レンダリング**: React DevToolsでの最適化

## 環境別の処理

### 環境変数管理

- **開発環境**: `.env.local`（Git管理外）
- **本番環境**: 環境変数で直接設定
- **公開可能な設定**: `NEXT_PUBLIC_`プレフィックスを使用
- **環境固有の設定**: 環境変数による制御

### 主要な環境変数

- `NEXT_PUBLIC_API_URL`: APIエンドポイント
- `NEXT_PUBLIC_COGNITO_*`: AWS Cognito設定（オプション）
- `NEXT_PUBLIC_ENABLE_DEBUG`: デバッグモード

### 環境別設定例

- **APIエンドポイント**: 環境に応じたURL設定
- **ログレベル**: 開発環境では詳細ログ、本番では警告以上
- **デバッグツール**: 開発環境でのみ有効化

## テスト方針

### テスト戦略

1. **ユニットテスト**: 個別コンポーネントとフックのテスト
2. **統合テスト**: コンポーネント間の連携テスト
3. **E2Eテスト**: ユーザーワークフローの検証

### テストツール

- **Jest**: ユニットテスト・統合テスト
- **React Testing Library**: コンポーネントテスト
- **Playwright**: E2Eテスト
- **MSW (Mock Service Worker)**: APIモッキング
- **Testing Library User Event**: ユーザーインタラクションのシミュレーション

## アクセシビリティ

### アクセシビリティ基準

- **WCAG 2.1 AA**: 準拠レベル
- **キーボードナビゲーション**: 全機能のキーボード操作対応
- **スクリーンリーダー**: 適切なARIA属性の設定
- **色覚**: カラーコントラスト比の確保

### 実装指針

- **セマンティックHTML**: 適切なHTML要素の使用
- **ARIA属性**: 必要に応じたARIA属性の追加
- **フォーカス管理**: 論理的なフォーカス順序の実装

## テーマカラーの管理

### カラーパレット

Material-UIのテーマシステムを基盤として、統一されたカラーパレットを定義します。

### カスタマイゼーション

- **プライマリカラー**: ブランドカラーの設定
- **セカンダリカラー**: アクセントカラーの設定
- **ステータスカラー**: 成功、警告、エラーカラーの定義

## 実装済み機能モジュール

### アプリケーション機能
- **週報管理**: 週次報告書の作成・編集・提出・承認
- **休暇管理**: 休暇申請・承認・残日数表示
- **経費申請**: 経費申請・承認・カテゴリ管理
- **エンジニア管理**: スキル情報・経歴・プロジェクト履歴
- **案件管理**: プロジェクト情報・アサイン管理
- **営業管理**: 提案・商談・見積管理
- **請求書管理**: 請求書作成・PDF出力
- **スキルシート**: スキルシート生成・編集・PDF出力
- **面談管理**: 面談スケジュール・評価記録

### 技術的特徴
- **パフォーマンス最適化**:
  - Web Workerによるデータ処理（workHistoryProcessor.worker.ts）
  - TanStack Queryによる積極的なキャッシュ戦略
  - 画像の遅延読み込み
- **開発者支援**:
  - DebugLogger（デバッグ情報の表示）
  - React Query Devtools
- **アクセシビリティ**:
  - フォーカス管理フック（useFocusManagement）
  - キーボードナビゲーション対応
  - スクリーンリーダー対応
- **日付処理**:
  - date-fns（主要な日付処理）
  - dayjs（一部の機能で使用）

### 認証とセキュリティ
- **JWT認証**: アクセストークン（メモリ）+ リフレッシュトークン（Cookie）
- **AWS Cognito連携**: オプションでCognito認証をサポート
- **ロールベースアクセス制御**: admin、engineer、salesロール
- **自動トークンリフレッシュ**: バックグラウンドでの自動更新

## 新機能追加ガイドライン

### 追加プロセス

1. **要件分析**: 機能要件と技術要件の明確化
2. **設計検討**: 既存アーキテクチャとの整合性確認
3. **実装**: 本仕様書に従った実装
4. **テスト**: 十分なテストカバレッジの確保
5. **ドキュメント更新**: 仕様書の更新

### 考慮事項

- **既存機能への影響**: 破壊的変更の回避
- **パフォーマンス**: 新機能による性能劣化の防止
- **ユーザビリティ**: 一貫したユーザー体験の維持

## ファイル作成・配置基準

### ファイル作成時の判断基準

1. **再利用性**: 複数箇所で使用される場合は共通化
2. **責任範囲**: 単一責任の原則に従ったファイル分割
3. **依存関係**: 循環依存の回避
4. **テスト容易性**: テストしやすい粒度での分割

### 配置ディレクトリの選択

- **機能固有**: 特定の機能でのみ使用される場合は機能ディレクトリ内
- **共通**: 複数の機能で使用される場合は共通ディレクトリ
- **ユーティリティ**: 汎用的な処理は`lib/utils`

## 実装統一ルール

コード品質とメンテナンス性を高めるため、以下の実装統一ルールを遵守してください。

### 既存実装の優先利用

- **共通処理の再利用**: すでに実装されている共通処理や関数が存在する場合は、新たに実装せず既存機能を優先して利用する
- **重複コードの排除**: 類似機能を実装する場合は、既存のコードを調査し、必要に応じてリファクタリングして汎用化する
- **ユーティリティの活用**: `utils/`や`lib/`ディレクトリに定義された共通ユーティリティを積極的に活用する

### 一貫性のある実装パターン

- **処理方針の統一**: ドメインロジック以外の処理方針（エラーハンドリング、データ変換など）は、既存の同一階層ファイルの実装仕様と統一する
- **共通処理の利用方法**: 共通処理は同じ利用方法で一貫して使用する（引数の順序、オプションの指定方法など）
- **同一パターンの踏襲**: 新機能追加時は既存の類似機能の実装パターンを調査し、同じアプローチを採用する

### 機能別ディレクトリ構成

- **機能単位のグループ化**: 関連するコンポーネントやフックは機能単位でディレクトリにグループ化する
- **フックの配置**: 機能固有のカスタムフックは対応する機能ディレクトリ内の`hooks`サブディレクトリに配置する
- **ディレクトリ構造の一貫性**: 一度確立したディレクトリ構造パターンは、他の機能実装でも一貫して適用する

## 無限ループ防止ガイドライン

React フックの実装において無限ループを防ぐための重要なガイドラインです。特に `useEffect`、`useCallback`、`useMemo`、および `useAbortableEffect` の依存配列の管理に関する注意点を定義します。

### 無限ループの主な原因

#### 1. 依存配列の循環参照

最も一般的な無限ループの原因は、フック間の循環依存です。

#### 2. 状態更新による再レンダリング連鎖

状態の更新が新しい関数の作成を引き起こし、それが再度状態更新を引き起こすパターンです。

### 実装パターンの統一

#### 1. データ取得フックの標準パターン

- 内部用と外部用の関数分離
- 依存配列の最小化
- 固定値の使用による初回データ取得

#### 2. ページネーション処理の標準パターン

- ページ変更時の適切な依存関係管理
- 状態更新の順序制御

### 基本的なページ構成パターン

#### 1. 標準ページパターン

```tsx
import { 
  PageContainer, 
  PageHeader, 
  ContentCard 
} from '@/components/common/layout';

function MyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="ページタイトル"
        subtitle="ページの説明"
      />
      
      <ContentCard>
        {/* ページコンテンツ */}
      </ContentCard>
    </PageContainer>
  );
}
```

#### 2. タブ付きページパターン

```tsx
import { 
  PageContainer, 
  PageHeader, 
  TabContainer 
} from '@/components/common/layout';
import { CommonTabPanel } from '@/components/common';

function TabPage() {
  const [tabIndex, setTabIndex] = useState(0);
  
  const tabs = [
    { label: 'タブ1', value: 0 },
    { label: 'タブ2', value: 1 }
  ];

  return (
    <PageContainer>
      <PageHeader title="タブページ" />
      
      <TabContainer
        tabs={tabs}
        value={tabIndex}
        onChange={(_, newValue) => setTabIndex(newValue)}
      >
        <CommonTabPanel value={tabIndex} index={0}>
          タブ1のコンテンツ
        </CommonTabPanel>
        <CommonTabPanel value={tabIndex} index={1}>
          タブ2のコンテンツ
        </CommonTabPanel>
      </TabContainer>
    </PageContainer>
  );
}
```

#### 3. フィルター付きリストページパターン

```tsx
import { 
  PageContainer, 
  PageHeader, 
  FilterBar,
  EmptyState 
} from '@/components/common/layout';

function ListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  return (
    <PageContainer>
      <PageHeader title="リストページ" />
      
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
      />
      
      {data.length === 0 ? (
        <EmptyState type="noData" />
      ) : (
        // データ表示
      )}
    </PageContainer>
  );
}
```

### 必須チェックポイント

新規ページ実装時は以下を確認してください：

- [ ] PageContainerを使用している（Container直接使用NG）
- [ ] PageHeaderを使用している（Typography直接使用NG）
- [ ] ContentCardを使用している（Paper直接使用NG）
- [ ] ActionButtonを使用している（Button直接使用NG）
- [ ] 適切なバリアントを選択している
- [ ] レスポンシブ対応を考慮している
- [ ] data-testid属性を適切に設定している

---

## 詳細仕様への参照

本仕様書で概要を説明したコンポーネントの詳細実装については、以下の個別仕様書を参照してください：

### 共通コンポーネント
- [共通レイアウトコンポーネント](./common-layout-components.md)
- [共通フォームフィールドコンポーネント](./common-form-field-components.md)
- [アクションボタンコンポーネント](./action-button-component.md)
- [共通テーブルコンポーネント](./common-table-components.md)
- [共通ページネーションコンポーネント](./common-pagination-components.md)
- [ダイアログコンポーネント](./dialog-components.md)
- [ステータスチップコンポーネント](./status-chip-components.md)
- [共通バッジコンポーネント](./common-badge-components.md)
- [共通エラーコンポーネント](./COMMON_ERROR_COMPONENTS.md)
- [共通ローディングコンポーネント](./common-loading-components.md)
- [共通コンテナコンポーネント](./common-container-components.md)
- [共通カードコンポーネント](./common-card-components.md)

### バックエンド連携
- [バックエンド仕様書](./backend-specification.md)

---

**最終更新日**: 2025-07-11（実装状況を反映して大幅更新） 