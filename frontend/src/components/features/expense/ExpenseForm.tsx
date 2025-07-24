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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { format, parseISO, isValid, endOfDay, formatDistanceToNow, startOfYear, endOfYear } from 'date-fns';
import { ja as jaLocale } from 'date-fns/locale';
import { ReceiptUploader } from './ReceiptUploader';
import { useCategories } from '@/hooks/expense/useCategories';
import { useExpenseSubmit } from '@/hooks/expense/useExpenseSubmit';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { useAutoSave } from '@/hooks/expense/useAutoSave';
import { VALIDATION_CONSTANTS, EXPENSE_MESSAGES } from '@/constants/expense';
import type { ExpenseFormData, ExpenseData, ValidationError } from '@/types/expense';
import { Save as SaveIcon, Warning as WarningIcon, Error as ErrorIcon } from '@mui/icons-material';
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

// 現在年度の範囲を定義
const currentYear = new Date().getFullYear();
const currentYearStart = startOfYear(new Date(currentYear, 0, 1));
const currentYearEnd = endOfYear(new Date(currentYear, 11, 31));

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
  const { createExpense, updateExpense, isCreating, isUpdating } = useExpenseSubmit();
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const isAutoSaveEnabled = true; // 設定で変更可能にする場合はstateに戻す

  // フォームデータの状態管理
  const [formData, setFormData] = useState<ExpenseFormData>({
    categoryId: expense?.categoryId || '',
    amount: expense?.amount || 0,
    description: expense?.description || '',
    receiptUrl: expense?.receiptUrl || undefined,
    receiptS3Key: expense?.receiptS3Key || undefined,
    expenseDate: expense?.expenseDate || format(new Date(), DATE_FORMAT),
  });

  // バリデーションエラーの状態管理
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 自動保存機能
  const {
    isDraftSaving,
    lastSavedAt,
    loadDraft,
    clearDraft,
  } = useAutoSave(formData, expense?.id, {
    enabled: isAutoSaveEnabled && mode === 'create',
    onSaveError: (error) => {
      console.error('自動保存エラー:', error);
    },
  });

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
        amount: expense.amount,
        description: expense.description,
        receiptUrl: expense.receiptUrl,
        receiptS3Key: expense.receiptS3Key,
        expenseDate: expense.expenseDate,
      });
    } else if (mode === 'create') {
      // 新規作成モードでドラフトがある場合は確認ダイアログを表示
      const draft = loadDraft();
      if (draft && draft.formData) {
        setShowDraftDialog(true);
      }
    }
  }, [expense, mode, loadDraft]);

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
      newErrors.push({ field: 'description', message: '内容を入力してください' });
    } else if (formData.description.length > VALIDATION_CONSTANTS.DESCRIPTION_MAX_LENGTH) {
      newErrors.push({ 
        field: 'description', 
        message: `内容は${VALIDATION_CONSTANTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください` 
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
      } else if (expenseDate < currentYearStart || expenseDate > currentYearEnd) {
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
  const handleReceiptChange = useCallback((url: string | null, s3Key: string | null) => {
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
        // 作成成功時はドラフトをクリア
        clearDraft();
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
    // 新規作成モードの場合はドラフトをクリア
    if (mode === 'create') {
      clearDraft();
    }
    
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // ドラフト復元ハンドラー
  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft && draft.formData) {
      setFormData(draft.formData);
      setShowDraftDialog(false);
    }
  };

  // ドラフト削除ハンドラー
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
  };

  // ローディング中の表示
  const isLoading = isCreating || isUpdating || isCategoriesLoading;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Paper sx={{ p: 3 }}>
        {/* 自動保存状態の表示 */}
        {mode === 'create' && isAutoSaveEnabled && lastSavedAt && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<SaveIcon />}
              label={`下書き保存済み (${formatDistanceToNow(lastSavedAt, { 
                addSuffix: true, 
                locale: jaLocale 
              })})`}
              size="small"
              color="success"
              variant="outlined"
            />
            {isDraftSaving && (
              <CircularProgress size={16} sx={{ ml: 1 }} />
            )}
          </Box>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* 申請日 */}
            <Grid item xs={12} sm={6}>
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
                maxDate={new Date() > currentYearEnd ? currentYearEnd : new Date()}
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
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="カテゴリ *"
                value={formData.categoryId}
                onChange={(e) => handleFieldChange('categoryId', e.target.value)}
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6} />

            {/* 内容 */}
            <Grid item xs={12}>
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
                    : `${formData.description.length}/${VALIDATION_CONSTANTS.DESCRIPTION_MAX_LENGTH}文字`
                }
                disabled={isLoading}
              />
            </Grid>

            {/* 領収書アップロード */}
            <Grid item xs={12}>
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
            {Object.keys(errors).length > 0 && touched.categoryId && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {EXPENSE_MESSAGES.VALIDATION_ERROR}
                </Alert>
              </Grid>
            )}

            {/* 期限切れ警告 */}
            {isExpired && (
              <Grid item xs={12}>
                <Alert severity="error" icon={<ErrorIcon />}>
                  申請期限を過ぎているため、この経費は申請できません。
                </Alert>
              </Grid>
            )}

            {/* アクションボタン */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || isExpired}
                  startIcon={isLoading && <CircularProgress size={20} />}
                >
                  {mode === 'create' ? '作成' : '更新'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
        
        {/* ドラフト復元ダイアログ */}
        <Dialog
          open={showDraftDialog}
          onClose={() => setShowDraftDialog(false)}
          aria-labelledby="draft-dialog-title"
          aria-describedby="draft-dialog-description"
        >
          <DialogTitle id="draft-dialog-title">
            保存された下書きがあります
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="draft-dialog-description">
              前回の入力内容が下書きとして保存されています。
              復元しますか？
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDiscardDraft} color="inherit">
              破棄する
            </Button>
            <Button onClick={handleRestoreDraft} variant="contained" autoFocus>
              復元する
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  );
};