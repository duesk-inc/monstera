import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeeklyReportListTab } from '@/components/features/weeklyReport/tabs/WeeklyReportListTab';

// Mock Toast
jest.mock('@/components/common/Toast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// Mock API client
const exportWeeklyReportsMock = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/api/admin/weeklyReport', () => ({
  adminWeeklyReportApi: {
    exportWeeklyReports: (...args: any[]) => exportWeeklyReportsMock(...args),
  },
}));

// Mock data hook
jest.mock('@/hooks/admin/useWeeklyReportsQuery', () => ({
  useWeeklyReports: () => ({
    reports: [],
    total: 0,
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

describe('Admin WeeklyReport List - CSV Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CSV形式を選択するとCSVエクスポートAPIが呼ばれる', async () => {
    const user = userEvent.setup();
    render(<WeeklyReportListTab />);

    // エクスポートメニューを開く
    const exportButton = screen.getByText('エクスポート');
    await user.click(exportButton);

    // CSV形式を選択
    const csvItem = await screen.findByText('CSV形式');
    await user.click(csvItem);

    // API呼出し検証（format: csv）
    expect(exportWeeklyReportsMock).toHaveBeenCalledTimes(1);
    expect(exportWeeklyReportsMock).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'csv' })
    );
  });
});

