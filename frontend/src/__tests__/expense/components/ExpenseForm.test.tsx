import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm } from '@/components/features/expense/ExpenseForm';
import { customRender } from '../utils';
import { 
  createMockExpenseData, 
  createMockExpenseCategories
} from '../utils/expenseMockData';
import { server } from '../utils/expenseTestHelpers';

// MSWサーバーの起動・停止
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// モックの設定
jest.mock('@/hooks/expense/useCategories', () => ({
  useCategories: () => ({
    categories: createMockExpenseCategories(),
    getCategoryById: (id: string) => createMockExpenseCategories().find(cat => cat.id === id),
    isLoading: false,
  }),
}));

jest.mock('@/hooks/expense/useExpenseSubmit', () => ({
  useExpenseSubmit: () => ({
    createExpense: jest.fn().mockResolvedValue(createMockExpenseData()),
    updateExpense: jest.fn().mockResolvedValue(createMockExpenseData()),
    isCreating: false,
    isUpdating: false,
  }),
}));

jest.mock('@/hooks/common/useEnhancedErrorHandler', () => ({
  useEnhancedErrorHandler: () => ({
    handleSubmissionError: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('ExpenseForm', () => {
  const defaultProps = {
    mode: 'create' as const,
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    test('新規作成モードで正しくレンダリングされる', () => {
      customRender(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText('カテゴリ')).toBeInTheDocument();
      expect(screen.getByLabelText('金額')).toBeInTheDocument();
      expect(screen.getByLabelText('内容')).toBeInTheDocument();
      expect(screen.getByLabelText('日付')).toBeInTheDocument();
      expect(screen.getByText('申請する')).toBeInTheDocument();
    });

    test('編集モードで既存データが表示される', () => {
      const mockExpense = createMockExpenseData();
      customRender(
        <ExpenseForm 
          {...defaultProps} 
          mode="edit" 
          expense={mockExpense} 
        />
      );
      
      const amountInput = screen.getByLabelText('金額') as HTMLInputElement;
      expect(amountInput.value).toBe(mockExpense.amount.toString());
      
      const descriptionInput = screen.getByLabelText('内容') as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe(mockExpense.description);
    });

    test('必須項目にアスタリスクが表示される', () => {
      customRender(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByText('カテゴリ *')).toBeInTheDocument();
      expect(screen.getByText('金額 *')).toBeInTheDocument();
      expect(screen.getByText('内容 *')).toBeInTheDocument();
      expect(screen.getByText('日付 *')).toBeInTheDocument();
    });
  });

  describe('フォーム入力', () => {
    test('カテゴリ選択ができる', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const categorySelect = screen.getByLabelText('カテゴリ');
      await user.click(categorySelect);
      
      const transportOption = screen.getByText('交通費');
      await user.click(transportOption);
      
      expect(categorySelect).toHaveValue('1');
    });

    test('金額入力ができる', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const amountInput = screen.getByLabelText('金額');
      await user.clear(amountInput);
      await user.type(amountInput, '1500');
      
      expect(amountInput).toHaveValue(1500);
    });

    test('内容入力ができる', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const descriptionInput = screen.getByLabelText('内容');
      const testDescription = '電車賃（新宿-渋谷）';
      await user.type(descriptionInput, testDescription);
      
      expect(descriptionInput).toHaveValue(testDescription);
    });

    test('日付選択ができる', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const dateInput = screen.getByLabelText('日付');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-01-15');
      
      expect(dateInput).toHaveValue('2024-01-15');
    });
  });

  describe('バリデーション', () => {
    test('必須項目が空の場合にエラーが表示される', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const submitButton = screen.getByText('申請する');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('カテゴリを選択してください')).toBeInTheDocument();
        expect(screen.getByText('金額を入力してください')).toBeInTheDocument();
        expect(screen.getByText('内容を入力してください')).toBeInTheDocument();
      });
    });

    test('金額の最小値チェックが動作する', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const amountInput = screen.getByLabelText('金額');
      await user.clear(amountInput);
      await user.type(amountInput, '0');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('金額を入力してください')).toBeInTheDocument();
      });
    });

    test('金額の最大値チェックが動作する', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const amountInput = screen.getByLabelText('金額');
      await user.clear(amountInput);
      await user.type(amountInput, '1000001');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/円以下で入力してください/)).toBeInTheDocument();
      });
    });

    test('未来の日付が選択できない', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const dateInput = screen.getByLabelText('日付');
      await user.clear(dateInput);
      await user.type(dateInput, tomorrowStr);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('未来の日付は選択できません')).toBeInTheDocument();
      });
    });

    test('内容の文字数制限チェックが動作する', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const longDescription = 'あ'.repeat(501);
      const descriptionInput = screen.getByLabelText('内容');
      await user.type(descriptionInput, longDescription);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/文字以内で入力してください/)).toBeInTheDocument();
      });
    });
  });

  describe('領収書アップロード', () => {
    test('高額申請時に領収書が必須になる', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      // カテゴリ選択
      const categorySelect = screen.getByLabelText('カテゴリ');
      await user.click(categorySelect);
      await user.click(screen.getByText('交通費'));
      
      // 高額を入力
      const amountInput = screen.getByLabelText('金額');
      await user.clear(amountInput);
      await user.type(amountInput, '15000');
      
      // 内容入力
      const descriptionInput = screen.getByLabelText('内容');
      await user.type(descriptionInput, 'タクシー代');
      
      // 提出ボタンクリック
      const submitButton = screen.getByText('申請する');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/円以上の申請には領収書が必要です/)).toBeInTheDocument();
      });
    });

    test('領収書アップロードコンポーネントが表示される', () => {
      customRender(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByText('領収書')).toBeInTheDocument();
    });
  });

  describe('フォーム送信', () => {
    test('有効なデータで新規作成が成功する', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      customRender(<ExpenseForm {...defaultProps} onSuccess={onSuccess} />);
      
      // フォーム入力
      const categorySelect = screen.getByLabelText('カテゴリ');
      await user.click(categorySelect);
      await user.click(screen.getByText('交通費'));
      
      const amountInput = screen.getByLabelText('金額');
      await user.clear(amountInput);
      await user.type(amountInput, '500');
      
      const descriptionInput = screen.getByLabelText('内容');
      await user.type(descriptionInput, '電車賃');
      
      // 提出ボタンクリック
      const submitButton = screen.getByText('申請する');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

  });

  describe('アクセシビリティ', () => {
    test('フォーム要素に適切なlabel属性が設定されている', () => {
      customRender(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText('カテゴリ')).toBeInTheDocument();
      expect(screen.getByLabelText('金額')).toBeInTheDocument();
      expect(screen.getByLabelText('内容')).toBeInTheDocument();
      expect(screen.getByLabelText('日付')).toBeInTheDocument();
    });

    test('エラーメッセージがrole="alert"を持つ', async () => {
      const user = userEvent.setup();
      customRender(<ExpenseForm {...defaultProps} />);
      
      const submitButton = screen.getByText('申請する');
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorElements = screen.getAllByRole('alert');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    test('必須項目がaria-required="true"を持つ', () => {
      customRender(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText('カテゴリ')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('金額')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('内容')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('日付')).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('エッジケース', () => {
    test('カテゴリ読み込み中の表示', () => {
      // カテゴリ読み込み中のモック
      jest.doMock('@/hooks/expense/useCategories', () => ({
        useCategories: () => ({
          categories: [],
          getCategoryById: () => null,
          isLoading: true,
        }),
      }));
      
      customRender(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText('カテゴリ')).toBeDisabled();
    });

    test('送信中の状態でボタンが無効化される', () => {
      // 送信中のモック
      jest.doMock('@/hooks/expense/useExpenseSubmit', () => ({
        useExpenseSubmit: () => ({
          createExpense: jest.fn(),
          updateExpense: jest.fn(),
          isCreating: true,
          isUpdating: false,
        }),
      }));
      
      customRender(<ExpenseForm {...defaultProps} />);
      
      const submitButton = screen.getByText('申請する');
      expect(submitButton).toBeDisabled();
    });

    test('キャンセル処理が動作する', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();
      customRender(<ExpenseForm {...defaultProps} onCancel={onCancel} />);
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('統合テスト', () => {
    test('完全な申請フローが動作する', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      customRender(<ExpenseForm {...defaultProps} onSuccess={onSuccess} />);
      
      // 全フィールドを入力
      const categorySelect = screen.getByLabelText('カテゴリ');
      await user.click(categorySelect);
      await user.click(screen.getByText('交通費'));
      
      const amountInput = screen.getByLabelText('金額');
      await user.clear(amountInput);
      await user.type(amountInput, '1200');
      
      const descriptionInput = screen.getByLabelText('内容');
      await user.type(descriptionInput, '電車賃（往復）');
      
      const dateInput = screen.getByLabelText('日付');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-01-10');
      
      // 提出
      const submitButton = screen.getByText('申請する');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});