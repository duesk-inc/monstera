import { useState, useCallback } from 'react';
import { UserProfile, WorkHistory } from '@/types/profile';
import { fetchProfile, fetchProfileWithWorkHistory } from '@/lib/api/profile';
import { useAbortableEffect } from '@/hooks/common/useAbortableEffect';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { isAbortError } from '@/lib/api/error';

interface UseProfileReturn {
  profile: UserProfile | null;
  workHistories: WorkHistory[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchProfileWithHistory: () => Promise<void>;
}

/**
 * プロフィール情報を取得するフック
 * 統一エラーハンドリング対応
 */
export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workHistories, setWorkHistories] = useState<WorkHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { handleApiError } = useErrorHandler();

  // プロフィール情報を取得
  const getProfile = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchProfile(signal);
      // 資格情報を取得年月の昇順でソート
      if (data.certifications) {
        data.certifications.sort((a, b) => {
          const dateA = new Date(a.acquiredDate + '-01');
          const dateB = new Date(b.acquiredDate + '-01');
          return dateA.getTime() - dateB.getTime();
        });
      }
      setProfile(data);
    } catch (err) {
      // Abortエラーの場合は静かに処理
      if (isAbortError(err)) {
        return;
      }
      
      handleApiError(err, 'プロフィール情報', {
        onError: (error) => setError(error.message),
        showToast: false // エラー状態はUIで表示するのでトーストは無効化
      });
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  // プロフィール情報と職務経歴を取得
  const getProfileWithHistory = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchProfileWithWorkHistory(signal);
      // 資格情報を取得年月の昇順でソート
      if (data.profile.certifications) {
        data.profile.certifications.sort((a, b) => {
          const dateA = new Date(a.acquiredDate + '-01');
          const dateB = new Date(b.acquiredDate + '-01');
          return dateA.getTime() - dateB.getTime();
        });
      }
      setProfile(data.profile);
      setWorkHistories(data.workHistories);
    } catch (err) {
      // Abortエラーの場合は静かに処理
      if (isAbortError(err)) {
        return;
      }
      
      handleApiError(err, 'プロフィール情報と職務経歴', {
        onError: (error) => setError(error.message),
        showToast: false // エラー状態はUIで表示するのでトーストは無効化
      });
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  // 初回マウント時のみプロフィール情報を取得
  useAbortableEffect(async (signal) => {
    await getProfile(signal);
  }, [getProfile], {
    retryCount: 3,
    retryDelay: 1000,
  });

  // リトライ用の明示的なrefetch関数
  const refetch = useCallback(async () => {
    await getProfile();
  }, [getProfile]);

  return {
    profile,
    workHistories,
    isLoading,
    error,
    refetch,
    fetchProfileWithHistory: () => getProfileWithHistory(),
  };
}; 