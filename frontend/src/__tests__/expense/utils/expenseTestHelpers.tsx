import React from 'react';
import { render, RenderOptions, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { setupServer } from 'msw/node';
import { theme } from '@/theme';
import { ToastProvider } from '@/components/common/Toast/ToastProvider';
import { 
  ExpenseData, 
  ExpenseFormData, 
  ExpenseCategory,
  ValidationError 
} from '@/types/expense';
import { 
  MockDataScenario,
  createMockExpenseData,
  createMockExpenseFormData,
  createMockExpenseCategories,
  TEST_CONSTANTS
} from './expenseMockData';
import { expenseTestHandlers } from './expenseApiMocks';

export interface TestRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  queryClient: QueryClient;
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

export const server = setupServer(...expenseTestHandlers);

export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
): TestRenderResult => {
  const queryClient = options?.queryClient || createTestQueryClient();
  const user = userEvent.setup();

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  const renderResult = render(ui, { 
    wrapper: AllTheProviders, 
    ...options 
  }) as RenderResult;

  const mockApi: MockApiHelper = {
    expectGet: (url: string) => {
      expect(server.listHandlers()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            info: expect.objectContaining({
              method: 'GET',
              path: expect.stringContaining(url),
            }),
          }),
        ])
      );
    },
    expectPost: (url: string, data?: any) => {
      expect(server.listHandlers()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            info: expect.objectContaining({
              method: 'POST',
              path: expect.stringContaining(url),
            }),
          }),
        ])
      );
    },
    expectPut: (url: string, data?: any) => {
      expect(server.listHandlers()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            info: expect.objectContaining({
              method: 'PUT',
              path: expect.stringContaining(url),
            }),
          }),
        ])
      );
    },
    expectDelete: (url: string) => {
      expect(server.listHandlers()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            info: expect.objectContaining({
              method: 'DELETE',
              path: expect.stringContaining(url),
            }),
          }),
        ])
      );
    },
    reset: () => {
      server.resetHandlers();
    },
  };

  return {
    ...renderResult,
    user,
    queryClient,
    mockApi,
  };
};

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseAmountString = (amountStr: string): number => {
  const cleanedStr = amountStr.replace(/[^\d]/g, '');
  return parseInt(cleanedStr, 10) || 0;
};

