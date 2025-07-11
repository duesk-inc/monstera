# 共通入力フィールドコンポーネント定義書

## 概要

フロントエンドアプリケーション全体での入力フィールドUIの統一を図るため、**6つの共通入力フィールドコンポーネントの使用を必須**とします。React Hook Formとの完全連携、一貫したエラーハンドリング、日本語ロケール対応を基準として設計されており、開発効率と保守性の向上を実現します。

## 基本方針

### 必須事項
- **MUI入力コンポーネントの直接使用を禁止**：DatePicker、Select、TextField（multiline）、RadioGroup、CheckboxGroup、TimePickerは全て統一コンポーネントを使用
- **React Hook Form連携の標準化**：全ての入力フィールドでReact Hook Formパターンの統一
- **エラーハンドリングの統一**：一貫したエラー表示とバリデーション処理
- **日本語ロケール統一**：日付・時間入力での日本語表示の徹底

### 統一化の効果
- **開発効率向上**：統一されたAPIにより新規開発が高速化
- **保守性向上**：一元化により変更影響範囲が明確化
- **品質向上**：統一されたバリデーション・エラーハンドリング
- **型安全性向上**：TypeScript連携による実行時エラー防止

## コンポーネント一覧

### 1. FormDatePicker
日付入力用の統一コンポーネント

#### 主な機能
- 年月日選択モード / 年月選択モード
- 日本語ロケール自動設定
- React Hook Form完全連携
- 統一されたエラーハンドリング

#### 基本使用方法
```tsx
import { FormDatePicker } from '@/components/common';

// 基本的な日付選択
<FormDatePicker
  name="applicationDate"
  control={control}
  label="申請日"
  required
  error={errors.applicationDate}
/>

// 年月選択モード
<FormDatePicker
  name="startMonth"
  control={control}
  label="開始年月"
  mode="month-year"
  required
  error={errors.startMonth}
/>
```

#### Props一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|------------|------|------|------------|------|
| name | Path\<T\> | ✅ | - | フィールド名 |
| control | Control\<T\> | ✅ | - | React Hook FormのControlオブジェクト |
| label | string | ✅ | - | ラベルテキスト |
| mode | 'date' \| 'month-year' | ❌ | 'date' | 選択モード |
| required | boolean | ❌ | false | 必須フィールドフラグ |
| disabled | boolean | ❌ | false | 無効化フラグ |
| maxDate | Date | ❌ | - | 最大日付制限 |
| minDate | Date | ❌ | - | 最小日付制限 |
| error | FieldError | ❌ | - | エラーオブジェクト |

### 2. FormSelect
セレクトボックス用の統一コンポーネント

#### 主な機能
- オプション配列からのMenuItem自動生成
- 統一された高さとスタイル
- プレースホルダー対応
- カスタムrenderValue対応

#### 基本使用方法
```tsx
import { FormSelect, type SelectOption } from '@/components/common';

const categoryOptions: SelectOption[] = [
  { value: 'frontend', label: 'フロントエンド' },
  { value: 'backend', label: 'バックエンド' },
  { value: 'infrastructure', label: 'インフラ', disabled: true },
];

<FormSelect
  name="category"
  control={control}
  label="カテゴリ"
  options={categoryOptions}
  required
  error={errors.category}
  placeholder="選択してください"
/>
```

#### Props一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|------------|------|------|------------|------|
| name | Path\<T\> | ✅ | - | フィールド名 |
| control | Control\<T\> | ✅ | - | React Hook FormのControlオブジェクト |
| label | string | ✅ | - | ラベルテキスト |
| options | SelectOption[] | ✅ | - | 選択肢配列 |
| required | boolean | ❌ | false | 必須フィールドフラグ |
| disabled | boolean | ❌ | false | 無効化フラグ |
| placeholder | string | ❌ | - | プレースホルダーテキスト |
| size | 'small' \| 'medium' | ❌ | 'medium' | サイズ |
| selectProps | Partial\<SelectProps\> | ❌ | - | カスタムSelectプロパティ |
| error | FieldError | ❌ | - | エラーオブジェクト |

