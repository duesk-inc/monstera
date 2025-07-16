// 週報テスト用のモックデータジェネレーター

import {
  WeeklyReport,
  DailyRecord,
  ApiWeeklyReport,
  LocalAPIWeeklyReport,
  ListWeeklyReportsResponse,
  BulkSettings,
  DefaultWorkTimeSettings,
} from '@/types/weeklyReport';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { MockDataScenario, TEST_CONSTANTS } from '../types';

// 基本的な日付ユーティリティ
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日開始
  return new Date(d.setDate(diff));
};

export const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

// DailyRecordのモックデータ生成
export const createMockDailyRecord = (
  date: Date,
  options: Partial<DailyRecord> = {}
): DailyRecord => {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  const defaultRecord: DailyRecord = {
    date: date.toISOString().split('T')[0],
    
    // 会社勤務（平日のみデフォルト値を設定）
    startTime: !isWeekend ? '09:00' : '',
    endTime: !isWeekend ? '18:00' : '',
    breakTime: !isWeekend ? 60 : 0,
    
    // 客先勤務（デフォルトは空）
    clientStartTime: '',
    clientEndTime: '',
    clientBreakTime: 0,
    hasClientWork: false,
    
    // 日報・休日出勤
    remarks: '',
    isHolidayWork: false,
  };
  
  return { ...defaultRecord, ...options };
};

