// Mock hooks for testing

export const useToast = jest.fn(() => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  showWarning: jest.fn(),
}));

export const useEnhancedErrorHandler = jest.fn(() => ({
  handleApiError: jest.fn(),
  handleSubmissionError: jest.fn(),
}));

export const useWeeklyReport = jest.fn(() => ({
  report: {
    id: 'test-id',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07'),
    mood: 3,
    weeklyRemarks: '',
    status: 'draft',
    dailyRecords: [],
    workplaceChangeRequested: false,
  },
  loading: false,
  errors: {},
  totalHours: 0,
  clientTotalHours: 0,
  handleSaveDraft: jest.fn(),
  handleSubmit: jest.fn(),
  validateForm: jest.fn(() => true),
}));

export const useDefaultWorkSettings = jest.fn(() => ({
  defaultSettings: {
    weekdayStartTime: '09:00',
    weekdayEndTime: '18:00',
    weekdayBreakTime: 1,
    weekdaySettings: {},
  },
  loading: false,
  handleSaveSettings: jest.fn(),
}));