import { getUserDefaultWorkSettings, saveUserDefaultWorkSettings } from '@/lib/api/weeklyReport';
import { getAuthClient } from '@/lib/api';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';

// モックの設定
jest.mock('@/lib/api', () => ({
  getAuthClient: jest.fn(),
}));

describe('週報デフォルト勤務時間設定API', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    };
    (getAuthClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserDefaultWorkSettings', () => {
    it('正常にデフォルト設定を取得できる', async () => {
      const mockResponse = {
        data: {
          weekday_start_time: '09:30',
          weekday_end_time: '18:30',
          weekday_break_time: 1.5,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserDefaultWorkSettings();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/weekly-reports/default-settings');
      expect(result).toEqual({
        weekdayStart: '09:30',
        weekdayEnd: '18:30',
        weekdayBreak: 1.5,
      });
    });

    it('APIエラー時はデフォルト値を返す', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      const result = await getUserDefaultWorkSettings();

      expect(result).toEqual({
        weekdayStart: DEFAULT_WORK_TIME.START_TIME,
        weekdayEnd: DEFAULT_WORK_TIME.END_TIME,
        weekdayBreak: DEFAULT_WORK_TIME.BREAK_TIME,
      });
    });

    it('キャメルケース形式のレスポンスも処理できる', async () => {
      const mockResponse = {
        data: {
          weekdayStart: '10:00',
          weekdayEnd: '19:00',
          weekdayBreak: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserDefaultWorkSettings();

      expect(result).toEqual({
        weekdayStart: '10:00',
        weekdayEnd: '19:00',
        weekdayBreak: 1,
      });
    });
  });

  describe('saveUserDefaultWorkSettings', () => {
    it('正常にデフォルト設定を保存できる', async () => {
      const settings = {
        weekdayStart: '09:00',
        weekdayEnd: '18:00',
        weekdayBreak: 1,
      };
      const mockResponse = {
        data: {
          settings: {
            weekday_start_time: '09:00',
            weekday_end_time: '18:00',
            weekday_break_time: 1,
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await saveUserDefaultWorkSettings(settings);

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/weekly-reports/default-settings', {
        weekday_start_time: '09:00',
        weekday_end_time: '18:00',
        weekday_break_time: 1,
      });
      expect(result).toEqual(settings);
    });

    it('エラー時は詳細なエラーメッセージを含む例外をスロー', async () => {
      const settings = {
        weekdayStart: '09:00',
        weekdayEnd: '18:00',
        weekdayBreak: 1,
      };
      const errorResponse = {
        response: {
          data: {
            message: 'バリデーションエラー',
          },
        },
      };
      mockClient.post.mockRejectedValue(errorResponse);

      await expect(saveUserDefaultWorkSettings(settings)).rejects.toThrow('バリデーションエラー');
    });

    it('デフォルト値で欠けている値を補完する', async () => {
      const settings = {
        weekdayStart: '',
        weekdayEnd: '',
        weekdayBreak: 0,
      };
      const mockResponse = {
        data: {
          settings: {
            weekday_start_time: DEFAULT_WORK_TIME.START_TIME,
            weekday_end_time: DEFAULT_WORK_TIME.END_TIME,
            weekday_break_time: DEFAULT_WORK_TIME.BREAK_TIME,
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await saveUserDefaultWorkSettings(settings);

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/weekly-reports/default-settings', {
        weekday_start_time: DEFAULT_WORK_TIME.START_TIME,
        weekday_end_time: DEFAULT_WORK_TIME.END_TIME,
        weekday_break_time: DEFAULT_WORK_TIME.BREAK_TIME,
      });
    });
  });
});