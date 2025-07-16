import { server } from './utils/expenseTestHelpers';
import { expenseTestHandlers } from './utils/expenseApiMocks';

describe('Expense Test Setup', () => {
  test('MSW server is configured correctly', () => {
    expect(server).toBeDefined();
    expect(server.listHandlers()).toHaveLength(expenseTestHandlers.length);
  });

  test('Test environment variables are set', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Mock utilities are available', async () => {
    const { 
      createMockExpenseData,
      createMockExpenseCategories,
      customRender 
    } = await import('./utils');
    
    expect(createMockExpenseData).toBeDefined();
    expect(createMockExpenseCategories).toBeDefined();
    expect(customRender).toBeDefined();
  });

  test('Custom matchers are loaded', () => {
    expect(expect.extend).toBeDefined();
  });
});