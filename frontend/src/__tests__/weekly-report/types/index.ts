// 週報機能テスト用の型定義
// 実際の型をインポートして再エクスポート + テスト固有の型を追加

export * from '@/types/weeklyReport';
export * from '@/types/admin/weeklyReport';
export * from '@/types/admin/weeklyReportSummary';

// テスト用の追加型定義

// モックデータのバリエーション
export type MockDataScenario = 
  | 'draft'           // 下書き状態
  | 'submitted'       // 提出済み
  | 'approved'        // 承認済み
  | 'rejected'        // 却下済み
  | 'empty'           // 空の週報
  | 'partial'         // 部分的に入力
  | 'fullWeek'        // 全日入力済み
  | 'withOvertime'    // 残業あり
  | 'withHoliday'     // 休日出勤あり
  | 'withClientWork'  // 客先作業あり
  | 'pastWeek'        // 過去の週
  | 'currentWeek'     // 今週
  | 'futureWeek'      // 未来の週
  | 'error';          // エラー状態

// テストコンテキスト
export interface WeeklyReportTestContext {
  userId: string;
  userName: string;
  userRole: number;
  currentDate: Date;
  testWeekStart: Date;
  testWeekEnd: Date;
}

// モックAPIレスポンス
export interface MockApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// テスト用のエラー型
export interface TestError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

// テスト用のバリデーション結果
export interface TestValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

// テスト用のフォームデータ
export interface TestWeeklyReportFormData {
  weeklyReport: WeeklyReport;
  isDirty: boolean;
  touchedFields: Set<string>;
  validationErrors: Record<string, string>;
}

// テスト用のハンドラー記録
export interface TestHandlerCall {
  handler: string;
  args: any[];
  timestamp: Date;
  result?: any;
  error?: Error;
}

// テスト用の状態スナップショット
export interface TestStateSnapshot {
  weeklyReport: WeeklyReport;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  timestamp: Date;
}

// React Query用のモック型
export interface MockQueryResult<T> {
  data?: T;
  error?: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: jest.Mock;
}

export interface MockMutationResult<TData = any, TVariables = any> {
  mutate: jest.Mock<void, [TVariables]>;
  mutateAsync: jest.Mock<Promise<TData>, [TVariables]>;
  data?: TData;
  error?: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: jest.Mock;
}

// テスト用の日付範囲
export interface TestDateRange {
  start: Date;
  end: Date;
  label: string;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFutureWeek: boolean;
}

// テスト用の稼働時間計算結果
export interface TestWorkHourCalculation {
  companyRegularHours: number;
  companyOvertimeHours: number;
  clientRegularHours: number;
  clientOvertimeHours: number;
  totalHours: number;
  breakHours: number;
  weeklyTotal: number;
}

// フォーム入力のシミュレーション
export interface TestFormInput {
  field: string;
  value: any;
  expectedValidation?: TestValidationResult;
  shouldTriggerSave?: boolean;
}

// API呼び出しの記録
export interface TestApiCall {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  response?: MockApiResponse<any>;
  error?: TestError;
  timestamp: Date;
}

// コンポーネントのプロップス型
export interface TestComponentProps {
  // 共通プロップス
  testId?: string;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
  
  // WeeklyReportContainer用
  initialWeeklyReport?: WeeklyReport;
  readOnly?: boolean;
  
  // DailyRecordAccordion用
  dailyRecord?: DailyRecord;
  onChange?: (record: DailyRecord) => void;
}

// テストヘルパーの戻り値型
export interface TestRenderResult {
  // Testing Library標準
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: (element?: HTMLElement) => void;
  rerender: (ui: React.ReactElement) => void;
  unmount: () => void;
  asFragment: () => DocumentFragment;
  
  // カスタム追加
  user: any; // userEvent
  queryClient: any; // QueryClient instance
  mockApi: {
    expectGet: (url: string) => void;
    expectPost: (url: string, data?: any) => void;
    expectPut: (url: string, data?: any) => void;
    reset: () => void;
  };
}

// ユーティリティ関数の型
export interface WeeklyReportTestUtils {
  // モックデータ生成
  createMockWeeklyReport: (scenario?: MockDataScenario) => WeeklyReport;
  createMockDailyRecord: (date: Date, options?: Partial<DailyRecord>) => DailyRecord;
  createMockApiResponse: <T>(data: T, options?: Partial<MockApiResponse<T>>) => MockApiResponse<T>;
  
  // 日付ユーティリティ
  getTestWeekRange: (baseDate?: Date) => TestDateRange;
  formatDateForInput: (date: Date) => string;
  parseTimeString: (timeStr: string) => { hours: number; minutes: number };
  
  // バリデーションヘルパー
  validateWeeklyReport: (report: WeeklyReport) => TestValidationResult;
  validateDailyRecord: (record: DailyRecord) => TestValidationResult;
  
  // API モック設定
  setupApiMocks: (scenario: MockDataScenario) => void;
  resetApiMocks: () => void;
  
  // 状態管理ヘルパー
  captureStateSnapshot: (component: any) => TestStateSnapshot;
  compareSnapshots: (before: TestStateSnapshot, after: TestStateSnapshot) => string[];
  
  // イベントシミュレーション
  simulateTimeInput: (element: HTMLElement, time: string) => void;
  simulateFormSubmit: (form: HTMLFormElement) => void;
  simulateBulkTimeEntry: (settings: BulkSettings) => void;
}

// テスト用の定数
export const TEST_CONSTANTS = {
  // ユーザー情報
  TEST_USER_ID: 'test-user-123',
  TEST_USER_NAME: 'テストユーザー',
  TEST_USER_EMAIL: 'test@duesk.co.jp',
  TEST_USER_ROLE: 4, // エンジニア
  
  // 日付
  TEST_BASE_DATE: new Date('2024-01-01T00:00:00.000Z'),
  TEST_WEEK_START: new Date('2024-01-01T00:00:00.000Z'), // 月曜日
  TEST_WEEK_END: new Date('2024-01-07T23:59:59.999Z'),   // 日曜日
  
  // タイムアウト
  ASYNC_TIMEOUT: 5000,
  ANIMATION_DELAY: 300,
  
  // APIエンドポイント
  API_BASE_URL: 'http://localhost:8080/api/v1',
  WEEKLY_REPORTS_ENDPOINT: '/weekly-reports',
  
  // デフォルト値
  DEFAULT_WORK_START: '09:00',
  DEFAULT_WORK_END: '18:00',
  DEFAULT_BREAK_MINUTES: 60,
  DEFAULT_MOOD: 3,
} as const;

// テスト用のカスタムマッチャー
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidWeeklyReport(): R;
      toHaveWorkHours(expected: Partial<TestWorkHourCalculation>): R;
      toHaveStatus(status: string): R;
      toBeWithinDateRange(start: Date, end: Date): R;
      toHaveValidationError(field: string, message?: string): R;
    }
  }
}