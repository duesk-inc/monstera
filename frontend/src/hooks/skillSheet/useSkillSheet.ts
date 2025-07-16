import { useState, useEffect, useCallback } from 'react';
import { SkillSheet } from '@/types/skillSheet';
import { fetchSkillSheet } from '@/lib/api/skillSheet';
import { useAbortableEffect } from '@/hooks/common/useAbortableEffect';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';

/**
 * スキルシート情報を管理するカスタムフック
 */
export const useSkillSheet = () => {
  const [skillSheet, setSkillSheet] = useState<SkillSheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // スキルシート情報を取得する関数（内部用）
  const fetchSkillSheetData = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      DebugLogger.info(
        { category: 'Hooks', operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得開始' },
        'useSkillSheet - データ取得開始'
      );

      const data = await fetchSkillSheet(signal);
      setSkillSheet(data);

      DebugLogger.info(
        { category: 'Hooks', operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得完了' },
        `useSkillSheet - データ取得完了 - 職務経歴数: ${data.workHistories?.length || 0}`
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        DebugLogger.info(
          { category: 'Hooks', operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得中止' },
          'useSkillSheet - リクエストが中止されました'
        );
        return; // Abortエラーの場合はエラー状態を設定しない
      }

      const errorMessage = err.message || 'スキルシート情報の取得に失敗しました';
      setError(errorMessage);
      
      DebugLogger.apiError(
        { category: 'Hooks', operation: DEBUG_OPERATIONS.READ, description: 'スキルシート取得エラー' },
        { error: err, metadata: { errorMessage } }
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 外部から呼び出し可能なリフレッシュ関数
  const refreshSkillSheet = useCallback(() => {
    fetchSkillSheetData();
  }, [fetchSkillSheetData]);

  // 初回データ取得
  useAbortableEffect(
    (signal) => {
      fetchSkillSheetData(signal);
    },
    []
  );

  return {
    skillSheet,
    isLoading,
    error,
    refreshSkillSheet,
  };
};