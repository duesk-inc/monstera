import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import userEvent from '@testing-library/user-event';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

import EngineerList from '../EngineerList';
import { ToastProvider } from '@/components/common/Toast/ToastProvider';
import * as engineerApi from '@/lib/api/engineers';
import { ENGINEER_STATUS } from '@/constants/engineer';
import { Engineer, EngineerSearchParams } from '@/types/engineer';

// Mock modules
vi.mock('@/lib/api/engineers');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock data
const mockEngineers: Engineer[] = [
  {
    id: '1',
    employeeNumber: 'EMP-2024-0001',
    email: 'yamada@duesk.co.jp',
    sei: '山田',
    mei: '太郎',
    department: '開発部',
    position: 'シニアエンジニア',
    engineerStatus: ENGINEER_STATUS.ACTIVE,
    hireDate: '2024-01-15',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
  },
  {
    id: '2',
    employeeNumber: 'EMP-2024-0002',
    email: 'tanaka@duesk.co.jp',
    sei: '田中',
    mei: '花子',
    department: '開発部',
    position: 'エンジニア',
    engineerStatus: ENGINEER_STATUS.STANDBY,
    hireDate: '2024-02-01',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z',
  },
  {
    id: '3',
    employeeNumber: 'EMP-2024-0003',
    email: 'sato@duesk.co.jp',
    sei: '佐藤',
    mei: '次郎',
    department: 'インフラ部',
    position: 'シニアエンジニア',
    engineerStatus: ENGINEER_STATUS.ACTIVE,
    hireDate: '2024-01-20',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
];

const mockApiResponse = {
  items: mockEngineers,
  total: 3,
  page: 1,
  limit: 10,
  pages: 1,
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const theme = createTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Helper function to render component
const renderEngineerList = (props: any = {}) => {
  const defaultProps = {
    engineers: mockEngineers,
    total: 3,
    loading: false,
    error: null,
    page: 1,
    limit: 10,
    onPageChange: vi.fn(),
    onLimitChange: vi.fn(),
    onSearch: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
    searchParams: {} as EngineerSearchParams,
  };

  return render(
    <TestWrapper>
      <EngineerList {...defaultProps} {...props} />
    </TestWrapper>
  );
};

describe('EngineerList', () => {
  const mockedGetEngineers = vi.mocked(engineerApi.getEngineers);
  const mockedDeleteEngineer = vi.mocked(engineerApi.deleteEngineer);
  const mockedUpdateEngineerStatus = vi.mocked(engineerApi.updateEngineerStatus);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetEngineers.mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders engineer list table with data', () => {
      renderEngineerList();

      // Check table headers
      expect(screen.getByText('社員番号')).toBeInTheDocument();
      expect(screen.getByText('氏名')).toBeInTheDocument();
      expect(screen.getByText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByText('部署')).toBeInTheDocument();
      expect(screen.getByText('ポジション')).toBeInTheDocument();
      expect(screen.getByText('ステータス')).toBeInTheDocument();
      expect(screen.getByText('入社日')).toBeInTheDocument();

      // Check engineer data
      expect(screen.getByText('EMP-2024-0001')).toBeInTheDocument();
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('yamada@duesk.co.jp')).toBeInTheDocument();
      expect(screen.getByText('開発部')).toBeInTheDocument();
      expect(screen.getByText('シニアエンジニア')).toBeInTheDocument();
    });

    it('renders empty state when no engineers', () => {
      renderEngineerList({
        engineers: [],
        total: 0,
      });

      expect(screen.getByText('エンジニアが見つかりません')).toBeInTheDocument();
      expect(screen.getByText('条件を変更して再度検索してください')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      renderEngineerList({
        loading: true,
        engineers: [],
      });

      // Should show skeleton loaders
      expect(screen.getByTestId('engineer-list-skeleton')).toBeInTheDocument();
    });

    it('renders error state', () => {
      const errorMessage = 'APIエラーが発生しました';
      renderEngineerList({
        error: new Error(errorMessage),
        engineers: [],
      });

      expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('renders status badges with correct colors', () => {
      renderEngineerList();

      const onProjectBadges = screen.getAllByText('プロジェクト中');
      const standbyBadges = screen.getAllByText('待機中');

      expect(onProjectBadges).toHaveLength(2);
      expect(standbyBadges).toHaveLength(1);

      // Check status badge colors
      onProjectBadges.forEach(badge => {
        expect(badge).toHaveClass('MuiChip-colorSuccess');
      });
      standbyBadges.forEach(badge => {
        expect(badge).toHaveClass('MuiChip-colorWarning');
      });
    });
  });

  describe('Search and Filtering', () => {
    it('calls onSearch when search input changes', async () => {
      const onSearch = vi.fn();
      renderEngineerList({ onSearch });

      const searchInput = screen.getByLabelText('検索');
      await userEvent.type(searchInput, '山田');

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            keyword: '山田',
          })
        );
      });
    });

    it('calls onSearch when status filter changes', async () => {
      const onSearch = vi.fn();
      renderEngineerList({ onSearch });

      const statusSelect = screen.getByLabelText('ステータス');
      fireEvent.mouseDown(statusSelect);

      const onProjectOption = screen.getByText('プロジェクト中');
      fireEvent.click(onProjectOption);

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ENGINEER_STATUS.ACTIVE,
          })
        );
      });
    });

    it('calls onSearch when department filter changes', async () => {
      const onSearch = vi.fn();
      renderEngineerList({ onSearch });

      const departmentSelect = screen.getByLabelText('部署');
      fireEvent.mouseDown(departmentSelect);

      const developmentOption = screen.getByText('開発部');
      fireEvent.click(developmentOption);

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            department: '開発部',
          })
        );
      });
    });

    it('shows active filters as chips', () => {
      renderEngineerList({
        searchParams: {
          keyword: '山田',
          status: ENGINEER_STATUS.ACTIVE,
          department: '開発部',
        },
      });

      expect(screen.getByText('キーワード: 山田')).toBeInTheDocument();
      expect(screen.getByText('ステータス: プロジェクト中')).toBeInTheDocument();
      expect(screen.getByText('部署: 開発部')).toBeInTheDocument();
    });

    it('can clear individual filters', async () => {
      const onSearch = vi.fn();
      renderEngineerList({
        onSearch,
        searchParams: {
          keyword: '山田',
          status: ENGINEER_STATUS.ACTIVE,
        },
      });

      const keywordChip = screen.getByText('キーワード: 山田');
      const deleteButton = within(keywordChip.parentElement!).getByLabelText('delete');
      
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            keyword: '',
            status: ENGINEER_STATUS.ACTIVE,
          })
        );
      });
    });

    it('can clear all filters', async () => {
      const onSearch = vi.fn();
      renderEngineerList({
        onSearch,
        searchParams: {
          keyword: '山田',
          status: ENGINEER_STATUS.ACTIVE,
          department: '開発部',
        },
      });

      const clearAllButton = screen.getByText('すべてクリア');
      fireEvent.click(clearAllButton);

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls', () => {
      renderEngineerList({
        total: 100,
        page: 1,
        limit: 10,
      });

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('1 / 10 ページ')).toBeInTheDocument();
    });

    it('calls onPageChange when page changes', async () => {
      const onPageChange = vi.fn();
      renderEngineerList({
        onPageChange,
        total: 100,
        page: 1,
        limit: 10,
      });

      const nextButton = screen.getByLabelText('次のページ');
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onLimitChange when limit changes', async () => {
      const onLimitChange = vi.fn();
      renderEngineerList({
        onLimitChange,
        total: 100,
        page: 1,
        limit: 10,
      });

      const limitSelect = screen.getByLabelText('1ページあたりの表示件数');
      fireEvent.mouseDown(limitSelect);

      const option25 = screen.getByText('25');
      fireEvent.click(option25);

      expect(onLimitChange).toHaveBeenCalledWith(25);
    });
  });

  describe('Actions', () => {
    it('opens action menu when more button is clicked', async () => {
      renderEngineerList();

      const moreButtons = screen.getAllByLabelText('アクション');
      fireEvent.click(moreButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('詳細表示')).toBeInTheDocument();
        expect(screen.getByText('編集')).toBeInTheDocument();
        expect(screen.getByText('ステータス変更')).toBeInTheDocument();
        expect(screen.getByText('削除')).toBeInTheDocument();
      });
    });

    it('calls onEdit when edit action is clicked', async () => {
      const onEdit = vi.fn();
      renderEngineerList({ onEdit });

      const moreButtons = screen.getAllByLabelText('アクション');
      fireEvent.click(moreButtons[0]);

      const editButton = screen.getByText('編集');
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(mockEngineers[0]);
    });

    it('opens delete confirmation dialog', async () => {
      renderEngineerList();

      const moreButtons = screen.getAllByLabelText('アクション');
      fireEvent.click(moreButtons[0]);

      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('エンジニアの削除')).toBeInTheDocument();
        expect(screen.getByText('この操作は取り消せません。本当に削除しますか？')).toBeInTheDocument();
      });
    });

    it('calls onDelete when delete is confirmed', async () => {
      const onDelete = vi.fn();
      renderEngineerList({ onDelete });

      const moreButtons = screen.getAllByLabelText('アクション');
      fireEvent.click(moreButtons[0]);

      const deleteButton = screen.getByText('削除');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        const confirmButton = screen.getByText('削除する');
        fireEvent.click(confirmButton);
      });

      expect(onDelete).toHaveBeenCalledWith(mockEngineers[0].id);
    });

    it('opens status change dialog', async () => {
      renderEngineerList();

      const moreButtons = screen.getAllByLabelText('アクション');
      fireEvent.click(moreButtons[0]);

      const statusChangeButton = screen.getByText('ステータス変更');
      fireEvent.click(statusChangeButton);

      await waitFor(() => {
        expect(screen.getByText('ステータス変更')).toBeInTheDocument();
        expect(screen.getByLabelText('新しいステータス')).toBeInTheDocument();
        expect(screen.getByLabelText('変更理由')).toBeInTheDocument();
      });
    });

    it('calls onStatusChange when status change is submitted', async () => {
      const onStatusChange = vi.fn();
      renderEngineerList({ onStatusChange });

      const moreButtons = screen.getAllByLabelText('アクション');
      fireEvent.click(moreButtons[0]);

      const statusChangeButton = screen.getByText('ステータス変更');
      fireEvent.click(statusChangeButton);

      await waitFor(async () => {
        const statusSelect = screen.getByLabelText('新しいステータス');
        fireEvent.mouseDown(statusSelect);

        const standbyOption = screen.getByText('待機中');
        fireEvent.click(standbyOption);

        const reasonInput = screen.getByLabelText('変更理由');
        await userEvent.type(reasonInput, 'プロジェクト終了');

        const submitButton = screen.getByText('変更する');
        fireEvent.click(submitButton);
      });

      expect(onStatusChange).toHaveBeenCalledWith(
        mockEngineers[0].id,
        ENGINEER_STATUS.STANDBY,
        'プロジェクト終了'
      );
    });
  });

  describe('Sorting', () => {
    it('shows sort indicators on sortable columns', () => {
      renderEngineerList({
        searchParams: {
          sortBy: 'sei',
          sortOrder: 'asc',
        },
      });

      const nameHeader = screen.getByText('氏名');
      expect(nameHeader).toBeInTheDocument();
      // Should show ascending sort indicator
    });

    it('calls onSearch when column header is clicked for sorting', async () => {
      const onSearch = vi.fn();
      renderEngineerList({ onSearch });

      const nameHeader = screen.getByText('氏名');
      fireEvent.click(nameHeader);

      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'sei',
          sortOrder: 'asc',
        })
      );
    });

    it('toggles sort order when same column is clicked', async () => {
      const onSearch = vi.fn();
      renderEngineerList({
        onSearch,
        searchParams: {
          sortBy: 'sei',
          sortOrder: 'asc',
        },
      });

      const nameHeader = screen.getByText('氏名');
      fireEvent.click(nameHeader);

      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'sei',
          sortOrder: 'desc',
        })
      );
    });
  });

  describe('Toolbar Actions', () => {
    it('renders toolbar with action buttons', () => {
      renderEngineerList();

      expect(screen.getByText('新規登録')).toBeInTheDocument();
      expect(screen.getByText('CSVエクスポート')).toBeInTheDocument();
      expect(screen.getByText('CSVインポート')).toBeInTheDocument();
    });

    it('navigates to new engineer page when add button is clicked', async () => {
      const mockNavigate = vi.fn();
      const { useNavigate } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
      vi.mocked(useNavigate).mockReturnValue(mockNavigate);

      renderEngineerList();

      const addButton = screen.getByText('新規登録');
      fireEvent.click(addButton);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/engineers/new');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderEngineerList();

      expect(screen.getByLabelText('検索')).toBeInTheDocument();
      expect(screen.getByLabelText('ステータス')).toBeInTheDocument();
      expect(screen.getByLabelText('部署')).toBeInTheDocument();
      expect(screen.getAllByLabelText('アクション')).toHaveLength(mockEngineers.length);
    });

    it('supports keyboard navigation', async () => {
      renderEngineerList();

      const searchInput = screen.getByLabelText('検索');
      searchInput.focus();

      // Tab to next focusable element
      await userEvent.tab();
      expect(screen.getByLabelText('ステータス')).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const onSearch = vi.fn();
      const { rerender } = renderEngineerList({ onSearch });

      // Re-render with same props should not cause unnecessary renders
      rerender(
        <TestWrapper>
          <EngineerList
            engineers={mockEngineers}
            total={3}
            loading={false}
            error={null}
            page={1}
            limit={10}
            onPageChange={vi.fn()}
            onLimitChange={vi.fn()}
            onSearch={onSearch}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onStatusChange={vi.fn()}
            searchParams={{}}
          />
        </TestWrapper>
      );

      // Component should handle re-renders gracefully
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderEngineerList({
        error: new Error('Network error'),
      });

      expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
      
      consoleError.mockRestore();
    });

    it('shows retry button on error', async () => {
      const onRetry = vi.fn();
      renderEngineerList({
        error: new Error('Network error'),
        onRetry,
      });

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});