// WeeklyReportのモックデータ生成
export const createMockWeeklyReport = (
  scenario: MockDataScenario = 'draft'
): WeeklyReport => {
  const baseDate = TEST_CONSTANTS.TEST_BASE_DATE;
  const startDate = getWeekStart(baseDate);
  const endDate = getWeekEnd(baseDate);
  
  // 基本構造
  const baseReport: WeeklyReport = {
    id: `mock-weekly-report-${scenario}`,
    userId: TEST_CONSTANTS.TEST_USER_ID,
    startDate: startDate,
    endDate: endDate,
    status: WEEKLY_REPORT_STATUS.DRAFT,
    mood: 3,
    weeklyRemarks: '',
    adminComment: '',
    submittedAt: null,
    approvedAt: null,
    approvedBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    dailyRecords: [],
  };
  
  // 7日分のDailyRecordを生成
  for (let i = 0; i < 7; i++) {
    const recordDate = new Date(startDate);
    recordDate.setDate(recordDate.getDate() + i);
    baseReport.dailyRecords.push(createMockDailyRecord(recordDate));
  }
  
  // シナリオ別のカスタマイズ
  switch (scenario) {
    case 'submitted':
      baseReport.status = WEEKLY_REPORT_STATUS.SUBMITTED;
      baseReport.submittedAt = new Date();
      baseReport.weeklyRemarks = '今週は計画通り進捗しました。';
      break;
      
    case 'approved':
      baseReport.status = WEEKLY_REPORT_STATUS.APPROVED;
      baseReport.submittedAt = new Date();
      baseReport.approvedAt = new Date();
      baseReport.approvedBy = 'admin-user-id';
      baseReport.adminComment = '確認しました。お疲れ様でした。';
      break;
      
    case 'rejected':
      baseReport.status = WEEKLY_REPORT_STATUS.REJECTED;
      baseReport.submittedAt = new Date();
      baseReport.adminComment = '勤務時間に誤りがあります。修正して再提出してください。';
      break;
      
    case 'empty':
      // 全ての日報を空にする
      baseReport.dailyRecords = baseReport.dailyRecords.map(record => ({
        ...record,
        companyStartTime: '',
        companyEndTime: '',
        companyBreakMinutes: 0,
      }));
      break;
      
    case 'partial':
      // 月〜水のみ入力
      baseReport.dailyRecords = baseReport.dailyRecords.map((record, index) => {
        if (index >= 1 && index <= 3) {
          return record; // そのまま返す（デフォルト値あり）
        }
        return {
          ...record,
          companyStartTime: '',
          companyEndTime: '',
          companyBreakMinutes: 0,
        };
      });
      break;
      
    case 'fullWeek':
      // 全日入力（土日も含む）
      baseReport.dailyRecords = baseReport.dailyRecords.map(record => ({
        ...record,
        companyStartTime: '09:00',
        companyEndTime: '18:00',
        companyBreakMinutes: 60,
        dailyRemarks: '作業完了',
      }));
      baseReport.weeklyRemarks = '全日勤務しました。';
      break;
      
    case 'withOvertime':
      // 残業あり
      baseReport.dailyRecords = baseReport.dailyRecords.map((record, index) => {
        if (index >= 1 && index <= 5 && !record.isHoliday) {
          return {
            ...record,
            companyEndTime: index === 1 ? '22:00' : '20:00', // 火曜日（index=1）は深夜残業
            dailyRemarks: index === 1 ? 'リリース対応のため残業' : '定時後対応',
          };
        }
        return record;
      });
      break;
      
    case 'withHoliday':
      // 休日出勤あり
      baseReport.dailyRecords = baseReport.dailyRecords.map((record, index) => {
        if (index === 6) { // 土曜日
          return {
            ...record,
            companyStartTime: '10:00',
            companyEndTime: '16:00',
            companyBreakMinutes: 60,
            dailyRemarks: '休日出勤（システムメンテナンス）',
          };
        }
        return record;
      });
      break;
      
    case 'withClientWork':
      // 客先作業あり
      baseReport.dailyRecords = baseReport.dailyRecords.map((record, index) => {
        if (index >= 2 && index <= 4) { // 火〜木
          return {
            ...record,
            clientStartTime: '13:00',
            clientEndTime: '17:00',
            clientBreakMinutes: 0,
            clientName: 'ABC株式会社',
            clientRemarks: '定例会議および作業支援',
          };
        }
        return record;
      });
      break;
      
    case 'pastWeek':
      // 過去の週（4週間前）
      const pastStart = new Date(startDate);
      pastStart.setDate(pastStart.getDate() - 28);
      const pastEnd = new Date(endDate);
      pastEnd.setDate(pastEnd.getDate() - 28);
      
      baseReport.startDate = pastStart;
      baseReport.endDate = pastEnd;
      baseReport.status = WEEKLY_REPORT_STATUS.APPROVED;
      baseReport.submittedAt = new Date(pastEnd.getTime() + 86400000); // 翌日提出
      baseReport.approvedAt = new Date(pastEnd.getTime() + 172800000); // 2日後承認
      
      // 日付を調整
      baseReport.dailyRecords = baseReport.dailyRecords.map((record, index) => {
        const recordDate = new Date(pastStart);
        recordDate.setDate(recordDate.getDate() + index);
        return { ...record, date: recordDate };
      });
      break;
      
    case 'currentWeek':
      // 今週（デフォルトと同じ）
      break;
      
    case 'futureWeek':
      // 未来の週（来週）
      const futureStart = new Date(startDate);
      futureStart.setDate(futureStart.getDate() + 7);
      const futureEnd = new Date(endDate);
      futureEnd.setDate(futureEnd.getDate() + 7);
      
      baseReport.startDate = futureStart;
      baseReport.endDate = futureEnd;
      
      // 日付を調整、勤務情報は空
      baseReport.dailyRecords = baseReport.dailyRecords.map((record, index) => {
        const recordDate = new Date(futureStart);
        recordDate.setDate(recordDate.getDate() + index);
        return {
          ...record,
          date: recordDate,
          companyStartTime: '',
          companyEndTime: '',
          companyBreakMinutes: 0,
        };
      });
      break;
      
    case 'error':
      // エラー状態（不正なデータ）
      baseReport.id = '';
      baseReport.dailyRecords = []; // 日次レコードなし
      break;
  }
  
  return baseReport;
};

