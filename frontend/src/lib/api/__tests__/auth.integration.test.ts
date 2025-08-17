/**
 * 認証フローの統合テスト
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { 
  createPresetApiClient,
  unifiedApiFactory,
  clearApiCache,
} from '@/lib/api/factory';
import { globalApiErrorHandler } from '@/lib/api/error/handler';
import { ApiErrorCode } from '@/lib/api/types/error';

// Axiosモックアダプターの設定
let mockAxios: MockAdapter;

beforeEach(() => {
  // キャッシュをクリア
  clearApiCache();
  // エラーハンドラーの状態をリセット
  globalApiErrorHandler.clearErrorTracking();
});

afterEach(() => {
  // モックをリセット
  if (mockAxios) {
    mockAxios.restore();
  }
});

describe('認証フロー統合テスト', () => {
  describe('ログインフロー', () => {
    it('正常なログインリクエストを処理する', async () => {
      // 認証クライアントを作成
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      // モックレスポンスを設定
      const mockLoginResponse = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'Employee',
        },
        token: 'jwt-token-123',
      };

      mockAxios.onPost('/auth/login').reply(200, mockLoginResponse);

      // ログインリクエストを実行
      const response = await authClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockLoginResponse);
    });

    it('無効な認証情報でエラーを返す', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      // エラーレスポンスを設定
      mockAxios.onPost('/auth/login').reply(401, {
        error: {
          code: ApiErrorCode.UNAUTHORIZED,
          message: '認証に失敗しました。メールアドレスまたはパスワードが正しくありません。',
        },
      });

      try {
        await authClient.post('/auth/login', {
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });
        fail('エラーが発生するはずです');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.code).toBe(ApiErrorCode.UNAUTHORIZED);
      }
    });

    it('レート制限エラーを処理する', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      mockAxios.onPost('/auth/login').reply(429, {
        error: {
          code: ApiErrorCode.RATE_LIMIT_ERROR,
          message: 'ログイン試行回数が上限に達しました。しばらく時間をおいてからお試しください。',
          details: {
            retryAfter: 300, // 5分
          },
        },
      });

      try {
        await authClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'password',
        });
        fail('エラーが発生するはずです');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.data.error.code).toBe(ApiErrorCode.RATE_LIMIT_ERROR);
        expect(error.response.data.error.details.retryAfter).toBe(300);
      }
    });
  });

  describe('トークンリフレッシュ', () => {
    it('期限切れトークンを自動的にリフレッシュする', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      let requestCount = 0;
      
      // 最初のリクエストは401を返す
      mockAxios.onGet('/api/v1/user/profile').reply(() => {
        requestCount++;
        if (requestCount === 1) {
          return [401, {
            error: {
              code: ApiErrorCode.TOKEN_EXPIRED,
              message: 'トークンの有効期限が切れています',
            },
          }];
        }
        // リフレッシュ後のリクエストは成功
        return [200, {
          id: 'user123',
          name: 'Test User',
        }];
      });

      // トークンリフレッシュエンドポイント
      mockAxios.onPost('/auth/refresh').reply(200, {
        token: 'new-jwt-token',
      });

      // プロファイル取得リクエスト
      const response = await authClient.get('/api/v1/user/profile');
      
      expect(response.status).toBe(200);
      expect(response.data.id).toBe('user123');
      expect(requestCount).toBe(2); // リトライされている
    });

    it('リフレッシュトークンも無効な場合はログアウトする', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      // プロファイルリクエストは401
      mockAxios.onGet('/api/v1/user/profile').reply(401, {
        error: {
          code: ApiErrorCode.TOKEN_EXPIRED,
          message: 'トークンの有効期限が切れています',
        },
      });

      // リフレッシュも失敗
      mockAxios.onPost('/auth/refresh').reply(401, {
        error: {
          code: ApiErrorCode.REFRESH_TOKEN_EXPIRED,
          message: 'リフレッシュトークンの有効期限が切れています',
        },
      });

      try {
        await authClient.get('/api/v1/user/profile');
        fail('エラーが発生するはずです');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.code).toBe(ApiErrorCode.REFRESH_TOKEN_EXPIRED);
      }
    });
  });

  describe('並列リクエスト処理', () => {
    it('複数の認証済みリクエストを並列で処理する', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      // 複数のエンドポイントをモック
      mockAxios.onGet('/api/v1/user/profile').reply(200, { id: 'user123' });
      mockAxios.onGet('/api/v1/user/settings').reply(200, { theme: 'dark' });
      mockAxios.onGet('/api/v1/user/notifications').reply(200, { count: 5 });

      // 並列リクエスト
      const [profile, settings, notifications] = await Promise.all([
        authClient.get('/api/v1/user/profile'),
        authClient.get('/api/v1/user/settings'),
        authClient.get('/api/v1/user/notifications'),
      ]);

      expect(profile.data.id).toBe('user123');
      expect(settings.data.theme).toBe('dark');
      expect(notifications.data.count).toBe(5);
    });

    it('並列リクエスト中の一部が失敗した場合を処理する', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      mockAxios.onGet('/api/v1/user/profile').reply(200, { id: 'user123' });
      mockAxios.onGet('/api/v1/user/settings').reply(500, {
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'サーバーエラーが発生しました',
        },
      });
      mockAxios.onGet('/api/v1/user/notifications').reply(200, { count: 5 });

      const results = await Promise.allSettled([
        authClient.get('/api/v1/user/profile'),
        authClient.get('/api/v1/user/settings'),
        authClient.get('/api/v1/user/notifications'),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      
      if (results[1].status === 'rejected') {
        expect(results[1].reason.response.status).toBe(500);
      }
    });
  });

  describe('セッション管理', () => {
    it('セッションタイムアウトを検出する', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      mockAxios.onGet('/api/v1/user/profile').reply(440, {
        error: {
          code: ApiErrorCode.SESSION_EXPIRED,
          message: 'セッションの有効期限が切れました',
        },
      });

      try {
        await authClient.get('/api/v1/user/profile');
        fail('エラーが発生するはずです');
      } catch (error: any) {
        expect(error.response.status).toBe(440);
        expect(error.response.data.error.code).toBe(ApiErrorCode.SESSION_EXPIRED);
      }
    });

    it('アクティブなセッションを維持する', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      // ハートビートエンドポイント
      mockAxios.onPost('/auth/heartbeat').reply(200, {
        sessionId: 'session123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const response = await authClient.post('/auth/heartbeat');
      
      expect(response.status).toBe(200);
      expect(response.data.sessionId).toBe('session123');
    });
  });

  describe('ロールベースアクセス制御', () => {
    it('権限不足エラーを処理する', async () => {
      const adminClient = createPresetApiClient('admin');
      mockAxios = new MockAdapter(adminClient);

      mockAxios.onGet('/api/v1/admin/users').reply(403, {
        error: {
          code: ApiErrorCode.FORBIDDEN,
          message: 'この操作を実行する権限がありません',
          details: {
            requiredRole: 'Admin',
            currentRole: 'Employee',
          },
        },
      });

      try {
        await adminClient.get('/api/v1/admin/users');
        fail('エラーが発生するはずです');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error.code).toBe(ApiErrorCode.FORBIDDEN);
        expect(error.response.data.error.details.requiredRole).toBe('Admin');
      }
    });

    it('管理者権限でアクセスできる', async () => {
      const adminClient = createPresetApiClient('admin');
      mockAxios = new MockAdapter(adminClient);

      mockAxios.onGet('/api/v1/admin/users').reply(200, {
        users: [
          { id: 'user1', name: 'User 1', role: 'Employee' },
          { id: 'user2', name: 'User 2', role: 'Admin' },
        ],
        total: 2,
      });

      const response = await adminClient.get('/api/v1/admin/users');
      
      expect(response.status).toBe(200);
      expect(response.data.users).toHaveLength(2);
    });
  });

  describe('エラーハンドリング統合', () => {
    it('グローバルエラーハンドラーがエラーを追跡する', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      // 複数のエラーを発生させる
      mockAxios.onGet('/api/v1/test1').reply(400, {
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Validation error',
        },
      });
      mockAxios.onGet('/api/v1/test2').reply(500, {
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Server error',
        },
      });

      // エラーを発生させる
      try {
        await authClient.get('/api/v1/test1');
      } catch (error) {
        // エラーをハンドラーで処理
        globalApiErrorHandler.handleError(error);
      }

      try {
        await authClient.get('/api/v1/test2');
      } catch (error) {
        // エラーをハンドラーで処理
        globalApiErrorHandler.handleError(error);
      }

      // エラー追跡を確認
      const tracking = globalApiErrorHandler.getErrorTracking();
      expect(tracking.size).toBe(2);
      expect(tracking.has(ApiErrorCode.VALIDATION_ERROR)).toBe(true);
      expect(tracking.has(ApiErrorCode.INTERNAL_SERVER_ERROR)).toBe(true);
    });

    it('エラーリスナーが通知を受け取る', async () => {
      const authClient = createPresetApiClient('auth');
      mockAxios = new MockAdapter(authClient);

      const errorListener = jest.fn();
      const unsubscribe = globalApiErrorHandler.addErrorListener(errorListener);

      mockAxios.onGet('/api/v1/test').reply(404, {
        error: {
          code: ApiErrorCode.NOT_FOUND,
          message: 'リソースが見つかりません',
        },
      });

      try {
        await authClient.get('/api/v1/test');
      } catch (error) {
        globalApiErrorHandler.handleError(error);
      }

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ApiErrorCode.NOT_FOUND,
          }),
        })
      );

      unsubscribe();
    });
  });

  describe('キャッシュとの統合', () => {
    it('認証クライアントがキャッシュされる', () => {
      const client1 = createPresetApiClient('auth');
      const client2 = createPresetApiClient('auth');
      
      // 同じプリセットなら同じインスタンスが返される
      expect(client1).toBe(client2);
      
      // キャッシュ統計を確認
      const stats = unifiedApiFactory.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('異なるトークンで異なるクライアントが作成される', () => {
      const client1 = unifiedApiFactory.createAuthenticatedClient('token1');
      const client2 = unifiedApiFactory.createAuthenticatedClient('token2');
      
      expect(client1).not.toBe(client2);
    });

    it('キャッシュクリア後は新しいインスタンスが作成される', () => {
      const client1 = createPresetApiClient('auth');
      clearApiCache();
      const client2 = createPresetApiClient('auth');
      
      expect(client1).not.toBe(client2);
    });
  });
});