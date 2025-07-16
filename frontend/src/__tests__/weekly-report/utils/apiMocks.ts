// 週報機能のAPIモック設定（Jest版）

import { MockDataScenario, TEST_CONSTANTS } from '../types';
import { 
  createMockApiWeeklyReport,
  createMockLocalApiWeeklyReport,
  createMockListWeeklyReportsResponse 
} from './mockDataGenerators';

// APIエンドポイント
const WEEKLY_REPORTS_ENDPOINT = '/api/v1/weekly-reports';

// モックされたaxios
const mockedApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// axiosのモック設定
jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: mockedApiClient,
}));

// 週報APIのモック設定
export const setupWeeklyReportMocks = (scenario: MockDataScenario = 'draft') => {
  const mockReport = createMockApiWeeklyReport(scenario);
  const mockLocalReport = createMockLocalApiWeeklyReport(scenario);
  const mockListResponse = createMockListWeeklyReportsResponse(5, 1, 10);
  
  // GET /weekly-reports （リスト取得）
  mockedApiClient.get.mockImplementation((url: string) => {
    if (url === WEEKLY_REPORTS_ENDPOINT) {
      return Promise.resolve({ data: mockListResponse });
    }
    
    // GET /weekly-reports/date-range （日付範囲）
    if (url.includes('/date-range')) {
      const isEmpty = url.includes('empty=true');
      return Promise.resolve({ 
        data: isEmpty ? null : mockLocalReport 
      });
    }
    
    // GET /weekly-reports/:id （詳細取得）
    if (url.match(/\/weekly-reports\/[\w-]+$/)) {
      const id = url.split('/').pop();
      if (id === 'not-found') {
        return Promise.reject({
          response: { 
            status: 404, 
            data: { error: '週報が見つかりません' } 
          }
        });
      }
      return Promise.resolve({ 
        data: { ...mockReport, id } 
      });
    }
    
    return Promise.reject(new Error(`Unexpected GET request: ${url}`));
  });
  
  // POST /weekly-reports （作成）
  mockedApiClient.post.mockImplementation((url: string, data: any) => {
    if (url === WEEKLY_REPORTS_ENDPOINT) {
      if (!data.startDate || !data.endDate) {
        return Promise.reject({
          response: { 
            status: 400, 
            data: { error: '期間が指定されていません' } 
          }
        });
      }
      
      const newReport = {
        ...mockReport,
        ...data,
        id: `new-report-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return Promise.resolve({ data: newReport });
    }
    
    // POST /weekly-reports/:id/submit （提出）
    if (url.match(/\/weekly-reports\/[\w-]+\/submit$/)) {
      if (data?.forceError) {
        return Promise.reject({
          response: { 
            status: 400, 
            data: { error: '勤務時間が入力されていない日があります' } 
          }
        });
      }
      
      const id = url.split('/').slice(-2, -1)[0];
      const submittedReport = {
        ...mockReport,
        ...data,
        id,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return Promise.resolve({ data: submittedReport });
    }
    
    return Promise.reject(new Error(`Unexpected POST request: ${url}`));
  });
  
  // PUT /weekly-reports/:id （更新）
  mockedApiClient.put.mockImplementation((url: string, data: any) => {
    if (url.match(/\/weekly-reports\/[\w-]+$/)) {
      const id = url.split('/').pop();
      
      if (id === 'forbidden') {
        return Promise.reject({
          response: { 
            status: 403, 
            data: { error: 'この週報を編集する権限がありません' } 
          }
        });
      }
      
      const updatedReport = {
        ...mockReport,
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      };
      
      return Promise.resolve({ data: updatedReport });
    }
    
    return Promise.reject(new Error(`Unexpected PUT request: ${url}`));
  });
  
  // DELETE /weekly-reports/:id （削除）
  mockedApiClient.delete.mockImplementation((url: string) => {
    if (url.match(/\/weekly-reports\/[\w-]+$/)) {
      const id = url.split('/').pop();
      
      if (id === 'submitted-report') {
        return Promise.reject({
          response: { 
            status: 400, 
            data: { error: '提出済みの週報は削除できません' } 
          }
        });
      }
      
      return Promise.resolve({ status: 204 });
    }
    
    return Promise.reject(new Error(`Unexpected DELETE request: ${url}`));
  });
};

// 特定のシナリオ用のモック設定
export const setScenarioMocks = (scenario: MockDataScenario) => {
  setupWeeklyReportMocks(scenario);
};

// エラーレスポンスのシミュレーション
export const simulateApiError = (
  method: 'get' | 'post' | 'put' | 'delete',
  urlPattern: string | RegExp,
  status: number,
  errorMessage: string
) => {
  const errorResponse = {
    response: { 
      status, 
      data: { error: errorMessage } 
    }
  };
  
  mockedApiClient[method].mockImplementation((url: string) => {
    if (typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url)) {
      return Promise.reject(errorResponse);
    }
    return Promise.reject(new Error(`Unexpected ${method.toUpperCase()} request: ${url}`));
  });
};

// ネットワークエラーのシミュレーション
export const simulateNetworkError = (
  method: 'get' | 'post' | 'put' | 'delete',
  urlPattern: string | RegExp
) => {
  mockedApiClient[method].mockImplementation((url: string) => {
    if (typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url)) {
      return Promise.reject(new Error('Network Error'));
    }
    return Promise.reject(new Error(`Unexpected ${method.toUpperCase()} request: ${url}`));
  });
};

// レスポンス遅延のシミュレーション
export const simulateSlowResponse = (
  method: 'get' | 'post' | 'put' | 'delete',
  urlPattern: string | RegExp,
  delay: number,
  response: any
) => {
  mockedApiClient[method].mockImplementation(async (url: string) => {
    if (typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return Promise.resolve({ data: response });
    }
    return Promise.reject(new Error(`Unexpected ${method.toUpperCase()} request: ${url}`));
  });
};

// モックのリセット
export const resetApiMocks = () => {
  Object.values(mockedApiClient).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

// モックのクリア（呼び出し履歴のみクリア）
export const clearApiMocks = () => {
  Object.values(mockedApiClient).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

// APIコール履歴の取得
export const getApiCallHistory = () => {
  return {
    get: mockedApiClient.get.mock.calls,
    post: mockedApiClient.post.mock.calls,
    put: mockedApiClient.put.mock.calls,
    delete: mockedApiClient.delete.mock.calls,
  };
};

// 特定のAPIコールが行われたかチェック
export const expectApiCall = (
  method: 'get' | 'post' | 'put' | 'delete',
  urlPattern: string | RegExp,
  data?: any
) => {
  const calls = mockedApiClient[method].mock.calls;
  const matchingCall = calls.find(([url, callData]) => {
    const urlMatches = typeof urlPattern === 'string' 
      ? url.includes(urlPattern) 
      : urlPattern.test(url);
    
    if (!urlMatches) return false;
    
    if (data !== undefined && method !== 'get' && method !== 'delete') {
      return JSON.stringify(callData) === JSON.stringify(data);
    }
    
    return true;
  });
  
  if (!matchingCall) {
    throw new Error(
      `Expected ${method.toUpperCase()} call to ${urlPattern} was not made. ` +
      `Actual calls: ${JSON.stringify(calls)}`
    );
  }
  
  return matchingCall;
};

// デフォルトのモックをエクスポート
export { mockedApiClient };

// テスト用のヘルパー関数
export const weeklyReportApiMocks = {
  setup: setupWeeklyReportMocks,
  setScenario: setScenarioMocks,
  simulateError: simulateApiError,
  simulateNetworkError,
  simulateSlowResponse,
  reset: resetApiMocks,
  clear: clearApiMocks,
  getHistory: getApiCallHistory,
  expectCall: expectApiCall,
};