// API形式のWeeklyReportを生成
export const createMockApiWeeklyReport = (
  scenario: MockDataScenario = 'draft'
): ApiWeeklyReport => {
  const uiReport = createMockWeeklyReport(scenario);
  
  return {
    id: uiReport.id,
    userId: uiReport.userId,
    startDate: uiReport.startDate.toISOString(),
    endDate: uiReport.endDate.toISOString(),
    status: uiReport.status,
    mood: uiReport.mood,
    weeklyRemarks: uiReport.weeklyRemarks,
    adminComment: uiReport.adminComment,
    submittedAt: uiReport.submittedAt?.toISOString() || null,
    approvedAt: uiReport.approvedAt?.toISOString() || null,
    approvedBy: uiReport.approvedBy,
    createdAt: uiReport.createdAt.toISOString(),
    updatedAt: uiReport.updatedAt.toISOString(),
    dailyRecords: uiReport.dailyRecords.map(record => ({
      id: record.id,
      weeklyReportId: record.weeklyReportId,
      date: record.date.toISOString(),
      dayOfWeek: record.dayOfWeek,
      isHoliday: record.isHoliday,
      companyStartTime: record.companyStartTime,
      companyEndTime: record.companyEndTime,
      companyBreakMinutes: record.companyBreakMinutes,
      companyRemarks: record.companyRemarks,
      clientStartTime: record.clientStartTime,
      clientEndTime: record.clientEndTime,
      clientBreakMinutes: record.clientBreakMinutes,
      clientName: record.clientName,
      clientRemarks: record.clientRemarks,
      dailyRemarks: record.dailyRemarks,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
  };
};

// LocalAPI形式（snake_caseとcamelCase混在）のWeeklyReportを生成
export const createMockLocalApiWeeklyReport = (
  scenario: MockDataScenario = 'draft'
): LocalAPIWeeklyReport => {
  const apiReport = createMockApiWeeklyReport(scenario);
  
  return {
    ...apiReport,
    // snake_case形式も追加
    user_id: apiReport.userId,
    start_date: apiReport.startDate,
    end_date: apiReport.endDate,
    weekly_remarks: apiReport.weeklyRemarks,
    admin_comment: apiReport.adminComment,
    submitted_at: apiReport.submittedAt,
    approved_at: apiReport.approvedAt,
    approved_by: apiReport.approvedBy,
    created_at: apiReport.createdAt,
    updated_at: apiReport.updatedAt,
    daily_records: apiReport.dailyRecords.map(record => ({
      ...record,
      weekly_report_id: record.weeklyReportId,
      day_of_week: record.dayOfWeek,
      is_holiday: record.isHoliday,
      company_start_time: record.companyStartTime,
      company_end_time: record.companyEndTime,
      company_break_minutes: record.companyBreakMinutes,
      company_remarks: record.companyRemarks,
      client_start_time: record.clientStartTime,
      client_end_time: record.clientEndTime,
      client_break_minutes: record.clientBreakMinutes,
      client_name: record.clientName,
      client_remarks: record.clientRemarks,
      daily_remarks: record.dailyRemarks,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    })),
  };
};

// リスト形式のレスポンスを生成
export const createMockListWeeklyReportsResponse = (
  count: number = 5,
  page: number = 1,
  limit: number = 10
): ListWeeklyReportsResponse => {
  const items: ApiWeeklyReport[] = [];
  const scenarios: MockDataScenario[] = ['draft', 'submitted', 'approved', 'partial', 'withOvertime'];
  
  for (let i = 0; i < count; i++) {
    const scenario = scenarios[i % scenarios.length];
    const report = createMockApiWeeklyReport(scenario);
    
    // 週を変える
    const weekOffset = i * 7;
    const startDate = new Date(report.startDate);
    startDate.setDate(startDate.getDate() - weekOffset);
    const endDate = new Date(report.endDate);
    endDate.setDate(endDate.getDate() - weekOffset);
    
    report.startDate = startDate.toISOString();
    report.endDate = endDate.toISOString();
    report.id = `weekly-report-${i + 1}`;
    
    items.push(report);
  }
  
  return {
    items,
    total: count,
    page,
    limit,
  };
};

// BulkSettingsのモックデータ生成
export const createMockBulkSettings = (): BulkSettings => ({
  enabled: false,
  applyToWeekdays: true,
  applyToHolidays: false,
  companyStartTime: '09:00',
  companyEndTime: '18:00',
  companyBreakMinutes: 60,
  clientStartTime: '',
  clientEndTime: '',
  clientBreakMinutes: 0,
  clientName: '',
});

// DefaultWorkTimeSettingsのモックデータ生成
export const createMockDefaultWorkTimeSettings = (): DefaultWorkTimeSettings => ({
  companyStartTime: '09:00',
  companyEndTime: '18:00',
  companyBreakMinutes: 60,
  applyToAllWeekdays: true,
});