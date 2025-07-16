import { 
  ExpenseData, 
  ExpenseFormData, 
  ExpenseCategory
} from '@/types/expense';
import { EXPENSE_STATUS } from '@/constants/expense';

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

export const TEST_CONSTANTS = {
  TEST_USER_ID: 'test-user-123',
  TEST_BASE_DATE: new Date('2025-01-15'),
  RECEIPT_REQUIRED_AMOUNT: 10000,
  MAX_AMOUNT: 1000000,
  MIN_AMOUNT: 1,
  DESCRIPTION_MAX_LENGTH: 500,
} as const;

export const createMockExpenseCategory = (options: Partial<ExpenseCategory> = {}): ExpenseCategory => {
  const defaultCategory: ExpenseCategory = {
    id: 'category-1',
    name: '交通費',
    requiresReceipt: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return { ...defaultCategory, ...options };
};

export const createMockExpenseCategories = (): ExpenseCategory[] => [
  createMockExpenseCategory({
    id: 'category-1',
    name: '交通費',
    requiresReceipt: false,
  }),
  createMockExpenseCategory({
    id: 'category-2', 
    name: '会議費',
    requiresReceipt: true,
  }),
  createMockExpenseCategory({
    id: 'category-3',
    name: '書籍・資料代',
    requiresReceipt: true,
  }),
  createMockExpenseCategory({
    id: 'category-4',
    name: '通信費',
    requiresReceipt: false,
  }),
];

export const createMockExpenseFormData = (options: Partial<ExpenseFormData> = {}): ExpenseFormData => {
  const defaultFormData: ExpenseFormData = {
    categoryId: 'category-1',
    amount: 1000,
    description: 'テスト用の経費申請',
    expenseDate: '2025-01-15',
    receiptUrl: undefined,
    receiptS3Key: undefined,
  };
  
  return { ...defaultFormData, ...options };
};

export const createMockExpenseData = (
  scenario: MockDataScenario = 'draft',
  options: Partial<ExpenseData> = {}
): ExpenseData => {
  const baseExpense: ExpenseData = {
    id: `expense-${scenario}-001`,
    userId: TEST_CONSTANTS.TEST_USER_ID,
    categoryId: 'category-1',
    amount: 1000,
    description: 'テスト用の経費申請',
    expenseDate: '2025-01-15',
    status: EXPENSE_STATUS.DRAFT,
    receiptUrl: undefined,
    receiptS3Key: undefined,
    approvedBy: undefined,
    approvedAt: undefined,
    submittedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const scenarios: Record<MockDataScenario, Partial<ExpenseData>> = {
    empty: {},
    draft: {
      status: EXPENSE_STATUS.DRAFT,
    },
    submitted: {
      id: 'expense-submitted-001',
      status: EXPENSE_STATUS.SUBMITTED,
      submittedAt: new Date(),
    },
    approved: {
      id: 'expense-approved-001', 
      status: EXPENSE_STATUS.APPROVED,
      submittedAt: new Date('2025-01-14'),
      approvedAt: new Date(),
      approvedBy: 'manager-001',
    },
    rejected: {
      id: 'expense-rejected-001',
      status: EXPENSE_STATUS.REJECTED,
      submittedAt: new Date('2025-01-14'),
      approvedAt: new Date(),
      approvedBy: 'manager-001',
    },
    withReceipt: {
      id: 'expense-receipt-001',
      amount: 15000,
      receiptUrl: 'https://example.com/receipt.jpg',
      receiptS3Key: 'receipts/test-receipt-key.jpg',
      categoryId: 'category-2',
    },
    noReceipt: {
      id: 'expense-no-receipt-001',
      amount: 500,
      categoryId: 'category-1',
    },
    highAmount: {
      id: 'expense-high-amount-001',
      amount: 50000,
      categoryId: 'category-2',
      receiptUrl: 'https://example.com/receipt-high.jpg',
      receiptS3Key: 'receipts/high-amount-receipt.jpg',
    },
    multipleExpenses: {},
  };
  
  return { ...baseExpense, ...scenarios[scenario], ...options };
};

export const createMockExpenseList = (scenarios: MockDataScenario[] = ['draft', 'submitted', 'approved']): ExpenseData[] => {
  return scenarios.map((scenario, index) => 
    createMockExpenseData(scenario, {
      id: `expense-${scenario}-${String(index + 1).padStart(3, '0')}`,
      expenseDate: new Date(2025, 0, 15 + index).toISOString().split('T')[0],
    })
  );
};

export const getExpenseFormDataFromExpense = (expense: ExpenseData): ExpenseFormData => {
  return {
    categoryId: expense.categoryId,
    amount: expense.amount,
    description: expense.description,
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    receiptS3Key: expense.receiptS3Key,
  };
};

export const createMockApiExpenseResponse = function<T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    message?: string;
  } = {}
) {
  return {
    data: {
      data,
      message: options.message || 'Success',
    },
    status: options.status || 200,
    statusText: options.statusText || 'OK',
  };
};

export const createMockExpenseListResponse = (
  expenses: ExpenseData[],
  pagination = { page: 1, limit: 10, total: expenses.length }
) => {
  return createMockApiExpenseResponse({
    items: expenses,
    pagination,
  });
};

export const createMockErrorResponse = (
  error: string,
  status = 400,
  statusText = 'Bad Request'
) => {
  return {
    response: {
      data: {
        error,
        message: error,
      },
      status,
      statusText,
    },
  };
};

export default {
  createMockExpenseCategory,
  createMockExpenseCategories,
  createMockExpenseFormData,
  createMockExpenseData,
  createMockExpenseList,
  getExpenseFormDataFromExpense,
  createMockApiExpenseResponse,
  createMockExpenseListResponse,
  createMockErrorResponse,
  TEST_CONSTANTS,
};