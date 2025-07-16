/**
 * 提案機能専用の簡略化エラーハンドリングフック
 * 既存コンポーネントに最小限の変更で統合するためのヘルパー
 */

import { useCallback } from 'react';
import { useToast } from '../../components/common';
import { handleApiError } from '../../lib/api/error';
import { SUCCESS_MESSAGES } from '../../constants/errorMessages';

export const useProposalErrorHandling = () => {
  const { showSuccess, showError } = useToast();

  // APIエラーを適切に処理してToast表示
  const processApiError = useCallback((error: unknown, operation: string) => {
    const processedError = handleApiError(error, operation);
    showError(processedError.message);
  }, [showError]);

  // 成功時のToast表示
  const showSuccessMessage = useCallback((messageKey: keyof typeof SUCCESS_MESSAGES) => {
    showSuccess(SUCCESS_MESSAGES[messageKey] || '操作が完了しました。');
  }, [showSuccess]);

  // 質問関連の操作用ヘルパー
  const questionHandlers = {
    onCreateSuccess: () => showSuccessMessage('QUESTION_CREATED'),
    onUpdateSuccess: () => showSuccessMessage('QUESTION_UPDATED'),
    onDeleteSuccess: () => showSuccessMessage('QUESTION_DELETED'),
    onResponseSuccess: () => showSuccessMessage('QUESTION_RESPONDED'),
    onCreateError: (error: unknown) => processApiError(error, '質問投稿'),
    onUpdateError: (error: unknown) => processApiError(error, '質問更新'),
    onDeleteError: (error: unknown) => processApiError(error, '質問削除'),
    onResponseError: (error: unknown) => processApiError(error, '質問回答'),
  };

  // 提案関連の操作用ヘルパー
  const proposalHandlers = {
    onStatusUpdateSuccess: () => showSuccessMessage('PROPOSAL_STATUS_UPDATED'),
    onStatusUpdateError: (error: unknown) => processApiError(error, '提案ステータス更新'),
  };

  // 24時間制限エラーの特別処理
  const handleTimeRestrictionError = useCallback(() => {
    showError('投稿から24時間が経過しているため、編集・削除できません。');
  }, [showError]);

  // 権限エラーの特別処理
  const handlePermissionError = useCallback(() => {
    showError('この操作を実行する権限がありません。');
  }, [showError]);

  return {
    processApiError,
    showSuccessMessage,
    questionHandlers,
    proposalHandlers,
    handleTimeRestrictionError,
    handlePermissionError,
  };
};

/**
 * エラーコードから特定のエラータイプかどうかを判定
 */
interface EnhancedError {
  code?: string;
}

interface ErrorWithEnhanced {
  enhanced?: EnhancedError;
}

export const isSpecificError = {
  timeRestriction: (error: unknown): boolean => {
    if (error && typeof error === 'object' && 'enhanced' in error) {
      const enhanced = (error as ErrorWithEnhanced).enhanced;
      return enhanced?.code === 'P003B003'; // 質問編集期限切れ
    }
    return false;
  },
  
  permission: (error: unknown): boolean => {
    if (error && typeof error === 'object' && 'enhanced' in error) {
      const enhanced = (error as ErrorWithEnhanced).enhanced;
      return enhanced?.code?.startsWith('P008A'); // 権限関連エラー
    }
    return false;
  },
  
  questionLimit: (error: unknown): boolean => {
    if (error && typeof error === 'object' && 'enhanced' in error) {
      const enhanced = (error as ErrorWithEnhanced).enhanced;
      return enhanced?.code === 'P003R003'; // 質問数上限エラー
    }
    return false;
  },
};