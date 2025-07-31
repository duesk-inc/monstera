import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseHistoryView } from '../ExpenseHistoryView';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/hooks/expense/useCategories';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/expense/useCategories', () => ({
  useCategories: jest.fn(),
}));

describe('ExpenseHistoryView', () => {
  const mockPush = jest.fn();
  const mockCategories = [
    { code: 'travel', name: '旅費交通費' },
    { code: 'supplies', name: '消耗品費' },
  ];

  const mockHistoryData = [
    {
      id: '1',
      title: '交通費申請',
      category: 'travel',
      amount: 5000,
      status: 'draft' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: '消耗品購入',
      category: 'supplies',
      amount: 3000,
      status: 'submitted' as const,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      title: '会議費',
      category: 'travel',
      amount: 10000,
      status: 'approved' as const,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      processedAt: '2024-01-04T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useCategories as jest.Mock).mockReturnValue({
      categories: mockCategories,
    });
  });

  it('should render the expense history table', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    expect(screen.getByText('交通費申請')).toBeInTheDocument();
    expect(screen.getByText('消耗品購入')).toBeInTheDocument();
    expect(screen.getByText('会議費')).toBeInTheDocument();
  });

  it('should display category names instead of codes', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    expect(screen.getByText('旅費交通費')).toBeInTheDocument();
    expect(screen.getByText('消耗品費')).toBeInTheDocument();
  });

  it('should show edit button only for draft expenses', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    // Should have exactly one edit button (for the draft expense)
    const editButtons = screen.getAllByLabelText('編集');
    expect(editButtons).toHaveLength(1);
  });

  it('should not show edit button for submitted expenses', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    // Find the row containing the submitted expense
    const submittedRow = screen.getByText('消耗品購入').closest('tr');
    expect(submittedRow).not.toHaveTextContent('編集');
  });

  it('should not show edit button for approved expenses', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    // Find the row containing the approved expense
    const approvedRow = screen.getByText('会議費').closest('tr');
    expect(approvedRow).not.toHaveTextContent('編集');
  });

  it('should navigate to edit page when edit button is clicked', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    const editButton = screen.getByLabelText('編集');
    fireEvent.click(editButton);
    
    expect(mockPush).toHaveBeenCalledWith('/expenses/1/edit');
  });

  it('should display action column header', () => {
    render(<ExpenseHistoryView historyData={mockHistoryData} />);
    
    expect(screen.getByText('アクション')).toBeInTheDocument();
  });

  it('should handle empty history data', () => {
    render(<ExpenseHistoryView historyData={[]} />);
    
    expect(screen.getByText('該当する申請履歴がありません')).toBeInTheDocument();
  });

  it('should handle expenses with unknown categories', () => {
    const dataWithUnknownCategory = [
      {
        id: '4',
        title: '不明なカテゴリ',
        category: 'unknown',
        amount: 1000,
        status: 'draft' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    
    render(<ExpenseHistoryView historyData={dataWithUnknownCategory} />);
    
    // Should display the category code when mapping is not found
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});