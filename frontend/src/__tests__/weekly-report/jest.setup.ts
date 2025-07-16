// 週報機能テスト専用のセットアップファイル
import '@testing-library/jest-dom';
import { setupCustomMatchers } from './utils/testHelpers';
import { resetApiMocks } from './utils/apiMocks';

// カスタムマッチャーの設定
setupCustomMatchers();

// APIモックの設定
jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

beforeAll(() => {
  // テスト開始前の設定
});

afterEach(() => {
  // 各テスト後にモックをリセット
  resetApiMocks();
  
  // モックをクリア
  jest.clearAllMocks();
  
  // LocalStorageをクリア
  localStorage.clear();
  
  // タイマーをリセット
  jest.clearAllTimers();
  jest.useRealTimers();
});

afterAll(() => {
  // 全テスト終了後のクリーンアップ
});

// グローバルなテスト設定
global.testConfig = {
  // タイムアウト設定
  asyncTimeout: 10000,
  
  // デフォルトのテストユーザー
  defaultUser: {
    id: 'test-user-123',
    name: 'テストユーザー',
    email: 'test@duesk.co.jp',
    role: 4,
  },
  
  // テスト環境の日付（固定）
  testDate: new Date('2024-01-01T00:00:00.000Z'),
};

// console.errorのモック（エラーログを抑制）
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn((...args) => {
    // React関連の警告は無視
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: An invalid form control') ||
       args[0].includes('Warning: Failed prop type'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
});

// window.scrollToのモック
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// IntersectionObserverのモック
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// ResizeObserverのモック
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// window.matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// MutationObserverのモック
global.MutationObserver = class MutationObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
} as any;

// URLのモック（Node.js環境用）
if (!global.URL) {
  global.URL = URL;
}

// Blobのモック
if (!global.Blob) {
  global.Blob = class Blob {
    constructor(public parts: any[], public options: any = {}) {}
  } as any;
}

// FileReaderのモック
global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: any = null;
  readyState: number = 0;
  
  onabort: any = null;
  onerror: any = null;
  onload: any = null;
  onloadend: any = null;
  onloadstart: any = null;
  onprogress: any = null;
  
  abort() {}
  readAsArrayBuffer() {}
  readAsBinaryString() {}
  readAsDataURL() {
    this.result = 'data:text/plain;base64,';
    if (this.onload) {
      this.onload({ target: this });
    }
  }
  readAsText() {
    this.result = '';
    if (this.onload) {
      this.onload({ target: this });
    }
  }
  
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
} as any;