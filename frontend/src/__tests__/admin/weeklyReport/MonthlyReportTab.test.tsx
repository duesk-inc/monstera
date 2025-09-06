import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthlyReportTab } from '@/components/features/weeklyReport/tabs/MonthlyReportTab';

jest.mock('@/hooks/admin/useMonthlySummary', () => ({
  useMonthlySummary: () => ({
    summary: {
      year: 2025,
      month: 1,
      total_users: 10,
      weekly_summaries: [],
      monthly_stats: {
        total_reports: 10,
        submitted_reports: 8,
        overall_submission_rate: 80,
        total_work_hours: 400,
        average_work_hours: 40,
        overtime_reports: 0,
      },
      department_stats: [],
      top_performers: [],
      alert_summary: {
        total_alerts: 0,
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0,
        resolved_alerts: 0,
        pending_alerts: 0,
        alerts_by_type: {},
      },
      comparison_data: {
        previous_month: {
          year: 2024,
          month: 12,
          submission_rate: 75,
          average_work_hours: 38,
          total_reports: 9,
        },
        current_month: {
          year: 2025,
          month: 1,
          submission_rate: 80,
          average_work_hours: 40,
          total_reports: 10,
        },
        changes: {
          submission_rate_change: 5,
          work_hours_change: 2,
          reports_change: 1,
          submission_rate_trend: 'up',
          work_hours_trend: 'up',
        },
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/components/common/Toast', () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));

describe('MonthlyReportTab', () => {
  test('基本要素が表示される', () => {
    render(<MonthlyReportTab />);
    expect(screen.getByText('月次サマリー')).toBeInTheDocument();
    expect(screen.getByText('総エンジニア数')).toBeInTheDocument();
    expect(screen.getByText('提出率')).toBeInTheDocument();
    expect(screen.getByText('平均稼働時間')).toBeInTheDocument();
  });

  test('エクスポートボタンが表示される', async () => {
    const user = userEvent.setup();
    render(<MonthlyReportTab />);
    const exportBtn = screen.getByText('エクスポート');
    expect(exportBtn).toBeInTheDocument();
    await user.click(exportBtn);
    // メニューが開く（CSV形式の項目が表示される）
    expect(await screen.findByText('CSV形式')).toBeInTheDocument();
  });
});

