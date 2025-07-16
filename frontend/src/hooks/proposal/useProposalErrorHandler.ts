import { useCallback } from 'react';
import { useErrorHandler } from '../common/useErrorHandler';
import { useToast } from '../../components/common';
import { SUCCESS_MESSAGES } from '../../constants/errorMessages';

/**
 * 提案機能専用のエラーハンドリングフック
 * 提案機能特有のエラー処理とユーザーフィードバックを提供
 */
export const useProposalErrorHandler = () => {
  const { handleError, handleApiError, handleSubmissionError } = useErrorHandler();
  const { showSuccess } = useToast();

  // 提案操作のエラーハンドリング
  const handleProposalError = useCallback((error: unknown, action: string) => {
    handleApiError(error, `提案${action}`, {
      fallbackMessage: `提案の${action}に失敗しました。時間をおいて再度お試しください。`,
    });
  }, [handleApiError]);

  // 質問操作のエラーハンドリング
  const handleQuestionError = useCallback((error: unknown, action: string) => {
    handleApiError(error, `質問${action}`, {
      fallbackMessage: `質問の${action}に失敗しました。時間をおいて再度お試しください。`,
    });
  }, [handleApiError]);

  // 営業操作のエラーハンドリング
  const handleSalesError = useCallback((error: unknown, action: string) => {
    handleApiError(error, `営業${action}`, {
      fallbackMessage: `営業担当者の${action}に失敗しました。時間をおいて再度お試しください。`,
    });
  }, [handleApiError]);

  // 24時間制限エラーの専用ハンドリング
  const handleTimeRestrictedError = useCallback((error: unknown, operation: string) => {
    handleError(error, `${operation}の制限`, {
      severity: 'warning',
      fallbackMessage: `投稿から24時間が経過しているため、${operation}できません。`,
    });
  }, [handleError]);

  // 権限エラーの専用ハンドリング
  const handlePermissionError = useCallback((error: unknown, resource: string) => {
    handleError(error, `権限エラー`, {
      severity: 'warning',
      fallbackMessage: `${resource}にアクセスする権限がありません。`,
    });
  }, [handleError]);

  // 成功メッセージの表示
  const showProposalSuccess = useCallback((action: 'CREATED' | 'UPDATED' | 'STATUS_UPDATED' | 'DELETED') => {
    const messageKey = `PROPOSAL_${action}` as keyof typeof SUCCESS_MESSAGES;
    showSuccess(SUCCESS_MESSAGES[messageKey] || '操作が完了しました。');
  }, [showSuccess]);

  const showQuestionSuccess = useCallback((action: 'CREATED' | 'UPDATED' | 'DELETED' | 'RESPONDED') => {
    const messageKey = `QUESTION_${action}` as keyof typeof SUCCESS_MESSAGES;
    showSuccess(SUCCESS_MESSAGES[messageKey] || '操作が完了しました。');
  }, [showSuccess]);

  const showSalesSuccess = useCallback((action: 'ASSIGNMENT_UPDATED' | 'NOTIFICATION_SENT') => {
    const messageKey = `SALES_${action}` as keyof typeof SUCCESS_MESSAGES;
    showSuccess(SUCCESS_MESSAGES[messageKey] || '操作が完了しました。');
  }, [showSuccess]);

  // バリデーションエラーの専用ハンドリング
  const handleValidationError = useCallback((field: string, message?: string) => {
    handleError(message || `${field}の入力内容に問題があります。`, 'フォーム検証', {
      severity: 'warning',
      showToast: true,
    });
  }, [handleError]);

  // ネットワークエラーの専用ハンドリング
  const handleNetworkError = useCallback((operation: string) => {
    handleError(
      new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。'),
      `${operation}の通信`,
      {
        severity: 'error',
        showToast: true,
      }
    );
  }, [handleError]);

  // 提案ステータス更新の専用ハンドリング
  const handleStatusUpdateError = useCallback((error: unknown, status: 'proceed' | 'declined') => {
    const actionName = status === 'proceed' ? '選考進行' : '見送り';
    handleSubmissionError(error, actionName, {
      fallbackMessage: `提案の${actionName}処理に失敗しました。`,
    });
  }, [handleSubmissionError]);

  // 質問制限エラーの専用ハンドリング
  const handleQuestionLimitError = useCallback(() => {
    handleError(
      new Error('質問数の上限（10件）に達しています。'),
      '質問投稿制限',
      {
        severity: 'warning',
        showToast: true,
      }
    );
  }, [handleError]);

  return {
    // 基本エラーハンドリング
    handleProposalError,
    handleQuestionError,
    handleSalesError,
    
    // 特殊ケースのエラーハンドリング
    handleTimeRestrictedError,
    handlePermissionError,
    handleValidationError,
    handleNetworkError,
    handleStatusUpdateError,
    handleQuestionLimitError,
    
    // 成功メッセージ
    showProposalSuccess,
    showQuestionSuccess,
    showSalesSuccess,
    
    // 汎用エラーハンドリング（既存のフックから継承）
    handleError,
    handleApiError,
    handleSubmissionError,
  };
};

/**
 * 提案機能で使用する一般的なエラーケースの簡易ハンドラー
 */
export const useProposalQuickHandlers = () => {
  const {
    handleProposalError,
    handleQuestionError,
    showProposalSuccess,
    showQuestionSuccess,
    handleTimeRestrictedError,
    handlePermissionError,
  } = useProposalErrorHandler();

  return {
    // 提案操作の簡易ハンドラー
    onProposalCreateError: (error: unknown) => handleProposalError(error, '作成'),
    onProposalUpdateError: (error: unknown) => handleProposalError(error, '更新'),
    onProposalDeleteError: (error: unknown) => handleProposalError(error, '削除'),
    onProposalCreateSuccess: () => showProposalSuccess('CREATED'),
    onProposalUpdateSuccess: () => showProposalSuccess('UPDATED'),
    onProposalStatusUpdateSuccess: () => showProposalSuccess('STATUS_UPDATED'),
    
    // 質問操作の簡易ハンドラー
    onQuestionCreateError: (error: unknown) => handleQuestionError(error, '投稿'),
    onQuestionUpdateError: (error: unknown) => handleQuestionError(error, '更新'),
    onQuestionDeleteError: (error: unknown) => handleQuestionError(error, '削除'),
    onQuestionResponseError: (error: unknown) => handleQuestionError(error, '回答'),
    onQuestionCreateSuccess: () => showQuestionSuccess('CREATED'),
    onQuestionUpdateSuccess: () => showQuestionSuccess('UPDATED'),
    onQuestionDeleteSuccess: () => showQuestionSuccess('DELETED'),
    onQuestionResponseSuccess: () => showQuestionSuccess('RESPONDED'),
    
    // 制限エラーの簡易ハンドラー
    onTimeRestrictedError: (operation: string) => (error: unknown) => 
      handleTimeRestrictedError(error, operation),
    onPermissionError: (resource: string) => (error: unknown) => 
      handlePermissionError(error, resource),
  };
};

export type ProposalErrorHandler = ReturnType<typeof useProposalErrorHandler>;
export type ProposalQuickHandlers = ReturnType<typeof useProposalQuickHandlers>;