import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheUtils } from '@/lib/query-client';
import { QUERY_KEYS, CACHE_STRATEGIES } from '@/constants/cache';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api';

/**
 * 重要なデータを事前にキャッシュするフック
 */
export const useCachePreloader = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // マスターデータをプリロード
  const preloadMasterData = useCallback(async () => {
    if (!user) return;

    try {
      // 部署情報をプリロード
      await cacheUtils.prefetchQuery(
        [...QUERY_KEYS.DEPARTMENTS],
        async () => {
          const response = await apiClient.get('/departments');
          return response.data;
        },
        CACHE_STRATEGIES.MASTER_DATA
      );

      // 役職情報をプリロード
      await cacheUtils.prefetchQuery(
        [...QUERY_KEYS.ROLES],
        async () => {
          const response = await apiClient.get('/roles');
          return response.data;
        },
        CACHE_STRATEGIES.MASTER_DATA
      );

      // 祝日情報をプリロード（現在年と来年）
      const currentYear = new Date().getFullYear();
      await cacheUtils.prefetchQuery(
        [...QUERY_KEYS.HOLIDAYS, currentYear],
        async () => {
          const response = await apiClient.get(`/api/v1/holidays?year=${currentYear}`);
          return response.data;
        },
        CACHE_STRATEGIES.STATIC_DATA
      );

      console.log('Master data preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload master data:', error);
    }
  }, [user]);

  // ユーザー関連データをプリロード
  const preloadUserData = useCallback(async () => {
    if (!user) return;

    try {
      // ユーザープロフィールをプリロード
      await cacheUtils.prefetchQuery(
        [...QUERY_KEYS.USER_PROFILE, user.id],
        async () => {
          const response = await apiClient.get(`/api/v1/users/${user.id}/profile`);
          return response.data;
        },
        CACHE_STRATEGIES.USER_PROFILE
      );

      // 管理者の場合、アラート設定をプリロード
      if (user.role === 'admin' || user.role === 'manager') {
        await cacheUtils.prefetchQuery(
          [...QUERY_KEYS.ALERT_SETTINGS],
          async () => {
            const response = await apiClient.get('/admin/alert-settings');
            return response.data;
          },
          CACHE_STRATEGIES.ALERT_SETTINGS
        );
      }

      console.log('User data preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload user data:', error);
    }
  }, [user]);

  // 初回ログイン時のプリロード
  useEffect(() => {
    if (user) {
      // 少し遅延を入れて、メインコンテンツの読み込みを優先
      const timer = setTimeout(() => {
        preloadMasterData();
        preloadUserData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, preloadMasterData, preloadUserData]);

  // ページ遷移時のプリロード（今後実装予定）
  const preloadPageData = useCallback(async (route: string) => {
    if (!user) return;

    try {
      switch (route) {
        case '/admin/weekly-reports':
          // 週報管理画面のデータをプリロード
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          
          await cacheUtils.prefetchQuery(
            [...QUERY_KEYS.MONTHLY_SUMMARY, currentYear, currentMonth],
            async () => {
              const response = await apiClient.get(
                `/api/v1/admin/weekly-reports/monthly-summary?year=${currentYear}&month=${currentMonth}`
              );
              return response.data;
            },
            CACHE_STRATEGIES.MONTHLY_SUMMARY
          );
          break;

        case '/weekly-reports':
          // 一般ユーザーの週報画面のデータをプリロード
          // 必要に応じて実装
          break;

        default:
          // 特別な処理なし
          break;
      }
    } catch (error) {
      console.warn(`Failed to preload data for route ${route}:`, error);
    }
  }, [user]);

  // キャッシュクリーンアップ（ログアウト時など）
  const clearUserCache = useCallback(() => {
    // ユーザー固有のキャッシュを削除
    cacheUtils.removeQueries(QUERY_KEYS.USER_PROFILE);
    cacheUtils.removeQueries(QUERY_KEYS.NOTIFICATIONS);
    cacheUtils.removeQueries(QUERY_KEYS.WEEKLY_REPORTS);
    cacheUtils.removeQueries(QUERY_KEYS.MONTHLY_SUMMARY);
    
    console.log('User cache cleared');
  }, []);

  // 戦略的なキャッシュ無効化
  const invalidateRelatedCache = useCallback((context: 'weekly-report-update' | 'user-profile-update' | 'alert-settings-update') => {
    switch (context) {
      case 'weekly-report-update':
        // 週報関連のキャッシュを無効化
        cacheUtils.invalidateQueries(QUERY_KEYS.WEEKLY_REPORTS);
        cacheUtils.invalidateQueries(QUERY_KEYS.MONTHLY_SUMMARY);
        break;

      case 'user-profile-update':
        // ユーザー関連のキャッシュを無効化
        cacheUtils.invalidateQueries(QUERY_KEYS.USER_PROFILE);
        break;

      case 'alert-settings-update':
        // アラート関連のキャッシュを無効化
        cacheUtils.invalidateQueries(QUERY_KEYS.ALERT_SETTINGS);
        break;
    }
  }, []);

  // 低優先度バックグラウンドプリロード
  const backgroundPreload = useCallback(async () => {
    if (!user) return;

    // アイドル時間を利用したプリロード
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(async () => {
        try {
          // 来月のデータをプリロード
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          await cacheUtils.prefetchQuery(
            [...QUERY_KEYS.MONTHLY_SUMMARY, nextMonth.getFullYear(), nextMonth.getMonth() + 1],
            async () => {
              const response = await apiClient.get(
                `/api/v1/admin/weekly-reports/monthly-summary?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth() + 1}`
              );
              return response.data;
            },
            CACHE_STRATEGIES.MONTHLY_SUMMARY
          );

          console.log('Background preload completed');
        } catch (error) {
          // バックグラウンドプリロードのエラーは無視
        }
      });
    }
  }, [user]);

  return {
    preloadMasterData,
    preloadUserData,
    preloadPageData,
    clearUserCache,
    invalidateRelatedCache,
    backgroundPreload,
  };
};