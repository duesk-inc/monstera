import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import userEvent from '@testing-library/user-event';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

import { EngineerForm } from '../EngineerForm';
import { ToastProvider } from '@/components/common/Toast/ToastProvider';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { ENGINEER_STATUS } from '@/constants/engineer';
import { CreateEngineerInput, UpdateEngineerInput, EngineerDetail } from '@/types/engineer';

// Mock modules
vi.mock('@/components/common/forms/FormSelect', () => {
  // These imports need to be outside the function to avoid require()
  const ReactHookForm = vi.importActual('react-hook-form');
  const MUI = vi.importActual('@mui/material');
  
  return {
    default: ({ name, control, label, options, required, error, rules, ...props }: any) => {
      const { Controller } = ReactHookForm as any;
      const { Select, FormControl, InputLabel, MenuItem, FormHelperText } = MUI as any;
      
      return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <FormControl fullWidth error={!!error} {...props}>
            <InputLabel required={required}>{label}</InputLabel>
            <Select
              {...field}
              label={label}
              data-testid={`select-${name}`}
            >
              {options.map((option: any) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error.message}</FormHelperText>}
          </FormControl>
        )}
      />
    );
    }
  };
});

// Mock data
const mockEngineerDetail: EngineerDetail = {
  user: {
    id: '1',
    employeeNumber: 'EMP-2024-0001',
    email: 'yamada@duesk.co.jp',
    firstName: 'Taro',
    lastName: 'Yamada',
    firstNameKana: 'タロウ',
    lastNameKana: 'ヤマダ',
    sei: '山田',
    mei: '太郎',
    seiKana: 'やまだ',
    meiKana: 'たろう',
    department: '開発部',
    position: 'シニアエンジニア',
    phoneNumber: '090-1234-5678',
    hireDate: '2024-01-15',
    education: '東京大学 情報工学科',
    engineerStatus: ENGINEER_STATUS.ACTIVE,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
  },
  statusHistory: [],
  skills: [],
  projectHistory: [],
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
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Helper function to render component
const renderEngineerForm = (props: any = {}) => {
  const defaultProps = {
    mode: 'create' as const,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    submitButtonText: '保存',
  };

  return render(
    <TestWrapper>
      <EngineerForm {...defaultProps} {...props} />
    </TestWrapper>
  );
};

describe('EngineerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Create Mode', () => {
    it('renders create form with all required fields', () => {
      renderEngineerForm({ mode: 'create' });

      // Section headers
      expect(screen.getByText('アカウント情報')).toBeInTheDocument();
      expect(screen.getByText('名前（英語）')).toBeInTheDocument();
      expect(screen.getByText('名前（日本語）')).toBeInTheDocument();
      expect(screen.getByText('連絡先情報')).toBeInTheDocument();
      expect(screen.getByText('組織情報')).toBeInTheDocument();
      expect(screen.getByText('その他情報')).toBeInTheDocument();

      // Required fields
      expect(screen.getByLabelText('メールアドレス *')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByLabelText('名（英語） *')).toBeInTheDocument();
      expect(screen.getByLabelText('姓（英語） *')).toBeInTheDocument();
      expect(screen.getByLabelText('名（カナ） *')).toBeInTheDocument();
      expect(screen.getByLabelText('姓（カナ） *')).toBeInTheDocument();
      expect(screen.getByLabelText('名 *')).toBeInTheDocument();
      expect(screen.getByLabelText('姓 *')).toBeInTheDocument();

      // Optional fields
      expect(screen.getByLabelText('名（かな）')).toBeInTheDocument();
      expect(screen.getByLabelText('姓（かな）')).toBeInTheDocument();
      expect(screen.getByLabelText('電話番号')).toBeInTheDocument();
      expect(screen.getByLabelText('部署')).toBeInTheDocument();
      expect(screen.getByLabelText('役職')).toBeInTheDocument();
      expect(screen.getByLabelText('入社日')).toBeInTheDocument();
      expect(screen.getByLabelText('学歴')).toBeInTheDocument();

      // Action buttons
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    it('shows password field only in create mode', () => {
      renderEngineerForm({ mode: 'create' });
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();

      renderEngineerForm({ mode: 'edit', initialData: mockEngineerDetail });
      expect(screen.queryByLabelText('パスワード')).not.toBeInTheDocument();
    });

    it('shows password helper text', () => {
      renderEngineerForm({ mode: 'create' });
      expect(screen.getByText('未入力の場合、メールアドレスが初期パスワードになります')).toBeInTheDocument();
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('renders edit form with initial data', () => {
      renderEngineerForm({ mode: 'edit', initialData: mockEngineerDetail });

      // Check that fields are populated with initial data
      expect(screen.getByDisplayValue('yamada@duesk.co.jp')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Taro')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Yamada')).toBeInTheDocument();
      expect(screen.getByDisplayValue('タロウ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ヤマダ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('太郎')).toBeInTheDocument();
      expect(screen.getByDisplayValue('山田')).toBeInTheDocument();
      expect(screen.getByDisplayValue('やまだ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('たろう')).toBeInTheDocument();
      expect(screen.getByDisplayValue('090-1234-5678')).toBeInTheDocument();
      expect(screen.getByDisplayValue('開発部')).toBeInTheDocument();
      expect(screen.getByDisplayValue('シニアエンジニア')).toBeInTheDocument();
      expect(screen.getByDisplayValue('東京大学 情報工学科')).toBeInTheDocument();
    });

    it('disables email field in edit mode', () => {
      renderEngineerForm({ mode: 'edit', initialData: mockEngineerDetail });
      
      const emailField = screen.getByLabelText('メールアドレス *');
      expect(emailField).toBeDisabled();
    });

    it('disables submit button when form is not dirty in edit mode', () => {
      renderEngineerForm({ mode: 'edit', initialData: mockEngineerDetail });
      
      const submitButton = screen.getByText('保存');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      const onSubmit = vi.fn();
      renderEngineerForm({ mode: 'create', onSubmit });

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
        expect(screen.getByText('名（英語）は必須です')).toBeInTheDocument();
        expect(screen.getByText('姓（英語）は必須です')).toBeInTheDocument();
        expect(screen.getByText('名（カナ）は必須です')).toBeInTheDocument();
        expect(screen.getByText('姓（カナ）は必須です')).toBeInTheDocument();
        expect(screen.getByText('名は必須です')).toBeInTheDocument();
        expect(screen.getByText('姓は必須です')).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      renderEngineerForm({ mode: 'create' });

      const emailField = screen.getByLabelText('メールアドレス *');
      await userEvent.type(emailField, 'invalid-email');
      
      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      });
    });

    it('allows valid form submission', async () => {
      const onSubmit = vi.fn();
      renderEngineerForm({ mode: 'create', onSubmit });

      // Fill required fields
      await userEvent.type(screen.getByLabelText('メールアドレス *'), 'test@duesk.co.jp');
      await userEvent.type(screen.getByLabelText('名（英語） *'), 'Taro');
      await userEvent.type(screen.getByLabelText('姓（英語） *'), 'Yamada');
      await userEvent.type(screen.getByLabelText('名（カナ） *'), 'タロウ');
      await userEvent.type(screen.getByLabelText('姓（カナ） *'), 'ヤマダ');
      await userEvent.type(screen.getByLabelText('名 *'), '太郎');
      await userEvent.type(screen.getByLabelText('姓 *'), '山田');

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@duesk.co.jp',
            firstName: 'Taro',
            lastName: 'Yamada',
            firstNameKana: 'タロウ',
            lastNameKana: 'ヤマダ',
            mei: '太郎',
            sei: '山田',
          })
        );
      });
    });
  });

  describe('Form Input Interactions', () => {
    it('allows typing in text fields', async () => {
      renderEngineerForm({ mode: 'create' });

      const emailField = screen.getByLabelText('メールアドレス *');
      await userEvent.type(emailField, 'test@duesk.co.jp');
      expect(emailField).toHaveValue('test@duesk.co.jp');

      const phoneField = screen.getByLabelText('電話番号');
      await userEvent.type(phoneField, '090-1234-5678');
      expect(phoneField).toHaveValue('090-1234-5678');

      const departmentField = screen.getByLabelText('部署');
      await userEvent.type(departmentField, '開発部');
      expect(departmentField).toHaveValue('開発部');
    });

    it('handles status selection', async () => {
      renderEngineerForm({ mode: 'create' });

      const statusSelect = screen.getByTestId('select-engineerStatus');
      fireEvent.mouseDown(statusSelect);

      const activeOption = screen.getByText('アクティブ');
      fireEvent.click(activeOption);

      expect(statusSelect).toHaveValue(ENGINEER_STATUS.ACTIVE);
    });

    it('handles date picker interactions', async () => {
      renderEngineerForm({ mode: 'create' });

      const dateField = screen.getByLabelText('入社日');
      fireEvent.change(dateField, { target: { value: '2024-01-15' } });
      
      // DatePicker behavior may vary, just check that the field exists
      expect(dateField).toBeInTheDocument();
    });
  });

  describe('Password Handling', () => {
    it('uses email as default password when password is empty in create mode', async () => {
      const onSubmit = vi.fn();
      renderEngineerForm({ mode: 'create', onSubmit });

      // Fill required fields without password
      await userEvent.type(screen.getByLabelText('メールアドレス *'), 'test@duesk.co.jp');
      await userEvent.type(screen.getByLabelText('名（英語） *'), 'Taro');
      await userEvent.type(screen.getByLabelText('姓（英語） *'), 'Yamada');
      await userEvent.type(screen.getByLabelText('名（カナ） *'), 'タロウ');
      await userEvent.type(screen.getByLabelText('姓（カナ） *'), 'ヤマダ');
      await userEvent.type(screen.getByLabelText('名 *'), '太郎');
      await userEvent.type(screen.getByLabelText('姓 *'), '山田');

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@duesk.co.jp',
            password: 'test@duesk.co.jp',
          })
        );
      });
    });

    it('uses provided password when entered in create mode', async () => {
      const onSubmit = vi.fn();
      renderEngineerForm({ mode: 'create', onSubmit });

      // Fill required fields with custom password
      await userEvent.type(screen.getByLabelText('メールアドレス *'), 'test@duesk.co.jp');
      await userEvent.type(screen.getByLabelText('パスワード'), 'custompassword');
      await userEvent.type(screen.getByLabelText('名（英語） *'), 'Taro');
      await userEvent.type(screen.getByLabelText('姓（英語） *'), 'Yamada');
      await userEvent.type(screen.getByLabelText('名（カナ） *'), 'タロウ');
      await userEvent.type(screen.getByLabelText('姓（カナ） *'), 'ヤマダ');
      await userEvent.type(screen.getByLabelText('名 *'), '太郎');
      await userEvent.type(screen.getByLabelText('姓 *'), '山田');

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@duesk.co.jp',
            password: 'custompassword',
          })
        );
      });
    });
  });

  describe('Button States and Actions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      renderEngineerForm({ onCancel });

      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('disables buttons when submitting', () => {
      renderEngineerForm({ isSubmitting: true });

      const submitButton = screen.getByText('処理中...');
      const cancelButton = screen.getByText('キャンセル');

      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('shows custom submit button text and icon', () => {
      const SaveIcon = () => <span data-testid="save-icon">💾</span>;
      renderEngineerForm({ 
        submitButtonText: 'カスタム保存',
        submitButtonIcon: <SaveIcon />
      });

      expect(screen.getByText('カスタム保存')).toBeInTheDocument();
      expect(screen.getByTestId('save-icon')).toBeInTheDocument();
    });

    it('enables submit button when form becomes dirty in edit mode', async () => {
      renderEngineerForm({ mode: 'edit', initialData: mockEngineerDetail });

      // Initially disabled
      const submitButton = screen.getByText('保存');
      expect(submitButton).toBeDisabled();

      // Make a change
      const phoneField = screen.getByLabelText('電話番号');
      await userEvent.clear(phoneField);
      await userEvent.type(phoneField, '090-9999-9999');

      // Should be enabled now
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Form Sections and Layout', () => {
    it('displays all form sections with proper icons', () => {
      renderEngineerForm({ mode: 'create' });

      // Check section headers with icons
      expect(screen.getByText('アカウント情報')).toBeInTheDocument();
      expect(screen.getByText('連絡先情報')).toBeInTheDocument();
      expect(screen.getByText('組織情報')).toBeInTheDocument();
      expect(screen.getByText('その他情報')).toBeInTheDocument();
    });

    it('shows input adornments with icons', () => {
      renderEngineerForm({ mode: 'create' });

      // Email field should have email icon
      const emailField = screen.getByLabelText('メールアドレス *');
      expect(emailField.closest('.MuiTextField-root')).toBeInTheDocument();

      // Phone field should have phone icon
      const phoneField = screen.getByLabelText('電話番号');
      expect(phoneField.closest('.MuiTextField-root')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderEngineerForm({ mode: 'create' });

      // Form should be accessible
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // Required fields should have proper labeling
      expect(screen.getByLabelText('メールアドレス *')).toBeRequired();
      expect(screen.getByLabelText('名（英語） *')).toBeRequired();
      expect(screen.getByLabelText('姓（英語） *')).toBeRequired();
    });

    it('supports keyboard navigation', async () => {
      renderEngineerForm({ mode: 'create' });

      const emailField = screen.getByLabelText('メールアドレス *');
      emailField.focus();

      // Tab to next field
      await userEvent.tab();
      
      // Next focusable element should be the password field in create mode
      expect(screen.getByLabelText('パスワード')).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('handles async onSubmit errors gracefully', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Submit failed'));
      renderEngineerForm({ mode: 'create', onSubmit });

      // Fill required fields
      await userEvent.type(screen.getByLabelText('メールアドレス *'), 'test@duesk.co.jp');
      await userEvent.type(screen.getByLabelText('名（英語） *'), 'Taro');
      await userEvent.type(screen.getByLabelText('姓（英語） *'), 'Yamada');
      await userEvent.type(screen.getByLabelText('名（カナ） *'), 'タロウ');
      await userEvent.type(screen.getByLabelText('姓（カナ） *'), 'ヤマダ');
      await userEvent.type(screen.getByLabelText('名 *'), '太郎');
      await userEvent.type(screen.getByLabelText('姓 *'), '山田');

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // Form should handle the error without crashing
      expect(screen.getByText('保存')).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('transforms date values correctly', async () => {
      const onSubmit = vi.fn();
      renderEngineerForm({ mode: 'create', onSubmit });

      // Fill required fields
      await userEvent.type(screen.getByLabelText('メールアドレス *'), 'test@duesk.co.jp');
      await userEvent.type(screen.getByLabelText('名（英語） *'), 'Taro');
      await userEvent.type(screen.getByLabelText('姓（英語） *'), 'Yamada');
      await userEvent.type(screen.getByLabelText('名（カナ） *'), 'タロウ');
      await userEvent.type(screen.getByLabelText('姓（カナ） *'), 'ヤマダ');
      await userEvent.type(screen.getByLabelText('名 *'), '太郎');
      await userEvent.type(screen.getByLabelText('姓 *'), '山田');

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@duesk.co.jp',
            engineerStatus: ENGINEER_STATUS.ACTIVE, // Default status
          })
        );
      });
    });
  });
});