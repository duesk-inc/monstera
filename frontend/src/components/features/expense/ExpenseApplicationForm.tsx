import React from 'react';
import {
  TextField,
  InputAdornment,
  Stack,
  Box,
} from '@mui/material';
import {
  Send as SendIcon,
} from '@mui/icons-material';
import { UseFormReturn } from 'react-hook-form';
import ActionButton from '@/components/common/ActionButton';
import { FormRadioGroup, FormDatePicker, FormTextArea, FormContainer } from '@/components/common';
import { ReceiptUpload } from './ReceiptUpload';

// 経費カテゴリオプション
const EXPENSE_CATEGORIES = [
  { value: 'transportation', label: '交通費' },
  { value: 'supplies', label: '備品' },
  { value: 'other', label: 'その他' },
];

// 経費申請データ型定義
interface ExpenseFormData {
  category: string;
  amount: number;
  date: Date | null;
  reason: string;
  receiptImage: File | null;
  notes: string;
}

interface ExpenseApplicationFormProps {
  formMethods: UseFormReturn<ExpenseFormData>;
  receiptFile: File | null;
  onReceiptFileChange: (file: File | null) => void;
  onFileError: (message: string) => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onReset: () => void;
  isSubmitting: boolean;
}

/**
 * 経費申請フォームコンポーネント
 * カテゴリ選択、金額、日付、理由、領収書アップロード、備考を管理
 */
export const ExpenseApplicationForm: React.FC<ExpenseApplicationFormProps> = ({
  formMethods,
  receiptFile,
  onReceiptFileChange,
  onFileError,
  onSubmit,
  onReset,
  isSubmitting,
}) => {
  const { 
    control, 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = formMethods;

  return (
    <>

      <FormContainer>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            {/* カテゴリ選択 */}
            <FormRadioGroup
              name="category"
              control={control}
              label="経費カテゴリ"
              options={EXPENSE_CATEGORIES}
              required
            />

            {/* 金額入力 */}
            <TextField
              {...register('amount', {
                required: '金額を入力してください',
                min: { value: 1, message: '金額は1円以上で入力してください' },
                max: { value: 1000000, message: '金額は100万円以下で入力してください' },
              })}
              label="金額"
              type="number"
              fullWidth
              required
              error={!!errors.amount}
              helperText={errors.amount?.message}
              InputProps={{
                endAdornment: <InputAdornment position="end">円</InputAdornment>,
              }}
            />

            {/* 日付選択 */}
            <FormDatePicker
              name="date"
              control={control}
              label="使用日"
              required
            />

            {/* 理由入力 */}
            <FormTextArea
              register={register('reason', { 
                required: '使用理由を入力してください',
                minLength: { value: 10, message: '使用理由は10文字以上で入力してください' }
              })}
              label="使用理由"
              placeholder="経費の使用理由を詳しく入力してください"
              required
              rows={3}
              error={errors.reason}
            />

            {/* 領収書添付 */}
            <ReceiptUpload
              receiptFile={receiptFile}
              onFileChange={onReceiptFileChange}
              onError={onFileError}
              required
            />

            {/* 備考 */}
            <FormTextArea
              register={register('notes')}
              label="備考"
              placeholder="その他の補足事項があれば入力してください"
              rows={2}
            />

            {/* 送信ボタン */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <ActionButton
                buttonType="secondary"
                onClick={onReset}
                disabled={isSubmitting}
              >
                リセット
              </ActionButton>
              <ActionButton
                type="submit"
                buttonType="primary"
                startIcon={<SendIcon />}
                loading={isSubmitting}
                disabled={!receiptFile}
              >
                申請を送信
              </ActionButton>
            </Box>
          </Stack>
        </form>
      </FormContainer>
    </>
  );
}; 