import { RenderResult } from '@testing-library/react';
import { ExpenseData, ExpenseFormData, ExpenseCategory } from '@/types/expense';

export type MockDataScenario = 
  | 'empty'
  | 'draft' 
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'withReceipt'
  | 'noReceipt'
  | 'highAmount'
  | 'multipleExpenses';

export interface TestRenderResult extends RenderResult {
  user: ReturnType<typeof import('@testing-library/user-event').setup>;
  queryClient: import('@tanstack/react-query').QueryClient;
  mockApi: MockApiHelper;
}

export interface MockApiHelper {
  expectGet: (url: string) => void;
  expectPost: (url: string, data?: any) => void;
  expectPut: (url: string, data?: any) => void;
  expectDelete: (url: string) => void;
  reset: () => void;
}

export interface TestValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

export interface ExpenseFormTestData {
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
  receiptS3Key?: string;
}

export interface MockApiResponse<T = any> {
  data: {
    data: T;
    message?: string;
  };
  status: number;
  statusText: string;
}

export interface MockExpenseListResponse {
  items: ExpenseData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TestConstants {
  TEST_USER_ID: string;
  TEST_BASE_DATE: Date;
  RECEIPT_REQUIRED_AMOUNT: number;
  MAX_AMOUNT: number;
  MIN_AMOUNT: number;
  DESCRIPTION_MAX_LENGTH: number;
}

export interface ExpenseTestScenarios {
  [key: string]: Partial<ExpenseData>;
}

export interface FormValidationTestCase {
  name: string;
  input: Partial<ExpenseFormData>;
  expectedErrors: string[];
  expectedValid: boolean;
}

export interface ApiTestCase<TRequest = any, TResponse = any> {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  requestData?: TRequest;
  expectedResponse: TResponse;
  expectedStatus: number;
}

export interface FileUploadTestCase {
  name: string;
  file: {
    name: string;
    type: string;
    size: number;
  };
  expectedResult: {
    success: boolean;
    url?: string;
    s3Key?: string;
    error?: string;
  };
}

export interface ComponentTestCase {
  name: string;
  props: any;
  expectedElements: string[];
  expectedBehavior?: string;
}

export interface IntegrationTestScenario {
  name: string;
  steps: Array<{
    action: string;
    target: string;
    input?: any;
    expected: string;
  }>;
}

export type ExpenseFormMode = 'create' | 'edit';

export interface ExpenseFormTestProps {
  expense?: ExpenseData;
  mode: ExpenseFormMode;
  onSuccess?: (expense: ExpenseData) => void;
  onCancel?: () => void;
}

export interface ExpenseListTestProps {
  expenses?: ExpenseData[];
  loading?: boolean;
  error?: string;
  onExpenseClick?: (expense: ExpenseData) => void;
  onStatusChange?: (id: string, status: string) => void;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidExpenseForm(): R;
      toHaveValidationError(field: string, message?: string): R;
      toHaveExpenseStatus(status: string): R;
    }
  }
}

export {}