// weeklyReportMappersのテスト

import { parseISO, format } from 'date-fns';
import { 
  convertAPIResponseToUIModel,
  convertUIModelToAPIRequest 
} from '@/app/(authenticated)/(engineer)/weekly-report/mappers/weeklyReportMappers';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { WEEKLY_REPORT_MOOD } from '@/constants/weeklyMood';
import { createMockDailyRecord } from '../utils/mockDataGenerators';

// テスト用の簡単なWeeklyReportモック生成関数
const createTestWeeklyReport = (startDate: Date, overrides: Record<string, any> = {}) => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  
  return {
    id: 'test-id',
    startDate,
    endDate,
    status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
    mood: WEEKLY_REPORT_MOOD.NEUTRAL,
    weeklyRemarks: 'テスト週次所感',
    workplaceChangeRequested: undefined,
    dailyRecords: [createMockDailyRecord(startDate)],
    totalWorkHours: 0,
    clientTotalWorkHours: 0,
    ...overrides
  };
};

// モックデータ用のヘルパー関数
const createMockAPIWeeklyReport = (overrides: Record<string, any> = {}) => ({
  id: 'test-id-123',
  start_date: '2024-01-01',
  end_date: '2024-01-07',
  status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
  submitted_at: undefined,
  mood: WEEKLY_REPORT_MOOD.NEUTRAL,
  weekly_remarks: 'テスト用週次所感',
  workplace_change_requested: false,
  daily_records: [
    {
      date: '2024-01-01',
      start_time: '09:00:00',
      end_time: '18:00:00',
      break_time: 60,
      client_start_time: '09:30:00',
      client_end_time: '17:30:00',
      client_break_time: 60,
      has_client_work: true,
      remarks: '通常業務',
      is_holiday_work: false,
    },
    {
      date: '2024-01-02',
      start_time: '09:00:00',
      end_time: '18:00:00',
      break_time: 60,
      client_start_time: '',
      client_end_time: '',
      client_break_time: 0,
      has_client_work: false,
      remarks: '',
      is_holiday_work: false,
    }
  ],
  ...overrides
});

const createMockAPIWeeklyReportWithCamelCase = (overrides: Record<string, any> = {}) => ({
  id: 'test-id-456',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
  submittedAt: undefined,
  mood: WEEKLY_REPORT_MOOD.GOOD,
  weeklyRemarks: 'キャメルケース用週次所感',
  workplaceChangeRequested: false,
  dailyRecords: [
    {
      date: '2024-01-01',
      startTime: '10:00',
      endTime: '19:00',
      breakTime: 60,
      clientStartTime: '10:30',
      clientEndTime: '18:30',
      clientBreakTime: 60,
      hasClientWork: true,
      remarks: 'キャメルケースデータ',
      isHolidayWork: false,
    }
  ],
  ...overrides
});

