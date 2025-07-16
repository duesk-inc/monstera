import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { format, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { InterviewCalendar } from './InterviewCalendar';
import type { InterviewSchedule } from '@/types/sales';
import { INTERVIEW_STATUS, INTERVIEW_STATUS_COLORS, MEETING_TYPE } from '@/constants/sales';

// モックデータ
const mockInterviews: InterviewSchedule[] = [
  {
    id: '1',
    proposalId: 'prop1',
    engineerName: '田中太郎',
    clientName: '株式会社ABC',
    scheduledDate: format(new Date(), "yyyy-MM-dd'T'10:00:00Z"),
    durationMinutes: 60,
    location: '東京オフィス',
    meetingType: 'onsite',
    meetingUrl: '',
    clientAttendees: [
      { name: '山田部長', role: '採用担当', email: 'yamada@abc.com' }
    ],
    engineerAttendees: [
      { name: '田中太郎', email: 'tanaka@test.com' }
    ],
    status: 'scheduled',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user1'
  },
  {
    id: '2',
    proposalId: 'prop2',
    engineerName: '佐藤花子',
    clientName: '株式会社XYZ',
    scheduledDate: format(addDays(new Date(), 2), "yyyy-MM-dd'T'14:00:00Z"),
    durationMinutes: 90,
    meetingType: 'online',
    meetingUrl: 'https://meet.example.com/abc123',
    clientAttendees: [
      { name: '鈴木課長', role: '技術責任者', email: 'suzuki@xyz.com' },
      { name: '高橋主任', role: 'プロジェクトマネージャー', email: 'takahashi@xyz.com' }
    ],
    engineerAttendees: [
      { name: '佐藤花子', email: 'sato@test.com' }
    ],
    status: 'scheduled',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: 'user2'
  },
  {
    id: '3',
    proposalId: 'prop3',
    engineerName: '鈴木一郎',
    clientName: '株式会社DEF',
    scheduledDate: format(subDays(new Date(), 1), "yyyy-MM-dd'T'11:00:00Z"),
    durationMinutes: 60,
    meetingType: 'hybrid',
    status: 'completed',
    clientAttendees: [],
    engineerAttendees: [],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    createdBy: 'user3'
  },
  // 同じ日に複数の面談
  {
    id: '4',
    proposalId: 'prop4',
    engineerName: '伊藤次郎',
    clientName: '株式会社GHI',
    scheduledDate: format(new Date(), "yyyy-MM-dd'T'13:00:00Z"),
    durationMinutes: 45,
    meetingType: 'online',
    status: 'scheduled',
    clientAttendees: [],
    engineerAttendees: [],
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    createdBy: 'user4'
  },
  {
    id: '5',
    proposalId: 'prop5',
    engineerName: '渡辺三郎',
    clientName: '株式会社JKL',
    scheduledDate: format(new Date(), "yyyy-MM-dd'T'15:00:00Z"),
    durationMinutes: 60,
    meetingType: 'onsite',
    status: 'cancelled',
    clientAttendees: [],
    engineerAttendees: [],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: 'user5'
  },
  {
    id: '6',
    proposalId: 'prop6',
    engineerName: '加藤四郎',
    clientName: '株式会社MNO',
    scheduledDate: format(new Date(), "yyyy-MM-dd'T'16:30:00Z"),
    durationMinutes: 30,
    meetingType: 'online',
    status: 'rescheduled',
    clientAttendees: [],
    engineerAttendees: [],
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    createdBy: 'user6'
  }
];

// テーマの設定
const theme = createTheme();

// ラップコンポーネント
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('InterviewCalendar', () => {
  const mockOnDateClick = jest.fn();
  const mockOnInterviewClick = jest.fn();
  const mockOnCreateInterview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示状態', () => {
    it('カレンダーが正しく表示される', () => {
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // 現在の年月が表示される
      const currentMonth = format(new Date(), 'yyyy年M月', { locale: ja });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();

      // 曜日ヘッダーが表示される
      ['月', '火', '水', '木', '金', '土', '日'].forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });

      // ナビゲーションボタンが表示される
      expect(screen.getByText('今日')).toBeInTheDocument();
    });

    it('面談が正しく表示される', () => {
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // 今日の面談が表示される
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
      expect(screen.getByText('伊藤次郎')).toBeInTheDocument();
      expect(screen.getByText('渡辺三郎')).toBeInTheDocument();
    });

    it('3件を超える面談がある日は「+N件」と表示される', () => {
      renderWithTheme(
        <InterviewCalendar
          interviews={[...mockInterviews, {
            id: '7',
            proposalId: 'prop7',
            engineerName: '山田五郎',
            clientName: '株式会社PQR',
            scheduledDate: format(new Date(), "yyyy-MM-dd'T'17:00:00Z"),
            durationMinutes: 60,
            meetingType: 'online',
            status: 'scheduled',
            clientAttendees: [],
            engineerAttendees: [],
            createdAt: '2024-01-07T00:00:00Z',
            updatedAt: '2024-01-07T00:00:00Z',
            createdBy: 'user7'
          }]}
        />
      );

      // 3件まで表示され、残りは「+1件」と表示される
      expect(screen.getByText('+1件')).toBeInTheDocument();
    });

    it('ローディング状態では面談が表示されない', () => {
      renderWithTheme(
        <InterviewCalendar
          interviews={[]}
          isLoading={true}
        />
      );

      // 面談が表示されない
      expect(screen.queryByText('田中太郎')).not.toBeInTheDocument();
    });

    it('今日の日付が青い枠線で強調表示される', () => {
      renderWithTheme(
        <InterviewCalendar
          interviews={[]}
        />
      );

      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      
      expect(todayCell).toHaveStyle({
        border: `2px solid ${theme.palette.primary.main}`
      });
    });
  });

  describe('ナビゲーション', () => {
    it('前月・次月ボタンで月を移動できる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      const currentMonth = format(new Date(), 'yyyy年M月', { locale: ja });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();

      // 前月へ移動
      const prevButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('button:first-child');
      await user.click(prevButton!);

      const prevMonth = format(subDays(startOfMonth(new Date()), 1), 'yyyy年M月', { locale: ja });
      expect(screen.getByText(prevMonth)).toBeInTheDocument();

      // 次月へ移動（2回クリックで現在月の次月へ）
      const nextButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('button:last-child');
      await user.click(nextButton!);
      await user.click(nextButton!);

      const nextMonth = format(addDays(endOfMonth(new Date()), 1), 'yyyy年M月', { locale: ja });
      expect(screen.getByText(nextMonth)).toBeInTheDocument();
    });

    it('今日ボタンで現在月に戻る', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // 次月へ移動
      const nextButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('button:last-child');
      await user.click(nextButton!);

      // 今日ボタンをクリック
      const todayButton = screen.getByRole('button', { name: '今日' });
      await user.click(todayButton);

      const currentMonth = format(new Date(), 'yyyy年M月', { locale: ja });
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('日付クリックでダイアログが開く', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
          onDateClick={mockOnDateClick}
        />
      );

      // 今日の日付をクリック
      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      await user.click(todayCell!);

      // ダイアログが開く
      const dialogTitle = format(new Date(), 'M月d日(E)', { locale: ja }) + 'の面談';
      expect(screen.getByText(dialogTitle)).toBeInTheDocument();
      
      // コールバックが呼ばれる
      expect(mockOnDateClick).toHaveBeenCalled();
    });

    it('面談チップクリックでコールバックが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
          onInterviewClick={mockOnInterviewClick}
        />
      );

      // 面談チップをクリック
      const chip = screen.getByText('田中太郎').closest('.MuiChip-root');
      await user.click(chip!);

      expect(mockOnInterviewClick).toHaveBeenCalledWith(mockInterviews[0]);
    });

    it('面談追加ボタンでコールバックが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
          onCreateInterview={mockOnCreateInterview}
        />
      );

      // 日付をクリックしてダイアログを開く
      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      await user.click(todayCell!);

      // 面談追加ボタンをクリック
      const addButton = screen.getByRole('button', { name: '面談追加' });
      await user.click(addButton);

      expect(mockOnCreateInterview).toHaveBeenCalled();
    });

    it('ダイアログ内の面談カードクリックでコールバックが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
          onInterviewClick={mockOnInterviewClick}
        />
      );

      // 日付をクリックしてダイアログを開く
      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      await user.click(todayCell!);

      // ダイアログ内の面談カードをクリック
      const interviewCard = screen.getByText('田中太郎 - 株式会社ABC').closest('.MuiCard-root');
      await user.click(interviewCard!);

      expect(mockOnInterviewClick).toHaveBeenCalledWith(mockInterviews[0]);
    });
  });

  describe('日付詳細ダイアログ', () => {
    it('選択した日付の面談が正しく表示される', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // 今日の日付をクリック
      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      await user.click(todayCell!);

      // 今日の面談が表示される
      expect(screen.getByText('田中太郎 - 株式会社ABC')).toBeInTheDocument();
      expect(screen.getByText('10:00 (60分)')).toBeInTheDocument();
      expect(screen.getByText('対面 - 東京オフィス')).toBeInTheDocument();
      expect(screen.getByText('参加者: 山田部長')).toBeInTheDocument();

      // ステータスチップが表示される
      const dialog = screen.getByRole('dialog');
      within(dialog).getAllByText(INTERVIEW_STATUS.scheduled).forEach(element => {
        expect(element).toBeInTheDocument();
      });
    });

    it('面談がない日は「面談がありません」と表示される', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={[]}
        />
      );

      // 今日の日付をクリック
      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      await user.click(todayCell!);

      expect(screen.getByText('この日の面談はありません')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '面談を追加' })).toBeInTheDocument();
    });

    it('面談形式アイコンが正しく表示される', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // 今日の日付をクリック
      const todayDate = format(new Date(), 'd');
      const todayCell = screen.getByText(todayDate).closest('.MuiCard-root');
      await user.click(todayCell!);

      // 各面談形式のアイコンが表示される
      const dialog = screen.getByRole('dialog');
      
      // onsiteの面談
      expect(within(dialog).getByText('対面 - 東京オフィス')).toBeInTheDocument();
      
      // onlineの面談  
      const onlineCard = within(dialog).getByText('伊藤次郎 - 株式会社GHI').closest('.MuiCard-root');
      expect(within(onlineCard!).getByText(MEETING_TYPE.online)).toBeInTheDocument();
    });
  });

  describe('ステータス表示', () => {
    it('ステータスに応じた色でチップが表示される', () => {
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // scheduled
      const scheduledChip = screen.getByText('田中太郎').closest('.MuiChip-root');
      expect(scheduledChip).toHaveStyle({
        backgroundColor: INTERVIEW_STATUS_COLORS.scheduled + '40',
        color: INTERVIEW_STATUS_COLORS.scheduled
      });

      // cancelled
      const cancelledChip = screen.getByText('渡辺三郎').closest('.MuiChip-root');
      expect(cancelledChip).toHaveStyle({
        backgroundColor: INTERVIEW_STATUS_COLORS.cancelled + '40',
        color: INTERVIEW_STATUS_COLORS.cancelled
      });

      // rescheduled
      const rescheduledChip = screen.getByText('加藤四郎').closest('.MuiChip-root');
      expect(rescheduledChip).toHaveStyle({
        backgroundColor: INTERVIEW_STATUS_COLORS.rescheduled + '40',
        color: INTERVIEW_STATUS_COLORS.rescheduled
      });
    });
  });

  describe('イベント伝播', () => {
    it('面談チップクリック時に日付クリックイベントが発生しない', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
          onDateClick={mockOnDateClick}
          onInterviewClick={mockOnInterviewClick}
        />
      );

      // 面談チップをクリック
      const chip = screen.getByText('田中太郎').closest('.MuiChip-root');
      await user.click(chip!);

      expect(mockOnInterviewClick).toHaveBeenCalled();
      expect(mockOnDateClick).not.toHaveBeenCalled();
    });
  });

  describe('ツールチップ', () => {
    it('面談チップにホバーすると時間と名前が表示される', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <InterviewCalendar
          interviews={mockInterviews}
        />
      );

      // 面談チップにホバー
      const chip = screen.getByText('田中太郎').closest('.MuiChip-root');
      await user.hover(chip!);

      // ツールチップが表示される
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('10:00 - 田中太郎');
      });
    });
  });
});