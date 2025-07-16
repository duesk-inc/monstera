import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { authHandlers } from './mocks/auth-handlers';

// MSWサーバーをセットアップ
export const server = setupServer(...authHandlers);

// テスト開始前にサーバーを起動
beforeAll(() => {
  server.listen({
    // 未処理のリクエストに対して警告を表示
    onUnhandledRequest: 'warn',
  });
});

// 各テスト後にハンドラーをリセット
afterEach(() => {
  server.resetHandlers();
});

// テスト終了後にサーバーを停止
afterAll(() => {
  server.close();
});

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// グローバルにlocalStorageをモックとして設定
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// console.errorをモックしてテスト中のエラーログを抑制
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Cognitoクライアントのモック
const mockCognitoClient = {
  initiateAuth: jest.fn(),
  adminCreateUser: jest.fn(),
  adminSetUserPassword: jest.fn(),
  getUser: jest.fn(),
  adminDeleteUser: jest.fn(),
};

// AWS SDKのモック
jest.mock('aws-sdk', () => ({
  CognitoIdentityServiceProvider: jest.fn(() => mockCognitoClient),
  config: {
    update: jest.fn(),
  },
}));

// Next.jsのルーターのモック
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    pathname: '/test',
    query: {},
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// グローバルにモッククライアントを公開
global.mockCognitoClient = mockCognitoClient;

// テスト用ヘルパー関数
global.testHelpers = {
  resetAllMocks: () => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    Object.values(mockCognitoClient).forEach(mock => mock.mockClear());
  },
};
