// テストユーティリティの動作確認テスト

import { 
  createMockWeeklyReport,
  createMockDailyRecord,
  createMockApiWeeklyReport,
  createMockListWeeklyReportsResponse,
  getWeekStart,
  getWeekEnd,
  validateWeeklyReport,
  validateDailyRecord,
  calculateWorkHours,
  formatDateForInput,
  parseTimeString,
  getTestWeekRange,
} from './index';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';

describe('週報テストユーティリティ', () => {
  describe('日付ユーティリティ', () => {
    test('getWeekStartは月曜日を返す', () => {
      const date = new Date('2024-01-03'); // 水曜日
      const weekStart = getWeekStart(date);
      
      expect(weekStart.getDay()).toBe(1); // 月曜日
      expect(weekStart.toISOString().split('T')[0]).toBe('2024-01-01');
    });
    
    test('getWeekEndは日曜日の23:59:59を返す', () => {
      const date = new Date('2024-01-03');
      const weekEnd = getWeekEnd(date);
      
      expect(weekEnd.getDay()).toBe(0); // 日曜日
      expect(weekEnd.getHours()).toBe(23);
      expect(weekEnd.getMinutes()).toBe(59);
      expect(weekEnd.getSeconds()).toBe(59);
      expect(weekEnd.getMilliseconds()).toBe(999);
    });
    
    test('formatDateForInputは正しい形式の文字列を返す', () => {
      const date = new Date('2024-01-15');
      expect(formatDateForInput(date)).toBe('2024-01-15');
    });
    
    test('parseTimeStringは時刻を正しく解析する', () => {
      expect(parseTimeString('09:30')).toEqual({ hours: 9, minutes: 30 });
      expect(parseTimeString('23:59')).toEqual({ hours: 23, minutes: 59 });
      expect(parseTimeString('')).toEqual({ hours: 0, minutes: 0 });
      expect(parseTimeString('invalid')).toEqual({ hours: 0, minutes: 0 });
    });
    
    test('getTestWeekRangeは週の情報を正しく返す', () => {
      const range = getTestWeekRange(new Date('2024-01-03'));
      
      expect(range.start.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(range.end.toISOString().split('T')[0]).toBe('2024-01-07');
      expect(range.label).toMatch(/2024年1月1日.*1月7日/);
    });
  });
  
  describe('モックデータ生成', () => {
    test('createMockDailyRecordは適切なデフォルト値を設定する', () => {
      const weekday = new Date('2024-01-02'); // 火曜日
      const weekend = new Date('2024-01-06'); // 土曜日
      
      const weekdayRecord = createMockDailyRecord(weekday);
      const weekendRecord = createMockDailyRecord(weekend);
      
      // 平日
      expect(weekdayRecord.dayOfWeek).toBe('火');
      expect(weekdayRecord.isHoliday).toBe(false);
      expect(weekdayRecord.companyStartTime).toBe('09:00');
      expect(weekdayRecord.companyEndTime).toBe('18:00');
      expect(weekdayRecord.companyBreakMinutes).toBe(60);
      
      // 週末
      expect(weekendRecord.dayOfWeek).toBe('土');
      expect(weekendRecord.isHoliday).toBe(true);
      expect(weekendRecord.companyStartTime).toBe('');
      expect(weekendRecord.companyEndTime).toBe('');
      expect(weekendRecord.companyBreakMinutes).toBe(0);
    });
    
    test('createMockWeeklyReportは7日分のレコードを生成する', () => {
      const report = createMockWeeklyReport('draft');
      
      expect(report.dailyRecords).toHaveLength(7);
      expect(report.status).toBe(WEEKLY_REPORT_STATUS.DRAFT);
      expect(report.mood).toBe(3);
      
      // 曜日の順序確認
      const dayNames = report.dailyRecords.map(r => r.dayOfWeek);
      expect(dayNames).toEqual(['月', '火', '水', '木', '金', '土', '日']);
    });
    
    test('シナリオ別のモックデータが正しく生成される', () => {
      const submitted = createMockWeeklyReport('submitted');
      expect(submitted.status).toBe(WEEKLY_REPORT_STATUS.SUBMITTED);
      expect(submitted.submittedAt).not.toBeNull();
      
      const approved = createMockWeeklyReport('approved');
      expect(approved.status).toBe(WEEKLY_REPORT_STATUS.APPROVED);
      expect(approved.approvedAt).not.toBeNull();
      expect(approved.approvedBy).toBeTruthy();
      
      const withOvertime = createMockWeeklyReport('withOvertime');
      const overtimeRecord = withOvertime.dailyRecords.find(r => r.dayOfWeek === '火');
      expect(overtimeRecord?.companyEndTime).toBe('22:00');
      
      const withClientWork = createMockWeeklyReport('withClientWork');
      const clientRecord = withClientWork.dailyRecords.find(r => r.dayOfWeek === '水');
      expect(clientRecord?.clientStartTime).toBe('13:00');
      expect(clientRecord?.clientName).toBe('ABC株式会社');
    });
    
    test('API形式のデータが正しく変換される', () => {
      const uiReport = createMockWeeklyReport('draft');
      const apiReport = createMockApiWeeklyReport('draft');
      
      // 日付がISO文字列に変換されている
      expect(typeof apiReport.startDate).toBe('string');
      expect(typeof apiReport.endDate).toBe('string');
      expect(apiReport.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      
      // dailyRecordsも同様
      apiReport.dailyRecords.forEach(record => {
        expect(typeof record.date).toBe('string');
        expect(typeof record.createdAt).toBe('string');
      });
    });
    
    test('リストレスポンスが正しく生成される', () => {
      const response = createMockListWeeklyReportsResponse(3, 1, 10);
      
      expect(response.items).toHaveLength(3);
      expect(response.total).toBe(3);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);
      
      // 各週報の開始日が異なることを確認
      const startDates = response.items.map(item => item.startDate);
      const uniqueDates = new Set(startDates);
      expect(uniqueDates.size).toBe(3);
    });
  });
  
  describe('バリデーション', () => {
    test('validateWeeklyReportは有効な週報を検証する', () => {
      const validReport = createMockWeeklyReport('draft');
      const result = validateWeeklyReport(validReport);
      
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
    
    test('validateWeeklyReportは無効な週報のエラーを検出する', () => {
      const invalidReport = createMockWeeklyReport('draft');
      invalidReport.id = '';
      invalidReport.mood = 6; // 無効な値
      
      const result = validateWeeklyReport(invalidReport);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.id).toContain('IDが設定されていません');
      expect(result.errors.mood).toContain('気分は1〜5の範囲で入力してください');
    });
    
    test('validateDailyRecordは時刻の論理エラーを検出する', () => {
      const record = createMockDailyRecord(new Date('2024-01-02'));
      record.companyStartTime = '18:00';
      record.companyEndTime = '09:00'; // 開始より前
      
      const result = validateDailyRecord(record);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.companyTime).toContain('終了時刻は開始時刻より後に設定してください');
    });
    
    test('validateDailyRecordは休憩時間の超過を検出する', () => {
      const record = createMockDailyRecord(new Date('2024-01-02'));
      record.companyStartTime = '09:00';
      record.companyEndTime = '12:00'; // 3時間勤務
      record.companyBreakMinutes = 240; // 4時間休憩
      
      const result = validateDailyRecord(record);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.companyBreakMinutes).toContain('休憩時間が勤務時間を超えています');
    });
  });
  
  describe('稼働時間計算', () => {
    test('calculateWorkHoursは正しく稼働時間を計算する', () => {
      const report = createMockWeeklyReport('fullWeek');
      // 全日9:00-18:00（休憩1時間）= 8時間×7日
      
      const hours = calculateWorkHours(report);
      
      expect(hours.companyRegularHours).toBe(56); // 8時間×7日
      expect(hours.companyOvertimeHours).toBe(0);
      expect(hours.totalHours).toBe(56);
      expect(hours.breakHours).toBe(7); // 1時間×7日
    });
    
    test('calculateWorkHoursは残業時間を正しく分離する', () => {
      const report = createMockWeeklyReport('draft');
      // 1日だけ長時間勤務を設定
      report.dailyRecords[1].companyStartTime = '09:00';
      report.dailyRecords[1].companyEndTime = '22:00'; // 13時間
      report.dailyRecords[1].companyBreakMinutes = 60; // 実働12時間
      
      const hours = calculateWorkHours(report);
      
      // この日は正規8時間+残業4時間
      expect(hours.companyOvertimeHours).toBe(4);
    });
    
    test('calculateWorkHoursは客先勤務時間を含める', () => {
      const report = createMockWeeklyReport('withClientWork');
      const hours = calculateWorkHours(report);
      
      expect(hours.clientRegularHours).toBeGreaterThan(0);
      expect(hours.totalHours).toBe(
        hours.companyRegularHours + 
        hours.companyOvertimeHours + 
        hours.clientRegularHours + 
        hours.clientOvertimeHours
      );
    });
  });
  
  describe('カスタムマッチャー', () => {
    test('toBeValidWeeklyReportマッチャーが動作する', () => {
      const validReport = createMockWeeklyReport('draft');
      const invalidReport = createMockWeeklyReport('error');
      
      expect(validReport).toBeValidWeeklyReport();
      expect(invalidReport).not.toBeValidWeeklyReport();
    });
    
    test('toHaveStatusマッチャーが動作する', () => {
      const draftReport = createMockWeeklyReport('draft');
      const submittedReport = createMockWeeklyReport('submitted');
      
      expect(draftReport).toHaveStatus(WEEKLY_REPORT_STATUS.DRAFT);
      expect(submittedReport).toHaveStatus(WEEKLY_REPORT_STATUS.SUBMITTED);
    });
    
    test('toHaveWorkHoursマッチャーが動作する', () => {
      const report = createMockWeeklyReport('fullWeek');
      
      expect(report).toHaveWorkHours({
        companyRegularHours: 56,
        weeklyTotal: 56,
      });
    });
    
    test('toBeWithinDateRangeマッチャーが動作する', () => {
      const date = new Date('2024-01-03');
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-07');
      
      expect(date).toBeWithinDateRange(start, end);
      expect(new Date('2024-01-08')).not.toBeWithinDateRange(start, end);
    });
  });
});