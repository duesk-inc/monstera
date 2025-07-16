import { http, HttpResponse } from 'msw';
import { 
  MockDataScenario, 
  createMockExpenseData,
  createMockExpenseCategories,
  createMockExpenseList,
  createMockApiExpenseResponse,
  createMockExpenseListResponse,
  createMockErrorResponse
} from './expenseMockData';
import { ExpenseData, ExpenseFormData } from '@/types/expense';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

let mockExpenseIdCounter = 1000;
const generateExpenseId = () => `expense-test-${String(mockExpenseIdCounter++).padStart(4, '0')}`;

export const expenseApiHandlers = [
  http.get(`${BASE_URL}/api/v1/expense/categories`, () => {
    const categories = createMockExpenseCategories();
    return HttpResponse.json(createMockApiExpenseResponse(categories));
  }),

  http.get(`${BASE_URL}/api/v1/expenses`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    
    let expenses = createMockExpenseList(['draft', 'submitted', 'approved', 'rejected']);
    
    if (status) {
      expenses = expenses.filter(expense => expense.status === status);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedExpenses = expenses.slice(startIndex, endIndex);
    
    return HttpResponse.json(createMockExpenseListResponse(
      paginatedExpenses,
      { page, limit, total: expenses.length }
    ));
  }),

  http.get(`${BASE_URL}/api/v1/expenses/:id`, ({ params }) => {
    const { id } = params;
    
    if (id === 'not-found') {
      return HttpResponse.json(
        createMockErrorResponse('経費申請が見つかりません', 404, 'Not Found'),
        { status: 404 }
      );
    }
    
    const expense = createMockExpenseData('draft', { id: id as string });
    return HttpResponse.json(createMockApiExpenseResponse(expense));
  }),

  http.post(`${BASE_URL}/api/v1/expenses`, async ({ request }) => {
    try {
      const formData = await request.json() as ExpenseFormData;
      
      if (!formData.categoryId) {
        return HttpResponse.json(
          createMockErrorResponse('カテゴリを選択してください', 400),
          { status: 400 }
        );
      }
      
      if (!formData.amount || formData.amount <= 0) {
        return HttpResponse.json(
          createMockErrorResponse('金額を入力してください', 400),
          { status: 400 }
        );
      }
      
      if (!formData.description?.trim()) {
        return HttpResponse.json(
          createMockErrorResponse('内容を入力してください', 400),
          { status: 400 }
        );
      }
      
      const newExpense: ExpenseData = {
        ...createMockExpenseData('draft'),
        id: generateExpenseId(),
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      return HttpResponse.json(
        createMockApiExpenseResponse(newExpense),
        { status: 201 }
      );
    } catch (error) {
      return HttpResponse.json(
        createMockErrorResponse('リクエストの処理に失敗しました', 500),
        { status: 500 }
      );
    }
  }),

  http.put(`${BASE_URL}/api/v1/expenses/:id`, async ({ params, request }) => {
    const { id } = params;
    
    try {
      const formData = await request.json() as ExpenseFormData;
      
      const updatedExpense: ExpenseData = {
        ...createMockExpenseData('draft'),
        id: id as string,
        ...formData,
        updatedAt: new Date(),
      };
      
      return HttpResponse.json(createMockApiExpenseResponse(updatedExpense));
    } catch (error) {
      return HttpResponse.json(
        createMockErrorResponse('更新に失敗しました', 500),
        { status: 500 }
      );
    }
  }),

  http.delete(`${BASE_URL}/api/v1/expenses/:id`, ({ params }) => {
    const { id } = params;
    
    if (id === 'not-found') {
      return HttpResponse.json(
        createMockErrorResponse('経費申請が見つかりません', 404),
        { status: 404 }
      );
    }
    
    return HttpResponse.json(
      createMockApiExpenseResponse({ message: '削除しました' }),
      { status: 200 }
    );
  }),

  http.post(`${BASE_URL}/api/v1/expenses/:id/submit`, ({ params }) => {
    const { id } = params;
    
    const submittedExpense = createMockExpenseData('submitted', { 
      id: id as string,
      submittedAt: new Date(),
    });
    
    return HttpResponse.json(createMockApiExpenseResponse(submittedExpense));
  }),

  http.post(`${BASE_URL}/api/v1/expenses/:id/cancel`, ({ params }) => {
    const { id } = params;
    
    const cancelledExpense = createMockExpenseData('draft', { 
      id: id as string,
      updatedAt: new Date(),
    });
    
    return HttpResponse.json(createMockApiExpenseResponse(cancelledExpense));
  }),

  http.post(`${BASE_URL}/api/v1/upload/receipt`, async ({ request }) => {
    try {
      const uploadResult = {
        receiptUrl: 'https://example.com/mock-receipt.jpg',
        receiptS3Key: 'receipts/mock-receipt-key.jpg',
      };
      
      return HttpResponse.json(createMockApiExpenseResponse(uploadResult));
    } catch (error) {
      return HttpResponse.json(
        createMockErrorResponse('ファイルのアップロードに失敗しました', 500),
        { status: 500 }
      );
    }
  }),

  http.delete(`${BASE_URL}/api/v1/upload/receipt/:key`, ({ params }) => {
    const { key } = params;
    
    return HttpResponse.json(
      createMockApiExpenseResponse({ message: 'ファイルを削除しました' }),
      { status: 200 }
    );
  }),
];

export const adminExpenseApiHandlers = [
  http.get(`${BASE_URL}/api/v1/admin/expenses`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let expenses = createMockExpenseList(['submitted', 'approved', 'rejected']);
    
    if (status) {
      expenses = expenses.filter(expense => expense.status === status);
    }
    
    return HttpResponse.json(createMockExpenseListResponse(expenses));
  }),

  http.post(`${BASE_URL}/api/v1/admin/expenses/:id/approve`, ({ params }) => {
    const { id } = params;
    
    const approvedExpense = createMockExpenseData('approved', {
      id: id as string,
      approvedAt: new Date(),
      approvedBy: 'admin-001',
    });
    
    return HttpResponse.json(createMockApiExpenseResponse(approvedExpense));
  }),

  http.post(`${BASE_URL}/api/v1/admin/expenses/:id/reject`, ({ params }) => {
    const { id } = params;
    
    const rejectedExpense = createMockExpenseData('rejected', {
      id: id as string,
      approvedAt: new Date(),
      approvedBy: 'admin-001',
    });
    
    return HttpResponse.json(createMockApiExpenseResponse(rejectedExpense));
  }),
];

export const expenseTestHandlers = [...expenseApiHandlers, ...adminExpenseApiHandlers];

export const setupExpenseApiMocks = (scenario: MockDataScenario = 'draft') => {
  return expenseTestHandlers;
};

export const createExpenseErrorHandlers = () => [
  http.get(`${BASE_URL}/api/v1/expenses`, () => {
    return HttpResponse.json(
      createMockErrorResponse('サーバーエラー', 500),
      { status: 500 }
    );
  }),
  
  http.post(`${BASE_URL}/api/v1/expenses`, () => {
    return HttpResponse.json(
      createMockErrorResponse('作成に失敗しました', 500),
      { status: 500 }
    );
  }),
  
  http.get(`${BASE_URL}/api/v1/expense/categories`, () => {
    return HttpResponse.json(
      createMockErrorResponse('カテゴリの取得に失敗しました', 500),
      { status: 500 }
    );
  }),
];

export default {
  expenseTestHandlers,
  setupExpenseApiMocks,
  createExpenseErrorHandlers,
  adminExpenseApiHandlers,
};