#### SelectOption型定義
```tsx
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### 3. FormTextArea
テキストエリア用の統一コンポーネント

#### 主な機能
- 統一された行数設定
- 文字数カウント機能
- エラーハンドリング
- 最大文字数制限

#### 基本使用方法
```tsx
import { FormTextArea } from '@/components/common';

<FormTextArea
  register={register('notes')}
  label="備考"
  rows={3}
  placeholder="備考を入力してください"
  error={errors.notes}
  value={watch('notes')}
  maxLength={500}
  showCharacterCount
/>
```

#### Props一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|------------|------|------|------------|------|
| register | UseFormRegisterReturn | ✅ | - | register関数の戻り値 |
| label | string | ✅ | - | ラベルテキスト |
| rows | number | ❌ | 3 | 表示行数 |
| maxLength | number | ❌ | - | 最大文字数 |
| showCharacterCount | boolean | ❌ | false | 文字数表示フラグ |
| required | boolean | ❌ | false | 必須フィールドフラグ |
| disabled | boolean | ❌ | false | 無効化フラグ |
| placeholder | string | ❌ | - | プレースホルダーテキスト |
| error | FieldError | ❌ | - | エラーオブジェクト |
| value | string | ❌ | - | 文字数カウント用の現在値 |

### 4. FormRadioGroup
ラジオボタングループ用の統一コンポーネント

#### 主な機能
- オプション配列からのRadio自動生成
- 横並び/縦並びレイアウト対応
- エラーハンドリング
- アクセシビリティ対応

#### 基本使用方法
```tsx
import { FormRadioGroup, type RadioOption } from '@/components/common';

const travelOptions: RadioOption[] = [
  { value: '1', label: '可能' },
  { value: '2', label: '不可' },
  { value: '3', label: '要相談', disabled: true },
];

<FormRadioGroup
  name="canTravel"
  control={control}
  label="出張可能"
  options={travelOptions}
  direction="row"
  required
  error={errors.canTravel}
/>
```

#### Props一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|------------|------|------|------------|------|
| name | Path\<T\> | ✅ | - | フィールド名 |
| control | Control\<T\> | ✅ | - | React Hook FormのControlオブジェクト |
| label | string | ✅ | - | ラベルテキスト |
| options | RadioOption[] | ✅ | - | 選択肢配列 |
| direction | 'row' \| 'column' | ❌ | 'column' | レイアウト方向 |
| required | boolean | ❌ | false | 必須フィールドフラグ |
| disabled | boolean | ❌ | false | 無効化フラグ |
| error | FieldError | ❌ | - | エラーオブジェクト |

#### RadioOption型定義
```tsx
interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### 5. FormCheckboxGroup
チェックボックスグループ用の統一コンポーネント

#### 主な機能
- 複数選択値の配列管理
- オプション配列からのCheckbox自動生成
- 横並び/縦並びレイアウト対応
- エラーハンドリング

#### 基本使用方法
```tsx
import { FormCheckboxGroup, type CheckboxOption } from '@/components/common';

const processOptions: CheckboxOption[] = [
  { value: '要件定義', label: '要件定義' },
  { value: '基本設計', label: '基本設計' },
  { value: '詳細設計', label: '詳細設計' },
  { value: 'テスト', label: 'テスト', disabled: true },
];

<FormCheckboxGroup
  name="processes"
  control={control}
  label="担当工程"
  options={processOptions}
  direction="row"
  required
  error={errors.processes}
/>
```

#### Props一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|------------|------|------|------------|------|
| name | Path\<T\> | ✅ | - | フィールド名 |
| control | Control\<T\> | ✅ | - | React Hook FormのControlオブジェクト |
| label | string | ✅ | - | ラベルテキスト |
| options | CheckboxOption[] | ✅ | - | 選択肢配列 |
| direction | 'row' \| 'column' | ❌ | 'column' | レイアウト方向 |
| required | boolean | ❌ | false | 必須フィールドフラグ |
| disabled | boolean | ❌ | false | 無効化フラグ |
| error | FieldError | ❌ | - | エラーオブジェクト |

