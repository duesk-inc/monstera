import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyReportDetail from '@/app/(admin)/admin/engineers/weekly-reports/[id]/page';

const showError = jest.fn();
jest.mock('@/components/common/Toast', () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError }),
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

jest.mock('@/lib/api/admin/weeklyReport', () => ({
  adminWeeklyReportApi: {
    approveWeeklyReport: jest.fn().mockResolvedValue({}),
    rejectWeeklyReport: jest.fn().mockRejectedValue({
      response: {
        status: 400,
        data: { code: 'validation_error', message: '入力内容に誤りがあります', errors: { comment: '必須です' } }
      }
    }),
    returnWeeklyReport: jest.fn().mockResolvedValue({}),
    commentWeeklyReport: jest.fn().mockResolvedValue({}),
  },
}));

describe('Admin WeeklyReport Detail - Error UI', () => {
  test('400（validation_error）時にエラートーストが呼ばれる', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportDetail params={{ id: 'wr-1' }} />);

    // コメントを入力して却下押下 → サーバ側400想定
    const editIcon = await screen.findByRole('button'); // 最初の編集ボタン
    await user.click(editIcon);
    const input = await screen.findByPlaceholderText('週報に対するコメントを入力');
    await user.type(input, 'NG');
    const rejectBtn = await screen.findByTestId('wr-reject');
    await user.click(rejectBtn);

    expect(showError).toHaveBeenCalled();
  });
});

