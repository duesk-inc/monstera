import React from 'react';
import { render, screen } from '@testing-library/react';
import { WeeklyReportListTab } from '@/components/features/weeklyReport/tabs/WeeklyReportListTab';

jest.mock('@/components/common/Toast', () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));

jest.mock('@/hooks/admin/useWeeklyReportsQuery', () => ({
  useWeeklyReports: () => ({
    reports: [],
    total: 0,
    loading: false,
    error: new Error('forbidden'),
    refresh: jest.fn(),
  }),
}));

describe('Admin WeeklyReport List - Error UI', () => {
  test('403/エラー時にAlertが表示される', () => {
    render(<WeeklyReportListTab />);
    expect(
      screen.getByText('データの読み込みに失敗しました。')
    ).toBeInTheDocument();
  });
});

