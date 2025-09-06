import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyReportDetail from '@/app/(admin)/admin/engineers/weekly-reports/[id]/page';

// Mocks
const showSuccess = jest.fn();
const showError = jest.fn();
jest.mock('@/components/common/Toast', () => ({
  useToast: () => ({ showSuccess, showError }),
}));

const approveWeeklyReportMock = jest.fn().mockResolvedValue({});
const rejectWeeklyReportMock = jest.fn().mockResolvedValue({});
const returnWeeklyReportMock = jest.fn().mockResolvedValue({});
jest.mock('@/lib/api/admin/weeklyReport', () => ({
  adminWeeklyReportApi: {
    approveWeeklyReport: (...args: any[]) => approveWeeklyReportMock(...args),
    rejectWeeklyReport: (...args: any[]) => rejectWeeklyReportMock(...args),
    returnWeeklyReport: (...args: any[]) => returnWeeklyReportMock(...args),
    commentWeeklyReport: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/hooks/admin/useWeeklyReportsQuery', () => ({
  useWeeklyReportDetailQuery: (_id: string) => ({
    data: {
      id: 'wr-1',
      user_name: 'Taro',
      user_email: 'taro@example.com',
      start_date: '2025-01-06',
      end_date: '2025-01-12',
      status: 'submitted',
      total_work_hours: 40,
      manager_comment: '',
      created_at: '2025-01-06T00:00:00Z',
      daily_records: [],
      work_hours: [],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('Admin WeeklyReport Detail - Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('承認ボタンで承認APIが呼ばれる', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportDetail params={{ id: 'wr-1' }} />);

    const approveBtn = await screen.findByTestId('wr-approve');
    await user.click(approveBtn);

    expect(approveWeeklyReportMock).toHaveBeenCalledWith('wr-1', expect.anything());
    expect(showSuccess).toHaveBeenCalled();
  });

  test('コメントなしで却下を押すとエラートーストが表示される', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportDetail params={{ id: 'wr-1' }} />);

    const rejectBtn = await screen.findByTestId('wr-reject');
    await user.click(rejectBtn);

    expect(rejectWeeklyReportMock).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalled();
  });

  test('差し戻しもコメント必須である', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportDetail params={{ id: 'wr-1' }} />);

    const remandBtn = await screen.findByTestId('wr-remand');
    await user.click(remandBtn);

    expect(returnWeeklyReportMock).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalled();
  });
});

