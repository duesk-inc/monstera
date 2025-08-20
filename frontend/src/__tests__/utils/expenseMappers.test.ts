import { mapBackendExpenseListToExpenseList, mapBackendExpenseToExpenseData } from '@/utils/expenseMappers';
import { ExpenseListBackendResponse, ExpenseBackendResponse } from '@/types/expense';

describe('mapBackendExpenseListToExpenseList', () => {
  it('should handle undefined response', () => {
    const result = mapBackendExpenseListToExpenseList(undefined as any);
    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('should handle null response', () => {
    const result = mapBackendExpenseListToExpenseList(null as any);
    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('should handle response with null items', () => {
    const response: any = {
      items: null,
      total: 10,
      page: 2,
      limit: 30,
      total_pages: 1,
    };
    const result = mapBackendExpenseListToExpenseList(response);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(10);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
    expect(result.totalPages).toBe(1);
  });

  it('should handle response with undefined items', () => {
    const response: any = {
      items: undefined,
      total: 5,
      page: 1,
      limit: 10,
      total_pages: 1,
    };
    const result = mapBackendExpenseListToExpenseList(response);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it('should handle response with non-array items', () => {
    const response: any = {
      items: "not an array",
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
    };
    const result = mapBackendExpenseListToExpenseList(response);
    expect(result.items).toEqual([]);
  });

  it('should handle valid response correctly', () => {
    const mockExpense: ExpenseBackendResponse = {
      id: '1',
      user_id: 'user1',
      title: 'Test Expense',
      category: 'transport',
      amount: 1000,
      expense_date: '2025-01-20',
      status: 'submitted',
      description: 'Test description',
      receipt_url: 'http://example.com/receipt.jpg',
      created_at: '2025-01-20T10:00:00Z',
      updated_at: '2025-01-20T10:00:00Z',
    };

    const response: ExpenseListBackendResponse = {
      items: [mockExpense],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    };

    const result = mapBackendExpenseListToExpenseList(response);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('should handle response with empty items array', () => {
    const response: ExpenseListBackendResponse = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
    };

    const result = mapBackendExpenseListToExpenseList(response);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should not throw error when mapping fails for an item', () => {
    const invalidExpense: any = {
      id: '1',
      // Missing required fields
    };

    const response: ExpenseListBackendResponse = {
      items: [invalidExpense],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    };

    // This should not throw an error but handle gracefully
    expect(() => mapBackendExpenseListToExpenseList(response)).not.toThrow();
  });
});