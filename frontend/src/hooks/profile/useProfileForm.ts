import { ProfileFormData, UserProfile, WorkHistory } from '@/types/profile';
import { useFormState } from './useFormState';
import { useNotificationState } from './useNotificationState';
import { useSubmission } from './useSubmission';

interface SubmitResult {
  open: boolean;
  message: string;
  success: boolean;
}

interface UseProfileFormReturn {
  formMethods: ReturnType<typeof import('react-hook-form').useForm<ProfileFormData>>;
  isSubmitting: boolean;
  submitResult: SubmitResult;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  handleTempSave: () => Promise<void>;
  resetSnackbar: () => void;
  isTempSaved: boolean;
  tempSavedAt: string | null;
}

/**
 * プロフィールフォームの統合管理フック
 * 複数の専用フックを組み合わせて、フォーム全体の状態を管理
 */
export const useProfileForm = (profile: UserProfile | null, workHistories?: WorkHistory[]): UseProfileFormReturn => {
  // フォーム状態管理
  const {
    formMethods,
    isSubmitting,
    setIsSubmitting,
    isTempSaved,
    setIsTempSaved,
    tempSavedAt,
    setTempSavedAt,
    tempSaveNotified,
    setTempSaveNotified,
  } = useFormState(profile, workHistories);

  // 通知状態管理
  const {
    submitResult,
    resetSnackbar,
    showSuccess,
    showError,
  } = useNotificationState(profile, tempSaveNotified, setTempSaveNotified);

  // API送信処理
  const { handleSubmit, handleTempSave } = useSubmission({
    formMethods,
    setIsSubmitting,
    setIsTempSaved,
    setTempSavedAt,
    setTempSaveNotified,
    onSuccess: showSuccess,
    onError: showError,
  });

  return {
    formMethods,
    isSubmitting: isSubmitting || formMethods.formState.isSubmitting,
    submitResult,
    handleSubmit,
    handleTempSave,
    resetSnackbar,
    isTempSaved,
    tempSavedAt
  };
}; 