import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/__mocks__/theme';

// Create a test query client with shorter retry delays
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress error logs in tests
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const [queryClient] = React.useState(() => createTestQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Test utilities for weekly reports
export const mockWeeklyReport = {
  id: 'test-weekly-report-id',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-07'),
  mood: 3,
  weeklyRemarks: 'Test weekly remarks',
  status: 'draft' as const,
  totalWorkHours: 40,
  clientTotalWorkHours: 40,
  workplaceChangeRequested: false,
  dailyRecords: [
    {
      date: '2024-01-01',
      startTime: '09:00',
      endTime: '18:00',
      breakTime: 1,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
    {
      date: '2024-01-02',
      startTime: '09:00',
      endTime: '18:00',
      breakTime: 1,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
    {
      date: '2024-01-03',
      startTime: '09:00',
      endTime: '18:00',
      breakTime: 1,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
    {
      date: '2024-01-04',
      startTime: '09:00',
      endTime: '18:00',
      breakTime: 1,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
    {
      date: '2024-01-05',
      startTime: '09:00',
      endTime: '18:00',
      breakTime: 1,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
    {
      date: '2024-01-06',
      startTime: '',
      endTime: '',
      breakTime: 0,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
    {
      date: '2024-01-07',
      startTime: '',
      endTime: '',
      breakTime: 0,
      clientStartTime: '',
      clientEndTime: '',
      clientBreakTime: 0,
      clientWorkHours: 0,
      hasClientWork: false,
      remarks: '',
      isHolidayWork: false,
    },
  ],
};

export const mockDefaultSettings = {
  weekdayStartTime: '09:00',
  weekdayEndTime: '18:00',
  weekdayBreakTime: 1,
  weekdaySettings: {},
};

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@duesk.co.jp',
  firstName: 'Test',
  lastName: 'User',
  role: 4, // employee
  departmentId: 'test-department-id',
};

// Helper function to wait for async operations
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));