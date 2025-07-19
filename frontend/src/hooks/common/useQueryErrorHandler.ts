import { useQueryClient, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { ApiError } from '@/lib/api/admin';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { queryRetryConfig } from '@/lib/api/retry-config';

// React Queryのグローバルエラーハンドラー設定用フック
export const useQueryErrorHandler = () => {
  const { showToast } = useToast();
  const router = useRouter();
  const { logout } = useAuth();

  const handleQueryError = (error: unknown) => {
    if (error instanceof ApiError) {
      // 認証エラーの場合
      if (error.status === 401) {
        logout();
        showToast('セッションが切れました。再度ログインしてください。', 'warning');
        return;
      }

      // 権限エラーの場合
      if (error.status === 403) {
        showToast('この操作を行う権限がありません。', 'error');
        return;
      }

      // バリデーションエラーの場合
      if (error.status === 422) {
        showToast(error.message || '入力内容に誤りがあります。', 'error');
        return;
      }

      // サーバーエラーの場合
      if (error.status >= 500) {
        showToast('サーバーエラーが発生しました。しばらく経ってから再度お試しください。', 'error');
        return;
      }

      // その他のAPIエラー
      showToast(error.message || 'エラーが発生しました。', 'error');
    } else if (error instanceof Error) {
      // ネットワークエラーなど
      if (error.message.includes('Network')) {
        showToast('ネットワークエラーが発生しました。接続を確認してください。', 'error');
      } else {
        showToast('予期しないエラーが発生しました。', 'error');
      }
    }
  };

  return { handleQueryError };
};

// React Query クライアント設定（キャッシュ設定含む）
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5分
        ...queryRetryConfig,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        // クエリエラーのグローバルハンドリング
        console.error('Query error:', error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        // ミューテーションエラーのグローバルハンドリング
        console.error('Mutation error:', error);
      },
    }),
  });

  return queryClient;
};