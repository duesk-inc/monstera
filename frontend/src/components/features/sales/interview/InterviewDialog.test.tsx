import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';
import { InterviewDialog } from './InterviewDialog';
import type { InterviewSchedule, ConflictCheckResult } from '@/types/sales';
import { INTERVIEW_STATUS, MEETING_TYPE } from '@/constants/sales';

// モックデータ
const mockInterview: InterviewSchedule = {
  id: '1',
  proposalId: 'prop1',
  engineerName: '田中太郎',
  clientName: '株式会社ABC',
  scheduledDate: '2024-01-20T10:00:00Z',
  durationMinutes: 60,
  location: '東京オフィス',
  meetingType: 'onsite',
  meetingUrl: '',
  clientAttendees: [
    { name: '山田部長', role: '採用担当', email: 'yamada@abc.com' },
    { name: '佐藤課長', role: 'プロジェクトマネージャー', email: 'sato@abc.com' }
  ],
  engineerAttendees: [
    { name: '田中太郎', email: 'tanaka@test.com' }
  ],
  reminderSettings: {
    enabled: true,
    daysBefore: 1,
    channels: ['email']
  },
  status: 'scheduled',
  notes: 'フロントエンド開発経験を中心に話す',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user1'
};

const mockCompletedInterview: InterviewSchedule = {
  ...mockInterview,
  id: '2',
  status: 'completed',
  interviewResult: '技術面談は問題なく通過。次は現場責任者との面談を予定。',
  nextSteps: '来週中に二次面談の日程調整を行う'
};

const mockConflictResult: ConflictCheckResult = {
  hasConflict: true,
  conflicts: [
    {
      id: '3',
      proposalId: 'prop3',
      engineerName: '鈴木一郎',
      clientName: '株式会社XYZ',
      scheduledDate: '2024-01-20T10:30:00Z',
      durationMinutes: 90,
      meetingType: 'online',
      status: 'scheduled',
      clientAttendees: [],
      engineerAttendees: [],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      createdBy: 'user2'
    }
  ]
};

// テーマの設定
const theme = createTheme();

// ラップコンポーネント
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </LocalizationProvider>
  );
};

