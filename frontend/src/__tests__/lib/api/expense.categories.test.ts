import { getExpenseCategories } from '@/lib/api/expense';
import { createPresetApiClient } from '@/lib/api';
import { extractDataFromResponse } from '@/utils/apiResponseUtils';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/utils/apiResponseUtils');
jest.mock('@/lib/debug/logger', () => ({
  DebugLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('getExpenseCategories', () => {
  const mockClient = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createPresetApiClient as jest.Mock).mockReturnValue(mockClient);
  });

  it('should handle array response from extractDataFromResponse', async () => {
    // Mock response
    const mockCategories = [
      {
        id: '1',
        code: 'transport',
        name: '交通費',
        requires_details: false,
        is_active: true,
        display_order: 1,
        created_at: '2025-01-20T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      },
      {
        id: '2',
        code: 'meal',
        name: '食費',
        requires_details: true,
        is_active: true,
        display_order: 2,
        created_at: '2025-01-20T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      },
    ];

    const mockResponse = { data: { data: mockCategories } };
    mockClient.get.mockResolvedValue(mockResponse);
    
    // extractDataFromResponse returns array (simulating the issue)
    (extractDataFromResponse as jest.Mock).mockReturnValue(mockCategories);

    const result = await getExpenseCategories();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: '1',
      code: 'transport',
      name: '交通費',
      requiresDetails: false,
      displayOrder: 1,
      isActive: true,
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
    });
    expect(result[1]).toEqual({
      id: '2',
      code: 'meal',
      name: '食費',
      requiresDetails: true,
      displayOrder: 2,
      isActive: true,
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
    });
  });

  it('should handle object response with data property', async () => {
    // Mock response with data property
    const mockCategoriesData = {
      data: [
        {
          id: '1',
          code: 'transport',
          name: '交通費',
          requires_details: false,
          is_active: true,
          display_order: 1,
          created_at: '2025-01-20T00:00:00Z',
          updated_at: '2025-01-20T00:00:00Z',
        },
      ],
    };

    const mockResponse = { data: mockCategoriesData };
    mockClient.get.mockResolvedValue(mockResponse);
    
    // extractDataFromResponse returns object with data property
    (extractDataFromResponse as jest.Mock).mockReturnValue(mockCategoriesData);

    const result = await getExpenseCategories();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: '1',
      code: 'transport',
      name: '交通費',
      requiresDetails: false,
      displayOrder: 1,
      isActive: true,
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
    });
  });

  it('should return empty array when responseData is null', async () => {
    const mockResponse = { data: null };
    mockClient.get.mockResolvedValue(mockResponse);
    
    // extractDataFromResponse returns null
    (extractDataFromResponse as jest.Mock).mockReturnValue(null);

    const result = await getExpenseCategories();

    expect(result).toEqual([]);
  });

  it('should return empty array for unexpected response structure', async () => {
    const mockResponse = { data: 'invalid' };
    mockClient.get.mockResolvedValue(mockResponse);
    
    // extractDataFromResponse returns unexpected structure
    (extractDataFromResponse as jest.Mock).mockReturnValue('invalid');

    const result = await getExpenseCategories();

    expect(result).toEqual([]);
  });

  it('should handle mixed property names (camelCase and snake_case)', async () => {
    // Some properties in camelCase, some in snake_case
    const mockCategories = [
      {
        id: '1',
        code: 'transport',
        name: '交通費',
        requiresDetails: false,  // Already camelCase
        is_active: true,         // snake_case
        displayOrder: 1,         // Already camelCase
        created_at: '2025-01-20T00:00:00Z',  // snake_case
        updatedAt: '2025-01-20T00:00:00Z',   // Already camelCase
      },
    ];

    const mockResponse = { data: { data: mockCategories } };
    mockClient.get.mockResolvedValue(mockResponse);
    (extractDataFromResponse as jest.Mock).mockReturnValue(mockCategories);

    const result = await getExpenseCategories();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: '1',
      code: 'transport',
      name: '交通費',
      requiresDetails: false,
      displayOrder: 1,
      isActive: true,
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
    });
  });
});