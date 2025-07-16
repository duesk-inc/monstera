import { useState, useCallback } from 'react';
import { workHistoryApi, adminWorkHistoryApi } from '../../lib/api/workHistory';
import { useNotifications } from '../common/useNotifications';
import { useErrorHandler } from '../common/useErrorHandler';
import type { PDFExportParams } from '../../types/workHistory';

interface UseWorkHistoryPDFOptions {
  userId?: string; // 管理者が他のユーザーのPDFを取得する場合
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
}

interface UseWorkHistoryPDFReturn {
  downloadPDF: (params?: PDFExportParams) => Promise<void>;
  generatePDF: (params?: PDFExportParams) => Promise<string>;
  isDownloading: boolean;
  isGenerating: boolean;
  error: Error | null;
}

/**
 * 職務経歴PDF出力フック
 */
export const useWorkHistoryPDF = (
  options: UseWorkHistoryPDFOptions = {}
): UseWorkHistoryPDFReturn => {
  const { userId, onSuccess, onError } = options;
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showSuccess, showError: showToastError } = useNotifications();
  const { handleError } = useErrorHandler();

  /**
   * PDFをダウンロード
   */
  const downloadPDF = useCallback(async (params?: PDFExportParams) => {
    try {
      setIsDownloading(true);
      setError(null);

      // 管理者がエンジニアのPDFをダウンロードする場合
      const result = userId
        ? await adminWorkHistoryApi.downloadEngineerPDF(userId, params)
        : await workHistoryApi.downloadPDF(params);

      // Blobをダウンロード
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess(`${result.fileName} をダウンロードしました`);
      onSuccess?.(result.fileName);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('PDF出力に失敗しました');
      setError(errorObj);
      handleError(errorObj, 'PDF出力');
      showToastError('PDF出力に失敗しました');
      onError?.(errorObj);
    } finally {
      setIsDownloading(false);
    }
  }, [userId, showSuccess, showToastError, handleError, onSuccess, onError]);

  /**
   * PDF生成（URLを返す）
   * 注：現在のAPIは直接ダウンロードのため、この機能は将来の拡張用
   */
  const generatePDF = useCallback(async (): Promise<string> => {
    try {
      setIsGenerating(true);
      setError(null);

      // 将来的にPDF生成APIが実装された場合の処理
      // const result = await workHistoryApi.generatePDF({ ...params });
      // return result.url;

      // 現在は未実装のため、エラーをスロー
      throw new Error('PDF生成機能は現在準備中です');
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('PDF生成に失敗しました');
      setError(errorObj);
      handleError(errorObj, 'PDF生成');
      showToastError('PDF生成に失敗しました');
      onError?.(errorObj);
      throw errorObj;
    } finally {
      setIsGenerating(false);
    }
  }, [showToastError, handleError, onError]);

  return {
    downloadPDF,
    generatePDF,
    isDownloading,
    isGenerating,
    error,
  };
};

/**
 * PDF出力の状態を管理するフック
 */
export const usePDFExportState = () => {
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    fileName: string;
    exportedAt: Date;
    params?: PDFExportParams;
  }>>([]);

  const addExportHistory = useCallback((fileName: string, params?: PDFExportParams) => {
    const newEntry = {
      id: Date.now().toString(),
      fileName,
      exportedAt: new Date(),
      params,
    };
    setExportHistory(prev => [newEntry, ...prev].slice(0, 10)); // 最新10件を保持
  }, []);

  const clearExportHistory = useCallback(() => {
    setExportHistory([]);
  }, []);

  return {
    exportHistory,
    addExportHistory,
    clearExportHistory,
  };
};

/**
 * PDF出力パラメータのデフォルト値
 */
export const getDefaultPDFParams = (): PDFExportParams => ({
  includePersonalInfo: true,
  includeProjects: true,
  includeSkills: true,
  includeSummary: true,
  dateFormat: 'yyyy年MM月',
});

/**
 * PDF出力パラメータのバリデーション
 */
export const validatePDFParams = (params: PDFExportParams): string[] => {
  const errors: string[] = [];

  // 少なくとも1つの出力内容が選択されているか
  if (!params.includePersonalInfo && 
      !params.includeProjects && 
      !params.includeSkills && 
      !params.includeSummary) {
    errors.push('少なくとも1つの出力内容を選択してください');
  }

  // 期間指定のバリデーション
  if (params.startDate && params.endDate) {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    if (start > end) {
      errors.push('開始日は終了日より前の日付を指定してください');
    }
  }

  return errors;
};

/**
 * PDFファイル名の生成
 */
export const generatePDFFileName = (
  userName?: string,
  includeDate = true
): string => {
  const parts = ['職務経歴書'];
  
  if (userName) {
    parts.push(userName);
  }
  
  if (includeDate) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    parts.push(dateStr);
  }
  
  return `${parts.join('_')}.pdf`;
};