#### CheckboxOption型定義
```tsx
interface CheckboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### 6. FormTimePicker
時間入力用の統一コンポーネント

#### 主な機能
- React Hook Form完全連携
- 日本語ロケール自動設定
- エラーハンドリング
- タイムアイコン表示対応

#### 基本使用方法
```tsx
import { FormTimePicker } from '@/components/common';

<FormTimePicker
  name="startTime"
  control={control}
  label="開始時間"
  showTimeIcon
  iconColor="secondary"
  required
  error={errors.startTime}
/>
```

#### Props一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|------------|------|------|------------|------|
| name | Path\<T\> | ✅ | - | フィールド名 |
| control | Control\<T\> | ✅ | - | React Hook FormのControlオブジェクト |
| label | string | ✅ | - | ラベルテキスト |
| disabled | boolean | ❌ | false | 無効化フラグ |
| size | 'small' \| 'medium' | ❌ | 'small' | サイズ |
| textFieldProps | Partial\<TextFieldProps\> | ❌ | - | カスタムTextFieldプロパティ |
| required | boolean | ❌ | false | 必須フィールドフラグ |
| showTimeIcon | boolean | ❌ | true | アイコン表示フラグ |
| iconColor | MUI ColorType | ❌ | 'inherit' | アイコンの色 |
| error | FieldError | ❌ | - | エラーオブジェクト |

## 実装パターン

### 1. 基本的なフォーム実装
```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { 
  FormDatePicker, 
  FormSelect, 
  FormTextArea, 
  FormRadioGroup,
  FormCheckboxGroup 
} from '@/components/common';

interface FormData {
  applicationDate: Date | null;
  category: string;
  description: string;
  priority: string;
  features: string[];
}

const MyForm: React.FC = () => {
  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();

  const categoryOptions = [
    { value: 'urgent', label: '緊急' },
    { value: 'normal', label: '通常' },
    { value: 'low', label: '低' },
  ];

  const priorityOptions = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ];

  const featureOptions = [
    { value: 'feature1', label: '機能1' },
    { value: 'feature2', label: '機能2' },
    { value: 'feature3', label: '機能3' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormDatePicker
        name="applicationDate"
        control={control}
        label="申請日"
        required
        error={errors.applicationDate}
      />
      
      <FormSelect
        name="category"
        control={control}
        label="カテゴリ"
        options={categoryOptions}
        required
        error={errors.category}
      />
      
      <FormTextArea
        register={register('description')}
        label="説明"
        rows={4}
        error={errors.description}
        value={watch('description')}
        maxLength={500}
        showCharacterCount
      />
      
      <FormRadioGroup
        name="priority"
        control={control}
        label="優先度"
        options={priorityOptions}
        direction="row"
        required
        error={errors.priority}
      />
      
      <FormCheckboxGroup
        name="features"
        control={control}
        label="機能"
        options={featureOptions}
        direction="row"
        error={errors.features}
      />
    </form>
  );
};
```

### 2. バリデーション付きフォーム
```tsx
const { 
  control, 
  register, 
  handleSubmit, 
  watch, 
  formState: { errors } 
} = useForm<FormData>({
  defaultValues: {
    applicationDate: null,
    category: '',
    description: '',
    priority: '',
    features: [],
  }
});

// バリデーションルールの設定例
<FormDatePicker
  name="applicationDate"
  control={control}
  label="申請日"
  required
  error={errors.applicationDate}
  rules={{
    required: '申請日を選択してください',
    validate: (value) => {
      if (value && value > new Date()) {
        return '未来の日付は選択できません';
      }
      return true;
    }
  }}
/>
```

### 3. 動的フォーム実装
```tsx
// 動的にオプションを変更する例
const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);

useEffect(() => {
  // API呼び出しなどでオプションを動的に設定
  fetchCategoryOptions().then(setCategoryOptions);
}, []);