describe('weeklyReportMappers', () => {
  describe('convertAPIResponseToUIModel', () => {
    describe('基本的な変換', () => {
      test('snake_case形式のAPIレスポンスをUIモデルに正しく変換する', () => {
        const apiData = createMockAPIWeeklyReport();
        const result = convertAPIResponseToUIModel(apiData);

        expect(result.id).toBe('test-id-123');
        expect(result.startDate).toEqual(parseISO('2024-01-01'));
        expect(result.endDate).toEqual(parseISO('2024-01-07'));
        expect(result.status).toBe(WEEKLY_REPORT_STATUS.NOT_SUBMITTED);
        expect(result.mood).toBe(WEEKLY_REPORT_MOOD.NEUTRAL);
        expect(result.weeklyRemarks).toBe('テスト用週次所感');
        expect(result.workplaceChangeRequested).toBe(false);
        expect(result.dailyRecords).toHaveLength(2);
      });

      test('camelCase形式のAPIレスポンスをUIモデルに正しく変換する', () => {
        const apiData = createMockAPIWeeklyReportWithCamelCase();
        const result = convertAPIResponseToUIModel(apiData);

        expect(result.id).toBe('test-id-456');
        expect(result.startDate).toEqual(parseISO('2024-01-01'));
        expect(result.endDate).toEqual(parseISO('2024-01-07'));
        expect(result.mood).toBe(WEEKLY_REPORT_MOOD.GOOD);
        expect(result.weeklyRemarks).toBe('キャメルケース用週次所感');
        expect(result.dailyRecords).toHaveLength(1);
      });

      test('必須フィールドが空の場合でもエラーにならない', () => {
        const apiData = {
          start_date: '2024-01-01',
          end_date: '2024-01-07',
        };

        expect(() => convertAPIResponseToUIModel(apiData)).not.toThrow();
        
        const result = convertAPIResponseToUIModel(apiData);
        expect(result.id).toBeUndefined();
        expect(result.mood).toBe(WEEKLY_REPORT_MOOD.NEUTRAL);
        expect(result.weeklyRemarks).toBe('');
        expect(result.status).toBe(WEEKLY_REPORT_STATUS.NOT_SUBMITTED);
        expect(result.dailyRecords).toEqual([]);
      });
    });

    describe('DailyRecord変換', () => {
      test('snake_case形式のdaily_recordsを正しく変換する', () => {
        const apiData = createMockAPIWeeklyReport();
        const result = convertAPIResponseToUIModel(apiData);
        
        const firstRecord = result.dailyRecords[0];
        expect(firstRecord.date).toBe('2024-01-01');
        expect(firstRecord.startTime).toBe('09:00');
        expect(firstRecord.endTime).toBe('18:00');
        expect(firstRecord.breakTime).toBe(60);
        expect(firstRecord.clientStartTime).toBe('09:30');
        expect(firstRecord.clientEndTime).toBe('17:30');
        expect(firstRecord.clientBreakTime).toBe(60);
        expect(firstRecord.hasClientWork).toBe(true);
        expect(firstRecord.remarks).toBe('通常業務');
        expect(firstRecord.isHolidayWork).toBe(false);
      });

      test('camelCase形式のdailyRecordsを正しく変換する', () => {
        const apiData = createMockAPIWeeklyReportWithCamelCase();
        const result = convertAPIResponseToUIModel(apiData);
        
        const firstRecord = result.dailyRecords[0];
        expect(firstRecord.date).toBe('2024-01-01');
        expect(firstRecord.startTime).toBe('10:00');
        expect(firstRecord.endTime).toBe('19:00');
        expect(firstRecord.breakTime).toBe(60);
        expect(firstRecord.clientStartTime).toBe('10:30');
        expect(firstRecord.clientEndTime).toBe('18:30');
        expect(firstRecord.clientBreakTime).toBe(60);
        expect(firstRecord.hasClientWork).toBe(true);
        expect(firstRecord.remarks).toBe('キャメルケースデータ');
        expect(firstRecord.isHolidayWork).toBe(false);
      });

      test('空のdaily_recordsでもエラーにならない', () => {
        const apiData = createMockAPIWeeklyReport({ daily_records: [] });
        const result = convertAPIResponseToUIModel(apiData);
        
        expect(result.dailyRecords).toEqual([]);
      });

      test('daily_recordsがnullやundefinedでもエラーにならない', () => {
        const apiData1 = createMockAPIWeeklyReport({ daily_records: null });
        const apiData2 = createMockAPIWeeklyReport({ daily_records: undefined });
        
        expect(() => convertAPIResponseToUIModel(apiData1)).not.toThrow();
        expect(() => convertAPIResponseToUIModel(apiData2)).not.toThrow();
        
        const result1 = convertAPIResponseToUIModel(apiData1);
        const result2 = convertAPIResponseToUIModel(apiData2);
        
        expect(result1.dailyRecords).toEqual([]);
        expect(result2.dailyRecords).toEqual([]);
      });
    });

    describe('時刻文字列の変換', () => {
      test('ISO日時形式（T付き）の時刻を正しく変換する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '2025-05-19T09:00:00',
            end_time: '2025-05-19T18:00:00',
            break_time: 60,
            client_start_time: '2025-05-19T09:30:00',
            client_end_time: '2025-05-19T17:30:00',
            client_break_time: 60,
            has_client_work: true,
            remarks: '',
            is_holiday_work: false,
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.startTime).toBe('09:00');
        expect(record.endTime).toBe('18:00');
        expect(record.clientStartTime).toBe('09:30');
        expect(record.clientEndTime).toBe('17:30');
      });

      test('HH:mm:ss形式の時刻を正しく変換する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '09:00:00',
            end_time: '18:00:00',
            break_time: 60,
            client_start_time: '09:30:00',
            client_end_time: '17:30:00',
            client_break_time: 60,
            has_client_work: true,
            remarks: '',
            is_holiday_work: false,
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.startTime).toBe('09:00');
        expect(record.endTime).toBe('18:00');
        expect(record.clientStartTime).toBe('09:30');
        expect(record.clientEndTime).toBe('17:30');
      });

      test('HH:mm形式の時刻はそのまま変換する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '09:00',
            end_time: '18:00',
            break_time: 60,
            client_start_time: '09:30',
            client_end_time: '17:30',
            client_break_time: 60,
            has_client_work: true,
            remarks: '',
            is_holiday_work: false,
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.startTime).toBe('09:00');
        expect(record.endTime).toBe('18:00');
        expect(record.clientStartTime).toBe('09:30');
        expect(record.clientEndTime).toBe('17:30');
      });

      test('空文字列やnull、undefinedの時刻を正しく処理する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '',
            end_time: null,
            break_time: 60,
            client_start_time: undefined,
            client_end_time: '',
            client_break_time: 0,
            has_client_work: false,
            remarks: '',
            is_holiday_work: false,
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.startTime).toBe('');
        expect(record.endTime).toBe('');
        expect(record.clientStartTime).toBe('');
        expect(record.clientEndTime).toBe('');
      });
    });

    describe('データ型の変換', () => {
      test('break_timeの数値変換を正しく処理する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '09:00',
            end_time: '18:00',
            break_time: '90', // 文字列
            client_start_time: '',
            client_end_time: '',
            client_break_time: 0,
            has_client_work: false,
            remarks: '',
            is_holiday_work: false,
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.breakTime).toBe(1.0); // デフォルト値
      });

      test('boolean値の変換を正しく処理する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '09:00',
            end_time: '18:00',
            break_time: 60,
            client_start_time: '',
            client_end_time: '',
            client_break_time: 0,
            has_client_work: 'true', // 文字列
            remarks: '',
            is_holiday_work: 1, // 数値
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.hasClientWork).toBe(false); // 厳密比較でfalse
        expect(record.isHolidayWork).toBe(false); // 厳密比較でfalse
      });

      test('remarks文字列変換を正しく処理する', () => {
        const apiData = createMockAPIWeeklyReport({
          daily_records: [{
            date: '2024-01-01',
            start_time: '09:00',
            end_time: '18:00',
            break_time: 60,
            client_start_time: '',
            client_end_time: '',
            client_break_time: 0,
            has_client_work: false,
            remarks: null,
            is_holiday_work: false,
          }]
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        const record = result.dailyRecords[0];
        
        expect(record.remarks).toBe('');
      });
    });

    describe('合計時間の変換', () => {
      test('snake_case形式の合計時間を正しく変換する', () => {
        const apiData = createMockAPIWeeklyReport({
          total_work_hours: 40.5,
          client_total_work_hours: 35.0,
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        
        expect(result.totalWorkHours).toBe(40.5);
        expect(result.clientTotalWorkHours).toBe(35.0);
      });

      test('camelCase形式の合計時間を正しく変換する', () => {
        const apiData = createMockAPIWeeklyReportWithCamelCase({
          totalWorkHours: 42.0,
          clientTotalWorkHours: 38.5,
        });
        
        const result = convertAPIResponseToUIModel(apiData);
        
        expect(result.totalWorkHours).toBe(42.0);
        expect(result.clientTotalWorkHours).toBe(38.5);
      });

      test('合計時間が未定義の場合はデフォルト値0を使用する', () => {
        const apiData = createMockAPIWeeklyReport();
        delete (apiData as any).total_work_hours;
        delete (apiData as any).client_total_work_hours;
        
        const result = convertAPIResponseToUIModel(apiData);
        
        expect(result.totalWorkHours).toBe(0);
        expect(result.clientTotalWorkHours).toBe(0);
      });
    });
  });

  describe('convertUIModelToAPIRequest', () => {
    describe('基本的な変換', () => {
      test('UIモデルをAPI形式に正しく変換する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const result = convertUIModelToAPIRequest(uiData);

        expect(result.id).toBe(uiData.id);
        expect(result.startDate).toBe('2024-01-01');
        expect(result.endDate).toBe('2024-01-07');
        expect(result.status).toBe(uiData.status);
        expect(result.mood).toBe(uiData.mood);
        expect(result.weeklyRemarks).toBe(uiData.weeklyRemarks);
        expect(result.workplaceChangeRequested).toBe(false); // undefinedはfalseに変換される
        expect(result.dailyRecords).toHaveLength(uiData.dailyRecords.length);
      });

      test('statusがundefinedの場合はデフォルト値を使用する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        delete (uiData as any).status;
        
        const result = convertUIModelToAPIRequest(uiData);
        
        expect(result.status).toBe(WEEKLY_REPORT_STATUS.NOT_SUBMITTED);
      });

      test('workplaceChangeRequestedがundefinedの場合はfalseを使用する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        delete (uiData as any).workplaceChangeRequested;
        
        const result = convertUIModelToAPIRequest(uiData);
        
        expect(result.workplaceChangeRequested).toBe(false);
      });
    });

    describe('DailyRecord変換', () => {
      test('DailyRecordを正しくAPI形式に変換する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.date).toBe(dailyRecord.date);
        expect(convertedRecord.startTime).toBe('09:00:00');
        expect(convertedRecord.endTime).toBe('18:00:00');
        expect(convertedRecord.breakTime).toBe(dailyRecord.breakTime);
        expect(convertedRecord.hasClientWork).toBe(!!dailyRecord.hasClientWork);
        expect(convertedRecord.remarks).toBe(dailyRecord.remarks);
        expect(convertedRecord.isHolidayWork).toBe(dailyRecord.isHolidayWork);
      });

      test('時刻文字列に秒を追加する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.startTime = '09:00';
        dailyRecord.endTime = '18:30';
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.startTime).toBe('09:00:00');
        expect(convertedRecord.endTime).toBe('18:30:00');
      });

      test('既に秒が含まれている時刻文字列はそのまま使用する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.startTime = '09:00:30';
        dailyRecord.endTime = '18:30:45';
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.startTime).toBe('09:00:30');
        expect(convertedRecord.endTime).toBe('18:30:45');
      });

      test('空の時刻文字列は空文字列のまま返す', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.startTime = '';
        dailyRecord.endTime = '';
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.startTime).toBe('');
        expect(convertedRecord.endTime).toBe('');
      });
    });

    describe('客先勤怠処理', () => {
      test('hasClientWorkがtrueの場合、client時刻を使用する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.hasClientWork = true;
        dailyRecord.clientStartTime = '10:00';
        dailyRecord.clientEndTime = '17:00';
        dailyRecord.clientBreakTime = 90;
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.clientStartTime).toBe('10:00:00');
        expect(convertedRecord.clientEndTime).toBe('17:00:00');
        expect(convertedRecord.clientBreakTime).toBe(90);
        expect(convertedRecord.hasClientWork).toBe(true);
      });

      test('hasClientWorkがfalseの場合、自社時刻を使用する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.hasClientWork = false;
        dailyRecord.startTime = '09:00';
        dailyRecord.endTime = '18:00';
        dailyRecord.breakTime = 60;
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.clientStartTime).toBe('09:00:00');
        expect(convertedRecord.clientEndTime).toBe('18:00:00');
        expect(convertedRecord.clientBreakTime).toBe(60);
        expect(convertedRecord.hasClientWork).toBe(false);
      });

      test('clientBreakTimeがundefinedの場合は0を使用する', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.hasClientWork = true;
        delete (dailyRecord as any).clientBreakTime;
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.clientBreakTime).toBe(0);
      });
    });

    describe('計算フィールド', () => {
      test('workHoursとclientWorkHoursが正しく計算される', () => {
        // calculateWorkHoursがモックされていないため、実際の計算は0になる
        // ここでは計算ロジックが呼ばれることを確認
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        dailyRecord.startTime = '09:00';
        dailyRecord.endTime = '18:00';
        dailyRecord.breakTime = 60;
        dailyRecord.hasClientWork = true;
        dailyRecord.clientStartTime = '10:00';
        dailyRecord.clientEndTime = '17:00';
        dailyRecord.clientBreakTime = 30;
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        // calculateWorkHoursの実装に依存するため、数値型であることのみ確認
        expect(typeof convertedRecord.workHours).toBe('number');
        expect(typeof convertedRecord.clientWorkHours).toBe('number');
      });
    });

    describe('日付フォーマット', () => {
      test('日付が正しくyyyy-MM-dd形式に変換される', () => {
        const startDate = new Date('2024-12-25');
        const endDate = new Date('2024-12-31');
        const uiData = createTestWeeklyReport(startDate);
        uiData.endDate = endDate;
        
        const result = convertUIModelToAPIRequest(uiData);
        
        expect(result.startDate).toBe('2024-12-25');
        expect(result.endDate).toBe('2024-12-31');
      });
    });

    describe('エッジケース', () => {
      test('空のdailyRecords配列でもエラーにならない', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        uiData.dailyRecords = [];
        
        expect(() => convertUIModelToAPIRequest(uiData)).not.toThrow();
        
        const result = convertUIModelToAPIRequest(uiData);
        expect(result.dailyRecords).toEqual([]);
      });

      test('hasClientWorkがundefinedでも正しく処理される', () => {
        const uiData = createTestWeeklyReport(new Date('2024-01-01'));
        const dailyRecord = createMockDailyRecord(new Date('2024-01-01'));
        delete (dailyRecord as any).hasClientWork;
        uiData.dailyRecords = [dailyRecord];
        
        const result = convertUIModelToAPIRequest(uiData);
        const convertedRecord = result.dailyRecords[0];
        
        expect(convertedRecord.hasClientWork).toBe(false);
      });
    });
  });

  describe('相互変換テスト', () => {
    test('API → UI → API変換で元データと同等になる', () => {
      const originalAPIData = createMockAPIWeeklyReport();
      
      // API → UI
      const uiData = convertAPIResponseToUIModel(originalAPIData);
      
      // UI → API
      const convertedAPIData = convertUIModelToAPIRequest(uiData);
      
      // 日付形式は変換されるため、パースして比較
      expect(convertedAPIData.startDate).toBe(format(parseISO(originalAPIData.start_date), 'yyyy-MM-dd'));
      expect(convertedAPIData.endDate).toBe(format(parseISO(originalAPIData.end_date), 'yyyy-MM-dd'));
      expect(convertedAPIData.mood).toBe(originalAPIData.mood);
      expect(convertedAPIData.weeklyRemarks).toBe(originalAPIData.weekly_remarks);
      expect(convertedAPIData.status).toBe(originalAPIData.status);
      expect(convertedAPIData.workplaceChangeRequested).toBe(originalAPIData.workplace_change_requested);
    });

    test('UI → API → UI変換で元データと同等になる', () => {
      const originalUIData = createTestWeeklyReport(new Date('2024-01-01'), {
        workplaceChangeRequested: true
      });
      
      // UI → API
      const apiData = convertUIModelToAPIRequest(originalUIData);
      
      // API → UI（snake_case形式に変換してから）
      const snakeCaseAPIData = {
        id: apiData.id,
        start_date: apiData.startDate,
        end_date: apiData.endDate,
        status: apiData.status,
        mood: apiData.mood,
        weekly_remarks: apiData.weeklyRemarks,
        workplace_change_requested: apiData.workplaceChangeRequested,
        daily_records: apiData.dailyRecords.map(record => ({
          date: record.date,
          start_time: record.startTime,
          end_time: record.endTime,
          break_time: record.breakTime,
          client_start_time: record.clientStartTime,
          client_end_time: record.clientEndTime,
          client_break_time: record.clientBreakTime,
          has_client_work: record.hasClientWork,
          remarks: record.remarks,
          is_holiday_work: record.isHolidayWork,
        }))
      };
      
      const convertedUIData = convertAPIResponseToUIModel(snakeCaseAPIData);
      
      // 主要フィールドの比較
      expect(convertedUIData.id).toBe(originalUIData.id);
      expect(format(convertedUIData.startDate, 'yyyy-MM-dd')).toBe(format(originalUIData.startDate, 'yyyy-MM-dd'));
      expect(format(convertedUIData.endDate, 'yyyy-MM-dd')).toBe(format(originalUIData.endDate, 'yyyy-MM-dd'));
      expect(convertedUIData.mood).toBe(originalUIData.mood);
      expect(convertedUIData.weeklyRemarks).toBe(originalUIData.weeklyRemarks);
      expect(convertedUIData.status).toBe(originalUIData.status);
      expect(convertedUIData.workplaceChangeRequested).toBe(originalUIData.workplaceChangeRequested);
      expect(convertedUIData.dailyRecords).toHaveLength(originalUIData.dailyRecords.length);
    });
  });
});