export const validateExpenseFormData = (formData: ExpenseFormData): TestValidationResult => {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};

  if (!formData.categoryId) {
    errors.categoryId = ['カテゴリを選択してください'];
  }

  if (!formData.amount || formData.amount <= 0) {
    errors.amount = ['金額を入力してください'];
  } else if (formData.amount < TEST_CONSTANTS.MIN_AMOUNT) {
    errors.amount = [`金額は${TEST_CONSTANTS.MIN_AMOUNT}円以上で入力してください`];
  } else if (formData.amount > TEST_CONSTANTS.MAX_AMOUNT) {
    errors.amount = [`金額は${TEST_CONSTANTS.MAX_AMOUNT.toLocaleString()}円以下で入力してください`];
  }

  if (!formData.description?.trim()) {
    errors.description = ['内容を入力してください'];
  } else if (formData.description.length > TEST_CONSTANTS.DESCRIPTION_MAX_LENGTH) {
    errors.description = [`内容は${TEST_CONSTANTS.DESCRIPTION_MAX_LENGTH}文字以内で入力してください`];
  }

  if (!formData.expenseDate) {
    errors.expenseDate = ['日付を選択してください'];
  } else {
    const expenseDate = new Date(formData.expenseDate);
    const today = new Date();
    if (expenseDate > today) {
      errors.expenseDate = ['未来の日付は選択できません'];
    }
  }

  if (formData.amount >= TEST_CONSTANTS.RECEIPT_REQUIRED_AMOUNT && !formData.receiptUrl) {
    errors.receipt = [`${TEST_CONSTANTS.RECEIPT_REQUIRED_AMOUNT.toLocaleString()}円以上の申請には領収書が必要です`];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

export const simulateFormInput = async (
  container: HTMLElement,
  formData: Partial<ExpenseFormTestData>
) => {
  const user = userEvent.setup();

  if (formData.categoryId) {
    const categorySelect = container.querySelector('input[name="categoryId"]') as HTMLSelectElement;
    if (categorySelect) {
      await user.selectOptions(categorySelect, formData.categoryId);
    }
  }

  if (formData.amount !== undefined) {
    const amountInput = container.querySelector('input[name="amount"]') as HTMLInputElement;
    if (amountInput) {
      await user.clear(amountInput);
      await user.type(amountInput, formData.amount.toString());
    }
  }

  if (formData.description) {
    const descriptionInput = container.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
    if (descriptionInput) {
      await user.clear(descriptionInput);
      await user.type(descriptionInput, formData.description);
    }
  }

  if (formData.expenseDate) {
    const dateInput = container.querySelector('input[name="expenseDate"]') as HTMLInputElement;
    if (dateInput) {
      await user.clear(dateInput);
      await user.type(dateInput, formData.expenseDate);
    }
  }
};

export const simulateFormSubmit = async (form: HTMLFormElement) => {
  const user = userEvent.setup();
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  
  if (submitButton) {
    await user.click(submitButton);
  } else {
    const submitEvent = new Event('submit', { 
      bubbles: true, 
      cancelable: true 
    });
    form.dispatchEvent(submitEvent);
  }
  
  await waitFor(() => {
    expect(form).toBeInTheDocument();
  });
};

export const simulateFileUpload = async (
  container: HTMLElement,
  file: File
) => {
  const user = userEvent.setup();
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  
  if (fileInput) {
    await user.upload(fileInput, file);
  }
};

export const createMockFile = (
  name = 'receipt.jpg',
  type = 'image/jpeg',
  size = 1024
): File => {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
};

export const setupCustomMatchers = () => {
  expect.extend({
    toBeValidExpenseForm(received: ExpenseFormData) {
      const validation = validateExpenseFormData(received);
      const pass = validation.isValid;
      
      return {
        pass,
        message: () => {
          if (pass) {
            return 'expected expense form not to be valid';
          }
          
          const errorMessages = Object.entries(validation.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
            
          return `expected expense form to be valid, but found errors:\n${errorMessages}`;
        },
      };
    },
    
    toHaveValidationError(received: TestValidationResult, field: string, message?: string) {
      const hasError = field in received.errors;
      const messageMatches = !message || received.errors[field]?.includes(message);
      const pass = hasError && messageMatches;
      
      return {
        pass,
        message: () => {
          if (pass) {
            return `expected not to have validation error for ${field}`;
          }
          
          if (!hasError) {
            return `expected to have validation error for ${field}`;
          }
          
          return `expected to have validation error "${message}" for ${field}, but got: ${received.errors[field]?.join(', ')}`;
        },
      };
    },
    
    toHaveExpenseStatus(received: ExpenseData, status: string) {
      const pass = received.status === status;
      
      return {
        pass,
        message: () => 
          pass 
            ? `expected expense status not to be ${status}`
            : `expected expense status to be ${status}, but got ${received.status}`,
      };
    },
  });
};

export const getTestExpenseFormData = (scenario: MockDataScenario = 'draft'): ExpenseFormTestData => {
  const mockData = createMockExpenseFormData();
  
  const scenarios: Record<MockDataScenario, Partial<ExpenseFormTestData>> = {
    empty: {
      categoryId: '',
      amount: 0,
      description: '',
      expenseDate: '',
    },
    draft: mockData,
    submitted: mockData,
    approved: mockData,
    rejected: mockData,
    withReceipt: {
      ...mockData,
      amount: 15000,
      receiptUrl: 'https://example.com/receipt.jpg',
      receiptS3Key: 'receipts/test-receipt.jpg',
    },
    noReceipt: {
      ...mockData,
      amount: 500,
    },
    highAmount: {
      ...mockData,
      amount: 50000,
      receiptUrl: 'https://example.com/receipt-high.jpg',
      receiptS3Key: 'receipts/high-amount-receipt.jpg',
    },
    multipleExpenses: mockData,
  };
  
  return { ...mockData, ...scenarios[scenario] } as ExpenseFormTestData;
};

export default {
  customRender,
  createTestQueryClient,
  formatDateForInput,
  parseAmountString,
  validateExpenseFormData,
  simulateFormInput,
  simulateFormSubmit,
  simulateFileUpload,
  createMockFile,
  setupCustomMatchers,
  getTestExpenseFormData,
  server,
};