<FormSelect
  name="category"
  control={control}
  label="カテゴリ"
  options={categoryOptions}
  required
  error={errors.category}
  disabled={categoryOptions.length === 0}
/>
```

## 移行ガイドライン

### 既存コードからの移行手順

#### 1. DatePickerの移行
**変更前:**
```tsx
import { Controller } from 'react-hook-form';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
  <Controller
    name="date"
    control={control}
    rules={{ required: '日付を選択してください' }}
    render={({ field, fieldState }) => (
      <DatePicker
        label="日付"
        value={field.value}
        onChange={(date) => field.onChange(date)}
        slotProps={{
          textField: {
            fullWidth: true,
            error: !!fieldState.error,
            helperText: fieldState.error?.message
          }
        }}
      />
    )}
  />
</LocalizationProvider>
```

**変更後:**
```tsx
import { FormDatePicker } from '@/components/common';

<FormDatePicker
  name="date"
  control={control}
  label="日付"
  required
  error={errors.date}
/>
```

#### 2. Select + MenuItemの移行
**変更前:**
```tsx
<FormControl fullWidth>
  <InputLabel>カテゴリ</InputLabel>
  <Select
    {...register('category', { required: 'カテゴリを選択してください' })}
    label="カテゴリ"
  >
    {categories.map((option) => (
      <MenuItem key={option.value} value={option.value}>
        {option.label}
      </MenuItem>
    ))}
  </Select>
  {errors.category && <FormHelperText error>{errors.category.message}</FormHelperText>}
</FormControl>
```

**変更後:**
```tsx
import { FormSelect } from '@/components/common';

<FormSelect
  name="category"
  control={control}
  label="カテゴリ"
  options={categories}
  required
  error={errors.category}
/>
```

#### 3. multiline TextFieldの移行
**変更前:**
```tsx
<TextField
  label="備考"
  {...register('notes')}
  multiline
  rows={3}
  placeholder="備考を入力してください"
  error={!!errors.notes}
  helperText={errors.notes?.message}
/>
```

**変更後:**
```tsx
import { FormTextArea } from '@/components/common';

<FormTextArea
  register={register('notes')}
  label="備考"
  rows={3}
  placeholder="備考を入力してください"
  error={errors.notes}
/>
```

## エラーハンドリング

### 統一されたエラー表示
```tsx
// エラーメッセージの統一パターン
const errorMessages = {
  required: (fieldName: string) => `${fieldName}を入力してください`,
  invalid: (fieldName: string) => `${fieldName}の形式が正しくありません`,
  maxLength: (fieldName: string, max: number) => `${fieldName}は${max}文字以内で入力してください`,
};

// バリデーションルールの統一例
<FormDatePicker
  name="startDate"
  control={control}
  label="開始日"
  required
  error={errors.startDate}
  rules={{
    required: errorMessages.required('開始日'),
    validate: {
      notFuture: (value) => 
        !value || value <= new Date() || '未来の日付は選択できません',
      notTooOld: (value) => 
        !value || value >= subYears(new Date(), 10) || '10年以上前の日付は選択できません'
    }
  }}
/>
```

### エラー状態の一元管理
```tsx
// フォーム全体のエラー状態管理
const [formErrors, setFormErrors] = useState<Record<string, string>>({});

