// 週報テストユーティリティのエクスポート

// モックデータジェネレーター
export {
  createMockWeeklyReport,
  createMockDailyRecord,
  createMockApiWeeklyReport,
  createMockLocalApiWeeklyReport,
  createMockListWeeklyReportsResponse,
  createMockBulkSettings,
  createMockDefaultWorkTimeSettings,
  getWeekStart,
  getWeekEnd,
} from './mockDataGenerators';

// テストヘルパー
export {
  customRender,
  createTestQueryClient,
  getTestWeekRange,
  formatDateForInput,
  parseTimeString,
  validateWeeklyReport,
  validateDailyRecord,
  calculateWorkHours,
  setupApiMocks,
  resetApiMocks,
  simulateTimeInput,
  simulateFormSubmit,
  simulateBulkTimeEntry,
  setupCustomMatchers,
  createMockApiResponse,
} from './testHelpers';

// デフォルトエクスポート
export { default as testHelpers } from './testHelpers';

// 型定義
export type {
  MockDataScenario,
  WeeklyReportTestContext,
  MockApiResponse,
  TestError,
  TestValidationResult,
  TestWeeklyReportFormData,
  TestHandlerCall,
  TestStateSnapshot,
  MockQueryResult,
  MockMutationResult,
  TestDateRange,
  TestWorkHourCalculation,
  TestFormInput,
  TestApiCall,
  TestComponentProps,
  TestRenderResult,
  WeeklyReportTestUtils,
} from '../types';

// 定数
export { TEST_CONSTANTS } from '../types';