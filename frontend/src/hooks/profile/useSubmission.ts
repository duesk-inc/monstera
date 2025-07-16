import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProfileFormData } from '@/types/profile';
import { updateProfile, tempSaveProfile } from '@/lib/api/profile';
import { useDataConversion } from './useDataConversion';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { SUCCESS_MESSAGES } from '@/constants/errorMessages';

interface UseSubmissionProps {
  formMethods: UseFormReturn<ProfileFormData>;
  setIsSubmitting: (value: boolean) => void;
  setIsTempSaved: (value: boolean) => void;
  setTempSavedAt: (value: string | null) => void;
  setTempSaveNotified: (value: boolean) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface UseSubmissionReturn {
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  handleTempSave: () => Promise<void>;
}

/**
 * API送信処理専用フック
 * フォーム送信と一時保存のAPIコミュニケーションを管理
 */
export const useSubmission = ({
  formMethods,
  setIsSubmitting,
  setIsTempSaved,
  setTempSavedAt,
  setTempSaveNotified,
  onSuccess,
  onError,
}: UseSubmissionProps): UseSubmissionReturn => {
  
  const { prepareFormDataForSubmission } = useDataConversion();
  const { handleSubmissionError } = useErrorHandler();

  // 一時保存機能（バリデーションありで保存）
  const handleTempSave = useCallback(async () => {
    try {
      setIsSubmitting(true);
      // React Hook Formのバリデーションを実行
      await formMethods.handleSubmit(async (data) => {
        const dataToSave = prepareFormDataForSubmission(data);
        
        await tempSaveProfile(dataToSave);
        
        // 一時保存状態を更新
        setIsTempSaved(true);
        const now = new Date().toISOString();
        setTempSavedAt(now);
        
        onSuccess(SUCCESS_MESSAGES.PROFILE_TEMP_SAVED);
        
        // 通知済みフラグをリセット（次回も表示できるように）
        setTempSaveNotified(false);
        
        // フォームの変更フラグをリセット
        formMethods.reset(dataToSave);
      })();
    } catch (error) {
      handleSubmissionError(error, 'プロフィール一時保存', {
        showToast: true // Toast通知を有効化
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formMethods, 
    prepareFormDataForSubmission, 
    setIsSubmitting, 
    setIsTempSaved, 
    setTempSavedAt, 
    setTempSaveNotified, 
    onSuccess, 
    onError,
    handleSubmissionError
  ]);

  // フォーム送信処理
  const handleSubmit = useCallback(async (e?: React.BaseSyntheticEvent) => {
    try {
      setIsSubmitting(true);
      await formMethods.handleSubmit(async (data) => {
        const dataToSave = prepareFormDataForSubmission(data);
        
        await updateProfile(dataToSave);
        
        // 一時保存状態をリセット
        setIsTempSaved(false);
        setTempSavedAt(null);
        
        onSuccess(SUCCESS_MESSAGES.PROFILE_UPDATED);
        
        // 通知済みフラグをリセット（次回も表示できるように）
        setTempSaveNotified(false);
        
        // フォームの変更フラグをリセット
        formMethods.reset(dataToSave);
      })(e);
    } catch (error) {
      handleSubmissionError(error, 'プロフィール更新', {
        showToast: true // Toast通知を有効化
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formMethods, 
    prepareFormDataForSubmission, 
    setIsSubmitting, 
    setIsTempSaved, 
    setTempSavedAt, 
    setTempSaveNotified, 
    onSuccess, 
    onError,
    handleSubmissionError
  ]);

  return {
    handleSubmit,
    handleTempSave,
  };
};