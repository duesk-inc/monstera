import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@/test/utils';
import { UnsubmittedManagementTab } from './UnsubmittedManagementTab';
import { useUnsubmittedReports } from '@/hooks/admin/useUnsubmittedReports';
import { useToast } from '@/components/common/Toast';
import * as exportUtils from '@/utils/exportUtils';

// Mock the hooks
jest.mock('@/hooks/admin/useUnsubmittedReports');
jest.mock('@/components/common/Toast');
jest.mock('@/utils/exportUtils');

const mockUseUnsubmittedReports = useUnsubmittedReports as jest.MockedFunction<typeof useUnsubmittedReports>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('UnsubmittedManagementTab', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockRefresh = jest.fn();
  const mockSendReminders = jest.fn();

  const mockReports = [
    {
      id: '1',
      user_id: 'user1',
      user_name: '山田太郎',
      user_email: 'yamada@duesk.co.jp',
      department: '開発部',
      manager_name: '鈴木一郎',
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      days_overdue: 5,
      reminder_sent_at: undefined,
      reminder_count: 0,
    },
    {
      id: '2',
      user_id: 'user2',
      user_name: '佐藤花子',
      user_email: 'sato@duesk.co.jp',
      department: '営業部',
      manager_name: '田中次郎',
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      days_overdue: 10,
      reminder_sent_at: '2024-01-10T10:00:00Z',
      reminder_count: 2,
    },
    {
      id: '3',
      user_id: 'user3',
      user_name: '高橋健太',
      user_email: 'takahashi@duesk.co.jp',
      department: '開発部',
      manager_name: '鈴木一郎',
      start_date: '2023-12-25',
      end_date: '2023-12-31',
      days_overdue: 20,
      reminder_sent_at: '2024-01-05T14:30:00Z',
      reminder_count: 3,
    },
  ];

  const mockSummary = {
    total_unsubmitted: 3,
    overdue_7days: 2,
    overdue_14days: 1,
    escalation_targets: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showInfo: jest.fn(),
      showWarning: jest.fn(),
    });

    mockUseUnsubmittedReports.mockReturnValue({
      reports: mockReports,
      summary: mockSummary,
      loading: false,
      error: null,
      refresh: mockRefresh,
      sendReminders: mockSendReminders,
      total: 3,
      sendingReminders: false,
    });
  });

  describe('レンダリング', () => {
    it('コンポーネントが正しくレンダリングされること', () => {
      render(<UnsubmittedManagementTab />);
      
      expect(screen.getByTestId('unsubmitted-management-tab')).toBeInTheDocument();
    });

    it('サマリーカードが正しく表示されること', () => {
      render(<UnsubmittedManagementTab />);
      
      const totalCard = screen.getByTestId('unsubmitted-total-card');
      expect(within(totalCard).getByText('3')).toBeInTheDocument();
      
      const overdue7Card = screen.getByTestId('overdue-7days-card');
      expect(within(overdue7Card).getByText('2')).toBeInTheDocument();
      
      const overdue14Card = screen.getByTestId('overdue-14days-card');
      expect(within(overdue14Card).getByText('1')).toBeInTheDocument();
      
      const escalationCard = screen.getByTestId('escalation-targets-card');
      expect(within(escalationCard).getByText('1')).toBeInTheDocument();
    });

    it('未提出者のデータが正しく表示されること', () => {
      render(<UnsubmittedManagementTab />);
      
      // ユーザー名の確認
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
      expect(screen.getByText('高橋健太')).toBeInTheDocument();
      
      // 部署の確認
      const departments = screen.getAllByTestId('user-department');
      expect(departments[0]).toHaveTextContent('開発部');
      expect(departments[1]).toHaveTextContent('営業部');
      
      // マネージャーの確認
      const managers = screen.getAllByTestId('manager-name');
      expect(managers[0]).toHaveTextContent('鈴木一郎');
      expect(managers[1]).toHaveTextContent('田中次郎');
    });

    it('経過日数に応じて適切なChipが表示されること', () => {
      render(<UnsubmittedManagementTab />);
      
      const chips = screen.getAllByTestId('days-overdue-chip');
      
      // 5日経過 - info
      expect(chips[0]).toHaveTextContent('5日');
      expect(chips[0]).toHaveAttribute('data-severity', 'info');
      
      // 10日経過 - warning
      expect(chips[1]).toHaveTextContent('10日');
      expect(chips[1]).toHaveAttribute('data-severity', 'warning');
      
      // 20日経過 - error with warning icon
      expect(chips[2]).toHaveTextContent('20日');
      expect(chips[2]).toHaveAttribute('data-severity', 'error');
    });

    it('リマインドステータスが正しく表示されること', () => {
      render(<UnsubmittedManagementTab />);
      
      const reminderStatuses = screen.getAllByTestId('reminder-status');
      
      // 未送信
      expect(reminderStatuses[0]).toHaveTextContent('未送信');
      
      // 2回送信
      expect(reminderStatuses[1]).toHaveTextContent('2回送信');
      
      // 3回送信
      expect(reminderStatuses[2]).toHaveTextContent('3回送信');
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はプログレスバーが表示されること', () => {
      mockUseUnsubmittedReports.mockReturnValue({
        reports: [],
        summary: null,
        loading: true,
        error: null,
        refresh: mockRefresh,
        sendReminders: mockSendReminders,
        total: 0,
        sendingReminders: false,
      });

      render(<UnsubmittedManagementTab />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('エラーが発生した場合、データは空の配列として扱われること', () => {
      mockUseUnsubmittedReports.mockReturnValue({
        reports: [],
        summary: null,
        loading: false,
        error: new Error('Failed to fetch'),
        refresh: mockRefresh,
        sendReminders: mockSendReminders,
        total: 0,
        sendingReminders: false,
      });

      render(<UnsubmittedManagementTab />);
      
      expect(screen.getByText('未提出者はいません')).toBeInTheDocument();
    });
  });

  describe('個別リマインド送信', () => {
    it('送信ボタンをクリックするとリマインドが送信されること', async () => {
      mockSendReminders.mockResolvedValue(undefined);
      
      render(<UnsubmittedManagementTab />);
      
      const sendButtons = screen.getAllByTestId('send-reminder-button');
      fireEvent.click(sendButtons[0]);
      
      await waitFor(() => {
        expect(mockSendReminders).toHaveBeenCalledWith(['1']);
        expect(mockShowSuccess).toHaveBeenCalledWith('リマインドを送信しました');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('リマインド送信に失敗した場合、エラーがコンソールに出力されること', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSendReminders.mockRejectedValue(new Error('Send failed'));
      
      render(<UnsubmittedManagementTab />);
      
      const sendButtons = screen.getAllByTestId('send-reminder-button');
      fireEvent.click(sendButtons[0]);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to send reminder:',
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('一括リマインド送信', () => {
    it('複数選択して一括送信ができること', async () => {
      mockSendReminders.mockResolvedValue(undefined);
      
      render(<UnsubmittedManagementTab />);
      
      // チェックボックスを選択
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // 最初のデータ
      fireEvent.click(checkboxes[2]); // 2番目のデータ
      
      // 一括送信ボタンが表示される
      const bulkSendButton = screen.getByTestId('bulk-send-reminder-button');
      expect(bulkSendButton).toBeInTheDocument();
      
      fireEvent.click(bulkSendButton);
      
      // 確認ダイアログが表示される
      expect(screen.getByText('リマインド送信確認')).toBeInTheDocument();
      expect(screen.getByText('選択したエンジニアにリマインドを送信します。')).toBeInTheDocument();
      
      // 送信ボタンをクリック
      const confirmButton = screen.getByText('送信');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockSendReminders).toHaveBeenCalledWith(['1', '2']);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('エクスポート機能', () => {
    beforeEach(() => {
      jest.spyOn(exportUtils, 'exportToCSV').mockImplementation(() => {});
      jest.spyOn(exportUtils, 'exportToExcel').mockResolvedValue(undefined);
      jest.spyOn(exportUtils, 'formatUnsubmittedReportsForExport').mockReturnValue([]);
      jest.spyOn(exportUtils, 'generateExportFilename').mockReturnValue('unsubmitted_reports_20240101');
    });

    it('CSVエクスポートが正しく動作すること', async () => {
      render(<UnsubmittedManagementTab />);
      
      const exportButton = screen.getByTestId('export-button');
      fireEvent.click(exportButton);
      
      // メニューが開く
      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);
      
      await waitFor(() => {
        expect(exportUtils.formatUnsubmittedReportsForExport).toHaveBeenCalledWith(mockReports);
        expect(exportUtils.exportToCSV).toHaveBeenCalled();
        expect(mockShowSuccess).toHaveBeenCalledWith('CSVファイルをダウンロードしました');
      });
    });

    it('Excelエクスポートが正しく動作すること', async () => {
      render(<UnsubmittedManagementTab />);
      
      const exportButton = screen.getByTestId('export-button');
      fireEvent.click(exportButton);
      
      // メニューが開く
      const excelOption = screen.getByText('Excel');
      fireEvent.click(excelOption);
      
      await waitFor(() => {
        expect(exportUtils.formatUnsubmittedReportsForExport).toHaveBeenCalledWith(mockReports);
        expect(exportUtils.exportToExcel).toHaveBeenCalled();
        expect(mockShowSuccess).toHaveBeenCalledWith('Excelファイルをダウンロードしました');
      });
    });

    it('データがない場合はエクスポートできないこと', async () => {
      mockUseUnsubmittedReports.mockReturnValue({
        reports: [],
        summary: mockSummary,
        loading: false,
        error: null,
        refresh: mockRefresh,
        sendReminders: mockSendReminders,
        total: 0,
        sendingReminders: false,
      });

      render(<UnsubmittedManagementTab />);
      
      const exportButton = screen.getByTestId('export-button');
      fireEvent.click(exportButton);
      
      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('エクスポートするデータがありません');
        expect(exportUtils.exportToCSV).not.toHaveBeenCalled();
      });
    });

    it('エクスポートエラー時にエラーメッセージが表示されること', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(exportUtils, 'exportToCSV').mockImplementation(() => {
        throw new Error('Export failed');
      });

      render(<UnsubmittedManagementTab />);
      
      const exportButton = screen.getByTestId('export-button');
      fireEvent.click(exportButton);
      
      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('エクスポートに失敗しました');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Export error:', expect.any(Error));
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('フィルタリング', () => {
    it('部署フィルターが正しく動作すること', async () => {
      render(<UnsubmittedManagementTab />);
      
      const filterSelect = screen.getByLabelText('部署');
      fireEvent.mouseDown(filterSelect);
      
      const developOption = screen.getByText('開発部');
      fireEvent.click(developOption);
      
      await waitFor(() => {
        expect(mockUseUnsubmittedReports).toHaveBeenLastCalledWith(
          expect.objectContaining({
            department_id: 'dept1',
          })
        );
      });
    });

    it('リフレッシュボタンが正しく動作すること', () => {
      render(<UnsubmittedManagementTab />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});