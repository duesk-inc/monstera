import { useState, useCallback, useEffect } from 'react';
import { UserProfile } from '@/types/profile';
import { useDataConversion } from './useDataConversion';
import { SUCCESS_MESSAGE_TEMPLATES } from '@/constants/errorMessages';

interface SubmitResult {
  open: boolean;
  message: string;
  success: boolean;
}

interface UseNotificationStateReturn {
  submitResult: SubmitResult;
  resetSnackbar: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

/**
 * 通知状態管理専用フック
 * トースト通知とアラートメッセージの表示を管理
 */
export const useNotificationState = (
  profile: UserProfile | null,
  tempSaveNotified: boolean,
  setTempSaveNotified: (value: boolean) => void
): UseNotificationStateReturn => {
  
  const { formatTempSaveDate } = useDataConversion();
  
  // フォーム送信結果の状態
  const [submitResult, setSubmitResult] = useState<SubmitResult>({
    open: false,
    message: '',
    success: false,
  });

  // 一時保存データのメッセージ表示
  useEffect(() => {
    if (profile?.isTempSaved && profile.tempSavedAt && !tempSaveNotified) {
      const formattedDate = formatTempSaveDate(profile.tempSavedAt);
      const message = SUCCESS_MESSAGE_TEMPLATES.TEMP_DATA_LOADED({ formattedDate });
      
      setSubmitResult({
        open: true,
        message,
        success: true,
      });
      
      setTempSaveNotified(true);
    }
  }, [profile, tempSaveNotified, setTempSaveNotified, formatTempSaveDate]);

  // スナックバーのリセット
  const resetSnackbar = useCallback(() => {
    setSubmitResult(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  // 成功メッセージの表示
  const showSuccess = useCallback((message: string) => {
    setSubmitResult({
      open: true,
      message,
      success: true,
    });
  }, []);

  // エラーメッセージの表示
  const showError = useCallback((message: string) => {
    setSubmitResult({
      open: true,
      message,
      success: false,
    });
  }, []);

  return {
    submitResult,
    resetSnackbar,
    showSuccess,
    showError,
  };
};