const validateForm = (data: FormData) => {
  const errors: Record<string, string> = {};
  
  if (!data.applicationDate) {
    errors.applicationDate = '申請日を選択してください';
  }
  
  if (!data.category) {
    errors.category = 'カテゴリを選択してください';
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

## アクセシビリティ対応

### WCAGガイドライン準拠
- **ラベルとフィールドの関連付け**: 全コンポーネントで自動実装
- **キーボードナビゲーション**: Tab、Enter、矢印キー対応
- **スクリーンリーダー対応**: aria属性の適切な設定
- **色に依存しない情報伝達**: エラー状態をアイコンとテキストで併用

### 実装例
```tsx
// アクセシビリティを考慮した実装
<FormRadioGroup
  name="priority"
  control={control}
  label="優先度"
  options={priorityOptions}
  direction="row"
  required
  error={errors.priority}
  // aria-labelledbyとaria-describedbyは自動設定
  // キーボードナビゲーションも自動対応
/>
```

## テスト方針

### 単体テスト
```tsx
// コンポーネントテストの例
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { FormDatePicker } from '@/components/common';

const TestWrapper = () => {
  const { control } = useForm();
  return (
    <FormDatePicker
      name="testDate"
      control={control}
      label="テスト日付"
      required
    />
  );
};

test('FormDatePicker renders correctly', () => {
  render(<TestWrapper />);
  expect(screen.getByLabelText('テスト日付')).toBeInTheDocument();
});

test('FormDatePicker shows error message', () => {
  // エラー状態のテスト実装
});
```

### 統合テスト
```tsx
// フォーム全体のテスト例
test('form submission works correctly', async () => {
  render(<MyForm />);
  
  // 各フィールドへの入力
  fireEvent.change(screen.getByLabelText('説明'), { target: { value: 'テスト説明' } });
  fireEvent.click(screen.getByLabelText('高'));
  
  // フォーム送信
  fireEvent.click(screen.getByRole('button', { name: '送信' }));
  
  // 結果の検証
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({
      description: 'テスト説明',
      priority: 'high',
    });
  });
});
```

## パフォーマンス最適化

### レンダリング最適化
```tsx
// React.memoを使用した最適化
import React, { memo } from 'react';

const OptimizedForm = memo(() => {
  // フォームコンポーネントの実装
});

// useMemoを使用したオプション配列の最適化
const categoryOptions = useMemo(() => [
  { value: 'category1', label: 'カテゴリ1' },
  { value: 'category2', label: 'カテゴリ2' },
], []);
```

### 動的インポート
```tsx
// 大きなフォームコンポーネントの遅延読み込み
const LargeForm = lazy(() => import('./LargeForm'));

const ParentComponent = () => (
  <Suspense fallback={<CircularProgress />}>
    <LargeForm />
  </Suspense>
);
```

## デバッグとトラブルシューティング

### 開発者向けガイド
```tsx
// React Hook Formのdevtoolsを使用
import { DevTool } from '@hookform/devtools';

const MyForm = () => {
  const { control } = useForm();
  
  return (
    <>
      <form>{/* フォームコンテンツ */}</form>
      {process.env.NODE_ENV === 'development' && (
        <DevTool control={control} />
      )}
    </>
  );
};
```

### よくある問題と解決方法

#### 1. エラーメッセージが表示されない
```tsx
// 問題: errorプロパティが正しく渡されていない
<FormDatePicker
  name="date"
  control={control}
  label="日付"
  // error={errors.date} ← これが不足
/>

// 解決策: errorプロパティを必ず設定
<FormDatePicker
  name="date"
  control={control}
  label="日付"
  error={errors.date} // ← 必須
/>
```

#### 2. バリデーションが動作しない
```tsx
// 問題: React Hook Formのrulesが設定されていない
const { control } = useForm(); // デフォルト値とルールなし

// 解決策: register関数でバリデーションルールを設定
const { control, register } = useForm();

// または、Controllerのrulesプロパティを使用
<Controller
  name="date"
  control={control}
  rules={{ required: '日付を選択してください' }}
  render={() => <FormDatePicker ... />}
/>
```

## 今後の拡張予定

### Phase 1: 完了 ✅
- 6つの基本入力フィールドコンポーネント完成
- React Hook Form完全連携
- エラーハンドリング統一

### Phase 2: 計画中
- より高度なバリデーション機能
- 動的フォーム生成ライブラリ
- フォームウィザード機能

### Phase 3: 検討中
- 他のUIライブラリとの互換性
- カスタムテーマ対応の拡張
- パフォーマンスの最適化

## 問い合わせ

共通入力フィールドコンポーネントに関する質問や改善提案は、開発チームまでお気軽にお声かけください。 