describe('InterviewDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnConflictCheck = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示状態', () => {
    it('新規作成モードで正しく表示される', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          proposalId="prop1"
        />
      );

      expect(screen.getByText('面談作成')).toBeInTheDocument();
      expect(screen.getByText('作成')).toBeInTheDocument();
      expect(screen.queryByText('削除')).not.toBeInTheDocument();
    });

    it('編集モードで正しく表示される', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('面談編集')).toBeInTheDocument();
      expect(screen.getByText('更新')).toBeInTheDocument();
      expect(screen.getByText('削除')).toBeInTheDocument();
    });

    it('詳細表示モードで正しく表示される', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockInterview}
          isEdit={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('面談詳細')).toBeInTheDocument();
      expect(screen.queryByText('更新')).not.toBeInTheDocument();
      expect(screen.queryByText('削除')).not.toBeInTheDocument();
    });

    it('面談データが正しくフォームに反映される', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // 基本情報
      expect(screen.getByDisplayValue('60')).toBeInTheDocument(); // 面談時間
      expect(screen.getByDisplayValue('東京オフィス')).toBeInTheDocument();
      expect(screen.getByDisplayValue('フロントエンド開発経験を中心に話す')).toBeInTheDocument();

      // 参加者
      expect(screen.getByText('山田部長 (採用担当)')).toBeInTheDocument();
      expect(screen.getByText('佐藤課長 (プロジェクトマネージャー)')).toBeInTheDocument();
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
    });

    it('完了した面談では結果フィールドが表示される', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockCompletedInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('面談結果')).toBeInTheDocument();
      expect(screen.getByDisplayValue('技術面談は問題なく通過。次は現場責任者との面談を予定。')).toBeInTheDocument();
      expect(screen.getByDisplayValue('来週中に二次面談の日程調整を行う')).toBeInTheDocument();
    });
  });

  describe('面談形式の切り替え', () => {
    it('オンラインの場合は会議URLフィールドが表示される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // デフォルトでオンラインが選択されている
      expect(screen.getByLabelText('会議URL')).toBeInTheDocument();

      // 対面に変更
      const meetingTypeSelect = screen.getByLabelText('面談形式');
      await user.click(meetingTypeSelect);
      await user.click(screen.getByText('対面'));

      // 会議URLフィールドが非表示になる
      expect(screen.queryByLabelText('会議URL')).not.toBeInTheDocument();

      // ハイブリッドに変更
      await user.click(meetingTypeSelect);
      await user.click(screen.getByText('ハイブリッド'));

      // 会議URLフィールドが再表示される
      expect(screen.getByLabelText('会議URL')).toBeInTheDocument();
    });
  });

  describe('参加者管理', () => {
    it('クライアント側参加者を追加できる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // クライアント側参加者の入力フィールドを探す
      const clientSection = screen.getByText('クライアント側参加者').parentElement!;
      const nameInput = within(clientSection).getByLabelText('参加者名');
      const roleInput = within(clientSection).getByLabelText('役職');
      const addButton = within(clientSection).getByRole('button', { name: '' });

      // 参加者を追加
      await user.type(nameInput, '新規参加者');
      await user.type(roleInput, 'マネージャー');
      await user.click(addButton);

      // 追加されたことを確認
      expect(screen.getByText('新規参加者 (マネージャー)')).toBeInTheDocument();
    });

    it('エンジニア側参加者を追加できる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // エンジニア側参加者の入力フィールドを探す
      const engineerSection = screen.getByText('エンジニア側参加者').parentElement!;
      const nameInput = within(engineerSection).getByLabelText('参加者名');
      const addButton = within(engineerSection).getByRole('button', { name: '' });

      // 参加者を追加
      await user.type(nameInput, '新規エンジニア');
      await user.click(addButton);

      // 追加されたことを確認
      expect(screen.getByText('新規エンジニア')).toBeInTheDocument();
    });

    it('参加者を削除できる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // 削除ボタンをクリック
      const yamadaChip = screen.getByText('山田部長 (採用担当)').closest('.MuiChip-root');
      const deleteButton = within(yamadaChip!).getByTestId('CancelIcon');
      await user.click(deleteButton);

      // 削除されたことを確認
      expect(screen.queryByText('山田部長 (採用担当)')).not.toBeInTheDocument();
      // 他の参加者は残っている
      expect(screen.getByText('佐藤課長 (プロジェクトマネージャー)')).toBeInTheDocument();
    });

    it('Enterキーで参加者を追加できる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const clientSection = screen.getByText('クライアント側参加者').parentElement!;
      const nameInput = within(clientSection).getByLabelText('参加者名');

      // Enterキーで追加
      await user.type(nameInput, 'Enterで追加{Enter}');

      expect(screen.getByText('Enterで追加')).toBeInTheDocument();
    });
  });

  describe('リマインダー設定', () => {
    it('リマインダーのON/OFFを切り替えられる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const reminderSwitch = screen.getByLabelText('リマインダーを有効にする');
      const daysBefore = screen.getByLabelText('リマインダー送信日数前');

      // デフォルトで有効
      expect(reminderSwitch).toBeChecked();
      expect(daysBefore).toBeInTheDocument();

      // 無効にする
      await user.click(reminderSwitch);
      expect(reminderSwitch).not.toBeChecked();
      expect(screen.queryByLabelText('リマインダー送信日数前')).not.toBeInTheDocument();

      // 再度有効にする
      await user.click(reminderSwitch);
      expect(reminderSwitch).toBeChecked();
      expect(screen.getByLabelText('リマインダー送信日数前')).toBeInTheDocument();
    });
  });

  describe('重複チェック', () => {
    it('重複がある場合は警告が表示される', async () => {
      mockOnConflictCheck.mockResolvedValue(mockConflictResult);
      
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onConflictCheck={mockOnConflictCheck}
        />
      );

      // 日付を変更して重複チェックをトリガー
      const durationInput = screen.getByLabelText('面談時間（分）');
      await userEvent.clear(durationInput);
      await userEvent.type(durationInput, '90');

      await waitFor(() => {
        expect(screen.getByText('指定された時間に他の面談が予定されています（1件）')).toBeInTheDocument();
      });
    });

    it('重複がない場合は警告が表示されない', async () => {
      mockOnConflictCheck.mockResolvedValue({ hasConflict: false, conflicts: [] });
      
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onConflictCheck={mockOnConflictCheck}
        />
      );

      // 日付を変更して重複チェックをトリガー
      const durationInput = screen.getByLabelText('面談時間（分）');
      await userEvent.clear(durationInput);
      await userEvent.type(durationInput, '90');

      await waitFor(() => {
        expect(mockOnConflictCheck).toHaveBeenCalled();
      });

      expect(screen.queryByText(/指定された時間に他の面談が予定されています/)).not.toBeInTheDocument();
    });
  });

  describe('ボタン操作', () => {
    it('キャンセルボタンでダイアログが閉じる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('キャンセル'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('作成ボタンでデータが保存される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          proposalId="prop1"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // 必要な情報を入力
      const durationInput = screen.getByLabelText('面談時間（分）');
      await user.clear(durationInput);
      await user.type(durationInput, '90');

      const locationInput = screen.getByLabelText('場所');
      await user.type(locationInput, 'オンライン会議室');

      // 作成ボタンをクリック
      await user.click(screen.getByText('作成'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalId: 'prop1',
          durationMinutes: 90,
          location: 'オンライン会議室',
          meetingType: 'online',
          scheduledDate: expect.any(String)
        })
      );
    });

    it('削除ボタンでonDeleteが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByText('削除'));
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    it('ローディング中は保存ボタンが無効になる', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          isLoading={true}
        />
      );

      expect(screen.getByText('作成')).toBeDisabled();
    });
  });

  describe('ステータスに応じた表示制御', () => {
    it('キャンセル済みの面談は編集できない', () => {
      const cancelledInterview = { ...mockInterview, status: 'cancelled' as const };
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={cancelledInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // フィールドが無効になっている
      expect(screen.getByLabelText('面談時間（分）')).toBeDisabled();
      expect(screen.getByLabelText('場所')).toBeDisabled();
      
      // 更新・削除ボタンが表示されない
      expect(screen.queryByText('更新')).not.toBeInTheDocument();
      expect(screen.queryByText('削除')).not.toBeInTheDocument();
    });

    it('完了済みの面談は編集できない', () => {
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={mockCompletedInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // フィールドが無効になっている
      expect(screen.getByLabelText('面談時間（分）')).toBeDisabled();
      expect(screen.getByLabelText('場所')).toBeDisabled();
      
      // 更新・削除ボタンが表示されない
      expect(screen.queryByText('更新')).not.toBeInTheDocument();
      expect(screen.queryByText('削除')).not.toBeInTheDocument();
    });

    it('再調整中の面談は編集できる', () => {
      const rescheduledInterview = { ...mockInterview, status: 'rescheduled' as const };
      renderWithProviders(
        <InterviewDialog
          open={true}
          interview={rescheduledInterview}
          isEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      // フィールドが有効になっている
      expect(screen.getByLabelText('面談時間（分）')).not.toBeDisabled();
      expect(screen.getByLabelText('場所')).not.toBeDisabled();
      
      // 更新・削除ボタンが表示される
      expect(screen.getByText('更新')).toBeInTheDocument();
      expect(screen.getByText('削除')).toBeInTheDocument();
    });
  });

  describe('初期日付の設定', () => {
    it('initialDateが指定された場合、その日付が設定される', () => {
      const initialDate = new Date('2024-02-01T14:00:00');
      renderWithProviders(
        <InterviewDialog
          open={true}
          initialDate={initialDate}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // DateTimePickerの値を確認するのは難しいため、
      // 保存時のデータで確認する
      const saveButton = screen.getByText('作成');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledDate: expect.stringContaining('2024-02-01')
        })
      );
    });
  });
});