import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { format, parseISO, isValid, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { ReceiptUploader } from './ReceiptUploader';
import { useCategories } from '@/hooks/expense/useCategories';
import { useExpenseSubmit } from '@/hooks/expense/useExpenseSubmit';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { VALIDATION_CONSTANTS, EXPENSE_MESSAGES } from '@/constants/expense';
import { EXPENSE_VALIDATION, EXPENSE_VALIDATION_MESSAGES } from '@/constants/validation';
import type { ExpenseFormData, ExpenseData, ValidationError } from '@/types/expense';
import { Warning as WarningIcon, Error as ErrorIcon } from '@mui/icons-material';
import { 
  isWithinDeadline, 
  getDeadlineWarningLevel, 
  getDeadlineMessage,
  isAllowableForSubmission 
} from '@/utils/expenseDeadline';

// UI定数
const AMOUNT_STEP = 1;
const DATE_FORMAT = 'yyyy-MM-dd';
const DISPLAY_DATE_FORMAT = 'yyyy年MM月dd日';


interface ExpenseFormProps {
  expense?: ExpenseData;
  mode: 'create' | 'edit';
  onSuccess?: (expense: ExpenseData) => void;
  onCancel?: () => void;
}

/**
 * 経費申請フォームコンポーネント
 * 新規作成・編集モードに対応し、バリデーション機能を提供
 */
export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expense,
  mode,
  onSuccess,
  onCancel,
}) => {
  const router = useRouter();
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const { categories, getCategoryById, isLoading: isCategoriesLoading } = useCategories();
  const { createExpense, updateExpense, submitExpense, isCreating, isUpdating, isSubmitting } = useExpenseSubmit();

  // 現在日付と年度範囲の状態管理（ハイドレーション対策）
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentYearStart, setCurrentYearStart] = useState<Date | null>(null);
  const [currentYearEnd, setCurrentYearEnd] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    const year = now.getFullYear();
    setCurrentYear(year);
    setCurrentYearStart(startOfYear(new Date(year, 0, 1)));
    setCurrentYearEnd(endOfYear(new Date(year, 11, 31)));
  }, []);

  // フォームデータの状態管理
  const [formData, setFormData] = useState<ExpenseFormData>({
    categoryId: expense?.categoryId || '',
    categoryCode: undefined,
    amount: expense?.amount || 0,
    description: expense?.description || '',
    receiptUrl: expense?.receiptUrl || undefined,
    receiptS3Key: expense?.receiptS3Key || undefined,
    expenseDate: expense?.expenseDate || format(new Date(), DATE_FORMAT),
  });

  // バリデーションエラーの状態管理
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);


  // 選択中のカテゴリ情報
  const selectedCategory = getCategoryById(formData.categoryId);
  const isReceiptRequired = selectedCategory?.requiresReceipt || 
    (formData.amount >= VALIDATION_CONSTANTS.RECEIPT_REQUIRED_AMOUNT);

  // 期限情報の計算
  const expenseDate = formData.expenseDate ? parseISO(formData.expenseDate) : null;
  const deadlineWarningLevel = expenseDate ? getDeadlineWarningLevel(expenseDate) : 'normal';
  const deadlineMessage = expenseDate ? getDeadlineMessage(expenseDate) : '';
  const isExpired = deadlineWarningLevel === 'expired';

  // フォーム初期化
  useEffect(() => {
    if (expense && mode === 'edit') {
      setFormData({
        categoryId: expense.categoryId,
        categoryCode: undefined,
        amount: expense.amount,
        description: expense.description,
        receiptUrl: expense.receiptUrl,
        receiptS3Key: expense.receiptS3Key,
        expenseDate: expense.expenseDate,
      });
    }
  }, [expense, mode]);

  // バリデーション関数
  const validateForm = useCallback((): ValidationError[] => {
    const newErrors: ValidationError[] = [];

    // カテゴリ検証
    if (!formData.categoryId) {
      newErrors.push({ field: 'categoryId', message: 'カテゴリを選択してください' });
    }

    // 金額検証
    if (!formData.amount || formData.amount <= 0) {
      newErrors.push({ field: 'amount', message: '金額を入力してください' });
    } else if (formData.amount < VALIDATION_CONSTANTS.MIN_AMOUNT) {
      newErrors.push({ 
        field: 'amount', 
        message: `金額は${VALIDATION_CONSTANTS.MIN_AMOUNT}円以上で入力してください` 
      });
    } else if (formData.amount > VALIDATION_CONSTANTS.MAX_AMOUNT) {
      newErrors.push({ 
        field: 'amount', 
        message: `金額は${VALIDATION_CONSTANTS.MAX_AMOUNT.toLocaleString()}円以下で入力してください` 
      });
    }

    // 説明検証
    if (!formData.description.trim()) {
      newErrors.push({ field: 'description', message: EXPENSE_VALIDATION_MESSAGES.DESCRIPTION.REQUIRED });
    } else if (formData.description.length < EXPENSE_VALIDATION.DESCRIPTION.MIN_LENGTH) {
      newErrors.push({ 
        field: 'description', 
        message: EXPENSE_VALIDATION_MESSAGES.DESCRIPTION.MIN_LENGTH 
      });
    } else if (formData.description.length > EXPENSE_VALIDATION.DESCRIPTION.MAX_LENGTH) {
      newErrors.push({ 
        field: 'description', 
        message: EXPENSE_VALIDATION_MESSAGES.DESCRIPTION.MAX_LENGTH 
      });
    }

    // 日付検証
    if (!formData.expenseDate) {
      newErrors.push({ field: 'expenseDate', message: '日付を選択してください' });
    } else {
      const expenseDate = parseISO(formData.expenseDate);
      const today = endOfDay(new Date());
      if (!isValid(expenseDate)) {
        newErrors.push({ field: 'expenseDate', message: '有効な日付を選択してください' });
      } else if (expenseDate > today) {
        newErrors.push({ field: 'expenseDate', message: '未来の日付は選択できません' });
      } else if (currentYearStart && currentYearEnd && currentYear && (expenseDate < currentYearStart || expenseDate > currentYearEnd)) {
        newErrors.push({ field: 'expenseDate', message: `${currentYear}年の日付を選択してください` });
      } else if (!isAllowableForSubmission(expenseDate)) {
        newErrors.push({ field: 'expenseDate', message: '申請期限を過ぎているため、この日付の経費は申請できません' });
      }
    }

    // 領収書検証
    if (isReceiptRequired && !formData.receiptUrl) {
      newErrors.push({ 
        field: 'receipt', 
        message: selectedCategory?.requiresReceipt 
          ? 'このカテゴリでは領収書が必須です' 
          : `${VALIDATION_CONSTANTS.RECEIPT_REQUIRED_AMOUNT.toLocaleString()}円以上の申請には領収書が必要です`
      });
    }

    return newErrors;
  }, [formData, isReceiptRequired, selectedCategory]);

  // フィールド値変更ハンドラー
  const handleFieldChange = useCallback((field: keyof ExpenseFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // フィールドのフォーカスアウトハンドラー
  const handleFieldBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // 単一フィールドのバリデーション
    const validationErrors = validateForm();
    const fieldError = validationErrors.find(error => error.field === field);
    
    setErrors(prev => ({
      ...prev,
      [field]: fieldError?.message || '',
    }));
  }, [validateForm]);

  // 領収書アップロードハンドラー
  const handleReceiptChange = useCallback((url: string | null, s3Key: string | null, fileName?: string | null) => {
    setFormData(prev => ({
      ...prev,
      receiptUrl: url || undefined,
      receiptS3Key: s3Key || undefined,
    }));
    
    // 領収書エラーをクリア
    if (errors.receipt) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.receipt;
        return newErrors;
      });
    }
  }, [errors]);

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // 全フィールドをタッチ済みに設定
    const allFields = ['categoryId', 'amount', 'description', 'expenseDate', 'receipt'];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);
    
    // バリデーション実行
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }
    
    try {
      let result: ExpenseData;
      
      if (mode === 'create') {
        result = await createExpense(formData);
      } else {
        if (!expense?.id) {
          throw new Error('経費申請IDが見つかりません');
        }
        result = await updateExpense(expense.id, formData);
      }
      
      // 成功時の処理
      if (onSuccess) {
        onSuccess(result);
      } else {
        // デフォルトの動作：詳細画面に遷移
        router.push(`/expenses/${result.id}`);
      }
    } catch (error) {
      handleSubmissionError(error, mode === 'create' ? '経費申請の作成' : '経費申請の更新');
    }
  };

  // キャンセルハンドラー
  const handleCancel = () => {
    setSubmitAttempted(false);
    
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // 提出ハンドラー
  const handleSubmitExpense = async () => {
    try {
      if (!expense?.id) {
        throw new Error('経費申請IDが見つかりません');
      }

      const result = await submitExpense(expense.id);
      
      // 成功メッセージ
      if (onSuccess) {
        onSuccess(result);
      } else {
        // デフォルトの成功処理
        router.push('/expenses');
      }
    } catch (error) {
      handleSubmissionError(error, '経費申請の提出');
    }
  };

  // 作成して提出ハンドラー
  const handleCreateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // 全フィールドをタッチ済みに設定
    const allFields = ['categoryId', 'amount', 'description', 'expenseDate', 'receipt'];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);
    
    // バリデーション実行
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      return;
    }
    
    try {
      // 1. まず作成
      const createdExpense = await createExpense(formData);
      
      // 2. 次に提出
      const submittedExpense = await submitExpense(createdExpense.id);
      
      // 成功時の処理
      if (onSuccess) {
        onSuccess(submittedExpense);
      } else {
        // デフォルトの動作：一覧画面に遷移
        router.push('/expenses');
      }
    } catch (error) {
      handleSubmissionError(error, '経費申請の作成と提出');
    }
  };


  // ローディング中の表示
  const isLoading = isCreating || isUpdating || isSubmitting || isCategoriesLoading;
  
  // draftステータスかどうかの判定
  const isDraft = expense?.status === 'draft' || expense?.status === '下書き';

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* 申請日 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="申請日 *"
                value={formData.expenseDate ? parseISO(formData.expenseDate) : null}
                onChange={(date) => {
                  if (date && isValid(date)) {
                    handleFieldChange('expenseDate', format(date, DATE_FORMAT));
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: touched.expenseDate && !!errors.expenseDate,
                    helperText: touched.expenseDate && errors.expenseDate,
                    onBlur: () => handleFieldBlur('expenseDate'),
                  },
                }}
                minDate={currentYearStart}
                maxDate={currentDate && currentYearEnd && currentDate > currentYearEnd ? currentYearEnd : currentDate}
                format={DISPLAY_DATE_FORMAT}
                disabled={isLoading}
              />
              {/* 期限情報の表示 */}
              {formData.expenseDate && (
                <Box sx={{ mt: 1 }}>
                  <Chip
                    icon={
                      deadlineWarningLevel === 'expired' ? <ErrorIcon /> :
                      deadlineWarningLevel === 'critical' ? <WarningIcon /> :
                      deadlineWarningLevel === 'warning' ? <WarningIcon /> : null
                    }
                    label={deadlineMessage}
                    color={
                      deadlineWarningLevel === 'expired' ? 'error' :
                      deadlineWarningLevel === 'critical' ? 'error' :
                      deadlineWarningLevel === 'warning' ? 'warning' : 'info'
                    }
                    size="small"
                    variant={deadlineWarningLevel === 'normal' ? 'outlined' : 'filled'}
                  />
                </Box>
              )}
            </Grid>

            {/* カテゴリ */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="カテゴリ *"
                value={formData.categoryId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedCategory = categories.find(cat => cat.id === selectedId);
                  handleFieldChange('categoryId', selectedId);
                  if (selectedCategory) {
                    handleFieldChange('categoryCode', selectedCategory.code);
                  }
                }}
                onBlur={() => handleFieldBlur('categoryId')}
                error={touched.categoryId && !!errors.categoryId}
                helperText={touched.categoryId && errors.categoryId}
                disabled={isLoading}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 金額 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="金額 *"
                value={formData.amount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    handleFieldChange('amount', Math.round(value));
                  }
                }}
                onBlur={() => handleFieldBlur('amount')}
                error={touched.amount && !!errors.amount}
                helperText={touched.amount && errors.amount}
                disabled={isLoading}
                inputProps={{
                  step: AMOUNT_STEP,
                  min: VALIDATION_CONSTANTS.MIN_AMOUNT,
                  max: VALIDATION_CONSTANTS.MAX_AMOUNT,
                }}
                InputProps={{
                  endAdornment: <Typography variant="body2">円</Typography>,
                }}
              />
            </Grid>

            {/* 空きスペース */}
            <Grid size={{ xs: 12, sm: 6 }} />

            {/* 内容 */}
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="内容 *"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                onBlur={() => handleFieldBlur('description')}
                error={touched.description && !!errors.description}
                helperText={
                  touched.description && errors.description
                    ? errors.description
                    : (
                      <Box component="span" sx={{ 
                        color: formData.description.length < EXPENSE_VALIDATION.DESCRIPTION.MIN_LENGTH 
                          ? 'error.main' 
                          : 'text.secondary' 
                      }}>
                        {formData.description.length}/{EXPENSE_VALIDATION.DESCRIPTION.MAX_LENGTH}文字
                        {formData.description.length < EXPENSE_VALIDATION.DESCRIPTION.MIN_LENGTH && 
                          ` (最小${EXPENSE_VALIDATION.DESCRIPTION.MIN_LENGTH}文字)`
                        }
                      </Box>
                    )
                }
                disabled={isLoading}
                placeholder={`使用理由を${EXPENSE_VALIDATION.DESCRIPTION.MIN_LENGTH}文字以上で入力してください`}
              />
            </Grid>

            {/* 領収書アップロード */}
            <Grid size={12}>
              <Divider sx={{ my: 2 }} />
              <ReceiptUploader
                value={formData.receiptUrl}
                s3Key={formData.receiptS3Key}
                onChange={handleReceiptChange}
                disabled={isLoading}
                required={isReceiptRequired}
                error={touched.receipt ? errors.receipt : undefined}
                helperText={
                  isReceiptRequired
                    ? selectedCategory?.requiresReceipt
                      ? 'このカテゴリでは領収書のアップロードが必須です'
                      : `${VALIDATION_CONSTANTS.RECEIPT_REQUIRED_AMOUNT.toLocaleString()}円以上の申請には領収書が必要です`
                    : '領収書をアップロードできます（任意）'
                }
              />
            </Grid>

            {/* エラーメッセージ */}
            {Object.keys(errors).length > 0 && submitAttempted && (
              <Grid size={12}>
                <Alert severity="error">
                  {EXPENSE_MESSAGES.VALIDATION_ERROR}
                </Alert>
              </Grid>
            )}

            {/* 期限切れ警告 */}
            {isExpired && (
              <Grid size={12}>
                <Alert severity="error" icon={<ErrorIcon />}>
                  申請期限を過ぎているため、この経費は申請できません。
                </Alert>
              </Grid>
            )}

            {/* アクションボタン */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  キャンセル
                </Button>
                {/* 作成モードの場合 */}
                {mode === 'create' ? (
                  <>
                    <Button
                      type="submit"
                      variant="outlined"
                      color="primary"
                      disabled={isLoading || isExpired}
                      startIcon={isLoading && !isSubmitting && <CircularProgress size={20} />}
                    >
                      下書き保存
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreateAndSubmit}
                      disabled={isLoading || isExpired}
                      startIcon={isLoading && <CircularProgress size={20} />}
                    >
                      作成して提出
                    </Button>
                  </>
                ) : (
                  <>
                    {/* 編集モードの場合 */}
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isLoading || isExpired}
                      startIcon={isLoading && !isSubmitting && <CircularProgress size={20} />}
                    >
                      更新
                    </Button>
                    {/* draftステータスの場合のみ提出ボタンを表示 */}
                    {isDraft && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmitExpense}
                        disabled={isLoading || isExpired}
                        startIcon={isSubmitting && <CircularProgress size={20} />}
                      >
                        提出
                      </Button>
                    )}
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};