import React from 'react';
import { render, screen } from '@testing-library/react';
import { HistoryTable, createExpenseHistoryColumns, HistoryItem } from '../HistoryTable';
import { DataTableColumn } from '../DataTable';

// Material-UIのuseMediaQueryをモック
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(() => false),
  useTheme: () => ({
    breakpoints: {
      down: jest.fn(),
    },
  }),
}));

interface TestHistoryItem extends HistoryItem {
  category: string;
  amount: number;
  title?: string;
}

describe('HistoryTable', () => {
  const mockData: TestHistoryItem[] = [
    {
      id: '1',
      date: '2024-01-01T00:00:00Z',
      status: 'draft',
      category: 'travel',
      amount: 5000,
      title: 'テスト経費1',
    },
    {
      id: '2',
      date: '2024-01-02T00:00:00Z',
      status: 'submitted',
      category: 'supplies',
      amount: 3000,
      title: 'テスト経費2',
    },
  ];

  it('should render with custom columns', () => {
    const columns: DataTableColumn<TestHistoryItem>[] = [
      { id: 'date', label: '日付' },
      { id: 'category', label: 'カテゴリ' },
      { id: 'amount', label: '金額' },
      { id: 'status', label: 'ステータス' },
    ];

    render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
      />
    );

    expect(screen.getByText('日付')).toBeInTheDocument();
    expect(screen.getByText('カテゴリ')).toBeInTheDocument();
    expect(screen.getByText('金額')).toBeInTheDocument();
    expect(screen.getByText('ステータス')).toBeInTheDocument();
  });

  it('should apply custom row styles and class names', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    
    const getRowStyles = (row: TestHistoryItem) => ({
      backgroundColor: row.status === 'draft' ? 'lightblue' : 'transparent',
    });
    
    const getRowClassName = (row: TestHistoryItem) => 
      row.status === 'draft' ? 'draft-row' : '';

    const { container } = render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
        getRowStyles={getRowStyles}
        getRowClassName={getRowClassName}
      />
    );

    const firstRow = container.querySelector('tbody tr:first-child');
    expect(firstRow).toHaveStyle({ backgroundColor: 'lightblue' });
    expect(firstRow).toHaveClass('draft-row');
  });

  it('should format date correctly', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    
    render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
        dateFormat="yyyy/MM/dd"
      />
    );

    expect(screen.getByText('2024/01/01')).toBeInTheDocument();
    expect(screen.getByText('2024/01/02')).toBeInTheDocument();
  });

  it('should handle pagination when enabled', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    const onPageChange = jest.fn();
    
    render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
        pagination={{
          enabled: true,
          page: 1,
          pageSize: 10,
          totalCount: 20,
          onPageChange,
        }}
      />
    );

    // ページネーションコンポーネントが表示されることを確認
    expect(screen.getByTestId('history-table-pagination')).toBeInTheDocument();
  });

  it('should not show pagination when disabled', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    
    render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
      />
    );

    // ページネーションコンポーネントが表示されないことを確認
    expect(screen.queryByTestId('history-table-pagination')).not.toBeInTheDocument();
  });

  it('should show empty message when no data', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    
    render(
      <HistoryTable
        data={[]}
        columns={columns}
        keyField="id"
        emptyMessage="データがありません"
      />
    );

    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('should format amount with comma separator', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    
    render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
      />
    );

    expect(screen.getByText('¥5,000')).toBeInTheDocument();
    expect(screen.getByText('¥3,000')).toBeInTheDocument();
  });

  it('should handle status converter when provided', () => {
    const columns = createExpenseHistoryColumns<TestHistoryItem>();
    const statusConverter = (status: string) => {
      const statusMap: Record<string, any> = {
        draft: 'draft',
        submitted: 'submitted',
        approved: 'approved',
        rejected: 'rejected',
      };
      return statusMap[status] || status;
    };
    
    render(
      <HistoryTable
        data={mockData}
        columns={columns}
        keyField="id"
        statusConverter={statusConverter}
      />
    );

    // StatusChipコンポーネントが正しく使用されることを確認
    expect(screen.getByTestId('status-chip-draft')).toBeInTheDocument();
    expect(screen.getByTestId('status-chip-submitted')).toBeInTheDocument();
  });
});